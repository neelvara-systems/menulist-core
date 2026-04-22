export const DEPLOYMENT_BADGE_TOGGLE_EVENT = 'menulist:deployment-badge-toggle';
export const DEPLOYMENT_BADGE_STORAGE_KEY = 'menulist_deployment_badge_visible';
export const DEPLOYMENT_IDENTITY_EVENT = 'menulist:deployment-identity-updated';
export const DEPLOYMENT_IDENTITY_STORAGE_KEY = 'menulist_deployment_identity';

export function emitDeploymentBadgeToggle() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(DEPLOYMENT_BADGE_TOGGLE_EVENT));
}

export function emitDeploymentIdentityUpdated() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(DEPLOYMENT_IDENTITY_EVENT));
}
