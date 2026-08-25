# MenuList Release-Candidate Certification

**Status:** CERTIFICATION BLOCKED

**Candidate branch:** `staging`

**Initial candidate commit:** `b857a164944012d42131917e7c62215c94022c0f`

**Current tested product commit:** `756f24773a379ec3db02a1b5052a0b705eb0e7b5`

**MenuList product snapshot commit:** `3a34a975d52b1a3b8bec4be35c40b4930b1f9441`

**Candidate filesystem state:** the complete local snapshot was committed and
pushed to `staging`; the worktree was clean and local/server `staging` was
`0/0` at direct readback before the resumed certification server regenerated
the expected development-only `next-env.d.ts` paths.

**Certification date:** August 25, 2026

**Canonical staging ledger:** [MenuList staging feature certification](../deployment/menulist-staging-feature-certification.md)
**External gate runbook:** [External certification runbook](../production-readiness/external-certification-runbook.md)

This document is the release-candidate summary and decision record. It does not
replace the existing feature-level staging ledger or external-evidence runbook.
The generated discovery inventory is retained in
[`menulist-rc-certification-inventory.csv`](./menulist-rc-certification-inventory.csv).

## A. Certification scope

- Product: MenuList only.
- Environments: local source, Firebase demo emulators, controlled local browser,
  and the MenuList QA application/tenant hosts after exact build identity is
  verified.
- Production customer data and destructive production testing are excluded.
- Canonica, Answerlattice, CampaignCue, SignalDesk, MyCodex, GrowthOS,
  KitStamp, and Neelvara behavior is excluded except for routing and product
  separation checks.
- Live Razorpay checkout, credentials, webhooks, captures, refunds,
  settlements, and money movement are excluded. Application behavior around
  the provider boundary is included through source, deterministic tests,
  emulator fixtures, and mock lifecycle states.
- Initial fixture classes: unauthenticated visitor, new/no-tenant user,
  existing owner, staff/restricted actor, public customer, valid/invalid
  tenant and store, enabled/disabled feature, and material subscription and
  lifecycle states derived from current runtime guards. Exact hosted fixture
  availability remains to be recorded.

## B. Inventory summary

The current generator discovered 8,461 source candidates across the shared
repository. These are discovery candidates, not passing test claims.

| Inventory class | Discovered | Current status |
| --- | ---: | --- |
| Pages | 308 | Product classification and runtime reachability in progress |
| Route handlers | 293 | Product classification, methods, and boundary tests in progress |
| Layouts | 19 | Source and host behavior in progress |
| Loading/error/not-found surfaces | 9 | Runtime coverage in progress |
| User-control candidates | 7,478 | 5,277 MenuList controls page-mapped; 155 MenuList controls explicitly classified as non-shipped source |
| Feature flags | 333 | Product ownership and material alternate states in progress |
| Firebase Function exports | 21 | Source/export inventory complete; runtime evidence is tracked separately |

Current product classification yielded 5,943 MenuList candidates and 2,518
separation-boundary candidates. A candidate remains `DISCOVERED_UNTESTED` until
its rendered reachability and behavior are proven; source inspection alone does
not mark a control tested.

The 58 MenuList private pages are now classified from their inherited route
guards and shell contracts: 23 owner/authorized-staff pages, 33 platform-admin
pages, and 2 platform-or-reseller pages. Billing and both Help Center route
shapes are the only recovery routes available across active, Starter, unpaid,
pending, and expired states. `/platform/test-sentry` is the sole intentionally
desktop-only private page; every other private page is mapped to the shared
desktop and MobileShell contract. These classifications are inventory truth,
not proof that every rendered control has been exercised.

All 58 private page routes also have a current connected-Chrome signed-out
access result. Every route reached `/signin` with its exact intended callback;
`/qrCode`, `/ops`, `/ops/extraction`, and `/ops/scheduler` preserved their
canonical destination. The catch-all Help Center page was exercised through
`/help-center/kb`. These rows are marked
`ACCESS_PASSED_FUNCTIONAL_INTERACTION_PENDING`, so authentication protection is
proved without claiming their authenticated controls were exercised.

Of 5,432 MenuList-classified control candidates, 5,277 map through the static
import graph to one or more App Router pages. The remaining 155 controls in 45
source files have no page import path and now carry the explicit final status
`SOURCE_UNREACHABLE_NOT_USER_TRIGGERABLE`. They are classified as non-shipped
source, not represented as runtime-tested controls. Shared components retain
all reachable page routes so cross-product or cross-role reuse is visible in
the matrix.

All 136 MenuList route handlers now have resolved exported HTTP methods and an
explicit source-derived access-boundary classification. An anonymous runtime
pass exercised all 153 exported methods with credentials omitted and empty or
invalid deterministic input: 5 returned public/static 200 responses, 1
redirected, 15 rejected with 400, 128 with 401, 1 with 403, and 3 with 404.
There were no final timeouts or 5xx responses, and no protected method returned
2xx. The five legacy
`/api/widget/*` handlers are classified as Answerlattice separation boundaries,
not MenuList APIs. Valid authenticated and successful public behavior remains
separately tracked and is not implied by this anonymous boundary pass.

## C. Test execution

| Product area | Scope | Result | Evidence / blocker |
| --- | --- | --- | --- |
| Baseline identity | Worktree, branch, HEAD, and filesystem ownership | PASS (Git identity) | Complete snapshot committed at `3a34a975d52b1a3b8bec4be35c40b4930b1f9441`; exact tested product descendant `c9c08d64cd75e8e2a2f485373f5b3ebf3b784232` reached local/server `staging` at `0/0`. `main` remains unchanged. |
| SecurityOS registry | MenuList surface/evidence registry integrity | PASS | Registry, tenant/store DAL, Rules, Storage, CSP, input/file/network, webhook, and API-scope evidence executed; the current selective planner was reviewed and `test:csp-report-boundary` reran successfully |
| Route/control inventory | App Router, controls, flags, Functions | PASS (discovery, private-route classification/access, API classification, and static reachability) | `npm run verify:menulist-rc-inventory`; 8,461 unique rows; all 58 MenuList private pages explicitly classified and signed-out access-tested; all 136 MenuList route handlers have resolved methods/access classes; 5,277/5,432 MenuList control candidates map to page routes and 155 are explicitly classified as non-shipped source |
| Private-route authentication | All 58 MenuList `(main)` page routes, including concrete catch-all and canonical aliases | PASS (signed-out access only) | Connected Chrome on current local source: 58/58 reached callback-aware sign-in; no private screen rendered. Authenticated functional state remains separately pending. |
| Route-handler anonymous boundary | All 136 MenuList handlers and 153 exported HTTP methods | PASS local and exact hosted candidate | Exact hosted product commit `c9c08d64cd75e8e2a2f485373f5b3ebf3b784232` returned 200×5, 301×1, 400×15, 401×126, 403×1, and 404×5 with zero timeout/5xx; the former batch-image trace crash now rejects anonymously with 401. Live Razorpay execution remains excluded. |
| Local aggregate | MenuList-filtered repository production-readiness gate | PASS WITH EXTERNAL BLOCKER | The current full run passed its first five checks before AssetOS correctly stopped on the owner-PWA fingerprint made stale by MLRC-022. After the unchanged proof asset and exact source delta were reviewed and the one affected slot was re-fingerprinted, the resumed run passed 155/156 remaining checks. Combined unique result: 160/161 checks passed; all executable child verifiers passed; the sole non-pass is the unavailable Upstash target credential gate. |
| Authentication regression | Leading/trailing email and password; invalid login recovery; forgot-password validation; callback preservation | PASS (signed-out boundary) | Deterministic credential-normalization tests plus exact hosted Chrome: malformed identifier/passcode stayed on sign-in with inline validation, Forgot preserved `/dashboard`, invalid reset email produced an announced error, and Return restored the sign-in callback. No reset email, account creation, or real credential was submitted. |
| Authentication and onboarding aggregate | Sign-up/sign-in boundaries, claims/workspace association, plan handoff, owner setup, extraction entry, retry, recovery, concurrency, and cleanup | PASS (local/emulator) | `npm run verify:auth-onboarding-flow`, `npm run test:login-credential-normalization`, and `npm run verify:menu-extraction-pipeline` completed with exit 0; expected denial/failure logs were fixture assertions rather than escaped failures |
| Pricing handoff | Official, Pro, and Multi-location across INR/USD and monthly/yearly selection; content-pack sign-in; comparison and FAQ controls | PASS (provider boundary only) | Exact hosted Chrome exercised all 12 signed-out plan/currency/interval combinations. Each produced the expected callback-aware sign-in handoff with plan, currency, interval, B2C type, and quantity one or the Multi-location minimum of two. Content-pack sign-in, comparison expansion, all three FAQ categories, and an accordion in each category worked with zero overflow. No Razorpay provider execution occurred. |
| Hosted QA | Exact candidate on QA owner app | PASS (deployment identity and bounded recovery interaction) | At `2026-08-25T16:29+05:30`, `/api/version` returned exact product commit `756f24773a379ec3db02a1b5052a0b705eb0e7b5` with verified provenance. Signed-in pending-owner Billing/history/Help/recovery evidence remains valid through ancestor `801f87f…`; exact-current evidence includes public-feedback and global recovery destination/layout corrections. |
| Hosted transport | Website/app/tenant HTTP, metadata, noindex, PWA assets, missing routes | PASS (bounded) | Website, pricing, features, resources, legal, sign-in, owner manifest, offline, service workers, and tenant menu matched QA policy; disabled sitemap/customer manifest returned honest 404; missing menu slug rendered noindex recovery |
| Public website browser inventory | All 186 sitemap URLs, including 22 public tool routes and 62 App Router page patterns | PASS (render/recovery) | Connected Chrome reran the current sitemap manifest (`30afee75c57db88ee93dec78926ed0b389a1ff7ddde99fb2510946d897e24fe8`) and rendered a main region and route-specific heading without application/404 failure across all 186 unique URLs; individual transmitting controls remain separately pending; the 22 tools exposed 410 rendered controls |
| Current hosted mobile website routes | Static marketing, feature, industry, legal, trust, tools, English resources, and all 112 locale-prefixed resource variants | PASS (render/responsive/accessibility attributes) | Exact `b1750e0…` QA at 320×568 rendered every static website route and every reviewed localized resource variant with a non-empty heading, no application/not-found state, and no horizontal overflow. Exact `25d58ae…` then passed all 16 Arabic hub/article routes with root `lang=ar-SA`, root/content `dir=rtl`, and zero overflow; Arabic→English switch plus Chrome back/forward restored the correct route, heading, language, and direction each time. |
| Global signed-out recovery routes | `/403`, `/404`, `/unauthorized`, `/offline`, invalid `/invite`, `/product`, disabled `/creative-editor-smoke`, protected `/test-sentry`, invalid `/msg-preview/[sessionId]` | PASS (behavior, copy, width, and destination) / 44px touch-target fix pending hosted retest | Exact hosted `756f247…` Chrome at 320×568 rendered readable copy at exactly 320px document width on `/403` and `/unauthorized`; “Go Home” reached `https://menulist.digital/`. Both actions measured 40px high, producing the separately fixed-in-source MLRC-038 touch-target finding. |
| Public Truth Tools | All 22 tool routes plus the tools index and report reader; primary generation/check, empty/result, copy, public-link, reset, follow-up validation, and mobile width | PASS (non-transmitting browser coverage) | Connected Chrome at 320×568 rendered every route without application failure or overflow. All 18 remaining generator/check tools produced an honest empty-input report; every available Reset restored the initial state; every generated report copied and created a public report link; all 12 inline follow-up forms refused blank submission with “Enter your name.” Public Truth Check, QR Poster Maker, QR Link Health Check, valid/malformed report links, and shared source contracts were exercised separately. No valid follow-up form was transmitted. |
| Create-menu entry | Signed-out phone/Google gate; signed-in upload/link tabs; empty and malformed link recovery | PASS (non-mutating) | Phone action remained disabled for incomplete input and enabled for a structurally valid number; empty owned-link submission showed a recoverable message and restored the form; no hosted upload/import was submitted without a proven disposable fixture |
| Tenant customer route | Known historical QA tenant hosts, missing-menu recovery, mobile width, metadata | PASS (recovery only) / BLOCKED (active truth) | Two historical tenant hosts now render the calm noindex “Menu not found” recovery at 375 px with no console error or horizontal overflow; no current active disposable public tenant was available for menu/OBP mutation and freshness testing |
| Pending owner direct-route gate | Billing recovery versus direct `/locations` access | PASS source and hosted | Exact hosted pending owner direct-linked to `/locations` and reached Billing before any location controls rendered, on desktop and at 390px. |
| Owner mobile source boundary | MobileShell route map, Billing and Help recovery, PWA lifecycle, locale coverage | PASS source and hosted responsive browser / BLOCKED true device | Exact hosted QA at 390×844 rendered `/help-center` and `/billing` inside MobileShell with the recovery bypass intact; Help/PWA/subscription gates pass. Physical-device evidence remains pending. |
| Mobile Billing recovery | Direct `/billing`, pending-owner summary, history, support handoff, touch targets, overflow | PASS | Exact hosted `c9c08d6…` rendered native `MobileBillingScreen` at 390×844 with zero horizontal overflow and all visible actions at least 44px. Billing History opened a truthful empty sheet. “Need billing help?” opened `/help-center/ticket#mobile/more/answerlatticeSupport`; the ticket form had zero overflow and a 44px Send Request target. No ticket or payment was submitted. |
| Contact form | Render, blank submission, validation announcement, recovery | PASS (non-transmitting) | Connected Chrome announced name, email, message-length, and policy-consent errors; no valid enquiry was transmitted |
| Pending-owner support recovery | Billing support handoff and empty ticket validation | PASS (non-transmitting) | Connected Chrome moved from Billing to `/help-center/ticket`; blank Send Request stayed on-page and exposed subject/details errors; no ticket or file was transmitted |
| Physical devices | Owner PWA, public menu, screen/TV where applicable | BLOCKED | No current physical-device evidence in this session |

Current sanitized visual evidence is retained outside the repository:

- `/tmp/menulist-rc-user-flow-evidence/01-home-local.png` — local desktop website.
- `/tmp/menulist-rc-user-flow-evidence/03-billing-pending-hosted-stable.png` — hosted pending Billing state and legacy owner identity.
- `/tmp/menulist-rc-user-flow-evidence/06-tenant-menu-mobile.png` — 375px missing-tenant recovery.
- `/tmp/menulist-rc-user-flow-evidence/08-pending-owner-locations-hosted.png` — pending owner direct-route and minor-unit display defects.
- `/tmp/menulist-rc-user-flow-evidence/09-pricing-mobile-390.png` — 390px pricing state.
- `/tmp/menulist-rc-audit-2026-08-25/02-billing-pending-state.png` — current hosted pending Billing state.
- `/tmp/menulist-rc-audit-2026-08-25/03-help-recovery-route.png` — current desktop Help recovery shell and retryable ticket-history failure.
- `/tmp/menulist-rc-audit-2026-08-25/04-mobile-help-subscription-block.png` — current hosted 390px Help route incorrectly replaced by the subscription card.
- `/tmp/menulist-rc-audit-2026-08-25/07-exact-459-mobile-billing.png` — exact `4592516…` corrected 390px Billing layout.
- `/tmp/menulist-rc-audit-2026-08-25/08-exact-c9-mobile-billing-support.png` — exact `c9c08d6…` Billing-to-ticket recovery.
- `/tmp/menulist-rc-user-flow-evidence/10-support-ticket-validation-hosted.png` — hosted empty support-ticket validation and recovery.
- `/tmp/menulist-rc-audit-2026-08-25/01-pricing-pro-entry.png` — current pricing entry state.
- `/tmp/menulist-rc-audit-2026-08-25/02-billing-pending-state.png` — current pending-payment desktop Billing state.
- `/tmp/menulist-rc-audit-2026-08-25/03-help-recovery-route.png` — current desktop Help recovery route and Answerlattice dependency failure.
- `/tmp/menulist-rc-audit-2026-08-25/04-mobile-help-subscription-block.png` — current 390×844 Help route replaced by the subscription card.

## D. Defect ledger

No certification defect is closed merely from pre-existing source history.
New findings and current retest evidence will be recorded here during the
audit-fix-retest loop.

| ID | Severity | Flow | Root cause | Fix | Regression evidence | Retest | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MLRC-001 | Medium | Local release gate | The portfolio-wide readiness runner mixed explicit sibling-product verifiers into a MenuList certification and had no deterministic resume point. | Added a MenuList product filter, explicit exclusions, product-aware shared gates, and `--start-at`. | `npm run certify:menulist-local` | Split pass 92 checks plus final full rerun | CLOSED |
| MLRC-002 | Medium | Asset audit | AssetOS audit/review could not scope findings to MenuList, so sibling assets blocked the product candidate. | Added a bounded `--brand menulist` filter and MenuList certification command. | `npm run certify:asset-factory-menulist` | 28 MenuList slots; zero errors and warnings | CLOSED |
| MLRC-003 | Medium | Rules/agent readiness evidence | Agent-readiness assertions referenced a retired refund event and the canonical rather than generated MenuList deploy rules. | Aligned assertions to `refund.processed` and deterministic `firestore-menulist.rules`. | `verify:agent-readiness`; 42-script Rules predeploy | PASS | CLOSED |
| MLRC-004 | Medium | Failure observability | Three typed billing tax-profile failures were incorrectly classified as arbitrary raw exception exposure. | Added narrow typed-error allowances while retaining denial of arbitrary exception responses. | MenuList global-failure observability gate | PASS | CLOSED |
| MLRC-005 | Medium | Multi-location billing regression | Static assertion expected a retired one-line subscription quantity update and did not cover tax snapshot/credit resizing. | Updated the boundary assertion to require quantity, tax-snapshot resize, and ordering before outlet creation. | `verify:multi-location-boundary` | PASS | CLOSED |
| MLRC-006 | Low | Certification inventories/docs | Contextual-state counts, cost scanner counts, audit statuses, a help Rules token, and a retired documentation command had drifted from runtime truth. | Regenerated inventories and updated exact assertions/documentation. | Contextual-state, data-flow, doc-script, Help Center, and Firebase cost gates | PASS | CLOSED |
| MLRC-007 | Medium | Commercial lifecycle evidence | MenuList commercial verifiers assumed product-hardcoded generic billing helpers and outdated refund/quantity call shapes. | Verified the generic product boundary plus explicit MenuList product identity at the adapter. | Full MenuList commercial readiness and mocked provider lifecycle | PASS | CLOSED |
| MLRC-008 | Medium | External-integration evidence | Current WhatsApp owner-notification flags were enabled while the integration verifier and documentation still claimed disabled. | Reconciled verifier and active-integration documentation to runtime flags. | `verify:menulist-external-integrations` | PASS | CLOSED |
| MLRC-009 | High | Pricing selection through authenticated sign-in | The global auth layout redirected every currently valid session to `/dashboard` before the login screen could preserve the validated pricing `callbackUrl`; Dashboard then redirected the pending owner to Billing. | Retained the fresh persisted-user authority check but passed the valid session to the callback-aware sign-in client, which owns the final same-origin redirect. | `verify:auth-onboarding-flow`; auth/security failure matrix; TypeScript | Targeted source and local pricing-route retest PASS; updated hosted build pending | CLOSED (source) |
| MLRC-010 | Medium | Pending/unpaid desktop navigation | Recovery-only owners saw the full paid workspace navigation even though those destinations redirected back to Billing. | Filtered the sidebar to the existing Billing and Help Center recovery-route contract whenever neither paid nor starter access exists. | `verify:onboarding-subscription-boundary`; TypeScript | Targeted source retest PASS; updated hosted build pending | CLOSED (source) |
| MLRC-011 | Medium | Selecting a different plan while another checkout is pending | Pricing hid the requested plan behind subscription management without explaining that the older pending checkout blocked a different plan, making the selection appear ignored. | Parsed the bounded handoff on the subscription-management surface and added an explicit old-plan/new-plan conflict notice; no second provider checkout is initiated. | `verify:auth-onboarding-flow`; TypeScript | Targeted source and hosted-state reproduction PASS; updated hosted build pending | CLOSED (source) |
| MLRC-012 | Medium | Owner shell identity | Shared desktop header/sidebar still rendered the retired `ecoms.ai` logo in MenuList Billing. | Added a MenuList logo atom using the existing bundled app mark and replaced both owner-shell imports. | `verify:menulist-commercial-identity`; ESLint; TypeScript | Hosted defect reproduced; local source PASS; updated hosted build pending | CLOSED (source) |
| MLRC-013 | Medium | Platform sitemap | `public/sitemap.xml` and `src/app/sitemap.ts` both owned `/sitemap.xml`, causing Next.js to return HTTP 500 for the route. | Kept the maintained static sitemap as the single runtime owner, removed the conflicting route module, and added a regression guard against duplicate ownership. | `verify:menulist-rc-inventory`; `verify:public-business-truth` | Local HTTP retest: sitemap 200 XML, robots 200, owner manifest 200, missing route 404 | CLOSED |
| MLRC-014 | Medium | Signed-out owner deep links | The private layout redirected every missing session to plain `/signin`, so refreshes and direct links lost the intended owner route and query. | Proxy now removes forged values, injects the exact owner request path as a controlled request header, and the private layout validates/bounds it before encoding the sign-in callback. | `verify:auth-onboarding-flow`; `verify:url-routing-boundary`; auth/security failure matrix; TypeScript | Browser PASS for `/dashboard`, `/projects?view=archived`, and `/help-center/ticket` callbacks | CLOSED |
| MLRC-015 | Medium | Forgot-password recovery | Sign-in preserved the protected callback, but “Forgot?” and “Return to sign in” discarded it. | Propagated the validated relative callback through forgot-password, return-to-sign-in, and the already-authenticated recovery redirect. | `verify:auth-onboarding-flow`; auth/security failure matrix; TypeScript | Browser round trip preserved `/projects?view=archived` through both auth routes | CLOSED |
| MLRC-016 | High | Pending/unpaid owner direct routes | The sidebar was recovery-only in current source, but the shared desktop layout restricted direct-route recovery only for starter-onboarding stores. A pending regular store could deep-link to Locations and reach outlet-policy and Add Outlet controls. | Applied the same paid/starter/recovery contract at the owner layout boundary for every resolved store, preserving Billing and Help Center while redirecting other direct routes to Billing. | `verify:onboarding-subscription-boundary`; ESLint; TypeScript | Hosted defect reproduced on `/locations`; source contract PASS; updated hosted build pending | CLOSED (source) |
| MLRC-017 | Medium | Locations billing summary | Subscription `amount` is stored in currency minor units, but desktop Locations passed it directly to `Intl.NumberFormat`, displaying ₹499,000 instead of ₹4,990. | Reused the established `formatCurrency` minor-unit formatter for per-store and total values. | `verify:multi-location-boundary`; ESLint; TypeScript | Hosted defect reproduced; source contract PASS; updated hosted build pending | CLOSED (source) |
| MLRC-018 | Low | Mobile website navigation | Fifteen of sixteen drawer actions met the 44px touch target; the MenuList home wordmark link measured 149×28px. | Preserved the existing visual wordmark while giving its interactive wrapper a 44px minimum height. | `verify:menulist-rc-inventory`; CSS lint/build coverage | Connected Chrome measurement reproduced 149×28px; source contract PASS | CLOSED (source) |
| MLRC-019 | Medium | Owner entitlement resolution and direct-route recovery | The shared shell redirected unpaid or expired desktop owners only after mounting the requested child route. During subscription lookup or the redirect frame, paid-page controls and child data effects could mount before recovery navigation completed. | Added a shared render gate that keeps owner workspace children unmounted while subscription access resolves and while a Billing/Starter redirect is pending. Billing, Help Center, platform/reseller routes, and MobileShell retain their separate contracts. | `verify:onboarding-subscription-boundary`; focused ESLint; TypeScript | Targeted source contract PASS; updated hosted build pending | CLOSED (source) |
| MLRC-020 | Medium | Desktop and mobile Billing History | The empty desktop state returned to visually identical content after a successful empty fetch, exposed no loading/error recovery, and both desktop/mobile handlers could issue duplicate reads on rapid repeated activation. The mobile Card also lacked keyboard button semantics. | Added explicit loading, loaded-empty, retry, and bounded failure states; added synchronous in-flight guards and store-scope reset behavior; added Enter/Space semantics and `aria-busy` to the mobile control. | `verify:billing-entitlement-boundary`; focused ESLint; TypeScript | Hosted no-feedback behavior reproduced without provider execution; desktop/mobile source contract PASS; updated hosted build pending | CLOSED (source) |
| MLRC-021 | Low | AssetOS evidence after mobile navigation fix | MLRC-018 intentionally changed watched website CSS, so three approved MenuList asset records correctly became stale even though the asset files and visual narratives were unchanged. | Reviewed the exact CSS delta, accepted the source-only touch-target change, and refreshed only the three affected fingerprints through the maintained slot-scoped workflow. | Three scoped `npm run assets:fingerprint -- --slot ...` commands; `npm run certify:asset-factory-menulist` | 28 MenuList slots; zero stale assets, errors, warnings, or approval blockers; aggregate resumed successfully | CLOSED |
| MLRC-022 | High | Payment-pending owner opens Help Center on mobile | MobileShell bypassed the subscription gate only for Billing, although the shared lifecycle contract defines both Billing and Help Center as recovery routes. At 390×844, direct `/help-center` rendered the same inert subscription card reported by the owner instead of Help. | Added the four Help Center mobile sub-screens to the existing subscription-gate recovery bypass; paid workspace surfaces remain gated. | `verify:help-center-boundary`; `verify:owner-pwa-lifecycle`; `verify:onboarding-subscription-boundary`; focused ESLint | Hosted defect reproduced in current Chrome; source and adjacent lifecycle gates PASS; updated hosted build pending | CLOSED (source) |
| MLRC-023 | Medium | Help Center data on the pending-owner QA fixture | The MenuList Help shell rendered on desktop, but its intentional Answerlattice client boundary could not admit the current fixture/workspace; ticket history failed closed and exposed a retryable error. | No cross-product fallback or MenuList Firestore read was added. A valid Answerlattice product-account fixture and hosted configuration are required to verify the supported path. | Help Center source/runtime/attachment gates PASS; current browser console recorded the bounded DAL failure | Current supported Answerlattice-backed data flow remains unavailable on this fixture | BLOCKED_EXTERNAL |
| MLRC-024 | Low | AssetOS evidence after mobile Help recovery fix | MLRC-022 intentionally changed watched `MobileShell` source, so the approved owner-phone dashboard proof correctly failed closed as stale even though its pixels and public narrative were unchanged. | Reviewed the exact gate-only source delta and the existing fictional proof asset, then refreshed only `menulist.launch.device.owner-pwa-dashboard` through the maintained slot-scoped fingerprint workflow. | `npm run assets:fingerprint -- --slot menulist.launch.device.owner-pwa-dashboard`; `npm run certify:asset-factory-menulist` | 28 MenuList slots; zero stale assets, errors, warnings, or approval blockers; aggregate resumed successfully | CLOSED |
| MLRC-025 | High | Credential sign-in with copied whitespace | Email and password were forwarded verbatim to both NextAuth and Firebase Auth, so a copied leading/trailing space produced a generic invalid-login failure even when the underlying credential was correct. | The initial candidate introduced shared identifier/password normalization and applies the same normalized values to both authentication boundaries; mobile autocorrect/capitalization/spellcheck are disabled for both fields. | `test:login-credential-normalization`; `verify:auth-onboarding-flow`; auth/security failure matrix | Deterministic normalization and controlled local invalid/recovery flow PASS; exact current hosted-candidate retest pending | CLOSED (source) |
| MLRC-026 | High | Mobile subscription gate “View Plans” action | The gate forced desktop routing while remaining inside MobileShell, so the unpaid owner could stay trapped on the subscription card instead of reaching the permitted Billing recovery surface. | The initial candidate made Billing an explicit mobile recovery bypass; the action now sets the More/Billing shell state and canonical `/billing` route without forced desktop mode. | `verify:mobile-shell-route-map`; `verify:billing-entitlement-boundary`; `verify:onboarding-subscription-boundary` | Current source contract PASS; exact current hosted-candidate mobile click-through pending | CLOSED (source) |
| MLRC-027 | High | Batch image generation API deployment | Exact hosted QA crashed during route-module loading because the external `@google-cloud/tasks` ESM path dynamically requires `build/protos/protos.json`, but the deployed serverless trace omitted that runtime descriptor. Authentication never ran, so anonymous POST returned an empty 500 and valid owners could not start a batch. | Added one route-scoped `outputFileTracingIncludes` entry for the exact 202 KB descriptor; extended both Next source compatibility and isolated deployment-bundle gates to require the file and load the traced batch route without the repository `node_modules`. | `verify:next-build-compatibility`; `verify:next-deployment-bundle`; full production build; hosted anonymous API boundary | Exact hosted `c9c08d6…` retained 401 for the batch trigger and zero 5xx across all 153 methods | CLOSED |
| MLRC-028 | High | Pending/unpaid owner opens Billing at a 390px viewport | `MobileShell` supported `/billing`, but the shared layout admitted narrow desktop-user-agent viewports only for Help/internal routes. Billing therefore rendered the desktop sidebar and left roughly half the viewport for highly wrapped content. | Added Billing to the existing narrow-viewport recovery-route boundary so both Billing and Help render through `MobileShell`; no entitlement or payment behavior changed. | `verify:mobile-shell-route-map`; `verify:billing-entitlement-boundary`; `verify:onboarding-subscription-boundary`; hosted responsive measurement | Exact hosted `4592516…` rendered native mobile Billing at 390×844, zero overflow, all visible actions ≥44px, truthful pending state, and working empty history sheet | CLOSED |
| MLRC-029 | Medium | Mobile Billing “Need billing help?” actions | Both actions pushed `/dashboard#mobile/more/answerlatticeSupport`; recovery-only entitlement correctly denied Dashboard and redirected straight back to Billing, so the controls appeared inert. | Route both actions directly to `/help-center/ticket`, the existing permitted recovery route mapped to the mobile ticket screen. | `verify:mobile-shell-route-map`; `verify:help-center-boundary`; `verify:onboarding-subscription-boundary`; hosted mobile click-through | Exact hosted `c9c08d6…` opened the mobile ticket form at the permitted route with zero overflow and no console error | CLOSED |
| MLRC-030 | Medium | Mobile bottom-sheet close controls | The shared mobile `NavBar` always exposed its leading action as `Back`, even when callers supplied an `LuX` close icon. Billing History therefore opened a real dialog with two separate controls named `Back`, leaving keyboard and assistive-technology users unable to distinguish page navigation from closing the sheet. | Derive the default accessible label from the rendered semantic icon: `LuX` uses the existing locale-aware `close` copy, while arrow/navigation controls retain `Back`; an explicit caller label still wins. The shared primitive repairs every existing X-backed mobile sheet without changing its visual layout or sheet behavior. | `verify:global-accessibility-boundary`; focused ESLint; TypeScript | Exact hosted `801f87f…` at 320×568 exposed one page `Back`, one sheet `Close`, and one dialog; `Close` removed the dialog and preserved page navigation | CLOSED |
| MLRC-031 | Low | Country selectors across create-menu, owner settings, staff, reseller, mobile, and onboarding | The shared table mapped Marshall Islands to Mauritania, Philippines to Puerto Rico, and Turks & Caicos to an invalid full-width regional-indicator sequence. The wrong visible flags propagated to every consumer of the shared table. | Corrected the three shared entries in both byte-identical app/Functions sources and extended the mirror verifier to derive the expected regional-indicator flag for every standard two-letter entry while retaining four reviewed exceptional aliases. | `verify:menulist-shared-data-mirrors`; focused ESLint; TypeScript; Functions build | Exact hosted `a768232…` at 320px exposed the correct `🇲🇭 MH +692`, `🇵🇭 PH +63`, and `🇹🇨 TC +1 649` options once each and none of the reproduced wrong mappings | CLOSED |
| MLRC-032 | Medium | Mobile pricing full-comparison feature details | Every comparison row exposed an info-icon button backed only by a hover/focus Tooltip. At 320px, tapping a feature button focused it but rendered no description, so touch users could not access the explanatory content behind any row. | Kept the desktop Tooltip and added one controlled, inline disclosure per feature with a 44px minimum trigger, `aria-expanded`, `aria-controls`, visible description text, and tap-to-close behavior. Only one row can remain expanded, keeping the long comparison calm. | `verify:global-accessibility-boundary`; focused ESLint; TypeScript | Exact hosted `b1750e0…` at 320px rendered the description once with expanded semantics after the first tap, removed it after the second tap, and preserved the pricing route/state | CLOSED |
| MLRC-033 | Medium | Direct locale-prefixed resource routes, especially Arabic | The localized route wrapper carried the correct `lang`/`dir`, so visible Arabic content rendered RTL, but the outer cookie-locale provider mounted afterward and left the document root as `en-US`/`ltr`. Screen readers therefore received the wrong predominant page language and direction. | Added a route-scoped document-locale boundary that applies the reviewed URL locale after the shared provider mounts and safely restores the previous root attributes on exit; the visual resource wrapper and locale registry remain unchanged. | `verify:website-resource-locales`; focused ESLint; TypeScript | Exact hosted `25d58ae…` passed all 16 Arabic routes at 320px with root/content RTL and no overflow; Arabic→English switch and Chrome back/forward restored correct `lang`, `dir`, heading, and URL | CLOSED |
| MLRC-034 | Low | Global `/403` and `/unauthorized` recovery | The two explanatory sentences stored `&apos;` inside JavaScript strings. React correctly treated the strings as text, so mobile Chrome visibly rendered “don&amp;apos;t” and “you&amp;apos;re” instead of apostrophes. | Replaced the encoded entity text with ordinary apostrophes and added a source regression boundary while retaining the existing shared access-denied illustration and recovery actions. | `verify:global-accessibility-boundary`; focused ESLint; TypeScript | Exact hosted `96f0c04…` at 320×568 rendered “don't” and “you're” correctly on both routes with no encoded text; both actions were discoverable | CLOSED |
| MLRC-035 | Medium | Missing or inactive public Guest Feedback recovery | The route-local “Go to homepage” link used `/` relative to the current host. On `app.menulist.digital`, that request redirects toward the protected owner dashboard, so a public customer was sent into authentication instead of MenuList’s public website. | Build the localized recovery URL from the environment-governed absolute `PLATFORM_URL`; retain the existing public language, inactive-state copy, and no-project-disclosure behavior. | `verify:guest-feedback-boundary`; `verify:public-customer-localization`; focused ESLint; TypeScript | Exact hosted `756f247…` at 320×568 emitted `https://menulist.digital/?lang=en`, preserved the inactive-state boundary, had zero overflow, and reached the public website when clicked | CLOSED |
| MLRC-036 | Medium | Global `/403` and `/unauthorized` recovery at small-mobile width | Ant Design `Result` retained intrinsic horizontal padding/content width inside the already padded page shell, producing an 8px overflow on each side at 320px. The paired recovery actions also had no wrapping boundary. | Bound the shared result to the available width, remove redundant inline padding, and allow recovery actions to wrap while retaining the same illustration, copy, and routing. | `verify:global-accessibility-boundary`; focused ESLint; TypeScript | Exact hosted `756f247…` measured 320px document width in a 320px viewport on both routes, with both actions visible and no copy regression | CLOSED |
| MLRC-037 | Medium | Global access-denied “Go Home” recovery on the owner-app host | The action pushed relative `/`. On `app.menulist.digital`, host routing converted that into protected `/dashboard`, then sent a signed-out user back to sign-in, making “Go Home” duplicate “Sign In Again” instead of providing a safe exit. | Send the home action to the environment-governed `PLATFORM_URL`; retain the separate callback-aware sign-in action. | `verify:global-accessibility-boundary`; focused ESLint; TypeScript | Exact hosted `756f247…` click reached `https://menulist.digital/`; “Sign In Again” remains a distinct canonical app-sign-in recovery | CLOSED |
| MLRC-038 | Medium | Global access-denied recovery touch targets at small-mobile width | Both visually large Ant Design recovery buttons measured 40px high in exact hosted Chrome, below the repository’s 44px mobile interaction minimum. | Apply a 44px minimum height to both actions without changing their labels, destinations, wrapping, or visual hierarchy. | `verify:global-accessibility-boundary`; focused ESLint; TypeScript | Exact hosted `756f247…` reproduced both controls at 40px; fixed hosted-build retest pending | CLOSED (source) |

## E. Firebase cost audit

The maintained scanner now reviews 534 MenuList runtime files: 9 high-listener,
2 public-read, 2 query-scope, 53 write-volume, and 468 low-risk files. The
118-check closeout, platform daily lease, and maintenance lease suites passed.
The count increase from 533/52 to 534/53 was inventory drift, not a newly
confirmed billed-operation regression. No runtime cache or query change was
introduced without measurable evidence.

Investigated without a justified runtime optimization: public projection
reads, SWR local-storage scoping, public revalidation merge behavior, owner
analytics aggregation, scheduler leases, notification writes, menu extraction
jobs, and provider webhook idempotency. Existing bounded queries, scoped cache
keys, leases, and idempotency controls were retained because adding another
cache or batch would increase stale-truth or operational risk without reducing
billed operations.

Confirmed optimization MLRC-020: one Billing History activation performs one
bounded payment-ledger query (limit 50) and one bounded billing-document query
(limit 50). Before the fix, two rapid activations could start two complete
request sets, for up to 200 returned document reads. Desktop and mobile now use
synchronous in-flight guards, so the same rapid double activation starts one
request set, for up to 100 returned document reads. Store switching resets the
scope-specific mobile guard and remounts the desktop history state, preserving
tenant/store correctness. This does not cache results across stores and does
not weaken freshness or authorization.

## F. Security and isolation results

| Boundary | Result | Evidence / residual risk |
| --- | --- | --- |
| Tenant isolation | PASS (local/emulator) | Tenant DAL, sensitive server scope, callable scope, API tenant safety, and tenant/store Rules passed |
| Store isolation | PASS (local/emulator) | Store-switch, multi-outlet, project selection, and tenant/store Rules passed |
| Role enforcement | PASS (local/emulator) | Staff scope/concurrency/route parity, owner operations, platform/reseller denial boundaries passed |
| Middleware and host routing | PASS (source/local/hosted sample) | Host routing, runtime URL, tenant headers, noindex, and exact QA app host checks passed |
| Public-data projection | PASS (deterministic) | Public client projection, OBP, public entry, fact projection, and private-boundary tests passed |
| Firestore Rules | PASS (emulator) | Generated artifact current; 42-script predeploy plus focused tenant/store suite passed |
| Storage Rules | PASS (emulator) | Path, immutable media, replacement/delete, attachment, and ownership tests passed |
| Canonica/product separation | PASS (source/routing) | MenuList product filtering and shared host/product route constants retained separation; Canonica behavior was not exercised |

## G. Cache and public-truth results

Deterministic projection, timestamp, revalidation, screen, and cache suites
passed for owner write to public menu/OBP convergence, pending invalidation
merge, SWR local-storage tenant scoping, store nested updates, temporary
status, price/availability, and public entry. Source gates also verified
precise public tags and server revalidation paths. Current-session hosted
write-through on subdomain/custom-domain/screen surfaces was not performed
because no disposable mutation fixture was authorized and physical-device
evidence is unavailable; this remains a certification blocker rather than a
passing runtime claim.

## H. Command results

| Command | Result |
| --- | --- |
| `npm run verify:menulist-rc-inventory` | PASS — 8,461 rows; 21 Function exports; 58 private MenuList pages access-evidenced; 62 sitemap-backed website page patterns render-evidenced through 186 concrete URLs; all 136 MenuList route handlers have resolved methods/access classes and anonymous runtime evidence; 97.1% of MenuList control candidates statically mapped to page routes |
| `npm run test:menulist-api-anonymous-boundary` | PASS local and hosted — exact hosted `c9c08d6…` exercised 136 handlers / 153 methods with status counts 200×5, 301×1, 400×15, 401×126, 403×1, 404×5 and zero failures/5xx. |
| `npm run security-os:audit -- --product menulist` | PASS — registry; mapped evidence executed separately |
| `npm run verify:menulist-api-tenant-safety` | PASS — API scope, sensitive server store scope, Functions callable scope, and CSP report boundary |
| `npm run verify:billing-entitlement-boundary` | PASS — Billing access, history feedback/recovery, duplicate-read guard, and adjacent Answerlattice read boundary |
| `npm run verify:menu-project-editor-boundary` | PASS — project scope/mutation/upload contracts, desktop/mobile persistence, public cache and screen invalidation |
| `npm run verify:public-business-truth` | PASS — store projection, change log, drift, extraction learning, owner details |
| `npm run verify:public-customer-delivery` | PASS — public projection and PWA delivery |
| Cache/local persistence | PASS — pending revalidation merge and tenant/store-scoped SWR local-storage provider |
| Price/status/screen propagation | PASS — price boundary, temporary-status boundary, digital-screen lifecycle, Rules, and management emulator |
| Multi-location and special menus | PASS — location scope, response boundary, special-menu runtime/overlay, and owner project selection |
| Special-menu persistence and isolation | PASS — Firestore Rules emulator plus Admin emulator lifecycle suites |
| QR/print distribution | PASS — shared desktop/mobile export controller, QR, PDF source/sanitizer, print assets, and zero artifact Storage writes |
| Feedback and reviews | PASS — public defaults, owner/public contracts, and Firestore Rules emulator denial/allow behavior |
| Storage and uploads | PASS — scoped paths, validation, immutable media reuse, replacement/cleanup, attachment/OBP references, and Storage Rules emulator |
| `npm run verify:auth-onboarding-flow` | PASS — authentication, claims/workspace, callback, owner setup, and onboarding contracts |
| `npm run test:login-credential-normalization` | PASS — leading/trailing whitespace normalization for email and password |
| `npm run verify:menu-extraction-pipeline` | PASS — extraction validation, imports, jobs, Rules, messaging onboarding, concurrency, cleanup, retry, and recovery suites |
| `npm run test:special-menu-lifecycle:rules` | PASS — Firestore Rules emulator |
| `npm run test:special-menu-lifecycle:emulator` | PASS — Functions build plus Admin emulator lifecycle |
| `npm run verify:storage-lifecycle` | PASS — scoped Coldline transition only; no owner/source deletion rule |
| `npm run verify:firebase-scale-cost-closeout` | PASS — 118 static checks plus platform and maintenance task-lease emulators |
| `npm run verify:platform-cost-posture-boundary` | PASS — aggregation and bounded client failure contracts |
| `npm run test:input-validation-boundary` | PASS |
| `npm run test:tenant-dal-boundary` | PASS |
| `npm run test:tenant-store-scoped-rules` | PASS — Firebase demo emulator only |
| `npm run verify:menulist-firebase-rules-predeploy` | PASS — generated MenuList artifact current; all 42 direct emulator suites passed; no cloud read/write/deploy |
| Mobile owner source gates | PASS — MobileShell route map, Billing/Help recovery bypass, owner PWA lifecycle, mobile locale boundary, and owner locale boundary |
| `npm run verify:help-center-boundary` | PASS — Help routing, scoped Answerlattice boundary, mobile recovery bypass, runtime contracts, and ticket attachment boundary |
| `npm run test:csp-report-boundary` | PASS — bounded CSP report admission and sensitive-data handling |
| `npm run verify:global-accessibility-boundary` | PASS |
| `node scripts/verification/verify-global-accessibility-boundary.js` | PASS — shared mobile X-backed sheets derive locale-aware `Close`; navigation controls retain `Back` |
| `node scripts/verification/verify-global-accessibility-boundary.js` (pricing disclosure) | PASS — comparison feature triggers retain Tooltip behavior and add a 44px tap/keyboard disclosure with `aria-expanded`/`aria-controls` |
| `node scripts/verification/verify-menulist-shared-data-mirrors.js` | PASS — 35 mirrors remain byte-identical and all 249 country rows satisfy the flag-consistency contract or a reviewed explicit exception |
| `npx tsc --noEmit --incremental false` | PASS — current candidate exact direct command, exit 0 |
| `npm --prefix functions run build` | PASS — shared country-data mirror compiles in the MenuList Functions bundle |
| `npm run lint` | PASS — current candidate, zero warnings |
| `npm run verify:next-build-compatibility` | PASS — route-scoped Cloud Tasks proto trace contract present |
| `npm run verify:next-deployment-bundle` | PASS — website 448, sign-in 505, auth API 389, and batch-image trigger 904 traced files; all four routes loaded from isolated traces without the repository `node_modules` |
| `npm run certify:menulist-local` | PASS WITH EXTERNAL BLOCKER — current full run passed 5 checks then correctly stopped on the one owner-PWA AssetOS fingerprint made stale by MLRC-022; after MLRC-024, `--start-at verify:asset-factory` passed 155/156 remaining checks. Combined unique result: 160/161 checks passed; 42 sibling-product scripts explicitly excluded; only `verify:upstash-readiness` was `BLOCKED_EXTERNAL`. |
| `npm run certify:asset-factory-menulist` | PASS — 28 MenuList slots; zero errors, warnings, stale assets, missing assets, disconnected files, or approval blockers after the one current slot-scoped fingerprint refresh |
| `npm run docs:check-links` | PASS — 3,053 files and 5,313 internal links scanned; zero broken links. The command reported 64 non-failing filename-policy warnings, including the task-mandated `MENULIST_RC_CERTIFICATION.md` name and pre-existing uppercase video working documents. |
| Unit/contract suites | PASS — all curated MenuList verification suites reached by the 157-script release gate; no single root `test` command exists |
| Integration/emulator suites | PASS — Rules, lifecycle, scheduler, extraction, billing, notification, storage, and DAL suites exercised deterministic demo projects |
| Browser E2E | PASS (bounded manual) — connected Chrome local/hosted auth, pricing handoff, dashboard and payment-pending Billing; no root E2E harness is registered |
| Firestore Rules tests | PASS — 42-script predeploy and focused tenant/store suite |
| Firebase Functions tests/build | PASS — `npm run verify:functions-deploy-preflight` |
| `npm run build` | PASS — corrected current-source production build after the local certification server was stopped; 450 static pages and Serwist bundle completed; existing Sass deprecation and missing optional Gemini-key warnings retained |

## I. Residual risks

- The 5,277 page-reachable MenuList control candidates still require complete
  individual runtime interaction evidence. The other 155 candidates in 45
  files are explicitly classified as non-shipped source from the App Router
  import graph; they are not represented as runtime-tested controls.
- The source fixes MLRC-009 through MLRC-012, MLRC-016 through MLRC-022, and
  MLRC-025 through MLRC-029 are present on exact hosted product build
  `c9c08d64cd75e8e2a2f485373f5b3ebf3b784232`. Current-session interaction
  evidence covers the pending-owner Billing, Help, direct-route, history, and
  support recovery subset; it does not imply every authenticated control was exercised.
- MLRC-028 and MLRC-029 are closed on exact hosted QA.
- MLRC-030 is closed on exact hosted QA commit `801f87f…` at 320×568. The
  Billing History sheet exposed one locale-aware `Close` control, retained one
  page-navigation `Back`, and closed without changing the Billing route.
- MLRC-031 is closed on exact hosted QA commit `a768232…`; the shared Functions
  mirror remains an explicit Firebase `DEPLOY_REQUIRED` delta until a separately
  authorized QA Functions deployment and authenticated readback are completed.
- MLRC-032 is closed on exact hosted QA commit `b1750e0…`; tap and keyboard
  disclosure is now available while the existing pointer Tooltip is retained.
- MLRC-033 is closed on exact hosted QA commit `25d58ae…`: all 16 Arabic
  resource routes and Arabic-to-English/back/forward transitions retained the
  correct document language, direction, heading, URL, and mobile width.
- The repository has no root `test:e2e` or `e2e` script. Controlled browser
  evidence and existing deterministic verifiers will be recorded separately.
- Hosted QA exposed the exact verified tested product commit
  `c9c08d64cd75e8e2a2f485373f5b3ebf3b784232`. A signed-in
  pending-payment owner fixture was available on the older build, but its
  current-candidate interaction pass is pending; a no-subscription true-handheld fixture,
  active disposable public tenant, destructive disposable tenant/store fixtures, physical mobile/PWA,
  television-screen behavior, and hosted write-through propagation remain
  unverified in this session.
- The current pending-owner QA fixture does not provide a valid admitted
  Answerlattice support workspace. MenuList Help Center shell/recovery routing
  was testable, but ticket history and the remaining Answerlattice-backed
  content/data path remain externally blocked; no MenuList fallback was added.
- Upstash target URL/token values are not present in this shell, so target
  normal/exhausted/outage limiter behavior remains externally blocked.
- The build emits existing Ant Design v5/React 19 compatibility and Sass
  `@import` deprecation warnings. They do not fail the pinned build but remain
  migration debt under the dependency-freeze contract.
- Live Razorpay execution remains explicitly excluded.
- No Firebase server-parity conclusion is carried forward without current
  authenticated readback.

## J. Final release decision

`CERTIFICATION BLOCKED`

This is the current decision while certification remains active. Mandatory
runtime and external-evidence gates remain open, so the exact current candidate
is not approved for production deployment. Source and certification work may
continue on `staging`; that does not convert the blocked decision into
production approval.

Required final wording if every non-provider completion gate eventually passes:

> MenuList certified excluding live Razorpay provider execution.
