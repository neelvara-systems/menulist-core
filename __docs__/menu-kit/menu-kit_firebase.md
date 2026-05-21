# Menu Kit — Firebase Cost Analysis

**Version:** 1.2
**Status:** ✅ VERIFIED — Zero Firebase cost confirmed
**Last Updated:** May 21, 2026 — Mobile Share tab asset delivery verified
**Companion:** `menu-kit_impl.md`

---

## Summary

**Menu Kit has ZERO Firebase cost (₹0).**

All generation happens client-side using browser Canvas API + jsPDF + qrcode. No Firestore reads, no Firestore writes, no Firebase Storage uploads.

---

## Operations Breakdown

### Reads

| Operation                          | Count | Source                                     | Notes              |
| ---------------------------------- | ----- | ------------------------------------------ | ------------------ |
| Store data (name, logo, subdomain) | 0     | Already in Redux/mobile context            | No additional read |
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
| Per download        | ₹0 |
| Per 1,000 downloads | ₹0 |
| Monthly (any scale) | ₹0 |

---

## Why Zero Cost

Menu Kit is designed as a **client-side generation tool**:

1. **Data already loaded** — Store name, logo, subdomain, menu URL are all in the browser's Redux state when the Share Modal opens
2. **No server generation** — Canvas API + jsPDF run in the browser
3. **No storage** — ZIP is created in memory and downloaded via `URL.createObjectURL()`
4. **No CDN** — Assets are not hosted anywhere; they're generated fresh each time

This is the most cost-efficient architecture possible.

---

## New Additions (March 8, 2026) — Still Zero Firebase Cost

### UTM-Tagged QR Codes (`ENABLE_MENU_KIT_UTM`)

UTM parameters (`utm_source=menu_kit&utm_medium={surface}`) are appended to the menu URL before encoding into QR codes. This happens entirely client-side in the `menuKitGenerator.ts` orchestrator. **Zero Firebase cost** — UTM params are captured by the existing Unified Analytics pipeline that already runs on page views.

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
