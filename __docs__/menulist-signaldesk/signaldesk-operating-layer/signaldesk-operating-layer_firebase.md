# SignalDesk Operating Layer - Firebase

**Status:** Existing infrastructure implemented; July 22 Today orchestration required no Firebase deploy
**Created:** June 24, 2026
**Last Updated:** July 22, 2026

## Collections

| Collection | Purpose | Client access |
| --- | --- | --- |
| `signaldeskGrowthMissions` | Ranked daily mission and review state. | Internal SignalDesk read; client write denied. |
| `signaldeskExperimentCards` | Controlled experiment and embedded readback plan. | Internal SignalDesk read; client write denied. |
| `signaldeskOfferCtas` | Approved ask, blocked claims, proof rule, surface. | Internal SignalDesk read; client write denied. |
| `signaldeskReplyPlaybooks` | Approved reply and suppression/escalation route. | Internal SignalDesk read; client write denied. |
| `signaldeskSourceQualitySnapshots` | Policy/run-linked quality evidence. | Internal SignalDesk read; client write denied. |
| `signaldeskResearchRuns` | Governed research lifecycle and source transparency. | Internal SignalDesk read; client write denied. |
| `signaldeskResearchTableRows` | Normalized research output rows. | Internal SignalDesk read; client write denied. |

Existing shared collections provide audit events, timelines, daily cost summaries, idempotency claims, policies, source runs, targets, outcomes, market pods, and child-rail records.

## Write Posture

The following counts include the daily cost-summary write, which older documentation omitted:

| Mutation | Normal committed writes |
| --- | ---: |
| Create experiment | 4: experiment, audit, timeline, cost summary |
| Review experiment | 3: experiment, audit, cost summary |
| Upsert offer/CTA | 4: offer, audit, timeline, cost summary; authority reconciliation can add bounded follow-up writes when an existing authority changes |
| Upsert reply playbook | 4: playbook, audit, timeline, cost summary |
| Review mission | 3: mission, audit, cost summary |
| Create source-quality snapshot | 4 physical writes: snapshot, audit, timeline, cost summary; the internal cost counter records six logical operations |
| Recommend market pod | 4: pod, audit, timeline, cost summary |

Daily mission creation is intentionally variable because it materializes each ranked mission action. Its transaction writes the mission, mission-action documents, audit, timeline, daily cost summary, and bounded supporting operating records; the cost counter records `8 + missionActions.length` logical writes. Exact retries return existing canonical records and add no new effects.

Research Agent cost scales with a hard maximum of 30 results. It creates a durable claim/run/timeline before provider use, uses the existing provider/import accounting path, and completes normalized rows/run/pod/audit/timeline/cost in a bounded transaction. The completion counter records `rows.length * 3 + 8` logical writes because each imported row also has governed source/target retention effects.

## Read Posture

- Dashboard and Mission use bounded summary queries, not raw provider payloads.
- Independent Mission reads run concurrently.
- Disabled Content, Partner, Revenue, and Research child layers are not queried for Mission generation/read models.
- Source-quality reads bounded source-run, target, outcome, and policy truth; explicit references use direct document reads.
- No listeners, schedulers, backfills, or migrations were added by this audit.
- The activation-first Today desk, target journey, and seven-day outcome snapshot use only the existing bounded Dashboard response. They add zero Firestore reads, writes, deletes, listeners, or indexes.
- Proof preparation changes route state and browser form state only. The existing Content Rail performs no write until an authorized operator submits its existing proof/asset actions.
- Copying the anonymous MenuList setup URL is browser-only. It creates no route token, attribution row, outcome row, audit event, or cost summary.

## Rules and Indexes

The existing SignalDesk rules keep these collections internal-read/server-write only. Existing indexes support mission day/status, experiment status/update time, offer/playbook status, source quality, and research run/row queries.

## Deploy Boundary

The July 22 Today improvement changed client orchestration, styles, a pure helper, tests, and documents only. It did not change SignalDesk Firestore rules, indexes, Storage rules, Cloud Functions, collections, or server mutations, so no Firebase deployment is required. Any future infrastructure change must run the scoped SignalDesk emulator and the smallest QA deploy required by the repository deployment contract.
