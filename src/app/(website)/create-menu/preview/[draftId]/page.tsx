/**
 * Public Menu Entry — Preview Page
 * 
 * /create-menu/preview/{draftId} — Shows extracted menu preview.
 * Polls for extraction completion, then renders the menu.
 * No authentication required.
 * 
 * @see __docs__/public-menu-entry/public-menu-entry_impl.md §6.2
 */

import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import '@/styles/website.css';
import { FEATURE_FLAGS } from '@config/features';
import { Metadata } from 'next';
import PreviewClient from '../../PreviewClient';

export const metadata: Metadata = {
    title: 'Menu Preview — MenuList',
    description: 'Preview your extracted menu before publishing.',
    robots: {
        index: false,
        follow: false,
    },
};

interface PreviewPageProps {
    params: { draftId: string };
}

export default function PreviewPage({ params }: PreviewPageProps) {
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
                        Not Available
                    </h1>
                    <p style={{ fontSize: '16px', color: '#64748b' }}>
                        This feature is not yet available.
                    </p>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="ws-page">
            <Header />
            <PreviewClient draftId={params.draftId} />
            <Footer />
        </div>
    );
}
