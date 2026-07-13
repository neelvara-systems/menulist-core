# 📋 GBP SYNC — Product Specification

**Feature:** #3 — Google Business Profile Minimal Sync  
**Version:** 1.1
**Status:** Reserved integration; current runtime blocked by GBP API/OAuth/provider gates
**Last Updated:** July 10, 2026
**Author:** Lead Architect (Cascade)

> **Launch boundary:** Not current launch certification or deploy approval. This document records disabled/reserved GBP Sync evidence only: `ENABLE_GBP_SYNC` remains false, token operations fail closed with `GBP_TOKEN_STORE_DISABLED`, and manual Google handoff is the only current owner path. Current implementation or release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:public-business-truth`, Google Business Profile API access, OAuth and target-secret setup, provider smoke, scoped deploy evidence, browser/device QA, and production-host smoke.

---

## 📊 EXECUTIVE SUMMARY

### What Is This Feature?

**Google Listing Sync** is a reserved integration candidate for keeping Google Business Profile aligned with MenuList. Current runtime does not write to Google: `ENABLE_GBP_SYNC` is false, token operations fail closed, and owners use manual Google handoff with the Official Business Page/menu link.

### Goals

| Goal               | Description                             |
| ------------------ | --------------------------------------- |
| **Correctness**    | Owner has the right MenuList link to put on Google |
| **Awareness**      | Owner understands Google updates are manual until provider gates pass |
| **Minimal Effort** | Reserved sync path stays bounded behind explicit approval gates |

### Success Metric

> **"Owner has one trusted MenuList source to copy into Google until direct sync is approved and shipped."**

---

## 🎯 SCOPE

### Current Runtime

| Capability | Current status |
| --- | --- |
| Google OAuth connection | Not shipped; Google Business Profile controls are hidden while `ENABLE_GBP_SYNC` is false |
| Menu link sync | Not shipped; owner updates Google manually |
| Hours drift detection | Not shipped for Google; MenuList hours remain local source truth |
| Manual hours apply to Google | Not shipped |
| Audit logging for GBP actions | Reserved with integration implementation |

### Reserved Integration Scope After Provider Gates

Direct GBP sync requires approved Google Business Profile API access, separate OAuth credentials, token storage rules, route implementation, provider smoke, deploy evidence, browser/device QA, and production-host smoke before it becomes runtime.

### Excluded From Current Runtime

| Excluded              | Reason                                  |
| --------------------- | --------------------------------------- |
| Review automation     | Separate Reviews/Reputation scope; also blocked on API access |
| Review drafting       | Separate feature boundary               |
| Photo sync            | Provider quality/review risk            |
| Posts/announcements   | Marketing tool creep                    |
| Q&A management        | Not current MenuList runtime            |
| Performance dashboard | Violates silence doctrine               |
| Auto-hours write      | Too risky without approval              |
| Push notifications    | Breaks silence governor                 |
| Holiday/special hours | Not current runtime                     |

---

## 👤 USER STORIES

### US-1: Connect Google Business Profile

**As a** restaurant owner  
**I want to** connect my Google Business Profile to MenuList  
**So that** my public details stay accurate without manual checking

**Acceptance Criteria:**

- Not available while `ENABLE_GBP_SYNC` is false
- Requires approved API/OAuth/provider smoke before release
- Connection status cannot be claimed in current runtime

### US-2: Menu Link Stays Correct

**As a** restaurant owner  
**I want to** know my Google menu link always points to my actual menu  
**So that** customers find my real menu, not a dead link

**Acceptance Criteria:**

- System exposes stable MenuList OBP/menu links
- Owner manually copies the link into Google Business Profile
- MenuList does not currently auto-fix Google links

### US-3: Hours Mismatch Awareness

**As a** restaurant owner  
**I want to** know if my Google hours don't match my MenuList hours  
**So that** customers don't show up when we're closed

**Acceptance Criteria:**

- Google hours drift detection is not shipped
- Owner compares MenuList hours and Google hours manually
- MenuList does not currently overwrite Google hours

---

## 🔄 USER FLOWS

### Current Flow: Manual Google Handoff

```
Owner opens MenuList Official Business Page or Share
    ↓
Copies menu link or OBP link
    ↓
Opens Google Business Profile in Google
    ↓
Pastes the MenuList link into the allowed Google field
    ↓
Saves in Google
```

### Reserved Flow: Provider Sync

```
Only after API/OAuth/provider/deploy/browser gates pass:
connect Google → select location → sync allowed websiteUri → show status → owner-approved hours apply
```

---

## 📋 REQUIREMENTS

### Functional Requirements

| ID    | Requirement                                       | Priority |
| ----- | ------------------------------------------------- | -------- |
| FR-1  | Keep `ENABLE_GBP_SYNC` false until provider gates pass | P0 |
| FR-2  | Keep token operations fail-closed while disabled | P0 |
| FR-3  | Keep active public/help/marketing copy bounded to manual Google handoff | P0 |
| FR-4  | Require separate audit before OAuth, provider routes, or sync workers ship | P0 |

### Non-Functional Requirements

| ID    | Requirement               | Target                   |
| ----- | ------------------------- | ------------------------ |
| NFR-1 | API rate limit compliance | Required before provider activation |
| NFR-2 | Token security            | Server-only access before any token write |
| NFR-3 | Sync reliability          | Required before any automated sync claim |
| NFR-4 | Error recovery            | Required before any provider route ships |
| NFR-5 | Cost efficiency           | Must be re-estimated before activation |

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

## Blocking Prerequisites

| #   | Prerequisite                 | Owner | Status           |
| --- | ---------------------------- | ----- | ---------------- |
| 1   | Apply for GBP API access     | User  | ❌ NOT APPLIED   |
| 2   | 60+ day verified GBP listing | User  | ❓ Unknown       |
| 3   | GBP OAuth client created     | User  | ❌ Blocked by #1 |
| 4   | Test account available       | User  | ❓ Unknown       |

**Cannot become active runtime until prerequisites are met and verified.**

---

## 🚨 RISKS & MITIGATIONS

| Risk                   | Impact            | Mitigation                     |
| ---------------------- | ----------------- | ------------------------------ |
| API access denied      | Feature blocked   | Apply with clear use case      |
| API quota exceeded     | Service degraded  | Rate limiting, throttling      |
| Token revoked          | Connection breaks | Auto-disconnect, re-auth flow  |
| Wrong location mapped  | Data corruption   | Verification gate on connect   |
| Hours auto-write error | Trust loss        | Manual approval only after provider gates |

---

## ❓ OPEN QUESTIONS

| #   | Question                 | Impact                | Decision Needed By |
| --- | ------------------------ | --------------------- | ------------------ |
| 1   | GBP API access timeline? | Blocks implementation | User               |
| 2   | Test account available?  | Blocks testing        | User               |
| 3   | Should photos ever be included? | Scope expansion | Product |

---

## Reserved Implementation Gates

### Source Scaffold

| Week | Tasks                                   |
| ---- | --------------------------------------- |
| 1    | Schema extension (gbp, gbpState fields) |
| 1    | Feature flag (ENABLE_GBP_SYNC)          |
| 1    | MOL event types                         |
| 1    | DAL skeleton                            |
| 1    | UI stub ("Not connected" state)         |

### Provider Integration

| Week | Tasks                      |
| ---- | -------------------------- |
| 1-2  | OAuth flow + token storage |
| 2    | Location selection UI      |
| 2-3  | Nightly sync job           |
| 3    | Manual hours apply         |
| 3    | Testing + hardening        |

---

## Acceptance Criteria Before Any Release Claim

- [ ] Owner can connect GBP and select location
- [ ] Owner can disconnect GBP
- [ ] Menu link auto-fixes when wrong
- [ ] Hours mismatch shows "Not synced"
- [ ] "Apply hours" button works
- [ ] All actions logged in MOL
- [ ] Feature flag gates all functionality
- [ ] No Q&A/reviews/photos features
- [ ] Provider smoke evidence exists against a real Google test listing
- [ ] Scoped deploy and production-host smoke evidence exists

---

**DOCUMENT SIGNATURE:** Lead Architect (Cascade)  
**REVIEW STATUS:** Source-boundary updated
**IMPLEMENTATION STATUS:** Blocked by API/OAuth/provider gates
