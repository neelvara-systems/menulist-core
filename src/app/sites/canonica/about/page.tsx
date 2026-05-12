import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaLink from '../components/CanonicaLink';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';

export const metadata: Metadata = {
    title: 'About',
    description: 'Canonica is the Support Knowledge Control Plane for SaaS — built to make support knowledge governed, canonical, and drift-free.',
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
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-3xl">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">About</p>
                        <h1 className="mb-6 text-4xl font-bold leading-tight sm:text-5xl">
                            Support knowledge deserves infrastructure, not tools.
                        </h1>
                        <p className="mb-8 text-lg leading-relaxed text-[#a0a0c0]">
                            Every SaaS company has the same problem: support knowledge scattered across articles, tickets, chat logs, and people&apos;s heads. Automated answers can vary every time. No one knows if answers are still accurate after a product update. Knowledge drifts silently.
                        </p>
                        <p className="mb-8 text-lg leading-relaxed text-[#a0a0c0]">
                            Canonica fixes this at the infrastructure level. Not another knowledge base. Not another chatbot. A control plane that governs what your product&apos;s support answers actually are — versioned, entity-bound, drift-detecting, and self-improving.
                        </p>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-20">
                    <div className="mx-auto max-w-3xl">
                        <h2 className="mb-8 text-2xl font-bold">What we believe</h2>
                        <div className="space-y-6">
                            {[
                                { title: 'Knowledge should behave like infrastructure', body: 'Boring, reliable, deterministic. Same query, same context, same answer. Every time. Not a creative exercise — a governance discipline.' },
                                { title: 'Automation assists the control plane, never becomes it', body: 'Automation helps extract entities and cluster signals. But the canonical answer — the governed truth — is written and approved by humans. No autonomous rewriting.' },
                                { title: 'Drift is measurable', body: 'When your product changes, your answers should flag themselves as potentially stale. Four drift classes, nightly audits, release-triggered evaluation. Advisory, never blocking.' },
                                { title: 'Support friction is signal, not noise', body: 'Every ticket and negative feedback is a structured signal. Signals cluster. Clusters propose mutations. Knowledge evolves from real user pain, not guesswork.' },
                                { title: 'Canonical coverage is the KPI', body: 'The percentage of customer queries answered by governed canonical answers is the metric that matters. It must increase over time.' },
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
                        <h2 className="mb-4 text-2xl font-bold">Built by the MenuList team</h2>
                        <p className="mb-6 text-lg text-[#a0a0c0]">
                            Canonica is built by the same team behind{' '}
                            <a href="https://menulist.ai" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">MenuList</a>
                            , the canonical public business truth layer for SMBs. We learned that infrastructure that governs truth — not generates content — is what actually compounds.
                        </p>
                        <CanonicaLink
                            basePath={basePath}
                            href="/get-started"
                            className="inline-block rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
                        >
                            Request Early Access
                        </CanonicaLink>
                    </div>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
