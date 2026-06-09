import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import FeatureDetailPage from '@/components/website/features/FeatureDetailPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

const title = 'Print-ready Kit - MenuList | Table, Counter, Social, and Printer Files';
const description = 'Create table cards, counter cards, stickers, posters, social images, and printer handoff files from the same owner-approved menu source.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/features/print-ready-kit',
  },
  openGraph: {
    title,
    description,
    url: '/features/print-ready-kit',
  },
};

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData path="/features/print-ready-kit" title={title} description={description} />
      <Header />
      <FeatureDetailPage slug="print-ready-kit" />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
