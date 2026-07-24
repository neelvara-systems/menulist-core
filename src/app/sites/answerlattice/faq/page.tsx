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
    description: 'Answers to common questions founders ask about AnswerLattice setup, knowledge intake, team access, in-app help, hosted help, approved answers, feedback review, Support Board, pricing, tickets, and data handling.',
    alternates: { canonical: '/faq' },
    openGraph: {
        title: 'FAQ | AnswerLattice',
        description: 'Answers to common questions about AnswerLattice setup, knowledge intake, team access, in-app help, hosted help, approved answers, feedback review, Support Board, owner answers, screenshots, pricing, tickets, and data handling.',
        url: `${ANSWERLATTICE_SITE_URL}/faq`,
    },
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

const FAQS = [
    {
        question: 'I built my app with AI. Do I still need AnswerLattice?',
        answer: 'Yes, if your product is live, in beta, or close to launch. AI can help you build faster, but users still need support that matches your product pages and stays approved.',
    },
    {
        question: 'Can I use ChatGPT or a normal chatbot instead?',
        answer: 'You can, but generic chat is not the same as a support layer. AnswerLattice turns scattered product knowledge into structured widget help, hosted help, tickets, feedback, changelog support, approved answers, and support-gap review.',
    },
    {
        question: 'What if I do not have documentation yet?',
        answer: 'Start with what you already have scattered around the product: FAQs, tickets, setup notes, release notes, screenshots, recordings, owner notes, and recurring support questions. AnswerLattice helps turn that material into reviewed support knowledge.',
    },
    {
        question: 'Can AnswerLattice import my website or docs?',
        answer: 'Yes. Knowledge Intake can discover bounded public page candidates, import only the pages you select, and accept supported files or pasted product material. It does not crawl your whole site or log into private app areas.',
    },
    {
        question: 'Can I upload screenshots or recordings during intake?',
        answer: 'Yes. Owners can add screenshots/images or short support recordings when visual walkthroughs help. OCR and transcription are capped, support-credit logged, and stored as extracted support text for review rather than raw media files.',
    },
    {
        question: 'Do imports use support credits?',
        answer: 'Provider-backed fallback answers, full-runtime answer tests, the source-backed first-ten starter-answer run, screenshot OCR, and short recording transcription use support credits. Approved or cached widget answers, deterministic checks, draft review, selected text import, publishing infrastructure, and public help browsing do not use credits.',
    },
    {
        question: 'Does Knowledge Intake publish answers automatically?',
        answer: 'No. Intake creates review drafts for help articles, FAQs, surfaces, changelog entries, or approved-answer proposals. Owners accept and publish selected items; official support answers still require owner approval.',
    },
    {
        question: 'Will AnswerLattice make up answers?',
        answer: 'No. Approved answers are served first. If coverage is missing, fallback is marked and repeated misses go to review.',
    },
    {
        question: 'Is this for prototypes?',
        answer: 'Not for idea-only prototypes. AnswerLattice is for working SaaS apps that are live, in beta, or close to launch and have starter support knowledge to review.',
    },
    {
        question: 'Is AnswerLattice a chatbot?',
        answer: 'No. AnswerLattice includes AI-assisted support surfaces, but the core product is a support layer: in-app help, hosted help, FAQs, changelog, tickets, feedback, approved answers, and owner review.',
    },
    {
        question: 'Is AnswerLattice a helpdesk?',
        answer: 'No. AnswerLattice is the support knowledge layer behind your help center, widget, tickets, and changelog. Tickets are fallback and signal sources, not the center of the product.',
    },
    {
        question: 'What is an approved answer?',
        answer: 'An approved answer is a reviewed, scoped support answer tied to product truth such as a feature, workflow, plan, role, release, state, or product surface.',
    },
    {
        question: 'How quickly can a small SaaS team start?',
        answer: 'The launch path is built around a short setup: add product details, import starter knowledge, choose important product pages, install the widget, and verify the first answers from the activation dashboard.',
    },
    {
        question: 'Can I invite my team into AnswerLattice?',
        answer: 'Yes. AnswerLattice supports workspace members, AnswerLattice-specific roles, custom permissions, owner-managed passcode reset, and force sign-out. These controls live inside the AnswerLattice workspace.',
    },
    {
        question: 'How does in-app context work?',
        answer: 'Your product can pass safe route, page, feature, workflow, role, and plan hints to the AnswerLattice widget. AnswerLattice uses those hints to prefer approved support content mapped to that product surface.',
    },
    {
        question: 'Can users attach screenshots in the widget?',
        answer: 'Yes. Users can upload or paste a screenshot with their question when visual context helps. Widget images are bounded by file type and size and are not stored as persistent files.',
    },
    {
        question: 'Can AnswerLattice capture screenshots automatically?',
        answer: 'No. AnswerLattice does not automatically capture the host app screen or scrape the DOM. Runtime visual context stays explicit and user-initiated.',
    },
    {
        question: 'Does AnswerLattice answer every question automatically?',
        answer: 'No. Approved answers are served first. If coverage is missing, fallback can help, but repeated fallback becomes a support gap for owner review.',
    },
    {
        question: 'What happens when AnswerLattice does not know the answer?',
        answer: 'AnswerLattice can use fallback, capture the miss as a signal, and route repeated gaps into reviewable proposals or draft answers. Those drafts require human approval before becoming authoritative.',
    },
    {
        question: 'Can I hide the widget on specific routes?',
        answer: 'Yes. Widget settings include blocked routes and allowed origins so customers can control where the widget appears.',
    },
    {
        question: 'Can AnswerLattice publish a public help center?',
        answer: 'Yes. Hosted Help can publish reviewed docs, FAQs, and changelog content on support domains such as help.yourapp.com. It does not expose authenticated tickets, chat history, or workspace internals.',
    },
    {
        question: 'Can I use my own support domain?',
        answer: 'Yes. AnswerLattice is designed for branded help domains such as help.yourapp.com, docs.yourapp.com, or support.yourapp.com so customer-facing support feels native to your product.',
    },
    {
        question: 'Do tickets include debugging details?',
        answer: 'Tickets can include capped and sanitized recent browser context when the user creates the ticket. This helps owners understand broken screens faster while keeping the context tied to the reported issue.',
    },
    {
        question: 'How are FAQs created?',
        answer: 'Product owners can manage FAQs and custom owner answers directly. AnswerLattice can also generate article-backed FAQ suggestions during the knowledge workflow, but they stay reviewable instead of publishing automatically.',
    },
    {
        question: 'Can I add my own repeated answer?',
        answer: 'Yes. Owners can write exact repeated questions and answers, attach article, tag, entity, and page context, publish them, and let AnswerLattice use them after approved answers and before fallback when the user question matches.',
    },
    {
        question: 'Can AnswerLattice work with an existing helpdesk?',
        answer: 'Yes. AnswerLattice can complement ticket tools as the reviewed support-knowledge layer, but public website copy does not promise broad helpdesk integrations while those paths are rollout-gated.',
    },
    {
        question: 'What is the Support Board?',
        answer: 'Support Board is a private owner/staff workboard for selected support gaps, internal notes, status history, and answer-proposal handoff. It helps owners track follow-up without turning AnswerLattice into a project-management tool.',
    },
    {
        question: 'What happens to feedback and feature requests?',
        answer: 'Users can submit ratings, product-area feedback, feature requests, and suggestions from the Help Center. Owners review those items privately and can move useful signals into Support Board or answer-proposal review. AnswerLattice is not a public voting board.',
    },
    {
        question: 'Does Support Board sync every ticket or signal?',
        answer: 'No. Tickets and signals already have their own screens. Support Board is manual-first by default; ticket/signal sync and nightly board preparation stay controlled rollout paths so work is not duplicated or made unnecessarily expensive.',
    },
    {
        question: 'Can AnswerLattice notify my team in Slack or email?',
        answer: 'Yes. AnswerLattice supports Slack and email workflow notifications for nightly governance summaries, coverage drops, repeated AI workflow failures, and test delivery. Jira, Linear, GitHub, Notion, and custom webhook destinations are not currently offered.',
    },
    {
        question: 'Will proactive help interrupt users everywhere?',
        answer: 'No. Proactive help is configured for specific product pages. The widget only requests or shows configured prompts when the workspace has active triggers. Temporary known-issue notices use the same page-aware runtime and expire or stop after resolution.',
    },
    {
        question: 'Does every widget load scan all support data?',
        answer: 'No. Runtime paths use compact summaries, cache freshness checks, and approved context. Source data remains inside AnswerLattice. Public bundles do not include drafts, tickets, audit logs, API keys, or private workspace internals.',
    },
    {
        question: 'Can coding agents use AnswerLattice through MCP today?',
        answer: 'MCP and agent-context tools stay rollout-gated. AnswerLattice can prepare approved context for authenticated server paths, but public pages do not promise general MCP access or agent-side knowledge writes.',
    },
    {
        question: 'What happens when a product release changes an answer?',
        answer: 'Changelogs can be tied to product surfaces and affected answers. Stale-answer and release-impact checks then show which support content needs review.',
    },
    {
        question: 'What should I import first?',
        answer: 'Start with existing docs, setup guides, FAQs, changelogs, and the top recurring support questions. AnswerLattice prepares candidates and drafts for review instead of forcing manual modeling first.',
    },
    {
        question: 'Is pricing per resolved question?',
        answer: 'No. Public packaging is predictable monthly pricing in INR. Setup starts on a paid plan, plan changes and support-credit top-ups live in AnswerLattice Billing, and usage limits protect infrastructure without punishing support deflection.',
    },
    {
        question: 'Does widget context decide workspace identity?',
        answer: 'No. Widget page context helps AnswerLattice choose relevant support. Workspace identity is resolved through AnswerLattice workspace, domain, widget key, and authenticated scope controls.',
    },
    {
        question: 'Can I test important answers before a release?',
        answer: 'Yes. Save critical questions with expected source, answer, fallback behavior, or wording. Canonical-only checks are deterministic; full-runtime checks are capped and use support credits only when they reach provider fallback. Release checks run only linked cases.',
    },
    {
        question: 'Does AnswerLattice roll back a failed answer automatically?',
        answer: 'No. A failed test can prepare a prior audited answer version as a mutation proposal. The live answer is not overwritten, and applying accepted content remains a separate governed edit.',
    },
    {
        question: 'Can a temporary issue notice replace an approved answer?',
        answer: 'No. Known Issue Mode shows an approved, contextual widget notice with an active window and optional HTTPS status link. Permanent approved answers remain unchanged.',
    },
    {
        question: 'What happens when a verified visitor token is invalid?',
        answer: 'AnswerLattice discards verified visitor context such as signed-only identity, plan, role, and locale claims. Safe page context can still provide generic page-aware support, and workspace scope always comes from the widget key.',
    },
    {
        question: 'What does Daily Brief change?',
        answer: 'Nothing in your support data directly. Daily Brief is the read-only opening view inside Support Assistant. It summarizes coverage, drift, friction, Support Board attention, and Knowledge Intake review counts, then links the owner to the correct governed screen.',
    },
    {
        question: 'Can I export my approved support knowledge?',
        answer: 'Yes, with export permission. The bounded JSON package includes approved product structure, articles, FAQs, releases, changelog entries, and canonical answers. It excludes tickets, conversations, visitor details, secrets, keys, credentials, and raw audit logs.',
    },
];

const FAQ_GROUPS = [
    {
        title: 'Setup, fit, and source intake',
        description: 'Use these when deciding whether AnswerLattice fits your product and what to prepare first.',
        items: FAQS.slice(0, 9),
    },
    {
        title: 'Approved answers and product boundaries',
        description: 'How AnswerLattice differs from generic chat, helpdesks, automatic screenshots, and unscoped context.',
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

export default async function AnswerlatticeFaqPage() {
    const basePath = await getBasePath();
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
                        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Questions founders ask before adding AnswerLattice.</h1>
                        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                            Plain answers about setup, knowledge intake, team access, in-app help, hosted help, approved answers, Support Board, owner answers, screenshots, pricing, data handling, and fallback tickets.
                        </p>
                        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/demo"
                                className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                            >See 60-sec demo</AnswerlatticeLink>
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
                                Create workspace
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
