import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import MenuPdfCleanupCheckPage from '@/components/website/menuPdfCleanupCheck/MenuPdfCleanupCheckPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'Menu PDF Cleanup Check - MenuList | Check Old PDF Menu Readiness';
const description = 'Check whether an old menu, service, catalog, package, or rate-card PDF is still clear enough for customers or should be replaced with one current customer link.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/tools/menu-pdf-cleanup-check',
  },
  openGraph: {
    title,
    description,
    url: '/tools/menu-pdf-cleanup-check',
  },
};

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_MENU_PDF_CLEANUP_CHECK
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/menu-pdf-cleanup-check"
        title={title}
        description={description}
      />
      <Header />
      <MenuPdfCleanupCheckPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
