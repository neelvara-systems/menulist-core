import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import FeatureDetailPage from '@/components/website/features/FeatureDetailPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

const title = 'Official Business Page - MenuList | One Current Customer Link';
const description = 'Publish one official customer-facing page for menu, hours, photos, key photo checks, directions, contact details, actions, QR options, and public business information.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/features/official-business-page',
  },
  openGraph: {
    title,
    description,
    url: '/features/official-business-page',
  },
};

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData path="/features/official-business-page" title={title} description={description} />
      <Header />
      <FeatureDetailPage slug="official-business-page" />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
