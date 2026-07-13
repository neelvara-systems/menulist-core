# Daily Campaign Desk — Firebase Cost

## Cost Verdict

Daily Campaign Desk and Campaign Decision Engine add no Firestore collection, Storage path, Cloud Function, scheduled job, realtime listener, provider call, or paid model call.

It is computed from the existing CampaignCue overview response. The current implementation deliberately keeps campaign-pack review and candidate decisions as derived state plus compact campaign metadata instead of adding a separate `campaignPacks` or `campaignDecisions` collection.

## Read Pattern

| Flow | Reads |
| --- | --- |
| Workspace load | Same existing bounded overview read: workspace, Business Brain, source inputs, campaigns, assets, schedules, locations, analytics summary. |
| Daily desk render | 0 additional reads. |
| Campaign Rhythm and pack readiness | 0 additional reads; derived from the campaigns, schedules, workspace, trust summary, and delivery cards already in memory. |
| Decision ranking render | 0 additional reads; `buildCampaignCueDecisions()` scores already-loaded facts, campaigns, assets, schedules, locations, and analytics summary in memory. |
| Local mutation merge | 0 additional reads; browser recomputes the desk from updated local state. |
| Campaign creation | Uses the existing server-authoritative creation path with bounded campaign history, source inputs, assets, schedules, locations, and analytics summary context so the selected `campaign.pack.decision` can be stored without raw event scans. |
| Pack download/export/mark used/schedule | New freshness-enabled packs add one conditional read of `sourceSnapshots/current` after the existing campaign/idempotency reads. The structured ZIP is generated in the browser from `CampaignCueOutputPack`; no provider read runs. |
| Manual delivery tasks | 0 reads; generated from recipe constants and latest campaign output fields. |
| Manual delivery cards | 0 reads; generated from `CampaignCueOutputFields.handoffFields` already present on campaign outputs. |
| Local visibility cues | 0 reads; generated from Business Brain, latest campaign outputs, and source facts already in the overview. |
| Asset reuse tasks | 0 reads; generated from the already-loaded bounded asset list. |
| Result option buttons | 0 reads; options are recipe constants and the existing `record_outcome` action writes only when the owner records one. |
| Safe reuse nomination | 0 reads; derived from compact result memory already loaded on bounded campaign documents. |

The documented overview `readsPerLoad` remains `8`.

## Write Pattern

Daily Campaign Desk itself writes nothing. Candidate decisions are derived response state and are not stored. It triggers existing owner actions:

| Action | Existing write path |
| --- | --- |
| Create pack | Idempotency, campaign, trust report, event, summary increment. |
| Download/export | Campaign action event/update and summary increment. |
| Mark used | Campaign action event/update and summary increment. |
| Record result | Campaign action event/update and summary increment. |
| Request/approve/reject | One deterministic approval document per campaign plus campaign/event/idempotency updates in one transaction. Request increments the summary once; approve/reject do not. The transaction uses one campaign read and atomically rejects competing resolutions. |
| Safe reuse | Existing campaign-create transaction creates a normal new campaign/trust report/event/idempotency result; no reuse document or copied output blob. |
| Save source/business/asset/location | Existing scoped API writes. |

Campaign creation stores compact `campaign.pack` metadata with ids/reason/result question, selected deterministic decision/recipe, freshness receipt, commercial gate, and one-variable experiment. Recording a result stores compact counters plus only the latest bounded `campaign.resultMemory.lastReceipt`. These fields use the existing campaign document update path and avoid raw event scans when the Opportunity Engine or Decision Engine recommends repeat/adjust actions.

## Cost Guards

- No realtime listener.
- No raw event scan.
- No separate decision collection.
- No provider connection read.
- No model call to decide what to promote.
- No social posting call.
- No rendered video/image provider call.
- No paid model call for Daily Desk, result options, manual delivery tasks, or asset-reuse prompts.
- No new campaign-pack collection or denormalized pack-review document.
- No persisted output-pack blob; `CampaignCueOutputPack` is response-derived state.
- No separate pulse, commercial-policy, freshness, presence, language, result-receipt, experiment, review, retention, or staff-task collection.
- Source hashes sort fact IDs, and semantically unordered policy/language lists are normalized before hashing to avoid false stale packs.
- No Storage write for ZIP generation.
- No due-status write; elapsed schedule tasks are derived as due in memory.
- No rhythm, readiness, reuse-candidate, or approval-history collection.
- No Storage upload unless the owner explicitly uses existing asset/CueLayers flows.
- Local recompute uses `src/lib/campaigncue/dailyDesk.ts`.

## Future Cost Boundary

If Daily Campaign Desk later recommends connected provider actions, that must remain behind a separate provider layer with idempotency, quota controls, consent, billing/capacity checks, and manual export fallback. The current implementation does not do this.
