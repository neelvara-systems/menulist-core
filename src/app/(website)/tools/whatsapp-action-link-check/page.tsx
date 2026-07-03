import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import WhatsAppActionLinkCheckPage from '@/components/website/whatsappActionLinkCheck/WhatsAppActionLinkCheckPage';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'WhatsApp Action Link Check - MenuList | Check Your Customer Message Path';
const description = 'Check whether customers can tap once to message, order, book, or ask through WhatsApp with a clear customer link, message prompt, hours expectation, and fallback action.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/tools/whatsapp-action-link-check',
  },
  openGraph: {
    title,
    description,
    url: '/tools/whatsapp-action-link-check',
  },
};

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_WHATSAPP_ACTION_LINK_CHECK
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/whatsapp-action-link-check"
        title={title}
        description={description}
      />
      <Header />
      <WhatsAppActionLinkCheckPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
