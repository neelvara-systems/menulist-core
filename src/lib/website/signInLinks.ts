import { SIGNIN_URL } from '@constant/urls';

export const buildWebsiteSignInPath = (callbackUrl: string = '/dashboard') =>
    `${SIGNIN_URL}?callbackUrl=${encodeURIComponent(callbackUrl)}`;

export const buildCurrentWebsiteSignInPath = () => {
    if (typeof window === 'undefined') {
        return buildWebsiteSignInPath();
    }

    const callbackUrl = `${window.location.pathname}${window.location.search}${window.location.hash}` || '/dashboard';
    return buildWebsiteSignInPath(callbackUrl);
};
