/**
 * Public Menu Entry — Upload Page
 * 
 * /create-menu — Public page for upload-before-auth menu preview.
 * Page is public; owner sign-in is required only before claiming/publishing.
 * Feature gated: ENABLE_PUBLIC_MENU_ENTRY
 * 
 * @see __docs__/public-menu-entry/public-menu-entry_impl.md
 */

import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsiteHeadline from '@/components/website/shared/WebsiteHeadline';
import '@/styles/website.css';
import { FEATURE_FLAGS } from '@config/features';
import { Metadata } from 'next';
import CreateMenuClient from './CreateMenuClient';

export const metadata: Metadata = {
    title: 'Upload Your Current Menu — MenuList',
    description: 'Start with your current menu and preview the owner-approved source for your public menu, official page, QR assets, customer view, and share links.',
    alternates: {
        canonical: '/create-menu',
    },
    openGraph: {
        title: 'Upload Your Current Menu — MenuList',
        description: 'Start with your current menu and preview the owner-approved source for your public menu, official page, QR assets, customer view, and share links.',
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
                    <WebsiteHeadline
                        as="h1"
                        size="compact"
                        text="Upload your menu"
                        highlightedText="Upload"
                        style={{ marginBottom: '16px' }}
                    />
                    <p style={{ fontSize: '16px', color: 'var(--ws-text-secondary)', maxWidth: '400px' }}>
                        This upload path is being prepared. Start from the guided setup for now.
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
