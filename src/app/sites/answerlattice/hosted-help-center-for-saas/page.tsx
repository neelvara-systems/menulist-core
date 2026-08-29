import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import SeoLandingPage from '../components/SeoLandingPage';

export const metadata: Metadata = {
    title: 'Hosted Help Center for SaaS',
    description: 'Hosted help center for AI-built SaaS that turns reviewed docs, FAQs, release notes, screenshots, recordings, and owner notes into public help and widget answers.',
    alternates: { canonical: '/hosted-help-center-for-saas' },
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

export default async function HostedHelpCenterForSaasPage() {
    const basePath = await getBasePath();

    return (
        <>
            <AnswerlatticeHeader basePath={basePath} />
            <SeoLandingPage
                basePath={basePath}
                    canonicalPath="/hosted-help-center-for-saas"
                    eyebrow="Hosted help center for SaaS"
                    title="Hosted help center for AI-built SaaS."
                    description="Turn reviewed docs, owner FAQs, release notes, screenshots, recordings, and owner notes into branded hosted help while the same approved truth powers your app widget."
                problem="Small SaaS teams often split docs, changelog, widget answers, and tickets across separate tools. The result is duplicate content, stale answers, and users who still open tickets."
                question="Where can users read support without logging in?"
                genericAnswer="Create a public docs site and link it from your app."
                answerlatticeAnswer="Publish reviewed articles, owner FAQs, and changelog entries on help.yourapp.com while tickets, conversations, and workspace internals stay private."
                    ownerReview="Hosted help content comes from the same reviewed support knowledge. Owners can turn articles, custom answers, product pages, changelogs, and approved answers into one support site instead of maintaining a separate docs island."
                    setupSteps={[
                        'Create your AnswerLattice workspace.',
                        'Import docs, FAQs, tickets, custom answers, release notes, screenshots, recordings, and notes.',
                    'Map content to the product pages where users need help.',
                    'Configure hosted help domain settings.',
                    'Publish reviewed help content and keep answer gaps visible.',
                ]}
                primaryCta="Request early access"
            />
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
