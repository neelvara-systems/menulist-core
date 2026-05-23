import { Metadata } from 'next';
import { headers } from 'next/headers';
import UseCaseLandingPage from '../../components/UseCaseLandingPage';

export const metadata: Metadata = {
    title: 'Support for SaaS Founders',
    description: 'Canonica helps solo SaaS founders launch page-aware support, approved answers, and support-gap review before hiring a support team.',
    alternates: { canonical: '/use-cases/founders' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

export default function FoundersUseCasePage() {
    return (
        <UseCaseLandingPage
            basePath={getBasePath()}
            canonicalPath="/use-cases/founders"
            eyebrow="For founders"
            title="Support that improves while you build."
            description="Canonica gives solo founders a page-aware widget, hosted help, approved answers, and a review queue for repeated misses."
            problem="Small SaaS founders ship fast, but support content rarely keeps up. Users ask from billing, onboarding, settings, and release screens while the founder is still building the product."
            question="Why did my invoice fail?"
            genericAnswer="Please check your billing settings or contact support."
            canonicaAnswer="You are on Billing Invoices. Canonica serves the approved billing retry answer first, links the invoice FAQ, and only falls back to a ticket if payment still fails."
            ownerReview="When Canonica misses, the gap becomes review work instead of disappearing into chat history. The founder approves the answer before future users receive it as support truth."
            setupSteps={[
                'Sign in and create the Canonica beta workspace.',
                'Add company, product, support email, and support-heavy pages.',
                'Import docs, FAQs, release notes, and recurring support answers.',
                'Install the widget and verify page context.',
                'Approve the first canonical answers from the governance queue.',
            ]}
            primaryCta="Start free beta"
            secondaryCta="Try page-aware demo"
        />
    );
}
