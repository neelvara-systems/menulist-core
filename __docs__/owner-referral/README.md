# Owner Referral

> **Status:** Implemented and locally verified behind off-by-default flags; pilot release not enabled; staging Firebase deploy blocked by IAM
>
> **Acquisition:** `ENABLE_OWNER_REFERRAL` plus `OWNER_REFERRAL_PILOT_STORE_IDS` (implemented, off/empty)
>
> **Settlement:** `ENABLE_OWNER_REFERRAL_REWARD_PROCESSING` (implemented, off)
>
> **Last updated:** July 11, 2026

When the pilot list is populated, desktop, mobile, owner API, capture, and attribution all enforce it. An empty list represents broad rollout and must not be used until the pilot release decision is complete.

## What It Is

Owner Referral lets a paid MenuList business privately invite a business owner they know. When both businesses have verified paid MenuList subscription wallets, MenuList adds:

- **100 credits** to the referring business;
- **50 credits** to the referred business.

Credits are added once to existing `topUpCredits` Pack balances. At current rates, 100 credits can cover up to 20 generated menu images or 100 description rewrites; 50 credits can cover up to 10 generated menu images or 50 description rewrites.

## Payment-Only Rule

The referral has no additional qualification requirements.

It does not require:

- publishing a menu or customer page;
- downloading or placing a QR;
- sharing a link;
- completing distribution actions;
- remaining paid for 14, 30, or any other number of days;
- meeting a first-payment or qualification deadline after attribution;
- staying below a rolling or lifetime reward cap;
- matching a plan tier, billing interval, geography, business type, onboarding source, or ownership pattern.

Same-owner businesses, reseller/agency-assisted businesses, and other onboarding sources qualify when they resolve to two distinct paid MenuList subscription wallets and the referral was bound before the referred first payment.

## Integrity Boundaries

These controls remain:

- referral attribution must be captured before the referred business's first successful MenuList subscription payment;
- existing-business prior-payment truth is read in the same transaction that creates attribution, preventing a payment/attribution race;
- the two businesses must have distinct subscription wallets;
- payments must be provider-verified MenuList subscription payments;
- one referred business issues one reward pair;
- rewards are atomic and idempotent;
- tokens expire after 30 days for security;
- private status does not expose payment or contact information;
- every issued reward creates two deterministic zero-cash `payment_transactions` ledger rows with before/after Pack balances;
- feature flags and the five-business pilot control rollout.

## Fixed Decisions

| Decision | Contract |
| --- | --- |
| Owner label | `Invite a business owner you know` |
| Referrer reward | 100 one-time credits |
| Referred reward | 50 one-time credits |
| Reward trigger | Both distinct MenuList subscription wallets are verified paid |
| Reward timing | Immediate when both payments are verified |
| Reward destination | Existing `topUpCredits`; never monthly credits |
| Reward cap | None |
| Usage/retention conditions | None |
| Attribution deadline after binding | None |
| Invite token/cookie security window | 30 days |
| Sharing | Native Share, WhatsApp, Copy link |
| Statuses | Their payment pending, Credits added |
| Credit-rate source | `src/data/shared/contentCreditPolicy.ts` |
| Privacy | Referrer sees business display name and general status only after pre-capture disclosure |

## Documentation

| Document | Audience |
| --- | --- |
| [Specification](./owner-referral_spec.md) | Founder, product, operations |
| [Implementation](./owner-referral_impl.md) | Engineering, security, billing |
| [Firebase](./owner-referral_firebase.md) | Engineering, finance |
| [Mobile support](./owner-referral_mobile-support.md) | Mobile product and engineering |
| [Test cases](./owner-referral_test-cases.md) | QA and engineering |
| [Validation](./owner-referral_validation.md) | Decision and alignment record |
| [Marketing](./owner-referral_marketing.md) | Internal marketing and sales |
| [Website](./owner-referral_website.md) | Public copy source |
| [Help](./owner-referral_helpdoc.md) | Owner support source |

## Decision History

- [Immediate founder implementation approval](./_archive/owner-referral_immediate-founder-implementation-approval-2026-07-10.md)
- [Founder payment-only policy amendment](./_archive/owner-referral_payment-only-policy-amendment-2026-07-10.md)
- [Post-doc ChatGPT feedback audit](./_archive/owner-referral_doc-feedback-audit-2026-07-10.md) - historical; superseded where it retained activation gates or caps
- [Owner-to-owner referral ChatGPT review](../menulist-marketing-distribution/_archive/owner-to-owner-referral-chatgpt-review-2026-07-10.md)
- [AI Enhancement Packs](../ai-enhancement-packs/README.md)
- [Feature lifecycle doctrine](../constitution/14-feature-lifecycle-doctrine.md)

## Implementation Entry Gate

Engineering implementation was authorized immediately by the founder on `2026-07-10T12:12:46+05:30`. The remaining checklist governs release enablement:

- [x] founder approval explicitly accepts payment-only eligibility, no reward cap, and aggregate credit liability;
- [x] founder waived the remaining cooling-period wait for engineering implementation;
- [x] implementation, source verifier, TypeScript, lint, and Firestore emulator accounting/rules tests pass;
- [ ] the required team announcement and lifecycle decision are recorded;
- [ ] finance approves per-referral provider cost and uncapped aggregate issuance;
- [ ] legal approves reward and privacy disclosure;
- [ ] five pilot businesses are approved.

Acquisition and settlement remain off until the `menulist-qa` Firestore rule/index deploy, sandbox payment proof, production-host browser/device QA, and the external release confirmations pass. Both authenticated Firebase CLI accounts currently receive a rules-compile `403`, so staging infrastructure is not yet deployed.
