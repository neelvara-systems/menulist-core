const FORCE_DESKTOP_MODE_STORAGE_KEY = 'forceDesktopMode';

const normalizePath = (path: string) => {
    if (!path || path === '/') return path || '/';
    return path.split('?')[0].split('#')[0].replace(/\/+$/, '');
};

export const setForceDesktopRoute = (path: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(FORCE_DESKTOP_MODE_STORAGE_KEY, normalizePath(path));
};

export const clearForceDesktopMode = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(FORCE_DESKTOP_MODE_STORAGE_KEY);
};

export const shouldForceDesktopForPath = (pathname: string, isDesktopOnlyRoute = false) => {
    if (typeof window === 'undefined') return false;

    const value = localStorage.getItem(FORCE_DESKTOP_MODE_STORAGE_KEY);
    if (!value) return false;

    // Legacy global flag from older builds. Keep it only for routes that have
    // no mobile shell so stale flags cannot trap mobile users in desktop view.
    if (value === 'true') {
        return isDesktopOnlyRoute;
    }

    const normalizedPathname = normalizePath(pathname);
    const normalizedValue = normalizePath(value);
    return normalizedPathname === normalizedValue || normalizedPathname.startsWith(`${normalizedValue}/`);
};
