export const DEPLOYMENT_BADGE_TOGGLE_EVENT = 'menulist:deployment-badge-toggle';
export const DEPLOYMENT_BADGE_STORAGE_KEY = 'menulist_deployment_badge_visible';

export function emitDeploymentBadgeToggle() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(DEPLOYMENT_BADGE_TOGGLE_EVENT));
}

