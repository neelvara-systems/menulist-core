# SignalDesk Target Registry - Firebase Cost Plan

**Status:** Runtime reconciled
**Created:** June 23, 2026
**Last Updated:** July 21, 2026

## Read Model

| Flow | Bounded behavior |
| --- | --- |
| Current target window | Reads only until 30 valid newest rows are collected. Malformed rows can require additional 30-document pages within the ten-page scan ceiling. |
| Older target window | Same bounded query after the validated `updatedAt + targetId` cursor. |
| Dashboard consumers | Receive the current 30-target window; no listener and no complete registry scan. |
| Import | Reads policy/retry authority, compact identity indexes, and only the target/contact/suppression/provenance documents addressed by the accepted rows. |

The earlier implementation scanned up to 1,000 target documents before slicing to 30. Feature 5 replaced that with stop-after-valid paging.

## Write Model

A new manual row normally writes summary, detail, identity index, source candidate, and zero-to-four contact identities. One import also writes a source-run summary, retry claim, audit, control summary, and daily cost truth. Exact duplicate rows are collapsed before reads/writes. Re-imports preserve existing authority and avoid recreating identity/candidate documents.

Provider imports add bounded provider claim/run/vendor/timeline and optional provider-retention truth. Provider runs are separately capped at 30 results; manual imports are capped at 50. Both remain below Firestore's transaction write ceiling under the current admitted field/channel contract.

## Indexes

Existing target summary indexes support status, segment, next action, and later specialized workflows. Stable newest-first paging uses `updatedAt` plus document-name ordering and requires no new composite index; the Firestore emulator proves the query.

Raw contact values, notes, permission evidence, and imported source fields must not be indexed for registry browsing.

## Cost Rules

- No Target Registry listener.
- No all-target scan for a 30-row page.
- No row-level import documents.
- No target state event collection in this feature.
- Identity and suppression use deterministic point reads.
- Disabled imports perform no provider or Firestore mutation work.
- Direct browser writes remain denied.
- Source lifecycle cleanup is owned by the existing SignalDesk maintenance path, not a new scheduler.

## Retention

Target/contact/source data follows the active source-policy lifecycle fields stored on each governed record. Provider retention rows carry their own refresh and expiry evidence. Suppression and durable audit are retained independently so an expired source record cannot erase safety history.
