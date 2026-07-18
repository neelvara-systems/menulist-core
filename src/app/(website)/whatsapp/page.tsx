import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WhatsAppOnboardingPage from '@/components/website/whatsapp/WhatsAppOnboardingPage';
import '@/styles/website.css';
import { Metadata } from 'next';

const title = 'WhatsApp Menu and Service List Onboarding | MenuList';
const description = 'See how WhatsApp-first onboarding will prepare an owner-reviewed preview and official customer link. Start now with a photo or public menu link.';

export const metadata: Metadata = completeWebsiteMetadata({
  title,
  description,
  alternates: {
    canonical: '/whatsapp',
  },
  openGraph: {
    title,
    description,
    url: '/whatsapp',
  },
});

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/whatsapp"
        title={title}
        description={description}
      />
      <Header />
      <WhatsAppOnboardingPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
