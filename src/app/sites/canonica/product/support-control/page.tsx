import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../../components/Footer';
import CanonicaHeader from '../../components/Header';
import ProductCapabilityLandingPage from '../../components/ProductCapabilityLandingPage';
import { CANONICA_PRODUCT_AREAS } from '../../productAreas';

export const metadata: Metadata = {
    title: 'Support Control',
    description: 'Operate Canonica help center, docs, FAQ, changelog, tickets, conversations, and weekly support review from one support control layer.',
    alternates: { canonical: '/product/support-control' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

export default function SupportControlProductPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <ProductCapabilityLandingPage
                basePath={basePath}
                eyebrow="Support Control"
                title="Run docs, tickets, changelog, and widget truth together."
                description="Canonica keeps customer-facing support surfaces connected so help articles, FAQs, release notes, tickets, and widget answers do not drift into separate systems."
                activeTab="Support Control"
                tabs={CANONICA_PRODUCT_AREAS}
                canvasTitle="Support operations without support chaos"
                canvasSubtitle="Support Control is the layer for hosted help, knowledge base, FAQ, changelog, tickets as fallback, conversations, and weekly review output."
                canvasBadge="Support live"
                canvasItems={[
                    { title: 'Hosted help', description: 'Publish docs, FAQ, and changelog on a support domain while keeping workspace internals private.' },
                    { title: 'Ticket fallback', description: 'When an answer is missing, tickets remain a fallback path and become structured support signals.' },
                    { title: 'Weekly review', description: 'Owners can review what changed, what failed, and what support truth needs attention next.' },
                ]}
                metrics={[
                    { label: 'Help content', value: 'Published' },
                    { label: 'Ticket path', value: 'Fallback' },
                    { label: 'Weekly digest', value: 'Ready' },
                ]}
                bentoTitle="Support surfaces stay connected."
                bentoDescription="Instead of a standalone docs site, isolated ticket inbox, and separate release notes, Canonica keeps customer support truth connected by product surface."
                bentoCards={[
                    { title: 'Knowledge base', description: 'Long-form articles remain available for reviewed support content and hosted help.' },
                    { title: 'FAQ management', description: 'Article-backed FAQs give users short answers and keep related article context nearby.' },
                    { title: 'Changelog support', description: 'Release notes can stay connected to product surfaces and affected support answers.' },
                    { title: 'Safe ticket context', description: 'Tickets can include capped, sanitized debugging context to reduce back-and-forth.' },
                    { title: 'Conversation signals', description: 'Widget conversations and feedback can become signals for governance instead of disappearing in logs.' },
                ]}
                workflowTitle="Operate support from the same truth layer."
                workflowDescription="Support Control is practical: publish help, answer users, accept fallback tickets, and turn unresolved issues into review work."
                workflowSteps={[
                    { title: 'Publish help content', description: 'Create or import docs, FAQs, and release notes for the hosted help center.' },
                    { title: 'Connect product surfaces', description: 'Assign content to the routes and workflows where users need it.' },
                    { title: 'Let widget answer first', description: 'Serve approved answers and related support truth before fallback.' },
                    { title: 'Capture fallback tickets', description: 'When coverage is missing, route the user to a ticket with safe context.' },
                    { title: 'Review weekly output', description: 'Use digest and signal views to decide what support truth needs owner attention.' },
                ]}
            />
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
