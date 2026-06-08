import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import FeatureDetailPage from '@/components/website/features/FeatureDetailPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

const title = 'Menu Import - MenuList | Upload the Menu You Already Have';
const description = 'Upload a menu photo, PDF, link, or typed menu. MenuList prepares items, prices, sections, descriptions, and languages for owner review before publishing.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/features/menu-import',
  },
  openGraph: {
    title,
    description,
    url: '/features/menu-import',
  },
};

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData path="/features/menu-import" title={title} description={description} />
      <Header />
      <FeatureDetailPage slug="menu-import" />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
