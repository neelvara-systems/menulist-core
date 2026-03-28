# Menu Trust Signals

> **Status:** ✅ IMPLEMENTED — Feature Flag OFF by Default
> **Feature Flag:** `ENABLE_MENU_TRUST_SIGNALS`
> **Location:** Customer-facing client menu (`src/app/_client/`)
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
| Menu version number      | ✅ EXISTS | `MenuFooter.tsx` — shows `v{menuVersion}`   |
| Last published timestamp | ✅ EXISTS | `MenuFooter.tsx` — shows relative date      |
| "Powered by MenuList"    | ✅ EXISTS | OBP footer, Menu Kit assets                 |
| Sold out badges          | ✅ EXISTS | Item cards show "Sold Out" when unavailable |
| Category navigation      | ✅ EXISTS | Sticky tabs on all device sizes             |

## What's NEW (v2 — March 17, 2026)

| Signal                 | Description                                                                  | Source                                          |
| ---------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| **Location**           | Business area + city (e.g., "Bandra West, Mumbai")                           | `store.area`, `store.city`                      |
| **Operational Status** | "Open · Closes at 11 PM" or "Closed · Opens tomorrow at 9 AM" (green/red)    | `getStoreStatus(workingHours, timeZone)`        |
| **Offering Label**     | "Restaurant Menu" / "Service List" / "Product Catalog" (business-type-aware) | `getOfferingLabels(businessType).offeringTitle` |
| **Freshness Date**     | "Updated today" or "Updated Mar 12" (exact date, hidden if >30 days)         | `project.lastPublishedAt`                       |

## Architecture Principle

**Pure SSR component.** Reads existing store data + project data already loaded by the client menu page. Zero new reads. Zero new API routes. Zero Firebase cost. Zero client JS.

## Key Files

| File                                    | Purpose                                |
| --------------------------------------- | -------------------------------------- |
| `src/components/atoms/TrustSignals.tsx` | Trust signal component (SSR, zero JS)  |
| `src/app/_client/[[...slug]]/page.tsx`  | Modified — embed trust signals         |
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
| Menu version   | `project.menuVersion`               | Freshness computation    |
| Last published | `project.lastPublishedAt`           | "Updated recently" text  |
| Store data     | Store document in page.tsx          | Restaurant name, logo    |
| MenuFooter     | `src/components/.../MenuFooter.tsx` | Existing version display |

---

**Created:** March 15, 2026
**Last Updated:** March 15, 2026
