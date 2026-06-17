import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import ProductPage from '@/components/website/product/ProductPage';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'How MenuList Works — From Current Menu to AI Menu Manager',
    description: 'Start from a menu photo, PDF, existing link, or typed items. MenuList prepares the owner-reviewed version, then AI Menu Manager helps owners update it by message with approval before important changes go live.',
    alternates: {
        canonical: '/how-it-works',
    },
    openGraph: {
        title: 'How MenuList Works — From Current Menu to AI Menu Manager',
        description: 'Start from a menu photo, PDF, existing link, or typed items. MenuList prepares the owner-reviewed version, then AI Menu Manager helps owners update it by message with approval before important changes go live.',
        url: '/how-it-works',
    },
};

export default function Page() {
    return (
        <div className="ws-page">
            <WebsitePageStructuredData
                path="/how-it-works"
                title="How MenuList Works - From Current Menu to AI Menu Manager"
                description="Start from a menu photo, PDF, existing link, or typed items. MenuList prepares the owner-reviewed version, then AI Menu Manager helps owners update it by message with approval before important changes go live."
            />
            <Header />
            <ProductPage />
            <Footer />
            <ScrollToTopButton />
        </div>
    );
}
