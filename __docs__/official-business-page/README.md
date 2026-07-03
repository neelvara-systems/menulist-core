# Official Business Page (OBP)

> **One official link for your business.**

The canonical public identity endpoint of a business powered by MenuList. This is NOT a website builder — it is the single default link a business shares everywhere.

---

## Quick Navigation

| Audience            | Document                                                                                      | Purpose                                                        |
| ------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| CEO / PM            | [Spec](./official-business-page_spec.md)                                                      | Business requirements, scope, user stories                     |
| Developers          | [Impl](./official-business-page_impl.md)                                                      | Technical blueprint, DB schema, file structure                 |
| Sales / Marketing   | [Marketing](./official-business-page_marketing.md)                                            | Pitch deck, messaging, sales scripts                           |
| Potential Customers | [Website](./official-business-page_website.md)                                                | Landing page content, SEO                                      |
| Existing Customers  | [Help Doc](./official-business-page_helpdoc.md)                                               | How-to guide, troubleshooting                                  |
| Cost Control        | [Firebase](./official-business-page_firebase.md)                                              | Reads/writes/deletes, cost estimates                           |
| Mobile              | [Mobile Support](./official-business-page_mobile-support.md)                                  | Mobile admission test, screen spec                             |
| 3-Year Freeze       | [Infrastructure Freeze Plan](./obp-infrastructure-freeze-plan.md)                             | ChatGPT deep review + BUILD/DEFER/REJECT verdicts              |
| Archive             | [ChatGPT Review](./_archive/chatgpt-review.md)                                                | Original conversation analysis                                 |
| Archive             | [ChatGPT Deep Conversation](./_archive/obp-conversastion.md)                                  | 14K-line gap analysis (10 gaps + 10 layers)                    |
| Archive             | [ChatGPT Owner Features Review](./_archive/chatgpt-review-session-march15-owner-features.md)  | Owner features + OBP strategy (corrected: ~20% accuracy)       |
| Archive             | [ChatGPT Distribution Audit](./_archive/chatgpt-review-session-march18-distribution-audit.md) | 25-section distribution/infrastructure audit (~25% actionable) |
| Archive             | [Code Feedback Audit](./_archive/code-feedback-audit.md)                                      | Code feedback review                                           |
| Archive             | [Validation Report](./_archive/official-business-page_validation.md)                          | Implementation verification (archived)                         |

---

## One-Liner

The official public identity page of a business — auto-generated, always live, and updated from store data.

## Problem Solved

Businesses share fragmented links (PDF, Zomato, Instagram, Google Drive) when customers ask for info. No single canonical link exists that shows identity + menu access + contact actions in one place.

## Solution

MenuList auto-generates an Official Business Page at the business's subdomain root (`joespizza.menulist.ai`). It shows business identity, live open/closed status, and a primary "View Menu" CTA that opens the existing digital menu. Updates instantly when store data changes.

---

## Architecture Overview

```
Two-Layer Model (PERMANENT):

Layer 1: Official Business Page (identity)     ← NEW
  └── "View Menu" button
       └── Layer 2: Digital Menu (consumption)  ← EXISTING (unchanged)

Routing:
  joespizza.menulist.ai/           → OBP (when ENABLE_OBP = true)
  joespizza.menulist.ai/menu       → Digital Menu (default project)
  joespizza.menulist.ai/{slug}     → Specific project menu
  joespizza.com/                   → OBP (custom domain, same behavior)

Data Source:
  stores collection → existing fields + new publicPresence object
  No new Firestore collections
```

---

## Key Files in Codebase

### Public OBP (9 files)

| File                                      | Purpose                                      |
| ----------------------------------------- | -------------------------------------------- |
| `src/app/client/obp/OBPContent.tsx`      | Main OBP async server component (~670 lines) |
| `src/app/client/obp/BrandOBPContent.tsx` | Multi-store brand OBP (location selector)    |
| `src/app/client/obp/OBPSkeleton.tsx`     | Loading skeleton                             |
| `src/app/client/obp/OBPMenuCTA.tsx`      | Menu CTA with OBP→menu conversion tracking   |
| `src/app/client/obp/OBPAnalytics.tsx`    | Client island for page view tracking         |
| `src/app/client/obp/OBPActions.tsx`      | Client component for action click tracking   |
| `src/lib/obp/publicLinks.ts`             | Public link safety boundary for OBP actions, socials, reviews, schema, manifest, and PWA handoffs |
| `src/app/client/obp/obp.module.scss`     | Styles (SCSS, mobile-first)                  |
| `src/app/client/obp/schema.ts`           | Schema.org LocalBusiness JSON-LD             |

### Libraries (2 files)

| File                            | Purpose                       |
| ------------------------------- | ----------------------------- |
| `src/lib/obp/hoursStatus.ts`    | Open/closed status calculator |
| `src/lib/obp/generateOBPUrl.ts` | URL generation helpers        |

### Dashboard (5 files)

| File                                                           | Purpose                                                |
| -------------------------------------------------------------- | ------------------------------------------------------ |
| `src/components/.../businessSettings/OBPLinkCard.tsx`          | Dashboard link card (copy link, copy message, dual QR) |
| `src/components/.../businessSettings/tabs/OfficialPageTab.tsx` | publicPresence settings (photos, reviews, identity)    |
| `src/database/stores/uploadOBPPhoto.ts`                        | OBP photo upload to Firebase Storage                   |
| `src/components/.../OwnerDashboard/OBPMetricsCard.tsx`         | Dashboard card showing OBP analytics                   |
| `src/components/.../OwnerDashboard/BehaviorNudgeCard.tsx`      | Link adoption nudge (dismissible)                      |

### Routing, Types, Analytics, Cloud Functions

| File                                                  | Purpose                                      |
| ----------------------------------------------------- | -------------------------------------------- |
| `src/app/client/[[...slug]]/page.tsx`                | Modified to intercept root when OBP enabled  |
| `src/config/features.ts`                              | `ENABLE_OBP` feature flag                    |
| `src/types/platform/store.ts`                         | `publicPresence` field on StoreDataType      |
| `src/lib/analytics/unified.ts`                        | OBP_VIEW + OBP_ACTION_CLICK + OBP_MENU_CLICK |
| `src/database/ownerDashboard/index.ts`                | `getOBPMetrics()` — fetches OBP analytics    |
| `src/components/mobile/screens/MobileShareScreen.tsx` | Mobile OBP link reference                    |
| `src/app/api/outlets/create/route.ts`                 | Brand identity copy from master store        |
| `functions/src/analytics/obpAnalyticsAggregation.ts`  | Nightly OBP analytics CF                     |
| `functions/src/constants/features.ts`                 | `ENABLE_OBP_ANALYTICS` flag (CF-side)        |
| `npm run verify:official-business-page-boundary`      | Public link safety boundary source gate      |

---

## Feature Flag

```typescript
ENABLE_OBP: false; // in src/config/features.ts
```

When `true`: subdomain root shows OBP. Menu at `/menu` and slug paths.  
When `false`: subdomain root shows digital menu (current behavior).

---

## Version History

| Date         | Change                                                                                                                                                                                                                                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jul 2, 2026  | Public link safety boundary: OBP customer-facing actions, social links, review links, schema `sameAs`/actions, customer app manifest shortcuts, and PWA directions/reservation/order handoffs now render only normalized HTTPS public URLs. Google Maps/review URLs are Google-host constrained; invalid/stale stored strings are hidden instead of emitted. Source gate: `npm run verify:official-business-page-boundary`. |
| Jun 30, 2026 | Custom Domain active-domain and DNS record copies now fall through from rejected Clipboard API writes to acknowledged textarea fallback before copied feedback; failed diagnostics include clipboard/fallback support metadata without adding Firestore reads/writes.                                                                                |
| Feb 15, 2026 | Initial spec created from ChatGPT conversation review                                                                                                                                                                                                                                                                                              |
| Feb 15, 2026 | Full implementation: OBP server component, routing, SCSS, dashboard integration, Schema.org, hours status                                                                                                                                                                                                                                          |
| Feb 15, 2026 | TenantDataType cleanup — account container only, store is rendering source                                                                                                                                                                                                                                                                         |
| Feb 15, 2026 | Outlet creation fix — copy brand identity from master store (ADR-7)                                                                                                                                                                                                                                                                                |
| Feb 15, 2026 | OBP Analytics: page view + action click tracking, OBPMetricsCard in Owner Dashboard                                                                                                                                                                                                                                                                |
| Feb 16, 2026 | Schema enriched: shared utilities (`@lib/schema`), business-specific @type, GeoCoordinates, sameAs, priceRange, dateModified                                                                                                                                                                                                                       |
| Mar 11, 2026 | **3-Year Infrastructure Freeze**: ChatGPT 14K-line deep review → 70 items classified (12 BUILD/14 ALREADY BUILT/28 DEFER/16 REJECT)                                                                                                                                                                                                                |
| Mar 11, 2026 | Schema.org: Added `@id`, `mainEntityOfPage`, `identifier` (MenuList Entity ID), `foundingDate` for entity authority                                                                                                                                                                                                                                |
| Mar 11, 2026 | New fields: `publicPresence.establishedYear`, `permanentlyClosed` on StoreDataType                                                                                                                                                                                                                                                                 |
| Mar 11, 2026 | OBP page: "Official Page" footer, freshness signals, permanent closure state, "Serving since" display                                                                                                                                                                                                                                              |
| Mar 11, 2026 | New: `OBPMenuCTA.tsx` client component — tracks OBP→menu conversion via `OBP_MENU_CLICK` event                                                                                                                                                                                                                                                     |
| Mar 11, 2026 | OfficialPageTab: Added accent color picker (ColorPicker) + established year input (InputNumber)                                                                                                                                                                                                                                                    |
| Mar 17, 2026 | **Strategic Positioning Update**: Added Parts 10-11 to freeze plan — distribution loops, adoption threshold, evolution phases, risk analysis, GBP comparison, behavioral loop assessment. ChatGPT review archived (corrected: ~20% accuracy, all 4 "new" features already fully built).                                                            |
| Mar 18, 2026 | **Doc Rebuild**: impl.md status updated to IMPLEMENTED, file structure section updated to reference complete inventory (§16), implementation phases marked complete, validation.md archived, README Key Files expanded with 5 missing files (BrandOBPContent, OBPMenuCTA, BehaviorNudgeCard, uploadOBPPhoto, MobileShareScreen).                   |
| Mar 18, 2026 | **Distribution Strategy Update**: ChatGPT 25-section audit reviewed (~25% actionable). Added: ADR-12 (Link System positioning lock), ADR-13 (WhatsApp-first share), OBP_SHARE tracking event, WhatsApp deep link share button in OBPLinkCard, GBP website field guidance, behavioral ICP segmentation, User Story 6, Link Replacement Rate metric. |
