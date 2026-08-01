import { Metadata } from 'next';
import { headers } from 'next/headers';
import UseCaseLandingPage from '../../components/UseCaseLandingPage';

export const metadata: Metadata = {
    title: 'Small SaaS Teams',
    description: 'AnswerLattice helps small SaaS teams manage support with in-app help, hosted help, FAQs, changelog, ticket fallback, feedback review, and approved answers before hiring a support team.',
    alternates: { canonical: '/use-cases/small-saas-teams' },
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

export default async function SmallSaasTeamsUseCasePage() {
    return (
        <UseCaseLandingPage
            basePath={await getBasePath()}
            canonicalPath="/use-cases/small-saas-teams"
            eyebrow="For small SaaS teams"
            title="Handle early support before it becomes a team problem."
            description="AnswerLattice gives small SaaS teams one support layer for in-app help, hosted docs, FAQs, changelog, ticket fallback, feedback review, approved answers, and weekly support gaps."
            problem="Small SaaS teams usually split support across docs, tickets, release notes, Slack notes, and founder memory. Users still ask the same onboarding, billing, settings, and error questions while the team is trying to ship."
            question="Where should users go when the docs are incomplete?"
            genericAnswer="Add more help articles and ask users to contact support when they are stuck."
            answerlatticeAnswer="AnswerLattice serves approved help from the widget or hosted help center first. If the answer is missing, the user gets ticket fallback and the missing coverage becomes a reviewable support gap."
            ownerReview="The team can improve support without turning every ticket into a one-off reply. Repeated gaps, stale answers, low-rated responses, and support-heavy pages stay visible until a human approves the next official answer."
            setupSteps={[
                'Start with the same bounded founder path: one workspace, priority questions, trusted sources, and a verified widget.',
                'Invite only the teammates who regularly respond, review support truth, or maintain product context.',
                'Map the pages where users get stuck: onboarding, billing, settings, integrations, and errors.',
                'Add workflow notifications or selected Support Board work only when shared ownership requires them.',
                'Review support gaps and release impact weekly before changes become official answers.',
            ]}
            primaryCta="Create workspace"
            secondaryCta="See 60-sec demo"
        />
    );
}
