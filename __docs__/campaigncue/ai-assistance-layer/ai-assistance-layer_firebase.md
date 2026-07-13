# CampaignCue AI Assistance Layer - Firebase

## Active Runtime Cost

| Operation | Count |
| --- | ---: |
| Additional Firestore reads | 0 |
| Additional Firestore writes | 0 |
| Additional Firestore deletes | 0 |
| Additional Storage writes | 0 |
| Additional Cloud Functions | 0 |
| Additional provider/model calls | 0 |

The plan is derived from the already-loaded CampaignCue overview, Daily Desk, source inputs, source facts, assets, trust summary, and output pack.

## Persistence Boundary

The AI assistance plan is not persisted as its own collection, subcollection, or document. It is a runtime projection and appears in:

- `CampaignCueOverview.dailyDesk.aiAssistance`,
- `CampaignCueOutputPack.aiAssistance`,
- browser-generated ZIP files.

The ZIP is created browser-side after the existing protected export action succeeds. The assistant plan does not create a new Storage object.

## Future Provider Layer

If provider calls are later enabled, they must use existing AI Gateway, SAFE_MODE, rate limits, capacity accounting, bounded prompts, and owner approval. Model output must remain a candidate and must never become durable truth.

Any future persistence must first prove it cannot be represented by existing source inputs, campaign pack metadata, trust reports, result memory, or summary documents.

Pattern Cue follows this rule by storing one bounded current observation on the existing workspace document. It does not create a model-call ledger because model calls remain disabled; activation requires CampaignCue-specific accounting rather than MenuList subscription capacity reuse.
