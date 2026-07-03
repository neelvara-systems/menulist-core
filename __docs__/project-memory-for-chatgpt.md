# MenuList Project Handoff — Deep Memory Pack

**Owner:** New ChatGPT handoff
**Date:** 2026-05-18 (Asia/Kolkata)
**Repo:** `/Users/danny/Projects/MenuListAi/menulist-core`

This document is the single source memory for continuing this project in a new ChatGPT session.
It is built from current repository truth (implementation + docs), not from assumptions.

---

## 0) Executive Summary

MenuList is an **owner-relief public-business infrastructure** for SMBs, built as a **calm, default-authoritative system** that keeps customer-facing menu and business information synchronized across public surfaces from one controlled source.

It is not a “dashboard-first SaaS”, not a generic QR menu generator, and not an AI showcase. The design intent is: owner does not need to monitor daily; MenuList defaults to being correct, consistent, and quiet.

Primary value is delivered through:
- **Public truth infrastructure** (public menu + OBP + discovery metadata)
- **Multi-outlet/chain coherence**
- **Low-friction onboarding + publish path**
- **Trust by stability rather than complexity**

---

## 1) Why this project exists (and what it is trying to solve)

### 1.1 Core business pain
SMB public presence is fragmented:
- Different representations across WhatsApp PDFs, social links, QR menus, official pages, Google/business directories, and print links
- Frequent stale values (prices/hours/items) and mismatch across outlets
- Owners have low tolerance for operational complexity and repetitive maintenance
- SMB owners care less about “features” and more about “no surprises in public"

### 1.2 Product answer
- Define a **single operational source** (project/menu + business details) as the public canonical basis.
- Publish to multiple customer surfaces with controlled consistency.
- Keep owner actions minimal; use controlled defaults.
- Use confidence-safe behavior: if uncertain, stop and preserve trust rather than overact.

### 1.3 “Why this over others”
MenuList is positioned as a **public trust platform**, not merely a publishing UI.

---

## 2) Who it is for (SMB owner POV + secondary users)

### 2.1 Primary ICP
- Non-technical owners/operations leaders of SMBs who need dependable public-facing information.
- Owners already using a menu/project source and suffering mismatch across digital surfaces.
- Chain operators or multi-location teams with central governance + outlet specialization needs.

### 2.2 Secondary ICPs
- Staff/admin teams managing public-facing accuracy and support requests.
- Resellers/enablement teams onboarding multiple stores.
- Internal operators validating pricing, uptime, and consistency.

### 2.3 Owner success criteria (this should drive decisions)
1. Can owners understand the state in one look?
2. Can they correct an issue without retraining the system?
3. Can they trust that public outputs reflect official state?
4. Are manual steps reduced (not increased)?
5. Is there no need for repeated weekly cleanup by owner?

---

## 3) Product doctrine and governance (must obey)

### 3.1 Core doctrine files (highest authority after AGENTS)
- `__docs__/constitution/01-core-doctrine.md`
- `__docs__/constitution/02-language-governance.md`
- `__docs__/constitution/10-communication-worldbuilding-doctrine.md`
- `__docs__/constitution/12-product-separation-doctrine.md`
- `__docs__/constitution/17-infrastructure-compounding-doctrine.md`
- `AGENTS.md`

### 3.2 Non-negotiable behavioral frame
- **Default authority:** system behavior is primary, owners are exception handlers.
- **Silence > explanation:** no over-explaining public decisions.
- **No cognitive overload:** copy is owner-readable, short, operational.
- **Trust > engagement:** no feature spam.
- **No “I have to manage this” narrative.**

### 3.3 Language constraints
MenuList public/UI/support copy must avoid:
- “AI-powered”, “smart”, “optimized”, “dynamic”, “recommendations”, “best practices” framing
- Responsibility-shifting phrasing (“you should/you need to…”)
- marketing hype language disconnected from observable behavior

Use neutral/calm phrasing and canonical phrases from doctrine such as:
- “No action needed.”
- “Menu state is stable.”
- “Handled automatically.”
- “Everything is running normally.”

### 3.4 Why this matters for AI work
Every assistant pass must preserve the above laws when creating copy, UI labels, support language, website blocks, and claims.

---

## 4) Technical architecture (end-to-end)

### 4.1 High-level architecture pattern
Next.js App Router monorepo split by **route group + product + tenancy**:

- `src/app/(website)/`
  - Canonical public marketing website for MenuList (`menulist.ai`, alias domains).
- `src/app/(main)/`
  - Authenticated owner/admin app.
- `src/app/(global-pages)/`
  - Shared auth/public utility pages (signin/forgot-password/error pages used by owner flows).
- `src/app/client/[[...slug]]/`
  - Tenant/public rendering for menus, official pages, custom domain/subdomain routes.
- `src/app/(answerlattice)/` and `src/app/sites/answerlattice/`
  - Answerlattice route surface + marketing endpoint for `/sites/answerlattice` through domain routing.
- `src/app/api/`, `src/app/widget/`, `src/app/feedback/`, and utility roots such as `screen`, `manifest.webmanifest`.

### 4.2 Routing and domain strategy
Routing controlled in:
- `src/constants/productDomains.ts`
- `src/lib/multiTenant/domainResolver.ts`
- `src/middleware.ts`
- `src/constants/urls.ts`

Observed behavior:
- Product domain routing:
  - `answerlattice.com` and other configured product hosts route via middleware to `/sites/<productId>` through `productDomains.ts`.
  - In local dev, product prefixes such as `/__answerlattice/...` also resolve to `/sites/answerlattice/...`.
- Tenant routing:
  - `*.menulist.ai` and validated custom domains resolve to tenant mode and rewrite into `/client/...`.
  - Middleware injects tenant headers: `x-tenant-subdomain`, `x-tenant-custom-domain`, and `x-tenant-type`.
- Platform/website routing:
  - `menulist.ai`, `menulist.online`, and configured aliases are served in website context.
  - `app.menulist.ai` is part of platform host flow and enters owner app routing (via auth/layout behavior).
- Protection behavior:
  - Direct `/sites/*` hits are redirected in Vercel production.
  - Direct `/client` hits on platform hosts are redirected back to `/`.
- Middleware bypasses routing for asset/API/system paths to avoid unsafe rewrites (`/api`, `/_next`, `/__answerlattice`, `/sites`, etc.).

### 4.3 Security and header layer
- CSP, HSTS (env-sensitive), security headers, frame policy, referrer policy in middleware.
- API route and public route protections plus domain-aware cache behavior.
- Public client tenant routes include cache headers for public-menu/OBP responses.

### 4.4 Runtime layers
- **Owner surface:** React/Ant Design desktop + Redux state + SWR for data flows.
- **Public customer surface:** lightweight SSR/ISR behavior for menu pages and discovery files, plus schema + metadata generation.
- **Mobile parity:** Tailwind-driven mobile surfaces with dedicated mobile screens (no desktop-only hacks for mobile behavior).

---

## 5) Stack and execution constraints

### 5.1 Core stack (current package reality)
- Next.js 14.2.35, React 18.3.1, TypeScript 5.8.3 strict mode.
- Firebase client 11.7.3, root Firebase Admin 12.7.0, MenuList Functions Firebase Admin 13.5.0 / Firebase Functions 6.6.0, Answerlattice Functions Firebase Admin 12.7.0 / Firebase Functions 5.1.1, NextAuth 4.24.13.
- Ant Design 5.25.1 on desktop, Tailwind-driven mobile surfaces in the current desktop/mobile split.
- Redux Toolkit + Redux Persist, SWR, Sentry, Upstash, Zod.

### 5.2 Version policy
- AGENTS governs freeze/convention decisions. Runtime truth is the pinned `package.json` and lockfiles in the current branch.
- Do not introduce dependency/version changes unless required for security or explicit migration scope, and update `npm run verify:dependency-freeze` when the pinned runtime intentionally changes.

### 5.3 Local conventions and gotchas
- Use existing `react-icons/lu` patterns (no new icon libraries).
- Preserve client-side DAL-first patterns unless architecture demands server API.
- Feature flags in `src/config/features.ts` for runtime behavior rollouts.
- `npx tsc --noEmit --incremental false` + lint + route-level UI checks on substantive changes.

---

## 6) Data model and major collections

### 6.1 Canonical collections map (`src/constants/database.ts`)
- Tenancy and identity: `tenants`, `stores`, `platformSummary`
- Menu/project: `projects`, `files`, `menuSnapshots`, `menuIntelligence`, `menuItemState`, `menuChangeLog`
- Decision/quality: `decisionBlocks`
- Public output/support: `assets`, `campaigns`, `publicMenuDrafts`
- Discovery/infrastructure: `analytics`, `businessEntityIndex`
- Reliability/ops: `ops_config`, `systemAlerts`, `systemHealth`, `schedulerRunLogs`
- Feedback/trust: `reviews`, `reviewsState`, `guestFeedback`
- Multi-outlet: `masterOperationalState`, `ownerControlUsage`
- Commerce: `pricingPlans`, `subscriptions`, `subscription_payments`, `payment_transactions`, `topups`
- Integrations and sync: `integrations`, `posDeliveryQueue`, `integration*` namespaces in extension layers
- AI/ops helper collections: `menulistAiOperations`, plus `AI_OPERATIONS_COLLECTIONS` mapping in same module

### 6.2 Answerlattice separation
Canonical note:
- Answerlattice has isolated collections/configs (`ANSWERLATTICE_*`) and separate Firebase expectations.
- It must not be mixed with MenuList operational logic unless explicitly in cross-product routing context.

### 6.3 State correctness and cache discipline
- Public-facing mutations must consider cache invalidation for menu/store/client-store routes.
- Shared cache helpers exist under `src/lib/cache/` (`publicClientCache.ts` and `swrLocalStorageProvider.ts`).
- Any flow touching `projects`/`stores` public truth requires post-write consistency checks.

---

## 7) Feature system map (practical coverage)

### 7.1 Core public business surfaces and operations
- Client Menu (QR/menu) and public menu output
- Official Business Page (OBP)
- Search/discovery infrastructure (SEO/AEO, schema, structured outputs, discovery files)
- Menu correctness/quality systems
- Decision and quality intelligence surfaces in public browsing
- Digital screens and customer-facing media assets
- Reviews/reputation and feedback loops
- Multi-location consistency and outlet inheritance

### 7.2 Menu creation and management pipeline
- Upload/file intake
- Extraction (menu/text inference)
- Item/media generation (AI-assisted helpers)
- Translation and description handling
- Project management and special menu workflows
- Temporary status / visibility controls
- Communication kit and quick-capture outputs

### 7.3 Operations, trust, and governance
- Roles/permissions
- Authentication and onboarding
- Compliance and public safety settings
- OBP and compliance page editing
- Security and API protections
- Owner control telemetry and usage tracking
- Pricing/subscription integrity and payment surfaces

### 7.4 Expansion and roadmap surface areas already documented
- POS sync and webhook sync
- Multi-chain permissions
- Messaging onboarding
- Reseller workflows
- Predictive/collaborative support infrastructure (Answerlattice-facing parts)

### 7.5 Where feature docs live
The canonical feature inventory is in `__docs__/index.md`.
Use it when adding/modifying features; expected docs set: `_spec`, `_impl`, `_marketing`, `_website`, `_helpdoc`, `_firebase`, `_mobile-support`, and tests where relevant.

---

## 8) Public website architecture (marketing layer)

### 8.1 Canonical website route group
- `src/app/(website)/` with shared light theme + website providers.
- Homepage is composed in `src/components/website/home/HomePage.tsx`.
- Supporting pages exist for pricing, features, how-it-works, trust-security, multi-location, about, contact, legal.

### 8.2 Homepage section order (canonical)
1. Hero
2. Revenue Path
3. Interactive Workflow
4. Problem
5. Solution
6. Stats
7. Setup Relief
8. Surfaces
9. Search Discovery
10. Customer Browse
11. Analytics Insights
12. Smart Features
13. Prepared For You
14. Business
15. Industry
16. FAQ
17. Final CTA
18. Sticky CTA

### 8.3 Website messaging direction
- Not a feature dump. Sequence is: pain → transformation → proof → workflow → trust.
- Avoid generic QR/menu-only positioning.
- Use calm infrastructure language; no false certainty about external ranking.

### 8.4 Current docs set for website
- `__docs__/main-website/main-website_content.md`
- `__docs__/main-website/main-website_impl.md`
- `__docs__/main-website/main-website_spec.md`

### 8.5 SEO/AEO & discovery support
- Public discovery surfaces are in runtime and settings paths:
  - `src/app/manifest.webmanifest/route.ts`
  - `src/app/sitemap.ts`, `src/app/client/sitemap.ts`
  - `src/app/client/robots.ts`
  - `src/app/api/seo/route.ts`
- Website references discovery capability as positioning evidence without claiming guaranteed ranking outcomes.

### 8.6 Cross-check evidence updates
- Active route group map verified in `src/app` now includes: `(website)`, `(main)`, `(answerlattice)`, `(global-pages)`, `client`, `sites`, `api`, `feedback`, `widget`, `screen`, `manifest.webmanifest`, and utility roots.
- Homepage ordering is verified in `src/components/website/home/HomePage.tsx` as 18 sections (including `StickyCta`).
- Routing truth is verified against `src/middleware.ts`, `src/lib/multiTenant/domainResolver.ts`, and `src/constants/productDomains.ts`.
- Cache invalidation path is verified via `src/lib/cache/publicClientCache.ts` and `src/app/api/revalidate/menu/route.ts` (`menu-store-{id}`, `store-{id}`, `client-stores`).

---

## 9) Mobile and parity expectations

- Any owner-visible change must consider mobile parity if it affects owner flows.
- Public customer surfaces rely on responsive behavior and low-friction interaction.
- Use touch-size and simplified navigation constraints (45+ px touch guidance in governance).
- If touching desktop logic for owner flow, verify mobile analog and any inherited sheet behavior.

---

## 10) Security/compliance/security-adjacent contracts

- Routing and middleware security headers are not optional; changes must preserve tenant resolution and API protections.
- API-protected routes use authentication guards in practice.
- Tenant isolation and access checks are mandatory for reads/writes.
- Sensitive behavior (AI operations, payment, publishing) should be surfaced via feature flags and runtime logs.
- Avoid editing critical security files without reading security rules first: `middleware auth`, `firestore.rules`, and security helper modules.

---

## 11) Operational playbook for future ChatGPT sessions

### 11.1 Before changing anything
1. Confirm user intent (owner-facing/public-facing/internal) and pick relevant surface.
2. Open doctrine files first (`AGENTS.md`, `01-core-doctrine`, `02-language-governance`).
3. Check relevant `_impl` and `_spec` files before UI implementation.
4. Confirm whether feature flags are involved.
5. If public-facing behavior changes, check docs parity requirements.
6. Validate cache and tenant routing impact before finalizing.

### 11.2 Always check after change
- `npx tsc --noEmit --incremental false`
- `npm run lint`
- At least one route-level browser check for touched owner/public/public website pages.

### 11.3 If in doubt
- Default to source-of-truth behavior over marketing embellishment.
- Preserve calm architecture; reduce decision surfaces for owners when possible.

---

## 12) Concrete file map (start here in any new session)

### 12.1 Governance + workflow (first open)
- `AGENTS.md`
- `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md`
- `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md`
- `__docs__/constitution/01-core-doctrine.md`
- `__docs__/constitution/02-language-governance.md`
- `__docs__/index.md`

### 12.2 Routing and architecture
- `src/middleware.ts`
- `src/lib/multiTenant/domainResolver.ts`
- `src/constants/urls.ts`
- `src/constants/productDomains.ts`

### 12.3 Public + website
- `src/app/(website)/layout.tsx`
- `src/app/(website)/page.tsx`
- `src/components/website/home/HomePage.tsx`
- `src/components/website/shared/WebsiteHeadline.tsx`
- `__docs__/main-website/main-website_content.md`
- `__docs__/main-website/main-website_impl.md`

### 12.4 Tenant/public render
- `src/app/client/[[...slug]]/page.tsx`
- `src/app/client/[[...slug]]/MenuNotFoundFallback.tsx`
- `src/app/client/[[...slug]]/MenuBreadcrumb.tsx`
- `src/components/templates/website/clientWebsite/*`
- `src/lib/schema/index.ts`

### 12.5 Feature execution and docs
- Corresponding feature folders under `__docs__/` (feature-specific `_spec/_impl/_helpdoc/_marketing/_website/_firebase/_mobile-support` directories)
- Related DAL/template paths in `src/lib`, `src/components/templates/main-app`, and mobile twin screens.

---

## 13) Non-technical narrative to reuse externally

When introducing this project to another agent or stakeholder, use this framing:

> “MenuList is infrastructure that keeps your public menu/business truth correct without requiring daily owner intervention.”

If they push toward “AI menu builder” or “analytics dashboard” language, correct course immediately.

---

## 14) Stage posture (current and validated)

This repo has already used staged website build-up:
1. Context synthesis
2. Strategy brief
3. Visual direction
4. Implementation
5. CRO/ refinement
6. Asset pipeline
7. Launch polish
8. Growth/iteration stages

The **canonical implementation now lives only in the active website route**, not in historical backup files.

---

If you need me to generate a split version for cross-account transfer, I can create:
- `project-memory-for-chatgpt-overview.md` (2–3 pages)
- `project-memory-for-chatgpt-technical.md` (stack + architecture)
- `project-memory-for-chatgpt-features.md` (feature-by-feature map)
