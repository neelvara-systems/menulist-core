import { getTenantStoreStorageKey } from './tenantStoreKey';

export const EDITOR_ONBOARDING_MARKER = 'v1';

export type EditorOnboardingStorageKeys = {
    outletSeen: string;
    welcomeDismissed: string;
};

export const getEditorOnboardingStorageKeys = (
    tenantId: unknown,
    storeId: unknown,
): EditorOnboardingStorageKeys | null => {
    const welcomeDismissed = getTenantStoreStorageKey(
        'editor_welcome_dismissed',
        tenantId,
        storeId,
    );
    const outletSeen = getTenantStoreStorageKey(
        'editor_outlet_onboarding_seen',
        tenantId,
        storeId,
    );

    return welcomeDismissed && outletSeen
        ? { outletSeen, welcomeDismissed }
        : null;
};

export const isEditorOnboardingMarker = (value: string | null): boolean => {
    return value === EDITOR_ONBOARDING_MARKER;
};
