import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import FeatureDetailPage from '@/components/website/features/FeatureDetailPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

const title = 'QR Menu and Share Links - MenuList | One Current Menu Everywhere';
const description = 'Create QR menus, share links, saved menu shortcuts, and print materials from the same owner-approved menu source.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/features/qr-menu-links',
  },
  openGraph: {
    title,
    description,
    url: '/features/qr-menu-links',
  },
};

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData path="/features/qr-menu-links" title={title} description={description} />
      <Header />
      <FeatureDetailPage slug="qr-menu-links" />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
