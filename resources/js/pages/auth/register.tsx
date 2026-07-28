import { Form, Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Eye, EyeOff, User, Mail, Lock, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import type { Variants } from 'motion/react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { signInWithSocial, type SocialProvider } from '@/lib/firebase';
import AuthLayout from '@/layouts/auth-layout';
import { login } from '@/routes';
import { store } from '@/routes/register';

export default function Register() {
    // Show/hide states for password inputs
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(
        null,
    );
    const [socialError, setSocialError] = useState<string | null>(null);

    // Form fields for real-time validation
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');

    // Touched states for blur handling
    const [nameTouched, setNameTouched] = useState(false);
    const [emailTouched, setEmailTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [passwordConfirmationTouched, setPasswordConfirmationTouched] =
        useState(false);

    const registerWithSocial = async (provider: SocialProvider) => {
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
                            (typeof errors.message === 'string' &&
                                errors.message) ||
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

    // Real-time validation checks
    const isNameValid = name ? name.trim().length >= 2 : null;
    const isEmailValid = email
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        : null;
    const isPasswordValid = password ? password.length >= 8 : null;
    const isConfirmationValid = passwordConfirmation
        ? passwordConfirmation === password
        : null;

    // Password Strength Meter Calculations
    const hasMinLength = password.length >= 8;
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);

    let strengthScore = 0;
    if (password.length > 0) {
        if (hasMinLength) strengthScore += 1;
        if (hasNumber) strengthScore += 1;
        if (hasSpecial) strengthScore += 1;
        if (hasMixedCase) strengthScore += 1;
    }

    const getStrengthLabel = () => {
        if (password.length === 0) return '';
        switch (strengthScore) {
            case 1:
                return 'Weak';
            case 2:
                return 'Fair';
            case 3:
                return 'Good';
            case 4:
                return 'Very Strong';
            default:
                return 'Weak';
        }
    };

    const getStrengthColor = () => {
        switch (strengthScore) {
            case 1:
                return 'bg-red-500';
            case 2:
                return 'bg-orange-500';
            case 3:
                return 'bg-blue-500';
            case 4:
                return 'bg-emerald-500';
            default:
                return 'bg-zinc-200 dark:bg-zinc-800';
        }
    };

    const getStrengthTextColor = () => {
        switch (strengthScore) {
            case 1:
                return 'text-red-500 dark:text-red-400';
            case 2:
                return 'text-orange-500 dark:text-orange-400';
            case 3:
                return 'text-blue-500 dark:text-blue-400';
            case 4:
                return 'text-emerald-500 dark:text-emerald-400';
            default:
                return 'text-muted-foreground';
        }
    };

    // Framer motion variants for stagger
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.04,
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
            title="Create an Account"
            description="Get started with your free merchant account and start listing"
        >
            <Head title="Register" />
            <Form
                action={store.url()}
                method="post"
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-4"
            >
                {({ processing, errors }) => (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid gap-4"
                    >
                        {/* Name Field */}
                        <motion.div
                            variants={itemVariants}
                            className="group grid gap-1.5"
                        >
                            <Label
                                htmlFor="name"
                                className="text-xs font-bold text-zinc-700 dark:text-zinc-300"
                            >
                                Full Name
                            </Label>
                            <div className="relative">
                                <User className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary dark:text-zinc-500" />
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="name"
                                    name="name"
                                    placeholder="your name"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        setNameTouched(true);
                                    }}
                                    onBlur={() => setNameTouched(true)}
                                    className="dark:bg-zinc-850 h-11 rounded-xl border-zinc-200/80 bg-zinc-50/50 pl-10 transition-all hover:border-zinc-300 focus:bg-white dark:border-zinc-800 dark:hover:border-zinc-700 dark:focus:bg-zinc-900"
                                />
                            </div>

                            {/* Real-time Name Validation Indicator */}
                            {(nameTouched || name.length > 0) && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className={`mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold ${isNameValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}
                                >
                                    <span>{isNameValid ? '✓' : '✗'}</span>
                                    <span>
                                        {name.length === 0
                                            ? 'Name is required'
                                            : isNameValid
                                              ? 'Valid name format'
                                              : 'Name must be at least 2 characters long'}
                                    </span>
                                </motion.p>
                            )}
                            <InputError message={errors.name} />
                        </motion.div>

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
                                    required
                                    tabIndex={2}
                                    autoComplete="email"
                                    name="email"
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
                            <Label
                                htmlFor="password"
                                className="text-xs font-bold text-zinc-700 dark:text-zinc-300"
                            >
                                Password
                            </Label>
                            <div className="relative">
                                <Lock className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary dark:text-zinc-500" />
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    tabIndex={3}
                                    autoComplete="new-password"
                                    name="password"
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

                            {/* Password Strength Meter */}
                            {password && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-1 space-y-2 rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40"
                                >
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-zinc-500">
                                            Password Strength:
                                        </span>
                                        <span
                                            className={`font-extrabold ${getStrengthTextColor()}`}
                                        >
                                            {getStrengthLabel()}
                                        </span>
                                    </div>

                                    {/* Color-coded multi-segmented bar */}
                                    <div className="grid h-1.5 grid-cols-4 gap-1.5">
                                        {[1, 2, 3, 4].map((seg) => (
                                            <div
                                                key={seg}
                                                className={`h-full rounded-full transition-all duration-300 ${
                                                    strengthScore >= seg
                                                        ? getStrengthColor()
                                                        : 'bg-zinc-200 dark:bg-zinc-800'
                                                }`}
                                            />
                                        ))}
                                    </div>

                                    {/* Checklist of complexity criteria */}
                                    <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] font-bold">
                                        <div className="flex items-center gap-1">
                                            <span
                                                className={
                                                    hasMinLength
                                                        ? 'font-bold text-emerald-600 dark:text-emerald-400'
                                                        : 'text-zinc-400'
                                                }
                                            >
                                                {hasMinLength ? '✓' : '•'} 8+
                                                characters
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span
                                                className={
                                                    hasNumber
                                                        ? 'font-bold text-emerald-600 dark:text-emerald-400'
                                                        : 'text-zinc-400'
                                                }
                                            >
                                                {hasNumber ? '✓' : '•'} Contains
                                                number
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span
                                                className={
                                                    hasMixedCase
                                                        ? 'font-bold text-emerald-600 dark:text-emerald-400'
                                                        : 'text-zinc-400'
                                                }
                                            >
                                                {hasMixedCase ? '✓' : '•'} Upper
                                                & Lower
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span
                                                className={
                                                    hasSpecial
                                                        ? 'font-bold text-emerald-600 dark:text-emerald-400'
                                                        : 'text-zinc-400'
                                                }
                                            >
                                                {hasSpecial ? '✓' : '•'} Special
                                                symbol
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Real-time Password Validation Indicator */}
                            {(passwordTouched || password.length > 0) && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className={`mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold ${isPasswordValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}
                                >
                                    <span>{isPasswordValid ? '✓' : '✗'}</span>
                                    <span>
                                        {password.length === 0
                                            ? 'Password is required'
                                            : isPasswordValid
                                              ? 'Meets minimum length requirement'
                                              : 'Must be at least 8 characters long'}
                                    </span>
                                </motion.p>
                            )}
                            <InputError message={errors.password} />
                        </motion.div>

                        {/* Confirm Password Field */}
                        <motion.div
                            variants={itemVariants}
                            className="group grid gap-1.5"
                        >
                            <Label htmlFor="password_confirmation">
                                Confirm Password
                            </Label>
                            <div className="relative">
                                <ShieldCheck className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary dark:text-zinc-500" />
                                <Input
                                    id="password_confirmation"
                                    type={
                                        showConfirmPassword
                                            ? 'text'
                                            : 'password'
                                    }
                                    required
                                    tabIndex={4}
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder="••••••••"
                                    value={passwordConfirmation}
                                    onChange={(e) => {
                                        setPasswordConfirmation(e.target.value);
                                        setPasswordConfirmationTouched(true);
                                    }}
                                    onBlur={() =>
                                        setPasswordConfirmationTouched(true)
                                    }
                                    className="dark:bg-zinc-850 h-11 rounded-xl border-zinc-200/80 bg-zinc-50/50 pr-10 pl-10 transition-all hover:border-zinc-300 focus:bg-white dark:border-zinc-800 dark:hover:border-zinc-700 dark:focus:bg-zinc-900"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            !showConfirmPassword,
                                        )
                                    }
                                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
                                    aria-label={
                                        showConfirmPassword
                                            ? 'Hide confirm password'
                                            : 'Show confirm password'
                                    }
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                </button>
                            </div>

                            {/* Real-time Confirm Password Validation Indicator */}
                            {(passwordConfirmationTouched ||
                                passwordConfirmation.length > 0) && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className={`mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold ${isConfirmationValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}
                                >
                                    <span>
                                        {isConfirmationValid ? '✓' : '✗'}
                                    </span>
                                    <span>
                                        {passwordConfirmation.length === 0
                                            ? 'Confirm your password'
                                            : isConfirmationValid
                                              ? 'Passwords match perfectly'
                                              : 'Passwords do not match'}
                                    </span>
                                </motion.p>
                            )}
                            <InputError
                                message={errors.password_confirmation}
                            />
                        </motion.div>

                        {/* Submit Button */}
                        <motion.div variants={itemVariants} className="pt-1">
                            <Button
                                type="submit"
                                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/95 hover:shadow-lg active:scale-[0.99]"
                                tabIndex={5}
                                data-test="register-user-button"
                            >
                                {processing ? (
                                    <Spinner className="size-4" />
                                ) : null}
                                <span>Create Account</span>
                            </Button>
                        </motion.div>

                        {/* Divider */}
                        <motion.div
                            variants={itemVariants}
                            className="relative flex items-center justify-center py-1.5 text-[10px] font-extrabold tracking-wider text-zinc-400 uppercase dark:text-zinc-500"
                        >
                            <span className="absolute inset-x-0 h-px bg-zinc-200/60 dark:bg-zinc-800/80" />
                            <span className="relative z-10 bg-white px-3 dark:bg-slate-900">
                                Or register with
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
                                    disabled={socialLoading !== null}
                                    onClick={() =>
                                        void registerWithSocial('google')
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
                                    disabled={socialLoading !== null}
                                    onClick={() =>
                                        void registerWithSocial('apple')
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

                        {/* Already have an account */}
                        <motion.div
                            variants={itemVariants}
                            className="mt-2 border-t border-zinc-100 pt-4 text-center text-sm text-zinc-500 dark:border-zinc-800/60 dark:text-zinc-400"
                        >
                            Already have an account?{' '}
                            <TextLink
                                href={login()}
                                tabIndex={6}
                                className="ml-0.5 font-bold text-primary hover:underline"
                            >
                                Log in
                            </TextLink>
                        </motion.div>
                    </motion.div>
                )}
            </Form>
        </AuthLayout>
    );
}
