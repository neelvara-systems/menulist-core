import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import AiMenuManagerPage from '@/components/website/ai-menu-manager/AiMenuManagerPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

const title = 'AI Menu Manager for Restaurants | MenuList';
const description = 'Update prices, sold-out items, specials, photos, imports, design, and publishing from simple messages. AI prepares the card; you approve before it goes live.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/ai-menu-manager',
  },
  openGraph: {
    title,
    description,
    url: '/ai-menu-manager',
  },
};

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/ai-menu-manager"
        title={title}
        description={description}
      />
      <Header />
      <AiMenuManagerPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
