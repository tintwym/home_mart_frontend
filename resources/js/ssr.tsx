import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import ReactDOMServer from 'react-dom/server';
import type { ComponentType } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const appName = import.meta.env.VITE_APP_NAME || 'Home Mart';
const pages = import.meta.glob('./pages/**/*.tsx');

createServer((page) =>
    createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        title: (title) => (title ? `${title} - ${appName}` : appName),
        resolve: async (name) => {
            const component = pages[`./pages/${name}.tsx`];
            if (!component) {
                throw new Error(`Unknown Inertia page: ${name}`);
            }
            return (await component()) as {
                default: ComponentType<Record<string, unknown>>;
            };
        },
        setup: ({ App, props }) => {
            return (
                <>
                    <App {...props} />
                    <SpeedInsights />
                </>
            );
        },
    }),
);
