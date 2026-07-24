# Next.js Runtime Migration — Mobile and PWA Support

**Status:** LOCALLY IMPLEMENTED — device certification pending deployment
**Mobile impact:** High regression risk, no new mobile feature
**Primary surfaces:** MenuList owner MobileShell, public customer menu/PWA, MyCodex PWA, product public layouts

## 1. Admission decision

This work is admitted because it removes an unsupported shared runtime and an obsolete PWA build dependency. It does not add an owner decision, setting, tab, route, or task.

The mobile implementation remains a layer over shared auth, DAL, localization, settings, Redux, routing, and cache logic. No desktop feature is redesigned for this migration.

## 2. Mobile risks

| Risk | Cause | Required control |
|---|---|---|
| Shell hydration/state loss | React 19 and React Redux 9 | Authenticated MobileShell navigation and Redux Persist checks |
| Wrong back/navigation behavior | Next 16 routing/prefetch changes | Tab/sub-screen/deep-link/browser-back matrix |
| Locale/timezone drift | next-intl 4 and async layouts | Mobile locale, RTL, date/time and settings checks |
| Broken sheets/forms | React/ref/type changes | Keyboard, focus, scroll, submit/cancel, validation checks |
| Animation/input regression | Motion 12 pointer/layout behavior | Tap, drag, exit, reduced-motion, old/mobile Safari checks |
| Stale public menu | cache API semantic migration | First-read-after-publish test from mobile customer surface |
| Wrong worker | PWA integration replacement | Host/scope/registration negative matrix |
| Persistent old cache | Workbox-to-Serwist upgrade | Cache cleanup and controller takeover test |
| Accidental customer menu caching | broad default PWA cache rules | Explicit deny and Cache Storage inspection |
| Image staleness | Next 16 image TTL change | Preserve 60-second TTL initially and test owner image replacement |

## 3. Existing architecture that must remain

- Owner screens reached from Today, Menu, Share, or More stay inside `MobileShell` sub-screen state.
- Direct routes map into shell state only where current deep-link behavior requires it.
- Auth, active store, locale, timezone, RTL, settings, and Redux remain shared with desktop.
- Mobile UI remains Tailwind-driven with the existing mobile component boundary; the migration does not add a UI library.
- Touch targets remain at least 44x44px.
- Optimistic update behavior remains unchanged; public cache invalidation is still server/public truth authority.

## 4. Service-worker architecture

### 4.1 Owner worker

The generated owner `sw.js` moves from `next-pwa`/Workbox configuration to reviewed Serwist source. It may provide approved owner shell/offline/static/image caching only.

It must exclude:

- customer menu and OBP HTML/data,
- `/_client/*`, `/client/*`, and public menu API responses,
- auth/session responses,
- tenant-scoped protected APIs,
- Firestore API traffic,
- mutation responses,
- any response that could expose another tenant after account/store switch.

### 4.2 Customer worker

`sw-customer.js` stays first-party and continues to provide install/offline reliability without caching menu content. Its registration must remain exclusive to customer tenant/custom-domain hosts.

The test must sever the network after a controlled online visit and inspect Cache Storage to confirm no menu content is available offline.

### 4.3 MyCodex worker

`mycodex-sw.js` remains the private MyCodex shell worker and must not control MenuList, customer, Answerlattice, CampaignCue, or SignalDesk origins.

### 4.4 Upgrade behavior

The migration must define old Workbox cache names and remove only obsolete owner caches during activation. It must not delete customer/MyCodex caches by broad prefix matching.

Test all of:

1. Fresh install with no prior service worker.
2. Replace the former `next-pwa` worker with the bounded Serwist worker.
3. Two open tabs during worker update.
4. Offline during update.
5. Account logout and store switch after update.
6. Manual unregister/cache clear recovery.

## 5. Required mobile journeys

### Owner 390x844 minimum matrix

- Sign in and session bootstrap.
- Today, Menu, Share, More tab transitions.
- MobileShell nested screen open/back behavior.
- Menu upload, item/category edit, publish, and immediate public read.
- Working hours/business info save.
- Locale/timezone change.
- Billing/transactions render.
- PWA install prompt/standalone detection.
- Online-to-offline fallback and recovery.
- Logout and a different tenant/store login without stale state.

### Customer matrix

- Tenant menu first load on normal and slow network.
- OBP and manifest.
- Install and standalone launch.
- Publish while customer app is open, then refresh/navigate to prove fresh truth.
- Offline fallback with no cached menu content.
- Return online without stale worker response.
- Custom domain and subdomain host isolation.

### Device/browser matrix

- iPhone Safari browser and installed PWA.
- Android Chrome browser and installed PWA.
- Desktop Chrome responsive mode is useful but does not replace physical-device evidence.
- Safari/Firefox desktop route smoke for React/hydration differences.

## 6. Accessibility acceptance

- Keyboard focus remains visible and ordered.
- Sheets/modals trap and restore focus correctly.
- Inputs remain usable with mobile keyboards and zoom.
- Reduced-motion preference suppresses non-essential motion.
- No new horizontal overflow, clipped fixed navigation, or safe-area collision.
- Screen-reader labels and live feedback remain available on publish/save/error actions.

## 7. Completion boundary

Local source/build/browser evidence can complete the code-side migration but not physical-device launch certification. The final validation must label iOS/Android/standalone evidence as passed or externally pending. It must never convert desktop responsive emulation into a real-device pass.
