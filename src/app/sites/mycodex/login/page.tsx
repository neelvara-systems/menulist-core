import { Metadata } from 'next';
import { LuLock } from 'react-icons/lu';
import { sanitizeMyCodexReturnTo } from '@lib/mycodex/auth';
import MyCodexLogoMark from '../components/MyCodexLogoMark';

export const metadata: Metadata = {
    title: 'Sign in',
    robots: {
        index: false,
        follow: false,
        nocache: true,
    },
};

interface MyCodexLoginPageProps {
    searchParams?: {
        error?: string | string[];
        returnTo?: string | string[];
        status?: string | string[];
    };
}

const firstValue = (value: string | string[] | undefined) => (
    Array.isArray(value) ? value[0] : value
);

const getErrorMessage = (error: string | undefined) => {
    if (error === 'rate-limit') return 'Too many attempts. Please wait a few minutes and try again.';
    if (error === 'config') return 'MyCodex access is not configured on this deployment.';
    if (error === 'invalid') return 'The username or password is not correct.';
    if (error === 'input') return 'Enter the MyCodex username and password.';
    return null;
};

export default function MyCodexLoginPage({ searchParams }: MyCodexLoginPageProps) {
    const returnTo = sanitizeMyCodexReturnTo(firstValue(searchParams?.returnTo));
    const errorMessage = getErrorMessage(firstValue(searchParams?.error));
    const signedOut = firstValue(searchParams?.status) === 'signed-out';

    return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
            <section className="w-full max-w-sm">
                <div className="mb-8 flex items-center justify-center gap-3">
                    <MyCodexLogoMark className="h-10 w-6 shrink-0" />
                    <h1 className="text-2xl font-extrabold tracking-tight">MyCodex</h1>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                            <LuLock className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Private access</h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Sign in to open the document reader.</p>
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-200">
                            {errorMessage}
                        </div>
                    )}

                    {signedOut && !errorMessage && (
                        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-200">
                            You are signed out.
                        </div>
                    )}

                    <form method="post" action="api/session" className="space-y-4">
                        <input type="hidden" name="returnTo" value={returnTo} />

                        <label className="block">
                            <span className="mb-1.5 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">Username</span>
                            <input
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-base text-zinc-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-sky-500 dark:focus:ring-sky-950"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-1.5 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">Password</span>
                            <input
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-base text-zinc-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-sky-500 dark:focus:ring-sky-950"
                            />
                        </label>

                        <button
                            type="submit"
                            className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-bold text-white transition hover:bg-sky-500 active:scale-[0.99] dark:bg-sky-500 dark:hover:bg-sky-400"
                        >
                            Continue
                        </button>
                    </form>
                </div>
            </section>
        </main>
    );
}
