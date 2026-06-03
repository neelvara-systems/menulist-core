import type { StoreDataType } from '@type/platform/store';

export const STARTER_ACTIVATION_DAYS = 7;
export const STARTER_ACTIVATION_MS = STARTER_ACTIVATION_DAYS * 24 * 60 * 60 * 1000;

export const STARTER_ACTIVATION_STATUS = {
    PREVIEW_CREATED: 'preview_created',
    STARTER_ACTIVE: 'starter_active',
    PAYMENT_PENDING: 'payment_pending',
    ACTIVE_PAID: 'active_paid',
    STARTER_EXPIRED: 'starter_expired',
    ARCHIVED: 'archived',
} as const;

export type StarterActivationStatus =
    typeof STARTER_ACTIVATION_STATUS[keyof typeof STARTER_ACTIVATION_STATUS];

export type StarterActivationSource = 'PUBLIC_MENU_ENTRY' | 'MESSAGING_ONBOARDING';

export const STARTER_DISTRIBUTION_ACTIVATION_TARGET = 2;

export const STARTER_ACTIVATION_SIGNALS = {
    MENU_LINK_COPIED: 'menu_link_copied',
    QR_DOWNLOADED: 'qr_downloaded',
    MENU_KIT_DOWNLOADED: 'menu_kit_downloaded',
    NATIVE_SHARE_COMPLETED: 'native_share_completed',
    WHATSAPP_SHARE_STARTED: 'whatsapp_share_started',
    GOOGLE_BUSINESS_MARKED: 'google_business_marked',
    INSTAGRAM_BIO_MARKED: 'instagram_bio_marked',
    WHATSAPP_PROFILE_MARKED: 'whatsapp_profile_marked',
} as const;

export type StarterActivationSignal =
    typeof STARTER_ACTIVATION_SIGNALS[keyof typeof STARTER_ACTIVATION_SIGNALS];

export const STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE = {
    googleBusiness: STARTER_ACTIVATION_SIGNALS.GOOGLE_BUSINESS_MARKED,
    instagramBio: STARTER_ACTIVATION_SIGNALS.INSTAGRAM_BIO_MARKED,
    whatsappProfile: STARTER_ACTIVATION_SIGNALS.WHATSAPP_PROFILE_MARKED,
} as const;

const STARTER_ACTIVATION_SOURCES = new Set<string>([
    'PUBLIC_MENU_ENTRY',
    'MESSAGING_ONBOARDING',
]);

const STARTER_ACTIVATION_SIGNAL_VALUES = new Set<string>(
    Object.values(STARTER_ACTIVATION_SIGNALS),
);

const STARTER_WORKSPACE_ROUTE_PREFIXES = [
    '/projects',
    '/use-menulist',
    '/qr-code',
    '/qrCode',
    '/business-settings',
    '/billing',
    '/help-center',
];

const STARTER_RECOVERY_ROUTE_PREFIXES = [
    '/billing',
    '/help-center',
];

export function isStarterActivationSource(source?: string | null): source is StarterActivationSource {
    return Boolean(source && STARTER_ACTIVATION_SOURCES.has(source));
}

export function isStarterActivationSignal(signal?: string | null): signal is StarterActivationSignal {
    return Boolean(signal && STARTER_ACTIVATION_SIGNAL_VALUES.has(signal));
}

export function getStarterActivationDeadlineMs(nowMs = Date.now()) {
    return nowMs + STARTER_ACTIVATION_MS;
}

function timestampLikeToMillis(value: unknown): number | null {
    if (!value) return null;

    if (value instanceof Date) {
        return value.getTime();
    }

    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? null : parsed;
    }

    if (typeof value === 'object') {
        const record = value as {
            toMillis?: () => number;
            toDate?: () => Date;
            seconds?: number;
            _seconds?: number;
        };

        if (typeof record.toMillis === 'function') {
            return record.toMillis();
        }

        if (typeof record.toDate === 'function') {
            return record.toDate().getTime();
        }

        if (typeof record.seconds === 'number') {
            return record.seconds * 1000;
        }

        if (typeof record._seconds === 'number') {
            return record._seconds * 1000;
        }
    }

    return null;
}

function normalizePath(pathname: string) {
    if (!pathname || pathname === '/') return '/';
    return pathname.replace(/\/+$/, '');
}

function routeMatches(pathname: string, routePrefixes: string[]) {
    const normalized = normalizePath(pathname);
    return routePrefixes.some((route) => (
        normalized === route || normalized.startsWith(`${route}/`)
    ));
}

export function isStarterWorkspaceRoute(pathname: string) {
    return routeMatches(pathname, STARTER_WORKSPACE_ROUTE_PREFIXES);
}

export function isStarterRecoveryRoute(pathname: string) {
    return routeMatches(pathname, STARTER_RECOVERY_ROUTE_PREFIXES);
}

export function isStarterActivationStore(storeDetails?: Pick<StoreDataType, 'onboardingSource'> | null) {
    return isStarterActivationSource(storeDetails?.onboardingSource);
}

function hasStarterPaidPublicAccess(storeDetails?: Pick<StoreDataType, 'activePlanType' | 'starterActivationStatus'> | null) {
    return Boolean(
        storeDetails?.activePlanType ||
        storeDetails?.starterActivationStatus === STARTER_ACTIVATION_STATUS.ACTIVE_PAID,
    );
}

export function shouldRecordStarterActivationSignal(
    storeDetails?: Pick<StoreDataType, 'activationDeadline' | 'activePlanType' | 'onboardingSource' | 'starterActivationStatus'> | null,
) {
    if (!isStarterActivationStore(storeDetails)) return false;
    if (hasStarterPaidPublicAccess(storeDetails)) return false;
    if (isStarterActivationExpired(storeDetails)) return false;
    return storeDetails?.starterActivationStatus !== STARTER_ACTIVATION_STATUS.STARTER_EXPIRED
        && storeDetails?.starterActivationStatus !== STARTER_ACTIVATION_STATUS.ARCHIVED;
}

export function shouldShowStarterPublicPlaceholders(
    storeDetails?: Pick<StoreDataType, 'activationDeadline' | 'activePlanType' | 'onboardingSource' | 'starterActivationStatus'> | null,
    nowMs = Date.now(),
) {
    if (!isStarterActivationStore(storeDetails)) return false;
    if (hasStarterPaidPublicAccess(storeDetails)) return false;
    if (isStarterActivationExpired(storeDetails, nowMs)) return false;
    return storeDetails?.starterActivationStatus !== STARTER_ACTIVATION_STATUS.STARTER_EXPIRED
        && storeDetails?.starterActivationStatus !== STARTER_ACTIVATION_STATUS.ARCHIVED;
}

export function isStarterActivationExpired(
    storeDetails?: Pick<StoreDataType, 'activationDeadline' | 'onboardingSource'> | null,
    nowMs = Date.now(),
) {
    if (!isStarterActivationStore(storeDetails)) return false;
    const deadlineMs = timestampLikeToMillis(storeDetails?.activationDeadline);
    return Boolean(deadlineMs && deadlineMs <= nowMs);
}

export function hasStarterWorkspaceAccess(
    storeDetails: Pick<StoreDataType, 'activationDeadline' | 'onboardingSource'> | null | undefined,
    hasPaidAccess: boolean,
    nowMs = Date.now(),
) {
    if (hasPaidAccess) return false;
    if (!isStarterActivationStore(storeDetails)) return false;
    return !isStarterActivationExpired(storeDetails, nowMs);
}

export function isStarterPublicSurfaceExpired(
    storeDetails?: Pick<StoreDataType, 'activationDeadline' | 'activePlanType' | 'onboardingSource' | 'starterActivationStatus'> | null,
    nowMs = Date.now(),
) {
    if (!isStarterActivationStore(storeDetails)) return false;
    if (hasStarterPaidPublicAccess(storeDetails)) return false;
    return isStarterActivationExpired(storeDetails, nowMs);
}

export function getStarterActivationRemainingDays(
    storeDetails?: Pick<StoreDataType, 'activationDeadline'> | null,
    nowMs = Date.now(),
) {
    const deadlineMs = timestampLikeToMillis(storeDetails?.activationDeadline);
    if (!deadlineMs) return null;

    const remainingMs = deadlineMs - nowMs;
    return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
}

export function getStarterActivationSignalCount(
    storeDetails?: Pick<StoreDataType, 'menuPresence' | 'starterActivationSignals'> | null,
) {
    const signalKeys = new Set<StarterActivationSignal>();
    const actions = storeDetails?.starterActivationSignals?.actions || {};

    Object.keys(actions).forEach((signal) => {
        if (isStarterActivationSignal(signal)) {
            signalKeys.add(signal);
        }
    });

    Object.entries(STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE).forEach(([surface, signal]) => {
        if (storeDetails?.menuPresence?.[surface as keyof NonNullable<StoreDataType['menuPresence']>]) {
            signalKeys.add(signal);
        }
    });

    return signalKeys.size;
}

export function hasStarterDistributionActivation(
    storeDetails?: Pick<StoreDataType, 'menuPresence' | 'starterActivationSignals'> | null,
) {
    return getStarterActivationSignalCount(storeDetails) >= STARTER_DISTRIBUTION_ACTIVATION_TARGET;
}
