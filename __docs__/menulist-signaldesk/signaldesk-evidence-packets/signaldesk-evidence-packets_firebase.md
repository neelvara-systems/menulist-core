# SignalDesk Evidence Packets - Firebase And Cost

**Status:** Implemented locally; QA index/Function deployment pending authentication
**Last Updated:** July 21, 2026

## Collections

| Collection | Purpose | Client rule |
| --- | --- | --- |
| `signaldeskEvidencePackets` | Private bounded facts and source-lifecycle authority. | No client read/write rule; default deny. |
| `signaldeskEvidencePacketSummaries` | Protected workspace summary used by draft/approval/AI/outcome flows. | SignalDesk internal read; client write denied. |
| `signaldeskAuditEvents` | Immutable create/expiry evidence. | Internal read; client write denied. |
| `signaldeskCostDailySummaries` | Compact write/read accounting. | Internal read; client write denied. |

There is no evidence expiry-job collection and no large-evidence Storage path in
the active runtime.

## Normal Cost

| Flow | Reads | Writes |
| --- | ---: | ---: |
| New packet | 3 transaction reads: target, policy, deterministic summary. | 5: detail, summary, target projection, audit, daily cost. |
| Exact replay | Same bounded authority reads. | 0. |
| AI/Templates workspace | One bounded recent-summary query in that section. | 0. |
| Historical expiry candidate | Bounded query plus detail/summary transaction reads. | Detail, present summary, and deterministic audit. |

Packet creation makes no provider call and adds no listener.

## Indexes

- `signaldeskEvidencePacketSummaries`: `targetId ASC, updatedAt DESC` for current
  downstream evidence selection.
- `signaldeskEvidencePackets`: `pId ASC, sourceDataLifecycleState ASC,
  sourceDataExpiresAt ASC` for independent historical expiry.

## Retention

The packet follows the source-data expiry copied from current target authority.
The consolidated `signaldeskMaintenanceScheduler` runs the source-data lifecycle
hourly under its existing lease. Target expiry scrubs all target dependencies;
the independent packet query prevents a target refresh from extending older
evidence. Scrubbed records retain identity and audit-safe tombstone fields only.

## Deployment

Because this hardening changes SignalDesk Function logic and a Firestore index,
the required QA target is:

```bash
firebase deploy --project menulist-signaldesk-qa --config firebase-signaldesk.json --only firestore:indexes,functions:signaldeskMaintenanceScheduler --non-interactive
```

Run only after `firebase login` restores an authorized account. Provider sending
must remain disabled. No Vercel deployment is implied.
