import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import ProductPage from '@/components/website/product/ProductPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'How MenuList Works — From Current Menu to Official Public Source',
    description: 'Upload a menu photo or PDF. MenuList prepares the owner-reviewed version for QR, web, screens, PDF, and your official business page.',
    alternates: {
        canonical: '/how-it-works',
    },
    openGraph: {
        title: 'How MenuList Works — From Current Menu to Official Public Source',
        description: 'Upload a menu photo or PDF. MenuList prepares the owner-reviewed version for QR, web, screens, PDF, and your official business page.',
        url: '/how-it-works',
    },
};

export default function Page() {
    return (
        <div className="ws-page">
            <WebsitePageStructuredData
                path="/how-it-works"
                title="How MenuList Works - From Current Menu to Official Public Source"
                description="Upload a menu photo or PDF. MenuList prepares the owner-reviewed version for QR, web, screens, PDF, and your official business page."
            />
            <Header />
            <ProductPage />
            <Footer />
            <ScrollToTopButton />
        </div>
    );
}
