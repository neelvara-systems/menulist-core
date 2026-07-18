import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import FeatureDetailPage from '@/components/website/features/FeatureDetailPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

const title = 'Public Discovery - MenuList | Clear Business Information for Search';
const description = 'MenuList prepares clear public business pages, discovery files, AI context, and owner-controlled copy without ranking or answer-placement promises.';

export const metadata: Metadata = completeWebsiteMetadata({
  title,
  description,
  alternates: {
    canonical: '/features/public-discovery',
  },
  openGraph: {
    title,
    description,
    url: '/features/public-discovery',
  },
});

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData path="/features/public-discovery" title={title} description={description} />
      <Header />
      <FeatureDetailPage slug="public-discovery" />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
