import { Metadata } from 'next';
import { headers } from 'next/headers';
import UseCaseLandingPage from '../../components/UseCaseLandingPage';

export const metadata: Metadata = {
    title: 'Engineering Teams',
    description: 'Answerlattice gives engineering teams a support layer that respects product structure, safe page context, widget controls, and governed retrieval.',
    alternates: { canonical: '/use-cases/engineering' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default function EngineeringUseCasePage() {
    return (
        <UseCaseLandingPage
            basePath={getBasePath()}
            canonicalPath="/use-cases/engineering"
            eyebrow="For engineering"
            title="Install page-aware support without exposing app internals."
            description="Answerlattice uses one script, safe page context, allowed origins, blocked routes, and governed retrieval so your app can add support without trusting raw client hints as identity."
            problem="RAG alone is too loose for product-specific support. Engineering teams need controlled runtime context, key protection, route blocking, and a clear boundary between client hints and trusted tenant scope."
            question="What does this webhook error mean?"
            genericAnswer="Search the docs for the error code or contact support."
            answerlatticeAnswer="The webhook error is tied to the integration setup surface. Answerlattice returns the approved setup answer, related FAQ, and fallback ticket path if the error is not covered."
            ownerReview="Answerlattice can draft fixes from repeated gaps, but the owner review step keeps generated content from becoming official support automatically."
            setupSteps={[
                'Install the widget with the generated Answerlattice key.',
                'Restrict runtime with allowed origins and blocked routes.',
                'Pass safe route, workflow, feature, role, or plan context.',
                'Verify the runtime status from the Answerlattice dashboard.',
                'Review fallback signals before publishing new approved answers.',
            ]}
            primaryCta="Start free beta"
            secondaryCta="Try page-aware demo"
        />
    );
}
