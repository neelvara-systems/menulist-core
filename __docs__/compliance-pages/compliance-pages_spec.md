# Compliance Pages — Product Specification

**Status:** Runtime implemented source evidence; not current launch or legal certification
**Version:** 1.5
**Date:** July 16, 2026
**Audience:** CEO, PM, Clients
**Local Source Gate:** `npm run verify:compliance-pages-boundary`

> **Launch boundary:** Not current launch certification or deploy approval. This specification is source-gated product and current-runtime evidence only. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:compliance-pages-boundary`, browser custom-domain smoke for `/privacy`, `/terms`, and `/refund`, authenticated desktop/mobile owner save/reset QA, owner/legal review of final generated or custom policy text, DNS/custom-domain verification, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

## Current Release Boundary (July 16, 2026)

This spec records the product boundary and current source-backed behavior for Compliance Pages. It is not production-launch approval and it is not legal approval of the generated policy text.

Current release approval routes through:

- the active production-readiness audit and External Certification Runbook;
- `npm run verify:compliance-pages-boundary`;
- browser custom-domain smoke for `/privacy`, `/terms`, and `/refund`;
- authenticated desktop and mobile owner save/reset QA;
- owner/legal review of final generated or custom policy text before relying on it for verification;
- target Firebase deploy evidence where Firestore rules, indexes, Storage rules, or Cloud Function logic change;
- target Vercel deploy evidence where app routes, middleware, or public renderers change;
- production-host smoke for the target tenant/domain.

The local source gate does not replace custom-domain browser smoke, DNS/Vercel domain verification, Firebase deploy evidence, Vercel deploy evidence, owner/legal copy review, or production-host runtime verification.

---

## 1. Problem Statement

Businesses connecting their custom domain (e.g., `joespizza.com`) to MenuList need `/privacy` and `/terms` pages on the same domain for:

- **Meta Business Verification** — requires privacy policy on root domain
- **Google verification** — expects accessible policy pages
- **Payment provider compliance** — requires terms accessible on the business domain
- **Professional completeness** — domain without legal pages looks unfinished

Without this, businesses either:
- Don't connect their domain (MenuList loses infrastructure position)
- Keep their old website alongside MenuList (OBP becomes secondary)

---

## 2. Solution

Auto-generated privacy, terms, and refund/cancellation pages served at fixed routes on any MenuList-powered domain:

- `abc.com/privacy` — Privacy Policy
- `abc.com/terms` — Terms & Conditions
- `abc.com/refund` — Refund & Cancellation Policy
- `brand.menulist.ai/privacy` — Same pages on subdomain

**Key principle:** These are **compliance artifacts**, not product surfaces. They must be invisible, boring, and impossible to misuse.

---

## 3. Scope

### In Scope (v1)
- Auto-generated Privacy Policy from store data
- Auto-generated Terms & Conditions from store data
- Auto-generated Refund & Cancellation baseline that does not invent business-specific eligibility windows or processing promises
- Plain-text custom override option
- Footer links on OBP page
- SSR rendering for verification bots
- "Last Updated" / "Effective Date" display
- Dual-entity clause (Business + MenuList as platform)

### Out of Scope (Permanent)
- About page (Trojan horse for CMS — rejected)
- Page builder / layout editor
- Rich text / formatting for custom content
- Cookie consent banners
- GDPR toggles / region selection
- Additional owner-created pages beyond the three fixed compliance routes
- Navigation menus
- SEO editing / meta customization
- Translation of compliance pages

---

## 4. User Stories

### US-1: Auto-Generation
**As** a business owner with a custom domain,
**I want** privacy, terms, and refund pages to exist automatically,
**So that** I can pass Meta/Google verification without any effort.

### US-2: Custom Override
**As** a business owner with specific legal requirements,
**I want** to paste my own reviewed compliance text,
**So that** it appears before the non-removable MenuList baseline and platform disclosure.

### US-3: Reset to System Default
**As** a business owner who previously pasted custom text,
**I want** to reset back to the auto-generated version,
**So that** I don't need to maintain the content myself.

### US-4: Verification Bot Access
**As** a Meta/Google verification bot,
**I want** to access `/privacy`, `/terms`, and `/refund` without authentication,
**So that** domain verification passes successfully.

---

## 5. Feature Behavior

### 5.1 Generation Trigger
- System content is generated from current store identity data on each server render; only owner overrides are persisted.
- The optional override read uses a tagged 60-second cache and save/reset invalidates `compliance-store-{sId}`.
- Override persistence is server-only: direct Firestore reads/writes are denied, and every Admin read/mutation proves the expected tenant/store scope.
- `"system"` means baseline only; `"custom"` means owner text first plus the non-removable baseline.
- Effective/updated dates use the store modification timestamp when available, otherwise the versioned template effective date. They do not change merely because a visitor reloads the page.

### 5.2 Required Store Data (for generation)
- Business name (required)
- At least ONE contact method: email OR phone (required — blocks generation if missing)
- Address (optional, used if available)
- Country (optional, defaults to India)

### 5.3 Footer Links on OBP
- Small, subtle footer links: `Privacy · Terms · Refund`
- Positioned after existing "Official Page · Powered by MenuList" text
- Not prominent — compliance artifacts, not navigation

### 5.4 Custom Override Rules
- Plain text only — no HTML, no links, no formatting
- Maximum 15,000 characters
- Sanitized on save (strip HTML, scripts, normalize whitespace)
- Shows warning: "You are responsible for this content"
- System does NOT validate legal correctness
- Custom text does not replace MenuList baseline policy and platform-disclosure content.

### 5.5 Single Language
- Pages rendered in English only (default language)
- No translation — compliance artifacts stay single-language

---

## 6. Template Content Structure

### Privacy Policy Sections (Fixed)
1. Introduction (dual-entity: business + MenuList)
2. Information We Collect (passive only — OBP has no forms)
3. How Information Is Used
4. Data Sharing
5. Third-Party Services (WhatsApp, Google Maps, etc.)
6. Data Retention
7. Security (soft language — "reasonable measures")
8. User Rights (generic — contact business)
9. Contact Information
10. Platform Role Disclosure
11. Disclaimer ("informational purposes")

### Terms & Conditions Sections (Fixed)
1. Acceptance of Terms
2. Nature of Service (informational page, not transactional)
3. Accuracy Disclaimer (menu/prices may change)
4. Availability Disclaimer
5. Third-Party Links
6. Limitation of Liability
7. Changes (info may change without notice)
8. Governing Law (country-level only)
9. Contact Information
10. Platform Role Disclosure
11. Disclaimer

### Refund & Cancellation Sections (Fixed)
1. Business-owned purchase/cancellation scope
2. Public-page non-transactional boundary
3. No invented refund window, eligibility rule, or processing promise
4. Business contact and processing responsibility
5. MenuList platform-role disclosure
6. Governing law and legal-review disclaimer

---

## 7. Hard Constraints (Permanent)

1. **No About page** in v1 — high risk of CMS creep
2. **No page builder** — ever
3. **No rich text editor** — ever
4. **No additional pages** beyond privacy, terms, and refund
5. **No navigation menus** on compliance pages
6. **Max 1 compliance doc per store** — uniqueness enforced
7. **No AI generation** — pure template substitution
8. **No analytics** on compliance pages
9. **No versioning UI** — internal version tracking only
10. **No SEO editing** — not a content surface

---

## 8. Success Metrics

- % of stores with custom domain that pass Meta verification
- % of domain connections completed (before vs after)
- Zero support tickets about missing privacy/terms pages

The public override path uses a tagged 60-second cache; this is a performance boundary, not a promise that owner/legal changes can skip production smoke.
