import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import FeatureDetailPage from '@/components/website/features/FeatureDetailPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

const title = 'Owner Phone Dashboard - MenuList | Manage Your Menu Without a Desktop';
const description = 'Use the MenuList owner dashboard from a phone browser or PWA to update menus, publish changes, check signals, and manage daily operations.';

export const metadata: Metadata = {
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
};

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
