import { Metadata } from 'next';
import { headers } from 'next/headers';
import UseCaseLandingPage from '../../components/UseCaseLandingPage';

export const metadata: Metadata = {
    title: 'Engineering Teams',
    description: 'AnswerLattice gives engineering teams a support layer that respects product structure, safe page context, widget controls, and reviewed support answers.',
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
            title="Install in-app support without exposing app internals."
            description="AnswerLattice uses one script, safe page context, allowed origins, blocked routes, and reviewed support answers so your app can add support without trusting raw client hints as identity."
            problem="Generic AI lookup is too loose for product-specific support. Engineering teams need controlled runtime context, key protection, route blocking, and a clear boundary between client hints and trusted tenant scope."
            question="What does this webhook error mean?"
            genericAnswer="Search the docs for the error code or contact support."
            answerlatticeAnswer="The webhook error is tied to the integration setup surface. AnswerLattice returns the approved setup answer, related FAQ, and fallback ticket path if the error is not covered."
            ownerReview="AnswerLattice can draft fixes from repeated gaps, but the owner review step keeps generated content from becoming official support automatically."
            setupSteps={[
                'Install the widget with the generated AnswerLattice key.',
                'Restrict runtime with allowed origins and blocked routes.',
                'Pass safe route, workflow, feature, role, or plan context.',
                'Verify the runtime status from the AnswerLattice dashboard.',
                'Review fallback signals before publishing new approved answers.',
            ]}
            primaryCta="Create workspace"
            secondaryCta="See 60-sec demo"
        />
    );
}
