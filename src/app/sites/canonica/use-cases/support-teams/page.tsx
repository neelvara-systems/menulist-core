import { Metadata } from 'next';
import { headers } from 'next/headers';
import UseCaseLandingPage from '../../components/UseCaseLandingPage';

export const metadata: Metadata = {
    title: 'Support Teams',
    description: 'Canonica helps small SaaS support teams reduce repeated tickets with approved answers, ticket fallback, Support Board follow-up, and a signal-to-knowledge queue.',
    alternates: { canonical: '/use-cases/support-teams' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

export default function SupportTeamsUseCasePage() {
    return (
        <UseCaseLandingPage
            basePath={getBasePath()}
            canonicalPath="/use-cases/support-teams"
            eyebrow="For support teams"
            title="Reduce repeated tickets without losing answer control."
            description="Canonica keeps approved answers in front of fallback and gives teams a private Support Board for selected follow-up before ticket patterns become reviewable support-knowledge updates."
            problem="Small support teams answer the same billing, role, setup, and error questions repeatedly. Generic chat tools can hide those gaps inside transcripts instead of improving the knowledge base."
            question="Can a teammate manage billing?"
            genericAnswer="Check your user permissions in settings."
            canonicaAnswer="You are on Team Settings. Canonica uses the current role and plan context to serve the approved billing-permission answer, then links the team-role FAQ."
            ownerReview="Tickets remain useful as fallback. Selected issues can move through Support Board notes/statuses, while repeated misses can become draft answers for human review instead of one-off replies."
            setupSteps={[
                'Map support-heavy pages such as billing, team settings, and onboarding.',
                'Import existing macros, FAQs, and common ticket answers.',
                'Review draft answers before they become authoritative.',
                'Let tickets capture safe context when fallback is needed.',
                'Use Support Board for selected follow-up and the signal queue to prioritize recurring gaps.',
            ]}
            primaryCta="Start free beta"
            secondaryCta="Try page-aware demo"
        />
    );
}
