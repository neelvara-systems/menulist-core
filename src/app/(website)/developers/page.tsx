import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import DevelopersPage from '@/components/website/developers/DevelopersPage';
import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import '@/styles/website.css';
import type { Metadata } from 'next';

const title = 'Developer Integration - MenuList Read-only API';
const description = 'Reference for MenuList read-only business and menu API endpoints, scoped API-key access, request limits, caching, and integration boundaries.';

export const metadata: Metadata = completeWebsiteMetadata({
    title,
    description,
    alternates: { canonical: '/developers' },
    openGraph: { title, description, url: '/developers' },
});

export default function Page() {
    return (
        <div className="ws-page">
            <WebsitePageStructuredData path="/developers" title={title} description={description} />
            <Header />
            <DevelopersPage />
            <Footer />
        </div>
    );
}
