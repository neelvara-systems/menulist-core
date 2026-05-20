# MenuList Public Draft Onboarding Strategy Review

**Date:** May 20, 2026  
**Status:** Strategy review and tracking document  
**Scope:** Website onboarding, WhatsApp/messaging onboarding, pricing entry, starter access, public URL lifecycle, dashboard gating, abuse/cost controls  
**Source input:** User-provided ChatGPT conversation about MenuList onboarding and public draft strategy

---

## 1. Executive Verdict

The pasted ChatGPT direction is **mostly correct at the strategy level**, but it is **not safe to adopt as-is**.

The strongest idea is:

> MenuList should create public proof before payment, then convert that proof into paid operational permanence.

The biggest correction is:

> Public proof must be created only after verified identity and hard cost controls. It must use one permanent public identity and one controlled starter workspace, not anonymous unlimited public drafts and not the full paid dashboard.

Final recommended model:

> **Verified public starter activation. Paid operational control. Same URL forever.**

This is not a normal free trial, not a freemium plan, and not a private SaaS preview. It is a controlled onboarding state where a business becomes publicly live enough to feel real, while expensive operations and full dashboard capabilities stay gated.

---

## 2. What I Validated

### Repo Evidence Checked

- `__docs__/messaging-onboarding/README.md`
- `__docs__/messaging-onboarding/messaging-onboarding_spec.md`
- `__docs__/messaging-onboarding/messaging-onboarding_firebase.md`
- `__docs__/public-menu-entry/public-menu-entry_spec.md`
- `__docs__/main-website/main-website_content.md`
- `__docs__/strategy/pricing-strategy.md`
- `src/app/(website)/create-menu/CreateMenuClient.tsx`
- `src/app/api/public/create-menu/route.ts`
- `src/app/api/public/create-menu/claim/route.ts`
- `src/lib/onboarding/createTenantStore.ts`
- `src/data/PlatformPlansList.ts`
- `src/components/website/pricing-pages/PlanCard.tsx`
- `src/components/website/pricing-pages/OnboardingModal.tsx`
- `src/components/templates/main-app/dashboard/index.tsx`
- `src/components/templates/main-app/projects/index.tsx`
- `src/components/templates/main-app/billing/NoSubscriptionView.tsx`

### Market Evidence Checked

- DataReportal says India had **1.03 billion internet users** at the end of 2025 and Instagram had **481 million users** in India in late 2025: https://datareportal.com/reports/digital-2026-india
- Meta cites a Kantar 2025 study saying **91% of online adults in India chat with a business weekly**: https://about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/amp/
- ChartMogul's 2026 conversion report says AI has made free-user support more expensive, free trials are more common than freemium, median free-to-paid conversion is 8%, and the free-trial-vs-freemium question is incomplete without signup rate: https://chartmogul.com/reports/saas-conversion-report/

Market conclusion: the external data supports a WhatsApp, Instagram, QR, and public-link distribution strategy. It does **not** justify uncontrolled free AI usage or anonymous public draft generation.

---

## 3. Current MenuList Reality

### What Already Exists

MenuList already has pieces of the proposed model:

1. **Messaging onboarding already supports public publish before payment.**
   - Docs define WhatsApp/messaging onboarding as menu upload -> preview -> approval -> live MenuList presence.
   - It creates tenant, store, project, public URL, and claimable dashboard account.
   - It explicitly does not require payment before publish.

2. **Website `/create-menu` now supports upload-before-auth with controlled cost gates.**
   - Upload and preview happen before account creation; public claim/publish still requires Google auth.
   - It supports image-only upload, not PDF/link/multi-image.
   - It creates a 24-hour token draft, then claim converts it into tenant/store/project.

3. **Pricing already has Starter, Pro, Premium in code.**
   - Runtime plan data has Starter/Pro/Premium.
   - Old pricing strategy docs still say "No free. No basic. No starter." That is stale and now conflicts with runtime and current strategy.

4. **Dashboard access is currently subscription-gated in important screens.**
   - Dashboard redirects to billing when there is no valid subscription.
   - Projects screen shows `NoSubscriptionView` without valid subscription.
   - This means the current app does not yet have the proposed calm starter workspace mode.

### Main Inconsistency

The repo currently has three partially conflicting onboarding models:

| Surface | Current Model | Conflict |
| --- | --- | --- |
| Website pricing onboarding | Business details -> Google auth -> Razorpay subscription | Pay/account first, not public proof first |
| Website `/create-menu` | Upload before account -> 24h token preview -> Google auth -> claim/publish 7-day starter activation | Now aligned with public proof before payment while keeping claim identity gated |
| WhatsApp/messaging onboarding | WhatsApp verified upload -> preview -> live publish -> claim/pay later | Closest to public proof model; May 2026 implementation aligns claimed publish with 7-day starter activation while keeping 24h session expiry |

This must be unified before implementation. Otherwise owners will experience different truths depending on where they start.

---

## 4. Point-by-Point Review Of The ChatGPT Conversation

| ChatGPT Point | Verdict | MenuList Decision |
| --- | --- | --- |
| Use "controlled hype" | **Revise** | The underlying idea is visible proof, but MenuList should not use hype internally or externally. Use "public proof loop" or "starter activation". |
| Do not market as "AI menu tool" | **Accept** | Correct. MenuList should be sold as one official customer link/source, not as AI generation software. |
| Upload current menu -> one link for QR, WhatsApp, Google, screens, repeat customers | **Accept with precision** | Strong positioning. Current website docs already align with upload -> review -> publish one trusted version. |
| Free entry, cost capped | **Accept** | Correct, but "free" must mean controlled starter activation, not open-ended freemium. |
| No public "No account needed" hero promise | **Accept** | Current website content already says avoid "no account needed" and use "Free to start. You review before publishing." |
| Activation is 2+ customer surfaces in 7 days | **Accept with measurement caution** | This is the right north-star activation metric. Track MenuList-observable actions and owner-confirmed external placement; do not pretend we can verify Instagram/Google placement unless integrated. |
| Transformation demos should drive growth | **Accept** | Strong GTM direction. Show current broken menu -> official customer source. Avoid AI-first demos. |
| Win one city/cluster first | **Accept as GTM experiment** | Strong for local proof density. Not a product architecture requirement, but useful for go-to-market. |
| Founder setup free for first 100/500 | **Accept with guardrails** | Works as CAC if owner publishes and shares. Must cap revisions, AI operations, and manual labor. |
| Payment after belief | **Accept** | SMB owners need to see their own menu. Payment should preserve continuity, not unlock abstract features. |
| Private preview only is safer but weaker | **Accept** | Correct. Private preview suppresses public distribution. But fully public anonymous drafts are not acceptable either. |
| Public draft before payment | **Accept after verification** | Upload/preview can happen before identity. The real public starter URL appears before payment but only after Google or WhatsApp identity and rate limits. |
| 7-day public draft | **Revise** | Seven days is better than 24 hours for business adoption, but it should be a starter activation window, not a SaaS "trial" framing. Need lifecycle and cleanup rules. |
| Do not hard-404 after expiry | **Accept** | Expired unpaid pages should become a lightweight holding/recovery state, not a broken link. |
| No full dashboard before payment | **Accept with update** | Do not expose full dashboard. But one real workspace with starter mode is better than a separate app right now. |
| Separate public proof from operational control | **Accept** | This is the core architectural rule. |
| Separate setup workspace | **Revise** | Clean theoretically, but likely too much complexity now. Use the existing workspace/dashboard shell with starter-mode capability gating. |
| One dashboard with limited access | **Accept** | Correct for current stage. But hide non-relevant surfaces instead of showing many disabled lock states. Enforce gating server-side. |
| Free plan for 7 days, then Pro/Premium | **Revise** | "Free setup" should not be a subscription plan. It should be an onboarding state. Paid plans are Starter/Pro/Premium. |
| Draft URL must become permanent URL | **Accept** | Non-negotiable. QR, WhatsApp, Instagram, and Google links must not change after payment. |
| Generate real final subdomain during draft | **Accept with namespace controls** | Correct, but current slug generation is business-name only and collision fallback is storeId suffix. Need locality-aware slug reservation before scaling this model. |
| Do not add separate phone onboarding because Google and WhatsApp exist | **Accept** | Correct. We need phone/contact fields, not a third auth system. WhatsApp identity and Google login are enough for now. |
| Collect business info after preview/auth, not before upload | **Accept** | Upload and extraction now happen before auth; business details are collected only when the owner signs in to claim/publish. |
| WhatsApp should initiate, web should finalize | **Accept** | Already matches messaging docs: messaging is intake only; dashboard handles management after publish. |
| Analytics should stay simple in draft | **Accept** | Show reassurance signals only: opens, scans, shares. No analytics suite before payment. |
| Pricing should be operational responsibility, not feature checklist | **Accept** | Starter = continuity, Pro = presentation/customer experience, Premium = multi-location governance. |
| AI enhancements need credit separation | **Accept** | Important. Current credit pack exists, but public copy still risks overpromising generated images/descriptions/translations as automatic/unlimited. |

---

## 5. Final Recommended Onboarding Model

### Name

Use internally:

> Starter Activation

Use owner-facing language:

> Free to start. Review before publishing.

After the public page is live:

> Keep your official menu live and updated.

Avoid:

- Free forever
- Freemium
- Trial version
- AI menu generator
- Dashboard trial
- Upgrade to unlock everything

### Product Model

| State | Owner Meaning | System Meaning |
| --- | --- | --- |
| `preview_created` | "MenuList understood my menu." | Identity verified, extraction done, token/private preview available. |
| `starter_active` | "My official menu is live enough to share." | Permanent slug/public URL exists, QR works, limited controls, unpaid. |
| `payment_pending` | "I already shared it; now I need to keep it active." | Starter page has usage/distribution signals or expiry nearing. |
| `active_paid` | "MenuList is now my operating menu source." | Paid subscription active, full allowed plan capabilities. |
| `starter_expired` | "This page was not finalized." | Public URL becomes lightweight holding/recovery page; owner can reactivate/pay. |
| `archived` | "This dead draft is gone." | Cleanup after retention window; namespace may become reclaimable if unpaid. |

Exact enum names should follow existing project conventions during implementation. The lifecycle itself is the decision.

---

## 6. Exact User Journeys

### A. Website Upload Journey

Recommended near-term flow:

1. Owner lands on homepage or `/create-menu`.
2. CTA: **Upload your menu**.
3. Owner selects an image/PDF/link depending on supported scope.
4. AI extraction runs with SAFE_MODE, IP rate limits, file validation, and 24-hour draft TTL.
5. Owner sees structured preview and customer-page preview.
6. Owner signs in only when ready to continue setup.
7. Owner confirms minimum business details:
   - Business name
   - City/locality
   - Business category
8. MenuList reserves/creates the permanent public slug.
9. Owner confirms contact basics before starter publish:
   - Public phone or WhatsApp number
   - Address or address line
   - Hours if available
10. MenuList creates `starter_active` public page:
    - Same permanent URL that survives payment
    - Same QR that survives payment
    - MenuList attribution visible
11. Owner enters limited starter workspace:
    - Menu corrections
    - Business basics
    - QR download
    - Copy link
    - WhatsApp share
    - Instagram/Google helper checklist
12. Payment message: **Keep your official menu live and updated.**
13. After payment:
    - Same workspace
    - Same public URL
    - Full plan capabilities appear according to Starter/Pro/Premium.

### B. WhatsApp / Messaging Journey

Recommended flow:

1. Owner sends menu photos or PDF to MenuList WhatsApp.
2. WhatsApp identity is treated as verified enough for intake.
3. MenuList extracts menu and business basics.
4. Owner receives preview.
5. Owner approves.
6. MenuList creates live starter public presence.
7. Owner receives:
   - Public URL
   - QR/share prompt
   - Dashboard claim link
8. WhatsApp tunnel closes for editing/support.
9. Owner claims dashboard through existing claim flow.
10. Owner sees starter workspace, not the full paid dashboard.
11. Payment preserves the already-live public presence.

Important: do not add another phone OTP onboarding layer on top of WhatsApp. That creates auth fragmentation.

### C. Pricing Page Journey

Recommended flow:

1. Pricing page should show paid plans as operational stages:
   - Starter: keep one official menu live and current.
   - Pro: improve presentation and customer-facing quality.
   - Premium: control multiple locations.
2. Pricing page can mention:
   - **Free setup:** upload and review before activating.
3. Free setup should not sit as a fourth plan card equal to paid plans.
4. If an owner chooses a paid plan first, continue current Google/Razorpay path, but simplify pre-payment data collection.
5. Do not ask business day-end time in the first pricing modal unless it is critical to payment setup. It is operational configuration and should move later.

---

## 7. When To Collect Each Field

| Field | Recommended Stage | Reason |
| --- | --- | --- |
| Google identity | Before web AI extraction in current cost-safe version | Prevents anonymous AI abuse. |
| WhatsApp identity | At first WhatsApp message | Already channel-verified. |
| Business name | After preview, before slug/public activation | Needed for slug and public identity; can be prefilled from extraction. |
| City/locality | After preview, before slug/public activation | Needed for duplicate-name handling and local trust. |
| Business category/type | After preview, before public activation | Needed for menu defaults, copy, and plan relevance. |
| Public phone/WhatsApp number | Before public activation | Needed for customer-facing page and recovery. |
| Address/addressLine | Before public activation if available; otherwise ask softly | Supports official page and search trust. |
| Hours | Before or shortly after public activation | Valuable but should not block publish when missing. |
| Owner/manager/staff/agency role | Before dashboard claim or payment | Helps recovery and ownership disputes. |
| Business day end time | After payment or during analytics setup | Too abstract for first activation. |
| Social links | During distribution checklist | Should support sharing, not block activation. |
| Staff/team/integrations/custom domain | After payment | Operational controls, not first proof. |

---

## 8. Starter Workspace Rules

Use the real dashboard/workspace foundation, but create a starter mode.

### Visible Before Payment

- Public menu preview
- Basic menu corrections
- Item/category hide, reorder, and price/name fixes
- Business name, address, hours, phone
- Public URL
- QR download
- WhatsApp share action
- Instagram bio helper
- Google Business helper
- Minimal signals: opens, scans, shares if already tracked cheaply

### Hidden Or Blocked Before Payment

- AI image generation
- Repeated extraction/regeneration loops
- PDF/export packs
- Advanced analytics
- Custom domain
- Multi-location
- Integrations
- Automation
- Bulk operations
- Team permissions
- Advanced branding

### UI Rule

Do not show a sidebar full of disabled locked features. Starter workspace should feel focused and calm, not like a cheap SaaS trial.

### Security Rule

Do not rely on frontend hiding. Every expensive or paid capability needs backend/API/DAL gating, quota checks, and tenant isolation.

---

## 9. URL, QR, And Namespace Decisions

### Non-Negotiable

The first public URL that the owner shares must be the same URL after payment.

Reasons:

- QR print must not break.
- WhatsApp links must not change.
- Instagram bio must not need replacement.
- Google Business link must stay stable.
- Customer bookmarks must keep working.

### Current Gap

The current web `/create-menu` flow uses a token preview first, then generates the subdomain at claim time. That is safe, but it is not the proposed permanent public starter model.

### Slug Rules Needed

Current shared creation uses `slugify(businessName)` and falls back to `businessName-storeId` on collision. For public starter activation, this is not enough.

Recommended slug strategy:

1. Prefer `business-name-locality` when city/locality exists.
2. Fallback to `business-name-city`.
3. Fallback to `business-name-storeId`.
4. Reserve unpaid starter slug for a limited window.
5. Release unpaid unused slug after expiry/archival.
6. Keep paid slug permanent.
7. Keep reserved system names blocked.

---

## 10. Public Draft Indexing Policy

Recommended:

- `preview_created`: noindex.
- `starter_active` with sufficient quality: indexable but conservative.
- `starter_active` low quality/spam risk: noindex.
- `starter_expired`: noindex holding/recovery page.
- `active_paid`: normal indexable public page if owner has not disabled public visibility.

Minimum quality before indexing:

- Business name present
- Locality or address present
- At least one valid category
- At least several valid menu items
- No obvious junk/spam extraction
- Public contact fields pass validation

---

## 11. Distribution Activation Metrics

Primary activation metric:

> Business has a permanent public MenuList URL and takes 2+ distribution actions within 7 days.

Track:

- QR downloaded
- Public link copied
- WhatsApp share started
- Instagram bio helper completed
- Google Business helper completed
- Public opens
- QR scans
- Return visit to starter workspace
- Payment after distribution action

Current implementation status:

- `starterActivationSignals.actions` on `stores/{storeId}` records low-cost starter actions from the create-menu success page, desktop Use MenuList, mobile Share, and desktop/mobile Presence Monitor.
- The signal contract lives in `src/lib/onboarding/starterActivation.ts`.
- Manual external placements are still owner-confirmed. `menuPresence` is the source for Google Business, Instagram Bio, and WhatsApp Profile confirmations; starter signal writes piggyback on the same store update.
- The dashboard starter banner now shows progress against the 2-action starter activation target.

Do not overclaim:

- Do not say Instagram bio was updated unless MenuList verifies it or owner explicitly marks it.
- Do not say Google Business was updated unless integration verifies it or owner explicitly marks it.

---

## 12. Pricing Architecture

Recommended hierarchy:

| Layer | Meaning | Notes |
| --- | --- | --- |
| Free setup / starter activation | Review and start public proof | Not a paid plan card; time/capability limited. |
| Starter | Keep one official menu live and current | Must feel complete for a normal one-location SMB. |
| Pro | Better presentation and customer-facing quality | Controlled AI credits, multilingual, stronger presentation. |
| Premium | Multi-location governance | Brand/outlet consistency and operations. |
| AI credits | Enhancement utility | Separate from core public truth infrastructure. |

Important correction:

Current website copy around generated images/descriptions/translations risks sounding automatic and unlimited. This should be tightened so AI enhancements are treated as controlled credits, not the core promise.

---

## 13. Abuse, Cost, And Security Controls

Required before scaling public starter activation:

1. Verified identity before public activation; upload/extraction must stay behind SAFE_MODE, IP limits, file validation, and TTL cleanup.
2. One active starter workspace per identity unless explicitly allowed.
3. Per-IP and per-identity rate limits.
4. Upload count and file-size limits.
5. Extraction retry caps.
6. No public activation if extraction quality is too low.
7. Storage TTL and cleanup.
8. Public cache invalidation on any store/project writes.
9. AI operation logging with cost attribution.
10. Server-side gating for paid capabilities.
11. Ownership recovery and transfer flow.
12. Abuse scoring for repeated junk uploads.

Current critical implementation gap to fix before expanding:

- Resolved in May 2026 starter-activation implementation: `src/app/api/public/create-menu/claim/route.ts` now revalidates `menu-store-{storeId}`, `store-{storeId}`, and `client-stores` after claim/publish writes.

---

## 14. Implementation Priority Plan

### P0 - Before Any Public Rollout

1. Define one shared onboarding lifecycle contract across website, pricing, and messaging onboarding. **Status: implemented as shared starter activation contract.**
2. Decide whether public starter activation is 24 hours or 7 days. **Status: 7 days selected for claimed starter activation; 24 hours remains only for unclaimed upload drafts/sessions.**
3. Add/confirm backend capability gates for starter vs paid workspace. **Status: starter workspace gating added in owner layout, sidebars, desktop redirects, mobile shell, and billing copy.**
4. Fix public cache invalidation in public-menu-entry claim path before scaling it. **Status: implemented.**
5. Create slug reservation rules that include locality/city. **Status: claim flow now pre-checks slug using business name + city/area.**
6. Replace "trial" language with starter activation language. **Status: website success, dashboard banner, and billing empty state updated.**
7. Align docs that currently conflict:
   - `__docs__/strategy/pricing-strategy.md`
   - `__docs__/public-menu-entry/public-menu-entry_spec.md`
   - messaging onboarding billing/activation docs
   **Status: actively aligned; historical docs retain 24-hour language only for unclaimed drafts/sessions.**
8. Clarify whether `/create-menu` should remain identity-before-upload or move to upload-before-auth. **Status: moved to upload-before-auth; starter activation still begins only after authenticated claim/publish.**

### P1 - Product Flow Buildout

1. Starter workspace surface inside current dashboard shell. **Status: implemented through starter access gating.**
2. Progressive navigation that hides paid complexity until relevant. **Status: implemented in desktop/mobile navigation gates.**
3. Distribution activation checklist. **Status: implemented through Use MenuList / Presence Monitor activation actions.**
4. Minimal starter signals: opens, scans, shares. **Status: partially implemented; link copy, QR download, menu kit download, native share, WhatsApp share-start, and owner-confirmed external placements are recorded. Public opens/scans remain on the existing public analytics layer, not yet joined into the store-level starter signal count.**
5. Expired starter holding/recovery page. **Status: implemented for public menu and OBP surfaces.**
6. Owner role capture: owner, manager, staff, agency.
7. Payment trigger copy: "Keep your official menu live and updated."

### P2 - Growth And Ops

1. Founder setup workflow for hand-picked businesses.
2. City/cluster pilot measurement.
3. Before/after demo content library.
4. Manual rescue queue for high-value failed extractions.
5. Ownership transfer support playbook.
6. Public indexing quality rules.

---

## 15. Decisions To Track

| ID | Decision | Status | Owner-Risk If Wrong |
| --- | --- | --- | --- |
| ONB-01 | Use public proof before payment | Recommended | Private SaaS funnel suppresses distribution. |
| ONB-02 | Require verified identity before AI/public activation | Recommended | Anonymous abuse and AI/Firebase cost leakage. |
| ONB-03 | Same public URL before and after payment | Required | QR/link continuity breaks if changed. |
| ONB-04 | Use one dashboard with starter mode, not separate onboarding app | Recommended | Separate app creates maintenance entropy. |
| ONB-05 | Hide paid complexity instead of showing many locked tabs | Recommended | Locked-feature clutter damages SMB clarity. |
| ONB-06 | Treat free setup as onboarding state, not a plan | Recommended | Free plan framing cheapens infrastructure value. |
| ONB-07 | Starter plan must be complete for one normal SMB | Required | Crippleware destroys trust. |
| ONB-08 | Separate public truth from AI enhancements | Required | Unlimited AI expectations create cost risk. |
| ONB-09 | Use locality-aware slug reservation | Required before scale | Generic slug squatting and duplicate business names. |
| ONB-10 | Track 2+ distribution actions in 7 days | Recommended | Upload/sign-up metrics optimize the wrong behavior. |

---

## 16. Cross-Check

### SMB Owner Check

Passes if the first experience feels like:

> My menu is becoming live for customers.

Fails if it feels like:

> I am learning software and configuring a dashboard.

The recommended model passes only if starter workspace stays small.

### End Customer Check

Passes if:

- Public URL works immediately after starter activation.
- QR remains valid after payment.
- Expired unpaid pages do not look broken or scammy.
- Customer page is fast, mobile-readable, and calm.

### Security/Cost Check

Passes if:

- AI extraction is identity-gated.
- Regeneration is capped.
- Public publish writes invalidate cache.
- Paid features are server-gated.
- Storage cleanup is automatic.

The current public-menu-entry claim path needs cache invalidation review before it becomes a scaled public-starter path.

### Mobile Check

Passes if:

- Entire flow works from phone.
- Upload/review/public activation does not require desktop.
- Starter workspace uses large touch targets and simple actions.
- WhatsApp handoff opens a mobile-friendly claim/setup path.

### Pricing Check

Passes if:

- Free setup is not a plan card.
- Starter solves a real one-location business.
- Pro is presentation/customer experience, not the first usable product.
- Premium is multi-location governance.
- AI credits are clearly separate from core public truth.

### Doctrine Freshness Check

Older doctrine saying "No free. No starter." should not control this decision anymore. Runtime plans, website copy, and messaging onboarding already moved beyond that. The durable principle to preserve is cost discipline, not pay-first onboarding.

---

## 17. Final Position

I would not implement the ChatGPT plan exactly.

I would implement this:

> **A verified starter activation flow where the owner sees their own menu, creates a permanent public URL and QR before payment, gets a tightly limited starter workspace, and pays to keep that public customer surface live and manageable.**

This gives MenuList the public distribution loop without exposing the full dashboard, unlimited AI costs, or unstable temporary URLs.

The strategic line to protect:

> MenuList should feel like a business becoming officially live online, not like someone signing up for software.
