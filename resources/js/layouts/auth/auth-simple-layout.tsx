import { Link } from '@inertiajs/react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { dashboard } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-slate-50/50 p-4 sm:p-6 md:p-10 dark:bg-slate-950/60">
            {/* Mock Blurred Homepage/Dashboard Background underneath the glass overlay */}
            <div className="pointer-events-none absolute inset-0 -z-30 flex scale-105 flex-col overflow-hidden opacity-40 blur-[12px] select-none dark:opacity-20">
                {/* Mock Header */}
                <div className="flex items-center justify-between border-b border-border/10 px-8 py-4">
                    <div className="h-6 w-24 rounded bg-muted-foreground/30" />
                    <div className="h-9 w-64 rounded bg-muted-foreground/20" />
                    <div className="flex gap-4">
                        <div className="h-6 w-16 rounded bg-muted-foreground/30" />
                        <div className="h-6 w-16 rounded bg-muted-foreground/30" />
                    </div>
                </div>
                {/* Mock Hero Banner */}
                <div className="m-8 h-48 rounded-2xl bg-gradient-to-r from-primary/30 via-emerald-500/15 to-primary/20" />
                {/* Mock Grid of Listing Cards */}
                <div className="grid grid-cols-2 gap-6 px-8 py-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex flex-col gap-3 rounded-xl border border-border/10 bg-muted/20 p-4"
                        >
                            <div className="aspect-square w-full rounded bg-muted-foreground/20" />
                            <div className="h-4 w-3/4 rounded bg-muted-foreground/30" />
                            <div className="h-3 w-1/2 rounded bg-muted-foreground/20" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Ambient Background Glows */}
            <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden select-none">
                <div className="absolute -top-[10%] -left-[10%] h-[50%] w-[50%] rounded-full bg-primary/20 blur-[120px] dark:bg-primary/10" />
                <div className="absolute -right-[10%] -bottom-[10%] h-[50%] w-[50%] rounded-full bg-emerald-500/20 blur-[120px] dark:bg-emerald-500/10" />
            </div>

            {/* Transparent backdrop close area (clicking outside the modal navigates back to dashboard) */}
            <Link
                href={dashboard()}
                className="absolute inset-0 -z-10 cursor-default"
                aria-hidden="true"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-[420px] rounded-2xl border border-white/20 bg-white/90 p-6 text-foreground shadow-2xl backdrop-blur-md sm:p-8 md:p-10 dark:border-slate-800/80 dark:bg-slate-900/95"
            >
                {/* Close Button */}
                <Link
                    href={dashboard()}
                    aria-label="Close"
                    className="absolute top-4 right-4 flex size-8 cursor-pointer items-center justify-center rounded-full border border-border/40 text-muted-foreground transition-all duration-300 hover:rotate-90 hover:bg-accent hover:text-foreground"
                >
                    <X className="size-4" />
                </Link>

                <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center gap-3">
                        <Link
                            href={dashboard()}
                            className="flex flex-col items-center gap-1.5 font-medium transition-transform hover:scale-105"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
                                <AppLogoIcon className="size-7 fill-current text-primary" />
                            </div>
                        </Link>

                        <div className="space-y-1 text-center">
                            <h2 className="text-xl font-bold tracking-tight text-foreground">
                                {title}
                            </h2>
                            {description && (
                                <p className="mx-auto max-w-[280px] text-center text-xs leading-relaxed text-muted-foreground">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                    {children}
                </div>
            </motion.div>
        </div>
    );
}
