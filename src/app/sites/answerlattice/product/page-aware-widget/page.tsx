import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../../components/Footer';
import AnswerlatticeHeader from '../../components/Header';
import ProductCapabilityLandingPage from '../../components/ProductCapabilityLandingPage';
import { ANSWERLATTICE_PRODUCT_AREAS } from '../../productAreas';

export const metadata: Metadata = {
    title: 'In-App Help Widget',
    description: 'Install Answerlattice as a page-aware widget with safe context, explicit screenshot attachments, allowed origins, blocked routes, proactive prompts, canonical answers, and owner FAQ answers before fallback.',
    alternates: { canonical: '/product/page-aware-widget' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default function PageAwareWidgetProductPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticeHeader basePath={basePath} />
            <ProductCapabilityLandingPage
                basePath={basePath}
                canonicalPath="/product/page-aware-widget"
                eyebrow="In-app help widget"
                title="A help widget that knows which page the user is on."
                description="Install one widget, pass safe page hints, let users attach screenshots explicitly when visual context helps, and serve canonical answers, owner FAQ answers, related docs, configured proactive prompts, or fallback tickets based on where the user is stuck."
                activeTab="In-app help widget"
                tabs={ANSWERLATTICE_PRODUCT_AREAS}
                canvasTitle="One widget. Different answers by page."
                canvasSubtitle="One script gives the product a support layer that can prefer the current page, canonical answer, owner FAQ answer, related article, release note, explicit screenshot context, and configured proactive trigger before fallback."
                canvasBadge="Widget allowed"
                canvasItems={[
                    { title: 'Allowed origins', description: 'Restrict where the widget can run so copied snippets do not become open support endpoints.' },
                    { title: 'Blocked routes', description: 'Hide the launcher on sensitive screens such as payment cards, auth flows, or private admin routes.' },
                    { title: 'Safe page hints', description: 'Pass route, feature, workflow, role, or plan context without using raw client data as tenant scope.' },
                    { title: 'Explicit screenshots', description: 'Let users attach or paste a screenshot when it helps explain an error, without automatic runtime capture.' },
                    { title: 'Proactive prompts', description: 'When enabled, show configured help suggestions for active page triggers without calling the backend for inactive workspaces.' },
                ]}
                metrics={[
                    { label: 'Context key', value: 'billing_invoices' },
                    { label: 'Answer path', value: 'Canonical, then FAQ' },
                    { label: 'Image input', value: 'Manual only' },
                    { label: 'Proactive', value: 'Configured only' },
                ]}
                bentoTitle="Control where the widget appears and what context it receives."
                bentoDescription="Product owners get practical controls for install, appearance, route behavior, and context without exposing internal IDs."
                bentoCards={[
                    { title: 'One embed script', description: 'Install the widget once and let dashboard settings control runtime behavior.' },
                    { title: 'Route-aware answers', description: 'The same question can resolve differently on invoices, onboarding import, team permissions, or release pages.' },
                    { title: 'Hosted help handoff', description: 'Users can move from the widget to hosted docs, owner FAQs, and changelog content on your support domain.' },
                    { title: 'Feedback as signal', description: 'Negative feedback and fallback answers become review work, not invisible chat noise.' },
                    { title: 'Screenshot-aware support', description: 'Users can add a screenshot to explain visual errors, while Answerlattice keeps automatic page capture out of the runtime.' },
                    { title: 'Quiet proactive help', description: 'Rule-based prompts can appear only when active triggers and approved support summaries exist for the page.' },
                ]}
                workflowTitle="Install once, then make every important page support-aware."
                workflowDescription="Answerlattice separates the runtime key, allowed origins, blocked routes, page context, and proactive capability checks so widget behavior stays maintainable."
                workflowSteps={[
                    { title: 'Generate widget key', description: 'Create the widget credential from the Answerlattice dashboard and copy it during setup.' },
                    { title: 'Install the script', description: 'Place the widget snippet in the client product shell or selected app surfaces.' },
                    { title: 'Configure access', description: 'Add allowed origins and blocked routes so the widget appears only where it should.' },
                    { title: 'Send safe context', description: 'Pass page, feature, workflow, role, or plan hints; screenshot input stays user-initiated, optional, and bounded.' },
                    { title: 'Enable prompts where useful', description: 'Use active triggers for pages that benefit from proactive help; inactive workspaces skip those calls.' },
                    { title: 'Review gaps', description: 'Use fallback and feedback signals to improve canonical answers, owner FAQs, and source articles over time.' },
                ]}
            />
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
