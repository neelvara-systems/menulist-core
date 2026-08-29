import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'Terms for using AnswerLattice website, dashboard, widget, and support knowledge features.',
    alternates: { canonical: '/terms-of-service' },
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

const SECTIONS = [
    {
        title: 'Operator and Scope',
        body: [
            'AnswerLattice is operated by Neelvara Systems, the operating trade name used for the current software product lineup.',
            'These terms are a product-use summary for the AnswerLattice website, dashboard, widget, hosted help, and support-knowledge features. AnswerLattice is not a replacement help desk, outsourced support team, or unrestricted autonomous support agent.',
        ],
    },
    {
        title: 'Using AnswerLattice',
        body: [
            'AnswerLattice helps SaaS teams manage product support knowledge, approved answers, help widgets, hosted help centers, FAQs, changelogs, tickets, and support-gap review flows.',
            'You are responsible for the content you upload, the workspace users you invite, the help domains you configure, and the page context your product sends to AnswerLattice.',
        ],
    },
    {
        title: 'Accounts and Workspaces',
        body: [
            'You must keep account access secure and ensure workspace information is accurate. Workspace owners are responsible for configuration choices such as allowed origins, blocked routes, widget behavior, and published support content.',
            'AnswerLattice may restrict access if an account is inactive, abusive, unsafe, or violates these terms.',
        ],
    },
    {
        title: 'Support Content and AI-Assisted Drafts',
        body: [
            'AnswerLattice may help draft answers, identify entities, summarize support gaps, or propose knowledge updates. Drafts are not final support guidance until a workspace owner reviews and approves them.',
            'You should review support content before publishing it, especially when it affects billing, account access, legal terms, security, or product-critical workflows.',
            'You keep ownership of the support content you provide. You allow AnswerLattice and its configured service providers to process that content only as needed to operate, secure, support, and improve the service for your workspace, subject to the Privacy Policy and applicable provider terms.',
        ],
    },
    {
        title: 'Acceptable Use',
        body: [
            'Do not use AnswerLattice to store secrets, passwords, payment card data, unlawful content, malware, spam, or content that infringes another party\'s rights. Do not intentionally send sensitive data through widget context or ticket debugging context.',
            'Do not attempt to bypass security controls, scrape private service data, overload service infrastructure, or misuse widget keys.',
        ],
    },
    {
        title: 'Early Access, Plans, Support Credits, and Cancellation',
        body: [
            'Current public access is request-only. An early-access request does not create an account, workspace, entitlement, subscription, checkout, invoice, or payment. Any private invitation, commercial terms, and later billing activation are separate deliberate steps.',
            'Pricing shown on the public website is planned public-launch pricing and is informational until checkout is explicitly opened. The selected plan, currency, support-credit allowance, limits, tax, and provider terms must be shown again before any future purchase.',
            'Support credits are used only by the charged operations identified in current product pricing and runtime accounting. Approved widget answers, deterministic checks, draft review, selected text import, publishing infrastructure, and public help browsing are not represented as per-view credit charges.',
            'A workspace owner can request subscription cancellation through Billing. After provider cancellation succeeds, recorded access remains active until the current cycle end. AnswerLattice does not publish a general automatic-refund promise; refund or billing-dispute requests require case review and any rights required by applicable law.',
        ],
    },
    {
        title: 'Availability, Changes, and Suspension',
        body: [
            'AnswerLattice is operated with reasonable care, but no online service can guarantee uninterrupted availability. Maintenance, provider outages, abuse protection, or operational incidents may affect access.',
            'AnswerLattice may change, limit, suspend, or discontinue a feature when needed for security, legal compliance, provider availability, product integrity, or misuse prevention. Material customer-facing changes should be communicated through the available product or contact channels when practical.',
        ],
    },
    {
        title: 'Export, Deletion, and Account Closure',
        body: [
            'Before closing a workspace, contact AnswerLattice to confirm the requested export or deletion scope, active billing state, retained operational evidence, and any legal or security constraints. AnswerLattice does not currently promise a one-click full-workspace deletion flow.',
            'Some short-lived operational data expires under the implemented retention controls described in the Privacy Policy and Trust page. Durable workspace knowledge, billing records, and legally required records can have different lifecycles.',
        ],
    },
    {
        title: 'Answer Reliance and Contract Completion',
        body: [
            'AnswerLattice helps organize and deliver customer-provided support knowledge. The customer remains responsible for product behavior, policies, prices, permissions, published answers, and decisions made from support output.',
            'Contracting identity details beyond the operating trade name, governing law, jurisdiction, negotiated warranties, liability limits, service levels, and any customer-specific refund terms require founder and legal approval. They must not be assumed from this product-use summary.',
        ],
    },
    {
        title: 'Contact',
        body: [
            'For terms or account questions, contact hello@answerlattice.com.',
        ],
    },
];

export default async function AnswerlatticeTermsOfServicePage() {
    const basePath = await getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/terms-of-service" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Terms of Service</p>
                        <h1 className="mb-4 text-4xl font-bold sm:text-5xl">Terms of Service</h1>
                        <p className="mb-2 text-sm text-[#6b6b8a]">Last updated: August 29, 2026</p>
                        <p className="mt-6 text-lg leading-relaxed text-[#a0a0c0]">
                            These terms describe the expected use of AnswerLattice&apos;s website, dashboard, help widget, and
                            support knowledge features.
                        </p>
                        <PageProofStrip
                            className="mt-8 text-left"
                            items={[
                                { label: 'Customer responsibility', value: 'Review uploaded content, workspace users, domains, and widget context' },
                                { label: 'Draft boundary', value: 'AI-assisted output is not official until owner approval' },
                                { label: 'Acceptable use', value: 'Do not send secrets, payment data, malware, or abusive traffic' },
                            ]}
                        />
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-3xl space-y-6">
                        {SECTIONS.map((section) => (
                            <article key={section.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                                <h2 className="mb-4 text-xl font-semibold text-white">{section.title}</h2>
                                <div className="space-y-3">
                                    {section.body.map((paragraph) => (
                                        <p key={paragraph} className="text-sm leading-relaxed text-[#a0a0c0]">
                                            {paragraph}
                                        </p>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
