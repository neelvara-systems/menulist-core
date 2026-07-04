import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import PrintShareToolPage from '@/components/website/printShareTools/PrintShareToolPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'Feedback QR Card Maker - MenuList | Free Feedback Card';
const description = 'Make a free ethical feedback QR card from an owner-provided feedback or review link. No review text is generated.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/tools/feedback-qr-card-maker',
  },
  openGraph: {
    title,
    description,
    url: '/tools/feedback-qr-card-maker',
  },
};

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_ASSET_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_ASSET_FEEDBACK_QR_CARD_MAKER
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/feedback-qr-card-maker"
        title={title}
        description={description}
      />
      <Header />
      <PrintShareToolPage toolSlug="feedback-qr-card-maker" />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
