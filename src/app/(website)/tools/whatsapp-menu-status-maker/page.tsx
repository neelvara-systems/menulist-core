import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import PrintShareToolPage from '@/components/website/printShareTools/PrintShareToolPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'WhatsApp Menu Status Maker - MenuList | Free Status Asset';
const description = 'Make a free WhatsApp Status or story image that points customers to one current menu, service, or customer link.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/tools/whatsapp-menu-status-maker',
  },
  openGraph: {
    title,
    description,
    url: '/tools/whatsapp-menu-status-maker',
  },
};

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_ASSET_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_ASSET_WHATSAPP_MENU_STATUS_MAKER
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/whatsapp-menu-status-maker"
        title={title}
        description={description}
      />
      <Header />
      <PrintShareToolPage toolSlug="whatsapp-menu-status-maker" />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
