"use client";

import { FEATURE_FLAGS } from "@config/features";
import { PERMISSIONS } from "@constant/permissions";
import { MENULIST_PLATFORM_STORE_ID } from "@constant/user";
import { getScreenState } from "@database/campaigns";
import { addStore, assertStoreUpdateSucceeded, updateStore } from "@database/stores";
import { deleteOBPPhotos } from "@database/stores/uploadOBPPhoto";
import { collectObpMediaReferences } from "@lib/media/obpMediaReferences";
import { assertTenantUpdateSucceeded, updateTenant } from "@database/tenants";
import { useAppDispatch } from "@hook/useAppDispatch";
import { _debounce } from "@hook/useDebounce";
import { getResolvedAnalyticsPreferences, normalizeGoogleSearchConsoleVerification } from "@lib/analytics/preferences";
import { resolveBusinessDayEndTime } from "@lib/analytics/businessDay";
import { parseWorkingHoursRanges, WORKING_HOURS_DAY_KEYS } from "@lib/hours/hoursEngine";
import { resolveStoreBusinessCategory } from "@data/shared/businessTypes";
import { getStoreContextName } from "@lib/businessIdentity/names";
import { normalizeGeoCoordinateDraft } from "@lib/businessIdentity/geoCoordinates";
import { getLocalizedText, getPrimaryLocalizedLanguage, getLocalizedStringList, updateLocalizedText } from "@lib/localization/text";
import { generateOBPUrl } from "@lib/obp/generateOBPUrl";
import { normalizeBusinessAttributes, normalizeCustomBusinessAttributes } from "@lib/obp/businessAttributes";
import { normalizeOwnerPublicPresenceLinks } from "@lib/obp/ownerPublicPresenceBoundary";
import { normalizePhoneNumberForStorage } from "@lib/phone/phoneNumber";
import {
    hasFeedbackPresenceReadiness,
    hasPublishedStoreMenu,
} from "@lib/menuPresence/presenceReadiness";
import { buildScreenUrl } from "@lib/screen/utils";
import localizeBusinessCopyResult, { mergeLocalizedField, mergeLocalizedKeywordField } from "@services/ai/businessCopy/localizeBusinessCopyResult";
import { buildBusinessCopyGeneratedMeta, buildBusinessCopyManualOverrideMeta, buildBusinessCopyRepairMeta, getBusinessCopyFieldKeysFromUpdate } from "@services/ai/businessCopy/metadata";
import syncMissingBusinessCopyTranslations from "@services/ai/businessCopy/syncMissingBusinessCopyTranslations";
import { computeBusinessCopyCoverage } from "@services/ai/businessCopy/translationCoverage";
import { applyLocalizedDraftMap, applyLocalizedKeywordDraftMap, getLocalizedStoreKeywords, getLocalizedStoreValue, getStoreManagedLanguages, getStorePreferredLanguage, getStoreSourceLanguage } from "@lib/localization/storeContent";
import { normalizeStoreLanguagePolicy } from "@lib/localization/languagePolicy";
import { getStoreDeepDifference, mergeStoreNestedUpdateWithCurrent } from "@lib/store/storeNestedUpdateProjection";
import { normalizeGuestFeedbackReviewUrl } from "@lib/feedback/guestFeedbackSubmitResponse";
import { hasAnyPermission } from "@lib/permissions/permissionRequirements";
import { PlatformGlobalDataContext } from "@providers/platformProviders/platformGlobalDataProvider";
import MediaImageAdjustModal from "@/components/shared/media/MediaImageAdjustModal";
import MediaImageCard from "@/components/shared/media/MediaImageCard";
import { prepareMediaImage, toPreparedUploadName, type MediaImageCropIntent } from "@lib/media/prepareMediaImage";
import { getMediaProfileAcceptAttribute } from "@lib/media/imageProfiles";
import { isDataUrl } from "@lib/media/mediaStorage";
import {
    APP_DATE_FORMAT_COOKIES_KEY,
    APP_TIME_FORMAT_COOKIES_KEY,
    DATE_FORMATS,
    defaultDateFormatString,
    defaultTimeFormatString,
} from "@lib/localization/config";
import { UserUploadedFileType } from "@type/common";
import type { StoreDataType } from "@type/platform/store";
import type { TenantDataType } from "@type/platform/tenant";
import { getUTCDate } from "@util/dateTime";
import { Button, Card, Flex, Form, Menu, Space, Tag, Typography, message } from "antd";
import { getCookie } from "cookies-next";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { motion } from "framer-motion";
import { useFormatter, useTimeZone, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
    createRef,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from "react";
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
    LuUser,
} from "react-icons/lu";
import DigitalScreenSettings from "../settings/DigitalScreenSettings";
import PresenceMonitor from "../useMenuList/PresenceMonitor";
import TempStatusCard from "./TempStatusCard";
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
import { getBoundedBusinessSettingsStringContext, logBusinessSettingsFailure } from "./utils/businessSettingsDiagnostics";
import type { UseMenuListData } from "../useMenuList/types";

dayjs.extend(customParseFormat);

interface WorkingHourSlot {
    day: string;
    start: dayjs.Dayjs | null;
    end: dayjs.Dayjs | null;
}

function buildWorkingHourSlots(workingHours?: Record<string, string>): WorkingHourSlot[] {
    return WORKING_HOURS_DAY_KEYS.map((day) => {
        const range = parseWorkingHoursRanges(workingHours?.[day])[0];
        return {
            day,
            end: range ? dayjs(`2025-04-02 ${range.endTime}`, 'YYYY-MM-DD HH:mm', true) : null,
            start: range ? dayjs(`2025-04-02 ${range.startTime}`, 'YYYY-MM-DD HH:mm', true) : null,
        };
    });
}

const BUSINESS_SETTINGS_FOCUS_SECTION: Record<string, string> = {
    'customer-link': 'search-discovery',
    'contact': 'business-profile',
    'identity': 'business-profile',
    'location': 'business-profile',
    'logo': 'business-profile',
    'official-page-actions': 'business-profile',
    'official-page-photos': 'business-profile',
    'presence-monitor': 'search-discovery',
    'temp-status': 'hours',
    'working-hours': 'hours',
};

type AdjustableUploadedFile = UserUploadedFileType & {
    crop?: MediaImageCropIntent;
    sourceDataUrl?: string;
    sourceName?: string;
};

async function deleteQueuedOBPPhotos(photoUrls: unknown, retainedPublicPresence?: unknown): Promise<string[]> {
    if (!Array.isArray(photoUrls) || photoUrls.length === 0) return [];
    return deleteOBPPhotos(photoUrls, collectObpMediaReferences(retainedPublicPresence));
}

function reconcileOBPPhotoDeleteQueue(
    currentQueue: string[],
    attemptedUrls: string[],
    failedUrls: string[],
): string[] {
    const attempted = new Set(attemptedUrls);
    return Array.from(new Set([
        ...currentQueue.filter((photoUrl) => !attempted.has(photoUrl)),
        ...failedUrls,
    ]));
}

function applyPosSyncStoreUpdates(storeDetails: any, updates: Record<string, any>) {
    const nextStoreDetails = { ...(storeDetails || {}) };
    const nextPosSync = { ...(storeDetails?.posSync || {}) };

    Object.entries(updates).forEach(([key, value]) => {
        if (key.startsWith('posSync.')) {
            nextPosSync[key.slice('posSync.'.length)] = value;
            return;
        }

        nextStoreDetails[key] = value;
    });

    return {
        ...nextStoreDetails,
        posSync: nextPosSync,
    };
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
    return getStorePreferredLanguage(storeDetails);
}

function normalizeAnalyticsSettings(analytics?: Record<string, any> | null) {
    const next = { ...(analytics || {}) };
    if (!next.googleSearchConsole && next.searchConsoleVerification) {
        next.googleSearchConsole = next.searchConsoleVerification;
    }
    const googleSearchConsole = normalizeGoogleSearchConsoleVerification(next.googleSearchConsole);
    if (googleSearchConsole) next.googleSearchConsole = googleSearchConsole;
    else delete next.googleSearchConsole;
    delete next.searchConsoleVerification;
    return next;
}

function getBusinessSettingsInitialValues(storeDetails: any) {
    const contentLanguage = resolveStoreContentLanguage(storeDetails);
    const managedLanguages = getStoreManagedLanguages(storeDetails);
    const normalizedLanguagePolicy = normalizeStoreLanguagePolicy(storeDetails);
    const analyticsPreferences = getResolvedAnalyticsPreferences(storeDetails?.analytics);
    const businessCategory = resolveStoreBusinessCategory(storeDetails?.businessType, storeDetails?.businessCategory);
    return {
        ...storeDetails,
        addressLine: storeDetails?.addressLine || storeDetails?.address || '',
        businessCategory,
        businessAttributes: normalizeBusinessAttributes(storeDetails?.businessAttributes),
        analytics: {
            ...normalizeAnalyticsSettings(storeDetails?.analytics),
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
                    knownFor: getLocalizedStoreValue(storeDetails?.publicPresence?.knownFor, languageCode, ''),
                    specialNote: getLocalizedStoreValue(storeDetails?.publicPresence?.specialNote, languageCode, ''),
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
                    keywords: getLocalizedStoreKeywords(storeDetails?.keywords, languageCode, []),
                    metaDescription: getLocalizedStoreValue(storeDetails?.metaDescription, languageCode, ''),
                    metaTitle: getLocalizedStoreValue(storeDetails?.metaTitle, languageCode, ''),
                    tagline: getLocalizedStoreValue(storeDetails?.tagline, languageCode, ''),
                },
            ]),
        ),
        __storeContentLanguage: getStorePreferredLanguage(storeDetails),
        defaultLanguage: normalizedLanguagePolicy.defaultLanguage,
        keywords: getLocalizedStoreKeywords(storeDetails?.keywords, contentLanguage, []),
        metaDescription: getLocalizedStoreValue(storeDetails?.metaDescription, contentLanguage, ''),
        metaTitle: getLocalizedStoreValue(storeDetails?.metaTitle, contentLanguage, ''),
        postalCode: storeDetails?.postalCode || storeDetails?.pincode || '',
        latitude: storeDetails?.latitude ?? storeDetails?.geo?.latitude,
        longitude: storeDetails?.longitude ?? storeDetails?.geo?.longitude,
        publicPresence: {
            ...(storeDetails?.publicPresence || {}),
            customAttributes: normalizeCustomBusinessAttributes(storeDetails?.publicPresence?.customAttributes),
            descriptor: getLocalizedStoreValue(storeDetails?.publicPresence?.descriptor, contentLanguage, ''),
            knownFor: getLocalizedStoreValue(storeDetails?.publicPresence?.knownFor, contentLanguage, ''),
            specialNote: getLocalizedStoreValue(storeDetails?.publicPresence?.specialNote, contentLanguage, ''),
            showCall: storeDetails?.publicPresence?.showCall !== false,
            showWhatsApp: storeDetails?.publicPresence?.showWhatsApp !== false,
            showDirections: storeDetails?.publicPresence?.showDirections !== false,
            showReservation: storeDetails?.publicPresence?.showReservation !== false,
            showOrder: storeDetails?.publicPresence?.showOrder !== false,
            showGoogleReview: storeDetails?.publicPresence?.showGoogleReview !== false,
            showFeedback: storeDetails?.publicPresence?.showFeedback !== false,
            showPrivacyLink: storeDetails?.publicPresence?.showPrivacyLink !== false,
            showTermsLink: storeDetails?.publicPresence?.showTermsLink !== false,
            showRefundLink: storeDetails?.publicPresence?.showRefundLink !== false,
        },
        tagline: getLocalizedStoreValue(storeDetails?.tagline, contentLanguage, ''),
    };
}

function BusinessSettingsPresenceMonitorCard({
    canAccessDigitalScreens,
    storeDetails,
}: {
    canAccessDigitalScreens: boolean;
    storeDetails: any;
}) {
    const [data, setData] = useState<UseMenuListData | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function loadPresenceData() {
            if (!storeDetails || !FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR) {
                if (isMounted) setData(null);
                return;
            }

            const obpLink = generateOBPUrl(storeDetails.subdomain || '', storeDetails.customDomain);
            const hasPublishedMenu = hasPublishedStoreMenu(storeDetails);
            let screenToken: string | null = null;

            if (canAccessDigitalScreens) {
                try {
                    const screenState = await getScreenState();
                    screenToken = screenState?.screenToken || null;
                } catch (error) {
                    logBusinessSettingsFailure('business_settings_presence_screen_links_load_failed', error, {
                        ...getBoundedBusinessSettingsStringContext('storeId', storeDetails.storeId),
                        ...getBoundedBusinessSettingsStringContext('tenantId', storeDetails.tenantId),
                        ...getBoundedBusinessSettingsStringContext('subdomain', storeDetails.subdomain),
                        ...getBoundedBusinessSettingsStringContext('customDomain', storeDetails.customDomain),
                        ...getBoundedBusinessSettingsStringContext('obpLink', obpLink),
                        hasFeedbackEnabled: storeDetails.feedbackEnabled !== false,
                        hasMenuPresence: Boolean(storeDetails.menuPresence),
                    });
                    screenToken = null;
                }
            }

            if (!isMounted) return;

            setData({
                allProjects: [],
                businessType: storeDetails.businessType || '',
                customDomain: storeDetails.customDomain || null,
                feedbackLink: '',
                feedbackQrLink: '',
                hasFeedbackEnabled: hasFeedbackPresenceReadiness({
                    feedbackEnabled: storeDetails.feedbackEnabled,
                    hasPublishedMenu,
                }),
                hasPosSync: false,
                hasPublishedMenu,
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
                screenContentVersion: null,
                screenToken,
                storeLogo: storeDetails.logo || null,
                storeName: getStoreContextName(storeDetails, 'Your Business'),
                subdomain: storeDetails.subdomain || '',
            });
        }

        void loadPresenceData();

        return () => {
            isMounted = false;
        };
    }, [
        canAccessDigitalScreens,
        storeDetails?.businessType,
        storeDetails?.customDomain,
        storeDetails?.feedbackEnabled,
        storeDetails?.lastPublishedAt,
        storeDetails?.logo,
        storeDetails?.name,
        storeDetails?.storeId,
        storeDetails?.storeName,
        storeDetails?.subdomain,
        storeDetails?.tenantId,
        storeDetails?.tenantName,
    ]);

    if (!FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR || !storeDetails || !data) {
        return null;
    }

    return (
        <PresenceMonitor
            data={data}
            storeDetails={storeDetails}
        />
    );
}

type BusinessSettingsProps = {
    setStoreDetails: (updatedStore?: StoreDataType | null) => void;
    storeDetails: StoreDataType | null;
    tenantDetails: TenantDataType | null;
};

type BusinessSettingsContentProps = {
    setStoreDetails: Dispatch<SetStateAction<StoreDataType>>;
    storeDetails: StoreDataType;
    tenantDetails: TenantDataType;
};

function BusinessSettingsContent({ storeDetails, setStoreDetails, tenantDetails }: BusinessSettingsContentProps) {
    const { userPermissions } = useContext(PlatformGlobalDataContext);
    const canAccessDigitalScreens = FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED
        && hasAnyPermission(userPermissions, [PERMISSIONS.MANAGE_DIGITAL_SCREENS]);
    const t = useTranslations('BusinessSettings');
    const searchParams = useSearchParams();
    const format = useFormatter();
    const now = getUTCDate().newDate;
    const [form] = Form.useForm();
    const timezone = useTimeZone();
    const dispatch = useAppDispatch();
    const [availableDateFormats, setAvailableDateFormats] =
        useState(DATE_FORMATS);
    const [selectedFile, setSelectedFile] = useState<AdjustableUploadedFile>({
        name: "",
        size: 0,
        type: "",
        url: undefined,
    });
    const [isLogoAdjustOpen, setIsLogoAdjustOpen] = useState(false);
    const [activeSection, setActiveSection] = useState(0);
    const businessSettingsScopeKey = `${String(storeDetails?.tenantId ?? '')}::${String(storeDetails?.storeId ?? '')}`;
    const activeBusinessSettingsScopeRef = useRef(businessSettingsScopeKey);
    const componentActiveRef = useRef(true);
    const settingsSaveInFlightRef = useRef(false);
    const [isSettingsSaving, setIsSettingsSaving] = useState(false);
    const obpPhotoDeleteQueueRef = useRef<string[]>([]);
    const persistedPublicPresenceRef = useRef(storeDetails?.publicPresence);
    const [socialMedia, setSocialMedia] = useState<Record<string, string>>({});
    const [timeSlotPresets, setTimeSlotPresets] = useState(
        storeDetails?.timeSlotPresets || [],
    );
    const [workingHoursDirty, setWorkingHoursDirty] = useState(false);
    const [workingHoursDirtyDays, setWorkingHoursDirtyDays] = useState<string[]>([]);
    activeBusinessSettingsScopeRef.current = businessSettingsScopeKey;
    useEffect(() => {
        componentActiveRef.current = true;
        return () => {
            componentActiveRef.current = false;
        };
    }, []);
    const updatePosSyncStoreState = useCallback((updates: Record<string, any>) => {
        setStoreDetails((previous: any) => applyPosSyncStoreUpdates(previous || {}, updates));
    }, [setStoreDetails]);

    const [workingHours, setWorkingHours] = useState<WorkingHourSlot[]>(() => (
        buildWorkingHourSlots(storeDetails?.workingHours)
    ));

    const handleLogoSelect = async (file: File) => {
        try {
            const prepared = await prepareMediaImage(file, 'businessLogo');
            setSelectedFile({
                blob: prepared.blob,
                crop: prepared.crop,
                mediaChecksum: prepared.checksum,
                mediaId: prepared.mediaId,
                mediaProfile: 'businessLogo',
                mediaVariant: prepared.primaryVariant,
                mediaVersion: prepared.version,
                name: toPreparedUploadName(file.name, prepared.mimeType, file.name),
                preparedMedia: prepared,
                size: prepared.sizeBytes,
                sourceDataUrl: prepared.sourceDataUrl,
                sourceName: prepared.sourceName,
                type: prepared.mimeType,
                url: prepared.dataUrl,
            });
        } catch (error) {
            logBusinessSettingsFailure('business_settings_logo_prepare_failed', error, {
                ...getBoundedBusinessSettingsStringContext('tenantId', storeDetails?.tenantId),
                ...getBoundedBusinessSettingsStringContext('storeId', storeDetails?.storeId),
                ...getBoundedBusinessSettingsStringContext('fileName', file.name),
            });
            message.error('Could not prepare logo.');
        }
    };

    const handleOBPPhotoDeleteQueued = (photoUrl: string) => {
        if (!photoUrl || photoUrl.startsWith('data:')) return;
        if (obpPhotoDeleteQueueRef.current.includes(photoUrl)) return;
        obpPhotoDeleteQueueRef.current = [...obpPhotoDeleteQueueRef.current, photoUrl];
    };

    useEffect(() => {
        persistedPublicPresenceRef.current = storeDetails?.publicPresence;
    }, [storeDetails?.publicPresence]);

    useEffect(() => () => {
        if (obpPhotoDeleteQueueRef.current.length === 0) return;
        void deleteQueuedOBPPhotos(
            obpPhotoDeleteQueueRef.current,
            persistedPublicPresenceRef.current,
        );
    }, []);

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
    const publicTruthFocusRefs = useRef({
        basicInfo: createRef<HTMLDivElement>(),
        contactInfo: createRef<HTMLDivElement>(),
        domainSettings: createRef<HTMLDivElement>(),
        locationInfo: createRef<HTMLDivElement>(),
        logo: createRef<HTMLDivElement>(),
        officialPage: createRef<HTMLDivElement>(),
        officialPageActions: createRef<HTMLDivElement>(),
        officialPagePhotos: createRef<HTMLDivElement>(),
        presenceMonitor: createRef<HTMLDivElement>(),
        tempStatus: createRef<HTMLDivElement>(),
    });

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
                    <BasicInfoTab scrollRef={publicTruthFocusRefs.current.basicInfo} />
                    <LocationInfoTab scrollRef={publicTruthFocusRefs.current.locationInfo} />
                    <ContactPersonTab scrollRef={publicTruthFocusRefs.current.contactInfo} />
                    <SocialMediaTab
                        socialMedia={socialMedia}
                        setSocialMedia={setSocialMedia}
                    />
                    <OfficialPageTab
                        actionsScrollRef={publicTruthFocusRefs.current.officialPageActions}
                        businessCategory={storeDetails?.businessCategory}
                        businessType={storeDetails?.businessType}
                        photosScrollRef={publicTruthFocusRefs.current.officialPagePhotos}
                        publicPresence={storeDetails?.publicPresence}
                        subdomain={storeDetails?.subdomain}
                        customDomain={storeDetails?.customDomain}
                        onGoogleLinkDone={async () => {
                            const googleLinkUpdatedAt = new Date().toISOString();
                            const nextPublicPresence = {
                                ...(storeDetails?.publicPresence || {}),
                                googleLinkUpdated: true,
                                googleLinkUpdatedAt,
                            };
                            const updates = {
                                storeId: storeDetails?.storeId,
                                publicPresence: {
                                    googleLinkUpdated: true,
                                    googleLinkUpdatedAt,
                                },
                            };
                            try {
                                const writeResult = await updateStore(updates);
                                assertStoreUpdateSucceeded(
                                    writeResult,
                                    storeDetails?.storeId,
                                    'desktop_official_page_google_link_store_update_rejected',
                                );
                                setStoreDetails((previous: any) => ({
                                    ...(previous || storeDetails),
                                    publicPresence: {
                                        ...((previous || storeDetails)?.publicPresence || {}),
                                        googleLinkUpdated: true,
                                        googleLinkUpdatedAt,
                                    },
                                }));
                            } catch (error) {
                                logBusinessSettingsFailure('desktop_official_page_google_link_update_failed', error, {
                                    surface: 'business_settings_official_page',
                                    action: 'mark_google_link_done',
                                    googleLinkUpdated: storeDetails?.publicPresence?.googleLinkUpdated === true,
                                    ...getBoundedBusinessSettingsStringContext('storeId', storeDetails?.storeId),
                                    ...getBoundedBusinessSettingsStringContext('tenantId', storeDetails?.tenantId),
                                    ...getBoundedBusinessSettingsStringContext('subdomain', storeDetails?.subdomain),
                                    ...getBoundedBusinessSettingsStringContext('customDomain', storeDetails?.customDomain),
                                });
                                message.error('Could not save');
                            }
                        }}
                        onGoogleLinkDismiss={() => {
                            // Silently dismiss — no persistence needed
                        }}
                        onPhotoDeleteQueued={handleOBPPhotoDeleteQueued}
                        scrollRef={publicTruthFocusRefs.current.officialPage}
                    />
                    {FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES ? (
                        <BusinessAttributesTab />
                    ) : null}
                    {FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA ? (
                        <CustomerAppTab
                            key={`${String(storeDetails?.tenantId ?? '')}:${String(storeDetails?.storeId ?? '')}`}
                        />
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
                        key={`${String(storeDetails?.tenantId ?? '')}:${String(storeDetails?.storeId ?? '')}`}
                        scrollRef={publicTruthFocusRefs.current.domainSettings}
                        storeDetails={storeDetails}
                        onStoreStateUpdate={(updates) => {
                            const expectedTenantId = storeDetails?.tenantId;
                            const expectedStoreId = storeDetails?.storeId;
                            setStoreDetails((previous: any) => {
                                if (
                                    String(previous?.tenantId ?? '') !== String(expectedTenantId ?? '')
                                    || String(previous?.storeId ?? '') !== String(expectedStoreId ?? '')
                                ) {
                                    return previous;
                                }
                                return { ...previous, ...updates };
                            });
                        }}
                        onStoreUpdate={async (updates) => {
                            const expectedTenantId = storeDetails?.tenantId;
                            const expectedStoreId = storeDetails?.storeId;
                            const storeUpdate = { storeId: expectedStoreId, ...updates };
                            const writeResult = await updateStore(storeUpdate);
                            assertStoreUpdateSucceeded(
                                writeResult,
                                expectedStoreId,
                                'desktop_domain_settings_subdomain_store_update_rejected',
                            );
                            setStoreDetails((previous: any) => {
                                if (
                                    String(previous?.tenantId ?? '') !== String(expectedTenantId ?? '')
                                    || String(previous?.storeId ?? '') !== String(expectedStoreId ?? '')
                                ) {
                                    return previous;
                                }
                                return { ...previous, ...updates };
                            });
                        }}
                    />
                    {FEATURE_FLAGS.ENABLE_BUSINESS_COPY_GENERATION ? (
                        <BusinessCopySetupTab
                            key={`business-copy:${String(storeDetails?.tenantId ?? '')}:${String(storeDetails?.storeId ?? '')}`}
                            onApplyGeneratedCopy={async (generated, projectId) => {
                                const expectedStoreDetails = storeDetails;
                                const expectedTenantId = expectedStoreDetails?.tenantId;
                                const expectedStoreId = expectedStoreDetails?.storeId;
                                const expectedScopeKey = `${String(expectedTenantId ?? '')}::${String(expectedStoreId ?? '')}`;
                                if (!expectedStoreId) {
                                    throw new Error('business_copy_store_scope_missing');
                                }

                                const localized = await localizeBusinessCopyResult({
                                    generated,
                                    projectId,
                                    storeDetails: expectedStoreDetails,
                                });
                                if (activeBusinessSettingsScopeRef.current !== expectedScopeKey) {
                                    return { translationIncomplete: true };
                                }
                                const nextPublicPresence = {
                                    ...(expectedStoreDetails?.publicPresence || {}),
                                    descriptor: mergeLocalizedField(
                                        expectedStoreDetails?.publicPresence?.descriptor,
                                        localized.descriptor,
                                    ),
                                    knownFor: mergeLocalizedField(
                                        expectedStoreDetails?.publicPresence?.knownFor,
                                        localized.knownFor,
                                    ),
                                    specialNote: mergeLocalizedField(
                                        expectedStoreDetails?.publicPresence?.specialNote,
                                        localized.specialNote,
                                    ),
                                };

                                const nextStoreUpdate: any = {
                                    businessCopyMeta: buildBusinessCopyGeneratedMeta({
                                        existingMeta: expectedStoreDetails?.businessCopyMeta,
                                        includePwaShortName: FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA,
                                        projectId,
                                        sourceLanguage: getStoreSourceLanguage(),
                                        storeDetails: expectedStoreDetails,
                                    }),
                                    keywords: mergeLocalizedKeywordField(expectedStoreDetails?.keywords, localized.keywords),
                                    metaDescription: mergeLocalizedField(expectedStoreDetails?.metaDescription, localized.metaDescription),
                                    metaTitle: mergeLocalizedField(expectedStoreDetails?.metaTitle, localized.metaTitle),
                                    ...(FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA && generated.pwaShortName.trim()
                                        ? {
                                            pwaSettings: {
                                                ...(expectedStoreDetails?.pwaSettings || {}),
                                                pwaShortName: mergeLocalizedField(
                                                    expectedStoreDetails?.pwaSettings?.pwaShortName,
                                                    localized.pwaShortName,
                                                ),
                                            },
                                        }
                                        : {}),
                                    publicPresence: nextPublicPresence,
                                    storeId: expectedStoreId,
                                    tagline: mergeLocalizedField(expectedStoreDetails?.tagline, localized.tagline),
                                };
                                const writeResult = await updateStore({
                                    ...getStoreDeepDifference(nextStoreUpdate, expectedStoreDetails),
                                    storeId: expectedStoreId,
                                });
                                assertStoreUpdateSucceeded(
                                    writeResult,
                                    expectedStoreId,
                                    'desktop_business_copy_store_update_rejected',
                                );

                                setStoreDetails((previous: any) => (
                                    String(previous?.tenantId ?? '') === String(expectedTenantId ?? '')
                                    && String(previous?.storeId ?? '') === String(expectedStoreId ?? '')
                                        ? {
                                            ...previous,
                                            keywords: nextStoreUpdate.keywords,
                                            metaDescription: nextStoreUpdate.metaDescription,
                                            metaTitle: nextStoreUpdate.metaTitle,
                                            businessCopyMeta: nextStoreUpdate.businessCopyMeta,
                                            publicPresence: {
                                                ...(previous?.publicPresence || {}),
                                                descriptor: nextPublicPresence.descriptor,
                                                knownFor: nextPublicPresence.knownFor,
                                                specialNote: nextPublicPresence.specialNote,
                                            },
                                            pwaSettings: {
                                                ...(previous?.pwaSettings || {}),
                                                ...(FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA && generated.pwaShortName.trim()
                                                    ? { pwaShortName: nextStoreUpdate.pwaSettings.pwaShortName }
                                                    : {}),
                                            },
                                            tagline: nextStoreUpdate.tagline,
                                        }
                                        : previous
                                ));
                                return { translationIncomplete: localized.translationIncomplete === true };
                            }}
                            onGenerateMissingTranslations={async (projectId) => {
                                const expectedStoreDetails = storeDetails;
                                const expectedTenantId = expectedStoreDetails?.tenantId;
                                const expectedStoreId = expectedStoreDetails?.storeId;
                                const expectedScopeKey = `${String(expectedTenantId ?? '')}::${String(expectedStoreId ?? '')}`;
                                if (!expectedStoreId) return false;

                                const localized = await syncMissingBusinessCopyTranslations({
                                    includePwaShortName: FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA,
                                    projectId,
                                    storeDetails: expectedStoreDetails,
                                });
                                if (activeBusinessSettingsScopeRef.current !== expectedScopeKey) {
                                    return false;
                                }

                                if (!localized) {
                                    return false;
                                }

                                const nextCoverage = computeBusinessCopyCoverage(expectedStoreDetails, {
                                    includePwaShortName: FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA,
                                });

                                const nextPublicPresence = {
                                    ...(expectedStoreDetails?.publicPresence || {}),
                                    descriptor: mergeLocalizedField(
                                        expectedStoreDetails?.publicPresence?.descriptor,
                                        localized.descriptor,
                                    ),
                                    knownFor: mergeLocalizedField(
                                        expectedStoreDetails?.publicPresence?.knownFor,
                                        localized.knownFor,
                                    ),
                                    specialNote: mergeLocalizedField(
                                        expectedStoreDetails?.publicPresence?.specialNote,
                                        localized.specialNote,
                                    ),
                                };

                                const nextStoreUpdate: any = {
                                    businessCopyMeta: buildBusinessCopyRepairMeta({
                                        coverageFields: nextCoverage.fields,
                                        existingMeta: expectedStoreDetails?.businessCopyMeta,
                                        referenceLanguage: nextCoverage.referenceLanguage,
                                    }),
                                    metaDescription: mergeLocalizedField(expectedStoreDetails?.metaDescription, localized.metaDescription),
                                    metaTitle: mergeLocalizedField(expectedStoreDetails?.metaTitle, localized.metaTitle),
                                    keywords: mergeLocalizedKeywordField(expectedStoreDetails?.keywords, localized.keywords),
                                    ...(FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA
                                        ? {
                                            pwaSettings: {
                                                ...(expectedStoreDetails?.pwaSettings || {}),
                                                pwaShortName: mergeLocalizedField(
                                                    expectedStoreDetails?.pwaSettings?.pwaShortName,
                                                    localized.pwaShortName,
                                                ),
                                            },
                                        }
                                        : {}),
                                    publicPresence: nextPublicPresence,
                                    storeId: expectedStoreId,
                                    tagline: mergeLocalizedField(expectedStoreDetails?.tagline, localized.tagline),
                                };
                                const writeResult = await updateStore({
                                    ...getStoreDeepDifference(nextStoreUpdate, expectedStoreDetails),
                                    storeId: expectedStoreId,
                                });
                                assertStoreUpdateSucceeded(
                                    writeResult,
                                    expectedStoreId,
                                    'desktop_business_copy_translation_store_update_rejected',
                                );

                                setStoreDetails((previous: any) => (
                                    String(previous?.tenantId ?? '') === String(expectedTenantId ?? '')
                                    && String(previous?.storeId ?? '') === String(expectedStoreId ?? '')
                                        ? {
                                            ...previous,
                                            keywords: nextStoreUpdate.keywords,
                                            metaDescription: nextStoreUpdate.metaDescription,
                                            metaTitle: nextStoreUpdate.metaTitle,
                                            businessCopyMeta: nextStoreUpdate.businessCopyMeta,
                                            publicPresence: {
                                                ...(previous?.publicPresence || {}),
                                                descriptor: nextPublicPresence.descriptor,
                                                knownFor: nextPublicPresence.knownFor,
                                                specialNote: nextPublicPresence.specialNote,
                                            },
                                            pwaSettings: {
                                                ...(previous?.pwaSettings || {}),
                                                ...(FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA
                                                    ? { pwaShortName: nextStoreUpdate.pwaSettings.pwaShortName }
                                                    : {}),
                                            },
                                            tagline: nextStoreUpdate.tagline,
                                        }
                                        : previous
                                ));

                                return true;
                            }}
                            storeDetails={storeDetails}
                        />
                    ) : null}
                    <SeoTab storeDetails={storeDetails} />
                    {FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR ? (
                        <div ref={publicTruthFocusRefs.current.presenceMonitor}>
                            <BusinessSettingsPresenceMonitorCard
                                canAccessDigitalScreens={canAccessDigitalScreens}
                                storeDetails={storeDetails}
                            />
                        </div>
                    ) : null}
                    <IntegrationsTab
                        key={`integrations:${String(storeDetails?.tenantId ?? '')}:${String(storeDetails?.storeId ?? '')}`}
                        setStoreDetails={setStoreDetails}
                        storeDetails={storeDetails}
                    />
                </Flex>
            ),
        },
        ...(canAccessDigitalScreens ? [{
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
                    scrollRef={scrollRefs.current[canAccessDigitalScreens ? 3 : 2]}
                    storeDetails={storeDetails}
                />
            ),
        },
        {
            key: "hours",
            label: t('workingHours'),
            icon: <LuClock />,
            tab: (
                <Flex vertical gap={16} ref={scrollRefs.current[canAccessDigitalScreens ? 4 : 3]}>
                    <WorkingHoursTab
                        workingHours={workingHours}
                        setWorkingHours={(hours) => {
                            const changedDays = hours
                                .filter((nextSlot) => {
                                    const currentSlot = workingHours.find((entry) => entry.day === nextSlot.day);
                                    const currentValue = currentSlot?.start && currentSlot.end
                                        ? `${currentSlot.start.format('HH:mm')}-${currentSlot.end.format('HH:mm')}`
                                        : '';
                                    const nextValue = nextSlot.start && nextSlot.end
                                        ? `${nextSlot.start.format('HH:mm')}-${nextSlot.end.format('HH:mm')}`
                                        : '';
                                    return currentValue !== nextValue;
                                })
                                .map((slot) => slot.day);
                            setWorkingHours(hours);
                            if (changedDays.length) {
                                setWorkingHoursDirty(true);
                                setWorkingHoursDirtyDays((previous) => Array.from(new Set([...previous, ...changedDays])));
                            }
                        }}
                        form={form}
                    />
                    {FEATURE_FLAGS.ENABLE_TEMP_STATUS ? (
                        <div ref={publicTruthFocusRefs.current.tempStatus}>
                            <TempStatusCard
                                setStoreDetails={(update) => setStoreDetails((current) => {
                                    const next = typeof update === 'function' ? update(current) : update;
                                    return next || current;
                                })}
                                storeDetails={storeDetails}
                            />
                        </div>
                    ) : null}
                </Flex>
            ),
        },
        {
            key: "timeslots",
            label: t('timeSlotPresets'),
            icon: <LuTimer />,
            tab: (
                <TimeSlotPresetsTab
                    key={`time-slot-presets:${String(storeDetails?.tenantId ?? '')}:${String(storeDetails?.storeId ?? '')}`}
                    scrollRef={scrollRefs.current[canAccessDigitalScreens ? 5 : 4]}
                    tenantId={storeDetails?.tenantId}
                    storeId={storeDetails?.storeId}
                    presets={timeSlotPresets}
                    pendingCascade={storeDetails?.timeSlotPresetCascadePending}
                    onCascadeRecovered={(operationId) => {
                        const expectedTenantId = storeDetails?.tenantId;
                        const expectedStoreId = storeDetails?.storeId;
                        setStoreDetails((previous: any) => {
                            if (
                                String(previous?.tenantId ?? '') !== String(expectedTenantId ?? '')
                                || String(previous?.storeId ?? '') !== String(expectedStoreId ?? '')
                                || previous?.timeSlotPresetCascadePending?.operationId !== operationId
                            ) {
                                return previous;
                            }
                            const { timeSlotPresetCascadePending: _pendingCascade, ...rest } = previous;
                            return rest;
                        });
                    }}
                    onPresetsChange={(presets) => {
                        const expectedTenantId = storeDetails?.tenantId;
                        const expectedStoreId = storeDetails?.storeId;
                        if (activeBusinessSettingsScopeRef.current !== `${String(expectedTenantId ?? '')}::${String(expectedStoreId ?? '')}`) {
                            return;
                        }
                        setTimeSlotPresets(presets);
                        setStoreDetails((previous: any) => (
                            String(previous?.tenantId ?? '') === String(expectedTenantId ?? '')
                            && String(previous?.storeId ?? '') === String(expectedStoreId ?? '')
                                ? { ...previous, timeSlotPresets: presets }
                                : previous
                        ));
                    }}
                />
            ),
        },
        {
            key: "analytics",
            label: t('analytics'),
            icon: <LuBarChart />,
            tab: <AnalyticsTab scrollRef={scrollRefs.current[canAccessDigitalScreens ? 6 : 5]} form={form} />,
        },
        {
            key: "feedback",
            label: t('feedback'),
            icon: <LuMessageSquare />,
            tab: (
                <FeedbackSettingsTab
                    scrollRef={scrollRefs.current[canAccessDigitalScreens ? 7 : 6]}
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
                    key={`${String(storeDetails?.tenantId ?? '')}:${String(storeDetails?.storeId ?? '')}`}
                    scrollRef={scrollRefs.current[canAccessDigitalScreens ? 8 : 7]}
                    storeDetails={storeDetails}
                    onStoreStateUpdate={updatePosSyncStoreState}
                    onStoreUpdate={async (updates) => {
                        const expectedTenantId = storeDetails?.tenantId;
                        const expectedStoreId = storeDetails?.storeId;
                        const storeUpdate = { storeId: storeDetails.storeId, ...updates };
                        const writeResult = await updateStore(storeUpdate);
                        assertStoreUpdateSucceeded(
                            writeResult,
                            expectedStoreId,
                            'desktop_pos_sync_store_update_rejected',
                        );
                        setStoreDetails((previous: any) => {
                            if (
                                String(previous?.tenantId ?? '') !== String(expectedTenantId ?? '')
                                || String(previous?.storeId ?? '') !== String(expectedStoreId ?? '')
                            ) {
                                return previous;
                            }
                            return applyPosSyncStoreUpdates(previous || storeDetails, updates);
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
            if ((element?.current?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY) < 100) {
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

    useEffect(() => {
        const sectionParam = searchParams?.get('section') || '';
        const focusParam = searchParams?.get('focus') || '';
        const targetSectionKey = sectionParam || BUSINESS_SETTINGS_FOCUS_SECTION[focusParam];
        if (!targetSectionKey) return;

        const targetSectionIndex = TAB_ITEMS_LIST.findIndex((item) => item.key === targetSectionKey);
        if (targetSectionIndex < 0) return;

        const focusRef = focusParam === 'customer-link'
            ? publicTruthFocusRefs.current.domainSettings
            : focusParam === 'identity'
                ? publicTruthFocusRefs.current.basicInfo
                : focusParam === 'contact'
                    ? publicTruthFocusRefs.current.contactInfo
                    : focusParam === 'location'
                        ? publicTruthFocusRefs.current.locationInfo
                        : focusParam === 'logo'
                            ? publicTruthFocusRefs.current.logo
                            : focusParam === 'official-page-actions'
                                ? publicTruthFocusRefs.current.officialPageActions
                                : focusParam === 'official-page-photos'
                                    ? publicTruthFocusRefs.current.officialPagePhotos
                                    : focusParam === 'presence-monitor'
                                        ? publicTruthFocusRefs.current.presenceMonitor
                                        : focusParam === 'temp-status'
                                            ? publicTruthFocusRefs.current.tempStatus
                                            : null;

        window.setTimeout(() => {
            setActiveSection(targetSectionIndex);
            const target = focusRef?.current || scrollRefs.current[targetSectionIndex]?.current;
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }, [searchParams]);

    // Initialize imageUrl from storeDetails if it exists
    useEffect(() => {
        if (storeDetails?.socialMedia) {
            setSocialMedia(sanitizeSocialMediaMap(storeDetails?.socialMedia));
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
        if (!storeDetails?.businessDayEndTime) {
            form.setFieldsValue({ businessDayEndTime: resolveBusinessDayEndTime(storeDetails?.businessType, undefined, storeDetails?.businessCategory) });
        }
    }, [storeDetails, form]);

    useEffect(() => {
        const hours = buildWorkingHourSlots(storeDetails?.workingHours);
        setWorkingHours(hours);
        setWorkingHoursDirty(false);
        setWorkingHoursDirtyDays([]);
        form.setFieldValue('workingHours', storeDetails?.workingHours || null);
    }, [form, storeDetails?.storeId, storeDetails?.workingHours]);

    useEffect(() => {
        setTimeSlotPresets(storeDetails?.timeSlotPresets || []);
    }, [storeDetails?.storeId, storeDetails?.timeSlotPresets]);

    const getFormatedWorkingHours = (hours: WorkingHourSlot[]) => {
        const updatedHours = { ...(storeDetails?.workingHours || {}) } as Record<string, string>;
        workingHoursDirtyDays.forEach((day) => {
            const slot = hours.find((entry) => entry.day === day);
            if (slot?.start && slot.end) {
                updatedHours[day] = `${slot.start.format('HH:mm')}-${slot.end.format('HH:mm')}`;
            } else {
                delete updatedHours[day];
            }
        });

        // If no working hours are set, return null
        return Object.keys(updatedHours).length === 0 ? null : updatedHours;
    };

    const addUpdateDetails = async (changesToUpload: any) => {
        const requestScopeKey = businessSettingsScopeKey;
        if (
            settingsSaveInFlightRef.current
            || !componentActiveRef.current
            || activeBusinessSettingsScopeRef.current !== requestScopeKey
        ) {
            return;
        }
        settingsSaveInFlightRef.current = true;
        setIsSettingsSaving(true);
        try {
        const trimmedReviewUrl = reviewUrl.trim();
        const storedReviewUrl = typeof storeDetails?.reviewUrl === 'string'
            ? storeDetails.reviewUrl.trim()
            : '';
        const reviewUrlChanged = trimmedReviewUrl !== storedReviewUrl;
        const normalizedReviewUrl = trimmedReviewUrl
            ? normalizeGuestFeedbackReviewUrl(trimmedReviewUrl, 'business_settings_review_url')
            : null;
        if (reviewUrlChanged && trimmedReviewUrl && !normalizedReviewUrl) {
            message.error('Enter a valid HTTPS Google review link before saving.');
            return;
        }

        const obpPhotoDeleteQueue = [...obpPhotoDeleteQueueRef.current];
        delete changesToUpload.__obpPhotoDeleteQueue;

        if (typeof changesToUpload.tenantName === 'string') {
            changesToUpload.tenantName = changesToUpload.tenantName.trim();
        }
        if (typeof changesToUpload.name === 'string') {
            changesToUpload.name = changesToUpload.name.trim();
        }

        if (isDataUrl(selectedFile.url)) {
            changesToUpload.imageToUpdate = selectedFile.url;
            changesToUpload.imageType = selectedFile.type;
            changesToUpload.preparedMedia = selectedFile.preparedMedia;
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
        if (workingHoursDirty) {
            changesToUpload.workingHours = getFormatedWorkingHours(workingHours);
        } else {
            delete changesToUpload.workingHours;
        }
        if (changesToUpload.analytics) {
            changesToUpload.analytics = normalizeAnalyticsSettings(changesToUpload.analytics);
        }
        const latitudeInput = changesToUpload.latitude;
        const longitudeInput = changesToUpload.longitude;
        delete changesToUpload.latitude;
        delete changesToUpload.longitude;
        if (latitudeInput !== undefined || longitudeInput !== undefined) {
            const normalizedGeo = normalizeGeoCoordinateDraft(latitudeInput, longitudeInput);
            if (!normalizedGeo.ok) {
                message.error('Enter both latitude and longitude using valid map coordinates.');
                return;
            }
            if (normalizedGeo.geo || storeDetails?.geo) {
                changesToUpload.geo = normalizedGeo.geo;
            }
        }
        const contentLanguage = resolveStoreContentLanguage(storeDetails);

        if (changesToUpload.publicPresence) {
            const currentPresence = storeDetails?.publicPresence || {};
            const localizedPresenceDrafts = changesToUpload.__localizedPublicPresenceDrafts;
            changesToUpload.publicPresence = {
                ...changesToUpload.publicPresence,
                customAttributes: Array.isArray(changesToUpload.publicPresence.customAttributes)
                    ? normalizeCustomBusinessAttributes(changesToUpload.publicPresence.customAttributes)
                    : changesToUpload.publicPresence.customAttributes,
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
                specialNote: localizedPresenceDrafts
                    ? applyLocalizedDraftMap(
                        currentPresence.specialNote,
                        Object.fromEntries(Object.entries(localizedPresenceDrafts).map(([languageCode, draft]: any) => [languageCode, draft?.specialNote || ''])),
                    )
                    : updateLocalizedText(
                        currentPresence.specialNote,
                        changesToUpload.publicPresence.specialNote,
                        contentLanguage,
                        'en',
                    ),
            };
            const normalizedLinks = normalizeOwnerPublicPresenceLinks(changesToUpload.publicPresence);
            if (normalizedLinks.invalidKeys.length > 0) {
                message.error('Enter valid HTTPS public-page links before saving.');
                return;
            }
            changesToUpload.publicPresence = normalizedLinks.presence;
        }

        if (
            changesToUpload.phoneNumber !== undefined
            || changesToUpload.countryCode !== undefined
            || changesToUpload.dialCode !== undefined
        ) {
            const normalizedPhone = normalizePhoneNumberForStorage({
                countryCode: changesToUpload.countryCode ?? storeDetails?.countryCode,
                dialCode: changesToUpload.dialCode ?? storeDetails?.dialCode,
                phoneNumber: changesToUpload.phoneNumber ?? storeDetails?.phoneNumber,
            });
            changesToUpload.countryCode = normalizedPhone.phone ? normalizedPhone.countryCode : changesToUpload.countryCode;
            changesToUpload.dialCode = normalizedPhone.phone ? normalizedPhone.dialCode : changesToUpload.dialCode;
            changesToUpload.phone = normalizedPhone.phone;
            changesToUpload.phoneNumber = normalizedPhone.phoneNumber;
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
        changesToUpload.keywords = changesToUpload.__localizedSeoDrafts
            ? applyLocalizedKeywordDraftMap(
                storeDetails?.keywords,
                Object.fromEntries(
                    Object.entries(changesToUpload.__localizedSeoDrafts).map(([languageCode, draft]: any) => [
                        languageCode,
                        Array.isArray(draft?.keywords)
                            ? draft.keywords
                            : [],
                    ]),
                ),
            )
            : getLocalizedStringList(storeDetails?.keywords, contentLanguage, getPrimaryLocalizedLanguage(storeDetails?.keywords, contentLanguage), []);
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
        if (reviewUrlChanged && normalizedReviewUrl) {
            changesToUpload.reviewUrl = normalizedReviewUrl;
        } else if (reviewUrlChanged && storedReviewUrl) {
            // If cleared, explicitly set to empty string so diff detects the removal
            changesToUpload.reviewUrl = '';
        }
        if (
            Boolean(storeDetails?.storeId) ||
            storeDetails?.storeId == MENULIST_PLATFORM_STORE_ID
        ) {
            const businessCopyFieldKeys = getBusinessCopyFieldKeysFromUpdate(changesToUpload);
            if (businessCopyFieldKeys.length > 0) {
                changesToUpload.businessCopyMeta = buildBusinessCopyManualOverrideMeta({
                    existingMeta: storeDetails?.businessCopyMeta,
                    fieldKeys: businessCopyFieldKeys,
                });
            }
            const updatedChanges: any = getStoreDeepDifference(
                changesToUpload,
                storeDetails,
            );
            if (Object.keys(updatedChanges).length > 0) {
                updatedChanges.storeId = storeDetails.storeId;
                if ("workingHours" in updatedChanges) {
                    updatedChanges.hoursLastUpdatedAt = new Date().toISOString();
                }
                if ("name" in updatedChanges) {
                    updatedChanges.storeKey = updatedChanges.name
                        .toLowerCase()
                        .replaceAll(" ", "_");
                }
                const savedDetails = await updateStore(updatedChanges);
                assertStoreUpdateSucceeded(
                    savedDetails,
                    storeDetails.storeId,
                    'desktop_business_settings_store_update_rejected',
                );
                if ('workingHours' in updatedChanges) {
                    if (componentActiveRef.current && activeBusinessSettingsScopeRef.current === requestScopeKey) {
                        setWorkingHoursDirty(false);
                        setWorkingHoursDirtyDays([]);
                    }
                }
                const nextStoreDetails = mergeStoreNestedUpdateWithCurrent(
                    mergeStoreNestedUpdateWithCurrent(storeDetails, changesToUpload),
                    savedDetails,
                );
                const failedPhotoDeletes = await deleteQueuedOBPPhotos(
                    obpPhotoDeleteQueue,
                    nextStoreDetails.publicPresence,
                );
                if (componentActiveRef.current && activeBusinessSettingsScopeRef.current === requestScopeKey) {
                    obpPhotoDeleteQueueRef.current = reconcileOBPPhotoDeleteQueue(
                        obpPhotoDeleteQueueRef.current,
                        obpPhotoDeleteQueue,
                        failedPhotoDeletes,
                    );
                }
                if (
                    savedDetails?.logo
                    && componentActiveRef.current
                    && activeBusinessSettingsScopeRef.current === requestScopeKey
                ) {
                    setSelectedFile({
                        name: savedDetails.logo,
                        size: 0,
                        type: "",
                        url: savedDetails.logo,
                    });
                }

                //created new store
                if ("name" in updatedChanges || "tenantName" in updatedChanges) {
                    const savedstoresList = [...tenantDetails.storesList];
                    const index = savedstoresList.findIndex(
                        (s) => s.storeId == storeDetails.storeId,
                    );
                    if (index != -1) {
                        savedstoresList[index] = {
                            ...savedstoresList[index],
                            name: updatedChanges.name || storeDetails.name,
                        };
                        if (updatedChanges.tenantName) {
                            const tenantId = tenantDetails.tenantId;
                            if (!tenantId) {
                                throw new Error('business_settings_tenant_scope_missing');
                            }
                            const tenantResult = await updateTenant({
                                tenantId,
                                name: updatedChanges.tenantName,
                                storesList: savedstoresList,
                            });
                            assertTenantUpdateSucceeded(
                                tenantResult,
                                tenantId,
                                'desktop_business_settings_tenant_update_rejected',
                            );
                        }
                        if (componentActiveRef.current && activeBusinessSettingsScopeRef.current === requestScopeKey) {
                            setStoreDetails(nextStoreDetails as any);
                        }
                    } else {
                        if (componentActiveRef.current && activeBusinessSettingsScopeRef.current === requestScopeKey) {
                            setStoreDetails(nextStoreDetails as any);
                        }
                    }
                } else {
                    if (componentActiveRef.current && activeBusinessSettingsScopeRef.current === requestScopeKey) {
                        setStoreDetails(nextStoreDetails as any);
                    }
                }
            } else {
                const failedPhotoDeletes = await deleteQueuedOBPPhotos(
                    obpPhotoDeleteQueue,
                    changesToUpload.publicPresence ?? storeDetails?.publicPresence,
                );
                if (componentActiveRef.current && activeBusinessSettingsScopeRef.current === requestScopeKey) {
                    obpPhotoDeleteQueueRef.current = reconcileOBPPhotoDeleteQueue(
                        obpPhotoDeleteQueueRef.current,
                        obpPhotoDeleteQueue,
                        failedPhotoDeletes,
                    );
                }
            }
        } else {
            const normalizedTenantPhone = normalizePhoneNumberForStorage({
                countryCode: tenantDetails.countryCode,
                phoneNumber: tenantDetails.phoneNumber,
            });
            changesToUpload = {
                ...changesToUpload,
                tenantId: tenantDetails.tenantId,
                storeKey: changesToUpload.name?.toLowerCase().replaceAll(" ", "_"),
                email: tenantDetails.email,
                countryCode: normalizedTenantPhone.phone ? normalizedTenantPhone.countryCode : tenantDetails.countryCode,
                dialCode: normalizedTenantPhone.phone ? normalizedTenantPhone.dialCode : undefined,
                phone: normalizedTenantPhone.phone || tenantDetails.phoneNumber,
                phoneNumber: normalizedTenantPhone.phoneNumber || tenantDetails.phoneNumber,
                tenantName: tenantDetails.name,
            };

            const savedDetails = await addStore(changesToUpload);
            const savedStoreId = savedDetails.storeId;
            assertStoreUpdateSucceeded(
                savedDetails,
                savedStoreId,
                'desktop_business_settings_store_create_rejected',
            );
            changesToUpload.storeId = savedStoreId;
            const failedPhotoDeletes = await deleteQueuedOBPPhotos(
                obpPhotoDeleteQueue,
                savedDetails?.publicPresence ?? changesToUpload.publicPresence,
            );
            if (componentActiveRef.current && activeBusinessSettingsScopeRef.current === requestScopeKey) {
                obpPhotoDeleteQueueRef.current = reconcileOBPPhotoDeleteQueue(
                    obpPhotoDeleteQueueRef.current,
                    obpPhotoDeleteQueue,
                    failedPhotoDeletes,
                );
                setStoreDetails({ ...changesToUpload, ...savedDetails });
            }
        }
        } finally {
            settingsSaveInFlightRef.current = false;
            if (componentActiveRef.current && activeBusinessSettingsScopeRef.current === requestScopeKey) {
                setIsSettingsSaving(false);
            }
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
                        <Card ref={publicTruthFocusRefs.current.logo}>
                            <MediaImageCard
                                accept={getMediaProfileAcceptAttribute('businessLogo')}
                                alt={storeDetails?.name || 'Business logo'}
                                aspectRatio="1 / 1"
                                canAdjust={Boolean(selectedFile.sourceDataUrl)}
                                helperText={t('uploadLogoDesc' as any)}
                                imageType="businessLogo"
                                imageFit="contain"
                                imageUrl={selectedFile.url || storeDetails?.logo}
                                onAdjust={() => setIsLogoAdjustOpen(true)}
                                onReset={selectedFile.sourceDataUrl ? () => setSelectedFile({
                                    name: "",
                                    size: 0,
                                    type: "",
                                    url: storeDetails?.logo || undefined,
                                }) : undefined}
                                onSelectFile={handleLogoSelect}
                                placeholderDescription="Drop, paste, or choose a square logo."
                                placeholderTitle={t('uploadLogo' as any)}
                                size="compact"
                            />
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
                                                const queuedPhotoDeletes = [...obpPhotoDeleteQueueRef.current];
                                                obpPhotoDeleteQueueRef.current = [];
                                                void deleteQueuedOBPPhotos(
                                                    queuedPhotoDeletes,
                                                    storeDetails?.publicPresence,
                                                ).then((failedPhotoDeletes) => {
                                                    obpPhotoDeleteQueueRef.current = Array.from(new Set([
                                                        ...obpPhotoDeleteQueueRef.current,
                                                        ...failedPhotoDeletes,
                                                    ]));
                                                });
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
                                                        url: undefined,
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
                                            loading={isSettingsSaving}
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

            <MediaImageAdjustModal
                fileName={selectedFile.sourceName || selectedFile.name}
                imageType="businessLogo"
                initialCrop={selectedFile.crop}
                onApply={(prepared) => {
                    setSelectedFile((current) => ({
                        ...current,
                        crop: prepared.crop,
                        blob: prepared.blob,
                        mediaChecksum: prepared.checksum,
                        mediaId: prepared.mediaId,
                        mediaProfile: 'businessLogo',
                        mediaVariant: prepared.primaryVariant,
                        mediaVersion: prepared.version,
                        name: prepared.sourceName || current.name,
                        preparedMedia: prepared,
                        size: prepared.sizeBytes,
                        sourceDataUrl: prepared.sourceDataUrl || current.sourceDataUrl,
                        sourceName: prepared.sourceName || current.sourceName,
                        type: prepared.mimeType,
                        url: prepared.dataUrl,
                    }));
                }}
                onClose={() => setIsLogoAdjustOpen(false)}
                open={isLogoAdjustOpen}
                sourceDataUrl={selectedFile.sourceDataUrl}
            />
        </motion.div>
    );
}

export default function BusinessSettings(props: BusinessSettingsProps) {
    if (!props.tenantDetails || !props.storeDetails) return null;
    const scopeKey = `${String(props.storeDetails?.tenantId ?? '')}::${String(props.storeDetails?.storeId ?? '')}`;
    return (
        <BusinessSettingsStateBoundary
            key={scopeKey}
            {...props}
            tenantDetails={props.tenantDetails}
            storeDetails={props.storeDetails}
        />
    );
}

type BusinessSettingsStateBoundaryProps = Omit<BusinessSettingsProps, 'storeDetails' | 'tenantDetails'> & {
    storeDetails: StoreDataType;
    tenantDetails: TenantDataType;
};

function BusinessSettingsStateBoundary({
    setStoreDetails: notifyStoreSaved,
    storeDetails: initialStoreDetails,
    tenantDetails,
}: BusinessSettingsStateBoundaryProps) {
    const [storeDetails, setStoreDetails] = useState<StoreDataType>(initialStoreDetails);
    const updateStoreDetails = useCallback<Dispatch<SetStateAction<StoreDataType>>>(
        (update) => {
            if (typeof update === 'function') {
                setStoreDetails(update);
                return;
            }
            setStoreDetails(update);
            notifyStoreSaved(update);
        },
        [notifyStoreSaved],
    );

    return (
        <BusinessSettingsContent
            setStoreDetails={updateStoreDetails}
            storeDetails={storeDetails}
            tenantDetails={tenantDetails}
        />
    );
}
