# Ops Control Room — Mobile Support Assessment

**Created:** February 20, 2026
**Last Updated:** June 30, 2026

---

## Feature Admission Test

| Gate | Question | Answer | Result |
|------|----------|--------|--------|
| Frequency | Daily or multiple times/day? | Once morning, once evening at most | ❌ FAIL |
| Speed | Completes in <5 seconds? | Read-only dashboard, yes | ✅ PASS |
| Touch | Works with thumb-only? | Numeric blocks only, no complex interaction | ✅ PASS |
| Value | Needed away from desk? | Telegram alerts cover urgent awareness | ❌ FAIL |

**Original Result:** DESKTOP PRIMARY — 2 of 4 gates failed for a full dashboard workflow.

The Ops Control Room remains a desktop-first platform admin tool. Urgent system awareness is still delivered through alerts, and deeper investigation happens at a desk.

## Current Mobile Contract

Mobile support now exists only as a platform-only emergency surface for the same operator, not as an owner workflow. The mobile screen inherits the same `platformRole === 'PLATFORM'` gate, shared ops DAL reads, SAFE_MODE confirmation, alert-mute action, and force-republish confirmation pattern.

June 30, 2026 hardening keeps the mobile mutation calls aligned with desktop:

- SAFE_MODE and alert-mute browser requests use no-store cache, same-origin credentials, and manual redirect handling.
- SAFE_MODE and alert-mute acknowledgements pass through the shared 16KB bounded Ops Control Room response readers before success copy is shown.
- Rejected, redirected, malformed, oversized, or invalid acknowledgements show fixed mobile copy and log bounded `mobile_ops_safe_mode_toggle_failed` / `mobile_ops_mute_alerts_failed` diagnostics only.
- Source gate: `npm run verify:ops-control-room-boundary` locks the mobile platform-only screen, SAFE_MODE confirmation, alert-mute action, force-republish confirmation pattern, shared response readers, and MobileShell route mapping.
- This adds no owner-facing mobile navigation, Firestore reads/writes, Cloud Function logic, rules, indexes, Firebase deploy requirement, or Vercel deploy action.

Scheduler Monitor mobile support is platform-only and mirrors the desktop monitor's emergency recovery boundary. It keeps the same `platformRole === 'PLATFORM'` gate, reads the shared scheduler DAL snapshot on manual refresh, renders scheduler detail/error payloads as bounded summaries only, and calls store-scoped manual recovery with the selected `storesSummary` store rather than a project ID.

- Source gate: `npm run verify:scheduler-monitor-boundary` locks the mobile scheduler monitor, store-scoped manual recovery, bounded detail rendering, shared store-summary selector, and MobileShell route mapping.
- This adds no owner-facing mobile navigation, Firestore writes, Cloud Function logic, rules, indexes, Firebase deploy requirement, or Vercel deploy action.
