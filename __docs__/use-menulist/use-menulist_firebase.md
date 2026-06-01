# Use MenuList — Firebase Cost Analysis

> **Version:** 1.2
> **Last Updated:** May 22, 2026

## Cost Impact

**₹0/month additional generation cost.**

This feature is a UI aggregation layer. Desktop and mobile both read mostly existing dashboard data. Mobile Share uses already-loaded store/project summaries for links and Menu Kit generation; it reads screen state on Share tab load and may read the selected project document on tap for legacy PDF or structured export if the full project is not already cached.

Menu Card Export is a linked child workflow, not hub-owned cost. Its persisted export history, Storage artifacts, print-shop packets, and batch operations are tracked in `__docs__/menu-card-export/menu-card-export_firebase.md`.

## Reads

| Data | Source | Reads | Notes |
|------|--------|-------|-------|
| Store details | Redux session (already loaded) | 0 | Already in memory |
| Screen state | `getScreenState()` from campaigns DAL | 1 read | platformSummary doc |
| Project metadata | Already in Projects context | 0 | Already in memory |
| Mobile selected project data | `MobileProjectsProvider.refreshCachedProject()` | 0-1 read on legacy PDF/export tap | Only when full project data is not already cached |

**Total per desktop page load: ~1 Firestore read** (screen state only, if not already cached). **Total per mobile Share tab load: ~1 Firestore read** for screen state. Legacy mobile PDF and XLSX/JSON export add no generation cost and at most one selected-project read on tap when the project is not already cached.

## Writes

Zero. This page does not write any data.

## Collections Used (Read-Only)

| Collection | Field | Purpose |
|------------|-------|---------|
| `platformSummary` | `screen.screenToken` | Build screen URL |
| `platformSummary` | `screen.screenLastSeenAt` | Show screen activity status |

## Asset Generation

Hub-owned asset generation (Menu Kit ZIP, individual QRs, legacy PDF fallback, XLSX, and JSON) happens **client-side** using existing browser generators. Zero server cost for the hub itself.

## At Scale

| Scale | Monthly Cost |
|-------|-------------|
| 100 stores | ₹0 generation cost |
| 1,000 stores | ₹0 generation cost |
| 10,000 stores | ₹0 generation cost |
| 100,000 stores | ₹0 generation cost |

The desktop page only reads 1 doc per visit. Mobile Share also reads screen state once so phone owners can copy/open digital screen links without desktop. Legacy mobile PDF and structured export read full selected project data only on tap when it is not already cached.
