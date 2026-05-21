# Use MenuList — Firebase Cost Analysis

> **Version:** 1.1
> **Last Updated:** May 21, 2026

## Cost Impact

**₹0/month additional generation cost.**

This feature is a UI aggregation layer. Desktop reads mostly existing dashboard data. Mobile Share uses already-loaded store/project summaries for links and Menu Kit generation; the Menu PDF action may read the selected project document on tap if the full project is not already cached.

## Reads

| Data | Source | Reads | Notes |
|------|--------|-------|-------|
| Store details | Redux session (already loaded) | 0 | Already in memory |
| Screen state | `getScreenState()` from campaigns DAL | 1 read | platformSummary doc |
| Project metadata | Already in Projects context | 0 | Already in memory |
| Mobile selected project data | `MobileProjectsProvider.refreshCachedProject()` | 0-1 read on PDF tap | Only when full project data is not already cached |

**Total per desktop page load: ~1 Firestore read** (screen state only, if not already cached). Mobile PDF adds no generation cost and at most one selected-project read on tap.

## Writes

Zero. This page does not write any data.

## Collections Used (Read-Only)

| Collection | Field | Purpose |
|------------|-------|---------|
| `platformSummary` | `screen.screenToken` | Build screen URL |
| `platformSummary` | `screen.screenLastSeenAt` | Show screen activity status |

## Asset Generation

All asset generation (Menu Kit ZIP, individual QRs, PDF) happens **client-side** using Canvas/jsPDF. Zero server cost.

## At Scale

| Scale | Monthly Cost |
|-------|-------------|
| 100 stores | ₹0 generation cost |
| 1,000 stores | ₹0 generation cost |
| 10,000 stores | ₹0 generation cost |
| 100,000 stores | ₹0 generation cost |

The desktop page only reads 1 doc per visit. Mobile PDF generation reads full selected project data only on tap when it is not already cached.
