import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import ContactPage from '@/components/website/contact/ContactPage';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Contact Us — MenuList | Get in Touch',
    description: 'Have questions about MenuList? Reach out to our team. We are here to help you get your menu online.',
    alternates: {
        canonical: '/contact',
    },
    openGraph: {
        title: 'Contact Us — MenuList | Get in Touch',
        description: 'Have questions about MenuList? Reach out to our team. We are here to help you get your menu online.',
        url: '/contact',
    },
};

export default function Page() {
    return (
        <div className="ws-page">
            <WebsitePageStructuredData
                path="/contact"
                title="Contact Us - MenuList | Get in Touch"
                description="Have questions about MenuList? Reach out to our team. We are here to help you get your menu online."
            />
            <Header />
            <ContactPage />
            <Footer />
        </div>
    );
}
