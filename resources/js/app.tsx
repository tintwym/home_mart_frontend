import { createInertiaApp } from '@inertiajs/react';
import { StrictMode, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import { ToastProvider } from './components/ui/toast';
import { initializeTheme } from './hooks/use-appearance';

const appName = import.meta.env.VITE_APP_NAME || 'Home Mart';

const pages = import.meta.glob('./pages/**/*.tsx');

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: async (name) => {
        const importPage = pages[`./pages/${name}.tsx`];
        if (!importPage) {
            throw new Error(`Page not found: ./pages/${name}.tsx`);
        }
        return (await importPage()) as {
            default: ComponentType<Record<string, unknown>>;
        };
    },
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <StrictMode>
                <ToastProvider>
                    <App {...props} />
                </ToastProvider>
            </StrictMode>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
