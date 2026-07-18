# Menu Trust Signals

> **Status:** ✅ IMPLEMENTED — Feature flag ON
> **Feature Flag:** `ENABLE_MENU_TRUST_SIGNALS`
> **Location:** Customer-facing menu renderer (`menuPageNew.tsx`)
> **Source:** ChatGPT Owner Features Session (March 15, 2026) → Cascade Review

## What It Is

Factual trust indicators on any customer-facing business page: location, operational status (Open/Closed), offering type label, and freshness date. Evidence of truth, not badges. Works across all SMB types (restaurants, salons, retail, gyms, clinics).

**Not** analytics. **Not** owner-facing. **Not** branding. **Not** badges. Just factual signals that make customers feel confident.

## Why It Matters

When customers scan a QR and see a digital menu, they subconsciously ask:

- "Is this menu current or outdated?"
- "Are these prices still correct?"
- "Is this the restaurant's actual menu?"

Most QR menu tools show bare item lists. MenuList can answer these questions through subtle visual signals — without adding clutter.

## What Already Exists

| Signal                   | Status    | Location                                    |
| ------------------------ | --------- | ------------------------------------------- |
| Restaurant name + logo   | ✅ EXISTS | OBP header, menu header                     |
| Menu version number      | Stored    | Available as `project.menuVersion`; current footer hides the numeric version |
| Last published timestamp | ✅ EXISTS | `TrustSignals.tsx` shows a bounded exact date |
| "Powered by MenuList"    | ✅ EXISTS | OBP footer, Menu Kit assets                 |
| Sold out badges          | ✅ EXISTS | Item cards show "Sold Out" when unavailable |
| Category navigation      | ✅ EXISTS | Sticky tabs on all device sizes             |

## What's NEW (v2 — March 17, 2026)

| Signal                 | Description                                                                  | Source                                          |
| ---------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| **Location**           | Business area + city (e.g., "Bandra West, Mumbai")                           | `store.area`, `store.city`                      |
| **Operational Status** | "Open · Closes at 11 PM" or "Closed · Opens tomorrow at 9 AM" (green/red)    | `getStoreStatus(workingHours, timeZone)`        |
| **Offering Label**     | "Menu" / "Services" / "Catalog" (business-type/category-aware) | `getOfferingLabels(businessType, businessCategory).offeringTitle` |
| **Freshness Date**     | "Updated today" or "Updated Mar 12" (exact date, hidden if >30 days)         | `project.lastPublishedAt`                       |

## Architecture Principle

**Pure render computation inside the existing client menu bundle.** It uses store/project data already supplied to the renderer, so it adds zero reads, API routes, or Firebase operations.

## Key Files

| File                                    | Purpose                                |
| --------------------------------------- | -------------------------------------- |
| `src/components/atoms/TrustSignals.tsx` | Trust signal component and freshness boundary |
| `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx` | Current customer-menu placement |
| `src/config/features.ts`                | `ENABLE_MENU_TRUST_SIGNALS` flag added |

## Documents

| Doc                                                                            | Audience         |
| ------------------------------------------------------------------------------ | ---------------- |
| [menu-trust-signals_spec.md](./menu-trust-signals_spec.md)                     | Product/Business |
| [menu-trust-signals_impl.md](./menu-trust-signals_impl.md)                     | Engineering      |
| [menu-trust-signals_firebase.md](./menu-trust-signals_firebase.md)             | Engineering      |
| [menu-trust-signals_marketing.md](./menu-trust-signals_marketing.md)           | Marketing        |
| [menu-trust-signals_website.md](./menu-trust-signals_website.md)               | Website          |
| [menu-trust-signals_helpdoc.md](./menu-trust-signals_helpdoc.md)               | Help Center      |
| [menu-trust-signals_mobile-support.md](./menu-trust-signals_mobile-support.md) | Mobile           |

## Existing Infrastructure Reused

| System         | File                                | Reused For               |
| -------------- | ----------------------------------- | ------------------------ |
| Menu version   | `project.menuVersion`               | Stored publish identity; not rendered by this component |
| Last published | `project.lastPublishedAt`           | Exact freshness date     |
| Store data     | Store document in page.tsx          | Restaurant name, logo    |
| MenuFooter     | `src/components/.../MenuFooter.tsx` | Business identity/footer; update metadata disabled in current placement |

---

**Created:** March 15, 2026
**Last Updated:** July 16, 2026
