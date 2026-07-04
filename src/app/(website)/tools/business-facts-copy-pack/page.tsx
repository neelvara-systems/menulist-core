import Footer from '@/components/website/Footer';
import BusinessFactsCopyPackPage from '@/components/website/businessFactsCopyPack/BusinessFactsCopyPackPage';
import Header from '@/components/website/Header';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'Business Facts Copy Pack - MenuList | Reusable Public Business Copy';
const description = 'Create reusable profile, WhatsApp, social, website, staff, and customer-link copy from owner-entered business facts without external profile inspection.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/tools/business-facts-copy-pack',
  },
  openGraph: {
    title,
    description,
    url: '/tools/business-facts-copy-pack',
  },
};

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_BUSINESS_FACTS_COPY_PACK
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/business-facts-copy-pack"
        title={title}
        description={description}
      />
      <Header />
      <BusinessFactsCopyPackPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
