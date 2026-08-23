# Billing Documents Firebase and Cost

> Status: QA and production Firebase rules/indexes certified
> Last updated: August 23, 2026

## Rules

`billingDocuments` and `billingDocumentCounters` deny all client reads/writes. Admin SDK issuance and authenticated API projections are the only access paths.

## Indexes

- Product + tenant + store + issued time for billing history.
- Product + type + payment ID for refund-to-invoice matching.
- Related invoice + type for remaining refundable-balance checks.

## QA and production publication evidence

On August 22, 2026, the generated `firestore-menulist.rules` artifact passed
all 42 MenuList Firestore predeploy suites and was published unchanged to both
Firebase projects. Authenticated Rules API readback matched the local artifact
exactly:

| Project | Active ruleset | Bytes | SHA-256 |
|---|---|---:|---|
| `menulist-qa` | `f8a29b19-6545-4c47-aeac-82e4c6bf1025` | 130,958 | `1dcc0117f027ce5ae3b2b802181a89e4a0f3894bb16482d8dbb2361863a4eb7c` |
| `menulist-prod` | `659da3c0-a8e3-4fcf-ae38-d2c05b3fb9d1` | 130,958 | `1dcc0117f027ce5ae3b2b802181a89e4a0f3894bb16482d8dbb2361863a4eb7c` |

The three billing-document indexes were created in both projects and direct
Firestore API readback reported all six resources as `READY`. The broad index
deploy command also reported an unrelated `users` index as already existing;
no `--force` retry or deletion was used, and the billing index definitions were
verified independently after creation.

## Cost

- New invoice: one document read, one counter read, two writes in one transaction.
- Duplicate invoice: one document read, no write.
- Credit note: invoice match query, prior-credit query in the issuance transaction, one counter read, and two writes. The transaction retries if a concurrent credit changes the remaining component balance.
- History: at most 50 document reads per explicit owner history load.
- PDF: one document read per authenticated download.
- Delivery request: one existing NotificationOS event claim, one authoritative store read, and the bounded per-channel rate-limit/delivery writes already documented by Owner Notifications. When at least one selected channel is eligible, attachment preparation adds one private direct `billingDocuments/{documentId}` read per processing attempt; an event with no eligible channel performs no attachment read. The billing record adds one transaction read/write for aggregate request state. Deterministic event/channel identities prevent duplicate provider delivery on webhook replay.

PDF bytes exist only in process memory while EmailOS or WhatsAppOS sends the document. There is no Firebase Storage write, public document URL, provider media URL persistence, scheduler, duplicate projection, or automatic retention write.
