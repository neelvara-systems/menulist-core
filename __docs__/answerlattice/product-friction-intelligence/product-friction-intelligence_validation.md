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
| Release overlay | Correlation only | Do not claim a release caused friction. Validate a bounded comparison separately. |
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

## Validation-Only Scope

- workflow-tree presentation;
- product-surface journey placement;
- owner-confirmed cause taxonomy;
- release-window correlation;
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
| Post-release relief review | Existing completed-window evidence and release records | Validation only. A later bounded comparison requires real owner demand and must remain correlation, not an automatic 7/14/30-day causal workflow. |
| Customer Promise Ledger | None | Reject. CRM obligations, delivery commitments, and customer communication state are outside governed-answer infrastructure. |
| Automatic customer close-the-loop | None | Reject automatic sending. Any future output must remain an owner-approved draft or export, not an outbound messaging system. |
| Proactive friction prevention | Predictive Support | Already covered by owner-reviewed, exact-page, bounded triggers. Engagement is not proof of resolution. |
| Product Decision Memory | Releases, proposals, audit logs, and answer history | Validate a demonstrated recall gap before adding any new record type. |
| Ask Answerlattice | Owner Support Assistant | Keep deterministic summary-backed intents. Do not create a generic chat-with-analytics or transcript system. |
| GitHub and Linear integrations | Controlled outbound workflow adapters | Do not broaden delivery or persistence until repeated owner evidence proves the handoff problem. The local evidence brief remains the safe default. |
| Native helpdesk or Jira ingestion | No admitted connector | Keep deferred until the connector admission rule is satisfied by three paying workspaces requesting the same read-only provider. |
| Problems and Promises navigation | No route or navigation entry | Reject. These labels would establish unsupported product systems and duplicate existing owner paths. |

The only implementation correction admitted by this reconciliation is the
non-confirming **Review known limitation** path. It asks the owner to verify
whether a constraint is intentional and approved; it does not persist a
classification or assert that the product behavior is correct.

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
explicitly separate from measured facts.
