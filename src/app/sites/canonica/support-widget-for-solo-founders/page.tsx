import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import SeoLandingPage from '../components/SeoLandingPage';

export const metadata: Metadata = {
    title: 'Support Widget for Solo Founders',
    description: 'A support widget for solo founders shipping with AI who need page-aware help, optional screenshot context, hosted docs, owner Q&A, ticket fallback, and approved answers.',
    alternates: { canonical: '/support-widget-for-solo-founders' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

export default function SupportWidgetForSoloFoundersPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <SeoLandingPage
                basePath={basePath}
                canonicalPath="/support-widget-for-solo-founders"
                eyebrow="Support widget for solo founders"
                title="Support widget for solo founders shipping with AI."
                description="Launch a support layer from existing docs, FAQs, owner answers, release notes, recurring questions, and user-attached screenshots before support becomes your full-time job."
                problem="A solo founder cannot answer every repeated setup, billing, permission, or visual-error question manually. But unreviewed generated support and automatic screen capture can create more risk than they remove."
                question="What should I upload first?"
                genericAnswer="Upload your documentation and check the setup guide."
                canonicaAnswer="Start with your setup guide, top recurring questions, release notes, and billing or onboarding pages. Canonica prepares drafts and gaps for owner review."
                ownerReview="Canonica keeps the founder in control of authority: generated drafts, fallback gaps, user-attached screenshots, and mutation proposals stay bounded review inputs before they become approved answers."
                setupSteps={[
                    'Sign in and create the beta workspace.',
                    'Add product name, support email, and important pages.',
                    'Import the starter knowledge you already have.',
                    'Install the widget and verify page context.',
                    'Keep screenshots explicit: upload or paste only.',
                    'Approve the first answers before relying on fallback.',
                ]}
                primaryCta="Start free setup"
            />
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
