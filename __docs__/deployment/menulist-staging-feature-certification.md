# MenuList Staging Feature Certification Ledger

> Status: active certification in progress  
> Scope: MenuList staging/QA only  
> Started: August 14, 2026  
> Environment: `menulist-qa` and Vercel Preview restricted to `staging`  
> Production boundary: production Firebase, Razorpay Live Mode, and Vercel Production are out of scope and must not be queried, mutated, built, or deployed

This ledger records hosted MenuList QA certification feature by feature. The
completed infrastructure setup and its retained operator evidence remain in
[menulist-staging-qa-setup.md](./menulist-staging-qa-setup.md). This file does
not duplicate that setup guide and does not convert setup evidence into feature
certification without exercising the corresponding hosted application flow.

## Certification Contract

- Use the actual hosted QA surfaces: `https://menulist.digital`,
  `https://app.menulist.digital`, and `https://<slug>.menulist.digital`.
- Use QA owner tenant/store `2/2` for ordinary owner flows and QA owner
  tenant/store `1/1` only for bounded Razorpay Test Mode certification.
- Prefer the existing logged-in Chrome session. Never inspect cookies, browser
  storage, passwords, API keys, tokens, OTPs, or recovery material.
- Inspect source, DAL, validation, rules, Functions, feature flags, and current
  QA data before mutating a flow.
- Exercise desktop and mobile/PWA surfaces where the feature is available.
- Cover success, validation failure, cancellation, retry, repeated action,
  hard reload, stale state, permission denial, and cleanup where applicable.
- Verify bounded Firestore and Storage before/after state for mutating flows.
- A source verifier is supporting evidence, not hosted UI proof.
- Fix every reproducible same-feature or directly adjacent defect, add focused
  regression coverage, release only to QA, verify the exact hosted build, and
  rerun the failed flow.
- Do not run `npm run build` by default. Use focused verifiers, TypeScript,
  scoped lint, emulator tests, targeted Functions builds, and hosted browser
  proof.

## Frozen Starting Checkpoint

| Item | Evidence | Status |
| --- | --- | --- |
| Local branch | `staging` | PASS |
| Local commit | `40c428d5f9b177a2d6ce85db9577badf0bbdf679` | PASS |
| Remote commit | `origin/staging` = `40c428d5f9b177a2d6ce85db9577badf0bbdf679` | PASS |
| Hosted build | `https://app.menulist.digital/api/version` returned build `40c428d5f9b177a2d6ce85db9577badf0bbdf679`, environment `preview`, deployment `menulist-core-5mvn00qrw-neelvara-systems.vercel.app` | PASS |
| QA website transport | `https://menulist.digital` returned HTTP 200 with `x-robots-tag: noindex, nofollow, noarchive` | PASS |
| QA sign-in transport | `https://app.menulist.digital/signin` returned HTTP 200 with `x-robots-tag: noindex, nofollow, noarchive` | PASS |
| Worktree boundary | Existing untracked `.tmp/` evidence is preserved and excluded from certification commits | PASS |

## Status Vocabulary

`NOT STARTED`, `IN PROGRESS`, `PASS`, `FIXED`, `BLOCKED`, `DEFERRED`

`PASS` means the current hosted build supplied direct evidence for the stated
flow. `FIXED` means a reproduced defect was corrected, released to QA, and the
hosted flow was rerun successfully. `DEFERRED` requires a named safety or owner
boundary and is not a pass.

## Source Inventory

The inventory is a testing map, not certification. Each listed surface remains
`NOT STARTED` until a row in the execution ledger proves its hosted behavior.

### Desktop Owner Navigation

Canonical source: `src/constants/navigations.ts` and
`src/components/organisms/sidebar/index.tsx`.

| Group | Route or entry | Certification family |
| --- | --- | --- |
| Owner | `/dashboard` | Dashboard and owner shell |
| Owner | `/today`, `/today/history` | Today, activity, and history |
| Owner | `/feedback` | Guest feedback inbox |
| Owner | `/projects` | Project lifecycle and editor entry |
| Owner | `/business-settings` | Business information and settings |
| Owner | `/use-menulist` | Output center and customer link |
| Owner | `/qr-code` and legacy `/qrCode` | QR output and legacy-route parity |
| Owner | `/assets` | Printable assets |
| Team | `/users`, `/users/list`, `/users/permissions` | Users, roles, and permissions |
| Multi-location | `/locations` | Location and outlet control |
| Billing | `/billing`, `/transactions` | Subscription and transaction history |
| Support | `/help-center`, `/help-center/[...segments]` | Help, docs, tickets, and release notes |
| Menu operations | `/menu-manager` | AI Menu Manager |
| Growth | `/growth-kits` | Growth Kits add-on |
| Output | `/use-menulist/print-assets` | Print-ready assets |
| Output | `/use-menulist/menu-card-export` | Menu card export |
| Internal | `/platform/**`, `/ops/**` | Platform-role operational surfaces |
| Reseller | `/reseller`, `/reseller/onboard`, `/reseller/manage` | Reseller-role surfaces |

### Mobile/PWA Navigation

Canonical sources: `src/components/mobile/MobileShell.tsx`,
`src/components/mobile/MobileNavigation.tsx`, and
`src/components/mobile/screens/MobileMoreScreen.tsx`.

| Mobile family | Screens or route mappings |
| --- | --- |
| Bottom tabs | Today, Menu, Menu Help, Share, More |
| Today | main, dashboard, history |
| Menu | project selection, category/item editing, visibility, bulk actions, menu setup and recovery |
| Menu Help | AI Menu Manager mobile conversation and confirmed actions |
| Share | customer link, QR, communication kit, digital screens, POS sync |
| More account | account profile, account access |
| More business | business profile hub, basic settings, locale, hours, contacts, attributes, feedback settings, official page, business copy, SEO, analytics, social, time slots, temporary status, special menus, domain, integrations |
| More operations | business health, dashboard, print assets, print menu, feedback, transactions, billing, locations, users, roles, customer app, presence monitor |
| More support | Answerlattice-backed MenuList help, docs, support, and release notes |
| Role-gated | platform, operations, Answerlattice hub, and reseller sub-screens |

### Public And Authentication Surfaces

| Family | Routes |
| --- | --- |
| Authentication | `/signin`, `/forgot-password`, `/403`, `/404`, `/unauthorized` |
| Onboarding | `/create-menu`, `/create-menu/preview/[draftId]`, `/create-menu/success`, `/invite`, `/get-started` |
| QA website | `/`, `/product`, `/features/**`, `/industries/**`, `/pricing`, `/how-it-works`, `/multi-location`, `/whatsapp`, `/resources/**`, `/tools/**`, `/about`, `/contact`, `/faq`, `/trust-security`, legal pages |
| Public customer | `/client/[[...slug]]`, tenant wildcard host, `/feedback/[projectId]`, `/screen/[token]` |
| Customer PWA actions | `/client/pwa/call`, `/client/pwa/directions`, `/client/pwa/order`, `/client/pwa/reservation`, `/client/pwa/whatsapp`, `/offline`, `/manifest.webmanifest` |
| Crawler and worker boundaries | `/client/robots`, MenuList host `robots.txt`, sitemap absence, `/serwist/[path]` |

### MenuList API Boundary Families

Canonical source: MenuList-owned `src/app/api/**/route.ts` files. Separate
Answerlattice, CampaignCue, SignalDesk, and MyCodex routes are excluded.

| Family | Boundary examples |
| --- | --- |
| Auth and session | NextAuth, access status, claim account, password/profile, staff creation, phone OTP, store switch, claims |
| Projects and menu | project delete/outlet save/status, extraction jobs, link import, identity intake, descriptions, translations, item metadata |
| AI Menu Manager | command, inbox, plan, sessions, proposal actions and completion |
| Media and output | image generation/editing/batch, app icons/screenshots/splash, menu card advisor, digital screens |
| Analytics and health | owner analytics, realtime, reports, ROI, owner actions, weekly narrative, public truth monitor |
| Business and distribution | business copy, domain/subdomain, public API, revalidation, SEO, POS sync, communications |
| Feedback and support | public feedback, review states/suggestions, help search/embeddings, tickets, notifications |
| Team and multi-location | staff, outlets, tenant naming, store API key/status |
| Billing | onboarding subscription, Razorpay subscription/top-up lifecycle, webhook, reseller billing |
| Public entry | public create-menu, claim, contact, referral capture, public analytics, public business/menu APIs |
| Operations | safe mode, extraction, notifications, report leads, website enquiries, platform monitors |
| Diagnostics | CSP report, compliance, version, bounded test-only rate-limit route |

### DAL, Firebase, Storage, And Feature-Flag Authorities

| Area | Canonical sources | Inventory state |
| --- | --- | --- |
| Client/Admin DAL | `src/database/` with MenuList families for projects, stores, tenants, users, subscriptions, analytics, feedback, menu change log, multi-outlet, Business Health, AI Menu Manager, Growth Kits, storage, and public-truth monitoring | MAPPED; flow-level reads/writes pending |
| Firestore constants | `src/constants/database.ts` | MAPPED; collection-by-flow verification pending |
| Firestore rules | `firestore.rules` | MAPPED; allow/deny behavior will be attached to mutating flow rows |
| Storage rules | `storage.rules` | MAPPED; active paths include scoped chat/support/changelog/media/store/project/ingestion/template/logo/user paths and denied legacy paths |
| Functions exports | `functions/src/index.ts` | MAPPED; four deployed document triggers, five maintained shared callables, the maintenance scheduler, bounded manual analytics/scheduler triggers, messaging functions, and four operational functions |
| Feature flags | `src/config/features.ts` | MAPPED; every flow row must record the gating flag and effective QA state where applicable |

## Local Source Gates

These gates support later hosted certification. They do not by themselves turn
a hosted flow into `PASS`.

| Date | Gate | Result | Evidence and action |
| --- | --- | --- | --- |
| 2026-08-14 | `npm run verify:mobile-shell-route-map` | PASS | Current owner routes map into the maintained MobileShell contract. |
| 2026-08-14 | `npm run verify:menu-project-editor-boundary` | PASS | Project route/editor, DAL invalidation, desktop/mobile persistence, scope, ownership, upload, and time-slot focused tests passed. |
| 2026-08-14 | `npm run verify:auth-onboarding-flow` | FIXED, THEN PASS | The verifier still required the retired website-side checkout URL path even though the hardened website intentionally routes pending owners to authenticated `/billing`. Updated the verifier to require `Continue in Billing` and the canonical owner-app billing redirect while forbidding website-side Razorpay URL admission. The complete auth/onboarding gate then passed. No runtime code or hosted QA state changed. |
| 2026-08-14 | `npx eslint scripts/verification/verify-auth-onboarding-flow.js` | PASS | Focused lint passed after the verifier correction. |
| 2026-08-14 | `npx tsc --noEmit` | PASS | Root strict TypeScript check passed with no output. |
| 2026-08-14 | `npm run test:menulist-host-routing` | FIXED, THEN PASS | Hosted QA exposed redirect responses that bypassed host-aware security headers. Redirect branches now pass through the shared security-header boundary, and canonical trailing-slash redirects are delegated from Next to Proxy so QA noindex is retained. Preview and production host-routing assertions pass. |
| 2026-08-14 | `npm run verify:next-build-compatibility` | PASS | Next 16 source/config compatibility passed after delegating trailing-slash normalization to Proxy. |
| 2026-08-14 | `npx eslint src/proxy.ts scripts/verification/test-menulist-host-routing.ts` | PASS | Focused routing/security lint passed. |
| 2026-08-14 | `npx tsc --noEmit` | PASS | Root strict TypeScript check passed after the routing correction. |
| 2026-08-14 | `node scripts/verification/verify-auth-security-failure-matrix.js` | FIXED, THEN PASS | Hosted QA showed that central `withAuth()` failures inherited a public revalidation cache policy. The middleware now applies the shared private/no-store auth policy to admitted responses and every non-preflight failure; the focused security matrix guards the boundary. |
| 2026-08-14 | `npx eslint src/middleware/auth.ts scripts/verification/verify-auth-security-failure-matrix.js` | PASS | Focused auth middleware and verifier lint passed. |
| 2026-08-14 | `npx tsc --noEmit` | PASS | Root strict TypeScript check passed after the protected-response cache correction. |
| 2026-08-14 | `npm run docs:check-links` | PASS WITH EXISTING WARNINGS | Zero broken links; the same 62 approved pre-existing uppercase/space naming warnings remain outside this fix. |
| 2026-08-14 | `node scripts/verification/verify-public-business-truth.js` | FIXED, THEN PASS | Hosted `/use-menulist` and `/qr-code` turned a denied project-summary read into false missing-menu copy. Desktop Use MenuList now settles paid/starter entitlement before output reads and uses the shared no-plan state. |
| 2026-08-14 | `npm run verify:printable-asset-templates` | FIXED, THEN PASS | Hosted `/assets` had the adjacent false missing-menu state. Printable Assets now settles valid plan access before project/template reads and uses the shared no-plan state. |
| 2026-08-14 | Focused output lint, `npx tsc --noEmit`, `git diff --check`, and `npm run docs:check-links` | PASS WITH EXISTING WARNINGS | Both output entitlement fixes passed scoped lint, strict TypeScript, diff checks, and zero-broken-link validation; the same 62 approved naming warnings remain. |
| 2026-08-14 | `npm run verify:guest-feedback-boundary` and `npm run verify:help-center-boundary` | FIXED, THEN PASS | Hosted owner QA reproduced persistent Feedback and Help Center read failures that were rendered as confirmed empty content. The affected panels now preserve explicit retryable failure states; the focused source gates lock the error-before-empty ordering. Hosted verification remains pending. |
| 2026-08-14 | `npm run verify:contextual-state-illustrations`, focused recovery-state lint, `npx tsc --noEmit`, `git diff --check`, and `npm run docs:check-links` | PASS WITH EXISTING WARNINGS | Recovery alerts remain plain under the contextual-state contract. Lint, strict TypeScript, diff checks, and zero-broken-link validation passed; the same 62 approved naming warnings remain. |
| 2026-08-14 | `node scripts/verification/verify-ai-menu-manager.js`, `npm run verify:contextual-state-illustrations`, focused Menu Manager lint, `npx tsc --noEmit`, `git diff --check`, and `npm run docs:check-links` | FIXED, THEN PASS WITH EXISTING WARNINGS | The zero-menu desktop/mobile state no longer fabricates an `Untitled` selection, usable suggestions, available composer/context actions, or healthy empty pending/receipt rails. Optional Digital Screen context is deferred until a real menu exists. Zero broken doc links; the same 62 approved naming warnings remain. |
| 2026-08-14 | `npm run test:active-session-scope-boundary`, `npm run verify:help-center-boundary`, `node scripts/verification/verify-auth-security-failure-matrix.js`, focused auth lint, `npx tsc --noEmit`, and `git diff --check` | FIXED, THEN PASS | Help Center Firebase readiness now uses the route-aware product/workspace key while MenuList store bootstrap retains its MenuList session. In-flight auth sync also includes product identity. The full Answerlattice runtime-truth script remains independently red on an unrelated pre-existing checkout-analytics label assertion. |

## Hosted Certification Notes

- `2026-08-14` - Vercel Preview commit
  `f05001553bc41525564351a6bcbb7d1826ad1792` reached `Ready`, and
  `https://menulist.digital/api/version` returned that exact build with
  environment `preview` and deployment
  `menulist-core-7vfywushy-neelvara-systems.vercel.app`.
- `2026-08-14` - The retained authenticated QA owner session restored on the
  exact build. `/billing` settled to the complete owner shell and the honest
  `No Active Subscription` state. Direct navigation to `/projects`, followed
  by a hard reload, again rendered the complete owner shell and the same
  subscription guard. The former `session_provider_session_prime_failed` and
  store-bootstrap diagnostics did not recur. The only browser diagnostic was
  the previously documented, intentionally non-blocking
  `app_check_site_key_missing` message while QA App Check remains skipped.
  Opening the owner account menu identified the current synthetic fixture as
  `QA owner B`; the retained QA setup evidence maps that fixture exclusively
  to MenuList tenant/store `2/2`. No cookie, browser storage, token, password,
  or raw session payload was inspected.
- `2026-08-14` - A `390x844` responsive viewport check did not claim mobile
  certification. Current shell selection deliberately requires a true
  handheld signal from user agent, touch/coarse pointer, or mobile user-agent
  data; viewport width alone must not reclassify a narrow desktop browser.
  This browser runner exposes viewport control but not handheld/user-agent
  emulation. Hosted MobileShell tab and route/hash restoration therefore
  remain blocked on a true mobile browser or suitable device emulation.
- `2026-08-14` - A hosted HTTP sweep exercised all 62 static MenuList website
  page routes discovered under `src/app/(website)`. Every route reached an
  HTML 200 response; `/create-menu`, `/create-menu/success`, and `/invite`
  reached the canonical QA owner-app host, while `/product` reached canonical
  `/how-it-works`. Direct header checks found that the initial `/product` 301
  omitted `X-Robots-Tag`; adjacent checks reproduced the same omission on
  blocked `/sites/*`, tenant case-normalization, and Next's pre-Proxy
  trailing-slash redirect. Local code now routes controlled redirects through
  `applySecurityHeaders` and delegates the global canonical slash redirect to
  Proxy. Commit `fccff11f6329ad6979853b6220ca736d86e461c3` reached the
  branch-triggered Preview, and `/api/version` returned that exact build.
  Hosted reruns proved the corrected header on `/product`, blocked `/sites/*`,
  tenant case normalization, tenant trailing-slash normalization, and website
  trailing-slash normalization. The complete 62-route static header sweep then
  passed on the fixed build, and Chrome followed `/product` to
  `/how-it-works`, rendered the expected page, and emitted no browser warning
  or error. This defect is `FIXED`.
- `2026-08-14` - The public resource matrix added 143 hosted URLs: 15
  canonical English resource articles plus each resource hub and all 15
  articles under the eight admitted URL locales (`en-US`, `hi-IN`, `ar-SA`,
  `bn-IN`, `es-ES`, `mr-IN`, `ta-IN`, and `te-IN`). Every URL returned HTML
  200. `npm run verify:website-resource-locales` also passed. Together with
  the 62 static website routes, the current transport sweep covers 205 unique
  public website URLs.
- `2026-08-14` - Authenticated onboarding entry was exercised with retained QA
  owner B at tenant/store `2/2`. `/create-menu` rendered both upload and owned
  public-link modes. Empty input, a valid-shaped link without permission, and a
  checked localhost link all remained on the route with bounded recovery copy;
  no draft, Storage object, extraction job, or provider work was admitted by
  those failure paths. Switching back to upload and hard reloading restored the
  default upload state. Authenticated navigation to `/signin`,
  `/forgot-password`, `/403`, and `/unauthorized` returned through the existing
  dashboard/no-plan guard rather than exposing a second auth surface. The
  retained session was not logged out because no password or recovery material
  may be inspected.
- `2026-08-14` - Unauthenticated hosted checks reproduced a protected-response
  cache defect: `/api/auth/access-status` and
  `/api/auth/change-password` correctly returned `401`, but inherited
  `Cache-Control: public, max-age=0, must-revalidate`. Central `withAuth()` now
  applies the shared private/non-storable response headers. Commit
  `edc9446fead4974b731663248fcbdd543d653ffc` reached Preview deployment
  `menulist-core-4dqrjabne-neelvara-systems.vercel.app`; `/api/version`
  returned that exact build. Hosted reruns proved `private, no-store,
  max-age=0`, `Pragma: no-cache`, and `nosniff` on both `401` paths and a
  deliberate `403` CORS rejection. The authenticated owner session still
  loaded `/create-menu`, and `/signin` still settled through `/dashboard` to
  the honest `/billing` no-subscription state. This defect is `FIXED`.
- `2026-08-14` - The desktop output sweep found that unsubscribed QA owner B
  could open `/use-menulist` and `/qr-code`, where a denied project-summary
  read was logged as `[Use MenuList] Operation failed` and then mislabeled as
  “Create your first menu.” The same adjacent defect appeared on `/assets` as
  “Create your first menu to download assets.” Paid/starter admission now
  precedes Use MenuList reads; valid-plan admission now precedes Printable
  Assets reads. Commit `729abda9c11b8243e1e80614b05777030ec7c1c4`
  reached Preview deployment
  `menulist-core-llrdawd0k-neelvara-systems.vercel.app`; hosted
  `/use-menulist` and `/qr-code` both rendered `No Active Subscription`
  without a Use MenuList failure. Commit
  `97a328f19160dcc37eb68691a9fe6a712a68ccea` then reached deployment
  `menulist-core-63r99c1yc-neelvara-systems.vercel.app`; hosted `/assets`
  rendered the same honest plan state without a printable-assets/project-load
  failure. Only the known QA App Check diagnostic remained. These defects are
  `FIXED`.
- `2026-08-14` - A client-side owner-navigation sweep avoided repeated full
  auth bootstrap and exercised Dashboard/Billing, Today, Feedback, Business
  Settings, Users, Locations, Transactions, Help Center, and Digital Screens.
  The read-only owner states rendered in exact tenant/store `2/2`. Digital
  Screens emitted one transient load diagnostic but recovered on its section
  to the complete two-mode QA TV setup. Feedback consistently emitted its
  bounded load failure while presenting `No feedback yet`; Help Center emitted
  its public-content client failure while presenting `No articles available`
  and `No categories available`. All four deployed `guestFeedback` composite
  indexes exactly matched `firestore.indexes.json`; no Firebase deploy was
  needed. Commit `12376cf3f1957c6d8df388bb701619f8c4564adb`
  reached exact Preview build
  `923713c6d84ee189b6619b3498ad572a26b11a74`. Hosted Feedback now keeps the
  persistent failure, retry guidance, unavailable attention total, and no
  false-empty copy across a failed retry. Help Center category/article/
  changelog reads settled to honest empty data; the remaining Help diagnostic
  was isolated to the open-ticket summary, which hid after its failed DAL
  request. Commit `206c9621b5df5b24ec8d1c070241142bbfb1ce16`
  gives that summary its own persistent retry state; exact hosted rerun is
  complete on Preview build
  `aa3333a25014001fce86ebaa4632d50510e3b611`, deployment
  `menulist-core-odr6gk8v2-neelvara-systems.vercel.app`. The ticket failure
  remained visible after retry and did not render `No tickets yet`. Both UI
  truth defects are `FIXED`; their underlying QA read failures remain open.
- `2026-08-14` - App Settings opened from the retained QA owner shell and
  rendered the complete read-only configuration matrix: appearance, theme
  colors, vertical/horizontal layout, expanded/collapsed navigation, RTL/LTR,
  British English, UTC, date/time formats, and display toggles. The dialog was
  closed without saving or mutating QA data, and no new browser diagnostic was
  emitted. This certifies presentation and cancel behavior only; persistence,
  cross-tab propagation, mobile inheritance, and accessibility interaction
  remain pending.
- `2026-08-14` - Hosted `/menu-manager` on the prior build reproduced a false
  zero-menu state: `Untitled`, starter suggestions, and active-looking context
  surrounded an unavailable composer even though no menu was selected. Commits
  `adec881498ce8fd311c34de3055ba59f661992a8` and
  `d1876c5f155c4d7758939eed74656ac2117082c6` correct desktop/mobile state truth
  and defer the optional Digital Screen context read. The complete fix is now
  included in exact Preview build `597af4a9a5a63186bf544e4d074e319c1394b24f`,
  deployment `menulist-core-1tcycj4ku-neelvara-systems.vercel.app`; both
  `/menu-manager` and `/help-center` return private/no-store HTML 200 with QA
  noindex. After a hard refresh, Menu Manager selected the real `Menu` without
  rendering `Untitled`; a later bounded project-list failure rendered `Menus
  could not be loaded`, disabled context/composer actions, and unavailable
  pending/receipt rails. `Try again` recovered to the real selected menu,
  usable suggestions/composer, `No pending cards`, and `No receipts yet`. The
  old optional screen-context diagnostic did not recur; only the known QA App
  Check diagnostic and the recovered project-load failure were present. This
  desktop defect is `FIXED`.
- `2026-08-14` - Help Center auth tracing found that the shared provider keyed
  Firebase readiness to MenuList store state, so entry to `/help-center` could
  miss the dedicated Answerlattice auth transition. Commit
  `597af4a9a5a63186bf544e4d074e319c1394b24f` uses the existing route-aware
  Firebase scope key and product-aware in-flight deduplication while retaining
  MenuList store/bootstrap state. Exact hosted transport is live. Retained QA
  setup intentionally excluded Answerlattice environment/account provisioning,
  and QA owner B is MenuList-only, so a successful ticket read cannot be proven
  with this fixture; the truthful retryable unavailable state remains the QA
  expectation. Authenticated exact-build rerun confirmed the complete Help
  shell, honest empty knowledge/category sections, and visible retryable ticket
  failure. Console contained the known QA App Check diagnostic plus the bounded
  ticket DAL failure; no false `No tickets yet` state appeared.
- `2026-08-14` - Desktop Business Health on the preceding hosted bundle loaded
  its core health read model but repeatedly rejected Public Truth Monitor
  summary with `401` and treated the browser-created, not-yet-persisted
  assistant thread as a `404`. Commit
  `0bf5e4d7c71f4c1ebee31dc053b0969235e12078` reuses the already-authorized
  route session for Public Truth read/refresh rate limits and returns one
  non-enumerating empty envelope for absent or foreign-scope thread rows.
  Exact Preview build `0bf5e4d7c71f4c1ebee31dc053b0969235e12078`, deployment
  `menulist-core-8l2jo0skc-neelvara-systems.vercel.app`, hard-reloaded the full
  Business Health page, Official Customer Source report, priority checks, and
  first-use assistant suggestions. After a further 20-second settle, console
  retained only the known QA App Check diagnostic: no summary `401`, thread
  `404`, Public Truth rejection, or thread runtime failure. No refresh, answer,
  feedback, or other QA data mutation was performed.
- `2026-08-14` - Desktop `/projects` under retained ordinary-flow fixture `2/2`
  rendered the truthful `No Active Subscription` guard, but the preceding
  bundle still admitted its project-list/default-project path and logged
  `[Projects Page] Operation failed` behind that guard. Commit
  `f0461c3177bd9a3fdab3a12135f7c84a1dd20f5c` settles paid/starter admission
  before project SWR, editor preload, project auto-selection, and project/job
  listeners. Exact Preview deployment
  `menulist-core-qr37mdby1-neelvara-systems.vercel.app` hard-reloaded the same
  no-plan guard; after a 20-second settle, console retained only the known QA
  App Check diagnostic and no Projects failure. No project or entitlement data
  was mutated. The retained fixture contract reserves `1/1` for bounded
  Razorpay Test Mode, so full create/edit/duplicate/deactivate/delete/restore/
  reload certification remains fixture-blocked.
- `2026-08-14` - Business Profile rejected a whitespace-only required brand
  name, Reset restored `MenuList QA Cafe B`, and a hard reload confirmed the
  same persisted value without a QA mutation. The same Business Settings load
  reproduced a persistent Digital Screens failure. Source tracing showed that
  a failed protected GET was collapsed into successful absence and could fall
  through to initialization, while GET and POST shared the write-limit bucket.
  Commit `de56a3cfd80ce21a9e4c8f907d13b19490c7cf42` preserves read failures,
  initializes only after an authoritative absent response, separates hashed
  read/write rate limits, and gives desktop/mobile truthful retry states that
  withhold controls until state exists. Exact Preview deployment
  `menulist-core-72ena0kv7-neelvara-systems.vercel.app` loaded Menu Board,
  Highlights, and Custom Slides with no Digital Screen failure. No screen,
  business-profile, entitlement, or public data was mutated.
- `2026-08-14` - Retained ordinary owner `2/2` was navigated directly to the
  three elevated route families: `/platform`, `/ops`, and `/reseller`. Each
  shared server layout withheld privileged content and redirected through
  `/dashboard` to the owner's legitimate no-plan `/billing` state. The current
  persisted-role guard, platform/ops nested-layout coverage, and reseller role
  boundary passed their focused verifiers. No role, claim, user, reseller,
  platform, ops, or tenant data was read through a privileged surface or
  mutated. Authorized PLATFORM/RESELLER success remains fixture-blocked.
- `2026-08-14` - App Settings persistence was exercised with the reversible
  `Show today's date` display preference. The retained value changed from off
  to on and remained on after reload, then was restored from on to off and
  remained off after the second reload. The panel was closed and the original
  baseline was restored. No server, tenant, store, project, entitlement, or
  public data mutation was involved.

## Execution Ledger

| ID | Surface | Flow | Viewport | Preconditions | Expected | Actual | Status | Evidence | Data mutations | Cleanup | Fix commit | Hosted build | Remaining risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ML-QA-000 | Deployment | Exact source/host alignment | HTTP | `staging` checkout | Runtime source, remote, and hosted Preview report one application commit | Latest application source `de56a3cfd80ce21a9e4c8f907d13b19490c7cf42` reached hosted Preview with env `preview` at deployment `menulist-core-72ena0kv7-neelvara-systems.vercel.app` | PASS | `git rev-parse HEAD`; `git rev-parse origin/staging`; `GET https://app.menulist.digital/api/version` on 2026-08-14 | None | None | `de56a3cfd80ce21a9e4c8f907d13b19490c7cf42` | `de56a3cfd80ce21a9e4c8f907d13b19490c7cf42` | The following evidence-only ledger commit does not change application runtime; future application edits require a new exact-build gate |
| ML-QA-001 | QA hosts | Website and sign-in transport plus crawler isolation header | HTTP | Public network | Both hosts return 200 and QA noindex header | Both returned HTTP 200 with `x-robots-tag: noindex, nofollow, noarchive`; full static route and redirect sweep also retained the QA header | PASS | Response headers from `menulist.digital` and `app.menulist.digital/signin`; 62-route exact-build sweep on 2026-08-14 | None | None | `fccff11f6329ad6979853b6220ca736d86e461c3` | `fccff11f6329ad6979853b6220ca736d86e461c3` | Robots/sitemap policy is retained setup evidence; public route transport is covered below |
| ML-QA-002 | QA website | Static and localized resource transport, canonical redirects, rendered smoke, and crawler isolation | HTTP and desktop Chrome | Exact hosted Preview and source-derived route inventory | All 205 inventoried URLs resolve; owner paths use canonical app host; every QA response, including redirects, is noindex | 62 static URLs and 143 resource/locale URLs resolved successfully. The missing redirect headers were corrected and reran cleanly; Chrome rendered `/product` at canonical `/how-it-works` without console issues | FIXED | Hosted GET/HEAD matrices; controlled Chrome DOM/console; `test:menulist-host-routing`; `verify:website-resource-locales`; Next compatibility; focused lint; TypeScript | None | None | `fccff11f6329ad6979853b6220ca736d86e461c3` | `fccff11f6329ad6979853b6220ca736d86e461c3` | Page-specific interactions and form mutations remain under their owning feature rows; transport/render coverage is complete |
| ML-QA-010 | Authentication | Existing session restoration and owner shell | Desktop Chrome | Logged-in QA owner at scope `2/2` | Trusted session restores, exact scope loads, no cross-product or subscription bypass | Retained `QA owner B` session restored; fixture authority maps it to `2/2`; `/billing` and hard-reloaded `/projects` rendered the full owner shell and honest no-plan guard; prior session-prime/store-bootstrap errors did not recur. On exact build `edc9446fe`, authenticated `/signin` returned through `/dashboard` to the honest `/billing` no-plan guard. | IN PROGRESS | Controlled Chrome DOM, account-menu identity, and console inspection on 2026-08-14; retained QA fixture mapping; only the documented non-blocking App Check skip diagnostic appeared | None | None | None | `edc9446fead4974b731663248fcbdd543d653ffc` | Logout/relogin, stale-session expiry, and explicit permission-denial cases remain; fixture is intentionally unsubscribed |
| ML-QA-011 | Authentication | Existing session restoration and owner shell | Mobile Chrome | Same session and `ENABLE_MOBILE_UI` | MobileShell loads inside owner app with correct visible tabs and scope | A `390x844` resize remained in desktop shell as designed because the runner cannot provide handheld UA/touch signals | BLOCKED | Hosted viewport proof plus `useDeviceType`/layout-wrapper source boundary; local `verify:mobile-shell-route-map` is PASS but is not hosted proof | None | None | None | `f05001553bc41525564351a6bcbb7d1826ad1792` | Requires true mobile Chrome or handheld emulation for tabs, route/hash restoration, reload, and scope proof |
| ML-QA-012 | Authentication/API | Protected response storage and CORS rejection | HTTP and desktop Chrome | Exact hosted Preview; no browser credentials for negative HTTP checks | Protected responses are never shared-cache state; auth flow remains usable | Reproduced public revalidation headers on protected `401` responses; central middleware correction reached QA. Hosted `401` and deliberate CORS `403` reruns now return private/no-store, no-cache, and nosniff. Authenticated owner smoke remained intact. | FIXED | Exact `/api/version`; response headers for access-status, change-password, public create-menu, and rejected Origin; focused auth matrix, lint, TypeScript | None | None | `edc9446fead4974b731663248fcbdd543d653ffc` | `edc9446fead4974b731663248fcbdd543d653ffc` | OPTIONS preflight intentionally keeps the dedicated CORS policy |
| ML-QA-020 | Onboarding | First project and onboarding continuity | Desktop and mobile | QA owner `2/2`; snapshot before mutation | Existing default project loads without recreating or escaping scope | Authenticated entry, both input modes, empty/unconfirmed/private-link failures, tab recovery, and hard reload passed without admitted draft/job/provider work. Existing first-project continuity was not rerun. | IN PROGRESS | Controlled Chrome DOM on exact hosted builds through `edc9446fe`; server source confirms rejected input does not reach Storage/draft/job creation | None | None | None | `edc9446fead4974b731663248fcbdd543d653ffc` | Valid upload/link success and preview/claim continuity require bounded before/after data proof; mobile remains blocked; avoid destroying retained fixture |
| ML-QA-030 | Dashboard/Today | Dashboard, Today, Business Health, and Feedback entry | Desktop and mobile | Auth and owner shell pass | Each visible entry loads correct scoped state and honest empty/no-plan behavior | Dashboard settled to the honest no-plan Billing state. Today rendered its complete action list and stable no-action state. Feedback renders its truthful retryable failure instead of empty inbox truth. Business Health now loads the complete scoped desktop report and quiet first-use assistant state. | IN PROGRESS | Controlled Chrome DOM/console through exact hosted `0bf5e4d7c`; focused Feedback/Business Health verifiers, lint, TypeScript, contextual-state gate | None | None | `12376cf3f1957c6d8df388bb701619f8c4564adb`, `0bf5e4d7c71f4c1ebee31dc053b0969235e12078` | `0bf5e4d7c71f4c1ebee31dc053b0969235e12078` | Mobile and a successful Feedback data read remain pending |
| ML-QA-031 | Feedback | Failed inbox read versus confirmed empty state | Desktop Chrome | QA owner `2/2`; deployed indexes match source | Failed list/count read stays visibly unavailable and retryable; it never becomes empty/zero truth | Exact hosted QA keeps the persistent load failure and retry guidance, suppresses `No feedback yet`, marks the attention total unavailable, and preserves the same truthful state after retry fails. | FIXED | Exact hosted Chrome DOM/console; read-only QA index inventory; `verify:guest-feedback-boundary`; focused lint; TypeScript | None | None | `12376cf3f1957c6d8df388bb701619f8c4564adb` | `923713c6d84ee189b6619b3498ad572a26b11a74` | Underlying QA feedback read remains unavailable and requires environment/auth investigation; App Check skip diagnostic is unchanged |
| ML-QA-032 | Business Health | Public Truth summary and first-use assistant thread | Desktop Chrome | QA owner `2/2`; existing scoped health/menu read models; no assistant answer persisted | Public Truth reuses admitted auth; a valid pre-persistence thread is a quiet empty state; no foreign thread existence/data is exposed | Reproduced summary `401` and thread `404` on the preceding bundle. Exact fixed build rendered Official Customer Source, priority checks, and starter questions; after 20 seconds console contained only the known QA App Check diagnostic. | FIXED | Exact `/api/version`; controlled hard-reload DOM/console on `0bf5e4d7c`; `verify:owner-business-assistant`; `verify-owner-business-health-boundary`; focused lint; TypeScript; docs links | None | None | `0bf5e4d7c71f4c1ebee31dc053b0969235e12078` | `0bf5e4d7c71f4c1ebee31dc053b0969235e12078` | Refresh/answer writes and true handheld MobileShell remain pending under ML-QA-030; cross-actor non-enumeration is source-gated rather than destructively fixture-tested |
| ML-QA-040 | Projects | Full CRUD, cancel, reload, recovery | Desktop and mobile | Snapshot project and compact summary | Bounded operations are idempotent and remain inside `2/2` | Exact-build `/projects` rendered the honest no-subscription guard with no CRUD surface. The denied-path read defect is fixed under ML-QA-041. Retained `2/2` has no legitimate entitlement and `1/1` is reserved for Razorpay Test Mode only. | BLOCKED | Controlled Chrome DOM/console on exact hosted `f0461c317`; retained QA fixture authority | None | None | `f0461c3177bd9a3fdab3a12135f7c84a1dd20f5c` | `f0461c3177bd9a3fdab3a12135f7c84a1dd20f5c` | Requires a separately authorized entitled disposable `2/2`-family fixture or explicit fixture provisioning before create/edit/duplicate/deactivate/delete/restore/reload; mobile remains blocked |
| ML-QA-041 | Projects | Denied-plan project and job read boundary | Desktop Chrome | QA owner `2/2` has no paid or starter access | Admission settles before project reads, default-project creation, editor preload, or project/job listeners; the no-plan guard stays honest | Reproduced `[Projects Page] Operation failed` behind the no-plan guard on the preceding bundle. Exact fixed build retained the guard and, after 20 seconds, emitted no Projects failure; only the known QA App Check diagnostic remained. | FIXED | Exact `/api/version`; controlled hard-reload DOM/console on `f0461c317`; `verify:menu-project-editor-boundary`; focused lint; TypeScript; docs links | None; fixed denied path performs zero project/job reads and zero default-project writes | None | `f0461c3177bd9a3fdab3a12135f7c84a1dd20f5c` | `f0461c3177bd9a3fdab3a12135f7c84a1dd20f5c` | Paid/starter CRUD success and true handheld MobileShell remain under ML-QA-040 |
| ML-QA-050 | Menu | Categories, items, pricing, visibility, variants, translations, publish, import, extraction, images, failure recovery | Desktop and mobile | Stable test project and bounded source assets | Every supported edit persists, publishes, reloads, and fails safely | Not exercised | NOT STARTED | Pending | Pending | Pending | None | `40c428d5f9b177a2d6ce85db9577badf0bbdf679` | Paid AI/provider calls require cost and fixture control |
| ML-QA-060 | Business Settings | All owner-controlled public business facts | Desktop and mobile | Auth and test project | Valid changes persist and invalid/cancelled changes do not mutate truth | Desktop loaded every scoped settings section. Business Profile rejected a whitespace-only required brand, Reset restored the original, and reload confirmed unchanged persisted truth. Digital Screens read recovery is fixed under ML-QA-061. | IN PROGRESS | Controlled Chrome DOM/console on exact hosted `de56a3cfd`; focused Digital Screens gate, lint, TypeScript | None | Local draft reset; persisted brand remained `MenuList QA Cafe B` | `de56a3cfd80ce21a9e4c8f907d13b19490c7cf42` | `de56a3cfd80ce21a9e4c8f907d13b19490c7cf42` | Valid persist/public projection, remaining field-specific invalid/cancel flows, mobile, and physical screen opens remain pending |
| ML-QA-061 | Business Settings / Digital Screens | Owner-state read, initialization boundary, rate limiting, and recovery | Desktop Chrome plus source-gated mobile parity | QA owner `2/2` with Digital Screens permission; no screen mutation authorized | Failed reads remain failures and never initialize; GET/POST use separate read/write buckets; success exposes real screen controls and failure exposes retry only | Reproduced persistent screen-settings failure on the preceding bundle. Exact fixed build loaded Menu Board, Highlights, and Custom Slides without a Digital Screen console failure. Desktop/mobile source gates require retry-only controls until state exists. | FIXED | Exact `/api/version`; controlled hosted DOM/console on `de56a3cfd`; `verify:digital-screens-boundary` including lifecycle, rules emulator, and management emulator; focused lint; TypeScript; docs links | None; successful read retains documented transaction reads and rejected reads perform no initialization write | None | `de56a3cfd80ce21a9e4c8f907d13b19490c7cf42` | `de56a3cfd80ce21a9e4c8f907d13b19490c7cf42` | True handheld presentation and physical Menu Board/Highlights opens remain pending; known QA App Check diagnostic is unchanged |
| ML-QA-070 | Use MenuList | Customer link, QR, assets, public menu, PWA and noindex | Desktop and mobile/customer | Published bounded test menu | Outputs resolve to exact QA wildcard and render correctly | No-plan desktop admission and recovery state now pass on `/use-menulist`, `/qr-code`, and `/assets`; paid output generation and customer delivery were not exercised | IN PROGRESS | Exact hosted builds `729abda9c` and `97a328f19`; controlled Chrome DOM/console; output and printable-asset verifiers; lint; TypeScript | None | None | `729abda9c11b8243e1e80614b05777030ec7c1c4`, `97a328f19160dcc37eb68691a9fe6a712a68ccea` | `97a328f19160dcc37eb68691a9fe6a712a68ccea` | Current fixture has no permanent subdomain and no legitimate entitlement; link/QR/download success remains blocked on bounded fixture authority |
| ML-QA-071 | Use MenuList/Assets | Output entitlement and truthful empty-state boundary | Desktop Chrome | QA owner `2/2` has no active plan and no starter access | Denied owners see honest plan state; no project/template read failure is translated into missing-menu copy | Reproduced false missing-menu copy and Use MenuList diagnostic; both output components now gate reads before rendering. Hosted `/use-menulist`, `/qr-code`, and `/assets` show the shared no-plan state with no feature-load failure. | FIXED | Controlled Chrome DOM/console on exact builds; `verify-public-business-truth`; `verify:printable-asset-templates`; focused lint; TypeScript | None; fixed denied path performs zero feature reads/writes | None | `729abda9c11b8243e1e80614b05777030ec7c1c4`, `97a328f19160dcc37eb68691a9fe6a712a68ccea` | `97a328f19160dcc37eb68691a9fe6a712a68ccea` | Paid/starter success behavior remains under ML-QA-070; known QA App Check diagnostic is unchanged |
| ML-QA-080 | Team/Locations | Users, roles, invitations, staff, locations, isolation | Desktop and mobile | Suitable disposable QA identities and snapshot | Permission and tenant/store boundaries deny unauthorized actions | Desktop Users rendered only QA owner B in the retained scope; Locations rendered the zero-outlet policy state. No invitation, role, staff, or outlet mutation was attempted. | IN PROGRESS | Controlled Chrome DOM/console on hosted `97a328f19` | None | None | None | `97a328f19160dcc37eb68691a9fe6a712a68ccea` | Requires disposable staff/outlet fixtures and exact cleanup; mobile pending |
| ML-QA-090 | Billing | Subscription and transactions without real money | Desktop and mobile | QA owner `1/1`; Razorpay Test Mode baseline | Pending checkout recovery and lifecycle remain idempotent; no fabricated entitlement | Not exercised in this ledger | NOT STARTED | Pending | Pending | Pending | None | `40c428d5f9b177a2d6ce85db9577badf0bbdf679` | Final checkout authorization is owner-assisted and may remain BLOCKED |
| ML-QA-100 | Settings/Support/PWA | Help, app settings, locale, theme, offline/reload, accessibility | Desktop and mobile | Core owner flows available | State inherits correctly and recovery paths are usable | Help shell, search, support entries, recent-viewed state, footer, and navigation rendered. Category/article/changelog reads settled to honest empty content, and failed ticket summary remains retryable on the latest exact build. App Settings rendered every maintained desktop appearance/locale/layout option and closed without mutation. | IN PROGRESS | Controlled Chrome DOM/console through hosted `597af4a9a`; Help Center and auth-scope verifiers, lint, TypeScript, contextual-state gate | None | None | `12376cf3f1957c6d8df388bb701619f8c4564adb`, `206c9621b5df5b24ec8d1c070241142bbfb1ce16`, `597af4a9a5a63186bf544e4d074e319c1394b24f` | `597af4a9a5a63186bf544e4d074e319c1394b24f` | Search/ticket mutations, settings persistence, mobile, offline and physical-device PWA remain pending |
| ML-QA-101 | Help Center | Failed landing requests versus confirmed empty/absent content | Desktop Chrome | QA owner `2/2`; protected public-content and ticket transports | A failed landing request stays visibly unavailable and retryable; confirmed empty content remains distinct | Exact hosted QA confirmed honest category/article/changelog empty states and a persistent open-ticket-summary failure. Latest exact-build rerun preserved the visible retry state and bounded DAL diagnostic; `No tickets yet` stayed absent. | FIXED | Exact hosted Chrome DOM/console; `verify:help-center-boundary`; auth scope boundary; contextual-state gate; focused lint; TypeScript | None | None | `12376cf3f1957c6d8df388bb701619f8c4564adb`, `206c9621b5df5b24ec8d1c070241142bbfb1ce16`, `597af4a9a5a63186bf544e4d074e319c1394b24f` | `597af4a9a5a63186bf544e4d074e319c1394b24f` | QA owner B intentionally has no Answerlattice product-account/environment provisioning, so successful ticket reads require a separately authorized fixture; current knowledge/category data is confirmed empty |
| ML-QA-102 | App Settings | Desktop configuration presentation, cancel, and local persistence | Desktop Chrome | Retained QA owner `2/2`; settings dialog available | Every maintained control renders; reversible preference changes survive reload and can be restored exactly | Complete control matrix rendered. `Show today's date` persisted off→on through reload, then on→off through reload; the panel closed with the original baseline restored. | PASS | Controlled hosted Chrome DOM on application build `de56a3cfd`; two reload assertions | Browser-local display preference only | Restored `Show today's date` to off and closed panel | None | `de56a3cfd80ce21a9e4c8f907d13b19490c7cf42` | Cross-tab propagation, remaining preference families, keyboard/screen-reader interaction, and MobileShell inheritance remain pending under ML-QA-100 |
| ML-QA-110 | Internal/Reseller | Platform, ops, and reseller role-gated surfaces | Desktop and mobile | Correct synthetic role fixtures | Authorized roles load; ordinary owner is denied | Ordinary-owner denial passes under ML-QA-111. No authorized elevated fixture was created or reused. | IN PROGRESS | Hosted denial plus shared role/layout verifiers | None | None | None | `de56a3cfd80ce21a9e4c8f907d13b19490c7cf42` | Do not grant elevated roles casually; PLATFORM and RESELLER success plus mobile require an explicitly authorized fixture plan |
| ML-QA-111 | Internal/Reseller | Ordinary-owner denial across elevated route families | Desktop Chrome plus source-gated nested routes | Retained QA owner `2/2` has no platform or reseller role | Platform, ops, and reseller layouts render no privileged content and redirect to the ordinary owner surface | Direct `/platform`, `/ops`, and `/reseller` navigation rendered no privileged content and settled through `/dashboard` to the honest no-plan `/billing` state. Shared layouts cover every nested route and re-read current persisted role authority. | PASS | Controlled hosted DOM/URL on application build `de56a3cfd`; `verify:ops-control-room-boundary`; `verify:internal-ops-flow-boundary`; `verify:reseller-dashboard-boundary` | None | None | None | `de56a3cfd80ce21a9e4c8f907d13b19490c7cf42` | Elevated-role success and true handheld behavior remain under ML-QA-110 |
| ML-QA-120 | AI Menu Manager | Menu selection, list failure, composer/context and recovery truth | Desktop and mobile | Retained QA owner `2/2`; one real menu; bounded intermittent list failure | Loading, failure and selected-menu states stay distinct; no fabricated menu, suggestions, context, composer, pending cards or receipts | Prior hosted build reproduced fabricated `Untitled`. Exact fixed build loaded the real `Menu` without that transient. A later failed list read rendered persistent unavailable/retry truth with disabled actions; `Try again` recovered the real menu, suggestions, composer, and healthy empty rails. | FIXED | Exact controlled Chrome DOM/console on `597af4a9a`; `verify-ai-menu-manager`; contextual-state gate; focused lint; TypeScript; exact `/api/version` and route headers | None | None | `adec881498ce8fd311c34de3055ba59f661992a8`, `d1876c5f155c4d7758939eed74656ac2117082c6` | `597af4a9a5a63186bf544e4d074e319c1394b24f` | Confirmed zero-menu desktop branch remains source-gated because this fixture owns a menu; true handheld MobileShell evidence remains separately blocked |

## Known External Or Owner-Controlled Boundaries

These remain open and must never be marked complete without direct evidence:

- `QA-A05`: named daily operator.
- `QA-A11`: provider MFA and recovery.
- `QA-A13`: second trusted Super Admin.
- `QA-A15`: retired Firebase key ownership and revocation.
- `QA-A20`: old Vercel account retirement.
- `QA-K13`: production read-only absence proof.
- Razorpay Test Mode final checkout authorization and first successful charge
  require owner-assisted browser interaction; no transition will be fabricated.

## Next Certification Action

Complete the remaining ML-QA-010 logout/relogin, stale-session, and explicit
permission-denial cases only when disposable credentials or a bounded fixture
make them safe. Continue ML-QA-020 with before/after proof for one authorized
valid intake without recreating or deleting the retained `2/2` project.
ML-QA-011 remains blocked until true handheld browser evidence is available; a
narrow desktop viewport is not a substitute.
Continue the read-only owner-route matrix after the auth-sync limiter cools;
do not treat the expected bounded `429` from the rapid navigation sweep as a
feature failure or bypass it.
