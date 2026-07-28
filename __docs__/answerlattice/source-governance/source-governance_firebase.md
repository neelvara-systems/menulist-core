# Source Governance Firebase Cost Contract

## Collections

| Collection | Change | Browser policy |
| --- | --- | --- |
| `answerlattice_knowledgeSources` | Add optional `governance` map | Scoped read; all browser writes denied |
| `answerlattice_auditLogs` | Add source-governance audit event | Existing scoped governance read and append-only policy |

No new collection, index, Storage object, Cloud Function, listener, or scheduled job is added.

## One Governance Save

| Operation | Count |
| --- | ---: |
| Target source read | 1 |
| Idempotency audit read | 1 |
| Previous/requested conflict-source reads | 0-10 |
| Target source write | 1 |
| Changed reciprocal source writes | 0-10 |
| Audit write | 1 |

Common initial saves use 2-7 document reads and 2-7 document writes. Replacing five previous
conflict links with five different links is bounded at 12 document reads and 12 document writes.
Only direct source references are read;
there is no query or collection scan.

Worst-case five-to-five replacement: 12 document reads and 12 document writes.

An idempotent retry reads the target and committed audit event, then rereads only
the zero to ten reciprocal peers recorded by that audit so a browser recovering
from a lost response receives every committed patch. It is bounded at 12 reads
and performs zero writes.

The authenticated route also reuses the existing Knowledge Intake permission,
workspace-license, and rate-limit checks. Their baseline reads are not introduced
by Source Governance and remain governed by the shared access contract.

The client applies compact governance patches for the target and every inspected
reciprocal source from the exact API response. It does not reread the job bundle
after a successful governance save and does not return peer source content.

Accepting or publishing a canonical proposal performs one direct read per linked evidence source, up to the existing five-source review limit. Article, FAQ, and product-surface review paths keep their existing read costs.

## Cost Controls

- Maximum five conflict IDs.
- The union of previous and requested conflicts is capped at ten direct reads.
- Only reciprocal peers whose link changed receive a write.
- A conflict peer must already have governance, preventing partial map creation.
- No summary counters are changed.
- No source-content copy is written to the audit event.
- Missing governance requires no migration read or write.
- Replayed requests with the same request ID and payload use committed audit evidence, return every affected reciprocal patch, and add no write.
- Browser pending retry state is in memory only, capped at 20 attempts, and adds no Firebase operation.
- No public cache or compiled-context invalidation occurs because source review does not publish runtime truth.

## Rules And Deployment

Current Firestore rules already deny all browser writes to `answerlattice_knowledgeSources`. This implementation changes application contracts only. No rules, indexes, Storage rules, or Functions deploy is required.
