import { Metadata } from 'next';
import { headers } from 'next/headers';
import JsonLdScript from '@/components/seo/JsonLdScript';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import { ANSWERLATTICE_SITE_URL } from '../siteConfig';

export const metadata: Metadata = {
    title: 'FAQ',
    description: 'Answers to common questions founders ask about Answerlattice setup, knowledge intake, team access, AI-built apps, page-aware support, feedback review, Support Board, owner Q&A, screenshots, pricing, tickets, and data handling.',
    alternates: { canonical: '/faq' },
    openGraph: {
        title: 'FAQ | Answerlattice',
        description: 'Answers to common questions about Answerlattice setup, knowledge intake, team access, AI-built apps, widget context, feedback review, Support Board, owner Q&A, screenshots, pricing, tickets, and data handling.',
        url: `${ANSWERLATTICE_SITE_URL}/faq`,
    },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

const FAQS = [
    {
        question: 'I built my app with AI. Do I still need Answerlattice?',
        answer: 'Yes, if real users are asking repeated questions. AI can help you build faster, but users still need support that matches your product pages and stays approved.',
    },
    {
        question: 'Can I use ChatGPT or a normal chatbot instead?',
        answer: 'You can, but generic chat is not the same as approved page-aware support. Answerlattice serves reviewed answers first and turns missing answers into review work.',
    },
    {
        question: 'What if I do not have documentation yet?',
        answer: 'Start with FAQs, setup notes, release notes, and recurring support questions. Answerlattice helps turn that material into reviewed support knowledge.',
    },
    {
        question: 'Can Answerlattice import my website or docs?',
        answer: 'Yes. Knowledge Intake can discover bounded public page candidates, import only the pages you select, and accept supported files or pasted source material. It does not crawl your whole site or log into private app areas.',
    },
    {
        question: 'Can I upload screenshots or recordings during intake?',
        answer: 'Yes. Owners can add screenshots/images or short support recordings when visual walkthroughs help. OCR and transcription are capped, support-credit logged, and stored as extracted support text for review rather than raw media files.',
    },
    {
        question: 'Do imports use support credits?',
        answer: 'Selected text sources, public help pages, and normal widget loading do not consume credits. Paid intake media extraction, AI-assisted answers, fallback handling, and governance work can use support credits so processing remains bounded.',
    },
    {
        question: 'Does Knowledge Intake publish answers automatically?',
        answer: 'No. Intake creates review drafts for KB articles, FAQs, surfaces, changelog entries, or canonical answer proposals. Owners accept and publish selected items; authoritative canonical answers still require governance approval.',
    },
    {
        question: 'Will Answerlattice make up answers?',
        answer: 'No. Approved answers are served first. If coverage is missing, fallback is marked and repeated misses go to review.',
    },
    {
        question: 'Is this for prototypes?',
        answer: 'No. Answerlattice is for live or near-live SaaS apps with real users and repeated support questions.',
    },
    {
        question: 'Is Answerlattice a chatbot?',
        answer: 'No. Answerlattice includes AI-assisted support surfaces, but the core product is approved page-aware support: page context, approved answers, stale-answer checks, and owner review.',
    },
    {
        question: 'Is Answerlattice a helpdesk?',
        answer: 'No. Answerlattice is the support knowledge layer behind your help center, widget, tickets, and changelog. Tickets are fallback and signal sources, not the center of the product.',
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
        question: 'Can I invite my team into Answerlattice?',
        answer: 'Yes. Answerlattice supports workspace members, Answerlattice-specific roles, custom permissions, owner-managed passcode reset, and force sign-out. These controls live inside the Answerlattice workspace.',
    },
    {
        question: 'What makes Answerlattice page-aware?',
        answer: 'Your product can pass safe route, page, feature, workflow, role, and plan hints to the Answerlattice widget. Answerlattice uses those hints to prefer support content connected to that product surface.',
    },
    {
        question: 'Can users attach screenshots in the widget?',
        answer: 'Yes. Users can upload or paste a screenshot with their question when visual context helps. Widget images are bounded by file type and size and are not stored as persistent files.',
    },
    {
        question: 'Can Answerlattice capture screenshots automatically?',
        answer: 'No. Answerlattice does not automatically capture the host app screen or scrape the DOM. Runtime visual context stays explicit and user-initiated.',
    },
    {
        question: 'Does Answerlattice answer every question automatically?',
        answer: 'No. Approved canonical answers are served first. If coverage is missing, fallback can help, but repeated fallback becomes a support gap for owner review.',
    },
    {
        question: 'What happens when Answerlattice does not know the answer?',
        answer: 'Answerlattice can use fallback, capture the miss as a signal, and route repeated gaps into reviewable proposals or draft answers. Those drafts require human approval before becoming authoritative.',
    },
    {
        question: 'Can I hide the widget on specific routes?',
        answer: 'Yes. Widget settings include blocked routes and allowed origins so customers can control where the widget appears.',
    },
    {
        question: 'Can Answerlattice publish a public help center?',
        answer: 'Yes. Hosted Help can publish reviewed docs, FAQs, and changelog content on support domains such as help.yourapp.com. It does not expose authenticated tickets, chat history, or workspace internals.',
    },
    {
        question: 'Can I use my own support domain?',
        answer: 'Yes. Answerlattice is designed for branded help domains such as help.yourapp.com, docs.yourapp.com, or support.yourapp.com so customer-facing support feels native to your product.',
    },
    {
        question: 'Do tickets include debugging details?',
        answer: 'Tickets can include capped and sanitized recent browser context when the user creates the ticket. This helps owners understand broken screens faster while keeping the context tied to the reported issue.',
    },
    {
        question: 'How are FAQs created?',
        answer: 'Product owners can manage FAQs and custom Q&A directly. Answerlattice can also generate article-backed FAQ suggestions during the knowledge workflow, but they stay reviewable instead of publishing automatically.',
    },
    {
        question: 'Can I add my own question and answer?',
        answer: 'Yes. Owners can write exact repeated questions and answers, attach article, tag, entity, and page context, publish them, and let Answerlattice use them after canonical answers and before fallback when the user question matches.',
    },
    {
        question: 'Can Answerlattice work with an existing helpdesk?',
        answer: 'Yes. Answerlattice can complement ticket tools as the governed support-knowledge layer, but public website copy does not promise broad helpdesk integrations while those paths are rollout-gated.',
    },
    {
        question: 'What is the Support Board?',
        answer: 'Support Board is a private owner/staff workboard for selected support gaps, internal notes, status history, and answer-proposal handoff. It helps owners track follow-up without turning Answerlattice into a project-management tool.',
    },
    {
        question: 'What happens to feedback and feature requests?',
        answer: 'Users can submit ratings, product-area feedback, feature requests, and suggestions from the Help Center. Owners review those items privately and can move useful signals into Support Board or answer-proposal review. Answerlattice is not a public voting board.',
    },
    {
        question: 'Does Support Board sync every ticket or signal?',
        answer: 'No. Tickets and signals already have their own screens. Support Board is manual-first by default; ticket/signal sync and nightly board preparation stay controlled rollout paths so work is not duplicated or made unnecessarily expensive.',
    },
    {
        question: 'Can Answerlattice notify my team in Slack or email?',
        answer: 'Yes. Answerlattice supports Slack and email workflow notifications for governance events such as digest summaries, coverage drops, repeated answer failures, and test delivery. Broader adapter integrations should stay controlled rollout until they are safe for every workspace.',
    },
    {
        question: 'Will proactive help interrupt users everywhere?',
        answer: 'No. Proactive help is configured and page-aware. The widget should only request or show configured prompts when the workspace has active triggers and approved support summaries for that page context.',
    },
    {
        question: 'Does every widget load scan all support data?',
        answer: 'No. Runtime paths use compact summaries, cache freshness checks, and compiled approved context. Source data remains governed in Answerlattice. Public bundles do not include drafts, tickets, audit logs, API keys, or private workspace internals.',
    },
    {
        question: 'Can coding agents use Answerlattice through MCP today?',
        answer: 'MCP and agent-context tools stay rollout-gated. Answerlattice can prepare approved context for authenticated server paths, but public pages do not promise general MCP access or agent-side knowledge writes.',
    },
    {
        question: 'What happens when a product release changes an answer?',
        answer: 'Changelogs can be tied to product surfaces and affected answers. Drift and release-impact checks then show which support content needs review.',
    },
    {
        question: 'What should I import first?',
        answer: 'Start with existing docs, setup guides, FAQs, changelogs, and the top recurring support questions. Answerlattice prepares candidates and drafts for review instead of forcing manual modeling first.',
    },
    {
        question: 'Is pricing per resolved question?',
        answer: 'No. Public packaging is predictable monthly pricing in INR. Beta setup can start free, paid plans and support-credit top-ups live in Answerlattice Billing, and usage limits protect infrastructure without punishing support deflection.',
    },
    {
        question: 'Does widget context decide workspace identity?',
        answer: 'No. Widget page context helps Answerlattice choose relevant support. Workspace identity is resolved through Answerlattice workspace, domain, widget key, and authenticated scope controls.',
    },
];

const FAQ_GROUPS = [
    {
        title: 'Setup, fit, and source intake',
        description: 'Use these when deciding whether Answerlattice fits your product and what to prepare first.',
        items: FAQS.slice(0, 9),
    },
    {
        title: 'Page-aware answers and product boundaries',
        description: 'How Answerlattice differs from generic chat, helpdesks, automatic screenshots, and unscoped context.',
        items: FAQS.slice(9, 18),
    },
    {
        title: 'Fallback, tickets, feedback, and support work',
        description: 'What happens when coverage is missing and how repeated questions become review work.',
        items: FAQS.slice(18, 30),
    },
    {
        title: 'Operations, pricing, and runtime safety',
        description: 'How notifications, runtime context, release review, pricing, and workspace identity stay controlled.',
        items: FAQS.slice(30),
    },
];

export default function AnswerlatticeFaqPage() {
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
            <AnswerlatticePageStructuredData path="/faq" />
            <AnswerlatticeHeader basePath={basePath} />
            <JsonLdScript id="answerlattice-faq-jsonld" data={faqJsonLd} />
            <main className="al-page-flow">
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">FAQ</p>
                        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Questions founders ask before adding Answerlattice.</h1>
                        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                            Plain answers about setup, knowledge intake, team access, AI-built apps, page-aware support, Support Board, owner Q&A, screenshots, pricing, data handling, and fallback tickets.
                        </p>
                        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/demo"
                                className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                            >
                                Try page-aware demo
                            </AnswerlatticeLink>
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/security-one-pager"
                                className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                            >
                                Read security summary
                            </AnswerlatticeLink>
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/get-started"
                                className="rounded-xl border border-teal-300/20 bg-teal-400/[0.055] px-6 py-3 text-sm font-semibold text-teal-100 transition hover:border-teal-300/35 hover:bg-teal-400/[0.08]"
                            >
                                Start support setup
                            </AnswerlatticeLink>
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-5xl space-y-12">
                        {FAQ_GROUPS.map((group) => (
                            <div key={group.title} className="grid gap-5 lg:grid-cols-[15rem_1fr]">
                                <div>
                                    <h2 className="text-xl font-bold leading-tight text-white">{group.title}</h2>
                                    <p className="mt-3 text-sm leading-relaxed text-[#808099]">{group.description}</p>
                                </div>
                                <div className="space-y-4">
                                    {group.items.map((item) => (
                                        <article key={item.question} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                                            <h3 className="mb-3 text-lg font-semibold text-white">{item.question}</h3>
                                            <p className="m-0 text-sm leading-relaxed text-[#a0a0c0]">{item.answer}</p>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
