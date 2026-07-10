# Owner Referral Payment-Only Policy Amendment

**Decision owner:** Founder
**Recorded:** `2026-07-10T10:46:23+05:30`
**Status:** Supersedes activation-based reward qualification in the active Owner Referral doc set

## Founder Decision

The founder removed the rolling reward cap and every post-payment usage requirement.

The governing rule is now:

> When the referring MenuList business and the referred MenuList business both have verified paid subscriptions, the referral is eligible and MenuList adds the fixed credits to both businesses.

## Fixed Reward

| Business | Reward |
| --- | ---: |
| Referring business | 100 credits |
| Referred business | 50 credits |

Both rewards are issued atomically to the existing `topUpCredits` balances.

## Removed Conditions

The active contract must not require:

- a live or published customer source;
- QR download, link sharing, Menu Kit download, placement confirmation, or any other distribution action;
- 14-day, 30-day, or other paid-retention waiting periods;
- a first-payment deadline after attribution;
- a qualification deadline after payment;
- a rolling reward cap or lifetime reward cap;
- owner ranking, tiers, thresholds, or milestone counts;
- a particular MenuList plan tier, billing interval, geography, business category, onboarding source, or ownership relationship;
- self-referral, duplicate-name, shared-phone, shared-device, shared-IP, reseller, agency, messaging, or assisted-onboarding disqualification when two distinct MenuList business wallets have verified paid subscriptions;
- public-summary reads, starter-activation signals, scheduler qualification, or delayed settlement.

## Conditions That Remain

These are integrity requirements, not growth limitations:

1. The referral must be captured and bound before the referred business's first successful MenuList subscription payment. No retroactive attachment after that first payment.
2. The referrer and referred party must resolve to two distinct MenuList business subscription wallets.
3. Both businesses must have provider-verified paid MenuList subscriptions when settlement occurs.
4. The referred payment must be a captured subscription payment, not a pending/failed payment, top-up purchase, or unrelated product payment.
5. One referred business can issue one reward pair. Deterministic IDs and atomic writes prevent duplicate issue.
6. Token expiry, consent-bound capture, authentication, tenant isolation, rate limiting, private status, payment-signature verification, and secure logging remain mandatory.
7. Acquisition and settlement flags, pilot allowlisting, and QA gates remain operational rollout controls; they do not change paid-referral eligibility after launch.

## Settlement Behavior

- If both businesses are already paid when the referred first payment is verified, issue 100/50 credits immediately.
- If one business is not currently paid, keep the referral payment-pending without expiry. Re-evaluate from the normal verified subscription activation path when that business becomes paid.
- Once both are paid, issue exactly once.
- Later cancellation, refund, or chargeback does not subtract pooled `topUpCredits` or create a negative balance. Existing payment and account policy still applies independently.

## Architecture Removed

The active implementation blueprint no longer needs:

- `ownerReferralDistributionTrackingUntil`;
- starter distribution policy changes or Functions mirrors;
- cached project-summary qualification reads or parser mirrors;
- `firstPaymentDueAt` or `qualificationDueAt`;
- 30-day qualification evaluation;
- rolling-cap transaction queries;
- reward-cap or qualification-expiry states;
- a scheduled referral qualification task;
- terminal cleanup based on expired/disqualified qualification states;
- the associated scheduler, cap, and cleanup indexes.

## Governance Effect

This is a material reward-policy change made during the cooling period. The implementation approval time moves to no earlier than `2026-07-12T10:46:23+05:30`. The second founder approval must explicitly approve this payment-only, uncapped contract together with its unbounded aggregate credit liability.
