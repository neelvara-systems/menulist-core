# Answer Evidence Metrics

**Status:** Implemented and Feature 13 source-hardened on July 18, 2026. QA deployment and hosted readback remain pending authenticated Firebase access.

This feature gives a founder a compact, evidence-based view of how Answerlattice answered during the latest complete rolling 24-hour window. It does not publish an opaque trust score and it does not claim that non-escalated answers were factually correct or resolved the customer problem.

## Metrics

- **Canonical answer coverage:** approved canonical serves divided by all recorded questions.
- **No escalation:** recorded questions that did not meet the deterministic escalation classifier.
- **Confirmed resolved:** only explicit end-user `resolved` outcomes; unavailable until outcomes exist.
- **Drift:** active canonical answers currently marked for review.
- **Entity answer coverage:** active entities linked to at least one active canonical answer.
- **Top review areas:** bounded support evidence ranked by a disclosed weighted-load formula.

## Runtime Contract

- Summary: `platformSummary/trustMetrics_{tId}_{sId}`.
- Schema: version 2 with `pId: AL`, exact numeric `tId`/`sId`, complete source window, source counts, and timestamp.
- Source caps use cap-plus-one detection. Saturation or malformed scope preserves the previous complete summary.
- The dashboard performs one tenant-scoped summary read and rejects missing, legacy, partial, malformed, or cross-tenant documents.
- Explicit human-help requests are shown separately from the query-escalation denominator.

## Product Boundary

These metrics support review decisions. They do not prove factual correctness, citation completeness, customer resolution, deflection, or product health by themselves.

See the `_spec`, `_impl`, `_firebase`, `_helpdoc`, `_marketing`, `_website`, and `_mobile-support` files in this folder.
