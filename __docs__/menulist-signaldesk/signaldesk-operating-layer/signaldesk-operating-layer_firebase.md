# SignalDesk Operating Layer - Firebase

**Status:** Implementation-ready
**Created:** June 24, 2026

## Collections

| Collection | Purpose | Client access |
| --- | --- | --- |
| `signaldeskGrowthMissions` | Daily ranked founder missions and owner review state. | Read only for SignalDesk members/admins. |
| `signaldeskExperimentCards` | Bounded pod/source/CTA/proof experiments. | Read only for SignalDesk members/admins. |
| `signaldeskOfferCtas` | Approved owner asks, blocked claims, proof-match rules, and activation surface. | Read only for SignalDesk members/admins. |
| `signaldeskReplyPlaybooks` | Approved reply-to-conversion playbooks. | Read only for SignalDesk members/admins. |
| `signaldeskSourceQualitySnapshots` | Source quality snapshots by usable targets, duplicates, outcomes, cost, and risk. | Read only for SignalDesk members/admins. |

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

## Indexes

Indexes are needed for:

- mission day/status;
- experiment status/updatedAt;
- offer status/updatedAt;
- playbook intent/status;
- source quality source/run updatedAt.

## Deploy

No Firebase deploy should run unless explicitly requested. Validate rules/indexes locally with:

```bash
firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"
```
