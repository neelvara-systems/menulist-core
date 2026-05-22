import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'How Canonica handles product support knowledge, account information, widget data, hosted help domains, and ticket context.',
    alternates: { canonical: '/privacy-policy' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

const SECTIONS = [
    {
        title: 'Information Canonica Handles',
        body: [
            'Canonica handles account details, workspace details, product support content, knowledge-base imports, FAQs, changelog entries, tickets, widget configuration, hosted-help domain settings, safe page context that a customer chooses to send through the widget, and capped ticket debugging context when a ticket is created.',
            'Page context should describe the product surface, route, feature, workflow, role, or plan needed to answer support questions. It should not include passwords, payment card data, secrets, private tokens, or unrelated personal information.',
        ],
    },
    {
        title: 'How Information Is Used',
        body: [
            'Canonica uses workspace and support content to power help centers, hosted docs, approved answers, widget responses, ticket fallback, changelog relevance, readiness summaries, and support-gap review queues.',
            'Operational logs and ticket debugging context are used to keep the service reliable, investigate reported failures, protect the service from abuse, and understand whether support knowledge is stale or incomplete.',
        ],
    },
    {
        title: 'Service Providers',
        body: [
            'Canonica may use trusted infrastructure providers for hosting, authentication, storage, databases, email, analytics, and AI-assisted drafting. These providers are used only to operate the service.',
            'Canonica does not sell customer support content or widget conversation data.',
        ],
    },
    {
        title: 'Customer Controls',
        body: [
            'Workspace owners can manage widget settings, allowed origins, blocked routes, product details, support content, tickets, changelogs, and approved answers from the Canonica dashboard.',
            'Customers are responsible for choosing what content they import and what page context their product sends to Canonica.',
        ],
    },
    {
        title: 'Retention and Security',
        body: [
            'Canonica keeps data for as long as it is needed to provide the service, support the customer workspace, meet operational needs, or satisfy legal requirements.',
            'Access controls, tenant separation, validation, and bounded payload handling are used to reduce accidental exposure and protect support data.',
        ],
    },
    {
        title: 'Contact',
        body: [
            'For privacy questions, contact hello@canonica.app.',
        ],
    },
];

export default function CanonicaPrivacyPolicyPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-3xl">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Privacy Policy</p>
                        <h1 className="mb-4 text-4xl font-bold sm:text-5xl">Privacy Policy</h1>
                        <p className="mb-2 text-sm text-[#6b6b8a]">Last updated: May 22, 2026</p>
                        <p className="mt-6 text-lg leading-relaxed text-[#a0a0c0]">
                            This policy explains how Canonica handles information for its public website, product dashboard,
                            help widget, and support knowledge features.
                        </p>
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
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
