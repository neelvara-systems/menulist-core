import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WhatsAppOnboardingPage from '@/components/website/whatsapp/WhatsAppOnboardingPage';
import '@/styles/website.css';
import { Metadata } from 'next';

const title = 'WhatsApp Menu and Service List Onboarding | MenuList';
const description = 'Send a menu, service list, rate card, package list, or PDF on WhatsApp. MenuList prepares a preview, publishes after approval, and sends back one official customer link.';

export const metadata: Metadata = {
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
};

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
