"use client";

import ImageUploadInput from "@atoms/imageUploadInput";
import { FEATURE_FLAGS } from "@config/features";
import { ECOMSAI_PLATFORM_STORE_ID } from "@constant/user";
import { getScreenState } from "@database/campaigns";
import { extractBrandChanges, propagateBrandToOutlets } from "@database/multiOutlet/brandPropagation";
import { getPlatformSummary } from "@database/platformSummary";
import { addStore, updateStore } from "@database/stores";
import { updateTenantsStoreslist } from "@database/tenants";
import { useAppDispatch } from "@hook/useAppDispatch";
import { _debounce } from "@hook/useDebounce";
import { getResolvedAnalyticsPreferences } from "@lib/analytics/preferences";
import { getLocalizedText, getPrimaryLocalizedLanguage, updateLocalizedText } from "@lib/localization/text";
import { generateOBPUrl } from "@lib/obp/generateOBPUrl";
import { buildScreenUrl } from "@lib/screen/utils";
import localizeBusinessCopyResult, { mergeLocalizedField } from "@services/ai/businessCopy/localizeBusinessCopyResult";
import { buildBusinessCopyGeneratedMeta, buildBusinessCopyManualOverrideMeta, buildBusinessCopyRepairMeta, getBusinessCopyFieldKeysFromUpdate } from "@services/ai/businessCopy/metadata";
import syncMissingBusinessCopyTranslations from "@services/ai/businessCopy/syncMissingBusinessCopyTranslations";
import { computeBusinessCopyCoverage } from "@services/ai/businessCopy/translationCoverage";
import { applyLocalizedDraftMap, getLocalizedStoreValue, getStoreManagedLanguages, getStorePreferredLanguage } from "@lib/localization/storeContent";
import { normalizeStoreLanguagePolicy } from "@lib/localization/languagePolicy";
import {
    APP_DATE_FORMAT_COOKIES_KEY,
    APP_TIME_FORMAT_COOKIES_KEY,
    DATE_FORMATS,
    defaultDateFormatString,
    defaultTimeFormatString,
} from "@lib/localization/config";
import { UserUploadedFileType } from "@type/common";
import { getUTCDate } from "@util/dateTime";
import { getObjectDifferance } from "@util/deepMerge";
import { Button, Card, Flex, Form, Menu, Space, Tag, Typography, message } from "antd";
import { getCookie } from "cookies-next";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { motion } from "framer-motion";
import { useFormatter, useTimeZone, useTranslations } from "next-intl";
import { createRef, useEffect, useMemo, useRef, useState } from "react";
import {
    LuBarChart,
    LuBuilding2,
    LuClock,
    LuGlobe,
    LuInfo,
    LuLink,
    LuList,
    LuMapPin,
    LuMessageSquare,
    LuSave,
    LuSearch,
    LuShield,
    LuSmartphone,
    LuSparkles,
    LuTimer,
    LuTv,
    LuUpload,
    LuUser,
} from "react-icons/lu";
import { SiGooglemybusiness } from "react-icons/si";
import DigitalScreenSettings from "../settings/DigitalScreenSettings";
import PresenceMonitor from "../useMenuList/PresenceMonitor";
import {
    AnalyticsTab,
    BasicInfoTab,
    BusinessCopySetupTab,
    BusinessAttributesTab,
    ContactPersonTab,
    CustomerAppTab,
    DomainSettingsTab,
    FeedbackSettingsTab,
    IntegrationsTab,
    LocaleSettingsTab,
    LocationInfoTab,
    OfficialPageTab,
    PosSyncTab,
    SeoTab,
    SocialMediaTab,
    TimeSlotPresetsTab,
    WorkingHoursTab,
} from "./tabs";
import type { UseMenuListData } from "../useMenuList/types";

dayjs.extend(customParseFormat);

interface WorkingHourSlot {
    day: string;
    start: dayjs.Dayjs | null;
    end: dayjs.Dayjs | null;
}

function sanitizeSocialMediaMap(source?: Record<string, string> | null) {
    const cleaned: Record<string, string> = {};

    Object.entries(source || {}).forEach(([key, value]) => {
        const normalizedKey = key.trim().toLowerCase();
        const normalizedValue = value?.trim();

        if (!normalizedKey || normalizedKey === 'whatsapp' || !normalizedValue) return;
        cleaned[normalizedKey] = normalizedValue;
    });

    return cleaned;
}

function resolveStoreContentLanguage(storeDetails: any): string {
    return getStorePreferredLanguage(storeDetails)
        || getPrimaryLocalizedLanguage(storeDetails?.publicPresence?.displayName, 'en');
}

function getBusinessSettingsInitialValues(storeDetails: any) {
    const contentLanguage = resolveStoreContentLanguage(storeDetails);
    const managedLanguages = getStoreManagedLanguages(storeDetails);
    const normalizedLanguagePolicy = normalizeStoreLanguagePolicy(storeDetails);
    const analyticsPreferences = getResolvedAnalyticsPreferences(storeDetails?.analytics);
    return {
        ...storeDetails,
        analytics: {
            ...(storeDetails?.analytics || {}),
            trackCustomerApp: analyticsPreferences.trackCustomerApp,
            trackDecisionBlocks: analyticsPreferences.trackDecisionBlocks,
            trackLocation: analyticsPreferences.trackLocation,
            trackMenuViews: analyticsPreferences.trackMenuViews,
            trackOfficialBusinessPage: analyticsPreferences.trackOfficialBusinessPage,
        },
        activeLanguages: normalizedLanguagePolicy.activeLanguages,
        __localizedPublicPresenceDrafts: Object.fromEntries(
            managedLanguages.map((languageCode) => [
                languageCode,
                {
                    descriptor: getLocalizedStoreValue(storeDetails?.publicPresence?.descriptor, languageCode, ''),
                    displayName: getLocalizedStoreValue(storeDetails?.publicPresence?.displayName, languageCode, ''),
                    knownFor: getLocalizedStoreValue(storeDetails?.publicPresence?.knownFor, languageCode, ''),
                },
            ]),
        ),
        __localizedPwaShortNameDrafts: Object.fromEntries(
            managedLanguages.map((languageCode) => [
                languageCode,
                getLocalizedStoreValue(storeDetails?.pwaSettings?.pwaShortName, languageCode, ''),
            ]),
        ),
        __localizedSeoDrafts: Object.fromEntries(
            managedLanguages.map((languageCode) => [
                languageCode,
                {
                    metaDescription: getLocalizedStoreValue(storeDetails?.metaDescription, languageCode, ''),
                    metaTitle: getLocalizedStoreValue(storeDetails?.metaTitle, languageCode, ''),
                    tagline: getLocalizedStoreValue(storeDetails?.tagline, languageCode, ''),
                },
            ]),
        ),
        __storeContentLanguage: getStorePreferredLanguage(storeDetails),
        defaultLanguage: normalizedLanguagePolicy.defaultLanguage,
        metaDescription: getLocalizedStoreValue(storeDetails?.metaDescription, contentLanguage, ''),
        metaTitle: getLocalizedStoreValue(storeDetails?.metaTitle, contentLanguage, ''),
        publicPresence: {
            ...(storeDetails?.publicPresence || {}),
            displayName: getLocalizedStoreValue(storeDetails?.publicPresence?.displayName, contentLanguage, ''),
            descriptor: getLocalizedStoreValue(storeDetails?.publicPresence?.descriptor, contentLanguage, ''),
            knownFor: getLocalizedStoreValue(storeDetails?.publicPresence?.knownFor, contentLanguage, ''),
        },
        tagline: getLocalizedStoreValue(storeDetails?.tagline, contentLanguage, ''),
    };
}

function BusinessSettingsPresenceMonitorCard({ storeDetails }: { storeDetails: any }) {
    const [data, setData] = useState<UseMenuListData | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function loadPresenceData() {
            if (!storeDetails || !FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR) {
                if (isMounted) setData(null);
                return;
            }

            const obpLink = generateOBPUrl(storeDetails.subdomain || '', storeDetails.customDomain);
            let screenToken: string | null = null;

            try {
                const screenState = await getScreenState();
                screenToken = screenState?.screenToken || null;
            } catch {
                screenToken = null;
            }

            if (!isMounted) return;

            setData({
                allProjects: [],
                businessType: storeDetails.businessType || '',
                customDomain: storeDetails.customDomain || null,
                feedbackLink: '',
                feedbackQrLink: '',
                hasFeedbackEnabled: storeDetails.feedbackEnabled !== false,
                hasPosSync: false,
                hasPublishedMenu: Boolean(obpLink),
                hasScreen: Boolean(screenToken),
                highlightsLink: screenToken ? `${buildScreenUrl(screenToken, obpLink)}?mode=highlights` : null,
                installAppLink: null,
                isDefaultProject: false,
                menuBoardLink: screenToken ? buildScreenUrl(screenToken, obpLink) : null,
                menuLink: '',
                menuModifiedOn: null,
                obpLink,
                posSyncStatus: null,
                projectId: null,
                projectName: null,
                screenLastSeenAt: null,
                screenToken,
                storeLogo: storeDetails.logo || null,
                storeName: getLocalizedText(
                    storeDetails?.publicPresence?.displayName,
                    undefined,
                    getPrimaryLocalizedLanguage(storeDetails?.publicPresence?.displayName, 'en'),
                    storeDetails?.name || 'Your Business',
                ),
                subdomain: storeDetails.subdomain || '',
            });
        }

        void loadPresenceData();

        return () => {
            isMounted = false;
        };
    }, [storeDetails]);

    if (!FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR || !storeDetails || !data) {
        return null;
    }

    return (
        <PresenceMonitor
            data={data}
            storeDetails={storeDetails}
            onCopyLink={async (url, label) => {
                try {
                    await navigator.clipboard.writeText(url);
                    message.success(`${label} copied`);
                } catch {
                    message.error(`Could not copy ${label.toLowerCase()}`);
                }
            }}
        />
    );
}

function BusinessSettings({ storeDetails, setStoreDetails, tenantDetails }) {
    const t = useTranslations('BusinessSettings');
    const format = useFormatter();
    const now = getUTCDate().newDate;
    const [form] = Form.useForm();
    const timezone = useTimeZone();
    const dispatch = useAppDispatch();
    const [availableDateFormats, setAvailableDateFormats] =
        useState(DATE_FORMATS);
    const [selectedFile, setSelectedFile] = useState<UserUploadedFileType>({
        name: "",
        size: 0,
        type: "",
        url: null,
    });
    const [activeSection, setActiveSection] = useState(0);
    const fileInputRef = useRef(null);
    const [socialMedia, setSocialMedia] = useState<Record<string, string>>({});
    const [timeSlotPresets, setTimeSlotPresets] = useState(
        storeDetails?.timeSlotPresets || [],
    );

    const [workingHours, setWorkingHours] = useState<WorkingHourSlot[]>([
        { day: "sun", start: null, end: null },
        { day: "mon", start: null, end: null },
        { day: "tue", start: null, end: null },
        { day: "wed", start: null, end: null },
        { day: "thu", start: null, end: null },
        { day: "fri", start: null, end: null },
        { day: "sat", start: null, end: null },
    ]);

    // Feedback settings state
    const [feedbackEnabled, setFeedbackEnabled] = useState<boolean>(
        storeDetails?.feedbackEnabled !== false
    );
    const [feedbackDefaults, setFeedbackDefaults] = useState({
        collectComment: storeDetails?.feedbackDefaults?.collectComment ?? true,
        collectCommentRequired: storeDetails?.feedbackDefaults?.collectCommentRequired ?? false,
        collectName: storeDetails?.feedbackDefaults?.collectName ?? false,
        collectNameRequired: storeDetails?.feedbackDefaults?.collectNameRequired ?? false,
        collectPhone: storeDetails?.feedbackDefaults?.collectPhone ?? true,
        collectPhoneRequired: storeDetails?.feedbackDefaults?.collectPhoneRequired ?? false,
        collectEmail: storeDetails?.feedbackDefaults?.collectEmail ?? true,
        collectEmailRequired: storeDetails?.feedbackDefaults?.collectEmailRequired ?? false,
    });
    const [reviewUrl, setReviewUrl] = useState<string>(
        storeDetails?.reviewUrl || ''
    );
    const businessCopyCoverage = useMemo(
        () => computeBusinessCopyCoverage(storeDetails, { includePwaShortName: FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA }),
        [storeDetails],
    );

    const scrollRefs = useRef(
        Array(20)
            .fill(0)
            .map(() => createRef<HTMLDivElement>()),
    );

    const TAB_ITEMS_LIST = [
        {
            key: "business-profile",
            label: "Business Profile",
            icon: <LuBuilding2 />,
            tab: (
                <Flex vertical gap={16} ref={scrollRefs.current[0]}>
                    <Card size="small">
                        <Typography.Title level={5} style={{ margin: 'unset' }}>
                            Business Profile
                        </Typography.Title>
                        <Typography.Text type="secondary">
                            Keep your brand, public business identity, customer-facing links, and app branding in one place.
                        </Typography.Text>
                    </Card>
                    <BasicInfoTab />
                    <LocationInfoTab />
                    <ContactPersonTab />
                    <SocialMediaTab
                        socialMedia={socialMedia}
                        setSocialMedia={setSocialMedia}
                    />
                    <OfficialPageTab
                        publicPresence={storeDetails?.publicPresence}
                        subdomain={storeDetails?.subdomain}
                        customDomain={storeDetails?.customDomain}
                        onGoogleLinkDone={() => {
                            const updates = {
                                storeId: storeDetails?.storeId,
                                publicPresence: {
                                    ...(storeDetails?.publicPresence || {}),
                                    googleLinkUpdated: true,
                                    googleLinkUpdatedAt: new Date().toISOString(),
                                },
                            };
                            updateStore(updates).then(() => {
                                setStoreDetails({
                                    ...storeDetails,
                                    publicPresence: {
                                        ...(storeDetails?.publicPresence || {}),
                                        googleLinkUpdated: true,
                                        googleLinkUpdatedAt: new Date().toISOString(),
                                    },
                                });
                            });
                        }}
                        onGoogleLinkDismiss={() => {
                            // Silently dismiss — no persistence needed
                        }}
                    />
                    {FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES ? (
                        <BusinessAttributesTab />
                    ) : null}
                    {FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA ? (
                        <CustomerAppTab />
                    ) : null}
                </Flex>
            ),
        },
        {
            key: "search-discovery",
            label: (
                <Flex align="center" gap={8}>
                    <span>Search & Discovery</span>
                    {businessCopyCoverage.missingFieldCount > 0 ? (
                        <Tag color="warning">
                            {t('businessCopyCoverageGapCount', { count: businessCopyCoverage.missingFieldCount })}
                        </Tag>
                    ) : null}
                </Flex>
            ),
            icon: <LuSearch />,
            tab: (
                <Flex vertical gap={16} ref={scrollRefs.current[1]}>
                    <Card size="small">
                        <Typography.Title level={5} style={{ margin: 'unset' }}>
                            Search & Discovery
                        </Typography.Title>
                        <Typography.Text type="secondary">
                            Manage how people find your business, what they read first, and which links carry your public presence.
                        </Typography.Text>
                    </Card>
                    <DomainSettingsTab
                        storeDetails={storeDetails}
                        onStoreUpdate={(updates) => {
                            const storeUpdate = { storeId: storeDetails.storeId, ...updates };
                            updateStore(storeUpdate).then(() => {
                                setStoreDetails({ ...storeDetails, ...updates });
                            });
                        }}
                    />
                    {FEATURE_FLAGS.ENABLE_BUSINESS_COPY_GENERATION ? (
                        <BusinessCopySetupTab
                            onApplyGeneratedCopy={async (generated, projectId) => {
                                if (!storeDetails?.storeId) return;

                                const localized = await localizeBusinessCopyResult({
                                    generated,
                                    projectId,
                                    storeDetails,
                                });
                                const nextPublicPresence = {
                                    ...(storeDetails?.publicPresence || {}),
                                    displayName: mergeLocalizedField(
                                        storeDetails?.publicPresence?.displayName,
                                        localized.displayName,
                                    ),
                                    descriptor: mergeLocalizedField(
                                        storeDetails?.publicPresence?.descriptor,
                                        localized.descriptor,
                                    ),
                                    knownFor: mergeLocalizedField(
                                        storeDetails?.publicPresence?.knownFor,
                                        localized.knownFor,
                                    ),
                                };

                                const nextStoreUpdate: any = {
                                    businessCopyMeta: buildBusinessCopyGeneratedMeta({
                                        existingMeta: storeDetails?.businessCopyMeta,
                                        includePwaShortName: FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA,
                                        projectId,
                                        sourceLanguage: resolveStoreContentLanguage(storeDetails),
                                        storeDetails,
                                    }),
                                    keywords: generated.keywords,
                                    metaDescription: mergeLocalizedField(storeDetails?.metaDescription, localized.metaDescription),
                                    metaTitle: mergeLocalizedField(storeDetails?.metaTitle, localized.metaTitle),
                                    ...(FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA && generated.pwaShortName.trim()
                                        ? {
                                            pwaSettings: {
                                                ...(storeDetails?.pwaSettings || {}),
                                                pwaShortName: mergeLocalizedField(
                                                    storeDetails?.pwaSettings?.pwaShortName,
                                                    localized.pwaShortName,
                                                ),
                                            },
                                        }
                                        : {}),
                                    publicPresence: nextPublicPresence,
                                    storeId: storeDetails.storeId,
                                    tagline: mergeLocalizedField(storeDetails?.tagline, localized.tagline),
                                };
                                await updateStore(nextStoreUpdate);

                                setStoreDetails({
                                    ...storeDetails,
                                    keywords: generated.keywords,
                                    metaDescription: nextStoreUpdate.metaDescription,
                                    metaTitle: nextStoreUpdate.metaTitle,
                                    businessCopyMeta: nextStoreUpdate.businessCopyMeta,
                                    publicPresence: nextPublicPresence,
                                    pwaSettings: {
                                        ...(storeDetails?.pwaSettings || {}),
                                        ...(FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA && generated.pwaShortName.trim()
                                            ? { pwaShortName: nextStoreUpdate.pwaSettings.pwaShortName }
                                            : {}),
                                    },
                                    tagline: nextStoreUpdate.tagline,
                                });
                            }}
                            onGenerateMissingTranslations={async (projectId) => {
                                if (!storeDetails?.storeId) return false;

                                const localized = await syncMissingBusinessCopyTranslations({
                                    includePwaShortName: FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA,
                                    projectId,
                                    storeDetails,
                                });

                                if (!localized) {
                                    return false;
                                }

                                const nextCoverage = computeBusinessCopyCoverage(storeDetails, {
                                    includePwaShortName: FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA,
                                });

                                const nextPublicPresence = {
                                    ...(storeDetails?.publicPresence || {}),
                                    displayName: mergeLocalizedField(
                                        storeDetails?.publicPresence?.displayName,
                                        localized.displayName,
                                    ),
                                    descriptor: mergeLocalizedField(
                                        storeDetails?.publicPresence?.descriptor,
                                        localized.descriptor,
                                    ),
                                    knownFor: mergeLocalizedField(
                                        storeDetails?.publicPresence?.knownFor,
                                        localized.knownFor,
                                    ),
                                };

                                const nextStoreUpdate: any = {
                                    businessCopyMeta: buildBusinessCopyRepairMeta({
                                        coverageFields: nextCoverage.fields,
                                        existingMeta: storeDetails?.businessCopyMeta,
                                        referenceLanguage: nextCoverage.referenceLanguage,
                                    }),
                                    metaDescription: mergeLocalizedField(storeDetails?.metaDescription, localized.metaDescription),
                                    metaTitle: mergeLocalizedField(storeDetails?.metaTitle, localized.metaTitle),
                                    ...(FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA
                                        ? {
                                            pwaSettings: {
                                                ...(storeDetails?.pwaSettings || {}),
                                                pwaShortName: mergeLocalizedField(
                                                    storeDetails?.pwaSettings?.pwaShortName,
                                                    localized.pwaShortName,
                                                ),
                                            },
                                        }
                                        : {}),
                                    publicPresence: nextPublicPresence,
                                    storeId: storeDetails.storeId,
                                    tagline: mergeLocalizedField(storeDetails?.tagline, localized.tagline),
                                };
                                await updateStore(nextStoreUpdate);

                                setStoreDetails({
                                    ...storeDetails,
                                    metaDescription: nextStoreUpdate.metaDescription,
                                    metaTitle: nextStoreUpdate.metaTitle,
                                    businessCopyMeta: nextStoreUpdate.businessCopyMeta,
                                    publicPresence: nextPublicPresence,
                                    pwaSettings: {
                                        ...(storeDetails?.pwaSettings || {}),
                                        ...(FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA
                                            ? { pwaShortName: nextStoreUpdate.pwaSettings.pwaShortName }
                                            : {}),
                                    },
                                    tagline: nextStoreUpdate.tagline,
                                });

                                return true;
                            }}
                            storeDetails={storeDetails}
                        />
                    ) : null}
                    <SeoTab storeDetails={storeDetails} />
                    {FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR ? (
                        <BusinessSettingsPresenceMonitorCard storeDetails={storeDetails} />
                    ) : null}
                    <IntegrationsTab
                        storeDetails={storeDetails}
                    />
                </Flex>
            ),
        },
        ...(FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? [{
            key: "digital-screens",
            label: t('digitalScreens'),
            icon: <LuTv />,
            tab: (
                <div ref={scrollRefs.current[2]}>
                    <DigitalScreenSettings />
                </div>
            ),
        }] : []),
        {
            key: "locale",
            label: t('localeSettings'),
            icon: <LuGlobe />,
            tab: (
                <LocaleSettingsTab
                    onOpenSearchDiscovery={() => scrollToSection(1)}
                    scrollRef={scrollRefs.current[FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? 3 : 2]}
                    storeDetails={storeDetails}
                />
            ),
        },
        {
            key: "hours",
            label: t('workingHours'),
            icon: <LuClock />,
            tab: (
                <WorkingHoursTab
                    scrollRef={scrollRefs.current[FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? 4 : 3]}
                    workingHours={workingHours}
                    setWorkingHours={setWorkingHours}
                    form={form}
                />
            ),
        },
        {
            key: "timeslots",
            label: t('timeSlotPresets'),
            icon: <LuTimer />,
            tab: (
                <TimeSlotPresetsTab
                    scrollRef={scrollRefs.current[FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? 5 : 4]}
                    tenantId={storeDetails?.tenantId}
                    storeId={storeDetails?.storeId}
                    presets={timeSlotPresets}
                    onPresetsChange={setTimeSlotPresets}
                />
            ),
        },
        {
            key: "analytics",
            label: t('analytics'),
            icon: <LuBarChart />,
            tab: <AnalyticsTab scrollRef={scrollRefs.current[FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? 6 : 5]} form={form} />,
        },
        {
            key: "feedback",
            label: t('feedback'),
            icon: <LuMessageSquare />,
            tab: (
                <FeedbackSettingsTab
                    scrollRef={scrollRefs.current[FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? 7 : 6]}
                    feedbackEnabled={feedbackEnabled}
                    setFeedbackEnabled={setFeedbackEnabled}
                    feedbackDefaults={feedbackDefaults}
                    setFeedbackDefaults={setFeedbackDefaults}
                    reviewUrl={reviewUrl}
                    setReviewUrl={setReviewUrl}
                />
            ),
        },
        {
            key: "pos-sync",
            label: t('posSync'),
            icon: <LuShield />,
            tab: (
                <PosSyncTab
                    scrollRef={scrollRefs.current[FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? 8 : 7]}
                    storeDetails={storeDetails}
                    onStoreUpdate={(updates) => {
                        const storeUpdate = { storeId: storeDetails.storeId, ...updates };
                        updateStore(storeUpdate).then(() => {
                            setStoreDetails({ ...storeDetails, ...updates });
                        });
                    }}
                />
            ),
        },
    ];
    scrollRefs.current = TAB_ITEMS_LIST.map(
        (_, i) => scrollRefs.current[i] ?? createRef(),
    );

    const onScrollSetActive = () => {
        scrollRefs.current?.forEach((element, index) => {
            if (element?.current?.getBoundingClientRect().top < 100) {
                setActiveSection(index);
            }
        });
    };

    const onScroll = useMemo(() => _debounce(onScrollSetActive, 500), []);

    useEffect(() => {
        const scrollContainer = document.querySelector(".scroll-container");
        if (scrollContainer) {
            scrollContainer.addEventListener("scroll", onScroll);
            return () => scrollContainer.removeEventListener("scroll", onScroll);
        }
    }, [onScroll]);

    const scrollToSection = (index: number) => {
        scrollRefs.current[index]?.current?.scrollIntoView({ behavior: "smooth" });
        setActiveSection(index);
    };

    // Initialize imageUrl from storeDetails if it exists
    useEffect(() => {
        if (storeDetails?.socialMedia) {
            setSocialMedia(sanitizeSocialMediaMap(storeDetails?.socialMedia));
        }
        if (storeDetails?.workingHours) {
            const hours = Object.entries(storeDetails?.workingHours).map(
                ([day, timeRange]) => {
                    if (timeRange) {
                        const [start, end] = (timeRange as string).split("-");
                        return {
                            day,
                            start: dayjs(`2025-04-02 ${start}`, "YYYY-MM-DD HH:mm"),
                            end: dayjs(`2025-04-02 ${end}`, "YYYY-MM-DD HH:mm"),
                        };
                    }
                    return { day, start: null, end: null };
                },
            );
            setWorkingHours(hours);
            form.setFieldsValue({ workingHours: hours });
        }

        //date format
        if (!storeDetails?.dateFormat) {
            //get cookie value
            let currentDateFormat: any = getCookie(APP_DATE_FORMAT_COOKIES_KEY);
            if (!currentDateFormat) {
                //if cookies not present then use defult value
                currentDateFormat = defaultDateFormatString;
            }

            // local format
            let isPresent = availableDateFormats.find(
                (t) => t.label == currentDateFormat,
            );
            if (!Boolean(isPresent)) {
                const [day, month, year] = currentDateFormat.split("|");
                setAvailableDateFormats([
                    { label: currentDateFormat, value: { day, month, year } },
                    ...DATE_FORMATS,
                ]);
            }
            form.setFieldsValue({ dateFormat: currentDateFormat });
        }

        //time format
        if (!storeDetails?.timeFormat) {
            //get cookie value
            let currentTimeFormat: any = getCookie(APP_TIME_FORMAT_COOKIES_KEY);
            if (!currentTimeFormat) {
                //if cookies not present then use defult value
                currentTimeFormat = defaultTimeFormatString;
            }
            form.setFieldsValue({ timeFormat: currentTimeFormat });
        }

        //timezone
        if (!storeDetails?.timeZone) {
            form.setFieldsValue({ timeZone: timezone });
        }
    }, [storeDetails, form]);

    const getFormatedWorkingHours = (workingHours: any) => {
        const updatedHours = workingHours.reduce(
            (acc, curr) => {
                // Only add the day if it has both start and end times
                if (curr.start && curr.end) {
                    acc[curr.day] =
                        `${curr.start.format("HH:mm")}-${curr.end.format("HH:mm")}`;
                }
                return acc;
            },
            {} as Record<string, string>,
        );

        // If no working hours are set, return null
        return Object.keys(updatedHours).length === 0 ? null : updatedHours;
    };

    const addUpdateDetails = async (changesToUpload: any) => {
        if (selectedFile.url) {
            changesToUpload.imageToUpdate = selectedFile.url;
            changesToUpload.imageType = selectedFile.type;
        }

        if (
            'activeLanguages' in changesToUpload
            || 'defaultLanguage' in changesToUpload
            || 'language' in changesToUpload
        ) {
            const normalizedLanguagePolicy = normalizeStoreLanguagePolicy({
                ...storeDetails,
                ...changesToUpload,
            });
            changesToUpload.activeLanguages = normalizedLanguagePolicy.activeLanguages;
            changesToUpload.defaultLanguage = normalizedLanguagePolicy.defaultLanguage;
        }

        changesToUpload.socialMedia = sanitizeSocialMediaMap(socialMedia);
        changesToUpload.workingHours = getFormatedWorkingHours(workingHours);
        const contentLanguage = resolveStoreContentLanguage(storeDetails);

        if (changesToUpload.publicPresence) {
            const currentPresence = storeDetails?.publicPresence || {};
            const localizedPresenceDrafts = changesToUpload.__localizedPublicPresenceDrafts;
            changesToUpload.publicPresence = {
                ...changesToUpload.publicPresence,
                displayName: localizedPresenceDrafts
                    ? applyLocalizedDraftMap(
                        currentPresence.displayName,
                        Object.fromEntries(Object.entries(localizedPresenceDrafts).map(([languageCode, draft]: any) => [languageCode, draft?.displayName || ''])),
                    )
                    : updateLocalizedText(
                        currentPresence.displayName,
                        changesToUpload.publicPresence.displayName,
                        contentLanguage,
                        'en',
                    ),
                descriptor: localizedPresenceDrafts
                    ? applyLocalizedDraftMap(
                        currentPresence.descriptor,
                        Object.fromEntries(Object.entries(localizedPresenceDrafts).map(([languageCode, draft]: any) => [languageCode, draft?.descriptor || ''])),
                    )
                    : updateLocalizedText(
                        currentPresence.descriptor,
                        changesToUpload.publicPresence.descriptor,
                        contentLanguage,
                        'en',
                    ),
                knownFor: localizedPresenceDrafts
                    ? applyLocalizedDraftMap(
                        currentPresence.knownFor,
                        Object.fromEntries(Object.entries(localizedPresenceDrafts).map(([languageCode, draft]: any) => [languageCode, draft?.knownFor || ''])),
                    )
                    : updateLocalizedText(
                        currentPresence.knownFor,
                        changesToUpload.publicPresence.knownFor,
                        contentLanguage,
                        'en',
                    ),
            };
        }

        changesToUpload.tagline = changesToUpload.__localizedSeoDrafts
            ? applyLocalizedDraftMap(
                storeDetails?.tagline,
                Object.fromEntries(Object.entries(changesToUpload.__localizedSeoDrafts).map(([languageCode, draft]: any) => [languageCode, draft?.tagline || ''])),
            )
            : updateLocalizedText(
                storeDetails?.tagline,
                changesToUpload.tagline,
                contentLanguage,
                'en',
            );
        changesToUpload.metaTitle = changesToUpload.__localizedSeoDrafts
            ? applyLocalizedDraftMap(
                storeDetails?.metaTitle,
                Object.fromEntries(Object.entries(changesToUpload.__localizedSeoDrafts).map(([languageCode, draft]: any) => [languageCode, draft?.metaTitle || ''])),
            )
            : updateLocalizedText(
                storeDetails?.metaTitle,
                changesToUpload.metaTitle,
                contentLanguage,
                'en',
            );
        changesToUpload.metaDescription = changesToUpload.__localizedSeoDrafts
            ? applyLocalizedDraftMap(
                storeDetails?.metaDescription,
                Object.fromEntries(Object.entries(changesToUpload.__localizedSeoDrafts).map(([languageCode, draft]: any) => [languageCode, draft?.metaDescription || ''])),
            )
            : updateLocalizedText(
                storeDetails?.metaDescription,
                changesToUpload.metaDescription,
                contentLanguage,
                'en',
            );
        if (changesToUpload.__localizedPwaShortNameDrafts) {
            changesToUpload.pwaSettings = {
                ...(storeDetails?.pwaSettings || {}),
                ...(changesToUpload.pwaSettings || {}),
                pwaShortName: applyLocalizedDraftMap(
                    storeDetails?.pwaSettings?.pwaShortName,
                    changesToUpload.__localizedPwaShortNameDrafts,
                ),
            };
        }
        delete changesToUpload.__localizedPublicPresenceDrafts;
        delete changesToUpload.__localizedSeoDrafts;
        delete changesToUpload.__localizedPwaShortNameDrafts;
        delete changesToUpload.__storeContentLanguage;

        // Feedback settings (managed as React state, not Form fields)
        changesToUpload.feedbackEnabled = feedbackEnabled;
        changesToUpload.feedbackDefaults = feedbackDefaults;
        if (reviewUrl.trim()) {
            changesToUpload.reviewUrl = reviewUrl.trim();
        } else if (storeDetails?.reviewUrl) {
            // If cleared, explicitly set to empty string so diff detects the removal
            changesToUpload.reviewUrl = '';
        }
        if (
            Boolean(storeDetails?.storeId) ||
            storeDetails?.storeId == ECOMSAI_PLATFORM_STORE_ID
        ) {
            const businessCopyFieldKeys = getBusinessCopyFieldKeysFromUpdate(changesToUpload);
            if (businessCopyFieldKeys.length > 0) {
                changesToUpload.businessCopyMeta = buildBusinessCopyManualOverrideMeta({
                    existingMeta: storeDetails?.businessCopyMeta,
                    fieldKeys: businessCopyFieldKeys,
                });
            }
            console.log("changesToUpload update request", changesToUpload);

            const updatedChanges: any = getObjectDifferance(
                changesToUpload,
                storeDetails,
            );
            if (Object.keys(updatedChanges).length > 0) {
                updatedChanges.storeId = storeDetails.storeId;
                if ("name" in updatedChanges) {
                    updatedChanges.storeKey = updatedChanges.name
                        .toLowerCase()
                        .replaceAll(" ", "_");
                }
                updateStore(updatedChanges).then((savedDetails) => {
                    // Brand propagation: if master store changed brand fields, propagate to outlets
                    if (storeDetails?.isMaster && storeDetails?.tenantId) {
                        const brandChanges = extractBrandChanges({ ...updatedChanges, ...savedDetails });
                        if (brandChanges) {
                            propagateBrandToOutlets(
                                storeDetails.tenantId,
                                storeDetails.storeId,
                                brandChanges,
                            ).catch(() => { }); // Non-blocking
                        }
                    }

                    //created new store
                    if ("name" in updatedChanges) {
                        const savedstoresList = tenantDetails.storesList;
                        const index = savedstoresList.findIndex(
                            (s) => s.storeId == storeDetails.storeId,
                        );
                        if (index != -1) {
                            console.log("stores Updated in tenant");
                            savedstoresList[index].name = updatedChanges.name;
                            const tenantData = {
                                tenantId: tenantDetails.tenantId,
                                storesList: savedstoresList,
                            };
                            updateTenantsStoreslist(tenantData).then(() => {
                                setStoreDetails({
                                    ...storeDetails,
                                    ...updatedChanges,
                                    ...savedDetails,
                                });
                            });
                        } else {
                            setStoreDetails({
                                ...storeDetails,
                                ...updatedChanges,
                                ...savedDetails,
                            });
                        }
                    } else {
                        setStoreDetails({
                            ...storeDetails,
                            ...updatedChanges,
                            ...savedDetails,
                        });
                    }
                });
            } else {
                console.log("No changes detected.");
            }
        } else {
            console.log("changesToUpload create request", changesToUpload);
            let newId = 0;
            const summary = await getPlatformSummary();
            newId = summary.stores?.count + 1;
            changesToUpload = {
                ...changesToUpload,
                storeId: newId,
                tenantId: tenantDetails.tenantId,
                storeKey: changesToUpload.name?.toLowerCase().replaceAll(" ", "_"),
                email: tenantDetails.email,
                phoneNumber: tenantDetails.phoneNumber,
                tenantName: tenantDetails.name,
            };

            addStore(changesToUpload).then((savedDetails) => {
                const tenantData = {
                    tenantId: tenantDetails.tenantId,
                    storesList: [
                        ...tenantDetails.storesList,
                        { storeId: changesToUpload.storeId, name: changesToUpload.name },
                    ],
                };
                updateTenantsStoreslist(tenantData).then(() => {
                    console.log("store details Updated in tenant");
                    setStoreDetails({ ...changesToUpload, ...savedDetails });
                });
            });
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <Card title={t('title')}>
                <Flex
                    gap={16}
                    style={{
                        width: "100%",
                        height: "calc(100vh - 120px)",
                        position: "relative",
                    }}
                >
                    <Flex
                        vertical
                        gap={16}
                        style={{
                            maxWidth: 300,
                            width: "100%",
                            height: "100%",
                            position: "sticky",
                            top: 0,
                            zIndex: 1,
                        }}
                    >
                        <Card hoverable onClick={() => fileInputRef.current.click()}>
                            <Flex
                                vertical
                                gap={16}
                                align="center"
                                style={{ cursor: "pointer" }}
                            >
                                {selectedFile.url ? (
                                    <img
                                        src={selectedFile.url}
                                        style={{ width: "auto", height: 100, borderRadius: 8 }}
                                    />
                                ) : (
                                    <>
                                        {storeDetails?.logo ? (
                                            <img
                                                src={storeDetails?.logo}
                                                style={{ width: "auto", height: 100, borderRadius: 8 }}
                                            />
                                        ) : (
                                            <Button
                                                icon={<LuUpload />}
                                                type="dashed"
                                                style={{ height: 100, width: 100 }}
                                            >
                                                {t('uploadLogo' as any)}
                                            </Button>
                                        )}
                                    </>
                                )}
                                <Typography.Text
                                    type="secondary"
                                    style={{ textAlign: "center" }}
                                >
                                    {t('uploadLogoDesc' as any)}
                                </Typography.Text>
                            </Flex>
                        </Card>
                        <Menu
                            style={{ width: "100%" }}
                            selectedKeys={[TAB_ITEMS_LIST[activeSection].key]}
                            items={TAB_ITEMS_LIST}
                            onClick={({ key }) => {
                                const index = TAB_ITEMS_LIST.findIndex(
                                    (item) => item.key === key,
                                );
                                scrollToSection(index);
                            }}
                        />
                    </Flex>
                    <Flex
                        vertical
                        style={{ width: "100%", height: "100%", overflow: "auto" }}
                    >
                        <Form
                            style={{ width: "100%" }}
                            form={form}
                            layout="vertical"
                            onFinish={addUpdateDetails}
                            initialValues={{
                                ...getBusinessSettingsInitialValues(storeDetails),
                                currencyCode: storeDetails?.currencyCode || "INR",
                                currencySymbol: storeDetails?.currencySymbol || "\u20b9",
                                country: storeDetails?.country || "India",
                                workingHours: storeDetails?.workingHours || {
                                    sun: null,
                                    mon: null,
                                    tue: null,
                                    wed: null,
                                    thu: null,
                                    fri: null,
                                    sat: null,
                                },
                            }}
                        >
                            <Flex vertical style={{ width: "100%", height: "100%" }} gap={16}>
                                {TAB_ITEMS_LIST.map((item) => (
                                    <div key={item.key}>{item.tab}</div>
                                ))}

                                <Form.Item
                                    style={{
                                        margin: "unset",
                                        position: "sticky",
                                        bottom: 10,
                                        right: 10,
                                        width: "100%",
                                        display: "flex",
                                        justifyContent: "end",
                                        alignItems: "center",
                                    }}
                                >
                                    <Space>
                                        <Button
                                            size="large"
                                            onClick={() => {
                                                form.setFieldsValue({
                                                    ...getBusinessSettingsInitialValues(storeDetails),
                                                    currencyCode: storeDetails?.currencyCode,
                                                    currencySymbol: storeDetails?.currencySymbol,
                                                    country: storeDetails?.country,
                                                });
                                                if (storeDetails?.logo) {
                                                    setSelectedFile({
                                                        name: storeDetails?.logo,
                                                        size: 0,
                                                        type: "",
                                                        url: storeDetails?.logo,
                                                    });
                                                } else {
                                                    setSelectedFile({
                                                        name: "",
                                                        size: 0,
                                                        type: "",
                                                        url: null,
                                                    });
                                                }
                                            }}
                                        >
                                            {t('reset' as any)}
                                        </Button>
                                        <Button
                                            size="large"
                                            type="primary"
                                            htmlType="submit"
                                            icon={<LuSave />}
                                        >
                                            {t('saveChanges')}
                                        </Button>
                                    </Space>
                                </Form.Item>
                            </Flex>
                        </Form>
                    </Flex>
                </Flex>
            </Card>

            <ImageUploadInput
                onUploadFile={(selectedFile: UserUploadedFileType) =>
                    setSelectedFile(selectedFile)
                }
                fileInputRef={fileInputRef}
            />
        </motion.div>
    );
}

export default BusinessSettings;
