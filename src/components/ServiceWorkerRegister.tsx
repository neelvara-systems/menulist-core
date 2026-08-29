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
 *   2. Customer App PWA      → tenant origins ({subdomain}.menulist.online,
 *                              {subdomain}.menulist.digital, verified custom domains)
 *      Registers `/sw-customer.js` (hand-rolled, minimal, no caching).
 *
 *   3. MyCodex PWA           → `/__mycodex/` on the owner-app origin.
 *      Registers `/mycodex-sw.js` at the narrower `/__mycodex/` scope.
 *
 *   4. Answerlattice PWA     → Answerlattice product origins.
 *      Registers `/answerlattice-sw.js` (network-first, branded offline shell).
 *
 * Registration is conditional on the current origin's tenant type, which
 * is derived client-side from `window.location.host` via the same
 * `resolveDomain` utility the middleware uses. This keeps all product SW
 * scopes strictly separated — a customer origin NEVER registers the
 * owner or internal-product workers, and vice versa.
 *
 * Migration safety: If the browser has a stale registration pointing to
 * a different script URL (e.g. a customer who previously had `sw.js`
 * from the old auto-register config), we unregister it before installing
 * the correct one. `skipWaiting` + immediate client claiming ensure the
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
const ANSWERLATTICE_SW_URL = '/answerlattice-sw.js';
const ROOT_SW_SCOPE = '/';
const MYCODEX_OWNER_SCOPE = '/__mycodex/';
const ANSWERLATTICE_PLATFORM_SCOPE = '/answerlattice/';
const PUBLIC_SW_CLEARED_RELOAD_KEY = '__menulist_public_sw_cleared__';
const MAX_SERVICE_WORKER_SCRIPT_LABEL_DIAGNOSTICS = 6;
let reportedServiceWorkerDomainResolutionFailure = false;
let reportedServiceWorkerPublicCleanupReloadStorageFailure = false;
const reportedServiceWorkerScriptLabelFailures = new Set<string>();
let serviceWorkerReconciliationQueue: Promise<void> = Promise.resolve();

type ServiceWorkerTarget = {
    label: 'owner' | 'customer' | 'mycodex' | 'answerlattice';
    scope: string;
    url: string;
};

const OWNER_SW_TARGET: ServiceWorkerTarget = {
    label: 'owner',
    scope: ROOT_SW_SCOPE,
    url: OWNER_SW_URL,
};
const CUSTOMER_SW_TARGET: ServiceWorkerTarget = {
    label: 'customer',
    scope: ROOT_SW_SCOPE,
    url: CUSTOMER_SW_URL,
};
const MYCODEX_ROOT_SW_TARGET: ServiceWorkerTarget = {
    label: 'mycodex',
    scope: ROOT_SW_SCOPE,
    url: MYCODEX_SW_URL,
};
const MYCODEX_OWNER_SW_TARGET: ServiceWorkerTarget = {
    label: 'mycodex',
    scope: MYCODEX_OWNER_SCOPE,
    url: MYCODEX_SW_URL,
};
const ANSWERLATTICE_SW_TARGET: ServiceWorkerTarget = {
    label: 'answerlattice',
    scope: ROOT_SW_SCOPE,
    url: ANSWERLATTICE_SW_URL,
};
const ANSWERLATTICE_PLATFORM_SW_TARGET: ServiceWorkerTarget = {
    label: 'answerlattice',
    scope: ANSWERLATTICE_PLATFORM_SCOPE,
    url: ANSWERLATTICE_SW_URL,
};
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

function isServiceWorkerRuntimeEnabled(): boolean {
    const deploymentStage = resolveDeploymentStage();
    return process.env.NODE_ENV === 'production'
        && deploymentStage.valid;
}

function isMyCodexOwnerPath(pathname: string): boolean {
    return pathname === '/__mycodex' || pathname.startsWith('/__mycodex/');
}

function isAnswerlatticePlatformPath(pathname: string): boolean {
    return pathname === '/answerlattice' || pathname.startsWith('/answerlattice/');
}

function getAllowedSwTargets(): ServiceWorkerTarget[] {
    const resolved = getResolvedDomain();
    if (!resolved || !isServiceWorkerRuntimeEnabled()) return [];

    if (resolved.type === 'subdomain' || resolved.type === 'custom') {
        return [CUSTOMER_SW_TARGET];
    }

    if (resolved.type === 'product' && resolved.productSite?.id === 'mycodex') {
        return [MYCODEX_ROOT_SW_TARGET];
    }

    if (resolved.type === 'product' && resolved.productSite?.id === 'answerlattice') {
        return [ANSWERLATTICE_SW_TARGET];
    }

    if (resolved.type === 'platform') {
        return [OWNER_SW_TARGET, MYCODEX_OWNER_SW_TARGET, ANSWERLATTICE_PLATFORM_SW_TARGET];
    }

    return [];
}

function getTargetSw(pathname: string): ServiceWorkerTarget | null {
    if (typeof window === 'undefined') return null;

    const resolved = getResolvedDomain();
    if (!resolved) {
        // Unknown origin → register nothing. Safer than attaching either
        // worker to the wrong scope.
        return null;
    }

    // Customer tenants (subdomain or custom domain) → minimal SW.
    if (resolved.type === 'subdomain' || resolved.type === 'custom') {
        return isServiceWorkerRuntimeEnabled() ? CUSTOMER_SW_TARGET : null;
    }

    // Dedicated private docs product host.
    if (resolved.type === 'product' && resolved.productSite?.id === 'mycodex') {
        return isServiceWorkerRuntimeEnabled() ? MYCODEX_ROOT_SW_TARGET : null;
    }

    if (resolved.type === 'product' && resolved.productSite?.id === 'answerlattice') {
        return isServiceWorkerRuntimeEnabled() ? ANSWERLATTICE_SW_TARGET : null;
    }

    // Platform origins serve both the public marketing website and the
    // owner app. Normal website routes should not install Workbox, but an
    // already-installed standalone owner app must be able to repair/register
    // its worker even when iOS launches it at the origin root.
    if (resolved.type === 'platform') {
        if (!isServiceWorkerRuntimeEnabled()) return null;
        if (isMyCodexOwnerPath(pathname)) return MYCODEX_OWNER_SW_TARGET;
        if (isAnswerlatticePlatformPath(pathname)) return ANSWERLATTICE_PLATFORM_SW_TARGET;
        return isOwnerAppPath(pathname) || isStandaloneDisplayMode()
            ? OWNER_SW_TARGET
            : null;
    }

    // Other product sites and localhost should not register a worker.
    return null;
}

function getTargetSwLabel(target: ServiceWorkerTarget | null): string {
    return target?.label || 'none';
}

function getRegisteredSwLabel(scriptUrl: string | undefined): string {
    if (!scriptUrl) return 'none';

    try {
        const pathname = new URL(scriptUrl).pathname;
        if (pathname === OWNER_SW_URL || pathname === LEGACY_OWNER_SW_URL) return 'owner';
        if (pathname === CUSTOMER_SW_URL) return 'customer';
        if (pathname === MYCODEX_SW_URL) return 'mycodex';
        if (pathname === ANSWERLATTICE_SW_URL) return 'answerlattice';
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
    target: ServiceWorkerTarget | null,
): Promise<boolean> {
    const activeUrl = getServiceWorkerRegistrationScriptUrl(reg);

    try {
        return await reg.unregister();
    } catch (error) {
        logRuntimeFailure('service_worker_unregister_failed', error, {
            activeWorker: getRegisteredSwLabel(activeUrl),
            hasController: Boolean(navigator.serviceWorker.controller),
            reason,
            targetWorker: getTargetSwLabel(target),
        });
        return false;
    }
}

function getAbsoluteSwIdentity(target: ServiceWorkerTarget): { scope: string; url: string } {
    return {
        scope: new URL(target.scope, window.location.origin).href,
        url: new URL(target.url, window.location.origin).href,
    };
}

function matchesTarget(registration: ServiceWorkerRegistration, target: ServiceWorkerTarget): boolean {
    const identity = getAbsoluteSwIdentity(target);
    return isExactServiceWorkerRegistration(registration, identity.url, identity.scope);
}

async function reconcileServiceWorker(
    target: ServiceWorkerTarget | null,
    allowedTargets: ServiceWorkerTarget[],
): Promise<void> {
    try {
        const registrations = await navigator.serviceWorker.getRegistrations();

        // Development should never keep a stale worker attached.
        // Production non-PWA routes remove wrong workers, but platform
        // website routes preserve the correct owner worker so visiting
        // menulist.ai/ cannot break the installed owner app's
        // offline fallback for the same origin.
        if (process.env.NODE_ENV !== 'production') {
            for (const reg of registrations) {
                await unregisterServiceWorker(reg, 'clear_without_target', target);
            }
            return;
        }

        // Keep only the exact workers allowed on this origin. This permits the
        // root MenuList owner worker and the narrower MyCodex worker to coexist.
        let removedRegistration = false;
        for (const reg of registrations) {
            if (!allowedTargets.some((allowedTarget) => matchesTarget(reg, allowedTarget))) {
                const removed = await unregisterServiceWorker(reg, target ? 'wrong_target' : 'clear_without_target', target);
                removedRegistration = removedRegistration || removed;
            }
        }

        if (!target) {
            if (removedRegistration && navigator.serviceWorker.controller) {
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

        // Re-check an existing worker on each route reconciliation so a newly
        // deployed worker does not wait for the browser's periodic check.
        const currentRegistration = registrations.find((reg) => (
            matchesTarget(reg, target)
        ));

        if (currentRegistration) {
            await currentRegistration.update();
        } else {
            await navigator.serviceWorker.register(target.url, {
                scope: target.scope,
                updateViaCache: 'none',
            });
        }
    } catch (error) {
        // Non-fatal: registration failures don't break the page,
        // they just mean the PWA install / offline fallback won't
        // work on this session.
        logRuntimeFailure('service_worker_registration_failed', error, {
            hasController: Boolean(navigator.serviceWorker.controller),
            targetWorker: getTargetSwLabel(target),
        }, { developmentOnly: true });
    }
}

export default function ServiceWorkerRegister(): null {
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;

        const target = getTargetSw(pathname ?? '');
        const allowedTargets = getAllowedSwTargets();
        let cancelled = false;
        serviceWorkerReconciliationQueue = serviceWorkerReconciliationQueue.then(async () => {
            if (cancelled) return;
            await reconcileServiceWorker(target, allowedTargets);
        });

        return () => {
            cancelled = true;
        };
    }, [pathname]);

    return null;
}
