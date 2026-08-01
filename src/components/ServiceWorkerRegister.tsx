'use client';

/**
 * Service Worker Registration (Per-Tenant)
 * ═══════════════════════════════════════════════════════════════
 *
 * MenuList runs multiple isolated PWAs from one Next.js build:
 *
 *   1. Owner Dashboard PWA   → platform origins (menulist.ai, app.menulist.ai)
 *      Registers `/serwist/sw.js` (Serwist, bounded static caching only).
 *
 *   2. Customer App PWA      → tenant origins ({subdomain}.menulist.ai,
 *                              verified custom domains)
 *      Registers `/sw-customer.js` (hand-rolled, minimal, no caching).
 *
 *   3. MyCodex PWA           → private MyCodex product host if one is
 *                              explicitly configured later.
 *      Registers `/mycodex-sw.js` (private docs offline shell only).
 *
 * Registration is conditional on the current origin's tenant type, which
 * is derived client-side from `window.location.host` via the same
 * `resolveDomain` utility the middleware uses. This keeps the two SW
 * scopes strictly separated — a customer origin NEVER registers the
 * owner worker, and vice versa.
 *
 * Migration safety: If the browser has a stale registration pointing to
 * a different script URL (e.g. a customer who previously had `sw.js`
 * from the old auto-register config), we unregister it before installing
 * the correct one. `skipWaiting` + `clientsClaim` in both SWs ensure the
 * new SW takes over on the next load.
 *
 * @see next.config.js § Service Worker Strategy
 * @see public/sw-customer.js
 * @see src/lib/multiTenant/domainResolver.ts
 */

import { resolveDomain } from '@lib/multiTenant/domainResolver';
import { resolveDeploymentStage } from '@constant/deploymentTargets';
import {
    getServiceWorkerRegistrationScriptUrl,
    isExactServiceWorkerRegistration,
} from '@lib/pwa/serviceWorkerRegistration';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const OWNER_SW_URL = '/serwist/sw.js';
const LEGACY_OWNER_SW_URL = '/sw.js';
const CUSTOMER_SW_URL = '/sw-customer.js';
const MYCODEX_SW_URL = '/mycodex-sw.js';
const PUBLIC_SW_CLEARED_RELOAD_KEY = '__menulist_public_sw_cleared__';
const MAX_SERVICE_WORKER_SCRIPT_LABEL_DIAGNOSTICS = 6;
let reportedServiceWorkerDomainResolutionFailure = false;
let reportedServiceWorkerPublicCleanupReloadStorageFailure = false;
const reportedServiceWorkerScriptLabelFailures = new Set<string>();
let serviceWorkerReconciliationQueue: Promise<void> = Promise.resolve();
const OWNER_APP_PATHS = [
    /^\/dashboard(?:\/|$)/,
    /^\/billing(?:\/|$)/,
    /^\/assets(?:\/|$)/,
    /^\/business-health(?:\/|$)/,
    /^\/business-settings(?:\/|$)/,
    /^\/feedback\/?$/,
    /^\/forgot-password(?:\/|$)/,
    /^\/growth-kits(?:\/|$)/,
    /^\/help-center(?:\/|$)/,
    /^\/locations(?:\/|$)/,
    /^\/menu-manager(?:\/|$)/,
    /^\/ops(?:\/|$)/,
    /^\/platform(?:\/|$)/,
    /^\/projects(?:\/|$)/,
    /^\/qr-code(?:\/|$)/,
    /^\/qrCode(?:\/|$)/,
    /^\/reseller(?:\/|$)/,
    /^\/screen(?:\/|$)/,
    /^\/signin(?:\/|$)/,
    /^\/today(?:\/|$)/,
    /^\/transactions(?:\/|$)/,
    /^\/use-menulist(?:\/|$)/,
    /^\/users(?:\/|$)/,
    /^\/unauthorized(?:\/|$)/,
];

function getResolvedDomain() {
    if (typeof window === 'undefined') return null;

    try {
        return resolveDomain(window.location.host);
    } catch (error) {
        if (!reportedServiceWorkerDomainResolutionFailure) {
            reportedServiceWorkerDomainResolutionFailure = true;
            logRuntimeFailure('service_worker_domain_resolution_failed', error, {
                hasLocation: Boolean(window.location),
                hasWindow: true,
                ...getBoundedRuntimeStringContext('host', window.location.host),
                failurePolicy: 'register_nothing',
            });
        }
        return null;
    }
}

function isOwnerAppPath(pathname: string): boolean {
    return OWNER_APP_PATHS.some((pattern) => pattern.test(pathname));
}

function isStandaloneDisplayMode(): boolean {
    if (typeof window === 'undefined') return false;

    const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };

    return window.matchMedia?.('(display-mode: standalone)').matches === true
        || navigatorWithStandalone.standalone === true;
}

function shouldPreserveOwnerWorkerWithoutTarget(): boolean {
    const resolved = getResolvedDomain();
    return resolved?.type === 'platform' && isOwnerWorkerRuntimeEnabled();
}

function isOwnerWorkerRuntimeEnabled(): boolean {
    const deploymentStage = resolveDeploymentStage();
    return process.env.NODE_ENV === 'production'
        && deploymentStage.valid
        && deploymentStage.stage !== 'preview';
}

function getTargetSwUrl(pathname: string): string | null {
    if (typeof window === 'undefined') return null;

    const resolved = getResolvedDomain();
    if (!resolved) {
        // Unknown origin → register nothing. Safer than attaching either
        // worker to the wrong scope.
        return null;
    }

    // Customer tenants (subdomain or custom domain) → minimal SW.
    if (resolved.type === 'subdomain' || resolved.type === 'custom') {
        return CUSTOMER_SW_URL;
    }

    // Dedicated private docs product host.
    if (resolved.type === 'product' && resolved.productSite?.id === 'mycodex') {
        return MYCODEX_SW_URL;
    }

    // Platform origins serve both the public marketing website and the
    // owner app. Normal website routes should not install Workbox, but an
    // already-installed standalone owner app must be able to repair/register
    // its worker even when iOS launches it at the origin root.
    if (resolved.type === 'platform') {
        if (!isOwnerWorkerRuntimeEnabled()) return null;
        return isOwnerAppPath(pathname) || isStandaloneDisplayMode()
            ? OWNER_SW_URL
            : null;
    }

    // Other product sites and localhost should not register a worker.
    return null;
}

function getTargetSwLabel(targetUrl: string | null): string {
    if (targetUrl === OWNER_SW_URL) return 'owner';
    if (targetUrl === CUSTOMER_SW_URL) return 'customer';
    if (targetUrl === MYCODEX_SW_URL) return 'mycodex';
    if (targetUrl === null) return 'none';
    return 'unknown';
}

function getRegisteredSwLabel(scriptUrl: string | undefined): string {
    if (!scriptUrl) return 'none';

    try {
        const pathname = new URL(scriptUrl).pathname;
        if (pathname === OWNER_SW_URL || pathname === LEGACY_OWNER_SW_URL) return 'owner';
        if (pathname === CUSTOMER_SW_URL) return 'customer';
        if (pathname === MYCODEX_SW_URL) return 'mycodex';
    } catch (error) {
        logServiceWorkerScriptLabelFailure(error, scriptUrl);
        return 'unknown';
    }

    return 'unknown';
}

function logServiceWorkerScriptLabelFailure(error: unknown, scriptUrl: string): void {
    const scriptUrlContext = getBoundedRuntimeStringContext('scriptUrl', scriptUrl);
    const scriptUrlShape = {
        ...scriptUrlContext,
        hasProtocolSeparator: scriptUrl.includes('://'),
        startsWithSlash: scriptUrl.startsWith('/'),
        hasQuery: scriptUrl.includes('?'),
        hasHash: scriptUrl.includes('#'),
    };
    const failureKey = [
        scriptUrlContext.scriptUrlPresent,
        scriptUrlContext.scriptUrlLength,
        scriptUrlShape.hasProtocolSeparator,
        scriptUrlShape.startsWithSlash,
        scriptUrlShape.hasQuery,
        scriptUrlShape.hasHash,
    ].join(':');

    if (
        reportedServiceWorkerScriptLabelFailures.has(failureKey)
        || reportedServiceWorkerScriptLabelFailures.size >= MAX_SERVICE_WORKER_SCRIPT_LABEL_DIAGNOSTICS
    ) {
        return;
    }

    reportedServiceWorkerScriptLabelFailures.add(failureKey);
    logRuntimeFailure('service_worker_script_url_label_parse_failed', error, {
        ...scriptUrlShape,
        fallbackPolicy: 'label_unknown',
    });
}

function logServiceWorkerPublicCleanupReloadStorageFailure(error: unknown): void {
    if (reportedServiceWorkerPublicCleanupReloadStorageFailure) return;
    reportedServiceWorkerPublicCleanupReloadStorageFailure = true;

    logRuntimeFailure('service_worker_public_cleanup_reload_storage_failed', error, {
        hasController: Boolean(navigator.serviceWorker.controller),
        hasSessionStorage: typeof window !== 'undefined' && 'sessionStorage' in window,
        ...getBoundedRuntimeStringContext('reloadKey', PUBLIC_SW_CLEARED_RELOAD_KEY),
        fallbackPolicy: 'reload_without_session_guard',
    });
}

async function unregisterServiceWorker(
    reg: ServiceWorkerRegistration,
    reason: 'clear_without_target' | 'wrong_target',
    targetUrl: string | null,
): Promise<boolean> {
    const activeUrl = getServiceWorkerRegistrationScriptUrl(reg);

    try {
        return await reg.unregister();
    } catch (error) {
        logRuntimeFailure('service_worker_unregister_failed', error, {
            activeWorker: getRegisteredSwLabel(activeUrl),
            hasController: Boolean(navigator.serviceWorker.controller),
            reason,
            targetWorker: getTargetSwLabel(targetUrl),
        });
        return false;
    }
}

async function reconcileServiceWorker(targetUrl: string | null): Promise<void> {
    try {
        const registrations = await navigator.serviceWorker.getRegistrations();

        // Development should never keep a stale worker attached.
        // Production non-PWA routes remove wrong workers, but platform
        // website routes preserve the correct owner worker so visiting
        // menulist.online/ cannot break the installed owner app's
        // offline fallback for the same origin.
        if (process.env.NODE_ENV !== 'production' || !targetUrl) {
            let removedRegistration = false;
            const ownerWorkerUrlToPreserve = process.env.NODE_ENV === 'production'
                && !targetUrl
                && shouldPreserveOwnerWorkerWithoutTarget()
                ? new URL(OWNER_SW_URL, window.location.origin).href
                : null;

            for (const reg of registrations) {
                const activeUrl = getServiceWorkerRegistrationScriptUrl(reg);
                if (ownerWorkerUrlToPreserve && activeUrl === ownerWorkerUrlToPreserve) {
                    continue;
                }

                const removed = await unregisterServiceWorker(reg, 'clear_without_target', targetUrl);
                removedRegistration = removedRegistration || removed;
            }

            if (process.env.NODE_ENV === 'production' && !targetUrl && removedRegistration && navigator.serviceWorker.controller) {
                try {
                    if (!sessionStorage.getItem(PUBLIC_SW_CLEARED_RELOAD_KEY)) {
                        sessionStorage.setItem(PUBLIC_SW_CLEARED_RELOAD_KEY, '1');
                        window.location.reload();
                    }
                } catch (error) {
                    logServiceWorkerPublicCleanupReloadStorageFailure(error);
                    window.location.reload();
                }
            }
            return;
        }

        // Existing registrations store both script and scope as absolute URLs.
        // A same-script worker registered below root does not control the app.
        const absoluteTargetUrl = new URL(targetUrl, window.location.origin).href;
        const absoluteTargetScope = new URL('/', window.location.origin).href;

        // Remove any registration that does not match both target script and
        // root scope. This includes legacy workers and narrowed registrations.
        for (const reg of registrations) {
            if (!isExactServiceWorkerRegistration(reg, absoluteTargetUrl, absoluteTargetScope)) {
                await unregisterServiceWorker(reg, 'wrong_target', targetUrl);
            }
        }

        // Re-check an existing worker on each route reconciliation so a newly
        // deployed worker does not wait for the browser's periodic check.
        const currentRegistration = registrations.find((reg) => (
            isExactServiceWorkerRegistration(reg, absoluteTargetUrl, absoluteTargetScope)
        ));

        if (currentRegistration) {
            await currentRegistration.update();
        } else {
            await navigator.serviceWorker.register(targetUrl, { scope: '/' });
        }
    } catch (error) {
        // Non-fatal: registration failures don't break the page,
        // they just mean the PWA install / offline fallback won't
        // work on this session.
        logRuntimeFailure('service_worker_registration_failed', error, {
            hasController: Boolean(navigator.serviceWorker.controller),
            targetWorker: getTargetSwLabel(targetUrl),
        }, { developmentOnly: true });
    }
}

export default function ServiceWorkerRegister(): null {
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;

        const targetUrl = getTargetSwUrl(pathname ?? '');
        let cancelled = false;
        serviceWorkerReconciliationQueue = serviceWorkerReconciliationQueue.then(async () => {
            if (cancelled) return;
            await reconcileServiceWorker(targetUrl);
        });

        return () => {
            cancelled = true;
        };
    }, [pathname]);

    return null;
}
