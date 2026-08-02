/**
 * Next.js Proxy - Security Headers + Multi-Product & Multi-Tenant Routing
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * Routing Priority:
 * 1. Active product domains. Public product website paths rewrite to /sites/{product};
 *    product owner app paths rewrite to the product route group when configured.
 * 2. Dev path prefixes (/__answerlattice → /sites/answerlattice,
 *    /__campaigncue/app(/...) → /campaigncue/app(/...)) — local dev only
 * 3. Client tenant domains (*.menulist.online or *.menulist.digital → /client)
 * 4. Platform domain (menulist.ai → (website) route group)
 * 
 * OWASP Compliance:
 * - A02: Cryptographic Failures (Force HTTPS, secure cookies)
 * - A05: Security Misconfiguration (Security headers)
 * - A07: Authentication (Secure session cookies)
 * 
 * @see src/constants/productDomains.ts — Multi-product domain registry
 * @see src/lib/multiTenant/domainResolver.ts — Domain type detection
 * 
 * This runs on every matched request before route handlers.
 */

import { CSP_ALLOWLIST, CSP_DEV_SETTINGS, buildCSPDirective } from '@config/csp-allowlist';
import {
    ANSWERLATTICE_PRODUCT_PASSTHROUGH_PATHS,
    getAnswerlatticeDashboardRewritePath,
} from '@constant/answerlattice/domains';
import { getCampaignCueWorkspaceRewritePath } from '@constant/campaigncue/domains';
import { CAMPAIGNCUE_WEBSITE_FEATURE_SLUGS } from '@constant/campaigncue/websiteFeatures';
import {
    getProductDeploymentTarget,
    isActiveProductDomain,
    resolveKnownProductIdByHostname,
} from '@constant/deploymentTargets';
import {
    SIGNALDESK_API_BASE_PATH,
    SIGNALDESK_BASE_PATH,
    SIGNALDESK_SHORT_ALIAS_PATH,
} from '@constant/signaldesk/routes';
import { MENULIST_PLATFORM_REDIRECT_DOMAINS } from '@constant/urls';
import {
    ANSWERLATTICE_HOSTED_HELP_DEV_PREFIX,
    ANSWERLATTICE_HOSTED_HELP_INTERNAL_BASE_PATH,
    getAnswerlatticeHostedHelpRewritePath,
    isAnswerlatticeHostedHelpCandidateHostname,
} from '@constant/answerlattice/hostedHelp';
import {
    getProductSiteById,
    resolveProductSiteByDevPath,
    type ProductDomainConfig,
    type ProductSiteId,
} from '@constant/productDomains';
import { resolveDomain, shouldBypassDomainRouting } from '@lib/multiTenant/domainResolver';
import { normalizeRequestAuthority } from '@lib/routing/hostAuthority';
import {
    MYCODEX_LOGIN_PATH,
    MYCODEX_PRODUCT_SLUG,
    MYCODEX_ROBOTS_TAG,
    MYCODEX_SESSION_COOKIE,
    getMyCodexExpectedCredentials,
    isMyCodexAccessConfigured,
    isMyCodexAuthBypassPath,
    sanitizeMyCodexReturnTo,
    verifyMyCodexSessionToken,
} from '@lib/mycodex/auth';
import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════
// Security Headers (shared across all routing paths)
// ═══════════════════════════════════════════════════════════════

const NOINDEX_PATH_PREFIXES = [
    '/signin',
    '/forgot-password',
    '/error',
    '/dashboard',
    '/app',
    '/account',
    '/billing',
    '/settings',
    '/api',
    '/client',
    SIGNALDESK_BASE_PATH,
    '/create-menu/success',
    '/create-menu/preview',
] as const;

function shouldApplyNoindexHeader(pathname: string): boolean {
    return NOINDEX_PATH_PREFIXES.some((prefix) =>
        pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
}

function isActiveMenuListOwnerAppHost(hostname: string | null): boolean {
    const normalizedHost = normalizeRequestAuthority(hostname)?.hostname;
    const ownerAppDomain = getProductDeploymentTarget('menulist').ownerAppDomain;
    return Boolean(normalizedHost && ownerAppDomain && normalizedHost === ownerAppDomain);
}

function isMenuListQaHost(hostname: string | null): boolean {
    const normalizedHost = normalizeRequestAuthority(hostname)?.hostname;
    if (!normalizedHost) return false;

    const qaTarget = getProductDeploymentTarget('menulist', 'preview');
    if (qaTarget.domains.includes(normalizedHost)) return true;

    return (qaTarget.tenantDomains || []).some((domain) => (
        normalizedHost === domain || normalizedHost.endsWith(`.${domain}`)
    ));
}

function applySecurityHeaders(request: NextRequest, response: NextResponse): NextResponse {
    // Use VERCEL_ENV to distinguish real production from preview deployments.
    // On Vercel, NODE_ENV is always 'production' for both, but VERCEL_ENV is
    // 'preview' on PR deploys — we don't want strict HSTS/CSP there.
    const isVercelPreview = process.env.VERCEL === '1' && process.env.VERCEL_ENV !== 'production';
    const isProduction = process.env.NODE_ENV === 'production' && !isVercelPreview;
    const isDev = !isProduction;
    const isAnswerlatticeWidgetRoute = isAnswerlatticeWidgetFrameRoute(request);
    const frameAncestorsDirective = isAnswerlatticeWidgetRoute
        ? 'frame-ancestors https: http://localhost:* http://127.0.0.1:*'
        : "frame-ancestors 'none'";

    // A02: Force HTTPS in Production
    if (
        isProduction
        && !isTrustedLocalDevelopmentRequest(request.headers.get('host'))
        && request.headers.get('x-forwarded-proto') !== 'https'
    ) {
        const url = request.nextUrl.clone();
        url.protocol = 'https:';
        const host = request.headers.get('host');
        if (host) url.host = host;
        return NextResponse.redirect(url, 301);
    }

    // A05: Security Headers (OWASP Recommendations)
    if (!isAnswerlatticeWidgetRoute) {
        response.headers.set('X-Frame-Options', 'DENY');
    }
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(self), payment=()'
    );

    // Content Security Policy (CSP) - A03: Injection Prevention
    const connectSources = isDev
        ? [...CSP_ALLOWLIST.connectSources, ...CSP_DEV_SETTINGS.connectSources]
        : CSP_ALLOWLIST.connectSources;
    const cspDirectivesCurrent = [
        "default-src 'self'",
        buildCSPDirective('script-src', CSP_ALLOWLIST.scriptSources, {
            allowInline: true,
            allowEval: isDev && CSP_DEV_SETTINGS.allowEval,
        }),
        buildCSPDirective('style-src', CSP_ALLOWLIST.styleSources, {
            allowInline: true,
        }),
        buildCSPDirective('font-src', CSP_ALLOWLIST.fontSources),
        buildCSPDirective('img-src', CSP_ALLOWLIST.imageSources),
        buildCSPDirective('connect-src', connectSources),
        buildCSPDirective('frame-src', CSP_ALLOWLIST.frameSources),
        buildCSPDirective('worker-src', CSP_ALLOWLIST.workerSources),
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https://accounts.google.com",
        frameAncestorsDirective,
        ...(isProduction ? ["upgrade-insecure-requests"] : []),
    ];

    // Strict CSP (Report-Only) — monitors what would break under a tighter policy.
    // Does NOT block anything. Console warnings from this are expected and harmless.
    // Note: upgrade-insecure-requests is omitted here because browsers ignore it
    // in report-only mode (W3C spec), and it just adds console noise.
    const cspDirectivesStrict = [
        "default-src 'self'",
        buildCSPDirective('script-src', CSP_ALLOWLIST.scriptSources, {
            allowInline: false,
            allowEval: false,
        }),
        buildCSPDirective('style-src', CSP_ALLOWLIST.styleSources, {
            allowInline: true,
        }),
        buildCSPDirective('font-src', CSP_ALLOWLIST.fontSources),
        buildCSPDirective('img-src', CSP_ALLOWLIST.imageSources),
        buildCSPDirective('connect-src', connectSources),
        buildCSPDirective('frame-src', CSP_ALLOWLIST.frameSources),
        buildCSPDirective('worker-src', CSP_ALLOWLIST.workerSources),
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https://accounts.google.com",
        frameAncestorsDirective,
    ];

    if (!isDev) {
        cspDirectivesStrict.push("report-uri /api/csp-report");
    }

    response.headers.set('Content-Security-Policy', cspDirectivesCurrent.join('; '));

    if (!isDev) {
        response.headers.set('Content-Security-Policy-Report-Only', cspDirectivesStrict.join('; '));
    }

    // HSTS - Force HTTPS for 1 year
    if (isProduction) {
        response.headers.set(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains; preload'
        );
    }

    // Remove server information leakage
    response.headers.delete('X-Powered-By');
    response.headers.delete('Server');

    if (
        shouldApplyNoindexHeader(request.nextUrl.pathname)
        || isActiveMenuListOwnerAppHost(request.headers.get('host'))
        || isMenuListQaHost(request.headers.get('host'))
    ) {
        response.headers.set(
            'X-Robots-Tag',
            isMenuListQaHost(request.headers.get('host'))
                ? 'noindex, nofollow, noarchive'
                : 'noindex, nofollow',
        );
    }

    return response;
}

function shouldPassThroughAnswerlatticeProductPath(pathname: string): boolean {
    if ((ANSWERLATTICE_PRODUCT_PASSTHROUGH_PATHS as readonly string[]).includes(pathname)) return true;
    if (pathname.startsWith('/widget/')) return true;

    return shouldBypassDomainRouting(pathname);
}

function normalizeHostname(hostname: string | null): string {
    return normalizeRequestAuthority(hostname)?.hostname || '';
}

function isLocalDevelopmentHost(hostname: string | null): boolean {
    const normalizedHost = normalizeHostname(hostname);
    return normalizedHost === 'localhost'
        || normalizedHost === '127.0.0.1'
        || normalizedHost.startsWith('192.168.');
}

function isTrustedLocalDevelopmentRequest(hostname: string | null): boolean {
    return !process.env.VERCEL && isLocalDevelopmentHost(hostname);
}

function isAnswerlatticeWidgetFrameRoute(request: NextRequest): boolean {
    const pathname = request.nextUrl.pathname;
    if (pathname !== '/widget' && !pathname.startsWith('/widget/')) return false;

    const hostname = request.headers.get('host');
    if (resolveKnownProductIdByHostname(hostname) === 'answerlattice') return true;

    return isTrustedLocalDevelopmentRequest(hostname);
}

function isLegacyAnswerlatticePublicHostname(hostname: string | null): boolean {
    const normalizedHost = normalizeHostname(hostname);
    return normalizedHost === 'canonica.app' || normalizedHost === 'www.canonica.app';
}

function buildAnswerlatticeWebsiteRewritePath(basePath: string, publicPath: string): string {
    return (publicPath === '/' || publicPath === '/home') ? basePath : `${basePath}${publicPath}`;
}

function buildNeelvaraWebsiteRewritePath(basePath: string, publicPath: string): string {
    return (publicPath === '/' || publicPath === '/home') ? basePath : `${basePath}${publicPath}`;
}

function rewriteWithProductHeaders(
    request: NextRequest,
    url: URL,
    productConfig: ProductDomainConfig,
    basePath = '',
): NextResponse {
    const requestHeaders = getSanitizedRoutingRequestHeaders(request);
    requestHeaders.set('x-product-id', productConfig.id);
    requestHeaders.set('x-product-name', productConfig.name);
    if (basePath) {
        requestHeaders.set('x-product-base-path', basePath);
    } else {
        requestHeaders.delete('x-product-base-path');
    }

    const response = NextResponse.rewrite(url, {
        request: {
            headers: requestHeaders,
        },
    });
    response.headers.set('x-product-id', productConfig.id);
    response.headers.set('x-product-name', productConfig.name);
    if (basePath) {
        response.headers.set('x-product-base-path', basePath);
    }
    if (productConfig.id === 'neelvara' && basePath === '/nv') {
        response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    }

    return response;
}

const CONTROLLED_TENANT_REQUEST_HEADERS = [
    'x-tenant-subdomain',
    'x-tenant-custom-domain',
    'x-tenant-type',
] as const;

const CONTROLLED_HOSTED_HELP_REQUEST_HEADERS = [
    'x-answerlattice-hosted-help-domain',
    'x-answerlattice-hosted-help-dev',
] as const;

const CONTROLLED_PRODUCT_REQUEST_HEADERS = [
    'x-product-id',
    'x-product-name',
    'x-product-base-path',
] as const;

function getSanitizedRoutingRequestHeaders(request: NextRequest): Headers {
    const requestHeaders = new Headers(request.headers);
    CONTROLLED_TENANT_REQUEST_HEADERS.forEach((header) => requestHeaders.delete(header));
    CONTROLLED_HOSTED_HELP_REQUEST_HEADERS.forEach((header) => requestHeaders.delete(header));
    CONTROLLED_PRODUCT_REQUEST_HEADERS.forEach((header) => requestHeaders.delete(header));
    return requestHeaders;
}

function nextWithSanitizedRoutingHeaders(request: NextRequest): NextResponse {
    return NextResponse.next({
        request: { headers: getSanitizedRoutingRequestHeaders(request) },
    });
}

function nextWithProductHeaders(
    request: NextRequest,
    productConfig: ProductDomainConfig,
): NextResponse {
    const requestHeaders = getSanitizedRoutingRequestHeaders(request);
    requestHeaders.set('x-product-id', productConfig.id);
    requestHeaders.set('x-product-name', productConfig.name);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('x-product-id', productConfig.id);
    response.headers.set('x-product-name', productConfig.name);
    return response;
}

function rewriteHostedHelpResponse(
    request: NextRequest,
    url: URL,
    options: { domain?: string; development?: boolean },
): NextResponse {
    const requestHeaders = getSanitizedRoutingRequestHeaders(request);
    if (options.domain) {
        requestHeaders.set('x-answerlattice-hosted-help-domain', options.domain);
    }
    if (options.development) {
        requestHeaders.set('x-answerlattice-hosted-help-dev', '1');
    }

    const response = NextResponse.rewrite(url, {
        request: { headers: requestHeaders },
    });
    if (options.domain) {
        response.headers.set('x-answerlattice-hosted-help-domain', options.domain);
    }
    if (options.development) {
        response.headers.set('x-answerlattice-hosted-help-dev', '1');
    }
    return response;
}

function rewriteTenantResponse(request: NextRequest, url: URL): NextResponse {
    const domainInfo = resolveDomain(request.headers.get('host'));
    const requestHeaders = getSanitizedRoutingRequestHeaders(request);

    if (domainInfo.subdomain) {
        requestHeaders.set('x-tenant-subdomain', domainInfo.subdomain);
        requestHeaders.set('x-tenant-type', 'subdomain');
    } else if (domainInfo.customDomain) {
        requestHeaders.set('x-tenant-custom-domain', domainInfo.customDomain);
        requestHeaders.set('x-tenant-type', 'custom');
    }

    const response = NextResponse.rewrite(url, {
        request: { headers: requestHeaders },
    });
    if (domainInfo.subdomain) {
        response.headers.set('x-tenant-subdomain', domainInfo.subdomain);
        response.headers.set('x-tenant-type', 'subdomain');
    } else if (domainInfo.customDomain) {
        response.headers.set('x-tenant-custom-domain', domainInfo.customDomain);
        response.headers.set('x-tenant-type', 'custom');
    }
    return response;
}

function productNotFoundResponse(productConfig: ProductDomainConfig, basePath = ''): NextResponse {
    const response = new NextResponse(null, { status: 404 });
    response.headers.set('x-product-id', productConfig.id);
    response.headers.set('x-product-name', productConfig.name);
    if (basePath) {
        response.headers.set('x-product-base-path', basePath);
    }
    return response;
}

const CAMPAIGNCUE_PUBLIC_FEATURE_SLUG_SET = new Set<string>(CAMPAIGNCUE_WEBSITE_FEATURE_SLUGS);

function isInvalidCampaignCuePublicFeaturePath(pathname: string): boolean {
    const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    if (normalizedPath === '/features') return true;
    if (!normalizedPath.startsWith('/features/')) return false;

    const featureSlug = normalizedPath.slice('/features/'.length);
    return !CAMPAIGNCUE_PUBLIC_FEATURE_SLUG_SET.has(featureSlug);
}

const MYCODEX_PRODUCT_ALIAS_ROUTES: Array<{
    prefix: string;
    productId: Extract<ProductSiteId, 'menulist' | 'neelvara' | 'answerlattice' | 'campaigncue'>;
}> = [
    { prefix: '/nv', productId: 'neelvara' },
    { prefix: '/ml', productId: 'menulist' },
    { prefix: '/al', productId: 'answerlattice' },
    { prefix: '/cc', productId: 'campaigncue' },
];

const MYCODEX_INTERNAL_BASE_PATH = '/sites/mycodex';

const SIGNALDESK_HOST_PASSTHROUGH_PATHS = [
    '/forgot-password',
    '/error',
    '/unauthorized',
] as const;

function canUseInternalProductAliases(hostname: string | null, knownProductId: string | null): boolean {
    return knownProductId === MYCODEX_PRODUCT_SLUG && isTrustedLocalDevelopmentRequest(hostname);
}

function isSignalDeskHostPassthroughPath(pathname: string): boolean {
    return SIGNALDESK_HOST_PASSTHROUGH_PATHS.some((prefix) =>
        pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
}

function isSignalDeskRuntimePath(pathname: string): boolean {
    return pathname === SIGNALDESK_BASE_PATH
        || pathname.startsWith(`${SIGNALDESK_BASE_PATH}/`)
        || pathname === SIGNALDESK_API_BASE_PATH
        || pathname.startsWith(`${SIGNALDESK_API_BASE_PATH}/`);
}

function buildSignalDeskHostRewritePath(pathname: string): string {
    if (!pathname || pathname === '/') return SIGNALDESK_BASE_PATH;
    if (pathname === SIGNALDESK_BASE_PATH || pathname.startsWith(`${SIGNALDESK_BASE_PATH}/`)) {
        return pathname;
    }
    return `${SIGNALDESK_BASE_PATH}${pathname}`;
}

function getSignalDeskRequestHeaders(request: NextRequest, basePath = SIGNALDESK_BASE_PATH): Headers {
    const requestHeaders = getSanitizedRoutingRequestHeaders(request);
    requestHeaders.set('x-product-id', 'signaldesk');
    requestHeaders.set('x-product-name', 'MenuList SignalDesk');
    requestHeaders.set('x-product-base-path', basePath);
    return requestHeaders;
}

function setSignalDeskProductHeaders(response: NextResponse, basePath = SIGNALDESK_BASE_PATH): NextResponse {
    response.headers.set('x-product-id', 'signaldesk');
    response.headers.set('x-product-name', 'MenuList SignalDesk');
    response.headers.set('x-product-base-path', basePath);
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
}

function nextSignalDeskResponse(request: NextRequest, basePath = SIGNALDESK_BASE_PATH): NextResponse {
    const response = NextResponse.next({
        request: {
            headers: getSignalDeskRequestHeaders(request, basePath),
        },
    });
    return setSignalDeskProductHeaders(response, basePath);
}

function rewriteSignalDeskResponse(request: NextRequest, url: URL, basePath = SIGNALDESK_BASE_PATH): NextResponse {
    const response = NextResponse.rewrite(url, {
        request: {
            headers: getSignalDeskRequestHeaders(request, basePath),
        },
    });
    return setSignalDeskProductHeaders(response, basePath);
}

function resolveSignalDeskMyCodexAliasPath(pathname: string): {
    basePath: string;
    strippedPath: string;
} | null {
    const prefix = SIGNALDESK_SHORT_ALIAS_PATH;
    const appPrefix = `${prefix}/app`;
    if (pathname === appPrefix || pathname.startsWith(`${appPrefix}/`)) {
        return {
            basePath: prefix,
            strippedPath: pathname.slice(appPrefix.length) || '/',
        };
    }
    if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) return null;

    return {
        basePath: prefix,
        strippedPath: pathname.slice(prefix.length) || '/',
    };
}

function buildSignalDeskAliasRewritePath(strippedPath: string): string {
    if (isSignalDeskHostPassthroughPath(strippedPath)) return strippedPath;
    return buildSignalDeskHostRewritePath(strippedPath);
}

function resolveMyCodexProductAliasPath(pathname: string): {
    product: ProductDomainConfig;
    basePath: string;
    strippedPath: string;
} | null {
    for (const route of MYCODEX_PRODUCT_ALIAS_ROUTES) {
        if (pathname !== route.prefix && !pathname.startsWith(`${route.prefix}/`)) continue;

        const product = getProductSiteById(route.productId);
        if (!product?.enabled) return null;

        return {
            product,
            basePath: route.prefix,
            strippedPath: pathname.slice(route.prefix.length) || '/',
        };
    }

    return null;
}

function buildMyCodexLoginRedirect(request: NextRequest): NextResponse {
    const url = request.nextUrl.clone();
    url.pathname = MYCODEX_LOGIN_PATH;
    url.search = '';
    url.searchParams.set('returnTo', sanitizeMyCodexReturnTo(`${request.nextUrl.pathname}${request.nextUrl.search}`));
    return setMyCodexResponseHeaders(NextResponse.redirect(url, 303));
}

async function authorizeMyCodexRequest(request: NextRequest): Promise<NextResponse | null> {
    if (!process.env.VERCEL && isLocalDevelopmentHost(request.headers.get('host'))) {
        return null;
    }

    if (isMyCodexAuthBypassPath(request.nextUrl.pathname)) {
        return null;
    }

    if (!isMyCodexAccessConfigured()) {
        return setMyCodexResponseHeaders(new NextResponse('MyCodex access is not configured.', {
            status: 503,
            headers: {
                'Cache-Control': 'private, no-store',
            },
        }));
    }

    const sessionToken = request.cookies.get(MYCODEX_SESSION_COOKIE)?.value;
    if (await verifyMyCodexSessionToken(sessionToken)) {
        return null;
    }

    return buildMyCodexLoginRedirect(request);
}

function setMyCodexResponseHeaders(response: NextResponse): NextResponse {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', MYCODEX_ROBOTS_TAG);
    const vary = response.headers.get('Vary');
    if (!vary) {
        response.headers.set('Vary', 'Cookie');
    } else if (!vary.toLowerCase().split(',').map((value) => value.trim()).includes('cookie')) {
        response.headers.set('Vary', `${vary}, Cookie`);
    }
    return response;
}

function buildOriginPinnedRedirectUrl(targetUrl: string, request: NextRequest): URL {
    const url = new URL(targetUrl);
    // Assign the path after fixing the destination origin. Passing a request
    // pathname such as `//attacker.example/path` to the URL constructor would
    // otherwise interpret it as a protocol-relative cross-origin URL.
    url.pathname = request.nextUrl.pathname;
    url.search = request.nextUrl.search;
    return url;
}

function buildMenuListRedirectDomainResponse(hostname: string | null, request: NextRequest): NextResponse | null {
    const normalizedHost = normalizeRequestAuthority(hostname)?.hostname;
    if (!normalizedHost || !MENULIST_PLATFORM_REDIRECT_DOMAINS.includes(normalizedHost)) {
        return null;
    }

    const target = getProductDeploymentTarget('menulist', 'production');
    const url = buildOriginPinnedRedirectUrl(target.url, request);
    return NextResponse.redirect(url, 301);
}

const MENULIST_OWNER_APP_PATH_PREFIXES = [
    '/signin',
    '/forgot-password',
    '/unauthorized',
    '/assets',
    '/billing',
    '/business-health',
    '/business-settings',
    '/create-menu',
    '/dashboard',
    '/growth-kits',
    '/help-center',
    '/invite',
    '/locations',
    '/menu-manager',
    '/msg-preview',
    '/ops',
    '/platform',
    '/projects',
    '/qr-code',
    '/qrCode',
    '/reseller',
    '/today',
    '/transactions',
    '/use-menulist',
    '/users',
] as const;

function isMenuListOwnerAppPath(pathname: string): boolean {
    if (pathname === '/feedback') return true;
    return MENULIST_OWNER_APP_PATH_PREFIXES.some((prefix) => (
        pathname === prefix || pathname.startsWith(`${prefix}/`)
    ));
}

function buildMenuListOwnerAppResponse(
    hostname: string | null,
    request: NextRequest,
): NextResponse | null {
    const normalizedHost = normalizeRequestAuthority(hostname)?.hostname;
    if (!normalizedHost || isLocalDevelopmentHost(normalizedHost)) return null;

    const target = getProductDeploymentTarget('menulist');
    const ownerAppDomain = target.ownerAppDomain;
    if (!ownerAppDomain) return null;

    if (normalizedHost === ownerAppDomain) {
        if (request.nextUrl.pathname === '/robots.txt') {
            return new NextResponse('User-agent: *\nDisallow: /\n', {
                status: 200,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });
        }
        if (request.nextUrl.pathname === '/sitemap.xml') {
            return new NextResponse(null, { status: 404 });
        }
        if (request.nextUrl.pathname !== '/') return null;

        const url = buildOriginPinnedRedirectUrl(`https://${ownerAppDomain}`, request);
        url.pathname = '/dashboard';
        return NextResponse.redirect(url, 308);
    }

    const websiteDomain = target.domains.includes(normalizedHost);
    const deprecatedAppAlias = [
        ...target.domains.map((domain) => `dashboard.${domain.replace(/^www\./, '')}`),
        ...(target.tenantDomains || []).flatMap((domain) => [
            `app.${domain}`,
            `dashboard.${domain}`,
        ]),
    ].includes(normalizedHost);

    if (!deprecatedAppAlias && (!websiteDomain || !isMenuListOwnerAppPath(request.nextUrl.pathname))) {
        return null;
    }

    const url = buildOriginPinnedRedirectUrl(`https://${ownerAppDomain}`, request);
    return NextResponse.redirect(url, 308);
}

// ═══════════════════════════════════════════════════════════════
// Main Proxy
// ═══════════════════════════════════════════════════════════════

export async function proxy(request: NextRequest) {
    const hostname = request.headers.get('host');
    const pathname = request.nextUrl.pathname;
    const domainInfo = resolveDomain(hostname);
    const knownProductId = resolveKnownProductIdByHostname(hostname);

    if (isMenuListQaHost(hostname) && pathname === '/robots.txt') {
        return applySecurityHeaders(request, new NextResponse('User-agent: *\nDisallow: /\n', {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }));
    }

    if (isMenuListQaHost(hostname) && pathname === '/sitemap.xml') {
        return applySecurityHeaders(request, new NextResponse(null, { status: 404 }));
    }

    const menulistRedirectResponse = buildMenuListRedirectDomainResponse(hostname, request);
    if (menulistRedirectResponse) {
        return applySecurityHeaders(request, menulistRedirectResponse);
    }

    const menulistOwnerAppResponse = buildMenuListOwnerAppResponse(hostname, request);
    if (menulistOwnerAppResponse) {
        return applySecurityHeaders(request, menulistOwnerAppResponse);
    }

    if (
        isLegacyAnswerlatticePublicHostname(hostname)
        && !shouldBypassDomainRouting(pathname)
    ) {
        const target = getProductDeploymentTarget('answerlattice', 'production');
        const url = buildOriginPinnedRedirectUrl(target.url, request);
        return NextResponse.redirect(url, 308);
    }

    if (
        process.env.VERCEL === '1'
        && knownProductId
        && !isActiveProductDomain(knownProductId, hostname)
        && !shouldBypassDomainRouting(pathname)
    ) {
        const target = getProductDeploymentTarget(knownProductId);
        const url = buildOriginPinnedRedirectUrl(target.url, request);
        return NextResponse.redirect(url, 308);
    }

    // ═══════════════════════════════════════════════════════════
    // Priority 1: Multi-Product Website Routing
    // ═══════════════════════════════════════════════════════════
    // Product domains (answerlattice.com, campaigncue.ai, surfaceos.app, etc.) are rewritten
    // to public website route groups under /sites/{product}. Product owner apps are
    // explicitly mapped to their own route groups, never nested under /sites.
    // In local dev, path prefixes work too: /__answerlattice/pricing → /sites/answerlattice/pricing
    // and /__campaigncue/app → /campaigncue/app.

    // MyCodex contains private repository documentation. Its internal rewrite
    // namespace is never a public entry point, including on non-Vercel hosts.
    if (
        pathname === MYCODEX_INTERNAL_BASE_PATH
        || pathname.startsWith(`${MYCODEX_INTERNAL_BASE_PATH}/`)
    ) {
        return applySecurityHeaders(
            request,
            setMyCodexResponseHeaders(new NextResponse(null, { status: 404 })),
        );
    }

    // Block direct access to /sites/* in production (only reachable via middleware rewrite)
    if (pathname.startsWith('/sites/') && process.env.VERCEL === '1') {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url, 301);
    }

    // Block direct access to the internal hosted-help route in production.
    // Hosted Help must be reached through a mapped help/docs/support domain so
    // SEO, canonical URLs, and tenant-domain validation stay aligned.
    if (
        process.env.VERCEL === '1'
        && (pathname === ANSWERLATTICE_HOSTED_HELP_INTERNAL_BASE_PATH || pathname.startsWith(`${ANSWERLATTICE_HOSTED_HELP_INTERNAL_BASE_PATH}/`))
    ) {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        url.search = '';
        return NextResponse.redirect(url, 301);
    }

    // Answerlattice hosted Help Center domains (help.example.com, docs.example.com).
    // Middleware only routes likely support-domain hostnames; the target page
    // validates the host against Answerlattice's cached public registry before
    // rendering any tenant content.
    if (
        domainInfo.type === 'custom'
        && isAnswerlatticeHostedHelpCandidateHostname(domainInfo.hostname)
        && !shouldBypassDomainRouting(pathname)
    ) {
        const url = request.nextUrl.clone();
        url.pathname = getAnswerlatticeHostedHelpRewritePath(pathname);
        const response = rewriteHostedHelpResponse(request, url, { domain: domainInfo.hostname });
        // Registry/content reads are cached internally. The HTML response stays
        // request-specific because admission includes a per-IP rate limit.
        return applySecurityHeaders(request, response);
    }

    // Block direct access to /client/* on platform domain (only reachable via middleware rewrite)
    // Tenant traffic arrives here via NextResponse.rewrite() with host = subdomain/custom domain.
    // Direct hits like menulist.ai/client/... should not leak the internal route structure.
    if (pathname === '/client' || pathname.startsWith('/client/')) {
        if (!domainInfo.isClient) {
            const url = request.nextUrl.clone();
            url.pathname = '/';
            return applySecurityHeaders(request, NextResponse.redirect(url, 301));
        }
    }

    // Dedicated SignalDesk hostnames are private app hosts, not restaurant
    // tenant subdomains and not public /sites product pages.
    if (knownProductId === 'signaldesk') {
        if (shouldBypassDomainRouting(pathname) || isSignalDeskHostPassthroughPath(pathname)) {
            return applySecurityHeaders(request, nextSignalDeskResponse(request));
        }

        const url = request.nextUrl.clone();
        const rewritePath = buildSignalDeskHostRewritePath(pathname);
        url.pathname = rewritePath;
        const response = rewritePath === pathname
            ? nextSignalDeskResponse(request)
            : rewriteSignalDeskResponse(request, url);
        return applySecurityHeaders(request, response);
    }

    // Local/internal aliases for portfolio/product landing pages:
    // /nv -> Neelvara, /ml -> MenuList, /al -> Answerlattice, /cc -> CampaignCue,
    // /sd -> SignalDesk private app.
    // Production canonical domains continue through the normal product routing.
    // These are path aliases only; product slugs, env names, and Firebase
    // targets remain the canonical per-product values.
    if (canUseInternalProductAliases(hostname, knownProductId)) {
        const signalDeskAliasMatch = resolveSignalDeskMyCodexAliasPath(pathname);
        if (signalDeskAliasMatch) {
            const { basePath, strippedPath } = signalDeskAliasMatch;
            const url = request.nextUrl.clone();
            const rewritePath = buildSignalDeskAliasRewritePath(strippedPath);
            url.pathname = rewritePath;
            const response = rewritePath === pathname
                ? nextSignalDeskResponse(request, basePath)
                : rewriteSignalDeskResponse(request, url, basePath);
            return applySecurityHeaders(request, response);
        }

        const aliasMatch = resolveMyCodexProductAliasPath(pathname);
        if (aliasMatch) {
            const { product, basePath, strippedPath } = aliasMatch;
            const url = request.nextUrl.clone();

            if (product.id === 'answerlattice') {
                const answerlatticeDashboardPath = getAnswerlatticeDashboardRewritePath(strippedPath);
                url.pathname = answerlatticeDashboardPath ||
                    buildAnswerlatticeWebsiteRewritePath(product.internalBasePath, strippedPath);
            } else if (product.id === 'campaigncue') {
                const campaignCueWorkspacePath = getCampaignCueWorkspaceRewritePath(strippedPath);
                url.pathname = campaignCueWorkspacePath ||
                    `${product.internalBasePath}${strippedPath === '/' ? '' : strippedPath}`;
            } else if (product.id === 'neelvara') {
                url.pathname = buildNeelvaraWebsiteRewritePath(product.internalBasePath, strippedPath);
            } else {
                url.pathname = strippedPath === '/product' ? '/how-it-works' : strippedPath;
            }

            const response = rewriteWithProductHeaders(request, url, product, basePath);
            return applySecurityHeaders(request, response);
        }
    }

    // SignalDesk is a private product host. Its canonical app and API paths
    // must not become alternate entry points on MenuList or sister-product
    // domains. Local development remains path-based, and the dedicated host
    // and any local/internal short alias has already been handled above.
    if (isSignalDeskRuntimePath(pathname) && !isTrustedLocalDevelopmentRequest(hostname)) {
        return applySecurityHeaders(request, new NextResponse(null, { status: 404 }));
    }

    // 1a. Vercel hostname-based product routing.
    // QA: answerlattice.menulist.online → /sites/answerlattice
    // Production: answerlattice.com → /sites/answerlattice
    if (domainInfo.type === 'product' && domainInfo.productSite) {
        const productConfig = domainInfo.productSite;

        if (productConfig.id === MYCODEX_PRODUCT_SLUG) {
            const authResponse = await authorizeMyCodexRequest(request);
            if (authResponse) {
                return applySecurityHeaders(request, authResponse);
            }
        }

        if (productConfig.id === 'answerlattice') {
            if (pathname === '/answerlattice' || pathname.startsWith('/answerlattice/')) {
                const url = request.nextUrl.clone();
                url.pathname = pathname === '/answerlattice'
                    ? '/dashboard'
                    : pathname.slice('/answerlattice'.length) || '/dashboard';
                return NextResponse.redirect(url, 301);
            }

            if (shouldPassThroughAnswerlatticeProductPath(pathname)) {
                return applySecurityHeaders(request, nextWithProductHeaders(request, productConfig));
            }

            const answerlatticeDashboardPath = getAnswerlatticeDashboardRewritePath(pathname);
            const url = request.nextUrl.clone();
            url.pathname = answerlatticeDashboardPath ||
                buildAnswerlatticeWebsiteRewritePath(productConfig.internalBasePath, pathname);

            const response = rewriteWithProductHeaders(request, url, productConfig);
            return applySecurityHeaders(request, response);
        }

        if (productConfig.id === 'campaigncue') {
            if (shouldBypassDomainRouting(pathname)) {
                return applySecurityHeaders(request, nextWithProductHeaders(request, productConfig));
            }

            if (isInvalidCampaignCuePublicFeaturePath(pathname)) {
                return applySecurityHeaders(request, productNotFoundResponse(productConfig));
            }

            const campaignCueWorkspacePath = getCampaignCueWorkspaceRewritePath(pathname);
            const url = request.nextUrl.clone();
            url.pathname = campaignCueWorkspacePath || `${productConfig.internalBasePath}${pathname === '/' ? '' : pathname}`;
            const response = rewriteWithProductHeaders(request, url, productConfig);
            return applySecurityHeaders(request, response);
        }

        const url = request.nextUrl.clone();
        url.pathname = productConfig.id === 'neelvara'
            ? buildNeelvaraWebsiteRewritePath(productConfig.internalBasePath, pathname)
            : `${productConfig.internalBasePath}${pathname === '/' ? '' : pathname}`;
        const response = rewriteWithProductHeaders(request, url, productConfig);
        return applySecurityHeaders(
            request,
            productConfig.id === MYCODEX_PRODUCT_SLUG ? setMyCodexResponseHeaders(response) : response,
        );
    }

    // 1b. Local dev: path-prefix product routing (/__answerlattice/pricing → /sites/answerlattice/pricing)
    if (process.env.NODE_ENV === 'development' || !process.env.VERCEL) {
        if (pathname === ANSWERLATTICE_HOSTED_HELP_DEV_PREFIX || pathname.startsWith(`${ANSWERLATTICE_HOSTED_HELP_DEV_PREFIX}/`)) {
            const url = request.nextUrl.clone();
            const strippedPath = pathname.slice(ANSWERLATTICE_HOSTED_HELP_DEV_PREFIX.length) || '/';
            url.pathname = getAnswerlatticeHostedHelpRewritePath(strippedPath);
            const response = rewriteHostedHelpResponse(request, url, { development: true });
            return applySecurityHeaders(request, response);
        }

        const devProductMatch = resolveProductSiteByDevPath(pathname);
        if (devProductMatch) {
            const { product, strippedPath } = devProductMatch;
            if (product.id === MYCODEX_PRODUCT_SLUG) {
                const authResponse = await authorizeMyCodexRequest(request);
                if (authResponse) {
                    return applySecurityHeaders(request, authResponse);
                }
            }

            const url = request.nextUrl.clone();
            const answerlatticeDashboardPath = product.id === 'answerlattice'
                ? getAnswerlatticeDashboardRewritePath(strippedPath)
                : null;
            const campaignCueWorkspacePath = product.id === 'campaigncue'
                ? getCampaignCueWorkspaceRewritePath(strippedPath)
                : null;
            if (product.id === 'campaigncue' && isInvalidCampaignCuePublicFeaturePath(strippedPath)) {
                return applySecurityHeaders(request, productNotFoundResponse(product, product.devPathPrefix));
            }
            const productWebsitePath = product.id === 'answerlattice'
                ? buildAnswerlatticeWebsiteRewritePath(product.internalBasePath, strippedPath)
                : product.id === 'neelvara'
                    ? buildNeelvaraWebsiteRewritePath(product.internalBasePath, strippedPath)
                    : `${product.internalBasePath}${strippedPath === '/' ? '' : strippedPath}`;
            url.pathname = answerlatticeDashboardPath || campaignCueWorkspacePath || productWebsitePath;
            const response = rewriteWithProductHeaders(request, url, product, product.devPathPrefix);
            return applySecurityHeaders(
                request,
                product.id === MYCODEX_PRODUCT_SLUG ? setMyCodexResponseHeaders(response) : response,
            );
        }

    }

    // Legacy MenuList website route. Keep this out of next.config.js because
    // Next redirects are hostname-agnostic and would also catch
    // answerlattice.com/product before Answerlattice's product-domain rewrite.
    if ((domainInfo.type === 'platform' || domainInfo.type === 'localhost') && pathname === '/product') {
        const url = request.nextUrl.clone();
        url.pathname = '/how-it-works';
        return NextResponse.redirect(url, 301);
    }

    // ═══════════════════════════════════════════════════════════
    // Priority 2: Multi-Tenant Client Routing
    // ═══════════════════════════════════════════════════════════

    // Skip routing for static assets, API, and internal routes BEFORE
    // URL normalization — API routes like /api/WebhookPayload must not
    // be 301-redirected to lowercase.
    const skipRouting = shouldBypassDomainRouting(pathname) ||
        pathname === '/feedback' ||
        pathname.startsWith('/feedback/') ||
        pathname === '/screen' ||
        pathname.startsWith('/screen/') ||
        pathname === '/offline' ||
        pathname.startsWith('/(main)') ||
        pathname.startsWith('/(global-pages)');

    if (skipRouting) {
        return applySecurityHeaders(request, nextWithSanitizedRoutingHeaders(request));
    }

    // URL Routing Architecture — Phase 2: Lowercase + trailing slash normalization
    // Only applies to client tenant routes (not API, not static assets)
    if (domainInfo.isClient && pathname !== pathname.toLowerCase()) {
        const url = request.nextUrl.clone();
        url.pathname = pathname.toLowerCase();
        return NextResponse.redirect(url, 301);
    }
    if (domainInfo.isClient && pathname.length > 1 && pathname.endsWith('/')) {
        const url = request.nextUrl.clone();
        url.pathname = pathname.slice(0, -1);
        return NextResponse.redirect(url, 301);
    }

    let response: NextResponse;

    if (domainInfo.isClient) {
        // Client domain - rewrite to /client route namespace
        const url = request.nextUrl.clone();
        url.pathname = pathname === '/robots.txt'
            ? '/client/robots'
            : `/client${pathname === '/' ? '' : pathname}`;

        response = rewriteTenantResponse(request, url);

        // CDN cache headers for public menu/OBP pages (URL Routing Architecture — Phase 2)
        response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    } else {
        // Priority 3: Platform domain (menulist.ai) — serves (website) route group naturally
        response = nextWithSanitizedRoutingHeaders(request);
    }

    return applySecurityHeaders(request, response);
}

// Apply middleware to all routes except static files and images
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files
         */
        '/((?!_next/static|_next/image|favicon.ico|serwist(?:/|$)|sw\\.js|sw-customer\\.js|mycodex-sw\\.js|workbox-.*\\.js|manifest\\.json|swe-worker-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|webmanifest)$).*)',
    ],
};
