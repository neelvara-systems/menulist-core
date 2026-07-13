# Reviews & Reputation — Product Specification

**Document Type:** Product Requirements Document (Non-Technical)  
**Audience:** CEO, PM, Business Stakeholders, Sales Teams  
**Version:** 1.0  
**Status:** 🔒 SPEC LOCKED — Implementation blocked until GBP API access granted  
**Date:** February 2, 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [Target Customers](#3-target-customers)
4. [Scope](#4-scope)
5. [User Stories](#5-user-stories)
6. [User Flows](#6-user-flows)
7. [Requirements](#7-requirements)
8. [Architecture Overview](#8-architecture-overview)
9. [Integration Points](#9-integration-points)
10. [Risks & Dependencies](#10-risks--dependencies)
11. [Open Questions](#11-open-questions)

---

## 1. Executive Summary

### What Is This?

**Reviews & Reputation** is a silent, defensive infrastructure layer that prevents restaurant owners from accidentally causing irreversible public reputation damage.

> **One-Line Definition:** "Stops owners from making public situations worse."

### What This Is NOT

| ❌ NOT This                  | Why                                 |
| ---------------------------- | ----------------------------------- |
| A reviews management tool    | Creates cognitive load              |
| A reputation dashboard       | Dashboards invite monitoring        |
| An automatic reply publisher | Removes owner approval and authority |
| A sentiment analyzer         | Analytics create obsession          |
| A review solicitation system | Review gating is illegal (FTC 2024) |

### What This IS

| ✅ This Is               | How                                  |
| ------------------------ | ------------------------------------ |
| Defensive infrastructure | Prevents avoidable damage            |
| Silent layer             | Owners barely know it exists         |
| Authority protection     | Stops bad replies before they happen |
| Damage prevention        | Blocks risky responses               |

### Why This Matters

**The Problem:**

- A restaurant owner sees a negative Google review
- They reply emotionally ("That's not true!" or "You're lying!")
- The reply is now **permanent and public**
- Future customers see the defensive reply
- Trust is damaged forever

**The Solution:**

- MenuList silently monitors incoming reviews
- If a review is risky (mentions hygiene, pricing errors, safety issues)
- Owner sees one calm message: "It's better not to respond to this publicly."
- Owner moves on. Damage prevented.

### Authority Chain Completion

This feature completes MenuList's authority over the customer experience chain:

```
Menu (what customer sees)
    ↓
Experience (in-store)
    ↓
Emotion (satisfaction/frustration)
    ↓
Feedback (private) ← Internal Feedback System ✅ COMPLETE
    ↓
Review (public) ← Reviews & Reputation ← THIS FEATURE
```

---

## 2. Goals & Success Metrics

### Primary Goal

> **Prevent self-inflicted reputation damage from impulsive review replies.**

### Success Metrics (Internal Only)

| Metric                | Target         | Measurement             |
| --------------------- | -------------- | ----------------------- |
| Bad replies prevented | Any            | MOL logs blocked states |
| Escalations sent      | <5% of reviews | Rare = working          |
| Owner awareness       | Near zero      | Silence = success       |

**Note:** These metrics are internal. Owners never see them. This follows Law 7: "No Feature Without Autonomy — Dashboards do not qualify."

### What Success Looks Like

- Owner never thinks about reviews
- Owner doesn't know MenuList is monitoring
- When a risky review appears, owner sees one calm sentence
- Owner forgets they saw it within minutes
- No bad public reply happens

---

## 3. Target Customers

### Ideal Customer Profile (ICP)

| Attribute        | Value                                  |
| ---------------- | -------------------------------------- |
| Business type    | Restaurants, cafes, food service       |
| Review platforms | Active on Google Business Profile      |
| Behavior pattern | Reacts emotionally to negative reviews |
| Current state    | Has replied poorly at least once       |
| Team size        | Owner-operated or small team           |

### Customer Pain Points

1. **Emotional Reactivity** — Sees negative review, replies defensively
2. **Permanence Unawareness** — Doesn't realize replies are permanent
3. **Time Pressure** — Replies in moments of stress (busy service)
4. **No Filter** — No one to review response before posting

### What Customers DON'T Want

| ❌ Don't Want              | Why                        |
| -------------------------- | -------------------------- |
| Another dashboard to check | Adds cognitive load        |
| AI-generated replies       | Feels inauthentic          |
| Review analytics           | Creates obsession          |
| "Tips" on how to respond   | Implies they need training |

---

## 4. Scope

### ✅ In Scope (Will Build)

| Feature                 | Description                                  | Priority |
| ----------------------- | -------------------------------------------- | -------- |
| Review Ingestion        | Read-only sync from Google reviews           | P0       |
| Internal Classification | Silently categorize review risk              | P0       |
| Block State             | Show "don't reply" message for risky reviews | P0       |
| Escalation State        | Rare alert for volatile situations           | P1       |
| Reply Assistant         | Pre-reply warning check (not interception)   | P1       |
| MOL Integration         | Log all system actions                       | P0       |

### ❌ Out of Scope (Will NEVER Build)

| Feature                  | Reason               | Doctrine Reference   |
| ------------------------ | -------------------- | -------------------- |
| AI auto-posted replies   | Removes owner approval | Product boundary |
| Sentiment dashboard      | Creates obsession    | Law 7                |
| Rating analytics         | Invites monitoring   | Law 7                |
| Review volume tracking   | Dashboard mentality  | Law 7                |
| Competitive benchmarking | Comparison = anxiety | Law 3                |
| Review gating            | FTC violation        | Legal compliance     |
| Automatic reply templates | Removes owner review | Core Doctrine       |
| Performance metrics      | Invites analysis     | Law 2                |

### Compliance Requirements

| Regulation                      | Requirement                     | Our Approach                  |
| ------------------------------- | ------------------------------- | ----------------------------- |
| Review-platform and consumer-protection requirements | No suppression, gating, solicitation gaming, or unsupported legal claims | Requires current legal/provider review before implementation or launch |

---

## 5. User Stories

### US-1: Silent Protection

**As a** restaurant owner  
**I want to** be protected from making bad public replies  
**So that** I don't damage my restaurant's reputation permanently

**Acceptance Criteria:**

- I don't need to configure anything
- I don't see any dashboards or analytics
- If a risky review comes in, I see one calm message
- I can ignore the message and nothing breaks

### US-2: Block State

**As a** restaurant owner  
**I want to** be warned before replying to a risky review  
**So that** I don't make a permanent mistake

**Acceptance Criteria:**

- When I check reviews, risky ones show a calm warning
- The warning is exactly: "It's better not to respond to this publicly."
- No explanation, no score, no comparison
- I can still reply if I choose (system doesn't block me)

### US-3: Escalation (Rare)

**As a** restaurant owner  
**I want to** know if a review needs careful professional handling  
**So that** I can involve appropriate help (lawyer, PR, etc.)

**Acceptance Criteria:**

- This happens very rarely (<5% of reviews)
- Message is: "A recent review may need careful handling."
- No details, no explanation
- Just a calm heads-up

---

## 6. User Flows

### Flow 1: Normal Review (No Action)

```
Google Review Arrives
        ↓
MenuList ingests (nightly)
        ↓
Classification: benign/informational
        ↓
[NO OWNER NOTIFICATION]
        ↓
Review sits in Google as normal
```

**Owner Experience:** Nothing. They don't know this happened.

### Flow 2: Risky Review (Block State)

```
Negative Review Arrives (mentions hygiene/price/safety)
        ↓
MenuList ingests (nightly)
        ↓
Classification: negative_high_risk
        ↓
Block State activated
        ↓
Warning appears in dashboard (subtle notice)
        ↓
Sees: "It's better not to respond to this publicly."
        ↓
Warning auto-expires after 24h (no action required)
```

**Owner Experience:** One calm sentence. No dashboard. No explanation.

### Flow 3: Volatile Review (Escalation)

```
Highly Volatile Review (legal threat, viral potential)
        ↓
MenuList ingests (nightly)
        ↓
Classification: volatile
        ↓
Escalation State activated
        ↓
Owner sees (somewhere subtle):
"A recent review may need careful handling."
        ↓
Owner decides to involve professional help (or not)
```

**Owner Experience:** One sentence. Rare. Calm.

---

## 7. Requirements

### 7.1 Functional Requirements

| ID   | Requirement                                     | Priority | Notes                           |
| ---- | ----------------------------------------------- | -------- | ------------------------------- |
| FR-1 | Ingest Google reviews via GBP API (read-only)   | P0       | Nightly sync                    |
| FR-2 | Classify reviews into 5 internal states         | P0       | Rule-based, not ML              |
| FR-3 | Display Block message for high-risk reviews     | P0       | Exact copy locked               |
| FR-4 | Display Escalation message for volatile reviews | P1       | Very rare                       |
| FR-5 | ReputationGuard UI (passive warning notice)     | P1       | Auto-expires, no dismiss button |
| FR-6 | Log all actions to MOL                          | P0       | Audit trail                     |
| FR-7 | Feature flags for all capabilities              | P0       | Instant disable                 |
| FR-8 | Integration with Internal Feedback System       | P1       | Cross-reference                 |

### 7.2 Non-Functional Requirements

| ID    | Requirement     | Target                               |
| ----- | --------------- | ------------------------------------ |
| NFR-1 | Latency         | <500ms for state display             |
| NFR-2 | Availability    | 99.9% uptime                         |
| NFR-3 | Data retention  | 90 days (matches Internal Feedback)  |
| NFR-4 | Cost per store  | <$0.50/month Firestore               |
| NFR-5 | GDPR compliance | No PII storage beyond review content |

### 7.3 Owner-Visible Contract (LOCKED)

| State          | Exact Message                                  | Frequency                   |
| -------------- | ---------------------------------------------- | --------------------------- |
| **Block**      | "It's better not to respond to this publicly." | ~10-20% of negative reviews |
| **Escalation** | "A recent review may need careful handling."   | <5% of all reviews          |

**LOCKED:** No titles. No descriptions. No timestamps. No explanations. Any addition breaks authority.

---

## 8. Architecture Overview

### High-Level System Flow

```
┌────────────────────────────────────────────────────────────┐
│                    GOOGLE BUSINESS PROFILE                  │
│                                                            │
│  Reviews live here. MenuList reads, never writes.          │
│                                                            │
└──────────────────────────┬─────────────────────────────────┘
                           │ (Read-only API)
                           ▼
┌────────────────────────────────────────────────────────────┐
│                    MENULIST BACKEND                         │
│                                                            │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │ Review       │    │ Classifier   │    │ State       │  │
│  │ Ingestion    │ →  │ (Rule-based) │ →  │ Manager     │  │
│  │ (Nightly)    │    │              │    │             │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                            │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│                    OWNER EXPERIENCE                         │
│                                                            │
│  • Block state → One sentence                              │
│  • Escalation → One sentence (rare)                        │
│  • Normal reviews → Nothing (silence)                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision        | Choice                    | Reason                          |
| --------------- | ------------------------- | ------------------------------- |
| Sync frequency  | Nightly                   | Balance cost and freshness      |
| Classification  | Rule-based                | ML is over-engineering          |
| UI presence     | Minimal                   | One sentence max                |
| Warning display | ReputationGuard (passive) | Auto-expires, no dismiss needed |

---

## 9. Integration Points

### Existing Systems

| System                           | Integration       | Purpose                                      |
| -------------------------------- | ----------------- | -------------------------------------------- |
| **Internal Feedback**            | Cross-reference   | If feedback mentions same issue as review    |
| **Hours System**                 | Flag context      | Review mentions "closed" when hours say open |
| **Pricing Integrity**            | Flag context      | Review mentions wrong price                  |
| **MOL (Menu Observation Layer)** | Logging           | All system actions tracked                   |
| **GBP Sync**                     | Shared dependency | Both need GBP API access                     |

### Data Flow

```
Internal Feedback ←──→ Reviews & Reputation
       │                      │
       └──────────┬───────────┘
                  │
             MOL Logging
```

---

## 10. Risks & Dependencies

### Critical Dependency (BLOCKING)

| Dependency         | Status     | Impact                          |
| ------------------ | ---------- | ------------------------------- |
| **GBP API Access** | 🔶 BLOCKED | Cannot implement until approved |

**Resolution:** Implementation blocked until GBP API access is granted. Spec is complete and locked.

### Technical Risks

| Risk                   | Likelihood | Impact | Mitigation                        |
| ---------------------- | ---------- | ------ | --------------------------------- |
| GBP API changes        | Medium     | High   | Abstraction layer, feature flags  |
| Classification errors  | Low        | Medium | Conservative defaults, rule-based |
| Owner ignores warnings | High       | Low    | System works even if ignored      |

### Business Risks

| Risk                          | Likelihood | Impact | Mitigation                |
| ----------------------------- | ---------- | ------ | ------------------------- |
| Feature creep (add analytics) | High       | High   | Hard bans documented      |
| Over-communication            | Medium     | High   | Locked copy, no additions |

---

## 11. Open Questions

| #   | Question                                      | Impact                   | Decision Owner |
| --- | --------------------------------------------- | ------------------------ | -------------- |
| 1   | GBP API access timeline?                      | Blocks implementation    | Founder        |
| 2   | Reply Assistant UX location?                  | Where in app to place it | Product        |
| 3   | Escalation notification method?               | In-app vs subtle badge   | Product        |
| 4   | Cross-reference with Internal Feedback scope? | Integration complexity   | Architect      |

---

## Document References

| Document               | Location                                           |
| ---------------------- | -------------------------------------------------- |
| Implementation Plan    | `reviews-reputation_impl.md`                       |
| Marketing Collateral   | `reviews-reputation_marketing.md`                  |
| Critical Review        | `_archive/CHATGPT-CONVERSATION-CRITICAL-REVIEW.md` |
| Internal Feedback Spec | `__docs__/projects/internal-feedback-system/`      |
| GBP Sync Spec          | `__docs__/gbp-sync/gbp-sync_spec.md`               |
| Core Doctrine          | `__docs__/constitution/01-core-doctrine.md`        |

---

**DOCUMENT STATUS:** 🔒 LOCKED  
**IMPLEMENTATION STATUS:** BLOCKED (GBP API dependency)

---

_This feature is now defined, not built. Implementation begins only after GBP API access is granted._
