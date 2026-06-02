import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';

export const metadata: Metadata = {
    title: 'Security and Ops One-Pager',
    description: 'A shareable AnswerLattice security and operations summary covering allowed origins, blocked routes, safe context, safe source intake, team roles, manual screenshot attachments, hashed keys, approval, rate limits, and incident contact.',
    alternates: { canonical: '/security-one-pager' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

const ONE_PAGER = [
    ['Allowed origins', 'Restrict widget runtime config to the product and staging domains where AnswerLattice should run.'],
    ['Blocked routes', 'Hide the widget from auth, payment, admin, internal help, or other sensitive paths.'],
    ['Safe page context', 'Send path, title, feature, workflow, role, and locale. Legacy fields are public-label compatibility only. Do not send secrets or raw customer records.'],
    ['Safe source intake', 'Import only owner-selected public pages, supported files, screenshots, or short recordings. Raw media is not retained by default, and generated output requires owner review.'],
    ['Screenshot attachments', 'Screenshots are user-initiated upload or paste only. The widget does not automatically capture the host app screen or scrape the DOM.'],
    ['Widget key handling', 'AnswerLattice validates widget keys by hash and can copy recoverable widget keys only from encrypted server-side key material.'],
    ['Owner approval', 'Drafts, generated answers, and mutation proposals do not become official support truth until reviewed.'],
    ['Runtime rate limits', 'Public widget config, search, feedback, predictive, and API paths are bounded and validated before expensive work.'],
    ['Tenant scope', 'Dashboard and runtime reads resolve AnswerLattice workspace scope server-side; client context is never trusted as tenant identity.'],
    ['Team access', 'Workspace members use AnswerLattice-specific roles and owner-managed reset controls for support work.'],
    ['Incident contact', 'Report security or data-handling concerns without sending secrets or full customer datasets in the first message.'],
];

export default function AnswerlatticeSecurityOnePagerPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/security-one-pager" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Security and ops one-pager</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        The short version for founders, developers, and reviewers.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        AnswerLattice can be page-aware and source-backed without collecting secrets. Use this one-page summary for install reviews, developer handoff, intake reviews, and buyer security checks.
                    </p>
                    <PageProofStrip
                        className="mx-auto mt-8 max-w-5xl text-left"
                        items={[
                            { label: 'Install review', value: 'Origin, route, context, and widget key boundaries' },
                            { label: 'Data review', value: 'What can be sent, what must never be sent' },
                            { label: 'Answer review', value: 'Drafts and generated content stay owner-approved' },
                        ]}
                    />
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
                        {ONE_PAGER.map(([title, body]) => (
                            <article key={title} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
                                <h2 className="text-lg font-semibold text-white">{title}</h2>
                                <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{body}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1fr_0.9fr]">
                        <article className="rounded-[1.5rem] border border-teal-300/20 bg-teal-500/[0.07] p-6">
                            <h2 className="text-2xl font-bold text-white">What to send through context</h2>
                            <p className="mt-4 text-sm leading-relaxed text-[#d6d6ef]">
                                Send stable labels that describe where the user is stuck: path, page title, feature, workflow, public role label, and locale. Legacy plan and entity hints must stay public labels only.
                            </p>
                        </article>
                        <article className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/[0.04] p-6">
                            <h2 className="text-2xl font-bold text-white">What not to send</h2>
                            <p className="mt-4 text-sm leading-relaxed text-[#d6d6ef]">
                                Do not send passwords, auth tokens, card data, private customer records, raw database IDs, emails, phone numbers, unrelated personal information, screenshots of screens that reveal secrets, or recordings that include private customer data.
                            </p>
                        </article>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16 text-center">
                    <h2 className="text-3xl font-bold text-white">Need the full security detail?</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        The full security page covers hosted help, compiled context, scoped workspaces, role-scoped team access, ticket debugging context, and scheduler boundaries.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <AnswerlatticeLink basePath={basePath} href="/security" className="rounded-xl border border-white/[0.12] px-6 py-3 text-sm font-semibold text-[#d6d6ef] hover:border-white/[0.24]">
                            Open full security page
                        </AnswerlatticeLink>
                        <a href="mailto:hello@answerlattice.com" className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-800">
                            Contact security
                        </a>
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
