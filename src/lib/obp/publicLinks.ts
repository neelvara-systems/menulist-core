import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';

export type OBPSocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'website' | 'youtube';

const PUBLIC_LINK_MAX_LENGTH = 2048;
const MAX_OBP_PUBLIC_LINK_PARSE_DIAGNOSTICS = 25;

const reportedOBPPublicLinkParseFailures = new Set<string>();

const SOCIAL_LINK_CONFIG: Record<Exclude<OBPSocialPlatform, 'website'>, {
    fallbackBase: string;
    hostBases: string[];
}> = {
    facebook: {
        fallbackBase: 'https://facebook.com/',
        hostBases: ['facebook.com', 'fb.com'],
    },
    instagram: {
        fallbackBase: 'https://instagram.com/',
        hostBases: ['instagram.com'],
    },
    linkedin: {
        fallbackBase: 'https://linkedin.com/in/',
        hostBases: ['linkedin.com'],
    },
    twitter: {
        fallbackBase: 'https://twitter.com/',
        hostBases: ['twitter.com', 'x.com'],
    },
    youtube: {
        fallbackBase: 'https://youtube.com/',
        hostBases: ['youtube.com', 'youtu.be'],
    },
};

function isHostOrSubdomain(host: string, hostBases: string[]): boolean {
    return hostBases.some((baseHost) => host === baseHost || host.endsWith(`.${baseHost}`));
}

function getRawUrlValue(value: unknown): string {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw || raw.length > PUBLIC_LINK_MAX_LENGTH || /\s/.test(raw)) return '';
    return raw;
}

function buildHttpsCandidate(value: unknown, fallbackBase?: string): string {
    const raw = getRawUrlValue(value);
    if (!raw) return '';
    if (/^http:\/\//i.test(raw)) return '';
    if (/^https:\/\//i.test(raw)) return raw;

    const stripped = raw.replace(/^@/, '').replace(/^\/+/, '');
    if (!stripped || /\s/.test(stripped)) return '';

    if (/^[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(stripped)) {
        return `https://${stripped}`;
    }

    return fallbackBase ? `${fallbackBase}${stripped}` : '';
}

function getPublicLinkValueKind(value: unknown): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

function logOBPPublicLinkParseFailure(
    error: unknown,
    value: unknown,
    candidate: string,
    options: {
        allowedHostBases?: string[];
        fallbackBase?: string;
    },
): void {
    const valueKind = getPublicLinkValueKind(value);
    const valueLength = typeof value === 'string' ? value.trim().length : 0;
    const failureKey = [
        valueKind,
        valueLength,
        candidate.length,
        options.allowedHostBases?.length || 0,
        options.fallbackBase ? 'fallback' : 'no-fallback',
    ].join(':');

    if (reportedOBPPublicLinkParseFailures.has(failureKey)) return;
    if (reportedOBPPublicLinkParseFailures.size >= MAX_OBP_PUBLIC_LINK_PARSE_DIAGNOSTICS) return;
    reportedOBPPublicLinkParseFailures.add(failureKey);

    logRuntimeFailure('obp_public_link_url_parse_failed', error, {
        ...getBoundedRuntimeStringContext('valueKind', valueKind),
        valueStringLength: valueLength,
        candidateLength: candidate.length,
        allowedHostBaseCount: options.allowedHostBases?.length || 0,
        hasFallbackBase: Boolean(options.fallbackBase),
        hasProtocol: /^[a-z][a-z\d+\-.]*:/i.test(candidate),
    });
}

export function normalizeOBPExternalHttpsUrl(
    value: unknown,
    options: {
        allowedHostBases?: string[];
        fallbackBase?: string;
    } = {},
): string | null {
    const candidate = buildHttpsCandidate(value, options.fallbackBase);
    if (!candidate) return null;

    try {
        const parsed = new URL(candidate);
        if (parsed.protocol !== 'https:') return null;
        if (parsed.username || parsed.password) return null;

        const host = parsed.hostname.toLowerCase();
        if (options.allowedHostBases && !isHostOrSubdomain(host, options.allowedHostBases)) {
            return null;
        }

        return parsed.toString();
    } catch (error) {
        logOBPPublicLinkParseFailure(error, value, candidate, options);
        return null;
    }
}

export function normalizeOBPGoogleMapsUrl(value: unknown): string | null {
    const url = normalizeOBPExternalHttpsUrl(value, {
        allowedHostBases: ['google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl'],
    });
    if (!url) return null;

    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const isGoogleHost = host === 'google.com' || host.endsWith('.google.com');
    const isMapsPath = parsed.pathname.startsWith('/maps');
    const isMapsShortlink = host === 'maps.app.goo.gl' || host === 'goo.gl';
    const isMapsHost = host === 'maps.google.com';

    return (isGoogleHost && isMapsPath) || isMapsHost || isMapsShortlink ? url : null;
}

export function normalizeOBPReviewUrl(value: unknown): string | null {
    const url = normalizeOBPExternalHttpsUrl(value, {
        allowedHostBases: ['google.com', 'g.page', 'maps.app.goo.gl', 'goo.gl'],
    });
    if (!url) return null;

    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const isGoogleHost = host === 'google.com' || host.endsWith('.google.com');
    const isReviewPath = parsed.pathname.includes('/local/writereview') || parsed.pathname.includes('/maps');
    const isGPageReview = host === 'g.page' && parsed.pathname.includes('/review');
    const isGoogleMapsShortlink = host === 'maps.app.goo.gl' || host === 'goo.gl';

    return (isGoogleHost && isReviewPath) || isGPageReview || isGoogleMapsShortlink ? url : null;
}

export function normalizeOBPSocialUrl(platform: OBPSocialPlatform, value: unknown): string | null {
    if (platform === 'website') return normalizeOBPWebsiteUrl(value);

    const config = SOCIAL_LINK_CONFIG[platform];
    return normalizeOBPExternalHttpsUrl(value, {
        allowedHostBases: config.hostBases,
        fallbackBase: config.fallbackBase,
    });
}

export function normalizeOBPWebsiteUrl(value: unknown): string | null {
    return normalizeOBPExternalHttpsUrl(value);
}
