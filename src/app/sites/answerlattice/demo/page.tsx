import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';
import AnswerlatticePublicDemo from './AnswerlatticePublicDemo';
import AnswerlatticeSupportLoopDemo from './AnswerlatticeSupportLoopDemo';

export const metadata: Metadata = {
    title: 'AnswerLattice Demo',
    description: 'See a repeated SaaS support question move from approved answer or safe fallback to founder review, testing, and reusable guidance.',
    alternates: { canonical: '/demo' },
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

export default async function AnswerlatticeDemoPage() {
    const basePath = await getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/demo" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-20">
                    <div className="mx-auto max-w-6xl">
                        <div className="mx-auto mb-10 max-w-3xl text-center">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Interactive demo</p>
                            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
                                See one support question become a reusable improvement.
                            </h1>
                            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                                Follow one user question from approved guidance or safe fallback to founder review and a tested improvement.
                            </p>
                            <PageProofStrip
                                className="mt-8 text-left"
                                items={[
                                    { label: 'Shows', value: 'Known answer, missing coverage, fallback, review, and test' },
                                    { label: 'Proves', value: 'Support can improve without guessing or auto-publishing' },
                                    { label: 'Demo mode', value: 'Deterministic simulation with sample product policy' },
                                ]}
                            />
                        </div>

                        <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-center">
                            <h2 className="text-lg font-semibold text-white">What to notice</h2>
                            <p className="mt-2 text-sm leading-relaxed text-[#a0a0c0]">
                                Known questions use approved support knowledge. Missing evidence opens fallback and creates founder review work. Nothing becomes official until it is approved and tested. This simulation uses sample content and makes no Firebase or AI provider call.
                            </p>
                        </div>

                        <AnswerlatticeSupportLoopDemo />

                        <div className="mx-auto mb-8 mt-20 max-w-3xl text-center">
                            <p className="text-xs font-semibold uppercase tracking-widest text-teal-300">Answer review proof</p>
                            <h2 className="mt-3 text-3xl font-bold text-white">See an approved answer stay correct through change.</h2>
                            <p className="mt-4 text-base leading-relaxed text-[#a0a0c0]">
                                This second simulation shows how conflicting sources, human approval, release drift, safe fallback, and correction affect the same answer.
                            </p>
                        </div>

                        <AnswerlatticePublicDemo />
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16 text-center">
                    <h2 className="text-3xl font-bold">Ready to add this to your app?</h2>
                    <p className="mx-auto mt-4 max-w-xl text-[#a0a0c0]">
                        Start with product details, import what you already know, map the pages where users need help, and verify the widget from the setup dashboard.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-4">
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/install"
                            data-answerlattice-event="demo_cta_clicked"
                            data-answerlattice-label="view_install_steps"
                            className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-8 py-3.5 text-sm font-medium text-[#a0a0c0] transition-all hover:border-white/[0.2] hover:text-white"
                        >
                            View install steps
                        </AnswerlatticeLink>
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/get-started"
                            data-answerlattice-event="demo_cta_clicked"
                            data-answerlattice-label="create_workspace"
                            className="rounded-xl bg-teal-700 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:bg-teal-800"
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
