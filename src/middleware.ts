/**
 * Next.js Edge Middleware - Security Headers + Multi-Product & Multi-Tenant Routing
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * Routing Priority:
 * 1. Active product domains. Public product website paths rewrite to /sites/{product};
 *    product owner app paths rewrite to the product route group when configured.
 * 2. Dev path prefixes (/__answerlattice → /sites/answerlattice,
 *    /__campaigncue/app(/...) → /campaigncue/app(/...)) — local dev only
 * 3. Client tenant domains (*.menulist.ai → /client)
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
 * This runs on EVERY request at the edge (before route handlers)
 */

import { CSP_ALLOWLIST, CSP_DEV_SETTINGS, buildCSPDirective } from '@config/csp-allowlist';
import {
    ANSWERLATTICE_PRODUCT_PASSTHROUGH_PATHS,
    getAnswerlatticeDashboardRewritePath,
} from '@constant/answerlattice/domains';
import { getCampaignCueWorkspaceRewritePath } from '@constant/campaigncue/domains';
import {
    getDeploymentStage,
    getProductDeploymentTarget,
    isActiveProductDomain,
    resolveKnownProductIdByHostname,
} from '@constant/deploymentTargets';
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
import {
    MYCODEX_LOGIN_PATH,
    MYCODEX_PRODUCT_SLUG,
    MYCODEX_ROBOTS_TAG,
    MYCODEX_SESSION_COOKIE,
    getMyCodexExpectedCredentials,
    isMyCodexAuthBypassPath,
    sanitizeMyCodexReturnTo,
    verifyMyCodexSessionToken,
} from '@lib/mycodex/auth';
import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════
// Security Headers (shared across all routing paths)
// ═══════════════════════════════════════════════════════════════

function applySecurityHeaders(request: NextRequest, response: NextResponse): NextResponse {
    // Use VERCEL_ENV to distinguish real production from preview deployments.
    // On Vercel, NODE_ENV is always 'production' for both, but VERCEL_ENV is
    // 'preview' on PR deploys — we don't want strict HSTS/CSP there.
    const isVercelPreview = process.env.VERCEL === '1' && process.env.VERCEL_ENV !== 'production';
    const isProduction = process.env.NODE_ENV === 'production' && !isVercelPreview;
    const isDev = !isProduction;
    const isAnswerlatticeWidgetRoute = request.nextUrl.pathname === '/widget' || request.nextUrl.pathname.startsWith('/widget/');
    const frameAncestorsDirective = isAnswerlatticeWidgetRoute
        ? 'frame-ancestors https: http://localhost:* http://127.0.0.1:*'
        : "frame-ancestors 'none'";

    // A02: Force HTTPS in Production
    if (
        isProduction
        && !isLocalDevelopmentHost(request.headers.get('host'))
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
        buildCSPDirective('connect-src', CSP_ALLOWLIST.connectSources),
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
        buildCSPDirective('connect-src', CSP_ALLOWLIST.connectSources),
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

    return response;
}

function shouldPassThroughAnswerlatticeProductPath(pathname: string): boolean {
    if ((ANSWERLATTICE_PRODUCT_PASSTHROUGH_PATHS as readonly string[]).includes(pathname)) return true;
    if (pathname.startsWith('/widget/')) return true;

    return shouldBypassDomainRouting(pathname);
}

function normalizeHostname(hostname: string | null): string {
    return hostname?.split(':')[0].toLowerCase() || '';
}

function isLocalDevelopmentHost(hostname: string | null): boolean {
    const normalizedHost = normalizeHostname(hostname);
    return normalizedHost === 'localhost'
        || normalizedHost === '127.0.0.1'
        || normalizedHost.startsWith('192.168.');
}

function isLegacyAnswerlatticePublicHostname(hostname: string | null): boolean {
    const normalizedHost = normalizeHostname(hostname);
    return normalizedHost === 'canonica.app' || normalizedHost === 'www.canonica.app';
}

function buildAnswerlatticeWebsiteRewritePath(basePath: string, publicPath: string): string {
    return (publicPath === '/' || publicPath === '/home') ? basePath : `${basePath}${publicPath}`;
}

function rewriteWithProductHeaders(
    request: NextRequest,
    url: URL,
    productConfig: ProductDomainConfig,
    basePath = '',
): NextResponse {
    const requestHeaders = new Headers(request.headers);
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

    return response;
}

const MYCODEX_PRODUCT_ALIAS_ROUTES: Array<{
    prefix: string;
    productId: Extract<ProductSiteId, 'menulist' | 'answerlattice' | 'campaigncue'>;
}> = [
    { prefix: '/ml', productId: 'menulist' },
    { prefix: '/al', productId: 'answerlattice' },
    { prefix: '/cc', productId: 'campaigncue' },
];

const INTERNAL_PRODUCT_ALIAS_HOSTS = new Set([
    'menulist.online',
    'www.menulist.online',
]);

function canUseInternalProductAliases(hostname: string | null, knownProductId: string | null): boolean {
    if (getDeploymentStage() === 'production') return false;
    if (
        process.env.NODE_ENV === 'production'
        && process.env.VERCEL_ENV !== 'preview'
        && process.env.NEXT_PUBLIC_ENV !== 'preview'
    ) {
        return false;
    }

    const normalizedHost = normalizeHostname(hostname);
    return knownProductId === MYCODEX_PRODUCT_SLUG || INTERNAL_PRODUCT_ALIAS_HOSTS.has(normalizedHost);
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

    if (!getMyCodexExpectedCredentials()) {
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

// ═══════════════════════════════════════════════════════════════
// Main Middleware
// ═══════════════════════════════════════════════════════════════

export async function middleware(request: NextRequest) {
    const hostname = request.headers.get('host');
    const pathname = request.nextUrl.pathname;
    const domainInfo = resolveDomain(hostname);
    const knownProductId = resolveKnownProductIdByHostname(hostname);

    if (
        isLegacyAnswerlatticePublicHostname(hostname)
        && !shouldBypassDomainRouting(pathname)
    ) {
        const target = getProductDeploymentTarget('answerlattice', 'production');
        const url = new URL(request.nextUrl.pathname, target.url);
        url.search = request.nextUrl.search;
        return NextResponse.redirect(url, 308);
    }

    if (
        process.env.VERCEL === '1'
        && knownProductId
        && !isActiveProductDomain(knownProductId, hostname)
        && !shouldBypassDomainRouting(pathname)
    ) {
        const target = getProductDeploymentTarget(knownProductId);
        const url = new URL(request.nextUrl.pathname, target.url);
        url.search = request.nextUrl.search;
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
        const response = NextResponse.rewrite(url);
        response.headers.set('x-answerlattice-hosted-help-domain', domainInfo.hostname);
        response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        return applySecurityHeaders(request, response);
    }

    // Block direct access to /client/* on platform domain (only reachable via middleware rewrite)
    // Tenant traffic arrives here via NextResponse.rewrite() with host = subdomain/custom domain.
    // Direct hits like menulist.ai/client/... should not leak the internal route structure.
    if (pathname === '/client' || pathname.startsWith('/client/')) {
        if (!domainInfo.isClient) {
            const url = request.nextUrl.clone();
            url.pathname = '/';
            return NextResponse.redirect(url, 301);
        }
    }

    // Internal/test-only aliases for portfolio/product landing pages:
    // /ml -> MenuList, /al -> Answerlattice, /cc -> CampaignCue.
    // Production canonical domains continue through the normal product routing.
    // These are path aliases only; product slugs, env names, and Firebase
    // targets remain the canonical per-product values.
    if (canUseInternalProductAliases(hostname, knownProductId)) {
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
            } else {
                url.pathname = strippedPath === '/product' ? '/how-it-works' : strippedPath;
            }

            const response = rewriteWithProductHeaders(request, url, product, basePath);
            return applySecurityHeaders(request, response);
        }
    }

    // 1a. Vercel hostname-based product routing.
    // QA: ecomsai.com → /sites/answerlattice
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
                return applySecurityHeaders(request, NextResponse.next());
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
                return applySecurityHeaders(request, NextResponse.next());
            }

            const campaignCueWorkspacePath = getCampaignCueWorkspaceRewritePath(pathname);
            const url = request.nextUrl.clone();
            url.pathname = campaignCueWorkspacePath || `${productConfig.internalBasePath}${pathname === '/' ? '' : pathname}`;
            const response = rewriteWithProductHeaders(request, url, productConfig);
            return applySecurityHeaders(request, response);
        }

        const url = request.nextUrl.clone();
        url.pathname = `${productConfig.internalBasePath}${pathname === '/' ? '' : pathname}`;
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
            const response = NextResponse.rewrite(url);
            response.headers.set('x-answerlattice-hosted-help-dev', '1');
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
            const productWebsitePath = product.id === 'answerlattice'
                ? buildAnswerlatticeWebsiteRewritePath(product.internalBasePath, strippedPath)
                : product.id === 'constantlayer' && strippedPath === '/'
                    ? `${product.internalBasePath}/home`
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
        return applySecurityHeaders(request, NextResponse.next());
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

        response = NextResponse.rewrite(url);

        // CDN cache headers for public menu/OBP pages (URL Routing Architecture — Phase 2)
        response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

        // Pass tenant info to the page via headers
        if (domainInfo.subdomain) {
            response.headers.set('x-tenant-subdomain', domainInfo.subdomain);
            response.headers.set('x-tenant-type', 'subdomain');
        }
        if (domainInfo.customDomain) {
            response.headers.set('x-tenant-custom-domain', domainInfo.customDomain);
            response.headers.set('x-tenant-type', 'custom');
        }
    } else {
        // Priority 3: Platform domain (menulist.ai) — serves (website) route group naturally
        response = NextResponse.next();
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
        '/((?!_next/static|_next/image|favicon.ico|sw\\.js|sw-customer\\.js|mycodex-sw\\.js|workbox-.*\\.js|manifest\\.json|swe-worker-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|webmanifest)$).*)',
    ],
};
