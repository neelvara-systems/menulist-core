export const DEPLOYMENT_BADGE_TOGGLE_EVENT = 'menulist:deployment-badge-toggle';
export const DEPLOYMENT_BADGE_STORAGE_KEY = 'menulist_deployment_badge_visible';
export const DEPLOYMENT_IDENTITY_EVENT = 'menulist:deployment-identity-updated';
export const DEPLOYMENT_IDENTITY_STORAGE_KEY = 'menulist_deployment_identity';

export interface DeploymentDebugIdentity {
    tenantId: string;
    tenantName: string;
    storeId: string;
    storeName: string;
}

const DEPLOYMENT_DEBUG_ID_MAX_LENGTH = 128;
const DEPLOYMENT_DEBUG_NAME_MAX_LENGTH = 200;
const DEPLOYMENT_DEBUG_CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeIdentityId = (value: unknown): string | null => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value >= 0 ? String(value) : null;
    }
    if (typeof value !== 'string') return null;

    const normalized = value.trim();
    if (
        normalized.length === 0
        || normalized.length > DEPLOYMENT_DEBUG_ID_MAX_LENGTH
        || DEPLOYMENT_DEBUG_CONTROL_CHARACTERS.test(normalized)
    ) {
        return null;
    }
    return normalized;
};

const normalizeIdentityName = (value: unknown): string | null => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value !== 'string') return null;

    const normalized = value.trim();
    if (
        normalized.length > DEPLOYMENT_DEBUG_NAME_MAX_LENGTH
        || DEPLOYMENT_DEBUG_CONTROL_CHARACTERS.test(normalized)
    ) {
        return null;
    }
    return normalized;
};

export function normalizeDeploymentDebugIdentity(value: unknown): DeploymentDebugIdentity | null {
    if (!isRecord(value)) return null;

    const tenantId = normalizeIdentityId(value.tenantId);
    const tenantName = normalizeIdentityName(value.tenantName);
    const storeId = normalizeIdentityId(value.storeId);
    const storeName = normalizeIdentityName(value.storeName);
    if (tenantId === null || tenantName === null || storeId === null || storeName === null) {
        return null;
    }

    return { tenantId, tenantName, storeId, storeName };
}

export function parseDeploymentDebugIdentity(value: string): DeploymentDebugIdentity | null {
    try {
        return normalizeDeploymentDebugIdentity(JSON.parse(value));
    } catch {
        return null;
    }
}

export function emitDeploymentBadgeToggle() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(DEPLOYMENT_BADGE_TOGGLE_EVENT));
}

export function emitDeploymentIdentityUpdated() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(DEPLOYMENT_IDENTITY_EVENT));
}
