import { PRODUCT_IDS } from '@constant/product';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const MYCODEX_PRODUCT_CODE = PRODUCT_IDS.MYCODEX;
export const MYCODEX_PRODUCT_SLUG = 'mycodex';
export const MYCODEX_SESSION_COOKIE = 'mycodex_session';
export const MYCODEX_LOGIN_PATH = '/login';
export const MYCODEX_LOGIN_API_PATH = '/api/session';
export const MYCODEX_LOGOUT_API_PATH = '/api/logout';
export const MYCODEX_OFFLINE_PATH = '/offline';
export const MYCODEX_ROBOTS_TAG = 'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate';
export const MYCODEX_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

interface MyCodexSessionPayload {
    product: typeof MYCODEX_PRODUCT_SLUG;
    sub: string;
    exp: number;
}

const bytesToBase64Url = (bytes: Uint8Array) => {
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
};

const stringToBase64Url = (value: string) => bytesToBase64Url(encoder.encode(value));

const base64UrlToBytes = (value: string) => {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
};

const base64UrlToString = (value: string) => decoder.decode(base64UrlToBytes(value));

const getMyCodexSessionSecret = () => (
    process.env.MYCODEX_SESSION_SECRET?.trim()
    || process.env.NEXTAUTH_SECRET?.trim()
    || process.env.MYCODEX_BASIC_AUTH_PASSWORD?.trim()
    || ''
);

const signSessionPayload = async (payloadPart: string) => {
    const secret = getMyCodexSessionSecret();
    if (!secret) return null;

    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadPart));
    return bytesToBase64Url(new Uint8Array(signature));
};

export const constantTimeEqual = (left: string, right: string) => {
    const maxLength = Math.max(left.length, right.length);
    let difference = left.length ^ right.length;

    for (let index = 0; index < maxLength; index += 1) {
        difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
    }

    return difference === 0;
};

export const getMyCodexExpectedCredentials = () => {
    const username = process.env.MYCODEX_BASIC_AUTH_USER?.trim();
    const password = process.env.MYCODEX_BASIC_AUTH_PASSWORD?.trim();

    if (!username || !password) return null;

    return {
        username,
        password,
    };
};

export const isMyCodexAuthBypassPath = (pathname: string) => (
    pathname === MYCODEX_LOGIN_PATH
    || pathname === MYCODEX_LOGIN_API_PATH
    || pathname === MYCODEX_LOGOUT_API_PATH
    || pathname === MYCODEX_OFFLINE_PATH
    || pathname === '/robots.txt'
);

export const sanitizeMyCodexReturnTo = (value: string | null | undefined) => {
    if (!value) return '/';
    if (!value.startsWith('/') || value.startsWith('//')) return '/';
    if (value.startsWith('/api/') || value.startsWith('/sites/')) return '/';
    if (value === MYCODEX_LOGIN_PATH || value.startsWith(`${MYCODEX_LOGIN_PATH}?`)) return '/';

    return value.slice(0, 2048);
};

export const validateMyCodexCredentials = (username: string, password: string) => {
    const expectedCredentials = getMyCodexExpectedCredentials();
    if (!expectedCredentials) return false;

    return constantTimeEqual(username, expectedCredentials.username)
        && constantTimeEqual(password, expectedCredentials.password);
};

export const createMyCodexSessionToken = async (username: string) => {
    const payload: MyCodexSessionPayload = {
        product: MYCODEX_PRODUCT_SLUG,
        sub: username,
        exp: Date.now() + (MYCODEX_SESSION_TTL_SECONDS * 1000),
    };
    const payloadPart = stringToBase64Url(JSON.stringify(payload));
    const signaturePart = await signSessionPayload(payloadPart);

    if (!signaturePart) return null;

    return `${payloadPart}.${signaturePart}`;
};

export const verifyMyCodexSessionToken = async (token: string | undefined) => {
    if (!token) return false;

    const [payloadPart, signaturePart, extraPart] = token.split('.');
    if (!payloadPart || !signaturePart || extraPart !== undefined) return false;

    const expectedSignaturePart = await signSessionPayload(payloadPart);
    if (!expectedSignaturePart || !constantTimeEqual(signaturePart, expectedSignaturePart)) {
        return false;
    }

    try {
        const payload = JSON.parse(base64UrlToString(payloadPart)) as Partial<MyCodexSessionPayload>;
        return payload.product === MYCODEX_PRODUCT_SLUG
            && typeof payload.sub === 'string'
            && typeof payload.exp === 'number'
            && payload.exp > Date.now();
    } catch {
        return false;
    }
};

export const getMyCodexSessionCookieOptions = () => ({
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MYCODEX_SESSION_TTL_SECONDS,
});

export const getExpiredMyCodexSessionCookieOptions = () => ({
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
});
