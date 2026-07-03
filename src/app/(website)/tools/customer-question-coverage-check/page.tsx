import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import CustomerQuestionCoverageCheckPage from '@/components/website/customerQuestionCoverageCheck/CustomerQuestionCoverageCheckPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'Customer Question Coverage Check - MenuList | Check Common Customer Answers';
const description = 'Check whether pasted public business source text can answer common customer questions about menu, services, hours, prices, location, contact, and next actions.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/tools/customer-question-coverage-check',
  },
  openGraph: {
    title,
    description,
    url: '/tools/customer-question-coverage-check',
  },
};

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_CUSTOMER_QUESTION_COVERAGE_CHECK
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/customer-question-coverage-check"
        title={title}
        description={description}
      />
      <Header />
      <CustomerQuestionCoverageCheckPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
