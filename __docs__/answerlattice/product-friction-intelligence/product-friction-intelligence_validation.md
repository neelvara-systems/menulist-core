# Product Friction Evidence External Proposal Validation

Reviewed: 2026-07-30

This review compares the attached `Customer Friction Map` proposal with current
Answerlattice code, compact summaries, security boundaries, and Firebase cost
contracts.

## Verdict

Do not build a separate Customer Friction Map. Improve the existing Product
Friction Evidence feature so it explains the deterministic evidence mix already
collected for each ranked entity.

The strongest owner value is:

> Show where mapped support evidence concentrates, what kind of evidence it is,
> and which governed product concept should be inspected next.

## Proposal Matrix

| Proposal | Current truth | Decision |
|---|---|---|
| Rank support problems by product area | Implemented | Existing nightly summaries rank exact-scope active entities. |
| Prefer user goals and workflows over articles | Partly implemented | Workflow entities are supported when evidence is actually mapped to them. Do not infer workflows. |
| Aggregate ticket, negative feedback, escalation, and canonical misses | Implemented in daily rows, incompletely projected | Admit the bounded component breakdown into the next summary/UI schema. |
| Show one evidence number rather than an opaque score | Partly implemented | Keep weighted load only with its formula and components; rename owner-facing aggregate language. |
| 7-day comparison | Implemented | Keep completed 7-day versus previous 7-day windows. |
| 30/90-day and arbitrary timelines | Not justified | Additional history and controls add cost and interpretation complexity. |
| Product-surface journey tree | Not implemented | Validate mapping completeness and owner usefulness first. |
| Heat overlay | Not justified | A ranked list is more legible and cheaper for the current founder ICP. |
| Automatic root-cause classification | Unsafe as stated | AI may organize admitted evidence as advisory text; it cannot prove a cause or percentage. |
| Knowledge gap, UX, bug, missing docs, expectations, policy, and technical-failure types | Not source-proven | These require owner-confirmed classification and clear evidence contracts before persistence. |
| Release overlay | Implemented as a separate bounded overlay | Explicit owner load, direct entity links, complete UTC windows, and correlation-only vocabulary; no automatic review or causal claim. |
| Suggested fixes | Advisory only | Route to existing reviewed knowledge or product workflows; never auto-publish. |
| Mobile ranked drill-down | Direction accepted | Use a stacked evidence list, not a canvas or tree. |
| Nightly summary-first Firebase design | Implemented | Keep current scheduler, deterministic rows, compact summaries, and no owner listener. |

## Implemented Code Scope

1. Projected existing deterministic evidence components into the top-entity
   snapshot contract.
2. Hardened server/browser parsing and legacy behavior.
3. Replaced inaccurate mixed-evidence wording.
4. Made the support-evidence load label and calculation inspectable.
5. Preserved the two-read owner cost and existing scheduler queries.
6. Rendered strict entity-specific advisory actions and linked ranked evidence
   to the existing read-only Knowledge Map without adding a new read model.
7. Added the explicit Post-Change Support Evidence Review without changing the
   nightly friction summary, persisting an outcome, or using a causal score.
8. Completed the owner-selected review handoff with entity-validated routing to
   existing governance surfaces, local product-review export, and explicit
   no-reminder/no-persistence close behavior.

## Validation-Only Scope

- workflow-tree presentation;
- product-surface journey placement;
- owner-confirmed cause taxonomy;
- a new filtered raw-evidence surface or raw support-event explorer.

These items require real-client mapping and decision evidence before code.

## July 30 Product-Owner Expansion Review

The later `Product Friction and Change Control Layer` proposal correctly
identified the value of moving a factual friction packet into the owner's
existing product or knowledge workflow. It did not justify its proposed
command center, durable product-problem lifecycle, automatic root-cause
taxonomy, affected-user counts, severity model, release causation, Promise
Ledger, automatic customer messaging, or new primary navigation.

The admitted implementation is narrower:

- one ranked entity from the already-loaded compact snapshot;
- one explicitly owner-selected review path, including a non-confirming known
  limitation review, that is not stored as diagnosis;
- one deterministic, capped Markdown evidence brief;
- browser-local copy and download;
- deterministic continuation into existing entity-scoped governance routes
  when a safe internal destination exists;
- fixed evidence limitations;
- zero new Firebase or provider operations.

This closes the practical handoff gap without claiming that Answerlattice has
product analytics, unique-user evidence, issue-delivery state, or causal proof.
Linear, GitHub, and other execution systems continue to own engineering work.
The owner can manually attach the brief there without Answerlattice claiming
that delivery occurred.

### Expansion Decision Reconciliation

| Proposed expansion | Current owner path | Decision |
|---|---|---|
| Product Friction Command Center | Daily Brief and Product Friction Evidence | Do not add another command center. Keep the existing bounded priority and evidence surfaces. |
| Product Problem Briefs | Browser-local Friction Evidence Brief | Admit only the deterministic, read-only packet. Do not add product-problem documents, PRDs, status, assignees, or lifecycle state. |
| Release Guard | Release impact preview, drift review, and release-scoped Answer Tests | Existing bounded scope is sufficient. Do not claim dependency completeness or release causation. |
| Post-release relief review | Post-Change Support Evidence Review inside Product Friction Evidence | Implemented only as an explicit, read-only, complete 14-day UTC comparison over direct entity links. No automatic 7/14/30-day workflow, persisted relief state, or causal conclusion. |
| Customer Promise Ledger | None | Reject. CRM obligations, delivery commitments, and customer communication state are outside governed-answer infrastructure. |
| Automatic customer close-the-loop | None | Reject automatic sending. Any future output must remain an owner-approved draft or export, not an outbound messaging system. |
| Proactive friction prevention | Predictive Support | Already covered by owner-reviewed, exact-page, bounded triggers. Engagement is not proof of resolution. |
| Product Decision Memory | Releases, proposals, audit logs, and answer history | Validate a demonstrated recall gap before adding any new record type. |
| Ask Answerlattice | Owner Support Assistant | Keep deterministic summary-backed intents. Do not create a generic chat-with-analytics or transcript system. |
| GitHub and Linear integrations | Controlled outbound workflow adapters | Do not broaden delivery or persistence until repeated owner evidence proves the handoff problem. The local evidence brief remains the safe default. |
| Native helpdesk or Jira ingestion | No admitted connector | Keep deferred until the connector admission rule is satisfied by three paying workspaces requesting the same read-only provider. |
| Problems and Promises navigation | No route or navigation entry | Reject. These labels would establish unsupported product systems and duplicate existing owner paths. |

The admitted implementation corrections are the non-confirming **Review known
limitation** path and deterministic continuation from every review path. The
known-limitation path asks the owner to verify whether a constraint is
intentional and approved; it does not persist a classification or assert that
the product behavior is correct. Continuation reuses existing governance
routes, local export, or close behavior and introduces no task state.
The final cross-check also freezes each brief to one scoped snapshot and makes
Knowledge Map continuation fail closed under its kill switch or missing-entity
state, without widening the admitted product scope.

## Real-Workspace Decision Validation Protocol

Use this protocol before reopening any rejected expansion above. It validates
whether the current Daily Brief -> Product Friction Evidence -> existing review
route helps an owner make a decision; it does not add runtime telemetry, a
problem lifecycle, or a second task system.

### Minimum evidence packet

- three real founder or small-team workspaces;
- at least three qualified friction reviews per workspace;
- a complete, non-stale friction snapshot with an active mapped entity;
- the current deterministic evidence breakdown and local evidence brief;
- no sample workspace, seeded conclusion, raw customer transcript, or customer
  identity in the research record.

### One-session review

For each qualified entity:

1. Start from Daily Brief or the ranked Product Friction Evidence surface.
2. Inspect the current and previous completed windows and evidence components.
3. Choose one existing review path without being shown a suggested diagnosis.
4. Prepare the browser-local evidence brief.
5. Open the existing Knowledge Map, approved-answer, release, or Answer Test
   destination, or the external product-investigation system required by that
   selection.
6. Record whether the evidence was sufficient to choose the path and what was
   missing when it was not.

The research record may contain only an anonymous workspace reference, entity
type, completed-window dates, selected review path, decision time, evidence
sufficiency, missing deterministic field, destination opened, and whether the
brief was copied or downloaded. Keep it outside Answerlattice runtime storage.

### Admission decisions

- Keep the current implementation when owners can choose and open the correct
  existing review path without requesting another internal queue.
- Refine the existing summary projection only when the same missing
  deterministic field recurs across all three workspaces and that field is
  already retained by the bounded source model.
- Consider controlled Linear or GitHub handoff only when all three paying
  workspaces show that manual copy/download repeatedly blocks the decision from
  reaching engineering. External execution remains authoritative.
- The August 10 owner-relief decision admitted one release/correction window
  comparison before this research threshold was completed. Keep its rollout
  claim at local source completion until authenticated workspaces prove it
  helps decisions; do not expand it beyond direct links, complete windows, and
  correlation-only language from hypothetical demand.
- Do not infer unique affected users, product defects, severity, abandonment,
  churn, revenue impact, or verified relief from support-event counts.
- Do not add `productProblem`, promise, decision-memory, customer-closure, or
  action-disposition documents as part of this validation.

At completion, retain one short validation note containing the number of
qualified reviews, median decision time, evidence-sufficient count, selected
path distribution, repeated missing field if any, and the resulting keep,
refine, or reject decision. Product development reopens only from that evidence,
not from a hypothetical feature list.

## Rejected Scope

- session replay;
- behavioral product analytics;
- funnel or abandonment tracking;
- mouse or screen recording;
- autonomous root-cause determination;
- causal release claims;
- automatic product or knowledge changes;
- a second friction collection or map snapshot family.
- durable product-problem, promise, decision-memory, or customer-closure
  systems;
- automatic issue creation or outbound customer communication.

## Final Decision

Feature 3 remains Product Friction Evidence. A bounded component-breakdown
hardening pass is justified because it uses already-retained evidence and helps
the owner interpret why an entity ranked highly. The bounded Knowledge Map
handoff is also justified because it preserves the same governed entity without
copying metrics or authority. The larger journey-map vision is a
customer-validation question, not approved implementation scope. A local
evidence brief is also admitted because it reuses that same bounded summary,
adds no persistence or paid operation, and keeps the owner's selection
explicitly separate from measured facts. Post-Change Support Evidence Review is
also admitted as a contained overlay: it reuses retained release, correction,
entity-link, and signal evidence; costs nothing on mount; and reports observed
direction without asserting product relief or causation.
