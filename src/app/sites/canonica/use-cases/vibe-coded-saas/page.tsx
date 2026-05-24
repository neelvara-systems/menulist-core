import { Metadata } from 'next';
import { headers } from 'next/headers';
import UseCaseLandingPage from '../../components/UseCaseLandingPage';

export const metadata: Metadata = {
    title: 'Support for Vibe-Coded SaaS Apps',
    description: 'Canonica helps vibe-coded and AI-built SaaS products launch page-aware support, hosted help, approved answers, ticket fallback, and reviewable support gaps.',
    alternates: { canonical: '/use-cases/ai-built-saas' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

export default function VibeCodedSaasUseCasePage() {
    return (
        <UseCaseLandingPage
            basePath={getBasePath()}
            canonicalPath="/use-cases/ai-built-saas"
            eyebrow="Campaign guide"
            title="Support for apps built fast with AI."
            description="If your SaaS came together quickly with AI coding tools, Canonica helps you support real users before docs, tickets, and approved answers fall behind."
            problem="Fast AI-assisted launches create a support gap. Users still need help with setup, billing, settings, integrations, releases, and errors, even when the product was built before a full help center existed."
            question="Users are asking questions before my support docs are ready. What should I launch first?"
            genericAnswer="Create a documentation site and add a chatbot later."
            canonicaAnswer="Start with the app pages where users get stuck, import your notes and repeated questions, install the widget, and review missing-answer signals as real users ask for help."
            ownerReview="Canonica is not a generic chatbot for prototypes. It is the support layer for live or near-live AI-built SaaS apps where repeated questions need approved answers and reviewable gaps."
            setupSteps={[
                'Create your Canonica workspace.',
                'Pick the first pages where users get stuck.',
                'Import docs, FAQs, release notes, setup notes, or recurring questions.',
                'Install the in-app widget and pass safe page context.',
                'Review repeated misses before publishing official answers.',
            ]}
            primaryCta="Start free setup"
            secondaryCta="Try page-aware demo"
        />
    );
}
