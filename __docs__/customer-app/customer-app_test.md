# Customer App — Pre-Production Test & Go-Live Checklist

**Feature Name:** Customer App (Installable Customer-Facing Menu)  
**Document Type:** Release Test Plan / Go-Live Checklist  
**Status:** Pre-production validation checklist; not current launch certification
**Last Updated:** May 2, 2026
**Audience:** Engineering, QA, Founder

> **Launch Boundary:** This checklist is a release-evidence template, not current Customer App launch approval. Current approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:customer-app-pwa`, browser/device Customer App QA, target deploy evidence, and production-host smoke.

---

## Purpose

This document is the **release gate** for the Customer App feature.

It separates:

- what is already verified in the local codebase
- what must still be verified manually before production
- what must be deployed before the feature can be considered stable under the 3-year freeze standard

This document should be checked line-by-line before go-live.

---

## Current Release State

### Implementation Status

**Code implementation is broadly in place.** The main customer-app architecture exists and the previously identified hardening gaps were addressed.

### Hardenings Completed

| Area | Status | Evidence |
| --- | --- | --- |
| Customer App analytics rollups supported in shared aggregation pipeline | ✅ Done | `functions/src/aggregateCustomerAnalytics.ts` |
| Menu-only AI summary logic isolated from `projectId='customerApp'` | ✅ Done | `functions/src/aggregateCustomerAnalytics.ts` |
| Per-origin service worker registration tightened | ✅ Done | `src/components/ServiceWorkerRegister.tsx` |
| Customer menu refresh hardening for state + scroll preservation | ✅ Done | `src/hooks/useMenuFreshness.ts`, `src/components/templates/website/clientWebsite/index.tsx` |
| Offline page warning removed (`themeColor` moved to `viewport`) | ✅ Done | `src/app/offline/page.tsx` |
| Offline copy aligned with frozen “never stale menu offline” policy | ✅ Done | `src/app/offline/page.tsx` |
| Icon upload no longer hard-fails on non-square images | ✅ Done | `src/lib/pwa/iconUploadUtils.ts`, `src/components/templates/main-app/businessSettings/tabs/CustomerAppTab.tsx`, `src/components/mobile/screens/MobileCustomerAppScreen.tsx` |
| Icon flow changed to preview-first (no direct upload on select) | ✅ Done | `src/components/templates/main-app/businessSettings/tabs/CustomerAppTab.tsx`, `src/components/mobile/screens/MobileCustomerAppScreen.tsx` |
| Icon URL input removed from Customer App UI (internal URL no longer exposed) | ✅ Done | `src/components/templates/main-app/businessSettings/tabs/CustomerAppTab.tsx`, `src/components/mobile/screens/MobileCustomerAppScreen.tsx` |
| Mobile More-tab Customer App now supports Save + Reset for all settings including pending icon upload/removal | ✅ Done | `src/components/mobile/screens/MobileCustomerAppScreen.tsx` |
| Customer App browser/status bar color now defaults to white when no accent color is set | ✅ Done | `src/lib/pwa/manifestGenerator.ts`, `src/app/client/[[...slug]]/page.tsx` |
| iOS manual installs now count from first standalone open even without native `appinstalled` support | ✅ Done | `src/lib/pwa/standaloneDetector.ts`, `src/lib/pwa/installTracker.ts`, `src/components/templates/main-app/dashboard/AnalyticsDashboard/CustomerAppMetrics.tsx`, `src/components/mobile/screens/dashboardSections/MobileCustomerAppMetrics.tsx` |
| Customer App install/platform/source breakdowns now roll up into summary docs correctly | ✅ Done | `functions/src/aggregateCustomerAnalytics.ts` |
| Install Conversion now excludes manual iOS standalone installs that did not come through the prompt funnel | ✅ Done | `src/components/templates/main-app/dashboard/AnalyticsDashboard/CustomerAppMetrics.tsx`, `src/components/mobile/screens/dashboardSections/MobileCustomerAppMetrics.tsx` |
| Customer App settings now include an owner-facing install guide on desktop and mobile | ✅ Done | `src/components/templates/main-app/businessSettings/tabs/CustomerAppTab.tsx`, `src/components/mobile/screens/MobileCustomerAppScreen.tsx` |
| Offline fallback page hardened to render a visible full-screen message instead of an ambiguous blank screen | ✅ Done | `src/app/offline/page.tsx` |
| Customer App install identity remains store-level, not project-level, across project switching | ✅ Done | `src/app/manifest.webmanifest/route.ts`, `src/lib/pwa/manifestGenerator.ts`, `src/app/client/[[...slug]]/page.tsx` |
| Mobile Share tab now exposes the Customer App install link using the same link-card pattern as OBP/menu links | ✅ Done | `src/components/mobile/screens/MobileShareScreen.tsx` |
| Desktop Use MenuList screen now exposes the Customer App install link using the same share-card pattern as OBP/menu links | ✅ Done | `src/components/templates/main-app/useMenuList/index.tsx`, `src/components/templates/main-app/useMenuList/types.ts` |
| iPhone launch path no longer mixes owner/customer manifests or conflicting Apple PWA meta tags | ✅ Done | `src/app/layout.tsx`, `src/app/client/layout.tsx` |
| Initial server loader now paints an explicit white surface instead of inheriting an unset background | ✅ Done | `src/app/page.module.css`, `src/app/layout.tsx` |

### Icon Upload Regression Note (Resolved)

**Issue observed during device QA:** upload flow repeatedly showed `App icon must be square`.

**Root cause:** desktop and mobile upload handlers were still enforcing strict square validation.

**Fix applied:** uploads now pass through a shared pre-upload normalizer (`preparePWAIconFile`) that:

- accepts image files (PNG/JPG/WEBP)
- auto-converts to a square PNG app icon canvas
- centers the source image with safe padding
- rejects only truly invalid inputs (non-image, oversize, too-small images)

**Expected behavior now:** non-square logos should upload successfully and be auto-adjusted.

### Theme Color Regression Note (Resolved)

**Issue observed during device QA:** the top mobile browser/app bar could appear black.

**Root cause:** Customer App PWA/runtime theme color fallback still defaulted to `#0f172a` in the manifest path, while page metadata could omit `themeColor` entirely when no store accent color existed.

**Fix applied:** both manifest generation and tenant page metadata now fall back to the shared MenuList platform theme constant (`APP_THEME_COLOR = #0054D0`) when no store accent color is configured.

**Expected behavior now:** when no custom accent color is configured, the mobile top bar should use the MenuList blue fallback instead of black.

### iOS Install KPI Note (Resolved)

**Issue observed during QA review:** iOS Safari does not emit a native `appinstalled` event, so installed-customer KPI risked undercounting manual "Add to Home Screen" installs.

**Root cause:** the previous iOS heuristic only counted an install if the first standalone launch happened within the prompt-history window after our install prompt was shown.

**Fix applied:** iOS now records `CUSTOMER_APP_INSTALLED` on the first standalone launch per device/store even when no prompt history exists. Source tagging distinguishes prompted iOS installs (`ios-inferred`) from manual/direct installs (`ios-standalone`).

**Expected behavior now:** iPhone/iPad installs done via Safari Share → Add to Home Screen should appear in dashboard install KPIs after the first standalone launch.

### KPI Rollup Integrity Note (Resolved)

**Issue found during analytics review:** Customer App event writes already stored `installsByPlatform`, `installsBySource`, and `appOpensByPlatform` on daily analytics docs, but the shared aggregation pipeline was not carrying those maps into weekly/monthly/summary rollups.

**Fix applied:** the customer-app aggregation path now merges those map fields the same additive way as other Customer App KPI maps.

**Expected behavior now:** platform/source KPI breakdowns shown in the owner dashboard should remain accurate after nightly aggregation, not only in raw daily docs.

### Install Conversion Semantics Note (Resolved)

**Issue found during analytics review:** after adding iOS manual-install inference, `Install Conversion` could become inflated because manual standalone installs without prompt history were being counted in the numerator.

**Fix applied:** dashboard conversion now uses prompt-attributable installs and excludes `ios-standalone` manual installs from the prompt funnel metric.

**Expected behavior now:** `Install Conversion` should represent prompt effectiveness, while `iOS manual installs` remains visible as a separate supporting KPI.

### Install Guide Surface Note (Resolved)

**Request:** owners need a quick way to explain manual installation when customers ask, especially on iPhone Safari.

**Fix applied:** Customer App settings now show a dedicated install-help card in both desktop and mobile settings with Android and iPhone steps plus the recommended “share install link” explanation.

**Expected behavior now:** the owner can open Customer App settings and immediately tell a customer how to install on Android or iPhone without guessing the steps.

### Offline Fallback Visibility Note (Hardened)

**Issue observed during QA:** offline launches could appear as a white screen, making it unclear whether the offline fallback page was rendering correctly.

**Fix applied:** the offline route now uses an explicit fixed full-screen shell with high-contrast inline styling and visible explanatory copy.

**Expected behavior now:** when the offline fallback route is served, the customer should see a clear offline message and retry button rather than a blank white screen.

### Project Switching / PWA Identity Note (Confirmed)

**Architecture decision:** Customer App is **one installed app per store**, not one app per project/menu slug.

**Why this is correct:** the client-menu system is store-first and project slugs are internal menu surfaces under the same tenant origin. Creating a separate installed identity per project would break the original client-menu routing model, fragment install KPIs, and confuse customers with multiple apps for one restaurant.

**Confirmed implementation:** the manifest is generated per store at the tenant origin root, `id` remains store-level, `scope` remains `/`, and `start_url` uses the store-level customer entry (`/menu` when a customer menu exists, otherwise `/`) rather than the page where installation started.

**Expected behavior now:**

- Installing from `/` or from any project slug still creates the same store app
- Opening the installed app returns to the store-level customer entry
- Project switching happens inside the installed app via normal client-menu navigation
- Special menu replace/overlay logic still applies because it resolves within the same store/project resolver

### Share Tab Install Link Note (Resolved)

**Decision:** show the Customer App install link in the mobile Share tab when Customer App is enabled for the store.

**Why:** the install link is a distribution asset, same as the official business link and direct menu link. Settings remains the place to configure the app; Share is the place to copy/open/show QR for customer distribution.

**Expected behavior now:** owners can copy, open, or show a QR for the Customer App install link from the mobile Share tab using the same card pattern as the existing OBP/menu links.

### Desktop Use MenuList Install Link Note (Resolved)

**Decision:** show the Customer App install link in the desktop Use MenuList screen when Customer App is enabled for the store.

**Why:** desktop Use MenuList is the owner output center for shareable links and printed/distribution assets. The install link belongs beside the OBP and direct menu links, not hidden only inside settings.

**Expected behavior now:** desktop owners can copy, open, share by WhatsApp, copy a message, and view sharing guidance for the Customer App install link using the same link-card pattern as the existing OBP/menu links.

### iPhone Launch Surface Note (Resolved)

**Issue observed during device QA:** on installed iPhone PWAs, the app could show a blank black screen for several seconds before the menu UI appeared.

**Root cause:** the launch path had conflicting PWA head configuration. The global root layout was injecting the owner-dashboard manifest plus `apple-mobile-web-app-status-bar-style=black-translucent` for every route, while the customer menu route also emitted its own customer-app manifest and Apple metadata. The initial fallback loader also had `background: unset`, which left iOS free to show a dark surface during the handoff.

**Fix applied:** Customer App now uses a single metadata/viewport path on the client-menu route, the global root layout no longer injects cross-route PWA manifest or Apple meta tags, the shared fallback theme color uses `APP_THEME_COLOR`, the first server-rendered loader/body paint an explicit white background, and the broad root `Suspense` wrapper was removed so the customer route can stream its own `MenuSkeleton` immediately instead of being held behind the global logo loader.

**Expected behavior now:** installed iPhone launches should transition directly into a painted surface instead of a black launch gap, with Customer App metadata isolated from the owner-dashboard PWA metadata and the menu skeleton able to appear sooner while route data resolves.

---

## Local Verification Log

These checks were executed in the current workspace on **May 2, 2026**.

| Check | Command | Result | Notes |
| --- | --- | --- | --- |
| Type safety | `npx tsc --noEmit` | ✅ PASS | No type errors |
| ESLint | `npm run lint` | ✅ PASS | No warnings or errors |
| Customer App PWA static preflight | `npm run verify:customer-app-pwa` | ✅ PASS | Manifest identity, manifest link, SW no-cache policy, next-pwa scoping, analytics source-chain contract, dashboard KPI rendering contract, and freshness hook guard |
| Manifest identity guard | `npx ts-node --compiler-options '{"module":"CommonJS"}' -r tsconfig-paths/register src/__tests__/manifestStoreIdentity.ts` | ✅ PASS | Same store identity across OBP, `/menu`, project, and outlet/project paths |
| Production build | `npm run build` | ⬜ Not run in this pass | Run before deployment signoff |

### Build Notes

- Production build was not repeated in the May 2 documentation/static preflight pass. Run `npm run build` before deployment signoff.
- The previous production build completed successfully after allowing network access for external Google Fonts fetches during build.
- The earlier Next.js warning on `/offline` was fixed by moving `themeColor` from `metadata` to `viewport`.

### Static PWA Preflight

Run this before real-device testing:

```bash
npm run verify:customer-app-pwa
```

This script verifies:

- store-level manifest identity is stable across OBP, `/menu`, project, and outlet/project paths
- client metadata links to `/manifest.webmanifest` without `?start=`
- manifest generation no longer uses deleted project paths as installed-app identity
- manifest failure diagnostics use bounded secure logging and do not direct-console raw generation exceptions
- shortcut/open/install tracking diagnostics use bounded secure logging and do not direct-console raw analytics exceptions
- `sw-customer.js` only caches the offline fallback and does not cache menu content
- `next-pwa` is manually registered and not configured with customer-facing runtime cache patterns
- Customer App analytics events are present and routed under `projectId='customerApp'`
- Customer App analytics source-chain contract is guarded from event fields through public analytics preference checks, daily writes, summary aggregation, dashboard-summary generation, scheduler inclusion, dashboard DAL reads, and desktop/mobile KPI cards
- menu freshness uses `router.refresh()` and not polling/listeners

### Real-Device Execution Order

After the static preflight passes, test in this order. Do not start with all checklist rows at once.

1. **Android Chrome:** install from `/`, remove, install from `/menu`, remove, install from one project slug. Confirm each install shows the same app name/icon and launches to the store-level customer entry.
2. **iPhone Safari:** repeat the same `/`, `/menu`, project-slug install sequence through Share -> Add to Home Screen. Confirm no black launch gap, same app identity, and first standalone open records the iOS install KPI.
3. **Samsung Internet:** verify install prompt/fallback behavior and installed launch. Treat browser-specific prompt differences as acceptable if the final installed app identity is correct.
4. **Offline check:** while installed, enable airplane mode and launch. Confirm the offline page appears and no stale menu is shown.
5. **Freshness check:** open the installed app, background it for 60+ seconds, change an item availability from owner side, return to the app, and confirm the item availability refreshes without a full reload.
6. **Analytics check:** verify daily doc, dashboard summary, and dashboard card match for install, app open, and at least one shortcut event. The static source-chain gate proves field wiring only; it does not replace live event-write, rollup, or dashboard-value smoke.

### Real-Device Evidence Log Format

Record one row per device/browser after every PWA-affecting change.

| Date | Build | Store/Origin | Device | Browser | Install From | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  | iPhone | Safari | `/` / `/menu` / project slug | Pass/Fail | App name, icon, launch URL, black-screen observation |
|  |  |  | Android | Chrome | `/` / `/menu` / project slug | Pass/Fail | Prompt behavior, app identity, shortcuts |
|  |  |  | Android | Samsung Internet | `/` / `/menu` / project slug | Pass/Fail | Prompt/fallback behavior, app identity |

Evidence to capture:

- Screenshot of the install prompt or iOS Add to Home Screen screen.
- Screenshot of the installed home-screen icon and label.
- Screenshot of first launch after install.
- DevTools/Application screenshot for customer origin showing only `sw-customer.js` and no menu cache.
- Dashboard screenshot showing install/open analytics after the test action.

---

## Localhost Testing Guide

This feature can be tested **substantially** on localhost, but not **completely**.

The key rule is:

- `localhost:3000` by itself is treated as a **platform** origin
- Customer App behavior is tenant-origin behavior, so the best local simulation uses a **tenant Host header**

### What You Can Reliably Test On Localhost

- Type checking
- Linting
- Production build
- Customer menu rendering
- Dynamic manifest route behavior
- Eligibility gate behavior
- Service worker route serving
- Offline page rendering
- Basic analytics event wiring
- Rollup logic in code
- Owner dashboard metric rendering against local/emulator data

### What You Cannot Fully Trust On Plain Localhost

- Real PWA install behavior
- Real iPhone Safari “Add to Home Screen”
- Real `appinstalled` behavior
- Real standalone launch behavior
- Real OS-level icon/name install results
- Final HTTPS-origin browser install criteria

For those, use a deployed tenant origin or a true local HTTPS tenant-domain setup.

### Local Mode 1 — Fast Developer Checks

Use this for daily implementation work.

1. Start the app:

   `npm run dev`

2. Run static gates:

   `npx tsc --noEmit`

   `npm run lint`

3. Open platform locally:

   [http://localhost:3000](http://localhost:3000)

This is enough for:

- owner settings UI
- dashboard card rendering
- code-path checks
- general component behavior

### Local Mode 2 — Tenant-Origin Simulation With Host Header

This is the most useful local mode for Customer App work.

The middleware and manifest route read the request `Host`, so you can simulate a tenant origin locally.

#### Option A: Browser testing with `/etc/hosts`

Add a hosts entry:

```txt
127.0.0.1 demo.menulist.ai
127.0.0.1 app.menulist.ai
```

Then run:

`npm run dev`

Open:

- `http://demo.menulist.ai:3000/`
- `http://demo.menulist.ai:3000/manifest.webmanifest`
- `http://app.menulist.ai:3000/`

This lets you test:

- tenant routing logic
- customer origin rendering
- manifest generation
- service-worker URL selection logic
- customer-vs-owner origin separation logic

#### Option B: `curl` testing with explicit Host header

Useful when you want to inspect responses without editing `/etc/hosts`.

Examples:

```bash
curl -H "Host: demo.menulist.ai:3000" http://127.0.0.1:3000/manifest.webmanifest
curl -I -H "Host: demo.menulist.ai:3000" http://127.0.0.1:3000/
curl -I -H "Host: demo.menulist.ai:3000" http://127.0.0.1:3000/sw-customer.js
curl -I -H "Host: app.menulist.ai:3000" http://127.0.0.1:3000/sw.js
```

Use this for:

- manifest status checks
- eligibility-gate checks
- service-worker asset checks
- header-level routing sanity checks

### Local Mode 3 — HTTPS Local Testing

If you want to test closer to real browser install rules:

1. Start HTTPS dev mode:

   `npm run devhttps`

2. Visit:

   [https://localhost:3000](https://localhost:3000)

This is useful for:

- general HTTPS behavior
- offline page checks
- some service worker behavior

But there is an important limit:

- `https://localhost:3000` is still **not** a true tenant origin
- `npm run devhttps` gives you HTTPS for `localhost`, not for `demo.menulist.ai`

So it is **not enough** for final Customer App install validation.

### Advanced Local HTTPS Tenant Setup

If you want near-production local testing, set up:

- `/etc/hosts` mapping a tenant hostname to `127.0.0.1`
- a local HTTPS reverse proxy with a trusted cert for that hostname

Example target hostnames:

- `demo.menulist.ai`
- `app.menulist.ai`

Typical tools:

- `mkcert`
- `Caddy`
- `nginx`

This is optional, but it is the only meaningful way to test local HTTPS tenant-origin install behavior without waiting for Vercel.

### Recommended Local Workflow

For speed, use this sequence:

1. Run `npm run dev`
2. Test routing and manifest with `Host` header or `/etc/hosts`
3. Run `npx tsc --noEmit`
4. Run `npm run lint`
5. Run `npm run build`
6. Use deployed tenant origin only for final install/device validation

### Localhost Checklist

- [x] `localhost:3000` works for platform-side checks
- [ ] Icon upload tested with a non-square image (should auto-adjust, not reject)
- [ ] Icon selection shows local preview first (no upload until Save)
- [ ] Icon URL input is hidden after icon workflow update
- [ ] Mobile Save button applies pending icon upload/removal together with settings
- [ ] Mobile Reset button restores unsaved settings/icon changes
- [ ] Tenant-origin simulation tested via `Host` header
- [ ] Tenant-origin simulation tested via `/etc/hosts`
- [ ] Manifest verified locally with tenant host
- [ ] `sw-customer.js` verified locally with tenant host
- [ ] `sw.js` verified locally with owner host
- [ ] Eligibility gate verified locally with tenant host
- [ ] Final install flow verified on real HTTPS tenant origin

---

## Freeze Readiness Summary

### Ready

- Core implementation exists
- Local compile/lint/build gates pass
- Customer App analytics rollups are structurally in place
- Customer vs owner service worker separation is explicitly enforced
- Offline behavior now matches the frozen policy

### Not Yet Ready For Production

The following items are still required before this can clear the 3-year freeze production gate:

1. Real-device install-flow QA
2. Real tenant-origin manifest/icon validation
3. Customer App analytics event smoke testing end-to-end
4. Production deployment of code changes, especially Cloud Functions
5. Eligibility-gate verification on real store states

---

## Mandatory Go-Live Checklist

### A. Build & Static Checks

- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [ ] Review build output for unexpected new warnings
- [ ] Confirm no unrelated regressions were introduced in modified files

### B. Deployment Checklist

- [ ] Deploy web app changes
- [ ] Deploy Cloud Function changes through External Certification Runbook Gate 1 after `npm run verify:functions-deploy-preflight`. Customer App analytics runs inside the shared scheduler and `triggerCustomerAnalyticsManually`; do not use a standalone `aggregateCustomerAnalytics` deploy target unless a future audit adds it to a documented scoped subset.
- [ ] Confirm `public/sw.js` and `public/sw-customer.js` are both present in deployed output
- [ ] Confirm deployed app is serving the latest Customer App code paths

### C. Tenant-Origin PWA Verification

Perform these checks on a real tenant origin such as `https://demo.menulist.ai/` or a verified custom domain.

- [ ] `GET /manifest.webmanifest` returns `200`
- [ ] Manifest is store-specific, not platform-generic
- [ ] `name` matches the restaurant identity
- [ ] `short_name` uses override when configured
- [ ] `id` is stable per store and does not include the current route
- [ ] `start_url` is `/menu` when a customer menu exists, otherwise `/`
- [ ] `scope` is `/`
- [ ] `display` is standalone
- [ ] `display_override` is correct
- [ ] Icon URLs load correctly
- [ ] `apple-touch-icon.png` resolves correctly
- [ ] Ineligible tenant returns manifest `404`

### D. Service Worker Verification

#### Owner Origin

- [ ] On platform origin, only `/sw.js` is registered
- [ ] `/sw-customer.js` is not registered on platform origin

#### Customer Origin

- [ ] On customer tenant origin, only `/sw-customer.js` is registered
- [ ] `/sw.js` is not registered on tenant origin
- [ ] Previously stale `/sw.js` registrations are removed on customer origins
- [ ] Cache Storage contains only the expected offline cache for customer origin
- [ ] No menu HTML or Firestore data is cached on customer origins

#### Cross-Origin Isolation

- [ ] Customer-origin SW remains isolated from owner-origin SW
- [ ] Owner-origin cache never contains customer menu data
- [ ] Customer-origin cache never contains owner dashboard data

### E. Offline Behavior Verification

- [ ] With customer app installed, open while offline
- [ ] Offline page appears instead of stale menu
- [ ] Offline page copy is correct and neutral
- [ ] “Try again” works after reconnect
- [ ] No old menu content is shown while offline

### F. Install Prompt / Install Flow Verification

#### Visit Gating

- [ ] Prompt does not show on first visit
- [ ] Prompt does not show on second visit
- [ ] Prompt can show on third visit
- [ ] Prompt does not show after recent dismissal
- [ ] Prompt can show again after dismissal window expires
- [ ] Prompt never shows when already installed
- [ ] Prompt does not show when owner promotion is disabled

#### Android Chrome

- [ ] Prompt appears at the correct time
- [ ] Install CTA triggers native `beforeinstallprompt`
- [ ] Installed app uses restaurant identity
- [ ] App launches in standalone mode

#### Samsung Internet

- [ ] Install flow behaves correctly
- [ ] Fallback/manual behavior is acceptable if native prompt differs
- [ ] Installed app still launches correctly

#### Safari iPhone

- [ ] iOS instructions modal appears
- [ ] Instructions are clear and correct
- [ ] App can be added through Safari Share menu
- [ ] Installed icon and name appear correctly
- [ ] App opens in standalone mode after install

### G. Freshness / No-Stale-Menu Verification

- [ ] Open menu online
- [ ] Change menu data from owner side
- [ ] Return to customer tab after 60+ seconds hidden
- [ ] Customer menu refreshes to latest data
- [ ] Sold-out / unavailable state is reflected correctly
- [ ] Reconnect after offline state triggers refresh
- [ ] No polling or listener behavior occurs in background

### H. State Preservation Verification

These are mandatory because the feature relies on `router.refresh()` rather than a full reload.

- [ ] Active page remains correct after refresh
- [ ] Active language remains correct after refresh
- [ ] Window scroll position remains correct after refresh
- [ ] Expanded/collapsed category state remains correct after refresh
- [ ] Open item detail modal remains correct after refresh
- [ ] Internal scroll containers remain stable after refresh
- [ ] Device-type view remains stable after refresh
- [ ] Any cart/selection state remains correct if applicable

### I. Eligibility-Gate Verification

#### Eligible Store

- [ ] `active: true` + published menu → Customer App available

#### Ineligible States

- [ ] `active: false` → manifest `404`, no prompt
- [ ] Unpublished menu → manifest `404`, no prompt
- [ ] Invalid public origin case → Customer App unavailable
- [ ] Owner settings reflect disabled/ineligible state clearly

### J. Analytics Event Verification

Verify event writes and dashboard visibility for `projectId='customerApp'`.

- [ ] `CUSTOMER_APP_PROMPT_SHOWN` writes correctly
- [ ] `CUSTOMER_APP_PROMPT_DISMISSED` writes correctly
- [ ] `CUSTOMER_APP_INSTALL_STARTED` writes correctly
- [ ] `CUSTOMER_APP_INSTALLED` writes correctly
- [ ] `CUSTOMER_APP_OPENED` writes correctly
- [ ] `CUSTOMER_APP_SHORTCUT_MENU` writes correctly
- [ ] `CUSTOMER_APP_SHORTCUT_CALL` writes correctly
- [ ] `CUSTOMER_APP_SHORTCUT_DIRECTIONS` writes correctly
- [ ] `CUSTOMER_APP_SHORTCUT_WHATSAPP` writes correctly when WhatsApp shortcut exists
- [ ] `CUSTOMER_APP_SHORTCUT_RESERVATION` writes correctly when reservation shortcut exists
- [ ] `CUSTOMER_APP_SHORTCUT_ORDER` writes correctly when order shortcut exists
- [ ] Reinstall on same device does not double-count when local storage is intact
- [ ] Owner analytics dashboard shows installs
- [ ] Owner analytics dashboard shows app opens
- [ ] Owner analytics dashboard shows conversion
- [ ] Owner analytics dashboard shows top shortcut
- [ ] Owner analytics dashboard shows install platform breakdown
- [ ] Owner analytics dashboard shows iOS manual installs when applicable

### K. Aggregation / Rollup Verification

- [ ] Daily analytics doc written under `projectId='customerApp'`
- [ ] Summary doc updated correctly
- [ ] Weekly rollup contains Customer App fields
- [ ] Monthly rollup contains Customer App fields
- [ ] Summary increments lifetime install/open fields correctly
- [ ] Menu-only Gemini summary logic does not interfere with `customerApp`

### L. KPI Production Signoff

This is the final analytics truth table. Each KPI clears production analytics signoff only when all three layers pass:

- event capture
- rollup / summary aggregation
- dashboard rendering

#### Installed Customers

- [ ] Android install increments `totalInstalled`
- [ ] Android install increments `uniqueInstallSessions`
- [ ] iOS first standalone launch increments install KPI once per device/store
- [ ] Reopen after install does not increase Installed Customers again
- [ ] Summary doc shows `lifetimeUniqueInstalls`
- [ ] Dashboard Installed Customers matches summary

#### App Opens (30 Days)

- [ ] Standalone launch writes `CUSTOMER_APP_OPENED`
- [ ] Browser-tab menu visit does not write `CUSTOMER_APP_OPENED`
- [ ] Re-navigation inside the same standalone session does not overcount opens
- [ ] Daily docs contain `totalAppOpens`
- [ ] 30-day dashboard App Opens matches summed daily docs for selected range

#### Installs (30 Days)

- [ ] Install events appear in daily docs for the correct date
- [ ] 30-day dashboard Installs matches summed daily `totalInstalled`
- [ ] iOS manual installs appear after first home-screen open, not before

#### Install Conversion

- [ ] `CUSTOMER_APP_PROMPT_SHOWN` increments when prompt is actually visible
- [ ] `CUSTOMER_APP_INSTALL_STARTED` increments when install CTA is tapped
- [ ] Prompt-based installs affect conversion numerator correctly
- [ ] Manual iOS `ios-standalone` installs do not inflate prompt conversion
- [ ] Dashboard Conversion matches prompt-attributable installs divided by prompt shown

#### Shortcuts

- [ ] View Menu shortcut increments `shortcutClicks.menu`
- [ ] Call shortcut increments `shortcutClicks.call`
- [ ] Directions shortcut increments `shortcutClicks.directions`
- [ ] WhatsApp shortcut increments `shortcutClicks.whatsapp` when enabled
- [ ] Reservation shortcut increments `shortcutClicks.reservation` when enabled
- [ ] Order shortcut increments `shortcutClicks.order` when enabled
- [ ] Summary doc preserves shortcut breakdown after nightly aggregation
- [ ] Dashboard Top Shortcut matches highest shortcut count
- [ ] Dashboard Total Shortcut Uses equals sum of all shortcut buckets

#### Install Breakdown

- [ ] Install events write `installsByPlatform`
- [ ] Install events write `installsBySource`
- [ ] Summary doc preserves `installsByPlatform`
- [ ] Summary doc preserves `installsBySource`
- [ ] Dashboard Installs by platform matches summary counts
- [ ] Dashboard iOS manual installs equals `ios-inferred + ios-standalone`

#### App Open Breakdown

- [ ] Standalone app opens write `appOpensByPlatform`
- [ ] Summary doc preserves `appOpensByPlatform`
- [ ] Platform open breakdown remains correct after nightly aggregation

### M. KPI Test Method

Use this sequence for each KPI verification pass:

1. Trigger the customer action on a real device or localhost tenant simulation.
2. Confirm the daily analytics doc under `projectId='customerApp'` changed as expected.
3. Confirm the relevant summary fields changed after aggregation or via existing summary path.
4. Confirm the owner dashboard card shows the same number.
5. Record platform, browser, store, date, and whether the origin was localhost or deployed.

### N. Production Analytics Signoff Rule

Analytics clears production signoff only if all are true:

- [ ] Android native install flow verified end to end
- [ ] iOS manual install flow verified end to end
- [ ] At least one shortcut launch verified end to end
- [ ] Daily doc, summary doc, and dashboard numbers match for installs
- [ ] Daily doc, summary doc, and dashboard numbers match for app opens
- [ ] Conversion metric validated against prompt-attributable installs
- [ ] Nightly aggregation verified not to drop platform/source breakdown fields
- [ ] No duplicate install counting on reinstall with intact storage

---

## Recommended Test Data Setup

Before executing the checklist, prepare:

1. One eligible demo store with:
   - published menu
   - active status
   - logo uploaded
   - phone and address present
2. One ineligible demo store with:
   - unpublished menu or inactive status
3. One tenant subdomain
4. One verified custom domain, if available
5. One Android Chrome device
6. One Samsung Internet device
7. One iPhone with Safari

---

## Known Non-Issues / Accepted Behaviors

These are not bugs and should not block release:

- Existing installs may keep the old icon after a merchant logo change
- Existing installs may keep the old app name after a merchant rename
- iOS install detection relies partly on inferred install behavior because Safari does not emit `appinstalled`
- Customer App does **not** support offline menu browsing by design

---

## Go-Live Decision Rule

### Ship Only If All Are True

- local compile, lint, and build checks pass
- no unresolved production warnings remain in Customer App paths
- Cloud Function deployment is completed
- tenant-origin manifest and icon checks pass
- Android, Samsung Internet, and iPhone install flows pass
- offline fallback passes
- analytics event writes and dashboard visibility pass
- eligibility gate passes
- freshness/state-preservation checks pass

### Do Not Ship If Any Are True

- service worker scope is ambiguous
- menu content is cached on customer origin
- manifest is platform-generic or path-scoped
- installed app shows stale menu offline
- analytics writes happen but rollups/dashboard stay wrong
- tenant eligibility can leak Customer App to inactive/unpublished stores

---

## Signoff

| Area | Owner | Status | Date | Notes |
| --- | --- | --- | --- | --- |
| Local code verification | Engineering | ✅ Ready | 2026-04-18 | `tsc`, `lint`, `build` passed |
| Tenant-origin PWA verification | QA / Engineering | ⬜ Pending |  |  |
| Device install verification | QA | ⬜ Pending |  |  |
| Analytics verification | Engineering / QA | ⬜ Pending |  |  |
| Deployment verification | Engineering | ⬜ Pending |  |  |
| Go-live approval | Founder / Product | ⬜ Pending |  |  |

---

## Related Documents

| Document | Purpose |
| --- | --- |
| `customer-app_spec.md` | Product requirements |
| `customer-app_impl.md` | Technical implementation blueprint |
| `customer-app_firebase.md` | Firebase cost / storage / function model |
| `customer-app_mobile-support.md` | Mobile scope and install prompt behavior |
| `customer-app_helpdoc.md` | Owner-facing help content |
| `customer-app_website.md` | Public site copy |

---

_Document Status: 🚧 PRE-PRODUCTION VALIDATION REQUIRED_  
_Last Updated: April 18, 2026_
