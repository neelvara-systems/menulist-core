# Answerlattice Support Truth Change Control

> Status: Local source complete on 2026-08-10; authenticated hosted responsive QA remains pending and is tracked in `support-truth-change-control_validation.md`.

Support Truth Change Control removes the recurring owner job of manually tracing every product release through support knowledge. It extends the existing governed release workflow with four connected capabilities:

1. **Release-to-Truth Review** - show directly affected approved answers and Answer Tests before activation.
2. **Source Freshness & Conflict Watch** - inspect only the governed evidence sources referenced by affected answers.
3. **Cross-Surface Dependency Review** - show directly mapped product surfaces and their visible articles, FAQs, and changelog links.
4. **Truth Propagation Proof** - show current source-version and compiled-context evidence, including which delivery channels will require a rebuild after activation.

These are four proof sections in one existing release review, not four products, dashboards, routes, collections, or background jobs.

## Owner Outcome

Before publishing a versioned release, an owner can answer:

- Which approved answers will require review?
- Are the evidence sources behind those answers approved, current, and conflict-free?
- Which mapped customer surfaces and visible support content are connected?
- Which runtime channels use direct current truth and which compiled channels require a rebuild?

The release remains owner-controlled. Answerlattice never rewrites, approves, publishes, deploys, or resolves source conflicts automatically.

## Existing Systems Reused

- Releases and Changelog
- Canonical Answer Governance
- Answer Tests
- Source Governance
- Product Surface Contexts
- Compiled Context Distribution
- Activation Command Center
- Knowledge Map and existing owner handoff routes

## Product Boundary

- Direct mappings only; no one-hop graph inference.
- Reviewer-recorded conflicts only; no automatic conflict discovery or winner selection.
- Point-in-time proof only; no claim that an external client, browser cache, or third-party integration has refreshed.
- No release-readiness score or deployment gate.
- No new Firestore collection, index, listener, scheduled function, or model call.
- Source Governance keeps its existing controlled rollout flag.

## Documents

- [Specification](support-truth-change-control_spec.md)
- [Implementation](support-truth-change-control_impl.md)
- [Firebase cost](support-truth-change-control_firebase.md)
- [Mobile support](support-truth-change-control_mobile-support.md)
- [Help documentation](support-truth-change-control_helpdoc.md)
- [Marketing boundary](support-truth-change-control_marketing.md)
- [Website boundary](support-truth-change-control_website.md)
- [Test cases](support-truth-change-control_test-cases.md)
- [Validation](support-truth-change-control_validation.md)
