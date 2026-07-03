import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import PriceAvailabilityGapCheckPage from '@/components/website/priceAvailabilityGapCheck/PriceAvailabilityGapCheckPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'Price Availability Gap Check - MenuList | Check Prices and Availability';
const description = 'Check whether pasted menu, service, catalog, package, or price-list text makes prices, rates, availability, unavailable items, and quote paths clear for customers.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/tools/price-availability-gap-check',
  },
  openGraph: {
    title,
    description,
    url: '/tools/price-availability-gap-check',
  },
};

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_PRICE_AVAILABILITY_GAP_CHECK
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/price-availability-gap-check"
        title={title}
        description={description}
      />
      <Header />
      <PriceAvailabilityGapCheckPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
