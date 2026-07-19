import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../../components/Footer';
import AnswerlatticeHeader from '../../components/Header';
import ProductCapabilityLandingPage from '../../components/ProductCapabilityLandingPage';
import { ANSWERLATTICE_PAGE_AWARE_WIDGET_MOTION } from '../../answerlatticeWebsiteAssets';
import { ANSWERLATTICE_PRODUCT_AREAS } from '../../productAreas';

export const metadata: Metadata = {
    title: 'In-App Help Widget',
    description: 'Install AnswerLattice as an in-app help widget with safe context, explicit screenshot attachments, allowed origins, blocked routes, proactive prompts, approved answers, and owner FAQ answers before fallback.',
    alternates: { canonical: '/product/page-aware-widget' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;

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
                description="Install one widget, pass safe page hints, let users attach screenshots explicitly when visual context helps, and serve approved answers, owner FAQ answers, related docs, configured proactive prompts, or fallback tickets based on where the user is stuck."
                activeTab="In-app help widget"
                tabs={ANSWERLATTICE_PRODUCT_AREAS}
                bentoTitle="Control where the widget appears and what context it receives."
                bentoDescription="Product owners get practical controls for install, appearance, route behavior, and context without exposing internal IDs."
                bentoCards={[
                    { title: 'One embed script', description: 'Install the widget once and let dashboard settings control runtime behavior.' },
                    { title: 'Route-aware answers', description: 'The same question can resolve differently on invoices, onboarding import, team permissions, or release pages.' },
                    { title: 'Hosted help handoff', description: 'Users can move from the widget to hosted docs, owner FAQs, and changelog content on your support domain.' },
                    { title: 'Feedback as signal', description: 'Negative feedback and fallback answers become review work, not invisible chat noise.' },
                    { title: 'Screenshot-aware support', description: 'Users can add a screenshot to explain visual errors, while AnswerLattice keeps automatic page capture out of the runtime.' },
                    { title: 'Quiet proactive help', description: 'Rule-based prompts can appear only when active triggers and approved support summaries exist for the page.' },
                ]}
                workflowTitle="Install once, then make every important page support-aware."
                workflowDescription="AnswerLattice separates the runtime key, allowed origins, blocked routes, page context, and proactive capability checks so widget behavior stays maintainable."
                workflowSteps={[
                    { title: 'Generate widget key', description: 'Create the widget credential from the AnswerLattice dashboard and copy it during setup.' },
                    { title: 'Install the script', description: 'Place the widget snippet in the client product shell or selected app surfaces.' },
                    { title: 'Configure access', description: 'Allow exact app origins, then hide the launcher on routes where support should not appear.' },
                    { title: 'Send safe context', description: 'Pass page, feature, workflow, role, or plan hints; screenshot input stays user-initiated, optional, and bounded.' },
                    { title: 'Enable prompts where useful', description: 'Use active triggers for pages that benefit from proactive help; inactive workspaces skip those calls.' },
                    { title: 'Review gaps', description: 'Use fallback and feedback signals to improve approved answers, owner FAQs, and source articles over time.' },
                ]}
                motionAsset={ANSWERLATTICE_PAGE_AWARE_WIDGET_MOTION}
                motionAssetSlotId="answerlattice.product.page-aware-widget.clip"
            />
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
