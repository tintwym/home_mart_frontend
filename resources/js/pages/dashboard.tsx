import { Head, Link, usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'motion/react';
import type { Variants } from 'motion/react';
import {
    Plus,
    SlidersHorizontal,
    ArrowUpDown,
    Check,
    RotateCcw,
    Sparkles,
    Tag,
    Clock,
    Flame,
    X,
    Heart,
    Settings,
    ShoppingBag,
    DollarSign,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { AdSlot } from '@/components/ad-slot';
import { CurrencyFormatter } from '@/components/currency-formatter';
import { ListingCard, ListingCardSkeleton } from '@/components/listing-card';
import type { ListingCardListing } from '@/components/listing-card';
import { useTranslations } from '@/hooks/use-translations';
import { useCurrency } from '@/hooks/use-currency';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index as settingsIndex } from '@/routes/settings';
import type { BreadcrumbItem, SharedData } from '@/types';

// Hero Animations Variants
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.1,
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 80, damping: 14 },
    },
};

const imageVariants: Variants = {
    hidden: { opacity: 0, scale: 0.96 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
};

const dashboardEntranceVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
        },
    },
};

const gridContainerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
        },
    },
};

const cardItemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring',
            stiffness: 100,
            damping: 15,
        },
    },
};

type Props = {
    listings: ListingCardListing[];
};

export default function Dashboard({ listings = [] }: Props) {
    const { t } = useTranslations();
    const { formatPrice, toUsdAmount } = useCurrency();
    const { url, props: sharedProps } = usePage<SharedData>();
    const categories = sharedProps.categories || [];

    // Detect if this is the root / home page
    const isRootPage =
        url === '/' || url === '/dashboard' || url.startsWith('/?');

    // Local filter state
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortOption, setSortOption] = useState<
        'default' | 'price-low' | 'price-high' | 'recent' | 'popularity'
    >('default');
    const [availabilityFilter, setAvailabilityFilter] = useState<
        'all' | 'available' | 'sold'
    >('all');
    // Max price filter is stored in USD so region/currency switches don't hide listings.
    const [maxPrice, setMaxPrice] = useState<number>(100000);
    const [priceRange, setPriceRange] = useState<
        'all' | 'under-200' | '200-500' | '500-1500' | '1500-5000' | '5000-plus'
    >('all');

    const [recentlyViewed, setRecentlyViewed] = useState<ListingCardListing[]>(
        () => {
            if (typeof window !== 'undefined') {
                try {
                    const stored = localStorage.getItem(
                        'recently_viewed_listings_v1',
                    );
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (Array.isArray(parsed)) {
                            return parsed;
                        }
                    }
                } catch (e) {
                    console.error('Failed to read recently viewed list', e);
                }
            }
            return [];
        },
    );

    const [isSearching, setIsSearching] = useState(false);
    const [isFloatingFilterOpen, setIsFloatingFilterOpen] = useState(false);
    const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
    const [now] = useState(() => Date.now());

    const favoritesCount = sharedProps.auth?.favoriteListingIds?.length ?? 0;

    const newestListing = useMemo(() => {
        if (!listings || listings.length === 0) return null;
        return [...listings].sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
        })[0];
    }, [listings]);

    const handleRecentSearchClick = (query: string) => {
        router.get(`/?q=${encodeURIComponent(query)}`);
    };

    // Handle interactive transitions with Skeleton Loading State
    const handleFilterChange = (updater: () => void) => {
        setIsSearching(true);
        updater();
        const timer = setTimeout(() => {
            setIsSearching(false);
        }, 400);
        return () => clearTimeout(timer);
    };

    // Filtered and Sorted Listings list
    const processedListings = useMemo(() => {
        let list = [...listings];

        // 1. Category filter
        if (selectedCategory !== 'all') {
            list = list.filter(
                (l) =>
                    l.category?.id === selectedCategory ||
                    l.category?.slug === selectedCategory,
            );
        }

        // 2. Availability filter
        if (availabilityFilter === 'available') {
            list = list.filter((l) => !l.is_sold);
        } else if (availabilityFilter === 'sold') {
            list = list.filter((l) => l.is_sold);
        }

        // 3. Price Filter Threshold (USD bands — independent of shopper currency)
        list = list.filter(
            (l) => toUsdAmount(l.price, l.user?.region) <= maxPrice,
        );

        // 3.5 Predefined Price Range Filter (USD)
        if (priceRange === 'under-200') {
            list = list.filter(
                (l) => toUsdAmount(l.price, l.user?.region) < 200,
            );
        } else if (priceRange === '200-500') {
            list = list.filter((l) => {
                const p = toUsdAmount(l.price, l.user?.region);
                return p >= 200 && p <= 500;
            });
        } else if (priceRange === '500-1500') {
            list = list.filter((l) => {
                const p = toUsdAmount(l.price, l.user?.region);
                return p >= 500 && p <= 1500;
            });
        } else if (priceRange === '1500-5000') {
            list = list.filter((l) => {
                const p = toUsdAmount(l.price, l.user?.region);
                return p >= 1500 && p <= 5000;
            });
        } else if (priceRange === '5000-plus') {
            list = list.filter(
                (l) => toUsdAmount(l.price, l.user?.region) > 5000,
            );
        }

        // 4. Sorting logic (USD so mixed-region catalogs sort by real value)
        if (sortOption === 'price-low') {
            list.sort(
                (a, b) =>
                    toUsdAmount(a.price, a.user?.region) -
                    toUsdAmount(b.price, b.user?.region),
            );
        } else if (sortOption === 'price-high') {
            list.sort(
                (a, b) =>
                    toUsdAmount(b.price, b.user?.region) -
                    toUsdAmount(a.price, a.user?.region),
            );
        } else if (sortOption === 'recent') {
            list.sort((a, b) => {
                const dateA = a.created_at
                    ? new Date(a.created_at).getTime()
                    : 0;
                const dateB = b.created_at
                    ? new Date(b.created_at).getTime()
                    : 0;
                return dateB - dateA;
            });
        } else if (sortOption === 'popularity') {
            list.sort((a, b) => {
                const aTrending = a.trending_until
                    ? new Date(a.trending_until).getTime() > now
                    : false;
                const bTrending = b.trending_until
                    ? new Date(b.trending_until).getTime() > now
                    : false;
                if (aTrending && !bTrending) return -1;
                if (!aTrending && bTrending) return 1;

                const aBusiness = a.user?.seller_type === 'business';
                const bBusiness = b.user?.seller_type === 'business';
                if (aBusiness && !bBusiness) return -1;
                if (!aBusiness && bBusiness) return 1;

                return b.title.localeCompare(a.title);
            });
        }

        return list;
    }, [
        listings,
        selectedCategory,
        sortOption,
        availabilityFilter,
        maxPrice,
        priceRange,
        now,
        toUsdAmount,
    ]);

    const hasActiveFilters =
        selectedCategory !== 'all' ||
        sortOption !== 'default' ||
        availabilityFilter !== 'all' ||
        maxPrice !== 100000 ||
        priceRange !== 'all';

    const activeFilterCount =
        (selectedCategory !== 'all' ? 1 : 0) +
        (sortOption !== 'default' ? 1 : 0) +
        (availabilityFilter !== 'all' ? 1 : 0) +
        (maxPrice !== 100000 ? 1 : 0) +
        (priceRange !== 'all' ? 1 : 0);

    const resetFilters = () => {
        handleFilterChange(() => {
            setSelectedCategory('all');
            setSortOption('default');
            setAvailabilityFilter('all');
            setMaxPrice(100000);
            setPriceRange('all');
        });
    };

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('dashboard.title'),
            href: dashboard().url,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head
                title={
                    isRootPage
                        ? 'Modern Furniture & Home Mart'
                        : t('dashboard.title')
                }
            />

            <motion.div
                variants={dashboardEntranceVariants}
                initial="hidden"
                animate="visible"
                className="relative flex min-w-0 flex-1 flex-col gap-8"
            >
                {/* 1. HERO SECTION (ONLY ON ROOT LANDING PAGE) */}
                {isRootPage && (
                    <motion.section
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="relative overflow-hidden rounded-2xl bg-[#123a3d] px-6 py-12 text-white sm:px-12 sm:py-20 lg:px-16"
                    >
                        {/* Soft colourful atmosphere — mint / peach / sky */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,oklch(0.78_0.1_175_/_0.35),transparent_50%)]" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,oklch(0.82_0.08_55_/_0.28),transparent_45%)]" />
                        <div className="absolute -top-16 right-1/4 size-72 rounded-full bg-accent/20 blur-3xl" />
                        <div className="absolute -bottom-20 -left-20 size-80 rounded-full bg-primary/25 blur-3xl" />

                        <div className="relative z-10 grid gap-10 lg:grid-cols-12 lg:items-center">
                            {/* Left content block */}
                            <div className="space-y-6 lg:col-span-7">
                                <motion.div
                                    variants={itemVariants}
                                    className="inline-flex items-center gap-2 rounded-lg bg-white/12 px-3 py-1 text-xs font-medium text-white backdrop-blur-xs"
                                >
                                    <Sparkles className="size-3 text-amber-300" />
                                    <span>{t('dashboard.hero_badge')}</span>
                                </motion.div>

                                <motion.h1
                                    variants={itemVariants}
                                    className="font-sans text-4xl leading-[1.1] font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
                                >
                                    {t('dashboard.hero_title_1')} <br />
                                    <span className="text-teal-100/80">
                                        {t('dashboard.hero_title_2')}
                                    </span>
                                </motion.h1>

                                <motion.p
                                    variants={itemVariants}
                                    className="max-w-lg text-base text-teal-50/85 sm:text-lg"
                                >
                                    {t('dashboard.hero_description')}
                                </motion.p>

                                <motion.div
                                    variants={itemVariants}
                                    className="flex flex-wrap gap-3 pt-2"
                                >
                                    <a
                                        href="#explore-catalog"
                                        className="inline-flex h-11 min-h-11 items-center justify-center rounded-lg bg-secondary px-6 font-medium text-secondary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {t('dashboard.explore_catalog')}
                                    </a>
                                    <Link
                                        href="/listings/create"
                                        className="inline-flex h-11 min-h-11 items-center justify-center rounded-lg border border-white/25 bg-white/10 px-6 font-medium text-white backdrop-blur-xs transition-colors hover:bg-white/15"
                                    >
                                        {t('dashboard.sell_your_piece')}
                                    </Link>
                                </motion.div>
                            </div>

                            {/* Right showcase images */}
                            <motion.div
                                variants={imageVariants}
                                className="relative hidden lg:col-span-5 lg:block"
                            >
                                <div className="aspect-4/3 w-full overflow-hidden rounded-xl border border-white/10 shadow-2xl">
                                    <img
                                        src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80"
                                        alt="Modern Scandinavian Living Space"
                                        className="size-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
                                </div>

                                {/* Floating card decoration */}
                                <div className="absolute -bottom-6 -left-6 flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-950/90 p-3 text-white shadow-xl backdrop-blur-md">
                                    <div className="flex size-10 items-center justify-center rounded bg-white/10">
                                        <Tag className="size-5 text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-400">
                                            {t('dashboard.featured_piece')}
                                        </p>
                                        <p className="text-sm font-semibold">
                                            Wästberg Lounge Chair
                                        </p>
                                    </div>
                                    <span className="ml-4 rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold text-white">
                                        {formatPrice(450)}
                                    </span>
                                </div>
                            </motion.div>
                        </div>
                    </motion.section>
                )}

                <AdSlot
                    slotId="dashboard-above-listings"
                    size="banner"
                    className="mb-2"
                />

                {/* Quick Stats Row */}
                <div className="grid gap-4 sm:grid-cols-3">
                    {/* Stat Card 1: Total Listings */}
                    <div className="flex items-center justify-between rounded-xl border border-primary/15 bg-card p-5 shadow-xs transition-all hover:border-primary/30 hover:shadow-md dark:border-primary/20 dark:bg-card">
                        <div className="space-y-1">
                            <p className="text-xs font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                {t('dashboard.total_listings')}
                            </p>
                            <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                                {listings.length}
                            </h3>
                            <p className="text-[10px] text-zinc-500">
                                {t('dashboard.premium_active')}
                            </p>
                        </div>
                        <div className="rounded-lg bg-primary/10 p-3 dark:bg-primary/15">
                            <Tag className="size-5 text-primary" />
                        </div>
                    </div>

                    {/* Stat Card 2: Favorites Count */}
                    <Link
                        href="/favorites"
                        className="group flex items-center justify-between rounded-xl border border-primary/15 bg-card p-5 shadow-xs transition-all hover:border-rose-300/50 hover:shadow-md dark:border-primary/20 dark:bg-card dark:hover:border-rose-800/40"
                    >
                        <div className="space-y-1">
                            <p className="text-xs font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                {t('dashboard.your_favorites')}
                            </p>
                            <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900 transition-colors group-hover:text-rose-500 dark:text-white">
                                {favoritesCount}
                            </h3>
                            <p className="text-[10px] text-zinc-500">
                                {t('dashboard.view_saved')}
                            </p>
                        </div>
                        <div className="rounded-lg bg-rose-50 p-3 transition-transform group-hover:scale-105 dark:bg-rose-950/20">
                            <Heart className="size-5 text-rose-500" />
                        </div>
                    </Link>

                    {/* Stat Card 3: Recent Activity */}
                    <div className="flex items-center justify-between rounded-xl border border-primary/15 bg-card p-5 shadow-xs transition-all hover:border-primary/30 hover:shadow-md dark:border-primary/20 dark:bg-card">
                        <div className="max-w-[70%] min-w-0 space-y-1">
                            <p className="text-xs font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                {t('dashboard.recent_activity')}
                            </p>
                            {newestListing ? (
                                <>
                                    <h3 className="truncate text-sm font-bold text-zinc-800 dark:text-zinc-200">
                                        {newestListing.title}
                                    </h3>
                                    <p className="truncate text-[10px] text-zinc-500">
                                        {t('dashboard.newest_arrival')}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                                        {t('dashboard.active')}
                                    </h3>
                                    <p className="text-[10px] text-zinc-500">
                                        {t('dashboard.no_new_items')}
                                    </p>
                                </>
                            )}
                        </div>
                        <div className="rounded-lg bg-accent/40 p-3 dark:bg-accent/20">
                            <Clock className="size-5 text-accent-foreground" />
                        </div>
                    </div>
                </div>

                {/* Recently Viewed Section */}
                {recentlyViewed.length > 0 && (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-4 rounded-xl border border-primary/12 bg-secondary/25 p-5 dark:border-primary/20 dark:bg-secondary/10"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="size-4.5 text-zinc-500" />
                                <h2 className="text-sm font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                    {t('dashboard.recently_viewed')}
                                </h2>
                            </div>
                            <button
                                onClick={() => {
                                    localStorage.removeItem(
                                        'recently_viewed_listings_v1',
                                    );
                                    setRecentlyViewed([]);
                                }}
                                className="text-xs font-medium text-zinc-400 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300"
                            >
                                {t('dashboard.clear_history')}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                            {recentlyViewed.map((item) => {
                                const imgUrl =
                                    item.image_url ?? item.image_path;
                                return (
                                    <Link
                                        key={item.id}
                                        href={`/listings/${item.id}`}
                                        className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200/50 bg-white p-2.5 transition-all hover:border-zinc-300 hover:shadow-xs dark:border-zinc-800/80 dark:bg-zinc-950/20 dark:hover:border-zinc-700"
                                    >
                                        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
                                            {imgUrl ? (
                                                <img
                                                    src={imgUrl}
                                                    alt=""
                                                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
                                                <div className="flex size-full items-center justify-center text-xs text-zinc-400">
                                                    —
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-2 min-w-0 flex-1">
                                            <h4 className="truncate text-xs font-semibold text-zinc-800 group-hover:text-primary dark:text-zinc-200">
                                                {item.title}
                                            </h4>
                                            <p className="mt-0.5 text-xs font-bold text-zinc-950 dark:text-white">
                                                <CurrencyFormatter
                                                    amount={item.price}
                                                    sellerRegion={
                                                        item.user?.region
                                                    }
                                                />
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* 2. MAIN CATALOG SECTION WITH FILTERS */}
                <div
                    id="explore-catalog"
                    className="grid gap-8 lg:grid-cols-12"
                >
                    {/* Filter Sidebar (Desktop) / Dropdown Panel (Mobile) */}
                    <aside className="hidden space-y-6 lg:col-span-3 lg:block">
                        <div className="rounded-xl border border-zinc-200/60 bg-zinc-50/50 p-5 dark:border-zinc-800/40 dark:bg-zinc-900/30">
                            <div className="flex items-center justify-between border-b border-zinc-200/60 pb-4 dark:border-zinc-800/40">
                                <div className="flex items-center gap-2 font-semibold">
                                    <SlidersHorizontal className="size-4 text-zinc-500" />
                                    <span>{t('dashboard.filters')}</span>
                                </div>
                                <button
                                    onClick={resetFilters}
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline"
                                >
                                    <RotateCcw className="size-3" />
                                    {t('dashboard.reset')}
                                </button>
                            </div>

                            {/* Category Filter */}
                            <div className="space-y-3 border-b border-zinc-200/60 py-4 dark:border-zinc-800/40">
                                <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                    {t('dashboard.categories')}
                                </h3>
                                <div className="flex flex-col gap-1">
                                    <button
                                        onClick={() =>
                                            handleFilterChange(() =>
                                                setSelectedCategory('all'),
                                            )
                                        }
                                        className={cn(
                                            'flex min-h-9.5 items-center justify-between rounded-md px-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800',
                                            selectedCategory === 'all'
                                                ? 'bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white'
                                                : 'text-zinc-600 dark:text-zinc-400',
                                        )}
                                    >
                                        <span>
                                            {t('dashboard.all_products')}
                                        </span>
                                        {selectedCategory === 'all' && (
                                            <Check className="size-4 text-primary" />
                                        )}
                                    </button>
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() =>
                                                handleFilterChange(() =>
                                                    setSelectedCategory(
                                                        cat.slug,
                                                    ),
                                                )
                                            }
                                            className={cn(
                                                'flex min-h-9.5 items-center justify-between rounded-md px-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800',
                                                selectedCategory === cat.slug
                                                    ? 'bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white'
                                                    : 'text-zinc-600 dark:text-zinc-400',
                                            )}
                                        >
                                            <span className="truncate">
                                                {cat.name}
                                            </span>
                                            {selectedCategory === cat.slug && (
                                                <Check className="size-4 text-primary" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sort Filter */}
                            <div className="space-y-3 border-b border-zinc-200/60 py-4 dark:border-zinc-800/40">
                                <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                    {t('dashboard.sort_by')}
                                </h3>
                                <div className="flex flex-col gap-1">
                                    {[
                                        {
                                            id: 'default',
                                            label: 'dashboard.sort_recommended',
                                            icon: Sparkles,
                                        },
                                        {
                                            id: 'popularity',
                                            label: 'dashboard.sort_popularity',
                                            icon: Flame,
                                        },
                                        {
                                            id: 'recent',
                                            label: 'dashboard.sort_recent',
                                            icon: Clock,
                                        },
                                        {
                                            id: 'price-low',
                                            label: 'dashboard.sort_price_low',
                                            icon: ArrowUpDown,
                                        },
                                        {
                                            id: 'price-high',
                                            label: 'dashboard.sort_price_high',
                                            icon: ArrowUpDown,
                                        },
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() =>
                                                handleFilterChange(() =>
                                                    setSortOption(
                                                        opt.id as
                                                            | 'default'
                                                            | 'price-low'
                                                            | 'price-high'
                                                            | 'recent'
                                                            | 'popularity',
                                                    ),
                                                )
                                            }
                                            className={cn(
                                                'flex min-h-9.5 items-center gap-2 rounded-md px-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800',
                                                sortOption === opt.id
                                                    ? 'bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white'
                                                    : 'text-zinc-600 dark:text-zinc-400',
                                            )}
                                        >
                                            <opt.icon className="size-3.5" />
                                            <span className="truncate">
                                                {t(opt.label)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Availability Filter */}
                            <div className="space-y-3 border-b border-zinc-200/60 py-4 dark:border-zinc-800/40">
                                <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                    {t('dashboard.availability')}
                                </h3>
                                <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800/80">
                                    {[
                                        { id: 'all', label: 'dashboard.all' },
                                        {
                                            id: 'available',
                                            label: 'dashboard.active',
                                        },
                                        { id: 'sold', label: 'dashboard.sold' },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() =>
                                                handleFilterChange(() =>
                                                    setAvailabilityFilter(
                                                        tab.id as
                                                            | 'all'
                                                            | 'available'
                                                            | 'sold',
                                                    ),
                                                )
                                            }
                                            className={cn(
                                                'rounded px-2 py-1.5 text-center text-xs font-medium transition-colors',
                                                availabilityFilter === tab.id
                                                    ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-900 dark:text-white'
                                                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
                                            )}
                                        >
                                            {t(tab.label)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Price range filter */}
                            <div className="space-y-3 py-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                        {t('dashboard.max_price')}
                                    </h3>
                                    <span className="text-xs font-semibold text-primary">
                                        {formatPrice(maxPrice)}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="10"
                                    max="100000"
                                    step="10"
                                    value={maxPrice}
                                    onChange={(e) =>
                                        handleFilterChange(() =>
                                            setMaxPrice(
                                                parseInt(e.target.value),
                                            ),
                                        )
                                    }
                                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-primary dark:bg-zinc-800"
                                    aria-label="Filter by max price"
                                />
                                <div className="flex justify-between text-[10px] text-zinc-400">
                                    <span>{formatPrice(10)}</span>
                                    <span>{formatPrice(100000)}</span>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Listing Grid Section */}
                    <main className="col-span-12 space-y-6 lg:col-span-9">
                        {/* 1. TRENDING TAGS BAR */}
                        <div className="flex scrollbar-none items-center gap-2.5 overflow-x-auto pb-2">
                            <span className="flex shrink-0 items-center gap-1 text-xs font-extrabold tracking-wider text-zinc-400 uppercase select-none dark:text-zinc-500">
                                <Sparkles className="size-3.5 animate-pulse text-amber-500" />
                                <span>{t('dashboard.trending')}</span>
                            </span>
                            <div className="flex items-center gap-2">
                                {[
                                    'Velvet Sofa',
                                    'Walnut Desk',
                                    'Wool Rug',
                                    'Pendant Lamp',
                                    'Arch Mirror',
                                ].map((trend, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() =>
                                            handleRecentSearchClick(trend)
                                        }
                                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition-all hover:bg-primary/10 hover:text-primary dark:bg-zinc-800 dark:hover:bg-primary/25 dark:hover:text-primary-foreground"
                                    >
                                        <span>{trend}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 1.5 PREDEFINED PRICE CATEGORIES */}
                        <div className="flex flex-col gap-2 border-y border-zinc-100 py-3.5 dark:border-zinc-800/60">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-zinc-400 uppercase select-none dark:text-zinc-500">
                                <DollarSign className="size-3.5 text-emerald-500" />
                                <span>{t('dashboard.price_range')}</span>
                            </div>
                            <div className="flex scrollbar-none items-center gap-2 overflow-x-auto pb-1">
                                {[
                                    {
                                        id: 'all',
                                        label: t('dashboard.any_price'),
                                    },
                                    {
                                        id: 'under-200',
                                        label: t('dashboard.price_under', {
                                            price: formatPrice(200),
                                        }),
                                    },
                                    {
                                        id: '200-500',
                                        label: `${formatPrice(200)} - ${formatPrice(500)}`,
                                    },
                                    {
                                        id: '500-1500',
                                        label: `${formatPrice(500)} - ${formatPrice(1500)}`,
                                    },
                                    {
                                        id: '1500-5000',
                                        label: `${formatPrice(1500)} - ${formatPrice(5000)}`,
                                    },
                                    {
                                        id: '5000-plus',
                                        label: `${formatPrice(5000)}+`,
                                    },
                                ].map((range) => (
                                    <button
                                        key={range.id}
                                        onClick={() =>
                                            handleFilterChange(() =>
                                                setPriceRange(
                                                    range.id as
                                                        | 'all'
                                                        | 'under-200'
                                                        | '200-500'
                                                        | '500-1500'
                                                        | '1500-5000'
                                                        | '5000-plus',
                                                ),
                                            )
                                        }
                                        className={cn(
                                            'inline-flex h-8.5 shrink-0 items-center justify-center rounded-full border px-4 text-xs font-semibold transition-all',
                                            priceRange === range.id
                                                ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950'
                                                : 'border-zinc-200/80 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200',
                                        )}
                                    >
                                        {range.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Summary Bar */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-muted-foreground">
                                {selectedCategory !== 'all'
                                    ? t('dashboard.showing_listings_in', {
                                          count: isSearching
                                              ? '...'
                                              : processedListings.length,
                                          category:
                                              categories.find(
                                                  (c) =>
                                                      c.slug ===
                                                      selectedCategory,
                                              )?.name || selectedCategory,
                                      })
                                    : t('dashboard.showing_listings', {
                                          count: isSearching
                                              ? '...'
                                              : processedListings.length,
                                      })}
                            </div>

                            {/* Reset state helper */}
                            {hasActiveFilters && (
                                <button
                                    onClick={resetFilters}
                                    className="self-start text-xs font-medium text-primary hover:underline sm:self-auto"
                                >
                                    {t('dashboard.clear_all_filters')}
                                </button>
                            )}
                        </div>

                        {/* Product listing grid */}
                        <section aria-label="Product Catalog">
                            {isSearching ? (
                                // Render beautiful skeleton loaders
                                <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <ListingCardSkeleton key={i} />
                                    ))}
                                </div>
                            ) : processedListings.length === 0 ? (
                                <EmptyState
                                    type="generic"
                                    title={t('dashboard.no_match_title')}
                                    description={t(
                                        'dashboard.no_match_description',
                                    )}
                                    actionLabel={t(
                                        'dashboard.reset_all_filters',
                                    )}
                                    onActionClick={() => resetFilters()}
                                />
                            ) : (
                                <motion.div
                                    variants={gridContainerVariants}
                                    initial="hidden"
                                    animate="show"
                                    className="grid min-w-0 grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3"
                                >
                                    {processedListings.map((listing) => (
                                        <motion.div
                                            key={listing.id}
                                            variants={cardItemVariants}
                                            layout
                                        >
                                            <ListingCard listing={listing} />
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </section>
                    </main>
                </div>

                {/* Floating Filter Button (Sticky) */}
                <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 lg:hidden">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsFloatingFilterOpen(true)}
                        className="flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/95 px-5 py-3 text-sm font-bold shadow-lg backdrop-blur-md transition-all hover:shadow-xl dark:border-zinc-800/80 dark:bg-zinc-900/95 dark:text-white"
                    >
                        <SlidersHorizontal className="size-4 text-primary" />
                        <span>{t('dashboard.quick_filters')}</span>
                        {/* Active filter counter badge */}
                        {hasActiveFilters && (
                            <span className="flex size-5 animate-pulse items-center justify-center rounded-full bg-primary text-[10px] font-extrabold text-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </motion.button>
                </div>

                {/* Floating Filter Overlay Modal */}
                <AnimatePresence>
                    {isFloatingFilterOpen && (
                        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsFloatingFilterOpen(false)}
                                className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs"
                            />

                            {/* Filter Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 100 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 100 }}
                                transition={{
                                    type: 'spring',
                                    damping: 25,
                                    stiffness: 220,
                                }}
                                className="relative z-10 w-full max-w-lg rounded-t-2xl border border-zinc-200 bg-white p-6 shadow-2xl sm:rounded-2xl dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
                                    <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                                        <SlidersHorizontal className="size-4.5 text-primary" />
                                        <span>
                                            {t('dashboard.quick_filter_menu')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => {
                                                resetFilters();
                                                setIsFloatingFilterOpen(false);
                                            }}
                                            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-primary hover:underline"
                                        >
                                            <RotateCcw className="size-3" />
                                            {t('dashboard.reset_all')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setIsFloatingFilterOpen(false)
                                            }
                                            className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                                            aria-label="Close filters"
                                        >
                                            <X className="size-4.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Scrollable Filters Body */}
                                <div className="my-4 max-h-[60vh] space-y-5 overflow-y-auto py-2">
                                    {/* Category */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                            {t('dashboard.refine_category')}
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleFilterChange(() =>
                                                        setSelectedCategory(
                                                            'all',
                                                        ),
                                                    )
                                                }
                                                className={cn(
                                                    'rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all',
                                                    selectedCategory === 'all'
                                                        ? 'border-primary bg-primary text-white'
                                                        : 'border-zinc-200/60 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
                                                )}
                                            >
                                                {t('dashboard.all_products')}
                                            </button>
                                            {categories.map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() =>
                                                        handleFilterChange(() =>
                                                            setSelectedCategory(
                                                                cat.slug,
                                                            ),
                                                        )
                                                    }
                                                    className={cn(
                                                        'rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all',
                                                        selectedCategory ===
                                                            cat.slug
                                                            ? 'border-primary bg-primary text-white'
                                                            : 'border-zinc-200/60 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
                                                    )}
                                                >
                                                    {cat.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Sort Option with Popularity */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                            {t('dashboard.sort_option')}
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                {
                                                    id: 'default',
                                                    label: 'dashboard.sort_recommended',
                                                    icon: Sparkles,
                                                },
                                                {
                                                    id: 'popularity',
                                                    label: 'dashboard.sort_popularity',
                                                    icon: Flame,
                                                },
                                                {
                                                    id: 'recent',
                                                    label: 'dashboard.sort_recent',
                                                    icon: Clock,
                                                },
                                                {
                                                    id: 'price-low',
                                                    label: 'dashboard.sort_price_low',
                                                    icon: ArrowUpDown,
                                                },
                                                {
                                                    id: 'price-high',
                                                    label: 'dashboard.sort_price_high',
                                                    icon: ArrowUpDown,
                                                },
                                            ].map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() =>
                                                        handleFilterChange(() =>
                                                            setSortOption(
                                                                opt.id as
                                                                    | 'default'
                                                                    | 'price-low'
                                                                    | 'price-high'
                                                                    | 'recent'
                                                                    | 'popularity',
                                                            ),
                                                        )
                                                    }
                                                    className={cn(
                                                        'flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-semibold transition-all',
                                                        sortOption === opt.id
                                                            ? 'border-zinc-400 bg-zinc-100 text-zinc-950 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white'
                                                            : 'border-zinc-200/60 bg-zinc-50/50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800/60 dark:bg-zinc-800/30 dark:text-zinc-400',
                                                    )}
                                                >
                                                    <opt.icon className="size-3.5 shrink-0 text-primary" />
                                                    <span className="truncate">
                                                        {t(opt.label)}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Availability */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                            {t('dashboard.availability_filter')}
                                        </h4>
                                        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-zinc-100 p-1.5 dark:bg-zinc-800">
                                            {[
                                                {
                                                    id: 'all',
                                                    label: 'dashboard.show_all',
                                                },
                                                {
                                                    id: 'available',
                                                    label: 'dashboard.active',
                                                },
                                                {
                                                    id: 'sold',
                                                    label: 'dashboard.sold',
                                                },
                                            ].map((tab) => (
                                                <button
                                                    key={tab.id}
                                                    type="button"
                                                    onClick={() =>
                                                        handleFilterChange(() =>
                                                            setAvailabilityFilter(
                                                                tab.id as
                                                                    | 'all'
                                                                    | 'available'
                                                                    | 'sold',
                                                            ),
                                                        )
                                                    }
                                                    className={cn(
                                                        'rounded-lg py-2 text-center text-xs font-bold transition-all',
                                                        availabilityFilter ===
                                                            tab.id
                                                            ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-white'
                                                            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
                                                    )}
                                                >
                                                    {t(tab.label)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Price Slider */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                                {t('dashboard.max_price_cap')}
                                            </h4>
                                            <span className="text-xs font-bold text-primary">
                                                {formatPrice(maxPrice)}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="10"
                                            max="100000"
                                            step="10"
                                            value={maxPrice}
                                            onChange={(e) =>
                                                handleFilterChange(() =>
                                                    setMaxPrice(
                                                        parseInt(
                                                            e.target.value,
                                                        ),
                                                    ),
                                                )
                                            }
                                            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-primary dark:bg-zinc-800"
                                            aria-label="Filter by max price"
                                        />
                                        <div className="flex justify-between text-[10px] text-zinc-400">
                                            <span>{formatPrice(10)}</span>
                                            <span>{formatPrice(100000)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer CTA */}
                                <Button
                                    onClick={() =>
                                        setIsFloatingFilterOpen(false)
                                    }
                                    className="w-full rounded-xl py-3 font-bold shadow-sm"
                                    size="lg"
                                >
                                    {t('dashboard.apply_filters', {
                                        count: processedListings.length,
                                    })}
                                </Button>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Expandable Quick Actions Floating Menu */}
                <div className="fixed right-[max(1.5rem,env(safe-area-inset-right))] bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-40 flex flex-col items-end">
                    <AnimatePresence>
                        {isQuickActionsOpen && (
                            <>
                                {/* Overlay to close */}
                                <div
                                    className="fixed inset-0 z-30 bg-black/5 dark:bg-black/10"
                                    onClick={() => setIsQuickActionsOpen(false)}
                                />

                                <motion.div
                                    initial={{ opacity: 0, y: 15, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 15, scale: 0.9 }}
                                    transition={{
                                        type: 'spring',
                                        damping: 20,
                                        stiffness: 300,
                                    }}
                                    className="relative z-45 mb-3 flex min-w-52.5 flex-col gap-1.5 rounded-2xl border border-zinc-200/80 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/95"
                                >
                                    <div className="mb-1.5 border-b border-zinc-100 px-2 pb-1.5 dark:border-zinc-800/80">
                                        <p className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                            {t('dashboard.quick_actions')}
                                        </p>
                                    </div>
                                    <Link
                                        href="/listings/create"
                                        className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-zinc-700 transition-all hover:bg-primary/10 hover:text-primary dark:text-zinc-300 dark:hover:bg-primary/20 dark:hover:text-primary-foreground"
                                        onClick={() =>
                                            setIsQuickActionsOpen(false)
                                        }
                                    >
                                        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
                                            <Plus className="size-4" />
                                        </div>
                                        <span>
                                            {t('dashboard.create_listing')}
                                        </span>
                                    </Link>
                                    <Link
                                        href={settingsIndex()}
                                        className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                                        onClick={() =>
                                            setIsQuickActionsOpen(false)
                                        }
                                    >
                                        <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                            <Settings className="size-4" />
                                        </div>
                                        <span>
                                            {t('dashboard.manage_settings')}
                                        </span>
                                    </Link>
                                    <Link
                                        href="/favorites"
                                        className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-zinc-700 transition-all hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-300 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                                        onClick={() =>
                                            setIsQuickActionsOpen(false)
                                        }
                                    >
                                        <div className="flex size-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500 dark:bg-rose-950/20">
                                            <Heart className="size-4" />
                                        </div>
                                        <span>
                                            {t('dashboard.my_favorites')}
                                        </span>
                                    </Link>
                                    <Link
                                        href="/settings/orders"
                                        className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-zinc-700 transition-all hover:bg-blue-50 hover:text-blue-600 dark:text-zinc-300 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
                                        onClick={() =>
                                            setIsQuickActionsOpen(false)
                                        }
                                    >
                                        <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-950/20">
                                            <ShoppingBag className="size-4" />
                                        </div>
                                        <span>
                                            {t('dashboard.my_purchases')}
                                        </span>
                                    </Link>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* Quick Actions Trigger FAB Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                            setIsQuickActionsOpen(!isQuickActionsOpen)
                        }
                        aria-label="Toggle Quick Actions Menu"
                        className={cn(
                            'flex size-12 min-h-12 min-w-12 touch-manipulation items-center justify-center rounded-full',
                            'bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
                        )}
                    >
                        <motion.div
                            animate={{ rotate: isQuickActionsOpen ? 135 : 0 }}
                            transition={{
                                type: 'spring',
                                damping: 15,
                                stiffness: 200,
                            }}
                        >
                            <Plus className="size-5" />
                        </motion.div>
                    </motion.button>
                </div>
            </motion.div>
        </AppLayout>
    );
}
