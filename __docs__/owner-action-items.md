# Owner Action Items — Manual Tasks Tracker

**Purpose:** Centralized tracker for ALL manual tasks the founder must do across every feature. Updated automatically by Cascade after every implementation session, production audit, or feature review.

**Rule:** This is the SINGLE SOURCE OF TRUTH for "what Danny needs to do manually." Cascade appends here after every session. Danny checks off items when done.

**Launch boundary:** Not current launch certification or deploy approval. This tracker lists owner/manual tasks; production readiness still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, provider/browser/device QA, and production-host smoke.

---

## How This File Works

1. **Cascade adds items** after every production audit, implementation session, or feature review
2. **Each item has:** Feature name, what to do, why, priority, status
3. **Danny marks items done** by changing `⬜` to `✅`
4. **Cascade never removes items** — completed items stay as history (move to Completed section)

---

## Active Items

### Vercel Turbopack Build Memory And Runtime Trace — July 25, 2026

| # | Task | Why | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | Push the runtime-trace correction after `887f76ad`, redeploy staging with `VERCEL_BUILD_SYSTEM_REPORT=1`, then confirm `menulist.digital`, `app.menulist.digital/signin`, `/privacy-policy`, and the MenuList, Answerlattice, CampaignCue, SignalDesk, and MyCodex entry routes return their intended pages | `887f76ad` built but its deployed Next routes return 500 because `@swc/helpers` was excluded from the packaged route. The corrected exact build and isolated deployment-bundle gate pass locally, but the broken deployment remains live until this source is redeployed. Codex did not push or redeploy. | P0 (restore staging now) | ⬜ |
| 2 | If the corrected cold Vercel build still records an OOM, enable an Elastic/Enhanced build machine for the project before changing application behavior or weakening type/lint gates | The remaining fallback is build capacity, not a product-runtime migration; Vercel documents 16 GiB enhanced/elastic capacity for memory-intensive builds. | P0 only if OOM repeats | ⬜ |

### Business Truth Contract And Maps Activation Gates — July 22, 2026

Complete these in order. Do not expose grounded Place-ID confirmation UI merely
because the provider callable begins responding.

| # | Task | Why | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | Include the July 22 OBP truthful-update and Maps confirmation-admission app changes in the next approved QA Vercel release, then smoke one recent and one older `modifiedOn` value in English, Hindi, and one RTL locale at phone/tablet/desktop widths | Source/type/localization gates cannot prove deployed SSR output, timezone/date formatting, RTL layout, CDN cache state, or device rendering. Codex did not run a Vercel build or deploy. | P0 (before QA sign-off) | ⬜ |
| 2 | From an isolated reviewed Functions source with authorized Firebase CLI access, run `npm run verify:functions-deploy-preflight` and then `firebase deploy --project menulist-qa --config firebase.json --only functions:mapsPlaceCheck --non-interactive` | The existing flag-off callable is still not current in QA. The shared worktree contains unrelated Functions changes and must not be deployed as a mixed bundle. | P0 (before provider smoke) | ⬜ |
| 3 | After task 2, run a real owner/admin provider smoke against a small controlled business set; retain source attribution, result shape, provider cost/search count, no-write evidence, SAFE_MODE behavior, limiter behavior, and false-match notes | Local source checks cannot prove the pinned provider path, live grounding metadata, current provider terms, attribution rendering, target secrets, or billing. Keep the feature flag off after smoke. | P0 (before any activation decision) | ⬜ |
| 4 | Before any grounded Place-ID confirmation UI is approved, design and verify a server-authoritative collision policy for the same provider location ID appearing on multiple MenuList stores; it must fail closed, be reviewable/reversible, preserve exact outlets, and include Firebase cost/rule/index/deploy evidence | The current embedded binding intentionally has no global uniqueness claim. Enabling confirmation UI without this gate could let two MenuList locations claim the same provider entity. | P0 (before confirmation UI) | ⬜ |
| 5 | Only after tasks 2-4, decide whether a zero-write 5-10 business Agent Truth Audit is useful; do not create an owner score, automatic repair, saved provider-response history, or public MCP during the pilot | The strategy direction is useful research, but provider accuracy, repeatability, terms, attribution, cost, and false-positive behavior are not yet certified. | P1 (research gate) | ⬜ |

### Cross-System Features 42-50 — July 17, 2026

| # | Task | Why | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | Isolate the reviewed MenuList Functions/index changes, then with authorized IAM run `env -u GOOGLE_APPLICATION_CREDENTIALS firebase deploy --project menulist-qa --config firebase.json --only firestore:indexes,functions:computeDecisionBlocksScores --non-interactive` | Feature 50's UTC-day platform-task lease and deduplicated MenuList index source are locally complete but are not active in QA. The current shared worktree contains multiple reviewed changes, so it was not deployed as one mixed bundle. | P0 (before Firebase scale QA) | ⬜ |
| 2 | Isolate the reviewed Answerlattice index changes, then with authorized IAM run `env -u GOOGLE_APPLICATION_CREDENTIALS firebase deploy --project answerlattice-qa --config firebase-answerlattice.json --only firestore:indexes --non-interactive` | The source manifest removes an exact duplicate while retaining the query shape. Existing Help Center index exemptions in the same dirty manifest also remain undeployed after the earlier HTTP 403. | P0 (before Answerlattice scale QA) | ⬜ |
| 3 | Include source-complete features 42-48 in the approved QA app release, then run authenticated desktop, MobileShell, iOS/Android PWA and public-output smoke for locale/RTL/time formatting, accessibility, PWA update/offline recovery, configuration gates, failure recovery, logout/account cleanup, staff ownership wording and dormant behavior | Local source/type/verifier gates cannot prove a deployed host, browser focus/zoom/screen-reader behavior, installed-PWA lifecycle, real sessions, legal/support execution, or device-specific rendering. | P0 (before cross-system QA sign-off) | ⬜ |
| 4 | After task 1, observe one complete UTC day of `computeDecisionBlocksScores` QA logs and state: one completed daily lease, later `daily_cadence` skips, every due-store cohort processed, Special Menu recovery retained per cohort, and failed-attempt retry behavior | This proves the scale optimization did not suppress store-local work or duplicate global work under real scheduler timing. | P0 (before production scheduler release) | ⬜ |
| 5 | Compare Cloud Billing export and the platform cost-posture read model over equivalent pre/post traffic windows, then approve production only if Firebase operation growth and error/alert volume are stable | Source gates prove operation shape, not real traffic distribution, provider latency, billing export lag, or production cost. | P1 (before production cost certification) | ⬜ |

### Feature 15-30 Firebase Cost And Scale Audit — July 17, 2026

| # | Task | Why | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | With Firebase IAM that can deploy indexes to `menulist-qa`, rerun `env -u GOOGLE_APPLICATION_CREDENTIALS firebase deploy --only firestore:indexes --project menulist-qa --config firebase.json --non-interactive` | The July 17 current-worktree attempt loaded the validated MenuList index configuration, then the Firebase Rules test endpoint returned HTTP 403 `The caller does not have permission` before upload. This deploy carries the scoped cost exemptions and required reseller/report-lead composites from items 15-25 and 27-30. | P0 (before QA cost/scale certification) | ⬜ |
| 2 | With Firebase IAM that can deploy indexes to `answerlattice-qa`, rerun `env -u GOOGLE_APPLICATION_CREDENTIALS firebase deploy --only firestore:indexes --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` | The July 17 attempt loaded the validated dedicated index configuration, then the Firebase Rules test endpoint returned the same HTTP 403 before upload. The Help Center ticket message/status/document/log index exemptions are not live until this succeeds. | P0 (before QA ticket scale certification) | ⬜ |
| 3 | With Firebase IAM that can deploy Functions to `menulist-qa`, rerun `env -u GOOGLE_APPLICATION_CREDENTIALS firebase deploy --only functions:menulistMaintenanceScheduler --project menulist-qa --config firebase.json --non-interactive` | The July 17 attempt passed configured Functions lint/build, then Cloud Resource Manager returned HTTP 403 `The caller does not have permission` before upload. Snapshot retention, draft cleanup, pending entitlement repair, alert retention, and paid-cycle expiry changes share this existing scheduler target. | P0 (before QA scheduler/retention certification) | ⬜ |
| 4 | Include the verified app-side item 17, 19, and 27 changes in the approved QA Vercel release | Reseller query ordering, presentation-only observation-write suppression, and selective Report Leads querying are Next.js/app changes. Codex did not run a Vercel build or deploy. | P0 (before corresponding QA smoke) | ⬜ |
| 5 | After tasks 1-4, run focused QA smoke for reseller newest-first lists and entitlement repair, cosmetic versus operational menu saves, report-lead filtering/caps, public contact submission, and Help Center reply/status growth | Local source/type/runtime gates prove the contracts but cannot prove deployed indexes, scheduler behavior, target data, provider/session state, or hosted browser/device behavior. | P0 (before production certification) | ⬜ |

All feature 15-30 focused gates, exact TypeScript, focused lint, dependency freeze, both index JSON checks, Functions lint/build/preflight, and diff integrity passed locally before the deploy attempts. All three Firebase attempts stopped before upload; no QA index or Function revision changed.

### Main Website, Legal, I18n/SEO And Paid-Cycle Truth — July 16, 2026

| # | Task | Why | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | Restore non-interactive Firebase CLI authentication/IAM, then run `firebase deploy --project menulist-qa --config firebase.json --only firestore:rules,firestore:indexes,functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler,functions:triggerCustomerAnalyticsManually,functions:menulistMaintenanceScheduler --non-interactive` | The July 16 attempt read the index source, then the Firebase Rules test endpoint returned HTTP 403 `The caller does not have permission`; later audit retries stopped at missing CLI authentication before upload. The bounded hourly query needs `subscriptions(pId ASC, productId ASC, status ASC, cycleEndDate ASC)` together with the other exact-product billing indexes, rules and affected Functions. | P0 (before cycle-end QA) | ⬜ |
| 2 | With Firebase IAM that can deploy Functions to `menulist-qa`, rerun `firebase deploy --only functions:menulistMaintenanceScheduler --project menulist-qa --config firebase.json --non-interactive` | The July 16 attempt passed configured Functions lint/build, then Cloud Resource Manager returned HTTP 403 `The caller does not have permission` before upload. The hourly expiry and item-29 alert retention share this target. | P0 (before cycle-end QA) | ⬜ |
| 3 | Include item-30 app/website changes in the approved QA Vercel release; no Vercel build or deploy was run by Codex | Alias-safe links/language state, legal copy and root entitlement selection are Next.js/app changes. | P0 (before website/billing QA) | ⬜ |
| 4 | On QA, smoke website `menulist.digital`/`www`, owner app `app.menulist.digital`, and a customer host under `*.menulist.digital` at desktop and phone widths: every relevant route, all eight language choices including RTL Arabic, refresh/back/forward, keyboard Escape/focus, 320px overflow and noindex utility routes | Source gates cannot prove deployed middleware headers, CDN rewrites, browser history, focus rendering, RTL layout or device behavior. | P0 (before production certification) | ⬜ |
| 5 | With a disposable Razorpay test-mode store, verify activate → cancel and enabled pause → cycle-end behavior: owner access/UI and store/platform plan mirrors remain through `cycleEndDate`, the leased expiry run changes the row to expired, and a forced entitlement-sync failure is repaired from `billingEntitlementSyncPending` | Local unit/source/emulator gates do not mutate provider state or prove deployed scheduler/index/cache behavior. Pause remains disabled unless intentionally enabled for the fixture. | P0 (before billing certification) | ⬜ |
| 6 | Have the owner and qualified legal counsel approve the current Privacy Policy, Terms of Service and Refund Policy, including business identity, governing law/jurisdiction, generated-output rights, applicable-law/refund exceptions and retention wording | Code truth removes known false claims but is not legal advice or legal certification. | P0 (before public legal release) | ⬜ |
| 7 | Verify production analytics/contact dependencies and discovery: consent-gated Plausible/GA4/Clarity choices, Turnstile and Upstash normal/exhausted/outage behavior, contact delivery ownership, sitemap/robots/LLM fetches, canonical/hreflang in Search Console and production-host logs | Local source tests cannot certify provider accounts, consent telemetry, contact operations, crawler fetches, DNS/CDN or search-console state. | P0 (before production certification) | ⬜ |

Both smallest-scope QA deploys were attempted after local validation and both stopped before upload on IAM 403. No index or Function revision changed. Production Firebase and Vercel deployment require later QA evidence and explicit approval.

### Internal Ops Control Room And Platform Monitoring — July 16, 2026

| # | Task | Why | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | With Firebase IAM that can deploy Functions to `menulist-qa`, rerun `firebase deploy --only functions:menulistMaintenanceScheduler --project menulist-qa --config firebase.json --non-interactive` | The 90-day `systemAlerts` cleanup passed local Functions lint/build/preflight, but the scoped QA deploy stopped before upload at Cloud Resource Manager HTTP 403: `The caller does not have permission`. No Function revision changed. | P0 (before retention QA) | ⬜ |
| 2 | Include the verified item-29 app/API changes in the approved QA Vercel release | Current platform layout/browser/API authorization, truthful unavailable states, recovery response validation and SAFE_MODE copy are Next.js/app changes. Codex did not run a Vercel build or deploy. | P0 (before platform QA) | ⬜ |
| 3 | Run authenticated desktop and MobileShell QA with a current PLATFORM user, then downgrade/block/deactivate/revoke that user and retry every internal monitor/control without a fresh login | Local gates prove source ordering and parsers, but target sessions, Firebase ID-token/rule behavior, cookies and mounted MobileShell sub-screens need deployed evidence. All stale-authority reads and mutations must fail. | P0 (before production certification) | ⬜ |
| 4 | Run target Upstash normal/exhausted/outage behavior plus SAFE_MODE activate/replay/deactivate, alert mute, force republish, scheduler success/partial/failure, extraction read/retry and Entity Block post-commit-effect smoke | Local tests do not prove target limiter state, callable revisions, cache/CDN, Storage ownership, Firebase Auth reconciliation or current tenant/store fixtures. | P0 (before production certification) | ⬜ |
| 5 | Verify Telegram, platform email/WhatsApp, owner-notification SMTP/Meta and messaging-onboarding provider delivery/failure/retry behavior with secrets redacted from evidence | Provider accounts, egress, templates, delivery windows and target secrets are external to source gates. | P0 (before provider certification) | ⬜ |
| 6 | After the QA scheduler is live, seed or retain eligible old alert fixtures and observe one leased cleanup run; confirm at most 100 rows older than 90 days are removed and newer/unresolved current alerts remain | Local build proves the query/task registration but not deployed scheduler lease, target data or delete behavior. | P0 (before retention certification) | ⬜ |

No Firestore rule, index or Storage rule changed in item 29. Production Function deployment must wait for successful QA evidence and explicit approval.

### MenuList Help Center And Support Flow — July 16, 2026

| # | Task | Why | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | With a Firebase identity that can test and release Firestore rules for `answerlattice-qa`, rerun `firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json` | The item-28 append-only support-ticket and write-once satisfaction rules passed the dedicated emulator, but this session's QA upload stopped before compilation/upload with Firebaserules HTTP 403: `The caller does not have permission`. | P0 (before QA ticket smoke) | ⬜ |
| 2 | With equivalent Firebase permission for `menulist-qa`, rerun `firebase deploy --only firestore:rules --project menulist-qa --config firebase.json` | The explicit shared-mode rule file carries the same ticket boundary. Its QA upload also stopped before compilation/upload with the same Firebaserules HTTP 403, so no shared rule revision changed. | P0 (before shared-mode QA ticket smoke) | ⬜ |
| 3 | Include the verified Help Center app changes in the approved QA Vercel release, then run authenticated desktop and MobileShell smoke for search/fallback, article/changelog/feedback/contact navigation, ticket create/history/reply/status/satisfaction, valid and rejected attachments, signed-link opening, duplicate-submit prevention, product-account loss, and provider/SMTP failure | Source/type/lint/emulator gates cannot certify deployed Next.js code, Answerlattice product-account/Auth claims, Firebase Storage links, provider delivery, browser/device navigation, or production hosts. Codex did not run a Vercel deploy. | P0 (before production certification) | ⬜ |

The two rule deploy commands were attempted on July 16, 2026 after local source/emulator validation. Both were rejected by the Firebaserules test endpoint before upload, so they remain owner/IAM tasks and production deployment must wait for QA evidence and explicit approval.

### Digital Screens End-To-End Hardening — July 16, 2026

Complete these in order. Do not deploy the tightened Firestore rule before the safe writers and mirror backfill are live; legacy mirrors contain the bearer screen token and intentionally fail the new token-free allowlist.

| # | Task | Why | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | Include the verified token-free Digital Screens app changes in the approved QA Vercel release | Current deployed owner/server writers can still recreate a token-bearing `screen_{storeId}` mirror. The app release also carries route/seen kill switches, permission gates, expired-slide recovery, and cache/index safety. Codex did not run a Vercel deploy. | P0 (before mirror migration) | ⬜ |
| 2 | After isolating the intended Functions release, deploy the affected QA targets: `processMenuImagesJob`, `menulistMaintenanceScheduler`, `computeDecisionBlocksScores`, `triggerStoreNightlyScheduler`, `triggerDecisionBlocksScoring`, and `forceRepublish` | These paths can touch the public screen mirror through the shared cache-revalidation helper; every active writer must be token-free before migration. | P0 (before mirror migration) | ⬜ |
| 3 | Dry-run and then write the token-free public-mirror backfill against `menulist-qa`; retain the counts as evidence | Existing `screen_{storeId}` documents must be replaced before the new `hasOnly` rule is deployed, or connected listeners will lose access. The script requires explicit project, scope, write, and project confirmation. | P0 (before Firestore rule deploy) | ⬜ |
| 4 | Deploy the tightened Firestore rule to `menulist-qa` only after tasks 1–3 pass | The rule removes bearer tokens from the public shape and changes anonymous access from broad read to exact-document get, preventing token recovery and public listing. | P0 (before QA screen smoke) | ⬜ |
| 5 | Run QA smoke on Menu Board and Highlights for valid/invalid/disabled/blocked tokens; save/publish/sold-out/special-menu/store-profile propagation; two connected screens; offline-after-load/reconnect; failed seen write retry; expired-slide replacement; owner/manager/custom-role/no-permission desktop and MobileShell access | Local gates cannot certify deployed rules, target data, browser listener behavior, cache/CDN, real Upstash, TV fullscreen, or physical-device recovery. | P0 (before production certification) | ⬜ |
| 6 | Repeat the same writer → backfill → rule → smoke order for `menulist` only after QA evidence and explicit production approval | Production mirrors and connected devices must never pass through a mixed token-bearing/token-free writer state. | P0 (before production rollout) | ⬜ |

```bash
# Task 2: scoped QA Functions writers
npm run verify:functions-deploy-preflight
firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImagesJob,functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler,functions:triggerDecisionBlocksScoring,functions:forceRepublish --non-interactive

# Task 3: dry-run first, then explicit write
npm run backfill:digital-screen-public-mirrors -- --project-id menulist-qa --all-screens
npm run backfill:digital-screen-public-mirrors -- --project-id menulist-qa --all-screens --write --confirm-project menulist-qa

# Task 4: only after the token-free app/Functions writers and backfill are verified
firebase deploy --project menulist-qa --config firebase.json --only firestore:rules --non-interactive
```

### Staff, Roles And Permissions — July 16, 2026

| # | Task | Why | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | Include the verified staff/roles app changes in the approved QA Vercel release | Owner-target protection, explicit placeholder Auth binding, post-commit token ordering, access-status lifecycle checks, response validation, and desktop/mobile guards are Next.js/app changes. Codex did not run a Vercel build or deploy. | P0 (before QA staff smoke) | ⬜ |
| 2 | Run the hosted desktop and MobileShell matrix for Owner, Manager, Staff, and one custom role: list/add/edit, allowed role choices, Owner row read-only behavior, role create/edit/deactivate, last-owner demotion/removal race, force-sign-out, deactivate/reactivate, remove one/last store, multi-store visibility, and self Account access | Source/type/emulator gates cannot certify deployed sessions, browser/device state, real tenant mappings, password handoff, or target Firebase Auth behavior. | P0 (before production certification) | ⬜ |
| 3 | Exercise email setup, Staff ID/passcode, phone alias, forgot-password, self password change, owner reset, exact reset retry, simultaneous reset, session revocation on two devices, unverified placeholder verification, unrelated Auth email collision, incomplete UID binding refusal, and failed-commit compensation on the approved QA target | Local source tests do not create target Firebase Auth identities or prove email delivery, cookies, refresh-token timing, or provider/account state. Do not manually mark a collision as verified. | P0 (before production certification) | ⬜ |
| 4 | Verify target Upstash credentials and run normal, exhausted, and provider-failure behavior for staff list/write/auth-sensitive limits; keep Owner credentials and one-time passcodes private during evidence capture | Local checks intentionally ran without target Upstash credentials. Rate-limit/provider behavior and safe evidence handling are operator responsibilities. | P0 (before production certification) | ⬜ |
| 5 | Run session lifecycle QA for inactive/deleted user, tenant, and store; direct user/tenant/store block; missing/cross-tenant store; revoked session; and reactivation | Source checks lock the rejection reasons, but deployed access-status cadence, cookies, and target records require hosted evidence. | P0 (before production certification) | ⬜ |

No Firestore rules, indexes, Storage rules, or Cloud Function logic changed in this pass, so there is no new Firebase deploy task from this feature checkpoint.

### Guest Feedback And Dormant Reviews Boundary — July 16, 2026

| # | Task | Why | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | Include the verified Guest Feedback app/server changes in the approved QA Vercel release | Public-page data minimization, idempotent submit handling, strict review-link saving, and mobile pagination/manual reply behavior are Next.js/app changes. Codex did not run a Vercel build or deploy. | P0 (before QA feedback smoke) | ⬜ |
| 2 | Run authenticated QA on public feedback, desktop inbox, and MobileShell: valid/invalid project/store/tenant, Turnstile, rate limit, exact retry after lost response, all filters, 50+ pagination, resolve/reopen, Unicode name, copy/WhatsApp, valid/invalid Google link, and custom domain | Source and emulator gates cannot certify deployed credentials, CDN/browser payload, target data, device handoff, or production host behavior. Inspect the public RSC/network payload to confirm owner contact/internal fields are absent. | P0 (before production certification) | ⬜ |
| 3 | Keep `ENABLE_REVIEWS_REPUTATION` and `ENABLE_AI_REPLY_ASSIST` disabled | The repo has no GBP review ingestion/classifier writer, review DAL/inbox, scheduler, Google reply route, or mobile review UI. Provider access alone does not make it safe to enable. | P0 (until a separate implementation is completed) | ⬜ |

No Firebase rules, indexes, Storage rules, or Cloud Function logic changed in this pass, so there is no new Firebase deploy task from this feature checkpoint.

### Owner Notifications And Messaging Onboarding — July 16, 2026

| # | Task | Why | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | Include the verified owner-notification and messaging app changes in the approved QA Vercel release | The fake desktop notification feed removal, app-side owner event/consent/provider boundaries, preview/publish routes, and maintained docs are in the shared app worktree. Codex did not run a Vercel build or deploy. | P0 (before QA smoke) | ⬜ |
| 2 | Isolate the intended Functions changes, run `npm run verify:functions-deploy-preflight`, and approve a QA deploy of `functions:verifyMenuPublish,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:menulistMaintenanceScheduler,functions:messagingOnboarding,functions:msgExtractionWatcher` | Owner provider timeouts/consent/event caps, daily publish-failure identity, messaging WhatsApp redirect refusal, and messaging worker behavior require updated Functions. The shared dirty bundle was not deployed blindly. | P0 (before QA provider smoke) | ⬜ |
| 3 | Provision the final owned Meta WhatsApp Business number and real `WHATSAPP_PHONE_NUMBER_ID`, access token, app secret, verify token, webhook registration, preview base URL, and target-specific enablement | Checked-in Functions environments intentionally keep messaging onboarding disabled. Dummy secrets or an unowned test number do not certify the provider flow. | P0 (before enabling messaging onboarding) | ⬜ |
| 4 | Run QA SMTP and WhatsApp provider smoke for success, provider rejection, expired token/template, redirect refusal, bounded timeout, dedupe/retry, consent granted, and consent revoked | Local tests cannot prove real SMTP/Meta account, approved templates/session window, egress, provider status, or delivery receipt behavior. | P0 (before production certification) | ⬜ |
| 5 | Run authenticated desktop/mobile QA for billing, credits, publish success/failure replay, staleness, platform recovery, messaging upload/PDF, invalid upload, preview, multi-device fix/approve race, publish, public cache, copy/share, claim, expiry, and post-publish tunnel closure | Source and emulator gates do not certify deployed tenant data, browser/device behavior, public output, account claim, cache/CDN, or production-host behavior. Confirm that owners see real email/WhatsApp outcomes and never a fake order/activity feed. | P0 (before production certification) | ⬜ |

### Public Customer Delivery Flow — July 16, 2026

| # | Task | Why | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | Include the verified public customer delivery app changes in the approved QA Vercel release | Unknown-slug handling, browser DTOs, scoped OBP/sitemap/manifest/pull selection, and sitemap cache tags are Next.js/app changes. Codex did not run a Vercel build or deploy. | P0 (before QA public smoke) | ⬜ |
| 2 | Run the hosted single-store and multi-location route matrix on current/previous subdomain, verified custom domain, current/previous outlet/project slug, owner-claimed `/menu`, default-backed `/menu`, no-default `/menu`, unknown slug, and inactive/deleted/blocked targets | Local gates cannot prove deployed redirects, cache/CDN state, tenant data, status/canonical/noindex output, or DNS/host behavior. | P0 (before production certification) | ⬜ |
| 3 | Inspect hosted page source, RSC/network payloads, robots and sitemap after publish/rename/delete to confirm no canonical store credentials/internal project workflow metadata and immediate per-store sitemap/menu refresh | The code now uses explicit DTOs and publish-compatible tags, but the deployed bundle/cache needs direct evidence. | P0 (before production certification) | ⬜ |
| 4 | Run iOS/Android and installed-PWA QA for low bandwidth, language, menu/OBP/outlet navigation, browser back, unknown/deleted recovery countdown, manifest start URL, and call/directions/WhatsApp/order/reservation shortcuts | Source and static PWA gates do not certify browser install behavior, device navigation, or OS handoffs. | P0 (before production certification) | ⬜ |
| 5 | Smoke the MenuList public pull API with a scoped QA key for default menu, linked outlet, invalid/cross-scope summary row fixture, revocation, rate limit, and ETag 304; then submit/inspect the canonical tenant sitemap in Search Console | Local tests prove target guards and response identity, but live credentials, rate-limit provider, deployed data, crawler ingestion, and indexing are external outcomes. | P0 (before integration/SEO certification) | ⬜ |

### Authentication And Onboarding Flow — July 16, 2026

| # | Task | Why | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | Include the verified auth/onboarding app changes in the approved QA Vercel release | Fail-closed public auth limits, claim handoff serialization, store-role claim rejection, pending-payment recovery, and onboarding persistence convergence are app-side changes. Codex did not run a Vercel build or deploy. | P0 (before QA auth smoke) | ⬜ |
| 2 | Run the full QA identity matrix on the target host: Google OAuth, email/password, phone/passcode, WhatsApp OTP, staff alias where applicable, all three messaging claim modes, logout, expired/revoked/blocked user, and returning-owner login | Local source tests cannot prove provider credentials, redirects, templates, Firebase Auth state, cookies, or deployed account data. | P0 (before production certification) | ⬜ |
| 3 | Run Razorpay sandbox onboarding for success, checkout dismissal, Pricing/Billing resume, verification, webhook convergence, duplicate submit, ambiguous create response, local persistence acknowledgement loss, cancellation, and compensation | The source protects these boundaries, but live provider behavior and webhook ordering require sandbox evidence. | P0 (before paid onboarding launch) | ⬜ |
| 4 | Verify Firebase custom claims and forced token refresh for owner, manager/staff/custom role, platform/support, missing role, wrong tenant/store, store switch, and revoked access | Source gates prove the role resolver and canonical store read; deployed token contents and Firestore rule effects still require target evidence. | P0 (before production certification) | ⬜ |
| 5 | Run narrow iOS and Android browser/PWA QA for OTP keyboards, Google/claim return, checkout open-dismiss-resume, session refresh, and first dashboard entry | Responsive source code is not device or browser certification. | P0 (before production certification) | ⬜ |

### Multi-Location Master And Outlet Flow — July 16, 2026

| # | Task | Why | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | Include the verified multi-location app changes in the approved QA Vercel release | Fresh tenant, store, membership, permission, capacity, linked-menu, and public-render checks are app-side changes. Codex did not run a Vercel build or deploy. | P0 (before QA owner smoke) | ⬜ |
| 2 | Run authenticated QA smoke on desktop and MobileShell for Locations access, add outlet, switch to outlet, return to HQ, rename, policy changes, linked-menu override/publish, and deactivation | Local source and type gates cannot prove deployed auth claims, browser state, mobile navigation, or real tenant data. Include master, permitted staff, unpermitted staff, inactive outlet, and blocked tenant/store cases. | P0 (before production certification) | ⬜ |
| 3 | Run Razorpay sandbox evidence for card/eMandate quantity increase and decrease, UPI replacement checkout/finalization, failed replacement, failed/unsupported deactivation reduction, and safe retry | The source now returns a truthful `CONTACT_SUPPORT` acknowledgement whenever an immediate provider reduction remains unresolved; real provider and webhook behavior still needs target evidence. | P0 (before paid multi-location launch) | ⬜ |
| 4 | Run manual/reseller prepaid-capacity QA for outlet creation and deactivation | Offline/manual quantity is prepaid capacity and is intentionally not auto-reduced on deactivation. Real entitlement records must prove capacity admission and owner copy on the deployed target. | P0 (before manual/reseller multi-location launch) | ⬜ |
| 5 | Verify the new outlet and a linked outlet menu through public menu, OBP/custom-domain/QR output, cache refresh, and initialized Digital Screen behavior | Local guards prove scope and fail-closed behavior, but deployed cache/CDN, domain, and screen acknowledgements require hosted evidence. | P0 (before production certification) | ⬜ |

### Project Publish And Public Cache Flow — July 16, 2026

| # | Task | Why | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | Include the verified project publish/cache app changes in the approved QA Vercel release | Desktop/mobile stale-publish protection and observed post-publish verification handoff are app-side changes. Codex did not run a Vercel build or deploy. | P0 (before QA owner smoke) | ⬜ |
| 2 | After isolating the intended Functions release from the shared dirty worktree, deploy the affected QA targets: `firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImagesJob,functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler,functions:triggerDecisionBlocksScoring,functions:forceRepublish --non-interactive` | Scheduled special-menu repairs, independent Digital Screen touch, and acknowledged force-republish cache refresh require the updated Functions code. The deploy was not run blindly because the Functions tree contains other in-progress changes. | P0 (before QA recovery/scheduler smoke) | ⬜ |
| 3 | Run authenticated QA smoke for desktop publish, MobileShell Design publish, linked-outlet stale conflict, project create/edit/duplicate/delete/restore/active toggle, scheduled special-menu repair, public menu/OBP/custom-domain/QR output, initialized Digital Screen refresh, and Ops force republish with both valid and missing cache configuration | Local source gates, TypeScript, Functions build/lint, and Firestore emulators pass; hosted auth, cache/CDN, device, DNS, and deployed-secret behavior still require real-target evidence. | P0 (before production certification) | ⬜ |

### Global Media And Storage Lifecycle — July 16, 2026

| # | Task | Why | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | Include the verified media/server changes in the approved QA Vercel release | Immutable Admin upload reuse, prompt-cache destination reuse, batch review cleanup safety, and owner copy are app/server changes. Codex did not run a Vercel build or deploy. | P0 (before QA media smoke) | ⬜ |
| 2 | Deploy the validated MenuList Storage rules to QA with `firebase deploy --project menulist-qa --config firebase.json --only storage --non-interactive` | Prepared public media is now create-only and static JPEG/PNG/WebP; the local Storage emulator passes, but the target rule version must be captured before production approval. | P0 (before QA media smoke) | ⬜ |
| 3 | After isolating the intended shared Functions release, deploy `functions:menulistMaintenanceScheduler` to QA | Image-batch retention is now metadata-only; the updated scheduler must be live before relying on seven-day payload pruning and 30-day terminal-row cleanup. | P0 (before batch-image launch) | ⬜ |
| 4 | Run authenticated desktop and MobileShell QA for upload, adjust, save, replace, remove, duplicate, linked-outlet, retry, acknowledgement-loss, offline/interrupted, and public-render behavior across item/project/background/logo/OBP/PWA/screen/generated images | Source/emulator tests cannot prove deployed Auth claims, real Storage tokens, upload progress, browser memory, cache/CDN, installed PWA, screen device, or low-bandwidth behavior. | P0 (before production certification) | ⬜ |
| 5 | Capture QA bucket inventory, orphan growth, lifecycle configuration, quota/alerting, and cache/CDN evidence before proposing physical public-media cleanup | Current code intentionally retains public media when exclusive references are unknown. A future cleanup requires measured cost plus global project/outlet/store reference proof; do not enable destructive cleanup from one job or project. | P1 (after representative usage) | ⬜ |

### SignalDesk First Revenue Trial

| # | Task | Why | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | Grant the current operator Firebase access to `menulist-signaldesk-qa` | QA Firestore rules/index deployment and authenticated trial smoke remain blocked by Firebase Rules API HTTP 403. | P0 (before real QA trial) | ⬜ |
| 2 | Use SignalDesk's founder-only market-pod review to approve, hold, reject, or redirect the Bengaluru recommendation | Seed data matches Indiranagar + Koramangala cafes/dessert shops/QSR/customer-facing cloud kitchens; research can recommend but cannot activate strategy or spend. | P0 (before importing real targets) | ⬜ |
| 3 | Confirm the first curated source list, standard offer/price, sender identity, and physical address policy | Real manual/export outreach must not infer source rights, commercial terms, or sender compliance. | P0 (before any real outreach) | ⬜ |
| 4 | Set the first trial caps for target volume, provider spend, and strong-model spend | The recommended pod carries zero approved budget; real cost authority must be explicit before the seven-day trial. | P0 (before any paid/provider run) | ⬜ |

### June 19 Product Activation And Release Scope

| #   | Task                                                                 | Why                                                                                                              | Priority                    | Status |
| --- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| 1   | Decide the release scope for the current dirty worktree               | Growth Kits and CampaignCue hardening are validated, but the workspace also contains AI Menu Manager read-only answer changes and an untracked `routes-manifest.json`. Decide whether these ship together, split into separate commits, or the unrelated items are handled separately. | P0 (before commit/deploy)   | ⬜     |
| 2   | Provision or grant access to the dedicated CampaignCue Firebase project | CampaignCue protected owner workspace testing and Firebase deploy remain blocked until the dedicated project/Admin credentials are available to this repo. The August 1 read-only CLI recheck also found no authenticated Firebase login. | P0 (before CampaignCue owner testing) | ⬜     |
| 3   | Set CampaignCue environment variables and Admin credentials in local/Vercel/Firebase targets | The export/download runtime is code-ready, but real workspace bootstrap, saves, campaign creation, asset registration, and CueLayers Storage paths need real CampaignCue Firebase credentials. | P0 (before CampaignCue owner testing) | ⬜     |
| 4   | Deploy CampaignCue Firebase rules, indexes, and Storage rules after project access is ready | Existing CampaignCue Firebase deploy attempts are blocked by `campaigncue-qa` access/availability. Deploying the Firebase target is required before real owner writes. | P0 (after task 2)           | ⬜     |
| 5   | Confirm CampaignCue domain and auth launch behavior                   | `campaigncue.ai/app` needs a final sign-in/domain decision before public owner testing or a production Vercel deploy. | P0 (before public CampaignCue traffic) | ⬜     |
| 6   | Decide when to authorize the Vercel deploy for the verified app changes | Codex did not run Vercel deploy or production build by default. A deploy needs explicit owner approval after release scope is clear. | P0 (before public traffic)  | ⬜     |
| 7   | Keep direct provider activation separate from the current CampaignCue export/download release | Google Business Profile OAuth/API access, WhatsApp WABA/templates/opt-in/pricing, provider metrics, billing, and direct posting/sending remain future provider-layer work. | P1 (before provider launch) | ⬜     |
| 8   | Keep KitStamp as a separate product decision, not a MenuList/CampaignCue merge | KitStamp remains foundation/planning only. Before implementation, decide domain, Firebase targets, billing package, initial ICP, export schema, and public claims. | P2 (only if KitStamp is activated) | ⬜     |

### Public Starter Menu Entry Launch

| #   | Task                                                                 | Why                                                                                                              | Priority                    | Status |
| --- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| 1   | Fix or replace the configured Upstash Redis endpoint                  | Local public upload/claim rate-limit checks logged DNS `ENOTFOUND`; code now fails closed for public menu setup and claim when the provider is unavailable, but launch still needs a working Upstash endpoint before public traffic. | P0 (before public traffic)  | ⬜     |
| 2   | Confirm Gemini quota/key capacity for public menu extraction          | The local verification key returned quota errors; public upload-before-auth depends on reliable extraction capacity or additional rotated keys. | P0 (before public traffic)  | ⬜     |
| 3   | Deploy Firestore rules, indexes, and updated Cloud Functions scheduler | `publicMenuDrafts` must stay server-only, and expired draft images/docs need the `public_menu_draft_cleanup` scheduler task live.              | P0 (before public traffic)  | ⬜     |
| 4   | Confirm Razorpay recurring/autopay capability for hosted checkout     | Signed webhook processing and read-only test-mode credential auth passed locally, but hosted recurring checkout still depends on merchant/account capability and full sandbox checkout/webhook smoke. | P0 (before paid launch)     | ⬜     |
| 5   | Run WhatsApp Cloud API sandbox media flow if WhatsApp onboarding is included | The public web flow is verified; WhatsApp media/webhook delivery still requires real Meta test app credentials and provider callback proof.    | P1 (before WhatsApp launch) | ⬜     |

### AI Extraction Monitoring Dashboard

| #   | Task                                                                             | Why                                                                                                                                         | Priority                                | Status |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------ |
| 1   | Confirm the enabled extraction monitor in the deployed QA app and run authenticated platform-role QA | `ENABLE_EXTRACTION_MONITORING_DASHBOARD` is already `true` in current source. The remaining work is target app deployment evidence plus desktop/mobile platform access, bounded loading/error state, filter, inspector, retry, and cost-panel smoke. | P1 (after first real extractions)       | ⬜     |
| 2   | Verify Firestore indexes for extraction monitoring queries                       | Run `firebase deploy --only firestore:indexes --project menulist-qa --config firebase.json` after `npm run verify:env-targets` passes; production requires QA evidence and explicit production approval. | P1 (before live dashboard use)          | ⬜     |
| 3   | P2: Wire Telegram alerts for extraction failure spikes                           | Auto-alerts when failure rate > 5% or quality drops. Infrastructure exists (`sendTelegramAlert()`), just needs wiring in nightly scheduler. | P2 (when extraction volume grows)       | ⬜     |
| 4   | P3: Add HCR (Human Correction Rate) metric from extraction learning loop data    | Data already collected via `menuChangeLog` + `platformSummary/extractionLearning`. Just needs dashboard display.                            | P3 (when enough correction data exists) | ⬜     |

> **Built by Cascade (Mar 13, 2026):** JobInspector.tsx (3-tab drawer), CostMonitor.tsx (daily spend panel), retryExtractionJob() (DAL + UI button with max 3 retries + validation)

### AI System Layer

| #   | Task                                                                         | Why                                                                                                                                                  | Priority                               | Status |
| --- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------ |
| 1   | Add 2nd-4th Gemini API keys to Vercel env vars + Firebase Secrets            | Enables key rotation for higher AI throughput. Single key still works with retry/backoff, but multi-key gives immediate failover on 429 rate limits. | Optional (do when hitting rate limits) | ⬜     |
| 2   | Review current compact AI operation/cost summaries before adding another metric | `menulistAiOperations` and existing bounded summaries already provide cross-feature accounting evidence. Add a new aggregate only when production review identifies a specific unanswered question. | Optional (evidence-triggered)           | ⬜     |
| 3   | Evaluate translation/description reuse only after repeated-request evidence | Do not add translation memory or a description cache from a guessed scale threshold or savings claim. Revisit only when bounded telemetry shows materially repeated identical work and defines safe tenant/content invalidation. | Optional (evidence-triggered)           | ⬜     |

**How to do #1:**

```bash
# 1. Create 2-3 extra keys at https://aistudio.google.com/apikey
# 2. Add to Firebase Secrets in QA first:
firebase functions:secrets:set GEMINI_AI_KEY_2 --project menulist-qa
firebase functions:secrets:set GEMINI_AI_KEY_3 --project menulist-qa
firebase functions:secrets:set GEMINI_AI_KEY_4 --project menulist-qa

# 3. Add the same QA keys to the Vercel Preview environment only
# 4. Run npm run verify:functions-deploy-preflight, then use External Certification Gate 1 for the scoped QA Functions deploy
# 5. Repeat for production values only after QA evidence and explicit production secret/deploy approval
```

### AI Data Extraction — Security Fixes

| #   | Task                                                                     | Why                                                                                                                              | Priority           | Status |
| --- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------ |
| 1   | Deploy updated Firestore rules to QA: `firebase deploy --only firestore:rules --project menulist-qa --config firebase.json` | 3 security fixes: tenant validation on job creation (CRITICAL), AI operations rules, platform admin read override for monitoring. Production requires QA evidence and explicit production approval. | P0 (before launch) | ⬜     |
| 2   | Deploy updated Cloud Functions                                           | Server-side defense-in-depth: projectId ↔ tId/sId mismatch validation in extraction CF                                           | P0 (before launch) | ⬜     |
| 3   | Include the current owner extraction job API in the approved Vercel release | The July 15 source fix rejects empty files/arbitrary actions, canonicalizes business context, and preserves the 15-file/page contract through bounded document headroom. No Vercel deploy was authorized in this session. | P0 (before extraction launch) | ⬜     |
| 4   | Run authenticated desktop and mobile extraction smoke in QA | Exercise image upload, a multi-page PDF up to the 15-page cap, identity confirmation, progress, review/apply/discard, retry/cancel, owner Transactions history, and reset/create-new recovery on the deployed target. | P0 (before extraction launch) | ⬜     |
| 5   | Run real-provider QA for every enabled extraction producer | Prove owner upload, authenticated link import, public create-menu image/link intake, and messaging onboarding where enabled; record provider quota, failure, partial-result, cleanup, and final public-output evidence in the External Certification Runbook. | P0 (before each producer launches) | ⬜     |

**How to do #1 + #2:**

```bash
# 1. Deploy Firestore rules to QA after targeted validation
firebase deploy --only firestore:rules --project menulist-qa --config firebase.json

# 2. Deploy Cloud Functions through External Certification Gate 1
npm run verify:functions-deploy-preflight
# Then use the scoped menulist-qa Gate 1 command from __docs__/production-readiness/external-certification-runbook.md
```

> **Fixed by Cascade (Mar 13, 2026):** Security Surface Audit — 3 vulnerabilities fixed (1 CRITICAL). See `__docs__/projects/ai-data-extraction/security-surface-audit-mar13-2026.md`

### Special Menu Switching — Deployment and QA

| # | Task | Why | Priority | Status |
| - | ---- | --- | -------- | ------ |
| 1 | Deploy `menulistMaintenanceScheduler` and `computeDecisionBlocksScores` to `menulist-qa` after project access is restored | The July 16 scoped attempt passed predeploy lint/build, then Cloud Resource Manager rejected the project lookup with HTTP 403 (`The caller does not have permission`) before upload. Local source/emulator verification does not activate the scheduler changes in QA. | P0 before special-menu QA | ⬜ |
| 2 | Run one deployed schedule smoke at least five minutes in the future | Confirm `specialMenuNextTransitionAt`, activation, public/OBP output, initialized Digital Screen refresh where configured, expiry, regular-menu return, and owned temp-banner cleanup on the real QA target. | P0 before launch | ⬜ |
| 3 | Check for pre-existing QA schedules after deploy | The nightly recovery backfills old missing markers. If an existing schedule must switch before its next nightly pass, edit/save it once or recreate the QA schedule so the marker is written immediately. | P1 conditional | ⬜ |
| 4 | Include the current owner web/mobile code in the approved Vercel release | Generic deactivate/delete/reset guards and alternate mobile/desktop edit parity are app-side changes. No Vercel deploy was authorized in this session. | P0 before launch | ⬜ |

No Firestore rules or composite-index deploy is required for this change; the due query uses one automatically indexed top-level summary field.

```bash
npm run verify:functions-deploy-preflight
firebase deploy --only functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores --project menulist-qa --config firebase.json --non-interactive
```

### Production Readiness (Monitoring Stack)

| #   | Task                               | Why                                                                     | Priority           | Status |
| --- | ---------------------------------- | ----------------------------------------------------------------------- | ------------------ | ------ |
| 1   | Create Telegram Bot + set secrets  | Required for ops alerts (payment failures, publish errors, cost spikes) | P0 (before launch) | ⬜     |
| 2   | Set GCP Budget Alerts              | Auto-activates SAFE_MODE when cost threshold exceeded                   | P0 (before launch) | ⬜     |
| 3   | Deploy Cloud Functions             | Deploys verifyMenuPublish, alertEscalation, gcpBudgetAlertWebhook, menu extraction worker updates, source-file path hardening updates, and the consolidated maintenance scheduler. The latest scoped `menulist-qa` retry on July 16, 2026 (`menulistMaintenanceScheduler,computeDecisionBlocksScores`) completed predeploy lint/build and then failed before upload with Cloud Resource Manager HTTP 403 caller permission. | P0 (before launch) | ⬜     |
| 4   | Deploy Firestore indexes           | Required for alert escalation queries                                   | P0 (before launch) | ⬜     |
| 5   | Confirm monitoring feature flag evidence | Check current `src/config/features.ts` source state, QA secrets/deploy evidence, provider smoke evidence where applicable, and External Certification Runbook records for `ENABLE_COST_PROTECTION`, `ENABLE_OPS_ALERTS`, and `ENABLE_MENU_HEALTH_MONITOR`. | P0 (before launch) | ⬜     |
| 6   | Setup UptimeRobot                  | External uptime monitoring (free)                                       | P1 (before launch) | ⬜     |
| 7   | Setup SMTP for lifecycle messaging | Enables billing emails, renewal reminders, suspension warnings          | P1 (before launch) | ⬜     |
| 8   | Run the external certification runbook | Full MenuList production certification still needs Firebase deploy, mobile/browser QA, full Razorpay sandbox checkout/webhook smoke, WhatsApp provider, POS provider, batch worker, and production-host evidence recorded in the audit. Read-only Razorpay test-mode credential auth is recorded as partial Gate 4 evidence only. | P0 (before production certification) | ⬜     |
| 9   | Deploy MenuList Storage rules cutover to QA | Legacy project paths are read-only and prepared media is create-only/static JPEG-PNG-WebP in current code. Gate 2A requires `npm run verify:storage-paths`, then `firebase deploy --project menulist-qa --config firebase.json --only storage --non-interactive` before production approval. Local Storage emulation passes; prior target attempts were blocked while checking/enabling `firebasestorage.googleapis.com` with Service Usage HTTP 403: project `menulist-qa` not found or permission denied. | P0 (before production certification) | ⬜     |
| 10  | Configure and smoke the batch image Cloud Tasks worker secret and queue policy | Local `.env` has project/location/queue/HTTPS worker URL but is missing `BATCH_IMAGE_GENERATION_WORKER_SECRET`; Functions dotenv files have no batch worker keys. Gate 7 needs the worker secret, deployed worker target, a captured queue description showing dispatch/retry/backoff settings appropriate to the target quota, enqueue proof, wrong-secret rejection, correct-secret acceptance, review-state proof, and selected-image persistence. Do not change queue throughput blindly before the target quota and worker capacity are known. | P0 (before batch AI image launch) | ⬜     |
| 11  | Provision a controlled public HTTPS POS receiver for Gate 6 | The POS source gate passes locally, but external certification still needs a staging receiver endpoint that verifies MenuList signatures, accepts a signed full-menu snapshot, exercises failed-endpoint behavior, and proves secret rotation before UI success. | P0 (before POS launch) | ⬜     |
| 12  | Release the compatible POS app before deploying the new POS secret Firestore rule | The new UI/routes store secrets server-side; the previous deployed UI writes `store.posSync.webhookSecret`, which the new rule rejects. Deploying rules first would break enable/rotation. | P0 (ordered POS rollout) | ⬜ |
| 13  | After the compatible app and rules are live, migrate and verify every existing POS connection, then run staging and production test/delivery/application smoke | Lazy migration occurs on settings read, test, or delivery, but source cannot prove all dormant legacy rows migrated or that the provider applied a 2xx request. Record secret version, old-secret invalidation, signature verification, delivery history, and applied-menu evidence. | P0 (before POS certification) | ⬜ |

> **Full setup guide:** `__docs__/production-readiness/launch-prerequisites.md`
> **External certification guide:** `__docs__/production-readiness/external-certification-runbook.md`

### Environment Target Separation

| #   | Task                                                             | Why                                                                                          | Priority           | Status |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------ | ------ |
| 1   | Confirm local and preview MenuList env vars point to `menulist-qa` | Current contract keeps local/preview on the QA Firebase target; do not create or use `menulist-dev` for this path | P0 (before launch) | ⬜     |
| 2   | Confirm Vercel Production MenuList env vars point to `menulist` | Production traffic must use the production Firebase target, not QA or a stale sample project | P0 (before launch) | ⬜     |
| 3   | Confirm Answerlattice env vars stay separated                    | Local/preview use `answerlattice-qa`; production uses `answerlattice`                         | P0 (before launch) | ⬜     |
| 4   | Get Razorpay test mode keys for non-production smoke             | Local `.env` test-mode keys authenticated through a read-only provider request on July 9, 2026; matching staging/Vercel/Functions configuration and full sandbox checkout/webhook smoke still need confirmation. | P0 (before launch) | ⬜     |
| 5   | Deploy Firestore indexes to the current QA target after access is ready | Use `firebase deploy --only firestore:indexes --project menulist-qa --config firebase.json` only after `npm run verify:env-targets` passes | P0 (before QA smoke) | ⬜     |
| 6   | Deploy Firestore rules to the current QA target after access is ready | Use `firebase deploy --only firestore:rules --project menulist-qa --config firebase.json` only after targeted validation passes | P0 (before QA smoke) | ⬜     |
| 7   | Seed or confirm a test tenant/store in `menulist-qa`             | Required for non-production owner/mobile and publish smoke without touching production data   | P1 (after target access) | ⬜     |
| 8   | Confirm production feature flag evidence before launch           | No blanket activation order; review SAFE_MODE, Sentry, Ops Alerts, Health Monitor, and Lifecycle Messaging against target secrets, QA evidence, provider smoke, deploy evidence, and explicit production approval. | P0 (at launch)     | ⬜     |

> **Full guide:** `__docs__/production-readiness/dev-prod-environment-guide.md`

### WhatsApp Cloud API / Messaging Onboarding Activation

| #   | Task                                                                                     | Why                                                                                                             | Priority                         | Status |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------ |
| 1   | Create a founder-controlled Meta login for development/staging with 2FA enabled          | Required to use Meta for Developers without tying the setup to a random personal or employee-controlled account | P0 (before WhatsApp testing)     | ⬜     |
| 2   | Create a non-production Meta Developer app and add the WhatsApp product                  | Keeps MenuList dev/staging Cloud API testing separate from future production Meta assets                        | P0 (before WhatsApp testing)     | ⬜     |
| 3   | Use Meta's test WhatsApp phone number and approved test recipient first                  | Allows end-to-end webhook, media, and message testing before a real business number is connected                | P0 (before WhatsApp testing)     | ⬜     |
| 4   | Generate test credentials for the non-production app only                                | Provides the real provider values needed by Firebase Functions without using production tokens                  | P0 (before enabling the feature) | ⬜     |
| 5   | Set non-production Firebase secrets for the intended Firebase target                     | The messaging function needs real secrets; dummy WhatsApp secrets are not allowed                               | P0 (before enabling the feature) | ⬜     |
| 6   | Register the Meta webhook URL for the non-production function                            | Required for inbound WhatsApp messages and media uploads to reach MenuList                                      | P0 (before live testing)         | ⬜     |
| 7   | Keep `ENABLE_MESSAGING_ONBOARDING=false` until real Firebase secrets and Meta webhook registration are in place, then enable only the smoke target | Prevents repo-side env defaults from accepting provider webhooks before real non-production setup exists. A July 9, 2026 presence check confirmed checked-in local/functions dotenv files remain absent/false with no WhatsApp provider secret values. | P0 (before live testing)         | ⬜     |
| 8   | Run the full test flow: text message, image/PDF upload, preview, approve, publish, reply | Proves the Cloud API path works before any owner-facing or customer-facing launch                               | P0 (before beta)                 | ⬜     |
| 9   | Decide and register the production business entity path                                  | Meta production readiness needs a real business identity before serious launch                                  | P0 (before production launch)    | ⬜     |
| 10  | Prepare India business verification documents                                            | Likely required/supporting documents include PAN, GST/Udyam/shop registration, address proof, or bank proof     | P0 (before production launch)    | ⬜     |
| 11  | Map the live MenuList domain and create domain email                                     | Production Meta verification and trust should use the real website/domain identity                              | P0 (before production launch)    | ⬜     |
| 12  | Publish production privacy policy and terms pages                                        | Required for production trust, opt-in clarity, and Meta review readiness                                        | P0 (before production launch)    | ⬜     |
| 13  | Get a dedicated unused production WhatsApp number                                        | A Cloud API number cannot remain active in the normal WhatsApp app; never use a founder personal number         | P0 (before production launch)    | ⬜     |
| 14  | Create separate production Meta Business Portfolio, app, WABA, and payment setup         | Keeps production billing, limits, templates, and ownership separate from dev/staging                            | P0 (before production launch)    | ⬜     |
| 15  | Create and approve utility templates for onboarding messages                             | Required for production-initiated WhatsApp messages outside the customer service window                         | P0 (before production launch)    | ⬜     |
| 16  | Store production WhatsApp secrets separately from dev/staging secrets                    | Prevents test tokens, test phone IDs, or staging webhooks from leaking into production                          | P0 (before production launch)    | ⬜     |
| 17  | Review current Meta WhatsApp pricing and convert the expected launch cost to INR         | Vendor pricing can change; launch cost planning must be based on current Meta pricing                           | P1 (before paid traffic)         | ⬜     |

**Current website CTA note (July 16, 2026):** `/whatsapp` is informational while provider intake remains disabled and routes owners to the existing `/create-menu` intake. It exposes no active `wa.me` onboarding test number. Meta app setup, Firebase secrets, webhook registration, approved test-recipient setup, and the dedicated production WhatsApp number remain pending.

**How to do the development/staging setup:**

```bash
# Set these only with real values from the non-production Meta app.
firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID --project <non-production-firebase-project>
firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN --project <non-production-firebase-project>
firebase functions:secrets:set WHATSAPP_APP_SECRET --project <non-production-firebase-project>
firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN --project <non-production-firebase-project>

# Enable only after the real non-production secrets exist.
# Runtime env:
# ENABLE_MESSAGING_ONBOARDING=true
# MESSAGING_ONBOARDING_PROVIDERS=whatsapp
```

**Webhook URL format:**

```text
https://us-central1-{firebaseProject}.cloudfunctions.net/messagingOnboarding/whatsapp
```

**Separation rules:**

- Dev/staging uses a non-production Meta app, Meta test phone number, test recipient, and non-production Firebase secrets.
- Production uses a separate Meta Business Portfolio, app, WABA, dedicated phone number, billing setup, templates, and Firebase secrets.
- Official Meta WhatsApp Cloud API only. Do not use OpenWA, `whatsapp-web.js`, Baileys, QR-scanned WhatsApp Web sessions, or browser automation for MenuList onboarding.
- Do not create dummy WhatsApp secrets. Missing real secrets mean the feature stays disabled.
- Do not enable owner-facing launch until webhook, media download, preview, approve/publish, outbound confirmation, `/ops/messaging-onboarding`, indexes, rules, and TTL are verified.

> **Detailed runbook:** `__docs__/messaging-onboarding/messaging-onboarding_runbook.md`  
> **Enable/test checklist:** `__docs__/messaging-onboarding/messaging-onboarding_validation.md#to-enable--test`  
> **Meta docs:** [Cloud API Get Started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started), [Webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks), [Messaging Limits](https://developers.facebook.com/docs/whatsapp/messaging-limits), [Pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)

### Answerlattice (Multi-Product Setup)

| #   | Task                                               | Why                                         | Priority                        | Status |
| --- | -------------------------------------------------- | ------------------------------------------- | ------------------------------- | ------ |
| 1   | Create Answerlattice Firebase project in GCP            | Answerlattice runs on separate Firebase project  | P0 (before Answerlattice activation) | ⬜     |
| 2   | Fill ANSWERLATTICE*FIREBASE*\* env vars (.env + Vercel) | Required for Answerlattice Firestore access      | P0 (before Answerlattice activation) | ⬜     |
| 3   | Move Cloud Functions to functions-answerlattice/        | Separate deployment for Answerlattice CFs        | P0 (before Answerlattice activation) | ⬜     |
| 4   | Deploy both function sets                          | MenuList + Answerlattice CFs deployed separately | P0 (before Answerlattice activation) | ⬜     |
| 5   | Enable Answerlattice feature flags one by one           | Phased activation per doctrine              | P0 (before Answerlattice activation) | ⬜     |

> **Full setup guide:** `__docs__/answerlattice/doctrine/10-implementation-action-items.md`

---

## Completed Items

_Move items here when done. Keep as history._

<!-- Example:
### Feature Name
| # | Task | Completed | Date |
|---|------|-----------|------|
| 1 | Did the thing | ✅ | 2026-03-15 |
-->

---

## Related Files

| File                                                           | Scope                                       |
| -------------------------------------------------------------- | ------------------------------------------- |
| `__docs__/production-readiness/launch-prerequisites.md`        | Detailed monitoring setup guide (Steps 1-9) |
| `__docs__/answerlattice/doctrine/10-implementation-action-items.md` | Detailed Answerlattice manual setup steps        |
| `__docs__/messaging-onboarding/messaging-onboarding_runbook.md` | WhatsApp Cloud API provider stance, secrets, monitoring, and non-actions |
| `__docs__/messaging-onboarding/messaging-onboarding_validation.md` | Messaging onboarding enable/test checklist |
| `__docs__/campaigncue/campaigncue-production-implementation-audit.md` | CampaignCue current export/download runtime status and external blockers |
| `__docs__/growthos-addon/growthos-addon_validation.md` | Growth Kits verification and production-readiness hardening notes |
| `__docs__/kitstamp/kitstamp_impl.md` | KitStamp separate-product implementation plan and activation gates |

---

_Last Updated: August 1, 2026_
_Updated By: Codex (CampaignCue Video Reel Studio Firebase access cross-check)_
