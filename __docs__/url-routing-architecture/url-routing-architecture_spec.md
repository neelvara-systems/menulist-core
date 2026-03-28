# URL Routing Architecture — Business Specification

> **Audience:** CEO, PM, Product Team  
> **Last Updated:** February 19, 2026  
> **Version:** 2.0  
> **Status:** 🔒 LOCKED — Phase 1 + Phase 2 Complete

---

## What Is This Feature?

**One-liner:** Permanent, SEO-optimized URL infrastructure for every MenuList public page.

**Problem Solved:**

1. **Broken URLs** — When an owner renames a menu (e.g., "Food Menu" → "Lunch Menu"), the URL changes silently. QR codes, WhatsApp shares, and Google links break permanently.
2. **No brand URL for chains** — Multi-store chains have no single brand URL. Each outlet needs a separate subdomain.
3. **SEO dilution** — No CDN caching, no canonical URL enforcement, no reserved namespace protection.

**Solution:**

- Permanent stored slugs on every project (rename → old URL redirects automatically)
- Brand-level subdomain ownership (one URL for the brand, locations as paths)
- Reserved namespace preventing future platform conflicts
- CDN cache headers for global edge delivery

---

## Goals & Success Metrics

| Goal             | Metric                             | Target |
| ---------------- | ---------------------------------- | ------ |
| URL permanence   | QR codes resolve after rename      | 100%   |
| SEO authority    | Single canonical URL per page      | 100%   |
| Performance      | CDN cache hit rate on public pages | >80%   |
| Namespace safety | Reserved slugs blocked at creation | 100%   |

---

## Target Customers (ICP)

- **Primary:** Non-tech SMB owner with 1 store (95% of users)
- **Secondary:** Premium SMB groups with 2-10 stores (5% of users)

---

## Scope

### In-Scope (Phase 1 — Implemented)

- Permanent project slugs stored in `projectsSummary`
- Old slug → 301 redirect via `previousSlugs[]`
- Reserved slug namespace (`menu`, `reviews`, `feedback`, etc.)
- Auto-generated `outletSlug` on outlet stores
- CDN cache headers on public pages (`s-maxage=60, stale-while-revalidate=300`)
- `ENABLE_STORED_SLUGS` feature flag (default: ON)

### In-Scope (Phase 2 — Implemented Feb 19, 2026)

- Subdomain auto-assignment during onboarding (both manual + messaging flows)
- Subdomain settings UI in Business Settings (`SubdomainTab.tsx`)
- Subdomain availability checker API (`GET /api/subdomain/check`)
- Custom domain management via Vercel API (`POST/GET/DELETE /api/domain`)
- Custom domain settings UI (`CustomDomainTab.tsx`)
- Subdomain → custom domain 301 redirect (SEO consolidation)
- Lowercase + trailing slash URL normalization (middleware 301)
- Brand OBP for multi-store chains (`BrandOBPContent.tsx`)
- Outlet path routing (`brand.menulist.ai/pune/food-menu`)
- Subdomain uniqueness enforcement (pre-check + storeId suffix fallback)
- Firebase cost optimization (6 optimizations across all public surfaces)

### Out-of-Scope

- Public data API endpoints
- Pre-assembled render bundles (rejected — caching solves this)
- New Firestore collections for routing (rejected — existing collections sufficient)

---

## User Stories

### Story 1: QR Code Permanence

> As a restaurant owner, I want to rename my "Food Menu" to "Lunch Menu" without breaking the QR codes I already printed.

**Flow:** Owner renames project → old slug pushed to `previousSlugs[]` → customer scans old QR → 301 redirect to new URL → menu loads.

### Story 2: Reserved Namespace

> As a platform operator, I want to prevent owners from creating a project named "Reviews" so we can launch a reviews feature later.

**Flow:** Owner tries to create project "Reviews" → slug "reviews" is reserved → system auto-appends "-menu" → slug becomes "reviews-menu".

### Story 3: Multi-Store Brand URL (Phase 2)

> As a chain owner with 5 outlets, I want one link (`storypizza.menulist.ai`) that shows all my locations.

**Flow:** Customer visits `storypizza.menulist.ai` → Brand OBP shows location selector → customer taps "Pune" → navigates to `storypizza.menulist.ai/pune` → Pune outlet OBP.

---

## Business Rules

| Rule                      | Description                                                                    |
| ------------------------- | ------------------------------------------------------------------------------ |
| **Slug permanence**       | Once a slug is created, the old slug is preserved in `previousSlugs[]` forever |
| **Reserved namespace**    | 40+ reserved slugs blocked at project creation and rename time                 |
| **Brand-level subdomain** | Subdomain set on master store only. Outlets use `outletSlug` path segments     |
| **Single-store behavior** | Zero visible difference for single-store brands (95% of users)                 |
| **Backward compat**       | Projects without stored slugs fall back to `slugify(name)` matching            |

---

## Key Architecture Decisions

| ADR        | Decision                               | Rationale                                              |
| ---------- | -------------------------------------- | ------------------------------------------------------ |
| **ADR-1**  | Brand-level subdomain on master store  | Industry standard, SEO authority, brand cohesion       |
| **ADR-2**  | Subdomain stored at 3 levels           | Different access patterns (middleware, dashboard, API) |
| **ADR-3**  | Stored slugs on projectsSummary        | QR permanence, `previousSlugs[]` for 301 redirect      |
| **ADR-4**  | Reserved slug namespace (52 entries)   | Prevents future platform surface conflicts             |
| **ADR-5**  | Custom domain via Vercel API           | Auto-SSL, standard approach                            |
| **ADR-6**  | URL normalization at middleware        | SEO deduplication (lowercase + no trailing slash)      |
| **ADR-7**  | Onboarding parity (manual = messaging) | Identical data structures from both flows              |
| **ADR-8**  | CDN cache headers                      | ~80% cache hit, reduced Firebase reads                 |
| **ADR-9**  | Subdomain uniqueness pre-check         | Globally unique subdomains                             |
| **ADR-10** | Resolver reads projectsSummary         | 1 read vs N, slug field accessible                     |
| **ADR-11** | Outlet path routing via outletSlug     | Multi-store brand URL resolution                       |

See [url-routing-architecture_adr.md](./url-routing-architecture_adr.md) for full rationale.
