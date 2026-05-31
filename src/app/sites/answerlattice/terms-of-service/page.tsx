import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'Terms for using Answerlattice website, dashboard, widget, and support knowledge features.',
    alternates: { canonical: '/terms-of-service' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

const SECTIONS = [
    {
        title: 'Using Answerlattice',
        body: [
            'Answerlattice helps SaaS teams manage product support knowledge, approved answers, help widgets, hosted help centers, FAQs, changelogs, tickets, and support-gap review flows.',
            'You are responsible for the content you upload, the workspace users you invite, the help domains you configure, and the page context your product sends to Answerlattice.',
        ],
    },
    {
        title: 'Accounts and Workspaces',
        body: [
            'You must keep account access secure and ensure workspace information is accurate. Workspace owners are responsible for configuration choices such as allowed origins, blocked routes, widget behavior, and published support content.',
            'Answerlattice may restrict access if an account is inactive, abusive, unsafe, or violates these terms.',
        ],
    },
    {
        title: 'Support Content and AI-Assisted Drafts',
        body: [
            'Answerlattice may help draft answers, identify entities, summarize support gaps, or propose knowledge updates. Drafts are not final support guidance until a workspace owner reviews and approves them.',
            'You should review support content before publishing it, especially when it affects billing, account access, legal terms, security, or product-critical workflows.',
        ],
    },
    {
        title: 'Acceptable Use',
        body: [
            'Do not use Answerlattice to store secrets, passwords, payment card data, unlawful content, malware, spam, or content that infringes another party\'s rights. Do not intentionally send sensitive data through widget context or ticket debugging context.',
            'Do not attempt to bypass security controls, scrape private service data, overload service infrastructure, or misuse widget keys.',
        ],
    },
    {
        title: 'Billing and Availability',
        body: [
            'Paid plans, beta access, support credits, trial periods, limits, and optional onboarding services are shown on the pricing or checkout flow available at the time of purchase.',
            'Answerlattice is operated with reasonable care, but no online service can guarantee uninterrupted availability. Maintenance, provider outages, abuse protection, or operational incidents may affect access.',
        ],
    },
    {
        title: 'Contact',
        body: [
            'For terms or account questions, contact hello@answerlattice.com.',
        ],
    },
];

export default function AnswerlatticeTermsOfServicePage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/terms-of-service" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Terms of Service</p>
                        <h1 className="mb-4 text-4xl font-bold sm:text-5xl">Terms of Service</h1>
                        <p className="mb-2 text-sm text-[#6b6b8a]">Last updated: May 22, 2026</p>
                        <p className="mt-6 text-lg leading-relaxed text-[#a0a0c0]">
                            These terms describe the expected use of Answerlattice&apos;s website, dashboard, help widget, and
                            support knowledge features.
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
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
