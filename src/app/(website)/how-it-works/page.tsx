import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import ProductPage from '@/components/website/product/ProductPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'How MenuList Works — From Menu Photo to Online in Minutes',
    description: 'Upload a menu photo or PDF. MenuList structures everything, prepares images and descriptions, and publishes to QR, web, screens, and your official business page.',
    alternates: {
        canonical: '/how-it-works',
    },
    openGraph: {
        title: 'How MenuList Works — From Menu Photo to Online in Minutes',
        description: 'Upload a menu photo or PDF. MenuList structures everything, prepares images and descriptions, and publishes to QR, web, screens, and your official business page.',
        url: '/how-it-works',
    },
};

export default function Page() {
    return (
        <div className="ws-page">
            <Header />
            <ProductPage />
            <Footer />
            <ScrollToTopButton />
        </div>
    );
}
