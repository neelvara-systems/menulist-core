import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import SeoLandingPage from '../components/SeoLandingPage';

export const metadata: Metadata = {
    title: 'Support Widget for Solo Founders',
    description: 'A support widget for solo founders shipping with AI who need in-app help, safe page context, hosted docs, owner answers, ticket fallback, and approved answers.',
    alternates: { canonical: '/support-widget-for-solo-founders' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default function SupportWidgetForSoloFoundersPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticeHeader basePath={basePath} />
            <SeoLandingPage
                basePath={basePath}
                canonicalPath="/support-widget-for-solo-founders"
                eyebrow="Support widget for solo founders"
                title="Support widget for solo founders shipping with AI."
                description="Launch a support layer from existing docs, FAQs, owner answers, release notes, recurring questions, and user-attached screenshots before support takes over your launch."
                problem="A solo founder cannot answer every expected or recurring setup, billing, permission, or visual-error question manually. But unreviewed generated support and automatic screen capture can create more risk than they remove."
                question="What should I upload first?"
                genericAnswer="Upload your documentation and check the setup guide."
                answerlatticeAnswer="Start with your setup guide, top recurring questions, release notes, and billing or onboarding pages. AnswerLattice prepares drafts and gaps for owner review."
                ownerReview="AnswerLattice keeps the founder in control of authority: generated drafts, fallback gaps, user-attached screenshots, and mutation proposals stay bounded review inputs before they become approved answers."
                setupSteps={[
                    'Sign in and create the beta workspace.',
                    'Add product name, support email, and important pages.',
                    'Import the starter knowledge you already have.',
                    'Install the widget and verify page context.',
                    'Keep screenshots explicit: upload or paste only.',
                    'Approve the first answers before relying on fallback.',
                ]}
                primaryCta="Create workspace"
            />
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
