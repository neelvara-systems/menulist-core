import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import BookingInquiryReadinessCheckPage from '@/components/website/bookingInquiryReadinessCheck/BookingInquiryReadinessCheckPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import { FEATURE_FLAGS } from '@/config/features';
import '@/styles/website.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = 'Booking Inquiry Readiness Check - MenuList | Check Customer Action Paths';
const description = 'Check whether customers can clearly order, book, reserve, call, message, request a quote, or visit from the public business source they see.';

export const metadata: Metadata = completeWebsiteMetadata({
  title,
  description,
  alternates: {
    canonical: '/tools/booking-inquiry-readiness-check',
  },
  openGraph: {
    title,
    description,
    url: '/tools/booking-inquiry-readiness-check',
  },
});

export default function Page() {
  if (
    !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_BOOKING_INQUIRY_READINESS_CHECK
  ) {
    notFound();
  }

  return (
    <div className="ws-page">
      <WebsitePageStructuredData
        path="/tools/booking-inquiry-readiness-check"
        title={title}
        description={description}
      />
      <Header />
      <BookingInquiryReadinessCheckPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
