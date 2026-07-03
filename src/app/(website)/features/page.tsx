import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import FeaturesPage from '@/components/website/features/FeaturesPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Features - MenuList | One Approved List, Every Customer Link',
  description: 'See how MenuList moves from current menu or service list to prepared review, official customer link, QR, print, owner updates, feedback, and Business Health.',
  alternates: {
    canonical: '/features',
  },
  openGraph: {
    title: 'Features - MenuList | One Approved List, Every Customer Link',
    description: 'See how MenuList moves from current menu or service list to prepared review, official customer link, QR, print, owner updates, feedback, and Business Health.',
    url: '/features',
  },
};

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/features"
        title="Features - MenuList | One Approved List, Every Customer Link"
        description="See how MenuList moves from current menu or service list to prepared review, official customer link, QR, print, owner updates, feedback, and Business Health."
      />
      <Header />
      <FeaturesPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
