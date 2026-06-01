import { Metadata } from 'next';
import { headers } from 'next/headers';
import UseCaseLandingPage from '../../components/UseCaseLandingPage';

export const metadata: Metadata = {
    title: 'Support for AI-Built SaaS Apps',
    description: 'Answerlattice helps AI-built SaaS products launch page-aware support, hosted help, custom owner Q&A, approved answers, ticket fallback, and reviewable support gaps.',
    alternates: { canonical: '/use-cases/ai-built-saas' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default function AiBuiltSaasUseCasePage() {
    return (
        <UseCaseLandingPage
            basePath={getBasePath()}
            canonicalPath="/use-cases/ai-built-saas"
            eyebrow="For AI-built SaaS"
            title="Support for AI-built SaaS apps."
            description="You used AI to build and launch faster. Answerlattice helps you support users before your docs, tickets, and answers fall behind."
            problem="AI helps founders ship products quickly. But users still need help with setup, billing, settings, integrations, releases, and errors. That support layer usually does not exist when the app goes live."
            question="Users are stuck in onboarding. What should they do next?"
            genericAnswer="Read the setup guide or contact support."
            answerlatticeAnswer="You are on Onboarding Import. Answerlattice serves the approved import checklist, links the setup FAQ, and opens ticket fallback only if the user's import state is not covered."
            ownerReview="Generic chat can answer without knowing the page, plan, state, or approved truth. Answerlattice serves reviewed answers first and turns missing coverage into review work."
            setupSteps={[
                'Create your Answerlattice workspace.',
                'Pick the first product pages where users get stuck.',
                'Import docs, FAQs, owner answers, release notes, setup notes, or recurring questions.',
                'Install the in-app widget and pass safe page context.',
                'Review missing-answer signals before publishing official answers.',
            ]}
            primaryCta="Start support setup"
            secondaryCta="Try page-aware demo"
        />
    );
}
