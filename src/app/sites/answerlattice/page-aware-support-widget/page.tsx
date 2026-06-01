import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import SeoLandingPage from '../components/SeoLandingPage';

export const metadata: Metadata = {
    title: 'Page-Aware Support Widget',
    description: 'A page-aware support widget for AI-built SaaS that uses safe context, optional screenshot attachments, canonical answers, owner FAQs, changelog entries, and fallback signals.',
    alternates: { canonical: '/page-aware-support-widget' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default function PageAwareSupportWidgetPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticeHeader basePath={basePath} />
            <SeoLandingPage
                basePath={basePath}
                canonicalPath="/page-aware-support-widget"
                eyebrow="Page-aware support widget"
                title="Page-aware support widget for AI-built SaaS."
                description="Install one widget that uses safe page context, optional user-attached screenshots, canonical answers, owner FAQ answers, changelog entries, and fallback signals so users get help related to the screen they are on."
                problem="A generic widget sees the question but misses the screen. Billing, onboarding, team settings, and release pages need different answers, and visual errors sometimes need a screenshot the user deliberately attaches."
                question="Why was I charged again?"
                genericAnswer="Please check your billing settings or contact support."
                answerlatticeAnswer="You are on Billing. Your plan renews monthly, failed invoice retries follow the configured retry window, and payment can be updated from Settings -> Billing."
                ownerReview="The widget serves canonical answers first, then matching published owner answers. Missing coverage is marked as fallback and repeated gaps become review work. Screenshots are explicit user input, not automatic runtime capture."
                setupSteps={[
                    'Create an Answerlattice workspace.',
                    'Add billing, onboarding, settings, or release surfaces.',
                    'Install the widget script.',
                    'Pass safe route and workflow context.',
                    'Let users attach screenshots only when visual context helps.',
                    'Review fallback gaps and approve better answers.',
                ]}
                primaryCta="Start support setup"
            />
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
