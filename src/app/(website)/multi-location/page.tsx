import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import MultiLocationPage from '@/components/website/multi-location/MultiLocationPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = completeWebsiteMetadata({
    title: 'Multi-Location Menu Management - MenuList | One Approved List, Every Location',
    description: 'Manage menus and service lists across locations from one approved list. A master list can keep every outlet aligned without manual coordination.',
    alternates: {
        canonical: '/multi-location',
    },
    openGraph: {
        title: 'Multi-Location Menu Management - MenuList | One Approved List, Every Location',
        description: 'Manage menus and service lists across locations from one approved list. A master list can keep every outlet aligned without manual coordination.',
        url: '/multi-location',
    },
});

export default function Page() {
    return (
        <div className="ws-page">
            <WebsitePageStructuredData
                path="/multi-location"
                title="Multi-Location Menu Management - MenuList | One Approved List, Every Location"
                description="Manage menus and service lists across locations from one approved list. A master list can keep every outlet aligned without manual coordination."
            />
            <Header />
            <MultiLocationPage />
            <Footer />
            <ScrollToTopButton />
        </div>
    );
}
