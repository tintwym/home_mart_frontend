import { next, rewrite } from '@vercel/edge';

const BACKEND = 'https://home-mart-backend.onrender.com';

/**
 * Static `index.html` is served for `/` before vercel.json rewrites, so Inertia
 * GETs never reach Render. Middleware runs first and proxies those requests.
 */
export default function middleware(request: Request) {
    const inertia = request.headers.get('x-inertia');
    if (inertia === 'true' || inertia === '1') {
        const url = new URL(request.url);
        return rewrite(new URL(`${BACKEND}${url.pathname}${url.search}`));
    }
    return next();
}

export const config = {
    matcher: ['/((?!assets/|.*\\..*).*)', '/'],
};
