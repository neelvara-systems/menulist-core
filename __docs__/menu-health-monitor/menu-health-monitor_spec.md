# Menu Health Monitor — Product Specification

**Status:** ✅ IMPLEMENTED — gated by `ENABLE_MENU_HEALTH_MONITOR`
**Created:** February 20, 2026  
**Last Updated:** July 16, 2026
**Audience:** CEO, PM, Non-developers

---

## Executive Summary

**What:** Automatic verification that published menus are working correctly for customers.  
**Why:** If a menu publish fails silently, the business serves broken/outdated content to customers. Trust is destroyed.  
**For Whom:** The MenuList founder/ops team (not visible to SMB owners).

---

## Problem Statement

The implemented desktop and mobile design-publish surfaces hand the routed public menu URL to an authenticated verification callable after the project write and cache invalidation are acknowledged. Verification is internal, feature-flagged, and never converts an already acknowledged owner publish into a failure toast.

At 20-50 stores, one broken menu during lunch rush = trust damage that's hard to recover from.

---

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Detect publish failures | Time to detection | <5 minutes |
| Reduce customer-visible failures | % of failures detected before customer report | >95% |
| Zero overhead on healthy publishes | Additional cost per successful publish | ~₹0 |

---

## Scope

### In-Scope
- Post-publish verification after explicit desktop/mobile design publish while the feature flag is enabled
- Store health status field on store document
- Alert trigger on failure detection
- Admin visibility of store health

### Out-of-Scope (NOT building)
- Periodic menu load testing (cron) — Use external tools if needed
- Last Known Good Version fallback — CDN edge cache handles transient failures
- Automatic mutation retry — platform recovery refreshes already-correct truth; it does not invent or overwrite menu content
- Customer-visible health indicators — Internal ops only

---

## User Stories

### US-1: Publish Verification
**As** the MenuList founder,  
**I want** the system to automatically verify each publish went live correctly,  
**So that** I know about failures before owners or customers discover them.

**Acceptance Criteria:**
- After an explicit design publish, the client starts verification without blocking owner success
- System verifies: admitted canonical target, HTTP success, and a bounded non-empty response body
- On failure: store health status set to FAILED, alert triggered
- On success: store health status set to OK (silent, no alert)

### US-2: Store Health Visibility
**As** the MenuList founder,  
**I want** to see which stores have health issues,  
**So that** I can prioritize fixes and maintain trust.

**Acceptance Criteria:**
- Each store has a `health` field with status, last check time, failure reason
- Admin panel shows stores sorted by health status (FAILED first)
- Health status updates automatically after each publish verification

---

## Verification Checks

| Check | What It Verifies | Failure Means |
|-------|-----------------|---------------|
| HTTP 200 | Menu page loads | Page down or routing broken |
| Non-empty body | Content renders | Blank page served to customers |

---

## Failure Types (Standardized)

| Code | Description | Severity |
|------|------------|----------|
| `MENU_HTTP_FAIL` | Public menu URL returns non-200 | P0 |
| `MENU_EMPTY` | Page loads but no menu content | P0 |
| `MENU_TARGET_REJECTED` | URL is not an admitted public HTTPS target | P0 |
| `VERIFICATION_ERROR` | Bounded verification runtime failure | P1 |

---

## Non-Functional Requirements

- **Latency:** Verification must complete within 30 seconds of publish
- **Cost:** Near-zero for healthy publishes. 1 Firestore write per failure detection
- **Reliability:** Verification failure must NOT block the publish pipeline
- **Privacy:** No customer data accessed. Only checks public URL accessibility

---

**Document Policy:** Single spec. Implementation details in `_impl.md`.
