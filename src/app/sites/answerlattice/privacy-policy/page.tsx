import { Metadata } from 'next';
import { headers } from 'next/headers';
import { ANSWERLATTICE_RETENTION_DAYS } from '@data/shared/answerlatticeRetention';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'How AnswerLattice handles account and team information, product support knowledge, widget data, hosted help domains, and ticket context.',
    alternates: { canonical: '/privacy-policy' },
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
        title: 'Information AnswerLattice Handles',
        body: [
            'AnswerLattice handles account, team member, workspace, widget, hosted-help domain, and ticket details needed to operate the service.',
            'It also handles product support content, knowledge-base imports, FAQs, changelog entries, safe page context that a customer chooses to send through the widget, and capped ticket debugging context when a ticket is created.',
            'Knowledge intake sources can include selected public URLs, pasted support text, starter answers, and supported document text. Customers should avoid importing unnecessary personal data.',
            'Page context should describe the product page, route, feature, workflow, role, or plan needed to answer support questions. It should not include passwords, payment card data, secrets, private tokens, or unrelated personal information.',
            'During signup, a customer may optionally select a closed-list source describing where they first heard about AnswerLattice. The field does not accept free text.',
            'An early-access request includes a name, work email, product URL, product stage, first support area, current or expected support questions, an optional feature request or idea, and contact consent. Submitting the form does not create an account or payment.',
        ],
    },
    {
        title: 'How Information Is Used',
        body: [
            'AnswerLattice uses workspace and support content to power help centers, hosted docs, approved answers, widget responses, ticket fallback, changelog relevance, readiness summaries, and support-gap review queues.',
            'Operational logs and ticket debugging context are used to keep the service reliable, investigate reported failures, protect the service from abuse, and understand whether support knowledge is stale or incomplete.',
            'Optional self-reported signup sources are used to compare broad acquisition channels, including AI assistants, search, communities, and referrals.',
            'Early-access details are used to review product fit, plan controlled onboarding, understand requested support workflows, and contact the applicant about the request. Feature ideas may inform product decisions but do not create a delivery commitment.',
        ],
    },
    {
        title: 'Service Providers',
        body: [
            'The current operational provider map includes Vercel for application hosting, Google Firebase and Google Cloud for database, authentication, storage, and functions, Google Gemini for configured AI-assisted processing, Razorpay for billing, a configured SMTP service for email, Upstash Redis when configured for cache or rate limiting, and consent-gated Plausible or Google Analytics for the public website.',
            'AnswerLattice does not make a public no-training or zero-data-retention promise for Gemini processing. Those conditions depend on the deployed billing tier, enabled provider features, abuse-monitoring status, and account configuration and must be verified for a buyer that requires them.',
            'The public Trust and Data Handling page describes how each provider category is used. It is factual product documentation, not a contractual subprocessor schedule.',
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
            `Implemented windows include ${ANSWERLATTICE_RETENTION_DAYS.queryEmbeddings} days for query embedding cache, ${ANSWERLATTICE_RETENTION_DAYS.aiSearchHistory} days for raw answer/search history, ${ANSWERLATTICE_RETENTION_DAYS.notificationLogs} days for selected operational logs, ${ANSWERLATTICE_RETENTION_DAYS.ownerNotificationRateLimits} days for notification rate-limit counters, ${ANSWERLATTICE_RETENTION_DAYS.contactEnquiries} days for public contact enquiries, ${ANSWERLATTICE_RETENTION_DAYS.earlyAccessRequests} days for early-access requests and submitted feature ideas, ${ANSWERLATTICE_RETENTION_DAYS.signalEvents} days for raw signal events, and 90 days for friction daily statistics.`,
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

export default async function AnswerlatticePrivacyPolicyPage() {
    const basePath = await getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/privacy-policy" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Privacy Policy</p>
                        <h1 className="mb-4 text-4xl font-bold sm:text-5xl">Privacy Policy</h1>
                        <p className="mb-2 text-sm text-[#6b6b8a]">Last updated: August 29, 2026</p>
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
                        <div className="rounded-xl border border-teal-300/20 bg-teal-400/[0.05] p-6 text-center">
                            <h2 className="text-xl font-semibold text-white">Review current operational facts</h2>
                            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#a0a0c0]">
                                The Trust and Data Handling page lists current provider categories, implemented retention windows, and the compliance or contractual claims AnswerLattice does not currently make.
                            </p>
                            <AnswerlatticeLink basePath={basePath} href="/trust" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/[0.12] px-5 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.24] hover:text-white">
                                Open trust facts
                            </AnswerlatticeLink>
                        </div>
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
