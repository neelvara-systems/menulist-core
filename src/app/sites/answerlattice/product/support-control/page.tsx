import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../../components/Footer';
import AnswerlatticeHeader from '../../components/Header';
import ProductCapabilityLandingPage from '../../components/ProductCapabilityLandingPage';
import { ANSWERLATTICE_PRODUCT_AREAS } from '../../productAreas';

export const metadata: Metadata = {
    title: 'Help Center and Tickets',
    description: 'Turn scattered product knowledge into hosted help, docs, FAQ, custom owner answers, changelog support, tickets, feedback, Support Board follow-up, weekly review, and notifications.',
    alternates: { canonical: '/product/support-control' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default function SupportControlProductPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticeHeader basePath={basePath} />
            <ProductCapabilityLandingPage
                basePath={basePath}
                canonicalPath="/product/support-control"
                eyebrow="Help center and tickets"
                title="Turn scattered support knowledge into hosted help, widget answers, tickets, and feedback review."
                description="AnswerLattice gives you a practical support layer for scattered product docs, notes, tickets, replies, releases, feedback, and screenshots: hosted help, in-app answers, custom owner answers, ticket fallback, private Support Board follow-up, weekly review output, and owner notifications."
                activeTab="Help center and tickets"
                tabs={ANSWERLATTICE_PRODUCT_AREAS}
                bentoTitle="Your support surfaces come from the same structured knowledge."
                bentoDescription="Instead of a standalone docs site, isolated ticket inbox, and separate release notes, AnswerLattice turns scattered product material into customer support by product surface."
                bentoCards={[
                    { title: 'Knowledge base', description: 'Long-form articles remain available for reviewed support content and hosted help.' },
                    { title: 'FAQ management', description: 'Owner-written answers and article-backed FAQs give users short answers and keep related article context nearby.' },
                    { title: 'Changelog support', description: 'Release notes can become product-surface review triggers for affected support answers.' },
                    { title: 'Feedback signals', description: 'Help Center feedback can be reviewed by owners, grouped by Product Surface, and synced into Support Board when it reveals a support gap.' },
                    { title: 'Safe ticket context', description: 'Tickets can include capped, sanitized debugging context to reduce back-and-forth.' },
                    { title: 'Support Board', description: 'Owners can track selected support gaps, private notes, status history, and answer proposal follow-up.' },
                    { title: 'Workflow notifications', description: 'Slack and email delivery can surface digest output, coverage drops, repeated failures, and test results.' },
                ]}
                workflowTitle="Publish help, answer users, collect feedback, track follow-up, and turn fallbacks into review work."
                workflowDescription="Support Control is practical: publish help, answer users, accept fallback tickets, collect feedback, track selected follow-up on Support Board, notify owners when attention is needed, and turn unresolved issues into review work."
                workflowSteps={[
                    { title: 'Publish help content', description: 'Turn scattered docs, FAQs, custom answers, release notes, and product material into hosted help center content.' },
                    { title: 'Map product surfaces', description: 'Assign content to the routes and workflows where users need it.' },
                    { title: 'Let widget answer first', description: 'Serve approved answers, owner FAQ answers, and related support before fallback.' },
                    { title: 'Capture fallback tickets', description: 'When coverage is missing, route the user to a ticket with safe context.' },
                    { title: 'Review feedback', description: 'Use feedback, ratings, requests, and suggestions by Product Surface to spot support content gaps.' },
                    { title: 'Track selected follow-up', description: 'Use Support Board for private notes, status history, and answer-proposal handoff when an item needs owner review.' },
                    { title: 'Notify the owner', description: 'Use Slack or email for test delivery, critical alerts, and digest-first support review summaries.' },
                    { title: 'Review weekly output', description: 'Use digest, board, and signal views to decide which support content needs owner attention.' },
                ]}
            />
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
