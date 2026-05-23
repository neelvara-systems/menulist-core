import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import TermsOfServicePage from '@/components/website/legal/TermsOfServicePage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service — MenuList',
    description: 'Read MenuList\'s terms of service. Understand the terms and conditions for using our platform.',
    alternates: {
        canonical: '/terms-of-service',
    },
    openGraph: {
        title: 'Terms of Service — MenuList',
        description: 'Read MenuList\'s terms of service. Understand the terms and conditions for using our platform.',
        url: '/terms-of-service',
    },
};

export default function Page() {
    return (
        <div className="ws-page">
            <WebsitePageStructuredData
                path="/terms-of-service"
                title="Terms of Service - MenuList"
                description="Read MenuList's terms of service. Understand the terms and conditions for using our platform."
            />
            <Header />
            <TermsOfServicePage />
            <Footer />
            <ScrollToTopButton />
        </div>
    );
}
