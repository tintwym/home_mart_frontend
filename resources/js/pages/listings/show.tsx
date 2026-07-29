import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import {
    ArrowLeft,
    Heart,
    MapPin,
    ShoppingBag,
    ShoppingCart,
    Sparkles,
    Star,
    Tag,
    Clock,
    Shield,
    Award,
} from 'lucide-react';
import { AdSlot } from '@/components/ad-slot';
import PriceAlertSubscription from '@/components/price-alert-subscription';
import InputError from '@/components/input-error';
import {
    ListingCard,
    type ListingCardListing,
} from '@/components/listing-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useCurrency } from '@/hooks/use-currency';
import { useTranslations } from '@/hooks/use-translations';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { SharedData } from '@/types';

const CONDITION_KEYS: Record<string, string> = {
    new: 'listing.condition_new',
    like_new: 'listing.condition_like_new',
    good: 'listing.condition_good',
    fair: 'listing.condition_fair',
};

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function formatRelativeTime(
    dateString: string,
    t: (key: string, params?: Record<string, string | number>) => string,
): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('time.just_now');
    if (diffMins < 60)
        return diffMins === 1
            ? t('time.minute_ago')
            : t('time.minutes_ago', { count: diffMins });
    if (diffHours < 24)
        return diffHours === 1
            ? t('time.hour_ago')
            : t('time.hours_ago', { count: diffHours });
    if (diffDays === 1) return t('time.day_ago');
    if (diffDays < 7) return t('time.days_ago', { count: diffDays });
    if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return weeks === 1
            ? t('time.week_ago')
            : t('time.weeks_ago', { count: weeks });
    }
    return formatDate(dateString);
}

type Review = {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    user: { id: string; name: string } | null;
};

type Category = {
    id: string;
    name: string;
    slug: string;
};

type Listing = {
    id: string;
    title: string;
    description: string;
    condition: string;
    price: number;
    image_path: string | null;
    image_url?: string | null;
    meetup_location: string | null;
    created_at: string;
    category?: Category | null;
    user?: {
        id: string;
        name: string;
        seller_type?: string;
        region?: string | null;
    } | null;
    is_sold?: boolean;
    reviews: Review[];
};

type Props = {
    listing: Listing & { trending_until?: string | null };
    averageRating: number;
    reviewCount: number;
    trendPriceLabel: string;
    trendDurationDays: number;
    relatedListings: ListingCardListing[];
};

export default function ShowListing({
    listing,
    averageRating,
    reviewCount,
    trendPriceLabel,
    relatedListings,
}: Props) {
    const pageProps = usePage<SharedData>().props as SharedData & {
        flash?: { status?: string; error?: string };
    };
    const { auth } = pageProps;
    const flash = pageProps.flash;
    const { formatPrice } = useCurrency();
    const { t, categoryName } = useTranslations();
    const reviews = listing?.reviews ?? [];
    const userReview = reviews.find((r) => r.user?.id === auth?.user?.id);
    const { data, setData, post, processing, errors } = useForm({
        rating: userReview?.rating ?? 5,
        comment: userReview?.comment ?? '',
    });

    const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
    const [isZoomed, setIsZoomed] = useState(false);

    const primaryImg = listing?.image_url ?? listing?.image_path ?? null;
    const galleryImages = primaryImg ? [primaryImg] : [];
    const [activeImage, setActiveImage] = useState<string | null>(primaryImg);
    const [prevListingId, setPrevListingId] = useState(listing?.id);
    if (listing?.id && listing.id !== prevListingId) {
        setPrevListingId(listing.id);
        setActiveImage(primaryImg);
    }

    useEffect(() => {
        if (!listing) return;
        try {
            const stored = localStorage.getItem('recently_viewed_listings_v1');
            let items = stored ? JSON.parse(stored) : [];
            if (!Array.isArray(items)) items = [];

            items = items.filter(
                (item: { id: string }) => item.id !== listing.id,
            );

            const listingSummary = {
                id: listing.id,
                title: listing.title,
                price: listing.price,
                image_url: listing.image_url,
                image_path: listing.image_path,
                is_sold: !!listing.is_sold,
                user_id: listing.user?.id,
                user: listing.user
                    ? {
                          seller_type: listing.user.seller_type,
                          region: listing.user.region,
                      }
                    : null,
            };

            items.unshift(listingSummary);

            if (items.length > 6) {
                items = items.slice(0, 6);
            }

            localStorage.setItem(
                'recently_viewed_listings_v1',
                JSON.stringify(items),
            );
        } catch (e) {
            console.error('Failed to store recently viewed listing', e);
        }
    }, [listing]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { left, top, width, height } =
            e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;
        setZoomPos({ x, y });
    };

    const { toast } = useToast();

    if (!listing) {
        return null;
    }

    const canReview = auth?.user && auth.user.id !== listing.user?.id;
    const isOwner = auth?.user && auth.user.id === listing.user?.id;
    const isTrending =
        listing.trending_until && new Date(listing.trending_until) > new Date();
    const isBuyer = auth?.user && auth.user.id !== listing.user?.id;
    const isGuest = !auth?.user;
    const isSold = !!listing.is_sold;
    const showBuyerActions = !isOwner && !isSold && (isBuyer || isGuest);
    const isBusinessSeller = listing.user?.seller_type === 'business';
    const isFavorite =
        !!auth?.user && !!auth.favoriteListingIds?.includes(listing.id);

    const handleFavoriteToggle = () => {
        if (!auth?.user) {
            router.get('/login');
            return;
        }
        const nextIsFavorite = !isFavorite;
        router.post(
            `/listings/${listing.id}/favorite`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast({
                        title: nextIsFavorite
                            ? t('favorites.added_title')
                            : t('favorites.removed_title'),
                        description: nextIsFavorite
                            ? t('favorites.added_description', {
                                  title: listing.title,
                              })
                            : t('favorites.removed_description', {
                                  title: listing.title,
                              }),
                        variant: 'success',
                    });
                },
            },
        );
    };

    const handleAddToCart = () => {
        router.post(
            `/listings/${listing.id}/cart`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast({
                        title: t('listing.added_to_cart'),
                        description: t('listing.added_to_cart_body', {
                            title: listing.title,
                        }),
                        variant: 'success',
                    });
                },
            },
        );
    };

    const handleBuyNow = () => {
        router.post(
            `/listings/${listing.id}/cart`,
            { intent: 'buy' },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast({
                        title: t('listing.preparing_purchase'),
                        description: t('listing.preparing_purchase_body', {
                            title: listing.title,
                        }),
                        variant: 'success',
                    });
                },
            },
        );
    };

    const submitReview = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/listings/${listing.id}/reviews`, {
            preserveScroll: true,
            onSuccess: () => {
                toast({
                    title: t('listing.review_submitted'),
                    description: t('listing.review_submitted_body'),
                    variant: 'success',
                });
            },
        });
    };

    const ratingDistribution = (() => {
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const r of listing.reviews ?? []) {
            const star = Math.min(5, Math.max(1, Math.round(r.rating))) as
                | 1
                | 2
                | 3
                | 4
                | 5;
            counts[star] += 1;
        }
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        return ([5, 4, 3, 2, 1] as const).map((stars) => ({
            stars,
            pct: total === 0 ? 0 : Math.round((counts[stars] / total) * 100),
        }));
    })();

    /* Sidebar: business = cart/buy; individual (C2C) = chat/offer first */
    const sidebarBuyerActions = (
        <div className="flex flex-col gap-2">
            {isBusinessSeller ? (
                auth?.cartListingIds?.includes(listing.id) ? (
                    <>
                        <Button className="w-full" asChild>
                            <Link
                                href="/cart"
                                className="inline-flex items-center gap-2"
                            >
                                <ShoppingBag className="mr-2 size-4" />
                                {t('listing.buy')}
                            </Link>
                        </Button>
                        <Button variant="outline" className="w-full" asChild>
                            <Link
                                href="/cart"
                                className="inline-flex items-center gap-2"
                            >
                                <ShoppingCart className="mr-2 size-4" />
                                {t('listing.in_cart')}
                            </Link>
                        </Button>
                    </>
                ) : (
                    <>
                        <Button className="w-full" onClick={handleBuyNow}>
                            <ShoppingBag className="mr-2 size-4" />
                            {t('listing.buy')}
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleAddToCart}
                        >
                            <ShoppingCart className="mr-2 size-4" />
                            {t('listing.add_to_cart')}
                        </Button>
                    </>
                )
            ) : null}

            <Button
                variant={isBusinessSeller ? 'outline' : 'default'}
                className="w-full"
                onClick={() => router.post(`/listings/${listing.id}/chat`)}
            >
                {t('listing.make_offer')}
            </Button>
        </div>
    );

    const sidebarGuestActions = (
        <div className="flex flex-col gap-2">
            {isBusinessSeller ? (
                <>
                    <Button className="w-full" asChild>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2"
                        >
                            <ShoppingBag className="mr-2 size-4" />
                            {t('listing.sign_in_to_buy')}
                        </Link>
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2"
                        >
                            <ShoppingCart className="mr-2 size-4" />
                            {t('listing.sign_in_to_add_to_cart')}
                        </Link>
                    </Button>
                </>
            ) : null}
            <Button
                variant={isBusinessSeller ? 'outline' : 'default'}
                className="w-full"
                asChild
            >
                <Link href="/login">{t('listing.sign_in_to_make_offer')}</Link>
            </Button>
        </div>
    );

    return (
        <AppLayout breadcrumbs={[]}>
            <Head title={listing.title} />
            <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-12">
                {/* Back Nav */}
                <div className="mb-6 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex min-h-11 touch-manipulation justify-start text-zinc-600 hover:text-zinc-950 sm:min-h-8 dark:text-zinc-400 dark:hover:text-white"
                        asChild
                    >
                        <Link
                            href={dashboard().url}
                            className="inline-flex items-center gap-2"
                        >
                            <ArrowLeft className="size-4" />
                            <span>{t('common.back')}</span>
                        </Link>
                    </Button>

                    <div className="flex items-center gap-2">
                        {!isOwner && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="min-h-11 touch-manipulation sm:min-h-8"
                                onClick={handleFavoriteToggle}
                                aria-label={
                                    isFavorite
                                        ? t('favorites.remove_item')
                                        : t('favorites.saved_item')
                                }
                            >
                                <Heart
                                    className={`size-4 ${
                                        isFavorite
                                            ? 'fill-rose-500 text-rose-500'
                                            : 'text-zinc-500'
                                    }`}
                                />
                            </Button>
                        )}
                        {isOwner && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                <span className="size-2 rounded-full bg-primary" />
                                {t('listing.your_listing_badge')}
                            </span>
                        )}
                    </div>
                </div>

                {flash?.status && (
                    <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm text-emerald-800 backdrop-blur-md dark:border-emerald-800/30 dark:bg-emerald-950/20 dark:text-emerald-200">
                        {flash.status}
                    </div>
                )}
                {flash?.error && (
                    <div className="mb-6 rounded-xl border border-red-100 bg-red-50/50 p-4 text-sm text-red-800 backdrop-blur-md dark:border-red-800/30 dark:bg-red-950/20 dark:text-red-200">
                        {flash.error}
                    </div>
                )}

                <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
                    {/* Left Column: Media Gallery Showcase + Description + Meetups + Reviews */}
                    <div className="space-y-8 lg:col-span-7">
                        {/* Premium Image Showcase Frame */}
                        <div className="space-y-4">
                            <div
                                className="group relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-50 shadow-xs dark:border-zinc-800/60 dark:bg-zinc-950/40"
                                onMouseEnter={() => setIsZoomed(true)}
                                onMouseLeave={() => setIsZoomed(false)}
                                onMouseMove={handleMouseMove}
                            >
                                {activeImage ? (
                                    <img
                                        src={activeImage}
                                        alt={listing.title}
                                        className="size-full object-contain transition-transform duration-100 ease-out select-none"
                                        style={
                                            isZoomed
                                                ? {
                                                      transform: `scale(2.2)`,
                                                      transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                                                  }
                                                : undefined
                                        }
                                    />
                                ) : (
                                    <div className="flex size-full flex-col items-center justify-center gap-2 text-zinc-400 dark:text-zinc-500">
                                        <Tag className="size-10 stroke-[1.2]" />
                                        <span>{t('listing.no_image')}</span>
                                    </div>
                                )}

                                {isSold && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-xs">
                                        <span className="rounded-full border border-white/20 bg-black/70 px-6 py-1.5 text-xs font-black tracking-widest text-white uppercase shadow-2xl">
                                            {t('favorites.sold_out')}
                                        </span>
                                    </div>
                                )}

                                {activeImage && (
                                    <div className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-xs transition-opacity duration-300 group-hover:opacity-0">
                                        {t('listing.hover_to_zoom')}
                                    </div>
                                )}
                            </div>

                            {/* Thumbnails list */}
                            {galleryImages.length > 1 && (
                                <div className="flex scrollbar-thin gap-3 overflow-x-auto pb-1">
                                    {galleryImages.map((img, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setActiveImage(img)}
                                            className={`relative aspect-square size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-zinc-100 transition-all dark:bg-zinc-900 ${
                                                activeImage === img
                                                    ? 'scale-[1.03] border-primary shadow-xs'
                                                    : 'border-transparent opacity-70 hover:opacity-100'
                                            }`}
                                        >
                                            <img
                                                src={img}
                                                alt=""
                                                className="size-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Description Block */}
                        <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/40">
                            <div className="mb-4 flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800/50">
                                <Award className="size-5 stroke-[1.7] text-primary" />
                                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                                    {t('listing.description')}
                                </h2>
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-line text-zinc-600 dark:text-zinc-300">
                                {listing.description}
                            </div>
                        </section>

                        {/* Deal Method & Meetup Block */}
                        <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/40">
                            <div className="mb-4 flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800/50">
                                <MapPin className="size-5 stroke-[1.7] text-primary" />
                                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                                    {t('listing.deal_method')}
                                </h2>
                            </div>

                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                        {t('listing.deal_type')}
                                    </p>
                                    <p className="text-sm font-semibold text-zinc-800 capitalize dark:text-zinc-200">
                                        {listing.meetup_location
                                            ? t('listing.meetup')
                                            : t('listing.delivery')}
                                    </p>
                                </div>

                                {listing.meetup_location && (
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                            {t('listing.meetup_location_label')}
                                        </p>
                                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                            {listing.meetup_location}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {listing.meetup_location && (
                                <div className="dark:border-zinc-800 mt-4 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50 dark:bg-zinc-950/20">
                                    <div className="flex h-32 items-center justify-center p-4 text-center">
                                        <div className="space-y-1.5">
                                            <MapPin className="mx-auto size-6 animate-bounce text-primary" />
                                            <p className="text-zinc-750 text-xs font-semibold dark:text-zinc-300">
                                                {listing.meetup_location}
                                            </p>
                                            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                                {t('listing.meetup_safety')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Reviews Section */}
                        <section
                            id="reviews"
                            className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/40"
                        >
                            <div className="mb-6 flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800/50">
                                <div className="flex items-center gap-2">
                                    <Star className="size-5 fill-amber-500 text-amber-500" />
                                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                                        {t('listing.buyer_reviews')}
                                    </h2>
                                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                        {reviewCount}
                                    </span>
                                </div>
                            </div>

                            <div className="border-zinc-100 dark:border-zinc-800 mb-8 grid gap-6 rounded-xl border bg-zinc-50/50 p-5 sm:grid-cols-12 dark:bg-zinc-950/10">
                                <div className="flex flex-col items-center justify-center border-zinc-200/60 py-2 text-center sm:col-span-4 sm:border-r dark:border-zinc-800/60">
                                    <p className="text-4xl font-extrabold text-zinc-950 dark:text-zinc-50">
                                        {averageRating > 0
                                            ? averageRating.toFixed(1)
                                            : '0.0'}
                                    </p>
                                    <div className="my-1.5 flex justify-center">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className={`size-4 ${
                                                    star <=
                                                    Math.round(averageRating)
                                                        ? 'fill-amber-400 text-amber-400'
                                                        : 'text-zinc-300 dark:text-zinc-700'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                                        {t('listing.seller_rating_explanation')}
                                    </p>
                                </div>

                                <div className="flex flex-col justify-center space-y-2 sm:col-span-8">
                                    {ratingDistribution.map((row) => (
                                        <div
                                            key={row.stars}
                                            className="flex items-center gap-3 text-xs"
                                        >
                                            <span className="w-3 font-semibold text-zinc-500">
                                                {row.stars}
                                            </span>
                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                                <div
                                                    className="h-full rounded-full bg-amber-400"
                                                    style={{
                                                        width: `${row.pct}%`,
                                                    }}
                                                />
                                            </div>
                                            <span className="w-8 text-right text-zinc-400 dark:text-zinc-500">
                                                {row.pct}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {canReview && (
                                <form
                                    onSubmit={submitReview}
                                    className="dark:border-zinc-800 mb-8 rounded-xl border border-zinc-100 bg-zinc-50/30 p-5 dark:bg-zinc-950/5"
                                >
                                    <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                        {userReview
                                            ? t('listing.edit_your_review')
                                            : t('listing.write_a_review')}
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-xs font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                                {t('listing.rating')}
                                            </Label>
                                            <div className="mt-2 flex gap-1.5">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        onClick={() =>
                                                            setData(
                                                                'rating',
                                                                star,
                                                            )
                                                        }
                                                        className="transition-transform hover:scale-110 active:scale-95"
                                                    >
                                                        <Star
                                                            className={`size-6 ${
                                                                star <=
                                                                data.rating
                                                                    ? 'fill-amber-400 text-amber-400'
                                                                    : 'text-zinc-300 hover:text-amber-400/70 dark:text-zinc-700'
                                                            }`}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <Label
                                                htmlFor="comment"
                                                className="text-xs font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500"
                                            >
                                                {t('listing.comment_optional')}
                                            </Label>
                                            <textarea
                                                id="comment"
                                                rows={3}
                                                value={data.comment}
                                                onChange={(e) =>
                                                    setData(
                                                        'comment',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder={t(
                                                    'listing.review_placeholder',
                                                )}
                                                className="mt-2 flex w-full rounded-xl border border-zinc-200 bg-transparent px-3 py-2.5 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-zinc-800"
                                            />
                                            <InputError
                                                message={errors.comment}
                                                className="mt-1"
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            size="sm"
                                            className="rounded-lg"
                                        >
                                            {userReview
                                                ? t('listing.update_review')
                                                : t('listing.submit_review')}
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {!auth?.user && (
                                <p className="mb-6 rounded-xl border border-dashed border-zinc-200 p-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
                                    <Link
                                        href="/login"
                                        className="font-semibold text-primary hover:underline"
                                    >
                                        {t('listing.sign_in_to_leave_review')}
                                    </Link>
                                </p>
                            )}

                            <div className="space-y-4">
                                {reviews.length === 0 ? (
                                    <div className="py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
                                        <MessageSquare className="mx-auto mb-2 size-8 stroke-[1.3] text-zinc-300 dark:text-zinc-700" />
                                        <p>{t('listing.no_reviews_yet')}</p>
                                    </div>
                                ) : (
                                    reviews.map((review) => (
                                        <div
                                            key={review.id}
                                            className="dark:border-zinc-800 rounded-xl border border-zinc-100 bg-white p-4.5 shadow-xs dark:bg-zinc-900/20"
                                        >
                                            <div className="flex gap-4">
                                                <Avatar className="size-9 shrink-0 border border-zinc-100 dark:border-zinc-800">
                                                    <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary uppercase">
                                                        {review.user
                                                            ? review.user.name.slice(
                                                                  0,
                                                                  2,
                                                              )
                                                            : '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <p className="text-zinc-800 text-sm font-semibold dark:text-zinc-100">
                                                            {review.user
                                                                ?.name ??
                                                                t(
                                                                    'listing.anonymous',
                                                                )}
                                                        </p>
                                                        <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                                                            {formatRelativeTime(
                                                                review.created_at,
                                                                t,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 flex gap-0.5">
                                                        {[1, 2, 3, 4, 5].map(
                                                            (star) => (
                                                                <Star
                                                                    key={star}
                                                                    className={`size-3 ${
                                                                        star <=
                                                                        review.rating
                                                                            ? 'fill-amber-400 text-amber-400'
                                                                            : 'text-zinc-200 dark:text-zinc-800'
                                                                    }`}
                                                                />
                                                            ),
                                                        )}
                                                    </div>
                                                    {review.comment && (
                                                        <p className="mt-2.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                                                            {review.comment}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Attribute Details, Purchase Block, Seller Card */}
                    <aside className="space-y-6 lg:col-span-5">
                        {/* Product Detail Header */}
                        <div className="space-y-4 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/40">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-zinc-600 uppercase dark:bg-zinc-800 dark:text-zinc-400">
                                    {listing.category
                                        ? categoryName(listing.category)
                                        : t('listing.category_general')}
                                </span>
                                {isTrending && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-800 uppercase dark:bg-amber-950/20 dark:text-amber-400">
                                        <Sparkles className="size-3" />
                                        {t('listing.trending')}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2">
                                <h1 className="text-xl leading-snug font-extrabold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-100">
                                    {listing.title}
                                </h1>

                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
                                        {formatPrice(
                                            listing.price,
                                            listing.user?.region,
                                        )}
                                    </span>
                                </div>
                            </div>

                            {!isSold && (
                                <div className="border-t border-zinc-100 pt-2 dark:border-zinc-800/50">
                                    <PriceAlertSubscription
                                        listingId={listing.id}
                                        listingTitle={listing.title}
                                        currentPrice={listing.price}
                                        userEmail={auth?.user?.email ?? ''}
                                        region={listing.user?.region}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Attributes Bento Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="dark:border-zinc-800 rounded-xl border border-zinc-100 bg-white p-3.5 dark:bg-zinc-900/30">
                                <Shield className="mb-1.5 size-4 stroke-[1.8] text-primary" />
                                <p className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                    {t('listing.condition')}
                                </p>
                                <p className="text-zinc-800 mt-0.5 text-xs font-bold dark:text-zinc-200">
                                    {CONDITION_KEYS[listing.condition]
                                        ? t(CONDITION_KEYS[listing.condition])
                                        : listing.condition}
                                </p>
                            </div>

                            <div className="dark:border-zinc-800 rounded-xl border border-zinc-100 bg-white p-3.5 dark:bg-zinc-900/30">
                                <MapPin className="mb-1.5 size-4 stroke-[1.8] text-primary" />
                                <p className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                    {t('listing.deal_method')}
                                </p>
                                <p className="text-zinc-800 mt-0.5 truncate text-xs font-bold dark:text-zinc-200">
                                    {listing.meetup_location
                                        ? t('listing.meetup')
                                        : t('listing.delivery')}
                                </p>
                            </div>

                            <div className="dark:border-zinc-800 rounded-xl border border-zinc-100 bg-white p-3.5 dark:bg-zinc-900/30">
                                <Clock className="mb-1.5 size-4 stroke-[1.8] text-primary" />
                                <p className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                    {t('listing.listed')}
                                </p>
                                <p className="text-zinc-800 mt-0.5 text-xs font-bold dark:text-zinc-200">
                                    {formatRelativeTime(listing.created_at, t)}
                                </p>
                            </div>

                            <div className="dark:border-zinc-800 rounded-xl border border-zinc-100 bg-white p-3.5 dark:bg-zinc-900/30">
                                <Tag className="mb-1.5 size-4 stroke-[1.8] text-primary" />
                                <p className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                    {t('listing.seller_type_label')}
                                </p>
                                <p className="text-zinc-800 mt-0.5 text-xs font-bold capitalize dark:text-zinc-200">
                                    {listing.user?.seller_type === 'business'
                                        ? t('user.business_seller')
                                        : t('user.individual_seller')}
                                </p>
                            </div>
                        </div>

                        {/* Purchase & Meet the Seller Action Hub */}
                        <div className="space-y-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-6 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-950/20">
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                    {t('listing.meet_the_seller')}
                                </h3>

                                {listing.user && (
                                    <div className="flex items-center gap-3.5 pb-1">
                                        <Avatar className="size-11 shrink-0 border border-zinc-200 dark:border-zinc-800">
                                            <AvatarFallback className="bg-zinc-200 text-sm font-bold text-zinc-700 uppercase">
                                                {listing.user.name.slice(0, 2)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                                                {listing.user.name}
                                            </p>
                                            {reviewCount > 0 && (
                                                <div className="text-zinc-550 flex items-center gap-1 text-xs dark:text-zinc-400">
                                                    <Star className="size-3 fill-amber-500 text-amber-500" />
                                                    <span className="font-semibold">
                                                        {averageRating.toFixed(
                                                            1,
                                                        )}
                                                    </span>
                                                    <span>·</span>
                                                    <span>
                                                        {reviewCount}{' '}
                                                        {reviewCount === 1
                                                            ? t(
                                                                  'listing.review',
                                                              )
                                                            : t(
                                                                  'listing.reviews',
                                                              )}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Interactive Primary Purchase Controls */}
                            <div className="space-y-3 pt-2">
                                {isOwner ? (
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            variant="outline"
                                            className="w-full rounded-xl"
                                            asChild
                                        >
                                            <Link
                                                href={`/listings/${listing.id}/edit`}
                                            >
                                                {t('listing.edit_listing')}
                                            </Link>
                                        </Button>
                                        {!isSold && (
                                            <Button
                                                variant="outline"
                                                className="w-full rounded-xl"
                                                disabled={!!isTrending}
                                                onClick={() =>
                                                    !isTrending &&
                                                    router.post(
                                                        `/listings/${listing.id}/promote`,
                                                    )
                                                }
                                            >
                                                <Sparkles className="mr-2 size-4 text-amber-500" />
                                                {isTrending
                                                    ? t('listing.promoted')
                                                    : t(
                                                          'listing.make_it_trend',
                                                          {
                                                              price: trendPriceLabel,
                                                          },
                                                      )}
                                            </Button>
                                        )}
                                        {isSold && (
                                            <div className="rounded-xl border border-zinc-200 bg-zinc-100/80 px-4 py-3 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                                                <p className="text-sm font-bold tracking-wide text-zinc-700 uppercase dark:text-zinc-200">
                                                    {t('favorites.sold_out')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : isSold ? (
                                    <div className="rounded-xl border border-zinc-200 bg-zinc-100/80 px-4 py-3 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                                        <p className="text-sm font-bold tracking-wide text-zinc-700 uppercase dark:text-zinc-200">
                                            {t('favorites.sold_out')}
                                        </p>
                                    </div>
                                ) : (
                                    showBuyerActions && (
                                        <div className="hidden md:block">
                                            {auth?.user
                                                ? sidebarBuyerActions
                                                : sidebarGuestActions}
                                        </div>
                                    )
                                )}
                            </div>

                            {/* Trust Badge Indicators */}
                            <div className="space-y-2.5 border-t border-zinc-200/60 pt-4 dark:border-zinc-800/60">
                                {[
                                    {
                                        icon: Shield,
                                        label: t('listing.trust_c2c_safety'),
                                    },
                                    {
                                        icon: Award,
                                        label: t(
                                            'listing.trust_inspect_before_pay',
                                        ),
                                    },
                                ].map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400"
                                    >
                                        <item.icon className="size-3.5 shrink-0 text-primary" />
                                        <span>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>

                {/* Related Products Section */}
                {relatedListings.length > 0 && (
                    <section className="mt-16 border-t border-zinc-200 pt-10 dark:border-zinc-800/80">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                                {t('listing.related_products')}
                            </h2>
                        </div>
                        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {relatedListings.map((rel) => (
                                <li key={rel.id}>
                                    <ListingCard listing={rel} />
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Ad slot - below main content */}
                <AdSlot slotId="listing-below" className="mt-12" />

                {/* Mobile sticky footer — shown when sidebar is hidden (below md). */}
                {showBuyerActions && isBusinessSeller && auth?.user && (
                    <div className="fixed right-0 bottom-0 left-0 z-50 flex gap-2 rounded-t-2xl border-t bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl backdrop-blur-md md:hidden">
                        {auth.cartListingIds?.includes(listing.id) ? (
                            <>
                                <Button
                                    className="min-h-12 flex-1 touch-manipulation rounded-xl font-bold"
                                    asChild
                                >
                                    <Link
                                        href="/cart"
                                        className="inline-flex items-center justify-center gap-2"
                                    >
                                        <ShoppingBag className="size-4" />
                                        {t('listing.buy')}
                                    </Link>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="min-h-12 flex-1 touch-manipulation rounded-xl font-bold"
                                    asChild
                                >
                                    <Link
                                        href="/cart"
                                        className="inline-flex items-center justify-center gap-2"
                                    >
                                        <ShoppingCart className="size-4" />
                                        {t('listing.in_cart')}
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    className="min-h-12 flex-1 touch-manipulation rounded-xl font-bold"
                                    onClick={handleBuyNow}
                                >
                                    <ShoppingBag className="mr-2 size-4" />
                                    {t('listing.buy')}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="min-h-12 flex-1 touch-manipulation rounded-xl font-bold"
                                    onClick={handleAddToCart}
                                >
                                    <ShoppingCart className="mr-2 size-4" />
                                    {t('listing.add_to_cart')}
                                </Button>
                            </>
                        )}
                        <Button
                            variant="outline"
                            className="min-h-12 flex-1 touch-manipulation rounded-xl font-bold"
                            onClick={() =>
                                router.post(`/listings/${listing.id}/chat`)
                            }
                        >
                            {t('listing.make_offer')}
                        </Button>
                    </div>
                )}
                {showBuyerActions && !isBusinessSeller && (
                    <div className="fixed right-0 bottom-0 left-0 z-50 flex gap-3 rounded-t-2xl border-t bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl backdrop-blur-md md:hidden">
                        {auth?.user ? (
                            <Button
                                className="min-h-12 w-full touch-manipulation rounded-xl font-bold"
                                onClick={() =>
                                    router.post(`/listings/${listing.id}/chat`)
                                }
                            >
                                {t('listing.make_offer')}
                            </Button>
                        ) : (
                            <Button
                                className="min-h-12 w-full touch-manipulation rounded-xl font-bold"
                                asChild
                            >
                                <Link
                                    href="/login"
                                    className="inline-flex items-center justify-center"
                                >
                                    {t('listing.sign_in_to_make_offer')}
                                </Link>
                            </Button>
                        )}
                    </div>
                )}
                {showBuyerActions && isGuest && isBusinessSeller && (
                    <div className="fixed right-0 bottom-0 left-0 z-50 flex gap-3 rounded-t-2xl border-t bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl backdrop-blur-md md:hidden">
                        <Button
                            className="min-h-12 flex-1 touch-manipulation rounded-xl font-bold"
                            asChild
                        >
                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center gap-2"
                            >
                                <ShoppingBag className="size-4" />
                                {t('listing.sign_in_to_buy')}
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            className="min-h-12 flex-1 touch-manipulation rounded-xl font-bold"
                            asChild
                        >
                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center gap-2"
                            >
                                <ShoppingCart className="size-4" />
                                {t('listing.sign_in_to_add_to_cart')}
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            className="min-h-12 flex-1 touch-manipulation rounded-xl font-bold"
                            asChild
                        >
                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center"
                            >
                                {t('listing.sign_in_to_make_offer')}
                            </Link>
                        </Button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
