import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import ContactPage from '@/components/website/contact/ContactPage';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = completeWebsiteMetadata({
    title: 'Contact MenuList | Send a Question or Product Note',
    description: 'Send a MenuList question or product note through the contact form, or email hello@menulist.ai for a direct conversation.',
    alternates: {
        canonical: '/contact',
    },
    openGraph: {
        title: 'Contact MenuList | Send a Question or Product Note',
        description: 'Send a MenuList question or product note through the contact form, or email hello@menulist.ai for a direct conversation.',
        url: '/contact',
    },
});

export default function Page() {
    return (
        <div className="ws-page">
            <WebsitePageStructuredData
                path="/contact"
                title="Contact MenuList | Send a Question or Product Note"
                description="Send a MenuList question or product note through the contact form, or email hello@menulist.ai for a direct conversation."
            />
            <Header />
            <ContactPage />
            <Footer />
        </div>
    );
}
