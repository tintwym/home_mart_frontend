import { Head, Link, usePage } from '@inertiajs/react';
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import {
    ArrowLeft,
    CreditCard,
    Loader2,
    Landmark,
    Link2,
    Wallet,
    QrCode,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useAppearance } from '@/hooks/use-appearance';
import { useTranslations } from '@/hooks/use-translations';
import { CurrencyFormatter } from '@/components/currency-formatter';
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
    };
};

type Order = {
    id: string;
    total: number;
    items: OrderItem[];
};

type Props = {
    clientSecret: string;
    order: Order;
    stripePublishableKey: string;
};

function CheckoutForm({ order }: { order: Order }) {
    const stripe = useStripe();
    const elements = useElements();
    const { t } = useTranslations();
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setError(null);
        setProcessing(true);

        const { error: submitError } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/checkout/success?order_id=${order.id}`,
                receipt_email: undefined,
            },
        });

        if (submitError) {
            setError(submitError.message ?? t('checkout.payment_failed'));
        }
        setProcessing(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement
                options={
                    {
                        layout: 'tabs',
                        defaultCollapsed: false,
                        radios: true,
                        spacedAccordionItems: true,
                        wallets: { link: 'never' },
                    } as React.ComponentProps<typeof PaymentElement>['options']
                }
            />
            {error && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </p>
            )}
            <Button
                type="submit"
                disabled={!stripe || processing}
                className="min-h-12 w-full cursor-pointer font-semibold"
            >
                {processing ? (
                    <>
                        <Loader2 className="mr-2 size-5 animate-spin" />
                        {t('checkout.processing')}
                    </>
                ) : (
                    <>
                        <CreditCard className="mr-2 size-5" />
                        {t('checkout.pay')}{' '}
                        <CurrencyFormatter
                            amount={order.total}
                            className="ml-1"
                        />
                    </>
                )}
            </Button>
        </form>
    );
}

const darkAppearance = {
    theme: 'night' as const,
    variables: {
        colorPrimary: '#2dd4bf',
        colorBackground: '#171717',
        colorText: '#fafafa',
        colorTextSecondary: '#a3a3a3',
        colorDanger: '#ef4444',
        colorBorder: '#3d3d3d',
        borderRadius: '8px',
    },
};

const lightAppearance = {
    theme: 'stripe' as const,
    variables: {
        colorPrimary: '#2dd4bf',
        colorBackground: '#ffffff',
        colorText: '#171717',
        colorTextSecondary: '#737373',
        colorDanger: '#ef4444',
        colorBorder: '#e5e5e5',
        borderRadius: '8px',
    },
};

export default function CheckoutStripe({
    clientSecret,
    order,
    stripePublishableKey,
}: Props) {
    // Memoize so Stripe isn't re-initialized (and PaymentElement reset) on re-renders
    const stripePromise = useMemo(
        () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
        [stripePublishableKey],
    );
    const { resolvedAppearance } = useAppearance();
    const { t, locale } = useTranslations();
    const { props: sharedProps } = usePage<SharedData>();
    const activeRegion = sharedProps.region || 'US';

    // Dynamically switch Stripe payment methods & displays based on activeRegion (SHOP_REGION)
    const regionalPaymentMethods = useMemo(() => {
        if (activeRegion === 'SG') {
            return [
                {
                    id: 'card',
                    name: t('checkout.method_card'),
                    desc: t('checkout.method_card_desc_sg'),
                    icon: CreditCard,
                    badge: t('checkout.badge_popular'),
                },
                {
                    id: 'paynow',
                    name: t('checkout.method_paynow'),
                    desc: t('checkout.method_paynow_desc'),
                    icon: QrCode,
                    badge: t('checkout.badge_local_direct'),
                },
                {
                    id: 'grabpay',
                    name: t('checkout.method_grabpay'),
                    desc: t('checkout.method_grabpay_desc'),
                    icon: Wallet,
                    badge: t('checkout.badge_digital_wallet'),
                },
            ];
        }
        if (activeRegion === 'US') {
            return [
                {
                    id: 'card',
                    name: t('checkout.method_card'),
                    desc: t('checkout.method_card_desc_us'),
                    icon: CreditCard,
                    badge: t('checkout.badge_secure'),
                },
                {
                    id: 'link',
                    name: t('checkout.method_link'),
                    desc: t('checkout.method_link_desc'),
                    icon: Link2,
                    badge: t('checkout.badge_instant'),
                },
                {
                    id: 'us_bank_account',
                    name: t('checkout.method_ach'),
                    desc: t('checkout.method_ach_desc'),
                    icon: Landmark,
                    badge: t('checkout.badge_bank_transfer'),
                },
            ];
        }
        // Vietnam or other fallback
        return [
            {
                id: 'card',
                name: t('checkout.method_card'),
                desc: t('checkout.method_card_desc_intl'),
                icon: CreditCard,
                badge: t('checkout.badge_recommended'),
            },
        ];
    }, [activeRegion, t]);

    const regionLabel =
        activeRegion === 'SG'
            ? t('checkout.region_singapore')
            : activeRegion === 'VN'
              ? t('checkout.region_vietnam')
              : t('checkout.region_united_states');

    if (!stripePromise) {
        return (
            <AppLayout breadcrumbs={[]}>
                <Head title={t('checkout.title')} />
                <div className="mx-auto max-w-2xl px-4 py-8">
                    <p className="text-destructive">
                        {t('checkout.stripe_not_configured')}
                    </p>
                    <Link
                        href="/cart"
                        className="mt-4 inline-block text-primary hover:underline"
                    >
                        {t('checkout.back_to_cart')}
                    </Link>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={[]}>
            <Head title={t('checkout.stripe_head_title')} />
            <div className="mx-auto max-w-5xl px-0 pt-6 pb-8 sm:px-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="mb-6 -ml-1 flex min-h-11 cursor-pointer justify-start"
                    asChild
                >
                    <Link
                        href="/cart"
                        className="inline-flex items-center gap-2"
                    >
                        <ArrowLeft className="size-4" />
                        {t('checkout.back_to_cart')}
                    </Link>
                </Button>

                <h1 className="mb-6 text-2xl font-bold">
                    {t('checkout.title')}
                </h1>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,520px),minmax(0,1fr)] lg:items-start">
                    <div className="rounded-xl border border-border bg-card p-6">
                        <h2 className="mb-4 font-semibold text-zinc-950 dark:text-zinc-50">
                            {t('checkout.payment_method')}
                        </h2>
                        <p className="mb-5 text-sm text-muted-foreground">
                            {t('checkout.dynamic_methods_enabled', {
                                region: regionLabel,
                            })}
                        </p>

                        {/* Premium Display list of active regional payment methods */}
                        <div className="mb-6 grid gap-3">
                            {regionalPaymentMethods.map((m) => {
                                const IconComp = m.icon;
                                return (
                                    <div
                                        key={m.id}
                                        className="flex items-start gap-3 rounded-lg border border-border/80 bg-muted/20 p-3"
                                    >
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <IconComp className="size-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                    {m.name}
                                                </span>
                                                <span className="inline-flex items-center rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                                                    {m.badge}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {m.desc}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <Elements
                            stripe={stripePromise}
                            options={{
                                clientSecret,
                                appearance:
                                    resolvedAppearance === 'dark'
                                        ? darkAppearance
                                        : lightAppearance,
                                locale: locale as 'en',
                                // Note: available payment methods are determined by the
                                // PaymentIntent (clientSecret); they can't be overridden here.
                            }}
                        >
                            <CheckoutForm order={order} />
                        </Elements>
                    </div>

                    <div className="rounded-xl border border-border bg-muted/30 p-6">
                        <h2 className="mb-4 font-semibold">
                            {t('checkout.order_summary')}
                        </h2>
                        <ul className="space-y-3">
                            {order.items.map((item) => (
                                <li
                                    key={item.id}
                                    className="flex items-center gap-3"
                                >
                                    {(item.listing.image_url ??
                                    item.listing.image_path) ? (
                                        <img
                                            src={
                                                item.listing.image_url ??
                                                item.listing.image_path ??
                                                ''
                                            }
                                            alt=""
                                            referrerPolicy="no-referrer"
                                            className="size-12 shrink-0 rounded object-cover"
                                        />
                                    ) : (
                                        <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                                            —
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">
                                            {item.listing.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            <CurrencyFormatter
                                                amount={item.price}
                                            />{' '}
                                            × {item.quantity}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-6 border-t border-border pt-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    {t('checkout.total')}
                                </span>
                                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                    <CurrencyFormatter amount={order.total} />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
