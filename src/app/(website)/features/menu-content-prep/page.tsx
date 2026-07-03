import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import FeatureDetailPage from '@/components/website/features/FeatureDetailPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

const title = 'Menu Content Prep - MenuList | Descriptions, Images, and Languages';
const description = 'Prepare customer-friendly descriptions, menu images, and customer languages from the same approved menu before publishing.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/features/menu-content-prep',
  },
  openGraph: {
    title,
    description,
    url: '/features/menu-content-prep',
  },
};

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData path="/features/menu-content-prep" title={title} description={description} />
      <Header />
      <FeatureDetailPage slug="menu-content-prep" />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
