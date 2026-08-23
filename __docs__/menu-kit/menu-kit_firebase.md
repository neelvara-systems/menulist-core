# Menu Kit — Firebase Cost Analysis

**Version:** 1.4
**Status:** ✅ VERIFIED — Zero Firebase cost confirmed
**Last Updated:** June 29, 2026 — Share modal helper diagnostics verified as client-side
**Companion:** `menu-kit_impl.md`

---

## Summary

**Menu Kit has zero Firestore writes, zero Firestore reads, zero Cloud Function cost, and zero generated Storage writes.**

All generation happens client-side using browser Canvas API + jsPDF + qrcode. No Firestore reads, no Firestore writes, no Cloud Functions, and no generated Firebase Storage uploads are introduced. If a store logo URL points to Firebase Storage and is not already cached by the browser, the browser may fetch that existing image once for rendering; the feature still does not create or store any generated assets.

MenuList attribution is also client-side. `src/lib/menu-kit/platformAttribution.ts` draws the MenuList logo mark, name, and `menulist.ai` domain into generated files without a network fetch, export artifact, Firestore read/write, Storage upload, Cloud Function, rule, or index. Multi-location attribution removal uses `src/lib/platform/menuListBranding.ts` and the already-loaded `stores/{storeId}.activePlanType`; it does not query subscriptions.

The bundled table tent and single table/counter card now come from `src/lib/print-menu-surfaces/templates/tableTentTemplate.ts` and `src/lib/print-menu-surfaces/templates/singleTableCardTemplate.ts`. That ownership split is code organization only; both still use client-side Canvas/jsPDF/qrcode generation and add no Firebase reads, writes, Storage uploads, rules, indexes, Cloud Functions, or artifact APIs.

Individual Menu Kit asset downloads use `generateMenuKitAsset()` by semantic asset key. This renders only the requested file instead of generating the whole ZIP first. The full `generateMenuKit()` path remains the ZIP bundle path and preserves the same asset filenames/order.

Menu Kit ZIP filename boundary is Firebase-cost neutral. `generateMenuKit()` now returns `result.zipFilename`, and desktop Use MenuList, mobile Share, project Share Modal, and printable-template complete ZIP downloads use that generated filename instead of hand-rolled store-name filename derivation. This changes only the browser-local complete ZIP filename string; it does not change ZIP contents, generated asset filenames, QR payloads, Canvas/jsPDF generation, Firestore reads/writes/deletes, Storage operations, Cloud Functions, API routes, provider calls, cache invalidations, rules, indexes, Firebase deploy requirements, Vercel deploy action, or owner settings.

Menu Kit generation and helper failure diagnostics are client-side secure logs only. `project_share_menu_kit_generation_failed`, `project_share_menu_kit_asset_generation_failed`, `project_share_menu_kit_message_copy_failed`, `project_share_menu_kit_staff_script_copy_failed`, and `project_share_menu_kit_whatsapp_open_failed` record bounded presence/length metadata and the requested asset key or generated-message length, but they add no Firestore reads/writes, Storage uploads, Cloud Functions, cache invalidations, rules, indexes, durable artifacts, or owner-facing settings.

---

## Operations Breakdown

### Reads

| Operation                          | Count | Source                                     | Notes              |
| ---------------------------------- | ----- | ------------------------------------------ | ------------------ |
| Store data (name, logo, subdomain, brand color) | 0     | Already in Redux/mobile context            | No additional database read |
| Menu URL                           | 0     | Already computed in Share Modal / Mobile Share tab | No additional read |
| Last publish date                  | 0     | Already available from project summary when present | No additional read |

**Total reads per Menu Kit download: 0**

### Writes

| Operation | Count | Notes                                    |
| --------- | ----- | ---------------------------------------- |
| None      | 0     | Assets generated client-side, not stored |

**Total writes per Menu Kit download: 0**

### Storage

| Operation | Count | Notes                                    |
| --------- | ----- | ---------------------------------------- |
| None      | 0     | ZIP downloaded directly to user's device |

**Total storage per Menu Kit download: 0 bytes**

---

## Cost Estimate

| Metric              | Cost  |
| ------------------- | ----- |
| Per download        | ₹0 database/function/generated-storage cost |
| Per 1,000 downloads | ₹0 database/function/generated-storage cost |
| Monthly (any scale) | ₹0 database/function/generated-storage cost |

---

## Why Zero Cost

Menu Kit is designed as a **client-side generation tool**:

1. **Data already loaded** — Store name, logo URL, brand color, subdomain, and menu URL are all in browser context when the Share Modal or mobile Share screen opens
2. **No server generation** — Canvas API + jsPDF run in the browser
3. **No storage** — ZIP is created in memory and downloaded via `URL.createObjectURL()`
4. **No CDN** — Assets are not hosted anywhere; they're generated fresh each time

### Premium Output Treatment (June 3, 2026)

The premium logo/color treatment remains cost-safe:

- `resolveStoreBrandColor()` reads existing store context only.
- `resolveMenuKitBrandTokens()` runs locally in the browser.
- Near-black QR modules, gradient accents, fitted typography, and white scan panels are derived locally from the same in-memory brand tokens.
- `platformAttribution.ts` draws the MenuList logo/name/domain footer locally for non-Multi-location stores.
- `menuListBranding.ts` hides visible attribution only for `activePlanType === "menulist_multi_location"` using already-loaded store context.
- QR/card/PDF-like image generation remains Canvas/jsPDF in memory.
- Logo rendering uses the existing logo URL when available and does not upload rendered assets.
- Four-module QR quiet-zone enforcement is local renderer behavior and does not add reads, writes, uploads, functions, or generated-asset storage.

This is the most cost-efficient architecture possible.

---

## New Additions (March 8, 2026) — Still Zero Firebase Cost

### UTM-Tagged QR Codes (`ENABLE_MENU_KIT_UTM`)

UTM parameters (`utm_source=menu_kit&utm_medium={surface}`) are appended to the menu URL before encoding into QR codes. This happens entirely client-side in the `menuKitGenerator.ts` orchestrator. **Zero Firebase cost** — UTM params are captured by the existing Unified Analytics pipeline that already runs on page views.

Do not add a Firestore scan ledger, WhatsApp-open ledger, or A/B placement ledger to Menu Kit without a separate privacy, analytics, and Firebase cost design.

### Download Analytics (`MENU_KIT_DOWNLOAD` event)

A lightweight GA4-only event tracks when owners download or share Menu Kit assets. This event **explicitly skips Firestore writes** — the `trackFirebaseEvent` switch returns early for `MENU_KIT_DOWNLOAD`. Only Google Analytics 4 receives the event (free tier). **Zero Firebase cost.**

---

## Comparison with Alternative Approaches

| Approach                                            | Firebase Cost                              | Chosen? |
| --------------------------------------------------- | ------------------------------------------ | ------- |
| **Client-side generation (chosen)**                 | ₹0/download                                | ✅      |
| Server-side generation (Cloud Function)             | Paid CPU + memory per download             | ❌      |
| Pre-generate on publish (store in Firebase Storage) | Storage + write cost                       | ❌      |
| Third-party API (Canva API, Bannerbear)             | Paid per generation                        | ❌      |

---

**Document Signature:** Firebase Cost Analysis
**Created:** February 21, 2026
