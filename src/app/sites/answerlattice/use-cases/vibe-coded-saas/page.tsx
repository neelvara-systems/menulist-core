import { Metadata } from 'next';
import { headers } from 'next/headers';
import UseCaseLandingPage from '../../components/UseCaseLandingPage';

export const metadata: Metadata = {
    title: 'Support for Vibe-Coded SaaS Apps',
    description: 'AnswerLattice helps vibe-coded and AI-built SaaS products launch a support layer with in-app help, hosted help, approved answers, ticket fallback, and reviewable support gaps.',
    alternates: { canonical: '/use-cases/ai-built-saas' },
};

async function getBasePath(): Promise<string> {
    try {
        const h = (await headers());
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;

        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default async function VibeCodedSaasUseCasePage() {
    return (
        <UseCaseLandingPage
            basePath={await getBasePath()}
            canonicalPath="/use-cases/ai-built-saas"
            eyebrow="Campaign guide"
            title="Support for apps built fast with AI."
            description="If your SaaS came together quickly with AI coding tools, AnswerLattice helps you prepare a support layer before first users arrive and before tickets or answers fall behind."
            problem="Fast AI-assisted launches create a support gap. Users still need help with setup, billing, settings, integrations, releases, and errors, even when the product was built before a full help center existed."
            question="Users are asking questions before my support docs are ready. What should I launch first?"
            genericAnswer="Create a documentation site and add a chatbot later."
            answerlatticeAnswer="Start with the product pages where users are likely to need help, import your notes and expected questions, install the widget, and review missing-answer signals as first users ask for help."
            ownerReview="AnswerLattice is not a generic chatbot for idea-only prototypes. It is the support layer for working, beta, or near-launch AI-built SaaS apps where expected and recurring questions need approved answers and reviewable gaps."
            setupSteps={[
                'Create your AnswerLattice workspace.',
                'Pick the first pages where users will need help.',
                'Import docs, FAQs, owner answers, release notes, setup notes, or recurring questions.',
                'Install the in-app widget and pass safe page context.',
                'Review repeated misses before publishing official answers.',
            ]}
            primaryCta="Request early access"
            secondaryCta="See 60-sec demo"
        />
    );
}
