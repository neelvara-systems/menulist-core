import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../../components/Footer';
import AnswerlatticeHeader from '../../components/Header';
import ProductCapabilityLandingPage from '../../components/ProductCapabilityLandingPage';
import { ANSWERLATTICE_PRODUCT_AREAS } from '../../productAreas';

export const metadata: Metadata = {
    title: 'Help Center and Tickets',
    description: 'Operate Answerlattice help center, docs, FAQ, custom owner Q&A, changelog, tickets, feedback, conversations, Support Board, weekly support review, and workflow notifications from one support control layer.',
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
                eyebrow="Help center + tickets"
                title="Keep docs, FAQs, owner answers, releases, widget answers, tickets, and feedback connected."
                description="Answerlattice gives you a practical support layer for hosted help, page-aware answers, custom Q&A, ticket fallback, feedback review, conversations, private Support Board follow-up, weekly review output, and owner notifications."
                activeTab="Help center + tickets"
                tabs={ANSWERLATTICE_PRODUCT_AREAS}
                canvasTitle="Support operations without support chaos"
                canvasSubtitle="Support Control is the layer for hosted help, knowledge base, FAQ, custom owner answers, changelog, tickets as fallback, feedback review, conversations, Support Board, workflow notifications, and weekly review output."
                canvasBadge="Support live"
                canvasItems={[
                    { title: 'Hosted help', description: 'Publish docs, FAQ, custom answers, and changelog on a support domain while keeping workspace internals private.' },
                    { title: 'Ticket fallback', description: 'When an answer is missing, tickets remain a fallback path and become structured support signals.' },
                    { title: 'Feedback review', description: 'Ratings, product-area issues, feature requests, and suggestions become owner-reviewed support signals.' },
                    { title: 'Support Board', description: 'Track selected support gaps, private owner notes, status history, and answer-proposal handoff without mirroring every ticket.' },
                    { title: 'Workflow notifications', description: 'Send digest-first Slack or email updates when governance movement needs owner attention.' },
                    { title: 'Weekly review', description: 'Owners can review what changed, what failed, and which support content needs attention next.' },
                ]}
                metrics={[
                    { label: 'Help content', value: 'Published' },
                    { label: 'Ticket path', value: 'Fallback' },
                    { label: 'Board', value: 'Private' },
                ]}
                bentoTitle="Your support surfaces stay connected."
                bentoDescription="Instead of a standalone docs site, isolated ticket inbox, and separate release notes, Answerlattice keeps customer support connected by product surface."
                bentoCards={[
                    { title: 'Knowledge base', description: 'Long-form articles remain available for reviewed support content and hosted help.' },
                    { title: 'FAQ management', description: 'Owner-written Q&A and article-backed FAQs give users short answers and keep related article context nearby.' },
                    { title: 'Changelog support', description: 'Release notes can stay connected to product surfaces and affected support answers.' },
                    { title: 'Feedback signals', description: 'Help Center feedback can be reviewed by owners, grouped by Product Surface, and synced into Support Board when it reveals a support gap.' },
                    { title: 'Safe ticket context', description: 'Tickets can include capped, sanitized debugging context to reduce back-and-forth.' },
                    { title: 'Support Board', description: 'Owners can track selected support gaps, private notes, status history, and answer proposal follow-up.' },
                    { title: 'Workflow notifications', description: 'Slack and email delivery can surface digest output, coverage drops, repeated failures, and test results.' },
                ]}
                workflowTitle="Publish help, answer users, collect feedback, track follow-up, and turn fallbacks into review work."
                workflowDescription="Support Control is practical: publish help, answer users, accept fallback tickets, collect feedback, track selected follow-up on Support Board, notify owners when attention is needed, and turn unresolved issues into review work."
                workflowSteps={[
                    { title: 'Publish help content', description: 'Create or import docs, FAQs, custom answers, and release notes for the hosted help center.' },
                    { title: 'Connect product surfaces', description: 'Assign content to the routes and workflows where users need it.' },
                    { title: 'Let widget answer first', description: 'Serve canonical answers, owner FAQ answers, and related support before fallback.' },
                    { title: 'Capture fallback tickets', description: 'When coverage is missing, route the user to a ticket with safe context.' },
                    { title: 'Review feedback', description: 'Use feedback, ratings, requests, and suggestions by Product Surface to spot support content gaps.' },
                    { title: 'Track selected follow-up', description: 'Use Support Board for private notes, status history, and answer-proposal handoff when an item needs owner review.' },
                    { title: 'Notify the owner', description: 'Use Slack or email for test delivery, critical alerts, and digest-first governance summaries.' },
                    { title: 'Review weekly output', description: 'Use digest, board, and signal views to decide which support content needs owner attention.' },
                ]}
            />
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
