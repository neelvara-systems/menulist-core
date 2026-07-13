# Customer-Facing Infrastructure Strategy

> **MenuList = Silent Customer-Facing Stability Infrastructure**

**Created:** February 19, 2026  
**Source:** ChatGPT Strategic Planning + Cascade Codebase Audit + Independent Web Research  
**Status:** 🔒 STRATEGIC FRAMEWORK — Governs all customer-facing feature decisions  
**Review Frequency:** Quarterly

---

## Quick Navigation

| Document | Audience | Purpose |
|----------|----------|---------|
| [ChatGPT Review](./_archive/chatgpt-review.md) | Internal | Original conversation analysis |
| [Pillar 1: Presence Dominance](../presence-dominance/README.md) | All | OBP + behavioral adoption |
| [Pillar 2: Truth & Accuracy](../truth-accuracy-dominance/README.md) | All | MCE + propagation discipline |
| [Pillar 3: Reputation Protection](../reputation-protection/README.md) | All | Reviews + reply assist |
| [Pillar 4: Trust Health Signal](../trust-health-signal/README.md) | All | Behavioral trust indicator |
| [Pillar 5: Loyalty Health Signal](../loyalty-health-signal/README.md) | All | Repeat visit indicator |
| [Pillar 6: Risk/Decline Detection](../risk-decline-detection/README.md) | All | Early warning system |
| [Temp Status Layer](../temp-status-layer/README.md) | All | Real-time status banners |

---

## The 6-Pillar Model

MenuList's customer-facing layer is designed as **silent stability infrastructure** — not SaaS, not dashboards, not analytics tools. The 6 pillars create progressively deeper dependency:

```
Layer 4: MEMORY CONTROL (Retention)              ← Future (12-18 months)
    ↑
Layer 3: REVENUE CONTROL (Discovery/Upsell)      ← ✅ BUILT (Decision Blocks, CMI)
    ↑
Layer 2: TRUST CONTROL (Truth + Reputation)       ← ⚠️ PARTIAL (truth ✅, reputation 📝)
    ↑
Layer 1: ENTRY CONTROL (Presence + Distribution)  ← ✅ BUILT (OBP, GBP sync, SEO)
```

### Pillar Status Summary

| # | Pillar | Purpose | Status | Key Docs |
|---|--------|---------|--------|----------|
| 1 | **Presence Dominance** | MenuList = official business link everywhere | ✅ BUILT (OBP) — behavioral adoption pending | `__docs__/presence-dominance/` |
| 2 | **Truth & Accuracy** | Most trusted source of business info | ✅ BUILT (MCE, hours, versioning) | `__docs__/truth-accuracy-dominance/` |
| 3 | **Reputation Protection** | Review management + reply assist | 📝 DOCUMENTED — blocked on GBP API | `__docs__/reputation-protection/` |
| 4 | **Trust Health Signal** | "Do customers still trust this business?" | 🆕 DOCUMENTED — needs real traffic | `__docs__/trust-health-signal/` |
| 5 | **Loyalty Health Signal** | "Are customers still returning?" | 🆕 DOCUMENTED — needs real traffic | `__docs__/loyalty-health-signal/` |
| 6 | **Risk/Decline Detection** | "Is the business silently weakening?" | 🆕 DOCUMENTED — needs real traffic | `__docs__/risk-decline-detection/` |

### Additional Features (From Strategy Discussion)

| Feature | Purpose | Status | Docs |
|---------|---------|--------|------|
| **Temp Status Layer** | "Closed today" / "Special menu" banners | 🆕 DOCUMENTED | `__docs__/temp-status-layer/` |
| **Festival Menu Switch** | Duplicate → activate → auto-revert | 🔮 LOGGED | Roadmap only |
| **Full Menu Reset** | Safe re-import without breaking links | 🔮 LOGGED | Roadmap only |

---

## Strategic Principles (LOCKED)

### 1. Infrastructure, Not SaaS
MenuList is calm infrastructure businesses depend on daily. Not a feature-rich SaaS, not an experimental AI toy, not a growth-hack product.

### 2. Signals, Not Dashboards
Health indicators show **one word**: Strong, Stable, Weak, Watch, At Risk. No charts. No percentages. No engagement metrics. Constitution Law 7 applies.

### 3. Protection, Not Analytics
Reputation protection = preventing damage. Not sentiment analysis, not review marketing, not rating optimization.

### 4. Behavioral Adoption > Feature Building
Pillar 1 success depends on owners **using** the MenuList link everywhere — not on building more features. The gap is behavior, not engineering.

### 5. Privacy-Safe by Design
All visitor analytics use **aggregate patterns** only. No individual device fingerprinting. No personal data storage. Compliant with India DPDPA 2023.

### 6. Google-First, Others Later
Reviews start Google-only. Distribution starts with shareable links. No multi-platform integrations until demand proven.

---

## Build Sequence (Validated)

| Phase | Feature | Rationale | Status |
|-------|---------|-----------|--------|
| Phase 1 | MCE (Trust Firewall) | Wrong menu destroys everything | ✅ DONE |
| Phase 2 | Mobile (Real-world usability) | Owners live on phone | ✅ DONE |
| Phase 3 | Messaging Onboarding (Growth) | Frictionless WhatsApp acquisition | ✅ CODED |
| Phase 4 | OBP + Presence (Identity) | Become their default link | ✅ BUILT |
| Phase 5 | Reputation (Protection) | Own the review response layer | 📝 DOCUMENTED |
| Phase 6 | Health Signals (Awareness) | Trust + loyalty + risk signals | 🆕 DOCUMENTED |
| Phase 7 | Real-world Onboarding Wave | First 50 serious SMBs | 🔮 FUTURE |

---

## What NOT to Build (Permanent)

| Feature | Reason | Reference |
|---------|--------|-----------|
| Analytics dashboards | Breaks doctrine (Law 7) | Constitution |
| CRM / loyalty programs | Wrong product category | Kill List |
| Website builder | Destroys infrastructure positioning | OBP Spec |
| Review marketing tools | Breaks "protection only" principle | This strategy |
| Customer push notifications | Doctrine violation | Constitution Law 2 |
| Multi-platform review aggregation | No open APIs | ChatGPT Review |
| Individual device fingerprinting | Privacy risk (DPDPA) | ChatGPT Review |

---

## Market Research Summary

| Metric | Value | Source |
|--------|-------|--------|
| Link-in-bio market size | $1.62B (2024) | Dataintelo |
| Linktree users | 50M (79.95% market share) | Statista, Influencers.club |
| Read reviews before selecting business | 88% | SocialPilot, BrightLocal |
| Trust reviews like personal recommendations | 88% | Podium 2025 |
| Reviews lift conversions | 15-20% | SocialPilot, WiserNotify |
| Restaurant guests who never return | 77.4% | Bloom Intelligence 2025 |
| Retention 5% increase → profit boost | 25-95% | Bain & Company / HBR |
| Trust reviews only from last 30 days | 73% | Sixth City Marketing |
| Customers spend more with excellent reviews | 31% more | Podium 2025 |

---

## Feature Flag Mapping

| Pillar | Feature Flag | Status |
|--------|-------------|--------|
| Pillar 1 | `ENABLE_OBP` | `false` (built, testing) |
| Pillar 2 | `ENABLE_MCE` | `false` (built, testing) |
| Pillar 3 | `ENABLE_REVIEWS_REPUTATION` | Not added yet (blocked) |
| Pillar 4 | `ENABLE_TRUST_HEALTH_SIGNAL` | Present, `false`; dormant code is not scheduled or mounted |
| Pillar 5 | `ENABLE_LOYALTY_HEALTH_SIGNAL` | Present, `false`; shares dormant Pillar 4 boundary |
| Pillar 6 | `ENABLE_RISK_DECLINE_DETECTION` | Present, `false`; prerequisite signals inactive |
| Extra | `ENABLE_TEMP_STATUS` | To be added |

---

**Last Updated:** July 13, 2026
