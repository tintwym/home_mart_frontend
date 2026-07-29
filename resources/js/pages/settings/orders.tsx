import { Head, Link, router } from '@inertiajs/react';
import { Package } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import { useCurrency } from '@/hooks/use-currency';
import { useTranslations } from '@/hooks/use-translations';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { index as settingsIndex } from '@/routes/settings';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import OrderDeliveryMap from '@/components/order-delivery-map';
import type { BreadcrumbItem } from '@/types';

type OrderItem = {
    id: string;
    listing_id: string;
    quantity: number;
    price: number;
    listing: {
        id: string;
        title: string;
        image_path: string | null;
        image_url?: string | null;
        price: number;
        user?: { id: string; region?: string | null } | null;
    };
};

type Order = {
    id: string;
    status: string;
    total: number;
    created_at: string;
    items: OrderItem[];
};

type Props = {
    orders?: Order[];
};

/** Marketplace flow: reserved/pending → paid|arranged → completed */
const STATUS_STEPS = [
    { labelKey: 'orders.step_placed', key: 'reserved' },
    { labelKey: 'orders.step_processing', key: 'confirmed' },
    { labelKey: 'orders.status_completed', key: 'completed' },
];

const HIDE_DELIVERY_MAP = new Set([
    'arranged',
    'paid',
    'reserved',
    'completed',
]);

const getStatusIndex = (status: string): number => {
    switch (status) {
        case 'pending':
        case 'reserved':
            return 0;
        case 'paid':
        case 'arranged':
            return 1;
        case 'completed':
            return 2;
        case 'cancelled':
            return -1;
        default:
            return -1;
    }
};

const statusBadgeKey = (status: string): string | null => {
    switch (status) {
        case 'paid':
            return 'orders.status_paid';
        case 'arranged':
            return 'orders.status_arranged';
        case 'completed':
            return 'orders.status_completed';
        case 'reserved':
            return 'orders.status_reserved';
        case 'pending':
            return 'orders.step_placed';
        default:
            return null;
    }
};

export default function Orders({ orders = [] }: Props) {
    const { t } = useTranslations();
    const { formatPrice } = useCurrency();
    const [completingId, setCompletingId] = useState<string | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('orders.breadcrumb_settings') || 'Settings',
            href: settingsIndex.url(),
        },
        { title: t('orders.page_title') || 'Orders', href: '/settings/orders' },
    ];

    const markComplete = async (orderId: string) => {
        setCompletingId(orderId);
        try {
            const res = await fetch(`/api/orders/${orderId}/complete`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: '{}',
            });
            if (res.ok) {
                router.reload({ only: ['orders'] });
            }
        } finally {
            setCompletingId(null);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('orders.page_title') || 'My Orders'} />

            <h1 className="sr-only">{t('orders.page_title') || 'My Orders'}</h1>

            <SettingsLayout
                mobilePageTitle={t('orders.page_title') || 'My Orders'}
            >
                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Package className="mb-4 size-16 text-muted-foreground" />
                        <Heading
                            variant="small"
                            title={t('orders.no_orders') || 'No orders yet'}
                            description={
                                t('orders.no_orders_description') ||
                                "You haven't placed any orders yet. Discover our latest furniture collections!"
                            }
                        />
                        <Link
                            href={dashboard().url}
                            className="mt-6 inline-block font-medium text-primary hover:underline"
                        >
                            {t('orders.browse_listings') || 'Browse Listings'}
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {orders.map((order) => {
                            const isCancelled = order.status === 'cancelled';
                            const currentStepIndex = getStatusIndex(
                                order.status,
                            );
                            const badgeKey = statusBadgeKey(order.status);
                            const canComplete =
                                order.status === 'paid' ||
                                order.status === 'arranged';
                            const hideMap = HIDE_DELIVERY_MAP.has(order.status);

                            return (
                                <div
                                    key={order.id}
                                    className="overflow-hidden rounded-xl border border-border/80 bg-white shadow-xs dark:border-border/30 dark:bg-card"
                                >
                                    {/* Order header card */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-muted/20 px-5 py-4">
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                {t('orders.order_reference')}
                                            </p>
                                            <p className="font-mono text-sm font-semibold text-foreground">
                                                #
                                                {order.id
                                                    .toUpperCase()
                                                    .slice(-12)}
                                            </p>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                {t('orders.date_placed')}
                                            </p>
                                            <p className="text-sm font-medium text-foreground">
                                                {new Date(
                                                    order.created_at,
                                                ).toLocaleDateString(
                                                    undefined,
                                                    {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                    },
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-6 p-5">
                                        {/* Status Tracking Timeline */}
                                        {isCancelled ? (
                                            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                                                {t('orders.cancelled_notice')}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                        {t(
                                                            'orders.status_tracking',
                                                        )}
                                                    </span>
                                                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 capitalize dark:text-emerald-400">
                                                        {badgeKey
                                                            ? t(badgeKey)
                                                            : order.status}
                                                    </span>
                                                </div>

                                                {/* Visual Timeline Bar */}
                                                <div className="relative flex items-center justify-between px-2 pt-4">
                                                    {/* Horizontal Line background */}
                                                    <div className="absolute top-7 right-6 left-6 z-0 h-1 bg-muted dark:bg-muted/40" />
                                                    {/* Horizontal Line progress fill */}
                                                    <div
                                                        className="absolute top-7 left-6 z-0 h-1 bg-emerald-500 transition-all duration-500"
                                                        style={{
                                                            width: `${currentStepIndex >= 0 ? (currentStepIndex / (STATUS_STEPS.length - 1)) * 100 : 0}%`,
                                                            maxWidth:
                                                                'calc(100% - 3rem)',
                                                        }}
                                                    />

                                                    {STATUS_STEPS.map(
                                                        (step, idx) => {
                                                            const isCompleted =
                                                                idx <=
                                                                currentStepIndex;
                                                            const isActive =
                                                                idx ===
                                                                currentStepIndex;

                                                            return (
                                                                <div
                                                                    key={
                                                                        step.key
                                                                    }
                                                                    className="relative z-10 flex flex-1 flex-col items-center"
                                                                >
                                                                    <div
                                                                        className={`flex size-7 items-center justify-center rounded-full border-2 transition-colors duration-300 ${
                                                                            isCompleted
                                                                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                                                                : 'border-muted bg-background text-muted-foreground dark:border-border/60'
                                                                        } ${isActive ? 'ring-4 ring-emerald-500/20' : ''}`}
                                                                    >
                                                                        {isCompleted ? (
                                                                            <svg
                                                                                xmlns="http://www.w3.org/2000/svg"
                                                                                fill="none"
                                                                                viewBox="0 0 24 24"
                                                                                strokeWidth="3"
                                                                                stroke="currentColor"
                                                                                className="size-3.5"
                                                                            >
                                                                                <path
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                    d="m4.5 12.75 6 6 9-13.5"
                                                                                />
                                                                            </svg>
                                                                        ) : (
                                                                            <span className="text-xs font-semibold">
                                                                                {idx +
                                                                                    1}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span
                                                                        className={`mt-2 text-[10px] font-semibold tracking-tight transition-colors sm:text-xs ${
                                                                            isCompleted
                                                                                ? 'text-foreground'
                                                                                : 'text-muted-foreground'
                                                                        }`}
                                                                    >
                                                                        {t(
                                                                            step.labelKey,
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {!isCancelled && !hideMap && (
                                            <OrderDeliveryMap
                                                orderId={order.id}
                                                status={order.status}
                                            />
                                        )}
                                        {order.status === 'arranged' && (
                                            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                                                {t('orders.status_arranged')} —{' '}
                                                {t('checkout.c2c_confirm_hint')}
                                            </div>
                                        )}
                                        {order.status === 'paid' && (
                                            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                                                {t('orders.test_payment_hint')}
                                            </div>
                                        )}

                                        {/* Order Items */}
                                        <div className="space-y-4 border-t border-border/40 pt-4">
                                            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                {t('orders.order_items')}
                                            </p>
                                            <div className="divide-y divide-border/40">
                                                {order.items.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"
                                                    >
                                                        <div className="flex min-w-0 flex-1 items-center gap-4">
                                                            {(item.listing
                                                                .image_url ??
                                                            item.listing
                                                                .image_path) ? (
                                                                <img
                                                                    src={
                                                                        item
                                                                            .listing
                                                                            .image_url ??
                                                                        item
                                                                            .listing
                                                                            .image_path ??
                                                                        ''
                                                                    }
                                                                    alt=""
                                                                    className="size-16 shrink-0 rounded-lg border border-border/40 object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted text-xs text-muted-foreground">
                                                                    {t(
                                                                        'orders.no_image',
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <Link
                                                                    href={`/listings/${item.listing.id}`}
                                                                    className="block truncate text-sm font-semibold text-foreground transition-colors hover:text-primary hover:underline"
                                                                >
                                                                    {
                                                                        item
                                                                            .listing
                                                                            .title
                                                                    }
                                                                </Link>
                                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                                    {t(
                                                                        'orders.quantity',
                                                                        {
                                                                            count: item.quantity,
                                                                        },
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-left sm:text-right">
                                                            <p className="text-sm font-semibold text-foreground">
                                                                {formatPrice(
                                                                    item.price,
                                                                    item.listing
                                                                        ?.user
                                                                        ?.region,
                                                                )}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {t(
                                                                    'orders.unit_price',
                                                                    {
                                                                        price: formatPrice(
                                                                            item
                                                                                .listing
                                                                                .price,
                                                                            item
                                                                                .listing
                                                                                ?.user
                                                                                ?.region,
                                                                        ),
                                                                    },
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Total and actions */}
                                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/40 pt-4">
                                            <div>
                                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                    {t('orders.total_amount')}
                                                </p>
                                                <p className="mt-0.5 text-lg font-bold text-foreground">
                                                    {formatPrice(order.total)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {canComplete && (
                                                    <Button
                                                        size="sm"
                                                        disabled={
                                                            completingId ===
                                                            order.id
                                                        }
                                                        onClick={() =>
                                                            markComplete(
                                                                order.id,
                                                            )
                                                        }
                                                    >
                                                        {t(
                                                            'orders.mark_complete',
                                                        )}
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <Link href="/inbox">
                                                        {t(
                                                            'orders.contact_seller',
                                                        )}
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </SettingsLayout>
        </AppLayout>
    );
}
