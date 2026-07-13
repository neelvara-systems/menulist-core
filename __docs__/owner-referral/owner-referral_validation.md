# Owner Referral - Current Validation Record

**Feature:** Owner Referral
**Mode:** Implemented behind disabled feature flags
**Validated:** July 11, 2026
**Runtime status:** Source complete; acquisition and settlement disabled

---

## Current Authority

The founder's payment-only amendment recorded at `2026-07-10T10:46:23+05:30` supersedes earlier activation-based recommendations and feedback decisions.

Current rule:

> When two distinct MenuList business subscription wallets are verified paid and the referral was bound before the referred first payment, issue 100 credits to the referrer and 50 credits to the referred business.

There is no referral cap or post-payment qualification condition.

---

## Superseded Active-Doc Decisions

The following prior decisions are historical only and have been removed from active docs:

- live customer-source qualification;
- two distribution actions;
- 30 consecutive paid days;
- 90-day first-payment deadline;
- 90-day qualification deadline;
- rolling three-reward cap;
- inactive-referrer expiry;
- self/duplicate/reseller/agency/messaging/manual/B2B exclusions;
- business identity comparison;
- activation-signal extension;
- cached project-summary qualification;
- scheduled evaluation and terminal cleanup;
- four referral indexes.

The archived ChatGPT feedback audit remains preserved but no longer governs reward timing, caps, identity restrictions, or activation architecture.

---

## Repository Alignment

| Contract | Status | Evidence |
| --- | --- | --- |
| Rewards use existing Pack balance | Aligned | `src/types/razorpay.ts:92`; `src/lib/ai/capacityCheck.ts:136,159-215` |
| Credit amounts have exact owner-readable outcomes | Aligned | `src/data/shared/contentCreditPolicy.ts`; pricing, desktop, mobile, and invite surfaces derive examples from this source |
| Existing businesses use regular subscription creation | Aligned | `src/app/api/razorpay/create-subscription/route.ts:188` |
| New website onboarding creates tenant/store before provider subscription | Aligned | `src/app/api/onboarding/create-subscription/route.ts:283` |
| Public Menu Entry has an atomic tenant/store transaction | Aligned | `src/app/api/public/create-menu/claim/route.ts:482` |
| Captured payment and signed webhook are canonical payment truth | Aligned | `src/app/api/razorpay/verify-subscription/route.ts:295,426`; `src/app/api/razorpay/webhook/route.ts:687` |
| Callback already-active branch needs idempotent repair | Aligned | `src/app/api/razorpay/verify-subscription/route.ts:295` |
| Billing already shows Pack balance | Aligned | `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx:482-483` |
| Payment-only referral runtime | Implemented and locally verified | `src/lib/ownerReferral/`; `src/app/api/owner-referrals/`; `src/app/api/public/owner-referrals/`; payment and manual billing hooks |

### July 10 Deep Cross-Check Corrections

| Finding | Correction |
| --- | --- |
| Pilot admission existed only in the protected owner API. | Centralized the store boundary and applied it to desktop, mobile, owner API, public capture, and token resolution before attribution. |
| Existing-unpaid prior-payment detection ran before the referral-create transaction. | Moved the bounded subscription-history query into the same Firestore transaction as deterministic referral creation, closing the payment/attribution race. |
| The verified-payment wrapper re-read the paid store's direct referral during pending repair. | Added `skipDirectReferral` for the wrapper while retaining the standalone repair helper's direct check. |
| Public privacy disclosure was below the capture CTA. | Moved business-name/general-status disclosure before the CTA and kept payment-only/no-limit copy above the fold. |
| Firebase docs counted only three settlement writes. | Corrected the atomic transaction to three reads and five writes: two wallet updates, two reward-ledger creates, and one referral update. |
| Long mobile business names had a one-line ellipsis without a full label. | Added a stable two-line clamp, full `title`, bounded text height, flexible non-wrapping row, and non-shrinking status tag. |
| Active docs still described implementation as not started. | Updated spec, implementation, Firebase, mobile, website, help, marketing, tests, README, and this validation record to source-complete/release-disabled truth. |

### July 10 Desktop And Mobile UI Corrections

| Finding | Correction |
| --- | --- |
| The invite page used obsolete `ws-btn-primary` and `ws-btn-secondary` classes, so primary and secondary actions rendered like plain text. | Moved valid and unavailable invitation actions to the maintained `ws-btn--primary` and `ws-btn--secondary` design-system classes. |
| Translated reward sentence fragments became separate flex items on narrow screens. | Wrapped each localized reward sentence in one inline text container so the amount and punctuation flow together. |
| A long referred-business name overlapped the next status row at 360x640. | Bounded the name to two lines and 44px, removed row wrapping, and kept the name column flexible with a fixed status tag. |
| Clipboard fallback ran only when `navigator.clipboard` was absent. | Fall back to the existing hidden-textarea copy path when the modern clipboard API exists but rejects access. |
| The desktop modal used Ant Design's deprecated `destroyOnClose` prop. | Replaced it with `destroyOnHidden` without changing modal persistence behavior. |
| `Invite another business` was accurate but impersonal; `friend` would be warmer but false for peers, suppliers, groups, and forwarded links. | Standardized owner-facing copy on `Invite a business owner you know` and recipient copy on `A business owner you know invited you to MenuList.` Business-wallet reward language remains business-based. |
| Reward panels showed abstract credit amounts, and the owner status model exposed a redundant `Both payments pending` state even though the owner API already requires the referrer to be paid. | Added exact generated-image/description-rewrite examples from the shared credit policy; reduced owner-visible statuses to `Their payment pending` and `Credits added` while preserving internal settlement states. |

### July 11 Credit Transparency Cross-Check

| Check | Result |
| --- | --- |
| Shared rate source | `src/data/shared/contentCreditPolicy.ts` defines public-safe operation rates; `src/constants/AI/unitCosts.ts` consumes the same values. |
| Referral examples | 100 credits resolves to 20 generated images or 100 description rewrites; 50 resolves to 10 or 50. Runtime assertions cover both. |
| Pack parity | Website pricing, desktop Billing, and mobile Billing show 250 credits and examples of 50 generated images or 250 description rewrites. |
| Owner status | Protected API, parser, desktop, mobile, locales, tests, and docs expose only `Their payment pending` and `Credits added`. |
| Source gates | Referral verifier, billing-entitlement verifier, AI-accounting verifier, emulator test, focused lint, full TypeScript, JSON parse, and diff check pass. |
| Visual rerun | Prior referral UI QA remains recorded below. The July 11 browser rerun could not complete because the connected browser timed out on local navigation; production-host desktop/mobile evidence remains a release gate. |

### Implementation Evidence

| Check | Result |
| --- | --- |
| `npm run verify:owner-referral` | Passed; token cryptography, cross-surface pilot admission, transactional prior-payment detection, payment hooks, no-cap policy, pre-capture disclosure, ledger rendering, localization, rules/index and docs contracts |
| `npm run test:owner-referral:emulator` | Passed; concurrent exactly-once settlement, 100/50 balance movement, deterministic two-row ledger, replay, pending repair, four uncapped referrals, prior-paid rejection, and client rule denials |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed with no warnings or errors |
| `npm run verify:billing-entitlement-boundary` | Passed |
| `npm run verify:pricing-integrity-boundary` | Passed |
| July 11 owner-copy visual QA | Public invitation passed at 360x640; Mobile Share sheet passed at 360x640 with a two-line business name and compact pending tags; desktop modal passed at 1280x800. No horizontal overflow. Mobile evidence: [public invitation](./evidence/credit-clarity-mobile-invite-viewport.png) and [owner sheet](./evidence/credit-clarity-mobile-owner-sheet.png). |
| July 11 repository-wide TypeScript rerun | Blocked outside Owner Referral by existing `UserDataType[]` mismatches in `EntityBlockSettings.tsx:97` and `platform/users/index.tsx:62`; referral verifier, full lint, focused lint, docs, locale, mobile-shell, billing, emulator, and scoped diff gates passed. |
| `npm run verify:reseller-dashboard-boundary` | Passed |
| `npm run verify:dependency-freeze` | Passed |
| Local browser QA | Passed for valid and unavailable invitation states at 1280x800 and 390x844; fragment removal, payment/no-limit copy, privacy-before-CTA, real signed-token capture to `/create-menu`, image loading, button styling, and zero horizontal overflow were confirmed. The desktop owner modal and mobile sheet were exercised with all three statuses and a long business name. Mobile passed at 390x844 and compact 360x640 with 44px+ actions, bounded scrolling, no row overlap, and visible copy confirmation. Production-host desktop/mobile evidence remains a release gate. |
| `firebase deploy --only firestore:rules,firestore:indexes --project menulist-qa` | Blocked; `tech.ecomsai@gmail.com` and `danny.projects.4884@gmail.com` both receive `firebaserules.googleapis.com ... 403 The caller does not have permission` |

### July 10 Subscription-Flow Cross-Check

| Finding | Required implementation response |
| --- | --- |
| Direct and inherited subscription resolvers are separate. | Settlement must use the direct resolver and re-read the two direct wallet documents in the reward transaction. |
| The direct resolver can return `pending` as a fallback. | Paid validation must also require current valid access plus canonical successful-payment evidence; the helper name alone is not sufficient. |
| Website onboarding creates tenant/store before Razorpay and compensates provider failure by deactivating scope. | Delete the deterministic referral in the compensation transaction so failed provider creation cannot leave an orphan status. |
| The callback may return early because the webhook activated first. | Run idempotent referral recording/repair before the already-active success return. |
| Webhook activation and charge events overlap. | Use first-payment evidence plus deterministic reward issuance; renewals and duplicate deliveries cannot create another reward. |
| Manual reseller subscriptions use `manual_...` IDs and server-owned confirmation fields. | Never call Razorpay for manual IDs; settle from authorized manual activation/confirmation/renewal paths. |
| Invite capture uses a host-only cookie while MenuList also supports dashboard and tenant hosts. | Canonicalize the complete referred-owner setup/payment-start journey to the public host; do not widen the cookie domain. |
| The planned encrypted token adds a new required feature secret. | Register the secret in env readiness and `.env.production.example`; acquisition fails closed when enabled without it. |

---

## Architecture Validation

| Area | Current decision |
| --- | --- |
| Attribution | Bind before referred first successful subscription payment |
| Existing unpaid business | Eligible to bind before first payment |
| Existing paid business | No retroactive attribution; prior-payment query and referral creation share one transaction |
| Same owner or similar identity | Allowed when wallets are distinct |
| Reseller/agency/source/plan/geography | No eligibility exclusion |
| Reward trigger | Both current MenuList subscription wallets verified paid |
| Reward timing | Immediate when both are paid |
| Pending state | No expiry; repair from later verified subscription activation |
| Reward cap | None |
| Post-payment actions | None |
| Settlement | Atomic, deterministic, idempotent |
| Scheduler | None |
| Referral indexes | Two |
| Client Firestore access | Denied |
| Reward ledger | Two deterministic zero-cash rows commit with both wallet updates and referral state |
| Pilot boundary | Desktop, mobile, owner API, capture, and attribution token resolution |

---

## Cost Validation

- Firestore referral work is limited to attribution, payment settlement, pending repair, and bounded owner status.
- The immediate issue transaction uses three reads and five writes. A normal first caller is about seven reads total after bounded pre-reads and the pending-referrer query.
- No summary, project, signal, retention, cap, scheduler, or cleanup operations remain.
- Conservative provider exposure remains up to USD 1.62 per paid referral under the current maximum image-heavy and overdraft model.
- Because no reward cap exists, aggregate provider capacity scales linearly and requires explicit finance approval.

---

## Documentation Parity

| Document | Payment-only | No cap | No activation conditions | Current status copy |
| --- | --- | --- | --- | --- |
| README | Yes | Yes | Yes | Yes |
| Specification | Yes | Yes | Yes | Yes |
| Implementation | Yes | Yes | Yes | Yes |
| Firebase | Yes | Yes | Yes | N/A |
| Mobile | Yes | Yes | Yes | Yes |
| Tests | Yes | Yes | Yes | Yes |
| Marketing | Yes | Yes | Yes | Yes |
| Website | Yes | Yes | Yes | Yes |
| Help | Yes | Yes | Yes | Yes |

---

## Remaining Release Authorization

Engineering implementation was authorized immediately by the founder and is complete behind disabled flags. Pilot enablement still requires:

1. team announcement and lifecycle decision;
2. finance approval of aggregate liability;
3. legal approval of reward and visibility disclosure;
4. five approved pilot businesses;
5. IAM access for the scoped `menulist-qa` rules/index deploy;
6. sandbox payment proof and production-host browser/device evidence.

---

## Final Status

**Documentation contract:** Payment-only and uncapped

**Code implementation:** Complete behind disabled flags

**Local verification:** Owner Referral source verifier, emulator accounting/rules, lint, focused UI lint, billing, pricing, reseller, dependency, mobile-shell, locale, docs, and scoped diff checks passed. A current repository-wide TypeScript rerun is blocked only by the unrelated platform-user typing errors recorded above.

**Current decision record:** [owner-referral_payment-only-policy-amendment-2026-07-10.md](./_archive/owner-referral_payment-only-policy-amendment-2026-07-10.md)
