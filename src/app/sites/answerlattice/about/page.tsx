import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';

export const metadata: Metadata = {
    title: 'About',
    description: 'Answerlattice helps AI-built SaaS teams keep support answers correct as products change.',
    alternates: { canonical: '/about' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default function AnswerlatticeAboutPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/about" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">About</p>
                        <h1 className="mb-6 text-4xl font-bold leading-tight sm:text-5xl">
                            AI can build apps fast. Support still has to be correct.
                        </h1>
                        <p className="mb-8 text-lg leading-relaxed text-[#a0a0c0]">
                            Answerlattice exists because solo founders and small SaaS teams now launch faster than traditional docs and helpdesks can keep up. We give them a support layer built around page context, approved answers, and reviewable gaps.
                        </p>
                        <p className="mb-8 text-lg leading-relaxed text-[#a0a0c0]">
                            Answerlattice keeps approved support knowledge connected to product surfaces. Founders get launch setup, hosted help, widget support, changelog binding, ticket fallback, and a governance queue without having to run a large support operation.
                        </p>
                        <div className="flex flex-col justify-center gap-3 sm:flex-row">
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/product"
                                className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                            >
                                See the product
                            </AnswerlatticeLink>
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/proof"
                                className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                            >
                                Review proof pack
                            </AnswerlatticeLink>
                        </div>
                        <PageProofStrip
                            className="mt-8 text-left"
                            items={[
                                { label: 'Audience', value: 'Live or near-live SaaS teams with repeated support questions' },
                                { label: 'Belief', value: 'Correct approved answers beat more support channels' },
                                { label: 'Boundary', value: 'Not a helpdesk replacement or autopilot' },
                            ]}
                        />
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-20">
                    <div className="mx-auto max-w-3xl">
                        <h2 className="mb-8 text-2xl font-bold">What we believe</h2>
                        <div className="space-y-6">
                            {[
                                { title: 'Correct answers beat more channels', body: 'Answerlattice is not trying to become a full helpdesk. It keeps the knowledge behind support surfaces clear, approved, and current.' },
                                { title: 'Page context should reduce user effort', body: 'A billing question from the billing screen should not get the same generic answer as a settings or onboarding question.' },
                                { title: 'Fallback should create learning', body: 'Fallback can help while coverage grows. Repeated fallback becomes a support gap, not hidden automation.' },
                                { title: 'Founders should approve official answers', body: 'Drafts, entity candidates, and mutation proposals stay reviewable. Answerlattice does not silently rewrite product guidance.' },
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
                            Answerlattice is built for SaaS teams that need support accuracy without building a full support team. It treats product pages, help content, fallback tickets, and approved answers as one governed support layer.
                        </p>
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/get-started"
                            data-answerlattice-event="about_cta_clicked"
                            data-answerlattice-label="start_support_setup"
                            className="inline-block rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
                        >
                            Start support setup
                        </AnswerlatticeLink>
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
