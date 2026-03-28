import { Metadata } from 'next';
import { headers } from 'next/headers';
import CTASection from './components/CTASection';
import ComparisonSection from './components/ComparisonSection';
import CanonicaFooter from './components/Footer';
import CanonicaHeader from './components/Header';
import HeroSection from './components/HeroSection';
import HowItWorksSection from './components/HowItWorksSection';
import PillarsSection from './components/PillarsSection';

export const metadata: Metadata = {
    title: 'Canonica — The Support Knowledge Control Plane for SaaS',
};

/**
 * Determine basePath for internal links.
 * Production (canonica.app): basePath = '' (natural links)
 * Dev mode (localhost/__canonica): basePath = '/__canonica'
 */
function getBasePath(): string {
    try {
        const headersList = headers();
        const productId = headersList.get('x-product-id');
        // If x-product-id is set, we're being served via middleware rewrite
        // In production, hostname is canonica.app so links work naturally (basePath = '')
        // In dev, hostname is localhost so we need the /__canonica prefix
        const host = headersList.get('host') || '';
        const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
        return (productId && isLocalhost) ? '/__canonica' : '';
    } catch {
        return '';
    }
}

export default function CanonicaHomePage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <main>
                <HeroSection basePath={basePath} />
                <PillarsSection />
                <HowItWorksSection />
                <ComparisonSection />
                <CTASection basePath={basePath} />
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
