/**
 * Next.js Edge Middleware - Security Headers + Multi-Product & Multi-Tenant Routing
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * Routing Priority:
 * 1. Active product website domains (QA ecomsai.com / prod canonica.app → /sites/canonica,
 *    menulist.digital → /sites/mycodex)
 * 2. Dev path prefixes (/__canonica → /sites/canonica) — local dev only
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
    CANONICA_PRODUCT_PASSTHROUGH_PATHS,
    getCanonicaDashboardRewritePath,
} from '@constant/canonica/domains';
import {
    getProductDeploymentTarget,
    isActiveProductDomain,
    resolveKnownProductIdByHostname,
} from '@constant/deploymentTargets';
import {
    CANONICA_HOSTED_HELP_DEV_PREFIX,
    CANONICA_HOSTED_HELP_INTERNAL_BASE_PATH,
    getCanonicaHostedHelpRewritePath,
    isCanonicaHostedHelpCandidateHostname,
} from '@constant/canonica/hostedHelp';
import { resolveProductSiteByDevPath } from '@constant/productDomains';
import { resolveDomain, shouldBypassDomainRouting } from '@lib/multiTenant/domainResolver';
import { NextRequest, NextResponse } from 'next/server';

const MYCODEX_PRODUCT_ID = 'mycodex';
const MYCODEX_BASIC_AUTH_REALM = 'MyCodex';
const MYCODEX_ROBOTS_TAG = 'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate';

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
    const isCanonicaWidgetRoute = request.nextUrl.pathname === '/widget' || request.nextUrl.pathname.startsWith('/widget/');
    const frameAncestorsDirective = isCanonicaWidgetRoute
        ? 'frame-ancestors https: http://localhost:* http://127.0.0.1:*'
        : "frame-ancestors 'none'";

    // A02: Force HTTPS in Production
    if (isProduction && request.headers.get('x-forwarded-proto') !== 'https') {
        return NextResponse.redirect(
            `https://${request.headers.get('host')}${request.nextUrl.pathname}`,
            301
        );
    }

    // A05: Security Headers (OWASP Recommendations)
    if (!isCanonicaWidgetRoute) {
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

function shouldPassThroughCanonicaProductPath(pathname: string): boolean {
    if ((CANONICA_PRODUCT_PASSTHROUGH_PATHS as readonly string[]).includes(pathname)) return true;
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

function decodeBasicAuthCredentials(authHeader: string | null): { username: string; password: string } | null {
    if (!authHeader) return null;

    const [scheme, encoded] = authHeader.split(/\s+/, 2);
    if (scheme?.toLowerCase() !== 'basic' || !encoded) return null;

    try {
        const decoded = atob(encoded);
        const separatorIndex = decoded.indexOf(':');
        if (separatorIndex === -1) return null;

        return {
            username: decoded.slice(0, separatorIndex),
            password: decoded.slice(separatorIndex + 1),
        };
    } catch {
        return null;
    }
}

function buildMyCodexAuthChallenge(): NextResponse {
    return setMyCodexResponseHeaders(new NextResponse('Authentication required.', {
        status: 401,
        headers: {
            'WWW-Authenticate': `Basic realm="${MYCODEX_BASIC_AUTH_REALM}", charset="UTF-8"`,
            'Cache-Control': 'private, no-store',
        },
    }));
}

function authorizeMyCodexRequest(request: NextRequest): NextResponse | null {
    if (!process.env.VERCEL && isLocalDevelopmentHost(request.headers.get('host'))) {
        return null;
    }

    const expectedUsername = process.env.MYCODEX_BASIC_AUTH_USER?.trim();
    const expectedPassword = process.env.MYCODEX_BASIC_AUTH_PASSWORD?.trim();

    if (!expectedUsername || !expectedPassword) {
        return setMyCodexResponseHeaders(new NextResponse('MyCodex access is not configured.', {
            status: 503,
            headers: {
                'Cache-Control': 'private, no-store',
            },
        }));
    }

    const credentials = decodeBasicAuthCredentials(request.headers.get('authorization'));
    if (
        !credentials
        || credentials.username !== expectedUsername
        || credentials.password !== expectedPassword
    ) {
        return buildMyCodexAuthChallenge();
    }

    return null;
}

function setMyCodexResponseHeaders(response: NextResponse): NextResponse {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', MYCODEX_ROBOTS_TAG);
    response.headers.set('Vary', 'Authorization');
    return response;
}

// ═══════════════════════════════════════════════════════════════
// Main Middleware
// ═══════════════════════════════════════════════════════════════

export function middleware(request: NextRequest) {
    const hostname = request.headers.get('host');
    const pathname = request.nextUrl.pathname;
    const domainInfo = resolveDomain(hostname);
    const knownProductId = resolveKnownProductIdByHostname(hostname);

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
    // Product domains (canonica.app, surfaceos.app, etc.) are rewritten
    // to internal route groups: /sites/canonica/, /sites/surfaceos/, etc.
    // In local dev, path prefixes work too: /__canonica/pricing → /sites/canonica/pricing

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
        && (pathname === CANONICA_HOSTED_HELP_INTERNAL_BASE_PATH || pathname.startsWith(`${CANONICA_HOSTED_HELP_INTERNAL_BASE_PATH}/`))
    ) {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        url.search = '';
        return NextResponse.redirect(url, 301);
    }

    // Canonica hosted Help Center domains (help.example.com, docs.example.com).
    // Middleware only routes likely support-domain hostnames; the target page
    // validates the host against Canonica's cached public registry before
    // rendering any tenant content.
    if (
        domainInfo.type === 'custom'
        && isCanonicaHostedHelpCandidateHostname(domainInfo.hostname)
        && !shouldBypassDomainRouting(pathname)
    ) {
        const url = request.nextUrl.clone();
        url.pathname = getCanonicaHostedHelpRewritePath(pathname);
        const response = NextResponse.rewrite(url);
        response.headers.set('x-canonica-hosted-help-domain', domainInfo.hostname);
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

    // 1a. Vercel hostname-based product routing.
    // QA: ecomsai.com → /sites/canonica
    // Production: canonica.app → /sites/canonica
    if (domainInfo.type === 'product' && domainInfo.productSite) {
        const productConfig = domainInfo.productSite;

        if (productConfig.id === MYCODEX_PRODUCT_ID) {
            const authResponse = authorizeMyCodexRequest(request);
            if (authResponse) {
                return applySecurityHeaders(request, authResponse);
            }
        }

        if (productConfig.id === 'canonica') {
            if (pathname === '/canonica' || pathname.startsWith('/canonica/')) {
                const url = request.nextUrl.clone();
                url.pathname = pathname === '/canonica'
                    ? '/dashboard'
                    : pathname.slice('/canonica'.length) || '/dashboard';
                return NextResponse.redirect(url, 301);
            }

            if (shouldPassThroughCanonicaProductPath(pathname)) {
                return applySecurityHeaders(request, NextResponse.next());
            }

            const canonicaDashboardPath = getCanonicaDashboardRewritePath(pathname);
            const url = request.nextUrl.clone();
            url.pathname = canonicaDashboardPath ||
                `${productConfig.internalBasePath}${pathname === '/' ? '' : pathname}`;

            const response = NextResponse.rewrite(url);
            response.headers.set('x-product-id', productConfig.id);
            response.headers.set('x-product-name', productConfig.name);
            return applySecurityHeaders(request, response);
        }

        const url = request.nextUrl.clone();
        url.pathname = `${productConfig.internalBasePath}${pathname === '/' ? '' : pathname}`;
        const response = NextResponse.rewrite(url);
        response.headers.set('x-product-id', productConfig.id);
        response.headers.set('x-product-name', productConfig.name);
        return applySecurityHeaders(
            request,
            productConfig.id === MYCODEX_PRODUCT_ID ? setMyCodexResponseHeaders(response) : response,
        );
    }

    // 1b. Local dev: path-prefix product routing (/__canonica/pricing → /sites/canonica/pricing)
    if (process.env.NODE_ENV === 'development' || !process.env.VERCEL) {
        if (pathname === CANONICA_HOSTED_HELP_DEV_PREFIX || pathname.startsWith(`${CANONICA_HOSTED_HELP_DEV_PREFIX}/`)) {
            const url = request.nextUrl.clone();
            const strippedPath = pathname.slice(CANONICA_HOSTED_HELP_DEV_PREFIX.length) || '/';
            url.pathname = getCanonicaHostedHelpRewritePath(strippedPath);
            const response = NextResponse.rewrite(url);
            response.headers.set('x-canonica-hosted-help-dev', '1');
            return applySecurityHeaders(request, response);
        }

        const devProductMatch = resolveProductSiteByDevPath(pathname);
        if (devProductMatch) {
            const { product, strippedPath } = devProductMatch;
            if (product.id === MYCODEX_PRODUCT_ID) {
                const authResponse = authorizeMyCodexRequest(request);
                if (authResponse) {
                    return applySecurityHeaders(request, authResponse);
                }
            }

            const url = request.nextUrl.clone();
            const canonicaDashboardPath = product.id === 'canonica'
                ? getCanonicaDashboardRewritePath(strippedPath)
                : null;
            url.pathname = canonicaDashboardPath ||
                `${product.internalBasePath}${strippedPath === '/' ? '' : strippedPath}`;
            const response = NextResponse.rewrite(url);
            response.headers.set('x-product-id', product.id);
            response.headers.set('x-product-name', product.name);
            return applySecurityHeaders(
                request,
                product.id === MYCODEX_PRODUCT_ID ? setMyCodexResponseHeaders(response) : response,
            );
        }

    }

    // Legacy MenuList website route. Keep this out of next.config.js because
    // Next redirects are hostname-agnostic and would also catch
    // canonica.app/product before Canonica's product-domain rewrite.
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
        url.pathname = `/client${pathname === '/' ? '' : pathname}`;

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
        '/((?!_next/static|_next/image|favicon.ico|sw\\.js|sw-customer\\.js|workbox-.*\\.js|manifest\\.json|swe-worker-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|webmanifest)$).*)',
    ],
};
