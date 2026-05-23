import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import GetStartedPage from '@/components/website/get-started/GetStartedPage';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Get Started — Create Your Official Menu Source',
    description: 'Start with your current menu and create the owner-approved source for your public menu, official business page, QR assets, saved menu shortcut, and share links.',
    alternates: {
        canonical: '/get-started',
    },
    openGraph: {
        title: 'Get Started — Create Your Official Menu Source',
        description: 'Start with your current menu and create the owner-approved source for your public menu, official business page, QR assets, saved menu shortcut, and share links.',
        url: '/get-started',
    },
};

export default function Page() {
    return (
        <div className="ws-page">
            <WebsitePageStructuredData
                path="/get-started"
                title="Get Started - Create Your Official Menu Source"
                description="Start with your current menu and create the owner-approved source for your public menu, official business page, QR assets, saved menu shortcut, and share links."
            />
            <Header />
            <GetStartedPage />
            <Footer />
        </div>
    );
}
