# Temporary Status Layer — Spec

**Status:** ✅ IMPLEMENTED  
**Author:** Cascade (Lead Architect)  
**Date:** February 19, 2026  
**Audience:** CEO, PM, Clients (non-technical)

---

## Executive Summary

**What:** Quick temporary status banners on the official page and digital menu — "Closed today", "Opening late", "Special menu only" — with automatic expiry.

**Why:** Customers arrive and find the place closed, running a special menu, or opening late. This creates frustration and bad reviews. A simple temporary banner prevents these situations.

**For whom:** MenuList business owners who need to communicate temporary changes.

**Impact:** Small but emotionally significant. Prevents specific customer anger scenarios. Low effort, high satisfaction.

---

## Scope

### In-Scope

- Predefined status types: Closed Today, Opening Late, Special Menu Only, Custom
- Custom message field (max 100 chars)
- Expiry time (auto-remove after specified time)
- Banner display on OBP and digital menu
- Quick toggle on dashboard and mobile
- Auto-expiry cleanup

### Out-of-Scope

- Recurring schedules (use working hours for that)
- Multiple simultaneous statuses
- Rich content (images, links)
- Push notifications to customers
- Historical status log

---

## User Stories

### Story 1: Closed for Event

> As an **owner**, I'm hosting a private event tonight. I tap "Closed Today" on my dashboard, set expiry to tomorrow morning. Customers who check my page see a yellow banner: "Closed for a private event today."

### Story 2: Opening Late

> As an **owner**, I'm running late this morning. I tap "Opening Late", type "Opening at 12pm instead of 10am", set expiry to 12pm. Banner auto-removes when I open.

### Story 3: Auto-Expiry

> As an **owner**, I set "Special Menu Only" for a festival with 24-hour expiry. Next morning, the banner is gone automatically. I don't need to remember to remove it.

---

## Status Types

| Type              | Default Message                | Use Case                          |
| ----------------- | ------------------------------ | --------------------------------- |
| Closed Today      | "Closed today"                 | Private events, emergency closure |
| Opening Late      | "Opening late today"           | Staff issues, weather             |
| Closing Early     | "Closing early today"          | Early closure, staff shortage     |
| Kitchen Closed    | "Kitchen is closed"            | Kitchen off, drinks only          |
| Special Menu Only | "Special menu available today" | Festival, themed event            |
| Custom            | Owner writes message           | Any temporary notice              |

---

## Requirements

| ID    | Requirement                              | Priority |
| ----- | ---------------------------------------- | -------- |
| FR-01 | Quick status toggle (1-2 taps on mobile) | P0       |
| FR-02 | Auto-expiry after specified duration     | P0       |
| FR-03 | Banner visible on OBP and digital menu   | P0       |
| FR-04 | Custom message (max 100 chars)           | P1       |
| FR-05 | Feature flag `ENABLE_TEMP_STATUS`        | P0       |
| FR-06 | Mobile quick toggle on More screen       | P0       |

---

**Last Updated:** February 22, 2026
