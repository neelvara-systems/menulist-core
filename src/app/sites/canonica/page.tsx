import { Metadata } from 'next';
import { headers } from 'next/headers';
import BestFitSection from './components/BestFitSection';
import CTASection from './components/CTASection';
import ClosedLoopSection from './components/ClosedLoopSection';
import ComparisonSection from './components/ComparisonSection';
import DayOneLaunchPackSection from './components/DayOneLaunchPackSection';
import CanonicaFooter from './components/Footer';
import CanonicaHeader from './components/Header';
import HeroSection from './components/HeroSection';
import HomePageAwareDemoSection from './components/HomePageAwareDemoSection';
import HomeTrustSection from './components/HomeTrustSection';
import HowItWorksSection from './components/HowItWorksSection';
import ObjectionsSection from './components/ObjectionsSection';
import PillarsSection from './components/PillarsSection';
import PricingPreviewSection from './components/PricingPreviewSection';
import ProductAreasSection from './components/ProductAreasSection';
import ProductPreviewSection from './components/ProductPreviewSection';
import SetupFunnelSection from './components/SetupFunnelSection';
import CanonicaStructuredData from './components/StructuredData';
import SupportKnowledgeMapSection from './components/SupportKnowledgeMapSection';
import SystemCoverageSection from './components/SystemCoverageSection';
import WidgetSection from './components/WidgetSection';
import { CANONICA_SITE_DESCRIPTION, CANONICA_SITE_TITLE } from './siteConfig';

export const metadata: Metadata = {
    title: CANONICA_SITE_TITLE,
    description: CANONICA_SITE_DESCRIPTION,
    alternates: { canonical: '/' },
};

/**
 * Determine basePath for internal links.
 * Product hosts (QA ecomsai.com, production canonica.app): basePath = ''
 * Local dev (localhost/__canonica): basePath = '/__canonica'
 */
function getBasePath(): string {
    try {
        const headersList = headers();
        const productId = headersList.get('x-product-id');
        // If x-product-id is set, we're being served via middleware rewrite
        // On product hosts, links work naturally (basePath = '')
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
            <CanonicaStructuredData />
            <main className="cn-home-flow">
                <HeroSection basePath={basePath} />
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
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
