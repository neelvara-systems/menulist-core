# MenuList Release-Candidate Certification

**Status:** CERTIFICATION BLOCKED

**Candidate branch:** `staging`

**Initial candidate commit:** `b857a164944012d42131917e7c62215c94022c0f`

**Current tested MenuList product commit:** `2362f794eb61c908228c0f4956cd03b19d5eb3bd`

**MenuList product snapshot commit:** `3a34a975d52b1a3b8bec4be35c40b4930b1f9441`

**Candidate filesystem state:** direct Git, server-ref, and hosted `/api/version`
readback proved exact MenuList product commit `2362f794eb61c908228c0f4956cd03b19d5eb3bd`
on QA. The hosted MLRC-045 interaction remains attributable to its included
runtime commit `32440eca8e171212fb77983218d3a071e0db5981`; shared Admin Timestamp
corrections from `320bd3b0b59ea83f89dbfe460bbc14262743f4b2` and the batch-worker
admission correction from `090ea3a1673021f1fec1209a2d835c4c5911f840`, and
Help Centre keyboard correction from
`4d448af6b38a4426b6967a643d4948d00dd6150a`, and intentional-sign-out
correction from `79684c60912d468d8888009b1e5f4c24823d8e6b`, complete
tenant/store onboarding shape from `2d4d370c4baf0dd04a2d34be63dc3f5f10672c00`,
truthful MenuList QA lease presentation from that same commit, the
MLRC-052 scope-settlement correction from `8688fbb20d486f98fef56fda3c154ce0ffa44a5e`,
and persistent desktop menu-link import recovery from
`c15d0a1fab052d7c126565cac01cc10cbbeef40e`, truthful empty-publication
rendering from `0f9df0070d7d59049d149345fd6408cb5f54aaad`, and truthful unpublished
sharing readiness from `cde47080011be4ec82c27709a8929e2f86efe375`,
context-bound Business Settings completion feedback from
`370645e6d26a1fb90e747c03799500b779d47b33`, and corrected one-time desktop
staff credential delivery from `afa6ec90608522f5e7653839a490a3cae5d988b2`
and the Today guide/custom-status recovery corrections from
`ac7757d24b8328227913e33bad91db419c42d819` and
`2362f794eb61c908228c0f4956cd03b19d5eb3bd`
are included. `main`
remains untouched.

**Certification date:** August 26, 2026

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
  lifecycle states derived from current runtime guards. A disposable hosted
  QA owner is now active at tenant `4`, store `4`, with a labelled 72-hour
  zero-value non-payment entitlement. Its password is retained only in a
  mode-`0600` local temporary credential file and is excluded from this report.

## B. Inventory summary

The current generator discovered 8,503 source candidates across the shared
repository. These are discovery candidates, not passing test claims.

| Inventory class | Discovered | Current status |
| --- | ---: | --- |
| Pages | 308 | Product classification and runtime reachability in progress |
| Route handlers | 293 | Product classification, methods, and boundary tests in progress |
| Layouts | 19 | Source and host behavior in progress |
| Loading/error/not-found surfaces | 9 | Runtime coverage in progress |
| User-control candidates | 7,520 | 5,291 MenuList controls page-mapped; 155 MenuList controls explicitly classified as non-shipped source |
| Feature flags | 333 | Product ownership and material alternate states in progress |
| Firebase Function exports | 21 | Source/export inventory complete; runtime evidence is tracked separately |

Current product classification yielded 5,957 MenuList candidates and 2,544
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

Of 5,446 MenuList-classified control candidates, 5,291 map through the static
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
| Baseline identity | Worktree, branch, HEAD, and filesystem ownership | PASS (Git identity) | Direct readback on August 25 proved local/server `staging` at exact descendant `45cae8cceaf2d016ec50efe46b0c54bb9a163a86` with `0/0` divergence. `main` remains unchanged at `fe625d5bbf527c1b7e537b00ab32a4f655905c35`. |
| SecurityOS registry | MenuList surface/evidence registry integrity | PASS | Registry, tenant/store DAL, Rules, Storage, CSP, input/file/network, webhook, and API-scope evidence executed; the current selective planner was reviewed and `test:csp-report-boundary` reran successfully |
| Route/control inventory | App Router, controls, flags, Functions | PASS (discovery, private-route classification/access, API classification, and static reachability) | `npm run verify:menulist-rc-inventory`; 8,503 unique rows; all 58 MenuList private pages explicitly classified and signed-out access-tested; all 136 MenuList route handlers have resolved methods/access classes; 5,291/5,446 MenuList control candidates map to page routes and 155 are explicitly classified as non-shipped source |
| Private-route authentication | All 58 MenuList `(main)` page routes, including concrete catch-all and canonical aliases | PASS (signed-out access only) | Connected Chrome on current local source: 58/58 reached callback-aware sign-in; no private screen rendered. Authenticated functional state remains separately pending. |
| Route-handler anonymous boundary | All 136 MenuList handlers and 153 exported HTTP methods | PASS local and exact hosted candidate | Exact hosted product commit `6cae3112ef01c9155f3d472e1656415accb63b38` returned 200×5, 301×1, 400×15, 401×126, 403×1, and 404×5 with zero timeout/5xx. The authenticated internal batch worker rejects a request without its worker credentials with 403 before any Firebase read. Live Razorpay execution remains excluded. |
| Local aggregate | MenuList-filtered repository production-readiness gate | PASS WITH EXTERNAL BLOCKER | A fresh `npm run certify:menulist-local` pass on the current candidate completed 161/162 checks. All 161 executable checks passed, including all 42 Firestore Rules predeploy suites, strict TypeScript, lint, documentation links, MobileShell regression coverage, cache/public-truth boundaries, Functions build/preflight, and AssetOS. The menu-extraction gate recovered on its built-in second attempt after a transient emulator-port collision. The sole non-pass is the unavailable Upstash target credential gate. |
| Authentication regression | Leading/trailing email and password; invalid login recovery; forgot-password validation; callback preservation | PASS (signed-out boundary) | Deterministic credential-normalization tests plus exact hosted Chrome: malformed identifier/passcode stayed on sign-in with inline validation, Forgot preserved `/dashboard`, invalid reset email produced an announced error, and Return restored the sign-in callback. No reset email, account creation, or real credential was submitted. |
| Authentication and onboarding aggregate | Sign-up/sign-in boundaries, claims/workspace association, plan handoff, owner setup, extraction entry, retry, recovery, concurrency, and cleanup | PASS (local/emulator) | `npm run verify:auth-onboarding-flow`, `npm run test:login-credential-normalization`, and `npm run verify:menu-extraction-pipeline` completed with exit 0; expected denial/failure logs were fixture assertions rather than escaped failures |
| Pricing handoff | Official, Pro, and Multi-location across INR/USD and monthly/yearly selection; content-pack sign-in; comparison and FAQ controls | PASS (provider boundary only) | Exact hosted Chrome exercised all 12 signed-out plan/currency/interval combinations. Each produced the expected callback-aware sign-in handoff with plan, currency, interval, B2C type, and quantity one or the Multi-location minimum of two. Content-pack sign-in, comparison expansion, all three FAQ categories, and an accordion in each category worked with zero overflow. No Razorpay provider execution occurred. |
| Hosted QA | Exact candidate on QA owner app and tenant subdomain | PASS (deployment identity, fresh entitled owner, Billing, direct-route entitlement bootstrap, menu-link recovery, owner/public status and business-truth propagation, feedback, locations, sharing, assets, dashboard, Business Health, Help shortcuts, staff lifecycle, restricted staff access, Today recovery, and screen recovery) / IN PROGRESS (successful menu upload/item mutation and publish propagation) | `/api/version` returned exact verified MenuList build `2362f794eb61c908228c0f4956cd03b19d5eb3bd` (`menulist-core-qzwx1xtv4-neelvara-systems.vercel.app`). The isolated 72-hour provider-free fixture passed Firebase Web Auth, exact owner claims, full tenant/store reads, the production active-subscription query, and shared entitlement predicate. Whitespace-tolerant sign-in, truthful QA Billing, first-use project creation, hard-load Dashboard/Projects access, and persistent menu-link failure recovery passed. Publishing and clearing `Closed today` converged on the owner and tenant Official Business Page across warm and cache-busted reads. A reversible short-descriptor edit persisted, appeared on the Official Business Page, rendered `Business settings saved`, then was removed from both owner and public truth. Public feedback required a rating, accepted one private note, appeared in the owner inbox, resolved once, and filtered correctly. The one-location view retained Main Store, blocked an unpaid second outlet, and persisted/reverted its location policy. Business, menu, Today, and screen copy/open controls produced the correct tenant-scoped URLs; both Today QR targets rendered; asset previews rendered truthful empty-menu output; Billing and Transactions rendered truthful provider-free/empty states. Dashboard view/range controls and every primary action settled to their intended screen. Business Health ran and saved the first isolated report, downloaded its English text artifact, refreshed both current-state boundaries, and all ten unique recovery links opened their exact scoped destinations. Help search opened and closed, all six shortcuts, both View All controls, and ticket recovery worked; its Answerlattice-backed content remained safely unavailable. The active empty screen and invalid-token recovery were truthful. Two isolated no-email staff fixtures proved create/reset one-time credential delivery; all copy controls matched without logging a credential; one staff session signed in, was denied Users, Projects, and Billing owner controls, and the owner force-signed-out then removed both fixture users. Exact `0f9df00…` removed false empty-menu publication status, exact `cde4708…` replaced the false live-sharing claim, exact `370645e…` restored Business Settings completion feedback, exact `afa6ec9…` restored one-time desktop staff credential delivery, exact `ac7757d…` added visible Today/Past activity guide dismissal, and exact `2362f79…` rejects an empty custom customer notice before confirmation. The owner fixture remains in use for upload/item/publish coverage. Live Razorpay checkout was not started. |
| Hosted transport | Website/app/tenant HTTP, metadata, noindex, PWA assets, missing routes | PASS (bounded) | Website, pricing, features, resources, legal, sign-in, owner manifest, offline, service workers, and tenant menu matched QA policy; disabled sitemap/customer manifest returned honest 404; missing menu slug rendered noindex recovery |
| Public website browser inventory | All 186 sitemap URLs, including 22 public tool routes and 62 App Router page patterns | PASS (render/recovery) | Connected Chrome reran the current sitemap manifest (`30afee75c57db88ee93dec78926ed0b389a1ff7ddde99fb2510946d897e24fe8`) and rendered a main region and route-specific heading without application/404 failure across all 186 unique URLs; individual transmitting controls remain separately pending; the 22 tools exposed 410 rendered controls |
| Current hosted mobile website routes | Static marketing, feature, industry, legal, trust, tools, English resources, and all 112 locale-prefixed resource variants | PASS (render/responsive/accessibility attributes) | Exact `b1750e0…` QA at 320×568 rendered every static website route and every reviewed localized resource variant with a non-empty heading, no application/not-found state, and no horizontal overflow. Exact `25d58ae…` then passed all 16 Arabic hub/article routes with root `lang=ar-SA`, root/content `dir=rtl`, and zero overflow; Arabic→English switch plus Chrome back/forward restored the correct route, heading, language, and direction each time. |
| Global signed-out recovery routes | `/403`, `/404`, `/unauthorized`, `/offline`, invalid `/invite`, `/product`, disabled `/creative-editor-smoke`, protected `/test-sentry`, invalid `/msg-preview/[sessionId]` | PASS (behavior, copy, width, destination, 44px targets, and first-viewport recovery) | Exact hosted `194f39a…` at 320×568 rendered the reviewed responsive contextual artwork on `/403`, `/unauthorized`, and invalid `/screen/[token]`; document width stayed 320px, document height stayed 568px, and both 44px recovery actions were fully visible. Invalid-screen Back/Home and access-denied destinations remained correct. |
| Digital screen invalid-token recovery | `/screen/[token]` with deterministic invalid token; generic Back/Home recovery | PASS (truthful invalid recovery and active empty fixture) / IN PROGRESS (populated and expired screen states) | Exact hosted `f050856…` at 320×568 rendered the noindex generic not-found boundary with zero overflow and no screen/store disclosure. Both actions measured 44px and were visible in the first viewport; Go Back restored the previous pricing route and Go Home reached `https://menulist.digital/`. The isolated entitled fixture also rendered its active empty-screen state truthfully. Populated and expired screen fixtures remain unverified. |
| Public Truth Tools | All 22 tool routes plus the tools index and report reader; primary generation/check, empty/result, copy, public-link, reset, follow-up validation, and mobile width | PASS (non-transmitting browser coverage) | Connected Chrome at 320×568 rendered every route without application failure or overflow. All 18 remaining generator/check tools produced an honest empty-input report; every available Reset restored the initial state; every generated report copied and created a public report link; all 12 inline follow-up forms refused blank submission with “Enter your name.” Public Truth Check, QR Poster Maker, QR Link Health Check, valid/malformed report links, and shared source contracts were exercised separately. No valid follow-up form was transmitted. |
| Create-menu entry | Signed-out phone/Google gate; signed-in upload/link tabs; empty and malformed link recovery | PASS (non-mutating) | Phone action remained disabled for incomplete input and enabled for a structurally valid number; empty owned-link submission showed a recoverable message and restored the form; no hosted upload/import was submitted without a proven disposable fixture |
| Tenant customer route | Historical recovery plus isolated active tenant owner/public truth | PASS (recovery and Official Business Page propagation) / IN PROGRESS (populated menu lifecycle) | Two historical tenant hosts render the calm noindex “Menu not found” recovery at 375 px with no console error or horizontal overflow. The isolated active tenant proved immediate temporary-status and descriptor propagation, reversible clearing, tenant-scoped share URLs, and truthful empty-menu rendering. Successful item creation/edit/publish and populated-menu cache propagation remain unverified. |
| Pending owner direct-route gate | Billing recovery versus direct `/locations` access | PASS source and hosted | Exact hosted pending owner direct-linked to `/locations` and reached Billing before any location controls rendered, on desktop and at 390px. |
| Pending owner mobile navigation | Today, Menu, Menu help, Share, More, and Billing recovery transitions | PASS | Exact hosted `b76862d…` at 320×568 exercised all five bottom-navigation choices from the stable Billing screen. Today, Menu, Menu help, Share, and More each resolved to the same selected-plan Billing gate without rendering gated product controls; Billing returned to the existing `Payment pending` record. No checkout or provider action was triggered. |
| Owner mobile source boundary | MobileShell route map, Billing and Help recovery, PWA lifecycle, locale coverage | PASS source and hosted responsive browser / PARTIAL true device | Exact hosted QA at 390×844 rendered `/help-center` and `/billing` inside MobileShell with the recovery bypass intact; Help/PWA/subscription gates pass. User-supplied physical iPhone Safari evidence confirms sign-in and the pending-subscription gate, but does not establish an entitled owner workflow or public-menu journey. |
| Mobile Billing recovery | Direct `/billing`, pending-owner summary, history, support handoff, touch targets, overflow | PASS | Exact hosted `c9c08d6…` rendered native `MobileBillingScreen` at 390×844 with zero horizontal overflow and all visible actions at least 44px. Billing History opened a truthful empty sheet. “Need billing help?” opened `/help-center/ticket#mobile/more/answerlatticeSupport`; the ticket form had zero overflow and a 44px Send Request target. No ticket or payment was submitted. |
| Contact form | Render, blank submission, validation announcement, valid QA submission, success recovery, and hosted request evidence | PASS | Connected Chrome announced name, email, message-length, and policy-consent errors, then submitted one clearly labelled synthetic QA enquiry. The accessible success state reported `Message received` and exposed `Send another message`. Vercel request logs independently recorded `POST /api/public/contact` on `menulist.digital` with HTTP 200 at 2026-08-25T14:43:51.428Z. No contact value was exposed in logs or this report. Owner-inbox readback remains role-blocked. |
| Pending-owner support recovery | Billing support handoff and empty ticket validation | PASS (non-transmitting) | Connected Chrome moved from Billing to `/help-center/ticket`; blank Send Request stayed on-page and exposed subject/details errors; no ticket or file was transmitted |
| Physical devices | Owner PWA, public menu, screen/TV where applicable | PARTIAL / BLOCKED | User-supplied iPhone Safari screenshots prove physical-device sign-in and pending-subscription rendering. They contained an unsanitized test credential and are therefore not retained as report evidence. Entitled owner-shell, public-menu, installed-PWA, and screen/TV physical-device journeys remain blocked. |

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
| MLRC-038 | Medium | Global access-denied recovery touch targets at small-mobile width | Both visually large Ant Design recovery buttons measured 40px high in exact hosted Chrome, below the repository’s 44px mobile interaction minimum. | Apply a 44px minimum height to both actions without changing their labels, destinations, wrapping, or visual hierarchy. | `verify:global-accessibility-boundary`; focused ESLint; TypeScript | Exact hosted `2b149b0…` measured both controls at 44px on `/403` and `/unauthorized` with zero horizontal overflow | CLOSED |
| MLRC-039 | Medium | Generic not-found “Go Home” from app-hosted public routes, including invalid `/screen/[token]` | The shared action pushed relative `/`. On `app.menulist.digital`, host routing converted it to protected `/dashboard`, so a public screen viewer was routed into owner authentication instead of the MenuList public website. | Send the home action to environment-governed `PLATFORM_URL`; keep history-based Go Back as the first recovery option. | `verify:global-accessibility-boundary`; focused ESLint; TypeScript | Exact hosted `f050856…` invalid-screen click reached `https://menulist.digital/`; Go Back restored the prior pricing URL | CLOSED |
| MLRC-040 | Medium | Generic not-found Back/Home actions at small-mobile width | Both shared recovery buttons measured 40px high at 320×568, below the repository’s 44px mobile interaction minimum. | Apply a 44px minimum height to both existing actions without changing their labels, order, or behavior. | `verify:global-accessibility-boundary`; focused ESLint; TypeScript | Exact hosted `f050856…` measured both at 44px, visible together in the first 320×568 viewport | CLOSED |
| MLRC-041 | Medium | Access-denied and generic not-found recovery action visibility at 320×568 | Ant Design's pinned `Result` implementation unconditionally rendered its fixed 251×294 exception SVG for `403`/`404` statuses and discarded the supplied contextual `icon`. Result padding and the outer viewport shell compounded that fixed artwork, leaving recovery controls clipped or below the first viewport. | Use a non-exception presentation status so the reviewed responsive contextual artwork renders; remove redundant Result padding; compact the wrapped action gap; and include safe padding inside border-box `100dvh` while retaining 44px controls and recovery semantics. | `verify:global-accessibility-boundary`; pinned Ant Result source inspection; focused ESLint; TypeScript | Exact hosted `194f39a…` kept `/403`, `/unauthorized`, and invalid `/screen/[token]` within 320×568 and exposed both 44px actions in the initial viewport | CLOSED |
| MLRC-042 | Medium | Protected owner-route bootstrap cost and recovery when Firebase Auth is rate-limited or unavailable | A deliberate hard-route stress pass exhausted the protected `/api/auth/set-claims` ceiling at 30 requests per 15 minutes. The API correctly returned 429 with `Retry-After`, but `SessionProvider` replaced the owner app with a perpetual branded loader labelled “Unable to load store access,” with no recovery. The 200-response cadence also proved each hard reload inspected `currentUser` before Firebase restored the persisted actor, needlessly repeating one user-profile query, one canonical-store read, Firebase Admin work, and one server invocation. | Await Firebase Auth's persisted-state settlement before inspecting the current actor, so a matching restored tenant/store token skips set-claims entirely. Keep fresh OAuth, store-switch, claim-mismatch, tenant, and rate-limit boundaries unchanged. Replace only the failed-loader state with explicit Retry and safe NextAuth Sign out actions; both are labelled and meet the 44px mobile target. | `verify:auth-security-failure-matrix`; `verify:menulist-api-tenant-safety`; `verify:global-accessibility-boundary`; `verify:contextual-state-illustrations`; focused ESLint; strict TypeScript; exact build identity and Vercel request/status evidence | Exact hosted `04a736f…` retained Billing across three hard reloads and a direct protected `/users` recovery with zero post-build set-claims calls. Exact hosted `6cae311…` later encountered a bounded Firebase Auth `network-request-failed`, settled to the labelled `Store access could not be loaded` recovery screen with `Try again` and `Sign out` actions, and `Try again` restored the complete Help Centre/MobileShell without session loss. | CLOSED |
| MLRC-043 | Medium | Pending/unpaid owner account exit from the MobileShell subscription gate | Returning from Billing to the entitlement gate replaced the complete mobile shell with only “View Plans.” The normal account screen and its logout control were unreachable, so an owner could not safely change accounts from the product UI on the gate that all unpaid owner routes share. | Keep the narrow Billing/Help entitlement bypass unchanged and add a localized 50px Sign Out action directly to the gate. It reuses `signOutSession()` so Firebase, NextAuth, and authenticated browser state follow the canonical cleanup path; an inline reversible confirmation, in-flight disabling, an announced generic retry error, and canonical sign-in replacement prevent accidental, ambiguous, or trapped exits. | `verify:mobile-shell-route-map`; focused ESLint; strict TypeScript; regenerated RC inventory | Exact hosted `16a4bc2…` at 320×568 rendered zero overflow, a 50px initial action, 50px Cancel/Sign Out confirmation controls, successful Cancel recovery, canonical session cleanup, direct `/signin` without false-expiry recovery, approved Google reauthentication, and return to the same tenant/store Billing state. | CLOSED |
| MLRC-044 | Low | Release evidence after the MobileShell subscription-gate account-exit fix | The approved owner-phone dashboard asset intentionally watches `MobileShell.tsx`; MLRC-043 therefore invalidated its source fingerprint even though the proof image depicts the normal fictional owner dashboard and does not show or claim subscription-gate behavior. | Compared the exact MobileShell delta with the approved 9:16 proof, visually rechecked the fictional data/private-field/product-boundary contract, and refreshed only `menulist.launch.device.owner-pwa-dashboard` through the maintained slot-scoped fingerprint command. No public pixels or runtime behavior changed. | `npm run assets:fingerprint -- --slot menulist.launch.device.owner-pwa-dashboard`; `npm run certify:asset-factory-menulist`; resumed `npm run certify:menulist-local -- --start-at verify:asset-factory` | AssetOS reports 28 MenuList slots, zero stale assets/errors/warnings/approval blockers; the resumed aggregate completed 155/156 with only the pre-existing external Upstash credential blocker. | CLOSED |
| MLRC-045 | Medium | Pending-subscription owner gate after pricing and business-details handoff | The gate treated an authoritative `pending` subscription as if no plan had been selected, displaying “Subscribe to Get Started,” “Choose a plan,” and “View Plans.” That sent an owner who had already selected Starter back into pricing and could create a circular or duplicate checkout attempt. | Preserve the entitlement block but render the selected plan and canonical Billing destination when `activeSubscription.status === 'pending'`. Reuse existing owner-localized Billing and Mobile More strings, keep true no-subscription/Starter behavior unchanged, and retain the existing provider-free Billing route. | `verify:mobile-shell-route-map`; `verify:owner-dashboard-locales`; `verify:billing-entitlement-boundary`; `verify:onboarding-subscription-boundary`; full `certify:menulist-local`; strict TypeScript; lint; production build | Exact hosted `32440ec…` at 320×568 rendered `Starter Plan (Yearly) — Billing`, “Manage your plan and billing history,” a 44px Billing action, a 50px Sign Out action, and zero horizontal overflow. Billing returned to the same ₹4,990/year `Payment pending` record. Continue Checkout was present but not pressed. | CLOSED |
| MLRC-046 | High | Server-side subscription, cancellation, verification, webhook, and reseller timestamp writes | Nine server routes constructed Web-SDK `firebase/firestore` timestamps and passed them into Firebase Admin writes. A deterministic emulator reproduction rejected that cross-SDK value at the local post-provider persistence boundary, so a provider-success path could still fail before MenuList stored the authoritative subscription transition. | Use `firebase-admin/firestore` timestamps in every affected server route and admit Web/Admin timestamp shapes only at the shared client/server serialization types. Add a lifecycle source regression that rejects client Timestamp imports in those server routes. Provider behavior and live checkout remain unchanged. | `verify:razorpay-subscription-lifecycle`; Firestore emulator lifecycle; focused ESLint; strict TypeScript; exact hosted anonymous route-module boundary | Source, pure lifecycle, and emulator lifecycle suites pass on staging commit `320bd3b…`; focused ESLint, strict TypeScript, production build, and exact hosted `6c9e6ec…` 136-handler/153-method route-module boundary pass. A provider-free hosted success-path fixture is still unavailable, so the actual Admin write remains unverified on QA. | OPEN — HOSTED WRITE RETEST |
| MLRC-047 | Medium | Anonymous/internal batch-image worker admission and Firebase cost | The route checked SAFE_MODE before authenticating the Cloud Tasks project header and shared secret. Each malformed external request therefore attempted an `ops_config/system` Firestore read before it could return `403`; two local certification probes reached the full 30-second client deadline while that unnecessary read failed. | Move project/secret admission ahead of SAFE_MODE. Keep the admitted path unchanged: SAFE_MODE still precedes body parsing, rate limiting, job reads, provider work, Storage, accounting, and mutations. Extend both worker-admission source-order verifiers and the feature cost/implementation docs. | `verify-system-strengthening-boundary`; `verify-menulist-api-tenant-safety`; full 136-handler/153-method anonymous boundary; focused ESLint; strict TypeScript | Direct invalid-worker POST returns `403` in 0.029 seconds locally and 0.649 seconds on exact hosted `6cae311…`, with admission occurring before Firebase work. The complete local and hosted anonymous boundaries pass with no timeout or failure. | CLOSED |
| MLRC-048 | Medium | Help Centre primary navigation accessibility | All six Help Centre navigation cards were clickable Ant `Card` elements rendered as nested `div`s without a role, tab stop, pressed state, or key handler. Pointer/touch users could switch sections, but keyboard and assistive-technology users could not discover or activate the same controls. | Preserve the existing card layout and click handler while adding button semantics, focus admission, current pressed state, and Enter/Space activation with Space-scroll prevention. Apply the shared correction to desktop and the MobileShell Help surface. | `verify:help-center-boundary`; focused ESLint; strict TypeScript; exact hosted keyboard retest | Exact hosted `6cae311…` reproduced zero button/tab semantics. Exact hosted `4d448af…` exposed all six cards as named buttons with `aria-pressed="false"` initially. Enter opened Knowledge Base, Share Feedback, and Contact Us; Space opened Submit a Ticket, Read FAQ, and What's New. Every action reached the intended Help route without an application error or data mutation. | CLOSED |
| MLRC-049 | Medium | Intentional owner Sign Out on the MobileShell subscription gate | Confirming Sign Out correctly ended Firebase and NextAuth state, but the shared expiry monitor observed the intermediate unauthenticated frame before the caller's route replacement and rendered a false “Session Expired” dialog. Two exact-hosted reproductions showed the dialog about 1.2 seconds after deliberate logout. | Register a one-time normalized same-origin callback before intentional teardown. Consume it in the session monitor to redirect without the expiry modal; clear it on failed NextAuth teardown or renewed authentication. Keep server-detected access-ended logout opted out so real security recovery remains visible. | `verify:auth-security-failure-matrix`; `verify:account-tenant-lifecycle`; `verify:mobile-shell-route-map`; `verify:auth-onboarding-flow`; focused ESLint; strict TypeScript; exact hosted timed logout retest | Exact hosted parent reproduced the false-expiry dialog twice. Exact hosted `79684c6…` showed no expiry dialog at 120, 350, 700, or 1,200ms after deliberate logout and then reached canonical `/signin`. Source regressions preserve true session-expiry and server access-ended recovery. | CLOSED |
| MLRC-050 | High | Newly created owner tenant/store bootstrap, including reseller onboarding | The centralized onboarding transaction omitted `deleted` from both documents, omitted `storeKey` from the tenant store-list entry, and omitted required store currency, phone, logo, location, and contact defaults. Firebase Auth and Rules admitted the owner, but the owner DAL rejected the persisted store shape and left `/dashboard` on the branded loader. All normal callers of the shared creator were exposed, including website and reseller onboarding. | Initialize the complete owner-DAL minimum shape in the centralized tenant/store creator while preserving caller overrides, existing ID allocation, subdomain reservation, summaries, and product-specific extras. Repair only the exact labelled disposable fixture through its marker-guarded harness. | `test:stores-summary:rules`; `verify:auth-onboarding-flow`; hosted fixture Admin verify; hosted Firebase Web SDK claims/tenant/store/subscription reads; focused ESLint; strict TypeScript | A second fresh fixture created by exact hosted source `2d4d370…` required no repair. Firebase Web Auth returned the exact OWNER/tenant/store claims, the complete tenant/store shape passed, the production active-subscription query returned exactly one valid lease, Projects created its default project, and Dashboard rendered entitled controls. | CLOSED |
| MLRC-051 | Low | Billing presentation for the MenuList QA certification lease | The existing hosted build recognized only the Answerlattice QA discriminator, so the MenuList zero-value fixture was falsely described as an offline reseller payment. | Extend the existing tightly scoped non-payment discriminator to the exact `ML` + `menulist-qa` pair across desktop, website, and mobile billing surfaces; retain the Answerlattice product/project pair and fail closed for every other manual subscription. | `verify:menulist-hosted-qa-certification-fixture`; `verify:billing-entitlement-boundary`; `verify:mobile-shell-route-map`; focused ESLint; strict TypeScript | Exact hosted `2d4d370…` rendered the MenuList QA certification title, zero-value lease cadence, `No payment — QA only`, the explicit synthetic/no-payment explanation, and 75/75 credits. | CLOSED |
| MLRC-052 | High | Fresh or hard-loaded entitled owner routes | The route gates relied on a mutable loading boolean without proving that the settled subscription belonged to the currently rendered tenant/store. Dashboard and Projects could therefore misclassify a valid paid/QA-entitled owner as unpaid and redirect to Billing during bootstrap; client navigation worked after Billing had allowed the query to settle. | Require the current tenant/store subscription scope to settle before rendering owner children. Keep the existing request-scope and stale-response guards, and present retry/sign-out recovery when the entitlement read fails instead of treating an infrastructure error as unpaid. Preserve Answerlattice separation. | `test-session-store-context-boundary`; `verify:auth-onboarding-flow`; exact QA Firebase Web client; focused ESLint; strict TypeScript; production build; exact hosted direct-route retest | Exact hosted `1d952f0…` proved the loading-flag-only attempt insufficient. Exact hosted `8688fbb…` then retained both `/dashboard` and `/projects` across independent ten-second direct hard-load checks, rendered the entitled dashboard and first-use Projects controls, and never rendered or redirected to Billing. | CLOSED |
| MLRC-053 | Medium | Desktop Projects menu-link import failure recovery | The protected import route correctly rejected an owned non-menu page and the form returned to an enabled state, but the static Ant message did not render visible or accessible failure copy. The owner saw an apparently inert Import link button despite two bounded browser diagnostics. Mobile already used a persistent recovery state. | Preserve the existing fixed owner-safe copy and diagnostic boundary, store the failure in desktop component state, render it persistently with `role="alert"`, and clear it only when the owner edits the URL/permission or starts a retry. | `verify-menu-extraction-pipeline.js`; focused ESLint; strict TypeScript; full local aggregate; exact hosted browser retest | Exact hosted defect reproduced three times on the disposable fixture; source verifier 386/386 PASS, focused ESLint PASS, 161/162 local aggregate PASS with only Upstash external, and production build PASS. Exact hosted `c15d0a1…` retained the fixed copy as an alert after failure, re-enabled the form, and cleared the stale error when the URL changed. | CLOSED |
| MLRC-054 | Medium | Disposable hosted-QA fixture cleanup isolation | The cleanup guard queried the legacy root `projects` collection by `tenantId`, while current MenuList projects live under `projects/{tenantId}/{storeId}`. A marked fixture with canonical hosted project data could therefore pass the empty guard and delete its root tenant/store/user while leaving orphaned test data. | Resolve the exact marker-validated tenant/store project collection and refuse cleanup when any canonical project exists. Retain the exact `menulist-qa`, fixture-prefix, marker, subscription, and no-production guards. | `verify:menulist-hosted-qa-certification-fixture`; focused ESLint; strict TypeScript; targeted hosted cleanup refusal | Source boundary, focused ESLint, and strict TypeScript passed. The cleanup command against only `ml-hosted-qa-certification-144110a18d` exited 1 with `Fixture has hosted test data` after finding its canonical project; no root or child fixture data was deleted. | CLOSED |
| MLRC-055 | Medium | Empty public menu publication truth | The fresh canonical project rendered `No items yet` while its bottom status simultaneously said `Published · updated 0 days ago`. `MenuHeader` used generic `modifiedOn`, so first-use creation or draft edits were presented as publication evidence even when `lastPublishedAt` was absent. | Admit the public `Live` / `Published` indicator only from `project.lastPublishedAt`; keep the truthful empty state and all genuinely published freshness behavior unchanged. | `verify:public-business-truth`; focused ESLint; strict TypeScript; production build; exact hosted empty-menu retest | Source regression, focused ESLint, strict TypeScript, and production build passed. Exact hosted `0f9df0070d7d59049d149345fd6408cb5f54aaad` rendered `No items yet` without `Published` or `updated 0 days ago`. | CLOSED |
| MLRC-056 | Medium | Empty owner menu sharing readiness | `/qr-code` / Use MenuList rendered the unconditional success statement `Your menu is live and ready to share` for the fresh empty project, while its presence card correctly said `Publish your menu first`. The contradictory header could cause an owner to distribute an empty customer menu. | Derive the header from the existing `hasPublishedMenuProject()` result: retain the live success copy only for published truth and show a direct publish-before-sharing instruction otherwise. | `verify:public-business-truth`; focused ESLint; strict TypeScript; production build; exact hosted owner retest | Source regression, focused ESLint, strict TypeScript, and production build passed. Exact hosted `cde47080011be4ec82c27709a8929e2f86efe375` rendered `Publish your menu before sharing it with customers` and did not render the false live-sharing claim. | CLOSED |
| MLRC-057 | Medium | Desktop Business Settings save completion | An acknowledged short-descriptor write persisted and propagated immediately to the Official Business Page, but desktop Business Settings showed no visible success confirmation. The owner could not distinguish a completed write from an inert Save Changes action without refreshing or opening the public page. | Use a mounted Ant message context and announce `Business settings saved` only after the existing store/create path completes while the initiating tenant/store scope remains active. Preserve validation returns, rejected-write behavior, DAL authority, cache invalidation, mobile feedback, and operation count. | `verify:public-business-truth`; focused ESLint; strict TypeScript; exact hosted owner/public retest | Exact `cde4708…` reproduced the missing acknowledgement and exact `fbaf108…` proved the static-message attempt insufficient. Exact `370645e…` rendered `Business settings saved` for both a reversible write and clear; persisted owner state and tenant public truth agreed after each operation. | CLOSED |
| MLRC-058 | High | Desktop no-email staff create and passcode reset | The server created the isolated no-email staff user and later rotated its temporary passcode, and both operations showed success, but neither one-time Staff ID/passcode popup rendered. Because the passcode is intentionally never stored, the owner could not recover or share the only credential after the confirmed Auth mutation. | Mount `Modal.useModal()` on both desktop surfaces and invoke its `modal.info` instance; reject any return to static `Modal.info` in the regression verifier. Keep the one-time-only secret boundary, API response, Auth/Firestore writes, copy/share controls, mobile sheet, and diagnostics unchanged. | `verify:menulist-api-tenant-safety`; `verify:staff-roles-route-parity`; focused ESLint; strict TypeScript; exact hosted create/reset/staff-sign-in retest | Exact `370645e…` proved that merely mounting the context holder was insufficient because both call sites still invoked the static API. Exact `afa6ec9…` rendered the credential dialog after both create and reset, exposed three working copy actions, admitted the disposable Staff ID/passcode session, denied Users/Projects/Billing owner controls, completed owner force-sign-out, and removed both staff fixtures. Credential values were never logged or retained. | CLOSED |
| MLRC-059 | Medium | Today and Past activity guidance drawer recovery | Today → What is this? opened a large bottom drawer with no visible or meaningfully named close control. Past activity repeated the same hidden-dismissal pattern in each state branch. Owners had to discover mask-click or Escape dismissal. | Add a visible, named Close action with a Lucide close icon and a 44px minimum target while retaining mask/Escape dismissal. Cover Today and every Past activity state branch. | `verify:owner-dashboard-today-boundary`; focused ESLint; strict TypeScript; exact hosted Today retest | Exact `ac7757d…` rendered one visible `Close Today guide` action; activating it removed the drawer. Past activity redirected to Today under the active feature-flag state, so its disabled branch retains source regression coverage rather than a runtime-tested claim. | CLOSED |
| MLRC-060 | Medium | Empty custom temporary status on desktop and mobile | Selecting Custom Message with an empty field previewed and advanced `Temporary notice` to the public confirmation boundary. An owner could publish generic copy after explicitly choosing a custom notice. | Require trimmed custom copy before confirmation on desktop Today/Business Settings, mobile Today, and the dedicated mobile screen; announce the desktop error and replace the misleading empty preview. | `verify:public-business-truth`; `verify:owner-dashboard-today-boundary`; focused ESLint; strict TypeScript; exact hosted desktop validation/valid-confirmation retest | The original empty confirmation was cancelled without mutation. Exact `2362f79…` kept the owner on Today, rendered one announced `Enter a custom message` error, and did not open confirmation; valid labelled QA copy reached confirmation and was cancelled. Mobile parity passes source/static coverage but awaits unlocked responsive browser execution. | CLOSED (desktop hosted; mobile source) |
| MLRC-061 | High | Direct desktop menu-editor deep link for a valid empty project | `/projects?view=editor` selected the first valid project and switched to editor view before the scoped project document had settled. The parent mounted `Editor` with `activeProject` still absent, crossing its invariant and replacing the complete owner app with `Something went wrong`. | Keep the editor invariant and gate its mount on the scoped `activeProject`. Render an explicit loading state while the read settles and provide `Try again` plus `Back to menus` when the read rejects. No Firestore query, cache, mutation, or editor behavior changes. | `verify:menu-project-editor-boundary` and its eight project scope/mutation/upload/time-slot suites; focused ESLint; strict TypeScript; hosted deep-link retest pending | Exact `2362f79…` reproduced `Error: Menu editor requires an active project` for the isolated valid empty project. Source correction and all targeted validation pass; exact hosted verification is required before closure. | FIXED SOURCE — HOSTED RETEST |
| MLRC-062 | Medium | Growth Kits menu and review-rating selectors | The two desktop Ant Select controls rendered as unnamed comboboxes. Their visual proximity and current value let sighted pointer users infer meaning, but keyboard and assistive-technology users could not distinguish the menu selector from the review-rating selector. | Give the existing controls the distinct accessible names `Menu` and `Review rating`. Options, values, entitlement, reads, review preparation, and visual layout remain unchanged. | `verify:growthos` (253 source/contract checks plus client and Firestore transaction suites); focused ESLint; strict TypeScript; exact hosted accessibility retest pending | Exact `2362f79…` reproduced two unnamed comboboxes while the provider-free review guard and Copy reply action otherwise passed. Source correction and the complete GrowthOS target suite pass; exact hosted accessible-name verification is required before closure. | FIXED SOURCE — HOSTED RETEST |

## E. Firebase cost audit

### Confirmed optimization — MLRC-042 persisted Firebase Auth bootstrap

- **Original behavior:** A hard owner-route reload inspected `firebaseAuth.currentUser` before the Firebase SDK restored its persisted browser actor. In the observed stress pass, this produced 30 successful `/api/auth/set-claims` requests before the intended 30-per-15-minute limiter returned 429.
- **Original operation estimate per unnecessary reload:** one protected server invocation, a product-user email query returning up to two documents, one canonical store document read, plus Firebase Admin user/claims/token work.
- **Cause:** persisted Firebase Auth state restores asynchronously, so an early `currentUser === null` was treated as a fresh authentication handoff.
- **Change:** await the pinned SDK's `authStateReady()` settlement before inspecting the current actor and claims. Matching restored tenant/store claims now reuse the existing browser session; new OAuth actors, missing actors, store changes, and claim mismatches retain the protected set-claims path.
- **Expected after behavior:** a valid matching hard reload falls from one set-claims invocation and up to three Firestore document reads to zero. This does not weaken authentication, tenant/store matching, rate limiting, or failure recovery.
- **Evidence:** `verify:auth-security-failure-matrix`, `verify:menulist-api-tenant-safety`, strict TypeScript, focused ESLint, exact verified build `04a736f…`, three successful Billing reloads, direct `/users` recovery, and Vercel request logs showing zero post-build set-claims calls.

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

Confirmed optimization MLRC-047: the internal batch-image worker previously
attempted one SAFE_MODE Firestore document read for every request before
checking the Cloud Tasks project header and shared secret. Unauthorized traffic
could therefore bill one read and hold a server invocation until the Admin read
timed out; two reproduced probes reached 30 seconds. Admission now happens
first, so an unauthorized request performs zero Firebase operations and the
direct regression returned `403` in 0.029 seconds. Admitted workers retain the
same one SAFE_MODE read and all existing fail-open, limiter, job, provider,
Storage, accounting, and mutation behavior.

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
precise public tags and server revalidation paths. On the disposable hosted
fixture, the owner published `Closed today` and the tenant subdomain Official
Business Page rendered the banner immediately. Clearing the status removed it
from the owner state and from both a warm public reload and a cache-busted
request. A reversible descriptor write also appeared on the tenant Official
Business Page and disappeared after the owner cleared it. The fixture's active
screen URL rendered a truthful empty-menu state; invalid-token recovery also
passed. Custom-domain, populated-screen, successful menu upload/item mutation,
and physical-device propagation remain unverified and are not represented as
passing runtime claims.

## H. Command results

| Command | Result |
| --- | --- |
| `npm run verify:menulist-rc-inventory` | PASS — 8,503 rows; 21 Function exports; 58 private MenuList pages access-evidenced; 62 sitemap-backed website page patterns render-evidenced through 186 concrete URLs; all 136 MenuList route handlers have resolved methods/access classes and anonymous runtime evidence; 97.2% of MenuList control candidates statically mapped to page routes |
| `node scripts/verification/verify-mobile-shell-route-map.js` | PASS — pending/unpaid subscription gate retains canonical Billing recovery and now exposes localized canonical sign-out cleanup with announced retry failure |
| `npm run test:menulist-api-anonymous-boundary` | PASS local and hosted — exact hosted `6c9e6ec…` exercised 136 handlers / 153 methods with status counts 200×5, 301×1, 400×15, 401×126, 403×1, 404×5 and zero failures/5xx; every shared Admin Timestamp route module loaded. |
| `npm run test:menulist-api-anonymous-boundary` (MLRC-047 retest) | PASS local and hosted — local: 136 handlers / 153 methods; 200×5, 301×1, 400×15, 401×128, 403×1, 404×3. Exact hosted `6cae311…`: 200×5, 301×1, 400×15, 401×126, 403×1, 404×5. Both have zero timeout/failure; the direct corrected worker probe returns 403 in 0.029 seconds locally and 0.649 seconds on QA. |
| `npm run security-os:audit -- --product menulist` | PASS — registry; mapped evidence executed separately |
| `npm run verify:menulist-api-tenant-safety` | PASS — API scope, sensitive server store scope, Functions callable scope, and CSP report boundary |
| `npm run verify:auth-security-failure-matrix` | PASS — authentication failure, claim-sync, persistence-settlement, storage lifecycle, and rate-limit boundaries |
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
| `npm run verify:razorpay-subscription-lifecycle` | PASS on current staging source — all 10 source events, all 10 pure lifecycle events, and Firestore emulator lifecycle pass; all affected server routes are guarded against Web-SDK Timestamp writes. Live Razorpay provider execution was not performed. |
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
| `node scripts/verification/verify-global-accessibility-boundary.js` (store-access recovery) | PASS — failed Firebase store bootstrap exposes labelled Retry/Sign out recovery with two 44px controls; retry re-enters the existing guarded auth flow |
| `node scripts/verification/verify-contextual-state-illustrations.js` | PASS — 74 reviewed illustrations; the new store-access recovery uses the existing plain access-denied artwork and no new asset/provider |
| `node scripts/verification/verify-global-accessibility-boundary.js` (pricing disclosure) | PASS — comparison feature triggers retain Tooltip behavior and add a 44px tap/keyboard disclosure with `aria-expanded`/`aria-controls` |
| `node scripts/verification/verify-menulist-shared-data-mirrors.js` | PASS — 35 mirrors remain byte-identical and all 249 country rows satisfy the flag-consistency contract or a reviewed explicit exception |
| `npx tsc --noEmit --incremental false` | PASS — current candidate exact direct command, exit 0 |
| `npm --prefix functions run build` | PASS — shared country-data mirror compiles in the MenuList Functions bundle |
| `npm run lint` | PASS — current candidate, zero warnings |
| `npm run verify:next-build-compatibility` | PASS — route-scoped Cloud Tasks proto trace contract present |
| `npm run verify:next-deployment-bundle` | PASS — website 447, sign-in 504, auth API 389, and batch-image trigger 904 traced files; all four routes loaded from isolated traces without the repository `node_modules` |
| `npm run certify:menulist-local` | PASS WITH EXTERNAL BLOCKER — fresh current-candidate run completed 161/162 checks; all 161 executable checks passed, 43 sibling-product scripts were explicitly excluded, and only `verify:upstash-readiness` was `BLOCKED_EXTERNAL`. The menu-extraction gate passed on its built-in retry after a transient emulator-port collision. The external target was separately proven through the connected QA console and hosted contact limiter without exposing its secret URL/token. |
| `npm run certify:asset-factory-menulist` | PASS — 28 MenuList slots; zero errors, warnings, stale assets, missing assets, disconnected files, or approval blockers after the one current slot-scoped fingerprint refresh |
| `npm run docs:check-links` | PASS — 3,053 files and 5,339 internal links scanned; zero broken links. The command reported 64 non-failing filename-policy warnings, including the task-mandated `MENULIST_RC_CERTIFICATION.md` name and pre-existing uppercase video working documents. |
| Unit/contract suites | PASS — all curated MenuList verification suites reached by the 157-script release gate; no single root `test` command exists |
| Integration/emulator suites | PASS — Rules, lifecycle, scheduler, extraction, billing, notification, storage, and DAL suites exercised deterministic demo projects |
| Browser E2E | PASS (bounded manual) — connected Chrome local/hosted auth, pricing handoff, dashboard and payment-pending Billing; no root E2E harness is registered |
| Firestore Rules tests | PASS — 42-script predeploy and focused tenant/store suite |
| Firebase Functions tests/build | PASS — `npm run verify:functions-deploy-preflight` |
| `npm run build` | PASS — exact current source completed the Next.js 16.3 production build, 450 static pages, and 53-entry Serwist bundle; existing Sass deprecation and missing optional Gemini-key warnings retained |

## I. Residual risks

- The 5,291 page-reachable MenuList control candidates still require complete
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
- MLRC-041 is closed on exact hosted QA commit `194f39a…` at 320×568. MLRC-042
  passed its exact hosted persisted-session and operation-count path on
  `04a736f…`; exact hosted `6cae311…` also rendered its bounded Firebase Auth
  failure screen and restored the complete Help Centre/MobileShell through
  `Try again` without session loss.
- MLRC-045 is closed on exact hosted QA commit `32440ec…` at 320×568. The
  authoritative pending subscription now routes the owner back to Billing
  instead of repeating plan selection; live Continue Checkout remains excluded.
- MLRC-046 is fixed on exact hosted descendant `6c9e6ec…`: every affected route
  module loads and rejects anonymous access correctly, while the source/pure/
  emulator lifecycle and production build pass. The provider-free hosted
  application-side persistence write remains pending because no admitted
  disposable success fixture is available. Live Razorpay execution is excluded.
- The repository has no root `test:e2e` or `e2e` script. Controlled browser
  evidence and existing deterministic verifiers will be recorded separately.
- Hosted QA exposed and refreshed onto exact verified tested MenuList product
  commit `2362f794eb61c908228c0f4956cd03b19d5eb3bd`. A fresh provider-free
  MenuList owner fixture now proves full tenant/store shape, production-query
  entitlement, whitespace-tolerant sign-in, truthful QA Billing, first-use
  project creation, transient-write recovery, direct hard-load Dashboard and
  Projects access, temporary-status and descriptor public propagation, private
  feedback resolution, one-location policy persistence, tenant-scoped share
  links, active empty-screen rendering, truthful unpublished sharing, visible
  Business Settings completion, and the complete disposable staff create/reset/
  restricted-sign-in/force-sign-out/removal lifecycle, Today guide recovery,
  and required custom-status copy. MLRC-052 through MLRC-060 are closed at
  their stated evidence levels. Successful menu-item creation/edit/
  publish propagation, multi-location creation, installed PWA, physical-device,
  custom-domain, and populated television-screen journeys remain unverified.
- Firebase project-level access is verified for `admin@neelvara.com` in both
  Firebase Console and Firebase CLI. The earlier statement that this identity
  lacked access was incorrect: unavailable local credentials had been confused
  with account authorization. Because `gcloud` is not installed, the guarded
  QA-only fixture harness establishes a mode-0600 temporary authorized-user ADC
  from the authenticated Firebase CLI session without logging its token. It
  refuses every project except `menulist-qa`, creates canonical owner/tenant/
  store data through the shared onboarding transaction, and attaches only a
  labelled 72-hour zero-value provider-free certification entitlement. The
  fresh fixture passed both Admin verification and real Firebase Web client
  verification. Live Razorpay remains excluded.
- The current pending-owner QA fixture does not provide a valid admitted
  Answerlattice support workspace. MenuList Help Center shell/recovery routing
  was testable, but ticket history and the remaining Answerlattice-backed
  content/data path remain externally blocked; no MenuList fallback was added.
- Connected Upstash QA console evidence returned `PONG` from
  `menulist-qa-rate-limit`. One isolated disposable key accepted `SET`, two
  sequential `INCR` operations, returned a positive TTL, and was deleted;
  `EXISTS` then returned zero. The hosted MenuList contact route admitted five
  invalid non-writing attempts and returned `429` on attempts six and seven
  with `Retry-After`, limit, remaining, and reset headers. Production Redis was
  not opened or mutated. The local shell intentionally still lacks the secret
  URL/token, so `verify:upstash-readiness` remains an exact environment-blocked
  command result; deterministic outage/fail-closed behavior remains covered by
  the existing local rate-limit suites rather than disabling the QA database.
- The synthetic QA contact record is intentionally labelled and retained in
  `landingPageEnquiries`. This session has neither a PLATFORM inbox role nor
  Firebase project access to read back or remove that record safely.
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
