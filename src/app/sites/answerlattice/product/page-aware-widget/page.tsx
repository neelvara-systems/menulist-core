import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../../components/Footer';
import AnswerlatticeHeader from '../../components/Header';
import ProductCapabilityLandingPage from '../../components/ProductCapabilityLandingPage';
import { ANSWERLATTICE_PAGE_AWARE_WIDGET_MOTION } from '../../answerlatticeWebsiteAssets';
import { ANSWERLATTICE_PRODUCT_AREAS } from '../../productAreas';

export const metadata: Metadata = {
    title: 'In-App Help Widget',
    description: 'Install AnswerLattice as an in-app help widget with safe context, approved answers before fallback, explicit screenshots, and opt-in guidance for client-instrumented workflows.',
    alternates: { canonical: '/product/page-aware-widget' },
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

export default async function PageAwareWidgetProductPage() {
    const basePath = await getBasePath();

    return (
        <>
            <AnswerlatticeHeader basePath={basePath} />
            <ProductCapabilityLandingPage
                basePath={basePath}
                canonicalPath="/product/page-aware-widget"
                eyebrow="In-app help widget"
                title="A help widget that knows which page the user is on."
                description="Install one widget, pass safe page hints, serve approved answers before fallback, and optionally guide users through client-instrumented workflows without taking control of the product."
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
                    { title: 'Opt-in guided resolution', description: 'For instrumented workflows, point to a client-declared control, wait for a verified product event, and hand off when the user remains blocked.' },
                ]}
                workflowTitle="Install once, then make every important page support-aware."
                workflowDescription="AnswerLattice separates the runtime key, allowed origins, blocked routes, page context, and proactive capability checks so widget behavior stays maintainable."
                workflowSteps={[
                    { title: 'Generate widget key', description: 'Create the widget credential from the AnswerLattice dashboard and copy it during setup.' },
                    { title: 'Install the script', description: 'Place the widget snippet in the client product shell or selected app surfaces.' },
                    { title: 'Configure access', description: 'Allow exact app origins, then hide the launcher on routes where support should not appear.' },
                    { title: 'Send safe context', description: 'Pass page, feature, workflow, role, or plan hints; screenshot input stays user-initiated, optional, and bounded.' },
                    { title: 'Enable prompts where useful', description: 'Use active triggers for pages that benefit from proactive help; inactive workspaces skip those calls.' },
                    { title: 'Guide without taking control', description: 'When enabled, highlight declared targets and wait for verified events. AnswerLattice does not click controls or change product data.' },
                    { title: 'Review gaps', description: 'Use fallback and feedback signals to improve approved answers, owner FAQs, and source articles over time.' },
                ]}
                motionAsset={ANSWERLATTICE_PAGE_AWARE_WIDGET_MOTION}
                motionAssetSlotId="answerlattice.product.page-aware-widget.clip"
            />
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
