import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import AboutPage from '@/components/website/about/AboutPage';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About MenuList — Built in India for Growing Businesses',
    description: 'MenuList turns your menu into your entire online presence. Built for businesses that care about how they present themselves to customers.',
    alternates: {
        canonical: '/about',
    },
    openGraph: {
        title: 'About MenuList — Built in India for Growing Businesses',
        description: 'MenuList turns your menu into your entire online presence. Built for businesses that care about how they present themselves to customers.',
        url: '/about',
    },
};

export default function Page() {
    return (
        <div className="ws-page">
            <Header />
            <AboutPage />
            <Footer />
        </div>
    );
}
