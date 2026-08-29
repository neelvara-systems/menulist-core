# Reseller Dashboard — Mobile Support Assessment

> **Current billing admission (August 24, 2026):** New reseller sales are online-only through Razorpay. Billing profile and frozen MenuList tax evidence are required before provisioning; the standard invoice, refund, credit-note, and notification pipeline applies after settlement. Recurring credits scale with paid locations. Manual cash/UPI collection, confirmation, renewal, and location-capacity sales are dormant and fail closed until their seller/remittance/accounting contract is approved. Historical offline detail below is retained for implementation history only.

**Feature:** Assisted Onboarding Portal for Authorized Resellers  
**Status:** Implemented - reseller boundary source gate added July 2, 2026
**Created:** February 27, 2026  
**Last Updated:** August 28, 2026
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
**Answer:** Individual actions such as view current client state, confirm prepaid onboarding, renew manual access, add prepaid capacity, copy a link, and open a link complete in the current mobile UI. Full provider/account handoff timing depends on network and Razorpay.

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
| Client Actions | P0 | Renewal and prepaid-location actions embedded in each current client card; no separate detail route |
| Confirm Payment | P0 | Offline confirmation is the final onboarding action; the standalone API remains for legacy pending-manual records rather than a separate screen |
| Add Prepaid Location | P0 | Record cash/UPI collection for extra manual location capacity |

### Mobile-Specific Considerations

1. **Menu-source handoff** — The reseller onboarding mobile path does not upload menu files; owners add menu sources later through the normal MenuList mobile/desktop import flow.
2. **Large touch targets** — 44px minimum for all action buttons (confirm payment, submit onboarding)
3. **Payment mutation feedback** — Show an immediate loading state, but do not claim onboarding/renewal/capacity success until the bounded server acknowledgement is validated.
4. **Share payment link** — Native share sheet for the initial Razorpay link, plus dashboard copy/open recovery. Both server and browser normalize the URL to HTTPS `rzp.io`; failures use bounded diagnostics and fixed copy.
5. **Billing parity** — Mobile Billing shows pending reseller-online subscriptions with Pay Now, and manual reseller-offline subscriptions as one-time prepaid access with no Razorpay pause/cancel/upgrade controls.
6. **Manual location capacity** — Active offline clients use `/api/reseller/add-location-capacity` with a retained UUID across timeout/retry.
7. **Manual renewal** — Active or expired offline clients use `/api/reseller/renew`, select 3/6/12 months, see the exact collection amount, and clear the UUID only after store/tenant/subscription/operation acknowledgement matches.

---

## Architecture

- **Shell:** Uses existing `MobileShell` when `ENABLE_MOBILE_UI` is ON
- **Data boundary:** Same authenticated server APIs and `src/database/reseller/server.ts`; no browser Firestore mutation DAL
- **Hooks:** Same `useResellerDashboard.ts` as desktop
- **Icons:** `react-icons/lu` (Lucide) only
- **Styling:** Current Tailwind-driven mobile shell/screens; no `antd-mobile` dependency
- **Auth:** Same NextAuth session, `platformRole === 'RESELLER'` check
- **Settings Inheritance:** Theme, language, timezone from `clientThemeConfig` Redux slice

---

## Mobile Navigation

Reseller screens stay inside `MobileShell`. Feature-flagged entries in Mobile More open the reseller dashboard and onboarding sub-screens; platform users also receive reseller management. Direct `/reseller`, `/reseller/onboard`, and `/reseller/manage` routes map back into those shell states.

## August 28, 2026 Local Provider-Boundary Certification

- A disposable active reseller user/profile was created only in the MenuList Auth and Firestore emulators, used through the real sign-in form, and deleted with exact Auth/document readback after the pass.
- At 390x844, the reseller hub, zero-client dashboard, Refresh, both onboarding entry paths, required-field recovery, complete business/billing draft, plan selection, confirmation, and back-navigation passed.
- Tier, billing-interval, and commitment choices now expose `aria-pressed`; the location-count input exposes `Locations included`. These states were verified for Standard, yearly, two locations, and three months.
- Confirmation stayed truthful about the Razorpay recurring handoff. `Create Link` was not invoked, so no provider checkout, client, store, subscription, or payment state was created.
- Direct owner access to `/reseller` redirected to the owner dashboard. Direct reseller access to `/dashboard` now redirects to `/reseller`, removing the previous empty owner-workspace shell.
- This is local emulator/browser evidence, not hosted, physical-device, or live Razorpay certification.

---

## Localization

- Shell-level theme, locale direction, and formatting are inherited.
- Reseller-specific operational copy is currently English and internal. Do not claim a Hindi/RTL reseller catalog until those strings move into maintained locale files.

---

## ICP Compliance

- **User:** Non-tech person selling to non-tech SMB owners
- **Language:** Zero jargon. "Add menu from the dashboard" not "Upload extraction source"
- **Feedback:** Toast confirmations, not console logs
- **Error messages:** "Could not create the account. Please try again." not "Transaction failed: ROLLBACK"

---

## June 11, 2026 Parity Notes

- Mobile uses the same `/api/reseller/clients`, `/api/reseller/monthly-summary`, `/api/reseller/onboard`, `/api/reseller/renew`, and `/api/reseller/add-location-capacity` routes as desktop.
- The shared mobile/desktop reseller dashboard hook uses `no-store`, same-origin credentials, manual redirect handling, a 64KB response cap, and bounded parse/shape diagnostics before fixed load failure copy for profile, clients, and monthly-summary reads.
- Mobile platform reseller management sends `/api/reseller/manage` and `/api/reseller/monthly-summary` with no-store cache, same-origin credentials, and manual redirect handling, then caps response parsing at 64KB and requires valid profile-list, monthly-summary, and save acknowledgement shapes before updating the management screen.
- Mobile onboarding retains an input-specific UUID, sends it to `/api/reseller/onboard`, parses through a 16KB cap, and requires the exact returned operation ID plus store, tenant, subscription, and status before clearing the UUID or rendering success.
- Mobile platform reseller management no longer imports or compares a client-bundled platform password. It loads only for `platformRole === 'PLATFORM'` and relies on the same platform-only APIs as desktop.
- Monthly summary profile reads are now scoped: normal resellers read only their own profile docs; platform users keep the aggregate view.
- Pending online clients expose copy/open payment-link actions on mobile.
- Active manual/offline clients expose "Add prepaid location" on mobile with the same bounded server route as desktop.
- Active or expired manual clients expose renewal with 3/6/12-month selection. The 8KB response must match store, tenant, subscription, operation ID, amount, and valid-until date before success.
- Mobile add-location sends `/api/reseller/add-location-capacity` with the same request policy, then parses acknowledgements through an 8KB cap and must include `success: true`, positive numeric `amountExpected`, the requested store id, requested tenant id, and requested location count before the collect-amount toast is shown.
- Desktop and mobile use the shared input-specific `getResellerOperationIntentKey()` plus `getOrCreateResellerOperationId()` session-storage boundary for onboarding, renewal, and add-location. The same operation is resent after transport/parse failure and cleared only after a valid scoped result.
- The client-list API now returns current subscription projections directly with `isPartial`; mobile displays the bounded-result notice instead of rendering each renewal/location ledger row as another client.
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
