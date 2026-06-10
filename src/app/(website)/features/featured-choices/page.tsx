import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import FeatureDetailPage from '@/components/website/features/FeatureDetailPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

const title = 'Featured Choices - MenuList | Help Customers Choose More Easily';
const description = 'Show Featured, Quick, and Value choices from the current approved menu so customers get a clearer starting point while owners keep control.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/features/featured-choices',
  },
  openGraph: {
    title,
    description,
    url: '/features/featured-choices',
  },
};

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData path="/features/featured-choices" title={title} description={description} />
      <Header />
      <FeatureDetailPage slug="featured-choices" />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
