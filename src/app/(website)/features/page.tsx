import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import FeaturesPage from '@/components/website/features/FeaturesPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Features — MenuList | No Extra Work for Your Menu',
  description: 'Upload your menu and get images, descriptions, translations, QR menus, digital screens, official business page, and multi-location management — all from one place.',
  alternates: {
    canonical: '/features',
  },
  openGraph: {
    title: 'Features — MenuList | No Extra Work for Your Menu',
    description: 'Upload your menu and get images, descriptions, translations, QR menus, digital screens, official business page, and multi-location management — all from one place.',
    url: '/features',
  },
};

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/features"
        title="Features - MenuList | No Extra Work for Your Menu"
        description="Upload your menu and get images, descriptions, translations, QR menus, digital screens, official business page, and multi-location management - all from one place."
      />
      <Header />
      <FeaturesPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
