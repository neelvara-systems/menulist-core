# Owner Referral - Firebase and Cost Plan

**Feature:** Owner Referral
**Status:** Implemented locally; rules/index staging deploy blocked by IAM; release disabled
**Last updated:** July 10, 2026
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
| Pending repair after a referrer becomes paid | `referrerTenantId ASC`, `referrerStoreId ASC`, `status ASC`, `referredFirstPaidAt ASC` | 100 per page |

Forbidden indexes:

- `status + nextEvaluationAt`;
- `rewardIssuedAt` rolling-cap indexes;
- `status + terminalAt` cleanup indexes;
- project-summary or distribution-signal referral indexes.

---

## Operation Inventory

### 1. Owner Opens Invite Panel

| Operation | Expected count | Notes |
| --- | ---: | --- |
| Tenant/store and billing authority | 0-1 read | Reuse current protected billing access; platform authority may avoid the store read |
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

The browser receives one host-only cookie.

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

The referral record may remain `attributed` indefinitely if the business never pays. There is no payment deadline or automatic cleanup because either would become an eligibility limit.

### 5. Referred First Payment and Immediate Issue

Normal successful path:

| Transaction operation | Count |
| --- | ---: |
| Read referral | 1 |
| Read referrer paid wallet | 1 |
| Read referred paid wallet | 1 |
| Increment referrer Pack balance | 1 write |
| Increment referred Pack balance | 1 write |
| Create referrer reward-ledger row | 1 write |
| Create referred reward-ledger row | 1 write |
| Mark reward issued with audit | 1 write |

Expected inside the atomic issue transaction: 3 reads and 5 writes. Before that transaction, settlement reads the deterministic referral once and the two direct paid-wallet queries return one document each on the normal active path. The verified-payment wrapper then performs one bounded pending-referrer query, which is normally empty.

Expected normal first-caller total: about 7 reads and 5 writes. A callback/webhook replay normally adds one issued-referral read and one empty pending-referrer query, with no writes. Transaction retries can add reads but never another reward pair.

### 6. Payment Pending

When one side is not currently paid:

| Operation | Count |
| --- | ---: |
| Read referral | 1 |
| Resolve both candidate subscription wallets | 2-6 bounded query reads, depending on active/fallback state |
| Record first referred payment and `payment_pending` | At most 1 write |

The record has no expiry and no scheduled retry.

### 7. Event-Driven Pending Repair

After a verified subscription becomes paid:

| Operation | Count | Notes |
| --- | ---: | --- |
| Direct referred-business lookup | 0-1 read | Skipped by the normal wrapper after it already settled the direct referral; retained for standalone repair calls |
| Pending referrer query | Up to 100 returned reads | Cursor pagination |
| Per issued candidate | About 6 reads, 5 writes | Preliminary referral/wallet resolution plus the 3-read/5-write atomic issue transaction |

This query runs only from a verified paid activation path. It is not executed for page views, owner dashboard load, AI operations, or unrelated payments.

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
| Payment settlement and callback/webhook replay | 9,000 | 5,000 |
| Owner status | 5,000 | 0 |
| **Total** | **15,000** | **6,000** |

Reference operation cost:

- reads: 15,000 / 1,000,000 x USD 0.30 = USD 0.0045;
- writes: 6,000 / 1,000,000 x USD 0.90 = USD 0.0054;
- total: approximately USD 0.0099 per 1,000 paid referrals.

Use a planning ceiling of USD 0.02 per 1,000 paid referrals for query minimums, index-entry reads, and transaction retries. Recalculate from final emulator/QA measurements before enablement.

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

With the current 20 percent overdraft buffer, reserve up to USD 1.62 per paid referral in the conservative maximum model.

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
- pending-repair pagination backlog;
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
