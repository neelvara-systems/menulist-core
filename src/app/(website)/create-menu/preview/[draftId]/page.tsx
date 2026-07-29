import { use } from "react";
/**
 * Public Menu Entry — Preview Page
 * 
 * /create-menu/preview/{draftId} — Shows extracted menu preview.
 * Polls for extraction completion, then renders the owner-bound menu draft.
 * Authentication required.
 * 
 * @see __docs__/public-menu-entry/public-menu-entry_impl.md §6.2
 */

import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsiteHeadline from '@/components/website/shared/WebsiteHeadline';
import '@/styles/website.css';
import AnimateOnScroll from '@/components/website/shared/AnimateOnScroll';
import { FEATURE_FLAGS } from '@config/features';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { normalizePublicMenuDraftId } from '@lib/public-menu-entry/publicDraftId';
import PreviewClient from '../../PreviewClient';

export const metadata: Metadata = {
    title: 'Menu Preview - MenuList',
    description: 'Review your prepared menu before publishing.',
    robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
            'max-video-preview': 0,
            'max-image-preview': 'none',
            'max-snippet': 0,
        },
    },
};

interface PreviewPageProps {
    params: Promise<{ draftId: string }>;
}

export default function PreviewPage(props: PreviewPageProps) {
    const params = use(props.params);
    const t = useTranslations('Website');
    const draftId = normalizePublicMenuDraftId(params.draftId);
    if (!draftId) notFound();

    if (!FEATURE_FLAGS.ENABLE_PUBLIC_MENU_ENTRY) {
        return (
            <div className="ws-page">
                <Header />
                <AnimateOnScroll>
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
                            text={t('CreateMenu.previewDisabledTitle')}
                            highlightedText={t('CreateMenu.previewDisabledHighlight')}
                            style={{ marginBottom: '16px' }}
                        />
                        <p style={{ fontSize: '16px', color: 'var(--ws-text-secondary)' }}>
                            {t('CreateMenu.previewDisabledBody')}
                        </p>
                    </div>
                </AnimateOnScroll>
                <Footer />
            </div>
        );
    }

    return (
        <div className="ws-page">
            <Header />
            <PreviewClient draftId={draftId} />
            <Footer />
        </div>
    );
}
