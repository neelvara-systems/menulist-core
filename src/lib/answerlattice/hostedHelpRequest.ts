import { normalizeRequestAuthority } from '@lib/routing/hostAuthority';

export type HostedHelpRequestDomainInput = {
    host: string | null;
    queryDomain?: string | null;
    isDevelopmentRewrite: boolean;
    isDevelopmentRuntime: boolean;
};

const isLocalHostname = (hostname: string): boolean => (
    hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname.startsWith('192.168.')
);

/**
 * Resolve the hosted-help registry domain from the original Host header.
 * The query override is intentionally limited to the middleware-marked local
 * development rewrite so public requests cannot select another workspace.
 */
export function resolveHostedHelpRequestDomain({
    host,
    queryDomain,
    isDevelopmentRewrite,
    isDevelopmentRuntime,
}: HostedHelpRequestDomainInput): string | null {
    const requestAuthority = normalizeRequestAuthority(host);
    if (!requestAuthority) return null;

    if (
        isDevelopmentRuntime
        && isDevelopmentRewrite
        && isLocalHostname(requestAuthority.hostname)
    ) {
        return normalizeRequestAuthority(queryDomain || null)?.hostname || null;
    }

    return requestAuthority.hostname;
}

/**
 * Normalize a public article slug without throwing on malformed percent input.
 */
export function normalizeHostedHelpArticleSlug(value?: string | null): string {
    const rawValue = String(value || '');
    let decodedValue: string;

    try {
        decodedValue = decodeURIComponent(rawValue);
    } catch {
        return '';
    }

    const normalized = decodedValue.trim();
    if (
        !normalized
        || normalized.length > 300
        || /[\u0000-\u001f\u007f\\?#]/.test(normalized)
    ) {
        return '';
    }

    const slug = normalized
        .replace(/^\/+|\/+$/g, '')
        .replace(/^(articles|help|docs)\//, '')
        .replace(/^\/+|\/+$/g, '');
    const segments = slug.split('/');
    return segments.length > 0
        && segments.every(segment => segment && segment !== '.' && segment !== '..')
        ? slug
        : '';
}

export function buildHostedHelpArticlePath(value?: string | null): string | null {
    const slug = normalizeHostedHelpArticleSlug(value);
    return slug ? `/articles/${encodeURIComponent(slug)}` : null;
}

export type HostedHelpPublicRoute = {
    view: 'home' | 'docs' | 'article' | 'faq' | 'changelog';
    canonicalPath: string;
    articleSlug?: string;
};

export function resolveHostedHelpPublicRoute(
    segments: string[] | null | undefined,
    options: { showFaqs: boolean; showChangelog: boolean },
): HostedHelpPublicRoute | null {
    const routeSegments = Array.isArray(segments) ? segments : [];
    if (routeSegments.length === 0) {
        return { view: 'home', canonicalPath: '/' };
    }

    const route = routeSegments[0];
    if (routeSegments.length === 1 && route === 'docs') {
        return { view: 'docs', canonicalPath: '/docs' };
    }
    if (routeSegments.length === 1 && route === 'faq' && options.showFaqs) {
        return { view: 'faq', canonicalPath: '/faq' };
    }
    if (routeSegments.length === 1 && route === 'changelog' && options.showChangelog) {
        return { view: 'changelog', canonicalPath: '/changelog' };
    }
    if (route === 'articles' && routeSegments.length > 1) {
        const articleSlug = normalizeHostedHelpArticleSlug(routeSegments.slice(1).join('/'));
        const canonicalPath = buildHostedHelpArticlePath(articleSlug);
        return articleSlug && canonicalPath
            ? { view: 'article', articleSlug, canonicalPath }
            : null;
    }

    return null;
}

const HOSTED_HELP_CHANGELOG_TEXT_LIMIT = 2_000;
const HOSTED_HELP_CHANGELOG_NODE_LIMIT = 500;

/**
 * Convert persisted TipTap-like changelog content to a bounded public string.
 * Unknown fields are ignored rather than copied into the client payload.
 */
export function getHostedHelpChangelogText(value: unknown): string {
    let visitedNodes = 0;

    const visit = (node: unknown): string => {
        if (
            visitedNodes >= HOSTED_HELP_CHANGELOG_NODE_LIMIT
            || node === null
            || typeof node !== 'object'
        ) {
            return '';
        }
        visitedNodes += 1;

        const record = node as Record<string, unknown>;
        if (record.type === 'text' && typeof record.text === 'string') {
            return record.text.slice(0, HOSTED_HELP_CHANGELOG_TEXT_LIMIT);
        }
        if (!Array.isArray(record.content)) return '';

        return record.content
            .map(visit)
            .filter(Boolean)
            .join(' ')
            .slice(0, HOSTED_HELP_CHANGELOG_TEXT_LIMIT);
    };

    return visit(value).replace(/\s+/g, ' ').trim();
}

/** Convert Firestore/client/admin timestamp shapes into a serializable ISO date. */
export function serializeHostedHelpDate(value: unknown): string | null {
    let candidate: unknown = value;

    try {
        if (
            candidate
            && typeof candidate === 'object'
            && 'toDate' in candidate
            && typeof (candidate as { toDate?: unknown }).toDate === 'function'
        ) {
            candidate = (candidate as { toDate: () => unknown }).toDate();
        } else if (candidate && typeof candidate === 'object') {
            const record = candidate as Record<string, unknown>;
            const seconds = typeof record.seconds === 'number'
                ? record.seconds
                : typeof record._seconds === 'number'
                    ? record._seconds
                    : null;
            if (seconds !== null) candidate = seconds * 1_000;
        }

        const date = candidate instanceof Date
            ? candidate
            : typeof candidate === 'string' || typeof candidate === 'number'
                ? new Date(candidate)
                : null;
        return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
    } catch {
        return null;
    }
}
