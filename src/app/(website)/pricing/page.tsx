import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import PricingWrapper from '@/components/website/pricing/PricingWrapper';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Pricing - MenuList | Simple, Transparent Plans for Every Business',
    description: 'Start with a 7-day MenuList setup, then choose the plan that keeps your official customer link live, current, and owner-approved.',
    alternates: {
        canonical: '/pricing',
    },
    openGraph: {
        title: 'Pricing - MenuList | Simple, Transparent Plans for Every Business',
        description: 'Start with a 7-day MenuList setup, then choose the plan that keeps your official customer link live, current, and owner-approved.',
        url: '/pricing',
    },
};

export default function PricingPage() {
    return (
        <div className="ws-page">
            <WebsitePageStructuredData
                path="/pricing"
                title="Pricing - MenuList | Simple, Transparent Plans for Every Business"
                description="Start with a 7-day MenuList setup, then choose the plan that keeps your official customer link live, current, and owner-approved."
            />
            <Header />
            <PricingWrapper />
            <Footer />
            <ScrollToTopButton />
        </div>
    );
}
