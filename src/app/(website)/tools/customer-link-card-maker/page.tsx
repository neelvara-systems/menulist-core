import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import PrintShareToolPage from '@/components/website/printShareTools/PrintShareToolPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'Customer Link Card Maker - MenuList | Free QR Counter Card';
const description = 'Make a free customer link counter card or business-card style QR asset for an SMB public link.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/tools/customer-link-card-maker',
  },
  openGraph: {
    title,
    description,
    url: '/tools/customer-link-card-maker',
  },
};

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_ASSET_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_ASSET_CUSTOMER_LINK_CARD_MAKER
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/customer-link-card-maker"
        title={title}
        description={description}
      />
      <Header />
      <PrintShareToolPage toolSlug="customer-link-card-maker" />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
