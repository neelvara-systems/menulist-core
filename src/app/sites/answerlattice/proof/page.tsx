import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';
import {
    ANSWERLATTICE_PROOF_EXAMPLES,
    getAnswerlatticeVerifiedProofEntries,
} from '@/data/answerlattice/proofEvidence';

export const metadata: Metadata = {
    title: 'Proof Pack',
    description: 'Clearly labelled AnswerLattice workload examples plus consented customer evidence only when its measurement and public-use approval are complete.',
    alternates: { canonical: '/proof' },
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

const METRICS = [
    ['First surfaces', 'Billing, onboarding, team, releases, integrations, errors'],
    ['First content', 'Docs, FAQs, changelog, starter answers, support macros, repeated replies'],
    ['First proof', 'Widget loaded, origin valid, route allowed, context arrived'],
    ['First review loop', 'Approved answers, missed questions, stale-answer review'],
];

export default async function AnswerlatticeProofPage() {
    const basePath = await getBasePath();
    const verifiedProof = getAnswerlatticeVerifiedProofEntries();

    return (
        <>
            <AnswerlatticePageStructuredData path="/proof" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Proof pack</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Example workloads for support that improves after launch.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        These are anonymized example workloads, not inflated customer claims. They show how AnswerLattice should be evaluated on day one.
                    </p>
                    <PageProofStrip
                        className="mx-auto mt-8 max-w-6xl text-left"
                        items={[
                            { label: 'No fake proof', value: 'Examples show workloads, not customer logos or vanity metrics' },
                            { label: 'Day-one proof', value: 'Install, context, surfaces, sources, and first approved answers' },
                            { label: 'Best use', value: 'Compare your launch support problem against these patterns' },
                        ]}
                    />
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-4">
                        {METRICS.map(([label, value]) => (
                            <article key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
                                <div className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">{label}</div>
                                <p className="mt-3 text-sm leading-relaxed text-[#d6d6ef]">{value}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
                        {ANSWERLATTICE_PROOF_EXAMPLES.map((example) => (
                            <article key={example.title} className="rounded-[1.5rem] border border-white/[0.06] bg-[#101028] p-6">
                                <span className="rounded-full border border-teal-300/20 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-100">
                                    {example.label}
                                </span>
                                <h2 className="mt-5 text-xl font-semibold leading-snug text-white">{example.title}</h2>
                                <div className="mt-5 space-y-4">
                                    <div>
                                        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">Situation</div>
                                        <p className="mt-2 text-sm leading-relaxed text-[#a0a0c0]">{example.situation}</p>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-semibold uppercase tracking-widest text-teal-200">AnswerLattice setup</div>
                                        <p className="mt-2 text-sm leading-relaxed text-[#d6d6ef]">{example.answerlattice}</p>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">What improves</div>
                                        <p className="mt-2 text-sm leading-relaxed text-[#d6d6ef]">{example.outcome}</p>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                {verifiedProof.length > 0 ? (
                    <section className="border-t border-white/[0.06] px-6 py-16">
                        <div className="mx-auto max-w-7xl">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-300">Verified evidence</p>
                            <h2 className="text-3xl font-bold text-white">Consented customer workloads</h2>
                            <div className="mt-8 grid gap-5 lg:grid-cols-3">
                                {verifiedProof.map(entry => (
                                    <article key={entry.id} className="rounded-[1.5rem] border border-emerald-300/15 bg-emerald-400/[0.04] p-6">
                                        <span className="text-xs font-semibold text-emerald-200">{entry.publicLabel}</span>
                                        <h3 className="mt-4 text-xl font-semibold text-white">{entry.outcome}</h3>
                                        <p className="mt-3 text-sm leading-relaxed text-[#d6d6ef]">{entry.evidenceSummary}</p>
                                        <p className="mt-4 text-xs leading-relaxed text-[#a0a0c0]">Measured: {entry.measurementMethod}</p>
                                        <p className="mt-2 text-xs text-[#808099]">Verified {entry.verifiedOn}</p>
                                    </article>
                                ))}
                            </div>
                        </div>
                    </section>
                ) : null}

                <section className="border-t border-white/[0.06] px-6 py-16 text-center">
                    <h2 className="text-3xl font-bold text-white">The first proof is operational, not a sales deck.</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        A real AnswerLattice evaluation should prove install, context, first surfaces, first imported knowledge, and first owner-approved answers.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <AnswerlatticeLink basePath={basePath} href="/demo" className="rounded-xl border border-white/[0.12] px-6 py-3 text-sm font-semibold text-[#d6d6ef] hover:border-white/[0.24]">
                            See 60-sec demo
                        </AnswerlatticeLink>
                        <AnswerlatticeLink basePath={basePath} href="/quickstarts" className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-800">
                            View quickstarts
                        </AnswerlatticeLink>
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
