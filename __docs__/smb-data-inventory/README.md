# MenuList SMB Data Inventory

**Status:** Internal audit document; P0/P1/P2 storage controls and production-prep retention/privacy fixes implemented 2026-06-14
**Product scope:** MenuList only
**Created:** 2026-06-14
**Source hierarchy:** Current codebase first, project docs second, historical plans only when clearly marked

## Purpose

This folder documents what MenuList stores, tracks, derives, and logs for SMB users. It covers owner/account data, store/business data, menu truth, public customer analytics, internal Menu Operations Log (MOL) events, menu health/correctness/trust/command-center features, AI/extraction jobs, guest feedback, billing, notifications, operational telemetry, and related supporting collections.

This is not a privacy policy or legal data-processing agreement. It is a codebase-grounded engineering inventory for understanding where SMB data lives, when it is written, how it is used, and why it exists.

## Documents

| Document | Purpose |
| --- | --- |
| [SMB data map](./smb-data-inventory_data-map.md) | Main inventory: storage targets, tracked fields, write timing, usage, retention, and observations. |
| [Evidence appendix](./smb-data-inventory_evidence.md) | Source references with exact code/doc lines for the main claims. |
| [Implementation plan](./smb-data-inventory_implementation-plan.md) | Codebase-grounded cost/read/write implementation plan after ChatGPT discussion review. |

## High-level answer

MenuList stores SMB data in four broad layers:

1. **Core operating truth** - users, tenants, stores, projects, subscriptions, public summaries, menu files, extracted menu data, business profile data, working hours, settings, owner roles, outlet relationships, and published menu state.
2. **Customer/public behavior analytics** - daily aggregate Firestore analytics documents for public menu, official business page, and customer app surfaces. These are mostly counters and maps, not one Firestore document per customer event, but the daily documents can become wide.
3. **Internal menu operating memory** - MOL change logs, menu snapshots, menu drift metrics, extraction-learning summaries, store-truth confidence, owner-control usage, health verification state, correctness metadata, and platform telemetry.
4. **Supporting operational records** - AI operation accounting, extraction/import/image-generation jobs, public menu drafts, guest feedback, Business Health snapshots, owner assistant events/threads/actions, billing/payment audit logs, OTP challenge records, notification delivery logs, system alerts, scheduler logs, POS delivery logs, compliance overrides, review state scaffolding, and integration configuration.

## Named feature summary

| Area | What it stores |
| --- | --- |
| Menu Health Monitor | `stores/{storeId}.health` verification state; failure alerts in `systemAlerts`; publish verification lifecycle messages/notifications. |
| Menu Trust Signals | No new collection. It renders existing store/project fields such as business type, location, hours, and last publish time. |
| Menu Correctness Engine | No new collection. It stamps `_mce` metadata on the project document during save/publish validation. |
| Menu Command Center | No separate collection. It changes existing project menu data through the editor save path; repair actions may use AI/accounting paths. |
| MOL / menu observation | `menuChangeLog`, `menuSnapshots`, `menuItemState` metrics, platform summaries, owner-control usage, system telemetry, and downstream staleness/intelligence docs. |

## Most important implementation observations

- The largest analytics surface is the daily aggregate `analytics/{tenant}_{store}_{project}_daily_{date}` document family. It stores counters/maps such as views, clicks, searches, item names, devices, entry sources, decision blocks, OBP actions, and customer-app events.
- Analytics writes are aggregate updates, but daily docs can still become wide because maps such as search terms, zero-result terms, item names, item views, hourly item clicks, and source/campaign breakdowns accumulate keys.
- Browser analytics can temporarily queue pending aggregate updates in `localStorage` under `menulist_pending_analytics_queue_v1`.
- Analytics now applies a shared write policy at browser queue, direct writer, and public API boundaries. Browser `sessionId` remains local-only for dedupe/session milestones and is not written to Firestore analytics docs.
- Browser location analytics is opt-in. Coarse rounded geolocation is requested only when the store analytics preference explicitly enables location tracking; otherwise location maps are not written.
- MOL now defaults to one compact `MENU_REVISION_SUMMARY` per project save/update path. Detailed item-level logs remain available only through `MENU_OBSERVATION_MODE="detailed"`.
- Multi-outlet MOL logging now routes through the shared nested `menuChangeLog/{tId}/{sId}` DAL instead of writing divergent top-level docs.
- Several retention paths exist: daily raw analytics older than 90 days, raw guest feedback after 90 days, feedback event logs after 180 days, scheduler run logs after 90 days, unclaimed public menu drafts after expiry, owner-business-assistant events/actions/drafts/threads by expiry, AI/extraction detail pruning, owner-notification log expiry, menu snapshot expiry, and capped image-batch status history.
- Some surfaces are implemented as scaffolding or planned layers in the current checkout. Reviews and GBP integration are examples: constants and docs exist, the review-state endpoint and reply-suggestion accounting exist, and the GBP token DAL defines a server-only path, but full GBP review ingestion is not implemented in the inspected code.

## Maintenance rule

Update this inventory whenever a change introduces or changes:

- a Firestore collection, subcollection, summary document, or Storage artifact;
- analytics counters, MOL event types, AI accounting payloads, notification delivery records, public drafts, guest feedback, or health/correctness records;
- retention/TTL behavior;
- owner/customer-visible data collection behavior;
- Firebase rules/functions that affect MenuList data storage or cleanup.
