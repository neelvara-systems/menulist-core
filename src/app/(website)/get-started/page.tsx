import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import GetStartedPage from '@/components/website/get-started/GetStartedPage';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Get Started - Create Your Customer Link',
    description: 'Sign in once, add your current menu, catalogue, price list, or service list, and review the prepared preview before publishing your MenuList link.',
    alternates: {
        canonical: '/get-started',
    },
    openGraph: {
        title: 'Get Started - Create Your Customer Link',
        description: 'Sign in once, add your current menu, catalogue, price list, or service list, and review the prepared preview before publishing your MenuList link.',
        url: '/get-started',
    },
};

export default function Page() {
    return (
        <div className="ws-page">
            <WebsitePageStructuredData
                path="/get-started"
                title="Get Started - Create Your Customer Link"
                description="Sign in once, add your current menu, catalogue, price list, or service list, and review the prepared preview before publishing your MenuList link."
            />
            <Header />
            <GetStartedPage />
            <Footer />
        </div>
    );
}
