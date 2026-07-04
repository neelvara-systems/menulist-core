import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import PrintShareToolPage from '@/components/website/printShareTools/PrintShareToolPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'QR Poster Maker - MenuList | Free Customer Link Poster';
const description = 'Make a free browser-local QR poster for one current customer link. Download PNG or PDF without logging in.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/tools/qr-poster-maker',
  },
  openGraph: {
    title,
    description,
    url: '/tools/qr-poster-maker',
  },
};

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_ASSET_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_ASSET_QR_POSTER_MAKER
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/qr-poster-maker"
        title={title}
        description={description}
      />
      <Header />
      <PrintShareToolPage toolSlug="qr-poster-maker" />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
