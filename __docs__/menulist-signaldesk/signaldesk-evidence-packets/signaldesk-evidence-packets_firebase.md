# SignalDesk Evidence Packets - Firebase Cost Plan

**Status:** Initial planning doc
**Created:** June 23, 2026
**Cost impact now:** None.

## Collections

| Collection | Purpose | Normal reads |
| --- | --- | --- |
| `signaldeskEvidencePacketSummaries` | Target evidence list rows | Target detail |
| `signaldeskEvidencePackets` | Full evidence packet | Target/evidence detail |
| `signaldeskDecisionSnapshots` | Immutable decision records | Target/detail/audit |
| `signaldeskEvidenceExpiryJobs` | Refresh/expiry jobs | Admin/debug |

## Read / Write Model

| Flow | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Target evidence tab | 1-3 | 0 | Summary docs. |
| Evidence detail | 2-5 | 0 | Full packet only when opened. |
| Create packet | 4-8 | 2-5 | Target, source policy, source facts; packet, summary, audit. |
| Write decision snapshot | 1-4 | 1-2 | Immutable append. |
| Expiry job | Bounded query | Updates | Cap batch size. |

## Indexes

- `signaldeskEvidencePacketSummaries`: `targetId + updatedAt`
- `signaldeskEvidencePacketSummaries`: `status + expiresAt`
- `signaldeskDecisionSnapshots`: `targetId + createdAt`
- `signaldeskDecisionSnapshots`: `decisionType + createdAt`
- `signaldeskEvidenceExpiryJobs`: `status + dueAt`

## Cost Controls

- Large evidence should live in Storage with refs.
- Decision snapshots are append-only but detail-only.
- Dashboards use summaries, not full evidence packets.
- Expiry jobs use bounded batches.

## Retention

| Data | Default |
| --- | --- |
| Evidence summaries | 12-24 months |
| Evidence packet details | 12 months or source policy shorter |
| Decision snapshots | 24 months minimum |
| Large evidence bundles | Per source policy |
