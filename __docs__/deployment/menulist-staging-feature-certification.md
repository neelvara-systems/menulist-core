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

## Execution Ledger

| ID | Surface | Flow | Viewport | Preconditions | Expected | Actual | Status | Evidence | Data mutations | Cleanup | Fix commit | Hosted build | Remaining risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ML-QA-000 | Deployment | Exact source/host alignment | HTTP | `staging` checkout | Runtime source, remote, and hosted Preview report one commit | Runtime fix commit, `origin/staging`, and hosted Preview reported `fccff11f6329ad6979853b6220ca736d86e461c3`; hosted env is `preview` | PASS | `git rev-parse HEAD`; `git rev-parse origin/staging`; Vercel Preview `Ready`; `GET https://menulist.digital/api/version` on 2026-08-14 | None | None | `fccff11f6329ad6979853b6220ca736d86e461c3` | `fccff11f6329ad6979853b6220ca736d86e461c3` | A later evidence-only ledger commit does not change the certified runtime files |
| ML-QA-001 | QA hosts | Website and sign-in transport plus crawler isolation header | HTTP | Public network | Both hosts return 200 and QA noindex header | Both returned HTTP 200 with `x-robots-tag: noindex, nofollow, noarchive`; full static route and redirect sweep also retained the QA header | PASS | Response headers from `menulist.digital` and `app.menulist.digital/signin`; 62-route exact-build sweep on 2026-08-14 | None | None | `fccff11f6329ad6979853b6220ca736d86e461c3` | `fccff11f6329ad6979853b6220ca736d86e461c3` | Robots/sitemap policy is retained setup evidence; public route transport is covered below |
| ML-QA-002 | QA website | Static and localized resource transport, canonical redirects, rendered smoke, and crawler isolation | HTTP and desktop Chrome | Exact hosted Preview and source-derived route inventory | All 205 inventoried URLs resolve; owner paths use canonical app host; every QA response, including redirects, is noindex | 62 static URLs and 143 resource/locale URLs resolved successfully. The missing redirect headers were corrected and reran cleanly; Chrome rendered `/product` at canonical `/how-it-works` without console issues | FIXED | Hosted GET/HEAD matrices; controlled Chrome DOM/console; `test:menulist-host-routing`; `verify:website-resource-locales`; Next compatibility; focused lint; TypeScript | None | None | `fccff11f6329ad6979853b6220ca736d86e461c3` | `fccff11f6329ad6979853b6220ca736d86e461c3` | Page-specific interactions and form mutations remain under their owning feature rows; transport/render coverage is complete |
| ML-QA-010 | Authentication | Existing session restoration and owner shell | Desktop Chrome | Logged-in QA owner at scope `2/2` | Trusted session restores, exact scope loads, no cross-product or subscription bypass | Retained `QA owner B` session restored; fixture authority maps it to `2/2`; `/billing` and hard-reloaded `/projects` rendered the full owner shell and honest no-plan guard; prior session-prime/store-bootstrap errors did not recur | IN PROGRESS | Controlled Chrome DOM, account-menu identity, and console inspection on 2026-08-14; retained QA fixture mapping; only the documented non-blocking App Check skip diagnostic appeared | None | None | None | `f05001553bc41525564351a6bcbb7d1826ad1792` | Logout/relogin, stale-session expiry, and explicit permission-denial cases remain; fixture is intentionally unsubscribed |
| ML-QA-011 | Authentication | Existing session restoration and owner shell | Mobile Chrome | Same session and `ENABLE_MOBILE_UI` | MobileShell loads inside owner app with correct visible tabs and scope | A `390x844` resize remained in desktop shell as designed because the runner cannot provide handheld UA/touch signals | BLOCKED | Hosted viewport proof plus `useDeviceType`/layout-wrapper source boundary; local `verify:mobile-shell-route-map` is PASS but is not hosted proof | None | None | None | `f05001553bc41525564351a6bcbb7d1826ad1792` | Requires true mobile Chrome or handheld emulation for tabs, route/hash restoration, reload, and scope proof |
| ML-QA-020 | Onboarding | First project and onboarding continuity | Desktop and mobile | QA owner `2/2`; snapshot before mutation | Existing default project loads without recreating or escaping scope | Not rerun; historical `QA-K09` setup proof retained in setup guide only | NOT STARTED | Pending current-build hosted proof | Pending | Pending | None | `40c428d5f9b177a2d6ce85db9577badf0bbdf679` | Avoid destroying retained fixture |
| ML-QA-030 | Dashboard/Today | Dashboard, Today, Business Health, and Feedback entry | Desktop and mobile | Auth and owner shell pass | Each visible entry loads correct scoped state and honest empty/no-plan behavior | Not exercised | NOT STARTED | Pending | None | None | None | `40c428d5f9b177a2d6ce85db9577badf0bbdf679` | Feature flags and analytics availability may change visible matrix |
| ML-QA-040 | Projects | Full CRUD, cancel, reload, recovery | Desktop and mobile | Snapshot project and compact summary | Bounded operations are idempotent and remain inside `2/2` | Not rerun in current ledger | NOT STARTED | Pending | Pending | Pending | None | `40c428d5f9b177a2d6ce85db9577badf0bbdf679` | Historical setup proof exists but does not certify current feature matrix |
| ML-QA-050 | Menu | Categories, items, pricing, visibility, variants, translations, publish, import, extraction, images, failure recovery | Desktop and mobile | Stable test project and bounded source assets | Every supported edit persists, publishes, reloads, and fails safely | Not exercised | NOT STARTED | Pending | Pending | Pending | None | `40c428d5f9b177a2d6ce85db9577badf0bbdf679` | Paid AI/provider calls require cost and fixture control |
| ML-QA-060 | Business Settings | All owner-controlled public business facts | Desktop and mobile | Auth and test project | Valid changes persist and invalid/cancelled changes do not mutate truth | Not exercised | NOT STARTED | Pending | Pending | Pending | None | `40c428d5f9b177a2d6ce85db9577badf0bbdf679` | Public projection consistency pending |
| ML-QA-070 | Use MenuList | Customer link, QR, assets, public menu, PWA and noindex | Desktop and mobile/customer | Published bounded test menu | Outputs resolve to exact QA wildcard and render correctly | Not exercised | NOT STARTED | Pending | Pending | Pending | None | `40c428d5f9b177a2d6ce85db9577badf0bbdf679` | Current fixture has no permanent subdomain per handoff |
| ML-QA-080 | Team/Locations | Users, roles, invitations, staff, locations, isolation | Desktop and mobile | Suitable disposable QA identities and snapshot | Permission and tenant/store boundaries deny unauthorized actions | Not exercised | NOT STARTED | Pending | Pending | Pending | None | `40c428d5f9b177a2d6ce85db9577badf0bbdf679` | Requires disposable staff fixture and exact cleanup |
| ML-QA-090 | Billing | Subscription and transactions without real money | Desktop and mobile | QA owner `1/1`; Razorpay Test Mode baseline | Pending checkout recovery and lifecycle remain idempotent; no fabricated entitlement | Not exercised in this ledger | NOT STARTED | Pending | Pending | Pending | None | `40c428d5f9b177a2d6ce85db9577badf0bbdf679` | Final checkout authorization is owner-assisted and may remain BLOCKED |
| ML-QA-100 | Settings/Support/PWA | Help, app settings, locale, theme, offline/reload, accessibility | Desktop and mobile | Core owner flows available | State inherits correctly and recovery paths are usable | Not exercised | NOT STARTED | Pending | Pending | Pending | None | `40c428d5f9b177a2d6ce85db9577badf0bbdf679` | Physical-device install certification is separate evidence |
| ML-QA-110 | Internal/Reseller | Platform, ops, and reseller role-gated surfaces | Desktop and mobile | Correct synthetic role fixtures | Authorized roles load; ordinary owner is denied | Not exercised | NOT STARTED | Pending | Pending | Pending | None | `40c428d5f9b177a2d6ce85db9577badf0bbdf679` | Do not grant elevated roles casually; fixture plan required |

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

Complete the remaining ML-QA-010 exact-scope and negative-session cases without
exposing session material. Then begin ML-QA-020 onboarding continuity on the
retained `2/2` fixture without recreating or deleting it. ML-QA-011 remains
blocked until true handheld browser evidence is available; a narrow desktop
viewport is not a substitute.
