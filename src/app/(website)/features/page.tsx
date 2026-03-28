import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import FeaturesPage from '@/components/website/features/FeaturesPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Features — MenuList | Everything Your Menu Needs, Nothing It Doesn\'t',
  description: 'Upload your menu and get images, descriptions, translations, QR menus, digital screens, official business page, and multi-location management — all from one place.',
  alternates: {
    canonical: '/features',
  },
  openGraph: {
    title: 'Features — MenuList | Everything Your Menu Needs, Nothing It Doesn\'t',
    description: 'Upload your menu and get images, descriptions, translations, QR menus, digital screens, official business page, and multi-location management — all from one place.',
    url: '/features',
  },
};

export default function Page() {
  return (
    <div className="ws-page">
      <Header />
      <FeaturesPage />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
