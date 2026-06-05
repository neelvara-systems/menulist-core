import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../../components/Footer';
import AnswerlatticeHeader from '../../components/Header';
import ProductCapabilityLandingPage from '../../components/ProductCapabilityLandingPage';
import { ANSWERLATTICE_PRODUCT_AREAS } from '../../productAreas';

export const metadata: Metadata = {
    title: 'Set Up Support',
    description: 'Create an AnswerLattice workspace, add team access, import starter knowledge, map important product pages, and verify the widget before launch.',
    alternates: { canonical: '/product/launch-setup' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default function LaunchSetupProductPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticeHeader basePath={basePath} />
            <ProductCapabilityLandingPage
                basePath={basePath}
                canonicalPath="/product/launch-setup"
                eyebrow="Set up support"
                title="Set up support before your first users need help."
                description="Create a workspace, add your app, invite team members, import starter knowledge, map the pages where users need help, and verify the widget before support goes live."
                activeTab="Set up support"
                tabs={ANSWERLATTICE_PRODUCT_AREAS}
                bentoTitle="You always know what is ready and what is missing."
                bentoDescription="A buyer should know exactly what remains before launch: content, context, widget install, and first approved answers."
                bentoCards={[
                    { title: 'Activation checklist', description: 'Keep setup focused on the steps that make support usable: profile, team access, import, surfaces, widget, and answer review.' },
                    { title: 'No enterprise implementation', description: 'Google sign-in and workspace creation get the founder into AnswerLattice without a sales-led project.' },
                    { title: 'Page setup first', description: 'Owners start with the screens where users actually get stuck instead of building a generic docs tree.' },
                    { title: 'Review before authority', description: 'Generated drafts and early support answers stay review work until the owner approves them.' },
                    { title: 'Owner-managed access', description: 'Owners can reset temporary passcodes and force sign-out when a workspace member needs refreshed access.' },
                    { title: 'Safe key handling', description: 'The widget key is shown for setup and managed through widget settings without exposing tenant or store IDs.' },
                ]}
                workflowTitle="Set up support in the order founders actually think."
                workflowDescription="AnswerLattice makes setup concrete: add product identity, invite the right team, import what exists, map pages, verify install, then approve the first answers."
                workflowSteps={[
                    { title: 'Create workspace', description: 'Sign in, enter company and product details, and create the AnswerLattice workspace.' },
                    { title: 'Set team access', description: 'Add workspace members with the right AnswerLattice role before support work spreads.' },
                    { title: 'Import knowledge', description: 'Bring starter docs, FAQs, custom answers, release notes, or common support answers.' },
                    { title: 'Map product surfaces', description: 'Choose the billing, onboarding, settings, release, and error pages that need contextual help.' },
                    { title: 'Verify widget install', description: 'Install one script, allow your domains, block sensitive routes, and verify page context.' },
                    { title: 'Approve first answers', description: 'Review drafts and early approved answers before relying on fallback.' },
                ]}
            />
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
