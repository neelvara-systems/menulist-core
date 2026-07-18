import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import FeatureDetailPage from '@/components/website/features/FeatureDetailPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

const title = 'Owner Phone Dashboard - MenuList | Manage MenuList From Your Phone';
const description = 'Use MenuList from a phone browser or saved app to edit menus, publish changes, share QR links, review feedback, check Business Health, manage screens, and handle daily owner work.';

export const metadata: Metadata = completeWebsiteMetadata({
  title,
  description,
  alternates: {
    canonical: '/features/owner-phone-dashboard',
  },
  openGraph: {
    title,
    description,
    url: '/features/owner-phone-dashboard',
  },
});

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData path="/features/owner-phone-dashboard" title={title} description={description} />
      <Header />
      <FeatureDetailPage slug="owner-phone-dashboard" />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
