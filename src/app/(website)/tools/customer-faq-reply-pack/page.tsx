import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import CustomerFaqReplyPackPage from '@/components/website/customerFaqReplyPack/CustomerFaqReplyPackPage';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'Customer FAQ Reply Pack - MenuList | Reusable Customer Answers';
const description = 'Create reusable FAQ and auto-reply text from owner-entered customer questions and business facts without reading conversations, creating a chatbot, sending messages, or calling AI providers.';

export const metadata: Metadata = completeWebsiteMetadata({
  title,
  description,
  alternates: {
    canonical: '/tools/customer-faq-reply-pack',
  },
  openGraph: {
    title,
    description,
    url: '/tools/customer-faq-reply-pack',
  },
});

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_CUSTOMER_FAQ_REPLY_PACK
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/customer-faq-reply-pack"
        title={title}
        description={description}
      />
      <Header />
      <CustomerFaqReplyPackPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
