import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import PricingWrapper from '@/components/website/pricing/PricingWrapper';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Pricing — MenuList | Simple, Transparent Plans for Every Business',
    description: 'Choose the right MenuList plan for your business. Free to start. Upgrade for more surfaces, multi-language support, and multi-location management.',
    alternates: {
        canonical: '/pricing',
    },
    openGraph: {
        title: 'Pricing — MenuList | Simple, Transparent Plans for Every Business',
        description: 'Choose the right MenuList plan for your business. Free to start. Upgrade for more surfaces, multi-language support, and multi-location management.',
        url: '/pricing',
    },
};

export default function PricingPage() {
    return (
        <div className="ws-page">
            <Header />
            <PricingWrapper />
            <Footer />
            <ScrollToTopButton />
        </div>
    );
}