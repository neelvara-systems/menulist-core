# Messaging Onboarding Dashboard — Product Specification

**Feature:** Internal Monitoring Dashboard for Messaging Onboarding Pipeline
**Status:** DOCUMENTED — Ready for Implementation
**Last Updated:** March 12, 2026

---

## Executive Summary

Internal ops dashboard for monitoring the messaging onboarding pipeline health. Designed for solo-founder operation — must answer "Is onboarding healthy?" in 10 seconds. Not customer-facing. Platform-only access.

---

## Goals

| Goal | Metric |
|---|---|
| Instant pipeline health visibility | Answer "is it working?" in <10 seconds |
| Failure detection | Alert within 15 minutes of abnormal patterns |
| Cost control | Track Gemini spend per publish in real-time |
| Growth signal tracking | Organic onboarding rate visible daily |
| Stuck session recovery | Auto-recover within 10 minutes |

---

## Route & Access

- **Route:** `/ops/messaging-onboarding`
- **Access:** `platformRole === 'PLATFORM'` only (same as Scheduler Monitor)
- **Navigation:** Ops Control Room → "Messaging Onboarding" button
- **Feature Flag:** `ENABLE_MESSAGING_ONBOARDING_DASHBOARD` (default: false)

---

## Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│ ⚠ ALERTS (if any)                                    │
├─────────────────────────────────────────────────────┤
│ SYSTEM HEALTH                                        │
│ Sessions Started | Previews | Publishes | Avg Time   │
│ Active Sessions by State                             │
├─────────────────────────────────────────────────────┤
│ ONBOARDING FUNNEL                                    │
│ Sessions → Previews → Opens → Publishes              │
│ Preview Rate | Open Rate | Publish Rate              │
├─────────────────────────────────────────────────────┤
│ RELIABILITY                                          │
│ Failures Today | Extraction Errors | Stuck Sessions  │
├─────────────────────────────────────────────────────┤
│ COST & AI USAGE                                      │
│ Gemini Calls | Cost/Publish | Monthly Spend          │
├─────────────────────────────────────────────────────┤
│ GROWTH SIGNALS                                       │
│ Organic Rate | Acquisition Sources                   │
├─────────────────────────────────────────────────────┤
│ CLEANUP STATUS                                       │
│ Last Cleanup | Expired | Storage Cleaned             │
├─────────────────────────────────────────────────────┤
│ SESSION DEBUG TOOL                                   │
│ [Enter sessionId] → Timeline view                    │
└─────────────────────────────────────────────────────┘
```

---

## Section 1: System Health

**Purpose:** Is the pipeline alive right now?

### Metrics (Today)

| Metric | Source | Display |
|---|---|---|
| Sessions Started | `metrics.sessionsStarted` | Counter + 7-day sparkline |
| Previews Generated | `metrics.previewsGenerated` | Counter |
| Menus Published | `metrics.publishesCompleted` | Counter |
| Average Processing Time | `metrics.totalProcessingTimeMs / metrics.previewsGenerated` | Seconds (P50/P90 if available) |
| Active Sessions | Live query: sessions NOT IN terminal states | Grouped by state |

### Active Sessions Breakdown

| State | Badge Color | Meaning |
|---|---|---|
| COLLECTING_INPUT | Blue | Accepting uploads |
| VALIDATING_ASSETS | Yellow | AI validation running |
| PROCESSING_MENU | Yellow | Extraction in progress |
| AWAITING_APPROVAL | Green | Preview sent, waiting |
| PUBLISHING | Orange | Publish in progress |

---

## Section 2: Onboarding Funnel

**Purpose:** Where users drop off.

### Funnel Steps

```
Sessions Started: 120
  ↓ (79%)
Previews Generated: 95
  ↓ (84%)
Previews Opened: 80
  ↓ (85%)
Published: 68
```

### Key Rates

| Rate | Formula | Healthy Range | Warning |
|---|---|---|---|
| Preview Rate | previews / sessions | 60-85% | <40% |
| Preview Open Rate | opens / previews | 80-95% | <60% |
| Publish Rate | publishes / previews | 70-90% | <50% |

---

## Section 3: Reliability

**Purpose:** Detect broken states and failures.

### Failure Breakdown (Today)

| Metric | Source Event Type |
|---|---|
| Validation Failures | `ASSET_VALIDATION_FAILED` |
| Extraction Failures | `EXTRACTION_FAILED` |
| Publish Failures | `PUBLISH_FAILED` |
| Blank Prevention Triggers | `BLANK_PREVENTION_TRIGGERED` |
| Media Download Failures | `PROVIDER_MEDIA_DOWNLOAD_FAILED` |

### Stuck Sessions (Real-time)

| Condition | Threshold | Recovery Action |
|---|---|---|
| `PROCESSING_MENU` for >10 min | Auto-detect | → FAILED |
| `PUBLISHING` for >5 min | Auto-detect | → AWAITING_APPROVAL |
| `VALIDATING_ASSETS` for >5 min | Auto-detect | → FAILED |

---

## Section 4: Cost & AI Usage

**Purpose:** Ensure Gemini usage stays controlled.

### Metrics

| Metric | Source | Target |
|---|---|---|
| Gemini Validation Calls Today | `metrics.geminiValidationCalls` | — |
| Gemini Extraction Calls Today | `metrics.geminiExtractionCalls` | — |
| Avg Gemini Calls per Session | `(validation + extraction) / sessions` | 4-6 |
| Avg Images per Session | `metrics.imagesUploaded / sessions` | 3-6 |
| Cost per Publish | `(validation × ₹0.50 + extraction × ₹0.80) / publishes` | <₹10 |
| Monthly AI Spend | Cumulative this month | Budget bar |

---

## Section 5: Growth Signals

**Purpose:** Detect whether the system is self-propagating.

### Organic Onboarding Rate (OOR)

```
OOR = organic sessions / total sessions
```

### Acquisition Sources

| Source | Description |
|---|---|
| `direct_share` | Founder shared WhatsApp number directly |
| `obp_page` | Owner found number on another restaurant's OBP page |
| `google_search` | Found via Google search |
| `referral` | Referred by existing MenuList user |
| `unknown` | Source not determined |

Display as pie chart + percentage breakdown.

---

## Section 6: Cleanup Status

| Metric | Source |
|---|---|
| Last Cleanup Run | `metrics.lastCleanupAt` |
| Sessions Expired (Today) | `metrics.sessionsExpired` |
| Storage Files Cleaned | `metrics.storageCleanups` |
| Cleanup Errors | `metrics.cleanupErrors` |

---

## Section 7: Session Debug Tool

### Input
- Session ID or phone number (last 4 digits)

### Output
Timeline view showing all events for that session:

```
10:00:00  SESSION_CREATED         COLLECTING_INPUT
10:00:15  UPLOAD_RECEIVED         image/jpeg, 2.1MB
10:00:45  UPLOAD_RECEIVED         image/jpeg, 1.8MB
10:01:12  UPLOAD_RECEIVED         image/png, 3.2MB
10:02:30  INTAKE_WINDOW_CLOSED    3 uploads
10:02:31  ASSET_VALIDATION_STARTED
10:02:36  ASSET_VALIDATION_COMPLETED  3 valid, 0 invalid
10:02:37  EXTRACTION_STARTED      run 1
10:03:15  EXTRACTION_COMPLETED    8 categories, 45 items
10:03:16  PREVIEW_GENERATED       quality: 78
10:05:30  PREVIEW_APPROVED
10:05:31  PUBLISH_STARTED
10:05:33  PUBLISH_COMPLETED       tId: 15, sId: 23
```

---

## Alert Rules (5 only)

| # | Condition | Severity | Check Interval |
|---|---|---|---|
| 1 | `sessionsStarted = 0` for 1 hour (during business hours 8AM-10PM IST) | Warning | 15 min |
| 2 | Preview rate < 40% (over last 2 hours, min 5 sessions) | Warning | 15 min |
| 3 | Publish failures > 5 in last hour | Critical | 15 min |
| 4 | Average processing time > 5 minutes (last 5 sessions) | Warning | 15 min |
| 5 | Cost per publish > ₹20 (over last 10 publishes) | Warning | 15 min |

### Alert Display
- Top of dashboard, dismissible
- Color-coded: yellow (warning), red (critical)
- Timestamp + message
- Uses existing `systemAlerts` collection

---

## Daily Summary Widget

Auto-generated summary at bottom of System Health section:

```
Daily Summary — March 12, 2026
─────────────────────────────
Sessions Started: 52
Previews Generated: 43
Menus Published: 34
Preview Rate: 83%
Publish Rate: 79%
Avg Processing Time: 78s
Cost per Publish: ₹6.20
Organic Onboarding Rate: 41%
```

---

## Data Requirements

### New Field: `acquisitionSource` on Session

Add to session creation in `sessionEngine.ts`:

```typescript
acquisitionSource: 'unknown', // Default — refined by UTM params or referrer
```

Populated from:
- UTM parameter on WhatsApp link (`?src=obp` → `obp_page`)
- Manual tracking by founder (`direct_share`)
- Default: `unknown`

### New Field: Session Metrics Enrichment

When events fire, the aggregation CF increments the daily metrics doc. No changes to existing event structure needed.

---

## Out of Scope

- Customer-facing analytics (this is internal ops only)
- Historical trend charts (daily summary is sufficient for v1)
- Export functionality (manual Firestore console for now)
- Mobile version (desktop ops tool only)
- Real-time WebSocket updates (15-min refresh is fine)

---

_Document Status: DOCUMENTED — Ready for Implementation. March 12, 2026._
