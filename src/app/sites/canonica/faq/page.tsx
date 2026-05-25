import { Metadata } from 'next';
import { headers } from 'next/headers';
import JsonLdScript from '@/components/seo/JsonLdScript';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaPageStructuredData from '../components/PageStructuredData';
import { CANONICA_SITE_URL } from '../siteConfig';

export const metadata: Metadata = {
    title: 'FAQ',
    description: 'Answers to common questions founders ask about Canonica setup, AI-built apps, page-aware support, pricing, tickets, and data handling.',
    alternates: { canonical: '/faq' },
    openGraph: {
        title: 'FAQ | Canonica',
        description: 'Answers to common questions about Canonica setup, AI-built apps, widget context, pricing, tickets, and data handling.',
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
        question: 'I built my app with AI. Do I still need Canonica?',
        answer: 'Yes, if real users are asking repeated questions. AI can help you build faster, but users still need support that matches your product pages and stays approved.',
    },
    {
        question: 'Can I use ChatGPT or a normal chatbot instead?',
        answer: 'You can, but generic chat is not the same as approved page-aware support. Canonica serves reviewed answers first and turns missing answers into review work.',
    },
    {
        question: 'What if I do not have documentation yet?',
        answer: 'Start with FAQs, setup notes, release notes, and recurring support questions. Canonica helps turn that material into reviewed support knowledge.',
    },
    {
        question: 'Will Canonica make up answers?',
        answer: 'No. Approved answers are served first. If coverage is missing, fallback is marked and repeated misses go to review.',
    },
    {
        question: 'Is this for prototypes?',
        answer: 'No. Canonica is for live or near-live SaaS apps with real users and repeated support questions.',
    },
    {
        question: 'Is Canonica a chatbot?',
        answer: 'No. Canonica includes AI-assisted support surfaces, but the core product is approved page-aware support: page context, approved answers, stale-answer checks, and owner review.',
    },
    {
        question: 'Is Canonica a helpdesk?',
        answer: 'No. Canonica is the support knowledge layer behind your help center, widget, tickets, and changelog. Tickets are fallback and signal sources, not the center of the product.',
    },
    {
        question: 'What is a canonical answer?',
        answer: 'A canonical answer is an approved, scoped support answer tied to product truth such as a feature, workflow, plan, role, release, state, or product surface.',
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
        question: 'What happens when Canonica does not know the answer?',
        answer: 'Canonica can use fallback, capture the miss as a signal, and route repeated gaps into reviewable proposals or draft answers. Those drafts require human approval before becoming authoritative.',
    },
    {
        question: 'Can I hide the widget on specific routes?',
        answer: 'Yes. Widget settings include blocked routes and allowed origins so customers can control where the widget appears.',
    },
    {
        question: 'Can Canonica publish a public help center?',
        answer: 'Yes. Hosted Help can publish reviewed docs, FAQs, and changelog content on support domains such as help.yourapp.com. It does not expose authenticated tickets, chat history, or workspace internals.',
    },
    {
        question: 'Can I use my own support domain?',
        answer: 'Yes. Canonica is designed for branded help domains such as help.yourapp.com, docs.yourapp.com, or support.yourapp.com so customer-facing support feels native to your product.',
    },
    {
        question: 'Do tickets include debugging details?',
        answer: 'Tickets can include capped and sanitized recent browser context when the user creates the ticket. This helps owners understand broken screens faster while keeping the context tied to the reported issue.',
    },
    {
        question: 'How are FAQs created?',
        answer: 'Product owners can manage FAQs directly. Canonica can also generate article-backed FAQ suggestions during the knowledge workflow, but they stay reviewable instead of publishing automatically.',
    },
    {
        question: 'Can Canonica work with an existing helpdesk?',
        answer: 'Yes. Canonica can complement ticket tools as the governed support-knowledge layer, but public website copy does not promise broad helpdesk integrations while those paths are rollout-gated.',
    },
    {
        question: 'Can Canonica notify my team in Slack or email?',
        answer: 'Yes. Canonica supports Slack and email workflow notifications for governance events such as digest summaries, coverage drops, repeated answer failures, and test delivery. Broader adapter integrations should stay controlled rollout until they are safe for every workspace.',
    },
    {
        question: 'Will proactive help interrupt users everywhere?',
        answer: 'No. Proactive help is configured and page-aware. The widget should only request or show configured prompts when the workspace has active triggers and approved support summaries for that page context.',
    },
    {
        question: 'Does every widget load scan all support data?',
        answer: 'No. Canonica is designed around compact summaries, cache freshness checks, and compiled approved context so runtime paths can stay fast and cost-aware. Source data remains governed in Canonica, and public bundles do not include drafts, tickets, audit logs, API keys, or private workspace internals.',
    },
    {
        question: 'Can coding agents use Canonica through MCP today?',
        answer: 'MCP and agent-context tools stay rollout-gated. Canonica can prepare approved context for authenticated server paths, but public pages do not promise general MCP access or agent-side knowledge writes.',
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
        answer: 'No. Public packaging is predictable monthly pricing in INR. Beta setup can start free, paid plans and support-credit top-ups live in Canonica Billing, and usage limits protect infrastructure without punishing support deflection.',
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
            <CanonicaPageStructuredData path="/faq" />
            <CanonicaHeader basePath={basePath} />
            <JsonLdScript id="canonica-faq-jsonld" data={faqJsonLd} />
            <main className="pt-16">
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">FAQ</p>
                        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Questions founders ask before adding Canonica.</h1>
                        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                            Plain answers about setup, AI-built apps, page-aware support, pricing, data handling, and fallback tickets.
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
