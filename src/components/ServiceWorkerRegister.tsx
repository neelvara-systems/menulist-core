'use client';

/**
 * Service Worker Registration (Per-Tenant)
 * ═══════════════════════════════════════════════════════════════
 *
 * MenuList runs TWO PWAs from one Next.js build:
 *
 *   1. Owner Dashboard PWA   → platform origins (menulist.ai, app.menulist.ai)
 *      Registers `/sw.js` (next-pwa generated, Workbox, runtime caching).
 *
 *   2. Customer App PWA      → tenant origins ({subdomain}.menulist.ai,
 *                              verified custom domains)
 *      Registers `/sw-customer.js` (hand-rolled, minimal, no caching).
 *
 * Registration is conditional on the current origin's tenant type, which
 * is derived client-side from `window.location.host` via the same
 * `resolveDomain` utility the middleware uses. This keeps the two SW
 * scopes strictly separated — a customer origin NEVER registers the
 * Workbox-based `sw.js`, and vice versa.
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
import { useEffect } from 'react';

const OWNER_SW_URL = '/sw.js';
const CUSTOMER_SW_URL = '/sw-customer.js';

function getTargetSwUrl(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const resolved = resolveDomain(window.location.host);
        // Customer tenants (subdomain or custom domain) → minimal SW.
        if (resolved.type === 'subdomain' || resolved.type === 'custom') {
            return CUSTOMER_SW_URL;
        }
        // Platform / owner dashboard origins → next-pwa SW.
        if (resolved.type === 'platform') {
            return OWNER_SW_URL;
        }
        // Product sites and localhost should not register either worker.
        return null;
    } catch {
        // Unknown origin → register nothing. Safer than attaching either
        // worker to the wrong scope.
        return null;
    }
}

export default function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;

        const targetUrl = getTargetSwUrl();

        (async () => {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();

                // Development and non-PWA origins should never keep a stale
                // worker attached. If one exists, unregister it so localhost
                // does not keep routing requests through old Workbox logic.
                if (process.env.NODE_ENV !== 'production' || !targetUrl) {
                    for (const reg of registrations) {
                        await reg.unregister().catch(() => { });
                    }
                    return;
                }

                // Resolve the target URL to an absolute form for comparison against
                // existing registrations (which store `active.scriptURL` as absolute).
                const absoluteTargetUrl = new URL(targetUrl, window.location.origin).href;

                // Unregister any existing SW that doesn't match the target
                // script. This handles migration from the legacy auto-register
                // setup where customer tenants may have `sw.js` registered.
                for (const reg of registrations) {
                    const activeUrl = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL;
                    if (activeUrl && activeUrl !== absoluteTargetUrl) {
                        await reg.unregister().catch(() => { });
                    }
                }

                // If the correct SW is already registered, nothing to do.
                const alreadyRegistered = registrations.some((reg) => {
                    const activeUrl = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL;
                    return activeUrl === absoluteTargetUrl;
                });

                if (!alreadyRegistered) {
                    await navigator.serviceWorker.register(targetUrl, { scope: '/' });
                }
            } catch (error) {
                // Non-fatal: registration failures don't break the page,
                // they just mean the PWA install / offline fallback won't
                // work on this session.
                if (process.env.NODE_ENV !== 'production') {
                    // eslint-disable-next-line no-console
                    console.warn('[SW] Registration failed:', error);
                }
            }
        })();
    }, []);

    return null;
}
