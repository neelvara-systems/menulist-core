import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';

export const metadata: Metadata = {
    title: 'About',
    description: 'AnswerLattice helps founder-led SaaS teams turn docs, tickets, releases, screenshots, recordings, notes, and product context into approved support for users.',
    alternates: { canonical: '/about' },
};

async function getBasePath(): Promise<string> {
    try {
        const h = (await headers());
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;

        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default async function AnswerlatticeAboutPage() {
    const basePath = await getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/about" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">About</p>
                        <h1 className="mb-6 text-4xl font-bold leading-tight sm:text-5xl">
                            AI can build apps fast. Support still has to be handled.
                        </h1>
                        <p className="mb-8 text-lg leading-relaxed text-[#a0a0c0]">
                            AnswerLattice exists because solo founders and small product teams now launch faster than traditional support processes can keep up. We turn the knowledge already scattered across docs, tickets, releases, screenshots, recordings, notes, and repeated replies into in-app help, hosted help, FAQs, ticket fallback, feedback review, approved answers, and visible support gaps.
                        </p>
                        <p className="mb-8 text-lg leading-relaxed text-[#a0a0c0]">
                            Founders get a practical support system without starting from a blank help center or running a large support operation. AnswerLattice organizes what they already know, serves it where users need help, and keeps every official answer under owner review.
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
                                { label: 'Audience', value: 'Live, beta, and near-launch product teams preparing support' },
                                { label: 'Belief', value: 'Reviewed support knowledge beats scattered replies' },
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
                                { title: 'One support system beats scattered channels', body: 'AnswerLattice is not trying to become a full helpdesk. It keeps the knowledge behind your widget, help center, FAQs, tickets, and feedback clear, approved, and current.' },
                                { title: 'Page context should reduce user effort', body: 'A billing question from the billing screen should not get the same generic answer as a settings or onboarding question.' },
                                { title: 'Fallback should create learning', body: 'Fallback can help while coverage grows. Repeated fallback becomes a support gap, not hidden automation.' },
                                { title: 'Founders should approve official answers', body: 'Draft answers, product candidates, and suggested changes stay reviewable. AnswerLattice does not silently rewrite product guidance.' },
                                { title: 'Coverage should be visible', body: 'Founders should be able to see which product areas have enough support for real user questions and which still need work.' },
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
                            AnswerLattice is built for SaaS teams that need support accuracy without building a full support team. It turns product pages, help content, fallback tickets, feedback, changelog updates, screenshots, recordings, notes, and approved answers into one reviewed support layer.
                        </p>
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/get-started"
                            data-answerlattice-event="about_cta_clicked"
                            data-answerlattice-label="create_workspace"
                            className="inline-block rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
                        >
                            Create workspace
                        </AnswerlatticeLink>
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
