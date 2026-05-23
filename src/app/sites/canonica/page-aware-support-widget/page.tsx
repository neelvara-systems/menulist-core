import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import SeoLandingPage from '../components/SeoLandingPage';

export const metadata: Metadata = {
    title: 'Page-Aware Support Widget',
    description: 'A page-aware support widget for SaaS products that uses safe product context and owner-approved answers before fallback.',
    alternates: { canonical: '/page-aware-support-widget' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

export default function PageAwareSupportWidgetPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <SeoLandingPage
                basePath={basePath}
                canonicalPath="/page-aware-support-widget"
                eyebrow="Page-aware support widget"
                title="Support that changes with the product page."
                description="Canonica lets SaaS teams install one widget that can use safe page context, approved answers, FAQs, changelog entries, and fallback signals."
                problem="A generic widget sees the question but misses the screen. Billing, onboarding, team settings, and release pages need different answers even when the user asks in similar words."
                question="Why was I charged again?"
                genericAnswer="Please check your billing settings or contact support."
                canonicaAnswer="You are on Billing. Your plan renews monthly, failed invoice retries follow the configured retry window, and payment can be updated from Settings -> Billing."
                ownerReview="The widget can serve approved canonical answers first. If coverage is missing, fallback is marked and the repeated gap becomes review work instead of hidden chat history."
                setupSteps={[
                    'Create a Canonica workspace.',
                    'Add billing, onboarding, settings, or release surfaces.',
                    'Install the widget script.',
                    'Pass safe route and workflow context.',
                    'Review fallback gaps and approve canonical answers.',
                ]}
                primaryCta="Start free setup"
            />
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
