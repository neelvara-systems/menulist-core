import type { Metadata, Viewport } from 'next';
import MyCodexLogoMark from '../components/MyCodexLogoMark';
import { MYCODEX_THEME_COLOR } from '@lib/mycodex/pwaAssets';

export const metadata: Metadata = {
    title: 'MyCodex offline',
    description: 'MyCodex is offline. Reconnect and try again.',
    robots: {
        index: false,
        follow: false,
        nocache: true,
    },
};

export const viewport: Viewport = {
    themeColor: MYCODEX_THEME_COLOR,
};

export const dynamic = 'force-static';

export default function MyCodexOfflinePage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-10 text-zinc-50">
            <section className="w-full max-w-sm text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#e4e9f4]">
                    <MyCodexLogoMark className="h-16 w-[38px]" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight">MyCodex is offline</h1>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                    Reconnect to open the latest private documentation.
                </p>
                <a
                    href="/"
                    className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-bold text-white transition hover:bg-sky-500 active:scale-[0.99]"
                >
                    Try again
                </a>
            </section>
        </main>
    );
}
