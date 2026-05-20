# Reseller Dashboard — Mobile Support Assessment

**Feature:** Assisted Onboarding Portal for Authorized Resellers  
**Status:** 📝 DOCUMENTED  
**Created:** February 27, 2026  
**Audience:** Internal

---

## Mobile Relevance Decision: **YES — CRITICAL**

The reseller dashboard is primarily a **field-sales tool**. Resellers onboard clients face-to-face at the restaurant/business location. They will almost always be on their phone, not a laptop.

---

## Feature Admission Test (4 Gates)

### Gate 1: Frequency — ✅ PASS
**Question:** Daily/multiple times per day?  
**Answer:** Yes. Active resellers onboard multiple clients per week, check statuses daily.

### Gate 2: Speed — ✅ PASS
**Question:** Completes in <5 seconds on mobile?  
**Answer:** Individual actions (view client, confirm payment) complete instantly. Full onboarding ~2-3 minutes but each step is fast.

### Gate 3: Touch — ✅ PASS
**Question:** Works with thumb-only interaction?  
**Answer:** Yes. Form fields, dropdowns, buttons, photo upload — all standard mobile interactions. No precision-dependent UI.

### Gate 4: Value — ✅ PASS
**Question:** Needed while owner is away from desk?  
**Answer:** Yes — this is the PRIMARY use case. Reseller is at the client's location, not at a desk.

**Result: ALL 4 GATES PASS → Mobile UI is MANDATORY**

---

## Mobile Screens Required

| Screen | Priority | Description |
|--------|----------|-------------|
| Reseller Home | P0 | Stats overview + "Onboard New Client" CTA |
| Onboarding Wizard | P0 | Multi-step form (business details → plan selection → recurring online or one-time prepaid offline confirmation) |
| My Clients List | P0 | Scrollable list with status badges |
| Client Detail | P0 | Read-only detail with renewal and prepaid-location actions |
| Confirm Payment | P0 | Single-action confirmation for offline payments |
| Add Prepaid Location | P0 | Record cash/UPI collection for extra manual location capacity |

### Mobile-Specific Considerations

1. **Camera integration for menu upload** — Use existing `MenuUploadSheet` pattern from `src/components/mobile/sheets/MenuUploadSheet.tsx`
2. **Large touch targets** — 44px minimum for all action buttons (confirm payment, submit onboarding)
3. **Optimistic updates** — Show "Creating store..." immediately, sync in background
4. **Offline indicator** — If reseller has poor connectivity at client location, show clear status
5. **Share payment link** — Native share sheet for sending Razorpay link via WhatsApp/SMS
6. **Billing parity** — Mobile Billing must show pending reseller-online subscriptions with Pay Now, and manual reseller-offline subscriptions as one-time prepaid access with no Razorpay pause/cancel/upgrade controls.
7. **Manual location capacity** — Mobile reseller dashboard exposes "Add prepaid location" for active offline clients, using the same `/api/reseller/add-location-capacity` route as desktop. This is required so field resellers can collect cash/UPI and immediately unlock owner outlet creation from the client's phone.

---

## Architecture

- **Shell:** Uses existing `MobileShell` when `ENABLE_MOBILE_UI` is ON
- **DAL:** Same `src/database/reseller/index.ts` as desktop
- **Hooks:** Same `useResellerDashboard.ts` as desktop
- **Icons:** `react-icons/lu` (Lucide) only
- **Styling:** antd-mobile + Tailwind CSS (mobile layer)
- **Auth:** Same NextAuth session, `platformRole === 'RESELLER'` check
- **Settings Inheritance:** Theme, language, timezone from `clientThemeConfig` Redux slice

---

## Mobile Navigation

Reseller mobile shell has simplified bottom tabs:

| Tab | Icon | Screen |
|-----|------|--------|
| Home | `LuLayoutDashboard` | Reseller dashboard stats |
| Onboard | `LuPlus` | New client onboarding wizard |
| Clients | `LuUsers` | Client list with search/filter |
| Profile | `LuUser` | Reseller profile, caps, logout |

---

## Localization

- Inherits from desktop — same `next-intl`, same locale files
- Primary locale: `hi-IN` (Hindi) — most resellers are in India
- RTL support if `ar-SA` locale selected (inherited from settings)

---

## ICP Compliance

- **User:** Non-tech person selling to non-tech SMB owners
- **Language:** Zero jargon. "Upload menu photo" not "Upload extraction source"
- **Feedback:** Toast confirmations, not console logs
- **Error messages:** "Could not create the account. Please try again." not "Transaction failed: ROLLBACK"

---

**DOCUMENT STATUS:** 📝 DOCUMENTED  
**Last Updated:** February 27, 2026
