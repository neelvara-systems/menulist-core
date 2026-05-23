import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import SeoLandingPage from '../components/SeoLandingPage';

export const metadata: Metadata = {
    title: 'Hosted Help Center for SaaS',
    description: 'Hosted SaaS help center for docs, FAQ, and changelog content connected to Canonica product surfaces and approved answers.',
    alternates: { canonical: '/hosted-help-center-for-saas' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

export default function HostedHelpCenterForSaasPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <SeoLandingPage
                basePath={basePath}
                canonicalPath="/hosted-help-center-for-saas"
                eyebrow="Hosted help center for SaaS"
                title="A help center that stays connected to the widget."
                description="Publish reviewed docs, FAQs, and changelog content on a branded support domain while Canonica keeps the same knowledge available to the page-aware widget."
                problem="Small SaaS teams often split docs, changelog, widget answers, and tickets across separate tools. The result is duplicate content, stale answers, and users who still open tickets."
                question="Where can users read support without logging in?"
                genericAnswer="Create a public docs site and link it from your app."
                canonicaAnswer="Publish reviewed articles, FAQs, and changelog entries on help.yourapp.com while tickets, conversations, and workspace internals stay private."
                ownerReview="Hosted help content stays part of the same governed support knowledge. Owners can connect articles to FAQs, surfaces, changelogs, and canonical answers instead of maintaining a separate support site."
                setupSteps={[
                    'Create your Canonica workspace.',
                    'Import docs, FAQs, and release notes.',
                    'Map content to product surfaces.',
                    'Configure hosted help domain settings.',
                    'Publish reviewed help content and keep answer gaps visible.',
                ]}
                primaryCta="Start free setup"
            />
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
