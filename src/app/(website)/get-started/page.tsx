import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import GetStartedPage from '@/components/website/get-started/GetStartedPage';
import '@/styles/website.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Get Started — Upload Your Menu and Get Online',
    description: 'Upload your menu and get your business online in minutes. Digital menu, QR menu, and official business page — all from one upload.',
    alternates: {
        canonical: '/get-started',
    },
    openGraph: {
        title: 'Get Started — Upload Your Menu and Get Online',
        description: 'Upload your menu and get your business online in minutes. Digital menu, QR menu, and official business page — all from one upload.',
        url: '/get-started',
    },
};

export default function Page() {
    return (
        <div className="ws-page">
            <Header />
            <GetStartedPage />
            <Footer />
        </div>
    );
}
