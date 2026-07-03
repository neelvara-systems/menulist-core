import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import HoursCheckPage from '@/components/website/hoursCheck/HoursCheckPage';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'Hours Check - MenuList | Check Regular and Holiday Hours';
const description = 'Check whether customers can understand regular hours, closed days, holiday hours, location timing, fallback contact, and the current customer link.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/tools/hours-check',
  },
  openGraph: {
    title,
    description,
    url: '/tools/hours-check',
  },
};

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_HOURS_CHECK
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/hours-check"
        title={title}
        description={description}
      />
      <Header />
      <HoursCheckPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
