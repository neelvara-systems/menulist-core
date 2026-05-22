import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import SeoLandingPage from '../components/SeoLandingPage';

export const metadata: Metadata = {
    title: 'Support Widget for Solo Founders',
    description: 'A support widget for solo SaaS founders who need approved answers, page-aware help, and support-gap review before hiring support.',
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
                eyebrow="Support widget for solo founders"
                title="Give users help before support becomes a team."
                description="Canonica helps founder-led SaaS products launch page-aware support from existing docs, FAQs, releases, and common answers."
                problem="A solo founder cannot answer every repeated setup, billing, or permission question manually. But unreviewed generated support can create more risk than it removes."
                question="What should I upload first?"
                genericAnswer="Upload your documentation and check the setup guide."
                canonicaAnswer="Start with your setup guide, top recurring questions, release notes, and billing or onboarding pages. Canonica prepares drafts and gaps for owner review."
                ownerReview="Canonica keeps the founder in control of authority: generated drafts, fallback gaps, and mutation proposals are review work before they become canonical answers."
                setupSteps={[
                    'Sign in and create the beta workspace.',
                    'Add product name, support email, and important pages.',
                    'Import the starter knowledge you already have.',
                    'Install the widget and verify page context.',
                    'Approve the first answers before relying on fallback.',
                ]}
                primaryCta="Start free setup"
            />
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
