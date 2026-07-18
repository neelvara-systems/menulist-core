import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import Footer from '@/components/website/Footer';
import GoogleProfileBasicsChecklistPage from '@/components/website/googleProfileBasicsChecklist/GoogleProfileBasicsChecklistPage';
import Header from '@/components/website/Header';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'Google Profile Basics Checklist - MenuList | Check Public Profile Facts';
const description = 'Check whether the Google Business Profile facts you maintain are ready for customers and connected to one current customer link.';

export const metadata: Metadata = completeWebsiteMetadata({
  title,
  description,
  alternates: {
    canonical: '/tools/google-profile-basics-checklist',
  },
  openGraph: {
    title,
    description,
    url: '/tools/google-profile-basics-checklist',
  },
});

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_GOOGLE_PROFILE_BASICS_CHECKLIST
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/google-profile-basics-checklist"
        title={title}
        description={description}
      />
      <Header />
      <GoogleProfileBasicsChecklistPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
