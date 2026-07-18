import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import CustomerLinkPreviewPage from '@/components/website/customerLinkPreview/CustomerLinkPreviewPage';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'One Customer Link Preview - MenuList | Check Customer-Facing Facts';
const description = 'Preview whether one customer-facing business link has the basics customers need before they call, visit, order, book, or ask a question.';

export const metadata: Metadata = completeWebsiteMetadata({
  title,
  description,
  alternates: {
    canonical: '/tools/customer-link-preview',
  },
  openGraph: {
    title,
    description,
    url: '/tools/customer-link-preview',
  },
});

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_CUSTOMER_LINK_PREVIEW
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/customer-link-preview"
        title={title}
        description={description}
      />
      <Header />
      <CustomerLinkPreviewPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
