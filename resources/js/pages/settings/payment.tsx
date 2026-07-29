import { Head, usePage } from '@inertiajs/react';
import Heading from '@/components/heading';
import {
    CardVaultSection,
    type CardPaymentMethodItem,
} from '@/components/payments/card-vault-section';
import { useTranslations } from '@/hooks/use-translations';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import type { BreadcrumbItem, SharedData } from '@/types';

type Props = {
    region?: string;
    c2cCheckout?: boolean;
    testMode?: boolean;
    paymentMethods: CardPaymentMethodItem[];
    localPaymentMethods?: unknown[];
    stripePublishableKey: string | null;
};

export default function PaymentSettings({
    region = '',
    c2cCheckout = false,
    testMode = true,
    paymentMethods = [],
    stripePublishableKey,
}: Props) {
    const { t } = useTranslations();
    const isC2c = c2cCheckout || region === 'MM' || region === 'VN';
    const canManageCards = !isC2c && !!stripePublishableKey;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('settings.payment'),
            href: '/settings/payment',
        },
    ];
    const pageProps = usePage<SharedData>().props as Record<string, unknown>;
    const flash = pageProps.flash as
        | { status?: string; error?: string }
        | undefined;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('settings.payment')} />

            <h1 className="sr-only">{t('settings.payment')}</h1>

            <SettingsLayout mobilePageTitle={t('settings.payment')}>
                <Heading
                    variant="small"
                    title={t('settings.payment')}
                    description={t('settings.payment_description')}
                />

                {flash?.status && (
                    <p className="mb-4 text-sm text-green-600">
                        {flash.status}
                    </p>
                )}
                {flash?.error && (
                    <p className="mb-4 text-sm text-destructive">
                        {flash.error}
                    </p>
                )}

                {isC2c ? (
                    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                        <p className="text-sm font-medium text-foreground">
                            {t('payment.c2c_heading')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {t('payment.c2c_body')}
                        </p>
                        {testMode ? (
                            <p className="text-xs text-muted-foreground">
                                {t('payment.c2c_test_note')}
                            </p>
                        ) : null}
                    </div>
                ) : null}

                {!canManageCards && !isC2c ? (
                    <div className="rounded-lg border border-border bg-card p-4">
                        <p className="text-sm text-muted-foreground">
                            {t('payment.stripe_env_hint')}
                        </p>
                    </div>
                ) : null}

                {canManageCards ? (
                    <div className="space-y-3">
                        {testMode ? (
                            <p className="text-xs text-muted-foreground">
                                {t('payment.stripe_test_note')}
                            </p>
                        ) : null}
                        <CardVaultSection
                            title={t('payment.credit_debit_card')}
                            stripePublishableKey={stripePublishableKey}
                            paymentMethods={paymentMethods}
                        />
                    </div>
                ) : null}
            </SettingsLayout>
        </AppLayout>
    );
}
