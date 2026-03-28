# Domain Adoption Nudges — Strategy (Deferred)

**Date:** March 18, 2026  
**Source:** ChatGPT conversation (compliance pages session)  
**Status:** DEFERRED — separate feature, not part of compliance pages  
**Priority:** Build after compliance pages are live and domain connections are active

---

## Summary

ChatGPT proposed a multi-surface "identity completion pressure system" to drive domain connection adoption. The strategic framing is valid but this is a separate feature from compliance pages.

## Key Concepts (Worth Preserving)

### Identity Status Layer
- Dashboard shows: Current Identity (brand.menulist.ai — "Temporary") vs Official Identity (abc.com — "Not set")
- Creates psychological incompleteness

### Activation Triggers (When to Show)
- Show domain nudge ONLY after at least one usage signal: QR generated, link copied, OBP opened on mobile, WhatsApp onboarding completed
- Before this: no belief, low trust → don't show

### Surface Injection Points
- Share link flow: "Use your own domain instead"
- QR code screen: "Make this your official link"
- OBP preview: "Use your domain"
- Dashboard persistent strip: "Your official website is not set"

### Framing Rules
- AVOID: "custom domain", "connect domain", "DNS setup"
- USE: "Make this your official website", "Use your own domain everywhere"

### State Machine (If Built)
```
UNINITIALIZED → ELIGIBLE → PROMPTED → INITIATED → VERIFYING → ACTIVE → DEGRADED
```

### What NOT to Do
- No aggressive popups
- No discounts/incentives
- No forced gating
- No tutorials overload

## Why Deferred

1. Compliance pages must ship first (removes friction from domain connection)
2. Domain connection UX already exists (CustomDomainTab)
3. Nudges require tracking signals (QR generated, link copied) — need instrumentation
4. Scope discipline: this is a growth/activation feature, not infrastructure

## Implementation When Ready

- Create `__docs__/domain-adoption-strategy/` with full doc set
- Implement tracking signals (store-level: hasSharedLink, hasGeneratedQR, hasSeenOBP)
- Build dashboard identity block
- Add CTA injection points to share/QR flows
- Feature flag: `ENABLE_DOMAIN_ADOPTION_NUDGES`
