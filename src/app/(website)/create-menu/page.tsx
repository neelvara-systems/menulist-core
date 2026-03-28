/**
 * Public Menu Entry — Upload Page
 * 
 * /create-menu — Public page for anonymous menu upload.
 * No authentication required. Mobile-first design.
 * Feature gated: ENABLE_PUBLIC_MENU_ENTRY
 * 
 * @see __docs__/public-menu-entry/public-menu-entry_impl.md
 */

import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import '@/styles/website.css';
import { FEATURE_FLAGS } from '@config/features';
import { Metadata } from 'next';
import CreateMenuClient from './CreateMenuClient';

export const metadata: Metadata = {
    title: 'Create Your Menu — MenuList | Free Digital Menu Creator',
    description: 'Create a professional digital menu for your restaurant in minutes. Upload a photo or PDF and let AI extract items, categories, and prices automatically.',
    alternates: {
        canonical: '/create-menu',
    },
    openGraph: {
        title: 'Create Your Menu — MenuList | Free Digital Menu Creator',
        description: 'Create a professional digital menu for your restaurant in minutes. Upload a photo or PDF and let AI extract items, categories, and prices automatically.',
        url: '/create-menu',
    },
};

export default function CreateMenuPage() {
    if (!FEATURE_FLAGS.ENABLE_PUBLIC_MENU_ENTRY) {
        return (
            <div className="ws-page">
                <Header />
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                    padding: '40px 20px',
                    textAlign: 'center',
                }}>
                    <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#1a1a2e' }}>
                        Coming Soon
                    </h1>
                    <p style={{ fontSize: '16px', color: '#64748b', maxWidth: '400px' }}>
                        This feature is not yet available. Check back soon.
                    </p>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="ws-page">
            <Header />
            <CreateMenuClient />
            <Footer />
        </div>
    );
}
