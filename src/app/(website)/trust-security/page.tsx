import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import TrustSecurityPage from '@/components/website/trust-security/TrustSecurityPage';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Trust & Security - MenuList | How We Keep Your Data Safe',
    description: 'Learn about MenuList\'s security practices, data protection measures, and our commitment to keeping your business information safe.',
    alternates: {
        canonical: '/trust-security',
    },
    openGraph: {
        title: 'Trust & Security - MenuList | How We Keep Your Data Safe',
        description: 'Learn about MenuList\'s security practices, data protection measures, and our commitment to keeping your business information safe.',
        url: '/trust-security',
    },
};

export default function Page() {
    return (
        <div className="ws-page">
            <WebsitePageStructuredData
                path="/trust-security"
                title="Trust & Security - MenuList | How We Keep Your Data Safe"
                description="Learn about MenuList's security practices, data protection measures, and our commitment to keeping your business information safe."
            />
            <Header />
            <TrustSecurityPage />
            <Footer />
        </div>
    );
}
