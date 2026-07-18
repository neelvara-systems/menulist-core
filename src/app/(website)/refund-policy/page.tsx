import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import RefundPolicyPage from '@/components/website/legal/RefundPolicyPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = completeWebsiteMetadata({
  title: 'Refund Policy - MenuList',
  description: 'Read MenuList\'s refund policy. Learn about our refund and cancellation process.',
  alternates: {
    canonical: '/refund-policy',
  },
  openGraph: {
    title: 'Refund Policy - MenuList',
    description: 'Read MenuList\'s refund policy. Learn about our refund and cancellation process.',
    url: '/refund-policy',
  },
});

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/refund-policy"
        title="Refund Policy - MenuList"
        description="Read MenuList's refund policy. Learn about our refund and cancellation process."
      />
      <Header />
      <RefundPolicyPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
