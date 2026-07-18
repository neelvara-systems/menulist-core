# Production Readiness Checklist

**Status:** 📝 ACTIVE — Use before launch  
**Priority:** 🟡 P2 — Reference checklist  
**Created:** February 20, 2026  
**Source:** ChatGPT launch infra review → Cascade critical review  
**Governance:** Constitution §13 — Operational Infrastructure Doctrine

**Launch boundary:** Not current launch certification or deploy approval. This checklist records row-level source, static, platform, and setup evidence; the current launch verdict still requires External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, provider/browser/device QA, and production-host smoke.

---

## Purpose

Structured pre-launch verification checklist. Run through each section before onboarding real SMB users. Items marked ✅ are already confirmed. Items marked ☐ need verification.

For the remaining external/runtime gates that local source checks cannot prove, use [External Certification Runbook](./external-certification-runbook.md).

For active outages, security events, wrong public truth, billing/provider failures, or rollback decisions, use the [MenuList Incident Response Runbook](./incident-response-runbook.md). The incident runbook governs response work only; it does not replace launch certification evidence.

Status meaning: ✅ means the repository, static configuration, or documented platform capability is currently confirmed for that row. It does not override missing deploy, provider, browser/device, owner-controlled setup, or production-host evidence. When a row depends on those external conditions, the matching External Certification Runbook gate remains the launch authority.

## Current External Certification Snapshot (July 11, 2026)

The current local source boundary passes 109/109 checks, including 105 child verifiers, docs links, typecheck, lint, and diff integrity, but this is not launch approval. Restart 84 also closed the Answerlattice public-brand/claim-copy drift, aligned the no-free-product-plans gate with the active paid-plan selector, added Firestore-emulator proof for phone OTP attempt/token atomicity, and restored a fully current AssetOS audit/review. The following external gates still decide production certification:

| Gate | Current state | External blocker |
|------|---------------|------------------|
| Gate 1 Firebase Functions deploy | Blocked | Scoped `menulist-qa` deploy preflight passes, then Firebase Cloud Resource Manager returns HTTP 403 before upload. |
| Gate 2 Tenant-block mirror backfill | Blocked | Safety verifier passes, but the bounded read-only `menulist-qa` dry run cannot review the target dataset because Firebase project access returns permission denied. |
| Gate 2A Firebase Storage rules deploy | Blocked | `npm run verify:storage-paths` passes, but scoped `menulist-qa` Storage deploy stops at Service Usage HTTP 403 before rules upload. |
| Gate 3 True mobile/browser QA | Blocked | The local loopback customer-worker smoke passed with only `/offline` cached and no stale menu, while the owner harness covers Today, Menu, Share, More, MobileShell containment, screenshots, overflow/clipping, active state, and 44x44px targets. Production worker registration/install, an eligible owner fixture, authenticated owner-shell execution, and real-device QA remain pending. |
| Gate 4 Razorpay sandbox smoke | Partial only | The maintained read-only preflight passes for payments, orders, plans, and subscriptions plus synthetic raw-body webhook signature validation; full checkout, payment verification, real webhook delivery, compensation, top-up, reseller, state-parity, and no-real-charge smoke remains pending. |
| Gate 5 WhatsApp provider smoke | Blocked | Checked local/functions dotenv files keep messaging onboarding absent or disabled and contain no WhatsApp provider secrets; non-production Meta app, secrets, deployed webhook, registration, and target enablement remain pending. |
| Gate 6 POS webhook provider smoke | Blocked | `npm run verify:pos-sync-boundary` passes, but controlled public HTTPS receiver, receiver-side signature verification, test delivery, publish delivery, failed-endpoint evidence, and secret-rotation proof remain pending. |
| Gate 7 Batch image worker | Blocked | Root `.env` has project/location/queue/HTTPS worker URL but lacks `BATCH_IMAGE_GENERATION_WORKER_SECRET`; worker deploy, captured queue dispatch/retry/backoff policy, and controlled Cloud Tasks enqueue/worker smoke remain pending. |
| Gate 8 Production host smoke | Blocked | Vercel deploy, production-host smoke, production env verification, custom-domain routing, CDN behavior, and production Firebase access require explicit owner approval and evidence. |

Do not convert this table into ✅ status until the corresponding runbook gate has pass evidence recorded in `__docs__/audits/menulist-production-readiness-audit.md`.

---

## 1. Infrastructure & Hosting

| Check | Status | Notes |
|-------|--------|-------|
| Vercel production deployment active | ☐ | Verify at vercel.com |
| Custom domain configured (menulist.ai) | ☐ | DNS + SSL |
| CDN caching active for public pages | ☐ | Source cache headers and Vercel-compatible cache policy exist; Gate 8 must verify production response headers, cache hits, invalidation, and CDN behavior. |
| SSL auto-renewal | ☐ | Vercel-managed certificates are expected only after the production custom domain is active; Gate 8 must verify the certificate chain and renewal state. |
| Firebase project on Blaze plan | ☐ | Required for Cloud Functions |
| GCP budget alerts configured | ☐ | Set at ₹500, ₹1000, ₹2000 thresholds |
| Cloud Billing export to BigQuery configured | ☐ | Pre-production cost visibility. Enable Standard + Detailed usage export for billing account `Firebase Payment` into `menulist.cloud_billing_export` or a dedicated FinOps project. |
| Gemini staging/production keys isolated | ☐ | Dedicated restricted keys per environment; do not share local/staging/prod |
| Gemini quota/budget monitoring configured | ☐ | Check model/project quota and budget alerts before launch |
| SAFE_MODE circuit breaker verified | ☐ | Core code exists and menu extraction worker coverage is source-gated. Before launch, verify `/ops` toggle, AI route `503`, public menu/OBP unaffected, budget webhook activation, deployed worker behavior, and any newly added direct Function paths. |
| Environment variables set in Vercel | ☐ | All secrets configured |
| Dependency/package freeze gate passes | ✅ | `npm run verify:dependency-freeze` pins root, MenuList Functions, and Answerlattice Functions package declarations to their existing lockfile-resolved versions and blocks drift from the current runtime set. |
| Firebase Functions deploy evidence captured | ☐ | Gate 1 in [External Certification Runbook](./external-certification-runbook.md): run `npm run verify:functions-deploy-preflight` before the scoped Firebase deploy retry. Local gates pass. The latest scheduler-only retry on July 15 used `firebase deploy --project menulist-qa --config firebase.json --only functions:menulistMaintenanceScheduler --non-interactive`, completed predeploy lint/build, and then failed before upload with Cloud Resource Manager HTTP 403 caller permission. |
| Firebase Storage rules cutover deployed | ☐ | Gate 2A in [External Certification Runbook](./external-certification-runbook.md): `npm run verify:storage-paths` passes, but the latest scoped `menulist-qa` deploy failed before rules upload while checking/enabling `firebasestorage.googleapis.com` with Service Usage HTTP 403 project access/availability blocker; production requires QA evidence and explicit production approval. |
| Firestore indexes deployed | ☐ | Use `firebase deploy --only firestore:indexes --project menulist-qa --config firebase.json` after `npm run verify:env-targets` passes; production index deploy requires QA evidence and explicit production approval. |

---

## 2. Security

| Check | Status | Notes |
|-------|--------|-------|
| Firestore security rules deployed | ☐ | Use `firebase deploy --only firestore:rules --project menulist-qa --config firebase.json` after targeted validation passes; production rules deploy requires QA evidence and explicit production approval. |
| No public write access in rules | ✅ | Verified in SS audit (Feb 7) |
| Rate limiting active (Upstash) | ☐ | `ENABLE_RATE_LIMITING: true` and protected public flows fail closed in source, but target credentials, live Upstash behavior, limits, and outage handling still need non-production verification. |
| Sentry configured (prod project) | ☐ | Source integration and production env templates exist; the production DSN, release/source-map association, and captured test event still need target verification. |
| HTTPS enforced | ☐ | Middleware configures HSTS for production responses, but Gate 8 must verify production HTTP-to-HTTPS behavior, TLS, and the delivered HSTS header. |
| CSP headers active | ✅ | Middleware.ts |
| Auth session security | ✅ | NextAuth with secure cookies |
| System strengthening fixes applied | ✅ | `npm run verify:system-strengthening` source-gates SS-1 through SS-9 from `__docs__/system-strengthening/`; this is local proof only, not live production certification. |
| Incident response runbook maintained | ✅ | [MenuList Incident Response Runbook](./incident-response-runbook.md) records severity, containment, SAFE_MODE limits, rollback discipline, recovery gates, communication, and durable evidence requirements. A QA tabletop/live drill remains external evidence. |

---

## 3. Core Product: Menu Delivery

| Check | Status | Notes |
|-------|--------|-------|
| Public menu page loads <2s | ☐ | Test from mobile device on 4G |
| Menu shows correct data after publish | ☐ | Publish → verify live in <30s |
| Images load correctly | ☐ | Check Firebase Storage CDN |
| QR code scans correctly | ☐ | Test with 3 different apps (see below) |
| OBP page loads with schema.org | ☐ | Check with Google Rich Results Test |
| Customer app shows an offline fallback without cached menu content | ☐ | A July 11 local loopback smoke manually registered the development worker, severed the harness proxy upstream, rendered `/offline`, and found no cached menu content. Production registration/install and physical-device airplane-mode evidence still need Gate 3/Gate 8 verification. |
| Menu renders on slow 3G | ☐ | Chrome DevTools network throttle |
| Menu renders on old Android | ☐ | Test with real device or BrowserStack |
| Menu renders on Safari iPhone | ☐ | Test with real device |

### QR Code Testing (Manual)

Test QR scan with:
- [ ] iPhone Camera app
- [ ] WhatsApp camera (scan QR)
- [ ] Instagram camera
- [ ] Android default camera
- [ ] Cheap Android phone (mid-range)

Each must:
- Open instantly
- No redirect chain
- No login wall
- No cookie dependency

---

## 4. Owner Dashboard

| Check | Status | Notes |
|-------|--------|-------|
| Login flow works (email + password) | ☐ | Test fresh signup |
| Dashboard loads after login | ☐ | Check first-load speed |
| Menu editor works (add/edit/delete items) | ☐ | Full CRUD test |
| Publish flow works end-to-end | ☐ | Edit → publish → verify live |
| Working hours editor works | ☐ | Set hours → verify on public page |
| Image upload works | ☐ | Upload, crop, save |
| AI features work (descriptions, translations) | ☐ | Test with feature flags ON |
| Billing/subscription page loads | ☐ | Razorpay integration |
| Settings page works | ☐ | Profile, store info, theme |

---

## 5. Monitoring & Alerting

| Check | Status | Notes |
|-------|--------|-------|
| Sentry receives errors from production | ☐ | Trigger test error, verify in Sentry |
| Error emails configured in Sentry | ☐ | Set up alert rules |
| Telegram alert bot created | ☐ | See `__docs__/ops-alerting-delivery/` |
| Telegram alerts working | ☐ | Test with manual alert trigger |
| Platform alert Email/WhatsApp configured | ☐ | Complete `launch-prerequisites.md` Step 7B before production |
| Menu health monitor deployed | ☐ | See `__docs__/menu-health-monitor/` |
| AI provider health checks deployed | ☐ | Confirm `_health/aiProvider_gemini` and `platformSummary/answerlatticeAiProviderHealth` update |
| SAFE_MODE mechanism ready | ☐ | Core built; complete `launch-prerequisites.md` Step 2C before production |
| GCP budget alerts configured | ☐ | Set progressive thresholds |
| BigQuery billing export data verified | ☐ | After export is enabled, confirm billing tables receive daily cost rows before production launch |
| Website analytics configured | ☐ | Configure Plausible sites/env/goals for `menulist.ai` and `answerlattice.com`; keep PostHog out of launch; see `__docs__/client-menu/analytics-tracking/analytics-tracking_vendor-plan.md` |

---

## 6. Data & Backup

| Check | Status | Notes |
|-------|--------|-------|
| Firestore daily export configured | ☐ | Firebase Console → Extensions or scheduled export |
| Export verified (can restore) | ☐ | Test restore to staging |
| Storage backup strategy defined | ☐ | Images in Firebase Storage with bucket versioning |

---

## 7. Legal & Trust

| Check | Status | Notes |
|-------|--------|-------|
| Privacy policy published | ☐ | Accessible from login/signup |
| Terms of service published | ☐ | Accessible from login/signup |
| Support email visible | ☐ | support@menulist.ai or equivalent |
| Data deletion process defined | ☐ | How to handle deletion requests |

---

## 8. SEO & Discovery

| Check | Status | Notes |
|-------|--------|-------|
| robots.txt allows indexing | ✅ | `public/robots.txt` |
| Sitemap exists | ☐ | Auto-generated or manual |
| OBP pages have schema.org markup | ✅ | `src/lib/schema/index.ts` |
| llms.txt published | ✅ | `public/llms.txt` + `public/llms-full.txt` |
| Google Search Console configured | ☐ | Submit sitemap |

---

## 9. Onboarding Readiness

| Check | Status | Notes |
|-------|--------|-------|
| WhatsApp onboarding flow tested | ☐ | End-to-end with 3-5 test users |
| Dashboard signup flow tested | ☐ | Fresh signup → publish → live |
| Pre-written support responses ready | ☐ | 10 common question templates |
| Onboarding documentation ready | ☐ | Internal guide for first 20 users |

---

## 10. Content & Help

| Check | Status | Notes |
|-------|--------|-------|
| Help videos recorded (optional) | ☐ | 10 short screen recordings |
| FAQ/help page accessible | ☐ | Basic help center or docs |
| Common error messages user-friendly | ☐ | No technical jargon in UI |

---

## Post-Launch Monitoring (First 7 Days)

### Daily Checks
- [ ] Open ops dashboard → all green?
- [ ] Check Sentry → any new error patterns?
- [ ] Check Telegram → any alerts fired?
- [ ] Check Firebase Console → usage normal?
- [ ] Check BigQuery billing export → any cost spikes by service/SKU?
- [ ] Message first 5 owners → "Is everything working?"

### Weekly Check
- [ ] Review all stores: any silent failures?
- [ ] Review support messages: any repeated questions?
- [ ] Review Firestore usage trends: any unexpected growth?

---

## Launch Readiness Verdict

**Ready to launch when:**
- All Security checks ✅
- All Core Product checks ✅
- All Monitoring checks ✅
- Every [External Certification Runbook](./external-certification-runbook.md) gate has evidence recorded in `__docs__/audits/menulist-production-readiness-audit.md`
- At least 3 QR scan tests pass
- At least 1 end-to-end onboarding test complete

**NOT ready if:**
- Any Security check fails
- Public menu doesn't load on mobile
- No error monitoring configured
- No budget alerts set
- SAFE_MODE is not verified end-to-end
- Any external certification gate is blocked or missing evidence

---

**Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.61 | July 11, 2026 | Refreshed the External Certification Runbook to the verified 98/98 local boundary with 94 child verifiers, all five external-only harness syntax checks, and current Functions/Storage blocker wording while preserving older run evidence as history |
| 1.60 | July 11, 2026 | Recorded a passing local loopback customer-worker smoke with a temporary Chrome profile, `/offline`-only cache inspection, severed harness-proxy upstream, 390x844 fallback capture, and explicit non-certification boundaries for production registration/install and real devices; Gate 3 remains blocked |
| 1.59 | July 11, 2026 | Corrected six externally dependent checklist rows: source support for CDN caching, managed TLS, Upstash, Sentry, HTTPS/HSTS, and the customer offline fallback is documented, but each remains unchecked until provider/browser/production-host evidence exists; customer menu content remains intentionally uncached |
| 1.58 | July 11, 2026 | Replaced the ad-hoc Razorpay credential probe with `smoke:razorpay-sandbox-readonly`: hard live-key refusal, matching test-key checks, bounded payments/orders/plans/subscriptions reads, and synthetic raw-body signature validation; full Gate 4 payment flows remain pending |
| 1.57 | July 11, 2026 | Expanded the authenticated owner-shell harness from Menu-only checks to Today/Menu/Share/More navigation, per-tab screenshots, MobileShell/hash/active-state checks, overflow/clipping detection, and 44x44px navigation evidence; Gate 3 remains blocked until an eligible explicit fixture and browser/device run are available |
| 1.56 | July 11, 2026 | Added the MenuList Incident Response Runbook and refreshed the local aggregate source-gate snapshot to 97/97 checks with 93 child verifiers; live drill and target access remain external evidence |
| 1.55 | July 9, 2026 | Clarified checklist status semantics: ✅ rows confirm repo/static/platform evidence only for that row and do not override missing deploy, provider, browser/device, owner-controlled setup, or production-host evidence from the External Certification Runbook |
| 1.54 | July 9, 2026 | Added the current external certification snapshot: local source gates pass with 95/95 checks, while Gate 1 Functions, Gate 2 backfill, Gate 2A Storage, Gate 3 mobile/browser QA, Gate 4 full Razorpay sandbox, Gate 5 WhatsApp provider setup, Gate 6 POS receiver smoke, Gate 7 batch worker secret/Cloud Tasks smoke, and Gate 8 production-host smoke remain blocked or partial until runbook evidence is recorded |
| 1.53 | July 2, 2026 | Clarified mobile operational specs, strategy bucket-list, and Multi-Outlet AI extraction analysis: mobile screen/navigation specs are reference docs pending active audit, External Certification Runbook evidence, `verify:mobile-shell-route-map`, feature-specific mobile/source gates, owner-shell mobile QA, real-device QA where relevant, target deploy evidence, and production-host smoke; future strategy candidates are not implementation approval; Multi-Outlet AI extraction analysis remains historical pending multi-location/menu-extraction source gates, linked outlet extraction QA, provider smoke, deploy evidence where rules/functions change, and target smoke |
| 1.52 | July 2, 2026 | Clarified PONR onboarding, Physical Surfaces, and Image Editing historical readiness labels: PONR remains historical strategy evidence pending current implementation docs, onboarding/auth/payment source gates, desktop/mobile onboarding QA, public-surface cache/deploy evidence where relevant, target deploy evidence, and production-host smoke; Physical Surfaces remains a legacy spec superseded by Menu Kit/Menu Card Export pending output and print-review evidence; Image Editing assessment grade remains historical evidence pending browser/mobile editor QA, Storage deploy evidence, provider smoke where relevant, target smoke, and External Certification Runbook evidence |
| 1.51 | July 2, 2026 | Clarified Projects marketing collateral docs: AI Data Extraction, Upload/File Processing, Description Generation, and Multi-Language Translation marketing drafts are historical positioning evidence, not current sales, publication, or launch approval; current collateral use still requires active audit evidence, External Certification Runbook evidence, menu-extraction/agent-readiness/AI-accounting source gates as relevant, provider smoke, browser/mobile upload/extraction/editor/translated-output QA, Storage/deploy evidence, production-host smoke, and release-specific evidence for numeric claims |
| 1.50 | July 2, 2026 | Clarified Item Photo Capture Assist validation report: June 2026 implementation evidence is not current owner-side browser-smoke or launch certification; current approval still requires active audit evidence, External Certification Runbook evidence, `verify:agent-readiness`, `verify:auth-security-failure-matrix`, authenticated desktop owner browser QA, authenticated mobile owner-shell QA inside `MobileShell`, real-device camera QA, media preparation/upload QA through existing item-image paths, target deploy evidence, and production-host smoke |
| 1.49 | July 2, 2026 | Clarified AI Enhancement Pack help, website, and marketing docs: source evidence is not current launch certification; current publication/sales approval still requires External Certification Runbook evidence, `verify:billing-entitlement-boundary`, Razorpay sandbox top-up smoke, desktop/mobile Billing browser QA, website/pricing copy review, target deploy evidence, production-host smoke, approved launch pricing, and payment-confirmed activation evidence |
| 1.48 | July 2, 2026 | Added Menu Design Presentation boundary: B2C/customer-menu docs now require External Certification Runbook evidence, Digital Menu Output Constitution checks, `verify:menu-design-presentation-boundary`, public cache/deploy evidence, browser/mobile customer-menu QA, target deploy evidence, and production-host smoke; free-form font/layout and forbidden public design wording are bounded to controlled moods, compatible layouts, logo, and brand accents |
| 1.47 | July 2, 2026 | Clarified Staff Prompt spec/implementation/marketing docs: January 2026 planning and positioning evidence is not current implementation, dev-ready, sales-team, standalone-product, or launch approval; current release approval still requires active audit evidence, External Certification Runbook evidence, `verify:staff-prompt-runtime`, authenticated desktop/mobile Today QA with an eligible target-store `staffPrompt`, target deploy evidence, production-host smoke, and upstream summary-writer evidence if generated prompts are claimed end-to-end |
| 1.46 | July 2, 2026 | Clarified Menu Correctness Engine website, help, and marketing docs: source-gated runtime evidence is not current launch certification; current approval still requires active audit evidence, External Certification Runbook evidence, `verify:public-business-truth`, browser/mobile save and publish-gate QA, customer-facing surface smoke, public menu/device QA, PDF artifact review where PDF copy is used, POS/provider smoke where POS copy is used, target deploy evidence, and production-host smoke |
| 1.45 | July 2, 2026 | Clarified Pricing Integrity spec, implementation, and Firebase docs: source/planning and cost evidence are not current launch certification; current pricing release approval still requires active audit evidence, External Certification Runbook evidence, `verify:menulist-api-tenant-safety`, authenticated desktop/mobile editor price-change QA, public menu and PDF artifact QA, cache/deploy evidence, target deploy evidence, and production-host smoke |
| 1.44 | July 2, 2026 | Added Platform Pull API and GBP Sync disabled-runtime source gates: Platform Pull API key lifecycle, private pull-response headers, live key/target revalidation, desktop key UI, and docs parity are now covered by `verify:platform-pull-api-boundary`; active GBP docs are bounded to manual Google handoff while `ENABLE_GBP_SYNC` remains false and `verify:public-business-truth` rejects stale automatic-sync/readiness claims |
| 1.43 | July 2, 2026 | Clarified Client Menu marketing collateral status: sales collateral is marketing evidence only, not current launch certification; current customer-facing menu approval still requires External Certification Runbook evidence, Digital Menu Output Constitution checks, public cache/deploy evidence, browser/mobile customer-menu QA, physical QR/menu device QA, low-bandwidth/offline/back-button tests, analytics delivery checks where relevant, target deployment evidence, and production-host smoke |
| 1.42 | July 2, 2026 | Added Temporary Status boundary source gate: authenticated set/clear route, hashed write limiter, bounded request/response parsing, desktop/mobile rollback, Today shortcuts, OBP/menu/feedback banners, public pull API expired-status hiding, public cache invalidation, Digital Screens invalidation, Owner Business Assistant cache invalidation, and docs parity are now covered by `verify:temporary-status-boundary` |
| 1.41 | July 2, 2026 | Clarified Customer App companion-doc status: active spec, Firebase, mobile-support, helpdoc, marketing, and website docs are source-gated runtime evidence or source-backed drafts, not standalone launch certification; manual device QA, external certification, target deploy evidence, and production-host smoke remain required |
| 1.40 | July 2, 2026 | Clarified Reviews/Reputation validation footer: February 2026 docs-alignment evidence is not current implementation approval; implementation remains blocked until GBP API access, ingestion evidence, owner mount-point review, active source gates, and target-environment smoke exist |
| 1.39 | July 2, 2026 | Clarified Description Generation assessment user-testing row: November 2025 assessment evidence is not current production-testing approval; current testing still requires active audit evidence, External Certification Runbook evidence, target deploy evidence, provider smoke, and browser/mobile editor QA |
| 1.38 | July 2, 2026 | Added Working Hours and time-slot boundary source gate: desktop/mobile working-hours saves, Today quick-hours saves, time-slot preset writes, project cascade acknowledgement, public cache revalidation, current hours badge behavior, Mobile More route wiring, and active docs are now covered by `verify:working-hours-boundary`; holiday-calendar and exception-manager claims remain unshipped until source-backed runtime exists |
| 1.37 | July 2, 2026 | Clarified AI Menu Manager README status: initial implementation is source-gated evidence only, not current launch certification; current approval still requires External Certification Runbook evidence, `verify:ai-menu-manager`, authenticated desktop/mobile Menu Manager QA, supported-adapter smoke behind AMM feature flags, public website/help copy review, target deploy evidence, and production-host smoke |
| 1.36 | July 2, 2026 | Clarified menu-editor Phase 4 advanced note: December 2025 ship-ready label is historical source evidence only; current customer-facing menu/editor approval still requires External Certification Runbook evidence, Digital Menu Output Constitution checks, physical/mobile browser QA, low-bandwidth/offline/back-button tests, public cache/deploy evidence, analytics delivery checks where relevant, and target production smoke |
| 1.35 | July 2, 2026 | Clarified POS Sync diagnostics verifier precision: mobile owner-safe connection errors are preserved only when the connection has not changed, desktop normalized-URL saves reset status/error/failure fields, and current POS approval still requires POS source gates, provider smoke, browser/mobile QA, target deploy evidence, and production-host smoke |
| 1.34 | July 2, 2026 | Clarified the development-done security implementation summary: lower deployment notes are historical source evidence only, not current deploy approval; current security/API release approval still requires External Certification Runbook evidence, current Projects API/security verifiers, browser/API smoke, target deploy evidence, and production-host evidence |
| 1.33 | July 2, 2026 | Clarified Menu Command Center validation report: February 2026 ready-for-testing/final-ready labels are historical source evidence only; current approval still requires External Certification Runbook evidence, `verify:agent-readiness`, authenticated desktop editor QA, mobile bulk availability/show-hide parity QA, public menu output QA, cache/deploy evidence for changed menu truth, target deploy evidence, and production-host smoke |
| 1.32 | July 2, 2026 | Clarified Communication Kit and physical-surface output boundary: mobile Share secondary actions keep a 48px source-gated touch target, Menu Kit owns new physical surface work, and current output approval still requires External Certification Runbook evidence, browser/device QA, visual print artifact review, target deploy evidence, and production-host smoke |
| 1.31 | July 2, 2026 | Clarified Razorpay webhook diagnostic verifier precision: duplicate-webhook logs must bound `eventKey`, but raw webhook event keys remain valid idempotency inputs for Founder Monitor revenue movement recording and are not launch evidence |
| 1.30 | July 2, 2026 | Clarified Menu Readability Check validation report: V0 ready-for-testing labels are source-gate evidence only, not current launch approval; current approval still requires External Certification Runbook evidence where applicable, `verify:menu-readability-check`, public website route QA, contact handoff QA, target deploy evidence, and production-host smoke |
| 1.29 | July 2, 2026 | Clarified Physical Surfaces validation residual verdicts: lower ship-ready, production-quality-gate, and final status labels are historical implementation evidence only, not current release approval; current active physical/print output approval still requires menu-card-export source gates, External Certification Runbook evidence, Digital Menu Output Constitution checks, browser/mobile output QA, visual print artifact review, target deploy evidence, and production-host smoke |
| 1.28 | July 2, 2026 | Clarified Multi-Outlet test-case final assessment: the feature-completeness row is historical QA evidence only, not current launch certification; current approval still requires External Certification Runbook evidence, multi-location source gates, desktop/mobile Locations QA, linked outlet save QA, billing/provider evidence where relevant, target deploy evidence, and production-host smoke |
| 1.27 | July 2, 2026 | Clarified Hours Status Display validation report: January 2026 ready-for-testing and manual-QA readiness labels are historical evidence only, not current release approval; current approval still requires External Certification Runbook evidence, source gates, authenticated desktop/mobile working-hours save QA, public menu/OBP hours output QA, cache/deploy evidence for store-output writes, target deploy evidence, and production-host smoke |
| 1.26 | July 2, 2026 | Clarified Social Content validation report: January 2026 final-production, ship-ready, production-quality-gate, and Vercel/SMB-testing labels are historical evidence only, not current release approval; current approval still requires External Certification Runbook evidence, source gates, Today desktop/mobile/browser QA, campaign provider smoke where enabled, target deploy evidence, and production-host smoke |
| 1.25 | July 2, 2026 | Clarified Pricing Integrity validation report: January 2026 ready-for-testing and external-review lock labels are historical evidence only, not current release approval; current approval still requires External Certification Runbook evidence, source gates, authenticated desktop/mobile editor price-change QA, public menu and PDF artifact QA, cache/deploy evidence for published price changes, target deploy evidence, and production-host smoke |
| 1.24 | July 2, 2026 | Clarified Continuous Menu Intelligence residual validation verdicts: January 2026 ready-for-testing, ship-ready, production-quality-gate, and deploy/SMB-testing labels are historical evidence only, not current release approval; current CMI approval still requires External Certification Runbook evidence, target feature-flag review, scoped `menulist-qa` deploy evidence, scheduler behavior checks, and browser/device QA where CMI surfaces are used |
| 1.23 | July 2, 2026 | Clarified Staff Prompt validation/code-review docs: January 2026 source-validation and review notes are historical evidence only, not current testing, deploy, SMB-testing, ship-ready, or production approval; current release approval still requires External Certification Runbook evidence, `verify:staff-prompt-runtime`, authenticated desktop/mobile Today QA with an eligible target-store `staffPrompt`, target deploy evidence, and production-host smoke |
| 1.22 | July 2, 2026 | Clarified Description Generation production-audit score table: the March 2026 overall score is historical code-audit evidence only, not current launch certification; approval still requires External Certification Runbook evidence, AI accounting/source gates, provider smoke, browser/mobile editor QA, target deploy evidence, and production-host smoke |
| 1.21 | July 2, 2026 | Clarified legacy Physical Surfaces docs: January 2026 campaign-based recommendation-card code review, validation, and marketing evidence is not current production/deploy/launch approval; Menu Kit remains canonical for identity surfaces, and current active physical/print output approval still requires External Certification Runbook evidence, menu-card-export source gate, Digital Menu Output Constitution checks, browser/mobile output QA, visual print artifact review, target deploy evidence, and production-host smoke |
| 1.20 | July 2, 2026 | Clarified Menu Card Export test cases: June 2026 automated-gate and real-data runtime evidence is not current release approval; approval still requires External Certification Runbook evidence, Digital Menu Output Constitution checks, authenticated desktop/mobile browser QA, visual PDF/print-shop artifact review, AI advisor provider smoke where enabled, target deploy evidence, and production-host smoke |
| 1.19 | July 2, 2026 | Clarified Menu Correctness Engine spec: current runtime flag is active (`ENABLE_MCE: true`), February 2026 ChatGPT production-ready rating is historical external-review evidence only, and current launch approval still requires External Certification Runbook evidence, public-business-truth source gate, browser/mobile save and publish-gate QA, customer-facing surface smoke, target deploy evidence, and production-host smoke |
| 1.18 | July 2, 2026 | Clarified Menu Card Export validation report: June 2026 route, cost, authenticated demo-runtime, and artifact evidence is not current launch certification; approval still requires External Certification Runbook evidence, Digital Menu Output Constitution checks, authenticated desktop/mobile browser QA, visual PDF/print-shop artifact review, AI advisor provider smoke where enabled, target deploy evidence, and production-host smoke |
| 1.17 | July 2, 2026 | Clarified strategy docs: five-year vision, complete feature spec, 2026 product strategy, and market-research scope notes are historical strategy/source evidence, not current launch certification; approval still requires External Certification Runbook evidence, current source verifiers, browser/mobile QA, provider/deploy evidence where relevant, and production-host smoke |
| 1.16 | July 2, 2026 | Clarified root docs, legacy Projects editor docs including auto-save, and historical development-done ledgers: active documentation maps and historical implementation notes are not current launch certification; approval still requires External Certification Runbook evidence, browser/mobile editor QA, publish/cache evidence, target Firestore write observation, upload/extraction/provider smoke, current security source review, deploy evidence, and target-environment smoke |
| 1.15 | July 2, 2026 | Clarified auth-onboarding documentation: auth, onboarding, first-payment, Firebase cost, and desktop-first mobile support evidence are not current launch certification; approval still requires External Certification Runbook evidence, auth browser/API smoke, Razorpay sandbox evidence, Firebase Auth custom-claims evidence, mobile onboarding/payment QA, and target deploy smoke |
| 1.14 | July 2, 2026 | Clarified Network Status Monitoring documentation: November 2025 implementation evidence is not current launch certification; release approval still requires External Certification Runbook evidence, browser/device QA for offline and slow-network behavior, target-shell smoke, and deploy evidence |
| 1.13 | July 2, 2026 | Clarified client-menu documentation: menu-output spec and implementation evidence are not current launch certification; client-menu approval still requires External Certification Runbook evidence, Digital Menu Output Constitution checks, device/browser QA, public cache/deploy evidence, and target production smoke |
| 1.12 | July 2, 2026 | Clarified Continuous Menu Intelligence validation report: January 2026 ChatGPT/spec validation is historical evidence only, not current release approval |
| 1.11 | July 2, 2026 | Clarified historical security/trust docs: November 2025 page-build and security-audit notes are evidence only, not current launch certification |
| 1.10 | July 2, 2026 | Clarified ops and messaging secret setup docs: Telegram and WhatsApp active commands are QA-first and production repeats require QA evidence plus explicit production secret approval |
| 1.9 | July 2, 2026 | Clarified owner Gemini rotation handoff: optional rotation keys are QA-first and production repeats require QA evidence plus explicit production secret/deploy approval |
| 1.8 | July 2, 2026 | Clarified feature flag checklist rows in launch prerequisites and owner action items: launch requires source-state review plus target evidence, not blanket flag activation |
| 1.7 | July 2, 2026 | Clarified launch prerequisite secret setup: top-level Telegram and SMTP instructions now use QA-first Firebase Functions secret commands before production approval |
| 1.6 | July 2, 2026 | Clarified environment handoff boundaries in the dev/prod guide: Vercel setup uses canonical env templates and Functions secrets are QA-first before production approval |
| 1.5 | July 2, 2026 | Clarified feature flag launch boundaries in the environment and ops guides: source flags require target evidence and External Certification Runbook gates before production use |
| 1.4 | July 2, 2026 | Clarified `production-testing-guide.md` as a companion manual spot-check guide only; active launch authority remains the External Certification Runbook and audit evidence |
| 1.3 | July 1, 2026 | Added external certification runbook link for Firebase deploy, mobile/browser QA, provider smoke, batch worker, and production-host gates; replaced broad Functions deploy checklist wording with Gate 1 preflight and scoped deploy evidence; launch verdict now requires external gate evidence |
| 1.2 | May 24, 2026 | Added SAFE_MODE pre-production verification requirement and launch blocker |
| 1.1 | May 24, 2026 | Added pre-production Cloud Billing export to BigQuery requirement and post-launch billing review check |
| 1.0 | February 20, 2026 | Initial checklist from ChatGPT review |
