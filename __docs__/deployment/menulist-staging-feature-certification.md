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
- `2026-08-14` - The retained owner `2/2` Business Settings form rejected a
  whitespace-only Location name together with an invalid business email, and
  separately rejected an invalid Reservation Link. Reset and hard reload
  restored the exact original `Main Store`, QA owner email, and blank link.
  Established Year, Google Rating, and Review Count clamped `1899`, `6`, and
  `-1` to `1900`, `5.0`, and `0`; the valid bounded save survived until the
  fields were explicitly cleared, saved, and hard-reloaded back to their three
  original blank values. External Menu Sync is an independently auto-persisted
  control rather than a draft governed by the page-level Reset: it was enabled
  without adding a provider URL or testing/delivering an update, then disabled
  again, and hard reload confirmed the original `External sync is off` state.
  No tested Business Settings mutation remains in the retained fixture.
- `2026-08-14` - Guest Feedback's enablement, contact-field defaults, and
  Google Review URL are React-controlled drafts outside the Ant Design form.
  On the preceding hosted bundle, changing `Enable Guest Feedback` from on to
  off and pressing the page-level Reset left the cancelled off draft visible,
  allowing a later unrelated Save to persist it. Commit
  `5a1020b0ac0955bf0552129d185285f5c59dd77d` introduces one persisted feedback
  draft resolver for initialization and Reset. Exact Preview deployment
  `menulist-core-telk5dkiw-neelvara-systems.vercel.app` reproduced the same
  on-to-off draft, then Reset immediately restored on and hard reload retained
  on. External Sync remained at its original off baseline. The fixed hosted
  verification performed no store write.
- `2026-08-14` - Guest Feedback settings exposed unnamed master, collection,
  required-field, and review URL controls on desktop, with the same missing
  switch names in the mobile settings layer. Commit
  `160adb94425bd4754f3ea604f9bb23c86aab9fc2` adds localized desktop names,
  forwards `aria-label` through the shared mobile Switch adapter, names the
  matching mobile controls, and extends the source gate. Exact Preview
  deployment `menulist-core-93v4boct6-neelvara-systems.vercel.app` exposed
  every desktop switch and the review URL textbox by name. Feedback was then
  changed from on to off; a separately loaded authenticated app document
  proved the stored off value. The reverse save restored on, and a third
  independent document confirmed the complete original feedback defaults and
  blank review URL. The same exact build also completed an authoritative empty
  owner-inbox read (`No feedback yet`, zero needs attention), closing the prior
  successful-read environment gap. No customer feedback form was submitted.
- `2026-08-14` - Temporary Status exposed a customer-visible timezone mismatch
  before mutation: the desktop expiry field showed `Aug 15, 2026 10:00 PM`
  while its customer preview showed `15 Aug 2026 04:30 pm`. Commit
  `e9edc4425388e2c465af6e62bd8c638fbc2282d5` interprets the Ant Design picker
  wall time through the active app timezone, matching the canonical mobile
  conversion contract, and adds an Asia/Kolkata round-trip regression. Exact
  Preview deployment `menulist-core-c7lle0zj0-neelvara-systems.vercel.app`
  rendered `Aug 15, 2026 5:00 PM` in the picker and `15 Aug 2026 05:00 pm` in
  the customer preview. Reload retained the original no-active-status state.
  The visible set action was exposed, enabled, and focusable, but the controlled
  Chrome action layer did not activate its confirmation after repeated pointer
  and keyboard attempts; no status write is claimed or fabricated.
- `2026-08-14` - Business Attributes completed a reversible hosted lifecycle on
  ordinary owner `2/2`. All 17 controlled attributes were initially off and no
  custom rows existed. Vegetarian was turned on and saved; a separately loaded
  authenticated app document proved the stored on value. The reverse save
  restored off, and a third independent document confirmed all 17 attributes
  off with no custom rows. A no-write custom-row inspection then reproduced two
  unnamed icon-only actions. Commit
  `eec7b3dc07ed82b63b2fd54213c290835f47baa5` adds localized desktop/mobile
  names plus a shared icon-picker fallback. Exact Preview deployment
  `menulist-core-5tomkuo5i-neelvara-systems.vercel.app` exposed
  `Select... Custom Attributes` and `Remove Custom Attributes`; reload removed the draft
  row and reconfirmed the exact original store baseline.
- `2026-08-14` - Customer App settings completed a reversible install-prompt
  lifecycle on ordinary owner `2/2`. The exact baseline was Customer App on,
  install prompt on, blank home-screen name, automatic icon, and no install
  link because the fixture has no subdomain. Show install prompt was saved off
  and remained off in a separately loaded authenticated app document. The
  reverse save restored on, and a third independent document confirmed the
  complete baseline. The preceding build exposed both desktop switches without
  accessible names, while the mobile prompt switch did not forward its disabled
  state. Commit `cc092ba8e2b6a3812122fa54eddda224661edd95` names the desktop
  and mobile controls and forwards mobile disabled semantics. Exact Preview
  deployment `menulist-core-lo535xptn-neelvara-systems.vercel.app` exposed both
  named switches; a no-write master-off draft also rendered Show install prompt
  disabled. Reset and reload restored the exact persisted baseline.
- `2026-08-15` - Social Media completed a full hosted write-admission,
  canonicalization, custom-platform, accessibility, persistence, and cleanup
  lifecycle on ordinary owner `2/2`. The preceding build accepted and
  persisted `https://example.com/not-instagram`; the public renderer would
  later hide that wrong-host owner truth. Commit
  `ebb6e57bd6addbbdec9f093f503f593375d03b9b` adds one desktop/mobile owner
  write boundary matching the public host contract, rejects invalid drafts
  before the store update, canonicalizes handles, and names desktop/mobile
  controls. Commit `5a06e5298e6f378c18bc1dd2d934e2d65841739c`
  preserves custom-row identity so `tripadvisor` retained keyboard focus after
  every character. Hosted cleanup then exposed a stale-draft race: removing
  the custom row after quickly clearing the five built-in fields restored
  their old values. Commit `2262a2aa4a79529c105b2c6615eb58b2967df05d`
  converts all five desktop social draft mutation paths to functional updates.
  Exact Preview deployment
  `menulist-core-47juq06q9-neelvara-systems.vercel.app` retained canonical
  Facebook, Instagram, X, LinkedIn, YouTube, and custom Tripadvisor links in an
  independent document; exposed named clear/removal controls; preserved custom
  label focus; then cleared all six links in one save. A final independent
  document showed five blank built-in fields and zero custom rows. A repeated
  wrong-host Instagram draft remained write-free. Six bounded store updates
  occurred across reproduction, recovery, valid persistence, stale-cleanup
  diagnosis, exact-fix setup, and final cleanup; no provider/public route was
  opened or invoked.
- `2026-08-14` - The same page-level Reset defect affected the other
  parent-controlled Business Settings drafts. On the preceding hosted bundle,
  a blank Instagram profile changed to a test URL and remained changed after
  Reset; reload recovered the persisted blank. Source inspection also showed
  that regular weekly hours and their dirty-day tracking were omitted from
  Reset, while special hours, time-slot presets, and External Menu Sync
  correctly retain independent save semantics. Commit
  `8e561bdbdcf34997a67fe5e0642a5c2a4d8d3522` restores social URLs and weekly
  hours from current store truth and clears weekly-hours dirty tracking. Exact
  Preview deployment `menulist-core-44khy7645-neelvara-systems.vercel.app`
  restored the Instagram draft to blank immediately. A blur-only Sunday
  `09:00 AM`-`05:00 PM` draft also Reset to blank and hard reload confirmed all
  seven days blank. During the first hours attempt, Enter submitted that test
  Sunday range; it was explicitly cleared with the visible range control,
  saved, and reload-confirmed back to the original all-closed baseline before
  the no-write Reset proof was rerun.
- `2026-08-14` - The first weekly-hours test also proved that pressing Enter
  inside the Ant Design range picker submitted and persisted the entire parent
  Business Settings form on the preceding bundle. Commit
  `28c36c2c2ba8d61e44f948695cd63415aafc677f` prevents the native form-submit
  default only when Enter originates inside `.ant-picker`; picker key handling
  and explicit Save Changes remain intact. Exact Preview deployment
  `menulist-core-qakid6omw-neelvara-systems.vercel.app` accepted a Sunday
  `09:00 AM`-`05:00 PM` range and rendered its local preview after Enter. A
  direct hard reload without Reset or Save returned all seven days to blank,
  proving the key no longer wrote store truth. Instagram remained blank, Guest
  Feedback remained on, and External Sync remained off.
- `2026-08-14` - Special Hours completed a bounded last-entry lifecycle on the
  retained ordinary owner `2/2`: the empty state was captured, a future closed
  date for `16 Aug 2026` with label `QA certification cleanup` was added, and a
  hard reload proved it persisted. The Vercel feedback overlay covered the
  visible trash-button coordinates during pointer automation, so repeated
  pointer attempts did not exercise the app control. Keyboard activation of
  the same visible Remove and OK controls exercised the real path; the row
  disappeared after the hosted write, and a final hard reload confirmed `No
  special dates added.`, no retained label/date, and zero remove controls. No
  application defect or source change was required.
- `2026-08-14` - Time Slot Presets exposed a desktop accessibility gap before
  mutation: the edit/delete icon actions had no accessible names, and the
  shared color swatches were pointer-only `div` controls. Commit
  `a8a529756d28ee9e219817ddee87bb44128f2db2` adds localized action names and
  keyboard-focusable pressed-state color buttons. On exact Preview deployment
  `menulist-core-rohmfeq4t-neelvara-systems.vercel.app`, the create modal
  exposed 12 named color buttons. A `QA certification slot` preset was created,
  retained in a separately loaded authenticated app document, edited to `QA
  certification slot edited`, retained again in another fresh document, then
  deleted through the named control and cascade confirmation. A final fresh
  app document showed `No time slot presets yet`, neither test label, and zero
  edit/delete controls. The original empty baseline is restored.
- `2026-08-14` - Locale Settings completed a bounded scalar persistence and
  cleanup lifecycle on ordinary owner `2/2`. The exact baseline was
  Asia/Kolkata, 3:00 AM business-day end, `numeric|short|numeric` date format,
  padded 12-hour time, INR, and English. Time format changed to 24-hour and a
  separately loaded authenticated app document proved the stored value. The
  reverse save restored padded 12-hour time; another fresh document confirmed
  the complete original locale baseline was unchanged. The MenuList public
  business-truth verifier passed. The aggregate global-localization command
  completed its MenuList source, owner-locale, public-customer, runtime,
  theme, and localization checks before ending on an unrelated existing
  CampaignCue no-opener assertion; no CampaignCue source was changed in this
  MenuList certification slice.
- `2026-08-14` - Analytics Settings completed a privacy-reducing reversible
  lifecycle on ordinary owner `2/2`. The exact baseline had Menu activity,
  Featured section analytics, Official business page activity, and Customer
  app activity on; Approximate location was off; and the Google Analytics,
  Google Search Console, and Facebook Pixel fields were blank. Customer app
  activity was switched off and saved without adding or invoking an external
  provider. A separately loaded authenticated app document proved the stored
  off value. The reverse save restored it to on, and a third independent app
  document confirmed every toggle and provider field matched the original
  baseline. No Analytics Settings defect was reproduced. The wider Customer
  App source gate then exposed three stale verifier assumptions: a retired raw
  env read, a retired metric-copy key, and an env assignment that occurred
  after the centralized env module had already evaluated. Commit
  `7e9613aeb4788e5ad0467e68120c7c42a18a4167` aligns those checks with current
  runtime truth; the complete Customer App PWA verifier now passes.
- `2026-08-15` - Temporary Status completed the previously blocked authenticated
  persistence lifecycle on ordinary owner `2/2`. The preceding exact build
  accepted valid draft interaction but its desktop static set confirmation did
  not render, and the clear path used the same fragile mechanism. Commit
  `1145cc136c7ecd818cdfe0bca02cec31d36d13eb` replaces both with controlled
  card-owned confirmation modals. Exact Preview
  `menulist-core-7porrvmdl-neelvara-systems.vercel.app` rendered the set and
  clear dialogs with the expected expiry/customer wording. Cancel on each path
  survived a fresh load without changing truth. `Closed today` was then set
  through the real API and a separately loaded authenticated app document
  retained `Expires 15 Aug 2026 06:00 pm`; clear completed through its real API,
  and a third fresh document confirmed the original no-status baseline. This
  produced one bounded store set and one bounded store clear. No Firebase
  schema, rule, index, Function, provider, paid, production, or direct-deploy
  operation was involved.
- `2026-08-15` - Official Business Page icon style reproduced as a functional
  desktop form defect on the preceding exact build: the visible switch had no
  accessible name, stayed off after activation, produced no dirty/save
  acknowledgement, and reloaded unchanged. Commit
  `61fce68025da3b63c47446047d43977e74489dc3` registers the existing
  `publicPresence.iconVariant` field and names the desktop/mobile controls.
  Exact Preview `menulist-core-h1rroocgi-neelvara-systems.vercel.app` exposed
  the named switch. Standard icons changed to emoji, survived a fresh reload,
  then changed back to standard icons and survived a second fresh reload. This
  produced two bounded existing store updates and restored the exact baseline.
  The fixture has no public tenant URL, so customer-page projection remains
  source-gated and explicitly pending rather than fabricated.
- `2026-08-15` - Official Business Page visibility completed the full desktop
  lifecycle for all seven quick-action controls and all three policy-link
  controls on ordinary owner `2/2`. A Call plus Privacy draft was Reset and a
  fresh reload proved that cancellation was write-free. A diagnostic settled
  Call-only save separated product persistence from an earlier interrupted
  all-field save attempt; the remaining nine controls were then saved off, and
  a fresh reload proved all ten explicit false values. One final settled save
  restored all ten controls to on, and a fresh reload on exact application
  commit `c3a3e2f28f55d53f4b5c85c262430055453e69e6` confirmed the original
  baseline. Source review found the adjacent mobile controls lacked accessible
  names; the same commit adds localized names to all ten mobile switches and
  verifier coverage. Exact Preview
  `menulist-core-4mx2phex9-neelvara-systems.vercel.app` and the app alias both
  report that commit with env `preview`. The fixture has no public tenant URL,
  and the runner cannot provide a true handheld MobileShell, so those two
  presentation checks remain explicitly pending.
- `2026-08-15` - Compliance Pages completed the authenticated desktop
  override/reset lifecycle on ordinary owner `2/2`. Privacy, Terms, and Refund
  each loaded the MenuList baseline. A temporary Privacy draft was cancelled,
  and a fresh reload proved it caused no write. A bounded 230-character QA
  Privacy override then persisted through a fresh load as custom content plus
  the MenuList baseline; Reset to default deleted the override, and another
  fresh load restored the exact baseline. This produced one acknowledged
  override write and one acknowledged reset write. Source review found that
  the desktop page selectors did not expose their pressed state, mobile
  icon-only editor triggers were unnamed and undersized, and the expandable
  mobile baseline card was pointer-only. Commit
  `89b1b7d09b56199cfdc7aa22e9b970720df9762e` adds the missing semantics,
  native keyboard behavior, and 44px touch targets. Local source, mobile-cache,
  public-truth, MobileShell, Admin-emulator, and Firestore-rules gates pass.
  The fixture has no public tenant URL and the runner cannot provide a true
  handheld MobileShell, so public custom-domain rendering and handheld owner
  interaction remain pending rather than fabricated.
- `2026-08-15` - Official Business Page scalar profile metadata completed a
  reversible desktop lifecycle on ordinary owner `2/2`. The exact baseline had
  Short Descriptor, Known For, Special note, WhatsApp, Google Maps, Established
  Year, Reservation, Ordering, Google Review URL, Rating, and Review Count
  blank, with the accent on its inherited default. A non-Google Maps draft was
  rejected without a write; no specific transient error copy was captured.
  One bounded save populated every field and a fresh authenticated document
  retained every value. That lifecycle exposed an unnamed, unfocusable Ant
  accent trigger on desktop, a pointer-only mobile accent card, and no usable
  path to delete a stored accent. Commit
  `8eb58c1dbbc997a4ef7f644fc47f629e96b19176` replaces those controls with named
  native inputs/buttons, restores the mobile default option, and removes blank
  nested accent values so the existing deep-difference writer emits deletion.
  Exact Preview `menulist-core-pgqefpizs-neelvara-systems.vercel.app` exposed
  the labelled native colour input, no Ant trigger, and an explicit Reset.
  One reverse save cleared all scalar values and used Reset to delete the
  accent; a second independent authenticated document confirmed every field
  blank, `default`, and Reset disabled. This produced exactly two store writes.
  Commit `aca6a6f7cf1192f6ff45d6ee535e7a4a6bea016e` only updates a stale localized
  dashboard verifier and does not change the certified runtime behavior.
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
- `2026-08-15` - App Settings accessibility and browser-local persistence were
  certified on exact Preview build
  `981e91a0dbc6244612015d9a975cc1794ece133d`, deployment
  `menulist-core-qoea3bm12-neelvara-systems.vercel.app`. The preceding hosted
  panel exposed four unnamed selectors, an unnamed custom-colour trigger,
  pointer-only favourite actions, and no selected-state semantics for theme
  colours or reading direction. Commits
  `d3d995b88fd1a78b186860f1b0d6f0028a24500b` and
  `981e91a0dbc6244612015d9a975cc1794ece133d` add accessible selector/trigger
  names, a named colour dialog, `F` favourite controls, and pressed state for
  colour and RTL/LTR choices. Exact hosted DOM confirmed those contracts. Dark
  to Light to Dark, blue to purple to blue, Vertical to Horizontal to Vertical,
  Expanded to Collapsed to Expanded, LTR to RTL to LTR, British to American to
  British English, UTC to Pacific/Midway to UTC, long to short to long date,
  padded 12-hour to 24-hour to padded 12-hour time, and Show user name off to on
  to off each survived an independent document before restoration. The `F`
  shortcut added and removed the temporary purple favourite; temporary recent
  colours were cleared. Manual RTL correctly applied to the scoped owner shell
  and Ant Design provider while the root document continued to follow locale
  direction. Final independent load restored Dark, `#3B82F6`, Vertical,
  Expanded, LTR, British English, UTC, `14 Aug 2026`, padded 12-hour time, all
  three display switches off, and no recent/favourite colours. Only browser-
  local preferences changed; no Firebase, server, tenant, store, project,
  provider, entitlement, or public data operation occurred. Fullscreen and live
  cross-tab propagation were still pending at that point; true handheld
  inheritance and offline/device PWA remain open.
- `2026-08-15` - App Settings fullscreen and live appearance propagation were
  exercised on exact Preview build
  `22b85707900e12f487cd83de4c75d6eb5fce97ff`, deployment
  `menulist-core-aeh1c0z7t-neelvara-systems.vercel.app`. The preceding bundle
  reproduced a cross-tab defect: Tab A changed Dark to Light while an already
  open Tab B stayed Dark for 3.5 seconds and reflected Light only after reload.
  Commit `22b85707900e12f487cd83de4c75d6eb5fce97ff` adds one bounded storage listener
  for durable Redux-backed appearance, layout, direction, and header-display
  preferences. The exact build changed Tab B to Light live without navigation
  or reload, then propagated the Dark restoration live. Closing Tab B's settings
  drawer left Tab A open. Entering real browser fullscreen in Tab A produced
  the enabled state and confirmation while Tab B remained off; exiting restored
  Tab A off with the disabled confirmation. This proves drawer and fullscreen
  remain tab-local while durable preferences synchronize. Cookie-backed locale
  values intentionally settle in another tab on its next navigation or refresh.
  Both tabs finished on independently loaded Business Settings documents with
  Dark restored, fullscreen off, and their settings drawers closed. No Firebase,
  server, tenant, store, project, provider, entitlement, or public-data mutation
  occurred.
- `2026-08-15` - Help search and ticket-create recovery were exercised on exact
  Preview build `ed3d3336658df30c380ddecb0f717ed47086a1c5`, deployment
  `menulist-core-uu0ox2bcr-neelvara-systems.vercel.app`. Retained QA owner `2/2`
  intentionally has no admitted Answerlattice workspace. The preceding bundle
  rejected a Help question but erased the input into a misleading local
  `NO MATCHES FOUND` state. It also left ticket-create failure visible only as a
  short toast. Commit `ed3d3336658df30c380ddecb0f717ed47086a1c5` makes both
  failures durable and recoverable. Exact hosted rerun retained the complete
  question beside the persistent account-availability message. A filled ticket
  attempt retained its subject/details and rendered `Request not sent`; no
  success state appeared. Source tracing confirms the invalid workspace fails
  before attachment upload or Firestore persistence. The test values were then
  discarded by leaving the form. No Firebase, Storage, AI-provider, tenant,
  store, project, entitlement, public-data, or production mutation occurred.
- `2026-08-15` - Help feedback history and rejected-submit recovery were
  exercised on exact Preview build
  `c53fc7463faeeebe6fb89fade584bf76b7eb26a5`, deployment
  `menulist-core-mfnsaqt3b-neelvara-systems.vercel.app`. The preceding bundle
  reduced the unavailable latest-feedback read and rejected feedback submit to
  transient toasts. The exact fixed build kept `Failed to fetch latest
  feedback.` visible with an operable retry; the retry returned to the same
  truthful unavailable state. Blank submission retained both inline required
  validations. A four-star attempt with a completed comment retained all input
  and rendered persistent `Failed to send feedback.` without a success state.
  Cancel then cleared the rating, comment, and submit error while preserving the
  independent history-read failure. The retained owner has no admitted
  Answerlattice workspace, so scope resolution rejected the read and submit
  before a query, POST, Firebase, Storage, provider, support-signal, tenant,
  store, project, entitlement, public-data, or production mutation.
- `2026-08-15` - Owner AI Transactions empty-history, filter, refresh, and
  accessibility behavior were exercised on exact Preview build
  `738f8a2374ffa28bde28ab045ad50bfe84033872`, deployment
  `menulist-core-ikeeb6vsa-neelvara-systems.vercel.app`. The retained owner
  completed an authorized empty read, selected an action filter by keyboard,
  returned to the same truthful empty state, reset the filter, and refreshed
  without a load failure. The preceding bundle exposed one unnamed action
  combobox despite its visible `Filter by action` placeholder. The fixed build
  exposed that exact localized accessible name while retaining named Start
  date, End date, Reset, and Refresh controls. The adjacent icon-only Details
  action is now row-specific in source and the AI-accounting gate; live row
  interaction was not fabricated because this fixture has no history rows. No
  history, project, Firebase, provider, credit, checkout, payment, tenant,
  store, entitlement, public-data, or production mutation occurred.

## Execution Ledger

| ID | Surface | Flow | Viewport | Preconditions | Expected | Actual | Status | Evidence | Data mutations | Cleanup | Fix commit | Hosted build | Remaining risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ML-QA-000 | Deployment | Exact source/host alignment | HTTP | `staging` checkout | Runtime source, remote, and hosted Preview report one application commit | Latest application source `c8db801d61b24c4d5d4926474a8bca17408e8d62` reached hosted Preview with env `preview` at deployment `menulist-core-jyhlaufxx-neelvara-systems.vercel.app`; staging alias `/api/version` reported the same full commit before final hosted PWA transport certification | PASS | `git rev-parse HEAD`; `git rev-parse origin/staging`; Vercel deployment status; immutable Preview and `GET https://app.menulist.digital/api/version` on 2026-08-15 | None | None | `c8db801d61b24c4d5d4926474a8bca17408e8d62` | `c8db801d61b24c4d5d4926474a8bca17408e8d62` | The following evidence-only ledger commit does not change application runtime; future application edits require a new exact-build gate |
| ML-QA-001 | QA hosts | Website and sign-in transport plus crawler isolation header | HTTP | Public network | Both hosts return 200 and QA noindex header | Both returned HTTP 200 with `x-robots-tag: noindex, nofollow, noarchive`; full static route and redirect sweep also retained the QA header | PASS | Response headers from `menulist.digital` and `app.menulist.digital/signin`; 62-route exact-build sweep on 2026-08-14 | None | None | `fccff11f6329ad6979853b6220ca736d86e461c3` | `fccff11f6329ad6979853b6220ca736d86e461c3` | Robots/sitemap policy is retained setup evidence; public route transport is covered below |
| ML-QA-002 | QA website | Static and localized resource transport, canonical redirects, rendered smoke, and crawler isolation | HTTP and desktop Chrome | Exact hosted Preview and source-derived route inventory | All 205 inventoried URLs resolve; owner paths use canonical app host; every QA response, including redirects, is noindex | 62 static URLs and 143 resource/locale URLs resolved successfully. The missing redirect headers were corrected and reran cleanly; Chrome rendered `/product` at canonical `/how-it-works` without console issues | FIXED | Hosted GET/HEAD matrices; controlled Chrome DOM/console; `test:menulist-host-routing`; `verify:website-resource-locales`; Next compatibility; focused lint; TypeScript | None | None | `fccff11f6329ad6979853b6220ca736d86e461c3` | `fccff11f6329ad6979853b6220ca736d86e461c3` | Page-specific interactions and form mutations remain under their owning feature rows; transport/render coverage is complete |
| ML-QA-003 | QA website / Hours Check | Browser-local report lifecycle: empty, ready, malformed customer link, copy feedback, and reset | Desktop Chrome | Public QA website; synthetic owner-entered facts; no external scan or contact submission | Empty input reports missing basics; complete facts produce a ready eight-row report; malformed URL is unclear without being fetched; copy confirms locally; reset clears the report | Hosted `/tools/hours-check` produced `1 present / 6 missing / 0 unclear / 1 not checked` for empty input, `7 present / 0 missing / 0 unclear / 1 not checked` for complete synthetic facts, and `6 present / 0 missing / 1 unclear / 1 not checked` after replacing the customer link with `not-a-url`. The current-link row alone became `Unclear`, its evidence stated that the URL was not opened or fetched, `Copy report` announced `Report copied.`, and Reset restored empty controls plus `Report appears after the check`. The aggregate source gate also exposed two stale localization assertions and one missing shared-module inventory entry; the verifier-only repair now follows the centralized presentation/locale boundary and passes the complete 16-truth-tool/5-asset-tool suite. | PASS | Controlled hosted Chrome DOM on exact application build `c8db801d61b24c4d5d4926474a8bca17408e8d62`; `verify:hours-check`; `verify:public-truth-tools`; `test:public-truth-tools-runtime`; `verify:public-truth-monitor-addon`; `verify:public-truth-check`; focused Hours Check lint; verifier syntax checks | None; deterministic browser-local state and clipboard write only; no URL fetch, report persistence, Firebase, Storage, Functions, provider, tenant, project, owner, or contact mutation | Reset returned the public tool to its initial empty placeholder; optional contact fields were untouched and not submitted | `93f504166` (verifier-only repair) | `c8db801d61b24c4d5d4926474a8bca17408e8d62` | Optional contact handoff validation/submission, public-report-link copy, download artifact, and responsive/true-handheld rendering remain separately pending; source verifiers support but do not replace those hosted interactions |
| ML-QA-004 | QA website / Public Truth Check | Browser-local source-evidence isolation, empty/ready/malformed-link reports, copy actions, handoff validation, and reset | Desktop Chrome | Public QA website; synthetic owner-entered facts; no external scan, download, or contact submission | URL text never proves unrelated facts; report status and ten rows follow only entered facts; copy actions confirm locally; invalid handoff inputs stop before submission; reset removes all synthetic state | Empty input returned `0 present / 3 missing / 0 unclear / 7 not checked`. A valid URL whose path contained `prices-hours-contact-order-pune` made only business identity, source, and public-link rows present: prices, hours, location, contact, and customer actions remained missing, proving URL-path isolation. Complete pasted facts returned `8 present / 0 missing / 0 unclear / 2 not checked` and `Ready enough to make current`; replacing the link with `not-a-url` returned `7 present / 0 missing / 1 unclear / 2 not checked`, with only Current public link marked `Unclear` and explicit no-fetch evidence. Copy actions announced `Report copied.` and `Public report link copied.` Client-side handoff checks returned `Enter your name.`, `Enter a valid email.`, and `Agree before sending the checklist request.` without submission. Reset removed the report, cleared every form value/checkbox, and restored `Report appears after the check`. | PASS | Controlled hosted Chrome DOM on exact Preview `02d3c8f3607199779428a13d41f05e6998a663af`; `verify:public-truth-check`; `verify:public-truth-tools`; `test:public-truth-tools-runtime`; focused lint; TypeScript | None; deterministic browser-local state and clipboard writes only; handoff stopped at client validation; no URL fetch, download artifact, POST, report persistence, Firebase, Storage, Functions, provider, tenant, project, owner, or contact mutation | Reset returned the route to its initial empty placeholder with no non-empty input or checked control; optional handoff was never submitted | None | `02d3c8f3607199779428a13d41f05e6998a663af` | Successful consented contact handoff requires an explicitly authorized disposable lead and before/after cleanup proof; download artifact and responsive/true-handheld rendering remain separately pending |
| ML-QA-005 | QA website / QR Link Health Check | Missing, rejected, unclear, ready, replacement-needed, copy, validation, and reset lifecycle | Desktop Chrome | Public QA website; pasted synthetic target strings only; no target-page open, QR image, download, or contact submission | Only public HTTPS targets are admitted; external targets remain unclear without owner confirmations; non-reserved QA tenant links can reach ready; replacement-needed wins over current; report actions and validation remain browser-local | Empty input returned `0 present / 2 missing / 0 unclear / 5 not checked`. `not-a-url`, FTP, localhost, and private-LAN HTTP targets each returned `1 present / 1 missing / 0 unclear / 5 not checked` with explicit local/private/insecure rejection and no-fetch evidence. `https://example.com/menu` returned `3 present / 0 missing / 3 unclear / 1 not checked` without opening the target. The reserved `demo.menulist.digital` slug correctly stayed external/unknown; the valid non-reserved QA tenant string `https://qa-qr-health.menulist.digital/menu` plus current/action/context confirmations returned `6 present / 0 missing / 0 unclear / 1 not checked` and `Ready for one current customer link`. Selecting replacement-needed automatically overrode current and returned `5 present / 1 missing / 0 unclear / 1 not checked` with `Review before printing again`. Copy actions announced `Report copied.` and `Public report link copied.` Handoff validation returned the required name, valid-email, and consent errors before submission. Reset removed the report, cleared every input/checkbox, and restored the initial placeholder. | PASS | Controlled hosted Chrome DOM on exact Preview `02d3c8f3607199779428a13d41f05e6998a663af`; `verify:qr-link-health-check`; `verify:public-truth-tools`; `test:public-truth-tools-runtime`; focused lint; TypeScript | None; pasted strings were parsed locally and clipboard writes stayed browser-local; no DNS/target request, QR decoding, download artifact, POST, report persistence, Firebase, Storage, Functions, provider, tenant, project, owner, or contact mutation | Reset returned the route to `Report appears after the check` with no non-empty input or checked control; optional handoff was never submitted | None | `02d3c8f3607199779428a13d41f05e6998a663af` | Successful consented handoff needs an authorized disposable lead and cleanup proof; actual camera scanning/QR decoding is intentionally outside V0; download artifact and responsive/true-handheld rendering remain pending |
| ML-QA-006 | QA website / Menu Readability Check | Empty, short, URL-isolation, unclear, ready, prices-not-needed, copy, validation, reset, and evidence-truth lifecycle | Desktop Chrome | Public QA website; pasted synthetic list text only; no link open, file upload, rewrite, download, or contact submission | Sparse input cannot pass; URL action words do not prove an action; complete list text and the explicit prices-not-needed route can reach ready; every evidence row names only the source actually inspected | Empty input returned `0 present / 2 missing / 0 unclear / 5 not checked`; `Tea ₹20` remained `Missing list basics` while honestly recognizing only the price hint. A valid URL containing `order-book-call` plus useful item text with no action kept Customer action `Missing`, proving URL-action isolation, and returned `4 present / 2 missing / 1 unclear / 0 not checked`. Complete categorized items with prices, descriptions, action text, and a valid link returned `7 present / 0 missing / 0 unclear / 0 not checked`; a services list with no prices also reached the same ready summary when `Prices are not needed` was selected. Copy actions and all three pre-submit handoff validation errors passed. The hosted ready report initially misstated that action words were checked in pasted text and the entered link even though the implementation intentionally ignores the link. Exact fixed Preview now says `Checked action words in the pasted text only.`, contains no stale wording, and retains the ready summary. Reset cleared every control and restored the initial placeholder. | FIXED | Controlled hosted Chrome DOM before and after the fix; exact `/api/version` build `6b31adeacc61d779e4ec8ec9773ca5fca903b475`; immutable Preview `menulist-core-czkeu932e-neelvara-systems.vercel.app`; `verify:menu-readability-check`; `verify:public-truth-tools`; `test:public-truth-tools-runtime`; focused lint; TypeScript | None; pasted text and URL strings were evaluated locally and clipboard writes stayed browser-local; no URL request, upload, OCR/PDF parse, AI rewrite, download artifact, POST, report persistence, Firebase, Storage, Functions, provider, tenant, project, owner, or contact mutation | Final hosted reset returned `Report appears after the check`, removed the report, and left no non-empty input or checked control; optional handoff was never submitted | `6b31adeacc61d779e4ec8ec9773ca5fca903b475` | `6b31adeacc61d779e4ec8ec9773ca5fca903b475` | Successful consented handoff needs an authorized disposable lead and cleanup proof; download artifact and responsive/true-handheld rendering remain pending; file/PDF/image parsing and rewrite remain intentionally outside V0 |
| ML-QA-007 | QA website / Customer Question Coverage Check | Empty, question-only gaps, URL isolation, complete readiness, prices-not-needed, malformed-link, copy, validation, and reset lifecycle | Desktop Chrome | Public QA website; synthetic pasted questions/source only; no chat read, link open, generated answer, download, or contact submission | Owner questions expose missing answer areas without inventing answers; URL text cannot satisfy them; complete pasted source can reach ready; malformed links remain unclear; explicit prices-not-needed is honored | Empty input returned `0 present / 3 missing / 0 unclear / 6 not checked`. Realistic menu, hours, price, location/contact, and order questions plus useful but non-answering source text returned `4 present / 5 missing / 0 unclear / 0 not checked`; the valid URL path contained `order-hours-prices-contact`, yet all five answer areas stayed missing, proving URL isolation. Complete source text covering services, prices, hours, address/contact, booking, and availability returned `9 present / 0 missing / 0 unclear / 0 not checked` and `Ready to turn into a customer link`. Removing prices while selecting `Prices are not needed before contact` retained the same ready summary with Price answers `Not needed`. Replacing the public link with `not-a-url` returned `8 present / 0 missing / 1 unclear / 0 not checked`, with only Current customer link unclear and explicit no-open/no-fetch evidence. Copy actions and all three pre-submit handoff validation errors passed. Reset cleared every input/checkbox, removed the report, and restored the initial placeholder. | PASS | Controlled hosted Chrome DOM on exact Preview `6b31adeacc61d779e4ec8ec9773ca5fca903b475`; `verify:customer-question-coverage-check`; `verify:public-truth-tools`; `test:public-truth-tools-runtime`; focused lint; TypeScript | None; questions, source text, and URL strings were evaluated locally and clipboard writes stayed browser-local; no conversation/chat read, URL request, generated answer, download artifact, POST, report persistence, Firebase, Storage, Functions, provider, tenant, project, owner, or contact mutation | Reset returned `Report appears after the check`, removed the report, and left no non-empty input or checked control; optional handoff was never submitted | None | `6b31adeacc61d779e4ec8ec9773ca5fca903b475` | Successful consented handoff needs an authorized disposable lead and cleanup proof; download artifact and responsive/true-handheld rendering remain pending; chatbot answers, conversation-log reads, and external crawling remain intentionally outside V0 |
| ML-QA-008 | QA website / Customer FAQ Reply Pack | Empty, missing-question, complete deterministic pack, malformed-link, per-block/report/share copy, validation, and reset lifecycle | Desktop Chrome | Public QA website; synthetic owner-entered questions and facts only; no conversation read, link open, chatbot, generated AI answer, download, or contact submission | Required facts gate readiness; eight reusable blocks use only admitted owner facts; malformed links remain unclear and never enter answer copy; automation boundaries stay explicit | Empty input returned `1 present / 6 missing / 3 unclear / 1 not checked` and `Important FAQ facts are missing`; the pack remained visibly provisional with missing-value placeholders. Business identity, source facts, and a valid current link without repeated questions returned `6 present / 1 missing / 3 unclear / 1 not checked`, with Customer questions alone still missing. Complete questions and matching menu, hours, price, location/contact, action, and availability facts returned `10 present / 0 missing / 0 unclear / 1 not checked` and `FAQ pack is ready`, with all eight deterministic answer blocks and explicit no-AI/no-conversation/no-chatbot/no-automation/no-message evidence. Replacing both links with malformed strings returned `8 present / 0 missing / 2 unclear / 1 not checked`; only Current customer link and Action context became unclear, neither malformed string appeared in any generated block, and the report retained local-format-only/no-fetch evidence. One block, the full report, and the public report link copy controls executed browser-locally. Handoff validation stopped successively at required name, valid email, and consent without submission. Reset cleared the report and all values and restored the initial placeholder. | PASS | Controlled hosted Chrome DOM on exact Preview `6b31adeacc61d779e4ec8ec9773ca5fca903b475`; `verify:customer-faq-reply-pack`; `verify:public-truth-tools`; `test:public-truth-tools-runtime`; focused lint; TypeScript | None; questions, facts, and URL strings were evaluated locally and copy writes stayed browser-local; no conversation/chat read, URL request, chatbot or automation creation, message send, AI/search provider call, download artifact, POST, report persistence, Firebase, Storage, Functions, tenant, project, owner, or contact mutation | Reset returned `FAQ pack appears after the check`, removed the report, and cleared every entered value; optional handoff was never submitted | None | `6b31adeacc61d779e4ec8ec9773ca5fca903b475` | Successful consented handoff needs an authorized disposable lead and cleanup proof; download artifact and responsive/true-handheld rendering remain pending; conversation reads, chatbot creation, automated sends, and external crawling remain intentionally outside V0 |
| ML-QA-009 | QA website / Booking Inquiry Readiness Check | Empty, ambiguous action text, fully confirmed readiness, invalid destination classes, malformed customer link, copy/share, validation, and reset lifecycle | Desktop Chrome | Public QA website; synthetic owner-entered action facts only; no provider login, external open, message, download, or contact submission | A visible action and valid destination gate the report; response, hours, fallback, confirmation, location, and current-link facts remain independently evidenced; invalid destinations never pass; external systems stay not checked | Empty input returned `0 present / 8 missing / 0 unclear / 1 not checked` and `Main action is missing`. `Book a slot during opening hours` with valid `tel:` and current-link formats returned `4 present / 0 missing / 4 unclear / 1 not checked`: response, fallback, confirmation, and location stayed unclear instead of being inferred. A complete owner-confirmed path returned `8 present / 0 missing / 0 unclear / 1 not checked` and `Customer action path is ready`, while external booking inspection remained not checked. Each documented invalid destination class (`tel:not-a-phone`, `mailto:not-an-email`, a non-`send` WhatsApp scheme, and phone text containing letters) returned `7 present / 0 missing / 1 unclear / 1 not checked`, with Action destination alone unclear. A valid mail destination plus `not-a-url` returned the same summary with only Current customer link unclear and explicit no-open/no-fetch evidence. Copy and public-report-link actions announced success. Handoff validation stopped successively at required name, valid work email, and consent without submission. Reset cleared all values and selections, removed the report, and restored the initial placeholder. | PASS | Controlled hosted Chrome DOM on exact Preview `6b31adeacc61d779e4ec8ec9773ca5fca903b475`; `verify:booking-inquiry-readiness-check`; `verify:public-truth-tools`; `test:public-truth-tools-runtime`; focused lint; TypeScript | None; owner-entered strings and confirmations were evaluated locally and copy writes stayed browser-local; no destination/customer-link request, provider login/check, calendar/payment/inbox inspection, message send, AI/search call, download artifact, POST, report persistence, Firebase, Storage, Functions, tenant, project, owner, or contact mutation | Reset returned `Report appears after the check`, cleared all entered values and six readiness checkboxes, and removed the report; optional handoff was never submitted | None | `6b31adeacc61d779e4ec8ec9773ca5fca903b475` | Successful consented handoff needs an authorized disposable lead and cleanup proof; download artifact and responsive/true-handheld rendering remain pending; booking-provider, calendar, payment, inbox, message, and external-page checks remain intentionally outside V0 |
| ML-QA-010 | Authentication | Existing session restoration and owner shell | Desktop Chrome | Logged-in QA owner at scope `2/2` | Trusted session restores, exact scope loads, no cross-product or subscription bypass | Retained `QA owner B` session restored; fixture authority maps it to `2/2`; `/billing` and hard-reloaded `/projects` rendered the full owner shell and honest no-plan guard; prior session-prime/store-bootstrap errors did not recur. On exact build `edc9446fe`, authenticated `/signin` returned through `/dashboard` to the honest `/billing` no-plan guard. | IN PROGRESS | Controlled Chrome DOM, account-menu identity, and console inspection on 2026-08-14; retained QA fixture mapping; only the documented non-blocking App Check skip diagnostic appeared | None | None | None | `edc9446fead4974b731663248fcbdd543d653ffc` | Logout/relogin, stale-session expiry, and explicit permission-denial cases remain; fixture is intentionally unsubscribed |
| ML-QA-011 | Authentication | Existing session restoration and owner shell | Mobile Chrome | Same session and `ENABLE_MOBILE_UI` | MobileShell loads inside owner app with correct visible tabs and scope | A `390x844` resize remained in desktop shell as designed because the runner cannot provide handheld UA/touch signals | BLOCKED | Hosted viewport proof plus `useDeviceType`/layout-wrapper source boundary; local `verify:mobile-shell-route-map` is PASS but is not hosted proof | None | None | None | `f05001553bc41525564351a6bcbb7d1826ad1792` | Requires true mobile Chrome or handheld emulation for tabs, route/hash restoration, reload, and scope proof |
| ML-QA-012 | Authentication/API | Protected response storage and CORS rejection | HTTP and desktop Chrome | Exact hosted Preview; no browser credentials for negative HTTP checks | Protected responses are never shared-cache state; auth flow remains usable | Reproduced public revalidation headers on protected `401` responses; central middleware correction reached QA. Hosted `401` and deliberate CORS `403` reruns now return private/no-store, no-cache, and nosniff. Authenticated owner smoke remained intact. | FIXED | Exact `/api/version`; response headers for access-status, change-password, public create-menu, and rejected Origin; focused auth matrix, lint, TypeScript | None | None | `edc9446fead4974b731663248fcbdd543d653ffc` | `edc9446fead4974b731663248fcbdd543d653ffc` | OPTIONS preflight intentionally keeps the dedicated CORS policy |
| ML-QA-020 | Onboarding | First project and onboarding continuity | Desktop and mobile | QA owner `2/2`; snapshot before mutation | Existing default project loads without recreating or escaping scope | Authenticated entry, both input modes, empty/unconfirmed/private-link failures, tab recovery, and hard reload passed without admitted draft/job/provider work. Existing first-project continuity was not rerun. | IN PROGRESS | Controlled Chrome DOM on exact hosted builds through `edc9446fe`; server source confirms rejected input does not reach Storage/draft/job creation | None | None | None | `edc9446fead4974b731663248fcbdd543d653ffc` | Valid upload/link success and preview/claim continuity require bounded before/after data proof; mobile remains blocked; avoid destroying retained fixture |
| ML-QA-030 | Dashboard/Today | Dashboard, Today, Business Health, and Feedback entry | Desktop and mobile | Auth and owner shell pass | Each visible entry loads correct scoped state and honest empty/no-plan behavior | Dashboard settled to the honest no-plan Billing state. Today rendered its complete action list and stable no-action state. Feedback now completes an authoritative empty read with zero needs attention. Business Health loads the complete scoped desktop report and quiet first-use assistant state. | IN PROGRESS | Controlled Chrome DOM/console through exact hosted `160adb944`; focused Feedback/Business Health verifiers, lint, TypeScript, contextual-state gate | None | None | `12376cf3f1957c6d8df388bb701619f8c4564adb`, `0bf5e4d7c71f4c1ebee31dc053b0969235e12078` | `160adb94425bd4754f3ea604f9bb23c86aab9fc2` | True handheld MobileShell evidence remains pending |
| ML-QA-031 | Feedback | Failed inbox read versus confirmed empty state | Desktop Chrome | QA owner `2/2`; deployed indexes match source | Failed list/count read stays visibly unavailable and retryable; it never becomes empty/zero truth; a later successful read may render empty truth | Earlier exact hosted QA kept the persistent load failure and retry guidance, suppressed `No feedback yet`, and marked the attention total unavailable. Exact build `160adb944` later completed the list/count read and rendered authoritative `No feedback yet`, `0 visible`, and zero needs attention. | PASS | Exact hosted Chrome DOM on both failure and later success states; read-only QA index inventory; `verify:guest-feedback-boundary`; focused lint; TypeScript | None | None | `12376cf3f1957c6d8df388bb701619f8c4564adb` | `160adb94425bd4754f3ea604f9bb23c86aab9fc2` | Create/resolve/reopen/pagination need disposable feedback records; true handheld behavior remains under ML-QA-030 |
| ML-QA-032 | Business Health | Public Truth summary and first-use assistant thread | Desktop Chrome | QA owner `2/2`; existing scoped health/menu read models; no assistant answer persisted | Public Truth reuses admitted auth; a valid pre-persistence thread is a quiet empty state; no foreign thread existence/data is exposed | Reproduced summary `401` and thread `404` on the preceding bundle. Exact fixed build rendered Official Customer Source, priority checks, and starter questions; after 20 seconds console contained only the known QA App Check diagnostic. | FIXED | Exact `/api/version`; controlled hard-reload DOM/console on `0bf5e4d7c`; `verify:owner-business-assistant`; `verify-owner-business-health-boundary`; focused lint; TypeScript; docs links | None | None | `0bf5e4d7c71f4c1ebee31dc053b0969235e12078` | `0bf5e4d7c71f4c1ebee31dc053b0969235e12078` | Refresh/answer writes and true handheld MobileShell remain pending under ML-QA-030; cross-actor non-enumeration is source-gated rather than destructively fixture-tested |
| ML-QA-040 | Projects | Full CRUD, cancel, reload, recovery | Desktop and mobile | Snapshot project and compact summary | Bounded operations are idempotent and remain inside `2/2` | Exact-build `/projects` rendered the honest no-subscription guard with no CRUD surface. The denied-path read defect is fixed under ML-QA-041. Retained `2/2` has no legitimate entitlement and `1/1` is reserved for Razorpay Test Mode only. | BLOCKED | Controlled Chrome DOM/console on exact hosted `f0461c317`; retained QA fixture authority | None | None | `f0461c3177bd9a3fdab3a12135f7c84a1dd20f5c` | `f0461c3177bd9a3fdab3a12135f7c84a1dd20f5c` | Requires a separately authorized entitled disposable `2/2`-family fixture or explicit fixture provisioning before create/edit/duplicate/deactivate/delete/restore/reload; mobile remains blocked |
| ML-QA-041 | Projects | Denied-plan project and job read boundary | Desktop Chrome | QA owner `2/2` has no paid or starter access | Admission settles before project reads, default-project creation, editor preload, or project/job listeners; the no-plan guard stays honest | Reproduced `[Projects Page] Operation failed` behind the no-plan guard on the preceding bundle. Exact fixed build retained the guard and, after 20 seconds, emitted no Projects failure; only the known QA App Check diagnostic remained. | FIXED | Exact `/api/version`; controlled hard-reload DOM/console on `f0461c317`; `verify:menu-project-editor-boundary`; focused lint; TypeScript; docs links | None; fixed denied path performs zero project/job reads and zero default-project writes | None | `f0461c3177bd9a3fdab3a12135f7c84a1dd20f5c` | `f0461c3177bd9a3fdab3a12135f7c84a1dd20f5c` | Paid/starter CRUD success and true handheld MobileShell remain under ML-QA-040 |
| ML-QA-050 | Menu | Categories, items, pricing, visibility, variants, translations, publish, import, extraction, images, failure recovery | Desktop and mobile | Stable entitled disposable project and bounded source assets | Every supported edit persists, publishes, reloads, and fails safely | Exact hosted `/projects` and a forged `projectId`/editor/focus deep link both settled to the same honest no-active-subscription guard with no editor control admitted. Source gating keeps both project-list and selected-project cache keys null without paid or starter access. The retained `2/2` fixture cannot legitimately exercise Menu CRUD, and retained `1/1` remains reserved for Razorpay Test Mode. | BLOCKED | Exact hosted build `bf4cd14eb`; controlled Chrome DOM; `verify:menu-project-editor-boundary` with eight composed project boundary suites; `verify:mobile-shell-route-map`; entitlement/read-gate source inspection | None; no project/menu read, upload, import, extraction, provider, publish, or mutation was admitted | No draft, selected project, upload, modal, or editor state remained; route left through the existing View Plans action | None | `bf4cd14eba102bd8b1b42330ec46e31d7958f23b` | Requires a separately authorized entitled disposable `2/2`-family fixture with before/after snapshots; paid AI/provider calls require explicit cost control; true handheld mobile remains pending |
| ML-QA-060 | Business Settings | All owner-controlled public business facts | Desktop and mobile | Auth and test project | Valid changes persist and invalid/cancelled changes do not mutate truth | Desktop loaded every scoped settings section. Required location/email and URL validation passed with exact Reset/reload recovery. Numeric values, External Sync, Special Hours, Time Slot Presets, Locale time format, Analytics customer-app tracking, Guest Feedback enablement, Business Attributes, Customer App install prompting, Temporary Status, Social Media known/custom links, OBP scalar profile metadata/accent, icon style, all ten OBP visibility controls, and Compliance Pages completed reversible lifecycle checks. Digital Screens, controlled-draft Reset, picker Enter, Social Media write admission/focus/rapid cleanup, focused accessibility, Temporary Status expiry-timezone/confirmation, OBP accent deletion/default controls, icon-style registration, mobile OBP visibility naming, and Compliance owner-control accessibility defects are fixed under child rows. | IN PROGRESS | Controlled Chrome DOM through exact hosted `2262a2aa4`; focused Social Media, OBP, Compliance, Digital Screens, Guest Feedback, Temporary Status, Business Settings Reset, working-hours/time-slot, public-business-truth, analytics-minimization, Customer App PWA, mobile shell, public-customer localization, and contextual-state gates; lint; TypeScript; local Compliance Admin/rules emulators | Bounded numeric save/clear, External Sync enable/disable, one Sunday-hours save/clear, one future Special Hours add/delete, one preset create/edit/delete, one locale lifecycle, one Customer App analytics lifecycle, one Guest Feedback on/off/on lifecycle, one Business Attribute off/on/off lifecycle, one Customer App prompt on/off/on lifecycle, one Temporary Status set/clear lifecycle, one six-update Social Media defect/recovery/valid/cleanup lifecycle ending clean, one OBP scalar profile/accent save and reverse cleanup, one OBP icon-style icons/emoji/icons lifecycle, three acknowledged OBP visibility updates ending in all ten controls restored on, and one Compliance override/reset lifecycle; fixed-build invalid social and Google Maps drafts were write-free; no provider ID/URL invocation, provider test, delivery, screen, paid, public-form submission, or public-projection operation | Exact original location/email/link/numeric/feedback/social/locale/analytics values, including five blank known social fields with no custom rows; OBP scalar metadata blank with inherited accent default, OBP icon style set to standard icons, all ten OBP visibility controls on, all three Compliance pages on MenuList baseline only, all 17 Business Attributes off with no custom rows, Customer App and its prompt on with blank name and automatic icon, all seven weekly days blank, no special dates, no time-slot presets, no active Temporary Status, provider IDs/review URL blank, and External Sync off confirmed after fresh loads | `de56a3cfd80ce21a9e4c8f907d13b19490c7cf42`, `5a1020b0ac0955bf0552129d185285f5c59dd77d`, `8e561bdbdcf34997a67fe5e0642a5c2a4d8d3522`, `28c36c2c2ba8d61e44f948695cd63415aafc677f`, `a8a529756d28ee9e219817ddee87bb44128f2db2`, `160adb94425bd4754f3ea604f9bb23c86aab9fc2`, `e9edc4425388e2c465af6e62bd8c638fbc2282d5`, `eec7b3dc07ed82b63b2fd54213c290835f47baa5`, `cc092ba8e2b6a3812122fa54eddda224661edd95`, `1145cc136c7ecd818cdfe0bca02cec31d36d13eb`, `61fce68025da3b63c47446047d43977e74489dc3`, `c3a3e2f28f55d53f4b5c85c262430055453e69e6`, `89b1b7d09b56199cfdc7aa22e9b970720df9762e`, `8eb58c1dbbc997a4ef7f644fc47f629e96b19176`, `ebb6e57bd6addbbdec9f093f503f593375d03b9b`, `5a06e5298e6f378c18bc1dd2d934e2d65841739c`, `2262a2aa4a79529c105b2c6615eb58b2967df05d` | `2262a2aa4a79529c105b2c6615eb58b2967df05d` | Customer public projection, cover/gallery media, remaining settings families, true handheld mobile, and physical screen opens remain pending |
| ML-QA-060-OBP | Business Settings / Official Business Page | Accessible icon-style registration, persistence, public projection boundary, and exact cleanup | Desktop Chrome plus source-gated mobile parity | QA owner `2/2`; `publicPresence.iconVariant` baseline is standard icons; no authorized public tenant URL | The icon-style switch has a localized accessible name, reaches the explicit parent-form save, persists through an independent load, reverses cleanly, and projects through the existing public truth model | Preceding exact build exposed an unnamed switch that stayed off after activation and reloaded unchanged. Exact fixed build exposed `Use emoji icons`, changed standard icons to emoji, retained emoji after a fresh reload, changed back to standard icons, and retained the restored baseline after a second fresh reload. Shared public projection tests passed; hosted customer projection was not fabricated because this fixture has no tenant URL. | FIXED | Exact `/api/version` build `61fce6802`; immutable Preview `menulist-core-h1rroocgi-neelvara-systems.vercel.app` and staging alias; controlled hosted DOM with two fresh reload assertions; `verify:official-business-page-boundary`; `verify:public-business-truth`; `verify:mobile-shell-route-map`; focused lint; TypeScript; docs links | Two existing store-document updates: standard icons to emoji, then emoji to standard icons; no provider, media, analytics, public-form, or public-route operation | Standard icons restored and fresh-reload confirmed; all unrelated OBP fields remained untouched | `61fce68025da3b63c47446047d43977e74489dc3` | `61fce68025da3b63c47446047d43977e74489dc3` | Public customer rendering requires an authorized tenant URL; true handheld MobileShell behavior remains pending |
| ML-QA-060-SCALAR | Business Settings / Official Business Page | Scalar metadata, invalid-link no-write, accessible accent default restoration, persistence, and exact cleanup | Desktop Chrome plus source-gated mobile parity | QA owner `2/2`; all eleven scalar fields blank; inherited accent default; no authorized public tenant URL | Invalid Google Maps input does not persist; one bounded full profile save survives an independent load; named keyboard/touch accent controls can restore and delete the inherited default; one reverse save restores the exact baseline | A non-Google Maps draft did not persist after reload; no exact transient error copy was captured. One bounded save populated Short Descriptor, Known For, Special note, WhatsApp, Google Maps, Accent, Established Year, Reservation, Ordering, Google Review URL, Rating, and Review Count, and an independent authenticated document retained every value. The preceding build exposed an unnamed, unfocusable Ant desktop accent trigger, pointer-only mobile accent card, and no usable accent deletion path. Exact fixed build exposed a labelled native colour input, explicit Reset, no Ant trigger, and default-aware mobile source. One reverse save cleared every scalar and deleted the accent; a second independent document showed all fields blank, `default`, and Reset disabled. | FIXED | Lifecycle on exact hosted `89b1b7d09`; exact fixed `/api/version` build `8eb58c1db`; immutable Preview `menulist-core-pgqefpizs-neelvara-systems.vercel.app` and staging alias; two independent authenticated app documents; `verify:official-business-page-boundary`; `verify:public-business-truth`; `verify:mobile-shell-route-map`; embedded owner-capability gate; focused lint; full lint; TypeScript; docs links | Exactly two store-document updates: one full scalar/accent save, then one full reverse cleanup; invalid Maps draft was write-free; no provider, media, analytics, public-form, or public-route operation | All eleven scalar fields blank, inherited accent `default`, accent Reset disabled, and temporary QA values absent after an independent authenticated load | `8eb58c1dbbc997a4ef7f644fc47f629e96b19176` | `8eb58c1dbbc997a4ef7f644fc47f629e96b19176` | Customer public projection requires an authorized tenant URL; true handheld MobileShell accent interaction, cover/gallery media, and owner review of real business content remain pending |
| ML-QA-060-VIS | Business Settings / Official Business Page visibility | No-write Reset, all seven quick-action and three policy-link controls, full off/on persistence, accessible mobile parity, and exact cleanup | Desktop Chrome plus source-gated mobile parity | QA owner `2/2`; all ten controls on; no authorized public tenant URL | Named controls Reset without a write, explicit false values persist after a settled save, and one reverse save restores every original value | Call plus Privacy were drafted off, Reset, and fresh-reload confirmed on. After one interrupted all-field save attempt did not survive reload, a settled Call-only diagnostic save persisted false; the remaining nine controls then saved false and a fresh reload proved all ten off. One settled reverse save restored all ten on, and fresh reloads on both the lifecycle build and exact fixed build confirmed the baseline. Source review found all ten mobile switches lacked accessible names; the fixed build adds localized names and verifier coverage. | FIXED | Exact `/api/version` build `c3a3e2f28`; immutable Preview `menulist-core-4mx2phex9-neelvara-systems.vercel.app` and staging alias; controlled hosted DOM and fresh-reload assertions; `verify:official-business-page-boundary`; `verify:public-business-truth`; `verify:mobile-shell-route-map`; focused lint; TypeScript; docs links | Three acknowledged settled store updates: Call on to off; the remaining nine on to off; all ten off to on. One earlier interrupted/inconclusive all-ten save did not survive reload. No provider, media, analytics, public-form, or public-route operation | All ten controls restored on and fresh-reload confirmed on exact fixed Preview; all unrelated OBP fields remained untouched | `c3a3e2f28f55d53f4b5c85c262430055453e69e6` | `c3a3e2f28f55d53f4b5c85c262430055453e69e6` | Public customer rendering requires an authorized tenant URL; true handheld MobileShell accessibility remains pending |
| ML-QA-060-COMP | Business Settings / Compliance Pages | Three-page baseline, no-write cancel, Privacy override persistence, reset, accessible owner controls, and exact cleanup | Desktop Chrome plus source-gated mobile parity | QA owner `2/2`; Privacy, Terms, and Refund all use MenuList baseline only; no authorized public tenant URL | All page selectors expose state; cancelled drafts do not write; one valid override survives a fresh load; reset restores the baseline; mobile icon/disclosure controls are named, keyboard-operable, and touch-sized | Privacy, Terms, and Refund each loaded baseline-only content. A Privacy draft was cancelled and disappeared after reload. A temporary 230-character Privacy override saved, rendered as custom plus baseline, and survived a fresh load. Reset removed it, and another fresh load restored baseline-only content with no reset action. Source review found missing desktop pressed states plus unnamed, undersized, pointer-only mobile controls; the exact fixed build adds pressed states, policy names, 44px targets, and a native disclosure button. | FIXED | Lifecycle on exact hosted `c3a3e2f28`; exact fixed `/api/version` build `89b1b7d09`; immutable Preview `menulist-core-owzc87fnr-neelvara-systems.vercel.app` and staging alias; controlled hosted DOM/fresh reloads; `verify:compliance-pages-boundary`; mobile cache, public truth, MobileShell, Admin emulator, rules emulator; focused lint; TypeScript; docs links | One acknowledged `compliancePages` Privacy override write and one acknowledged reset write; cancelled draft was write-free; no provider, media, analytics, public-form, or public-route operation | Privacy, Terms, and Refund all restored to MenuList baseline only; temporary text and Reset action absent after fresh reload | `89b1b7d09b56199cfdc7aa22e9b970720df9762e` | `89b1b7d09b56199cfdc7aa22e9b970720df9762e` | Authorized public custom-domain rendering, true handheld MobileShell interaction, and owner/legal review remain pending |
| ML-QA-060-TEMP | Business Settings / Temporary Status | Exact-expiry timezone agreement plus controlled set/clear lifecycle | Desktop Chrome plus source-gated mobile parity | QA owner `2/2`; no active status; active app timezone differs from browser-system time; bounded set/clear authorized | The visible expiry field, customer preview, confirmation, persisted instant, cancel behavior, set, independent load, clear, and final independent load agree and clean up exactly | Preceding hosted build showed `Aug 15, 2026 10:00 PM` in the picker and `15 Aug 2026 04:30 pm` in its preview. The timezone fix aligned those surfaces, but the static desktop confirmation did not render. Exact build `1145cc136` rendered controlled set and clear confirmations. Both cancel paths survived fresh loads without changing truth. `Closed today` was set, an independent document retained `Expires 15 Aug 2026 06:00 pm`, clear completed, and a third document restored the no-status baseline. | FIXED | Exact `/api/version` build `1145cc136`; immutable Preview `menulist-core-7porrvmdl-neelvara-systems.vercel.app` and staging alias; controlled hosted DOM across three authenticated app documents; cancel/reload assertions; `verify:temporary-status-boundary`; `verify:public-business-truth`; `verify:mobile-shell-route-map`; focused lint; TypeScript; docs links | One bounded store-document set and one bounded store-document clear; both cancel confirmations were write-free | A third fresh authenticated app document confirmed no active status, the default Closed Today draft, and no Clear Status action | `e9edc4425388e2c465af6e62bd8c638fbc2282d5`, `1145cc136c7ecd818cdfe0bca02cec31d36d13eb` | `1145cc136c7ecd818cdfe0bca02cec31d36d13eb` | Public-customer projections and true handheld MobileShell behavior remain pending |
| ML-QA-060-ATTR | Business Settings / Business Attributes | Accessible custom actions plus controlled-attribute persistence and exact cleanup | Desktop Chrome plus source-gated mobile parity | QA owner `2/2`; all 17 controlled attributes off; no custom rows | A controlled attribute persists through an independent app load and reverses cleanly; every custom-row icon action has an accessible name | Vegetarian persisted off to on in a separately loaded authenticated app document, then the reverse save restored off and a third document confirmed the complete baseline. A no-write custom-row draft reproduced unnamed icon/remove buttons; exact fixed build exposed localized names on both controls. | FIXED | Exact `/api/version` build `eec7b3dc`; immutable Preview and staging alias; controlled hosted DOM across independent authenticated app documents; `verify:public-business-truth`; `verify:mobile-shell-route-map`; focused lint; TypeScript; docs links | Two store-document updates: Vegetarian off to on, then on to off; custom row was never saved | All 17 controlled attributes off and no custom rows confirmed after independent cleanup load; the later accessibility draft was cleared by reload | `eec7b3dc07ed82b63b2fd54213c290835f47baa5` | `eec7b3dc07ed82b63b2fd54213c290835f47baa5` | Other controlled/custom values, customer public projection, and true handheld MobileShell behavior remain under ML-QA-060 |
| ML-QA-060-PWA | Business Settings / Customer App | Accessible settings plus install-prompt persistence and exact cleanup | Desktop Chrome plus source-gated mobile parity | QA owner `2/2`; Customer App on; install prompt on; blank home-screen name; automatic icon; no subdomain/install link | Install prompting persists through an independent app load and reverses cleanly; desktop/mobile switches expose their names and disabled semantics | Show install prompt persisted on to off in a separately loaded authenticated app document, then the reverse save restored on and a third document confirmed the complete baseline. The preceding build exposed unnamed desktop/mobile toggles and incomplete mobile disabled semantics; exact fixed build exposed named desktop controls and hosted disabled behavior. | FIXED | Exact `/api/version` build `cc092ba`; immutable Preview and staging alias; controlled hosted DOM across independent authenticated app documents; `verify:customer-app-pwa`; `verify:public-business-truth`; `verify:mobile-shell-route-map`; focused lint; TypeScript; docs links | Two store-document updates: install prompt on to off, then off to on; no icon, name, link, manifest, provider, or analytics operation | Customer App and install prompt on, blank home-screen name, automatic icon, and missing install link confirmed after independent cleanup load; later master-off draft was Reset and reload-confirmed without a write | `cc092ba8e2b6a3812122fa54eddda224661edd95` | `cc092ba8e2b6a3812122fa54eddda224661edd95` | Public prompt rendering requires an authorized tenant URL; other settings/icon operations and true handheld MobileShell behavior remain under ML-QA-060 |
| ML-QA-060-BASIC | Business Settings / Basic and Contact Information | Business-phone accessibility, invalid contact admission, persistence, and exact cleanup | Desktop Chrome plus source-gated mobile parity | QA owner `2/2`; business phone blank with India selected; Contact Person Name `QA owner B`; retained owner email; contact number blank | Business-phone controls are individually named; an invalid contact email rejects the whole draft without a write; one bounded valid contact-name save survives an independent load; one reverse save restores the exact baseline | The preceding hosted build showed the visible Phone Number label but exposed zero `Business phone country code` and zero `Business phone number` controls. Exact fixed build exposed one of each. A local name plus invalid-email draft rendered `Please enter valid email`, no success state, and disappeared after an independent load with both original values restored. `QA contact lifecycle` then saved and survived an independent load while email and number remained unchanged. A reverse save restored `QA owner B`; a final independent load showed no temporary strings, the retained email, both phone fields blank, and both fixed accessible names. Mobile Basic/Contact controls are source-gated through the shared optional accessible-name contract because true handheld emulation is unavailable. | FIXED | Exact `/api/version` build `9d18cdf6db7e7586f3af6e0b939a4abd23d77861`; immutable Preview `menulist-core-a0glke96e-neelvara-systems.vercel.app` and staging alias; controlled hosted DOM across independent app documents; `verify:public-business-truth`; `verify:mobile-shell-route-map`; focused lint; TypeScript | Exactly two existing store-document updates: `QA owner B` to bounded temporary contact name, then back to `QA owner B`; the invalid email/name draft was write-free; no business-phone, contact email/number, tenant, media, domain, provider, public-route, dependency, direct-deploy, or production operation | Contact Person Name `QA owner B`, retained owner email, contact number blank, business phone blank with India selected, and temporary/invalid strings absent after the final independent load | `9d18cdf6db7e7586f3af6e0b939a4abd23d77861` | `9d18cdf6db7e7586f3af6e0b939a4abd23d77861` | Remaining Basic/Location fields, intentional business-phone persistence, authorized customer public projection, logo/media, and true handheld MobileShell interaction remain pending |
| ML-QA-060-LOC | Business Settings / Location Information | Partial-coordinate rejection, complete location persistence, and exact nested cleanup | Desktop Chrome plus source-gated mobile parity | QA owner `2/2`; Street Address, Area, District, City, State, Postal Code, Latitude, and Longitude blank; Country `India` | A partial or invalid coordinate pair rejects the whole parent-form draft without a write; a complete bounded location record survives an independent load; one reverse save restores every blank field and removes nested geo | A temporary Street Address plus lone valid-shaped Latitude produced no success state, and an independent load removed both while retaining Country. One bounded save then populated all eight blank fields, including `12.9716`/`77.5946`; an independent load retained every value together and left Contact fields unchanged. One reverse save cleared all eight fields. A final independent load showed every original blank, Country `India`, and no certification strings or coordinates. Shared geo tests cover blank deletion, zero coordinates, partial pairs, non-numeric input, and latitude/longitude range rejection; mobile uses the same normalizer and acknowledged store-update path. | PASS | Exact `/api/version` build `9d18cdf6db7e7586f3af6e0b939a4abd23d77861`; immutable Preview `menulist-core-a0glke96e-neelvara-systems.vercel.app` and staging alias; controlled hosted DOM across independent app documents; `verify:official-business-page-boundary`; `verify:public-business-truth`; `verify:mobile-shell-route-map` | Exactly two existing store-document updates: blank location record to bounded temporary address/geo values, then back to the blank record with nested geo deletion; the partial-coordinate draft was write-free; no map open, Maps/provider request, media, domain, public-route, dependency, direct-deploy, or production operation | All eight mutable location fields blank, Country `India`, Contact baseline unchanged, and every temporary string/coordinate absent after the final independent load | `9d18cdf6db7e7586f3af6e0b939a4abd23d77861` | `9d18cdf6db7e7586f3af6e0b939a4abd23d77861` | Authorized customer address/directions projection, intentional real owner location data, and true handheld MobileShell interaction remain pending |
| ML-QA-060-SEO | Business Settings / SEO and AEO | Named actions, malformed-canonical no-write admission, rapid keyword/canonical persistence, and exact cleanup | Desktop Chrome plus source-gated mobile parity | QA owner `2/2`; Tagline, Meta Title, Meta Description, and Keywords blank; canonical URL `https://menulist.digital` | Repeated actions are section-named; malformed or non-HTTPS canonical input rejects the whole draft without a write; a keyword committed immediately before Save and a valid HTTPS canonical URL both survive an independent app load; one reverse save restores the exact baseline | Earlier certification named the SEO actions and proved Tagline, Meta Title, and Meta Description persistence. This extension first reproduced malformed canonical input persisting, then fixed shared desktop/mobile HTTPS admission and proved a malformed canonical plus keyword draft write-free after an independent document transition. Rapid tag entry still disappeared across several exact builds: source review and hosted retests isolated Ant tags-mode event timing, the parent submit snapshot boundary, and all-language keyword reduction order. Exact build `3b3b3bd5f` captured the free-form Enter value outside Ant form collection, applied the submitted language last, retained `qa order keyword` together with the temporary canonical URL after Dashboard-to-Business Settings navigation, then removed the tag with Backspace and restored the canonical baseline; a final independent document showed neither temporary value. | FIXED | Final exact `/api/version` build `3b3b3bd5fa69e8ebd0d7708251091f9d8ac56d8f`; immutable Preview `menulist-core-7npc9wpfx-neelvara-systems.vercel.app` and staging alias; preceding exact diagnostic builds from `eecde5258` through `0f7062010`; controlled hosted DOM across independent app documents; `test:small-runtime-contracts`; `verify:public-business-truth`; `verify:official-business-page-boundary`; `verify:mobile-shell-route-map`; focused lint; TypeScript; diff check | Eighteen bounded existing store-document updates across defect reproduction, each diagnostic canonical save/reversal, and the final keyword/canonical save plus reverse cleanup. Fixed-build malformed canonical submissions were write-free. No domain, provider, AI generation, analytics, public-form, public-route, dependency, direct-deploy, or production operation | Tagline, Meta Title, Meta Description, and Keywords blank; canonical URL `https://menulist.digital`; all canonical/keyword certification strings absent after the final independent load | `c54662feab8617ad2a5b6466b9c87935bd5ba396`, `eecde5258d90e1d42f5ea92583d25f5e23756abc`, `3b3b3bd5fa69e8ebd0d7708251091f9d8ac56d8f` | `3b3b3bd5fa69e8ebd0d7708251091f9d8ac56d8f` | Intentional multi-language SEO switching, authorized public projection, and true handheld MobileShell interaction remain pending |
| ML-QA-060-DOM | Business Settings / Domain Settings | Blank-state truth plus distinct accessible names for subdomain and custom-domain controls | Desktop Chrome plus source-gated mobile parity | QA owner `2/2`; no subdomain and no custom domain | Both blank inputs identify their purpose; the two independent availability actions have distinct names and remain disabled for blank input; no provider or store mutation occurs | The preceding exact build exposed the inputs only as placeholder names and both independent actions as `Check Availability`. Exact fixed build exposes `Subdomain`, `Custom Domain`, `Check Availability: Subdomain`, and `Check Availability: Custom Domain`; both actions remain disabled on the retained blank baseline. Desktop and MobileShell implementations share verifier-backed naming parity. | FIXED | Exact `/api/version` build `a530410f0ad1e672302839be9df03e6b565139dd`; immutable Preview `menulist-core-an3s4gfd6-neelvara-systems.vercel.app` and staging alias; controlled hosted accessibility tree; `verify:custom-domain-boundary`; focused lint; TypeScript; diff check | None; no subdomain/custom-domain save, availability request, Vercel provider request, DNS action, credential action, direct deploy, Firebase operation, or production operation | No subdomain and no custom domain retained; both availability actions remained disabled | `a530410f0ad1e672302839be9df03e6b565139dd` | `a530410f0ad1e672302839be9df03e6b565139dd` | Authorized disposable subdomain lifecycle, owned custom-domain provider lifecycle, DNS verification, true handheld MobileShell interaction, and public tenant routing remain pending |
| ML-QA-060-PULL | Business Settings / Platform Pull API | Truthful credential baseline and fail-closed provider visibility | Desktop Chrome plus source-gated mobile admission | QA owner `2/2`; no public API key; GBP sync disabled in the exact build | No-key state is explicit; only the key-generation action is admitted; GBP controls remain absent while their provider flow is disabled; no credential or endpoint is exercised | Exact hosted QA exposes `No API key`, `Not created`, and one named `Generate key` action. The exact committed feature matrix keeps Platform Pull API on and GBP sync off. Source gates cover permission, identity, key lifecycle, one-time secret handling, private cache headers, read-only business/menu targets, fail-closed rate limits, and linked-outlet projection. | PASS | Exact `/api/version` build `a530410f0ad1e672302839be9df03e6b565139dd`; immutable Preview `menulist-core-an3s4gfd6-neelvara-systems.vercel.app` and staging alias; controlled hosted accessibility tree; `verify:platform-pull-api-boundary`; `verify:menulist-external-integrations`; exact committed feature-flag/source inspection | None; no key generation, reveal, copy, regeneration, revocation, public API request, GBP/provider request, Firebase operation, direct deploy, or production operation | No public API key retained; no GBP state or provider action admitted | None | `a530410f0ad1e672302839be9df03e6b565139dd` | An authorized disposable credential fixture is required for generate/read/regenerate/revoke and live pull lifecycle evidence; GBP remains disabled pending provider readiness; desktop-only mobile admission is source-gated |
| ML-QA-060-POS | Business Settings / External Menu Sync | Disabled-state truth and named enable control without credential/provider interaction | Desktop Chrome plus source-gated mobile parity | QA owner `2/2`; External Sync off | Disabled state remains truthful; the enable switch exposes its visible purpose on desktop and mobile; no connection, credential, or provider action occurs | Exact preceding build exposed `External sync is off` beside a visible `Enable External Sync` label but an unnamed switch. Exact fixed build names the switch `Enable External Sync`; desktop and MobileShell implementations share verifier-backed parity. The secret, URL, connection test, delivery history, and provider helper controls were not opened or exercised. | FIXED | Exact `/api/version` build `97f5382b148ef2a782a345496ac6bf2801617746`; immutable Preview `menulist-core-eyztj40bi-neelvara-systems.vercel.app` and staging alias; controlled hosted accessibility tree; `verify:pos-sync-boundary`; `test:pos-sync-boundaries`; focused lint; TypeScript; diff check | No write, toggle, URL save, test, delivery, email draft, download, copy, reveal, rotate, or provider operation. The mounted page follows its documented protected secret-read flow; no network response, secret, or payload was inspected. | External Sync remained off; no secret/provider state was revealed or changed | `97f5382b148ef2a782a345496ac6bf2801617746` | `97f5382b148ef2a782a345496ac6bf2801617746` | Authorized disposable provider and secret fixtures are required for enable/save/test/delivery/rotate/disable lifecycle evidence; true handheld MobileShell interaction remains pending |
| ML-QA-061 | Business Settings / Digital Screens | Owner-state read, initialization boundary, rate limiting, and recovery | Desktop Chrome plus source-gated mobile parity | QA owner `2/2` with Digital Screens permission; no screen mutation authorized | Failed reads remain failures and never initialize; GET/POST use separate read/write buckets; success exposes real screen controls and failure exposes retry only | Reproduced persistent screen-settings failure on the preceding bundle. Exact fixed build loaded Menu Board, Highlights, and Custom Slides without a Digital Screen console failure. Desktop/mobile source gates require retry-only controls until state exists. | FIXED | Exact `/api/version`; controlled hosted DOM/console on `de56a3cfd`; `verify:digital-screens-boundary` including lifecycle, rules emulator, and management emulator; focused lint; TypeScript; docs links | None; successful read retains documented transaction reads and rejected reads perform no initialization write | None | `de56a3cfd80ce21a9e4c8f907d13b19490c7cf42` | `de56a3cfd80ce21a9e4c8f907d13b19490c7cf42` | True handheld presentation and physical Menu Board/Highlights opens remain pending; known QA App Check diagnostic is unchanged |
| ML-QA-062 | Business Settings / Guest Feedback | Cancelled React-controlled drafts and page-level Reset | Desktop Chrome | QA owner `2/2`; persisted feedback enablement on; no Save | Reset restores feedback enablement, contact defaults, and review URL from current store truth; a later unrelated Save cannot carry a cancelled feedback draft | Preceding hosted bundle left an on-to-off feedback draft off after Reset. Exact fixed build restored on immediately after Reset and retained on after reload; External Sync remained off. | FIXED | Exact `/api/version`; controlled hosted DOM on `5a1020b0a`; `verify:guest-feedback-boundary`; focused lint; TypeScript; docs links | None during fixed verification; Reset is Firebase-cost neutral | Original feedback on and External Sync off states confirmed after reload | `5a1020b0ac0955bf0552129d185285f5c59dd77d` | `5a1020b0ac0955bf0552129d185285f5c59dd77d` | Save/cleanup lifecycle is complete under ML-QA-069; public projection and true handheld behavior remain |
| ML-QA-063 | Business Settings / Social Media / Working Hours | Social write admission, canonical persistence, focus/accessibility, exact cleanup, and cancelled parent drafts | Desktop Chrome plus source-gated mobile parity | QA owner `2/2`; persisted social baseline blank with no custom rows and all weekly days closed | Invalid social drafts remain write-free; valid known/custom links canonicalize and persist; rapid multi-field cleanup removes every link; Reset restores social URLs and weekly hours without touching independently persisted panels | The earlier Reset fix restored a cancelled Instagram draft and weekly hours. A later preceding build persisted a wrong-host Instagram URL. Exact social boundary builds rejected it without a write; canonical Facebook, Instagram, X, LinkedIn, YouTube, and Tripadvisor links survived independent loads; named custom controls retained focus through `tripadvisor`; and exact build `2262a2aa4` cleared all six links in one save after fixing stale draft updates. Final independent load showed five blank known fields, no custom rows, and no certification strings. | FIXED | Exact `/api/version` build `2262a2aa4`; immutable Preview `menulist-core-47juq06q9-neelvara-systems.vercel.app` and staging alias; controlled hosted DOM across independent authenticated documents; `verify:official-business-page-boundary`; `verify:business-settings-reset-boundary`; `verify:public-business-truth`; `verify:mobile-shell-route-map`; focused lint; full lint; TypeScript; docs links | Six bounded store updates across wrong-host reproduction/cleanup, canonical six-link save, stale-cleanup diagnosis, exact-fix custom setup, and final six-link cleanup; fixed-build invalid drafts and the earlier final Reset proof were write-free; no provider, analytics, public-form, or public-route operation | Five built-in social fields blank, zero custom rows, all seven weekly days blank, and temporary wrong-host/certification values absent after independent loads | `8e561bdbdcf34997a67fe5e0642a5c2a4d8d3522`, `ebb6e57bd6addbbdec9f093f503f593375d03b9b`, `5a06e5298e6f378c18bc1dd2d934e2d65841739c`, `2262a2aa4a79529c105b2c6615eb58b2967df05d` | `2262a2aa4a79529c105b2c6615eb58b2967df05d` | Authorized customer public projection, true handheld MobileShell behavior, and external social destinations remain pending |
| ML-QA-064 | Business Settings / Working Hours | Picker Enter versus explicit parent-form Save | Desktop Chrome | QA owner `2/2`; all weekly days blank; no Save click | Enter commits the range only to the local picker/form draft and never submits the wider Business Settings form | Preceding hosted bundle persisted a Sunday range when Enter was pressed. Exact fixed build rendered the local range preview after Enter, then reload without Reset or Save returned all seven days to blank. | FIXED | Exact `/api/version`; controlled hosted DOM on `28c36c2c2`; `verify:business-settings-reset-boundary`; focused lint; TypeScript; docs links | None during fixed verification; picker Enter is Firebase-cost neutral | All seven weekly days blank plus Instagram blank, Feedback on, and External Sync off confirmed after reload | `28c36c2c2ba8d61e44f948695cd63415aafc677f` | `28c36c2c2ba8d61e44f948695cd63415aafc677f` | Explicit Save Changes remains the parent-form persistence path; mobile and independently saved settings remain under ML-QA-060 |
| ML-QA-065 | Business Settings / Special Hours | Empty state, future closed date, persistence, last-entry removal, and cleanup | Desktop Chrome | QA owner `2/2`; no existing special dates | One bounded future date persists through reload; removing the only entry restores the empty state and remains empty after reload | Added closed date `16 Aug 2026` with label `QA certification cleanup`; reload retained it. Keyboard-activated Remove and OK completed the hosted delete after pointer automation was intercepted by the Vercel feedback overlay. Final reload showed `No special dates added.`, no retained label/date, and zero remove controls. | PASS | Controlled hosted DOM on exact application build `28c36c2c2`; pre/post hard-reload assertions; source inspection of desktop/mobile persistence and public-client projection | One future Special Hours entry created, then deleted | Original no-special-dates baseline restored and hard-reload confirmed | None | `28c36c2c2ba8d61e44f948695cd63415aafc677f` | Open-hours/edit/cancel, customer public projection, and true handheld MobileShell behavior remain under ML-QA-060 |
| ML-QA-066 | Business Settings / Time Slot Presets | Accessible controls plus create, edit, cascade, persistence, delete, and cleanup | Desktop Chrome | QA owner `2/2`; no existing presets | Every icon/color action has a keyboard-accessible name/state; create/edit/delete acknowledge and survive independent fresh app loads; cleanup restores the empty baseline | Preceding hosted build exposed unnamed edit/delete icon actions and pointer-only color swatches. Exact fixed build exposed 12 named pressed-state color buttons plus named edit/delete actions. Created `QA certification slot`, fresh-load confirmed it, edited it to `QA certification slot edited`, fresh-load confirmed again, deleted it through the cascade confirmation, and final fresh-load confirmed the empty state with zero test labels/actions. | FIXED | Exact `/api/version`; controlled hosted DOM on `a8a529756`; three independently loaded authenticated app documents; `verify:working-hours-boundary`; `test:time-slot-data-flow`; contextual-state gate; focused lint; TypeScript; docs links | One preset created, edited, then deleted; edit/delete used the existing bounded project-cascade reconciliation | Original no-presets baseline restored and fresh-load confirmed | `a8a529756d28ee9e219817ddee87bb44128f2db2` | `a8a529756d28ee9e219817ddee87bb44128f2db2` | Linked-category rendering and true handheld MobileShell behavior remain under ML-QA-060/050 |
| ML-QA-067 | Business Settings / Locale Settings | Time-format persistence and exact locale cleanup | Desktop Chrome plus source-gated mobile parity | QA owner `2/2`; exact current locale baseline captured | One scalar locale change persists through an independent app load; the reverse save restores every original locale field | Padded 12-hour time changed to 24-hour and persisted in a separately loaded authenticated app document. The reverse save restored padded 12-hour time, and a final fresh document confirmed Asia/Kolkata, 3:00 AM business-day end, original date format, INR, English, and padded 12-hour time. | PASS | Exact `/api/version`; controlled hosted DOM on `a8a529756`; two independent authenticated reload documents; `verify:public-business-truth`; MenuList/global localization source, owner-dashboard, public-customer, runtime, theme, and locale checks | Two store-document updates: 12-hour to 24-hour, then 24-hour to 12-hour | Complete original locale baseline restored and fresh-load confirmed | None | `a8a529756d28ee9e219817ddee87bb44128f2db2` | Remaining locale values and true handheld MobileShell behavior stay under ML-QA-060; aggregate `verify:global-localization-boundary` currently ends on an unrelated CampaignCue no-opener assertion |
| ML-QA-068 | Business Settings / Analytics Settings | Privacy-reducing preference persistence and exact analytics cleanup | Desktop Chrome plus source-gated mobile parity | QA owner `2/2`; external provider IDs blank; Customer App activity on; Approximate location off | Turning one tracking category off persists through an independent app load; the reverse save restores the complete analytics baseline without invoking a provider | Customer app activity changed from on to off and persisted in a separately loaded authenticated app document. The reverse save restored it to on. A third independent app document confirmed Menu activity, Featured section analytics, Official business page activity, and Customer app activity on; Approximate location off; and Google Analytics, Search Console, and Facebook Pixel fields blank. The wider Customer App gate's stale env/copy/module-evaluation assumptions were repaired without changing runtime behavior. | PASS | Exact `/api/version` build `f105873`; controlled hosted DOM across three independent authenticated app documents; source inspection of shared preference resolution, nested update normalization, and mobile optimistic-save rollback; `verify:public-business-truth`; `test:public-website-analytics-minimization`; post-fix `verify:customer-app-pwa`; focused lint; TypeScript; docs links | Two store-document updates: Customer App analytics on to off, then off to on; no provider ID or external-script operation | Complete original analytics baseline restored and final fresh-load confirmed | `7e9613aeb4788e5ad0467e68120c7c42a18a4167` | `f105873ce84a46d4080d2fe7056ade3cf3285efa` | Provider-ID validation/loading, public event projection, remaining category toggles, and true handheld MobileShell behavior remain under ML-QA-060 |
| ML-QA-069 | Business Settings / Guest Feedback | Accessible controls, enablement persistence, and exact cleanup | Desktop Chrome plus source-gated mobile parity | QA owner `2/2`; feedback on; comment/phone/email collection on; name and all required toggles off; review URL blank | Every settings control has an accessible name; disabling feedback persists in an independent app document; the reverse save restores every original feedback field | Preceding hosted build exposed unnamed desktop and mobile controls. Exact fixed build exposed named master, collection, required-field, and review URL controls. Feedback changed on to off and persisted in a separately loaded authenticated app document, then changed off to on. A third document confirmed the complete original defaults and blank review URL. | FIXED | Exact `/api/version` build `160adb944`; immutable Preview and staging alias; controlled hosted DOM across three independent authenticated app documents; `verify:guest-feedback-boundary`; `verify:mobile-shell-route-map`; `verify:public-business-truth`; `verify:public-customer-localization`; focused lint; TypeScript; docs links | Two store-document updates: feedback on to off, then off to on; no review URL or public feedback submission | Complete original feedback baseline restored and final fresh-load confirmed | `160adb94425bd4754f3ea604f9bb23c86aab9fc2` | `160adb94425bd4754f3ea604f9bb23c86aab9fc2` | This no-plan/no-subdomain fixture exposes no authorized public feedback URL; public form projection/submission and true handheld MobileShell remain pending |
| ML-QA-070 | Use MenuList | Customer link, QR, assets, public menu, PWA and noindex | Desktop and mobile/customer | Published bounded test menu | Outputs resolve to exact QA wildcard and render correctly | No-plan desktop admission and recovery state now pass on `/use-menulist`, `/qr-code`, and `/assets`; paid output generation and customer delivery were not exercised | IN PROGRESS | Exact hosted builds `729abda9c` and `97a328f19`; controlled Chrome DOM/console; output and printable-asset verifiers; lint; TypeScript | None | None | `729abda9c11b8243e1e80614b05777030ec7c1c4`, `97a328f19160dcc37eb68691a9fe6a712a68ccea` | `97a328f19160dcc37eb68691a9fe6a712a68ccea` | Current fixture has no permanent subdomain and no legitimate entitlement; link/QR/download success remains blocked on bounded fixture authority |
| ML-QA-071 | Use MenuList/Assets | Output entitlement and truthful empty-state boundary | Desktop Chrome | QA owner `2/2` has no active plan and no starter access | Denied owners see honest plan state; no project/template read failure is translated into missing-menu copy | Reproduced false missing-menu copy and Use MenuList diagnostic; both output components now gate reads before rendering. Hosted `/use-menulist`, `/qr-code`, and `/assets` show the shared no-plan state with no feature-load failure. | FIXED | Controlled Chrome DOM/console on exact builds; `verify-public-business-truth`; `verify:printable-asset-templates`; focused lint; TypeScript | None; fixed denied path performs zero feature reads/writes | None | `729abda9c11b8243e1e80614b05777030ec7c1c4`, `97a328f19160dcc37eb68691a9fe6a712a68ccea` | `97a328f19160dcc37eb68691a9fe6a712a68ccea` | Paid/starter success behavior remains under ML-QA-070; known QA App Check diagnostic is unchanged |
| ML-QA-080 | Team/Locations | Users, roles, invitations, staff, locations, isolation | Desktop and mobile | Suitable disposable QA identities and snapshot | Permission and tenant/store boundaries deny unauthorized actions | Desktop Users retained only QA owner B; the owner details view opened without mutation. Roles retained Owner, Manager, and Staff. Locations retained the zero-outlet policy state with Main Store as active HQ. Accessible desktop controls are fixed under child rows. No invitation, role, staff, outlet, or policy mutation was attempted. | IN PROGRESS | Controlled Chrome DOM on exact hosted `bf4cd14eb`; staff/roles, multi-location, mobile route-map, and staff scope/form/login-share gates; focused lint; TypeScript | None; bounded reads and local-only role selection/details interactions | Staff/details modal closed; Manager remained only the transient selected role card; no persisted team, role, outlet, or policy value changed | `bf4cd14eba102bd8b1b42330ec46e31d7958f23b` | `bf4cd14eba102bd8b1b42330ec46e31d7958f23b` | Disposable staff/outlet fixtures and exact cleanup are required for CRUD; invitation delivery, cross-tenant denial, and true handheld mobile remain pending |
| ML-QA-081 | Team / Users and Roles | Distinguishable staff actions and keyboard-operable role selection | Desktop Chrome plus source-gated mobile parity | Retained ordinary owner `2/2`; one Owner row; default Owner, Manager, and Staff roles | Every repeated icon action names its target; role cards expose button/pressed semantics and support Enter and Space without writing role truth | Preceding exact build exposed five unnamed icon-only actions for QA owner B and pointer-only role cards. Exact build `bf4cd14eb` exposed `Edit QA owner B`, `View QA owner B details`, temporary-passcode, sign-out, and removal names. The details action opened the retained owner record. Enter selected Owner, Space selected Manager, and `aria-pressed` moved from Owner to Manager while the matching permission panels rendered. | FIXED | Exact `/api/version` build `bf4cd14eba102bd8b1b42330ec46e31d7958f23b`; immutable Preview `menulist-core-4rb4nhudh-neelvara-systems.vercel.app`; controlled hosted DOM/keyboard interaction; `verify:staff-roles-route-parity`; three staff boundary suites; `verify:mobile-shell-route-map`; focused lint; TypeScript | None; details open/close and role selection were client-local interactions | Details modal closed; no staff or role mutation; retained Owner, Manager, and Staff definitions unchanged | `bf4cd14eba102bd8b1b42330ec46e31d7958f23b` | `bf4cd14eba102bd8b1b42330ec46e31d7958f23b` | Staff/role CRUD, reset/sign-out/removal confirmations, permission-denied identity coverage, and true handheld MobileShell require authorized disposable fixtures |
| ML-QA-082 | Locations | Accessible outlet-policy controls on the zero-outlet baseline | Desktop Chrome plus source-gated mobile parity | Retained ordinary owner `2/2`; Main Store is active HQ; zero active outlets | Every policy switch is named from its visible rule and the zero-outlet page remains truthful without an outlet or policy write | Preceding exact build exposed all 15 outlet-policy switches without accessible names. Exact build `bf4cd14eb` exposed exactly 15 switches and resolved every visible rule name once, from `Change item prices` through `Enable menu languages`; Add Outlet remained named, Active Outlets remained `0`, and Main Store remained active HQ. | FIXED | Exact `/api/version` build `bf4cd14eba102bd8b1b42330ec46e31d7958f23b`; immutable Preview `menulist-core-4rb4nhudh-neelvara-systems.vercel.app`; controlled hosted DOM; multi-location boundary; `verify:mobile-shell-route-map`; focused lint; TypeScript | None; no outlet creation, rename, deactivation, store switch, or policy update | Zero active outlets and Main Store active HQ baseline retained; all policy values unchanged | `bf4cd14eba102bd8b1b42330ec46e31d7958f23b` | `bf4cd14eba102bd8b1b42330ec46e31d7958f23b` | Outlet CRUD/store switching, admission/denial, policy persistence/rollback, and true handheld MobileShell require an authorized disposable outlet fixture |
| ML-QA-090 | Billing | Subscription and transactions without real money | Desktop and mobile | QA owner `1/1`; Razorpay Test Mode baseline | Pending checkout recovery and lifecycle remain idempotent; no fabricated entitlement | Retained ordinary owner `2/2` rendered the honest no-subscription state, Billing help, and the three-plan Yearly/Monthly chooser. Accessible chooser behavior is fixed under ML-QA-092. No checkout or provider action was attempted; the required Test Mode `1/1` subscription lifecycle remains pending. | IN PROGRESS | Exact hosted build `8e067e0a8`; controlled Chrome DOM; billing-entitlement and Menu editor gates; TypeScript; focused lint | Browser-local plan interval only; no checkout, Razorpay, subscription, entitlement, Firebase, or payment mutation | Yearly interval restored and chooser closed; ordinary `2/2` retained no active subscription | `8e067e0a8b0e6e5b6a06ed09d4ae7e515738b2e7` | `8e067e0a8b0e6e5b6a06ed09d4ae7e515738b2e7` | Test Mode `1/1` new checkout/recovery/webhook/cancel lifecycle and final authorization require the retained authorized fixture and owner-assisted boundary; true handheld mobile remains pending |
| ML-QA-091 | AI Transactions | Authorized empty history, action filter, Reset, Refresh, and accessible controls | Desktop Chrome plus source-gated mobile parity | Retained ordinary owner `2/2`; no AI history rows; `canAccessBilling` admitted | An authorized empty history remains truthful; the action filter is keyboard-operable and named; Reset/Refresh preserve the settled state; icon-only row detail actions are distinguishable | Preceding exact build completed the healthy read/filter/reset/refresh path but exposed one unnamed action-filter combobox. Exact build `738f8a237` exposed `Filter by action` as the only combobox name, retained named Start/End date, Reset, and Refresh controls, selected an action by keyboard, showed `Filtered`, reset it, refreshed, and returned to `No transactions found` without a load failure. Row-specific Details naming is source-gated because this fixture has no rows. | FIXED | Exact `/api/version` build `738f8a2374ffa28bde28ab045ad50bfe84033872`; immutable Preview `menulist-core-ikeeb6vsa-neelvara-systems.vercel.app`; controlled hosted DOM/keyboard interaction; `verify-ai-accounting-hardening`; `verify:mobile-shell-route-map`; focused lint; TypeScript; docs links | None; bounded authorization/history reads only, with no project enrichment because the page was empty | Action filter reset; final hosted page retained the original unfiltered empty baseline | `738f8a2374ffa28bde28ab045ad50bfe84033872` | `738f8a2374ffa28bde28ab045ad50bfe84033872` | A live row/details modal and non-empty pagination require an authorized disposable AI-history record; true handheld MobileShell behavior remains pending; Razorpay payment history remains under ML-QA-090 |
| ML-QA-092 | Billing | Accessible no-subscription plan chooser and reversible interval selection | Desktop Chrome plus source-gated mobile parity | Retained ordinary owner `2/2`; no active subscription; checkout activation prohibited | The interval switch is named, repeated plan actions name their plans, both price intervals render correctly, and closing the chooser leaves billing truth untouched | Preceding exact build exposed one unnamed interval switch and three indistinguishable `Get Started` actions. Exact build `8e067e0a8` exposed `Billing interval` plus `Get started with Starter Plan`, `Pro Plan`, and `Premium Plan`. Yearly showed ₹4,990/₹14,990/₹39,990; switching to Monthly showed ₹499/₹1,499/₹3,999; switching back restored all Yearly prices. No generic accessible `Get Started` action remained, and Close removed the modal. | FIXED | Exact `/api/version` build `8e067e0a8b0e6e5b6a06ed09d4ae7e515738b2e7`; immutable Preview `menulist-core-5dtqju9ku-neelvara-systems.vercel.app`; controlled hosted DOM; `verify:billing-entitlement-boundary`; focused lint; TypeScript | Browser-local interval selection only; no plan action, checkout, provider script, subscription, entitlement, or Firebase operation | Yearly restored, chooser closed, and no-subscription state retained | `8e067e0a8b0e6e5b6a06ed09d4ae7e515738b2e7` | `8e067e0a8b0e6e5b6a06ed09d4ae7e515738b2e7` | Upgrade/downgrade/custom-plan hosted labels are source-gated because this fixture has no active/custom subscription; Test Mode checkout lifecycle and true handheld mobile remain under ML-QA-090 |
| ML-QA-100 | Settings/Support/PWA | Help, app settings, locale, theme, offline/reload, accessibility | Desktop and mobile | Core owner flows available | State inherits correctly and recovery paths are usable | Help shell, search, support entries, recent-viewed state, footer, and navigation rendered. Category/article/changelog reads settled to honest empty content; failed ticket and feedback-history reads remain retryable; rejected Help search, ticket-create, and feedback-submit attempts preserve completed owner input with persistent recovery states. App Settings has named/stateful controls, exact reload/restore proof across maintained preferences, live cross-tab Redux appearance propagation, and a complete real-browser fullscreen enter/exit lifecycle with tab-local isolation. PWA transport and the shared offline recovery document are fixed under ML-QA-105. | IN PROGRESS | Controlled Chrome DOM/console through exact hosted `c8db801d6`; two independently loaded authenticated documents for App Settings; hosted PWA header/manifest/offline checks; Help Center/auth-scope, owner/customer PWA, Redux-state, browser-runtime, Ant theme, owner-dashboard locale, lint, TypeScript, docs-link, and contextual-state gates | Browser-local App Settings preferences only; Help rejection checks and PWA transport/offline reads performed no admitted query, POST, server/Firebase/Storage/provider mutation | Help test drafts discarded; Dark, blue, Vertical, Expanded, LTR, British English, UTC, long date, padded 12-hour time, all display switches off, no recent/favourite colours, and settings drawers closed | `12376cf3f1957c6d8df388bb701619f8c4564adb`, `206c9621b5df5b24ec8d1c070241142bbfb1ce16`, `597af4a9a5a63186bf544e4d074e319c1394b24f`, `d3d995b88fd1a78b186860f1b0d6f0028a24500b`, `981e91a0dbc6244612015d9a975cc1794ece133d`, `22b85707900e12f487cd83de4c75d6eb5fce97ff`, `ed3d3336658df30c380ddecb0f717ed47086a1c5`, `c53fc7463faeeebe6fb89fade584bf76b7eb26a5`, `c8db801d61b24c4d5d4926474a8bca17408e8d62` | `c8db801d61b24c4d5d4926474a8bca17408e8d62` | Successful Answerlattice-backed search, ticket, and feedback mutations require a separately authorized fixture; true handheld inheritance plus installed-app/offline worker behavior remain pending; cookie-backed locale changes settle in another tab on its next navigation or refresh by contract |
| ML-QA-101 | Help Center | Failed landing requests versus confirmed empty/absent content | Desktop Chrome | QA owner `2/2`; protected public-content and ticket transports | A failed landing request stays visibly unavailable and retryable; confirmed empty content remains distinct | Exact hosted QA confirmed honest category/article/changelog empty states and a persistent open-ticket-summary failure. Latest exact-build rerun preserved the visible retry state and bounded DAL diagnostic; `No tickets yet` stayed absent. | FIXED | Exact hosted Chrome DOM/console; `verify:help-center-boundary`; auth scope boundary; contextual-state gate; focused lint; TypeScript | None | None | `12376cf3f1957c6d8df388bb701619f8c4564adb`, `206c9621b5df5b24ec8d1c070241142bbfb1ce16`, `597af4a9a5a63186bf544e4d074e319c1394b24f` | `597af4a9a5a63186bf544e4d074e319c1394b24f` | QA owner B intentionally has no Answerlattice product-account/environment provisioning, so successful ticket reads require a separately authorized fixture; current knowledge/category data is confirmed empty |
| ML-QA-102 | App Settings | Desktop configuration presentation, accessibility, local persistence, cross-tab behavior, and fullscreen | Desktop Chrome | Retained QA owner `2/2`; two authenticated settings documents available | Every maintained control renders with a usable name/state; reversible preferences survive independent loads, durable Redux settings propagate live, transient browser/UI state remains tab-local, and cleanup restores exactly | The accessibility and full preference matrix remain fixed. A preceding exact bundle reproduced Dark→Light staying stale in Tab B until reload. Exact build `22b857079` propagated Light and the Dark restoration live without reloading Tab B. Closing Tab B's drawer left Tab A open. Tab A entered/exited real browser fullscreen with checked/off states and confirmations while Tab B stayed fullscreen-off. Cookie-backed locale values remain server-authoritative and settle on another tab's next navigation/refresh. | FIXED | Exact `/api/version` build `22b85707900e12f487cd83de4c75d6eb5fce97ff`; immutable Preview `menulist-core-aeh1c0z7t-neelvara-systems.vercel.app`; controlled hosted DOM across two independently loaded documents; `npx tsx scripts/verification/test-redux-state-contract.ts`; `test:browser-runtime-boundaries`; `test:antd-theme-boundary`; focused lint; TypeScript | Browser-local preferences only; no Firebase, server, tenant, store, project, provider, entitlement, or public-data mutation | Both independent final loads restored Dark, fullscreen off, Business Settings shell, and closed settings drawers; the previously certified blue/Vertical/Expanded/LTR/British-English/UTC/date/time/display baseline was unchanged | `d3d995b88fd1a78b186860f1b0d6f0028a24500b`, `981e91a0dbc6244612015d9a975cc1794ece133d`, `22b85707900e12f487cd83de4c75d6eb5fce97ff` | `22b85707900e12f487cd83de4c75d6eb5fce97ff` | True handheld MobileShell inheritance and offline/device PWA remain pending under ML-QA-100 |
| ML-QA-103 | Help Center | Workspace-unavailable search and ticket-create recovery | Desktop Chrome | Retained QA owner `2/2` intentionally has no admitted Answerlattice workspace | Rejected search/ticket attempts stay write-free, preserve completed owner input, show persistent recovery truth, and never display success or false empty content | Preceding build erased a rejected question into `NO MATCHES FOUND`; ticket failure was toast-only. Exact build `ed3d33366` retained `Where can I change my menu hours?` beside a persistent availability error. The filled ticket form retained its QA subject/details and showed persistent `Request not sent`; no success state appeared. | FIXED | Exact `/api/version` build `ed3d3336658df30c380ddecb0f717ed47086a1c5`; immutable Preview `menulist-core-uu0ox2bcr-neelvara-systems.vercel.app`; controlled hosted DOM; `verify:help-center-boundary`; `test:help-center-runtime-boundaries`; `test:ticket-attachment-boundary`; focused lint; TypeScript; docs links | None; invalid workspace is rejected before attachment upload, Firestore persistence, AI provider, or support signal | Search modal closed and ticket form unmounted, discarding both QA-only drafts | `ed3d3336658df30c380ddecb0f717ed47086a1c5` | `ed3d3336658df30c380ddecb0f717ed47086a1c5` | Successful search answers, ticket creation/history, attachment upload, and signal/notification evidence require a separately authorized Answerlattice QA fixture; true handheld behavior remains pending |
| ML-QA-104 | Help Center | Latest-feedback read and rejected feedback-submit recovery | Desktop Chrome | Retained QA owner `2/2` intentionally has no admitted Answerlattice workspace | A failed latest-feedback read remains visibly unavailable and retryable; a valid rejected submit retains all input with a persistent error; Cancel restores the blank General step | Exact build `c53fc7463` kept the latest-feedback failure visible and restored it after retry. Blank submit rendered both required validations. A four-star completed comment remained intact beside persistent `Failed to send feedback.` with no success state. Cancel cleared rating, comment, and submit error while the independent read failure remained visible. | FIXED | Exact `/api/version` build `c53fc7463faeeebe6fb89fade584bf76b7eb26a5`; immutable Preview `menulist-core-mfnsaqt3b-neelvara-systems.vercel.app`; controlled hosted DOM; `verify:help-center-boundary`; contextual-state gate; focused lint; TypeScript; docs links | None; invalid workspace is rejected before latest-feedback query, feedback POST, Firebase persistence, provider, or support signal | Cancel cleared the QA-only rating/comment, then the feedback form was unmounted by returning to Help Center | `c53fc7463faeeebe6fb89fade584bf76b7eb26a5` | `c53fc7463faeeebe6fb89fade584bf76b7eb26a5` | Successful feedback history/create and downstream signal evidence require a separately authorized Answerlattice QA fixture; true handheld behavior remains pending |
| ML-QA-105 | PWA transport and offline document | QA noindex, security headers, owner manifest identity, and recovery copy | Hosted HTTP plus desktop browser | Exact Preview `c8db801d6`; public QA app and website hosts | Manifest and worker responses inherit the host-aware security policy; the owner manifest remains valid; the offline document exposes a truthful, named recovery action | The preceding hosted build omitted `X-Robots-Tag` and `X-Content-Type-Options` from the owner manifest and owner/customer worker transports because the Proxy matcher excluded them. Exact fixed build admitted `/manifest.json`, `/manifest.webmanifest`, `/serwist/sw.js`, `/sw.js`, and `/sw-customer.js` without tenant rewriting. Both QA hosts returned `noindex, nofollow, noarchive` plus `nosniff` for all five routes, including honest 404s. The owner manifest retained MenuList identity, `/today` start, `/dashboard` id, standalone display, 14 icons, and four shortcuts. `/offline` rendered `You're offline`, reconnect guidance, and named `Try again`. | FIXED | Exact `/api/version` build `c8db801d61b24c4d5d4926474a8bca17408e8d62`; immutable Preview `menulist-core-jyhlaufxx-neelvara-systems.vercel.app`; staging alias; hosted 15-response header matrix; controlled offline-page DOM; `verify:owner-pwa-lifecycle`; `verify:customer-app-pwa`; `test:menulist-host-routing`; focused lint | None; public transport and document reads only; no service-worker registration, cache/storage inspection, Firebase, provider, tenant, project, or owner mutation | No mutable state introduced; manifest identity and QA host policy remained stable after the fix | `c8db801d61b24c4d5d4926474a8bca17408e8d62` | `c8db801d61b24c4d5d4926474a8bca17408e8d62` | Real installation, update activation, offline navigation/cache behavior, and true handheld recovery require a physical-device or supported service-worker fixture |
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

Do not fabricate the remaining fixture-dependent evidence:

- ML-QA-010 logout/relogin and stale-session recovery require disposable QA
  credentials whose recovery path can be completed without exposing secrets.
- ML-QA-020/040/050/070 require an explicitly authorized entitled disposable
  `2/2`-family store before intake, project/menu CRUD, publish, link, QR, or
  asset success can be mutated and cleaned up. Retained `1/1` remains
  Razorpay-Test-only.
- ML-QA-011 and the mobile remainder require true handheld Chrome/MobileShell
  evidence; a narrow desktop viewport is not a substitute.
- ML-QA-101/103/104 successful ticket-summary, search-answer, ticket-create,
  feedback-history, feedback-create, and downstream support-signal data still
  require authorized Answerlattice QA backing data. Rejection recovery is
  complete for retained owner `2/2`; ML-QA-031's successful empty Feedback read
  is also complete.
- ML-QA-090 final checkout remains owner-assisted Razorpay Test Mode only.
- ML-QA-091 live row details, non-empty pagination, and true handheld parity
  require an authorized disposable AI-history record/device; its empty-history,
  filter, reset, refresh, and desktop accessibility path is complete.
- ML-QA-110 elevated success requires explicitly authorized PLATFORM and
  RESELLER fixtures. Ordinary-owner denial is complete under ML-QA-111.

Within the retained ordinary-owner fixture, continue only reversible settings
checks whose exact baseline and cleanup can be proven. Do not open physical
screens, provider handoffs, or paid operations.
