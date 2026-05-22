import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../../components/Footer';
import CanonicaHeader from '../../components/Header';
import ProductCapabilityLandingPage from '../../components/ProductCapabilityLandingPage';
import { CANONICA_PRODUCT_AREAS } from '../../productAreas';

export const metadata: Metadata = {
    title: 'Page-Aware Widget',
    description: 'Install Canonica as a page-aware widget with safe context, allowed origins, blocked routes, hosted help, and approved answers before fallback.',
    alternates: { canonical: '/product/page-aware-widget' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

export default function PageAwareWidgetProductPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <ProductCapabilityLandingPage
                basePath={basePath}
                eyebrow="Page-Aware Widget"
                title="Support that knows where the user is stuck."
                description="The Canonica widget uses safe product-page context so billing, onboarding, team settings, and release questions can resolve to different approved support truth."
                activeTab="Page-Aware Widget"
                tabs={CANONICA_PRODUCT_AREAS}
                canvasTitle="Widget runtime and page context"
                canvasSubtitle="One script gives the product a support layer that can prefer the current page, related FAQ, release note, and canonical answer before fallback."
                canvasBadge="Widget allowed"
                canvasItems={[
                    { title: 'Allowed origins', description: 'Restrict where the widget can run so copied snippets do not become open support endpoints.' },
                    { title: 'Blocked routes', description: 'Hide the launcher on sensitive screens such as payment cards, auth flows, or private admin routes.' },
                    { title: 'Safe page hints', description: 'Pass route, feature, workflow, role, or plan context without using raw client data as tenant scope.' },
                ]}
                metrics={[
                    { label: 'Context key', value: 'billing_invoices' },
                    { label: 'Answer path', value: 'Canonical first' },
                    { label: 'Fallback', value: 'Captured' },
                ]}
                bentoTitle="The widget is configurable without becoming risky."
                bentoDescription="Product owners get practical controls for install, appearance, route behavior, and context without exposing internal IDs."
                bentoCards={[
                    { title: 'One embed script', description: 'Install the widget once and let dashboard settings control runtime behavior.' },
                    { title: 'Route-aware answers', description: 'The same question can resolve differently on invoices, onboarding import, team permissions, or release pages.' },
                    { title: 'Hosted help handoff', description: 'Users can move from the widget to hosted docs, FAQs, and changelog content on your support domain.' },
                    { title: 'Feedback as signal', description: 'Negative feedback and fallback answers become review work, not invisible chat noise.' },
                    { title: 'Mobile-first support', description: 'The widget is designed for product screens where users are already working, including mobile surfaces.' },
                ]}
                workflowTitle="Install once, then make each product page smarter."
                workflowDescription="Canonica separates the runtime key, allowed origins, blocked routes, and page context so widget behavior stays maintainable."
                workflowSteps={[
                    { title: 'Generate widget key', description: 'Create the widget credential from the Canonica dashboard and copy it during setup.' },
                    { title: 'Install the script', description: 'Place the widget snippet in the client product shell or selected app surfaces.' },
                    { title: 'Configure access', description: 'Add allowed origins and blocked routes so the widget appears only where it should.' },
                    { title: 'Send safe context', description: 'Pass page, feature, workflow, role, or plan hints when they help answer safely.' },
                    { title: 'Review gaps', description: 'Use fallback and feedback signals to improve canonical answers over time.' },
                ]}
            />
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
