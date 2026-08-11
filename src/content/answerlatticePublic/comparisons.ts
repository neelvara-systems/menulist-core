import type { AnswerlatticeComparison } from './types';

export const ANSWERLATTICE_COMPARISONS: AnswerlatticeComparison[] = [
    {
        slug: 'answerlattice-vs-chatbots',
        path: '/comparisons/answerlattice-vs-chatbots',
        title: 'AnswerLattice vs Chatbots',
        metaDescription: 'Compare AnswerLattice with generic chatbots for in-app support, approved answers, fallback, and human-reviewed support gaps.',
        eyebrow: 'Comparison',
        heroTitle: 'Generic chatbots answer. AnswerLattice keeps approved support tied to product truth.',
        heroDescription:
            'This is a category comparison, not a vendor claim. Use it to decide whether your support problem needs a reviewed support layer or a general chat interface.',
        answerlatticeFit: [
            'You need approved answers before fallback.',
            'Support answers depend on page, workflow, role, plan, release, or product state.',
            'Missed answers should become reviewable gaps instead of invisible chat failures.',
        ],
        otherFit: [
            'You only need a general conversational front door.',
            'Answers do not need owner review, source links, or page context.',
            'You already have a separate process for support knowledge updates.',
        ],
        tableRows: [
            { label: 'Main job', conventional: 'Respond to user prompts.', answerlattice: 'Serve approved answers tied to safe product context and capture missing coverage.' },
            { label: 'Official answer source', conventional: 'Often generated at response time.', answerlattice: 'Approved answers and owner FAQ answers are served before fallback.' },
            { label: 'Page context', conventional: 'Usually generic unless deeply customized.', answerlattice: 'Safe page hints are part of the widget contract.' },
            { label: 'Missed answers', conventional: 'May stay as chat transcript noise.', answerlattice: 'Recurring misses become support-gap review work.' },
        ],
        faq: [
            {
                question: 'Does AnswerLattice replace a chatbot?',
                answer: 'No. AnswerLattice can provide an in-app support widget, but its product center is reviewed support knowledge, not generic conversation.',
            },
            {
                question: 'Does AnswerLattice promise perfect answer behavior?',
                answer: 'No. The public claim is narrower: approved answers and owner FAQ answers are preferred before fallback, and missing coverage is reviewable.',
            },
        ],
    },
    {
        slug: 'answerlattice-vs-helpdesks',
        path: '/comparisons/answerlattice-vs-helpdesks',
        title: 'AnswerLattice vs Helpdesks',
        metaDescription: 'Compare AnswerLattice with helpdesks for support knowledge review, tickets as fallback, in-app answers, and review workflows.',
        eyebrow: 'Comparison',
        heroTitle: 'Helpdesks route support work. AnswerLattice keeps support answers reviewable.',
        heroDescription:
            'AnswerLattice is not a helpdesk replacement. It supports the knowledge layer around widget answers, hosted help, tickets, feedback, and review work.',
        answerlatticeFit: [
            'You want repeated tickets to reveal answer gaps.',
            'Tickets are fallback evidence, not the center of the product.',
            'Support content should stay connected to pages, releases, and approved answers.',
        ],
        otherFit: [
            'You need agent routing, SLAs, inbox management, and multi-channel workflows as the main product.',
            'Your support review process is already handled somewhere else.',
            'You need mature support-operations reporting more than answer review.',
        ],
        tableRows: [
            { label: 'Main job', conventional: 'Route and manage support conversations.', answerlattice: 'Keep support knowledge accurate across widget, hosted help, tickets, and review queues.' },
            { label: 'Tickets', conventional: 'Primary workflow.', answerlattice: 'Fallback and signal source for improving answer coverage.' },
            { label: 'Knowledge changes', conventional: 'Often manual and separated from tickets.', answerlattice: 'Human-reviewed answer changes are part of the support-gap loop.' },
            { label: 'Best use', conventional: 'Support team operations.', answerlattice: 'Launch-ready support setup and support knowledge review.' },
        ],
        faq: [
            {
                question: 'Can AnswerLattice replace Zendesk or Intercom?',
                answer: 'No. AnswerLattice is not positioned as a helpdesk replacement or agent-routing suite.',
            },
            {
                question: 'Why does AnswerLattice include tickets?',
                answer: 'Tickets are a practical fallback and signal trail when approved answers do not cover the user question.',
            },
        ],
    },
    {
        slug: 'answerlattice-vs-knowledge-bases',
        path: '/comparisons/answerlattice-vs-knowledge-bases',
        title: 'AnswerLattice vs Knowledge Bases',
        metaDescription: 'Compare AnswerLattice with knowledge bases for hosted help, in-app widget answers, approved owner answers, stale-answer review, and support gaps.',
        eyebrow: 'Comparison',
        heroTitle: 'Knowledge bases publish docs. AnswerLattice turns product material into reviewed support.',
        heroDescription:
            'Use this comparison when the problem is not simply publishing pages, but turning scattered material into reviewed help for the widget, help center, FAQs, and fallback as the product changes.',
        answerlatticeFit: [
            'You want help docs to power in-app widget answers.',
            'Short owner answers and articles need source links and review status.',
            'You need stale-answer and repeated-miss review, not just a document shelf.',
        ],
        otherFit: [
            'You mainly need a public help-center publishing site.',
            'Your product changes rarely and article freshness is simple.',
            'You do not need widget context, tickets, feedback, or support review loops.',
        ],
        tableRows: [
            { label: 'Main job', conventional: 'Publish and organize support articles.', answerlattice: 'Use reviewed sources to serve approved answers, owner answers, hosted help, and support-gap review.' },
            { label: 'Answer path', conventional: 'User searches or browses articles.', answerlattice: 'Widget can use safe page context, approved answers, owner FAQ answers, related docs, or fallback.' },
            { label: 'Freshness', conventional: 'Maintained by manual docs work.', answerlattice: 'Stale answers and support gaps are visible review work.' },
            { label: 'Publishing scope', conventional: 'Docs-first.', answerlattice: 'Support knowledge layer with hosted help as one output.' },
        ],
        faq: [
            {
                question: 'Is AnswerLattice a documentation CMS?',
                answer: 'No. Hosted help and docs exist, but AnswerLattice is centered on a connected support layer with reviewed answers.',
            },
            {
                question: 'Can existing docs still be used?',
                answer: 'Yes. Knowledge Intake can prepare reviewed support sources from selected docs, links, files, screenshots, recordings, and owner notes.',
            },
        ],
    },
];

export function getAnswerlatticeComparison(path: string) {
    return ANSWERLATTICE_COMPARISONS.find((item) => item.path === path);
}
