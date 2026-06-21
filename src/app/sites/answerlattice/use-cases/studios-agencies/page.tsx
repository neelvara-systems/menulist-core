import { Metadata } from 'next';
import { headers } from 'next/headers';
import UseCaseLandingPage from '../../components/UseCaseLandingPage';

export const metadata: Metadata = {
    title: 'Studios and Agencies',
    description: 'AnswerLattice helps studios and agencies add a repeatable first support layer to SaaS products they launch for clients or internal ventures.',
    alternates: { canonical: '/use-cases/studios-agencies' },
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

export default function StudiosAgenciesUseCasePage() {
    return (
        <UseCaseLandingPage
            basePath={getBasePath()}
                canonicalPath="/use-cases/studios-agencies"
                eyebrow="For studios and agencies"
                title="Add a repeatable support layer to every SaaS you launch."
                description="AnswerLattice helps product studios, agencies, and dev teams turn launch material into in-app help, hosted docs, FAQs, changelog support, ticket fallback, feedback review, and approved answers before handoff."
            problem="Studios often launch products faster than clients can build support operations. After handoff, the same questions appear around setup, billing, roles, integrations, releases, and errors."
            question="How do we hand over support without becoming the support team?"
            genericAnswer="Create documentation, train the client, and route questions to their team after launch."
            answerlatticeAnswer="AnswerLattice gives the product a first support layer: hosted help, page-aware widget, ticket fallback, feedback review, and reviewed support gaps that the owner can approve after launch."
            ownerReview="The studio can prepare the support structure, but official answers remain owner-reviewed. Missing coverage becomes a visible gap instead of an unmanaged client handoff issue."
            setupSteps={[
                'Prepare the product source package before launch or handoff.',
                    'Import client-approved docs, FAQs, release notes, setup walkthroughs, tickets, screenshots, recordings, notes, and support policies.',
                'Map support-heavy product pages and install the widget once.',
                'Publish hosted help, FAQ, and changelog from reviewed support knowledge.',
                'Give the owner a review queue for gaps, repeated questions, and stale answers.',
            ]}
            primaryCta="Create workspace"
            secondaryCta="See 60-sec demo"
        />
    );
}
