import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import FeatureDetailPage from '@/components/website/features/FeatureDetailPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

const title = 'Analytics - MenuList | Customer Signals in the Owner Dashboard';
const description = 'MenuList shows today, daily, weekly, monthly, and overall customer activity from the public menu, Official Business Page, and customer app in the owner dashboard.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/features/analytics',
  },
  openGraph: {
    title,
    description,
    url: '/features/analytics',
  },
};

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData path="/features/analytics" title={title} description={description} />
      <Header />
      <FeatureDetailPage slug="analytics" />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
