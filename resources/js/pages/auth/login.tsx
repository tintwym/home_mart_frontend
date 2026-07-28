import { Form, Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Key } from 'lucide-react';
import { motion } from 'motion/react';
import type { Variants } from 'motion/react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
    browserSupportsWebAuthn,
    startAuthentication,
} from '@/lib/passkeys-client';
import { signInWithSocial, type SocialProvider } from '@/lib/firebase';
import AuthLayout from '@/layouts/auth-layout';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    passkeyError?: string | null;
    canResetPassword?: boolean;
    canRegister?: boolean;
};

export default function Login({
    status,
    passkeyError,
    canResetPassword = true,
    canRegister = true,
}: Props) {
    const [passkeyLoading, setPasskeyLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(
        null,
    );
    const [socialError, setSocialError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Form fields for real-time validation
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailTouched, setEmailTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);

    const loginWithSocial = async (provider: SocialProvider) => {
        setSocialError(null);
        setSocialLoading(provider);
        try {
            const { idToken } = await signInWithSocial(provider);
            router.post(
                '/auth/firebase',
                { id_token: idToken },
                {
                    onFinish: () => setSocialLoading(null),
                    onError: (errors) => {
                        const message =
                            (typeof errors.email === 'string' && errors.email) ||
                            (typeof errors.message === 'string' && errors.message) ||
                            'Social sign-in failed. Please try again.';
                        setSocialError(message);
                    },
                },
            );
        } catch (err) {
            setSocialLoading(null);
            const code =
                err && typeof err === 'object' && 'code' in err
                    ? String((err as { code?: string }).code)
                    : '';
            if (
                code === 'auth/popup-closed-by-user' ||
                code === 'auth/cancelled-popup-request'
            ) {
                return;
            }
            setSocialError(
                err instanceof Error
                    ? err.message
                    : 'Social sign-in failed. Please try again.',
            );
        }
    };

    const loginWithPasskey = async () => {
        setPasskeyLoading(true);
        try {
            const res = await fetch('/passkeys/authentication-options', {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) {
                throw new Error('Failed to load passkey options');
            }
            const optionsJSON = await res.json();
            const state =
                typeof optionsJSON?.state === 'string'
                    ? optionsJSON.state
                    : null;
            const credential = await startAuthentication({ optionsJSON });
            router.post(
                '/passkeys/authenticate',
                {
                    start_authentication_response: JSON.stringify(credential),
                    ...(state ? { state } : {}),
                },
                {
                    onFinish: () => setPasskeyLoading(false),
                },
            );
        } catch {
            setPasskeyLoading(false);
        }
    };

    // Real-time validation checks
    const isEmailValid = email
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        : null;
    const isPasswordValid = password ? password.length >= 8 : null;

    // Framer motion variants for stagger
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05,
            },
        },
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 10 },
        show: {
            opacity: 1,
            y: 0,
            transition: { type: 'spring', stiffness: 300, damping: 24 },
        },
    };

    return (
        <AuthLayout
            title="Welcome Back"
            description="Sign in to your account to manage your listings and profile"
        >
            <Head title="Log in" />

            <Form
                action={store.url()}
                method="post"
                resetOnSuccess={['password']}
                className="flex flex-col gap-4"
            >
                {({ processing, errors }) => {
                    const redirectParam =
                        typeof window !== 'undefined'
                            ? new URLSearchParams(window.location.search).get(
                                  'redirect',
                              )
                            : null;
                    return (
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="grid gap-4"
                        >
                            {redirectParam &&
                            redirectParam.startsWith('/') &&
                            !redirectParam.startsWith('//') ? (
                                <input
                                    type="hidden"
                                    name="redirect"
                                    value={redirectParam}
                                />
                            ) : null}
                            {/* Email Field */}
                            <motion.div
                                variants={itemVariants}
                                className="group grid gap-1.5"
                            >
                                <Label
                                    htmlFor="email"
                                    className="text-xs font-bold text-zinc-700 dark:text-zinc-300"
                                >
                                    Email Address
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary dark:text-zinc-500" />
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        placeholder="yourname@domain.com"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setEmailTouched(true);
                                        }}
                                        onBlur={() => setEmailTouched(true)}
                                        className="dark:bg-zinc-850 h-11 rounded-xl border-zinc-200/80 bg-zinc-50/50 pl-10 transition-all hover:border-zinc-300 focus:bg-white dark:border-zinc-800 dark:hover:border-zinc-700 dark:focus:bg-zinc-900"
                                    />
                                </div>

                                {/* Real-time Email Validation Indicator */}
                                {(emailTouched || email.length > 0) && (
                                    <motion.p
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className={`mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold ${isEmailValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}
                                    >
                                        <span>{isEmailValid ? '✓' : '✗'}</span>
                                        <span>
                                            {email.length === 0
                                                ? 'Email is required'
                                                : isEmailValid
                                                  ? 'Valid email address format'
                                                  : 'Please enter a valid email address'}
                                        </span>
                                    </motion.p>
                                )}
                                <InputError message={errors.email} />
                            </motion.div>

                            {/* Password Field */}
                            <motion.div
                                variants={itemVariants}
                                className="group grid gap-1.5"
                            >
                                <div className="flex items-center justify-between">
                                    <Label
                                        htmlFor="password"
                                        className="text-xs font-bold text-zinc-700 dark:text-zinc-300"
                                    >
                                        Password
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="text-xs font-bold text-primary transition-all hover:underline"
                                            tabIndex={5}
                                        >
                                            Forgot password?
                                        </TextLink>
                                    )}
                                </div>
                                <div className="relative">
                                    <Lock className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary dark:text-zinc-500" />
                                    <Input
                                        id="password"
                                        type={
                                            showPassword ? 'text' : 'password'
                                        }
                                        name="password"
                                        required
                                        tabIndex={2}
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setPasswordTouched(true);
                                        }}
                                        onBlur={() => setPasswordTouched(true)}
                                        className="dark:bg-zinc-850 h-11 rounded-xl border-zinc-200/80 bg-zinc-50/50 pr-10 pl-10 transition-all hover:border-zinc-300 focus:bg-white dark:border-zinc-800 dark:hover:border-zinc-700 dark:focus:bg-zinc-900"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
                                        aria-label={
                                            showPassword
                                                ? 'Hide password'
                                                : 'Show password'
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff className="size-4" />
                                        ) : (
                                            <Eye className="size-4" />
                                        )}
                                    </button>
                                </div>

                                {/* Real-time Password Validation Indicator */}
                                {(passwordTouched || password.length > 0) && (
                                    <motion.p
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className={`mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold ${isPasswordValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}
                                    >
                                        <span>
                                            {isPasswordValid ? '✓' : '✗'}
                                        </span>
                                        <span>
                                            {password.length === 0
                                                ? 'Password is required'
                                                : isPasswordValid
                                                  ? 'Sufficient password length'
                                                  : 'Must be at least 8 characters long'}
                                        </span>
                                    </motion.p>
                                )}
                                <InputError message={errors.password} />
                            </motion.div>

                            {/* Remember Me */}
                            <motion.div
                                variants={itemVariants}
                                className="flex items-center space-x-2.5 py-1"
                            >
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="size-4.5 rounded-md border-zinc-300 text-primary focus:ring-primary"
                                />
                                <Label
                                    htmlFor="remember"
                                    className="cursor-pointer text-sm font-semibold text-zinc-600 select-none dark:text-zinc-400"
                                >
                                    Keep me signed in
                                </Label>
                            </motion.div>

                            {/* Submit Button */}
                            <motion.div
                                variants={itemVariants}
                                className="pt-1"
                            >
                                <Button
                                    type="submit"
                                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/95 hover:shadow-lg active:scale-[0.99]"
                                    tabIndex={4}
                                    disabled={processing}
                                    data-test="login-button"
                                >
                                    {processing ? (
                                        <Spinner className="size-4" />
                                    ) : null}
                                    <span>Sign In</span>
                                </Button>
                            </motion.div>

                            {/* Divider */}
                            <motion.div
                                variants={itemVariants}
                                className="relative flex items-center justify-center py-1.5 text-[10px] font-extrabold tracking-wider text-zinc-400 uppercase dark:text-zinc-500"
                            >
                                <span className="absolute inset-x-0 h-px bg-zinc-200/60 dark:bg-zinc-800/80" />
                                <span className="relative z-10 bg-white px-3 dark:bg-slate-900">
                                    Or connect with
                                </span>
                            </motion.div>

                            {/* Social Buttons */}
                            <motion.div
                                variants={itemVariants}
                                className="space-y-2"
                            >
                                {socialError ? (
                                    <p
                                        className="text-center text-sm text-destructive"
                                        role="alert"
                                    >
                                        {socialError}
                                    </p>
                                ) : null}
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex h-10.5 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-zinc-200/80 font-bold transition-all hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
                                        disabled={
                                            processing ||
                                            passkeyLoading ||
                                            socialLoading !== null
                                        }
                                        onClick={() =>
                                            void loginWithSocial('google')
                                        }
                                    >
                                        {socialLoading === 'google' ? (
                                            <Spinner className="size-4" />
                                        ) : (
                                            <svg
                                                className="size-4 shrink-0"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                    fill="#4285F4"
                                                />
                                                <path
                                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                    fill="#34A853"
                                                />
                                                <path
                                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                                    fill="#FBBC05"
                                                />
                                                <path
                                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                                    fill="#EA4335"
                                                />
                                            </svg>
                                        )}
                                        <span className="text-xs">Google</span>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex h-10.5 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-zinc-200/80 font-bold transition-all hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
                                        disabled={
                                            processing ||
                                            passkeyLoading ||
                                            socialLoading !== null
                                        }
                                        onClick={() =>
                                            void loginWithSocial('apple')
                                        }
                                    >
                                        {socialLoading === 'apple' ? (
                                            <Spinner className="size-4" />
                                        ) : (
                                            <svg
                                                className="size-4 shrink-0 fill-current text-zinc-900 dark:text-white"
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.7-1.13 1.84-.99 2.94.1.08.2.12.3.12.86 0 1.91-.56 2.52-1.45z" />
                                            </svg>
                                        )}
                                        <span className="text-xs">Apple</span>
                                    </Button>
                                </div>
                            </motion.div>

                            {/* Passkey Login Option */}
                            {browserSupportsWebAuthn() && (
                                <motion.div
                                    variants={itemVariants}
                                    className="pt-1"
                                >
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex h-10.5 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-zinc-200 text-xs font-bold hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/30"
                                        disabled={processing || passkeyLoading}
                                        onClick={() => void loginWithPasskey()}
                                    >
                                        {passkeyLoading ? (
                                            <Spinner className="size-4" />
                                        ) : (
                                            <Key className="size-4 text-amber-500" />
                                        )}
                                        <span>Sign in with passkey</span>
                                    </Button>
                                </motion.div>
                            )}

                            {/* Create Account Link */}
                            {canRegister && (
                                <motion.div
                                    variants={itemVariants}
                                    className="mt-2 border-t border-zinc-100 pt-4 text-center text-sm text-zinc-500 dark:border-zinc-800/60 dark:text-zinc-400"
                                >
                                    New here?{' '}
                                    <TextLink
                                        href={register()}
                                        tabIndex={5}
                                        className="ml-0.5 font-bold text-primary hover:underline"
                                    >
                                        Create an account
                                    </TextLink>
                                </motion.div>
                            )}
                        </motion.div>
                    );
                }}
            </Form>

            {status && (
                <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-center text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {status}
                </div>
            )}

            {passkeyError ? (
                <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-center text-sm font-bold text-destructive">
                    {passkeyError}
                </div>
            ) : null}
        </AuthLayout>
    );
}
