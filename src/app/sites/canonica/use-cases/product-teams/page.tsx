import { Metadata } from 'next';
import { headers } from 'next/headers';
import UseCaseLandingPage from '../../components/UseCaseLandingPage';

export const metadata: Metadata = {
    title: 'Product Teams',
    description: 'Canonica helps SaaS product teams see which product surfaces create support friction, stale answers, and review work after releases.',
    alternates: { canonical: '/use-cases/product-teams' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

export default function ProductTeamsUseCasePage() {
    return (
        <UseCaseLandingPage
            basePath={getBasePath()}
            canonicalPath="/use-cases/product-teams"
            eyebrow="For product teams"
            title="Know where product knowledge is breaking."
            description="Canonica connects product surfaces, releases, support gaps, and canonical answers so teams can see where support truth needs review."
            problem="Fast releases change workflows, limits, roles, and states. Without drift review, old docs and old answers keep misleading users after the product changes."
            question="Did usage limits change?"
            genericAnswer="Read the latest release notes for usage limits."
            canonicaAnswer="The usage-limits release affected plan quota answers. Canonica flags stale-answer risk until the related canonical answer is reviewed."
            ownerReview="Product changes become support-review work through drift, coverage, and signal queues. Proposals still require human approval before they become authoritative answers."
            setupSteps={[
                'Define surfaces for release-heavy areas such as billing, limits, and settings.',
                'Connect changelog entries to affected surfaces and answers.',
                'Review drift and coverage signals after releases.',
                'Approve proposed answer updates.',
                'Track which surfaces still need support truth.',
            ]}
            primaryCta="Start free beta"
            secondaryCta="Try page-aware demo"
        />
    );
}
