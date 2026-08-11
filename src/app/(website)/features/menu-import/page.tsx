import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import FeatureDetailPage from '@/components/website/features/FeatureDetailPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

const title = 'Menu Import - MenuList | Upload the Menu You Already Have';
const description = 'Upload a menu photo or PDF, or paste a permission-confirmed public menu, service-list, image, or PDF link. MenuList prepares a review-ready draft before anything becomes public.';

export const metadata: Metadata = completeWebsiteMetadata({
  title,
  description,
  alternates: {
    canonical: '/features/menu-import',
  },
  openGraph: {
    title,
    description,
    url: '/features/menu-import',
  },
});

export default function Page() {
  return (
    <div className="ws-page">
      <WebsitePageStructuredData path="/features/menu-import" title={title} description={description} />
      <Header />
      <FeatureDetailPage slug="menu-import" />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
