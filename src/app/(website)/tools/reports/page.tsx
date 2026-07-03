import ToolReportPage from '@/components/website/toolReports/ToolReportPage';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'Shareable MenuList Tool Report - MenuList';
const description = 'Open a public MenuList tool report link with checked facts, evidence text, clear limits, and the next MenuList action.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/tools/reports',
  },
  openGraph: {
    title,
    description,
    url: '/tools/reports',
  },
};

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_SHAREABLE_REPORTS
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/reports"
        title={title}
        description={description}
      />
      <Header />
      <ToolReportPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
