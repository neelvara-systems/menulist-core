import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import BusinessHealthFeaturePage from '@/components/website/features/BusinessHealthFeaturePage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Business Health - MenuList | AI Health Check for Your Menu',
  description: 'Business Health is an AI health check for your menu and public presence. It shows what needs attention and keeps real changes inside approved AI Menu Manager or owner-screen flows.',
  alternates: {
    canonical: '/features/business-health',
  },
  openGraph: {
    title: 'Business Health - MenuList | AI Health Check for Your Menu',
    description: 'Business Health is an AI health check for your menu and public presence. It shows what needs attention and keeps real changes inside approved AI Menu Manager or owner-screen flows.',
    url: '/features/business-health',
  },
};

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/features/business-health"
        title="Business Health - MenuList | AI Health Check for Your Menu"
        description="Business Health is an AI health check for your menu and public presence. It shows what needs attention and keeps real changes inside approved AI Menu Manager or owner-screen flows."
      />
      <Header />
      <BusinessHealthFeaturePage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
