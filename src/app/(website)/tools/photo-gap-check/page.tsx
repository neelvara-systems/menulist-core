import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import PhotoGapCheckPage from '@/components/website/photoGapCheck/PhotoGapCheckPage';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'Photo Gap Check - MenuList | Check Public Business Photos';
const description = 'Check whether customers can see basic visual proof such as logo, cover image, location photo, product or service photos, and a current customer link.';

export const metadata: Metadata = completeWebsiteMetadata({
  title,
  description,
  alternates: {
    canonical: '/tools/photo-gap-check',
  },
  openGraph: {
    title,
    description,
    url: '/tools/photo-gap-check',
  },
});

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_PHOTO_GAP_CHECK
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/photo-gap-check"
        title={title}
        description={description}
      />
      <Header />
      <PhotoGapCheckPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
