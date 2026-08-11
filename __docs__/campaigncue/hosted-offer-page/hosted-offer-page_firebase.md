# Hosted Offer Page And QR - Firebase And Cost

## Record Shape

```text
campaigncuePublicOffers/{opaqueSlug}
campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}.pack.offerPage
campaigncueWorkspaces/{workspaceId}/events/{eventId}
campaigncueWorkspaces/{workspaceId}/idempotencyKeys/{idempotencyKey}
```

At most one public document exists per campaign. Republishing updates the same slug. Unpublish changes the record to a non-public state and invalidates the cache. The public route never queries by workspace or campaign ID.

## Cost

| Operation | Reads | Writes | Storage | Provider calls |
| --- | ---: | ---: | ---: | ---: |
| Publish | Idempotency + workspace + campaign + public slug + Business Brain + source snapshot, plus location only for a branch pack | Public record, campaign pointer, audit event, idempotency result | 0 | 0 |
| Unpublish | Idempotency + workspace + campaign + existing public slug; Business Brain and source snapshot are not read | Same bounded records | 0 | 0 |
| First public request per cache window | 1 document read | 0 | 0 | 0 |
| Cached public request | 0 | 0 | 0 | 0 |
| QR download | 0 | 0 | 0 | 0 |

Public visits do not write analytics. Firestore client rules explicitly deny direct public-record access; only the validated server route reads the record. A future TTL policy may remove expired records, but the active system stays bounded to one record per campaign without a new scheduler.
