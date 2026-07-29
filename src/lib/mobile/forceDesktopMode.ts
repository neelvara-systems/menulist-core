import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';

const FORCE_DESKTOP_MODE_STORAGE_KEY = 'forceDesktopMode';

const normalizePath = (path: string): string | null => {
    if (
        typeof path !== 'string'
        || path.length === 0
        || path.length > 512
        || !path.startsWith('/')
        || path.startsWith('//')
        || /[\u0000-\u001f\u007f]/.test(path)
    ) return null;
    if (path === '/') return '/';
    const normalized = path.split('?')[0].split('#')[0].replace(/\/+$/, '');
    return normalized || '/';
};

export const setForceDesktopRoute = (path: string) => {
    if (typeof window === 'undefined') return;
    const normalized = normalizePath(path);
    if (!normalized) return;
    try {
        localStorage.setItem(FORCE_DESKTOP_MODE_STORAGE_KEY, normalized);
    } catch (error) {
        logRuntimeFailure('force_desktop_mode_write_failed', error, {
            ...getBoundedRuntimeStringContext('path', path),
        });
    }
};

export const clearForceDesktopMode = () => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(FORCE_DESKTOP_MODE_STORAGE_KEY);
    } catch (error) {
        logRuntimeFailure('force_desktop_mode_clear_failed', error);
    }
};

export const shouldForceDesktopForPath = (pathname: string, isDesktopOnlyRoute = false) => {
    if (typeof window === 'undefined') return false;

    let value: string | null = null;
    try {
        value = localStorage.getItem(FORCE_DESKTOP_MODE_STORAGE_KEY);
    } catch (error) {
        logRuntimeFailure('force_desktop_mode_read_failed', error, {
            ...getBoundedRuntimeStringContext('pathname', pathname),
        });
        return false;
    }
    if (!value) return false;

    // Legacy global flag from older builds. Keep it only for routes that have
    // no mobile shell so stale flags cannot trap mobile users in desktop view.
    if (value === 'true') {
        return isDesktopOnlyRoute;
    }

    const normalizedPathname = normalizePath(pathname);
    const normalizedValue = normalizePath(value);
    if (!normalizedPathname || !normalizedValue) {
        clearForceDesktopMode();
        return false;
    }
    return normalizedPathname === normalizedValue || normalizedPathname.startsWith(`${normalizedValue}/`);
};
