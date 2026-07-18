# Business Facts Copy Pack - Mobile Support

**Status:** Implemented V0 public mobile-friendly website tool
**Last Updated:** July 16, 2026
**Audience:** Product, engineering, QA

---

## Mobile Admission

| Gate | Result | Notes |
| --- | --- | --- |
| Frequency | Pass | Owners often need profile, WhatsApp, staff, and link copy on phone |
| Speed | Pass | Browser-local deterministic output keeps latency low |
| Touch | Pass | Form fields, copy buttons, and CTAs use existing public tool patterns |
| Owner value | Pass | Owner receives copy before signup |

## V0 Mobile Behavior

- public route works without login
- form stacks on mobile
- copy blocks are visible before handoff
- each copy block has a copy action
- full report can be copied, shared, or downloaded
- optional handoff requires consent and Turnstile when enabled

## Mobile Boundaries

- no file upload
- no external profile inspection
- no background crawler
- no AI/provider call
- no saved report history
- no mobile owner-shell route in V0

## V1 Mobile Path

V1 appears inside existing owner surfaces, not a new dashboard:

- Business Health
- Public Discovery
- OBP readiness
- Share/QR readiness
- setup/import flow
