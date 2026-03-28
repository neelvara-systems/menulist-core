# Ops Control Room — Product Specification

**Status:** 📝 DOCUMENTED  
**Created:** February 20, 2026  
**Audience:** CEO, PM, Non-developers

---

## Executive Summary

**What:** Internal dashboard at `/ops` that gives the founder instant system-wide visibility.  
**Why:** Without it, the founder must check Firebase Console, Sentry, and Vercel separately to understand system health.  
**For Whom:** MenuList founder/superadmin only (not visible to SMB owners).

---

## Problem Statement

Currently, to answer "Is MenuList stable right now?" the founder must:
1. Open Firebase Console → check Firestore usage
2. Open Sentry → check error rates
3. Open Vercel → check deployment status
4. Manually query Firestore → check store counts

This takes 5-10 minutes and requires context-switching between 4 tools. The ops control room consolidates the answers into a single page that loads in <10 seconds.

---

## Goals

| Goal | Target |
|------|--------|
| Time to assess system health | <10 seconds |
| Number of external tools needed | 0 (everything on one page) |
| Data freshness | Current session (manual refresh) |

---

## Sections (5)

### Section 1: System State
- Store health summary (OK / WARNING / FAILED counts)
- Recent publish success rate
- SAFE_MODE status (ON/OFF)
- Last alert type + timestamp

### Section 2: Adoption Pulse (last 24h)
- New stores onboarded
- Menus published
- Active stores (published in last 7 days)
- Feedback submissions count
- AI generations count

### Section 3: Store Integrity Signals
- Stores without active project
- Stores unpublished >48h after onboarding
- Stores with zero publish in 60 days
- Stores with MCE failures (if MCE enabled)

### Section 4: Recent Alerts
- Last 10 alerts from `systemAlerts` collection
- Severity, title, timestamp, acknowledged status

### Section 5: Emergency Controls
- Enable/Disable SAFE_MODE (with confirmation dialog)
- Mute Alerts for 20 minutes (deploy window)

---

## Non-Functional Requirements

- **Access:** Superadmin only (platform role check)
- **Data loading:** Fetch-on-open, no real-time listeners, manual refresh button
- **Design:** Numeric blocks only, no charts, no graphs (Lean v1)
- **Cost:** ~5-10 Firestore reads per page load (pre-aggregated data where possible)
- **Not in sidebar:** Direct URL access only (`/ops`)

---

## What This Is NOT

- Not an analytics dashboard (no trend lines, no historical data)
- Not a store management tool (no edit capabilities)
- Not customer-visible (superadmin only)
- Not real-time (manual refresh)

---

**Document Policy:** Single spec. Implementation details in `_impl.md`.
