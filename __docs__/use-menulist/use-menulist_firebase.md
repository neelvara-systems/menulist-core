# Use MenuList — Firebase Cost Analysis

> **Version:** 1.0

## Cost Impact

**$0.00/month additional cost.**

This feature is a pure UI aggregation layer. It reads existing data that is already loaded in the dashboard session.

## Reads

| Data | Source | Reads | Notes |
|------|--------|-------|-------|
| Store details | Redux session (already loaded) | 0 | Already in memory |
| Screen state | `getScreenState()` from campaigns DAL | 1 read | platformSummary doc |
| Project metadata | Already in Projects context | 0 | Already in memory |

**Total per page load: ~1 Firestore read** (screen state only, if not already cached)

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
| 100 stores | $0.00 |
| 1,000 stores | $0.00 |
| 10,000 stores | $0.00 |
| 100,000 stores | $0.00 |

The page only reads 1 doc per visit. Even at 100K stores visiting daily = 100K reads/month = ~$0.03/month.
