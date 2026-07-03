import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import PublicTruthCheckPage from '@/components/website/publicTruthCheck/PublicTruthCheckPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'Public Truth Check - MenuList | Check Your Customer Source';
const description = 'Check whether a business has clear public facts for its menu or service list, hours, location, contact, action links, and current customer source.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/tools/public-truth-check',
  },
  openGraph: {
    title,
    description,
    url: '/tools/public-truth-check',
  },
};

export default function Page() {
  if (!FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_CHECK) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/public-truth-check"
        title={title}
        description={description}
      />
      <Header />
      <PublicTruthCheckPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
