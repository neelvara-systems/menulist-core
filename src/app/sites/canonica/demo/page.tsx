import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaLink from '../components/CanonicaLink';
import CanonicaPageStructuredData from '../components/PageStructuredData';
import CanonicaPublicDemo from './CanonicaPublicDemo';

export const metadata: Metadata = {
    title: 'Canonica Demo',
    description: 'See page-aware support in 60 seconds with static Canonica examples for billing, onboarding, settings, fallback, and support gaps.',
    alternates: { canonical: '/demo' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

export default function CanonicaDemoPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaPageStructuredData path="/demo" />
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-20">
                    <div className="mx-auto max-w-6xl">
                        <div className="mx-auto mb-10 max-w-3xl text-center">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Interactive demo</p>
                            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
                                See page-aware support in 60 seconds.
                            </h1>
                            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                                Switch product pages and ask the same kind of question. Canonica changes the answer using safe page context and approved support knowledge.
                            </p>
                        </div>

                        <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-center">
                            <h2 className="text-lg font-semibold text-white">What to notice</h2>
                            <p className="mt-2 text-sm leading-relaxed text-[#a0a0c0]">
                                The generic answer stays broad. Canonica knows the page, links related help, and marks uncovered questions as gaps. This static demo does not call Firebase or an AI provider.
                            </p>
                        </div>

                        <CanonicaPublicDemo />
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16 text-center">
                    <h2 className="text-3xl font-bold">Ready to add this to your app?</h2>
                    <p className="mx-auto mt-4 max-w-xl text-[#a0a0c0]">
                        Start with product details, import knowledge, create product surfaces, and verify the widget from the activation dashboard.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-4">
                        <CanonicaLink
                            basePath={basePath}
                            href="/install"
                            data-canonica-event="demo_cta_clicked"
                            data-canonica-label="view_install_steps"
                            className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-8 py-3.5 text-sm font-medium text-[#a0a0c0] transition-all hover:border-white/[0.2] hover:text-white"
                        >
                            View install steps
                        </CanonicaLink>
                        <CanonicaLink
                            basePath={basePath}
                            href="/get-started"
                            data-canonica-event="demo_cta_clicked"
                            data-canonica-label="start_free_setup"
                            className="rounded-xl bg-indigo-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600"
                        >
                            Start free setup
                        </CanonicaLink>
                    </div>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
