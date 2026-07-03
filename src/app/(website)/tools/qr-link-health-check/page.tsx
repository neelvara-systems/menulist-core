import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import QrLinkHealthCheckPage from '@/components/website/qrLinkHealthCheck/QrLinkHealthCheckPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'QR Link Health Check - MenuList | Check Your QR Target';
const description = 'Check whether a QR code opens a clear current customer link for a menu, services, booking, WhatsApp, directions, or public business page.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/tools/qr-link-health-check',
  },
  openGraph: {
    title,
    description,
    url: '/tools/qr-link-health-check',
  },
};

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_QR_LINK_HEALTH_CHECK
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/qr-link-health-check"
        title={title}
        description={description}
      />
      <Header />
      <QrLinkHealthCheckPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
