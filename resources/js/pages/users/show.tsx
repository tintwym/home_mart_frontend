import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { ListingCard } from '@/components/listing-card';
import type { ListingCardListing } from '@/components/listing-card';
import { EmptyState } from '@/components/empty-state';
import { useTranslations } from '@/hooks/use-translations';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';

type User = {
    id: string;
    name: string;
    seller_type?: string;
};

type Props = {
    user: User;
    listings: ListingCardListing[];
    averageRating: number;
    reviewCount: number;
};

export default function UserShow({
    user,
    listings,
    averageRating,
    reviewCount,
}: Props) {
    const { t } = useTranslations();

    return (
        <AppLayout breadcrumbs={[]}>
            <Head title={user.name} />
            <div className="mx-auto w-full max-w-6xl px-0 pb-24 sm:px-2">
                <Link
                    href={dashboard().url}
                    className="mb-4 -ml-1 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    {t('common.back')}
                </Link>
                <div className="mb-8">
                    <h1 className="text-2xl font-bold">{user.name}</h1>
                    <p className="text-sm text-muted-foreground">
                        {user.seller_type === 'business'
                            ? t('user.business_seller')
                            : t('user.individual_seller')}
                    </p>
                    {reviewCount > 0 && (
                        <p className="mt-1 text-sm">
                            {averageRating.toFixed(1)}★ ({reviewCount}{' '}
                            {reviewCount === 1
                                ? t('user.review')
                                : t('user.reviews')}
                            )
                        </p>
                    )}
                </div>
                <h2 className="mb-4 font-semibold">{t('user.listings')}</h2>
                {listings.length === 0 ? (
                    <EmptyState
                        type="listings"
                        title={t('user.no_listings_title')}
                        description={t('user.no_listings_description', {
                            name: user.name,
                        })}
                        actionLabel={t('user.explore_home_mart')}
                        actionHref="/"
                    />
                ) : (
                    <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                        {listings.map((l) => (
                            <ListingCard key={l.id} listing={l} />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
