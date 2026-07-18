import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import MenuReadabilityCheckPage from '@/components/website/menuReadabilityCheck/MenuReadabilityCheckPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'Menu Readability Check - MenuList | Check Your Menu or Service List';
const description = 'Check whether pasted menu, service, catalog, rate-card, or package text is clear enough for customers to understand prices, details, and the next action.';

export const metadata: Metadata = completeWebsiteMetadata({
  title,
  description,
  alternates: {
    canonical: '/tools/menu-readability-check',
  },
  openGraph: {
    title,
    description,
    url: '/tools/menu-readability-check',
  },
});

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_MENU_READABILITY_CHECK
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/menu-readability-check"
        title={title}
        description={description}
      />
      <Header />
      <MenuReadabilityCheckPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
