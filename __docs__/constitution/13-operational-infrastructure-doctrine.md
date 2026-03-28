# Constitution §13 — Operational Infrastructure Doctrine

**Status:** LOCKED  
**Created:** February 20, 2026  
**Source:** ChatGPT strategic session → Cascade critical review  
**Authority:** Constitution-level (governs all operational/infrastructure decisions)

---

## Core Principle

> MenuList is public infrastructure for business truth delivery.  
> Infrastructure must detect failures before customers discover them.  
> Silent reliability builds authority. Visible failure destroys it.

---

## 7 Laws of Operational Infrastructure

### Law 1: Detection Before Discovery

```
If something breaks and the founder doesn't know → dangerous.
If something breaks and the founder knows before the owner → trust preserved.
If something breaks and auto-recovers before anyone notices → authority strengthened.

Detection speed > fix speed > prevention perfection.
```

### Law 2: Cost Containment is Non-Negotiable

```
Firebase cost must be BOUNDED risk, not open-ended risk.
Every heavy operation must have:
  - Rate limiting (Upstash, per-endpoint)
  - Feature flag (instant disable)
  - SAFE_MODE awareness (stop when system stressed)

No bug, abuse, or loop should be able to run for more than 6 hours
without detection and automatic throttling.
```

### Law 3: Alert on Patterns, Not Instances

```
Single failures are noise. Patterns are signal.
Do NOT alert for:
  - One function error
  - One PDF failure
  - One slow response

DO alert for:
  - 5+ publish failures in 10 min
  - Menu render failure rate >5% in window
  - Function crash loop (same function >10 times in 5 min)

Pattern-based alerting prevents alert fatigue.
Alert fatigue = alerts become useless.
```

### Law 4: Restore First, Debug Later

```
When public-facing service breaks:
  1. RESTORE service (force republish, reset cache, serve cached version)
  2. THEN investigate root cause

Service restoration > root cause analysis.
During an outage, customers don't care WHY it broke.
They care that it's WORKING.

Debug calmly AFTER service is stable.
```

### Law 5: Support Volume = Product Clarity Metric

```
If support is high → product is unclear.
If same question appears 5 times → system flaw, not user error.

The goal of support is to eliminate the need for support.
Every repeated question must result in a product fix,
not a better answer template.

Target: <10% escalation rate from automated responses.
After 50 stores, support should be near-silent.
If not → UX needs fixing.
```

### Law 6: Automation Amplifies Quality

```
Automated support/monitoring only works if the underlying system is reliable.
Automation on top of a broken system = amplified chaos.

Build order:
  1. Make the system reliable
  2. Add monitoring to detect remaining failures
  3. Add alerting to notify about failures
  4. Add automation to handle routine cases

Never skip step 1.
```

### Law 7: Stale but Visible > Broken

```
If a publish fails and old version is cached:
  Customer sees slightly outdated menu → acceptable.
  Customer sees blank page → trust destroyed.

Edge caching, CDN, and server-side rendering should ensure
that public pages NEVER show blank/error states.

Degradation is acceptable. Failure is not.
```

---

## Operational Severity Levels

| Level | Description | Response Time | Example |
|-------|------------|---------------|---------|
| **P0** | Public truth delivery broken | <15 min | Menu not loading, OBP down, publish not reflecting |
| **P1** | Degraded but functional | <1 hour | Images broken, cache delay, one store specific issue |
| **P2** | Cosmetic/internal | Same day | Minor formatting, non-critical schema warning |

---

## What MenuList Must NEVER Build (Ops)

- Complex observability stack (Datadog, Grafana, distributed tracing)
- Real-time streaming dashboards
- AI-powered anomaly detection
- SLA dashboards or uptime percentages
- Multi-channel notification systems (email + SMS + Slack + push)

Keep operational tooling as lean as the product itself.

---

## Cost Protection Hierarchy

```
1. Prevention (rate limiting, feature flags) — BUILT ✅
2. Detection (monitoring, health checks) — IN PROGRESS
3. Circuit breaking (SAFE_MODE) — TO BUILD
4. Recovery (manual tools, cache reset) — TO BUILD
5. Post-mortem (incident log) — TO BUILD
```

---

## Decision Test for Operational Features

> "If 50 SMBs are using MenuList and this system doesn't exist,
> what's the worst that happens?"

- If answer = "Menu breaks and I don't know" → BUILD IT
- If answer = "I check Firebase Console manually" → DEFER
- If answer = "Nothing noticeable" → REJECT

---

**Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | February 20, 2026 | Initial doctrine from ChatGPT review |
