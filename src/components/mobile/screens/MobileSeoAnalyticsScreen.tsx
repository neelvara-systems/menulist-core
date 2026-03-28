'use client'

import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Card, Input, NavBar, Switch, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useState } from 'react';
import { LuArrowLeft, LuBarChart2, LuSearch } from 'react-icons/lu';

interface MobileSeoAnalyticsScreenProps {
    onBack: () => void;
}

export default function MobileSeoAnalyticsScreen({ onBack }: MobileSeoAnalyticsScreenProps) {
    const t = useTranslations('MobileSeoAnalytics');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);

    // ── SEO fields ───────────────────────────────────────────────
    const [tagline, setTagline] = useState('');
    const [metaTitle, setMetaTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [canonicalUrl, setCanonicalUrl] = useState('');

    // ── Analytics fields ─────────────────────────────────────────
    const [gaId, setGaId] = useState('');
    const [fbPixelId, setFbPixelId] = useState('');
    const [searchConsole, setSearchConsole] = useState('');
    const [enhancedEcommerce, setEnhancedEcommerce] = useState(false);
    const [trackMenuViews, setTrackMenuViews] = useState(false);
    const [trackLocation, setTrackLocation] = useState(false);

    // ── Init from storeDetails ───────────────────────────────────
    useEffect(() => {
        if (!storeDetails) return;
        setTagline(storeDetails.tagline || '');
        setMetaTitle(storeDetails.metaTitle || '');
        setMetaDescription(storeDetails.metaDescription || '');
        setCanonicalUrl(storeDetails.canonicalUrl || '');
        setGaId(storeDetails.analytics?.googleAnalyticsId || '');
        setFbPixelId(storeDetails.analytics?.facebookPixelId || '');
        setSearchConsole(storeDetails.analytics?.googleSearchConsole || '');
        setEnhancedEcommerce(storeDetails.analytics?.enhancedEcommerce || false);
        setTrackMenuViews(storeDetails.analytics?.trackMenuViews || false);
        setTrackLocation(storeDetails.analytics?.trackLocation || false);
    }, [storeDetails]);

    // ── Auto-save on blur ────────────────────────────────────────
    const saveField = async (field: string, value: any) => {
        if (!storeDetails?.storeId) return;
        try {
            const update: any = { storeId: storeDetails.storeId };
            if (field.startsWith('analytics.')) {
                const analyticsKey = field.replace('analytics.', '');
                update.analytics = { ...storeDetails.analytics, [analyticsKey]: value };
            } else {
                update[field] = value;
            }
            await updateStore(update);
            setStoreDetails({ ...storeDetails, ...update });
            Toast.show({ content: t('saved'), duration: 800 });
        } catch {
            Toast.show({ content: t('failedToSave'), duration: 1500 });
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            <NavBar onBack={onBack} backIcon={<LuArrowLeft size={20} />}>
                {t('title')}
            </NavBar>

            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
                {/* ── SEO Section ──────────────────────────────── */}
                <SectionHeader icon={<LuSearch size={18} className="text-blue-500" />} title={t('seoSettings')} subtitle={t('seoSubtitle')} />

                <Card className="rounded-xl">
                    <div className="space-y-4">
                        <FieldGroup label={t('tagline')} hint={t('taglineHint')}>
                            <Input
                                value={tagline}
                                onChange={setTagline}
                                onBlur={() => saveField('tagline', tagline)}
                                placeholder="Authentic Italian cuisine since 1985"
                                maxLength={100}
                                style={{ '--font-size': '14px' } as React.CSSProperties}
                            />
                        </FieldGroup>

                        <FieldGroup label={t('metaTitle')} hint={t('metaTitleHint')}>
                            <Input
                                value={metaTitle}
                                onChange={setMetaTitle}
                                onBlur={() => saveField('metaTitle', metaTitle)}
                                placeholder="Your Restaurant Name | Best Pizza in Town"
                                maxLength={60}
                                style={{ '--font-size': '14px' } as React.CSSProperties}
                            />
                        </FieldGroup>

                        <FieldGroup label={t('metaDescription')} hint={t('metaDescriptionHint')}>
                            <Input
                                value={metaDescription}
                                onChange={setMetaDescription}
                                onBlur={() => saveField('metaDescription', metaDescription)}
                                placeholder="Serving the best wood-fired pizza and handmade pasta..."
                                maxLength={160}
                                style={{ '--font-size': '14px' } as React.CSSProperties}
                            />
                        </FieldGroup>

                        <FieldGroup label={t('websiteUrl')} hint={t('websiteUrlHint')}>
                            <Input
                                value={canonicalUrl}
                                onChange={setCanonicalUrl}
                                onBlur={() => saveField('canonicalUrl', canonicalUrl)}
                                placeholder="https://yourrestaurant.com"
                                style={{ '--font-size': '14px' } as React.CSSProperties}
                            />
                        </FieldGroup>
                    </div>
                </Card>

                {/* ── Analytics Section ────────────────────────── */}
                <SectionHeader icon={<LuBarChart2 size={18} className="text-green-500" />} title={t('analytics')} subtitle={t('analyticsSubtitle')} />

                <Card className="rounded-xl">
                    <div className="space-y-4">
                        <FieldGroup label={t('gaId')} hint={t('gaIdHint')}>
                            <Input
                                value={gaId}
                                onChange={setGaId}
                                onBlur={() => saveField('analytics.googleAnalyticsId', gaId)}
                                placeholder="G-XXXXXXXXXX"
                                style={{ '--font-size': '14px' } as React.CSSProperties}
                            />
                        </FieldGroup>

                        <FieldGroup label={t('fbPixelId')} hint={t('fbPixelIdHint')}>
                            <Input
                                value={fbPixelId}
                                onChange={setFbPixelId}
                                onBlur={() => saveField('analytics.facebookPixelId', fbPixelId)}
                                placeholder="XXXXXXXXXXXXXXXXXX"
                                style={{ '--font-size': '14px' } as React.CSSProperties}
                            />
                        </FieldGroup>

                        <FieldGroup label={t('searchConsole')} hint={t('searchConsoleHint')}>
                            <Input
                                value={searchConsole}
                                onChange={setSearchConsole}
                                onBlur={() => saveField('analytics.googleSearchConsole', searchConsole)}
                                placeholder="Verification code"
                                style={{ '--font-size': '14px' } as React.CSSProperties}
                            />
                        </FieldGroup>
                    </div>
                </Card>

                {/* ── Tracking Toggles ─────────────────────────── */}
                <Card className="rounded-xl">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('enhancedEcommerce')}</p>
                                <p className="text-xs text-gray-500">{t('enhancedEcommerceDesc')}</p>
                            </div>
                            <Switch
                                checked={enhancedEcommerce}
                                onChange={(val) => { setEnhancedEcommerce(val); saveField('analytics.enhancedEcommerce', val); }}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('menuItemViews')}</p>
                                <p className="text-xs text-gray-500">{t('menuItemViewsDesc')}</p>
                            </div>
                            <Switch
                                checked={trackMenuViews}
                                onChange={(val) => { setTrackMenuViews(val); saveField('analytics.trackMenuViews', val); }}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('customerLocations')}</p>
                                <p className="text-xs text-gray-500">{t('customerLocationsDesc')}</p>
                            </div>
                            <Switch
                                checked={trackLocation}
                                onChange={(val) => { setTrackLocation(val); saveField('analytics.trackLocation', val); }}
                            />
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

// ── Reusable helpers ─────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
    return (
        <div className="flex items-center gap-2 pt-2">
            {icon}
            <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
            </div>
        </div>
    );
}

function FieldGroup({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{label}</p>
            {children}
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{hint}</p>
        </div>
    );
}
