# MenuList Release-Candidate Certification

**Status:** CERTIFICATION BLOCKED

**Candidate branch:** `staging`

**Initial candidate commit:** `b857a164944012d42131917e7c62215c94022c0f`

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
| User-control candidates | 7,478 | Deduplication and render-tree reachability in progress |
| Feature flags | 333 | Product ownership and material alternate states in progress |
| Firebase Function exports | 21 | Source/export inventory complete; runtime evidence is tracked separately |

Current product classification yielded 5,948 MenuList candidates and 2,513
separation-boundary candidates. A candidate remains `DISCOVERED_UNTESTED` until
its rendered reachability and behavior are proven; source inspection alone does
not mark a control tested.

## C. Test execution

| Product area | Scope | Result | Evidence / blocker |
| --- | --- | --- | --- |
| Baseline identity | Worktree, branch, local/tracking/direct server SHA | PASS | One worktree; clean starting filesystem; `staging` exact at `b857a164944012d42131917e7c62215c94022c0f`; `main` unchanged |
| SecurityOS registry | MenuList surface/evidence registry integrity | PASS | Registry, tenant/store DAL, Rules, Storage, CSP, input/file/network, webhook, and API-scope evidence executed |
| Route/control inventory | App Router, controls, flags, Functions | PASS (discovery) | `npm run verify:menulist-rc-inventory`; 8,461 uniquely identified discovery rows |
| Local aggregate | MenuList-filtered repository production-readiness gate | PASS WITH EXTERNAL BLOCKER | Clean aggregate: 160/161 checks passed; all 157 child verifiers passed; the sole non-pass is the unavailable Upstash target credential gate |
| Authentication regression | Leading/trailing email and password; invalid login recovery; callback preservation | PASS | Deterministic credential-normalization tests and controlled local Chrome; no real credentials recorded |
| Pricing handoff | Pro, INR, yearly, quantity one, B2C callback through authentication | PASS | Controlled local Chrome reached encoded sign-in callback with all purchase-intent fields intact |
| Hosted QA | Exact candidate on QA owner app | PASS (bounded) | `/api/version` returned exact `b857a164944012d42131917e7c62215c94022c0f`; authenticated pending-payment fixture rendered Billing truth without provider execution |
| Hosted transport | Website/app/tenant HTTP, metadata, noindex, PWA assets, missing routes | PASS (bounded) | Website, pricing, features, resources, legal, sign-in, owner manifest, offline, service workers, and tenant menu matched QA policy; disabled sitemap/customer manifest returned honest 404; missing menu slug rendered noindex recovery |
| Physical devices | Owner PWA, public menu, screen/TV where applicable | BLOCKED | No current physical-device evidence in this session |

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
| `npm run verify:menulist-rc-inventory` | PASS — 8,461 rows; 21 Function exports |
| `npm run security-os:audit -- --product menulist` | PASS — registry; mapped evidence executed separately |
| `npx tsc --noEmit --incremental false` | PASS — exact direct command, exit 0 |
| `npm run lint` | PASS — zero warnings |
| `npm run certify:menulist-local` | PASS WITH EXTERNAL BLOCKER — 160/161 checks passed; 157 child verifiers passed; 42 sibling-product scripts explicitly excluded; only `verify:upstash-readiness` was `BLOCKED_EXTERNAL` |
| Unit/contract suites | PASS — all curated MenuList verification suites reached by the 157-script release gate; no single root `test` command exists |
| Integration/emulator suites | PASS — Rules, lifecycle, scheduler, extraction, billing, notification, storage, and DAL suites exercised deterministic demo projects |
| Browser E2E | PASS (bounded manual) — connected Chrome local/hosted auth, pricing handoff, dashboard and payment-pending Billing; no root E2E harness is registered |
| Firestore Rules tests | PASS — 42-script predeploy and focused tenant/store suite |
| Firebase Functions tests/build | PASS — `npm run verify:functions-deploy-preflight` |
| `npm run build` | PASS — Next.js 16.3.0 production build; 451 static pages; 14 existing Sass deprecation warnings |

## I. Residual risks

- The complete generated control inventory still requires render-tree
  deduplication and individual runtime reachability classification; discovery
  rows are not represented as tested controls.
- The repository has no root `test:e2e` or `e2e` script. Controlled browser
  evidence and existing deterministic verifiers will be recorded separately.
- Hosted QA exact build identity is confirmed. A signed-in pending-payment
  owner fixture was available, but a no-subscription true-handheld fixture,
  destructive disposable tenant/store fixtures, physical mobile/PWA,
  television-screen behavior, and hosted write-through propagation remain
  unverified in this session.
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

This is the final decision for this certification pass. Mandatory runtime and
external-evidence gates remain open, so the candidate is not approved for
production deployment. The source and certification tooling may proceed on
`staging`; that does not convert the blocked certification into production
approval.

Required final wording if every non-provider completion gate eventually passes:

> MenuList certified excluding live Razorpay provider execution.
