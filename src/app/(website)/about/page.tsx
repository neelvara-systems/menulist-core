import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import AboutPage from '@/components/website/about/AboutPage';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About MenuList - Built in India for Growing Businesses',
    description: 'MenuList turns your menu into your entire online presence. Built for businesses that care about how they present themselves to customers.',
    alternates: {
        canonical: '/about',
    },
    openGraph: {
        title: 'About MenuList - Built in India for Growing Businesses',
        description: 'MenuList turns your menu into your entire online presence. Built for businesses that care about how they present themselves to customers.',
        url: '/about',
    },
};

export default function Page() {
    return (
        <div className="ws-page">
            <WebsitePageStructuredData
                path="/about"
                title="About MenuList - Built in India for Growing Businesses"
                description="MenuList turns your menu into your entire online presence. Built for businesses that care about how they present themselves to customers."
            />
            <Header />
            <AboutPage />
            <Footer />
        </div>
    );
}
