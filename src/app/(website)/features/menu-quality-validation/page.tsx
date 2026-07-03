import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import FeatureDetailPage from '@/components/website/features/FeatureDetailPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

const title = 'Menu Quality Validation - MenuList | Catch Menu Issues Before Customers See Them';
const description = 'Check menu prices, missing details, photos, and public readiness before publishing. MenuList keeps correction guidance tied to owner review and the approved menu.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/features/menu-quality-validation',
  },
  openGraph: {
    title,
    description,
    url: '/features/menu-quality-validation',
  },
};

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData path="/features/menu-quality-validation" title={title} description={description} />
      <Header />
      <FeatureDetailPage slug="menu-quality-validation" />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
