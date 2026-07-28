import { Head, router, usePage } from '@inertiajs/react';
import {
    BadgeDollarSign,
    Building2,
    CreditCard,
    Home,
    Landmark,
    Smartphone,
    Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCurrency } from '@/hooks/use-currency';
import { useTranslations } from '@/hooks/use-translations';
import AppLayout from '@/layouts/app-layout';
import type { SharedData } from '@/types';

type SavedMethod = {
    id: string;
    type: string;
    type_label: string;
    identifier: string;
    is_default: boolean;
};

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

type MethodKey = 'kbz_pay' | 'wave_pay' | 'aya_pay' | 'cb_pay' | 'mpu' | 'bank';

const METHOD_LABEL_KEYS: Record<MethodKey, string> = {
    kbz_pay: 'checkout.mm_method_kbz_pay',
    wave_pay: 'checkout.mm_method_wave_pay',
    aya_pay: 'checkout.mm_method_aya_pay',
    cb_pay: 'checkout.mm_method_cb_pay',
    mpu: 'checkout.mm_method_mpu',
    bank: 'checkout.mm_method_bank',
};

const METHOD_HINT_KEYS: Record<MethodKey, string> = {
    kbz_pay: 'checkout.mm_hint_kbz_pay',
    wave_pay: 'checkout.mm_hint_wave_pay',
    aya_pay: 'checkout.mm_hint_aya_pay',
    cb_pay: 'checkout.mm_hint_cb_pay',
    mpu: 'checkout.mm_hint_mpu',
    bank: 'checkout.mm_hint_bank',
};

const METHOD_ICON: Record<
    MethodKey,
    React.ComponentType<{ className?: string }>
> = {
    kbz_pay: Wallet,
    wave_pay: Smartphone,
    aya_pay: BadgeDollarSign,
    cb_pay: CreditCard,
    mpu: Building2,
    bank: Landmark,
};

const QR_METHODS: MethodKey[] = ['kbz_pay', 'wave_pay', 'aya_pay', 'cb_pay'];

export default function CheckoutMyanmar({
    order,
    savedMethods = [],
}: {
    order: Order;
    savedMethods?: SavedMethod[];
}) {
    const { formatPrice } = useCurrency();
    const { t } = useTranslations();
    const { auth } = usePage<SharedData>().props;
    const [email, setEmail] = useState(() => auth.user?.email ?? '');
    const [method, setMethod] = useState<MethodKey>(() => {
        const def = savedMethods.find((m) => m.is_default);
        if (!def) return 'kbz_pay';
        const key = def.type as MethodKey;
        return (
            ['kbz_pay', 'wave_pay', 'aya_pay', 'cb_pay', 'mpu'].includes(key)
                ? key
                : 'kbz_pay'
        ) as MethodKey;
    });
    const [identifier, setIdentifier] = useState(() => {
        const def = savedMethods.find((m) => m.is_default);
        return def?.identifier ?? '';
    });
    const [processing, setProcessing] = useState(false);
    const [showQr, setShowQr] = useState(true);

    const onSubmit = () => {
        setProcessing(true);
        router.post(
            '/checkout/mm/pay',
            {
                order_id: order.id,
                method,
                identifier: identifier.trim(),
                save_method: true,
                email: email.trim(),
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
            },
        );
    };

    const qrPayload = useMemo(() => {
        return JSON.stringify({
            app: 'homemart',
            order_id: order.id,
            method,
            amount: order.total,
            identifier: identifier.trim() || undefined,
            currency: 'MMK',
        });
    }, [order.id, order.total, method, identifier]);

    const qrUrl = useMemo(() => {
        // Lightweight QR rendering without adding dependencies.
        // You can swap this to a first-party QR generator later.
        return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
            qrPayload,
        )}`;
    }, [qrPayload]);

    const methodLabel = t(METHOD_LABEL_KEYS[method]);

    return (
        <AppLayout breadcrumbs={[]}>
            <Head title={t('checkout.mm_head_title')} />
            <div className="mx-auto max-w-3xl px-0 pt-6 pb-8 sm:px-2">
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="flex items-center justify-between gap-4 border-b border-border p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                                <Home className="size-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-base leading-tight font-semibold">
                                    {t('checkout.mm_store_name')}
                                </p>
                                <p className="text-sm leading-tight text-muted-foreground">
                                    {t('checkout.secure_checkout')}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                                {t('checkout.total_due')}
                            </p>
                            <p className="text-xl font-bold">
                                {formatPrice(order.total)}
                            </p>
                        </div>
                    </div>

                    <div className="p-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                {t('checkout.email')}
                            </label>
                            <Input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t('checkout.email_placeholder')}
                                inputMode="email"
                                autoComplete="email"
                            />
                        </div>

                        <div className="my-6 flex items-center gap-3">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-sm text-muted-foreground">
                                {t('checkout.pay_with')}
                            </span>
                            <div className="h-px flex-1 bg-border" />
                        </div>

                        <h2 className="text-base font-semibold">
                            {t('checkout.mm_wallets_heading')}
                        </h2>

                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {(
                                [
                                    'kbz_pay',
                                    'wave_pay',
                                    'aya_pay',
                                    'cb_pay',
                                    'mpu',
                                    'bank',
                                ] as MethodKey[]
                            ).map((key) => {
                                const active = method === key;
                                const Icon = METHOD_ICON[key];
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => {
                                            setMethod(key);
                                            const def =
                                                savedMethods.find(
                                                    (m) =>
                                                        m.is_default &&
                                                        m.type === key,
                                                ) ??
                                                savedMethods.find(
                                                    (m) => m.type === key,
                                                );
                                            setIdentifier(
                                                def?.identifier ?? '',
                                            );
                                        }}
                                        className={`relative rounded-2xl border p-4 text-left transition ${
                                            active
                                                ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20 dark:bg-indigo-950/20'
                                                : 'border-border hover:bg-muted/30'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-muted/20 text-muted-foreground">
                                                <Icon className="size-5" />
                                            </span>
                                            {active ? (
                                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                                                    ✓
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="mt-3 text-sm font-semibold">
                                            {t(METHOD_LABEL_KEYS[key])}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-6 space-y-2">
                            <label className="text-sm font-medium">
                                {t(METHOD_HINT_KEYS[method])}
                            </label>
                            <Input
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder={
                                    method === 'mpu'
                                        ? t('checkout.mm_placeholder_mpu')
                                        : method === 'bank'
                                          ? t('checkout.placeholder_optional')
                                          : t('checkout.mm_placeholder_phone')
                                }
                                inputMode={method === 'mpu' ? 'numeric' : 'tel'}
                            />
                        </div>

                        {QR_METHODS.includes(method) &&
                        identifier.trim() !== '' ? (
                            <div className="mt-4 rounded-2xl border border-border bg-muted/20 p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold">
                                        {t('checkout.qr_code')}
                                    </p>
                                    <button
                                        type="button"
                                        className="text-sm font-medium text-primary underline underline-offset-4"
                                        onClick={() => setShowQr((v) => !v)}
                                    >
                                        {showQr
                                            ? t('checkout.hide')
                                            : t('checkout.show')}
                                    </button>
                                </div>
                                {showQr ? (
                                    <div className="grid place-items-center">
                                        <img
                                            src={qrUrl}
                                            alt={t('checkout.payment_qr_alt')}
                                            className="h-[240px] w-[240px] rounded-lg bg-white p-2"
                                            loading="lazy"
                                        />
                                        <p className="mt-3 text-center text-xs text-muted-foreground">
                                            {t('checkout.scan_qr_in', {
                                                method: methodLabel,
                                            })}
                                        </p>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="mt-5">
                            <Button
                                type="button"
                                className="min-h-12 w-full rounded-xl"
                                disabled={processing}
                                onClick={onSubmit}
                            >
                                {processing
                                    ? t('checkout.processing')
                                    : t('checkout.pay_amount', {
                                          amount: formatPrice(order.total),
                                      })}
                            </Button>
                        </div>

                        <p className="mt-3 text-center text-xs text-muted-foreground">
                            {t('checkout.secure_checkout')}
                        </p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
