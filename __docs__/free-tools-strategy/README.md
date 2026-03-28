# Free Tools / Distribution Strategy

**Version:** 1.0
**Status:** REVIEWED — Strategic direction validated, execution deferred until post-first-customers
**Last Updated:** March 10, 2026

---

## Summary

Strategic review of using free tools / entry utilities for MenuList acquisition. The validated approach: build **entry pipelines** (not random tools) that always result in a MenuList page being created. Each tool usage = new canonical truth page = compounding infrastructure asset.

## Key Decision

**Do NOT build a "tools page."** Instead, expose existing MenuList infrastructure as public entry points, one at a time.

## Priority Order (Post First Customers)

| Priority | Pipeline | Status | When |
|----------|----------|--------|------|
| 1 | Public Menu Upload → Page (`/create-menu`) | 📝 DOCUMENTED | After first 20 customers |
| 2 | QR Menu Generator (standalone page) | NOT STARTED | After 100+ businesses |
| 3 | WhatsApp Onboarding (Meta verification needed) | ✅ BUILT (flagged OFF) | After 100+ businesses |
| 4 | Programmatic City Pages | NOT STARTED | After 500+ businesses |

## Strategic Guardrail

A tool must produce ALL of these to exist:
1. Structured menu/service data
2. A MenuList public page
3. Inbound links / QR distribution
4. Search-indexable content

If it doesn't → **reject it.**

## Permanently Rejected

- Logo/poster/AI caption generators (brand dilution)
- SEO/traffic analyzers (wrong product layer — SurfaceOS territory)
- Business Presence Checker (fails Feature Rejection Gate 1/5)
- Shadow page generation (trust violation)
- Generic marketing tools

## Documents

| File | Purpose |
|------|---------|
| `_archive/chatgpt-review.md` | Full ChatGPT conversation review with web-validated verdicts |

## Related

- `__docs__/public-menu-entry/` — Implementation docs for Priority 1 pipeline
- `__docs__/constitution/` — Feature Rejection Gate, Language Governance
- `__docs__/messaging-onboarding/` — WhatsApp onboarding (Priority 3)
