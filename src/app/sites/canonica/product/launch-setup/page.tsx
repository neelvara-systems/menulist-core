import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../../components/Footer';
import CanonicaHeader from '../../components/Header';
import ProductCapabilityLandingPage from '../../components/ProductCapabilityLandingPage';
import { CANONICA_PRODUCT_AREAS } from '../../productAreas';

export const metadata: Metadata = {
    title: 'Set Up Support',
    description: 'Create a Canonica workspace, add team access, import starter knowledge, map important app pages, and verify the widget before launch.',
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
                canonicalPath="/product/launch-setup"
                eyebrow="Set up support"
                title="Set up support before your first users flood you with questions."
                description="Create a workspace, add your app, invite team members, import starter knowledge, map the pages where users get stuck, and verify the widget before support goes live."
                activeTab="Set up support"
                tabs={CANONICA_PRODUCT_AREAS}
                canvasTitle="Your support launch checklist"
                canvasSubtitle="The first workspace session is organized around what must be ready before users rely on support, not a blank dashboard."
                canvasBadge="Setup in progress"
                canvasItems={[
                    { title: 'Product profile', description: 'Company name, product name, support email, product URL, and workspace identity are captured once.' },
                    { title: 'Team access', description: 'Add workspace members, assign Canonica roles, and keep support controls scoped to the workspace.' },
                    { title: 'Starter knowledge', description: 'Docs, FAQs, release notes, and common answers become the seed for reviewed support content.' },
                    { title: 'Product surfaces', description: 'Billing, onboarding, settings, releases, and other support-heavy pages are mapped early.' },
                ]}
                metrics={[
                    { label: 'Workspace', value: 'Created' },
                    { label: 'Widget key', value: 'Ready once' },
                    { label: 'Activation', value: '78%' },
                ]}
                bentoTitle="You always know what is ready and what is missing."
                bentoDescription="A buyer should know exactly what remains before launch: content, context, widget install, and first approved answers."
                bentoCards={[
                    { title: 'Activation checklist', description: 'Keep setup focused on the steps that make support usable: profile, team access, import, surfaces, widget, and answer review.' },
                    { title: 'No enterprise implementation', description: 'Google sign-in and workspace creation get the founder into Canonica without a sales-led project.' },
                    { title: 'Page setup first', description: 'Owners start with the screens where users actually get stuck instead of building a generic docs tree.' },
                    { title: 'Review before authority', description: 'Generated drafts and early support answers stay review work until the owner approves them.' },
                    { title: 'Owner-managed access', description: 'Owners can reset temporary passcodes and force sign-out when a workspace member needs refreshed access.' },
                    { title: 'Safe key handling', description: 'The widget key is shown for setup and managed through widget settings without exposing tenant or store IDs.' },
                ]}
                workflowTitle="Set up support in the order founders actually think."
                workflowDescription="Canonica makes setup concrete: add product identity, invite the right team, import what exists, map pages, verify install, then approve the first answers."
                workflowSteps={[
                    { title: 'Create workspace', description: 'Sign in, enter company and product details, and create the Canonica workspace.' },
                    { title: 'Set team access', description: 'Add workspace members with the right Canonica role before support work spreads.' },
                    { title: 'Import knowledge', description: 'Bring starter docs, FAQs, custom answers, release notes, or common support answers.' },
                    { title: 'Map product surfaces', description: 'Choose the billing, onboarding, settings, release, and error pages that need contextual help.' },
                    { title: 'Verify widget install', description: 'Install one script, allow your domains, block sensitive routes, and verify page context.' },
                    { title: 'Approve first answers', description: 'Review drafts and early approved answers before relying on fallback.' },
                ]}
            />
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
