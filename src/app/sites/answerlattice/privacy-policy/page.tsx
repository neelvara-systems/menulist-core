import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'How AnswerLattice handles account and team information, product support knowledge, widget data, hosted help domains, and ticket context.',
    alternates: { canonical: '/privacy-policy' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;

        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

const SECTIONS = [
    {
        title: 'Information AnswerLattice Handles',
        body: [
            'AnswerLattice handles account, team member, workspace, widget, hosted-help domain, and ticket details needed to operate the service.',
            'It also handles product support content, knowledge-base imports, FAQs, changelog entries, safe page context that a customer chooses to send through the widget, and capped ticket debugging context when a ticket is created.',
            'Knowledge intake sources can include selected public URLs, pasted support text, starter answers, and supported document text. Customers should avoid importing unnecessary personal data.',
            'Page context should describe the product surface, route, feature, workflow, role, or plan needed to answer support questions. It should not include passwords, payment card data, secrets, private tokens, or unrelated personal information.',
        ],
    },
    {
        title: 'How Information Is Used',
        body: [
            'AnswerLattice uses workspace and support content to power help centers, hosted docs, approved answers, widget responses, ticket fallback, changelog relevance, readiness summaries, and support-gap review queues.',
            'Operational logs and ticket debugging context are used to keep the service reliable, investigate reported failures, protect the service from abuse, and understand whether support knowledge is stale or incomplete.',
        ],
    },
    {
        title: 'Service Providers',
        body: [
            'AnswerLattice may use trusted infrastructure providers for hosting, authentication, storage, databases, email, analytics, and AI-assisted drafting. These providers are used only to operate the service.',
            'AnswerLattice does not sell customer support content or widget conversation data.',
        ],
    },
    {
        title: 'Public Website Cookies and Analytics',
        body: [
            'The public AnswerLattice website may use essential browser storage to keep the site working and remember basic preferences such as cookie choice or theme.',
            'Optional Plausible and Google Analytics on the public website load only after analytics is accepted in the cookie preference banner and the relevant measurement setting is configured. If analytics is declined or no measurement setting is configured, the public website stays on essentials only.',
            'The public website banner does not claim ads or personalization tracking.',
        ],
    },
    {
        title: 'Customer Controls',
        body: [
            'Workspace owners can manage team access, widget settings, allowed origins, blocked routes, product details, support content, tickets, changelogs, and approved answers from the AnswerLattice dashboard.',
            'Customers are responsible for choosing what content they import and what page context their product sends to AnswerLattice.',
        ],
    },
    {
        title: 'Retention and Security',
        body: [
            'AnswerLattice keeps data for as long as it is needed to provide the service, support the customer workspace, meet operational needs, or satisfy legal requirements.',
            'Imported source metadata and capped extracted text stay with the intake job so owners can review drafts and lineage. Raw file retention is not required for day-one browser-extracted intake.',
            'Access controls, tenant separation, validation, and bounded payload handling are used to reduce accidental exposure and protect support data.',
        ],
    },
    {
        title: 'Contact',
        body: [
            'For privacy questions, contact hello@answerlattice.com.',
        ],
    },
];

export default function AnswerlatticePrivacyPolicyPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/privacy-policy" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Privacy Policy</p>
                        <h1 className="mb-4 text-4xl font-bold sm:text-5xl">Privacy Policy</h1>
                        <p className="mb-2 text-sm text-[#6b6b8a]">Last updated: June 26, 2026</p>
                        <p className="mt-6 text-lg leading-relaxed text-[#a0a0c0]">
                            This policy explains how AnswerLattice handles information for its public website, product dashboard,
                            help widget, and support knowledge features.
                        </p>
                        <PageProofStrip
                            className="mt-8 text-left"
                            items={[
                                { label: 'Widget context', value: 'Use page and workflow hints; avoid secrets and private records' },
                                { label: 'Source intake', value: 'Owner-selected support material and capped extracted text' },
                                { label: 'Workspace control', value: 'Owners manage team access, widget settings, and published support content' },
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
