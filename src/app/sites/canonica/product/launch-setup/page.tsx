import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../../components/Footer';
import CanonicaHeader from '../../components/Header';
import ProductCapabilityLandingPage from '../../components/ProductCapabilityLandingPage';
import { CANONICA_PRODUCT_AREAS } from '../../productAreas';

export const metadata: Metadata = {
    title: 'Launch Setup',
    description: 'Create a Canonica workspace, add product details, import starter knowledge, map product surfaces, and verify the widget before launch.',
    alternates: { canonical: '/product/launch-setup' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

export default function LaunchSetupProductPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <ProductCapabilityLandingPage
                basePath={basePath}
                eyebrow="Launch Setup"
                title="Go from no support system to a verified support layer."
                description="Canonica gives founders an activation path: company details, product profile, starter knowledge, important product pages, widget key, and readiness checks before users rely on it."
                activeTab="Launch Setup"
                tabs={CANONICA_PRODUCT_AREAS}
                canvasTitle="Activation command center"
                canvasSubtitle="The first workspace session is organized around what must be ready before support goes live, not a blank dashboard."
                canvasBadge="Setup in progress"
                canvasItems={[
                    { title: 'Product profile', description: 'Company name, product name, support email, product URL, and workspace identity are captured once.' },
                    { title: 'Starter knowledge', description: 'Docs, FAQs, release notes, and common answers become the seed for reviewed support truth.' },
                    { title: 'Product surfaces', description: 'Billing, onboarding, settings, releases, and other support-heavy pages are mapped early.' },
                ]}
                metrics={[
                    { label: 'Workspace', value: 'Created' },
                    { label: 'Widget key', value: 'Ready once' },
                    { label: 'Activation', value: '78%' },
                ]}
                bentoTitle="The first success moment is visible."
                bentoDescription="A buyer should know exactly what remains before launch: content, context, widget install, and first approved answers."
                bentoCards={[
                    { title: 'Activation checklist', description: 'Keep setup focused on the steps that make support usable: profile, import, surfaces, widget, and answer review.' },
                    { title: 'No enterprise implementation', description: 'Google sign-in and workspace creation get the founder into Canonica without a sales-led project.' },
                    { title: 'Page setup first', description: 'Owners start with the screens where users actually get stuck instead of building a generic docs tree.' },
                    { title: 'Review before authority', description: 'Generated drafts and early support answers stay review work until the owner approves them.' },
                    { title: 'Safe key handling', description: 'The widget key is shown for setup and managed through widget settings without exposing tenant or store IDs.' },
                ]}
                workflowTitle="Launch support in the same order a founder thinks."
                workflowDescription="Canonica makes setup concrete: add product identity, import what exists, map pages, verify install, then approve first support truth."
                workflowSteps={[
                    { title: 'Create workspace', description: 'Sign in, enter company and product details, and create the Canonica workspace.' },
                    { title: 'Import knowledge', description: 'Bring starter docs, FAQs, release notes, or common support answers.' },
                    { title: 'Map product surfaces', description: 'Choose the billing, onboarding, settings, release, and error pages that need contextual help.' },
                    { title: 'Verify widget install', description: 'Install one script, allow your domains, block sensitive routes, and verify page context.' },
                    { title: 'Approve first answers', description: 'Review drafts and early canonical answers before relying on fallback.' },
                ]}
            />
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
