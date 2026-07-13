export type OnboardingProviderSubscription = {
    id: string;
    short_url?: unknown;
    total_count?: unknown;
};

export const isOnboardingProviderSubscription = (
    value: unknown,
): value is OnboardingProviderSubscription => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const candidate = value as Record<string, unknown>;
    return typeof candidate.id === 'string'
        && /^sub_[A-Za-z0-9]+$/.test(candidate.id)
        && candidate.id.length <= 120;
};

const exactProviderNote = (value: unknown): string => (
    typeof value === 'string' || typeof value === 'number' ? String(value) : ''
);

export function findOnboardingProviderSubscriptionForAttempt(params: {
    attemptId: string;
    candidates: unknown;
    planId: string;
    providerPlanId: string;
    storeId: number;
    tenantId: number;
    userId: string;
}): OnboardingProviderSubscription | null {
    if (!Array.isArray(params.candidates)) return null;
    for (const candidate of params.candidates) {
        if (!isOnboardingProviderSubscription(candidate)) continue;
        const record = candidate as Record<string, unknown>;
        const notes = record.notes;
        if (!notes || typeof notes !== 'object' || Array.isArray(notes)) continue;
        const noteRecord = notes as Record<string, unknown>;
        if (
            exactProviderNote(record.plan_id) === params.providerPlanId
            && exactProviderNote(noteRecord.onboardingAttemptId) === params.attemptId
            && exactProviderNote(noteRecord.onboardingSource) === 'WEBSITE_ONBOARDING'
            && exactProviderNote(noteRecord.planId) === params.planId
            && exactProviderNote(noteRecord.storeId) === String(params.storeId)
            && exactProviderNote(noteRecord.tenantId) === String(params.tenantId)
            && exactProviderNote(noteRecord.userId) === params.userId
        ) {
            return candidate;
        }
    }
    return null;
}

export const resolveOnboardingPlanPrice = (value: unknown): {
    monthlyCredits: number;
    price: number;
} | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const price = (value as Record<string, unknown>).price;
    const monthlyCredits = (value as Record<string, unknown>).monthlyCredits;
    if (typeof price !== 'number' || typeof monthlyCredits !== 'number') return null;
    if (!Number.isSafeInteger(price) || price <= 0) return null;
    if (!Number.isSafeInteger(monthlyCredits) || monthlyCredits < 0) return null;
    return { monthlyCredits, price };
};
