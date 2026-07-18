import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import type { Metadata } from 'next';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import IndustryLandingPage from '@/components/website/industries/IndustryLandingPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import { getWebsiteIndustryPage } from '@/content/websiteIndustries';
import '@/styles/website.css';

const industry = getWebsiteIndustryPage('restaurants')!;

export const metadata: Metadata = completeWebsiteMetadata({
    title: industry.metaTitle,
    description: industry.metaDescription,
    alternates: { canonical: industry.canonicalPath },
    openGraph: {
        title: industry.metaTitle,
        description: industry.metaDescription,
        url: industry.canonicalPath,
    },
});

export default function Page() {
    return (
        <div className="ws-page">
            <WebsitePageStructuredData
                path="/industries/restaurants"
                title={industry.metaTitle}
                description={industry.metaDescription}
            />
            <Header />
            <IndustryLandingPage page={industry} />
            <Footer />
            <ScrollToTopButton />
        </div>
    );
}
