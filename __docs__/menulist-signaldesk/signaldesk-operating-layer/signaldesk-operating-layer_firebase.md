# SignalDesk Operating Layer - Firebase

**Status:** Implemented
**Created:** June 24, 2026
**Last Updated:** July 16, 2026

## Collections

| Collection | Purpose | Client access |
| --- | --- | --- |
| `signaldeskGrowthMissions` | Daily ranked founder missions and owner review state. | Read only for SignalDesk members/admins. |
| `signaldeskExperimentCards` | Bounded pod/source/CTA/proof experiments with an embedded versioned readback plan. | Read only for SignalDesk members/admins. |
| `signaldeskOfferCtas` | Approved owner asks, blocked claims, proof-match rules, and activation surface. | Read only for SignalDesk members/admins. |
| `signaldeskReplyPlaybooks` | Approved reply-to-conversion playbooks. | Read only for SignalDesk members/admins. |
| `signaldeskSourceQualitySnapshots` | Source quality snapshots by usable targets, duplicates, outcomes, cost, and risk. | Read only for SignalDesk members/admins. |
| `signaldeskResearchRuns` | Prompt-to-table research runs, provider/source plan, source transparency, pass/fail/unsure totals, and idempotency reference. | Read only for SignalDesk members/admins. |
| `signaldeskResearchTableRows` | Per-row research table output with enrichment columns, source refs, fit decision, and next action. | Read only for SignalDesk members/admins. |

Client writes remain denied. Mutations run through protected action APIs.

## Cost Posture

| Action | Reads | Writes |
| --- | ---: | ---: |
| Create daily mission | Up to 12 capped list reads | 3 writes: mission, audit, timeline |
| Review mission | 1 read | 2 writes: mission, audit |
| Create experiment card | Up to 3 reads | 3 writes: experiment, audit, timeline |
| Review experiment card | 1 read | 3 writes: experiment, audit, timeline |
| Upsert offer/CTA | 0-1 reads | 3 writes: offer, audit, timeline |
| Upsert reply playbook | 0 reads | 3 writes: playbook, audit, timeline |
| Create source-quality snapshot | Up to 6 capped list reads | 3 writes: snapshot, audit, timeline |
| Create research agent table | Source policy lookup plus provider-run/import reads; provider result cap max 30 | 1 run write, provider-run/import writes, one row write per result, market-pod update, audit, timeline, optional idempotency key |

Dashboard and Mission views read compact research run/table summaries so the first screen can show the latest 30-row lead batch without reading raw provider payloads, raw import rows, or MenuList truth collections.

The readback plan is stored inside the existing experiment document. It adds no collection, query, index, listener, scheduler, provider call, or extra Firestore operation. Legacy documents may omit it and project as `readbackPlan: null`; no migration write is required.

## Indexes

Indexes are needed for:

- mission day/status;
- experiment status/updatedAt;
- offer status/updatedAt;
- playbook intent/status;
- source quality source/run updatedAt;
- research run status/type updatedAt;
- research table row run/decision updatedAt.

## Deploy

No Firebase deploy should run unless explicitly requested. Validate rules/indexes locally with:

```bash
firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"
```
