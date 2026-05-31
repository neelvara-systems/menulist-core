import { Metadata } from 'next';
import { headers } from 'next/headers';
import BestFitSection from './components/BestFitSection';
import CTASection from './components/CTASection';
import ClosedLoopSection from './components/ClosedLoopSection';
import ComparisonSection from './components/ComparisonSection';
import DayOneLaunchPackSection from './components/DayOneLaunchPackSection';
import AnswerlatticeFooter from './components/Footer';
import AnswerlatticeHeader from './components/Header';
import HeroSection from './components/HeroSection';
import HomePageAwareDemoSection from './components/HomePageAwareDemoSection';
import HomeTrustSection from './components/HomeTrustSection';
import HowItWorksSection from './components/HowItWorksSection';
import ObjectionsSection from './components/ObjectionsSection';
import PillarsSection from './components/PillarsSection';
import PreOnboardingHomeSection from './components/PreOnboardingHomeSection';
import PricingPreviewSection from './components/PricingPreviewSection';
import ProductAreasSection from './components/ProductAreasSection';
import ProductPreviewSection from './components/ProductPreviewSection';
import SetupFunnelSection from './components/SetupFunnelSection';
import AnswerlatticeStructuredData from './components/StructuredData';
import SupportKnowledgeMapSection from './components/SupportKnowledgeMapSection';
import SystemCoverageSection from './components/SystemCoverageSection';
import WidgetSection from './components/WidgetSection';
import { ANSWERLATTICE_SITE_DESCRIPTION, ANSWERLATTICE_SITE_TITLE } from './siteConfig';

export const metadata: Metadata = {
    title: ANSWERLATTICE_SITE_TITLE,
    description: ANSWERLATTICE_SITE_DESCRIPTION,
    alternates: { canonical: '/' },
};

/**
 * Determine basePath for internal links.
 * Product hosts (QA ecomsai.com, production answerlattice.com): basePath = ''
 * Local dev (localhost/__answerlattice): basePath = '/__answerlattice'
 */
function getBasePath(): string {
    try {
        const headersList = headers();
        const productId = headersList.get('x-product-id');
        // If x-product-id is set, we're being served via middleware rewrite
        // On product hosts, links work naturally (basePath = '')
        // In dev, hostname is localhost so we need the /__answerlattice prefix
        const host = headersList.get('host') || '';
        const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
        return (productId && isLocalhost) ? '/__answerlattice' : '';
    } catch {
        return '';
    }
}

export default function AnswerlatticeHomePage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticeHeader basePath={basePath} />
            <AnswerlatticeStructuredData />
            <main className="al-home-flow">
                <HeroSection basePath={basePath} />
                <PreOnboardingHomeSection basePath={basePath} />
                <HomePageAwareDemoSection basePath={basePath} />
                <SupportKnowledgeMapSection />
                <ClosedLoopSection />
                <ProductPreviewSection />
                <ProductAreasSection basePath={basePath} />
                <BestFitSection />
                <SetupFunnelSection />
                <DayOneLaunchPackSection basePath={basePath} />
                <WidgetSection basePath={basePath} />
                <HomeTrustSection />
                <PillarsSection />
                <SystemCoverageSection />
                <HowItWorksSection />
                <ComparisonSection />
                <PricingPreviewSection basePath={basePath} />
                <ObjectionsSection />
                <CTASection basePath={basePath} />
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
