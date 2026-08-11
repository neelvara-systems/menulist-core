# Durable Cloud Export Archive Firebase and Cost

## Data Shape

No collection is added.

The current pointer and temporary lease live on the existing campaign document:

```text
campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}
  exportArchive
  exportArchiveUploadLease
```

The current archive is also represented by one deterministic existing Asset Library document:

```text
campaigncueWorkspaces/{workspaceId}/assets/cc_export_archive_{stableHash}
```

That record carries the campaign `locationId`. Local-manager asset lists and signed download/preview creation filter by the current member assignment without a new collection or listener.

Only two object names are admitted:

```text
campaigncue/reports/{workspaceId}/campaigns/{campaignId}/archive-a.zip
campaigncue/reports/{workspaceId}/campaigns/{campaignId}/archive-b.zip
```

## Operation Budget

| Owner action | Firestore | Storage | Notes |
| --- | --- | --- | --- |
| Prepare a new/different archive | 2 transactional reads, 1 campaign merge | 1 target-slot metadata read | Reads current workspace and campaign once; writes one temporary lease. |
| Prepare an unchanged current archive | 2 transactional reads, 0 writes | 1 generation metadata read | Returns `already_stored`; no PUT and no action write. |
| Recover from a missing current object | 4 transactional reads, 1 campaign merge | 2 metadata reads | Rare path: detect missing generation, then claim a replacement slot. |
| Upload | 0 Firestore operations | 1 direct signed PUT, maximum 25 MB | Cloud Storage validates CRC32C before accepting bytes. |
| Finalize | Existing idempotent action reads/writes plus 1 deterministic asset write and campaign pointer/lease merge | 1 metadata read and one 32-byte range read | Reuses campaign action event, summary, and idempotency contracts; no list query. |
| Download saved copy | 1 existing Asset Library document read | 1 generation-pinned signed read | URL exists only in the response and expires after 15 minutes. |

There is no listener, list operation, archive query, scheduled cleanup function, provider call, or raw-event scan.

## Retention

- Current app state points to one generation.
- New saves alternate between `a` and `b` so the current object is not overwritten before verification.
- A campaign can have at most two live object names when bucket object versioning is disabled.
- If bucket object versioning is enabled, configure a lifecycle rule to delete noncurrent `campaigncue/reports/**` generations promptly. Otherwise historical generations can accumulate despite the two-name application contract.
- Expired Firestore leases add no Storage object by themselves. A failed finalize can leave an uploaded object in one admitted slot; a later valid save overwrites it through a generation precondition.

## Access Control

`storage-campaigncue.rules` denies direct Firebase SDK read, create, update, and delete access for `campaigncue/reports/**`. The Admin server performs authorization before issuing short-lived signed URLs. URLs are never persisted.

Firestore authorization remains governed by the existing CampaignCue rules and server-only action path. The client cannot write archive pointers or leases directly.

## Required Bucket CORS

QA and production buckets must allow the exact CampaignCue owner-app origin to send `PUT` requests with:

```text
Content-Type
Cache-Control
x-goog-hash
x-goog-meta-archive-slot
x-goog-meta-campaign-id
x-goog-meta-retention-policy
x-goog-meta-sha256
x-goog-meta-upload-token-hash
x-goog-meta-workspace-id
```

Do not use wildcard origins with credentials. The signed Storage request uses `credentials: omit`, but exact product origins remain the intended boundary.

## Deployment

Apply the Storage rules to `campaigncue-qa` first:

```bash
firebase deploy --only storage --project campaigncue-qa --config firebase-campaigncue.json
```

Then configure bucket CORS and verify save, replace, and generation-pinned download with an authenticated QA workspace. Production deployment requires the same evidence on the `campaigncue` project.
