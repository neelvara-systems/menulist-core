import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import PrivacyPolicyPage from '@/components/website/legal/PrivacyPolicyPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = completeWebsiteMetadata({
    title: 'Privacy Policy - MenuList',
    description: 'Read MenuList\'s privacy policy. Learn how we collect, use, and protect your data.',
    alternates: {
        canonical: '/privacy-policy',
    },
    openGraph: {
        title: 'Privacy Policy - MenuList',
        description: 'Read MenuList\'s privacy policy. Learn how we collect, use, and protect your data.',
        url: '/privacy-policy',
    },
});

export default function Page() {
    return (
        <div className="ws-page">
            <WebsitePageStructuredData
                path="/privacy-policy"
                title="Privacy Policy - MenuList"
                description="Read MenuList's privacy policy. Learn how we collect, use, and protect your data."
            />
            <Header />
            <PrivacyPolicyPage />
            <Footer />
            <ScrollToTopButton />
        </div>
    );
}
