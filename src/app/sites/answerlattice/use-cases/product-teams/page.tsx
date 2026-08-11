import { Metadata } from 'next';
import { headers } from 'next/headers';
import UseCaseLandingPage from '../../components/UseCaseLandingPage';

export const metadata: Metadata = {
    title: 'Product Teams',
    description: 'AnswerLattice helps product teams inside growing companies keep reviewed support knowledge aligned with product areas and releases.',
    alternates: { canonical: '/use-cases/product-teams' },
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

export default async function ProductTeamsUseCasePage() {
    return (
        <UseCaseLandingPage
            basePath={await getBasePath()}
            canonicalPath="/use-cases/product-teams"
            eyebrow="For product teams"
            title="See where product changes break support."
            description="Product, support, and engineering teammates can use AnswerLattice to turn releases, product pages, support gaps, and approved answers into accountable review work."
            problem="Fast releases change workflows, limits, roles, and states. Without stale-answer review, old docs and old answers keep misleading users after the product changes."
            question="Did usage limits change?"
            genericAnswer="Read the latest release notes for usage limits."
            answerlatticeAnswer="The usage-limits release affected plan quota answers. AnswerLattice flags stale-answer risk until the related approved answer is reviewed."
            ownerReview="Product changes become support-review work through stale-answer checks, coverage, and review queues. Draft changes still require human approval before they become official answers."
            setupSteps={[
                'Keep one accountable owner for official support and invite only active teammates.',
                'Define surfaces for release-heavy areas such as billing, limits, permissions, and settings.',
                'Map changelog entries to affected surfaces and answers.',
                'Review stale-answer and coverage signals after releases.',
                'Protect material billing, security, retention, and permission answers with repeatable tests.',
            ]}
            primaryCta="Create workspace"
            secondaryCta="See 60-sec demo"
        />
    );
}
