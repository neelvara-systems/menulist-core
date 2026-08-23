# Owner Referral - Firebase and Cost Plan

**Feature:** Owner Referral
**Status:** Implemented locally; rules/index staging deploy blocked by IAM; release disabled
**Last updated:** July 17, 2026
**Audience:** Engineering, finance, operations

---

## Cost Doctrine

Owner Referral rewards payment, not usage. Firebase must therefore do no work for publishing, project summaries, QR actions, distribution signals, retention windows, reward caps, or scheduled qualification.

The incremental model is:

- zero Firestore writes for link generation, native sharing, WhatsApp handoff, page views, previews, or abandoned visitors;
- one referral document only after attribution is bound to a real MenuList business;
- event-driven payment settlement;
- no realtime owner listener;
- no referral Cloud Function scheduler;
- no cap query;
- no qualification or cleanup query;
- no project-summary read;
- no starter-activation write.

---

## Collection

`ownerReferrals/{referralId}`

The deterministic ID is derived from the MenuList referral program version plus referred tenant/store scope. The collection is MenuList-only, so the program version supplies the product boundary. One referred business wallet creates one record and one reward pair.

Firestore rules deny all direct client access. Owner status is served through the protected API.

---

## Indexes

Only two composite indexes are implemented:

| Query | Index | Limit |
| --- | --- | ---: |
| Recent owner status | `referrerTenantId ASC`, `referrerStoreId ASC`, `createdAt DESC` | 10 |
| Pending repair after a referrer becomes paid | `referrerTenantId ASC`, `referrerStoreId ASC`, `status ASC`, `referredFirstPaidAt ASC` | 26 fetched once; 25 processed |

Forbidden indexes:

- `status + nextEvaluationAt`;
- `rewardIssuedAt` rolling-cap indexes;
- `status + terminalAt` cleanup indexes;
- project-summary or distribution-signal referral indexes.

### July 17 scale recheck

No additional Firebase change is justified. The two composites match the only active collection queries, both are capped, and attribution uses a deterministic exact document ID. The remaining scalar fields are a small billing-adjacent audit record written at most during attribution, first-payment pending state, and final reward issue; broad field exemptions would create configuration churn for negligible savings and could constrain future targeted reconciliation. The two deterministic zero-cash reward ledger rows remain necessary for idempotency and owner billing history and must not be collapsed into the referral document.

The rollout flags remain off. No owner-referral listener, recurring scheduler, aggregate counter, cleanup scan, or additional read model should be introduced before measured pilot evidence demonstrates a need.

---

## Operation Inventory

### 1. Owner Opens Invite Panel

| Operation | Expected count | Notes |
| --- | ---: | --- |
| Tenant/store and billing authority | 0-1 read | Owner rate limiting runs before the billing-permission Firestore check; platform authority may avoid the store read |
| Paid subscription evidence | 1-3 bounded query reads | Active query normally returns one; paused/pending fallbacks are bounded |
| Recent referral query | 0-10 returned reads plus query minimum | No cap query |

Expected: approximately 3-14 reads, 0 writes.

The API loads lazily and does not add dashboard boot reads.

### 2. Link Generation and Sharing

| Event | Reads | Writes |
| --- | ---: | ---: |
| Generate encrypted link | 0 incremental after panel admission | 0 |
| Native Share / WhatsApp / Copy | 0 | 0 |
| Page view or preview | 0 | 0 |

The token is stateless. No token registry exists.

### 3. Capture

The capture endpoint performs bounded validation and cryptography only.

| Event | Firestore reads | Firestore writes |
| --- | ---: | ---: |
| Valid CTA capture | 0 | 0 |
| Invalid/expired capture | 0 | 0 |
| Explicit normal-setup decline | 0 | 0 |

Capture receives one host-only cookie. Decline clears any existing referral cookie before normal setup and remains available even while acquisition is disabled.

### 4. Attribution

#### New Business

| Operation | Count | Notes |
| --- | ---: | --- |
| Referrer scope/payment evidence precheck | 0-1 read plus query minimum | Reuses server billing resolver where needed |
| Referral document create | 1 write | `transaction.create()` in existing tenant/store transaction |

Expected incremental cost: approximately 1 read and 1 write.

#### Existing Unpaid Business

| Operation | Count | Notes |
| --- | ---: | --- |
| Referrer token/store resolution | 1 read | Validates active tenant/store scope and pilot admission before the transaction |
| Deterministic referral read | 1 | Runs inside the attribution transaction |
| Prior successful subscription payment check | 0-25 returned reads plus query minimum | Same transaction; prevents retroactive attribution and closes the payment/attribution race |
| Referral document create | 1 write | Before pending provider subscription creation |

The referral record may remain `attributed` indefinitely if the business never pays. A saturated 25-row history check fails closed as prior-paid because older successful payment history cannot be disproved safely. There is no payment deadline or automatic cleanup because either would become an eligibility limit.

### 5. Referred First Payment and Immediate Issue

Normal successful path:

| Transaction operation | Count |
| --- | ---: |
| Read referral | 1 |
| Read referrer paid wallet | 1 |
| Read referred paid wallet | 1 |
| Read referrer canonical store | 1 |
| Read referred canonical store | 1 |
| Increment referrer Pack balance | 1 write |
| Increment referred Pack balance | 1 write |
| Create referrer reward-ledger row | 1 write |
| Create referred reward-ledger row | 1 write |
| Mark reward issued with audit | 1 write |

Expected inside the atomic issue transaction: 5 reads and 5 writes. Before that transaction, settlement reads the deterministic referral once, the two direct paid-wallet queries return one document each, and both canonical stores are read on the normal active path. The verified-payment wrapper then performs one bounded pending-referrer query, which is normally empty.

Expected normal first-caller total: about 11 reads and 5 writes. A callback/webhook replay normally adds one issued-referral read and one empty pending-referrer query, with no writes. Transaction retries can add reads but never another reward pair.

### 6. Payment Pending

When one side is not currently paid:

| Operation | Count |
| --- | ---: |
| Read referral | 1 |
| Resolve both candidate subscription wallets | 2-6 bounded query reads, depending on active/fallback state |
| Read both canonical stores | 2 reads |
| Record first referred payment and `payment_pending` | At most 1 write |

The record has no expiry and no scheduled retry.

### 7. Event-Driven Pending Repair

After a verified subscription becomes paid:

| Operation | Count | Notes |
| --- | ---: | --- |
| Direct referred-business lookup | 0-1 read | Skipped by the normal wrapper after it already settled the direct referral; retained for standalone repair calls |
| Pending referrer query | Up to 26 returned reads | One bounded batch with a one-row backlog lookahead |
| Per issued candidate | About 10 reads, 5 writes | Preliminary referral/wallet/store resolution plus the 5-read/5-write atomic issue transaction |

This query runs only from a verified paid activation path. One invocation processes at most 25 rows and emits bounded operational evidence when the lookahead reports more work; it does not loop through cursors inside a payment request. It is not executed for page views, owner dashboard load, AI operations, or unrelated payments.

### 8. Owner Reopens Status

Same shape as panel open: approximately 3-14 reads and 0 writes.

### 9. Removed Operations

The implementation must perform zero referral-specific operations for:

- public project summaries;
- project collections;
- starter distribution signals;
- store distribution-tracking fields;
- 30-day retention evaluation;
- seven-day retries;
- rolling-cap queries;
- daily due queries;
- terminal cleanup;
- refund clawback;
- AI operation logging at reward issue.

---

## Reference Cost: 1,000 Paid Referrals

Conservative assumptions:

- 1,000 attributed businesses;
- all 1,000 reach payment while both wallets are paid;
- callback and webhook both reach the idempotent helper;
- one owner status open per referral with an average of three rows;
- no free quota applied;
- Standard edition `us-central1` reference rates;
- storage, index storage, network, and compute excluded.

| Component | Reads | Writes |
| --- | ---: | ---: |
| Attribution | 1,000 | 1,000 |
| Payment settlement and callback/webhook replay | 13,000 | 5,000 |
| Owner status | 5,000 | 0 |
| **Total** | **19,000** | **6,000** |

Reference operation cost:

- reads: 19,000 / 1,000,000 x USD 0.30 = USD 0.0057;
- writes: 6,000 / 1,000,000 x USD 0.90 = USD 0.0054;
- total: approximately USD 0.0111 per 1,000 paid referrals.

Use a planning ceiling of USD 0.03 per 1,000 paid referrals for query minimums, index-entry reads, store validation, and transaction retries. Recalculate from final emulator/QA measurements before enablement.

---

## Credit Provider Exposure

Firestore is not the material cost. Consumed referral credits are.

Current internal unit costs in `src/constants/AI/unitCosts.ts:103-109` charge:

- 1 credit for text/review/menu-card operations;
- 3 credits for language addition;
- 5 credits for generated/edited/translated images.

At the conservative image-operation estimate of USD 0.045:

| Reward | Credits | Five-credit image operations | Provider exposure |
| --- | ---: | ---: | ---: |
| Referring business | 100 | 20 | USD 0.90 |
| Referred business | 50 | 10 | USD 0.45 |
| **Total** | **150** | **30** | **USD 1.35** |

The strict non-negative reservation model bounds provider exposure to the explicit 100/50 promotional grants. Both balances expire 365 days after issue.

There is no referral cap, so aggregate liability scales linearly with paid referred businesses:

| Paid referrals | Conservative maximum provider exposure |
| ---: | ---: |
| 100 | USD 162 |
| 1,000 | USD 1,620 |
| 10,000 | USD 16,200 |

These are maximum-capacity estimates, not expected invoices. Finance must compare actual action mix, unused-credit rate, subscription revenue, taxes, payment fees, refunds, chargebacks, and support cost before pilot and broader enablement.

---

## Storage and Retention

| Data | Retention | Reason |
| --- | --- | --- |
| Attributed unpaid referral | Until payment, account deletion, or legal deletion requirement | No payment deadline |
| Issued referral record | Billing-adjacent retention | Idempotency and credit audit |
| Raw invite token | Never stored | Not needed |
| Browser cookie | 30 days | Security-bounded attribution capture |
| Share recipient/contact | Never stored | Native handoff privacy |

No generic age-based cleanup deletes a referral that could still become paid.

---

## Monitoring

The current implementation records every issued reward as two deterministic zero-cash billing-ledger rows and writes bounded settlement-failure diagnostics. If aggregate referral monitoring is added later, use bounded counts only:

- attributed;
- referred_first_paid;
- payment_pending;
- issued;
- duplicate_issue_prevented;
- settlement_failed.

Alert on:

- payment verified but settlement repeatedly fails;
- one-sided balance mutation attempt;
- callback/webhook duplicate write;
- pending-repair bounded-batch backlog;
- reward cost per paid referral exceeding finance threshold.

Never log tokens, business names, contacts, payment IDs, subscription IDs, or balance values.

---

## Firebase Acceptance Checklist

- [x] No referral writes for links, shares, views, previews, or abandoned visitors.
- [x] One deterministic relation write per attributed business.
- [x] Existing-unpaid attribution checks prior paid MenuList truth without retroactive attachment.
- [x] Payment settlement reads both paid wallets and writes 100/50 atomically.
- [x] Callback/webhook/activation retries issue exactly once.
- [x] No cap query, project-summary read, distribution-signal write, retention check, qualification scheduler, or cleanup query exists.
- [x] Pending referrals have no expiry.
- [x] Only two composite indexes exist for the feature.
- [x] Firestore rules deny all client access; tenant owners read reward rows only through the existing tenant-scoped billing ledger rule.
- [ ] Final operation counts are measured against the deployed QA project and this document is updated before enablement.
- [ ] `firestore.rules` and `firestore.indexes.json` deploy successfully to `menulist-qa`; the July 10 attempt remains blocked by `firebaserules.googleapis.com` IAM `403` for both available CLI accounts.
- [ ] Finance approves uncapped aggregate provider exposure.

## Prior-payment subscription query identity (July 22, 2026)

Referral attribution reads at most the maintained history cap from `subscriptions` using exact `pId/productId/tenantId/storeId/tId/sId` equality. Exact paid history still blocks retroactive attribution, a saturated exact history remains fail-closed, and conflicting duplicate aliases are excluded. No new collection, index, rule, scheduled work or normal-path write is introduced.
July 28 owner-referral authenticated scope now uses the exact shared root/nested tenant/store projector before feature eligibility, billing authority, wallet/referral reads, or token issuance. Conflicting compatibility aliases fail closed. Valid-path reads, query/index use, token policy and settlement behavior are unchanged.
