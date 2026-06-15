# Campaign Decision Engine — Firebase Cost

## Cost Verdict

Campaign Decision Engine adds no Firestore collection, realtime listener, Storage path, Cloud Function, scheduled job, provider call, or paid model call.

## Read Pattern

| Flow | Reads |
| --- | --- |
| Workspace overview | No extra reads beyond the existing overview read set. Decisions are derived in memory. |
| Daily Desk render | 0 reads. |
| Owner UI explanation | 0 reads. |
| Campaign creation | Uses the existing bounded source/assets/locations/schedules/analytics reads and adds the bounded campaigns list to score result memory before storing the selected decision. No raw event scan. |

Overview `readsPerLoad` remains `8`.

## Write Pattern

| Flow | Writes |
| --- | --- |
| Decision scoring | 0 writes. |
| Daily Desk render | 0 writes. |
| Campaign creation | Existing campaign create writes now include compact `campaign.pack.decision` in the campaign document. |
| Non-ready decision creation attempt | Writes only idempotency placeholder/completion for replayable `CAMPAIGNCUE_DECISION_GATE`; no campaign, trust report, event, dashboard summary, Storage, provider, or model write. |

## Cost Guards

- Decisions are computed from already-loaded data.
- Result learning uses compact `campaign.resultMemory`, not raw event reads.
- Candidate decisions are not persisted as a separate collection.
- Non-ready decisions are rejected before campaign/trust/event/analytics writes.
- Provider/model logic stays outside the decision engine.
