import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WhatsAppReplyPackPage from '@/components/website/whatsappReplyPack/WhatsAppReplyPackPage';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'WhatsApp Reply Pack - MenuList | Reusable Customer Replies';
const description = 'Create reusable WhatsApp greeting, hours, menu, price, order, delivery, fallback, and customer-link replies from owner-entered business facts without sending messages or calling WhatsApp APIs.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/tools/whatsapp-reply-pack',
  },
  openGraph: {
    title,
    description,
    url: '/tools/whatsapp-reply-pack',
  },
};

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_WHATSAPP_REPLY_PACK
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/whatsapp-reply-pack"
        title={title}
        description={description}
      />
      <Header />
      <WhatsAppReplyPackPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
