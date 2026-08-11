# Multi-Location Center - Spec

## Owner Problem

An SMB group should not rebuild the same campaign for every branch or risk using another branch's phone, WhatsApp number, booking link, menu link, website, or locality.

## Product Promise

Choose one current workspace campaign and up to eight active branches. CampaignCue prepares an independent, checked pack for each branch from current Business Brain truth plus explicit branch overrides.

## Requirements

| Requirement | Implemented acceptance |
| --- | --- |
| Shared intent | The source must be an original, non-archived workspace campaign, not another branch variant. |
| Branch truth | Location name, locality, and optional branch contacts are resolved against current Business Brain truth. Blank overrides inherit confirmed shared contacts. |
| Bounded fan-out | One request accepts one to eight unique location IDs. Only active locations with a locality can produce a variant. |
| Independent lifecycle | Every variant is a normal CampaignCue campaign with its own trust report, `not_requested` approval state, outputs, hosted-page pointer, action counts, and result memory. |
| Explainable linkage | `variantGroupId`, `variantRootCampaignId`, and `locationId` link the independent campaigns without a group collection. |
| Freshness | The pack stores a branch truth snapshot. Public-use actions compare the durable global source snapshot and current branch record with the creation-time combined hash. |
| Role scope | Owners/admins have workspace scope. A local manager can create or act only for assigned `locationIds`; other branch campaigns are omitted from their overview/list response. |
| Asset scope | Branch-linked Asset Library records inherit `locationId`. Local managers can use assigned-branch assets and unlinked shared assets, but cannot list, preview, or download another branch's campaign files. |
| Delivery | Outputs remain export, download, copy, print, or manual handoff. No branch is posted automatically. |

## Branch Contact Precedence

1. Use a non-empty location override.
2. Otherwise inherit the corresponding confirmed Business Brain contact.
3. If neither exists, the normal Trust Center missing-destination rule applies.

Supported overrides are phone, WhatsApp, booking URL, public menu/service URL, and website.

## Non-Goals

- No generic location-group hierarchy.
- No hidden bulk approval.
- No one-click multi-platform posting.
- No automatic branch scraping or provider synchronization.
- No duplicate creative-editor runtime.
- No claim that every branch offers the same product, price, hours, availability, or terms.

## Invariants

- A branch variant never copies an approval decision from the source campaign.
- A branch truth change makes public use stale until a fresh variant is created.
- A global Business Brain/source change also makes every affected branch variant stale.
- A local manager cannot act on a global campaign or an unassigned branch campaign.
- A retry with the same idempotency key returns the same group; a new key can intentionally create a new group.
- A batch creates no more than eight campaigns and eight trust reports.
