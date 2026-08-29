# Early Access Firebase Contract

## Collection

`answerlattice_earlyAccessRequests/{emailHash}`

This is a pre-tenant, server-only Answerlattice collection. Documents contain `pId: AL` and do not contain invented `tId` or `sId` values.

## Read/write profile

- First public submission: one transaction read and one document write.
- Repeat public submission: one transaction read and one document write; no duplicate document.
- Internal list: up to 51 document reads per page so a 50-row page can expose a next cursor.
- Internal counts: one aggregate count for total and one for each lifecycle state. Firestore bills aggregate index-entry reads under current paid pricing.
- Internal status update: one transaction read and one write.

The dashboard is an internal, low-frequency surface. Aggregate counts are simpler and safer than a write-amplifying counter document at current expected volume. Revisit a compact counter only if operator traffic or applicant volume becomes material.

## Index and TTL

- TTL field: `expiresAt`.
- Retention: 365 days.
- Composite index: `status ASC, lastSubmittedAt DESC` for filtered pagination.

The local index definition must be deployed separately to Answerlattice QA and production before filtered hosted use is certified.
