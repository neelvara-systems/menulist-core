import MenuBreadcrumb from "@/app/client/[[...slug]]/MenuBreadcrumb";
import JsonLdScript from "@/components/seo/JsonLdScript";
import TempStatusBanner from "@atoms/TempStatusBanner";
import { FEATURE_FLAGS } from "@config/features";
import GlobalLanguagesList from "@data/languages";
import PublicMenuListAttribution from "@/components/customer/PublicMenuListAttribution";
import { getResolvedAnalyticsPreferences } from "@lib/analytics/preferences";
import { getBrandName, getStoreContextName, getStoreName } from "@lib/businessIdentity/names";
import { normalizeGeoCoordinateDraft } from "@lib/businessIdentity/geoCoordinates";
import {
    appendPublicLanguageParam,
    getNextIntlLocaleForPublicLanguage,
    getPublicLanguageOptions,
    normalizePublicLanguageCode,
    resolveStorePublicLanguage,
    shouldExposePublicLanguageSwitcher,
} from "@lib/localization/publicRenderLanguage";
import { getLocalizedText, getPrimaryLocalizedLanguage } from "@lib/localization/text";
import {
    createPublicCustomerTranslator,
    type PublicCustomerTranslator,
} from "@lib/localization/publicCustomerMessages";
import { getBusinessAttributeConfigForType, normalizeCustomBusinessAttributes } from "@lib/obp/businessAttributes";
import { resolveOBPAccentColor } from "@lib/obp/accentColor";
import { generateOBPUrl, getDefaultProjectUrl } from "@lib/obp/generateOBPUrl";
import { getStoreOpenStatus } from "@lib/obp/hoursStatus";
import { getStoreDayKey, getStoreStatus, normalizeWorkingHoursValue, parseWorkingHoursRanges } from "@lib/hours/hoursEngine";
import { normalizeOBPExternalHttpsUrl, normalizeOBPGoogleMapsUrl, normalizeOBPReviewUrl, normalizeOBPSocialUrl, normalizeOBPWebsiteUrl } from "@lib/obp/publicLinks";
import { normalizeOBPPublicPhotoUrls } from "@lib/obp/publicPhotos";
import { buildTelHref, buildWhatsAppPhoneParam } from "@lib/phone/phoneNumber";
import { resolveHoursOutput } from "@lib/outputControl";
import { shouldShowStarterPublicPlaceholders } from "@lib/onboarding/starterActivation";
import { resolveMenuListAttributionPolicy } from "@lib/platform/menuListBranding";
import { normalizePublicOutletSlug } from "@lib/publicRouting/pathSegments";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { formatClockTime } from "@util/dateTime";
import type { ReactNode } from "react";
import {
    LuBadgeCheck,
    LuBanknote,
    LuCalendarDays,
    LuCar,
    LuCheck,
    LuClock,
    LuCreditCard,
    LuDog,
    LuInfo,
    LuIndianRupee,
    LuLeaf,
    LuMapPin,
    LuMusic,
    LuParkingCircle,
    LuShieldCheck,
    LuShoppingBag,
    LuSprout,
    LuStore,
    LuTrees,
    LuTruck,
    LuUtensils,
    LuWheatOff,
    LuWifi,
    LuWind,
} from "react-icons/lu";
import * as LuIcons from "react-icons/lu";
import type { IconType } from "react-icons";
import OBPActions, { type OBPActionPlaceholder } from "./OBPActions";
import OBPAnalytics from "./OBPAnalytics";
import OBPCustomerAppMount from "./OBPCustomerAppMount";
import OBPExternalLinks from "./OBPExternalLinks";
import OBPLanguageSwitcher from "./OBPLanguageSwitcher";
import OBPMenuCTA from "./OBPMenuCTA";
import type { OBPMenuCTAProjectEntry } from "./OBPMenuCTA";
import OBPPhotoStrip from "./OBPPhotoStrip";
import OBPThemeToggle from "./OBPThemeToggle";
import { getOBPTranslations } from "./i18n";
import styles from "./obp.module.scss";
import { generateOBPSchema } from "./schema";

export interface ObpMenuInfo {
    hasMenu: boolean;
    defaultSlug: string | undefined;
    projects: Array<{
        projectId: string;
        slug: string;
        name: string | Record<string, string>;
        isDefault: boolean;
        projectImage?: string | null;
        isSpecialMenu?: boolean;
        specialMenuBaseProjectId?: string;
        specialMenuDisplayName?: string | Record<string, string>;
    }>;
}

interface OBPResolvedSurfaceProps {
    includeRuntime?: boolean;
    masterBrandName?: string;
    masterCustomDomain?: string;
    masterSubdomain?: string;
    menuInfo: ObpMenuInfo;
    requestedLanguage?: string | string[] | null;
    store: any;
    isOutletSurface?: boolean;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

type OBPIconVariant = 'icons' | 'emoji';
type OBPResolvedSurfaceFailureCode =
    | 'public_obp_today_day_key_timezone_failed'
    | 'public_obp_google_maps_embed_url_parse_failed'
    | 'public_obp_freshness_timestamp_parse_failed';

interface OBPIconItem {
    key: string;
    label: string;
    Icon?: IconType;
    customIcon?: string;
    fallbackIcon?: string;
    placeholder?: boolean;
}

const reportedOBPResolvedSurfaceFailures = new Set<OBPResolvedSurfaceFailureCode>();

const getOBPResolvedSurfaceValueType = (value: unknown): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (value instanceof Date) return 'date';
    if (typeof value === 'object' && value && typeof (value as { toDate?: unknown }).toDate === 'function') {
        return 'timestamp_like';
    }
    if (typeof value === 'object' && value && typeof (value as { seconds?: unknown }).seconds === 'number') {
        return 'seconds_like';
    }
    return typeof value;
};

function logOBPResolvedSurfaceFailure(
    failureCode: OBPResolvedSurfaceFailureCode,
    error: unknown,
    context: {
        timeZone?: unknown;
        googleMapsUrl?: unknown;
        modifiedOn?: unknown;
    } = {},
): void {
    if (reportedOBPResolvedSurfaceFailures.has(failureCode)) return;
    reportedOBPResolvedSurfaceFailures.add(failureCode);

    logRuntimeFailure(failureCode, error, {
        ...getBoundedRuntimeStringContext('timeZone', context.timeZone),
        ...getBoundedRuntimeStringContext('googleMapsUrl', context.googleMapsUrl),
        ...getBoundedRuntimeStringContext('modifiedOnType', getOBPResolvedSurfaceValueType(context.modifiedOn)),
    });
}

function getTodayDayKey(timeZone: string | undefined): string {
    return getStoreDayKey(timeZone || 'Asia/Kolkata');
}

function getTodayHoursDisplay(workingHours: Record<string, string> | undefined, timeZone: string | undefined, t: (key: string, values?: Record<string, any>) => string): string | null {
    if (!workingHours) return null;

    const todayHours = workingHours[getTodayDayKey(timeZone)];
    const status = getStoreStatus(workingHours, timeZone || 'Asia/Kolkata');
    if (status.isOpen && status.currentDayHours) {
        return t('publicOpenToday', { hours: status.currentDayHours });
    }
    const ranges = parseWorkingHoursRanges(todayHours);
    if (!ranges.length) {
        if (!todayHours || (typeof todayHours === 'string' && todayHours.toLowerCase() === 'closed')) {
            return t('publicClosedToday');
        }
        return t('publicHoursNotAvailable');
    }
    const display = ranges
        .map((range) => `${formatClockTime(range.startTime)} - ${formatClockTime(range.endTime)}`)
        .join(', ');
    return t('publicOpenToday', { hours: display });
}

function getSafeGoogleMapsEmbedUrl(url?: string): string | null {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        const isGoogleHost = ['www.google.com', 'google.com', 'maps.google.com'].includes(parsed.hostname);
        if (parsed.protocol === 'https:' && isGoogleHost && parsed.pathname.startsWith('/maps/embed')) {
            return parsed.toString();
        }
    } catch (error) {
        logOBPResolvedSurfaceFailure('public_obp_google_maps_embed_url_parse_failed', error, {
            googleMapsUrl: url,
        });
        return null;
    }
    return null;
}

function buildGoogleMapsEmbedUrl(params: {
    address?: string | null;
    apiKey?: string;
    geo?: { latitude?: unknown; longitude?: unknown };
    googleMapsUrl?: string;
}): string | null {
    const safeOwnerEmbedUrl = getSafeGoogleMapsEmbedUrl(params.googleMapsUrl);
    if (safeOwnerEmbedUrl) return safeOwnerEmbedUrl;

    if (!params.apiKey) return null;

    const normalizedGeo = normalizeGeoCoordinateDraft(params.geo?.latitude, params.geo?.longitude);
    const query = normalizedGeo.ok && normalizedGeo.geo
        ? `${normalizedGeo.geo.latitude},${normalizedGeo.geo.longitude}`
        : params.address?.trim();

    if (!query) return null;

    const searchParams = new URLSearchParams({
        key: params.apiKey,
        q: query,
        zoom: '16',
    });

    return `https://www.google.com/maps/embed/v1/place?${searchParams.toString()}`;
}

function getFullAddress(store: any): string | null {
    const parts = [
        store?.addressLine,
        store?.area,
        store?.city,
        store?.state,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
}

function getFreshnessText(
    modifiedOn: any,
    translate: PublicCustomerTranslator,
    locale: string,
    timeZone?: string,
): string | null {
    if (!modifiedOn) return null;

    let date: Date;
    try {
        if (typeof modifiedOn === 'string') {
            date = new Date(modifiedOn);
        } else if (modifiedOn?.toDate) {
            date = modifiedOn.toDate();
        } else if (modifiedOn?.seconds) {
            date = new Date(modifiedOn.seconds * 1000);
        } else {
            return null;
        }
    } catch (error) {
        logOBPResolvedSurfaceFailure('public_obp_freshness_timestamp_parse_failed', error, {
            modifiedOn,
        });
        return null;
    }

    if (!Number.isFinite(date.getTime())) {
        logOBPResolvedSurfaceFailure('public_obp_freshness_timestamp_parse_failed', new Error('invalid_modified_on'), {
            modifiedOn,
        });
        return null;
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < -5 * 60 * 1000) {
        logOBPResolvedSurfaceFailure('public_obp_freshness_timestamp_parse_failed', new Error('future_modified_on'), {
            modifiedOn,
        });
        return null;
    }
    try {
        const dayFormatter = new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            ...(timeZone ? { timeZone } : {}),
        });
        if (dayFormatter.format(date) === dayFormatter.format(now)) {
            return translate('menu.updatedToday');
        }
        const dateLabel = new Intl.DateTimeFormat(locale, {
            dateStyle: 'medium',
            ...(timeZone ? { timeZone } : {}),
        }).format(date);
        return translate('menu.updatedOn', { date: dateLabel });
    } catch (error) {
        logOBPResolvedSurfaceFailure('public_obp_freshness_timestamp_parse_failed', error, {
            modifiedOn,
            timeZone,
        });
        return null;
    }
}

function getAllHoursDisplay(workingHours: Record<string, string> | undefined, t: (key: string) => string, todayKey?: string): ReactNode | null {
    if (!workingHours || Object.keys(workingHours).length === 0) return null;

    const rows = DAY_ORDER.map(day => {
        const hours = workingHours[day];
        const isClosed = !hours || (typeof hours === 'string' && hours.toLowerCase() === 'closed');
        const normalized = normalizeWorkingHoursValue(hours);
        const ranges = parseWorkingHoursRanges(hours);
        const display = hours
            ? typeof hours === 'string' && hours.toLowerCase() === 'closed'
                ? t('publicClosed')
                : normalized === null || !ranges.length
                    ? t('publicHoursNotAvailable')
                    : ranges
                        .map((range) => `${formatClockTime(range.startTime)} - ${formatClockTime(range.endTime)}`)
                        .join(', ')
            : t('publicClosed');
        const isToday = todayKey === day;
        return (
            <div key={day} className={`${styles.hoursRow} ${isToday ? styles.hoursRowToday : ''}`}>
                <span className={styles.hoursDay}>{t(`publicDays.${day}`)}</span>
                <span className={`${styles.hoursTime} ${isClosed ? styles.hoursClosed : ''}`}>{display}</span>
            </div>
        );
    });

    return <>{rows}</>;
}

function buildServiceModes(attributes?: Record<string, boolean>): string[] {
    if (!attributes) return [];
    const modes: string[] = [];
    if (attributes.dineIn) modes.push('dineIn');
    if (attributes.takeaway) modes.push('takeaway');
    if (attributes.delivery) modes.push('delivery');
    if (attributes.driveThrough) modes.push('driveThrough');
    return modes;
}

function buildPaymentMethods(attributes?: Record<string, boolean>): string[] {
    if (!attributes) return [];
    const methods: string[] = [];
    if (attributes.acceptsCash) methods.push('cash');
    if (attributes.acceptsCards) methods.push('cards');
    if (attributes.acceptsUPI) methods.push('upi');
    return methods;
}

function getServiceModeIcon(mode: string): IconType {
    switch (mode) {
        case 'dineIn':
            return LuUtensils;
        case 'takeaway':
            return LuShoppingBag;
        case 'delivery':
            return LuTruck;
        case 'driveThrough':
            return LuCar;
        default:
            return LuStore;
    }
}

function getPaymentIcon(method: string): IconType {
    switch (method) {
        case 'cash':
            return LuBanknote;
        case 'cards':
            return LuCreditCard;
        case 'upi':
            return LuIndianRupee;
        default:
            return LuCreditCard;
    }
}

function getBusinessAttributeIcon(key: string): IconType {
    switch (key) {
        case 'vegetarian':
            return LuLeaf;
        case 'vegan':
            return LuSprout;
        case 'halal':
            return LuShieldCheck;
        case 'glutenFree':
            return LuWheatOff;
        case 'wifi':
            return LuWifi;
        case 'outdoorSeating':
            return LuTrees;
        case 'parking':
            return LuParkingCircle;
        case 'airConditioning':
            return LuWind;
        case 'liveMusic':
            return LuMusic;
        case 'petFriendly':
            return LuDog;
        case 'dineIn':
        case 'takeaway':
        case 'delivery':
        case 'driveThrough':
            return getServiceModeIcon(key);
        case 'acceptsCards':
            return LuCreditCard;
        case 'acceptsUPI':
            return LuIndianRupee;
        case 'acceptsCash':
            return LuBanknote;
        default:
            return LuBadgeCheck;
    }
}

function getServiceModeEmoji(mode: string): string {
    switch (mode) {
        case 'dineIn':
            return '🍽️';
        case 'takeaway':
            return '🛍️';
        case 'delivery':
            return '🚚';
        case 'driveThrough':
            return '🚗';
        default:
            return '🏪';
    }
}

function getPaymentEmoji(method: string): string {
    switch (method) {
        case 'cash':
            return '💵';
        case 'cards':
            return '💳';
        case 'upi':
            return '₹';
        default:
            return '💳';
    }
}

function getBusinessAttributeEmoji(key: string): string {
    switch (key) {
        case 'vegetarian':
            return '🌿';
        case 'vegan':
            return '🌱';
        case 'halal':
            return '✅';
        case 'glutenFree':
            return '🚫';
        case 'wifi':
            return '📶';
        case 'outdoorSeating':
            return '🌳';
        case 'parking':
            return '🅿️';
        case 'airConditioning':
            return '❄️';
        case 'liveMusic':
            return '🎵';
        case 'petFriendly':
            return '🐾';
        case 'dineIn':
        case 'takeaway':
        case 'delivery':
        case 'driveThrough':
            return getServiceModeEmoji(key);
        case 'acceptsCards':
            return '💳';
        case 'acceptsUPI':
            return '₹';
        case 'acceptsCash':
            return '💵';
        default:
            return '✓';
    }
}

function renderDisplayIcon(iconVariant: OBPIconVariant, Icon: IconType, emoji: string, size: number = 15) {
    return iconVariant === 'emoji'
        ? <span aria-hidden="true" className={styles.displayEmoji}>{emoji}</span>
        : <Icon aria-hidden="true" size={size} />;
}

function renderCustomIconValue(icon: string | undefined) {
    const normalizedIcon = typeof icon === 'string' ? icon.trim() : '';
    if (!normalizedIcon) return null;

    if (normalizedIcon.startsWith('emoji:')) {
        return <span aria-hidden="true" className={styles.iconTileEmoji}>{normalizedIcon.replace('emoji:', '')}</span>;
    }

    const iconName = normalizedIcon.startsWith('lu:')
        ? normalizedIcon.replace('lu:', '')
        : normalizedIcon;
    const Icon = LuIcons[iconName as keyof typeof LuIcons] as IconType | undefined;

    if (Icon) {
        return <Icon aria-hidden="true" size={19} />;
    }

    return <span aria-hidden="true" className={styles.iconTileEmoji}>{normalizedIcon}</span>;
}

function renderIconTile(item: OBPIconItem) {
    const Icon = item.Icon;
    const customIcon = renderCustomIconValue(item.customIcon);
    return (
        <div key={item.key} className={`${styles.iconTile} ${item.placeholder ? styles.iconTilePlaceholder : ''}`}>
            <span className={styles.iconTileSymbol}>
                {customIcon || (Icon ? <Icon aria-hidden="true" size={19} /> : <span aria-hidden="true" className={styles.iconTileEmoji}>{item.fallbackIcon}</span>)}
            </span>
            <span className={styles.iconTileLabel}>{item.label}</span>
        </div>
    );
}

function localizeStatusText(value: string | undefined, t: (key: string, values?: Record<string, any>) => string): string {
    if (!value) return '';
    const normalized = value.trim().toLowerCase();
    if (normalized === 'hours not available') return t('publicHoursNotAvailable');
    if (normalized === 'open now') return t('publicOpen');
    if (normalized === 'closed') return t('publicClosed');
    return value;
}

function localizeStatusNextChange(value: string | undefined, t: (key: string, values?: Record<string, any>) => string): string {
    if (!value) return '';
    const trimmed = value.trim();
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('closes ')) {
        return t('publicClosesAt', { time: trimmed.slice('Closes '.length) });
    }
    if (lower.startsWith('opens ')) {
        const target = trimmed.slice('Opens '.length);
        if (target.toLowerCase() === 'tomorrow') return t('publicOpensTomorrow');
        const dayKey = target.slice(0, 3).toLowerCase();
        const localizedDay = t(`publicDays.${dayKey}`);
        return t('publicOpensOn', { day: localizedDay === `publicDays.${dayKey}` ? target : localizedDay });
    }
    return trimmed;
}

function getLocalizedPublicText(value: unknown, language: string, fallback: string = ''): string {
    return getLocalizedText(
        value as any,
        language,
        getPrimaryLocalizedLanguage(value as any, language),
        fallback,
    );
}

function isLegacySpecialNoteHelper(value: string): boolean {
    const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase();
    return normalized === 'shown on the official business page. use for service charges, today-only notes, or important customer information.';
}

export default function OBPResolvedSurface({
    includeRuntime = false,
    masterBrandName,
    masterCustomDomain,
    masterSubdomain,
    menuInfo,
    requestedLanguage,
    store,
    isOutletSurface = false,
}: OBPResolvedSurfaceProps) {
    const pp = store?.publicPresence || {};
    const contentLanguage = resolveStorePublicLanguage(store, requestedLanguage);
    const publicCustomerT = createPublicCustomerTranslator(contentLanguage);
    const customerLocale = getNextIntlLocaleForPublicLanguage(contentLanguage);
    const iconVariant: OBPIconVariant = pp.iconVariant === 'emoji' ? 'emoji' : 'icons';
    const isPermanentlyClosed = store?.permanentlyClosed === true;
    const t = getOBPTranslations(customerLocale);
    const languageOptions = getPublicLanguageOptions(store);
    const showLanguageSwitcher = shouldExposePublicLanguageSwitcher(store);
    const activeLanguageName = GlobalLanguagesList.find((language) => language.code === contentLanguage)?.name || contentLanguage.toUpperCase();
    const activeLanguageDirection = GlobalLanguagesList.find((language) => language.code === contentLanguage)?.direction || 'ltr';
    const { hasMenu, defaultSlug, projects: activeProjects } = menuInfo;

    const accentColor = resolveOBPAccentColor(pp);
    const descriptor = getLocalizedText(pp.descriptor, contentLanguage, getPrimaryLocalizedLanguage(pp.descriptor, contentLanguage), '');
    const brandName = getBrandName(store, t('publicFallbackBusiness'));
    const storeLocationName = getStoreName(store, brandName);
    const storeName = isOutletSurface
        ? getStoreContextName(store, brandName)
        : brandName;
    const logo = store?.logo;
    const businessCover = typeof pp.businessCover === 'string' ? pp.businessCover.trim() : '';
    const firstLetter = storeName.charAt(0);
    const hoursOutput = FEATURE_FLAGS.ENABLE_OUTPUT_CONTROL
        ? resolveHoursOutput({
            workingHours: store?.workingHours,
            hoursLastUpdatedAt: store?.hoursLastUpdatedAt || store?.modifiedOn,
            timeZone: store?.timeZone,
        })
        : null;
    const status = hoursOutput
        ? { isOpen: hoursOutput.styleHint === "open", statusText: hoursOutput.statusText, nextChange: hoursOutput.secondaryText }
        : getStoreOpenStatus(store?.workingHours, store?.timeZone);
    const showStatusBadge = hoursOutput ? hoursOutput.showStatusBadge : true;
    const openHoursState = showStatusBadge ? (status.isOpen ? 'open' : 'closed') : 'unknown';
    const statusText = localizeStatusText(status.statusText, t);
    const statusNextChange = localizeStatusNextChange(status.nextChange, t);
    const todayDayKey = getTodayDayKey(store?.timeZone);
    const todayHours = getTodayHoursDisplay(store?.workingHours, store?.timeZone, t);
    const fullAddress = getFullAddress(store);
    const originSubdomain = isOutletSurface
        ? masterSubdomain
        : (store?.subdomain ?? undefined);
    const originCustomDomain = isOutletSurface
        ? masterCustomDomain
        : (store?.customDomain ?? undefined);
    const publicOutletSlug = isOutletSurface ? normalizePublicOutletSlug(store?.outletSlug) : null;
    const outletPrefix = publicOutletSlug
        ? `/${publicOutletSlug}`
        : '';
    const masterBase = generateOBPUrl(originSubdomain, originCustomDomain);
    const obpUrl = isOutletSurface
        ? `${masterBase}${outletPrefix}`
        : masterBase;
    const requestedLanguageCode = normalizePublicLanguageCode(requestedLanguage);
    const shouldCarryLanguageToMenu = Boolean(requestedLanguageCode) || showLanguageSwitcher;
    const withCurrentLanguage = (url: string): string => (
        shouldCarryLanguageToMenu ? appendPublicLanguageParam(url, contentLanguage) : url
    );
    const buildProjectUrl = (slug?: string): string => {
        if (isOutletSurface) {
            if (!slug) {
                return withCurrentLanguage(masterBase
                    ? `${masterBase}${outletPrefix}/menu`
                    : `${outletPrefix}/menu`);
            }
            return withCurrentLanguage(masterBase
                ? `${masterBase}${outletPrefix}/${slug}`
                : `${outletPrefix}/${slug}`);
        }
        return withCurrentLanguage(getDefaultProjectUrl(originSubdomain, originCustomDomain, slug));
    };
    const menuUrl = buildProjectUrl(defaultSlug);
    const defaultActionProject = activeProjects.find((project) => project.isDefault) || activeProjects.find((project) => !project.isSpecialMenu) || activeProjects[0];
    const feedbackUrl = defaultActionProject?.projectId
        ? appendPublicLanguageParam(
            `${masterBase}/feedback/${defaultActionProject.projectId}?source=direct_link`,
            contentLanguage,
        )
        : '';
    const ctaProjects: OBPMenuCTAProjectEntry[] = activeProjects.map((p) => ({
        slug: p.slug,
        name: getLocalizedText(p.name, contentLanguage, getPrimaryLocalizedLanguage(p.name, contentLanguage), t('publicFallbackMenu')),
        isDefault: p.isDefault,
        projectImage: p.projectImage || null,
        url: buildProjectUrl(p.slug),
    })).map((project) => ({
        ...project,
        label: t('publicViewNamedMenu', { name: project.name }),
    }));
    const whatsappNumber = pp.whatsappNumber || store?.phoneNumber || '';
    const safeCallHref = buildTelHref({
        countryCode: store?.countryCode,
        dialCode: store?.dialCode,
        phoneNumber: store?.phoneNumber,
    });
    const safeWhatsAppPhoneParam = buildWhatsAppPhoneParam({
        countryCode: store?.countryCode,
        dialCode: store?.dialCode,
        phoneNumber: whatsappNumber,
    });
    const showCall = (pp.showCall !== false) && !!safeCallHref;
    const showWhatsApp = (pp.showWhatsApp !== false) && !!safeWhatsAppPhoneParam;
    const safeGoogleMapsUrl = normalizeOBPGoogleMapsUrl(pp.googleMapsUrl);
    const safeReservationUrl = normalizeOBPExternalHttpsUrl(pp.reservationUrl);
    const safeOrderUrl = normalizeOBPExternalHttpsUrl(pp.orderUrl);
    const safeGoogleReviewUrl = normalizeOBPReviewUrl(pp.googleReviewUrl);
    const showDirections = (pp.showDirections !== false) && !!(safeGoogleMapsUrl || fullAddress);
    const showReservation = (pp.showReservation !== false) && !!safeReservationUrl;
    const showOrder = (pp.showOrder !== false) && !!safeOrderUrl;
    const showGoogleReview = (pp.showGoogleReview !== false) && !!safeGoogleReviewUrl;
    const showFeedback = (pp.showFeedback !== false) && store?.feedbackEnabled !== false && !!feedbackUrl;
    const showStarterPlaceholders = !isPermanentlyClosed && shouldShowStarterPublicPlaceholders(store);
    const starterPlaceholderActions: OBPActionPlaceholder[] = showStarterPlaceholders ? [
        ...((pp.showCall !== false) && !showCall ? ['call' as const] : []),
        ...((pp.showDirections !== false) && !showDirections ? ['directions' as const] : []),
        ...((pp.showWhatsApp !== false) && !showWhatsApp ? ['whatsapp' as const] : []),
        ...((pp.showReservation !== false) && !showReservation ? ['reserve' as const] : []),
        ...((pp.showOrder !== false) && !showOrder ? ['order' as const] : []),
        ...((pp.showGoogleReview !== false) && !showGoogleReview ? ['reviews' as const] : []),
        ...((pp.showFeedback !== false) && store?.feedbackEnabled !== false && !showFeedback ? ['feedback' as const] : []),
    ] : [];
    const directionsUrl = safeGoogleMapsUrl || (fullAddress ? `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}` : '');
    const googleMapsEmbedUrl = buildGoogleMapsEmbedUrl({
        address: fullAddress,
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY,
        geo: store?.geo || { latitude: store?.latitude, longitude: store?.longitude },
        googleMapsUrl: safeGoogleMapsUrl || undefined,
    });
    const photos = normalizeOBPPublicPhotoUrls(pp.photos);
    const hasStarterPreviewVisualDepth = Boolean(
        businessCover ||
        googleMapsEmbedUrl ||
        photos.length > 0 ||
        activeProjects.some((project) => Boolean(project.projectImage)),
    );
    const useStarterCompactLayout = showStarterPlaceholders && !hasStarterPreviewVisualDepth;
    const socialMedia = store?.socialMedia || {};
    const instagram = normalizeOBPSocialUrl('instagram', socialMedia.instagram);
    const facebook = normalizeOBPSocialUrl('facebook', socialMedia.facebook);
    const twitter = normalizeOBPSocialUrl('twitter', socialMedia.twitter);
    const linkedin = normalizeOBPSocialUrl('linkedin', socialMedia.linkedin);
    const youtube = normalizeOBPSocialUrl('youtube', socialMedia.youtube);
    const socialWhatsApp = socialMedia.whatsapp;
    const website = normalizeOBPWebsiteUrl(store?.url) || normalizeOBPWebsiteUrl(socialMedia.website);
    const starterPlaceholderSocials = showStarterPlaceholders ? [
        ...(!instagram ? ['instagram' as const] : []),
        ...(!facebook ? ['facebook' as const] : []),
        ...(!youtube ? ['youtube' as const] : []),
        ...(!website ? ['website' as const] : []),
        ...(!socialWhatsApp && !showWhatsApp ? ['whatsapp' as const] : []),
    ] : [];
    const hasSocials = !!(instagram || facebook || twitter || linkedin || youtube || socialWhatsApp || website || starterPlaceholderSocials.length);
    const attributeConfig = getBusinessAttributeConfigForType(store?.businessType, store?.businessCategory);
    const attributeTags = attributeConfig
        .filter((attribute) => store?.businessAttributes?.[attribute.key] === true)
        .map((attribute) => ({
            key: attribute.key,
            Icon: iconVariant === 'icons' ? getBusinessAttributeIcon(attribute.key) : undefined,
            fallbackIcon: iconVariant === 'emoji' ? getBusinessAttributeEmoji(attribute.key) : undefined,
            label: t(attribute.publicLabelKey),
        }));
    const customAttributeTags = normalizeCustomBusinessAttributes(pp.customAttributes)
        .filter((attribute) => attribute.active !== false)
        .map((attribute) => ({
            key: attribute.id,
            Icon: iconVariant === 'icons' && !attribute.icon ? LuBadgeCheck : undefined,
            customIcon: attribute.icon,
            fallbackIcon: iconVariant === 'emoji' ? getBusinessAttributeEmoji(attribute.id) : '+',
            label: attribute.label,
        }));
    const repeatedStructuredAttributeKeys = new Set([
        'dineIn',
        'takeaway',
        'delivery',
        'driveThrough',
        'acceptsCards',
        'acceptsUPI',
        'acceptsCash',
    ]);
    const allAttributeTags = [
        ...attributeTags.filter((attribute) => !repeatedStructuredAttributeKeys.has(attribute.key)),
        ...customAttributeTags,
    ].slice(0, 12);
    const dietaryAttributeKeys = new Set(['vegetarian', 'vegan', 'halal', 'glutenFree']);
    const dietaryAttributeTags = allAttributeTags.filter((attribute) => dietaryAttributeKeys.has(attribute.key));
    const amenityAttributeTags = allAttributeTags.filter((attribute) => !dietaryAttributeKeys.has(attribute.key));
    const freshnessText = getFreshnessText(
        store?.modifiedOn,
        publicCustomerT,
        customerLocale,
        store?.timeZone,
    );
    const establishedYear = pp.establishedYear;
    const knownFor = getLocalizedText(pp.knownFor, contentLanguage, getPrimaryLocalizedLanguage(pp.knownFor, contentLanguage), '');
    const rawSpecialNote = getLocalizedPublicText(pp.specialNote, contentLanguage, '');
    const specialNote = isLegacySpecialNoteHelper(rawSpecialNote) ? '' : rawSpecialNote.trim();
    const areaContext = store?.area || store?.city || null;
    const googleReviewUrl = safeGoogleReviewUrl;
    const googleRating = pp.googleRating;
    const googleReviewCount = pp.googleReviewCount;
    const hasGoogleReview = !!(googleReviewUrl && googleRating);
    const allHours = getAllHoursDisplay(store?.workingHours, t, todayDayKey);
    const serviceModeItems = buildServiceModes(store?.businessAttributes).map((mode) => ({
        key: mode,
        Icon: iconVariant === 'icons' ? getServiceModeIcon(mode) : undefined,
        fallbackIcon: iconVariant === 'emoji' ? getServiceModeEmoji(mode) : undefined,
        label: t(`publicServiceModes.${mode}`),
    }));
    const starterPreviewServiceItems: OBPIconItem[] = showStarterPlaceholders && serviceModeItems.length === 0 ? [
        {
            key: 'starter-placeholder-dineIn',
            Icon: iconVariant === 'icons' ? getServiceModeIcon('dineIn') : undefined,
            fallbackIcon: iconVariant === 'emoji' ? getServiceModeEmoji('dineIn') : undefined,
            label: t('publicServiceModes.dineIn'),
            placeholder: true,
        },
        {
            key: 'starter-placeholder-takeaway',
            Icon: iconVariant === 'icons' ? getServiceModeIcon('takeaway') : undefined,
            fallbackIcon: iconVariant === 'emoji' ? getServiceModeEmoji('takeaway') : undefined,
            label: t('publicServiceModes.takeaway'),
            placeholder: true,
        },
        {
            key: 'starter-placeholder-delivery',
            Icon: iconVariant === 'icons' ? getServiceModeIcon('delivery') : undefined,
            fallbackIcon: iconVariant === 'emoji' ? getServiceModeEmoji('delivery') : undefined,
            label: t('publicServiceModes.delivery'),
            placeholder: true,
        },
    ] : [];
    const serviceModeTags = serviceModeItems.map((item) => item.label);
    const paymentItems = buildPaymentMethods(store?.businessAttributes).map((method) => ({
        key: method,
        Icon: iconVariant === 'icons' ? getPaymentIcon(method) : undefined,
        fallbackIcon: iconVariant === 'emoji' ? getPaymentEmoji(method) : undefined,
        label: t(`publicPaymentMethods.${method}`),
    }));
    const shouldShowUPIPreview = store?.currencyCode === 'INR'
        || store?.country === 'IN'
        || store?.currencySymbol === '₹';
    const starterPreviewPaymentItems: OBPIconItem[] = showStarterPlaceholders && paymentItems.length === 0 ? [
        {
            key: 'starter-placeholder-cash',
            Icon: iconVariant === 'icons' ? getPaymentIcon('cash') : undefined,
            fallbackIcon: iconVariant === 'emoji' ? getPaymentEmoji('cash') : undefined,
            label: t('publicPaymentMethods.cash'),
            placeholder: true,
        },
        {
            key: 'starter-placeholder-cards',
            Icon: iconVariant === 'icons' ? getPaymentIcon('cards') : undefined,
            fallbackIcon: iconVariant === 'emoji' ? getPaymentEmoji('cards') : undefined,
            label: t('publicPaymentMethods.cards'),
            placeholder: true,
        },
        ...(shouldShowUPIPreview ? [{
            key: 'starter-placeholder-upi',
            Icon: iconVariant === 'icons' ? getPaymentIcon('upi') : undefined,
            fallbackIcon: iconVariant === 'emoji' ? getPaymentEmoji('upi') : undefined,
            label: t('publicPaymentMethods.upi'),
            placeholder: true,
        }] : []),
    ] : [];
    const paymentTags = paymentItems.map((item) => item.label);
    const cuisineTypes = store?.cuisineTypes || [];
    const priceRange = store?.priceRange;
    const hasStructuredInfo = !!(allHours || serviceModeTags.length || paymentTags.length || cuisineTypes.length || priceRange);
    const hasStarterPreviewUtilityPlaceholders = starterPreviewServiceItems.length > 0 || starterPreviewPaymentItems.length > 0;
    const customerQuickAnswers = [
        todayHours ? {
            key: 'hours',
            question: t('publicCustomerAnswerHoursQuestion'),
            answer: t('publicCustomerAnswerHoursAnswer', { hours: todayHours }),
        } : null,
        fullAddress ? {
            key: 'location',
            question: t('publicCustomerAnswerLocationQuestion'),
            answer: t('publicCustomerAnswerLocationAnswer', { address: fullAddress }),
        } : null,
        hasMenu ? {
            key: 'menu',
            question: t('publicCustomerAnswerMenuQuestion'),
            answer: t('publicCustomerAnswerMenuAnswer'),
        } : null,
        showWhatsApp ? {
            key: 'whatsapp',
            question: t('publicCustomerAnswerWhatsAppQuestion'),
            answer: t('publicCustomerAnswerWhatsAppAnswer'),
        } : null,
        showDirections ? {
            key: 'directions',
            question: t('publicCustomerAnswerDirectionsQuestion'),
            answer: t('publicCustomerAnswerDirectionsAnswer'),
        } : null,
    ].filter((answer): answer is { key: string; question: string; answer: string } => Boolean(answer)).slice(0, 4);
    const identityPills = [
        ...(isOutletSurface && areaContext ? [areaContext] : []),
        ...serviceModeTags.slice(0, 3),
        priceRange,
    ]
        .filter(Boolean)
        .slice(0, 4) as string[];
    const schema = includeRuntime
        ? generateOBPSchema(store, obpUrl, contentLanguage, isOutletSurface ? 'store' : 'brand', {
            hasPublishedMenu: hasMenu,
            menuUrl,
        })
        : null;
    const analyticsPreferences = getResolvedAnalyticsPreferences(store?.analytics);
    const runtimeTrackingEnabled = includeRuntime && analyticsPreferences.trackOfficialBusinessPage;
    const includeLocation = analyticsPreferences.trackLocation;
    const policyLinks = [
        pp.showPrivacyLink !== false ? { href: appendPublicLanguageParam('/privacy', contentLanguage), label: t('publicPrivacy') } : null,
        pp.showTermsLink !== false ? { href: appendPublicLanguageParam('/terms', contentLanguage), label: t('publicTerms') } : null,
        pp.showRefundLink !== false ? { href: appendPublicLanguageParam('/refund', contentLanguage), label: t('publicRefund') } : null,
    ].filter(Boolean) as Array<{ href: string; label: string }>;
    const officialPageLabel = t('publicOfficialPagePoweredBy').split('·')[0]?.trim() || t('publicOfficialPagePoweredBy');

    return (
        <>
            {includeRuntime ? (
                <>
                    <OBPAnalytics
                        tenantId={store?.tenantId}
                        storeId={store?.storeId}
                        storeTimeZone={store?.timeZone}
                        businessDayEndTime={store?.businessDayEndTime}
                        trackViews={runtimeTrackingEnabled}
                        includeLocation={includeLocation}
                        activeLanguage={showLanguageSwitcher ? contentLanguage : undefined}
                        activeLanguageName={showLanguageSwitcher ? activeLanguageName : undefined}
                        trackLanguageUsage={showLanguageSwitcher}
                    />
                    {schema ? <JsonLdScript id="obp-schema-jsonld" data={schema} /> : null}
                </>
            ) : null}
            <main
                className={styles.page}
                data-obp-page="true"
                dir={activeLanguageDirection}
                lang={contentLanguage}
                style={{ '--obp-accent': accentColor } as any}
            >
                <div className={`${styles.shell} ${useStarterCompactLayout ? styles.starterPreviewShell : ''}`}>
                    {showLanguageSwitcher ? (
                        <OBPLanguageSwitcher
                            activeLanguage={contentLanguage}
                            ariaLabel={t('publicLanguageSelectorLabel')}
                            baseUrl={obpUrl}
                            languages={languageOptions}
                        />
                    ) : null}

                    {isOutletSurface && publicOutletSlug && (masterBrandName || store?.name) ? (
                        <MenuBreadcrumb
                            ariaLabel={t('publicBusinessDetailsLabel')}
                            businessName={masterBrandName || brandName}
                            outletName={storeLocationName || undefined}
                            outletSlug={publicOutletSlug}
                        />
                    ) : null}

                    {FEATURE_FLAGS.ENABLE_TEMP_STATUS && store?.tempStatus ? (
                        <TempStatusBanner
                            activeLanguage={contentLanguage}
                            tempStatus={store.tempStatus}
                            variant="pill"
                        />
                    ) : null}

                    {businessCover ? (
                        <div className={styles.businessCover}>
                            <img
                                alt={storeName}
                                src={businessCover}
                                loading="eager"
                            />
                        </div>
                    ) : null}

                    <div className={styles.desktopLayout}>
                        <section className={styles.identity} aria-label={storeName}>
                            <div className={styles.identityHeader}>
                                {logo ? (
                                    <img
                                        src={logo}
                                        alt={storeName}
                                        className={styles.logo}
                                        width={72}
                                        height={72}
                                        loading="eager"
                                    />
                                ) : (
                                    <div className={styles.logoFallback} style={{ background: accentColor }}>
                                        {firstLetter}
                                    </div>
                                )}

                                <div className={styles.identityText}>
                                    <h1 className={styles.name}>{storeName}</h1>

                                    {descriptor && (
                                        <p className={styles.descriptor}>{descriptor}</p>
                                    )}

                                    {identityPills.length > 0 && (
                                        <div className={styles.identityPills}>
                                            {identityPills.map((pill) => (
                                                <span key={pill} className={styles.identityPill}>{pill}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.trustRow}>
                                {isPermanentlyClosed ? (
                                    <div className={`${styles.statusBadge} ${styles.statusClosed}`}>
                                        <LuClock aria-hidden="true" size={14} />
                                        {t('publicPermanentlyClosed')}
                                    </div>
                                ) : showStatusBadge ? (
                                    <div className={`${styles.statusBadge} ${status.isOpen ? styles.statusOpen : styles.statusClosed}`}>
                                        {status.isOpen ? (
                                            <span className={`${styles.statusDot} ${styles.statusDotOpen}`} />
                                        ) : (
                                            renderDisplayIcon(iconVariant, LuClock, '🕒', 14)
                                        )}
                                        {status.isOpen ? t('publicOpen') : t('publicClosed')}{statusNextChange ? ` · ${statusNextChange}` : ''}
                                    </div>
                                ) : (
                                    <p className={`${styles.nextChange} ${styles.statusMuted}`}>
                                        {statusText}
                                    </p>
                                )}

                                <span className={styles.officialBadge}>
                                    {renderDisplayIcon(iconVariant, LuBadgeCheck, '✅', 14)}
                                    {officialPageLabel}
                                </span>

                                {freshnessText && !isPermanentlyClosed && (
                                    <span className={styles.freshnessBadge}>
                                        <LuCheck aria-hidden="true" size={14} />
                                        <span>{freshnessText}</span>
                                    </span>
                                )}

                                {hasGoogleReview && (
                                    <OBPExternalLinks
                                        tenantId={store?.tenantId}
                                        storeId={store?.storeId}
                                        trackingEnabled={runtimeTrackingEnabled}
                                        storeTimeZone={store?.timeZone}
                                        businessDayEndTime={store?.businessDayEndTime}
                                        countryCode={store?.countryCode}
                                        dialCode={store?.dialCode}
                                        includeLocation={includeLocation}
                                        openHoursState={openHoursState}
                                        googleReviewUrl={googleReviewUrl}
                                        googleReviewLabel={
                                            googleReviewCount
                                                ? t('publicGoogleRatingWithCount', { count: googleReviewCount, rating: googleRating })
                                                : t('publicGoogleRating', { rating: googleRating })
                                        }
                                    />
                                )}
                            </div>

                            {(knownFor || establishedYear) && (
                                <p className={styles.identityMeta}>
                                    {[knownFor ? t('publicKnownForPrefix', { value: knownFor }) : null, establishedYear ? t('publicServingSince', { year: establishedYear }) : null].filter(Boolean).join(' · ')}
                                </p>
                            )}
                        </section>

                        <div className={styles.primaryCta}>
                            {isPermanentlyClosed ? (
                                <span className={styles.menuButtonDisabled}>
                                    {t('publicBusinessPermanentlyClosed')}
                                </span>
                            ) : hasMenu ? (
                                <OBPMenuCTA
                                    menuUrl={menuUrl}
                                    fallbackLabel={t('publicViewMenu')}
                                    accentColor={accentColor}
                                    tenantId={store?.tenantId}
                                    storeId={store?.storeId}
                                    storeTimeZone={store?.timeZone}
                                    businessDayEndTime={store?.businessDayEndTime}
                                    projects={ctaProjects}
                                    obpSurface={isOutletSurface ? 'outlet' : 'brand'}
                                    trackingEnabled={runtimeTrackingEnabled}
                                    includeLocation={includeLocation}
                                    openHoursState={openHoursState}
                                />
                            ) : (
                                <span className={styles.menuButtonDisabled}>
                                    {t('publicMenuComingSoon')}
                                </span>
                            )}
                        </div>

                        <OBPActions
                            tenantId={store?.tenantId}
                            storeId={store?.storeId}
                            trackingEnabled={runtimeTrackingEnabled}
                            storeTimeZone={store?.timeZone}
                            businessDayEndTime={store?.businessDayEndTime}
                            countryCode={store?.countryCode}
                            dialCode={store?.dialCode}
                            includeLocation={includeLocation}
                            openHoursState={openHoursState}
                            phoneNumber={store?.phoneNumber}
                            whatsappNumber={whatsappNumber}
                            directionsUrl={directionsUrl}
                            reservationUrl={safeReservationUrl || undefined}
                            orderUrl={safeOrderUrl || undefined}
                            googleReviewUrl={googleReviewUrl}
                            feedbackUrl={feedbackUrl}
                            iconVariant={iconVariant}
                            showCall={showCall}
                            showWhatsApp={showWhatsApp}
                            showDirections={showDirections}
                            showReservation={showReservation}
                            showOrder={showOrder}
                            showGoogleReview={showGoogleReview}
                            showFeedback={showFeedback}
                            placeholderActions={starterPlaceholderActions}
                            placeholderMessage={t('publicStarterPlaceholderMessage')}
                            labels={{
                                call: t('publicActionCall'),
                                whatsapp: t('publicActionWhatsApp'),
                                directions: t('publicActionDirections'),
                                reserve: t('publicActionReserve'),
                                order: t('publicActionOrder'),
                                reviews: t('publicActionReviews'),
                                feedback: t('publicActionFeedback'),
                            }}
                        />

                        <OBPPhotoStrip
                            closePreviewLabel={t('publicPhotoPreviewClose')}
                            direction={activeLanguageDirection}
                            language={contentLanguage}
                            nextPhotoLabel={t('publicPhotoNext')}
                            photoLabelTemplate={t('publicPhotoLabel', { index: '{index}' })}
                            photoPositionTemplate={t('publicPhotoPosition', { index: '{index}', total: '{total}' })}
                            previousPhotoLabel={t('publicPhotoPrevious')}
                            photos={photos}
                            previewLabel={t('publicPhotoPreview')}
                            storeName={storeName}
                        />

                        {specialNote ? (
                            <section className={styles.note} aria-label={t('publicSpecialNote')}>
                                <h2 className={styles.groupTitle}>
                                    <span className={styles.groupTitleIcon}>{renderDisplayIcon(iconVariant, LuInfo, 'ℹ️')}</span>
                                    {t('publicSpecialNote')}
                                </h2>
                                <p className={styles.noteText}>{specialNote}</p>
                            </section>
                        ) : null}

                        {(fullAddress || todayHours) && (
                            <section className={`${styles.info} ${styles.locationInfo}`} aria-label={t('publicBusinessDetailsLabel')}>
                                <h2 className={styles.groupTitle}>
                                    <span className={styles.groupTitleIcon}>{renderDisplayIcon(iconVariant, LuMapPin, '📍')}</span>
                                    {t('publicLocation')}
                                </h2>
                                {googleMapsEmbedUrl && (
                                    <div className={styles.mapPreview}>
                                        <iframe
                                            allowFullScreen
                                            loading="lazy"
                                            referrerPolicy="no-referrer-when-downgrade"
                                            src={googleMapsEmbedUrl}
                                            title={`${storeLocationName} ${t('publicLocation')}`}
                                        />
                                    </div>
                                )}
                                {fullAddress && (
                                    <p className={styles.locationAddress}>{fullAddress}</p>
                                )}
                                {todayHours && (
                                    <div className={styles.infoRow}>
                                        <span className={styles.infoIcon}>{renderDisplayIcon(iconVariant, LuClock, '🕒', 16)}</span>
                                        <span>{todayHours}</span>
                                    </div>
                                )}
                            </section>
                        )}

                        {customerQuickAnswers.length > 0 && !isPermanentlyClosed ? (
                            <section className={`${styles.info} ${styles.customerAnswers}`} aria-label={t('publicCustomerAnswersTitle')}>
                                <h2 className={styles.groupTitle}>
                                    <span className={styles.groupTitleIcon}>{renderDisplayIcon(iconVariant, LuInfo, 'ℹ️')}</span>
                                    {t('publicCustomerAnswersTitle')}
                                </h2>
                                <div className={styles.customerAnswerList}>
                                    {customerQuickAnswers.map((item) => (
                                        <div key={item.key} className={styles.customerAnswerItem}>
                                            <p className={styles.customerAnswerQuestion}>{item.question}</p>
                                            <p className={styles.customerAnswerText}>{item.answer}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ) : null}
                    </div>

                    {(hasStructuredInfo || hasStarterPreviewUtilityPlaceholders || (FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES && allAttributeTags.length > 0)) && (
                        <div className={styles.utilityStack}>
                            {allHours && !isPermanentlyClosed && (
                                <section className={`${styles.info} ${styles.utilityInfo} ${styles.businessHoursInfo}`} aria-label={t('publicBusinessHours')}>
                                    <details className={styles.details}>
                                        <summary className={styles.groupTitle}>
                                            <span className={styles.groupTitleIcon}>{renderDisplayIcon(iconVariant, LuCalendarDays, '📅')}</span>
                                            <span>{t('publicBusinessHours')}</span>
                                        </summary>
                                        <div className={styles.hoursList}>
                                            {allHours}
                                        </div>
                                    </details>
                                </section>
                            )}

                            {(serviceModeItems.length > 0 || starterPreviewServiceItems.length > 0 || cuisineTypes.length > 0 || priceRange) && !isPermanentlyClosed && (
                                <section className={`${styles.info} ${styles.utilityInfo}`} aria-label={t('publicServiceOptions')}>
                                    <h2 className={styles.groupTitle}>
                                        <span className={styles.groupTitleIcon}>{renderDisplayIcon(iconVariant, LuStore, '🏪')}</span>
                                        {t('publicServiceOptions')}
                                    </h2>
                                    {(serviceModeItems.length > 0 || starterPreviewServiceItems.length > 0) && (
                                        <div className={`${styles.iconGrid} ${styles.iconGridCompact}`}>
                                            {[...serviceModeItems, ...starterPreviewServiceItems].map(renderIconTile)}
                                        </div>
                                    )}
                                    {cuisineTypes.length > 0 && (
                                        <div className={styles.infoRow}>
                                            <span className={styles.infoIcon}>{renderDisplayIcon(iconVariant, LuUtensils, '🍽️', 16)}</span>
                                            <span>{cuisineTypes.join(', ')}</span>
                                        </div>
                                    )}
                                    {priceRange && (
                                        <div className={styles.infoRow}>
                                            <span className={styles.infoIcon}>{renderDisplayIcon(iconVariant, LuBanknote, store?.currencySymbol || '₹', 16)}</span>
                                            <span>{t('publicPriceRange', { value: priceRange })}</span>
                                        </div>
                                    )}
                                </section>
                            )}

                            {(paymentItems.length > 0 || starterPreviewPaymentItems.length > 0) && !isPermanentlyClosed && (
                                <section className={`${styles.info} ${styles.utilityInfo}`} aria-label={t('publicPaymentOptions')}>
                                    <h2 className={styles.groupTitle}>
                                        <span className={styles.groupTitleIcon}>{renderDisplayIcon(iconVariant, LuCreditCard, '💳')}</span>
                                        {t('publicPaymentOptions')}
                                    </h2>
                                    <div className={`${styles.iconGrid} ${styles.iconGridCompact}`}>
                                        {[...paymentItems, ...starterPreviewPaymentItems].map(renderIconTile)}
                                    </div>
                                </section>
                            )}

                            {FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES && dietaryAttributeTags.length > 0 && (
                                <section className={`${styles.info} ${styles.utilityInfo}`} aria-label={t('publicDietaryOptions')}>
                                    <h2 className={styles.groupTitle}>
                                        <span className={styles.groupTitleIcon}>{renderDisplayIcon(iconVariant, LuLeaf, '🌿')}</span>
                                        {t('publicDietaryOptions')}
                                    </h2>
                                    <div className={`${styles.iconGrid} ${styles.iconGridCompact}`}>
                                        {dietaryAttributeTags.map(renderIconTile)}
                                    </div>
                                </section>
                            )}

                            {FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES && amenityAttributeTags.length > 0 && (
                                <section className={`${styles.info} ${styles.utilityInfo}`} aria-label={t('publicAmenities')}>
                                    <h2 className={styles.groupTitle}>
                                        <span className={styles.groupTitleIcon}>{renderDisplayIcon(iconVariant, LuStore, '🏪')}</span>
                                        {t('publicAmenities')}
                                    </h2>
                                    <div className={styles.iconGrid}>
                                        {amenityAttributeTags.map(renderIconTile)}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}

                    <footer className={styles.footer}>
                        <div className={`${styles.footerCard} ${styles.footerUtilityCard}`}>
                            {hasSocials && (
                                <div className={styles.footerSocials}>
                                    <OBPExternalLinks
                                        tenantId={store?.tenantId}
                                        storeId={store?.storeId}
                                        trackingEnabled={runtimeTrackingEnabled}
                                        storeTimeZone={store?.timeZone}
                                        businessDayEndTime={store?.businessDayEndTime}
                                        countryCode={store?.countryCode}
                                        dialCode={store?.dialCode}
                                        includeLocation={includeLocation}
                                        openHoursState={openHoursState}
                                        labels={{
                                            facebook: t('publicSocialPlatforms.facebook'),
                                            instagram: t('publicSocialPlatforms.instagram'),
                                            linkedin: t('publicSocialPlatforms.linkedin'),
                                            twitter: t('publicSocialPlatforms.twitter'),
                                            website: t('publicSocialPlatforms.website'),
                                            whatsapp: t('publicSocialPlatforms.whatsapp'),
                                            youtube: t('publicSocialPlatforms.youtube'),
                                        }}
                                        socialAriaLabelTemplate={t('publicSocialLinkLabel', { platform: '{platform}' })}
                                        placeholderPlatforms={starterPlaceholderSocials}
                                        placeholderMessage={t('publicStarterPlaceholderMessage')}
                                        instagram={instagram}
                                        facebook={facebook}
                                        twitter={twitter}
                                        linkedin={linkedin}
                                        youtube={youtube}
                                        whatsapp={socialWhatsApp}
                                        website={website}
                                    />
                                </div>
                            )}
                            {FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES && policyLinks.length > 0 && (
                                <div className={styles.policyLinks}>
                                    {policyLinks.map((link) => (
                                        <a key={link.href} href={link.href}>{link.label}</a>
                                    ))}
                                </div>
                            )}
                            {showFeedback && feedbackUrl && (
                                <a className={styles.footerFeedbackLink} href={feedbackUrl}>
                                    {t('publicShareFeedback')}
                                </a>
                            )}
                            <OBPThemeToggle
                                switchToDarkLabel={t('publicSwitchToDarkTheme')}
                                switchToLightLabel={t('publicSwitchToLightTheme')}
                            />
                        </div>
                        {resolveMenuListAttributionPolicy({ activePlanType: (store as any)?.activePlanType }).showAttribution ? (
                        <div className={`${styles.footerCard} ${styles.footerBrandingCard}`}>
                            <PublicMenuListAttribution
                                activePlanType={(store as any)?.activePlanType}
                                ariaLabel={publicCustomerT('common.createOfficialCustomerLink')}
                                mode="compact"
                                surfaceLabel={t('publicOfficialPagePoweredBy')}
                                rightsLabel={t('publicAllRightsReserved')}
                                ctaLabel={null}
                                mutedColor="#999"
                                containerStyle={{ marginTop: 0, paddingBottom: 0 }}
                            />
                        </div>
                        ) : null}
                    </footer>
                </div>
            </main>

            {includeRuntime && FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA && store?.storeId ? (
                <OBPCustomerAppMount
                    activeLanguage={contentLanguage}
                    storeId={store.storeId}
                    tenantId={store.tenantId}
                    storeName={storeName || t('publicFallbackMenu')}
                    storeTimeZone={store.timeZone}
                    themeColor={accentColor}
                    promoteInstallation={
                        (store as any)?.pwaSettings?.promoteInstallation !== false
                    }
                    trackingEnabled={runtimeTrackingEnabled}
                />
            ) : null}
        </>
    );
}
