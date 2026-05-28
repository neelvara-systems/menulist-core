import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaLink from '../components/CanonicaLink';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaPageStructuredData from '../components/PageStructuredData';

export const metadata: Metadata = {
    title: 'About',
    description: 'Canonica helps AI-built SaaS teams keep support answers correct as products change.',
    alternates: { canonical: '/about' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

export default function CanonicaAboutPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaPageStructuredData path="/about" />
            <CanonicaHeader basePath={basePath} />
            <main className="cn-page-flow">
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">About</p>
                        <h1 className="mb-6 text-4xl font-bold leading-tight sm:text-5xl">
                            AI can build apps fast. Support still has to be correct.
                        </h1>
                        <p className="mb-8 text-lg leading-relaxed text-[#a0a0c0]">
                            Canonica exists because solo founders and small SaaS teams now launch faster than traditional docs and helpdesks can keep up. We give them a support layer built around page context, approved answers, and reviewable gaps.
                        </p>
                        <p className="mb-8 text-lg leading-relaxed text-[#a0a0c0]">
                            Canonica keeps approved support knowledge connected to product surfaces. It gives founders launch setup, a help center, hosted docs, widget, changelog binding, tickets as fallback, and a governance queue without asking them to run a large support operation.
                        </p>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-20">
                    <div className="mx-auto max-w-3xl">
                        <h2 className="mb-8 text-2xl font-bold">What we believe</h2>
                        <div className="space-y-6">
                            {[
                                { title: 'Correct answers beat more channels', body: 'Canonica is not trying to become a full helpdesk. It keeps the knowledge behind support surfaces clear, approved, and current.' },
                                { title: 'Page context should reduce user effort', body: 'A billing question from the billing screen should not get the same generic answer as a settings or onboarding question.' },
                                { title: 'Fallback should create learning', body: 'Fallback can help while coverage grows. Repeated fallback becomes a support gap, not hidden automation.' },
                                { title: 'Founders should approve official answers', body: 'Drafts, entity candidates, and mutation proposals stay reviewable. Canonica does not silently rewrite product guidance.' },
                                { title: 'Coverage should be visible', body: 'The main operating metric is whether product surfaces have enough approved answers for real user questions.' },
                            ].map((belief, i) => (
                                <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                                    <h3 className="mb-2 text-base font-semibold text-white">{belief.title}</h3>
                                    <p className="text-sm leading-relaxed text-[#808099]">{belief.body}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-20">
                    <div className="mx-auto max-w-3xl">
                        <h2 className="mb-4 text-2xl font-bold">Built for teams shipping fast</h2>
                        <p className="mb-6 text-lg text-[#a0a0c0]">
                            Canonica is built for SaaS teams that need support accuracy without building a full support team. It treats product pages, help content, fallback tickets, and approved answers as one governed support layer.
                        </p>
                        <CanonicaLink
                            basePath={basePath}
                            href="/get-started"
                            data-canonica-event="about_cta_clicked"
                            data-canonica-label="start_free_setup"
                            className="inline-block rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
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
