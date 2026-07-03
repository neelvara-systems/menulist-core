# 14. Feature Lifecycle Doctrine

**Status:** LOCKED  
**Created:** February 21, 2026  
**Authority:** Constitution-level — governs ALL feature development lifecycle decisions  
**Source:** Derived from Special Menu Switching strategic review (ChatGPT CEO-level evaluation)

---

## Core Principle

> Features are infrastructure investments, not shipping deadlines.
> Build when architecture demands it. Freeze when stability demands it.
> Reopen only when real usage demands it.

---

## The Feature Lifecycle Model

Every non-core feature follows this exact lifecycle:

```
BUILD → FREEZE → TRIGGER → REOPEN → PILOT → PRODUCTION
```

### Phase 1: BUILD
- Implement full architecture behind feature flag (OFF by default)
- Complete types, DAL, UI, mobile, docs
- Log reliability items that aren't needed until production
- Pass validation checklist

### Phase 2: FREEZE
- Feature flag remains OFF
- No further development, refactoring, or polishing
- No UI tweaks, no performance optimization, no marketing prep
- Logged items stay logged — not implemented
- Focus shifts to core system stability

### Phase 3: TRIGGER (Reopen Conditions)
Feature reopens ONLY when ALL applicable triggers fire:

| Trigger | Threshold | Example |
|---------|-----------|---------|
| **Active customer base** | 30-50+ active businesses using core features daily | Real stores publishing menus |
| **Organic demand signal** | 5+ customers independently request the capability | "How do I run a festival menu?" |
| **Contextual timing** | Real-world event that makes feature valuable | Approaching Diwali, Christmas, Ramadan |
| **Core stability proven** | Zero critical incidents in core features for 30+ days | No wrong-menu, no publish failures |

**Do NOT reopen based on:**
- Internal excitement
- Competitor launches
- "It would be cool if..."
- Demo preparation
- Investor pitch features

### Phase 4: REOPEN
- Implement logged reliability items (transactions, version bumps, schedulers)
- Run stress tests for the specific use case triggering reopen
- Prepare 5-customer pilot list

### Phase 5: PILOT
- Enable feature flag for 5 selected customers only
- Observe silently for one full cycle (e.g., one festival period)
- Track: activation timing, revert reliability, owner confusion, support tickets
- Fix issues discovered during pilot

### Phase 6: PRODUCTION
- Enable feature flag globally
- Monitor first 30 days
- Never market loudly — let dependency form naturally

---

## Classification: Which Features Follow This Model?

| Feature Type | Lifecycle Model | Reason |
|-------------|----------------|--------|
| Core features (menu editor, publish, QR) | BUILD → PRODUCTION (skip freeze) | Required for Day 1 |
| Retention features (special menus, analytics) | Full 6-phase lifecycle | Valuable only with real usage |
| Infrastructure features (monitoring, alerts) | BUILD → PRODUCTION | Required for system health |
| Growth features (GBP sync, SEO) | Full 6-phase lifecycle | Valuable only at scale |

---

## Anti-Patterns

### Engineering Drift
> "The feature is built but let me just polish the UI a bit..."

STOP. If feature is frozen, no polishing. Polishing pre-production features is wasted effort — real usage will reveal what actually needs polish.

### Premature Reliability
> "Let me add transaction safety before anyone uses it..."

STOP. Logged reliability items are implemented during REOPEN phase, not during BUILD. Building production-grade reliability for a feature no one uses yet is over-engineering.

### Excitement-Driven Reopen
> "Competitor just launched something similar, we should enable ours!"

STOP. Competitor launches are not reopen triggers. Customer demand is.

### Demo-Driven Development
> "We need this for the investor demo next week..."

STOP. Features enabled for demos create maintenance burden. Demo with core features only.

---

## Current Feature Status Board

| Feature | Phase | Flag | Reopen Triggers |
|---------|-------|------|----------------|
| Special Menu Switching | Active guarded runtime; expansion-frozen | `ENABLE_SPECIAL_MENU_SWITCHING: true` in frontend and Functions | Future expansion still requires usage/request evidence before adding new special-menu scope |

*Update this table as features move through lifecycle phases.*

---

## Relationship to Other Doctrine

| Doctrine | Connection |
|----------|-----------|
| `01-core-doctrine.md` — Law 5 (Public Surfaces Demand Perfection) | Features in PILOT phase must meet perfection standard before PRODUCTION |
| `08-feature-rejection-gate.md` — 5 Questions | Features must pass rejection gate BEFORE entering BUILD phase |
| `11-product-evolution-doctrine.md` — Evolution rules | This doctrine governs WHEN evolution happens, not WHAT evolves |
| `13-operational-infrastructure-doctrine.md` | Infrastructure features skip FREEZE (always needed) |

---

**This doctrine is LOCKED. It governs all feature lifecycle decisions.**
**Violations = feature drift = launch risk.**
