import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import SocialBioLinkCheckPage from '@/components/website/socialBioLinkCheck/SocialBioLinkCheckPage';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'Social Bio Link Consistency Check - MenuList | Check Profile Links';
const description = 'Check whether owner-controlled social bios, profiles, website links, QR codes, and print materials point customers to one current customer link.';

export const metadata: Metadata = completeWebsiteMetadata({
  title,
  description,
  alternates: {
    canonical: '/tools/social-bio-link-check',
  },
  openGraph: {
    title,
    description,
    url: '/tools/social-bio-link-check',
  },
});

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_SOCIAL_BIO_LINK_CHECK
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/social-bio-link-check"
        title={title}
        description={description}
      />
      <Header />
      <SocialBioLinkCheckPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
