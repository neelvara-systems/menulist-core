# Campaign Pack Output System — Firebase Cost

## Core Cost Verdict

The derived Campaign Pack Output System adds no Firestore collection, Storage path, Cloud Function, realtime listener, provider call, or paid model call by itself.

It is derived from the existing CampaignCue overview and generated as a browser-local ZIP.

## Reads

| Flow | Reads |
| --- | --- |
| Daily desk overview | Same existing bounded overview reads. |
| Output pack build | 0 additional reads. |
| Output pack UI summary, readiness, Campaign Rhythm, and proof deck status | 0 additional reads. |
| ZIP generation | 0 Firebase reads. |

## Writes

| Flow | Writes |
| --- | --- |
| Download campaign pack ZIP | Existing campaign action write for `export`; no new output-pack write. |
| ZIP file creation | Browser-local only; no Firestore or Storage write. |
| Safe reuse | Uses the existing campaign-create read/write path and creates a normal new campaign/trust report/event/idempotency result; no reuse collection or copied output artifact. |
| Output-intent campaign creation | Uses the existing campaign-create reads and batch. Three optional bounded provenance fields are stored in the campaign pack; there is no additional document, write, or Storage artifact. |
| Approval lifecycle | Reuses one deterministic approval document per campaign and atomically writes campaign/event/idempotency state; request adds the existing summary increment. No approval-history fan-out collection or duplicate campaign pre-read. |

## Cost Guards

- `CampaignCueOutputPack` is response-derived state.
- No separate `campaignPacks` collection is added.
- No large JSON blob is persisted.
- No signed URLs or base64 assets are saved in output-pack state.
- No provider connection read is needed.
- No social posting or ad-spend API is called.
- Campaign Proof Deck content is derived from the already-loaded output pack, Business Brain Brand Playbook, source facts, and trust summary.
- Pack readiness and Campaign Rhythm are response-derived from the already-loaded overview.
- Safe reuse stores two compact provenance fields on the new campaign; it does not duplicate the old pack JSON, source hash, approval, result receipt, or export files.
- Output intents reuse the already-loaded browser overview for preflight and the existing server campaign-create data load for authoritative checks. They do not add a client read, server read, collection, summary document, or provider call.

## Future Boundary

The optional [Durable Cloud Export Archive](../durable-cloud-export-archive/durable-cloud-export-archive_firebase.md) is now a separate bounded persistence extension: one compact campaign pointer, one deterministic existing Asset Library record, and two rotating private ZIP object names. It is never part of the default overview read beyond the pointer already on a returned campaign.

Other hosted or server-rendered outputs still require separate Firebase cost plans covering reads, writes, cache invalidation, owner approval, retention, and abuse controls.
