import { Metadata } from 'next';
import { headers } from 'next/headers';
import UseCaseLandingPage from '../../components/UseCaseLandingPage';

export const metadata: Metadata = {
    title: 'Support for AI-Built SaaS Founders',
    description: 'Answerlattice helps solo founders launch page-aware support, approved answers, and support-gap review for AI-built SaaS apps.',
    alternates: { canonical: '/use-cases/founders' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default function FoundersUseCasePage() {
    return (
        <UseCaseLandingPage
            basePath={getBasePath()}
            canonicalPath="/use-cases/founders"
            eyebrow="For founders"
            title="Support for founders launching AI-built SaaS apps."
            description="You built and shipped fast. Answerlattice helps users get correct answers from billing, onboarding, settings, releases, and error pages while you keep building."
            problem="AI helps you create the product quickly, but users still need support, docs, answers, and fallback. Without a support layer, every repeated question comes back to you."
            question="Why did my invoice fail?"
            genericAnswer="Please check your billing settings or contact support."
            answerlatticeAnswer="You are on Billing Invoices. Answerlattice serves the approved billing retry answer first, links the invoice FAQ, and only falls back to a ticket if payment still fails."
            ownerReview="You approve what becomes official. When Answerlattice misses, the gap becomes review work instead of disappearing into chat history."
            setupSteps={[
                'Sign in and create the Answerlattice beta workspace.',
                'Add company, product, support email, and support-heavy pages.',
                'Import docs, FAQs, owner answers, release notes, and recurring support answers.',
                'Install the widget and verify page context.',
                'Approve the first answers from the review queue.',
            ]}
            primaryCta="Start support setup"
            secondaryCta="Try page-aware demo"
        />
    );
}
