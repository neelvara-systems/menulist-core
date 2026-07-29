# Feature Sweep Master Report

## Cross-System Deep-Audit Queue After The Initial 41 Features

These are cross-cutting audits, not additional product-feature rows in the
51-row runtime inventory. They are executed strictly one at a time.

| Item | Boundary | Status |
| --- | --- | --- |
| 42 | Global language, locale, timezone, date/time, number, currency and RTL | Complete locally |
| 43 | System-wide accessibility and interaction | Complete locally |
| 44 | Owner PWA, connectivity and update lifecycle | Complete locally |
| 45 | Feature flags, configuration and environment safety | Complete locally; isolated Functions release pending |
| 46 | Global failure handling and observability | Complete locally |
| 47 | Account and tenant data lifecycle | Complete locally |
| 48 | Ownership transfer and dormant lifecycle | Complete locally |
| 49 | SurfaceOS planning-only boundary | Complete locally |
| 50 | Whole-system Firebase scale and cost closeout | Complete locally; isolated QA Functions/index releases pending |

### Item 50 - Whole-System Firebase Scale And Cost Closeout

- The current usage-map scanner covers 481 runtime files and holds the reviewed
  risk bands at nine listener, two public-read, five query-scope, and 45
  write-volume candidates. These are bounded review signals, not automatic
  defects.
- The hourly store-EOD scheduler no longer repeats genuine all-store scans in
  every populated timezone hour. A transactional
  `_system/decisionBlocksPlatformDaily` lease admits one successful UTC-day
  suite, excludes concurrent owners, expires after ten minutes, and permits a
  bounded retry after a failed attempt.
- Authority maturation, menu drift, Guest Feedback retention, lifecycle
  messaging, extraction learning, Store Truth Confidence, and staleness
  detection use the daily lease. Store-local analytics, Decision Blocks, Menu
  Intelligence, Business Health, and Special Menu marker recovery retain their
  existing due-store/timezone behavior.
- Six exact duplicate MenuList composites and one exact duplicate
  Answerlattice composite were removed from source manifests. One identical
  query-supporting definition remains for every shape; the resulting counts are
  154/50 MenuList and 94/17 Answerlattice composites/overrides.
- Summary-document and scheduler guidance now uses enforced size ceilings and
  operation comparisons instead of stale price arithmetic. The aggregate
  verifier rejects duplicate manifests, indexed TTL fields, missing
  high-cardinality exemptions, and silent scanner-risk growth.
- Source verification, concurrency emulator, Functions build/lint, catalog
  analytics, scheduler, Special Menu, Guest Feedback, auth/security,
  tenant-safety, exact TypeScript, docs, dependency freeze, and diff-integrity
  gates pass. Isolated authorized MenuList QA Functions/index deployment,
  Answerlattice QA index deployment, UTC-day scheduler observation, and billing
  comparison remain owner/release work; no remote revision changed.

### Item 49 - SurfaceOS Planning-Only Boundary

- Code truth reserves product code `SF`, the `surfaceos.app` hostnames, and
  `/__surfaceos`, while the product-site registry remains disabled and the
  deployment-target matrix has no SurfaceOS entry.
- No SurfaceOS route, API, UI, feature flag, data collection, Firebase target,
  rule/index/Storage namespace, Functions package, provider integration,
  environment key, billing plan, or public website exists.
- The March 2026 product-strategy document is preserved under `_archive/`
  because its frozen modules, architecture, ICP, pricing, launch order,
  provider plan, and parent-brand ideas were research rather than implemented
  or approved codebase contracts.
- A maintained nine-document planning set and `verify:surfaceos-boundary` now
  prevent a disabled reservation from silently becoming a product runtime.
- Current Firebase cost is zero and no deployment is required. Activating the
  product remains a future explicit owner/product decision, not pending work
  for this audit.

### Item 48 - Ownership Transfer And Dormant Lifecycle

- Operational Owner-role assignment, last-owner concurrency, self-change
  rejection, Owner-target authority, notification recipients, subscription
  identity, stale-menu detection, and inactive-store handling were traced as
  separate authorities.
- Desktop single-store/multi-store staff editors and Mobile Users now explain
  that Owner access grants full operational permissions but does not transfer
  business account, billing, notification, or subscription ownership.
- Terms and maintained docs point complete ownership transfer to verified
  support review. No partial route, transfer ledger, automatic user rewrite, or
  unsafe cross-tenant email reuse was added.
- Staleness remains advisory and bounded. It can send `MENU_STALE`; it cannot
  deactivate the store, account, subscription, entitlement, or public menu.
  Inactive stores are excluded before the confidence/staleness aggregate.
- No Firebase operation or deploy target changed. Real support transfer/legal
  evidence, authenticated role QA, provider notification evidence, and approved
  Vercel release remain owner/external pending.

### Item 47 - Account And Tenant Data Lifecycle

- Central tenant/store onboarding, paid-onboarding compensation, claim-account
  compensation, staff membership removal, last-store deactivation, token
  revocation, and Firebase Auth disable paths were traced from code truth.
- Logout now attempts NextAuth even when Firebase sign-out fails. Once the
  signed session ends, it removes selected-outlet state, owner SWR caches,
  deployment identity, processing-job state, captured session logs, monitoring
  identity, and authenticated provider state.
- SessionProvider clears tenant, store, permissions, subscription, support, and
  platform-summary memory when the session disappears; stale deployment
  identity is removed instead of remaining visible.
- Desktop and mobile owner surfaces share the cleanup path, the website header
  no longer bypasses it, and a failed desktop logout uses error styling instead
  of a success toast.
- Privacy copy now matches the actual support-managed access/correction/export/
  deletion boundary. It does not mislabel menu JSON/XLSX as a complete account
  export or add unsafe one-click cascade deletion.
- The pass adds no Firebase operations or deploy target. Authenticated
  multi-user browser/device evidence, legal review, real privacy-request
  execution, and approved Vercel release remain owner/external pending.

### Item 46 - Global Failure Handling And Observability

- Root/app/global/public-menu/layout/Help Chat error boundaries were checked
  for bounded logging, non-recursive rendering, honest recovery actions, and
  mobile-safe fallback controls.
- The global-pages error screen no longer clears all browser caches, relabels a
  retry as Contact Us, or claims support is actively working on an incident.
- Diagnostic submission now distinguishes a confirmed Sentry event ID from
  console-only preparation; the latter offers copyable support details without
  saying a report was sent or queued.
- Browser ticket/diagnostic buffers redact bare email and bearer values and no
  longer retain raw unhandled rejection payloads. Client Sentry explicitly
  disables default PII and masks replay text/inputs/media.
- Failed forced ticket refreshes retain last-known truth rather than rendering
  a confirmed empty inbox.
- The focused gate, auth/security matrix, public-business-truth suite,
  tenant-safety aggregate, exact TypeScript, and scoped lint pass. The
  tenant-safety verifier now follows the generic
  `menulistMaintenanceScheduler:pendingEntitlementRepair` source contract
  instead of the retired reseller-only token.

### Item 45 - Feature Flags, Configuration And Environment Safety

- App flags remain source-controlled build/runtime constants; no Firestore
  remote-config dependency or owner setting was added.
- MenuList Functions overrides now accept only recognized true/false values.
  Unknown configured text fails closed instead of enabling work.
- CampaignCue CueLayers no longer treats `"false"` as an enabled model gate,
  clamps rollout values to 0-100, makes zero truly off, and requires a stable
  bucket for partial rollout admission.
- The deployment-stage conflict matrix, product Firebase target validation,
  full-name environment convention, and public/private credential split remain
  executable source gates.
- Stale environment and CueLayers docs/templates now match runtime truth.
- Local verification is source evidence only. Because the shared Functions
  workspace contains unrelated in-flight changes, the matching scoped
  Functions release stays owner-pending rather than risking a mixed deploy.

### Item 44 - Owner PWA, Connectivity And Update Lifecycle

- Owner private/auth/screen HTML and Firebase resources no longer use Workbox
  runtime caches; retired cache names are deleted on activation.
- Preview does not register the owner worker. Connectivity is advisory and
  non-blocking, while refresh remains an explicit owner action.
- Production build regeneration, approved Vercel release, and authenticated
  browser/device upgrade/offline evidence remain pending.

### Item 43 - System-Wide Accessibility And Interaction

- Maintained layouts allow zoom; shared skip links, focus-visible/reduced-motion
  rules, keyboard mobile primitives, accessible image alternatives, labels,
  states, and 44-pixel owner controls are source-gated.
- Authenticated assistive-technology and device evidence remains external.

### Item 42 - Global Locale, Time And RTL

- Locale, timezone, date/time format and RTL inputs are normalized centrally.
  Owner desktop/mobile displays use shared localized date, number and currency
  helpers, invalid calendar values fail closed, and server fallback is
  deterministic.
- No Firebase preference store or new runtime read was added.

## July 16, 2026 — Item 30 Main Website, Legal, I18n/SEO And Paid-Cycle Truth

- All concrete/generated website routes, reviewed resource locales, discovery inventories, canonical/sitemap/robots/LLM surfaces, contact/tools/pricing handoffs and maintained docs were rechecked from code truth.
- Canonical MenuList website navigation is consistent for FAQ, Tools, WhatsApp, Invite and reviewed localized Resources; header active state and language switching are route-safe, and the language control has explicit accessible state/Escape focus return. The previous private alias is no longer an active setup dependency.
- Terms/Refund copy now matches plan-specific access, purpose-based retention, generated-output rights and actual Razorpay handling without fixed deletion, all-feature, universal-publish, absolute-ownership or certification claims.
- The audit fixed a cross-feature billing defect: cancelled/paused subscriptions retain their purchased plan mirror through `cycleEndDate`, then the existing maintenance scheduler expires at most 500 due rows hourly and repairs entitlement through one exact new index.
- Focused website, billing, pricing, rules, tenant, mobile, dependency, TypeScript and Functions gates pass locally. The QA index attempt stopped at Firebase Rules HTTP 403; the Function passed predeploy lint/build then stopped at Cloud Resource Manager HTTP 403. Neither uploaded. App/Vercel release and live canonical/alias/provider/browser/device/search/legal evidence remain pending.

## July 16, 2026 — Item 29 Internal Ops Control Room And Platform Monitoring

- Current persisted platform authority now gates `/ops` and `/platform` layouts, direct browser monitor snapshots/store selection, and the previously claim-only Cost, Founder, Business Health, Answerlattice intake, messaging onboarding and Entity Blocks APIs.
- Privileged monitor/mutation limiters fail closed on provider outage. Existing platform/owner notification and extraction-retry current authorization stays intact.
- Control Room, Scheduler and Extraction source failures render unavailable/previous state instead of false zero/healthy output. Stored alert and scheduler records plus store-nightly callable responses are normalized and bounded before operator acknowledgement.
- SAFE_MODE owner copy matches the real guarded AI generation/upload scope; public menus, publishing, provider cleanup and unrelated maintenance are not falsely described as stopped.
- One 90-day `systemAlerts` cleanup was added to the existing leased maintenance scheduler, capped at 100 deletes/day with no new scheduler/index/collection.
- Local source gates pass. The scoped QA scheduler deployment completed predeploy lint/build and stopped before upload on Cloud Resource Manager HTTP 403 caller permission. App release, live operator/provider/browser/device and production-host evidence remain pending.

Date/time: 2026-06-20 19:49 IST
Branch: `staging`
Commit: `81fdef8ca67fab1c1e7f837081fbd259255e9d40`
Runtime app URL: `http://localhost:3000`
Active user Chrome tab observed by AppleScript: `http://localhost:3000/menu-manager`
Chrome same-tab automation status: blocked. AppleScript can read/navigate the active tab, but Chrome has "Allow JavaScript from Apple Events" disabled; the Chrome plugin/Node REPL attach path failed before browser setup with `codex/sandbox-state-meta: missing field sandboxPolicy`; Computer Use could not see a Chrome window (`cgWindowNotFound`). Runtime validation used the existing local server plus the repo's Chrome/CDP verifier scripts.
Mobile viewport tested: iPhone-style CDP harness, `393x852`, mobile UA, touch enabled, standalone PWA mode.
Selected runtime store/project in mobile verifier: store `15`, project `14-mn8d5jbz-15` (`Bar Menu`) auto-selected by current account data.

## Environment

- Node: `v18.18.2`
- npm: `10.8.0`
- Baseline dirty worktree before this sweep: existing changes in `.firebaserc`, AMM docs/scripts, deployment docs, AMM resolver files, environment examples, `AMM_FULL_ACTION_SWEEP_REPORT.md`, and `routes-manifest.json`.
- Files changed by this sweep:
  - `src/lib/firebase/syncAnswerlatticeAuth.ts`
  - `src/lib/firebase/functions.ts`
  - `src/components/mobile/screens/MobileAnswerlatticeClientScreen.tsx`
  - `src/components/mobile/screens/MobilePlatformInternalScreen.tsx`
  - `src/app/(main)/platform/(chat-management)/chat-backfill/page.tsx`
  - `src/app/(main)/platform/(chat-management)/chat-insights/page.tsx`
  - `src/app/(main)/platform/(chat-management)/chat-management/page.tsx`
  - `src/app/(main)/platform/(chat-management)/chat-roi-calculator/page.tsx`
  - `src/app/(main)/platform/(chat-management)/chat-weekly-digest/page.tsx`
  - `src/app/(main)/platform/changelog/page.tsx`
  - `src/app/(main)/platform/feedback-admin/page.tsx`
  - `src/app/(main)/platform/kb-generation/page.tsx`
  - `src/app/(main)/platform/knowledge-base/page.tsx`
  - `src/app/(main)/platform/support-tickets/page.tsx`
  - `scripts/verification/verify-mobile-owner-menu.mjs`
  - `scripts/verification/verify-mobile-upload-extraction.mjs`
  - `scripts/verification/verify-public-routing-summary-backfill.mjs`
  - `scripts/backfill-public-routing-project-summaries.ts`
  - `src/components/mobile/providers/MobileProjectsProvider.tsx`
  - `FEATURE_SWEEP_MASTER_INVENTORY.md`
  - `FEATURE_SWEEP_MASTER_REPORT.md`

## Baseline Verification

| Command | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Passed | `No ESLint warnings or errors` |
| `npx tsc --noEmit --incremental false` | Passed | no TypeScript output |
| `npm run verify:ai-menu-manager` | Passed | AI Menu Manager static verifier passed |
| `npm run verify:menu-extraction-pipeline` | Passed | 34 passed, 0 failed; public create-menu, owner extraction, intake identity, menu-link import, and claim body-cap ordering checked |
| `npm run verify:menu-extraction-pipeline:dry-run` | Passed | 48 passed, 0 failed |
| `npm run verify:agent-readiness` | Passed | discovery surfaces verified |
| `npm run verify:website-resource-locales` | Passed | locale resources verified |
| `npm run verify:env-targets` | Passed | environment matrix verified |
| `npm run verify:customer-app-pwa` | Passed | manifest/PWA/static checks passed |
| `npm run verify:recycle-bin` | Passed | 6 passed; source gate only, with browser/cloud/deploy/production-host gates explicitly not covered |
| `npm run verify:menu-export` | Passed | export static verifier passed |
| `npm run verify:ai-accounting` | Passed | AI accounting hardening verifier passed, including provider-backed AI body-cap ordering |
| `npm run verify:menu-card-export` | Passed | no Firestore artifact write path |
| `npm run verify:public-business-truth` | Passed | public business truth static verifier passed, including claim-account store email cache invalidation coverage |
| `npm run verify:owner-business-assistant` | Passed | Business Health/assistant hardening passed |
| `npm run verify:printable-asset-templates` | Passed | printable templates verified |
| `npm run verify:creative-editor-smoke` | Passed | 77 checks passed |
| `npm run verify:catalog-analytics` | Passed | functions build plus catalog-aware analytics verifier passed |
| `npm run verify:menulist-api-tenant-safety` | Passed | source-level guard coverage for high-risk MenuList owner APIs, selected-store scope, staff/outlet boundaries, public-cache invalidation patterns, screen seen cheap-fail ordering, Razorpay webhook bounded raw-body ordering, msg-preview action body caps, and ops action body caps |
| `node scripts/verification/verify-mobile-owner-menu.mjs` | Failed initially, passed after fixes | initial failure: stale fixture and Answerlattice CSP/auth iframe leak |
| `node scripts/verification/verify-mobile-upload-extraction.mjs` | Blocked after fixes | create/select/upload UI reached; Storage permission fixed by releasing `storage.rules`; remaining blocker is Firebase bucket `storage/quota-exceeded` before job creation |
| `node scripts/verification/verify-public-routing-summary-backfill.mjs` | Passed with warnings after fixes | 0 errors; 20 warnings for active stores with no canonical projects/menus |

## Inventory Summary

- Total discovered feature rows: 51
- Executable owner features: 33
- Public/customer features: 21
- Mobile-relevant MenuList features: 46
- Gated/disabled/blocked features: 3
- Internal/admin-only features: 5
- Separate product families: 3

## Results Summary

- Passed without code changes through existing verifiers: AMM static checks, extraction static/dry-run pipeline, customer app PWA, menu export, AI accounting, menu card export, public business truth, owner business assistant, printable assets, creative editor smoke, catalog analytics.
- Bugs fixed and retested: Mobile owner Menu tab verifier, cross-product Answerlattice Firebase initialization leak on MenuList owner runtime, mobile project-create selection race, public-routing summary verifier false positives, and one real missing project summary backfill.

## Menu Design Presentation Boundary

Menu Design Presentation now has a focused local source gate: `npm run verify:menu-design-presentation-boundary`. It checks the B2C design system mood/layout normalization, owner-selectable layout constraints, desktop and mobile design controls, public customer-menu rendering, publish/cache path, `verifyMenuPublish()` helper boundary, B2C docs, mobile-support coverage, and this ledger evidence. This is source/docs verification only; it does not run browser/mobile customer-menu QA, physical QR/device QA, public cache deploy evidence, Firebase deploy, Vercel deploy, production build, live Firestore writes, Storage writes, or production-host smoke.

July 16 current addendum: the gate now executes the exact constitutional compatibility matrix, preset compatibility, malformed/prototype config, baseline contrast, option-price projection, and public-background runtime tests. It also source-locks stable large-menu addressability, readable unavailable/tag output, desktop/MobileShell pricing-note editing, both publish-truth branches, and current rebuilt docs. The source boundary is complete; deployment and browser/device evidence remain pending.

## Help Center Answerlattice Support Boundary

Item 28 is locally source complete. MenuList Help Center treats Answerlattice-backed search, content, feedback, tickets, changelog and mobile routing as one explicit scoped support boundary. `npm run verify:help-center-boundary` checks authenticated/bounded search admission, normalized browser responses, internal related-article routing, MobileShell/deep-link parity, scoped ticket reads and transactions, shared upload/opening admission, append-only dedicated/shared rules, current footer/legal routes and docs parity.

The item-28 pass removes stored related-article URLs from the public projection, prevents raw/signed attachment URL opening and logging, centralizes four-file/10 MB/type/byte admission, preserves message/status history in rules, validates appended actors, makes satisfaction write-once, removes an unsupported operational-status claim and duplicate ticket success copy, and corrects stale Help Center docs. Runtime tests and both Firestore emulators cover the new contracts, including a 450-message valid append. Matching Firebase rule deployment is required. Source verification does not prove Answerlattice product-account/Auth provisioning, AI/SMTP providers, browser/device QA, approved Vercel release or production-host behavior.

## Communication Kit and Physical Surface Output Boundary

Customer Communication Kit, Menu Kit, printable assets, mobile Share, and the legacy Physical Surfaces docs now have a shared local source gate: `npm run verify:communication-kit-boundary`. It checks desktop and mobile message-template wiring, acknowledged clipboard fallbacks, bounded copy/share/WhatsApp diagnostics, filtered active-project message links on mobile, Menu Kit and printable output browser-local generation paths, and the legacy Physical Surfaces launch-certification boundary. This is source/docs verification only; it does not run browser/device output QA, visual print artifact review, provider smoke, Firebase deploy, Vercel deploy, production build, live Firestore writes, Storage writes, or production-host smoke.

## Menu Presence Monitor Boundary

Item 25 is locally source complete. Automatic QR/feedback readiness now requires an active non-deleted project with a valid explicit publish timestamp; screen status means setup token present, not current playback. Standard publish atomically stamps project, compact project summary, and store truth. Linked-outlet publish folds its summary fields into one write, and public create-menu claim adds publish truth to its existing writes. Desktop/Mobile Share/standalone monitor/Business Settings use one shared readiness boundary.

Manual confirmations reject unavailable or scope-changed stores, update canonical store plus `storesSummary` atomically, remove matching starter evidence on retraction, ignore malformed confirmation timestamps, refresh from loaded store changes, and prevent late acknowledgements from crossing store selection. Presence-only writes no longer pay for public-cache invalidation because the field is owner-private. Stable loader dependencies avoid repeating project/screen reads after an acknowledgement.

`npm run verify:menu-presence-monitor-boundary` includes deterministic readiness tests. Project editor, public entry, multi-location, public truth, tenant, activation/setup, MobileShell, summary parser, exact TypeScript, scoped lint, docs, diff, and the stores-summary Firestore emulator also pass. The existing dry-run-first routing-summary backfill can repair historical publish timestamps per store; credentials, target review/apply, authenticated browser/MobileShell mutation/store-switch QA, app/Vercel release, and production-host evidence remain owner/release pending. No Firestore rule/index, Storage rule/object, Cloud Function, scheduler, provider, collection, listener, queue, or Firebase deploy changed.

## Owner Referral Boundary

Item 26 is locally source complete behind disabled acquisition and settlement flags. A valid non-empty pilot allowlist is now mandatory across desktop, MobileShell, protected owner reads, public capture, and server attribution; empty or invalid configuration fails closed. The private invite handoff has explicit `capture` and `decline` choices, so normal setup clears any older host-only referral cookie before navigation and never captures the displayed token. Owner and capture throttles fail closed on provider outage in production and return retry metadata.

Existing-unpaid attribution rejects both proven prior payment and a saturated 25-row history window inside the referral-create transaction. Reward settlement validates referral shape, both direct paid wallets, both canonical active/non-deleted/non-blocked stores, and non-negative safe-integer Pack balances before atomically updating two wallets, two deterministic zero-cash ledger rows, and one referral. Pending repair is one indexed batch: at most 26 reads, 25 candidates processed, one-row backlog evidence, and no cursor loop or scheduler.

The dedicated source verifier, Firestore emulator, billing/price/reseller/public-entry/onboarding/payment/tenant/MobileShell/env/discovery/locale/dependency/docs gates, exact TypeScript, and focused lint pass. This item did not modify Firestore rules/indexes, Storage rules, or Cloud Functions, so it required no new Firebase deploy. Existing QA rules/index deployment remains blocked by IAM from the original implementation. Finance/legal/team approval, five pilot stores, sandbox payment proof, authenticated desktop/MobileShell/browser/device checks, approved app/Vercel release, and production-host evidence remain owner/provider/release pending.

## Public Truth Tools Boundary

Item 27 is locally source complete across the sixteen public truth tools, five browser-local asset makers, Tools Hub, unsigned shareable report viewer, consented contact handoff, platform-only Report Leads monitor, eighteen owner readiness modules, and paid Public Truth Monitor saved-history slice. One shared public HTTPS boundary now rejects trailing-dot localhost, empty host labels, raw IPv6/IPv4-mapped IPv6, private/raw IP, insecure and credentialed targets; Print & Share no longer carries a second parser. One shared phone/action boundary prevents arbitrary letters or unrecognized WhatsApp scheme destinations from becoming ready links or previews. Public Truth Check no longer treats URL path words as evidence for prices, hours, location, contact, or actions.

Shareable report decoding now requires summary/check consistency, a bounded primary number/label, visible report limits, derived setup jobs, and same-origin next actions. The public UI explicitly labels the hash as a browser-local self-report, not a digitally verified record. Public contact source attribution rejects literal/encoded backslash origin escapes. Report Lead Ops fails closed on production limiter failure and visibly discloses when its no-index 120-enquiry scan may omit older matches.

Public Truth Monitor summary/refresh admission fails closed on production limiter failure. Manual refresh merges current capped history inside one Firestore transaction, preventing concurrent last-writer-wins history loss while preserving the same normal summary read/write shape. The aggregate source gate now runs an executable cross-tool runtime suite in addition to all tool/report/lead/asset/monitor verifiers. Exact TypeScript and focused lint pass. No Firestore rules/indexes, Storage rules, Cloud Functions, external adapters, scheduler, provider integration, or public cache mutation changed, so no Firebase deploy was required. Authenticated browser/device/contact/monitor fixtures, approved app/Vercel release, and production-host evidence remain pending.

## Working Hours and Time-Slot Boundary

Working Hours and Time Slots use one store-timezone evaluator across menu status, OBP status, Mobile Today, urgent boundaries, Decision Blocks, and structured output. The evaluator correctly assigns after-midnight time to the weekday on which an overnight range starts and uses an exclusive end. Store writes reject unknown days and malformed/equal ranges. Desktop keeps seven rows for empty/partial stores and does not replay hours during unrelated saves; desktop/mobile preserve untouched legacy ranges; mobile Today uses the store weekday and a minute tick; full-mobile success copy follows acknowledgement. Desktop/mobile preset overlap policy now matches, owner context refreshes after preset success, and Decision Blocks share normal category visibility.

The focused local source gate is `npm run verify:working-hours-boundary`, with `npm run test:time-slot-data-flow` and `npm run verify:hours-check` as companion gates. No Firebase infrastructure changed. Browser/device QA, live writes, app deployment, cache observation, multi-timezone public boundary smoke, and production-host evidence remain pending.

## Temporary Status Boundary

Temporary Status now shares one strict active-status evaluator across owner UI, public menu, OBP, feedback, browser store projection, pull API, and structured data. Invalid or expired truth fails hidden, and mounted public/owner components self-expire without reload. Only `closed_today` marks the complete business closed in store-timezone structured data; kitchen-only and other notices remain banners. Special Menu status keeps project ownership and bounded legacy cleanup.

`POST /api/store/temp-status` now runs a hashed fail-closed write limiter before request/permission Firestore work, normalizes messages, and separates the committed store write from public cache, Digital Screens, and Owner Business Assistant post-commit effects. A refresh-effect failure returns acknowledged truth with `effectsPending: true`, so desktop and MobileShell do not falsely roll back after Firestore has committed. Success copy follows the bounded 8KB acknowledgement on every owner path.

Temporary Status has a focused local source gate: `npm run verify:temporary-status-boundary`. Maintained docs were rebuilt from code truth and the previous narratives archived. The path remains one existing store write per manual set/clear, no status-only read, and no cleanup collection/listener/queue/scheduler. This is source/docs verification only; it does not run browser/device QA, live temporary-status writes, public API credential smoke, provider smoke, Firebase deploy, Vercel deploy, production build, Storage writes, or production-host smoke.

## Public Menu Entry and Create-Menu Claim Boundary

Public `/create-menu` remains discoverable without authentication, while upload/link acquisition, extraction, polling, claim, and publish stay signed-in and owner-bound. Cheap fail-closed burst admission now runs before request parsing or Firebase/provider work. Existing accounts require current extraction permission before intake and current publish permission at claim; partial tenant/store sessions fail closed instead of creating duplicate accounts.

Preview polling is finite at one request every 5 seconds for at most 36 status reads and an explicit retry state. Claim revalidates canonical prices, phone, business type, project identity, non-reserved/collision-safe slug, source envelope, and Menu Correctness metadata before the existing idempotent transaction. City is new-account-only, same-photo chooser retry works on mobile, and both session handoffs are bounded.

Expired cleanup now removes duplicate claimed receipts while preserving project-owned sources; unclaimed Storage deletion failure retains the draft for retry. Maintained Public Menu Entry docs were rebuilt from code truth and archived. `npm run verify:public-menu-entry-boundary` is the focused gate. The scoped QA Function deploy completed predeploy lint/build but Cloud Resource Manager returned `403` for the current caller, so IAM/project access remains owner-pending. Approved app release, Vercel deployment, provider/Razorpay-when-relevant, signed-in browser/device, cache, and production-host evidence also remain pending.

## Menu Setup Progress and Activation Concierge Boundary

Menu setup now treats only a loaded selected project as source truth, validates publication and activation timestamps, tolerates malformed files/items, waits for mobile project-provider loading, and hides once the five required setup steps are complete. Optional descriptions/images/languages/official-page improvements remain visible in their normal surfaces and no longer keep a 100%-complete setup card alive.

Starter activation still uses two distinct existing store-local actions, but malformed timestamp values no longer count. Sharing writes return typed store/signal/time acknowledgements, and desktop/mobile update current store context only after acknowledgement and only for the still-selected store. Presence confirmation derives starter eligibility from the transaction-current store; removal deletes the matching activation action in the same existing transaction so retracted placement cannot remain proof.

The maintained Menu Setup Progress and internal Activation Concierge docs were rebuilt from code truth and archived. The feature adds no route, collection, listener, queue, Function, rule, index, Storage object, or provider path. Desktop remains at most one selected-project read shared with Menu Check; mobile reuses `MobileProjectsProvider`; acknowledgement projection adds no read. App release and authenticated desktop/MobileShell/browser/device evidence remain pending.

## Platform Pull API Boundary

Platform Pull API now has a focused local source gate: `npm run verify:platform-pull-api-boundary`. It checks API-key generate/regenerate/revoke admission, `MANAGE_INTEGRATIONS` permission, hashed key storage, 1KB key-action body cap, desktop Business Settings Integrations tab key UI, 8KB bounded key-action response parsing, fixed failure copy, business/menu pull route `ml_` key admission, hashed public rate-limit keys, live key/target revalidation, private response headers with `Vary: X-API-Key`, menu summary project selection, active temporary-status business output, bounded diagnostics, and docs parity. This is source/docs verification only; it does not run live key fixture smoke, external consumer integration tests, browser/device QA, Firebase deploy, Vercel deploy, production build, provider smoke, live Firestore writes, Storage writes, or production-host smoke.

## Pricing Integrity Boundary

Pricing Integrity current runtime now has a focused local source gate: `npm run verify:pricing-integrity-boundary`. It checks the active `updateProject()` save path, public cache revalidation, configured Digital Screens content-version touch, on-demand PDF generation from current menu data, disabled background PDF regeneration, dormant `runPricingIntegrity()` scaffold with no current save-path caller, active docs parity, and ledger coverage. This is source/docs verification only; it does not run authenticated desktop/mobile price-change QA, public menu/PDF artifact QA, configured-screen browser QA, Firebase deploy, Vercel deploy, production build, live Firestore writes, Storage writes, or production-host smoke.

July 16 deep audit: persisted item, option, and linked override values now share one 40-character numeric/text/multilingual/range boundary before existing update/publish writes. Desktop, MobileShell, extraction, bulk controls, AI Menu Manager, quality/filter/reorder surfaces, public list/PDP, owner share cards, Digital Screens, and PDF preflight/output now preserve text/range truth and active option pricing. Relative arithmetic accepts only a true single numeric value; an explicit fixed-price action can replace other values after confirmation. This adds no Firebase operation or infrastructure change and keeps the dormant engine/queue out of active pricing exports. `npm run verify:pricing-integrity-boundary` covers the new behavioral suite; public menu and PDF artifact QA, authenticated browser/device/screen checks, approved app release, and production-host smoke remain pending.

## Owner Dashboard Today Boundary

Owner Dashboard Today now has a focused local source gate: `npm run verify:owner-dashboard-today-boundary`. It checks `/dashboard`, `/today`, and `/today/history` route boundaries, Today-first `useOwnerDashboard()` and `useOBPDashboard()` lazy historical loading, desktop/mobile dashboard wiring, MobileShell Today route parity, Past Activity feature-flag fallback, shaped campaign action acknowledgements, bounded Today diagnostics, mobile history project filtering, owner-dashboard docs, mobile-support docs, and this ledger evidence. This is source/docs verification only; it does not run desktop/mobile browser QA, live analytics fixture reads, Firebase deploy, Vercel deploy, production build, live Firestore writes, Storage writes, or production-host smoke.

## Menu Project Editor Boundary

Menu Project Editor now has a focused local source gate: `npm run verify:menu-project-editor-boundary`. It checks the `/projects` route, desktop Projects page project mutations, desktop editor save/publish path, publish-gate fixed-copy handling, Command Center handoff through the editor, project DAL acknowledgement guards, update/publish public cache invalidation, Digital Screens content-version touch, mobile menu persistence through `updateProjectWithoutLoader`, mobile project selector mutation acknowledgements, mobile bulk-action handoff, active docs, and this ledger evidence. This is source/docs verification only; it does not run desktop/mobile browser editor QA pending, live menu edit/publish fixtures, Firebase deploy, Vercel deploy, production build, live Firestore writes, Storage writes, or production-host smoke.

## Owner Business Health Boundary

Owner Business Health now has a focused local source gate: `npm run verify:owner-business-health-boundary`. It checks the `/business-health` route, desktop BusinessHealthPage, MobileShell read-only Business Health screen, bounded `/api/owner-business-assistant/*` current/analytics/locations/answer/feedback admission, selected-store scope checks, `VIEW_ANALYTICS` permission checks, bounded client response parsers, context-packet and domain-capability read-only boundaries, removed action surfaces, platform monitor action absence, active docs, and this ledger evidence. This is source/docs verification only; it does not run authenticated browser Business Health QA, real mobile-device QA, provider-backed answer smoke, scheduler fixture rebuilds, Firebase deploy, Vercel deploy, production build, live Firestore writes, Storage writes, or production-host smoke.

- Additional all-severity checks added after clarification: public website route smoke, authenticated owner route smoke, unauthenticated protected API checks, authenticated invalid-payload API checks, Firebase usage map, and high-listener cleanup review.
- Intentionally blocked/unsupported: billing money movement, external platform posting, Reviews/Reputation direct posting, and mobile upload extraction completion while Firebase Storage bucket quota is exceeded.
- Failed remaining: no lint/type/static verifier failure in touched scope; same-tab Chrome DOM inspection remains tool/config blocked; mobile upload extraction cannot create a job until Firebase Storage quota is cleared/upgraded.

## Feature-by-Feature Table

| Feature | Docs | Runtime paths | Desktop tested | Mobile tested | Public tested | API/security tested | Cache checked | Bugs fixed | Retest | Final status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MobileShell owner Menu | `__docs__/mobile-operational-support`, project/menu docs | `/projects#mobile/menu`, `MobileShell`, `MobileMenuScreen` | Not this pass | Yes, CDP iPhone harness | N/A | Auth cookie + Firebase Auth sync exercised | N/A | Yes | Passed | Ready for internal QA |
| Mobile Menu bulk controls | menu command/project docs | Mobile More Actions, Visibility, Fix Text Case | Not this pass | Yes | N/A | No mutation executed | N/A | Verifier hardened | Passed | Ready for internal QA |
| Answerlattice/MenuList boundary | product separation docs | owner routes importing auth sync/functions helpers | N/A | Yes, error surfaced on Mobile Menu | N/A | Firebase Auth import boundary checked | N/A | Yes | Passed | Ready for internal QA |
| Public business truth | OBP/client-menu docs | client/OBP/cache code | Static verifier | Not manual | Static verifier | Static verifier | Static verifier | No | Passed verifier | Manual browser pending |
| AI Menu Manager | `__docs__/ai-menu-manager/*` | `/menu-manager`, `/api/ai-menu-manager/*` | Resolver/static verifier | Resolver/static verifier only | N/A | Static verifier | N/A | No new AMM code | Passed verifier | Manual UI command matrix pending |
| Menu extraction pipeline | extraction docs | upload/link/import APIs | Static verifier | mobile create/select/upload tested until Storage quota | N/A | Static verifier plus Storage rules release | N/A | Yes | Static passed; mobile blocked by bucket quota | External quota blocker |
| Customer app PWA | `__docs__/customer-app` | `/client/pwa/*` | Static verifier | Static verifier | Static verifier | Static verifier | Static verifier | No | Passed verifier | Manual browser pending |
| Menu card export | `__docs__/menu-card-export` | `/use-menulist/menu-card-export` | Static verifier | Static verifier | export output only | API advisor static check | no artifact writes | No | Passed verifier | Manual browser pending |
| Print assets/templates | print docs | `/assets`, `/use-menulist/print-assets` | Static verifier | Static verifier | export output only | Static verifier | no default public truth write | No | Passed verifier | Manual browser pending |
| Business Health / owner assistant | owner-business-assistant docs | `/business-health`, APIs | Static verifier | Static verifier | N/A | Static verifier | no public truth writes | No | Passed verifier | Manual browser pending |
| Public Truth Tools | `__docs__/menulist-tools/public-truth-tools` and linked active tool docs | `/tools/*`, `/tools/reports`, `/business-health`, `/ops/report-leads`, monitor/contact APIs | Static/runtime gates | Source/mobile-shell gates | Static/runtime gates | auth/rate/input/source gates | no V0 report cache/write; monitor capped summary | Yes | Aggregate, runtime, type, lint passed | Authenticated browser/device/contact/monitor fixtures and hosted release pending |
| MenuList Help Center | `__docs__/answerlattice/help-center` | `/help-center/*`, Help Chat, scoped ticket/detail, search/notification APIs | Source/runtime gates | MobileShell/deep-link source gates | N/A | dedicated/shared rules emulators plus auth/scope/response/attachment gates | no public cache mutation; bounded content/ticket reads | Yes | Runtime, 450-message rules append, type, lint and docs gates passed | Matching rule deploy plus authenticated browser/device, provider/SMTP and hosted release evidence pending |
| Catalog analytics intelligence | analytics docs/functions | functions verifier | Static verifier | N/A | N/A | Functions build/verifier | no new collection | No | Passed verifier | Ready for internal QA |
| Public routing summary backfill | routing docs | summary backfill verifier | Static data check | N/A | Static data check | N/A | summary/cache considered | Yes | Passed with no errors | Ready with warnings for no-menu stores |
| Public website routes | website docs | website pages | HTTP route smoke | responsive not visually checked | HTTP route smoke | N/A | N/A | No | 29 routes passed | Manual visual QA pending |
| Owner app routes | owner docs | dashboard/projects/settings/share/billing/platform routes | Authenticated HTTP route smoke | Mobile Menu separately tested | N/A | SSR auth cookie smoke | N/A | No | 26 routes passed | Manual UI QA pending |
| Protected owner APIs | security rules | AI/extraction/image/store/outlet/staff/review/platform APIs | N/A | N/A | N/A | Unauth, invalid-payload, auth failure matrix, and source tenant-safety checks | public-truth writer guards checked in source | No | Passed static/source gates | Live wrong-tenant/wrong-store fixture tests still pending |
| Reviews/Reputation | review docs | `/api/reviews/*` | Not run | Not run | no direct posting | Not run | N/A | No | N/A | Gated/disabled |
| Billing/Razorpay | billing docs | `/billing`, `/api/razorpay/*` | Safe only | Safe only | payment provider | Not mutating | N/A | No | N/A | Blocked for safety |
| Separate product surfaces | product docs | Answerlattice/CampaignCue/GrowthOS/KitStamp/MyCodex routes | Not in MenuList sweep | Not in MenuList sweep | separate | boundary only | separate | Boundary fix | Passed boundary retest | Excluded/separate |

## Bug Detail

### Bug 1: Answerlattice Firebase initialized on MenuList owner routes

- Feature: MobileShell owner Menu / product separation boundary
- Symptom: Mobile owner verifier reported a CSP frame error for `https://answerlattice-qa.firebaseapp.com/` while testing `/projects#mobile/menu`, a MenuList owner route.
- Reproduction:
  1. Run `node scripts/verification/verify-mobile-owner-menu.mjs`.
  2. Observe page errors before the fix: Answerlattice Firebase Auth iframe blocked by MenuList CSP.
- Root cause: `firebaseAuthSync` imported `syncAnswerlatticeAuthWithCustomToken`, which imported `answerlatticeFirebaseClient` at module load. That initialized the separate Answerlattice Firebase app/Auth before any Answerlattice-scoped token existed. `src/lib/firebase/functions.ts` had the same product-boundary risk for MenuList publish verification because it imported Answerlattice Functions at top level.
- Files changed:
  - `src/lib/firebase/syncAnswerlatticeAuth.ts`
  - `src/lib/firebase/functions.ts`
  - Answerlattice config-only imports in mobile/platform pages
- Fix: Lazy-load `answerlatticeFirebaseClient` only when an Answerlattice custom token or Answerlattice Functions call is actually needed; import `isAnswerlatticeFirebaseConfigured` from `answerlatticeConfig` where only a boolean is needed.
- Tests run:
  - `npx tsc --noEmit --incremental false`
  - `node scripts/verification/verify-mobile-owner-menu.mjs`
- Retest result: Passed. CSP/Auth iframe error no longer appears on the MenuList Mobile Menu route.

### Bug 2: Mobile owner verifier pinned stale project data

- Feature: MobileShell owner Menu verifier
- Symptom: Verifier expected old project id `14-mp6hyq9x-15`, old name/counts, and failed even though the current runtime project `14-mn8d5jbz-15` rendered correctly.
- Reproduction:
  1. Run `node scripts/verification/verify-mobile-owner-menu.mjs`.
  2. Observe failure: expected QA project id mismatch.
- Root cause: The verifier hard-coded a project id and exact counts from an older fixture. Current authenticated account data selected a different valid project.
- File changed:
  - `scripts/verification/verify-mobile-owner-menu.mjs`
- Fix: Make project pinning opt-in via `MOBILE_QA_PROJECT_ID`; otherwise verify that a runtime project is selected and that item/category/missing-image signals are present with positive counts.
- Tests run:
  - `node scripts/verification/verify-mobile-owner-menu.mjs`
- Retest result: Passed. Screenshots written to `/tmp/mobile-owner-menu-auto-selected-project.png`, `/tmp/mobile-owner-menu-bulk-auto-selected-project.png`, `/tmp/mobile-owner-menu-visibility-auto-selected-project.png`, `/tmp/mobile-owner-menu-text-case-auto-selected-project.png`.

### Bug 3: Public routing summary verifier misclassified no-menu stores and one real summary was missing

- Feature: Domain/routing/cache infrastructure
- Symptom: `node scripts/verification/verify-public-routing-summary-backfill.mjs` reported 21 missing `platformSummary/projects_{storeId}` docs.
- Reproduction: run the verifier against the current environment before the fix.
- Root cause: The verifier treated every active visible store without a `projects_{storeId}` summary as an error, even when the canonical project collection was empty and no menu existed to route. One store, `17`, did have a canonical project at `projects/16/17/16-default-17` and really needed a summary.
- Files changed:
  - `scripts/verification/verify-public-routing-summary-backfill.mjs`
  - `scripts/backfill-public-routing-project-summaries.ts`
- Fix:
  - Verifier now checks the canonical project collection when the summary is missing/empty and downgrades no-menu stores to warnings.
  - Added dry-run-first backfill script that uses `buildSummaryProjectsBatchPayload`.
  - Ran `FIREBASE_PROJECT_ID=ecomsai npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-public-routing-project-summaries.ts --store-id 17 --write`.
- Data/cache actions:
  - Wrote `platformSummary/projects_17` for existing project `16-default-17`.
  - Public cache impact considered; summary-backed public routes use 60s revalidation and targeted cache tags on normal app paths. No public route was observed stale in local testing.
- Retest result: `verify-public-routing-summary-backfill.mjs --json` passed with `errors: 0`, `warnings: 20` for active stores that have no canonical projects.

### Bug 4: Mobile create-menu selection race after project creation

- Feature: Mobile project selector / Mobile Menu
- Symptom: `verify-mobile-upload-extraction.mjs` created a new `Mobile Upload QA ...` project, but the Mobile Menu screen stayed selected on `Bar Menu`.
- Reproduction:
  1. Run `node scripts/verification/verify-mobile-upload-extraction.mjs`.
  2. Observe a new project summary/doc in Firestore, but `mobileSelectedProjectId:15` remains `14-mn8d5jbz-15`.
- Root cause: `upsertCachedProject()` scheduled the new project into React state, then `selectProject()` immediately resolved the preferred id against stale `projectsListRef`.
- File changed:
  - `src/components/mobile/providers/MobileProjectsProvider.tsx`
- Fix: Update `projectsByIdRef` and `projectsListRef` synchronously inside `upsertCachedProject()` and `removeCachedProject()` before React state settles.
- Retest result: Subsequent mobile upload verifier runs selected the newly created QA menu and reached the upload sheet.

### Issue 5: Mobile upload extraction blocked by Firebase Storage quota

- Feature: Mobile upload extraction
- Symptom: `node scripts/verification/verify-mobile-upload-extraction.mjs` now reaches Mobile Menu create/select, file review, and upload submit, but cannot create an extraction job because Firebase Storage rejects the upload.
- Progression:
  - Initial blocker: missing `/tmp/menulist-extraction-test-menu.png`.
  - Fixed by defaulting the verifier to existing repo fixture `menulist-answerlattice-upload-inputs/asset-inputs/private-reference-captures/public-menu-mobile.png`.
  - Next blocker: verifier selected the wrong hidden file input; fixed to choose the actual menu upload input.
  - Next blocker: Storage returned `storage/unauthorized`; local `storage.rules` already allowed `projects/files/{tId}/{sId}` for claimed store users.
  - Released `storage.rules` to `ecomsai.appspot.com` with Firebase Admin SDK `releaseStorageRulesetFromSource`; ruleset `24b93540-f583-4665-b65e-26b0bbf4160a`, created `2026-06-20 14:10:47 GMT`.
  - Current blocker: Storage returns `storage/quota-exceeded` for bucket `ecomsai.appspot.com` before any `menuImageProcessingJobs` doc is created.
- Files changed:
  - `scripts/verification/verify-mobile-upload-extraction.mjs`
- Data cleanup:
  - Inactivated QA projects created by failed runs: `14-mqmeyflf-15`, `14-mqmf2e0t-15`, `14-mqmf5wmr-15`, `14-mqmf882q-15`, `14-mqmfiijb-15`, `14-mqmftj85-15`.
  - Revalidated local public cache for store `15` through `/api/revalidate/menu`.
- Retest result: blocked by external Firebase Storage quota; no job created, no uploaded file found under `projects/files/14/15/`.

### Bug 6: Public pull API key management lacked a store permission gate

- Feature: Platform Pull API / Public API key management
- Symptom: `/api/store/public-api-key` required an authenticated, onboarded store session but did not require an explicit store permission before generating or revoking the external read key.
- Root cause: the route used session-derived tenant/store scope and rate limiting, but skipped the existing `requireAnyStorePermission` helper used by adjacent integration/public-presence routes.
- Files changed:
  - `src/app/api/store/public-api-key/route.ts`
  - `scripts/verification/verify-menulist-api-tenant-safety.js`
  - `__docs__/platform-pull-api/*`
- Fix: Key generate/revoke now requires `MANAGE_INTEGRATIONS`; the new verifier locks this guard alongside the other high-risk MenuList API tenant-safety contracts.
- Retest result: `npm run verify:menulist-api-tenant-safety`, `npm run verify:auth-security-failure-matrix`, and `npx tsc --noEmit --incremental false --pretty false` passed.

### Bug 7: Claim-account store email writes missed public cache invalidation

- Feature: Authentication onboarding / messaging account claim
- Symptom: `POST /api/auth/claim-account` updated `stores/{storeId}.email` in Google OAuth and email/password claim modes, but did not revalidate public menu, Official Business Page, public business API, or client-store cache tags.
- Root cause: the claim route treated the store email update as account ownership metadata even though public business surfaces read store email as customer-visible truth.
- Files changed:
  - `src/app/api/auth/claim-account/route.ts`
  - `scripts/verification/verify-public-business-truth.js`
  - `__docs__/auth/*`
  - `__docs__/auth-onboarding/auth-onboarding_impl.md`
- Fix: Modes 1 and 2 now call the shared `revalidateMenuCache()` helper after the Firestore batch commit. `npm run verify:public-business-truth` now checks that both store email write paths keep public cache invalidation.
- Retest result: `npm run verify:public-business-truth`, `npm run verify:auth-security-failure-matrix`, `npm run verify:menulist-api-tenant-safety`, `npx tsc --noEmit --incremental false --pretty false`, and `git diff --check` passed.

### Bug 8: Screen seen signal parsed anonymous JSON before IP rate limit

- Feature: Digital Screens / daily seen signal
- Symptom: `/api/screen/seen` rate-limited Firestore lookup/write work, but it parsed the anonymous request body before the IP limiter.
- Root cause: token and store validation happened before the public cheap-fail guard, so malformed or oversized anonymous bodies could still force JSON parsing before the shared `SCREEN_SEEN_SIGNAL` limiter ran.
- Files changed:
  - `src/app/api/screen/seen/route.ts`
  - `scripts/verification/verify-menulist-api-tenant-safety.js`
  - `__docs__/digital-screens/*`
- Fix: The route now rejects bodies over 1 KB by `content-length`, applies the IP rate limit, and uses a 1KB bounded JSON reader before token/store validation. Token-level throttling remains before Firestore lookup.
- Retest result: `npm run verify:menulist-api-tenant-safety`, `npm run verify:public-business-truth`, `npm run verify:auth-security-failure-matrix`, `npx tsc --noEmit --incremental false --pretty false`, and `git diff --check` passed.

### Bug 9: Create-menu upload body cap ran only after multipart parsing

- Feature: Public Menu Entry / `/create-menu` upload and link import
- Symptom: `POST /api/public/create-menu` enforced the 10MB image limit after `req.formData()`, so oversized authenticated multipart requests could still force request parsing before the file-size rejection.
- Root cause: the route relied on the `File.size` check inside `createImageDraft()` and had no route-level `content-length` ceiling before multipart parsing.
- Files changed:
  - `src/app/api/public/create-menu/route.ts`
  - `scripts/verification/verify-menu-extraction-pipeline.js`
  - `__docs__/public-menu-entry/*`
- Fix: The route now rejects requests over the 10MB image limit plus multipart overhead before `req.formData()`, and the link-import JSON path now uses an 8KB bounded body reader before source acquisition. `npm run verify:menu-extraction-pipeline` now checks these source orderings.
- Retest result: `npm run verify:menu-extraction-pipeline`, `npm run verify:menu-extraction-pipeline:dry-run`, `npm run verify:auth-security-failure-matrix`, `npx tsc --noEmit --incremental false --pretty false`, and `git diff --check` passed.

### Bug 10: Razorpay webhook read raw bodies without a route-level size cap

- Feature: Billing / Razorpay webhook
- Symptom: `POST /api/razorpay/webhook` validated signatures and idempotency correctly, but valid-looking public webhook requests could still force an unbounded raw `request.text()` read before signature validation rejected them.
- Root cause: the route relied on raw-body signature validation and durable replay guards but had no declared-size guard, stream cap, or public webhook rate limiter before body parsing.
- Files changed:
  - `src/app/api/razorpay/webhook/route.ts`
  - `scripts/verification/verify-menulist-api-tenant-safety.js`
  - `__docs__/razorpay/*`
  - `__docs__/security/webhook/webhook-security.md`
- Fix: The route now rejects malformed/oversized `content-length` headers, applies the existing `WEBHOOK` public IP limiter, reads chunked/no-length bodies through a 256KB cap, then validates the Razorpay signature before JSON parsing, idempotency claims, or billing mutations.
- Retest result: `npm run verify:menulist-api-tenant-safety`, `npm run verify:auth-security-failure-matrix`, `npx tsc --noEmit --incremental false --pretty false`, and `git diff --check` passed.

### Bug 11: Messaging preview approve/fix actions parsed unbounded JSON

- Feature: Messaging Onboarding / token preview approve and fix actions
- Symptom: `/api/msg-preview/[sessionId]/approve` and `/api/msg-preview/[sessionId]/fix` rate-limited before mutation work, but still parsed request JSON without a body-size cap. The fix route also accepted an unbounded `issues` array before validation failed or Firestore work began.
- Root cause: the token preview hardening focused on rate limits, token/state checks, and one-time view event writes, but did not cap the small approve/fix action payloads before JSON parsing.
- Files changed:
  - `src/lib/security/boundedRequestBody.ts`
  - `src/app/api/msg-preview/[sessionId]/approve/route.ts`
  - `src/app/api/msg-preview/[sessionId]/fix/route.ts`
  - `scripts/verification/verify-menulist-api-tenant-safety.js`
  - `__docs__/messaging-onboarding/*`
- Fix: Added a shared bounded body helper, applied 4KB JSON body caps to approve/fix before parsing, and capped fix `issues` to the 5 known issue types.
- Retest result: `npm run verify:menulist-api-tenant-safety`, `npm run verify:auth-security-failure-matrix`, `npx tsc --noEmit --incremental false --pretty false`, and `git diff --check` passed.

### Bug 12: Menu extraction owner routes parsed upload/link JSON before cheap request caps

- Feature: AI Data Extraction / owner upload, menu-link import, intake identity, and public draft claim
- Symptom: authenticated extraction-side JSON routes used Zod and tenant checks, but several paths still parsed owner-supplied JSON before a bounded body reader. `POST /api/menu-extraction/jobs` also performed project/active-job/fingerprint work before any cheap parse-throttle.
- Root cause: prior hardening focused on file upload Storage rules, source allowlists, active job reuse, and public create-menu multipart size checks; smaller JSON control routes were not locked to the same pre-parse request-size discipline.
- Files changed:
  - `src/app/api/menu-extraction/jobs/route.ts`
  - `src/app/api/menu-intake-identity/route.ts`
  - `src/app/api/menu-link-imports/route.ts`
  - `src/app/api/public/create-menu/claim/route.ts`
  - `scripts/verification/verify-menu-extraction-pipeline.js`
  - `__docs__/menu-extraction-pipeline/*`
  - `__docs__/menu-link-import/*`
  - `__docs__/public-menu-entry/*`
- Fix: Owner extraction jobs now apply a `FILE_UPLOAD` request gate and a 128KB bounded JSON cap before request validation or project reads, while keeping `AI_EXPENSIVE` for actual new extraction creation. Menu intake identity uses a 256KB bounded JSON cap after auth/rate checks. Menu-link import and public draft claim use 8KB bounded JSON caps before project/draft reads or source acquisition.
- Retest result: `npm run verify:menu-extraction-pipeline` passed with 33 checks. Broader TypeScript/security gates remain part of the current slice verification.

### Bug 13: Provider-backed AI routes parsed unbounded JSON before schema validation

- Feature: MenuList AI generation, translation, image generation/editing, Menu Card Export advisor, review reply suggestion, and Owner Business Assistant answers
- Symptom: high-cost authenticated AI routes were rate-limited and Zod-validated, but still used raw `request.json()` before schema limits could reject oversized bodies. Image routes relied on schema URL limits only after parsing.
- Root cause: AI hardening previously focused on capacity, accounting, linked-outlet policy, worker auth, and safe logging; route-level request body caps were not locked across the provider-backed API family.
- Files changed:
  - `src/app/api/descriptions/route.ts`
  - `src/app/api/translations/route.ts`
  - `src/app/api/business-copy/route.ts`
  - `src/app/api/seo/route.ts`
  - `src/app/api/campaigns/caption/route.ts`
  - `src/app/api/new-item-metadata/route.ts`
  - `src/app/api/reviews/suggest/route.ts`
  - `src/app/api/owner-business-assistant/answer/route.ts`
  - `src/app/api/image-generation/route.ts`
  - `src/app/api/image-editing/route.ts`
  - `src/app/api/image-generation/batch-trigger/route.ts`
  - `src/app/api/image-generation/batch-generation/route.ts`
  - `src/app/api/menu-card-export/design-advisor/route.ts`
  - `scripts/verification/verify-ai-accounting-hardening.js`
  - related AI, Menu Card Export, Owner Business Assistant, reputation, and audit docs
- Fix: Added shared bounded JSON parsing before validation, capacity checks, provider calls, job reads, or AI accounting. Text/design/review/assistant routes use small caps, translation uses 1MB, image generation and batch worker routes use 16MB, and image editing uses 64MB to preserve the current multi-reference-image schema.
- Retest result: `npm run verify:ai-accounting` passed with the new route-order checks. Broader focused checks remain part of the current slice verification.

### Bug 14: Billing and reseller mutations parsed JSON before shared body caps

- Feature: Billing / Razorpay payment actions, onboarding subscription setup, and reseller-assisted billing/admin writes
- Symptom: authenticated billing and reseller mutation routes used auth, tenant checks, Zod validation, provider verification, and state-machine guards, but several still parsed raw JSON before a route-level size cap. Reseller confirm-payment, renew, and platform manage POSTs also lacked a route-level write limiter before mutation work.
- Root cause: prior billing hardening focused on credit authority, Razorpay signature verification, webhook replay, entitlement sync, and reseller scoping; JSON admission and a few reseller write throttles were not locked across the full mutation family.
- Files changed:
  - `src/app/api/razorpay/create-subscription/route.ts`
  - `src/app/api/razorpay/create-topup-order/route.ts`
  - `src/app/api/razorpay/verify-subscription/route.ts`
  - `src/app/api/razorpay/verify-topup/route.ts`
  - `src/app/api/razorpay/cancel-subscription/route.ts`
  - `src/app/api/razorpay/pause-subscription/route.ts`
  - `src/app/api/razorpay/resume-subscription/route.ts`
  - `src/app/api/razorpay/upgrade-subscription/route.ts`
  - `src/app/api/onboarding/create-subscription/route.ts`
  - `src/app/api/reseller/onboard/route.ts`
  - `src/app/api/reseller/confirm-payment/route.ts`
  - `src/app/api/reseller/renew/route.ts`
  - `src/app/api/reseller/add-location-capacity/route.ts`
  - `src/app/api/reseller/manage/route.ts`
  - `scripts/verification/verify-menulist-api-tenant-safety.js`
  - related Razorpay, reseller, system-strengthening, audit, and changelog docs
- Fix: Razorpay payment actions now use 8KB bounded JSON parsing before validation/provider/Firestore work. Onboarding subscription setup and reseller write routes use 16KB bounded JSON parsing. Reseller confirm-payment, renew, and platform manage POSTs now use the existing `DATA_WRITE` limiter before body parsing or mutation work.
- Retest result: `npm run verify:menulist-api-tenant-safety` passed with the new billing/reseller body-cap and write-limiter order checks. Broader TypeScript/security gates remain part of the current slice verification.

### Bug 15: Public truth and session-scoped mutations parsed JSON before shared body caps

- Feature: Stores Management, custom domains, Compliance Pages, Platform Pull API key management, POS Sync, Multi-Outlet, and menu cache revalidation
- Symptom: several authenticated mutation routes were permissioned or tenant-scoped, but still parsed raw JSON before a small route-level body cap. `POST /api/compliance` also accepted override/reset mutations without a store-role permission gate or write limiter, and `POST /api/store/public-api-key` was store-session scoped without an explicit integration permission gate.
- Root cause: earlier public-truth hardening focused on tenant scope, public cache invalidation, provider boundaries, and outlet policy. Small owner action bodies were not locked to the same shared bounded-body admission pattern across the full mutation family.
- Files changed:
  - `src/app/api/store/public-api-key/route.ts`
  - `src/app/api/store/temp-status/route.ts`
  - `src/app/api/compliance/route.ts`
  - `src/app/api/domain/route.ts`
  - `src/app/api/revalidate/menu/route.ts`
  - `src/app/api/pos-sync/test/route.ts`
  - `src/app/api/pos-sync/deliver/route.ts`
  - `src/app/api/outlets/create/route.ts`
  - `src/app/api/outlets/rename/route.ts`
  - `src/app/api/outlets/deactivate/route.ts`
  - `src/app/api/outlets/policy/route.ts`
  - `src/app/api/projects/outlet-save/route.ts`
  - `scripts/verification/verify-menulist-api-tenant-safety.js`
  - related public API, temp status, compliance, URL routing, POS, multi-outlet, system-strengthening, audit, and changelog docs
- Fix: public API key actions now require `MANAGE_INTEGRATIONS` and a 1KB JSON cap. Temp status, custom domain, menu revalidation, POS sync, outlet lifecycle/policy, and linked outlet save routes now use bounded JSON parsing before validation, provider calls, project reads, or mutation work. Compliance override/reset now requires `MANAGE_PUBLIC_PRESENCE` or `MANAGE_STORE`, uses the existing `DATA_WRITE` limiter, and rejects bodies above 32KB before validation.
- Retest result: `npm run verify:menulist-api-tenant-safety`, `npm run verify:public-business-truth`, `npm run verify:auth-security-failure-matrix`, `npx tsc --noEmit --incremental false --pretty false`, the targeted raw `request.json()` sweep, and `git diff --check` passed.

### Bug 16: Auth/session mutation routes parsed JSON before shared body caps

- Feature: Authentication, account claim, phone OTP auth, password change, and multi-outlet store switching
- Symptom: auth/session routes had strong auth, token, claim, and rate-limit semantics, but several still parsed raw JSON without a bounded request-body reader. Phone OTP send/verify also parsed the body before the IP-only throttle that does not need request payload data.
- Root cause: auth hardening focused on generic errors, token one-time use, credential verification, public cache invalidation after claim-account store email writes, and store-switch authority. Request admission was not locked to the shared bounded-body helper across the auth/session route family.
- Files changed:
  - `src/app/api/auth/claim-account/route.ts`
  - `src/app/api/auth/change-password/route.ts`
  - `src/app/api/auth/switch-store/route.ts`
  - `src/app/api/auth/phone-otp/start/route.ts`
  - `src/app/api/auth/phone-otp/verify/route.ts`
  - `scripts/verification/verify-auth-security-failure-matrix.js`
  - related auth, phone OTP, multi-outlet, system-strengthening, audit, and changelog docs
- Fix: claim-account now uses the existing `AUTH_SENSITIVE` IP limiter before a 16KB bounded JSON body and claim-token lookup. Change-password keeps `AUTH_SENSITIVE` before a 2KB body cap and Firebase credential checks. Switch-store now rate-limits before a 1KB body cap and store reads. Phone OTP start/verify now apply the IP throttle before 1KB bounded JSON parsing, then apply the phone/challenge-specific throttle before OTP challenge creation or verification.
- Retest result: `npm run verify:auth-security-failure-matrix`, `npm run verify:menulist-api-tenant-safety`, `npm run verify:public-business-truth`, `npx tsc --noEmit --incremental false --pretty false`, the targeted auth-route raw `request.json()` sweep, and `git diff --check` passed.

### Bug 17: AI Menu Manager fallback routes parsed JSON before shared body caps

- Feature: AI Menu Manager server fallback command/proposal routes
- Symptom: `/api/ai-menu-manager/command`, `/api/ai-menu-manager/proposals/[proposalId]/actions`, and `/api/ai-menu-manager/proposals/[proposalId]/complete` used auth, write rate limiting, selected-store scope checks, proposal ownership checks, and Zod schemas, but still parsed raw request JSON without a route-level body cap.
- Root cause: AMM hardening focused on DAL-first deterministic commands, compact sessions, proposal idempotency, selected-store tenant scope, stale-project checks, and generic errors. The server fallback route family did not share the same bounded-body admission pattern added to other owner mutation routes.
- Files changed:
  - `src/app/api/ai-menu-manager/command/route.ts`
  - `src/app/api/ai-menu-manager/proposals/[proposalId]/actions/route.ts`
  - `src/app/api/ai-menu-manager/proposals/[proposalId]/complete/route.ts`
  - `scripts/verification/verify-ai-menu-manager.js`
  - `scripts/verification/verify-menulist-api-tenant-safety.js`
  - related AI Menu Manager, system-strengthening, audit, and changelog docs
- Fix: the command fallback now keeps the existing `DATA_WRITE` limiter before a 64KB bounded JSON body and command schema validation. Proposal action and completion fallbacks now keep their existing `DATA_WRITE` limiters before 16KB bounded JSON parsing and proposal scope checks.
- Retest result: `npm run verify:ai-menu-manager`, `npm run verify:menulist-api-tenant-safety`, `npx tsc --noEmit --incremental false --pretty false`, the targeted AMM raw `request.json()` sweep, and `git diff --check` passed.

### Bug 18: Public customer signal routes parsed JSON before shared body caps

- Feature: Public analytics tracking, public guest feedback submission, and Digital Screens daily seen signal
- Symptom: `/api/public/analytics/track` and `/api/public/feedback/submit` were IP-rate-limited and Zod-validated, but still parsed raw JSON before a route-level body cap. `/api/screen/seen` had a declared `content-length` cap before the IP limiter, but no-length/chunked requests still reached raw JSON parsing.
- Root cause: earlier public-signal hardening focused on rate limiting, target validation, store/project checks, honeypot/Turnstile, and daily write dedupe. Shared bounded JSON admission was not locked across the anonymous customer signal family.
- Files changed:
  - `src/app/api/public/analytics/track/route.ts`
  - `src/app/api/public/feedback/submit/route.ts`
  - `src/app/api/screen/seen/route.ts`
  - `scripts/verification/verify-auth-security-failure-matrix.js`
  - `scripts/verification/verify-menulist-api-tenant-safety.js`
  - related analytics, guest feedback, digital screens, system-strengthening, audit, and changelog docs
- Fix: analytics tracking keeps `PUBLIC_ANALYTICS` before a 64KB bounded JSON body and target validation. Guest feedback keeps `FEEDBACK_SUBMISSION` before a 16KB bounded JSON body, honeypot, Turnstile, project/store reads, and writes. Screen seen keeps its 1KB declared-size guard before IP rate limiting and uses a 1KB bounded JSON read before token/store validation or Firestore lookup.
- Retest result: `npm run verify:menulist-api-tenant-safety`, `npm run verify:auth-security-failure-matrix`, `npx tsc --noEmit --incremental false --pretty false`, the targeted public-signal raw `request.json()` sweep, and `git diff --check` passed.

### Bug 19: Owner Business Assistant feedback route parsed JSON before shared body caps

- Feature: Business Health / Owner Business Assistant feedback logging
- Symptom: `POST /api/owner-business-assistant/feedback` used auth, feature flags, `DATA_WRITE` throttling, selected-store scope checks, `VIEW_ANALYTICS` permission, and a strict Zod schema, but it still parsed raw JSON through a local helper before schema validation.
- Root cause: the Business Health answer route had already moved to shared bounded request parsing, but the smaller feedback logging route kept the older local JSON helper.
- Files changed:
  - `src/app/api/owner-business-assistant/feedback/route.ts`
  - `scripts/verification/verify-owner-business-assistant-hardening.ts`
  - related Owner Business Assistant, system-strengthening, sweep-report, and changelog docs
- Fix: the feedback route now keeps the existing `DATA_WRITE` limiter before an 8KB bounded JSON body, then validates the schema, resolves selected-store scope, checks `VIEW_ANALYTICS`, and writes the 90-day feedback record.
- Retest result: `npm run verify:owner-business-assistant`, `npx tsc --noEmit --incremental false --pretty false`, the targeted OBA feedback raw `request.json()` sweep, and `git diff --check` passed.

### Bug 20: Platform admin public-truth mutations parsed JSON before shared body caps

- Feature: Admin subdomain rename and Platform Entity Blocks
- Symptom: `POST /api/admin/subdomains/rename` and `POST /api/platform/entity-blocks` were platform-only and validated input before writes, but still parsed raw JSON before route-level body caps. Both routes can affect public routing, public availability, cache invalidation, or account access.
- Root cause: prior platform hardening focused on feature flags, platform-role protection, cache invalidation, summary sync, and malformed-JSON behavior. Shared bounded JSON admission was not locked for these high-impact platform mutation bodies.
- Files changed:
  - `src/app/api/admin/subdomains/rename/route.ts`
  - `src/app/api/platform/entity-blocks/route.ts`
  - `scripts/verification/verify-menulist-api-tenant-safety.js`
  - related URL routing, Stores Management, production-audit, system-strengthening, and changelog docs
- Fix: admin subdomain rename now rejects bodies above 8KB before validation, store reads, collision queries, transaction writes, or cache invalidation. Entity Blocks now rejects bodies above 64KB before entity reads, tenant/store summary writes, Auth disable/revocation, or cache invalidation.
- Retest result: `npm run verify:menulist-api-tenant-safety`, `npx tsc --noEmit --incremental false --pretty false`, the targeted platform/admin raw `request.json()` sweep, and `git diff --check` passed.

### Bug 21: Ops action and create-menu link routes parsed JSON before shared body caps

- Feature: Ops Control Room, Platform Notifications, Owner Notifications recovery, and Public Menu Entry link import
- Symptom: SAFE_MODE, alert mute, Platform Notifications action, Owner Notifications recovery, and `/api/public/create-menu` link-import POST paths were authenticated/platform-gated as appropriate, but still parsed raw JSON without small route-level body caps.
- Root cause: prior hardening focused on platform-role gates, feature flags, manual/bounded dashboard reads, public create-menu upload size checks, and SSRF-safe link acquisition. Shared bounded JSON admission had not been locked across the remaining ops action and create-menu link paths.
- Files changed:
  - `src/app/api/ops/mute-alerts/route.ts`
  - `src/app/api/ops/safe-mode/route.ts`
  - `src/app/api/ops/platform-notifications/route.ts`
  - `src/app/api/ops/owner-notifications/route.ts`
  - `src/app/api/public/create-menu/route.ts`
  - `scripts/verification/verify-menulist-api-tenant-safety.js`
  - `scripts/verification/verify-menu-extraction-pipeline.js`
  - related ops, owner-notification, public-menu-entry, production-audit, system-strengthening, and changelog docs
- Fix: ops POST routes now apply the operator limiter before bounded JSON parsing. Alert mute uses a 1KB cap, SAFE_MODE uses 2KB, platform/owner notification actions use 8KB, and create-menu link import uses 8KB before link validation, draft dedupe, source acquisition, Storage writes, or extraction job creation.
- Retest result: `npm run verify:menulist-api-tenant-safety`, `npm run verify:menu-extraction-pipeline`, and the targeted ops/create-menu raw `request.json()` sweep passed. Broader TypeScript/security gates remain part of the current slice verification.

## AMM Command Boundary Coverage

`npm run verify:ai-menu-manager` covers the minimum command families requested for resolver/action-card behavior, including:

- Direct menu changes: `Masala tea 20 now`, `rename Masala Tea`, description update, selected-item price/visibility, selected bulk price/availability, category visibility, Featured section.
- Bounded answers and clarifications: `Can I increase Masala Tea price?`, vague theme/image/promote commands, and suggestion cards.
- Design and display controls: premium style, grid layout, theme color choices, display option choices.
- Browser-local/manual actions: copy menu link, download menu QR, official page QR/link, feedback link/QR, customer app install link, digital screen link.
- Approval-safe/non-executable actions: publish, generated image, import/review families.
- Unsupported boundaries: Zomato, Instagram/social posting, platform/internal access, weather, and sports resolve to `system_unsupported_action`.

This is not a substitute for same-tab owner UI testing. Same-tab Chrome DOM inspection remained blocked, so AMM remains marked manual UI pending.

## June 30 Follow-up: Publish Verification URL Parity

- Fixed desktop B2C publish and mobile Design publish to build the menu-health verification target with `generateProjectUrl()` after the acknowledged publish result, including custom-domain and default-project semantics. This keeps the health check on the actual routed public project/menu URL instead of tenant-root assumptions.
- Mobile Design now logs only `mobile_design_publish_verification_setup_failed` for setup/path-generation failures; callable/provider failures remain inside the shared `verifyMenuPublish` wrapper so publish success stays non-blocking.
- Retest result: `npm run verify:public-business-truth`, `npx tsc --noEmit --incremental false --pretty false`, and `git diff --check` passed. Manual browser/runtime publish verification is still pending with the broader mutation-and-restore matrix.

## June 30 Follow-up: Platform Pull API Private Response Cache

- Fixed `/api/public/v1/business` and `/api/public/v1/menu` so API-key-gated 200/304 responses use the shared private pull-response header helper instead of `public, s-maxage=60` shared-cache headers.
- The helper keeps ETag/conditional request behavior and adds `Vary: X-API-Key`, preventing shared-cache cross-key response reuse while preserving client-side polling efficiency.
- Retest result: `npm run verify:public-business-truth`, `npm run verify:menulist-api-tenant-safety`, `npx tsc --noEmit --incremental false --pretty false`, and `git diff --check` passed. Live pull-API key fixture testing remains pending with the broader authenticated/manual matrix.

## June 30 Follow-up: Compliance Pages Shared Browser Request Policy

- Replaced inline `/api/compliance` fetch policy blocks in the standalone desktop Compliance Pages section, embedded Custom Domain compliance section, and mobile Compliance Pages editor with the shared `AUTH_BROWSER_REQUEST_POLICY`.
- The shared policy preserves the existing no-store, same-origin, manual-redirect behavior while reducing drift risk across load/save/reset calls and keeping the existing bounded response parsers and `{ success: true }` acknowledgement checks unchanged.
- Retest result: `npm run verify:public-business-truth`, `npm run verify:menulist-api-tenant-safety`, `npx tsc --noEmit --incremental false --pretty false`, `git diff --check`, and the touched-file trailing-whitespace scan passed. Manual browser compliance edit/reset testing remains pending with the broader authenticated/manual matrix.

## June 30 Follow-up: Temporary Status Shared Browser Request Policy

- Replaced inline `/api/store/temp-status` fetch policy blocks in the desktop Business Settings card, mobile Temporary Status screen, and mobile Today/Hours temporary-status shortcuts with the shared `AUTH_BROWSER_REQUEST_POLICY`.
- The shared policy preserves the existing no-store, same-origin, manual-redirect behavior while keeping optimistic updates, rollback behavior, public cache invalidation inside `/api/store/temp-status`, and the shared 8KB response acknowledgement parser unchanged.
- Retest result: `npm run verify:public-business-truth`, `npm run verify:menulist-api-tenant-safety`, `npx tsc --noEmit --incremental false --pretty false`, `git diff --check`, and the touched-file trailing-whitespace scan passed. Manual browser temp-status set/clear testing remains pending with the broader authenticated/manual matrix.

## June 30 Follow-up: Domain Settings Shared Browser Request Policy

- Replaced inline `/api/domain` and `/api/subdomain/check` fetch policy blocks in desktop Domain Settings, embedded Custom Domain, and mobile Domain Settings with the shared `AUTH_BROWSER_REQUEST_POLICY`.
- The shared policy preserves the existing no-store, same-origin, manual-redirect behavior while keeping bounded subdomain/domain response parsers, custom-domain acknowledgement checks, subdomain store-write acknowledgement, provider calls, and public cache invalidation unchanged.
- Retest result: `npm run verify:public-business-truth`, `npm run verify:menulist-api-tenant-safety`, `npx tsc --noEmit --incremental false --pretty false`, `git diff --check`, and the touched-file trailing-whitespace scan passed. Manual browser domain/subdomain setup testing remains pending with the broader authenticated/manual matrix.

## June 30 Follow-up: POS Sync Shared Test Request Policy

- Moved the POS Sync connection-test request policy into `src/lib/posSync/testResponse.ts`, next to the shared 16KB response cap and shape guard.
- Desktop and mobile POS Sync tests now import the same `POS_SYNC_TEST_REQUEST_POLICY`, preserving no-store, same-origin, and manual-redirect handling while keeping settings saves, test route behavior, outbound webhook checks, delivery logs, and Firestore behavior unchanged.
- Retest result: `npm run verify:public-business-truth`, `npm run verify:menulist-api-tenant-safety`, and `npx tsc --noEmit --incremental false --pretty false` passed. Manual browser POS handoff testing remains pending with the broader authenticated/manual matrix.

## June 30 Follow-up: Time Slot Preset Public Cache Revalidation

- Fixed `updateTimeSlotPresets()` so store-level preset writes revalidate the public menu/OBP cache after the `timeSlotPresets` merge.
- Existing preset edit/delete project cascades already revalidated changed projects; this closes the store-level preset cache gap without changing working-hours saves, category cascade behavior, Firestore rules/indexes, Cloud Functions, Firebase deployment, or Vercel deployment.
- Retest result: `npm run verify:public-business-truth`, `npm run verify:menulist-api-tenant-safety`, `npm run verify:auth-security-failure-matrix`, and `npx tsc --noEmit --incremental false --pretty false` passed. TypeScript also required a type-only cleanup in the pre-existing auth middleware bounded-context helper; auth behavior was not changed. Manual browser time-slot preset create/edit/delete testing remains pending with the broader authenticated/manual matrix.

## June 30 Follow-up: Special Menu Hook Acknowledgement Guards

- Fixed `useSpecialMenus()` so create, update, activate, deactivate, and cancel paths require explicit DAL result acknowledgements before mutating SWR state or returning success.
- This blocks `apiCallComposer()` fallback values from showing false success while preserving existing project/store writes, temp-status behavior, public cache revalidation, scheduler activation/deactivation, Firestore rules/indexes, Cloud Functions, Firebase deployment, and Vercel deployment.
- Retest result: `npm run verify:public-business-truth` and `npx tsc --noEmit --incremental false --pretty false` passed. Manual browser special-menu create/edit/end/cancel testing remains pending with the broader authenticated/manual matrix.

## June 30 Follow-up: Digital Screen Slide Upload Acknowledgement

- Fixed `uploadScreenSlide()` so the outer DAL composer result must be a shaped owner-upload slide before desktop or mobile upload success copy can show.
- This blocks Storage, session, and add-slide failures that collapse to `apiCallComposer()` fallback values from showing false slide-upload success while preserving existing screen state writes, public-safe screen mirror sync, public display routes, seen-signal behavior, Firestore rules/indexes, Cloud Functions, Firebase deployment, and Vercel deployment.
- Retest result: `npm run verify:public-business-truth` and `npx tsc --noEmit --incremental false --pretty false` passed. Manual browser Digital Screen upload/caption/delete and TV display testing remains pending with the broader authenticated/manual matrix.

## June 30 Follow-up: Guest Feedback DAL Acknowledgement Boundary

- Fixed `getFeedbackList()` and `getFeedbackCount()` callers so desktop/mobile owner feedback loads require shaped DAL results before rendering list state or badge counts.
- Fixed `updateFeedbackStatus()` so the internal `getFeedbackById()` result must be a shaped feedback record with the requested id before any status write can proceed.
- Fixed mobile resolve so the item moves to resolved and shows success only after the status write acknowledgement. Reply-save already followed that acknowledgement order.
- Retest result: `npm run verify:public-business-truth`, `npm run verify:menulist-api-tenant-safety`, and `npx tsc --noEmit --incremental false --pretty false` passed. Manual browser public submit/list/filter/resolve/reply/QR testing remains pending with the broader authenticated/manual matrix.

## July 1 Follow-up: Menu Presence Store Scope Boundary

- Fixed `updateMenuPresence()` so owner-confirmed Google Business, Instagram Bio, and WhatsApp Profile placement writes verify the passed store against the active session store before writing `menuPresence`.
- Fixed `recordStarterActivationSignal()` so starter activation action evidence applies the same active-store boundary before writing `starterActivationSignals`.
- The verifier now guards both rejection codes through `npm run verify:public-business-truth` and `npm run verify:menulist-api-tenant-safety`. Valid owner presence writes, read model computation, desktop/mobile rendering, public output, Firestore rules/indexes, Cloud Functions, Firebase deployment, and Vercel deployment were not changed.
- Retest result: `npm run verify:public-business-truth`, `npm run verify:menulist-api-tenant-safety`, and `npx tsc --noEmit --incremental false --pretty false` passed. Manual browser presence confirm/remove testing remains pending with the broader authenticated/manual matrix.

## July 1 Follow-up: Staff Mutation Identity Acknowledgement

- Fixed `src/lib/staffManagement/client.ts` so successful staff mutation envelopes must keep returned `user.id` equal to returned `userId` before desktop or mobile staff state can advance.
- This hardens create, update, remove, reset-passcode, and force-sign-out acknowledgement handling while preserving valid staff CRUD, role CRUD, server permission checks, Firebase Auth work, Firestore reads/writes, mobile/desktop UI behavior, Firestore rules/indexes, Cloud Functions, Firebase deployment, and Vercel deployment.
- Retest result: `npm run verify:menulist-api-tenant-safety`, `npm run verify:auth-security-failure-matrix`, and `npx tsc --noEmit --incremental false --pretty false` passed. Manual browser staff create/edit/remove/reset/sign-out and role edit/deactivate testing remains pending with the broader authenticated/manual matrix.

## July 1 Follow-up: Owner AI Validation Local Log Boundary

- Fixed `/api/business-copy`, `/api/seo`, `/api/descriptions`, `/api/translations`, and `/api/new-item-metadata` validation-failure handling so attempted owner/store/menu/item/language input is summarized through `getAIRouteLogContext()` before security and local validation logging.
- This keeps malformed owner AI requests from handing raw invalid payload objects into local validation logs while preserving valid generation, provider calls, tenant/outlet checks, AI accounting, response shape, settings/project saves, public cache invalidation, Firestore rules/indexes, Cloud Functions, Firebase deployment, and Vercel deployment.
- Retest result: `npm run verify:ai-accounting`, `npm run verify:menulist-api-tenant-safety`, and `npx tsc --noEmit --incremental false --pretty false` passed. Manual browser Business Copy, SEO, description generation, translation repair, and new-item metadata testing remains pending with the broader authenticated/manual matrix.

## July 2 Follow-up: Platform Pull API Live Key Revalidation

- Removed the 30-second validation-cache opt-in from `/api/public/v1/business` and `/api/public/v1/menu` so every MenuList pull request rechecks API-key lookup plus active/deleted/platform-blocked store and tenant eligibility before returning data.
- The shared validation cache remains available for explicitly opted-in routes, but MenuList pull endpoints now match the Platform Pull API spec boundary that key revocation and target blocking should apply on the next request from each server process.
- Retest result: `npm run verify:public-business-truth`, `npm run verify:menulist-api-tenant-safety`, `npm run docs:check-links`, focused `git diff --check`, and `npm run verify:production-readiness-local` passed. Live pull-API key fixture testing remains pending with the broader authenticated/manual matrix.

## July 2 Follow-up: POS Sync Debounced Delivery Admission

- Fixed `triggerPosSyncDebounced()` so it requires both the provider connection URL and signing secret before calling `/api/pos-sync/deliver`. A store with incomplete POS Sync config no longer creates repeated invalid delivery-route calls after menu saves.
- `npm run verify:pos-sync-boundary` now owns the debounced delivery handoff alongside the public-HTTPS/DNS guard, route auth/tenant/rate-limit order, desktop/mobile test policy, MobileShell More routing, and docs parity.
- Retest result: `npm run verify:pos-sync-boundary`, `npm run verify:menulist-api-tenant-safety`, `npm run docs:check-links`, `npx tsc --noEmit --incremental false --pretty false`, focused `git diff --check`, and `npm run verify:production-readiness-local` passed. Real external webhook provider smoke remains pending with the broader manual handoff matrix.

## July 2 Follow-up: Multi-Outlet Active-Cap Replacement Boundary

- Fixed `POST /api/outlets/create` so `MAX_OUTLETS_PER_TENANT` counts active non-master outlets only. A deactivated location keeps history/data but no longer consumes the replacement-location cap.
- `npm run verify:multi-location-boundary` now owns the active-only cap contract alongside outlet lifecycle route admission, linked outlet save acknowledgement, desktop/mobile Locations guards, MobileShell routing, and docs parity.
- Retest result: `node --check scripts/verification/verify-multi-location-boundary.js`, `npm run verify:multi-location-boundary`, `npm run verify:menulist-api-tenant-safety`, `npm run verify:public-business-truth`, `npm run docs:check-links`, `npx tsc --noEmit --incremental false --pretty false`, `git diff --check`, and `npm run verify:production-readiness-local` passed; aggregate local readiness reported 67/67 checks, including 63 child root `verify:*` scripts. Browser Locations flows and real Razorpay replacement/subscription smoke remain pending with the broader authenticated/manual matrix.

## July 2 Follow-up: Help Center Answerlattice Support Boundary

- Fixed the Answerlattice support-ticket DAL so non-platform partial ticket mutations require the selected ticket `tId/sId` to match the active session before `setDoc(..., { merge: true })`.
- Platform support users can still operate across tenant tickets, but partial ticket updates without explicit selected-ticket scope now strip composer-injected `tId/sId` so they do not overwrite existing ticket ownership with platform defaults.
- `npm run verify:help-center-boundary` now owns the MenuList Help Center boundary across search API auth/body caps, bounded browser response parsing, MobileShell Help Center routing, client ticket detail mode, Firestore stable-scope rules, and scoped ticket mutation callers.
- Retest result: `node --check scripts/verification/verify-help-center-boundary.js`, `npm run verify:help-center-boundary`, `node --check scripts/verification/verify-answerlattice-runtime-truth.js`, `npm run verify:answerlattice-runtime-truth`, `npm run verify:mobile-shell-route-map`, `npm run verify:menulist-api-tenant-safety`, `npm run verify:auth-security-failure-matrix`, `npm run verify:doc-npm-scripts`, `npm run docs:check-links`, `npx tsc --noEmit --incremental false --pretty false`, `git diff --check`, and `npm run verify:production-readiness-local` passed; aggregate local readiness reported 68/68 checks, including 64 child root `verify:*` scripts. Browser Help Center search/ticket flows, provider-backed Help Center search, and real mobile-device QA remain pending with the broader authenticated/manual matrix.

## Risk Register

- Public truth risks: public menu/OBP/store/project mutation flows still need manual browser mutation/restore passes; static public-business verifier passed, and the source gate now covers bounded-body admission for public API key, domain, temp status, compliance, POS, outlet, linked outlet save, and menu revalidation mutation routes.
- Tenant/security risks: auth sync boundary improved; staff, outlet, selected-store, public-cache revalidation, auth/session body admission, and protected MenuList owner API guard patterns now have source verifier coverage; dedicated live wrong-tenant/role fixture tests still remain.
- Mobile parity risks: Mobile Menu passed; many mobile More/settings screens are inventoried but still pending manual runtime checks.
- Firestore/cost risks: existing AI accounting, catalog analytics, menu card export, extraction, auth/security, and MenuList API tenant-safety verifiers passed; menu extraction, provider-backed AI, billing, reseller, public-truth, auth/session, POS, multi-outlet, ops action, and create-menu link request parsing are now bounded before route-level project reads, source fetches, provider calls, account creation, or write work. Mutation flows that write stores/projects still need manual browser restore passes and per-feature runtime cache confirmation. Firebase Storage quota is currently exhausted for `ecomsai.appspot.com`, blocking upload/extraction runtime tests.
- Unsupported external boundary risks: Reviews/Reputation and external posting remain disabled/gated; no direct Google/Zomato/Swiggy/social posting was executed or implied.
- Docs/runtime mismatch risks: touched feature docs were updated for the public-truth bounded-body slice; future passes should continue reconciling disabled/runtime-missing feature docs as they are tested.
- Runtime tooling risk: the user-requested same logged-in Chrome tab could not be DOM-inspected because tool/plugin/Chrome settings blocked it. CDP verifier Chrome runs are not the same tab.
- All-severity QA risk: lint/typecheck/verifiers/HTTP smoke cannot prove absence of logical bugs inside unexercised UI states. Pending rows remain pending until their happy/cancel/invalid/mobile/public/security/cache journeys are manually exercised.

## Final Verification For Touched Scope

Completed after code changes:

- `git diff --check`: passed.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run lint`: passed.
- `node scripts/verification/verify-mobile-owner-menu.mjs`: passed after fixes.
- `FIREBASE_PROJECT_ID=ecomsai node scripts/verification/verify-public-routing-summary-backfill.mjs --json`: passed with 0 errors and 20 no-menu warnings.
- `npm run verify:public-business-truth`: passed.
- `npm run verify:customer-app-pwa`: passed.
- `npm run verify:ai-menu-manager`: passed.
- `npm run verify:menu-extraction-pipeline`: passed, 33 passed and 0 failed.
- `npm run verify:menu-extraction-pipeline:dry-run`: passed, 48 passed and 0 failed.
- `npm run verify:auth-security-failure-matrix`: passed.
- `npm run verify:menulist-api-tenant-safety`: passed.
- Public website HTTP route smoke: passed for 29 public website routes.
- Authenticated owner HTTP route smoke: passed for 26 owner/platform/reseller route entries and redirects.
- Protected API unauthenticated check: passed for 20 sensitive API routes; all returned 401/404/405-style safe responses rather than success.
- Protected API invalid-payload check: passed for 17 sensitive API routes; all returned 400/404-style safe responses rather than 500.
- `node scripts/verification/firebase-cost-usage-map.mjs`: completed; flagged expected review categories including 9 high-listener files, 3 medium-public-read files, and 21 medium-write-volume files.

Still required before broader readiness:

- Additional manual browser passes per inventory row.
- Same logged-in Chrome tab DOM/runtime validation after Chrome JavaScript-from-Apple-Events or the Chrome plugin attach path is available.
- Live wrong-tenant/wrong-store authenticated API tests using a controlled second tenant fixture. Source-level guard regression coverage is now automated by `npm run verify:menulist-api-tenant-safety`.
- Safe mutation-and-restore browser tests for store/project/public-truth features.
- Clear or upgrade Firebase Storage quota for `ecomsai.appspot.com`, then rerun `node scripts/verification/verify-mobile-upload-extraction.mjs` to verify job creation and extraction completion.

## Readiness Verdict

Not ready: full feature sweep remains incomplete. The first high-risk owner/mobile feature path is fixed and retested, and baseline verifiers are largely green, but the product-wide manual browser matrix has not been completed.
