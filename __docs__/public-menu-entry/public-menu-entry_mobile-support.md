# Public Menu Entry — Mobile Support Assessment

**Version:** 1.0
**Status:** 📝 DRAFT
**Last Updated:** March 10, 2026

---

## Mobile Relevance Decision: **YES — Mobile-First**

This feature is primarily a mobile experience. The most common scenario: restaurant owner takes a photo of their menu using their phone and uploads it directly. The entire flow must be optimized for mobile.

---

## Feature Admission Test (4 Gates)

### Gate 1 — Frequency

**Question:** Will this be used daily or multiple times per day?
**Answer:** No — one-time use (menu creation). But the discovery and upload will happen on mobile in the field.
**Result:** ⚠️ MARGINAL (one-time, but mobile is the primary context)

### Gate 2 — Speed

**Question:** Can it complete in <5 seconds on mobile?
**Answer:** Upload + extraction takes ~30-60 seconds. But the user action (tap upload, take photo) is <5 seconds. The wait is passive.
**Result:** ✅ PASS (user action is fast, processing is passive wait)

### Gate 3 — Touch

**Question:** Works with thumb-only interaction?
**Answer:** Yes — tap upload, tap camera, tap publish. No precision required.
**Result:** ✅ PASS

### Gate 4 — Value

**Question:** Needed away from desk?
**Answer:** Yes — the primary use case is photographing a physical menu at the restaurant location.
**Result:** ✅ PASS

### Overall: ✅ PASS (3.5/4 — Mobile-First Design Required)

---

## Mobile Implementation Notes

### This Is a Public Website Page, Not a Dashboard Screen

This feature lives in the `(website)` route group, NOT in the mobile PWA shell. It uses the website layout (Header/Footer), not `MobileShell`. Therefore:

- **No antd-mobile needed** — this is a public page, uses Tailwind CSS (consistent with website redesign direction)
- **No MobileShell integration** — this is pre-auth, not part of the dashboard
- **Responsive design** — same page for mobile and desktop, mobile-first CSS
- **Camera capture** — `<input type="file" accept="image/*" capture="environment">` triggers phone camera on mobile

### Mobile-Specific Considerations

| Aspect             | Implementation                                                                        |
| ------------------ | ------------------------------------------------------------------------------------- |
| Camera access      | Standard file input with `accept="image/*"` — shows both camera and gallery on mobile |
| Image optimization | Client-side Compressor.js (max 1920px, 80% quality) — already in dependencies         |
| Upload progress    | Visual progress bar (not just spinner)                                                |
| Processing wait    | Animated skeleton with "Reading your menu..." text                                    |
| Touch targets      | All buttons ≥ 44px height                                                             |
| Viewport           | `viewport-fit=cover` (already set globally)                                           |
| Orientation        | Works in portrait and landscape                                                       |
| Offline            | Not applicable (requires upload)                                                      |

### Localization

- Inherits from website: next-intl translations
- Key strings needed: upload CTA, processing messages, error messages, success messages
- RTL support: inherits from global RTL configuration

### Auth

- No auth required for upload + preview
- Signin redirect uses existing NextAuth flow with `callbackUrl` parameter
- After auth, user returns to preview page automatically

### Settings Inheritance

- Not applicable — this is a pre-auth public page
- No theme/language/timezone settings (uses system defaults)
- After claim + publish, user enters dashboard with full settings

---

## Icons

`react-icons/lu` (Lucide) — same as rest of the application.

Key icons needed:

- `LuCamera` — upload trigger
- `LuUpload` — file upload
- `LuCheck` — success states
- `LuAlertCircle` — error states
- `LuDownload` — QR download
- `LuShare2` — share actions
- `LuQrCode` — QR code section

---

## ICP Compliance

| Check                      | Status                                |
| -------------------------- | ------------------------------------- |
| Zero jargon in UI copy     | ✅                                    |
| Touch targets ≥ 44px       | ✅ (all buttons)                      |
| Works on mid-range Android | ✅ (no heavy animations)              |
| Optimistic updates         | N/A (server processing, passive wait) |
| Camera-first on mobile     | ✅ (`capture` attribute)              |

---

**Document Signature:** MenuList Mobile Support Assessment
**Audience:** Engineering
