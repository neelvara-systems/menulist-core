# Public Menu Entry — Mobile Support Assessment

**Version:** 1.0
**Status:** ✅ IMPLEMENTED — Mobile-first public flow
**Last Updated:** July 2, 2026

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
**Answer:** Upload + extraction includes a short processing wait. The user action (tap upload, take photo) is brief, and the wait is passive.
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
- **Camera capture** — `<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment">` keeps the browser prompt aligned with the server image allowlist

### Mobile-Specific Considerations

| Aspect             | Implementation                                                                        |
| ------------------ | ------------------------------------------------------------------------------------- |
| Camera access      | Standard file input with `accept="image/jpeg,image/png,image/webp"` and `capture="environment"` — opens the rear camera path on supported mobile browsers while keeping the server allowlist exact |
| Image optimization | Client-side Compressor.js (max 1920px, 80% quality) — already in dependencies         |
| Upload progress    | Visual progress bar (not just spinner)                                                |
| Processing wait    | Animated skeleton with "Reading your menu..." text                                    |
| Touch targets      | All buttons ≥ 44px height                                                             |
| Viewport           | `viewport-fit=cover` (already set globally)                                           |
| Orientation        | Works in portrait and landscape                                                       |
| Offline            | Not applicable (requires upload)                                                      |
| Claim step         | Business name, city, phone, and address stay in the focused preview page before dashboard entry |

### Localization

- Inherits from website: next-intl translations
- Key strings needed: upload CTA, processing messages, error messages, success messages
- RTL support: inherits from global RTL configuration

### Auth

- Phone/WhatsApp OTP is shown inline before upload or link import.
- Google OAuth is available directly from the `/create-menu` auth card.
- Password/passcode fallback stays on the full `/signin` page and is not shown in the first-time create-menu card.
- Source upload, link import, preview polling, and extraction remain authenticated.
- After OTP auth, the page refreshes the NextAuth session and reveals the upload/link controls without leaving `/create-menu`.
- After claim, the page refreshes the NextAuth session before redirecting to the success/workspace path so new tenant/store IDs are available immediately.

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
