import { usePage } from '@inertiajs/react';
import type { SharedCurrency, SharedData } from '@/types';

const defaultCurrency: SharedCurrency = {
    code: 'USD',
    symbol: '$',
    decimals: 2,
};

// Units per 1 USD; fallback when the server doesn't share exchangeRates.
const defaultRates: Record<string, number> = {
    USD: 1,
    SGD: 1.35,
    MMK: 4500,
    VND: 26000,
};

const LOCALE_TAGS: Record<string, string> = {
    vi: 'vi-VN',
    my: 'my-MM',
    zh: 'zh-CN',
    ja: 'ja-JP',
};

function toNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const n = Number(value);
        if (Number.isFinite(n)) return n;
    }
    return fallback;
}

function normalizeRates(
    raw: Record<string, unknown> | undefined,
): Record<string, number> {
    const out: Record<string, number> = { ...defaultRates };
    if (!raw) return out;
    for (const [code, value] of Object.entries(raw)) {
        const n = toNumber(value, NaN);
        if (Number.isFinite(n) && n > 0) {
            out[code] = n;
        }
    }
    return out;
}

export function useCurrency() {
    const page = usePage<SharedData>();
    const currency: SharedCurrency =
        (page.props.currency as SharedCurrency | undefined) ?? defaultCurrency;
    const currencies =
        (page.props.currencies as Record<string, SharedCurrency> | undefined) ??
        {};
    const rates = normalizeRates(
        page.props.exchangeRates as Record<string, unknown> | undefined,
    );
    const localeTag = LOCALE_TAGS[page.props.locale ?? 'en'] ?? 'en-US';

    /** Resolve a currency code from a seller region (MM) or currency code (MMK). */
    function resolveCurrencyCode(
        sellerRegionOrCode?: string | null,
    ): string {
        if (!sellerRegionOrCode) return 'USD';
        const key = sellerRegionOrCode.trim();
        if (rates[key]) return key;
        if (currencies[key]?.code) return currencies[key]!.code;
        return 'USD';
    }

    /**
     * Convert an amount from one currency into the viewer's display currency
     * using USD-based rates (units per 1 USD).
     */
    function convert(amount: number, fromCode: string): number {
        if (fromCode === currency.code) return amount;
        const fromRate = rates[fromCode];
        const toRate = rates[currency.code];
        if (!fromRate || !toRate) return amount;
        return (amount / fromRate) * toRate;
    }

    /** Format a value already expressed in the viewer's display currency. */
    function formatAmount(amount: number): string {
        const decimals = currency.decimals ?? 2;
        const formatted = amount.toLocaleString(localeTag, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
        return `${currency.symbol}${formatted}`;
    }

    /**
     * Format a price in the viewer's display currency.
     *
     * Prices are stored in the seller's currency; pass sellerRegion so the
     * amount is converted (e.g. a $35 US listing shows as Ks 157,500 when the
     * shopper displays MMK). Omit sellerRegion for amounts already priced in
     * the platform base currency (USD), e.g. slot/trend fees or order totals.
     */
    function formatPrice(
        amount: number | string,
        sellerRegion?: string | null,
    ): string {
        const num = toNumber(amount, NaN);
        if (Number.isNaN(num)) {
            return `${currency.symbol}0`;
        }

        const sourceCode = resolveCurrencyCode(sellerRegion);
        const converted = convert(num, sourceCode);
        return formatAmount(converted);
    }

    /** Convert a listing price into the viewer's display currency. */
    function toDisplayAmount(
        amount: number | string,
        sellerRegion?: string | null,
    ): number {
        const num = toNumber(amount, NaN);
        if (Number.isNaN(num)) return 0;
        return convert(num, resolveCurrencyCode(sellerRegion));
    }

    /**
     * Convert a listing price to USD for filters/sort that use USD-based bands
     * (so MMK/VND shoppers still see US-priced catalog items).
     */
    function toUsdAmount(
        amount: number | string,
        sellerRegion?: string | null,
    ): number {
        const num = toNumber(amount, NaN);
        if (Number.isNaN(num)) return 0;
        const sourceCode = resolveCurrencyCode(sellerRegion);
        if (sourceCode === 'USD') return num;
        const fromRate = rates[sourceCode];
        if (!fromRate) return num;
        return num / fromRate;
    }

    return {
        currency,
        currencies,
        rates,
        convert,
        formatPrice,
        formatAmount,
        toDisplayAmount,
        toUsdAmount,
        resolveCurrencyCode,
    };
}
