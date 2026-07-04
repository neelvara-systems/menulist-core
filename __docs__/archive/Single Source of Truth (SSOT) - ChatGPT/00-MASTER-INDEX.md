> **Status:** Historical archive evidence; not current launch certification.
>
> **Current Launch Boundary:** This archive file is preserved only as historical context. It is not current MenuList source of truth, production approval, deploy approval, launch approval, or release certification. Current readiness is decided only by the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, current source verifiers, browser/device QA, provider smoke, target deploy evidence, and production-host smoke.

# 📘 DOCUMENT 0: MASTER INDEX & NAVIGATION

**File Name:** 00-MASTER-index.md  
**Project:** MenuListAi  
**Last Updated:** 2026-01-11  
**Status:** ✅ PRODUCTION READY — DOCUMENTATION LOCKED

---

## PROJECT MASTER DOCUMENTATION INDEX

This is the single authoritative entry point for the entire MenuListAi documentation suite.

- If you are new → start here.
- If you are blocked → this index tells you exactly where to go.

---

## Quick Reference

| Item                   | Value                                           |
| ---------------------- | ----------------------------------------------- |
| **Project Name**       | MenuListAi                                      |
| **Product Type**       | Autonomous SMB Menu Intelligence System         |
| **Primary Philosophy** | Authority over transparency                     |
| **Target Market**      | Offline SMBs (Restaurants, Cafes, Salons, Spas) |
| **Current Status**     | Production Ready — Ship Approved                |
| **Architecture State** | 🔒 Frozen (3-Year Freeze: 2026–2028)            |
| **Last Validation**    | 2026-01-11                                      |
| **Deployment Target**  | Vercel + Firebase                               |
| **Regions**            | India (Primary), Global (Secondary)             |

---

## Documentation Set Overview

This suite contains 7 standalone, production-grade documents plus this master index.

Each document:

- Is self-contained
- Can be read independently
- Has no assumptions
- Is aligned to the locked SSOT (Single Source of Truth)

---

## Document Map (READ IN THIS ORDER)

### 1️⃣ 01-EXECUTIVE-SUMMARY.md — START HERE

**Audience:** Founders, Investors, Leadership, New Team Members  
**Purpose:** Explains what MenuListAi is, why it exists, and how it wins.

**Covers:**

- Vision, mission, and philosophy
- Market problem & differentiation
- Business model & KPIs
- Go-to-market strategy
- Risk assessment

📍 Reference this doc for strategy alignment.

---

### 2️⃣ 02-FEATURE-CATALOG.md

**Audience:** Product, Engineering, QA  
**Purpose:** Defines every feature as a production system — not ideas.

**Covers (per feature):**

- Business objective
- Target persona
- Step-by-step workflows
- Decision logic & thresholds
- UI behavior
- API endpoints
- Database fields
- Dependencies

📍 Reference this doc for what exists and what does not.

---

### 3️⃣ 03-ARCHITECTURE-BLUEPRINT.md

**Audience:** Engineering, Architecture Review, Security  
**Purpose:** Explains how the system is built and why it is frozen.

**Covers:**

- Frontend & backend architecture
- Firebase schema & access patterns
- Authentication & authorization
- Security model
- Cost model
- Scalability & multi-tenancy
- 3-year architecture lock rationale

📍 Reference this doc before any architectural discussion.

---

### 4️⃣ 04-IMPLEMENTATION-BLUEPRINT.md

**Audience:** Engineers (Day-to-Day)  
**Purpose:** The developer source of truth.

**Covers:**

- Exact file structure
- Constants & thresholds
- Mathematical formulas
- API contracts
- Feature flags
- Environment setup
- Deployment & rollback
- Monitoring hooks

📍 Reference this doc before writing or reviewing code.

---

### 5️⃣ 05-PRODUCTION-VERIFICATION.md

**Audience:** QA, Leadership, Investors  
**Purpose:** Proves the system is safe to ship.

**Covers:**

- Logic verification per feature
- Security audit results
- Performance benchmarks
- Firebase cost analysis
- Scalability checks
- Compatibility & accessibility
- Final production checklist

📍 Reference this doc for go/no-go decisions.

---

### 6️⃣ 06-MARKET-POSITIONING.md

**Audience:** Sales, Marketing, Partnerships, Founders  
**Purpose:** Defines how MenuListAi is sold, positioned, and explained externally.

**Covers:**

- Competitive landscape
- Customer segmentation
- Messaging frameworks
- Pricing rationale
- Regional strategy (India vs Global)
- Sales enablement
- Launch strategy
- Case study & testimonial frameworks

📍 Reference this doc for external communication.

---

### 7️⃣ 07-OPERATIONAL-RUNBOOK.md

**Audience:** Ops, Support, Engineering On-Call  
**Purpose:** Defines how MenuListAi runs in production.

**Covers:**

- Daily operational checklist
- Monitoring & alerts
- Incident response
- Feature flag governance
- Support scripts
- Backup & disaster recovery
- Cost management
- Anti-patterns to avoid

📍 Reference this doc when something breaks or feels off.

---

## Key Metrics Dashboard (Current State)

| Metric                | Value              | Status |
| --------------------- | ------------------ | ------ |
| Features Implemented  | 6 / 6 Core Systems | ✅     |
| Staff Prompt Mode     | Complete           | ✅     |
| Social Content Engine | Complete           | ✅     |
| Architecture Freeze   | Enforced           | ✅     |
| Security Audit        | PASS               | ✅     |
| Firebase Cost Model   | Optimized          | ✅     |
| Multi-Tenant Safety   | Verified           | ✅     |
| Production Readiness  | YES                | ✅     |

---

## Core Systems (Locked)

| System                           | Description            | Status |
| -------------------------------- | ---------------------- | ------ |
| CMI (Customer Menu Intelligence) | Silent decision engine | 🔒     |
| Decision Blocks                  | Menu-level decisions   | 🔒     |
| Digital Screens                  | Visual execution       | 🔒     |
| Physical Surfaces                | Posters, tents         | 🔒     |
| Social Content                   | Campaign-based content | 🔒     |
| Staff Prompt Mode                | Human speech control   | 🔒     |

**No new systems allowed without SSOT amendment.**

---

## Critical Dependencies & Warnings

### ⚠️ Non-Negotiable Constraints

- No feature creep
- No new decision surfaces
- No analytics exposure
- No explanations in UI
- No A/B testing on logic
- Silence is allowed

**Violating any of the above invalidates production trust.**

---

## How to Use This Documentation (By Role)

### 👨‍💼 Founder / CEO

1. Read 01-EXECUTIVE-SUMMARY
2. Read 06-MARKET-POSITIONING
3. Skim 05-PRODUCTION-VERIFICATION

### 🧠 Product Manager

1. Read 02-FEATURE-CATALOG
2. Read 03-ARCHITECTURE-BLUEPRINT
3. Reference 04-IMPLEMENTATION-BLUEPRINT

### 👩‍💻 Engineer

1. Read 04-IMPLEMENTATION-BLUEPRINT
2. Keep 02-FEATURE-CATALOG open
3. Use 07-OPERATIONAL-RUNBOOK when deploying

### 🛟 Support / Ops

1. Read 07-OPERATIONAL-RUNBOOK
2. Use scripts only
3. Never explain logic

### 💼 Investor / Advisor

1. Read 01-EXECUTIVE-SUMMARY
2. Read 05-PRODUCTION-VERIFICATION
3. Review 06-MARKET-POSITIONING

---

## Cross-Reference Convention

All documents reference each other using:

```
[DOC#-SECTION]
```

Example: `[DOC4-API-CONTRACTS]`

This ensures traceability without duplication.

---

## Document Governance

| Item             | Value                   |
| ---------------- | ----------------------- |
| Review Schedule  | Quarterly               |
| Last Review      | 2026-01-11              |
| Next Review      | 2026-04-11              |
| Owner            | MenuListAi Core Team    |
| Change Authority | CEO + Architecture Lock |

---

## Final Statement

This documentation suite represents a closed, validated, production-ready system.

If a question is not answered here:

- The answer is intentionally undefined
- Or the action is intentionally forbidden

**MenuListAi does not explain itself.  
It behaves consistently — and earns trust.**

---

_Document Status: ✅ COMPLETE_  
_Certification ID: MENULIST-PROD-2026-001_
