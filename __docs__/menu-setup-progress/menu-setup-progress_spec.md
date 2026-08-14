# Menu Setup Progress - Specification

**Status:** Local source complete
**Last reviewed:** August 14, 2026

## Goal

Give an owner one quiet next step from source to a published, placed customer link without creating a second onboarding system.

For an outlet store or master-linked outlet project, present the same path as current-location launch readiness. The feature remains limited to MenuList menu and customer-link readiness.

## Requirements

| Requirement | Current rule |
| --- | --- |
| Source | Done only when the selected project is loaded with a non-empty ID. |
| Import | Done only when active extracted items exist; categories alone are insufficient. |
| Details | Price and price-outlier warnings must be clear. |
| Publish | A valid `lastPublishedAt` timestamp is required. |
| Placement | Starter: published plus two validated distinct activation actions. Non-starter: published link is ready. |
| Optional content | Descriptions, images, Translations ready, public links, and photos do not block required completion. |
| Suppression | Hide immediately after all required steps are complete; optional improvements never become a hidden completion gate. |
| Loading/error | Wait for selected-project loading; missing/malformed truth stays incomplete and routes to recovery. |
| Routing | Desktop uses current routes; mobile uses Menu/Share/Official Page callbacks inside MobileShell. |
| Location context | Detect from existing `storeDetails.isMaster === false` or `project.masterProjectId`; add no stored readiness flag. |
| Feature flag | `ENABLE_LOCATION_LAUNCH_READINESS` changes the outlet presentation only; the five readiness gates remain the Menu Setup single source of truth. |

## Non-goals

- A persisted progress percentage or completion flag.
- An API route, background worker, scheduler, or new Firestore collection.
- A profile-completion checklist or duplicate Menu Correctness system.
- Customer-use verification; recorded owner actions and owner-confirmed placements are evidence of setup action only.
- Franchise onboarding, vendors, store design, compliance, audits, owner submissions, HQ approvals, or opening-date project management.

## Permissions

Destination screens remain authoritative. Mobile More only shows its shortcut when the current permission set can open the selected next destination. The pure summary itself contains no authorization decision.
