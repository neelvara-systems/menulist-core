import { Metadata } from 'next';
import { headers } from 'next/headers';
import UseCaseLandingPage from '../../components/UseCaseLandingPage';

export const metadata: Metadata = {
    title: 'Product Teams',
    description: 'AnswerLattice helps SaaS product teams see which product surfaces create support friction, stale answers, and review work after releases.',
    alternates: { canonical: '/use-cases/product-teams' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;

        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default function ProductTeamsUseCasePage() {
    return (
        <UseCaseLandingPage
            basePath={getBasePath()}
            canonicalPath="/use-cases/product-teams"
                eyebrow="For product teams"
                title="See where product changes break support."
                description="AnswerLattice turns releases, product pages, support gaps, and approved answers into review work so stale support becomes visible after changes."
            problem="Fast releases change workflows, limits, roles, and states. Without stale-answer review, old docs and old answers keep misleading users after the product changes."
            question="Did usage limits change?"
            genericAnswer="Read the latest release notes for usage limits."
            answerlatticeAnswer="The usage-limits release affected plan quota answers. AnswerLattice flags stale-answer risk until the related approved answer is reviewed."
            ownerReview="Product changes become support-review work through stale-answer checks, coverage, and signal queues. Proposals still require human approval before they become official answers."
            setupSteps={[
                'Define surfaces for release-heavy areas such as billing, limits, and settings.',
                    'Map changelog entries to affected surfaces and answers.',
                'Review stale-answer and coverage signals after releases.',
                'Approve proposed answer updates.',
                'Track which surfaces still need support.',
            ]}
            primaryCta="Create workspace"
            secondaryCta="See 60-sec demo"
        />
    );
}
