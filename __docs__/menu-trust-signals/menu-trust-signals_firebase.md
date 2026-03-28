# Menu Trust Signals — Firebase Cost Tracking

> **Version:** 1.0
> **Last Updated:** March 15, 2026

---

## Collections Affected

None. Zero new reads, zero new writes.

## Cost Estimate

| Scenario | Additional Reads | Additional Writes | Monthly Cost |
|----------|-----------------|-------------------|-------------|
| Any scale | 0 | 0 | **$0.00** |

## Why Zero Cost

Trust signals are rendered server-side from data already fetched by the client menu page SSR. The `lastPublishedAt` and `menuVersion` fields are already on the project document. The store name, logo, and businessType are already on the store document. Both documents are fetched in the existing `page.tsx` data loader. No additional Firestore operations.

## New Fields

None.

## New Collections

None.

## Firestore Indexes

None needed.

---

**Document Signature:** Firebase Cost Analysis
**Created:** March 15, 2026
