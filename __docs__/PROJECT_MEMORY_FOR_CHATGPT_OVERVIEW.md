# MenuList — Global Handoff Overview

**Use this file first when starting a new ChatGPT session.**

## 1) What this project is

MenuList is an owner-focused **public-business truth infrastructure** for SMBs, especially food businesses, whose practical goal is to keep customer-facing menu and business information correct across many channels with minimal owner effort.

This is **not** a generic QR menu builder, “AI restaurant software,” or a feature-heavy SaaS dashboard.  
The product is intended to behave as infrastructure: calm defaults, reliable propagation, low owner load.

## 2) What problem it solves

SMB owners commonly face:

- stale menu / business data across QR, public pages, social/links, and directories
- inconsistent multi-location content and naming
- manual operational drift that causes trust loss with customers
- low technical tolerance for maintaining multiple channels

MenuList addresses this with a controlled source model, publishing and propagation workflows, and default behavior that favors stability over noise.

## 3) Why this project matters

The positioning baseline is:  
**“Your public business truth stays correct when no one is watching.”**

That means:

- focus on correctness and consistency, not flashy feature growth
- reduce operational decisions required from non-technical owners
- make public outputs reliable by default

## 4) Who this is for

### Primary ICP
- Non-technical SMB operators who care about dependable public presence
- Team owners with one or more outlets needing consistent presentation

### Secondary ICP
- Outlet teams and staff handling day-to-day updates
- Resellers / onboarding operators
- Internal operations and support teams

## 5) Decision frame for every request

Use this order of truth:

1. Security/routing/data contracts (`AGENTS.md`, active rule files, domain routing, auth/isolation)
2. Product doctrine and language constraints
3. Existing docs/spec/impl
4. Runtime code
5. Runtime behavior on desktop + mobile + public surfaces

When unsure: reduce owner burden first, preserve trust first, only then optimize UX.

## 6) Current project posture

The website and content layer has already passed staged work:

- Context synthesis
- Strategy brief
- Visual direction
- Marketing implementation
- Refinement/CRO passes
- Asset and launch polish
- Post-launch planning direction

The active implementation is the main website route at `src/app/(website)` plus canonical tenant route behavior at `src/app/client/[[...slug]]`; historical backups are not source of truth.

## 7) Non-negotiables (high-level)

- Keep source-of-truth behavior ahead of marketing claims
- Never invent contract/API behavior not present in code/docs
- Preserve Answerlattice as separate product; never blur contracts
- Owner-side actions should be obvious, minimal, and recoverable
- Public-facing copy must remain factual and modest (no hype)

## 8) Quick reference map for continuation

- **Governance:** `AGENTS.md`
- **Product doctrine:** `__docs__/constitution/01-CORE-DOCTRINE.md`, `__docs__/constitution/02-LANGUAGE-GOVERNANCE.md`
- **Website docs:** `__docs__/main-website/main-website_spec.md`, `main-website_content.md`, `main-website_impl.md`
- **Architecture entry:** `src/middleware.ts`, `src/lib/multiTenant/domainResolver.ts`, `src/constants/productDomains.ts`
- **Routes:** `src/app/(website)/`, `src/app/(main)/`, `src/app/(global-pages)/`, `src/app/client/[[...slug]]/`, `src/app/(answerlattice)/`, `src/app/sites/answerlattice`

## 9) When to prioritize deep validation

Run these checks after substantive changes:

- `npx tsc --noEmit --incremental false`
- lint/build checks
- route-level/manual browser checks for touched desktop, mobile, and public pages
- cache/invalidation impact checks for public-facing writes

If you need a shorter handoff for external sharing, use this and only this file as the single seed document.
