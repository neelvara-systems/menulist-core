# ChatGPT Review Session 2 — Overrides-Only Model + Domain Adoption

**Date:** March 18, 2026  
**Source:** ChatGPT feedback on compliance pages implementation  
**Accuracy:** ~60% (3 of 6 issues valid)

---

## Validation Table

| # | Issue | Verdict | Action |
|---|-------|---------|--------|
| 1 | Dual source of truth → overrides-only | **AGREE** | Refactored: DAL stores only custom overrides, SSR always generates from template |
| 2 | Remove unnecessary API surface | **PARTIAL** | Simplified: GET returns generated + override status, POST override saves, reset deletes. Still need GET for dashboard. |
| 3 | Remove feature flag | **DISAGREE** | Feature flags are MANDATORY per project rules. Every feature needs one. Not negotiable. |
| 4 | Footer link visual weight | **ALREADY HANDLED** | Already 11px, #999, no underline — minimal possible. |
| 5 | Domain coupling | **DEFER** | Valid strategic insight but separate feature scope. Archived as strategy doc. |
| 6 | Domain adoption nudges (large) | **DEFER — DOC ONLY** | Separate feature entirely. Strategy archived at `__docs__/domain-adoption-strategy/`. |

## Changes Implemented

1. **DAL refactored** to `ComplianceOverrideDoc` — stores only `privacyOverride`/`termsOverride` fields
2. **API simplified** — GET always generates system content + checks for overrides. POST override saves, reset = `deleteField()`
3. **SSR page simplified** — always generates from template, checks for override. Removed `inputsChanged`, `formatTimestamp`, `generationInputs`
4. **Dashboard UI updated** — removed version tracking from state types
5. **Dead code removed** — `inputsChanged()` function deleted from templates.ts

## Why Issue 3 Was Rejected

ChatGPT said: "remove flag before launch, treat as always-on infra"

This violates project rule: **every feature gets `ENABLE_[FEATURE_NAME]` in features.ts (default OFF)**. Feature flags are mandatory for:
- Safe deployment
- Independent enablement per feature
- Easy rollback
- Testing flexibility

The flag will be **enabled** when ready, not removed.
