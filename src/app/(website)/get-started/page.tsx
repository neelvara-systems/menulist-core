import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import GetStartedPage from '@/components/website/get-started/GetStartedPage';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Get Started — Upload Your Current Menu',
    description: 'Sign in once, add your current menu, and review the prepared preview before publishing your MenuList link.',
    alternates: {
        canonical: '/get-started',
    },
    openGraph: {
        title: 'Get Started — Upload Your Current Menu',
        description: 'Sign in once, add your current menu, and review the prepared preview before publishing your MenuList link.',
        url: '/get-started',
    },
};

export default function Page() {
    return (
        <div className="ws-page">
            <WebsitePageStructuredData
                path="/get-started"
                title="Get Started - Upload Your Current Menu"
                description="Sign in once, add your current menu, and review the prepared preview before publishing your MenuList link."
            />
            <Header />
            <GetStartedPage />
            <Footer />
        </div>
    );
}
