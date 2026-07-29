import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    resolve: {
        alias: [
            {
                find: '@',
                replacement: path.resolve(__dirname, 'resources/js'),
            },
            {
                // The SPA build ships its own Inertia client that talks to the
                // .NET backend; every page keeps importing '@inertiajs/react'.
                find: '@inertiajs/react',
                replacement: path.resolve(__dirname, 'resources/js/lib/inertia/index.tsx'),
            },
            {
                find: 'virtual:pwa-register',
                replacement: path.resolve(__dirname, 'resources/js/pwa-register-stub.ts'),
            }
        ],
    },
    plugins: [
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
    ],
    // Pages are lazy-loaded, so pre-bundle their dependencies up front.
    // Otherwise Vite re-optimizes mid-session and briefly serves two React
    // copies, causing "Invalid hook call" errors in development.
    optimizeDeps: {
        include: [
            '@headlessui/react',
            'motion/react',
            'lucide-react',
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
            'input-otp',
            '@simplewebauthn/browser',
            '@stripe/react-stripe-js',
            '@stripe/stripe-js',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip',
        ],
    },
    server: {
        host: '0.0.0.0',
        port: 3000,
        allowedHosts: 'all',
        // All page (Inertia) and API routes are handled by the .NET backend;
        // Vite serves only the JS/CSS modules and static assets.
        proxy: Object.fromEntries(
            [
                // Root URL (dashboard), including search like /?q=sofa
                '^/(\\?.*)?$',
                '/api',
                '/login',
                '/register',
                '/logout',
                '/listings',
                '/categories',
                '/cart',
                '/favorites',
                '/chat',
                '/inbox',
                '/checkout',
                '/settings',
                '/region',
                '/locale',
                '/currency',
                '/download',
                '/upgrades',
                '/users',
                '/storage',
                '/forgot-password',
                '/reset-password',
                '/email',
                '/two-factor-challenge',
                '/user',
                '/passkeys',
                '/notifications',
            ].map((route) => [
                route,
                { target: 'http://localhost:5199', changeOrigin: true },
            ]),
        ),
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
    esbuild: {
        jsx: 'automatic',
    },
});
