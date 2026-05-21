import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import { CANONICA_SITE_URL } from '../siteConfig';

export const metadata: Metadata = {
    title: 'FAQ',
    description: 'Answers to common questions about Canonica setup, widget context, pricing, tickets, and data handling.',
    alternates: { canonical: '/faq' },
    openGraph: {
        title: 'FAQ | Canonica',
        description: 'Answers to common questions about Canonica setup, widget context, pricing, tickets, and data handling.',
        url: `${CANONICA_SITE_URL}/faq`,
    },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

const FAQS = [
    {
        question: 'Is Canonica a helpdesk?',
        answer: 'No. Canonica is the support knowledge layer behind your help center, widget, tickets, and changelog. Tickets are fallback and signal sources, not the center of the product.',
    },
    {
        question: 'How quickly can a small SaaS team start?',
        answer: 'The launch path is built around a short setup: add product details, import starter knowledge, choose important product pages, install the widget, and verify the first answers from the activation dashboard.',
    },
    {
        question: 'What makes Canonica page-aware?',
        answer: 'Your product can pass safe route, page, feature, workflow, role, and plan hints to the Canonica widget. Canonica uses those hints to prefer support content connected to that product surface.',
    },
    {
        question: 'Does Canonica answer every question automatically?',
        answer: 'No. Approved canonical answers are served first. If coverage is missing, fallback can help, but repeated fallback becomes a support gap for owner review.',
    },
    {
        question: 'Can I hide the widget on specific routes?',
        answer: 'Yes. Widget settings include blocked routes and allowed origins so customers can control where the widget appears.',
    },
    {
        question: 'What happens when a product release changes an answer?',
        answer: 'Changelogs can be tied to product surfaces and affected answers. Drift and release-impact checks then show which support content needs review.',
    },
    {
        question: 'What should I import first?',
        answer: 'Start with existing docs, setup guides, FAQs, changelogs, and the top recurring support questions. Canonica prepares candidates and drafts for review instead of forcing manual modeling first.',
    },
    {
        question: 'Is pricing per resolved question?',
        answer: 'No. Public packaging is predictable monthly pricing in INR. Usage limits can protect infrastructure, but the buying decision should not punish successful support deflection.',
    },
    {
        question: 'Does Canonica use MenuList data?',
        answer: 'No. MenuList is a separate product and one client/test-host use case. Canonica workspaces, dashboard, widget, scheduler, and Firebase data stay under Canonica product boundaries.',
    },
];

export default function CanonicaFaqPage() {
    const basePath = getBasePath();
    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
            },
        })),
    };

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <main className="pt-16">
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">FAQ</p>
                        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Questions founders ask before installing Canonica</h1>
                        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                            Practical answers about setup, widget behavior, pricing, support gaps, and product separation.
                        </p>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-3xl space-y-4">
                        {FAQS.map((item) => (
                            <article key={item.question} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                                <h2 className="mb-3 text-lg font-semibold text-white">{item.question}</h2>
                                <p className="m-0 text-sm leading-relaxed text-[#a0a0c0]">{item.answer}</p>
                            </article>
                        ))}
                    </div>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
