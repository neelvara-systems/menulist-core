import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import FeatureDetailPage from '@/components/website/features/FeatureDetailPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

const title = 'Print-ready Kit - MenuList | Templates, Editor, and Print Files';
const description = 'Choose finished print templates, adjust supported copy in the editor, and download QR cards, menu PDFs, images, and printer files from the current approved menu.';

export const metadata: Metadata = completeWebsiteMetadata({
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
});

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
