# Owner Referral - Test Cases

**Feature:** Owner Referral
**Status:** Automated source/emulator contract implemented; production-host and payment sandbox QA pending
**Last updated:** July 16, 2026
**Audience:** Engineering, QA, security, billing, operations

---

## Test Doctrine

- Payment-only eligibility is the primary product invariant.
- Test prohibited conditions as aggressively as happy paths.
- Test callback/webhook/activation races before UI polish.
- Test both balance writes as one atomic operation.
- Test private status and mobile shell ownership.
- Keep production controls off until Firebase and payment evidence pass.

---

## Fixtures

| Fixture | Description |
| --- | --- |
| `REFERRER_PAID` | MenuList business with verified paid subscription wallet |
| `REFERRER_UNPAID` | MenuList business without current paid wallet |
| `REFERRED_NEW` | New MenuList business before first payment |
| `REFERRED_EXISTING_UNPAID` | Existing store with no successful subscription payment |
| `REFERRED_EXISTING_PAID` | Existing store whose first paid subscription predates referral |
| `SAME_OWNER_SECOND_PAID_STORE` | Distinct store/wallet owned by same person |
| `RESELLER_ASSISTED_PAID` | Distinct paid store with reseller/agency source |
| `B2B_PAID` | Paid MenuList plan with supported credit wallet |
| `INHERITED_OUTLET` | Outlet without a distinct paid subscription wallet |
| `REWARD_ISSUED` | Referral already settled with deterministic issue ID |

---

## Feature Controls

| ID | Scenario | Expected result |
| --- | --- | --- |
| OR-FLAG-001 | Acquisition off | No invite entry or new capture/attribution. |
| OR-FLAG-002 | Settlement off | Existing records remain unchanged; monitoring reports settlement paused. |
| OR-FLAG-003 | Store outside pilot | Invite entry absent and owner API denied generically. |
| OR-FLAG-004 | Pilot store admitted | Invite flow available. |
| OR-FLAG-005 | Acquisition off, settlement on | No new attribution; existing paid referrals continue settlement. |
| OR-FLAG-006 | Any reward count | Feature availability is unchanged; no cap query or cap state. |
| OR-FLAG-007 | Pilot store removed after a token was issued | Desktop/mobile entry disappears and capture/attribution reject the stale token generically. |
| OR-FLAG-008 | Pilot allowlist empty while both flags are enabled | Acquisition fails closed across desktop, mobile, owner API, capture, and attribution. |
| OR-FLAG-009 | Pilot allowlist contains only invalid IDs | Acquisition fails closed; env readiness reports the unsafe configuration. |

---

## Owner Authorization

| ID | Scenario | Expected result |
| --- | --- | --- |
| OR-AUTH-001 | Paid owner with billing authority | Owner API returns invite and recent status. |
| OR-AUTH-002 | Unauthenticated request | 401 before business data. |
| OR-AUTH-003 | Cross-tenant store scope | Denied. |
| OR-AUTH-004 | Staff without billing authority | Denied. |
| OR-AUTH-005 | Paid reseller/agency-assisted store owner | Allowed when current actor has billing authority. |
| OR-AUTH-006 | Paid B2B MenuList wallet supported by policy | Allowed; no plan-type exclusion. |
| OR-AUTH-007 | Owner-read rate limit exceeded | 429 with `Retry-After` and `X-RateLimit-Reset` before the billing-permission Firestore read or token work. |
| OR-AUTH-008 | Referrer has 100 previous rewards | Invite still available. |

---

## Token and Capture

| ID | Scenario | Expected result |
| --- | --- | --- |
| OR-TOKEN-001 | Eligible owner requests link | Opaque encrypted URL; no raw identity/scope. |
| OR-TOKEN-002 | Token ciphertext or tag changes | Generic validation failure. |
| OR-TOKEN-003 | Unknown version | Generic failure. |
| OR-TOKEN-004 | Token expired | Unavailable page; no cookie. |
| OR-TOKEN-005 | Token TTL exceeds 30 days | Validation fails. |
| OR-TOKEN-006 | Token exceeds 1,024 bytes | Rejected before expensive work. |
| OR-TOKEN-007 | Secret missing | Feature fails closed. |
| OR-TOKEN-008 | Two link requests | Both stateless links valid independently; zero Firestore writes. |
| OR-TOKEN-009 | Same link used by multiple invited businesses | Separate deterministic referral records may bind. |
| OR-TOKEN-010 | Token payload inspection | No actor/email/phone/business identity comparison fields. |
| OR-TOKEN-011 | Attacker controls Host header | URL still uses canonical `getPublicBaseUrl()`. |
| OR-TOKEN-012 | Access log/Referrer header | Fragment token absent. |
| OR-CAP-001 | Valid page opens | Fragment removed; token memory-only; no capture/cookie. |
| OR-CAP-002 | CTA selected | Same-origin capture sets host-only HttpOnly cookie. |
| OR-CAP-003 | Preview bot or iframe opens page | No capture; framing denied. |
| OR-CAP-004 | Cross-origin capture post | Rejected. |
| OR-CAP-005 | Existing valid cookie then another token | First capture remains. |
| OR-CAP-006 | Normal non-referral CTA with an older saved cookie | Explicit decline clears the older cookie, does not capture the displayed token, and navigates only after acknowledgement. |
| OR-CAP-007 | Production cookie | Secure, SameSite=Lax, Path=/, Domain omitted. |
| OR-CAP-008 | Capture response | `private, no-store`; no referrer identity. |
| OR-CAP-009 | Valid page copy | 100/50, both-paid trigger, no cap, no action/wait requirement, and privacy notice visible. |
| OR-CAP-010 | Capture rate limit exceeded or production limiter provider unavailable | Generic 429 with `Retry-After` and `X-RateLimit-Reset`; no cryptographic or cookie work. |
| OR-CAP-011 | Acquisition disabled but normal setup selected | Decline still clears an older cookie and continues safely. |

---

## Attribution

| ID | Scenario | Expected result |
| --- | --- | --- |
| OR-ATTR-001 | Valid capture + new Public Menu Entry business | One referral document created in onboarding transaction. |
| OR-ATTR-002 | Valid capture + new website paid onboarding | One referral document created before provider payment. |
| OR-ATTR-003 | Valid capture + existing unpaid business starts regular subscription | Referral binds before pending provider subscription. |
| OR-ATTR-004 | Existing paid business captures referral | No retroactive attribution; cookie clears generically. |
| OR-ATTR-005 | Same owner controls referrer and referred distinct wallets | Attribution allowed. |
| OR-ATTR-006 | Same phone, name, city, IP, or device | Attribution allowed when wallets are distinct. |
| OR-ATTR-007 | Reseller/agency/messaging/manual-assisted source receives valid pre-payment token | Same shared attribution contract; no source exclusion. |
| OR-ATTR-008 | B2B MenuList paid onboarding with supported wallet | Attribution allowed. |
| OR-ATTR-009 | Existing referral document for referred scope | Deterministic create prevents overwrite or second attribution. |
| OR-ATTR-010 | New-business transaction fails | Tenant/store and referral both roll back. |
| OR-ATTR-011 | Provider checkout abandoned after existing-unpaid binding | Referral remains `attributed` without expiry. |
| OR-ATTR-012 | First payment occurs years after attribution | Referral can still settle; no payment deadline. |
| OR-ATTR-013 | Different referral link arrives after binding | First attribution remains. |
| OR-ATTR-014 | Inherited outlet without distinct wallet | Cannot form two-wallet settlement until a distinct paid wallet exists. |
| OR-ATTR-015 | Referral token contains identity-comparison values | Source verifier fails. |
| OR-ATTR-016 | Website provider subscription creation fails after tenant/store/referral transaction | Compensation deactivates scope, clears user scope, and deletes the deterministic referral; no owner status orphan remains. |
| OR-ATTR-017 | Invite opens on `www`, dashboard, tenant, or custom-domain host | Journey reaches canonical public host before capture; fragment survives and the host-only cookie is available to setup/payment start. |
| OR-ATTR-018 | Capture completes on canonical host then continuation attempts cross-host payment start | Flow prevents or canonicalizes the continuation before attribution can be lost. |
| OR-ATTR-019 | First payment commits concurrently with existing-unpaid attribution | Transaction retries against subscription history and does not create a retroactive referral. |
| OR-ATTR-020 | Existing-unpaid history query returns the full 25-row limit without a visible successful payment | Attribution fails closed as prior-paid because older history cannot be disproved safely. |

---

## Payment Recording and Settlement

| ID | Scenario | Expected result |
| --- | --- | --- |
| OR-PAY-001 | Referred first subscription payment captured; referrer paid | Immediate atomic +100/+50 and `reward_issued`. |
| OR-PAY-002 | Payment pending, failed, or forged in request body | No paid evidence or reward. |
| OR-PAY-003 | Top-up purchase | No referral reward trigger. |
| OR-PAY-004 | Unrelated product payment | No MenuList referral trigger. |
| OR-PAY-005 | Referred renewal after reward | No second reward. |
| OR-PAY-006 | Callback first, webhook second | Exactly one reward pair. |
| OR-PAY-007 | Webhook first, callback already-active branch second | Exactly one reward pair; callback safely repairs failed bookkeeping. |
| OR-PAY-008 | Duplicate webhook deliveries | Exactly one reward pair. |
| OR-PAY-009 | Referrer unpaid when referred first payment arrives | Record `payment_pending`; no balance changes. |
| OR-PAY-010 | Referrer later becomes paid | Event-driven repair issues immediately. |
| OR-PAY-011 | Referred becomes unpaid before pending repair | Remains pending until both wallets are paid. |
| OR-PAY-012 | Attributed business receives authorized offline subscription during reseller onboarding | Active current manual payment evidence triggers the same idempotent settlement helper. |
| OR-PAY-013 | Attributed manual subscription is confirmed later | Confirmation triggers settlement after entitlement sync; duplicate confirmation cannot issue twice. |
| OR-PAY-014 | Manual renewal restores a pending referrer or referred store to paid state | Event-driven repair rechecks pending referrals and issues once when both wallets are paid. |
| OR-PAY-015 | Both become paid after a long delay | Reward issues; no expiry. |
| OR-PAY-016 | Payment source is reseller/agency-assisted but canonical paid truth exists | Qualifies; source is irrelevant. |
| OR-PAY-017 | Same owner, two distinct paid wallets | Qualifies. |
| OR-PAY-018 | Plan tier, interval, geography, or business category differs | Qualifies. |
| OR-PAY-019 | 1st, 4th, 100th, or 1,000th paid referral | Same 100/50 issue; no cap. |
| OR-PAY-020 | No menu published | Qualifies. |
| OR-PAY-021 | No QR/link/distribution action | Qualifies. |
| OR-PAY-022 | Zero retention days after captured payment | Qualifies immediately. |
| OR-PAY-023 | Referrer/referred payments are distinct subscription wallets | Required two-paid-business invariant passes. |
| OR-PAY-024 | Referrer or referred store is inactive, deleted, tenant-blocked, or store-blocked | Referral remains pending; no wallet or ledger mutation. |

---

## Atomic Wallet Behavior

| ID | Scenario | Expected result |
| --- | --- | --- |
| OR-REWARD-001 | Referrer top-up starts 25 | Ends 125. |
| OR-REWARD-002 | Referred top-up starts 10 | Ends 60. |
| OR-REWARD-003 | Either wallet document missing | Neither balance changes. |
| OR-REWARD-004 | One write fails | Entire transaction rolls back. |
| OR-REWARD-005 | Concurrent settlement attempts | One issue ID and one reward pair. |
| OR-REWARD-006 | Monthly fields before/after | Identical. |
| OR-REWARD-007 | `topups` purchase records | No reward purchase record created; two `reward_credit` billing-ledger rows are created instead. |
| OR-REWARD-008 | AI operations | No operation recorded at issue. |
| OR-REWARD-009 | Before/after audit | Matches committed balances and fixed amounts. |
| OR-REWARD-010 | Post-issue cancellation/refund/chargeback | No top-up decrement, negative balance, or purchased-credit clawback. |
| OR-REWARD-011 | Current plan is an approved replacement wallet | Reward writes to current wallet and records subscription ID. |
| OR-REWARD-012 | Prior issued record after another paid event | No write. |
| OR-REWARD-013 | Successful reward settlement | Referrer and referred ledger rows commit atomically with both balances and referral state. |
| OR-REWARD-014 | Reward ledger retry | Deterministic transaction IDs prevent duplicate history rows. |
| OR-REWARD-015 | Billing history formatting | Both recipients see `Referral reward` with the correct positive credit amount and zero cash amount. |
| OR-REWARD-016 | Pack balance is malformed, negative, fractional, or would overflow a safe integer | Transaction rejects; neither balance, ledger row, nor referral state partially changes. |

---

## Status and Privacy

| ID | Scenario | Expected result |
| --- | --- | --- |
| OR-STATUS-001 | No referrals | Empty state; no sent/delivered claim. |
| OR-STATUS-002 | More than ten | Only ten recent rows. |
| OR-STATUS-003 | Attributed, no referred payment | `Their payment pending`. |
| OR-STATUS-004 | Internal referral remains unsettled while referrer panel is available | `Their payment pending`; internal payment state is not exposed. |
| OR-STATUS-005 | Issued | Business name, `Credits added`, date, and 100-credit result. |
| OR-STATUS-006 | API snapshot | No tenant/store/user/subscription/payment/token/contact/plan/price fields. |
| OR-STATUS-007 | Cross-tenant direct read | Denied by rules. |
| OR-STATUS-008 | Cross-tenant API attempt | Denied before query data. |
| OR-STATUS-009 | Realtime listener search | No referral listener. |
| OR-STATUS-010 | Malicious business-name markup | Bounded escaped text; no execution. |
| OR-STATUS-011 | Business name shown | Pre-capture disclosure existed. |
| OR-STATUS-012 | Many issued referrals | No cap, countdown, disabled invite, or limit message. |

---

## Desktop, Mobile, and Public UI

| ID | Scenario | Expected result |
| --- | --- | --- |
| OR-UI-001 | Desktop | One action in Use MenuList. |
| OR-UI-002 | Mobile | One action in Share; shell remains mounted. |
| OR-UI-003 | Reward summary | 100/50, both-paid trigger, no-limit line. |
| OR-UI-004 | Prohibited copy scan | No distribution action, live source, 30-day wait, deadline, qualification, or rolling-cap copy. |
| OR-UI-005 | Native Share unavailable | WhatsApp and Copy remain. |
| OR-UI-006 | 320px viewport | No overlap, clipping, or horizontal scroll. |
| OR-UI-007 | Long business name | Stable two-line row with accessible full label. |
| OR-UI-008 | Dark mode and reduced motion | Pass. |
| OR-UI-009 | Keyboard/screen reader | Focus order, labels, sheet announcement pass. |
| OR-UI-010 | Public invite | One proof, short flow, disclosures, no long marketing page. |
| OR-UI-011 | Existing unpaid continuation | Protected setup/subscription flow binds before provider checkout and retains the referral. |
| OR-UI-012 | Existing paid continuation | Protected flow creates no referral and clears capture without exposing payment detail. |

---

## Firebase and Cost

| ID | Scenario | Expected result |
| --- | --- | --- |
| OR-FB-001 | Link/share/view/capture | Zero Firestore referral operations. |
| OR-FB-002 | New-business attribution | About 1 read and 1 relation write. |
| OR-FB-003 | Existing-unpaid attribution | Prior-paid check plus 1 relation write. |
| OR-FB-004 | Immediate issue | Atomic issue uses 5 transaction reads and 5 writes; normal first caller is about 11 reads total including bounded wallet/store pre-reads and repair query. |
| OR-FB-005 | Callback/webhook race | Second path performs no reward writes. |
| OR-FB-006 | Owner status | Limited recent query; no cap query. |
| OR-FB-007 | Pending repair | Indexed single batch fetches at most 26, processes at most 25, exposes `hasMore`, emits backlog evidence, and has no cursor loop. |
| OR-FB-008 | Index inventory | Exactly recent-status and pending-repair feature indexes. |
| OR-FB-009 | Scheduler search | No referral scheduler or due query. |
| OR-FB-010 | Public summary/store signal search | No referral qualification reads/writes. |
| OR-FB-011 | Cleanup | No age-based deletion of unpaid attributed records. |
| OR-FB-012 | Cost measurement | QA operation counts update Firebase doc before enablement. |

---

## Source Verifier Requirements

`verify:owner-referral` must fail when:

- reward values differ from 100/50;
- reward destination is not `topUpCredits`;
- monthly credit fields appear in reward writes;
- any reward-cap, retention, distribution, live-source, qualification, deadline, expiry, or scheduler constant/path appears;
- `firstPaymentDueAt`, `qualificationDueAt`, `nextEvaluationAt`, or `ownerReferralDistributionTrackingUntil` appears;
- starter-activation or project-summary modules are imported by referral code;
- owner/email/phone/name/city/IP/device/reseller/agency/source comparison disqualifies;
- existing-unpaid attribution is absent;
- retroactive existing-paid attribution is possible;
- callback/webhook/activation repair is absent;
- deterministic issue or atomic transaction is absent;
- more than two referral indexes are required;
- status query lacks limit;
- raw token or payment data appears in logs/analytics;
- desktop/mobile entries leave approved Share surfaces;
- website/help/spec/implementation disagree on payment-only or no-limit rules.
- pilot admission is absent from desktop, mobile, owner API, capture, or attribution resolution.
- existing-unpaid prior-payment detection occurs outside the referral-create transaction.
- empty/invalid pilot configuration admits stores;
- capture decline does not clear an existing referral cookie;
- owner/capture rate limits run after expensive work or omit retry metadata;
- a saturated 25-row subscription-history query can attach attribution;
- settlement omits canonical store lifecycle/block checks or safe-integer balance validation;
- pending repair processes more than 25 rows or contains an unbounded cursor loop.

---

## Manual QA Sequence

1. Enable acquisition and settlement for one QA referrer.
2. Confirm the referrer has a verified paid MenuList wallet.
3. Generate and share a link.
4. Verify page disclosure, no cookie on load, noindex, and frame denial.
5. Capture and create a new referred business.
6. Confirm one `attributed` record and no reward.
7. Complete the first sandbox subscription payment while referrer is paid.
8. Confirm immediate atomic +100/+50 and `reward_issued`.
9. Replay callback and webhook; confirm no duplicate.
10. Repeat with an existing unpaid business.
11. Confirm an existing paid business cannot attach retroactively.
12. Repeat with same owner, same phone/name/device/IP, reseller/agency source, different plan/interval, and no published menu or distribution actions; each two-paid-wallet case qualifies.
13. Test unpaid referrer then later activation repair.
14. Issue more than three referrals; confirm no cap behavior.
15. Confirm desktop/mobile/private status and Billing Pack balance.
16. Verify inactive/deleted/blocked stores and malformed/overflowing balances cannot produce a partial reward.
17. Seed more than 25 pending rows; verify one invocation processes only 25, records backlog evidence, and a later verified-payment/operator replay continues safely.
18. Verify Firestore rules, two indexes, operation counts, and no scheduler/project-summary/signal activity.

---

## Release Checklist

- [x] Founder immediate implementation approval and cooling-period waiver recorded at `2026-07-10T12:12:46+05:30`.
- [ ] Finance accepts no cap and aggregate provider exposure.
- [ ] Legal approves payment-only and privacy disclosures.
- [x] All source, emulator, transactional attribution-race, and wallet tests pass locally.
- [x] English/Hindi and desktop/mobile/public source contracts match.
- [ ] Firebase rules/indexes deployed to QA and verified.
- [ ] Sandbox payment and production-host browser evidence recorded.
- [ ] Five-business pilot allowlist approved before enablement.
