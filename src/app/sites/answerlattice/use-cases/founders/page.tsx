import { Metadata } from 'next';
import { headers } from 'next/headers';
import UseCaseLandingPage from '../../components/UseCaseLandingPage';

export const metadata: Metadata = {
    title: 'Support for SaaS Founders',
    description: 'AnswerLattice helps solo founders launch a support layer with in-app help, hosted help, approved answers, ticket fallback, and support-gap review.',
    alternates: { canonical: '/use-cases/founders' },
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

export default async function FoundersUseCasePage() {
    return (
        <UseCaseLandingPage
            basePath={await getBasePath()}
            canonicalPath="/use-cases/founders"
            eyebrow="For founders"
            title="Your product is live. Your support cannot be random."
            description="You built and shipped fast. AnswerLattice helps users get correct answers from billing, onboarding, settings, releases, and error pages while you keep building."
            problem="AI helps you create the product quickly, but users still need support, docs, answers, and fallback. Without a support layer, every repeated question comes back to you."
            question="Why did my invoice fail?"
            genericAnswer="Please check your billing settings or contact support."
            answerlatticeAnswer="You are on Billing Invoices. AnswerLattice serves the approved billing retry answer first, links the invoice FAQ, and only falls back to a ticket if payment still fails."
            ownerReview="You approve what becomes official. When AnswerLattice misses, the gap becomes review work instead of disappearing into chat history."
            setupSteps={[
                'Sign in and create the AnswerLattice paid Starter workspace.',
                'Add company, product, support email, and support-heavy pages.',
                'Import docs, FAQs, owner answers, release notes, and recurring support answers.',
                'Install the widget and verify page context.',
                'Approve the first answers from the review queue.',
            ]}
            primaryCta="Create workspace"
            secondaryCta="See 60-sec demo"
        />
    );
}
