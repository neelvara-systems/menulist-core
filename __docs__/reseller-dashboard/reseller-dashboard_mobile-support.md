# Reseller Dashboard — Mobile Support Assessment

**Feature:** Assisted Onboarding Portal for Authorized Resellers  
**Status:** Implemented - reseller boundary source gate added July 2, 2026
**Created:** February 27, 2026  
**Last Updated:** July 4, 2026
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
**Answer:** Individual actions such as view client, confirm payment, copy link, and open payment link complete in the current mobile UI. Full account/payment handoff timing depends on the payment path and network conditions.

### Gate 3: Touch — ✅ PASS
**Question:** Works with thumb-only interaction?  
**Answer:** Yes. Form fields, dropdowns, buttons, and link handoffs are standard mobile interactions. No precision-dependent UI.

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

1. **Menu-source handoff** — The reseller onboarding mobile path does not upload menu files; owners add menu sources later through the normal MenuList mobile/desktop import flow.
2. **Large touch targets** — 44px minimum for all action buttons (confirm payment, submit onboarding)
3. **Optimistic updates** — Show "Creating store..." immediately, sync in background
4. **Offline indicator** — If reseller has poor connectivity at client location, show clear status
5. **Share payment link** — Native share sheet for sending Razorpay link via WhatsApp/SMS, plus dashboard copy/open actions for pending online payments if the initial link is lost. Copy/share/open failures use bounded mobile diagnostics and fixed owner-facing copy.
6. **Billing parity** — Mobile Billing must show pending reseller-online subscriptions with Pay Now, and manual reseller-offline subscriptions as one-time prepaid access with no Razorpay pause/cancel/upgrade controls.
7. **Manual location capacity** — Mobile reseller dashboard exposes "Add prepaid location" for active offline clients, using the same `/api/reseller/add-location-capacity` route as desktop. This is required so field resellers can collect cash/UPI and unlock paid owner outlet capacity from the client's phone after the write is acknowledged.

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
- **Language:** Zero jargon. "Add menu from the dashboard" not "Upload extraction source"
- **Feedback:** Toast confirmations, not console logs
- **Error messages:** "Could not create the account. Please try again." not "Transaction failed: ROLLBACK"

---

## June 11, 2026 Parity Notes

- Mobile uses the same `/api/reseller/clients`, `/api/reseller/monthly-summary`, `/api/reseller/onboard`, and `/api/reseller/add-location-capacity` routes as desktop.
- The shared mobile/desktop reseller dashboard hook uses `no-store`, same-origin credentials, manual redirect handling, a 64KB response cap, and bounded parse/shape diagnostics before fixed load failure copy for profile, clients, and monthly-summary reads.
- Mobile platform reseller management sends `/api/reseller/manage` and `/api/reseller/monthly-summary` with no-store cache, same-origin credentials, and manual redirect handling, then caps response parsing at 64KB and requires valid profile-list, monthly-summary, and save acknowledgement shapes before updating the management screen.
- Mobile onboarding sends `/api/reseller/onboard` with the same request policy, then parses acknowledgements through a 16KB cap and requires store, tenant, subscription, and status fields before returned login/link details are rendered.
- Mobile platform reseller management no longer imports or compares a client-bundled platform password. It loads only for `platformRole === 'PLATFORM'` and relies on the same platform-only APIs as desktop.
- Monthly summary profile reads are now scoped: normal resellers read only their own profile docs; platform users keep the aggregate view.
- Pending online clients expose copy/open payment-link actions on mobile.
- Active manual/offline clients expose "Add prepaid location" on mobile with the same bounded server route as desktop.
- Mobile add-location sends `/api/reseller/add-location-capacity` with the same request policy, then parses acknowledgements through an 8KB cap and must include `success: true`, positive numeric `amountExpected`, the requested store id, requested tenant id, and requested location count before the collect-amount toast is shown.
- Mobile reseller management saves use the same bounded 64KB `/api/reseller/manage` response parser as desktop. Update acknowledgements must return the edited profile id before the editor closes or saved copy appears; create acknowledgements must return a non-empty profile id with `action: "created"`.
- Mobile reseller write actions use the same `DATA_WRITE` throttled, 16KB bounded JSON API routes as desktop.

## July 2, 2026 Source Gate

- `npm run verify:reseller-dashboard-boundary` now source-checks the mobile reseller dashboard, management, and onboarding screens against the same desktop request policy, bounded response parsing, response shape checks, role gates, 44px action controls, and MobileShell/More-screen routing.
- The source gate confirms mobile management remains platform-admin gated, while dashboard and onboarding remain available only through the feature-flagged reseller shell path.
- This does not replace authenticated mobile browser QA, physical-device QA, Razorpay sandbox smoke, Firebase deploys, Vercel deploys, production builds, live Firestore writes, or provider calls.

## June 29, 2026 Link-Handoff Notes

- Mobile onboarding copy/share actions for returned payment, dashboard, public-menu, username, login-email, and password values log `mobile_reseller_onboarding_copy_failed` or `mobile_reseller_onboarding_share_failed` with bounded presence/length metadata only. Copy success feedback waits for Clipboard API or acknowledged textarea fallback success, and failed copy diagnostics may add clipboard/fallback support booleans.
- Mobile onboarding no longer uses uncontrolled `Text copyable` handling for returned links or login details; every visible copy button uses the guarded helper.
- Mobile dashboard pending-payment links pass the full transaction into copy/open handlers so `mobile_reseller_dashboard_payment_link_copy_failed` and `mobile_reseller_dashboard_payment_link_open_failed` can include bounded store, tenant, subscription, payment-mode, tier, status, and copy support context.
- Expected native share cancel events are ignored; real clipboard/share/popup failures show fixed copy and do not expose raw returned URLs or credentials in logs.

**DOCUMENT STATUS:** Implemented and audited for this slice
