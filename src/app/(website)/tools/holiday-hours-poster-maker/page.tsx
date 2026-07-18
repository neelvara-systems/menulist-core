import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import PrintShareToolPage from '@/components/website/printShareTools/PrintShareToolPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'Holiday Hours Poster Maker - MenuList | Free Hours Poster';
const description = 'Make a free browser-local holiday hours poster with a QR code to one current customer link.';

export const metadata: Metadata = completeWebsiteMetadata({
  title,
  description,
  alternates: {
    canonical: '/tools/holiday-hours-poster-maker',
  },
  openGraph: {
    title,
    description,
    url: '/tools/holiday-hours-poster-maker',
  },
});

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_ASSET_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_ASSET_HOLIDAY_HOURS_POSTER_MAKER
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/holiday-hours-poster-maker"
        title={title}
        description={description}
      />
      <Header />
      <PrintShareToolPage toolSlug="holiday-hours-poster-maker" />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
