import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../../components/Footer';
import AnswerlatticeHeader from '../../components/Header';
import ProductCapabilityLandingPage from '../../components/ProductCapabilityLandingPage';
import { ANSWERLATTICE_PRODUCT_AREAS } from '../../productAreas';

export const metadata: Metadata = {
    title: 'Help Center and Tickets',
    description: 'Turn scattered product knowledge into hosted help, scannable articles, widget support, fallback tickets, feedback review, and a focused read-only Daily Brief.',
    alternates: { canonical: '/product/support-control' },
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

export default async function SupportControlProductPage() {
    const basePath = await getBasePath();

    return (
        <>
            <AnswerlatticeHeader basePath={basePath} />
            <ProductCapabilityLandingPage
                basePath={basePath}
                canonicalPath="/product/support-control"
                eyebrow="Help center and tickets"
                title="Turn scattered product knowledge into hosted help, widget support, tickets, and feedback review."
                description="AnswerLattice gives scattered product docs, notes, tickets, replies, releases, feedback, and screenshots a practical support structure: hosted help, scannable articles, in-app answers, contextual issue notices, custom owner answers, ticket fallback, private Support Board follow-up, a focused read-only Daily Brief, and owner notifications."
                activeTab="Help center and tickets"
                tabs={ANSWERLATTICE_PRODUCT_AREAS}
                bentoTitle="Your widget, help center, tickets, and feedback use the same structured knowledge."
                bentoDescription="Instead of a standalone docs site, isolated ticket inbox, and separate release notes, AnswerLattice turns scattered product material into customer support organized by product area."
                bentoCards={[
                    { title: 'Knowledge base', description: 'Long-form articles remain available for reviewed support content, while public topic maps let readers jump to the section they need.' },
                    { title: 'FAQ management', description: 'Owner-written answers and article-backed FAQs give users short answers and keep related article context nearby.' },
                    { title: 'Changelog support', description: 'Release notes can trigger a review of affected answers and product areas.' },
                    { title: 'Feedback signals', description: 'Help Center feedback can be reviewed by owners, grouped by product area, and moved into Support Board when it reveals a support gap.' },
                    { title: 'Safe ticket context', description: 'Tickets can include capped, sanitized debugging context to reduce back-and-forth.' },
                    { title: 'Support Board', description: 'Owners can track selected support gaps, private notes, status history, and draft-answer follow-up.' },
                    { title: 'Workflow notifications', description: 'Slack and email delivery can surface digest output, coverage drops, repeated failures, and test results.' },
                    { title: 'Known issues', description: 'Publish an approved, contextual widget notice with an active window while permanent support answers remain unchanged.' },
                    { title: 'Daily Brief', description: 'See up to four focused decisions from current support summaries, or a clear quiet state when the evidence needs no action. The brief never changes support data.' },
                ]}
                workflowTitle="Publish help, answer users, collect feedback, track follow-up, and turn fallbacks into review work."
                workflowDescription="Support Control is practical: publish help, answer users, accept fallback tickets, collect feedback, track selected follow-up on Support Board, notify owners when attention is needed, and turn unresolved issues into review work."
                workflowSteps={[
                    { title: 'Review current daily work', description: 'Start from the read-only Daily Brief and open the right review screen for any current answer risk, support gap, or measured friction.' },
                    { title: 'Publish help content', description: 'Turn scattered docs, FAQs, custom answers, release notes, and product material into hosted help center content.' },
                    { title: 'Make long articles easier to scan', description: 'Let readers use safe published headings to jump to the section they need without exposing private review records.' },
                    { title: 'Map product pages', description: 'Assign content to the routes and workflows where users need it.' },
                    { title: 'Let widget answer first', description: 'Serve approved answers, owner FAQ answers, and related support before fallback.' },
                    { title: 'Capture fallback tickets', description: 'When coverage is missing, route the user to a ticket with safe context.' },
                    { title: 'Review feedback', description: 'Use feedback, ratings, requests, and suggestions by product area to spot support content gaps.' },
                    { title: 'Track selected follow-up', description: 'Use Support Board for private notes, status history, and draft-answer handoff when an item needs owner review.' },
                    { title: 'Notify the owner', description: 'Use Slack or email for test delivery, critical alerts, and digest-first support review summaries.' },
                    { title: 'Carry evidence into answer review', description: 'Open mapped friction, release, and answer-review work with the selected context intact instead of searching for the same issue again.' },
                ]}
            />
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
