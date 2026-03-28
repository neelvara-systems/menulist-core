# 📋 GBP SYNC — Product Specification

**Feature:** #3 — Google Business Profile Minimal Sync  
**Version:** 1.0  
**Status:** 🔶 BLOCKED (Awaiting GBP API Access)  
**Last Updated:** January 19, 2026  
**Author:** Lead Architect (Cascade)

---

## 📊 EXECUTIVE SUMMARY

### What Is This Feature?

**Google Listing Sync** keeps your Google Business Profile accurate without daily work. MenuList automatically ensures your menu link is correct and alerts you when hours drift.

### Goals

| Goal               | Description                             |
| ------------------ | --------------------------------------- |
| **Correctness**    | Google always shows the right menu link |
| **Awareness**      | Owner knows when hours mismatch exists  |
| **Minimal Effort** | Connect once, stays handled             |

### Success Metric

> **"Owner never worries if Google is showing the wrong menu link or wrong hours."**

---

## 🎯 SCOPE

### ✅ What We WILL Do (Phase 1)

| #   | Capability                | Description                                             | Autonomy          |
| --- | ------------------------- | ------------------------------------------------------- | ----------------- |
| 1   | **GBP Connection**        | Connect Google account, select location per outlet      | Manual (one-time) |
| 2   | **Menu Link Sync**        | Auto-fix wrong/missing menu link on Google              | Autonomous        |
| 3   | **Hours Drift Detection** | Detect when Google hours ≠ MenuList hours (weekly only) | Autonomous        |
| 4   | **Manual Hours Apply**    | "Apply MenuList hours to Google" button                 | Owner-approved    |
| 5   | **Audit Logging**         | All actions logged internally (MOL)                     | Silent            |

### ❌ What We Will NOT Do (Phase 1)

| Excluded              | Reason                                  |
| --------------------- | --------------------------------------- |
| Review automation     | Feature #5 territory (brand risk)       |
| Review drafting       | Feature #5 territory                    |
| Photo sync            | Rate-limited, quality review by Google  |
| Posts/announcements   | Marketing tool creep                    |
| Q&A management        | API deprecated Sept 2024                |
| Performance dashboard | Violates "silence" doctrine             |
| Auto-hours write      | Too risky without approval              |
| Push notifications    | Breaks silence governor                 |
| Holiday/special hours | Complex edge cases, Phase 1 weekly only |

---

## 👤 USER STORIES

### US-1: Connect Google Business Profile

**As a** restaurant owner  
**I want to** connect my Google Business Profile to MenuList  
**So that** my public details stay accurate without manual checking

**Acceptance Criteria:**

- Can sign in with Google account
- Can select the correct GBP location for my outlet
- Connection status shown in settings
- Can disconnect at any time

### US-2: Menu Link Stays Correct

**As a** restaurant owner  
**I want to** know my Google menu link always points to my actual menu  
**So that** customers find my real menu, not a dead link

**Acceptance Criteria:**

- System computes canonical MenuList URL
- Nightly check detects wrong/missing link
- Auto-fix when safe (high confidence)
- Skip and log when uncertain

### US-3: Hours Mismatch Awareness

**As a** restaurant owner  
**I want to** know if my Google hours don't match my MenuList hours  
**So that** customers don't show up when we're closed

**Acceptance Criteria:**

- Nightly check compares GBP `regularHours` vs MenuList `workingHours` (weekly only)
- Ignore `specialHours`/holiday hours in Phase 1
- If store has overnight hours → mark `hoursStatus='UNKNOWN'` (avoid false mismatch)
- Status shown: "Synced" or "Not synced"
- One-button fix when mismatch exists
- No automatic overwrites

---

## 🔄 USER FLOWS

### Flow 1: Initial Connection

```
Owner opens Settings → Business Settings
    ↓
Sees "Google Business Profile" section
    ↓
Clicks "Connect Google"
    ↓
Google OAuth consent screen
    ↓
Selects correct location from list
    ↓
Confirms mapping
    ↓
Status: "Connected"
Menu link: "Managed"
```

### Flow 2: Nightly Sync (Autonomous)

```
2 AM UTC — Nightly job runs
    ↓
For each connected store:
    ↓
Read GBP current state (websiteUrl, hours)
    ↓
Compare with MenuList truth
    ↓
Menu link wrong? → Auto-fix if confident
    ↓
Hours mismatch? → Log, update state
    ↓
Owner sees status next login
```

### Flow 3: Manual Hours Fix

```
Owner sees "Hours: Not synced"
    ↓
Clicks "Apply MenuList hours to Google"
    ↓
System writes hours to GBP
    ↓
Status updates to "Synced"
    ↓
Action logged in MOL
```

---

## 📋 REQUIREMENTS

### Functional Requirements

| ID    | Requirement                                       | Priority |
| ----- | ------------------------------------------------- | -------- |
| FR-1  | OAuth flow with Google (separate client)          | P0       |
| FR-2  | Location selection with verification              | P0       |
| FR-3  | Token storage (server-only, secure)               | P0       |
| FR-4  | Canonical URL computation                         | P0       |
| FR-5  | Nightly link check + auto-fix (`websiteUri` only) | P0       |
| FR-6  | Nightly hours drift detection (weekly hours only) | P0       |
| FR-7  | Manual hours apply button                         | P1       |
| FR-8  | Disconnect capability                             | P1       |
| FR-9  | MOL logging for all actions                       | P1       |
| FR-10 | Feature flag gating                               | P0       |

### Non-Functional Requirements

| ID    | Requirement               | Target                   |
| ----- | ------------------------- | ------------------------ |
| NFR-1 | API rate limit compliance | 300 QPM max              |
| NFR-2 | Token security            | Server-only access       |
| NFR-3 | Nightly job reliability   | 99.9% uptime             |
| NFR-4 | Error recovery            | Exponential backoff      |
| NFR-5 | Cost efficiency           | <$1/month for 100 stores |

---

## 🏗️ ARCHITECTURE OVERVIEW (Non-Technical)

```
┌─────────────────────────────────────────────────────────────┐
│                      MENULIST DASHBOARD                      │
│  ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │ Business        │    │ Nightly Job (2 AM)           │   │
│  │ Settings        │    │ • Check menu link            │   │
│  │ • GBP Section   │    │ • Check hours                │   │
│  │ • Connect btn   │    │ • Auto-fix link if needed    │   │
│  │ • Status display│    │ • Log everything             │   │
│  └─────────────────┘    └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  GOOGLE BUSINESS PROFILE API                 │
│  • Read location info (hours, websiteUrl)                   │
│  • Write websiteUrl (menu link)                             │
│  • Write hours (on owner approval)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 💰 COST ANALYSIS

### Firebase Costs

| Operation                  | Volume            | Cost          |
| -------------------------- | ----------------- | ------------- |
| Firestore reads (nightly)  | 1 per store/night | ~$0.001/store |
| Firestore writes (state)   | 1 per store/night | ~$0.001/store |
| Cloud Function (scheduler) | Part of existing  | ~$0.01/month  |

**Total:** <$1/month for 100 stores

### Google API Costs

| API                      | Cost | Quota   |
| ------------------------ | ---- | ------- |
| Business Information API | FREE | 300 QPM |

---

## ⚠️ PREREQUISITES (BLOCKING)

| #   | Prerequisite                 | Owner | Status           |
| --- | ---------------------------- | ----- | ---------------- |
| 1   | Apply for GBP API access     | User  | ❌ NOT APPLIED   |
| 2   | 60+ day verified GBP listing | User  | ❓ Unknown       |
| 3   | GBP OAuth client created     | User  | ❌ Blocked by #1 |
| 4   | Test account available       | User  | ❓ Unknown       |

**⚠️ CANNOT PROCEED until prerequisites are met.**

---

## 🚨 RISKS & MITIGATIONS

| Risk                   | Impact            | Mitigation                     |
| ---------------------- | ----------------- | ------------------------------ |
| API access denied      | Feature blocked   | Apply with clear use case      |
| API quota exceeded     | Service degraded  | Rate limiting, throttling      |
| Token revoked          | Connection breaks | Auto-disconnect, re-auth flow  |
| Wrong location mapped  | Data corruption   | Verification gate on connect   |
| Hours auto-write error | Trust loss        | Manual approval only (Phase 1) |

---

## ❓ OPEN QUESTIONS

| #   | Question                 | Impact                | Decision Needed By |
| --- | ------------------------ | --------------------- | ------------------ |
| 1   | GBP API access timeline? | Blocks implementation | User               |
| 2   | Test account available?  | Blocks testing        | User               |
| 3   | Photos in Phase 2?       | Scope expansion       | Product            |

---

## 📅 TIMELINE

### Phase 0: Foundation (While Waiting for API Access)

| Week | Tasks                                   |
| ---- | --------------------------------------- |
| 1    | Schema extension (gbp, gbpState fields) |
| 1    | Feature flag (ENABLE_GBP_SYNC)          |
| 1    | MOL event types                         |
| 1    | DAL skeleton                            |
| 1    | UI stub ("Not connected" state)         |

### Phase 1: Implementation (After API Access)

| Week | Tasks                      |
| ---- | -------------------------- |
| 1-2  | OAuth flow + token storage |
| 2    | Location selection UI      |
| 2-3  | Nightly sync job           |
| 3    | Manual hours apply         |
| 3    | Testing + hardening        |

---

## ✅ ACCEPTANCE CRITERIA (Feature Complete)

- [ ] Owner can connect GBP and select location
- [ ] Owner can disconnect GBP
- [ ] Menu link auto-fixes when wrong
- [ ] Hours mismatch shows "Not synced"
- [ ] "Apply hours" button works
- [ ] All actions logged in MOL
- [ ] Feature flag gates all functionality
- [ ] No Q&A/reviews/photos features

---

**DOCUMENT SIGNATURE:** Lead Architect (Cascade)  
**REVIEW STATUS:** SPEC COMPLETE ✅  
**IMPLEMENTATION STATUS:** 🔶 BLOCKED (API Access)
