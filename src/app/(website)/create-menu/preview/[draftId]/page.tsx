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
import WebsiteHeadline from '@/components/website/shared/WebsiteHeadline';
import '@/styles/website.css';
import { FEATURE_FLAGS } from '@config/features';
import { Metadata } from 'next';
import PreviewClient from '../../PreviewClient';

export const metadata: Metadata = {
    title: 'Menu Source Preview — MenuList',
    description: 'Review your prepared menu source before publishing.',
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
                    <WebsiteHeadline
                        as="h1"
                        size="compact"
                        text="Menu source preview is being prepared"
                        highlightedText="source preview"
                        style={{ marginBottom: '16px' }}
                    />
                    <p style={{ fontSize: '16px', color: 'var(--ws-text-secondary)' }}>
                        Start from the guided setup for now.
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
