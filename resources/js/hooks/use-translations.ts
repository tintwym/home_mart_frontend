import { usePage } from '@inertiajs/react';

type Translations = Record<string, string>;

export function useTranslations() {
    const page = usePage();
    const translations: Translations =
        (page.props.translations as Translations) ?? {};
    const locale = (page.props.locale as string) ?? 'en';

    function t(key: string, params?: Record<string, string | number>): string {
        let value = translations[key] ?? key;
        if (params) {
            // Replace longer keys first and require a word boundary so e.g.
            // :count doesn't also match inside :count_total.
            const entries = Object.entries(params).sort(
                (a, b) => b[0].length - a[0].length,
            );
            for (const [k, v] of entries) {
                const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                value = value.replace(
                    new RegExp(`:${escaped}\\b`, 'g'),
                    String(v),
                );
            }
        }
        return value;
    }

    /** Translated category name by slug; falls back to DB name if no key. */
    function categoryName(cat: { name: string; slug: string }): string {
        const key = 'category.' + cat.slug;
        return translations[key] ?? cat.name;
    }

    return { t, categoryName, locale, translations };
}
