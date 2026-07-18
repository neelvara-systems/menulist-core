# Menu Trust Signals — Firebase Cost Tracking

> **Version:** 1.1
> **Last Updated:** July 16, 2026

---

## Collections Affected

None. Zero new reads, zero new writes.

## Cost Estimate

| Scenario | Additional Reads | Additional Writes | Monthly Cost |
|----------|-----------------|-------------------|-------------|
| Any scale | 0 | 0 | **$0.00** |

## Why Zero Cost

Trust signals compute from the store/project payload already supplied to the customer-menu renderer. `lastPublishedAt` is already on the project document; area, city, business type, working hours, timezone, and hours freshness are already in the store payload. No additional Firestore operation is issued.

## New Fields

None.

## New Collections

None.

## Firestore Indexes

None needed.

---

**Document Signature:** Firebase Cost Analysis
**Created:** March 15, 2026
