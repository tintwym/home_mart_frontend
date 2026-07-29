/**
 * Drop-in replacement for @inertiajs/react (aliased in vite.config.ts).
 *
 * The app deploys as a static React SPA (Vercel) while the .NET backend
 * (Render) keeps speaking the Inertia protocol: any request carrying an
 * X-Inertia header receives { component, props, url, version } JSON.
 * Vercel rewrites proxy those requests to the backend so everything stays
 * same-origin (cookies, redirects and auth work unchanged). This module
 * re-implements the slice of the Inertia client API the pages use —
 * Head, Link, usePage, router, Form, useForm, createInertiaApp — on fetch().
 */
import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Page<P = Record<string, unknown>> {
    component: string;
    props: P & { errors?: Errors };
    url: string;
    version: string | null;
}

// Fortify nests some validation errors (e.g. confirmTwoFactorAuthentication.code),
// so values are left loosely typed on purpose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Errors = Record<string, any>;
type RequestData = Record<string, unknown> | FormData;

export interface VisitOptions {
    method?: 'get' | 'post' | 'put' | 'patch' | 'delete';
    data?: RequestData;
    replace?: boolean;
    preserveScroll?: boolean;
    preserveState?: boolean;
    only?: string[];
    headers?: Record<string, string>;
    forceFormData?: boolean;
    onSuccess?: (page: Page) => void;
    onError?: (errors: Errors) => void;
    onFinish?: () => void;
    onStart?: () => void;
}

interface UrlLike {
    url: string;
    method?: string;
}

type Href = string | UrlLike;

const hrefToUrl = (href: Href): string =>
    typeof href === 'string' ? href : href.url;

// ---------------------------------------------------------------------------
// Page store (module-level so router works outside React)
// ---------------------------------------------------------------------------

let currentPage: Page | null = null;
const listeners = new Set<() => void>();

function setCurrentPage(page: Page) {
    currentPage = page;
    listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}

// ---------------------------------------------------------------------------
// Core visit
// ---------------------------------------------------------------------------

function isFile(value: unknown): value is File {
    return typeof File !== 'undefined' && value instanceof File;
}

function hasFiles(data: Record<string, unknown>): boolean {
    return Object.values(data).some(isFile);
}

function toFormData(data: Record<string, unknown>): FormData {
    const fd = new FormData();
    for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined) continue;
        if (isFile(value)) {
            fd.append(key, value);
        } else if (typeof value === 'boolean') {
            fd.append(key, value ? '1' : '0');
        } else {
            fd.append(key, String(value));
        }
    }
    return fd;
}

let visitCounter = 0;
/**
 * Stable React remount key for the page component.
 * Updated on each visit unless preserveState keeps the same component mounted.
 */
let pageInstanceKey = 'boot';

async function visit(href: Href, options: VisitOptions = {}): Promise<void> {
    const method = (options.method || 'get').toLowerCase() as NonNullable<
        VisitOptions['method']
    >;
    let url = hrefToUrl(href);
    const id = ++visitCounter;

    options.onStart?.();

    try {
        const headers: Record<string, string> = {
            'X-Inertia': 'true',
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'text/html, application/xhtml+xml, application/json',
            ...(options.headers || {}),
        };
        if (currentPage?.version) {
            headers['X-Inertia-Version'] = currentPage.version;
        }
        if (options.only?.length && currentPage) {
            headers['X-Inertia-Partial-Data'] = options.only.join(',');
            headers['X-Inertia-Partial-Component'] = currentPage.component;
        }

        let body: BodyInit | undefined;
        const data = options.data;

        if (method === 'get') {
            if (data && !(data instanceof FormData)) {
                const u = new URL(url, window.location.origin);
                for (const [k, v] of Object.entries(data)) {
                    if (v !== null && v !== undefined) {
                        u.searchParams.set(k, String(v));
                    }
                }
                url = u.pathname + u.search;
            }
        } else if (data instanceof FormData) {
            body = data;
        } else if (data && (options.forceFormData || hasFiles(data))) {
            body = toFormData(data);
        } else if (data && Object.keys(data).length > 0) {
            // Match real Inertia: page POSTs are form fields (@RequestParam), not JSON.
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            const params = new URLSearchParams();
            for (const [k, v] of Object.entries(data)) {
                if (v === null || v === undefined) continue;
                if (Array.isArray(v)) {
                    for (const item of v) params.append(k, String(item));
                } else {
                    params.set(k, String(v));
                }
            }
            body = params.toString();
        }

        const res = await fetch(url, {
            method: method.toUpperCase(),
            headers,
            body,
            credentials: 'same-origin',
            // Manual: POST /locale etc. return 303; auto-follow can break through
            // the Vercel→Render proxy (405). Mirror real Inertia and re-GET.
            redirect: 'manual',
        });

        // Inertia external redirect (e.g. Stripe Checkout).
        if (res.status === 409 && res.headers.get('X-Inertia-Location')) {
            window.location.href = res.headers.get('X-Inertia-Location')!;
            return;
        }

        // Same-origin redirect (locale / region / currency / form saves).
        if (res.status >= 300 && res.status < 400) {
            const location = res.headers.get('Location');
            if (location) {
                const next = new URL(location, window.location.origin);
                if (next.origin === window.location.origin) {
                    await visit(next.pathname + next.search, {
                        method: 'get',
                        replace: true,
                        preserveScroll: options.preserveScroll ?? true,
                        onSuccess: options.onSuccess,
                        onError: options.onError,
                    });
                    return;
                }
                window.location.href = next.href;
                return;
            }
        }

        // Opaque redirect (cross-origin) — fall back to current URL.
        if (res.type === 'opaqueredirect' || res.status === 0) {
            await visit(window.location.pathname + window.location.search, {
                method: 'get',
                replace: true,
                preserveScroll: options.preserveScroll ?? true,
                onSuccess: options.onSuccess,
                onError: options.onError,
            });
            return;
        }

        const text = await res.text();
        let payload: unknown = null;
        try {
            payload = text ? JSON.parse(text) : null;
        } catch {
            payload = null;
        }

        const isPage =
            payload !== null &&
            typeof payload === 'object' &&
            'component' in (payload as object) &&
            'props' in (payload as object);

        if (!isPage) {
            if (res.ok) {
                // GET that returns HTML/static (e.g. Vercel index.html or an
                // ad-blocked empty shell) is a failed page navigation — do not
                // pretend the current page succeeded.
                if (method === 'get') {
                    options.onError?.({
                        message: 'Server did not return an Inertia page.',
                    });
                    return;
                }
                // Non-GET JSON endpoint hit through router (e.g. typing ping).
                if (currentPage) options.onSuccess?.(currentPage);
            } else {
                const p = (payload ?? {}) as Record<string, unknown>;
                const errors: Errors = {};
                if (p.errors && typeof p.errors === 'object') {
                    for (const [k, v] of Object.entries(
                        p.errors as Record<string, unknown>,
                    )) {
                        errors[k] = Array.isArray(v) ? String(v[0]) : v;
                    }
                } else {
                    errors.message =
                        typeof p.message === 'string'
                            ? p.message
                            : `Request failed (${res.status})`;
                }
                options.onError?.(errors);
            }
            return;
        }

        // A newer visit finished after this one started; drop the stale response.
        if (id !== visitCounter) return;

        const page = payload as Page;
        const prevComponent = currentPage?.component;
        // Remount when component/url changes, unless preserveState keeps this
        // component's React state (e.g. router.reload).
        if (
            !(
                options.preserveState === true &&
                prevComponent === page.component
            )
        ) {
            pageInstanceKey = `${page.component}:${page.url}`;
        }
        setCurrentPage(page);

        const sameUrl =
            page.url === window.location.pathname + window.location.search;
        if (options.replace || sameUrl) {
            window.history.replaceState({ inertia: true }, '', page.url);
        } else {
            window.history.pushState({ inertia: true }, '', page.url);
        }

        if (!options.preserveScroll) {
            window.scrollTo(0, 0);
        }

        const errors = (page.props?.errors ?? {}) as Errors;
        if (errors && Object.keys(errors).length > 0) {
            options.onError?.(errors);
        } else {
            options.onSuccess?.(page);
        }
    } catch (error) {
        console.error('[inertia] visit failed:', url, error);
        options.onError?.({ message: 'Network error. Please try again.' });
    } finally {
        options.onFinish?.();
    }
}

// ---------------------------------------------------------------------------
// router
// ---------------------------------------------------------------------------

export const router = {
    visit: (href: Href, options: VisitOptions = {}) =>
        void visit(href, options),
    get: (href: Href, data?: RequestData, options: VisitOptions = {}) =>
        void visit(href, { ...options, method: 'get', data }),
    post: (href: Href, data?: RequestData, options: VisitOptions = {}) =>
        void visit(href, { ...options, method: 'post', data }),
    put: (href: Href, data?: RequestData, options: VisitOptions = {}) =>
        void visit(href, { ...options, method: 'put', data }),
    patch: (href: Href, data?: RequestData, options: VisitOptions = {}) =>
        void visit(href, { ...options, method: 'patch', data }),
    delete: (href: Href, options: VisitOptions = {}) =>
        void visit(href, { ...options, method: 'delete' }),
    reload: (options: VisitOptions = {}) =>
        void visit(window.location.pathname + window.location.search, {
            ...options,
            method: 'get',
            preserveScroll: true,
            preserveState: true,
            replace: true,
        }),
};

// ---------------------------------------------------------------------------
// usePage
// ---------------------------------------------------------------------------

const PageContext = createContext<Page | null>(null);

export function usePage<T = Record<string, unknown>>(): Page<T> {
    const fromStore = useSyncExternalStore(
        subscribe,
        () => currentPage,
        () => currentPage,
    );
    const fromContext = useContext(PageContext);
    const page = fromStore ?? fromContext;
    if (!page) {
        throw new Error('usePage() called before the Inertia page loaded');
    }
    return page as Page<T>;
}

// ---------------------------------------------------------------------------
// Head
// ---------------------------------------------------------------------------

let titleTransform: (title: string) => string = (t) => t;

export function Head({
    title,
    children,
}: {
    title?: string;
    children?: React.ReactNode;
}) {
    useEffect(() => {
        if (title !== undefined) {
            document.title = titleTransform(title);
        }
    }, [title]);
    void children; // <title>/<meta> children aren't used by this app
    return null;
}

// ---------------------------------------------------------------------------
// Link
// ---------------------------------------------------------------------------

export interface InertiaLinkProps extends Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    'href'
> {
    href: Href;
    method?: string;
    data?: Record<string, unknown>;
    as?: string;
    preserveScroll?: boolean;
    preserveState?: boolean;
    /** Accepted for @inertiajs/react API parity; not applied to the DOM. */
    prefetch?: boolean | string | string[];
    cacheFor?: number | string | Array<number | string>;
    only?: string[];
    except?: string[];
    headers?: Record<string, string>;
    replace?: boolean;
}

export const Link = React.forwardRef<HTMLAnchorElement, InertiaLinkProps>(
    function Link(
        {
            href,
            method,
            data,
            as: _as,
            preserveScroll,
            preserveState,
            // Inertia-only props — must not leak onto <a> (React warns on boolean attrs).
            prefetch: _prefetch,
            cacheFor: _cacheFor,
            only: _only,
            except: _except,
            headers: _headers,
            replace: _replace,
            onClick,
            children,
            ...rest
        },
        ref,
    ) {
        const url = hrefToUrl(href);
        const resolvedMethod = (
            method ||
            (typeof href === 'object' ? href.method : 'get') ||
            'get'
        ).toLowerCase() as NonNullable<VisitOptions['method']>;

        const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
            onClick?.(event);
            if (event.defaultPrevented) return;
            if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return;
            }
            if (rest.target === '_blank') return;
            if (
                /^https?:\/\//i.test(url) &&
                !url.startsWith(window.location.origin)
            ) {
                return; // external link: normal navigation
            }

            event.preventDefault();
            void visit(url, {
                method: resolvedMethod,
                data,
                preserveScroll,
                preserveState,
            });
        };

        return (
            <a ref={ref} href={url} onClick={handleClick} {...rest}>
                {children}
            </a>
        );
    },
);

// ---------------------------------------------------------------------------
// <Form> (render-prop component, mirrors @inertiajs/react v2)
// ---------------------------------------------------------------------------

interface FormRenderProps {
    processing: boolean;
    errors: Errors;
    recentlySuccessful: boolean;
    wasSuccessful: boolean;
    clearErrors: () => void;
    resetAndClearErrors: () => void;
}

export interface FormProps extends Omit<
    React.FormHTMLAttributes<HTMLFormElement>,
    'action' | 'method' | 'children' | 'onError'
> {
    action: Href;
    method?: string;
    children: React.ReactNode | ((props: FormRenderProps) => React.ReactNode);
    options?: { preserveScroll?: boolean; preserveState?: boolean };
    resetOnSuccess?: boolean | string[];
    resetOnError?: boolean | string[];
    disableWhileProcessing?: boolean;
    transform?: (data: Record<string, unknown>) => Record<string, unknown>;
    onSuccess?: (page: Page) => void;
    onError?: (errors: Errors) => void;
    onFinish?: () => void;
}

function resetFields(
    form: HTMLFormElement,
    which: boolean | string[] | undefined,
) {
    if (!which) return;
    if (which === true) {
        form.reset();
        return;
    }
    for (const name of which) {
        const el = form.elements.namedItem(name);
        if (el && 'value' in el) {
            (el as unknown as HTMLInputElement).value = '';
        }
    }
}

export function Form({
    action,
    method = 'post',
    children,
    options,
    resetOnSuccess,
    resetOnError,
    disableWhileProcessing,
    transform,
    onSuccess,
    onError,
    onFinish,
    ...rest
}: FormProps) {
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Errors>({});
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);
    const [wasSuccessful, setWasSuccessful] = useState(false);
    const formRef = useRef<HTMLFormElement | null>(null);
    const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearErrors = () => setErrors({});
    const resetAndClearErrors = () => {
        formRef.current?.reset();
        setErrors({});
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        formRef.current = form;

        const fd = new FormData(form);
        let containsFile = false;
        const obj: Record<string, unknown> = {};
        for (const [key, value] of fd.entries()) {
            if (isFile(value)) {
                containsFile = true;
                break;
            }
            obj[key] = value;
        }

        const payload: RequestData = containsFile
            ? fd
            : transform
              ? transform(obj)
              : obj;

        setProcessing(true);
        setErrors({});

        const resolvedMethod = (
            method ||
            (typeof action === 'object' ? action.method : 'post') ||
            'post'
        ).toLowerCase() as NonNullable<VisitOptions['method']>;

        void visit(hrefToUrl(action), {
            method: resolvedMethod,
            data: payload,
            preserveScroll: options?.preserveScroll,
            preserveState: options?.preserveState,
            onSuccess: (page) => {
                setWasSuccessful(true);
                setRecentlySuccessful(true);
                if (successTimer.current) clearTimeout(successTimer.current);
                successTimer.current = setTimeout(
                    () => setRecentlySuccessful(false),
                    2000,
                );
                if (formRef.current) {
                    resetFields(formRef.current, resetOnSuccess);
                }
                onSuccess?.(page);
            },
            onError: (errs) => {
                setErrors(errs);
                if (formRef.current) {
                    resetFields(formRef.current, resetOnError);
                }
                onError?.(errs);
            },
            onFinish: () => {
                setProcessing(false);
                onFinish?.();
            },
        });
    };

    useEffect(
        () => () => {
            if (successTimer.current) clearTimeout(successTimer.current);
        },
        [],
    );

    return (
        <form
            onSubmit={handleSubmit}
            {...rest}
            {...(disableWhileProcessing && processing ? { inert: true } : {})}
        >
            {typeof children === 'function'
                ? children({
                      processing,
                      errors,
                      recentlySuccessful,
                      wasSuccessful,
                      clearErrors,
                      resetAndClearErrors,
                  })
                : children}
        </form>
    );
}

// ---------------------------------------------------------------------------
// useForm
// ---------------------------------------------------------------------------

export function useForm<
    T extends Record<string, unknown> = Record<string, unknown>,
>(initial?: T) {
    const initialRef = useRef<T>((initial ?? {}) as T);
    const [data, setDataState] = useState<T>(() => initialRef.current);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Errors>({});
    const dataRef = useRef(data);
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    function setData(key: keyof T | Partial<T>, value?: unknown) {
        if (typeof key === 'object') {
            setDataState((prev) => ({ ...prev, ...(key as Partial<T>) }));
        } else {
            setDataState((prev) => ({ ...prev, [key]: value }));
        }
    }

    function submit(
        method: NonNullable<VisitOptions['method']>,
        url: Href,
        opts: VisitOptions = {},
    ) {
        setProcessing(true);
        setErrors({});
        void visit(hrefToUrl(url), {
            ...opts,
            method,
            data: dataRef.current,
            onSuccess: (page) => opts.onSuccess?.(page),
            onError: (errs) => {
                setErrors(errs);
                opts.onError?.(errs);
            },
            onFinish: () => {
                setProcessing(false);
                opts.onFinish?.();
            },
        });
    }

    return {
        data,
        setData,
        processing,
        errors,
        post: (url: Href, opts?: VisitOptions) => submit('post', url, opts),
        put: (url: Href, opts?: VisitOptions) => submit('put', url, opts),
        patch: (url: Href, opts?: VisitOptions) => submit('patch', url, opts),
        delete: (url: Href, opts?: VisitOptions) => submit('delete', url, opts),
        get: (url: Href, opts?: VisitOptions) => submit('get', url, opts),
        reset: (...keys: (keyof T)[]) => {
            if (keys.length === 0) {
                setDataState(initialRef.current);
            } else {
                setDataState((prev) => {
                    const next = { ...prev };
                    for (const k of keys) next[k] = initialRef.current[k];
                    return next;
                });
            }
        },
        clearErrors: () => setErrors({}),
        setError: (key: string, message: string) =>
            setErrors((prev) => ({ ...prev, [key]: message })),
    };
}

// ---------------------------------------------------------------------------
// createInertiaApp
// ---------------------------------------------------------------------------

type PageModule = { default: React.ComponentType<Record<string, unknown>> };
type Resolver = (name: string) => Promise<PageModule> | PageModule;

interface CreateAppOptions {
    resolve: Resolver;
    setup: (args: {
        el: HTMLElement;
        App: React.ComponentType;
        props: Record<string, never>;
    }) => void;
    title?: (title: string) => string;
    progress?: unknown;
    /** Accepted for SSR entry compatibility; ignored by this CSR shim. */
    page?: unknown;
    render?: unknown;
}

export async function createInertiaApp(
    options: CreateAppOptions,
): Promise<void> {
    if (options.title) titleTransform = options.title;

    const el =
        document.getElementById('app') ??
        document.getElementById('root') ??
        document.body;

    // When the backend served the HTML shell (dev via Vite proxy), the initial
    // page is embedded as data-page; production static hosting fetches it.
    const dataPage = el.getAttribute?.('data-page');
    if (dataPage) {
        try {
            currentPage = JSON.parse(dataPage) as Page;
            pageInstanceKey = `${currentPage.component}:${currentPage.url}`;
        } catch {
            currentPage = null;
        }
    }

    const resolveComponent = async (name: string) => {
        const mod = await Promise.resolve(options.resolve(name));
        return (
            mod.default ??
            (mod as unknown as React.ComponentType<Record<string, unknown>>)
        );
    };

    function InertiaRoot() {
        const page = useSyncExternalStore(
            subscribe,
            () => currentPage,
            () => currentPage,
        );
        const [view, setView] = useState<{
            name: string;
            Component: React.ComponentType<Record<string, unknown>>;
            page: Page;
        } | null>(null);
        const [bootError, setBootError] = useState(false);
        const resolveGen = useRef(0);

        const load = () => {
            setBootError(false);
            void visit(window.location.pathname + window.location.search, {
                replace: true,
                preserveScroll: true,
                onError: () => setBootError(true),
            });
        };

        // Initial fetch (unless the shell embedded the page) + back/forward.
        useEffect(() => {
            if (!currentPage) load();
            const onPop = () =>
                void visit(window.location.pathname + window.location.search, {
                    replace: true,
                });
            window.addEventListener('popstate', onPop);
            return () => window.removeEventListener('popstate', onPop);
        }, []);

        // Keep component + props in sync. Never render page A props with page B's
        // component (e.g. dashboard props into listings/show crashes on Back).
        useEffect(() => {
            if (!page) return;
            let cancelled = false;
            const gen = ++resolveGen.current;
            const name = page.component;

            void resolveComponent(name).then((C) => {
                if (cancelled || gen !== resolveGen.current) return;
                setView({ name, Component: C, page });
            });

            return () => {
                cancelled = true;
            };
        }, [page, page?.component, page?.url, page?.version]);

        if (!view) {
            if (!bootError) return null;
            return (
                <div
                    style={{
                        minHeight: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                        padding: 24,
                        textAlign: 'center',
                    }}
                >
                    <p style={{ color: '#71717a', fontSize: 14, margin: 0 }}>
                        Could not load the app. Check that the API is up, then
                        retry.
                    </p>
                    <button
                        type="button"
                        onClick={load}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 8,
                            border: '1px solid #d4d4d8',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 14,
                        }}
                    >
                        Retry
                    </button>
                </div>
            );
        }

        const { Component, page: viewPage } = view;

        return (
            <PageContext.Provider value={viewPage}>
                <Component key={pageInstanceKey} {...viewPage.props} />
            </PageContext.Provider>
        );
    }

    options.setup({
        el,
        App: InertiaRoot,
        props: {} as Record<string, never>,
    });
}
