import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Heart,
    ShoppingCart,
    Trash2,
    Star,
    Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Variants } from 'motion/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useCurrency } from '@/hooks/use-currency';
import { useTranslations } from '@/hooks/use-translations';
import AppLayout from '@/layouts/app-layout';
import { EmptyState } from '@/components/empty-state';
import type { SharedData } from '@/types';
import { dashboard } from '@/routes';
import { cn } from '@/lib/utils';

type ListingCardListing = {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    condition: string;
    price: number;
    image_path: string | null;
    image_url?: string | null;
    created_at?: string;
    category?: { id: string; name: string; slug: string } | null;
    user?: {
        id: string;
        name: string;
        avatar?: string;
        seller_type?: string;
        region?: string | null;
    } | null;
    trending_until?: string | null;
    is_sold?: boolean;
    inventory?: number;
    rating?: number;
    reviews_count?: number;
};

type Props = {
    listings: ListingCardListing[];
};

const CONDITION_KEYS: Record<string, string> = {
    new: 'favorites.condition_new',
    like_new: 'favorites.condition_like_new',
    good: 'favorites.condition_good',
    fair: 'favorites.condition_fair',
};

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.06,
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring',
            stiffness: 100,
            damping: 15,
        },
    },
};

export default function FavoritesIndex({ listings = [] }: Props) {
    const { auth } = usePage<SharedData>().props;
    const { toast } = useToast();
    const { formatPrice } = useCurrency();
    const { t } = useTranslations();

    const [activeActionId, setActiveActionId] = useState<string | null>(null);

    const handleMoveToCart = (listing: ListingCardListing) => {
        if (activeActionId) return;
        setActiveActionId(listing.id);

        // 1. Add to cart
        router.post(
            `/listings/${listing.id}/cart`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    // 2. Remove from favorites
                    router.post(
                        `/listings/${listing.id}/favorite`,
                        {},
                        {
                            preserveScroll: true,
                            onSuccess: () => {
                                setActiveActionId(null);
                                toast({
                                    title: t('favorites.moved_to_cart_title'),
                                    description: t(
                                        'favorites.moved_to_cart_description',
                                        {
                                            title: listing.title,
                                        },
                                    ),
                                    variant: 'success',
                                });
                            },
                            onError: () => {
                                setActiveActionId(null);
                            },
                        },
                    );
                },
                onError: () => {
                    setActiveActionId(null);
                    toast({
                        title: t('favorites.could_not_add_title'),
                        description: t('favorites.could_not_add_description'),
                        variant: 'destructive',
                    });
                },
            },
        );
    };

    const handleRemove = (listing: ListingCardListing) => {
        if (activeActionId) return;
        setActiveActionId(listing.id);

        router.post(
            `/listings/${listing.id}/favorite`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setActiveActionId(null);
                    toast({
                        title: t('favorites.removed_title'),
                        description: t('favorites.removed_description', {
                            title: listing.title,
                        }),
                        variant: 'success',
                    });
                },
                onError: () => {
                    setActiveActionId(null);
                },
            },
        );
    };

    return (
        <AppLayout breadcrumbs={[]}>
            <Head title={t('favorites.page_title')} />

            <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
                {/* Back to Catalog Link */}
                <Link
                    href={dashboard().url}
                    className="mb-6 inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase transition-colors hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200"
                >
                    <ArrowLeft className="size-4" />
                    {t('favorites.back_to_catalog')}
                </Link>

                {/* Wishlist Header */}
                <div className="mb-8 border-b border-zinc-100 pb-6 dark:border-zinc-800">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
                                <Heart className="size-7 animate-pulse fill-rose-500 text-rose-500" />
                                {t('favorites.heading')}
                            </h1>
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                {t('favorites.description')}
                            </p>
                        </div>
                        <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-100 px-3.5 py-1 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {listings.length}{' '}
                            {listings.length === 1
                                ? t('favorites.saved_item')
                                : t('favorites.saved_items')}
                        </span>
                    </div>
                </div>

                {listings.length === 0 ? (
                    <EmptyState
                        type="favorites"
                        title={t('favorites.empty_title')}
                        description={t('favorites.empty_description')}
                        actionLabel={t('favorites.browse_collection')}
                        actionHref={dashboard().url}
                    />
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid gap-6 md:grid-cols-2"
                    >
                        <AnimatePresence mode="popLayout">
                            {listings.map((l) => {
                                const imageSrc =
                                    l.image_url ??
                                    l.image_path ??
                                    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=400&q=80';
                                const isOutOfStock =
                                    l.is_sold ||
                                    (l.inventory !== undefined &&
                                        l.inventory === 0);
                                const isAddedToCart =
                                    auth?.cartListingIds?.includes(l.id);
                                const isActionLoading = activeActionId === l.id;

                                // Generate ratings deterministic mapping to match dashboard
                                const rating =
                                    l.rating !== undefined
                                        ? l.rating
                                        : parseFloat(
                                              (
                                                  4.2 +
                                                  (l.price % 8) / 10
                                              ).toFixed(1),
                                          );
                                const reviewCount =
                                    l.reviews_count !== undefined
                                        ? l.reviews_count
                                        : (l.price % 36) + 6;

                                return (
                                    <motion.div
                                        key={l.id}
                                        variants={itemVariants}
                                        layout
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40"
                                    >
                                        <div className="flex gap-4 sm:gap-5">
                                            {/* Left Column: Image wrapper */}
                                            <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-950/40">
                                                <Link
                                                    href={`/listings/${l.id}`}
                                                    className="block size-full"
                                                >
                                                    <img
                                                        src={imageSrc}
                                                        alt={l.title}
                                                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                </Link>
                                                {isOutOfStock && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-xs">
                                                        <span className="rounded-md bg-black/80 px-2 py-0.5 text-[8px] font-black tracking-wider text-white uppercase">
                                                            {t(
                                                                'favorites.sold_out',
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right Column: Title, price, details */}
                                            <div className="flex min-w-0 flex-1 flex-col">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <Link
                                                            href={`/listings/${l.id}`}
                                                            className="group-hover:text-primary"
                                                        >
                                                            <h3 className="truncate text-sm font-bold text-zinc-900 transition-colors dark:text-white">
                                                                {l.title}
                                                            </h3>
                                                        </Link>
                                                        <p className="mt-0.5 text-[10px] font-medium tracking-wider text-zinc-400 uppercase">
                                                            {CONDITION_KEYS[
                                                                l.condition
                                                            ]
                                                                ? t(
                                                                      CONDITION_KEYS[
                                                                          l
                                                                              .condition
                                                                      ],
                                                                  )
                                                                : l.condition}
                                                        </p>
                                                    </div>

                                                    <button
                                                        onClick={() =>
                                                            handleRemove(l)
                                                        }
                                                        disabled={
                                                            isActionLoading
                                                        }
                                                        className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-rose-500 dark:text-zinc-500 dark:hover:bg-zinc-800"
                                                        title={t(
                                                            'favorites.remove_item',
                                                        )}
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </div>

                                                {/* Ratings */}
                                                <div className="mt-1 flex items-center gap-1.5">
                                                    <div className="flex items-center">
                                                        {Array.from({
                                                            length: 5,
                                                        }).map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={cn(
                                                                    'size-2.5',
                                                                    i <
                                                                        Math.floor(
                                                                            rating,
                                                                        )
                                                                        ? 'fill-amber-400 text-amber-400'
                                                                        : 'text-zinc-200 dark:text-zinc-700',
                                                                )}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="text-[9px] font-bold text-zinc-400">
                                                        {rating.toFixed(1)} (
                                                        {reviewCount})
                                                    </span>
                                                </div>

                                                {/* Price */}
                                                <p className="mt-2 text-sm font-extrabold text-zinc-950 dark:text-white">
                                                    {formatPrice(
                                                        l.price,
                                                        l.user?.region,
                                                    )}
                                                </p>

                                                {/* Actions Footer */}
                                                <div className="mt-auto flex items-center justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800/40">
                                                    <div className="flex min-w-0 items-center gap-1.5">
                                                        <div className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[8px] font-black text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                                            {(
                                                                l.user?.name ??
                                                                'U'
                                                            )
                                                                .slice(0, 1)
                                                                .toUpperCase()}
                                                        </div>
                                                        <span className="truncate text-[10px] font-medium text-zinc-400">
                                                            {l.user?.name ??
                                                                t(
                                                                    'favorites.designer',
                                                                )}
                                                        </span>
                                                    </div>

                                                    {isAddedToCart ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 dark:text-emerald-400">
                                                            <Check className="size-3.5 stroke-3" />
                                                            {t(
                                                                'favorites.in_cart',
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={
                                                                isOutOfStock ||
                                                                isActionLoading
                                                            }
                                                            onClick={() =>
                                                                handleMoveToCart(
                                                                    l,
                                                                )
                                                            }
                                                            className="h-7 min-h-7 gap-1 rounded-lg border border-zinc-200 px-3 text-[10px] font-bold text-zinc-950 hover:bg-zinc-50 dark:border-zinc-800 dark:text-white dark:hover:bg-zinc-800"
                                                        >
                                                            {isActionLoading ? (
                                                                <span className="size-3 animate-spin rounded-full border border-zinc-500 border-t-transparent" />
                                                            ) : (
                                                                <>
                                                                    <ShoppingCart className="size-3" />
                                                                    {t(
                                                                        'favorites.move_to_cart',
                                                                    )}
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </AppLayout>
    );
}
