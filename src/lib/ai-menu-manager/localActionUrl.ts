import { openIsolatedBrowserUrl } from '@lib/browser/openIsolatedBrowserUrl';

const AI_MENU_MANAGER_LOCAL_ACTION_URL_INVALID = 'ai_menu_manager_local_action_url_invalid';

function isKnownLocalDevelopmentHost(url: URL) {
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!url.port) return false;
    return host === 'localhost'
        || host.endsWith('.localhost')
        || host === '0.0.0.0'
        || host.startsWith('127.')
        || host === '::1'
        || host.endsWith('.qa.menulist.digital')
        || host.endsWith('.menulist.online');
}

export function normalizeAiMenuManagerLocalActionUrl(value: string) {
    try {
        const url = new URL(value.trim());
        if (url.username || url.password) throw new Error(AI_MENU_MANAGER_LOCAL_ACTION_URL_INVALID);
        if (url.protocol === 'https:' || (url.protocol === 'http:' && isKnownLocalDevelopmentHost(url))) {
            return url.toString();
        }
    } catch {
        // Fall through to fixed local error below.
    }

    const error = new Error(AI_MENU_MANAGER_LOCAL_ACTION_URL_INVALID);
    Object.assign(error, { code: AI_MENU_MANAGER_LOCAL_ACTION_URL_INVALID });
    throw error;
}

export function openAiMenuManagerLocalActionUrl(value: string): void {
    const actionUrl = normalizeAiMenuManagerLocalActionUrl(value);
    openIsolatedBrowserUrl(actionUrl);
}
