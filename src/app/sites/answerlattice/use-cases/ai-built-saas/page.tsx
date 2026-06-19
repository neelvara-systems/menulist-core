import { Metadata } from 'next';
import { headers } from 'next/headers';
import UseCaseLandingPage from '../../components/UseCaseLandingPage';

export const metadata: Metadata = {
    title: 'Support for AI-Built SaaS Apps',
    description: 'AnswerLattice helps AI-built SaaS founders launch a support layer with in-app help, hosted help, owner answers, approved answers, ticket fallback, and reviewable support gaps.',
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
            title="Support users properly after building your SaaS with AI."
            description="You used AI to build faster. AnswerLattice helps you launch a support layer before first users arrive and before support materials fall behind."
            problem="AI helps founders ship products quickly. But users still need help with setup, billing, settings, integrations, releases, and errors. That support layer often needs to be prepared before the app goes live."
            question="Users are stuck in onboarding. What should they do next?"
            genericAnswer="Read the setup guide or contact support."
            answerlatticeAnswer="You are on Onboarding Import. AnswerLattice serves the approved import checklist, links the setup FAQ, and opens ticket fallback only if the user's import state is not covered."
            ownerReview="Generic chat can answer without knowing the page, plan, state, or approved truth. AnswerLattice serves reviewed answers first and turns missing coverage into review work."
            setupSteps={[
                'Create your AnswerLattice workspace.',
                'Pick the first product pages where users will need help.',
                'Import docs, FAQs, owner answers, release notes, setup notes, or recurring questions.',
                'Install the in-app widget and pass safe page context.',
                'Review missing-answer signals before publishing official answers.',
            ]}
            primaryCta="Create workspace"
            secondaryCta="See 60-sec demo"
        />
    );
}
