# Support Truth Change Control Specification

## 1. Problem

A product owner should not need to search approved answers, source records, product-page mappings, help content, test runs, and compiled distribution state separately for every release.

The system already stores these facts. The missing capability is one bounded, evidence-backed review at the point where a versioned release becomes active.

## 2. Users

- Primary: solo technical founder.
- Secondary: a small startup owner or product lead.
- Larger workspace: a support or knowledge operator with the same permission-scoped evidence.

The default experience must remain useful without requiring daily Answerlattice administration.

## 3. Functional Contract

### 3.1 Release-to-Truth Review

The existing pending-release preview remains the entry point. It must show:

- changed entity IDs;
- directly linked active canonical answers;
- answers that will become review-required;
- directly linked active Answer Tests and retained proof state;
- changed entities with no visible direct answer or test link;
- the current impact fingerprint used by release activation.

Activation still recomputes the mutable answer projection. A changed release or affected-answer write set invalidates the preview.

### 3.2 Source Freshness & Conflict Watch

For the affected answers only, collect their bounded canonical evidence source IDs. Inspect only IDs that belong to Knowledge Intake source records.

Report:

- total referenced source IDs;
- governance-eligible and non-governed IDs;
- checked and unchecked IDs;
- missing source records;
- unreviewed or non-approved records;
- records with no review date;
- records whose review date is due;
- records not yet effective;
- reviewer-recorded conflicts;
- source records that are not ready.

The watch is advisory and point-in-time. It must return `partial` when the direct lookup cap is exceeded and `not_enabled` while Source Governance is disabled. It does not infer conflicts or block product deployment.

### 3.3 Cross-Surface Dependency Review

Read the existing compact product-surface summary once. Select surfaces whose stored `entityIds` intersect the release's changed entities.

Report:

- mapped surface count and a bounded surface sample;
- changed entities with and without a direct surface link;
- visible mapped article, FAQ, and changelog counts;
- per-surface route, visibility, matched entity, and visible-content counts;
- `missing`, `invalid`, or `partial` evidence states when applicable.

Articles and FAQs attached to a selected surface are contextual mappings from the existing summary. They are not represented as proven factual dependencies.

### 3.4 Truth Propagation Proof

Read the existing source-version document and compiled-bundle manifest once each. Validate exact `AL`, `tId`, and `sId` ownership.

Report:

- source-version state;
- manifest state and whether it matches current source versions;
- active and last-ready bundle versions;
- valid public/private bundle availability;
- current delivery mode for Help Center, widget, public API, and MCP;
- expected delivery state after activation.

Release activation always invalidates the compiled manifest. Direct runtime channels continue through current source-versioned runtime paths; enabled compiled channels require a rebuild. Disabled channels remain disabled.

This proof certifies the Answerlattice control-plane evidence only. It does not certify external HTTP caches, custom client code, or third-party consumption.

## 4. Security And Permissions

- Existing authenticated release POST route only.
- Existing `MANAGE_KNOWLEDGE` permission remains mandatory.
- Answer Test details remain conditional on `MANAGE_GOVERNANCE`.
- Exact session `tId/sId` must match request and every loaded document.
- Private/no-store response with bounded JSON.
- Source bodies, notes, citation URLs, and private content are not returned in the watch.
- Public delivery DTOs do not receive this owner evidence.

## 5. Failure Behavior

- Invalid affected answer: fail closed.
- Missing or malformed source record: show attention, never silently count as current.
- Malformed legacy canonical evidence reference: skip the invalid reference, show an explicit attention count, and keep the core release preview usable.
- Missing or malformed compact summary: show unavailable evidence; keep core release review usable.
- Missing or malformed source-version/manifest control state: show unverified/invalid propagation proof.
- Extra evidence above a cap: return partial proof and disclose the cap.
- Optional proof-read failure must not mutate a release.

## 6. Non-Goals

- No generic workflow engine or deployment controller.
- No automatic support-content editing or publication.
- No full dependency graph or semantic inference.
- No scheduled source crawler or external connector.
- No product analytics, causal release analysis, or health score.
- No new release state machine beyond the existing pending/processing/active lifecycle.
- No proof that every customer has received a change.

## 7. Rollout

`ENABLE_ANSWERLATTICE_SUPPORT_TRUTH_CHANGE_CONTROL` controls the additive proof sections. Existing release behavior remains available when it is off. Source evidence editing and enforcement remain governed by `ENABLE_ANSWERLATTICE_SOURCE_GOVERNANCE`.
