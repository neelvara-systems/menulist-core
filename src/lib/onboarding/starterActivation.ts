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
    APPLE_BUSINESS_MARKED: 'apple_business_marked',
    BING_PLACES_MARKED: 'bing_places_marked',
    INSTAGRAM_BIO_MARKED: 'instagram_bio_marked',
    WHATSAPP_PROFILE_MARKED: 'whatsapp_profile_marked',
} as const;

export type StarterActivationSignal =
    typeof STARTER_ACTIVATION_SIGNALS[keyof typeof STARTER_ACTIVATION_SIGNALS];

export const STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE = {
    googleBusiness: STARTER_ACTIVATION_SIGNALS.GOOGLE_BUSINESS_MARKED,
    appleBusiness: STARTER_ACTIVATION_SIGNALS.APPLE_BUSINESS_MARKED,
    bingPlaces: STARTER_ACTIVATION_SIGNALS.BING_PLACES_MARKED,
    instagramBio: STARTER_ACTIVATION_SIGNALS.INSTAGRAM_BIO_MARKED,
    whatsappProfile: STARTER_ACTIVATION_SIGNALS.WHATSAPP_PROFILE_MARKED,
} as const;

export type StarterActivationEvidenceType = 'menulist_recorded' | 'owner_confirmed_external';

export const STARTER_ACTIVATION_SIGNAL_DETAILS: Record<
    StarterActivationSignal,
    {
        evidenceType: StarterActivationEvidenceType;
        howKnown: string;
        label: string;
    }
> = {
    [STARTER_ACTIVATION_SIGNALS.MENU_LINK_COPIED]: {
        evidenceType: 'menulist_recorded',
        howKnown: 'MenuList recorded the owner copying the official link.',
        label: 'Link copied',
    },
    [STARTER_ACTIVATION_SIGNALS.QR_DOWNLOADED]: {
        evidenceType: 'menulist_recorded',
        howKnown: 'MenuList recorded a QR download.',
        label: 'QR downloaded',
    },
    [STARTER_ACTIVATION_SIGNALS.MENU_KIT_DOWNLOADED]: {
        evidenceType: 'menulist_recorded',
        howKnown: 'MenuList recorded a Menu Kit download.',
        label: 'Menu Kit downloaded',
    },
    [STARTER_ACTIVATION_SIGNALS.NATIVE_SHARE_COMPLETED]: {
        evidenceType: 'menulist_recorded',
        howKnown: 'MenuList recorded a completed device share.',
        label: 'Phone share completed',
    },
    [STARTER_ACTIVATION_SIGNALS.WHATSAPP_SHARE_STARTED]: {
        evidenceType: 'menulist_recorded',
        howKnown: 'MenuList recorded the owner opening WhatsApp share.',
        label: 'WhatsApp share started',
    },
    [STARTER_ACTIVATION_SIGNALS.GOOGLE_BUSINESS_MARKED]: {
        evidenceType: 'owner_confirmed_external',
        howKnown: 'The owner marked Google Business as added.',
        label: 'Google Business marked',
    },
    [STARTER_ACTIVATION_SIGNALS.APPLE_BUSINESS_MARKED]: {
        evidenceType: 'owner_confirmed_external',
        howKnown: 'The owner marked Apple Business Connect as added.',
        label: 'Apple Business marked',
    },
    [STARTER_ACTIVATION_SIGNALS.BING_PLACES_MARKED]: {
        evidenceType: 'owner_confirmed_external',
        howKnown: 'The owner marked Bing Places as added.',
        label: 'Bing Places marked',
    },
    [STARTER_ACTIVATION_SIGNALS.INSTAGRAM_BIO_MARKED]: {
        evidenceType: 'owner_confirmed_external',
        howKnown: 'The owner marked Instagram Bio as added.',
        label: 'Instagram Bio marked',
    },
    [STARTER_ACTIVATION_SIGNALS.WHATSAPP_PROFILE_MARKED]: {
        evidenceType: 'owner_confirmed_external',
        howKnown: 'The owner marked WhatsApp Profile as added.',
        label: 'WhatsApp Profile marked',
    },
};

const STARTER_ACTIVATION_SIGNAL_ORDER = Object.values(STARTER_ACTIVATION_SIGNALS);

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

    try {
        let millis: number | null = null;
        if (value instanceof Date) {
            millis = value.getTime();
        } else if (typeof value === 'number') {
            millis = value;
        } else if (typeof value === 'string') {
            millis = Date.parse(value);
        } else if (typeof value === 'object') {
            const record = value as {
                toMillis?: () => number;
                toDate?: () => Date;
                seconds?: number;
                _seconds?: number;
            };

            if (typeof record.toMillis === 'function') {
                millis = record.toMillis();
            } else if (typeof record.toDate === 'function') {
                millis = record.toDate().getTime();
            } else if (typeof record.seconds === 'number') {
                millis = record.seconds * 1000;
            } else if (typeof record._seconds === 'number') {
                millis = record._seconds * 1000;
            }
        }

        if (millis === null || !Number.isFinite(millis) || millis <= 0) return null;
        const normalized = new Date(millis).getTime();
        return Number.isFinite(normalized) ? normalized : null;
    } catch {
        return null;
    }
}

export function normalizeStarterActivationTimestamp(value: unknown): string | null {
    const millis = timestampLikeToMillis(value);
    if (millis === null) return null;
    try {
        return new Date(millis).toISOString();
    } catch {
        return null;
    }
}

export function applyStarterActivationSignalToStoreDetails(
    storeDetails: StoreDataType | null,
    signal: StarterActivationSignal,
    recordedAt: unknown,
    expectedStoreId?: string | number,
): StoreDataType | null {
    const normalizedRecordedAt = normalizeStarterActivationTimestamp(recordedAt);
    if (
        !storeDetails
        || !isStarterActivationSignal(signal)
        || !normalizedRecordedAt
        || (expectedStoreId !== undefined && String(storeDetails.storeId) !== String(expectedStoreId))
    ) return storeDetails;

    return {
        ...storeDetails,
        starterActivationSignals: {
            ...(storeDetails.starterActivationSignals || {}),
            actions: {
                ...(storeDetails.starterActivationSignals?.actions || {}),
                [signal]: normalizedRecordedAt,
            },
            lastSignalAt: normalizedRecordedAt,
        },
    };
}

export function applyStarterPresenceUpdateToStoreDetails(
    storeDetails: StoreDataType | null,
    surface: keyof typeof STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE,
    confirmed: boolean,
    recordedAt: unknown,
    starterSignal?: StarterActivationSignal,
    expectedStoreId?: string | number,
): StoreDataType | null {
    const normalizedRecordedAt = normalizeStarterActivationTimestamp(recordedAt);
    if (
        !storeDetails
        || !normalizedRecordedAt
        || !(surface in STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE)
        || (expectedStoreId !== undefined && String(storeDetails.storeId) !== String(expectedStoreId))
    ) {
        return storeDetails;
    }

    const nextPresence = { ...(storeDetails.menuPresence || {}) };
    const nextActions = { ...(storeDetails.starterActivationSignals?.actions || {}) };
    const canonicalSignal = STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE[surface];
    if (confirmed) {
        nextPresence[surface] = normalizedRecordedAt;
        if (starterSignal === canonicalSignal) nextActions[canonicalSignal] = normalizedRecordedAt;
    } else {
        delete nextPresence[surface];
        delete nextActions[canonicalSignal];
    }

    return {
        ...storeDetails,
        menuPresence: nextPresence,
        starterActivationSignals: {
            ...(storeDetails.starterActivationSignals || {}),
            actions: nextActions,
            ...(confirmed && starterSignal ? { lastSignalAt: normalizedRecordedAt } : {}),
        },
    };
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

export interface StarterActivationRecordedSignal {
    signal: StarterActivationSignal;
    label: string;
    howKnown: string;
    evidenceType: StarterActivationEvidenceType;
    recordedAt?: string;
}

export interface StarterActivationSummary {
    appliesToStarterActivation: boolean;
    activated: boolean;
    ownerConfirmedCount: number;
    remainingCount: number;
    recordedSignals: StarterActivationRecordedSignal[];
    signalCount: number;
    systemRecordedCount: number;
    target: number;
}

export function buildStarterActivationSummary(
    storeDetails?: Pick<
        StoreDataType,
        'activePlanType' | 'activationDeadline' | 'menuPresence' | 'onboardingSource' | 'starterActivationSignals' | 'starterActivationStatus'
    > | null,
): StarterActivationSummary {
    const signalTimestamps = new Map<StarterActivationSignal, string | undefined>();
    const actions = storeDetails?.starterActivationSignals?.actions || {};

    Object.entries(actions).forEach(([signal, recordedAt]) => {
        const normalizedRecordedAt = normalizeStarterActivationTimestamp(recordedAt);
        if (isStarterActivationSignal(signal) && normalizedRecordedAt) {
            signalTimestamps.set(signal, normalizedRecordedAt);
        }
    });

    Object.entries(STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE).forEach(([surface, signal]) => {
        const presenceRecordedAt = storeDetails?.menuPresence?.[surface as keyof NonNullable<StoreDataType['menuPresence']>];
        const normalizedRecordedAt = normalizeStarterActivationTimestamp(presenceRecordedAt);
        if (normalizedRecordedAt) {
            signalTimestamps.set(signal, normalizedRecordedAt);
        }
    });

    const recordedSignals = STARTER_ACTIVATION_SIGNAL_ORDER
        .filter((signal) => signalTimestamps.has(signal))
        .map((signal) => ({
            signal,
            ...STARTER_ACTIVATION_SIGNAL_DETAILS[signal],
            recordedAt: signalTimestamps.get(signal),
        }));

    const signalCount = recordedSignals.length;
    const systemRecordedCount = recordedSignals.filter((signal) => signal.evidenceType === 'menulist_recorded').length;
    const ownerConfirmedCount = recordedSignals.filter((signal) => signal.evidenceType === 'owner_confirmed_external').length;

    return {
        appliesToStarterActivation: isStarterActivationStore(storeDetails),
        activated: signalCount >= STARTER_DISTRIBUTION_ACTIVATION_TARGET,
        ownerConfirmedCount,
        remainingCount: Math.max(0, STARTER_DISTRIBUTION_ACTIVATION_TARGET - signalCount),
        recordedSignals,
        signalCount,
        systemRecordedCount,
        target: STARTER_DISTRIBUTION_ACTIVATION_TARGET,
    };
}
