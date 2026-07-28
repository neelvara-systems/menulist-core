import { createHash } from 'crypto';

export const ANSWERLATTICE_ONBOARDING_STATUS = {
    PAYMENT_PENDING: 'payment_pending',
    PAYMENT_PROVIDER_FAILED: 'payment_provider_failed',
    PROVIDER_RECOVERY_PENDING: 'provider_recovery_pending',
    PROVISIONING: 'provisioning',
} as const;

export const ANSWERLATTICE_ONBOARDING_PROVIDER_RECOVERY_HOLD_MS = 15 * 60 * 1000;

export type AnswerlatticeOnboardingStatus = (
    typeof ANSWERLATTICE_ONBOARDING_STATUS[keyof typeof ANSWERLATTICE_ONBOARDING_STATUS]
);

export type AnswerlatticeOnboardingRequestIdentity = {
    billingModel: 'subscription' | 'usage' | 'one_time' | 'not_sure';
    businessDayEndTime: string;
    companyName: string;
    currency: 'INR' | 'USD';
    interval: 'MONTH';
    planId: string;
    primarySurfaces: string[];
    productName: string;
    productUrl: string;
    supportEmail: string;
    timeZone: string;
};

export type AnswerlatticeProviderSubscriptionCandidate = {
    created_at?: number;
    id?: string;
    notes?: Record<string, unknown> | unknown[] | null;
    plan_id?: string;
    short_url?: string | null;
    status?: string;
    total_count?: number;
};

const normalizeString = (value: unknown): string => {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value === 'boolean') return String(value);
    return '';
};
const ANSWERLATTICE_TERMINAL_PROVIDER_SUBSCRIPTION_STATUSES = new Set([
    'cancelled',
    'completed',
    'expired',
]);

export function buildAnswerlatticeOnboardingRequestFingerprint(
    input: AnswerlatticeOnboardingRequestIdentity,
): string {
    const normalized: AnswerlatticeOnboardingRequestIdentity = {
        billingModel: input.billingModel,
        businessDayEndTime: normalizeString(input.businessDayEndTime),
        companyName: normalizeString(input.companyName),
        currency: input.currency,
        interval: input.interval,
        planId: normalizeString(input.planId),
        primarySurfaces: Array.from(new Set(input.primarySurfaces.map(normalizeString).filter(Boolean))).sort(),
        productName: normalizeString(input.productName),
        productUrl: normalizeString(input.productUrl),
        supportEmail: normalizeString(input.supportEmail).toLowerCase(),
        timeZone: normalizeString(input.timeZone),
    };

    return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export function getAnswerlatticeOnboardingTimestampMillis(value: unknown): number {
    try {
        if (!value) return 0;
        if (value instanceof Date) {
            const millis = value.getTime();
            return Number.isFinite(millis) ? millis : 0;
        }
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        if (typeof value === 'string') {
            const parsed = Date.parse(value);
            return Number.isFinite(parsed) ? parsed : 0;
        }
        if (typeof value !== 'object' || Array.isArray(value)) return 0;

        const timestamp = value as {
            _nanoseconds?: unknown;
            _seconds?: unknown;
            nanoseconds?: unknown;
            seconds?: unknown;
            toMillis?: unknown;
        };
        const toMillis = timestamp.toMillis;
        if (typeof toMillis === 'function') {
            const millis = toMillis.call(value);
            return typeof millis === 'number' && Number.isFinite(millis) ? millis : 0;
        }

        const seconds = timestamp.seconds ?? timestamp._seconds;
        const nanoseconds = timestamp.nanoseconds ?? timestamp._nanoseconds ?? 0;
        if (
            typeof seconds !== 'number'
            || !Number.isSafeInteger(seconds)
            || typeof nanoseconds !== 'number'
            || !Number.isSafeInteger(nanoseconds)
            || nanoseconds < 0
            || nanoseconds > 999_999_999
        ) return 0;
        const millis = (seconds * 1000) + Math.floor(nanoseconds / 1_000_000);
        return Number.isSafeInteger(millis) ? millis : 0;
    } catch {
        return 0;
    }
}

export const getAnswerlatticeOnboardingPositiveInteger = (value: unknown): number | null => (
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0
        ? value
        : null
);

export function findAnswerlatticeProviderSubscriptionForAttempt(params: {
    attemptId: string;
    candidates: AnswerlatticeProviderSubscriptionCandidate[];
    planId: string;
    providerPlanId: string;
    storeId: number;
    tenantId: number;
}): AnswerlatticeProviderSubscriptionCandidate | null {
    const attemptId = normalizeString(params.attemptId);
    if (!attemptId) return null;

    const matches = params.candidates.filter((candidate) => {
        return normalizeString(candidate.status) === 'created'
            && answerlatticeProviderSubscriptionMatchesAttempt({
                attemptId,
                candidate,
                planId: params.planId,
                providerPlanId: params.providerPlanId,
                storeId: params.storeId,
                tenantId: params.tenantId,
            });
    });

    matches.sort((left, right) => (
        (typeof right.created_at === 'number' && Number.isFinite(right.created_at) ? right.created_at : 0)
        - (typeof left.created_at === 'number' && Number.isFinite(left.created_at) ? left.created_at : 0)
    ));
    return matches[0] || null;
}

export function answerlatticeProviderSubscriptionMatchesAttempt(params: {
    attemptId: string;
    candidate: AnswerlatticeProviderSubscriptionCandidate;
    planId: string;
    providerPlanId: string;
    storeId: number;
    tenantId: number;
}): boolean {
    const attemptId = normalizeString(params.attemptId);
    const candidate = params.candidate;
    if (
        !attemptId
        || !candidate
        || !normalizeString(candidate.id)
        || normalizeString(candidate.plan_id) !== params.providerPlanId
        || !candidate.notes
        || Array.isArray(candidate.notes)
        || typeof candidate.notes !== 'object'
    ) return false;

    const notes = candidate.notes as Record<string, unknown>;
    return normalizeString(notes.onboardingAttemptId) === attemptId
        && normalizeString(notes.productId) === 'AL'
        && normalizeString(notes.planId) === params.planId
        && normalizeString(notes.tenantId) === String(params.tenantId)
        && normalizeString(notes.storeId) === String(params.storeId);
}

export function isAnswerlatticeTerminalProviderSubscriptionStatus(status: unknown): boolean {
    return ANSWERLATTICE_TERMINAL_PROVIDER_SUBSCRIPTION_STATUSES.has(
        normalizeString(status).toLowerCase(),
    );
}

export function shouldHoldAnswerlatticeOnboardingProviderRecovery(params: {
    nowMillis?: number;
    providerSubscriptionId?: unknown;
    recoveryAvailableAt?: unknown;
}): boolean {
    if (normalizeString(params.providerSubscriptionId)) return false;
    const recoveryAvailableAtMillis = getAnswerlatticeOnboardingTimestampMillis(params.recoveryAvailableAt);
    if (!recoveryAvailableAtMillis) return true;
    const nowMillis = Number.isFinite(params.nowMillis) ? Number(params.nowMillis) : Date.now();
    return nowMillis < recoveryAvailableAtMillis;
}
