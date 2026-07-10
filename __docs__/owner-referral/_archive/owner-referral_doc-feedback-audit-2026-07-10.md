# Owner Referral Doc Feedback Audit

> **Historical notice:** The founder's later [payment-only policy amendment](./owner-referral_payment-only-policy-amendment-2026-07-10.md) supersedes this audit wherever it retained activation requirements, eligibility exclusions, deadlines, or reward caps. Use the active Owner Referral docs for implementation.

**Source:** ChatGPT conversation `Referral System in MenuList`
**Mode:** Documentation feedback only
**Reviewed:** July 10, 2026
**Status:** Complete

## Summary

The feedback was reviewed against the current post-cross-check referral documents, live billing and onboarding code, MenuList documentation law, and the feature lifecycle doctrine. It was written against an earlier document revision, so several findings were already closed before this audit.

| Result | Count |
| --- | ---: |
| Accepted | 5 |
| Partially accepted | 2 |
| Rejected | 4 |
| Already resolved | 1 |
| **Total** | **12** |

The production-grade atomic reward design remains approved. This audit does not authorize implementation or change the founder approval gate.

## Decision Table

| # | ChatGPT comment | Verdict | Repository evidence | Decision and action |
| ---: | --- | --- | --- | --- |
| 1 | Give the invited business 50 credits immediately after first payment and publication, then reverse unused credits after a refund. | Rejected | `src/types/razorpay.ts:89-93`; `src/lib/ai/capacityCheck.ts:157-218`; `owner-referral_firebase.md` wallet analysis | `topUpCredits` pools purchased and granted capacity and has no source-aware consumption ledger. Early issuance increases refund farming, while a later subtraction could take purchased credits. Keep one atomic 100/50 issue after the complete qualification gate. |
| 2 | Business-name visibility creates a forwarded-link privacy edge; add an allow/private choice. | Partially accepted | `owner-referral_spec.md` FR-8; `owner-referral_impl.md` owner status mapping; current invite copy disclosed only coarse status | The disclosure gap is valid. The invite page must state before capture that the referrer can see the new business name and a general status. A separate opt-out preference is rejected because it adds schema, UI, localization, and owner decisions; an owner who does not accept referral visibility can use the normal non-referral setup path. |
| 3 | Name, phone, and city are unsafe as a hard duplicate-business rejection; separate hard and review signals. | Partially accepted | `src/app/api/public/create-menu/claim/route.ts:242-420`; `owner-referral_impl.md` attribution section | Hard rejection is limited to same tenant/store, same keyed actor, same verified login email, existing/already-attributed business, or an exact non-empty normalized name-and-phone pair. City, shared phone alone, weak name similarity, IP, or device never reject; weak pairwise signals matter only with another independent anomaly. Payment fingerprints and Google entity matching are rejected because current onboarding does not own those canonical signals. |
| 4 | Reduce the implementation by 35-45 percent, issue rewards manually, omit status/scheduler/cap machinery, and expand the pilot to 20-30 owners. | Rejected | `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md` Law 1; `__docs__/constitution/14-feature-lifecycle-doctrine.md:18-70` | MenuList requires a complete source architecture behind off flags and the constitution explicitly defines a five-customer pilot. Manual wallet mutation would create a weaker audit and concurrency boundary. Keep the complete architecture and five-business pilot. |
| 5 | Replace byte-for-byte root/Functions mirrors with a shared workspace package or generated artifact. | Rejected | `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md` Law 4; `src/data/shared/README.md:1-30` | Exact mirrors are the mandated repository architecture because root and Functions have separate build contexts. Keep the canonical root file, exact Functions mirror, and verifier. |
| 6 | Clarify that stateless invite tokens can be used by multiple new businesses until expiry and have no per-link revocation. | Accepted | `owner-referral_impl.md` token contract; no token registry is planned | State this explicitly. `tokenId` is evidence correlation inside accepted attribution, not a server-side single-use or revocation record. Emergency secret rotation invalidates all outstanding v1 links. |
| 7 | Simplify the invite page instead of recreating a marketing homepage. | Accepted | `owner-referral_website.md` previously contained three benefit sections plus a long flow | Reduce the page contract to one product proof, one short explanation, three steps, reward/privacy disclosure, a short FAQ, and the normal footer. |
| 8 | Explain what enhancement credits do instead of presenting only an internal credit label. | Accepted | `src/data/PlatformPlansList.ts:112-120`; `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx:52-54`; `src/components/website/pricing-pages/PricingFaq.tsx:82-95` | Public and owner copy must connect credits to generated images, descriptions, translations, and edits. Do not imply that core menu, QR, or customer-link availability depends on credits. |
| 9 | Hold a referrer's reward for 60 days if the referrer is inactive at issue time. | Rejected | `owner-referral_spec.md` eligibility and reward cap; current direct subscription resolver in `src/lib/billing/productBillingServer.ts` | The reward is product capacity, not a debt owed independently of MenuList access. A hold adds another state, index path, liability window, and reactivation incentive. Keep active direct entitlement at issuance and disclose it clearly. Paid-through cancellation follows the existing entitlement helper. |
| 10 | Use distinct names for the 30-day invite capture window, 90-day first-payment deadline, and 90-day qualification deadline. | Accepted | Current spec describes three clocks but reused attribution terminology | Standardize on `invite capture window`, `first-payment deadline`, and `qualification deadline`. |
| 11 | Rename `attributionExpiresAt` and `qualificationExpiresAt` because attribution has already occurred. | Accepted | Planned `OwnerReferralDocument` in `owner-referral_impl.md` | Rename the planned fields to `firstPaymentDueAt` and `qualificationDueAt` before implementation. No migration is required because runtime implementation has not started. |
| 12 | Replace `Invite expired` after attribution with qualification-period wording. | Already resolved | `owner-referral_spec.md` status table; `owner-referral_test-cases.md` OR-STATUS-012 | The prior cross-check already changed this to `Reward window ended`. Keep the current owner-readable wording; reserve invitation-unavailable copy for invalid or expired pre-capture links. |

## Market and Platform Check

- Square's current seller referral flow still uses a new-business and first-payment qualification gate and exposes referral progress. This supports activation-based rewards and coarse status, but does not establish MenuList-specific pilot size or conversion thresholds.
- Dropbox still uses product-native storage rewards for both sides. This supports MenuList credits as the reward type, not a particular issue date.
- Firestore's current transaction contract still requires reads before writes. This supports the existing `transaction.create()` attribution design after onboarding has queued writes.

The suggested 10 percent share rate, 20 percent paid conversion rate, 20-30 owner pilot, and 35-45 percent implementation reduction were not backed by MenuList evidence or authoritative benchmarks. They are not adopted as release gates.

## Accepted Document Changes

1. Add explicit pre-capture business-name and general-status visibility disclosure.
2. Separate hard self-referral checks from bounded pairwise review signals.
3. Clarify stateless, multi-use token behavior and emergency-only global revocation.
4. Explain credits through actual generated-image, description, translation, and edit outcomes.
5. Rename the two planned deadline fields and all related terminology.
6. Reduce the invite-page content contract.

## Rejected Architecture Changes

- No early or reversible invited-business credit issue.
- No manual reward pilot.
- No owner-facing privacy preference or extra attribution state.
- No payment-instrument fingerprint or speculative Google entity dependency.
- No 60-day inactive-referrer reward hold.
- No workspace-package deviation from the shared-data mirror law.
- No 20-30 owner pilot or unsupported conversion thresholds.

## Implementation Boundary

This audit changes documentation only. Implementation remains blocked until the founder's second approval is recorded at or after `2026-07-12T10:23:52+05:30`, the team announcement is recorded, and the remaining lifecycle, finance, legal, Firebase, payment-sandbox, and QA gates pass.
