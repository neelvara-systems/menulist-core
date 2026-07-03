import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import FaqPage from '@/components/website/faq/FaqPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

const title = 'MenuList FAQ | Menu Preview, Publishing, Pricing, and Safety';
const description = 'Answers for owners about creating a customer link, importing a menu or service list, review before publishing, pricing, data safety, AI Menu Manager, and supported publishing boundaries.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/faq',
  },
  openGraph: {
    title,
    description,
    url: '/faq',
  },
};

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/faq"
        title={title}
        description={description}
      />
      <Header />
      <FaqPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
