# Reseller Dashboard — Product Specification

> **Current billing admission (August 24, 2026):** New reseller sales are online-only through Razorpay. Billing profile and frozen MenuList tax evidence are required before provisioning; the standard invoice, refund, credit-note, and notification pipeline applies after settlement. Recurring credits scale with paid locations. Manual cash/UPI collection, confirmation, renewal, and location-capacity sales are dormant and fail closed until their seller/remittance/accounting contract is approved. Historical offline detail below is retained for implementation history only.

**Feature:** Assisted Onboarding Portal for Authorized Resellers  
**Status:** ✅ IMPLEMENTED
**Created:** February 27, 2026  
**Audience:** CEO, Business Team, Product Team

August 1, 2026 reliability invariant: one onboarding operation may create at
most one recoverable business scope and one Razorpay subscription attempt.
Temporary Auth, provider or Firestore uncertainty is shown as a retryable
service state; the system must not report success, silently delete the created
scope, or create another payment subscription until exact recovery proves what
happened.

---

## 1. Executive Summary

### What

A controlled, role-gated dashboard where authorized resellers (friends, sales partners) manually onboard SMB clients into MenuList. Resellers handle business account setup, pricing selection, and payment coordination; the client receives a MenuList owner account plus dashboard and customer-link handoff. Menu upload/extraction happens later through the normal owner dashboard and import/review flows, not inside the reseller onboarding API path.

### Why

- **Density before automation:** Early-stage growth requires assisted distribution in target cities
- **Low-tech SMB reality:** Many Indian SMB owners won't self-serve through a website pricing page
- **Founder network leverage:** Friends and trusted contacts can sell MenuList locally with credibility
- **Reduced onboarding friction:** Client doesn't need to understand SaaS pricing pages — reseller handles everything

### Scope

- **In scope:** Reseller dashboard, store/account creation, pricing tier selection, online/offline payment, license management, dashboard/customer-link handoff, reseller tracking, auto-expiry
- **Out of scope:** White-labeling, reseller self-registration, commission calculations, reseller billing, public partner program, API access for resellers

### Success Metric

- 50+ stores onboarded via reseller channel within first 3 months
- < 5 minutes per onboarding (reseller time)

---

## 2. User Roles

### 2.1 Reseller (New Role)

**Who:** Founder's trusted friends/contacts authorized to sell MenuList locally.

**How they get access:**

- A current platform admin creates or updates the reseller through the protected reseller-management screen/API; the server provisions Firebase Auth, the `users` role document, and the reseller profile
- No self-registration. No public signup. Invitation-only.
- Reseller must have a MenuList account (email login via existing auth)

**What they can do:**

- Create stores for new clients
- Create owner accounts and share dashboard/customer links with clients
- Select pricing tier from predefined list
- Select payment mode (online / offline)
- Select license duration (3 / 6 / 12 months)
- View their onboarded clients list
- View license statuses (active, expiring, expired)

**What they CANNOT do:**

- Set arbitrary prices (only predefined tiers)
- Modify existing subscriptions
- Access billing engine or Razorpay dashboard
- See other resellers' clients
- Edit stores after activation
- Access the main MenuList owner dashboard features
- Delete stores or cancel subscriptions

### 2.2 Founder (Existing PLATFORM Role)

**Additional capabilities for reseller management:**

- View all resellers and their onboarded clients
- Activate/deactivate reseller accounts
- View reseller performance (stores onboarded, revenue generated)
- Override subscription settings if needed
- Set per-reseller caps

### 2.3 Client (End Customer — Store Owner)

**Experience:**

- Receives a MenuList owner account and handoff links
- Logs in with credentials provided during onboarding
- Adds/uploads menu content through the standard MenuList owner dashboard and import/review flows
- Full owner dashboard access (same as self-serve customers)
- No awareness they were onboarded by a reseller (transparent)
- For online payment: completes Razorpay checkout via activation link
- For offline payment: account activated immediately by reseller

---

## 3. Pricing Architecture

### 3.1 Public Price Anchor (Sacred — Never Changes Per Client)

| Plan           | Monthly (INR)      | Monthly (USD)      |
| -------------- | ------------------ | ------------------ |
| Official       | ₹599               | $29                |
| Pro            | ₹1,499             | $79                |
| Multi-location | ₹1,499/location    | $79/location       |

These are the standard prices from `PlatformPlansList.ts`. Multi-location requires at least two active locations. Direct public pricing is a reference point only; reseller pricing remains a separate commercial contract.

### 3.2 Reseller Pricing Tiers (Internal Only)

Resellers see predefined discounted tiers. These are NOT visible publicly.

| Tier          | Name           | Monthly INR              | Use Case                       |
| ------------- | -------------- | ------------------------ | ------------------------------ |
| `FOUNDER_400` | Founder Tier A | ₹400/mo                  | Close family, early supporters |
| `FOUNDER_500` | Founder Tier B | ₹500/mo                  | Friends, local contacts        |
| `STANDARD`    | Standard       | ₹499/mo                  | Regular reseller sales         |

**Rules:**

- Tiers are hardcoded constants — no manual price input
- Reseller selects tier from dropdown during onboarding
- Tier determines the Razorpay plan used (for online) or the expected amount (for offline)
- Tier is locked after store creation — cannot be changed

### 3.3 Billing & Duration

**Online mode** uses the **same Razorpay recurring subscription** as self-serve. No divergent billing system.

| Billing Interval | How It Works                                                  |
| ---------------- | ------------------------------------------------------------- |
| Monthly          | Recurring ₹400/₹500/₹499 per month (auto-renew via Razorpay)  |
| Yearly           | Recurring yearly at discounted rate (auto-renew via Razorpay) |

**Commitment Period (Online Only):**

Reseller selects a commitment period (3 / 6 / 12 months) which is tracked for reporting and optional early-cancellation policy. Billing interval remains monthly or yearly — commitment does NOT change how Razorpay charges.

**Offline mode** uses one-time prepaid duration. "One-time payment" means the client prepays for the selected 3 / 6 / 12 month access window; it does not mean lifetime access.

| Duration  | Billing                                  |
| --------- | ---------------------------------------- |
| 3 months  | One-time manual prepaid (cash/UPI)       |
| 6 months  | One-time manual prepaid (cash/UPI)       |
| 12 months | One-time manual prepaid (cash/UPI)       |

### 3.4 Pricing Summary

| Mode           | Tier      | Monthly | Yearly    |
| -------------- | --------- | ------- | --------- |
| Online/Offline | Founder A | ₹400/mo | ₹4,800/yr |
| Online/Offline | Founder B | ₹500/mo | ₹6,000/yr |
| Online/Offline | Standard  | ₹499/mo | ₹4,990/yr |

---

## 4. Payment Modes

### 4.1 Online (Razorpay Recurring Subscription)

**Flow:**

1. Reseller creates store → selects tier + billing interval (monthly/yearly) + Online payment
2. System creates Razorpay subscription (same as self-serve) via `getOrCreateRazorpayPlan()`
3. Subscription returns `shortUrl` — reseller shares with client (WhatsApp, SMS, email)
4. Client clicks `shortUrl` → Razorpay checkout → sets up autopay mandate → first payment
5. Razorpay webhook (`subscription.activated` / `subscription.charged`) → subscription activated
6. Reseller shares the returned owner username/login email, password, dashboard link, and customer link with the client
7. Subsequent renewals are automatic (Razorpay handles billing)

**Why Razorpay Subscription (same as self-serve):**

- **Unified billing engine** — same webhooks, same state machine, same lifecycle
- **Auto-renewal** — no manual renewal burden on reseller
- **Clean MRR** — every reseller store contributes to recurring revenue
- **No parallel billing engine** — reuses `getOrCreateRazorpayPlan()`, Razorpay Subscriptions, the canonical subscription document, and the same verified webhook path
- **`shortUrl` already exists** — subscription objects already include a shareable checkout URL

**Two billing models total (not three):**

| Channel                      | Billing               | Recurring | Renewal |
| ---------------------------- | --------------------- | --------- | ------- |
| Self-serve + Reseller Online | Razorpay Subscription | Yes       | Auto    |
| Reseller Offline             | Manual prepaid        | No        | Manual  |

### 4.2 Offline (Cash / UPI / Bank Transfer)

**Flow:**

1. Reseller creates store → selects tier + duration + Offline payment
2. Reseller collects cash/UPI from client separately
3. Reseller confirms payment during onboarding
4. System immediately activates a manual prepaid subscription with `billingMode: 'manual'`
5. Sets `validUntil` = now + duration and `quantity` = prepaid location count
6. Reseller shares the returned owner login, dashboard link, and customer link with the client
7. The daily maintenance scheduler expires the manual subscription after the documented seven-day grace window

**Owner billing screen behavior:**

- Online pending subscriptions stay visible on desktop and mobile billing with a "Pay Now" action using the Razorpay `shortUrl`.
- Offline subscriptions show as "Offline one-time prepaid" with prepaid period and prepaid-until date.
- Offline active subscriptions do not show Razorpay pause/cancel/upgrade actions because those actions only apply to recurring Razorpay subscriptions.
- Offline outlet creation requires unused prepaid capacity. If the client needs another location, reseller collects cash/UPI and records "Add prepaid location" before the owner creates the outlet.
- Enhancement-pack checkout is unavailable for reseller-created subscriptions until reseller payer identity, tax treatment, invoice issuer, and collection responsibility are implemented under a dedicated reviewed billing contract. The direct owner checkout must not silently treat the reseller or public business profile as the billed customer.

**Safeguards:**

- Reseller must confirm they received payment through the explicit confirmation summary and action button
- Amount is displayed (computed from tier × duration × locations) — cannot be edited
- Transaction logged immutably
- Reseller has offline activation cap

---

## 5. Onboarding Flow (Step by Step)

### Step 1: Business Details

Reseller enters:

- **Business Name** (required, text)
- **Business Type** (required, dropdown — uses existing `BUSINESS_TYPES` from `src/data/shared/businessTypes.ts`)
- **Owner Phone** (required — country dropdown + local phone number for client's login/contact)
- **Owner Email** (optional; if omitted, the phone-derived generated login email is used)
- **Owner Password** (required; stored only in Firebase Auth, never Firestore)

### Step 2: Account & Link Setup

- The reseller onboarding route creates the tenant/store account and owner credential handoff.
- The route returns the dashboard link and generated public customer link when available.
- Menu images/PDFs/text are not uploaded or extracted in this onboarding API path; the owner adds menu content later through the standard dashboard import/review flows.

### Step 3: License Setup

Reseller selects:

- **Pricing Tier:** Founder A / Founder B / Standard (dropdown)
- **Billing Interval:** Monthly / Yearly (for online) or Duration 3/6/12 months (for offline)
- **Payment Mode:** Online / Offline (toggle)
- **Commitment Period:** 3 / 6 / 12 months (for online — tracking only, not billing)
- **Locations included:** number of paid location seats. Owner can create outlets later up to this paid capacity.

System displays:

- Monthly/yearly amount (online) or total prepaid amount (offline)
- Amount includes the selected location count (`tier × duration × locations` for offline; Razorpay subscription quantity for online)
- Commitment period or validity dates

### Step 4: Confirmation

Summary screen showing:

- Business name, type
- Plan details, amount
- Payment mode
- Validity dates

Reseller confirms → System creates tenant/store/owner records, then atomically commits the selected subscription, immutable onboarding operation, offline-cap reservation, and reseller counters. The browser retains one UUID across a timeout and clears it only after the returned operation ID and scope are validated.

### Step 5: Activation

**If Online:**

- Razorpay subscription created, `shortUrl` generated
- Status: `pending` (same as self-serve)
- Reseller shares `shortUrl` with client via WhatsApp/SMS
- Activates when client completes Razorpay checkout → webhook fires `subscription.activated`

**If Offline:**

- Reseller clicks "Confirm Payment Received"
- Status: `ACTIVE` immediately
- `validUntil` set

### Step 6: Client Access Links

System returns:

- Public menu link from the generated subdomain.
- Owner username/login email, the reseller-entered password, and the dashboard sign-in link.
- Razorpay payment link for online reseller sales.
- Menu content still needs the standard owner/import/review flow before the customer link has an approved menu.

---

## 6. Reseller Dashboard Screens

### 6.1 Dashboard Home (`/reseller`)

- Total stores onboarded (count)
- Active / Expiring Soon / Expired breakdown
- Quick action: "Onboard New Client" button

### 6.2 Onboard New Client (`/reseller/onboard`)

- Multi-step form (Steps 1-5 above)
- Progress indicator
- Summary before confirmation

### 6.3 Client List (inside `/reseller`)

- Table of all onboarded stores
- Columns: Business Name, Plan, Status, Expires On, Payment Mode, Paid Locations
- Status badges: Active (green), Expiring Soon (orange), Expired (red), Pending Payment (yellow)
- Active offline/manual clients show "Add prepaid location" so reseller can record extra paid capacity before owner outlet creation.
- Active/expired manual clients expose a 3/6/12-month renewal action; active manual clients also expose add-location capacity

### 6.4 Current Runtime Boundary

- There is no separate client-detail route in the current runtime.
- The dashboard reads current reseller subscription documents directly and displays one current row per store after browser deduplication.
- The immutable transaction ledger is used for monthly reporting and operation replay, not as the client-list read model.
- Pending online rows expose the validated Razorpay checkout link; manual rows expose renewal and, while active, add-location capacity.

---

## 7. Subscription Lifecycle (Reseller-Created)

### State Machine (Identical to Self-Serve)

```
pending → active → past_due → expired
                 → paused → active
                 → cancelled → expired
                 → completed
```

This is the **same state machine** from `src/lib/billing/subscriptionStateMachine.ts`. No new states.

### State Authority Rule (CRITICAL)

The canonical subscription status is billing authority. `safeSyncStorePlanEntitlementFromSubscription()` maintains the derived store entitlement/cache projection used by owner and public reads; no separate reseller-license authority is introduced.

### Auto-Expiry (Offline Mode Only)

- The `reseller_license_expiry` task in `menulistMaintenanceScheduler.ts` checks bounded pages of `billingMode: 'manual'` subscriptions daily
- If `now > validUntil + 7 days grace` → mark `expired`
- Store access paused
- Reseller sees the current status and expiry in the dashboard
- Client sees "subscription expired" message
- **Online mode does NOT need expiry checks** — Razorpay handles lifecycle via webhooks

### Renewal

**Online mode:** Automatic. Razorpay handles recurring billing. No reseller action needed.

**Offline mode:** Reseller initiates renewal from the current-clients dashboard action.

Conversion from manual/offline to online auto-renewal is not implemented. It requires a separate owner-approved billing migration and provider-reconciliation decision; the current renewal action preserves the existing manual billing mode and tier.

**Renewal Anchor Rule (Explicit):**

- If renewal happens **before expiry** → `validUntil` extends from previous `validUntil`
- If renewal happens **after expiry** → `validUntil` starts from **now** (not from old expiry)
- New UUID-keyed renewal operation appended; an exact response-loss retry returns the stored result without extending validity or revenue twice
- Renewing an expired manual subscription atomically reacquires one active offline-cap slot and fails if the cap is already full

### Grace Period

**Online:** Handled by existing Razorpay `past_due` → 7-day retry → `expired` flow (same as self-serve).

**Offline:** 7-day grace after `validUntil` before store is actually paused.

- During grace: store works, but dashboard shows warning
- After grace: `expired` status, public menu shows "temporarily unavailable"

---

## 8. Governance & Guardrails

### 8.1 Caps

| Rule                                                  | Limit             | Type                      | Rationale                                        |
| ----------------------------------------------------- | ----------------- | ------------------------- | ------------------------------------------------ |
| Max **concurrent active** offline stores per reseller | 20                | Concurrent (not lifetime) | Prevent abuse. Expired stores free up cap slots. |
| Max total reseller accounts                           | 10                | Lifetime                  | Controlled growth                                |
| Min pricing tier                                      | Founder A (₹400)  | Fixed                     | Price floor                                      |
| Max discount                                          | ~20% off standard | Fixed                     | Protect anchor                                   |

**Cap type = concurrent active:** When an offline store expires, the reseller's cap count decrements. This prevents caps from becoming permanently exhausted.

### 8.2 Scale Thresholds

| Scale band       | Configuration decision                                           |
| ---------------- | ---------------------------------------------------------------- |
| 0-100 stores     | Full reseller program active                                     |
| 100-200 stores   | Review Founder A availability and disable the tier if approved   |
| 200+ stores      | Review offline mode and Founder B availability before expansion  |
| 500+ stores      | Reassess reseller distribution as a separate audited commercial model |

**Sunset rules use source-controlled configuration** (not operator memory). Current tier availability is controlled by `active` on each entry in `src/config/resellerPricing.ts`, and offline payment availability is controlled by `RESELLER_SYSTEM_FLAGS.OFFLINE_MODE_ACTIVE`. Commission or referral payouts are not part of the current runtime.

### 8.3 Audit Trail

Every reseller action is logged immutably:

- Store creation
- Payment confirmation status convergence (online/offline)
- Renewal
- Added prepaid location capacity
- No edits allowed — only append

### 8.4 Revenue Reporting

Reseller-onboarded stores are tagged with `onboardingSource: 'reseller'` and `resellerId`.

Dashboard (founder only) shows:

- MRR from reseller channel vs self-serve
- Revenue by reseller
- Offline vs online split

---

## 9. What Client Sees

The client has **zero awareness** of the reseller layer:

- Their plan shows "MenuList Official" (not "Founder Tier A")
- Their billing page shows subscription details normally
- If online: they see Razorpay payment history
- If offline: they see "Prepaid until [date]"
- No "reseller" branding anywhere

---

## 10. Business Rules Summary

1. **Reseller is invitation-only** — a platform admin provisions/deactivates the role through protected management
2. **No arbitrary prices** — fixed tiers only
3. **No reseller billing** — resellers are not charged for using the dashboard
4. **Offline = trust-based** — reseller confirms payment, system trusts
5. **Auto-expiry enforced** — no immortal offline stores
6. **Immutable logs** — every transaction recorded, never editable
7. **Client owns the account** — reseller cannot access client's store after activation
8. **Same product, different distribution** — client gets identical MenuList experience
9. **Convergence toward controlled operations** — reseller distribution stays capped and source-configured
10. **No commission system** — explicitly out of scope unless a separate billing/revenue-share feature is documented, audited, implemented, and verified

---

## 11. Risks & Mitigations

| Risk                                     | Likelihood | Impact         | Mitigation                                                    |
| ---------------------------------------- | ---------- | -------------- | ------------------------------------------------------------- |
| Reseller doesn't collect offline payment | Medium     | Revenue loss   | Cap system + immutable logs + founder oversight               |
| Price comparison between clients         | Low        | Trust damage   | All clients see "MenuList Standard" — internal pricing hidden |
| Reseller abuse (mass fake activations)   | Low        | Cost + data    | Offline cap + reseller approval process                       |
| Client can't login after onboarding      | Medium     | Support burden | Explicit username/login email/password and dashboard-link handoff |
| Manual license tracking burden           | Medium     | Ops overhead   | Auto-expiry + dashboard alerts                                |

---

## 12. Open Questions

1. **Should resellers earn commission?** — No current commission runtime exists. Reseller distribution remains relationship-based until a separate audited billing/revenue-share feature exists.
2. **Should clients be able to convert from offline to online recurring?** — Not implemented in the reseller flow. Keep this as an owner/product decision; do not infer a provider migration from the manual-renewal action.
3. **Should resellers see client analytics?** — No. Resellers see status only, not engagement data.
4. **Multi-currency for resellers?** — Current scope is INR only. Other currencies require a separate pricing, tax, billing, and docs audit before they are exposed.

---

**DOCUMENT STATUS:** ✅ IMPLEMENTED  
**Last Updated:** July 16, 2026 (v1.5 — atomic billing, exact retries, renewal parity, and current-subscription client reads)
