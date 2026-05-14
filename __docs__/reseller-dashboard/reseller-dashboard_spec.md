# Reseller Dashboard — Product Specification

**Feature:** Assisted Onboarding Portal for Authorized Resellers  
**Status:** 📝 DOCUMENTED  
**Created:** February 27, 2026  
**Audience:** CEO, Business Team, Product Team

---

## 1. Executive Summary

### What

A controlled, role-gated dashboard where authorized resellers (friends, sales partners) manually onboard SMB clients into MenuList. Resellers handle business setup, menu upload, pricing selection, and payment coordination — the client receives a ready-to-use MenuList account.

### Why

- **Density before automation:** Early-stage growth requires assisted distribution in target cities
- **Low-tech SMB reality:** Many Indian SMB owners won't self-serve through a website pricing page
- **Founder network leverage:** Friends and trusted contacts can sell MenuList locally with credibility
- **Reduced onboarding friction:** Client doesn't need to understand SaaS pricing pages — reseller handles everything

### Scope

- **In scope:** Reseller dashboard, store creation, pricing tier selection, online/offline payment, license management, reseller tracking, auto-expiry
- **Out of scope:** White-labeling, reseller self-registration, commission calculations, reseller billing, public partner program, API access for resellers

### Success Metric

- 50+ stores onboarded via reseller channel within first 3 months
- < 5 minutes per onboarding (reseller time)

---

## 2. User Roles

### 2.1 Reseller (New Role)

**Who:** Founder's trusted friends/contacts authorized to sell MenuList locally.

**How they get access:**

- Founder manually sets `platformRole: 'RESELLER'` on user document in Firestore
- No self-registration. No public signup. Invitation-only.
- Reseller must have a MenuList account (email login via existing auth)

**What they can do:**

- Create stores for new clients
- Upload menus on behalf of clients
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

- Receives a ready MenuList account
- Logs in with credentials provided during onboarding
- Sees their menu already uploaded
- Full owner dashboard access (same as self-serve customers)
- No awareness they were onboarded by a reseller (transparent)
- For online payment: completes Razorpay checkout via activation link
- For offline payment: account activated immediately by reseller

---

## 3. Pricing Architecture

### 3.1 Public Price Anchor (Sacred — Never Changes Per Client)

| Plan    | Monthly (INR) | Monthly (USD) |
| ------- | ------------- | ------------- |
| Starter | ₹499          | $29           |
| Pro     | ₹1,499        | $79           |
| Premium | ₹3,999        | $149          |

These are the standard prices from `PlatformPlansList.ts`. They remain the public anchor.

### 3.2 Reseller Pricing Tiers (Internal Only)

Resellers see predefined discounted tiers. These are NOT visible publicly.

| Tier          | Name           | Monthly INR              | Use Case                       |
| ------------- | -------------- | ------------------------ | ------------------------------ |
| `FOUNDER_400` | Founder Tier A | ₹400/mo                  | Close family, early supporters |
| `FOUNDER_500` | Founder Tier B | ₹500/mo                  | Friends, local contacts        |
| `STANDARD`    | Standard       | ₹499/mo (same as public) | Regular reseller sales         |

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

**Offline mode** uses prepaid duration:

| Duration  | Billing                   |
| --------- | ------------------------- |
| 3 months  | Manual prepaid (cash/UPI) |
| 6 months  | Manual prepaid (cash/UPI) |
| 12 months | Manual prepaid (cash/UPI) |

### 3.4 Pricing Summary

| Mode           | Tier      | Monthly | Yearly    |
| -------------- | --------- | ------- | --------- |
| Online/Offline | Founder A | ₹400/mo | ₹4,800/yr |
| Online/Offline | Founder B | ₹500/mo | ₹6,000/yr |
| Online/Offline | Standard  | ₹499/mo | ₹5,988/yr |

---

## 4. Payment Modes

### 4.1 Online (Razorpay Recurring Subscription)

**Flow:**

1. Reseller creates store → selects tier + billing interval (monthly/yearly) + Online payment
2. System creates Razorpay subscription (same as self-serve) via `getOrCreateRazorpayPlan()`
3. Subscription returns `shortUrl` — reseller shares with client (WhatsApp, SMS, email)
4. Client clicks `shortUrl` → Razorpay checkout → sets up autopay mandate → first payment
5. Razorpay webhook (`subscription.activated` / `subscription.charged`) → subscription activated
6. Reseller shares the returned dashboard claim link with the client
7. Subsequent renewals are automatic (Razorpay handles billing)

**Why Razorpay Subscription (same as self-serve):**

- **Unified billing engine** — same webhooks, same state machine, same lifecycle
- **Auto-renewal** — no manual renewal burden on reseller
- **Clean MRR** — every reseller store contributes to recurring revenue
- **No new Razorpay API** — reuses existing `getOrCreateRazorpayPlan()` + `create-subscription` flow
- **`shortUrl` already exists** — subscription objects already include a shareable checkout URL

**Two billing models total (not three):**

| Channel                      | Billing               | Recurring | Renewal |
| ---------------------------- | --------------------- | --------- | ------- |
| Self-serve + Reseller Online | Razorpay Subscription | Yes       | Auto    |
| Reseller Offline             | Manual (temporary)    | No        | Manual  |

### 4.2 Offline (Cash / UPI / Bank Transfer)

**Flow:**

1. Reseller creates store → selects tier + duration + Offline payment
2. Reseller collects cash/UPI from client separately
3. Reseller confirms payment during onboarding
4. System immediately activates a manual prepaid subscription with `billingMode: 'manual'`
5. Sets `validUntil` = now + duration
6. Reseller shares the returned dashboard claim link with the client
7. Nightly scheduler auto-expires when `validUntil` passes

**Safeguards:**

- Reseller must confirm they received payment (checkbox + button)
- Amount is displayed (computed from tier × duration) — cannot be edited
- Transaction logged immutably
- Reseller has offline activation cap

---

## 5. Onboarding Flow (Step by Step)

### Step 1: Business Details

Reseller enters:

- **Business Name** (required, text)
- **Business Type** (required, dropdown — uses existing `BUSINESS_TYPES` from `src/constants/common.ts`)
- **Owner Phone** (required — for client's login/contact)
- **Owner Email** (optional contact email — dashboard access is delivered through the claim link unless an existing unclaimed user is found)

### Step 2: Menu Upload

- Upload menu images (reuses existing upload pipeline)
- AI extraction runs (same as self-serve)
- Reseller can skip this step → client uploads later

### Step 3: License Setup

Reseller selects:

- **Pricing Tier:** Founder A / Founder B / Standard (dropdown)
- **Billing Interval:** Monthly / Yearly (for online) or Duration 3/6/12 months (for offline)
- **Payment Mode:** Online / Offline (toggle)
- **Commitment Period:** 3 / 6 / 12 months (for online — tracking only, not billing)

System displays:

- Monthly/yearly amount (online) or total prepaid amount (offline)
- Commitment period or validity dates

### Step 4: Confirmation

Summary screen showing:

- Business name, type
- Plan details, amount
- Payment mode
- Validity dates

Reseller confirms → System creates everything atomically.

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

System creates:

- Public menu link from the generated subdomain.
- Dashboard claim link for the client to connect Google or set email/password.
- Razorpay payment link for online reseller sales.

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

### 6.3 My Clients (`/reseller/clients`)

- Table of all onboarded stores
- Columns: Business Name, Plan, Status, Expires On, Payment Mode
- Status badges: Active (green), Expiring Soon (orange), Expired (red), Pending Payment (yellow)
- Click → details view

### 6.4 Client Detail (`/reseller/clients/[storeId]`)

- Business info (read-only after creation)
- Subscription status
- Payment history (for this client)
- Renewal action (create new license period)

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

**`subscription.status` is the SOLE authority for store access.** Never check a separate store status field. All access decisions derive from subscription status — for both online and offline modes.

### Auto-Expiry (Offline Mode Only)

- Nightly scheduler checks all `billingMode: 'manual'` subscriptions
- If `now > validUntil + 7 days grace` → mark `expired`
- Store access paused
- Reseller notified (dashboard badge)
- Client sees "subscription expired" message
- **Online mode does NOT need expiry checks** — Razorpay handles lifecycle via webhooks

### Renewal

**Online mode:** Automatic. Razorpay handles recurring billing. No reseller action needed.

**Offline mode:** Reseller initiates renewal from client detail page.

**Renewal Anchor Rule (Explicit):**

- If renewal happens **before expiry** → `validUntil` extends from previous `validUntil`
- If renewal happens **after expiry** → `validUntil` starts from **now** (not from old expiry)
- New transaction appended (never mutate old ones)

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

### 8.2 Sunset Plan

| Phase   | When           | Action                                                   |
| ------- | -------------- | -------------------------------------------------------- |
| Phase 1 | 0-100 stores   | Full reseller program active                             |
| Phase 2 | 100-200 stores | Remove Founder A tier (feature-flag controlled)          |
| Phase 3 | 200+ stores    | Offline mode disabled, Founder B sunset                  |
| Phase 4 | 500+ stores    | Reseller becomes referral-only (commission, not pricing) |

**Sunset rules are encoded in feature flags** (not relied on discipline). Example: `RESELLER_TIER_FOUNDER_400_ACTIVE: true` → set to `false` at Phase 2 threshold.

### 8.3 Audit Trail

Every reseller action is logged immutably:

- Store creation
- Payment confirmation (online/offline)
- Renewal
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

- Their plan shows "MenuList Starter" (not "Founder Tier A")
- Their billing page shows subscription details normally
- If online: they see Razorpay payment history
- If offline: they see "Prepaid until [date]"
- No "reseller" branding anywhere

---

## 10. Business Rules Summary

1. **Reseller is invitation-only** — founder sets role manually in DB
2. **No arbitrary prices** — fixed tiers only
3. **No reseller billing** — resellers are not charged for using the dashboard
4. **Offline = trust-based** — reseller confirms payment, system trusts
5. **Auto-expiry enforced** — no immortal offline stores
6. **Immutable logs** — every transaction recorded, never editable
7. **Client owns the account** — reseller cannot access client's store after activation
8. **Same product, different distribution** — client gets identical MenuList experience
9. **Convergence toward automation** — reseller program is a growth hack, not permanent infrastructure
10. **No commission system in v1** — future consideration only

---

## 11. Risks & Mitigations

| Risk                                     | Likelihood | Impact         | Mitigation                                                    |
| ---------------------------------------- | ---------- | -------------- | ------------------------------------------------------------- |
| Reseller doesn't collect offline payment | Medium     | Revenue loss   | Cap system + immutable logs + founder oversight               |
| Price comparison between clients         | Low        | Trust damage   | All clients see "MenuList Standard" — internal pricing hidden |
| Reseller abuse (mass fake activations)   | Low        | Cost + data    | Offline cap + reseller approval process                       |
| Client can't login after onboarding      | Medium     | Support burden | Auto-credential flow + magic link                             |
| Manual license tracking burden           | Medium     | Ops overhead   | Auto-expiry + dashboard alerts                                |

---

## 12. Open Questions

1. **Should resellers earn commission?** — Deferred to Phase 2. Currently pure distribution, no financial incentive beyond relationship.
2. **Should clients be able to convert from offline to online recurring?** — Yes, at renewal time. Same Razorpay flow as self-serve upgrade.
3. **Should resellers see client analytics?** — No. Resellers see status only, not engagement data.
4. **Multi-currency for resellers?** — v1 is INR only. USD tiers can be added later with same architecture.

---

**DOCUMENT STATUS:** ✅ IMPLEMENTED (Feature Flag OFF)  
**Last Updated:** February 27, 2026 (v1.2 — implementation complete)
