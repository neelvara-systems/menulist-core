import { Metadata } from 'next';
import { headers } from 'next/headers';
import UseCaseLandingPage from '../../components/UseCaseLandingPage';

export const metadata: Metadata = {
    title: 'Engineering Teams',
    description: 'Canonica gives engineering teams a support layer that respects product structure, safe page context, widget controls, and governed retrieval.',
    alternates: { canonical: '/use-cases/engineering' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

export default function EngineeringUseCasePage() {
    return (
        <UseCaseLandingPage
            basePath={getBasePath()}
            eyebrow="For engineering"
            title="A support layer that respects product structure."
            description="Canonica uses safe page context, allowed origins, blocked routes, and governed answer retrieval instead of treating support as loose document search."
            problem="RAG alone is too loose for product-specific support. Engineering teams need controlled runtime context, key protection, route blocking, and a clear boundary between client hints and trusted tenant scope."
            question="What does this webhook error mean?"
            genericAnswer="Search the docs for the error code or contact support."
            canonicaAnswer="The webhook error is tied to the integration setup surface. Canonica returns the approved setup answer, related FAQ, and fallback ticket path if the error is not covered."
            ownerReview="Canonica can draft fixes from repeated gaps, but the owner review step keeps generated content from becoming official support truth automatically."
            setupSteps={[
                'Install the widget with the generated Canonica key.',
                'Restrict runtime with allowed origins and blocked routes.',
                'Pass safe route, workflow, feature, role, or plan context.',
                'Verify the runtime status from the Canonica dashboard.',
                'Review fallback signals before publishing new canonical answers.',
            ]}
            primaryCta="Start free beta"
            secondaryCta="Try page-aware demo"
        />
    );
}
