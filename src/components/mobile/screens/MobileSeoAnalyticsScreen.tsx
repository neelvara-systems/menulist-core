'use client'

import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useState } from 'react';
import { LuBarChart2, LuSearch } from 'react-icons/lu';
import { Card, Flex, Input, NavBar, Switch, Text, Title, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileSeoAnalyticsScreenProps {
    onBack: () => void;
}

export default function MobileSeoAnalyticsScreen({ onBack }: MobileSeoAnalyticsScreenProps) {
    const t = useTranslations('MobileSeoAnalytics');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [tagline, setTagline] = useState('');
    const [metaTitle, setMetaTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [canonicalUrl, setCanonicalUrl] = useState('');
    const [gaId, setGaId] = useState('');
    const [fbPixelId, setFbPixelId] = useState('');
    const [searchConsole, setSearchConsole] = useState('');
    const [enhancedEcommerce, setEnhancedEcommerce] = useState(false);
    const [trackMenuViews, setTrackMenuViews] = useState(false);
    const [trackLocation, setTrackLocation] = useState(false);

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
        <Flex style={{ minHeight: '100%' }} vertical>
            <NavBar onBack={onBack}>{t('title')}</NavBar>
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle="Control search appearance and analytics tracking for your public pages."
                    title={t('title')}
                />
                <Card title={<Flex align="center" gap={8}><LuSearch color="#1677ff" size={18} /><Text strong>{t('seoSettings')}</Text></Flex>}>
                    <Flex gap={12} vertical>
                        <FieldGroup hint={t('taglineHint')} label={t('tagline')}>
                            <Input maxLength={100} onBlur={() => void saveField('tagline', tagline)} onChange={setTagline} placeholder="Authentic Italian cuisine since 1985" value={tagline} />
                        </FieldGroup>
                        <FieldGroup hint={t('metaTitleHint')} label={t('metaTitle')}>
                            <Input maxLength={60} onBlur={() => void saveField('metaTitle', metaTitle)} onChange={setMetaTitle} placeholder="Your Restaurant Name | Best Pizza in Town" value={metaTitle} />
                        </FieldGroup>
                        <FieldGroup hint={t('metaDescriptionHint')} label={t('metaDescription')}>
                            <Input maxLength={160} onBlur={() => void saveField('metaDescription', metaDescription)} onChange={setMetaDescription} placeholder="Serving the best wood-fired pizza and handmade pasta..." value={metaDescription} />
                        </FieldGroup>
                        <FieldGroup hint={t('websiteUrlHint')} label={t('websiteUrl')}>
                            <Input onBlur={() => void saveField('canonicalUrl', canonicalUrl)} onChange={setCanonicalUrl} placeholder="https://yourrestaurant.com" value={canonicalUrl} />
                        </FieldGroup>
                    </Flex>
                </Card>

                <Card title={<Flex align="center" gap={8}><LuBarChart2 color="#16a34a" size={18} /><Text strong>{t('analytics')}</Text></Flex>}>
                    <Flex gap={12} vertical>
                        <FieldGroup hint={t('gaIdHint')} label={t('gaId')}>
                            <Input onBlur={() => void saveField('analytics.googleAnalyticsId', gaId)} onChange={setGaId} placeholder="G-XXXXXXXXXX" value={gaId} />
                        </FieldGroup>
                        <FieldGroup hint={t('fbPixelIdHint')} label={t('fbPixelId')}>
                            <Input onBlur={() => void saveField('analytics.facebookPixelId', fbPixelId)} onChange={setFbPixelId} placeholder="XXXXXXXXXXXXXXXXXX" value={fbPixelId} />
                        </FieldGroup>
                        <FieldGroup hint={t('searchConsoleHint')} label={t('searchConsole')}>
                            <Input onBlur={() => void saveField('analytics.googleSearchConsole', searchConsole)} onChange={setSearchConsole} placeholder="Verification code" value={searchConsole} />
                        </FieldGroup>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={16} vertical>
                        <ToggleRow
                            checked={enhancedEcommerce}
                            description={t('enhancedEcommerceDesc')}
                            label={t('enhancedEcommerce')}
                            onChange={(value) => { setEnhancedEcommerce(value); void saveField('analytics.enhancedEcommerce', value); }}
                        />
                        <ToggleRow
                            checked={trackMenuViews}
                            description={t('menuItemViewsDesc')}
                            label={t('menuItemViews')}
                            onChange={(value) => { setTrackMenuViews(value); void saveField('analytics.trackMenuViews', value); }}
                        />
                        <ToggleRow
                            checked={trackLocation}
                            description={t('customerLocationsDesc')}
                            label={t('customerLocations')}
                            onChange={(value) => { setTrackLocation(value); void saveField('analytics.trackLocation', value); }}
                        />
                    </Flex>
                </Card>
            </Flex>
        </Flex>
    );
}

function FieldGroup({ children, hint, label }: { children: React.ReactNode; hint: string; label: string }) {
    return (
        <Flex gap={6} vertical>
            <Text strong>{label}</Text>
            {children}
            <Text type="secondary">{hint}</Text>
        </Flex>
    );
}

function ToggleRow({ checked, description, label, onChange }: { checked: boolean; description: string; label: string; onChange: (value: boolean) => void }) {
    return (
        <Flex align="center" justify="space-between">
            <Flex gap={2} vertical>
                <Text strong>{label}</Text>
                <Text type="secondary">{description}</Text>
            </Flex>
            <Switch checked={checked} onChange={onChange} />
        </Flex>
    );
}
