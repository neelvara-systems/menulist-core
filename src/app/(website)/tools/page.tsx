import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import ToolsHubPage from '@/components/website/toolsHub/ToolsHubPage';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'MenuList Tools - Public Business Truth Checks';
const description = 'Free MenuList tools that help SMB owners check public business facts, customer links, menus, prices, hours, QR links, WhatsApp actions, and setup gaps before creating one current customer link.';

export const metadata: Metadata = completeWebsiteMetadata({
  title,
  description,
  alternates: {
    canonical: '/tools',
  },
  openGraph: {
    title,
    description,
    url: '/tools',
  },
});

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS_HUB
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools"
        title={title}
        description={description}
      />
      <Header />
      <ToolsHubPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
