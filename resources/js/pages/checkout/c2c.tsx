import { Head, router, usePage } from '@inertiajs/react';
import { HandCoins, MapPin, MessageCircle, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks/use-currency';
import { useTranslations } from '@/hooks/use-translations';
import AppLayout from '@/layouts/app-layout';
import type { SharedData } from '@/types';

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
        meetup_location?: string | null;
        user?: {
            id: string;
            name?: string;
            region?: string | null;
        } | null;
    };
};

type Order = {
    id: string;
    total: number;
    items: OrderItem[];
};

type Props = {
    order: Order;
    region: 'MM' | 'VN';
};

export default function CheckoutC2c({ order, region }: Props) {
    const { formatPrice } = useCurrency();
    const { t } = useTranslations();
    const { auth } = usePage<SharedData>().props;
    const [processing, setProcessing] = useState(false);

    const isMm = region === 'MM';
    const titleKey = isMm ? 'checkout.mm_head_title' : 'checkout.vn_head_title';
    const arrangePath = isMm ? '/checkout/mm/arrange' : '/checkout/vn/arrange';

    const bySeller = useMemo(() => {
        const groups: Record<
            string,
            {
                sellerId: string;
                sellerName: string;
                items: OrderItem[];
            }
        > = {};
        for (const item of order.items) {
            const sellerId = item.listing.user?.id ?? 'unknown';
            if (!groups[sellerId]) {
                groups[sellerId] = {
                    sellerId,
                    sellerName:
                        item.listing.user?.name ?? t('checkout.c2c_seller'),
                    items: [],
                };
            }
            groups[sellerId].items.push(item);
        }
        return Object.values(groups);
    }, [order.items, t]);

    const messageSeller = (listingId: string) => {
        router.post(`/listings/${listingId}/chat`);
    };

    const confirmArrangement = () => {
        setProcessing(true);
        router.post(
            arrangePath,
            { order_id: order.id },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={[]}>
            <Head title={t(titleKey)} />
            <div className="mx-auto max-w-3xl px-4 pt-8 pb-12 sm:px-6">
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="border-b border-border px-5 py-5">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                {t('checkout.c2c_badge')}
                            </p>
                            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 uppercase dark:text-amber-300">
                                {t('checkout.test_mode_badge')}
                            </span>
                        </div>
                        <h1 className="mt-1 text-xl font-bold text-foreground">
                            {t('checkout.c2c_title')}
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {t('checkout.c2c_subtitle')}
                        </p>
                        {auth.user?.email ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                                {t('checkout.email')}: {auth.user.email}
                            </p>
                        ) : null}
                    </div>

                    <div className="space-y-4 px-5 py-5">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                                <MessageCircle className="mb-2 size-4 text-primary" />
                                <p className="text-sm font-semibold">
                                    {t('checkout.c2c_step1_title')}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t('checkout.c2c_step1_body')}
                                </p>
                            </div>
                            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                                <MapPin className="mb-2 size-4 text-primary" />
                                <p className="text-sm font-semibold">
                                    {t('checkout.c2c_step2_title')}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t('checkout.c2c_step2_body')}
                                </p>
                            </div>
                            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                                <HandCoins className="mb-2 size-4 text-primary" />
                                <p className="text-sm font-semibold">
                                    {t('checkout.c2c_step3_title')}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {isMm
                                        ? t('checkout.c2c_step3_body_mm')
                                        : t('checkout.c2c_step3_body_vn')}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {bySeller.map((group) => (
                                <div
                                    key={group.sellerId}
                                    className="rounded-xl border border-border p-4"
                                >
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                {t('checkout.c2c_seller')}
                                            </p>
                                            <p className="text-sm font-semibold">
                                                {group.sellerName}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                messageSeller(
                                                    group.items[0].listing.id,
                                                )
                                            }
                                        >
                                            <MessageCircle className="mr-1.5 size-3.5" />
                                            {t('checkout.c2c_message_seller')}
                                        </Button>
                                    </div>
                                    <ul className="divide-y divide-border/50">
                                        {group.items.map((item) => (
                                            <li
                                                key={item.id}
                                                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                                            >
                                                {(item.listing.image_url ??
                                                item.listing.image_path) ? (
                                                    <img
                                                        src={
                                                            item.listing
                                                                .image_url ??
                                                            item.listing
                                                                .image_path ??
                                                            ''
                                                        }
                                                        alt=""
                                                        className="size-14 rounded-lg object-cover"
                                                    />
                                                ) : (
                                                    <div className="size-14 rounded-lg bg-muted" />
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">
                                                        {item.listing.title}
                                                    </p>
                                                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                                                        {formatPrice(
                                                            item.listing.price,
                                                            item.listing.user
                                                                ?.region,
                                                        )}
                                                    </p>
                                                    {item.listing
                                                        .meetup_location ? (
                                                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                                            <MapPin className="size-3" />
                                                            {
                                                                item.listing
                                                                    .meetup_location
                                                            }
                                                        </p>
                                                    ) : (
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            {t(
                                                                'checkout.c2c_meetup_chat',
                                                            )}
                                                        </p>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
                            <span className="text-sm text-muted-foreground">
                                {t('checkout.total_due')}
                            </span>
                            <span className="text-lg font-bold">
                                {formatPrice(order.total)}
                            </span>
                        </div>

                        <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/10 px-3 py-3 text-xs text-muted-foreground">
                            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                            <p>{t('checkout.c2c_safety')}</p>
                        </div>

                        <Button
                            type="button"
                            className="min-h-12 w-full rounded-xl"
                            disabled={processing}
                            onClick={confirmArrangement}
                        >
                            {processing
                                ? t('checkout.processing')
                                : t('checkout.c2c_confirm')}
                        </Button>
                        <p className="text-center text-xs text-muted-foreground">
                            {t('checkout.c2c_confirm_hint')}
                        </p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
