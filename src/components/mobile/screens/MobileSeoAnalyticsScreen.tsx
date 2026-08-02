'use client'

import { assertStoreUpdateSucceeded, updateStore } from '@database/stores';
import { getResolvedAnalyticsPreferences, normalizeGoogleSearchConsoleVerification } from '@lib/analytics/preferences';
import { openIsolatedBrowserUrl } from '@lib/browser/openIsolatedBrowserUrl';
import { ANALYTICS_SETTINGS_GROUPING_NOTE, ANALYTICS_TRACKING_CATEGORY_DISCLOSURES, EXTERNAL_ANALYTICS_INTEGRATION_NOTE } from '@lib/analytics/settingsDisclosure';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { getLocalizedStoreKeywords } from '@lib/localization/storeContent';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { getStoreDeepDifference } from '@lib/store/storeNestedUpdateProjection';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { buildBusinessCopyManualOverrideMeta } from '@services/ai/businessCopy/metadata';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuBookOpen, LuCheckCircle2, LuExternalLink, LuInfo, LuRocket, LuX } from 'react-icons/lu';
import { Button, Card, Collapse, Flex, Image, Input, NavBar, Popover, Popup, Switch, Tabs, Text, TextArea, Toast } from '../antd';
import MobileLocalizedLanguageSelector from '../components/MobileLocalizedLanguageSelector';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import { applyLocalizedDraftMap, applyLocalizedKeywordDraftMap, getLocalizedStoreValue, getStoreLanguageLabel, getStoreManagedLanguages, getStorePreferredLanguage } from '../utils/localizedStoreContent';
import SeoPreviewCard from '../../templates/main-app/businessSettings/tabs/SeoPreviewCard';
import {
    getBoundedMobileOwnerStringContext,
    getMobileOwnerStoreLogContext,
    logMobileOwnerFailure,
} from '../utils/mobileOwnerDiagnostics';

interface MobileSeoAnalyticsScreenProps {
    onBack: () => void;
    mode?: 'seo' | 'analytics';
}

type AnalyticsDraft = {
    enhancedEcommerce: boolean;
    facebookPixelId: string;
    googleAnalyticsId: string;
    googleSearchConsole: string;
    trackCustomerApp: boolean;
    trackDecisionBlocks: boolean;
    trackLocation: boolean;
    trackMenuViews: boolean;
    trackOfficialBusinessPage: boolean;
};

type SeoDraft = {
    canonicalUrl: string;
    keywords: string;
    metaDescription: string;
    metaTitle: string;
    tagline: string;
};

type LocalizedSeoFields = Pick<SeoDraft, 'keywords' | 'metaDescription' | 'metaTitle' | 'tagline'>;

const ANALYTICS_TRACKING_DRAFT_KEYS: Array<keyof Pick<AnalyticsDraft,
    'enhancedEcommerce'
    | 'trackCustomerApp'
    | 'trackDecisionBlocks'
    | 'trackLocation'
    | 'trackMenuViews'
    | 'trackOfficialBusinessPage'
>> = [
    'enhancedEcommerce',
    'trackCustomerApp',
    'trackDecisionBlocks',
    'trackLocation',
    'trackMenuViews',
    'trackOfficialBusinessPage',
];

function countEnabledAnalyticsTracking(draft: AnalyticsDraft): number {
    return ANALYTICS_TRACKING_DRAFT_KEYS.filter((key) => Boolean(draft[key])).length;
}

function countFilledSeoDraftLanguages(drafts: Record<string, LocalizedSeoFields>): number {
    return Object.values(drafts).filter((draft) => Object.values(draft).some((value) => String(value || '').trim().length > 0)).length;
}

function countKeywordSeoDraftLanguages(drafts: Record<string, LocalizedSeoFields>): number {
    return Object.values(drafts).filter((draft) => String(draft.keywords || '').trim().length > 0).length;
}

function buildLocalizedSeoDrafts(storeDetails: any, languages: string[]): Record<string, LocalizedSeoFields> {
    return Object.fromEntries(
        languages.map((languageCode) => [
            languageCode,
            {
                keywords: getLocalizedStoreKeywords(storeDetails?.keywords, languageCode, []).join(', '),
                metaDescription: getLocalizedStoreValue(storeDetails?.metaDescription, languageCode, ''),
                metaTitle: getLocalizedStoreValue(storeDetails?.metaTitle, languageCode, ''),
                tagline: getLocalizedStoreValue(storeDetails?.tagline, languageCode, ''),
            },
        ]),
    );
}

function getDefaultCanonicalUrl(storeDetails: any): string {
    return storeDetails?.canonicalUrl || generateOBPUrl(storeDetails?.subdomain, storeDetails?.customDomain) || '';
}

function MobileSeoAnalyticsScreenContent({ onBack, mode = 'seo' }: MobileSeoAnalyticsScreenProps) {
    const t = useTranslations('MobileSeoAnalytics');
    const tSeo = useTranslations('SEO');
    const tAnalytics = useTranslations('Analytics');
    const tMobile = useTranslations('MobileSettings');
    const { token } = theme.useToken();
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [canonicalUrl, setCanonicalUrl] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [localizedSeoDrafts, setLocalizedSeoDrafts] = useState<Record<string, LocalizedSeoFields>>({});
    const [originalLocalizedSeoDrafts, setOriginalLocalizedSeoDrafts] = useState<Record<string, LocalizedSeoFields>>({});
    const [gaId, setGaId] = useState('');
    const [fbPixelId, setFbPixelId] = useState('');
    const [searchConsole, setSearchConsole] = useState('');
    const [enhancedEcommerce, setEnhancedEcommerce] = useState(false);
    const [trackMenuViews, setTrackMenuViews] = useState(false);
    const [trackDecisionBlocks, setTrackDecisionBlocks] = useState(false);
    const [trackOfficialBusinessPage, setTrackOfficialBusinessPage] = useState(false);
    const [trackCustomerApp, setTrackCustomerApp] = useState(false);
    const [trackLocation, setTrackLocation] = useState(false);
    const [originalSeoState, setOriginalSeoState] = useState<SeoDraft | null>(null);
    const [originalAnalyticsState, setOriginalAnalyticsState] = useState<AnalyticsDraft | null>(null);
    const [isAnalyticsSaving, setIsAnalyticsSaving] = useState(false);
    const [isSeoSaving, setIsSeoSaving] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(0);
    const [guideTab, setGuideTab] = useState<'quick' | 'complete'>('quick');
    const isMountedRef = useRef(true);
    const saveInFlightRef = useRef(false);
    const currentStoreDetailsRef = useRef(storeDetails);
    currentStoreDetailsRef.current = storeDetails;
    const managedLanguages = getStoreManagedLanguages(storeDetails);
    const contentLanguage = selectedLanguage || getStorePreferredLanguage(storeDetails);
    const referenceLanguage = getStorePreferredLanguage(storeDetails);
    const currentSeoDraft = localizedSeoDrafts[contentLanguage] || { keywords: '', metaDescription: '', metaTitle: '', tagline: '' };

    useEffect(() => {
        if (!storeDetails || saveInFlightRef.current) return;
        const nextSelectedLanguage = getStorePreferredLanguage(storeDetails);
        const nextLocalizedDrafts = buildLocalizedSeoDrafts(storeDetails, getStoreManagedLanguages(storeDetails));
        setSelectedLanguage(nextSelectedLanguage);
        setLocalizedSeoDrafts(nextLocalizedDrafts);
        setOriginalLocalizedSeoDrafts(nextLocalizedDrafts);
        setCanonicalUrl(getDefaultCanonicalUrl(storeDetails));
        setOriginalSeoState(getSeoDraft(storeDetails));
        const analyticsPreferences = getResolvedAnalyticsPreferences(storeDetails.analytics);
        setGaId(storeDetails.analytics?.googleAnalyticsId || '');
        setFbPixelId(storeDetails.analytics?.facebookPixelId || '');
        setSearchConsole(normalizeGoogleSearchConsoleVerification(
            storeDetails.analytics?.googleSearchConsole || (storeDetails.analytics as Record<string, unknown> | undefined)?.searchConsoleVerification,
        ) || '');
        setEnhancedEcommerce(storeDetails.analytics?.enhancedEcommerce || false);
        setTrackMenuViews(analyticsPreferences.trackMenuViews);
        setTrackDecisionBlocks(analyticsPreferences.trackDecisionBlocks);
        setTrackOfficialBusinessPage(analyticsPreferences.trackOfficialBusinessPage);
        setTrackCustomerApp(analyticsPreferences.trackCustomerApp);
        setTrackLocation(analyticsPreferences.trackLocation);
        setOriginalAnalyticsState(getAnalyticsDraft(storeDetails));
    }, [storeDetails]);

    useEffect(() => () => {
        isMountedRef.current = false;
    }, []);

    const isSeoMode = mode === 'seo';
    const pageTitle = isSeoMode ? tSeo('title') : tAnalytics('title');
    const pageSubtitle = isSeoMode
        ? 'Manage how your business appears in search and shared links.'
        : 'Manage tracking IDs and customer activity measurement for your menu.';
    const analyticsInfoContent = useMemo(() => (
        <Flex gap={8} style={{ maxWidth: 280 }} vertical>
            <Flex gap={2} vertical>
                <Text strong>{pageTitle}</Text>
                <Text type="secondary">{pageSubtitle}</Text>
            </Flex>
            <Text type="secondary">
                MenuList does not use this analytics data for its own marketing. It is connected only so you can see how your menu is performing.
            </Text>
        </Flex>
    ), [pageSubtitle, pageTitle]);
    const analyticsDraft: AnalyticsDraft = {
        enhancedEcommerce,
        facebookPixelId: fbPixelId,
        googleAnalyticsId: gaId,
        googleSearchConsole: searchConsole,
        trackCustomerApp,
        trackDecisionBlocks,
        trackLocation,
        trackMenuViews,
        trackOfficialBusinessPage,
    };
    const isAnalyticsDirty = !isSeoMode && originalAnalyticsState !== null
        && JSON.stringify(analyticsDraft) !== JSON.stringify(originalAnalyticsState);
    const seoDraft: SeoDraft = {
        canonicalUrl,
        keywords: currentSeoDraft.keywords,
        metaDescription: currentSeoDraft.metaDescription,
        metaTitle: currentSeoDraft.metaTitle,
        tagline: currentSeoDraft.tagline,
    };
    const isSeoDirty = isSeoMode && originalSeoState !== null
        && (
            JSON.stringify(seoDraft) !== JSON.stringify(originalSeoState)
            || JSON.stringify(localizedSeoDrafts) !== JSON.stringify(originalLocalizedSeoDrafts)
        );

    const handleOpenExternalLink = (url: string, source: string) => {
        try {
            openIsolatedBrowserUrl(url);
        } catch (error) {
            logMobileOwnerFailure('mobile_seo_analytics_external_link_open_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileOwnerStringContext('mode', mode),
                ...getBoundedMobileOwnerStringContext('source', source),
                ...getBoundedMobileOwnerStringContext('externalLinkUrl', url),
            });
            Toast.show({ content: 'Unable to open link', duration: 1500 });
        }
    };

    const wizardSteps = [
        {
            content: (
                <Card size="small">
                    <Flex gap={10} vertical>
                        <Text strong>Let&apos;s set up your analytics.</Text>
                        <Text type="secondary">
                            This helps you track menu visits, popular dishes, customer locations, and order activity.
                        </Text>
                        <InfoCallout
                            description="This setup usually takes around 5 minutes and you can skip optional steps."
                            title="No action needed."
                        />
                    </Flex>
                </Card>
            ),
            title: 'Overview',
        },
        {
            content: (
                <Card size="small">
                    <Flex gap={10} vertical>
                        <Text strong>Step 1: Set Up Google Analytics</Text>
                        <Text type="secondary">
                            This is the main tracking setup for your menu traffic and customer activity.
                        </Text>
                        <StepList
                            items={[
                                'Go to analytics.google.com',
                                'Click "Start measuring"',
                                'Choose Web for your menu website',
                                'Create the property and copy the Measurement ID',
                                'Paste the ID here. It starts with &quot;G-&quot;',
                            ]}
                        />
                        <Button
                            fill="outline"
                            icon={<LuExternalLink size={16} />}
                            onClick={() => handleOpenExternalLink('https://analytics.google.com', 'google_analytics_setup')}
                        >
                            Open Google Analytics
                        </Button>
                        <Image
                            alt="Where to find GA4 ID"
                            preview={false}
                            src="/images/analytics/ga4-id-location.png"
                            style={{ borderRadius: 12, width: '100%' }}
                        />
                    </Flex>
                </Card>
            ),
            title: 'Google Analytics',
        },
        {
            content: (
                <Card size="small">
                    <Flex gap={10} vertical>
                        <Text strong>Step 2: Set Up Google Search Console</Text>
                        <Text type="secondary">
                            This helps your menu appear correctly in Google Search.
                        </Text>
                        <StepList
                            items={[
                                'Go to Google Search Console',
                                'Add your menu website URL as a property',
                                'Choose HTML tag verification',
                                'Copy the verification content',
                                'Paste it into the Google Search Console field here',
                            ]}
                        />
                        <Button
                            fill="outline"
                            icon={<LuExternalLink size={16} />}
                            onClick={() => handleOpenExternalLink('https://search.google.com/search-console', 'search_console_setup')}
                        >
                            Open Search Console
                        </Button>
                        <Image
                            alt="Search Console verification"
                            preview={false}
                            src="/images/analytics/search-console-verification.png"
                            style={{ borderRadius: 12, width: '100%' }}
                        />
                        <InfoCallout
                            description="You can skip this and come back later."
                            title="Optional step"
                        />
                    </Flex>
                </Card>
            ),
            title: 'Search Console',
        },
        {
            content: (
                <Card size="small">
                    <Flex gap={10} vertical>
                        <Text strong>Step 3: Connect Facebook Pixel</Text>
                        <Text type="secondary">
                            Use this only if you run Facebook or Instagram ads and want campaign tracking.
                        </Text>
                        <StepList
                            items={[
                                'Go to business.facebook.com/events_manager',
                                'Connect a new data source',
                                'Choose Web as the platform',
                                'Copy your Pixel ID',
                                'Paste it into the Facebook Pixel field here',
                            ]}
                        />
                        <Button
                            fill="outline"
                            icon={<LuExternalLink size={16} />}
                            onClick={() => handleOpenExternalLink('https://business.facebook.com/events_manager', 'facebook_events_manager_setup')}
                        >
                            Open Events Manager
                        </Button>
                        <Image
                            alt="Facebook Pixel ID location"
                            preview={false}
                            src="/images/analytics/facebook-pixel-id.png"
                            style={{ borderRadius: 12, width: '100%' }}
                        />
                        <InfoCallout
                            description="Only needed for ad tracking."
                            title="Optional step"
                        />
                    </Flex>
                </Card>
            ),
            title: 'Facebook Pixel',
        },
        {
            content: (
                <Card size="small">
                    <Flex gap={12} vertical>
                        <Text strong>Step 4: Choose What You Want to Track</Text>
                        <Text type="secondary">
                            These settings are applied directly to your store when you switch them on or off.
                        </Text>
                        <FeatureToggleCard
                            checked={trackMenuViews}
                            description="Tracks menu opens, item detail opens, de-duplicated search queries including no-result searches, unavailable-item taps, final menu CTA clicks, entry source, and session totals across the client menu."
                            label="Menu activity"
                            onChange={setTrackMenuViews}
                        />
                        <FeatureToggleCard
                            checked={trackDecisionBlocks}
                            description="Tracks Featured section impressions and taps when Featured choices appear on the customer menu."
                            label="Featured section analytics"
                            onChange={setTrackDecisionBlocks}
                        />
                        <FeatureToggleCard
                            checked={trackOfficialBusinessPage}
                            description="Tracks official business page views, CTA taps, menu CTA clicks, social/review link clicks, and owner share actions."
                            label="Official business page activity"
                            onChange={setTrackOfficialBusinessPage}
                        />
                        <FeatureToggleCard
                            checked={trackCustomerApp}
                            description="Tracks customer app install prompts, installs, standalone opens, and shortcut launches."
                            label="Customer app activity"
                            onChange={setTrackCustomerApp}
                        />
                        <FeatureToggleCard
                            checked={trackLocation}
                            description="Adds approximate location to analytics reports using rounded geolocation or timezone region when available."
                            label="Approximate location"
                            onChange={setTrackLocation}
                        />
                        <InfoCallout
                            description="By default, MenuList tracks anonymous menu activity, session milestones, category interest from item views and taps, active filter context attached to later item/search/action events, search demand including no-result searches, unavailable-item demand, final menu CTA clicks, recommendation usage, OBP activity, customer-app events, device type, session totals, entry UTM tags, and approximate location. Nightly menu intelligence may combine these anonymous analytics with your menu catalog fields to suggest owner actions. We do not collect customer names, emails, payment details, exact GPS coordinates, scroll heatmaps, hover activity, option/variant clicks, or per-keystroke tracking in this analytics flow."
                            title="Privacy"
                        />
                    </Flex>
                </Card>
            ),
            title: 'Tracking Options',
        },
        {
            content: (
                <Card size="small">
                    <Flex align="center" gap={12} style={{ textAlign: 'center' }} vertical>
                        <LuCheckCircle2 size={40} />
                        <Text strong>Everything is running normally.</Text>
                        <Text type="secondary">
                            Your analytics setup is ready. Data usually starts appearing within 24 to 48 hours.
                        </Text>
                        <StepList
                            items={[
                                'Check your analytics dashboard tomorrow',
                                'Review your popular menu items',
                                'Watch for customer location and traffic patterns',
                            ]}
                        />
                    </Flex>
                </Card>
            ),
            title: 'Done',
        },
    ];

    const openSetupWizard = () => {
        setWizardStep(0);
        setIsSetupWizardOpen(true);
    };

    const closeSetupWizard = () => {
        setIsSetupWizardOpen(false);
        setWizardStep(0);
    };

    const resetAnalyticsSettings = () => {
        if (!originalAnalyticsState) return;
        setGaId(originalAnalyticsState.googleAnalyticsId);
        setSearchConsole(originalAnalyticsState.googleSearchConsole);
        setFbPixelId(originalAnalyticsState.facebookPixelId);
        setEnhancedEcommerce(originalAnalyticsState.enhancedEcommerce);
        setTrackMenuViews(originalAnalyticsState.trackMenuViews);
        setTrackDecisionBlocks(originalAnalyticsState.trackDecisionBlocks);
        setTrackOfficialBusinessPage(originalAnalyticsState.trackOfficialBusinessPage);
        setTrackCustomerApp(originalAnalyticsState.trackCustomerApp);
        setTrackLocation(originalAnalyticsState.trackLocation);
    };

    const saveAnalyticsSettings = async () => {
        if (!storeDetails?.storeId || !isAnalyticsDirty || saveInFlightRef.current) return;
        const sourceStoreDetails = storeDetails;
        const expectedStoreId = sourceStoreDetails.storeId;
        const expectedTenantId = sourceStoreDetails.tenantId;
        const previousAnalytics = sourceStoreDetails.analytics;
        const submittedAnalyticsDraft = {
            ...analyticsDraft,
            googleSearchConsole: normalizeGoogleSearchConsoleVerification(analyticsDraft.googleSearchConsole) || '',
        };
        saveInFlightRef.current = true;

        try {
            setIsAnalyticsSaving(true);
            const analyticsBase: Record<string, any> = { ...(previousAnalytics || {}) };
            delete analyticsBase.searchConsoleVerification;
            const nextAnalytics = {
                ...analyticsBase,
                ...submittedAnalyticsDraft,
            };
            const update = {
                analytics: getStoreDeepDifference(nextAnalytics, previousAnalytics || {}, {
                    detectRemovedRootKeys: true,
                }),
                storeId: expectedStoreId,
            };
            const writeResult = await updateStore(update);
            assertStoreUpdateSucceeded(
                writeResult,
                expectedStoreId,
                'mobile_analytics_settings_store_update_rejected',
            );
            if (!isMountedRef.current) return;
            const currentStoreDetails = currentStoreDetailsRef.current;
            const ownsCurrentAnalytics = currentStoreDetails?.storeId === expectedStoreId
                && currentStoreDetails?.tenantId === expectedTenantId
                && currentStoreDetails?.analytics === previousAnalytics;
            setStoreDetails((currentDetails) => (
                currentDetails?.storeId === expectedStoreId
                && currentDetails?.tenantId === expectedTenantId
                && currentDetails?.analytics === previousAnalytics
                    ? { ...currentDetails, analytics: nextAnalytics }
                    : currentDetails
            ));
            if (ownsCurrentAnalytics) {
                setOriginalAnalyticsState(submittedAnalyticsDraft);
            }
            Toast.show({ content: t('saved'), duration: 800 });
        } catch (error) {
            logMobileOwnerFailure('mobile_analytics_settings_save_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileOwnerStringContext('googleAnalyticsId', analyticsDraft.googleAnalyticsId),
                ...getBoundedMobileOwnerStringContext('facebookPixelId', analyticsDraft.facebookPixelId),
                ...getBoundedMobileOwnerStringContext('googleSearchConsole', analyticsDraft.googleSearchConsole),
                enabledTrackingCount: countEnabledAnalyticsTracking(analyticsDraft),
                previousEnabledTrackingCount: originalAnalyticsState ? countEnabledAnalyticsTracking(originalAnalyticsState) : 0,
                hasPreviousAnalytics: Boolean(previousAnalytics),
                googleAnalyticsIdChanged: analyticsDraft.googleAnalyticsId !== originalAnalyticsState?.googleAnalyticsId,
                facebookPixelIdChanged: analyticsDraft.facebookPixelId !== originalAnalyticsState?.facebookPixelId,
                googleSearchConsoleChanged: analyticsDraft.googleSearchConsole !== originalAnalyticsState?.googleSearchConsole,
                trackingPreferencesChanged: ANALYTICS_TRACKING_DRAFT_KEYS.some((key) => analyticsDraft[key] !== originalAnalyticsState?.[key]),
            });
            if (isMountedRef.current) {
                Toast.show({ content: t('failedToSave'), duration: 1500 });
            }
        } finally {
            saveInFlightRef.current = false;
            if (isMountedRef.current) {
                setIsAnalyticsSaving(false);
            }
        }
    };

    const resetSeoSettings = () => {
        if (!originalSeoState) return;
        setLocalizedSeoDrafts(originalLocalizedSeoDrafts);
        setCanonicalUrl(originalSeoState.canonicalUrl);
    };

    const saveSeoSettings = async () => {
        if (!storeDetails?.storeId || !isSeoDirty || saveInFlightRef.current) return;
        const sourceStoreDetails = storeDetails;
        const expectedStoreId = sourceStoreDetails.storeId;
        const expectedTenantId = sourceStoreDetails.tenantId;
        const submittedSeoDraft = seoDraft;
        const submittedLocalizedSeoDrafts = localizedSeoDrafts;
        saveInFlightRef.current = true;
        try {
            setIsSeoSaving(true);
            const update = {
                businessCopyMeta: buildBusinessCopyManualOverrideMeta({
                    existingMeta: sourceStoreDetails.businessCopyMeta,
                    fieldKeys: ['metaTitle', 'metaDescription', 'tagline', 'keywords'],
                }),
                canonicalUrl,
                keywords: applyLocalizedKeywordDraftMap(
                    sourceStoreDetails.keywords,
                    Object.fromEntries(Object.entries(submittedLocalizedSeoDrafts).map(([languageCode, draft]) => [
                        languageCode,
                        String(draft.keywords || '')
                            .split(',')
                            .map((item) => item.trim())
                            .filter(Boolean),
                    ])),
                ),
                metaDescription: applyLocalizedDraftMap(
                    sourceStoreDetails.metaDescription,
                    Object.fromEntries(Object.entries(submittedLocalizedSeoDrafts).map(([languageCode, draft]) => [languageCode, draft.metaDescription])),
                ),
                metaTitle: applyLocalizedDraftMap(
                    sourceStoreDetails.metaTitle,
                    Object.fromEntries(Object.entries(submittedLocalizedSeoDrafts).map(([languageCode, draft]) => [languageCode, draft.metaTitle])),
                ),
                storeId: expectedStoreId,
                tagline: applyLocalizedDraftMap(
                    sourceStoreDetails.tagline,
                    Object.fromEntries(Object.entries(submittedLocalizedSeoDrafts).map(([languageCode, draft]) => [languageCode, draft.tagline])),
                ),
            };
            const writeResult = await updateStore({
                ...getStoreDeepDifference(update, sourceStoreDetails),
                storeId: expectedStoreId,
            });
            assertStoreUpdateSucceeded(
                writeResult,
                expectedStoreId,
                'mobile_seo_settings_store_update_rejected',
            );
            if (!isMountedRef.current) return;
            const seoFields = ['businessCopyMeta', 'canonicalUrl', 'keywords', 'metaDescription', 'metaTitle', 'tagline'] as const;
            const currentStoreDetails = currentStoreDetailsRef.current;
            const ownsCurrentSeo = currentStoreDetails?.storeId === expectedStoreId
                && currentStoreDetails?.tenantId === expectedTenantId
                && seoFields.every((field) => currentStoreDetails[field] === sourceStoreDetails[field]);
            setStoreDetails((currentDetails) => (
                currentDetails?.storeId === expectedStoreId
                && currentDetails?.tenantId === expectedTenantId
                && seoFields.every((field) => currentDetails[field] === sourceStoreDetails[field])
                    ? { ...currentDetails, ...update }
                    : currentDetails
            ));
            if (ownsCurrentSeo) {
                setOriginalSeoState(submittedSeoDraft);
                setOriginalLocalizedSeoDrafts(submittedLocalizedSeoDrafts);
            }
            Toast.show({ content: t('saved'), duration: 800 });
        } catch (error) {
            logMobileOwnerFailure('mobile_seo_settings_save_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileOwnerStringContext('canonicalUrl', canonicalUrl),
                ...getBoundedMobileOwnerStringContext('selectedLanguage', contentLanguage),
                managedLanguageCount: managedLanguages.length,
                localizedDraftLanguageCount: Object.keys(localizedSeoDrafts).length,
                filledSeoDraftLanguageCount: countFilledSeoDraftLanguages(localizedSeoDrafts),
                keywordSeoDraftLanguageCount: countKeywordSeoDraftLanguages(localizedSeoDrafts),
                hasPreviousSeoState: Boolean(originalSeoState),
                canonicalUrlChanged: canonicalUrl !== originalSeoState?.canonicalUrl,
                selectedLanguageMetaTitleChanged: currentSeoDraft.metaTitle !== originalSeoState?.metaTitle,
                selectedLanguageMetaDescriptionChanged: currentSeoDraft.metaDescription !== originalSeoState?.metaDescription,
                selectedLanguageTaglineChanged: currentSeoDraft.tagline !== originalSeoState?.tagline,
                selectedLanguageKeywordsChanged: currentSeoDraft.keywords !== originalSeoState?.keywords,
            });
            if (isMountedRef.current) {
                Toast.show({ content: t('failedToSave'), duration: 1500 });
            }
        } finally {
            saveInFlightRef.current = false;
            if (isMountedRef.current) {
                setIsSeoSaving(false);
            }
        }
    };

    const openGuide = () => {
        setGuideTab('quick');
        setIsGuideOpen(true);
    };

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={pageSubtitle}
                infoContent={isSeoMode ? undefined : analyticsInfoContent}
                onBack={onBack}
                title={pageTitle}
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                {isSeoMode ? (
                    <>
                        <MobileLocalizedLanguageSelector
                            helperText="Choose which store language you want to edit. Canonical URL remains shared across languages."
                            languages={managedLanguages}
                            onChange={setSelectedLanguage}
                            selectedLanguage={contentLanguage}
                            title="SEO content language"
                        />
                        <Card>
                            <Flex gap={12} vertical>
                                <FieldGroup hint={tSeo('taglineHelp')} label={tSeo('tagline')}>
                                    <TextArea
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        maxLength={100}
                                        onChange={(value) => setLocalizedSeoDrafts((previous) => ({
                                            ...previous,
                                            [contentLanguage]: {
                                                ...(previous[contentLanguage] || { keywords: '', metaDescription: '', metaTitle: '', tagline: '' }),
                                                tagline: value,
                                            },
                                        }))}
                                        placeholder={tSeo('taglinePlaceholder')}
                                        showCount
                                        value={currentSeoDraft.tagline}
                                    />
                                </FieldGroup>
                                {contentLanguage !== referenceLanguage ? (
                                    <LocalizedReferenceHint
                                        onUseReference={() => setLocalizedSeoDrafts((previous) => ({
                                            ...previous,
                                            [contentLanguage]: {
                                                ...(previous[contentLanguage] || { keywords: '', metaDescription: '', metaTitle: '', tagline: '' }),
                                                tagline: previous[referenceLanguage]?.tagline || '',
                                            },
                                        }))}
                                        referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                                        referenceValue={localizedSeoDrafts[referenceLanguage]?.tagline || ''}
                                    />
                                ) : null}
                                <FieldGroup label={tSeo('metaTitle')} tooltip={tSeo('metaTitleHelp')}>
                                    <TextArea
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        maxLength={60}
                                        onChange={(value) => setLocalizedSeoDrafts((previous) => ({
                                            ...previous,
                                            [contentLanguage]: {
                                                ...(previous[contentLanguage] || { keywords: '', metaDescription: '', metaTitle: '', tagline: '' }),
                                                metaTitle: value,
                                            },
                                        }))}
                                        placeholder={tSeo('metaTitlePlaceholder')}
                                        showCount
                                        value={currentSeoDraft.metaTitle}
                                    />
                                </FieldGroup>
                                {contentLanguage !== referenceLanguage ? (
                                    <LocalizedReferenceHint
                                        onUseReference={() => setLocalizedSeoDrafts((previous) => ({
                                            ...previous,
                                            [contentLanguage]: {
                                                ...(previous[contentLanguage] || { keywords: '', metaDescription: '', metaTitle: '', tagline: '' }),
                                                metaTitle: previous[referenceLanguage]?.metaTitle || '',
                                            },
                                        }))}
                                        referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                                        referenceValue={localizedSeoDrafts[referenceLanguage]?.metaTitle || ''}
                                    />
                                ) : null}
                                <FieldGroup label={tSeo('metaDescription')} tooltip={tSeo('metaDescHelp')}>
                                    <TextArea
                                        autoSize={{ minRows: 3, maxRows: 6 }}
                                        maxLength={160}
                                        onChange={(value) => setLocalizedSeoDrafts((previous) => ({
                                            ...previous,
                                            [contentLanguage]: {
                                                ...(previous[contentLanguage] || { keywords: '', metaDescription: '', metaTitle: '', tagline: '' }),
                                                metaDescription: value,
                                            },
                                        }))}
                                        placeholder={tSeo('metaDescPlaceholder')}
                                        showCount
                                        value={currentSeoDraft.metaDescription}
                                    />
                                </FieldGroup>
                                {contentLanguage !== referenceLanguage ? (
                                    <LocalizedReferenceHint
                                        onUseReference={() => setLocalizedSeoDrafts((previous) => ({
                                            ...previous,
                                            [contentLanguage]: {
                                                ...(previous[contentLanguage] || { keywords: '', metaDescription: '', metaTitle: '', tagline: '' }),
                                                metaDescription: previous[referenceLanguage]?.metaDescription || '',
                                            },
                                        }))}
                                        referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                                        referenceValue={localizedSeoDrafts[referenceLanguage]?.metaDescription || ''}
                                    />
                                ) : null}
                                <FieldGroup label={tSeo('keywords')} tooltip={tSeo('keywordsHelp')}>
                                    <TextArea
                                        autoSize={{ minRows: 2, maxRows: 5 }}
                                        maxLength={300}
                                        onChange={(value) => setLocalizedSeoDrafts((previous) => ({
                                            ...previous,
                                            [contentLanguage]: {
                                                ...(previous[contentLanguage] || { keywords: '', metaDescription: '', metaTitle: '', tagline: '' }),
                                                keywords: value,
                                            },
                                        }))}
                                        placeholder={tSeo('keywordsPlaceholder')}
                                        showCount
                                        value={currentSeoDraft.keywords}
                                    />
                                </FieldGroup>
                                <FieldGroup label={tSeo('canonicalUrl')} tooltip={tSeo('canonicalUrlHelp')}>
                                    <TextArea
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        onChange={setCanonicalUrl}
                                        placeholder={tSeo('canonicalUrlPlaceholder')}
                                        value={canonicalUrl}
                                    />
                                </FieldGroup>
                            </Flex>
                        </Card>
                        <Card>
                            <Flex gap={8} vertical>
                                <Text strong>{tSeo('aeoCardTitle')}</Text>
                                <Text type="secondary">{tSeo('aeoCardDescription')}</Text>
                                <Text>{tSeo('aeoCardPoint1')}</Text>
                                <Text>{tSeo('aeoCardPoint2')}</Text>
                                <Text>{tSeo('aeoCardPoint3')}</Text>
                            </Flex>
                        </Card>
                        <Flex
                            gap={8}
                            style={{
                                backdropFilter: 'blur(10px)',
                                backgroundColor: token.colorBgContainer,
                                borderTop: `1px solid ${token.colorBorderSecondary}`,
                                bottom: 0,
                                marginInline: -16,
                                padding: '12px 16px',
                                position: 'sticky',
                                zIndex: 20,
                            }}
                        >
                            <Button block disabled={!isSeoDirty || isSeoSaving} fill="outline" onClick={resetSeoSettings}>
                                {tMobile('reset')}
                            </Button>
                            <Button block disabled={!isSeoDirty || isSeoSaving} loading={isSeoSaving} onClick={() => void saveSeoSettings()}>
                                {tMobile('saveChanges')}
                            </Button>
                        </Flex>
                        <SeoPreviewCard
                            businessName={getStoreContextName(storeDetails as any, 'Business')}
                            canonicalUrl={canonicalUrl}
                            customDomain={storeDetails?.customDomain}
                            keywords={currentSeoDraft.keywords}
                            logoUrl={storeDetails?.logo}
                            metaDescription={currentSeoDraft.metaDescription}
                            metaTitle={currentSeoDraft.metaTitle}
                            subdomain={storeDetails?.subdomain}
                            tagline={currentSeoDraft.tagline}
                        />
                    </>
                ) : (
                    <>
                        <Card>
                            <Flex gap={12} vertical>
                                <Flex gap={6} vertical>
                                    <Text strong>{tAnalytics('trackSuccess')}</Text>
                                    <Text type="secondary">{tAnalytics('trackSuccessDesc')}</Text>
                                </Flex>
                                <Flex gap={8}>
                                    <Button block icon={<LuRocket size={16} />} onClick={openSetupWizard}>
                                        {tAnalytics('setupWizard')}
                                    </Button>
                                    <Button block fill="outline" icon={<LuBookOpen size={16} />} onClick={openGuide}>
                                        {tAnalytics('viewGuide')}
                                    </Button>
                                </Flex>
                            </Flex>
                        </Card>

                        <Card title={tAnalytics('essentialTracking')}>
                            <Flex gap={12} vertical>
                                <InfoCallout
                                    title="External analytics scripts"
                                    description={EXTERNAL_ANALYTICS_INTEGRATION_NOTE}
                                />
                                <FieldGroup hint={tAnalytics('googleAnalyticsIdHelp')} label={tAnalytics('googleAnalyticsId')}>
                                    <Input onChange={setGaId} placeholder="G-XXXXXXXXXX" value={gaId} />
                                </FieldGroup>
                                <FieldGroup hint={tAnalytics('googleSearchConsoleHelp')} label={tAnalytics('googleSearchConsole')}>
                                    <Input
                                        onChange={setSearchConsole}
                                        placeholder="Verification code"
                                        value={searchConsole}
                                    />
                                </FieldGroup>
                                <FieldGroup hint={tAnalytics('facebookPixelIdHelp')} label={tAnalytics('facebookPixelId')}>
                                    <Input onChange={setFbPixelId} placeholder="XXXXXXXXXXXXXXXXXX" value={fbPixelId} />
                                </FieldGroup>
                            </Flex>
                        </Card>

                        <Card title={tAnalytics('trackingFeatures')}>
                            <Flex gap={16} vertical>
                                <InfoCallout
                                    title="Tracked by default"
                                    description="Client-facing screens currently record menu opens, item detail opens, anonymous session milestones, category interest from item views and taps, active filter context attached to later item/search/action events, de-duplicated search queries including no-result searches, unavailable-item taps, final menu CTA clicks, recommendation block impressions and taps, OBP views and CTA taps, customer-app prompt and install events, device/session totals, entry source tags for action-rate-by-source reporting, and approximate location unless you switch a category off below. Nightly menu intelligence may combine these anonymous analytics with your menu catalog fields to suggest owner actions. We do not collect customer names, emails, payment details, exact GPS coordinates, scroll heatmaps, hover activity, option/variant clicks, or per-keystroke tracking in this analytics flow."
                                />
                                <InfoCallout
                                    title="How these switches work"
                                    description={ANALYTICS_SETTINGS_GROUPING_NOTE}
                                />
                                <TrackingCategoryDisclosureList />
                                <ToggleRow
                                    checked={trackMenuViews}
                                    description="Tracks menu opens, item detail opens, de-duplicated search queries including no-result searches, unavailable-item taps, final menu CTA clicks, entry source, and session totals across the client menu."
                                    label="Menu activity"
                                    onChange={setTrackMenuViews}
                                />
                                <ToggleRow
                                    checked={trackDecisionBlocks}
                                    description="Tracks Featured section impressions and taps when Featured choices appear on the customer menu."
                                    label="Featured section analytics"
                                    onChange={setTrackDecisionBlocks}
                                />
                                <ToggleRow
                                    checked={trackOfficialBusinessPage}
                                    description="Tracks official business page views, CTA taps, menu CTA clicks, social/review link clicks, and owner share actions."
                                    label="Official business page activity"
                                    onChange={setTrackOfficialBusinessPage}
                                />
                                <ToggleRow
                                    checked={trackCustomerApp}
                                    description="Tracks customer app install prompts, installs, standalone opens, and shortcut launches."
                                    label="Customer app activity"
                                    onChange={setTrackCustomerApp}
                                />
                                <ToggleRow
                                    checked={trackLocation}
                                    description="Adds approximate location to analytics reports using rounded geolocation or timezone region when available."
                                    label="Approximate location"
                                    onChange={setTrackLocation}
                                />
                            </Flex>
                        </Card>

                        <Flex
                            gap={8}
                            style={{
                                backdropFilter: 'blur(10px)',
                                backgroundColor: token.colorBgContainer,
                                borderTop: `1px solid ${token.colorBorderSecondary}`,
                                bottom: 0,
                                marginInline: -16,
                                padding: '12px 16px',
                                position: 'sticky',
                                zIndex: 20,
                            }}
                        >
                            <Button block disabled={!isAnalyticsDirty || isAnalyticsSaving} fill="outline" onClick={resetAnalyticsSettings}>
                                {tMobile('reset')}
                            </Button>
                            <Button block disabled={!isAnalyticsDirty || isAnalyticsSaving} loading={isAnalyticsSaving} onClick={() => void saveAnalyticsSettings()}>
                                {tMobile('saveChanges')}
                            </Button>
                        </Flex>
                    </>
                )}
            </Flex>

            {!isSeoMode ? (
                <>
                    <Popup
                        bodyStyle={{ maxHeight: '92vh', overflow: 'hidden', padding: 0 }}
                        destroyOnClose
                        onMaskClick={() => setIsGuideOpen(false)}
                        visible={isGuideOpen}
                    >
                        <Flex style={{ height: '100%' }} vertical>
                            <NavBar
                                onBack={() => setIsGuideOpen(false)}
                                right={(
                                    <Button
                                        fill="none"
                                        onClick={() => setIsGuideOpen(false)}
                                        style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}
                                    >
                                        <LuX size={18} />
                                    </Button>
                                )}
                            >
                                {tAnalytics('viewGuide')}
                            </NavBar>

                            <Flex style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 }} vertical>
                                <Tabs activeKey={guideTab} onChange={(key) => setGuideTab(key as 'quick' | 'complete')}>
                                    <Tabs.Tab key="quick" title="Quick Start Guide">
                                        <Flex gap={12} style={{ paddingTop: 12 }} vertical>
                                            <GuideSection
                                                items={[
                                                    'Go to analytics.google.com',
                                                    'Click "Start measuring"',
                                                    'Finish the setup and copy the Measurement ID',
                                                    'Paste the ID into this analytics screen',
                                                ]}
                                                title="Set Up Google Analytics"
                                            />
                                            <GuideSection
                                                items={[
                                                    'Open Google Search Console',
                                                    'Add your menu website URL',
                                                    'Choose HTML tag verification',
                                                    'Copy the meta content and paste it here',
                                                ]}
                                                title="Set Up Google Search Console"
                                            />
                                            <GuideSection
                                                items={[
                                                    'Open Facebook Events Manager',
                                                    'Connect a web data source',
                                                    'Copy your Pixel ID',
                                                    'Paste the ID into this analytics screen',
                                                ]}
                                                title="Set Up Facebook Pixel"
                                            />
                                            <GuideSection
                                                items={[
                                                    'Enable sales tracking for order and revenue visibility',
                                                    'Enable menu item views to see popular dishes',
                                                    'Enable location tracking for customer geography',
                                                    'Wait 24 to 48 hours for data to appear',
                                                ]}
                                                title="Enable Tracking Features"
                                            />
                                        </Flex>
                                    </Tabs.Tab>

                                    <Tabs.Tab key="complete" title="Complete Guide">
                                        <Flex gap={12} style={{ paddingTop: 12 }} vertical>
                                            <GuideSection
                                                description="Reports > Realtime shows who is currently visiting your menu. Reports > Engagement > Events helps you track views, add-to-cart actions, and purchases."
                                                title="Google Analytics Reports"
                                            />
                                            <GuideSection
                                                description="Search performance shows how customers find your menu on Google. Mobile usability helps you confirm the public page works well on phones."
                                                title="Search Console Features"
                                            />
                                            <GuideSection
                                                description="Facebook Pixel helps you understand ad-driven visits, customer journeys, and conversion performance."
                                                title="Facebook Pixel Insights"
                                            />
                                            <GuideSection
                                                description="Enhanced e-commerce gives view-to-purchase insight, cart behavior, and category-level sales visibility."
                                                title="Enhanced E-commerce Features"
                                            />
                                            <GuideSection
                                                description="Location analytics helps you understand where visitors come from and when they are most active."
                                                title="Location Analytics"
                                            />
                                            <ResourceLinksSection onOpenExternalLink={handleOpenExternalLink} />
                                        </Flex>
                                    </Tabs.Tab>
                                </Tabs>
                            </Flex>
                        </Flex>
                    </Popup>

                    <Popup
                        bodyStyle={{ maxHeight: '92vh', overflow: 'hidden', padding: 0 }}
                        destroyOnClose
                        onMaskClick={closeSetupWizard}
                        visible={isSetupWizardOpen}
                    >
                        <Flex style={{ height: '100%' }} vertical>
                            <NavBar
                                onBack={closeSetupWizard}
                                right={(
                                    <Button
                                        fill="none"
                                        onClick={closeSetupWizard}
                                        style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}
                                    >
                                        <LuX size={18} />
                                    </Button>
                                )}
                            >
                                {tAnalytics('setupWizard')}
                            </NavBar>

                            <Flex gap={12} style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: 12 }} vertical>
                                <Flex align="center" justify="space-between">
                                    <Text strong>{wizardSteps[wizardStep]?.title}</Text>
                                    <Text type="secondary">Step {wizardStep + 1} of {wizardSteps.length}</Text>
                                </Flex>
                            </Flex>

                            <Flex style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 }} vertical>
                                {wizardSteps[wizardStep]?.content}
                            </Flex>

                            <Flex gap={8} style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, padding: 12 }} justify="space-between">
                                <Button
                                    disabled={wizardStep === 0}
                                    fill="outline"
                                    onClick={() => setWizardStep((current) => Math.max(0, current - 1))}
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (wizardStep === wizardSteps.length - 1) {
                                            closeSetupWizard();
                                            return;
                                        }
                                        setWizardStep((current) => Math.min(wizardSteps.length - 1, current + 1));
                                    }}
                                >
                                    {wizardStep === wizardSteps.length - 1 ? 'Finish Setup' : 'Next Step'}
                                </Button>
                            </Flex>
                        </Flex>
                    </Popup>
                </>
            ) : null}
        </Flex>
    );
}

export default function MobileSeoAnalyticsScreen(props: MobileSeoAnalyticsScreenProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const scopeKey = `${storeDetails?.tenantId || 'no-tenant'}::${storeDetails?.storeId || 'no-store'}::${props.mode || 'seo'}`;

    return <MobileSeoAnalyticsScreenContent key={scopeKey} {...props} />;
}

function FieldGroup({
    children,
    hint,
    label,
    tooltip,
}: {
    children: React.ReactNode;
    hint?: string;
    label: string;
    tooltip?: string;
}) {
    return (
        <Flex gap={6} vertical>
            <Flex align="center" gap={6}>
                <Text strong>{label}</Text>
                {tooltip ? (
                    <Popover
                        content={tooltip}
                        placement="bottom"
                        trigger="click"
                    >
                        <button
                            aria-label={`${label} help`}
                            style={{
                                alignItems: 'center',
                                background: 'transparent',
                                border: 'none',
                                color: 'inherit',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                lineHeight: 0,
                                padding: 0,
                            }}
                            type="button"
                        >
                            <LuInfo size={15} />
                        </button>
                    </Popover>
                ) : null}
            </Flex>
            {children}
            {hint ? <Text type="secondary">{hint}</Text> : null}
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

function FeatureToggleCard({ checked, description, label, onChange }: { checked: boolean; description: string; label: string; onChange: (value: boolean) => void }) {
    return (
        <Card size="small">
            <ToggleRow checked={checked} description={description} label={label} onChange={onChange} />
        </Card>
    );
}

function TrackingCategoryDisclosureList() {
    return (
        <Card size="small">
            <Collapse accordion>
                {ANALYTICS_TRACKING_CATEGORY_DISCLOSURES.map((category) => (
                    <Collapse.Panel key={category.key} title={category.title}>
                        <Flex gap={8} vertical>
                            <Text type="secondary">{category.description}</Text>
                            <Flex gap={4} vertical>
                                <Text strong>Included signals</Text>
                                {category.details.map((detail) => (
                                    <Text key={detail}>• {detail}</Text>
                                ))}
                            </Flex>
                            {category.note ? <Text type="secondary">{category.note}</Text> : null}
                        </Flex>
                    </Collapse.Panel>
                ))}
            </Collapse>
        </Card>
    );
}

function GuideSection({ description, items, title }: { description?: string; items?: string[]; title: string }) {
    return (
        <Card size="small">
            <Flex gap={8} vertical>
                <Text strong>{title}</Text>
                {description ? <Text type="secondary">{description}</Text> : null}
                {items?.length ? <StepList items={items} /> : null}
            </Flex>
        </Card>
    );
}

function InfoCallout({ description, title }: { description: string; title: string }) {
    return (
        <Card size="small">
            <Flex align="flex-start" gap={8}>
                <LuInfo size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <Flex gap={2} vertical>
                    <Text strong>{title}</Text>
                    <Text type="secondary">{description}</Text>
                </Flex>
            </Flex>
        </Card>
    );
}

function ResourceLinksSection({ onOpenExternalLink }: { onOpenExternalLink: (url: string, source: string) => void }) {
    return (
        <Card size="small">
            <Flex gap={12} vertical>
                <Text strong>Help Resources</Text>
                <LinkButton label="Google Analytics Help Center" onOpenExternalLink={onOpenExternalLink} source="google_analytics_help" url="https://support.google.com/analytics" />
                <LinkButton label="Analytics Academy" onOpenExternalLink={onOpenExternalLink} source="analytics_academy" url="https://analytics.google.com/analytics/academy" />
                <LinkButton label="Search Console Help Center" onOpenExternalLink={onOpenExternalLink} source="search_console_help" url="https://support.google.com/webmasters" />
                <LinkButton label="SEO Best Practices Guide" onOpenExternalLink={onOpenExternalLink} source="seo_best_practices" url="https://developers.google.com/search/docs" />
                <LinkButton label="Facebook Pixel Setup Guide" onOpenExternalLink={onOpenExternalLink} source="facebook_pixel_setup" url="https://www.facebook.com/business/help/952192354843755" />
                <LinkButton label="Events Manager Guide" onOpenExternalLink={onOpenExternalLink} source="events_manager_guide" url="https://www.facebook.com/business/help/402791146561655" />
                <LinkButton label="GA4 E-commerce Guide" onOpenExternalLink={onOpenExternalLink} source="ga4_ecommerce_guide" url="https://developers.google.com/analytics/devguides/collection/ga4/ecommerce" />
                <LinkButton label="MenuListAI Analytics Docs" onOpenExternalLink={onOpenExternalLink} source="menulist_analytics_docs" url="https://docs.menulistai.com/analytics" />
            </Flex>
        </Card>
    );
}

function LinkButton({
    label,
    onOpenExternalLink,
    source,
    url,
}: {
    label: string;
    onOpenExternalLink: (url: string, source: string) => void;
    source: string;
    url: string;
}) {
    return (
        <Button fill="outline" icon={<LuExternalLink size={16} />} onClick={() => onOpenExternalLink(url, source)}>
            {label}
        </Button>
    );
}

function StepList({ items }: { items: string[] }) {
    return (
        <Flex gap={8} vertical>
            {items.map((item, index) => (
                <Flex align="flex-start" gap={8} key={`${index}-${item}`}>
                    <Text strong>{index + 1}.</Text>
                    <Text style={{ flex: 1 }}>{item}</Text>
                </Flex>
            ))}
        </Flex>
    );
}

function getAnalyticsDraft(storeDetails: any): AnalyticsDraft {
    return {
        ...getResolvedAnalyticsPreferences(storeDetails?.analytics),
        enhancedEcommerce: storeDetails?.analytics?.enhancedEcommerce || false,
        facebookPixelId: storeDetails?.analytics?.facebookPixelId || '',
        googleAnalyticsId: storeDetails?.analytics?.googleAnalyticsId || '',
        googleSearchConsole: normalizeGoogleSearchConsoleVerification(
            storeDetails?.analytics?.googleSearchConsole || (storeDetails?.analytics as Record<string, unknown> | undefined)?.searchConsoleVerification,
        ) || '',
    };
}

function getSeoDraft(storeDetails: any): SeoDraft {
    const preferredLanguage = getStorePreferredLanguage(storeDetails);
    return {
        canonicalUrl: getDefaultCanonicalUrl(storeDetails),
        keywords: getLocalizedStoreKeywords(storeDetails?.keywords, preferredLanguage, []).join(', '),
        metaDescription: getLocalizedStoreValue(storeDetails?.metaDescription, preferredLanguage, ''),
        metaTitle: getLocalizedStoreValue(storeDetails?.metaTitle, preferredLanguage, ''),
        tagline: getLocalizedStoreValue(storeDetails?.tagline, preferredLanguage, ''),
    };
}

function LocalizedReferenceHint({
    onUseReference,
    referenceLabel,
    referenceValue,
}: {
    onUseReference: () => void;
    referenceLabel: string;
    referenceValue: string;
}) {
    const { token } = theme.useToken();

    return (
        <Flex
            align="center"
            justify="space-between"
            style={{
                background: token.colorFillAlter,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 12,
                marginTop: -4,
                padding: '8px 10px',
            }}
        >
            <Flex gap={2} style={{ minWidth: 0 }} vertical>
                <Text type="secondary">{`${referenceLabel} reference`}</Text>
                <Text style={{ wordBreak: 'break-word' }}>
                    {referenceValue || 'No content yet in the primary language.'}
                </Text>
            </Flex>
            {referenceValue ? (
                <Button fill="outline" onClick={onUseReference} size="small">
                    Use
                </Button>
            ) : null}
        </Flex>
    );
}
