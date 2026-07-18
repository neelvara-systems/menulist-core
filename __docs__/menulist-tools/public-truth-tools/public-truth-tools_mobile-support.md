# Public Truth Tools - Mobile Support

**Status:** Active family; Public Truth Tools owner mobile readiness card implemented
**Last Updated:** July 16, 2026
**Audience:** Product, mobile, developers

---

## Mobile Relevance Decision

**Decision:** Partial.

The framework itself is not a mobile screen. Individual tools may appear on mobile only when they pass the 4-gate admission test.

---

## Feature Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Partial | Some checks are rare setup tasks; QR/share, WhatsApp action, hours, and photo status checks can be useful during daily operation |
| Speed | Pass for status cards | A status card or one-tap fix path can complete quickly |
| Touch | Pass for simple actions | Present/missing status and one fix action work on mobile |
| Value | Partial | Owners may need QR/link/photo/status fixes away from desk; complex reports do not belong on mobile |

---

## Mobile Placement Rules

Allowed mobile placement:

- Today card only when a strong action exists
- More -> Public source status
- Share screen for QR/link checks
- Share or Official Business Page action area for WhatsApp/call/booking link checks
- Business settings or Business Health for hours/holiday gaps
- Official Business Page mobile screen for photo/contact gaps
- Business Health mobile status when already loaded or read through the shared owner hook

Implemented owner mobile behavior:

- Business Health shows eighteen compact readiness modules from `useOwnerPublicTruthReadiness()`: sixteen public-tool-aligned checks, one Print & Share asset-readiness check, and Menu Freshness.
- The module report is read-only on mobile and stays inside `MobileShell`.
- Module action buttons map to existing mobile destinations: Menu tab, Share tab, basic settings, domain settings, hours edit, Official Page, or Presence Monitor.
- It reuses `useMobileProjects()` and does not create a mobile-only DAL.
- It does not navigate to desktop owner routes from the card.

Disallowed mobile placement:

- full report builder
- external source setup wizard
- side-by-side report comparisons
- admin/provider configuration
- recurring report management

---

## PWA Shell Contract

Owner-facing mobile tools must stay inside `MobileShell`.

Rules:

- use existing mobile providers and selected project/store context
- do not navigate to desktop owner routes from mobile tab actions
- do not force reloads
- do not add separate mobile DAL functions
- do not create a separate auth path

If a tool is public website only, it may use a normal responsive website route.

---

## Copy Rules

Use short labels:

- "Ready"
- "Missing hours"
- "Add photo"
- "Update link"
- "No action needed"

Avoid:

- confidence percentages
- detailed explanations
- AI/search warnings
- comparison charts

---

## Verification

Future mobile verification should cover:

- 320px, 360px, and 390px widths
- dark and light mode
- large touch targets
- no text overflow
- shell-safe navigation
- no duplicate store/project loading path

Current verifier:

- `npm run verify:public-truth-check` checks shared hook/card wiring and mobile fix-target callbacks.
- `npm run verify:owner-business-assistant` checks Business Health and mobile-shell guardrails.
- `npm run verify:public-truth-tools` also runs executable URL, action-destination, report-payload, and print/share boundary tests. The July 16 hardening adds no mobile route, mobile-only DAL, or shell bypass.
