# Owner Referral - Product Specification

**Feature:** Owner Referral
**Owner-facing label:** Invite a business owner you know
**Status:** Implemented and locally verified behind disabled flags; pilot not enabled
**Decision owner:** Founder
**Last updated:** July 11, 2026
**Audience:** Founder, product, engineering, operations, support, finance

---

## Product Definition

An eligible MenuList business can privately share a referral link with a business owner they know. When the referring business and the referred business both have verified paid MenuList subscriptions, MenuList atomically adds 100 credits to the referring business and 50 credits to the referred business.

The reward is based on payment only. MenuList does not require the referred business to publish, share, download a QR, complete distribution actions, remain paid for a waiting period, or meet a usage threshold.

Credits are added to the existing `topUpCredits` Pack balance. At current rates, 100 credits can cover up to 20 generated menu images or 100 description rewrites; 50 credits can cover up to 10 generated menu images or 50 description rewrites. They are not cash, monthly plan allowance, commission, or a transferable asset.

---

## Founder Policy Decision

The founder replaced the prior activation-based qualification model at `2026-07-10T10:46:23+05:30`.

The fixed rule is:

> If both MenuList businesses have verified paid subscriptions, the referral is eligible.

The active specification therefore has:

- no rolling reward cap;
- no lifetime reward cap;
- no live customer-source requirement;
- no distribution-action requirement;
- no retention waiting period;
- no first-payment or qualification deadline after attribution;
- no plan-tier, billing-interval, geography, category, onboarding-source, reseller, agency, owner-identity, device, IP, phone, or business-name exclusion;
- no scheduled qualification process.

The complete decision record is [owner-referral_payment-only-policy-amendment-2026-07-10.md](./_archive/owner-referral_payment-only-policy-amendment-2026-07-10.md).

---

## Goals

1. Let a paid MenuList business privately introduce a business owner they know.
2. Reward both businesses as soon as MenuList verifies that both subscriptions are paid.
3. Keep the owner flow to one share action and one clear rule.
4. Reuse the existing credit wallet and payment truth.
5. Keep attribution secure, private, idempotent, and tenant-scoped.

## Non-Goals

- cash payouts or commissions;
- affiliate or partner economics;
- public rankings, tiers, badges, or leaderboards;
- contact import or MenuList-sent WhatsApp outreach;
- public referral banners on customer pages;
- rewards for clicks, views, registrations, top-up purchases, or unrelated products;
- retroactive referral attachment after the referred business's first paid subscription payment.

---

## Doctrine and Authorization

Owner Referral remains a non-core distribution feature and requires the founder override defined by `__docs__/constitution/08-feature-rejection-gate.md`.

Because the payment-only and uncapped policy materially changes reward liability, the cooling-period clock was anchored to `policyAmendedAt = 2026-07-10T10:46:23+05:30`. The founder then recorded immediate engineering approval and explicitly waived the remaining cooling-period wait at `2026-07-10T12:12:46+05:30`. That approval authorizes source implementation only; team, finance, legal, pilot, staging infrastructure, sandbox payment, and production-host evidence still govern release enablement.

The implementation must still follow the feature lifecycle in `__docs__/constitution/14-feature-lifecycle-doctrine.md`: source-complete behind off flags, five-business pilot, and broader enablement only after pilot evidence.

Pilot allowlisting and feature flags are rollout controls. They are not reward-eligibility limits once the feature is enabled for a business.

---

## Repository Truth

| Existing behavior | Evidence | Referral decision |
| --- | --- | --- |
| Subscription wallets contain `monthlyCredits` and non-resetting `topUpCredits`. | `src/types/razorpay.ts:92` | Add rewards only to `topUpCredits`. |
| AI capacity consumes monthly credits before Pack credits. | `src/lib/ai/capacityCheck.ts:136,159-215` | Referral credits work through the existing capacity model. |
| Pack copy names generated images, descriptions, and translations. | `src/data/PlatformPlansList.ts:116`; `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx:482-483` | Explain the reward through those outcomes. |
| Public-safe credit rates are centralized. | `src/data/shared/contentCreditPolicy.ts` | Derive pricing and referral examples from one rate source; keep provider cost and margin internal. |
| Subscription verification requires captured provider payment. | `src/app/api/razorpay/verify-subscription/route.ts:295,426` | Browser state alone cannot issue a reward. |
| The verified callback may return after a webhook already activated the subscription. | `src/app/api/razorpay/verify-subscription/route.ts:295` | Both success branches call the same idempotent settlement helper. |
| Signed webhooks process subscription activation and charge events. | `src/app/api/razorpay/webhook/route.ts:687` | Webhook and callback races must settle once. |
| New-account onboarding creates tenant/store state transactionally. | `src/app/api/public/create-menu/claim/route.ts:482`; `src/app/api/onboarding/create-subscription/route.ts:283` | Bind referral attribution in the existing server transaction when possible. |
| Existing businesses create subscriptions through the regular Razorpay route. | `src/app/api/razorpay/create-subscription/route.ts:188` | An existing unpaid MenuList business may bind a captured referral before its first successful subscription payment. |
| Billing already displays Pack balance. | `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx:482-483` | No second wallet UI is needed. |

---

## Payment-Only Eligibility

A referral becomes reward-eligible when all three statements are true:

1. A valid referral was bound to the referred MenuList business before that business's first successful subscription payment.
2. The referring business has a provider-verified paid MenuList subscription with a distinct credit wallet.
3. The referred business has a provider-verified paid MenuList subscription with a distinct credit wallet.

No other product, usage, identity, source, or volume condition applies.

### Meaning of Two Paid Businesses

- The businesses resolve to two different MenuList store/subscription wallet scopes.
- They may have the same owner, phone, device, IP, business name, reseller, agency, or onboarding source.
- Any supported MenuList plan, billing interval, or paid onboarding source qualifies when the canonical subscription record and captured payment prove that MenuList received the subscription payment.
- An inherited outlet without its own paid subscription wallet is not a second paid party.
- Answerlattice, CampaignCue, MyCodex, top-up orders, and unrelated payment records are not MenuList subscription payments.

### Attribution Timing

- The invite token and browser capture remain valid for 30 days for security.
- Once a referral is bound to an unpaid MenuList business, the attribution has no payment deadline.
- An existing unpaid MenuList business may bind the referral before its first paid subscription.
- A business that completed its first paid MenuList subscription before referral attribution cannot attach the referral retroactively.
- First valid attribution wins and cannot be overwritten.

---

## Fixed Reward

| Recipient | Reward | Issue time | Destination |
| --- | ---: | --- | --- |
| Referring business | 100 credits | As soon as both paid subscriptions are verified | Current `topUpCredits` wallet |
| Referred business | 50 credits | Same atomic transaction | Current `topUpCredits` wallet |

There is no cap. Every distinct referred business that reaches the two-paid-business state can issue one reward pair.

One referred business cannot issue the reward twice. This is idempotency, not a referral limit.

Later cancellation, refund, or chargeback does not subtract pooled Pack credits or create a negative balance. Payment and account enforcement continue through existing policies independently of referral settlement.

---

## Owner and Referred-Business Flow

### Flow A: Paid Business Shares

1. The business opens MenuList Share.
2. The owner selects `Invite a business owner you know`.
3. MenuList verifies that the business has a paid MenuList subscription record.
4. MenuList creates a stateless authenticated encrypted 30-day link.
5. The owner shares through native Share, WhatsApp, or Copy link.

Default message:

> We use MenuList to keep our menu and business information current from one place. I thought it could help your business too: [invite link]
>
> Referral note: MenuList adds credits to both businesses after both MenuList subscriptions are paid.

MenuList does not import contacts, choose a recipient, or store who received the native share.

### Flow B: Invited Business Captures Referral

1. The invite page reads the fragment token, removes it from the visible URL, and keeps it only in memory.
2. Opening or previewing the page does not set attribution.
3. The page explains the 100/50 rewards and payment-only rule.
4. The page explains that the referrer can see the business display name and a general referral status.
5. The invited owner selects `Create my customer link`.
6. MenuList first keeps the referral journey on the canonical public MenuList host, then validates the token and stores it in a host-only HttpOnly cookie.
7. The owner may create a new business or continue with an existing unpaid MenuList business.
8. The shared server attribution helper binds the referral before the business's first paid subscription.

The normal non-referral setup path remains available and does not call the capture endpoint.

### Flow C: Payment and Immediate Settlement

1. Razorpay or another approved MenuList billing path confirms a captured subscription payment.
2. The shared settlement helper records the referred business's verified paid state.
3. It resolves both current MenuList subscription wallets.
4. If both are paid, one Firestore transaction adds 100 and 50 credits and marks the referral issued.
5. If only one is paid, the referral remains `payment_pending` without expiry.
6. A later verified subscription activation for either business retries pending settlement.

There is no publish, usage, distribution, retention, deadline, cap, or scheduler qualification step.

### Flow D: Referrer Checks Status

| Internal state | Owner-facing status | Meaning |
| --- | --- | --- |
| `attributed` | Their payment pending | Referral is attached, but the referred first subscription payment is not verified. |
| `payment_pending` | Their payment pending | Settlement is still waiting for the referred business while the paid referrer is viewing the panel. |
| `reward_issued` | Credits added | 100 credits were added to the referring business and 50 to the referred business. |

The protected owner API is available only while the referring business has a verified paid subscription. Therefore, an unsettled row shown in this panel always uses `Their payment pending`; the richer internal `payment_pending` state remains for settlement and repair. The status list shows the referred business display name, general status, and relevant date only. It never exposes plan, price, payment amount, payment method, email, phone, or account activity.

---

## Functional Requirements

### FR-1: Paid Referrer Entry

Only a MenuList business with verified paid subscription evidence can generate an invite. There is no referral-count check.

### FR-2: Secure Stateless Invitation

The token uses AES-256-GCM authenticated encryption, domain-separated HKDF keys, a unique IV, opaque internal scope, and a 30-day TTL. It travels in `#r=` so the server request path and Referrer header do not receive it.

The token may be used by multiple invited businesses until expiry. Each referred business still has one deterministic attribution and one reward pair.

### FR-3: Consent-Bound Capture

Page load never sets the cookie. Only the explicit CTA calls the same-origin capture endpoint. The invite page, sign-in/setup continuation, and payment-start request remain on the canonical public MenuList host so the host-only cookie is not lost across `www`, dashboard, tenant, or custom-domain hosts. The cookie is host-only, HttpOnly, Secure outside local development, SameSite=Lax, Path `/`, and valid for 30 days.

### FR-4: Pre-Payment Attribution

The shared attribution helper supports:

- new Public Menu Entry account creation;
- new website subscription onboarding;
- regular subscription creation for an existing unpaid MenuList business;
- any other MenuList onboarding source that receives a valid referral token before first paid subscription.

Onboarding source, reseller involvement, owner identity, business identity, device, IP, phone, and geography do not change eligibility.

### FR-5: Payment Truth

Settlement accepts only canonical MenuList subscription payment evidence from a signed Razorpay webhook, verified callback, or an authorized server-side manual-payment confirmation already supported by MenuList billing. It does not trust client-supplied paid state or dates.

### FR-6: Atomic Reward Issuance

One Firestore transaction must:

- read the referral record;
- read both current MenuList subscription wallet documents;
- verify both paid entitlements;
- verify that the reward has not already issued;
- add 100 to referrer `topUpCredits`;
- add 50 to referred `topUpCredits`;
- leave monthly credit fields unchanged;
- record the deterministic issue ID, payment evidence, before/after balances, and issue time;
- set `reward_issued` exactly once.

Any failed read or write leaves both balances unchanged.

### FR-7: Event-Driven Pending Repair

If one side is not paid at the first settlement attempt, record `payment_pending`. A later verified subscription activation checks pending referrals associated with that store and retries settlement. No daily qualification scheduler is added.

### FR-8: Private Status

Firestore rules deny direct client access. The protected owner route returns at most ten recent rows and no financial or contact detail about the other business.

### FR-9: Mobile Parity

Mobile uses the existing Share tab and a shell-owned bottom sheet. It does not add a navigation item or route bypass.

### FR-10: Terms and Disclosure

Terms and invite copy must state:

- the exact 100/50 rewards;
- both subscriptions must be paid;
- no usage or waiting requirement exists;
- there is no reward cap;
- rewards have no cash value;
- referral attribution must precede the referred first payment;
- the referrer can see the referred business display name and general status.

---

## Non-Functional Requirements

| Area | Requirement |
| --- | --- |
| Security | Auth, tenant/store scope, token encryption, CTA-only capture, payment signatures, rate limits, bounded bodies, secure logs, server-only writes. |
| Privacy | Pre-capture business-name/status disclosure; no contact or financial details in status or analytics. |
| Reliability | Callback, webhook, activation retry, and concurrent settlement issue exactly one atomic reward pair. |
| Cost | No view/share writes, no qualification scheduler, no project-summary reads, no distribution-signal writes, bounded status and pending-settlement queries. |
| Performance | Invite and share UI load lazily; payment settlement is non-blocking to successful subscription activation. |
| Accessibility | 44px controls, keyboard support, visible focus, screen-reader labels, status not communicated by color alone. |
| Localization | English and Hindi owner/public strings ship together. |
| Feature control | Acquisition and settlement flags default off; pilot allowlist defaults empty. |

---

## Market and Compliance Reference

- [Square's referral program](https://squareup.com/help/us/en/article/5209-square-s-referral-program) uses a new seller's first payment as the reward trigger and shows referral progress. MenuList adopts the payment trigger and coarse status.
- [Dropbox referral storage](https://help.dropbox.com/storage-space/earn-space-referring-friends) uses a product-native reward for both parties. MenuList uses product credits.
- [ASCI guidance](https://www.ascionline.in/the-asci-code-guidelines/) and [FTC advertising guidance](https://www.ftc.gov/business-guidance/resources/advertising-faqs-guide-small-business) support clear disclosure when a recommendation carries a benefit.

MenuList intentionally does not add post-payment activation gates or a reward cap.

---

## Measurement

Primary metric:

**Verified paid referred businesses per 100 eligible referring businesses**

Supporting metrics:

- invite panel opens;
- share starts by method;
- referral captures;
- attributed businesses;
- first paid conversions;
- immediate reward-issue success;
- payment-pending referrals;
- duplicate settlement attempts prevented;
- reward provider cost per paid referred business;
- support contacts per 100 paid referrals.

No owner ranking, threshold, or reward limit is derived from these metrics.

---

## Risks and Controls

| Risk | Control |
| --- | --- |
| Unbounded aggregate credit liability | Every reward requires two paid MenuList subscription wallets; finance approves per-referral provider exposure before enablement. |
| Callback/webhook double issue | Deterministic referral and issue IDs plus transaction state check. |
| Referral attached after payment | Bind before referred first successful subscription; reject retroactive attachment. |
| One business receives repeated rewards | One deterministic referral record and reward issue per referred store wallet. |
| Payment forged in browser | Signed webhook or verified callback only. |
| One side not paid | Keep `payment_pending` without expiry and retry from verified subscription activation. |
| Referrer sees private information | Pre-capture disclosure and coarse status with no payment, plan, contact, or activity details. |
| Token leakage | Fragment transport, authenticated encryption, immediate fragment removal, host-only cookie, no token logging. |
| Post-issue refund or cancellation | No pooled-wallet clawback; existing payment/account policy remains separate. |

---

## Acceptance Criteria

- [x] Founder immediate implementation approval and cooling-period waiver are recorded.
- [x] The approval explicitly accepts payment-only eligibility, no reward cap, and unbounded aggregate credit liability.
- [x] A paid MenuList business can share from desktop and mobile when admitted by rollout controls.
- [x] Opening or previewing a link cannot capture attribution.
- [x] New and existing-unpaid MenuList businesses can bind a referral before first payment.
- [x] Existing-paid businesses cannot attach a referral retroactively; the existing-business prior-payment query runs inside the attribution transaction.
- [x] Any supported MenuList plan or already-attributed manual/offline payment source qualifies when both distinct wallets are paid.
- [x] No self, duplicate-name, reseller, agency, device, IP, geography, plan-tier, usage, distribution, retention, or volume exclusion exists.
- [x] No live customer source, QR action, sharing action, or 30-day wait is checked.
- [x] No first-payment or qualification deadline exists after attribution.
- [x] No rolling or lifetime reward cap exists.
- [x] Captured payment plus two paid wallet documents issues 100/50 credits immediately and atomically.
- [x] Monthly credit fields remain unchanged.
- [x] Callback, webhook, activation retry, and concurrent attempts cannot issue twice.
- [x] Pending referrals have no expiry and settle when both subscriptions become paid.
- [x] Status reveals no cross-business financial or contact information.
- [x] Credit examples are derived from `src/data/shared/contentCreditPolicy.ts` and match the charged operation rates.
- [x] Acquisition and settlement controls default off and the pilot allowlist defaults empty.
- [x] English/Hindi runtime copy, legal source copy, help source, website, desktop, and mobile are aligned.

---

## Implementation Authorization

Engineering implementation was authorized immediately by the founder and is source-complete behind disabled flags.

Pilot enablement still requires:

1. team announcement and lifecycle decision;
2. finance approval of uncapped aggregate issuance and per-referral provider exposure;
3. legal approval of payment-only reward and visibility disclosures;
4. five pilot businesses are approved;
5. `menulist-qa` Firestore rules/index deployment succeeds;
6. sandbox payment and production-host browser/device evidence pass.

The feature remains off until those release gates pass.
