import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import BusinessHealthFeaturePage from '@/components/website/features/BusinessHealthFeaturePage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Business Health - MenuList | Know What Needs Attention',
  description: 'Business Health checks your menu, customer links, activity, locations, and freshness so owners know what needs attention before changing anything publicly.',
  alternates: {
    canonical: '/features/business-health',
  },
  openGraph: {
    title: 'Business Health - MenuList | Know What Needs Attention',
    description: 'Business Health checks your menu, customer links, activity, locations, and freshness so owners know what needs attention before changing anything publicly.',
    url: '/features/business-health',
  },
};

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/features/business-health"
        title="Business Health - MenuList | Know What Needs Attention"
        description="Business Health checks your menu, customer links, activity, locations, and freshness so owners know what needs attention before changing anything publicly."
      />
      <Header />
      <BusinessHealthFeaturePage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
