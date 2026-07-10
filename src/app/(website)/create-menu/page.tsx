/**
 * Public Menu Entry — Upload Page
 * 
 * /create-menu — Public page for auth-protected menu upload/link import.
 * Page is public; source upload and extraction require owner sign-in.
 * Feature gated: ENABLE_PUBLIC_MENU_ENTRY
 * 
 * @see __docs__/public-menu-entry/public-menu-entry_impl.md
 */

import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsitePageStructuredData from '@/components/website/WebsitePageStructuredData';
import WebsiteHeadline from '@/components/website/shared/WebsiteHeadline';
import '@/styles/website.css';
import { FEATURE_FLAGS } from '@config/features';
import { getGrowthAcquisitionFromSearchParams } from '@lib/growth/acquisitionAttribution';
import { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import CreateMenuClient from './CreateMenuClient';

export const metadata: Metadata = {
    title: 'Create Your Official Customer Link - MenuList',
    description: 'Sign in, add a menu, catalogue, price-list, or service-list photo or owned public list link, and review the prepared official customer link before anything goes public.',
    alternates: {
        canonical: '/create-menu',
    },
    openGraph: {
        title: 'Create Your Official Customer Link - MenuList',
        description: 'Sign in, add a menu, catalogue, price-list, or service-list photo or owned public list link, and review the prepared official customer link before anything goes public.',
        url: '/create-menu',
    },
};

export default function CreateMenuPage({
    searchParams,
}: {
    searchParams?: Record<string, string | string[] | undefined>;
}) {
    const t = useTranslations('Website');
    const growthAcquisition = getGrowthAcquisitionFromSearchParams(searchParams);

    if (!FEATURE_FLAGS.ENABLE_PUBLIC_MENU_ENTRY) {
        return (
            <div className="ws-page">
                <WebsitePageStructuredData
                    path="/create-menu"
                    title="Create Your Official Customer Link - MenuList"
                    description="Sign in, add a menu, catalogue, price-list, or service-list photo or owned public list link, and review the prepared official customer link before anything goes public."
                />
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
                        text={t('CreateMenu.disabledTitle')}
                        highlightedText={t('CreateMenu.disabledHighlight')}
                        style={{ marginBottom: '16px' }}
                    />
                    <p style={{ fontSize: '16px', color: 'var(--ws-text-secondary)', maxWidth: '400px' }}>
                        {t('CreateMenu.disabledBody')}
                    </p>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="ws-page">
            <WebsitePageStructuredData
                path="/create-menu"
                title="Create Your Official Customer Link - MenuList"
                description="Sign in, add a menu, catalogue, price-list, or service-list photo or owned public list link, and review the prepared official customer link before anything goes public."
            />
            <Header />
            <CreateMenuClient growthAcquisition={growthAcquisition} />
            <Footer />
        </div>
    );
}
