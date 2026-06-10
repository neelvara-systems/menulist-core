import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import FeatureDetailPage from '@/components/website/features/FeatureDetailPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

const title = 'Customer Feedback Loop - MenuList | Private Guest Feedback';
const description = 'Let customers send private feedback from the menu, Official Business Page, QR, or direct link so owners can review issues and keep the public source correct.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/features/customer-feedback-loop',
  },
  openGraph: {
    title,
    description,
    url: '/features/customer-feedback-loop',
  },
};

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData path="/features/customer-feedback-loop" title={title} description={description} />
      <Header />
      <FeatureDetailPage slug="customer-feedback-loop" />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
