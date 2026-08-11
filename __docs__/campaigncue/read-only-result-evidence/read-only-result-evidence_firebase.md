# Read-Only Result Evidence Firebase And Cost Contract

## Persistence

No collection or Storage path is added.

The latest compact snapshot is stored under the existing campaign document:

```text
campaigns/{campaignId}.resultMemory.latestExternalEvidence
campaigns/{campaignId}.resultMemory.externalEvidenceCount
```

The existing `events` collection receives one metadata-only audit event. The existing idempotency collection provides retry safety.

## Cost behavior

| Operation | Incremental cost behavior |
| --- | --- |
| Workspace load | 0 additional reads |
| Open Results | 0 additional reads and no listener |
| Save snapshot | Reuses the existing campaign-action envelope and performs one current-workspace read inside the final transaction for revocation, role, location, and timezone rechecks |
| Analytics summary | 0 reads and 0 writes for this action |
| Storage | 0 objects and 0 operations |
| Provider | 0 calls |

A new successful request uses the ordinary idempotent mutation envelope: an idempotency claim, campaign update, audit event, and idempotency completion. It intentionally omits the dashboard-summary write used by ordinary action counters. An exact retry replays the saved campaign and does not append a second logical snapshot.

## Size controls

- one latest snapshot, not an unbounded history array;
- eight allowlisted integer metrics maximum;
- 200-character optional source note;
- 24-character fingerprint;
- event stores metric names only, not values or note content;
- evidence count is bounded by the persisted non-negative count contract.

## Security

- server route uses CampaignCue auth, runtime, scope, body-size, validation, and rate-limit guards;
- transaction rechecks current workspace and location access;
- no OAuth token, signed URL, raw provider payload, contact list, or personal-level metric is accepted;
- Firestore remains server-written through existing rules and collections.

## Future connector cost gate

A provider API integration must define per-provider quotas, cache windows, backoff, pagination limits, timeout, token lifecycle, and a maximum report window before activation. Page load must never trigger provider reads. Imported evidence should be fetched only through an explicit owner action or a separately approved bounded refresh job.
