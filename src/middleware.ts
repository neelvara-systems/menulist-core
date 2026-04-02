/**
 * Next.js Edge Middleware - Security Headers + Multi-Product & Multi-Tenant Routing
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * Routing Priority:
 * 1. Product website domains (canonica.app → /_sites/canonica)
 * 2. Dev path prefixes (/__canonica → /_sites/canonica) — local dev only
 * 3. Client tenant domains (*.menulist.ai → /_client)
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
import { resolveProductSiteByDevPath } from '@constant/productDomains';
import { resolveDomain, shouldBypassDomainRouting } from '@lib/multiTenant/domainResolver';
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

    // A02: Force HTTPS in Production
    if (isProduction && request.headers.get('x-forwarded-proto') !== 'https') {
        return NextResponse.redirect(
            `https://${request.headers.get('host')}${request.nextUrl.pathname}`,
            301
        );
    }

    // A05: Security Headers (OWASP Recommendations)
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), payment=()'
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
        "frame-ancestors 'none'",
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
        "frame-ancestors 'none'",
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

// ═══════════════════════════════════════════════════════════════
// Main Middleware
// ═══════════════════════════════════════════════════════════════

export function middleware(request: NextRequest) {
    const hostname = request.headers.get('host');
    const pathname = request.nextUrl.pathname;
    const domainInfo = resolveDomain(hostname);

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

    // 1a. Production: hostname-based product routing (canonica.app → /sites/canonica)
    if (domainInfo.type === 'product' && domainInfo.productSite) {
        const productConfig = domainInfo.productSite;
        const url = request.nextUrl.clone();
        url.pathname = `${productConfig.internalBasePath}${pathname === '/' ? '' : pathname}`;
        const response = NextResponse.rewrite(url);
        response.headers.set('x-product-id', productConfig.id);
        response.headers.set('x-product-name', productConfig.name);
        return applySecurityHeaders(request, response);
    }

    // 1b. Local dev: path-prefix product routing (/__canonica/pricing → /_sites/canonica/pricing)
    if (process.env.NODE_ENV === 'development' || !process.env.VERCEL) {
        const devProductMatch = resolveProductSiteByDevPath(pathname);
        if (devProductMatch) {
            const { product, strippedPath } = devProductMatch;
            const url = request.nextUrl.clone();
            url.pathname = `${product.internalBasePath}${strippedPath === '/' ? '' : strippedPath}`;
            const response = NextResponse.rewrite(url);
            response.headers.set('x-product-id', product.id);
            response.headers.set('x-product-name', product.name);
            return applySecurityHeaders(request, response);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Priority 2: Multi-Tenant Client Routing
    // ═══════════════════════════════════════════════════════════

    // Skip routing for static assets, API, and internal routes BEFORE
    // URL normalization — API routes like /api/WebhookPayload must not
    // be 301-redirected to lowercase.
    const skipRouting = shouldBypassDomainRouting(pathname) ||
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
        // Client domain - rewrite to (client) route group
        const url = request.nextUrl.clone();
        url.pathname = `/_client${pathname === '/' ? '' : pathname}`;

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
        '/((?!_next/static|_next/image|favicon.ico|sw\\.js|workbox-.*\\.js|manifest\\.json|swe-worker-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|webmanifest)$).*)',
    ],
};
