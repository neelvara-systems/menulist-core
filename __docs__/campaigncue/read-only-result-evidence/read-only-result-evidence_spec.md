# Read-Only Result Evidence Specification

## Owner problem

An SMB owner may see useful totals in Google Business Profile, Meta, Instagram, Facebook, or advertising reports but still need a lightweight way to preserve that context beside a CampaignCue pack. Requiring a live integration at launch adds authorization, privacy, quota, support, and attribution risk.

## Product promise

CampaignCue can keep a small snapshot copied from a report the owner can see. The snapshot is directional evidence only. CampaignCue does not say that the selected campaign caused the reported totals.

## Goals

- keep selected report totals beside the relevant campaign;
- distinguish campaign-specific, location-window, and account-window scope;
- preserve source, date window, and a short owner note;
- support zero-valued metrics;
- prevent duplicate snapshots from inflating the campaign evidence count;
- keep owner-reported outcomes as the only input to Campaign Memory;
- add no provider call, listener, collection, or Storage artifact.

## Non-goals

- OAuth or provider-account connection;
- direct posting, sending, catalog mutation, or ad-spend mutation;
- automated attribution or ROI claims;
- importing raw provider payloads;
- customer-level data, audience lists, or personal identifiers;
- replacing the owner result question.

## Supported sources

- Google Business Profile
- Google Ads
- Meta Ads
- Instagram Insights
- Facebook Insights

## Supported metrics

`impressions`, `reach`, `profileViews`, `websiteClicks`, `callClicks`, `directionRequests`, `messages`, and `linkClicks`.

Each value must be a safe non-negative integer no larger than 1,000,000,000. Unknown fields are rejected.

## Date contract

- dates use strict `YYYY-MM-DD` calendar values;
- the end date cannot precede the start date;
- an inclusive window cannot exceed 92 days;
- the server rejects an end date after the current date in the workspace timezone.

## Roles

Allowed: owner, admin, marketer, local manager, and agency member.

Not allowed: reviewer, billing admin, absent member, or unknown role. Existing location access is rechecked in the campaign action transaction.

## Durable shape

The campaign keeps only:

```text
schema version
source and confidence
directional attribution boundary
provider and scope
date window
allowlisted metrics
optional 200-character source note
24-character source fingerprint
recorded timestamp
```

`externalEvidenceCount` increments only when the latest fingerprint changes.

## Invariants

1. The active source is `owner_copied_report` with `manual` confidence.
2. Attribution is always `directional_not_campaign_attribution`.
3. Report evidence never mutates Campaign Memory or analytics outcome counts.
4. No signed URL, token, provider response, customer list, or raw report is persisted.
5. The audit event stores metric names and provenance, not metric values or the copied note.
6. The feature uses the existing campaign action endpoint and idempotency envelope.
