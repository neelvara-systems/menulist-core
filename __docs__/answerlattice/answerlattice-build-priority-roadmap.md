# Answerlattice — Build Priority Roadmap

> **Created:** 2026-03-07
> **Last Updated:** 2026-07-20
> **Sources:** Internal docs audit + codebase truth + Answerlattice doctrine + reviewed external expansion proposal
> **Purpose:** Single consolidated priority list for Answerlattice activation, controlled rollout, and future expansion
> **Rule:** Prove the governed answer loop before expanding integrations or distribution.

---

## Current Runtime Truth

Answerlattice is no longer a backend-only system. The current codebase implements the base self-serve and governance stack:

- Public website, static product demo, pricing/get-started/contact/resource pages.
- Self-service onboarding, workspace profile, Activation Command Center, Install Center, and widget install verification.
- Knowledge Intake / KB generation compatibility, product surfaces, FAQ, KB, changelog, ticket fallback, feedback, and hosted help.
- Knowledge Intake now includes repeated reply import for one repeated user question plus one founder answer, producing FAQ and canonical proposal drafts without native inbox/helpdesk connectors.
- Product ontology, entity candidates, canonical answers, drift governance, signal mutation, mutation proposal review, trust metrics, coverage KPI, weekly digest, and nightly scheduler.
- Public API v1 routes for answers, entities, and signals, guarded by `ENABLE_ANSWERLATTICE_PUBLIC_API`.
- Workflow integration infrastructure for governance events, with Slack/email self-service and Linear/GitHub controlled rollout.
- Product friction intelligence, ticket-to-knowledge extraction, knowledge graph traversal, predictive support, and compiled context bundles with caps/guards. Widget bundle bootstrap stays disabled until the widget consumes and verifies those files.
- A validated private advanced-branding profile, multi-language draft preparation, guided workflows, MCP, and a bounded automatic AI-failure evaluator exist behind rollout flags. The branding profile has no customer-facing consumer; automatic Help Chat escalation has no customer handoff and no activation-ready server route.

Important distinction:

| Area | Runtime truth | Expansion stance |
| --- | --- | --- |
| First-client launch loop | Implemented but must be proven with real workspace data | Immediate priority |
| Public API v1 | Implemented, default flag off | Roll out only after canonical coverage is proven |
| Workflow integrations | Slack/email self-service; Linear/GitHub controlled | Keep bounded; no Jira shortcut |
| Jira integration | No native Jira connector found | Do not build now; select one provider only after paying-client and export-friction proof |
| Helpdesk integrations | No native Zendesk/Intercom/Freshdesk/Help Scout connectors found | Keep export/import; one read-only provider only after the full admission gate |
| Native private-source intake connectors | Reserved app flag only; no runtime or Functions consumer | Do not build now; validate one repeatedly requested read-only provider after export/import proof |
| Multi-channel distribution | Widget and hosted help are active | Expand only after source-of-truth quality is proven |
| White-label / multi-language | Advanced branding is only a private profile; translation is only draft preparation; customer delivery is absent for both | Market expansion only after repeated paying-client demand |

---

## Mandatory Execution Contract

The next work must optimize for one proof:

> A fresh Answerlattice workspace can move from setup to trusted answer improvement without manual repo intervention.

That means this loop must work before Jira, native helpdesk connectors, broad API rollout, or extra distribution channels:

1. Founder creates or opens an Answerlattice workspace.
2. Workspace profile captures product URL, support email, billing model, and starting product context.
3. Knowledge Intake adds source-backed product material.
4. Product surfaces map routes, pages, workflows, entities, tags, articles, changelogs, and tickets.
5. Entity candidates appear and are reviewed.
6. Canonical answer drafts appear and are reviewed.
7. Approved canonical answers serve through widget/help/API-compatible retrieval paths.
8. Widget install is verified on a separate client surface with safe page context.
9. Negative feedback, fallback, ticket, and escalation signals enter the signal queue.
10. Mutation proposals and auto drafts remain human-reviewed before publish.
11. Coverage, drift, trust, friction, and weekly digest surfaces show the system state from compact summaries.

No roadmap item may bypass human approval, tenant isolation, summary-backed reads, or canonical-first retrieval.

---

## Priority Sequence

| Priority | Workstream | Status | Gate before widening scope |
| --- | --- | --- | --- |
| 1 | Self-serve foundation: website, demo, onboarding, workspace profile, Activation Command Center, Install Center, widget verification, dashboard readiness | Implemented; needs first-client proof | Fresh workspace completes setup without direct developer help |
| 2 | Knowledge Intake and product setup: source intake, product profile, surface mapping, route/page/workflow context | Implemented; intake is the preferred setup path | Owner can add sources and publish reviewed outputs without hidden crawls or auto-publish |
| 3 | Product ontology: entity extraction, candidate review, approval, relations, search index, feature/plan/role/workflow/integration/error modeling | Implemented | Entity candidates are approved and linked to real surfaces/content |
| 4 | Canonical answers: editor, scopes, canonical-first retrieval, confidence, versioning, guided procedure model | Implemented; guided workflows default off | 5-10 high-traffic approved canonical answers resolve real questions |
| 5 | Governance workflow: entity review, canonical answer review, mutation proposal review, drift, coverage, trust/readiness, weekly digest | Implemented | Governance queues are actionable and not noisy |
| 6 | Signal mutation loop: feedback, negative feedback, fallback, repeated tickets, escalation signals, auto drafts, approval queue | Implemented with caps; AI escalation flag off | Repeated signals create useful proposals without auto-publishing |
| 7 | Ticket-to-knowledge loop: resolved ticket clustering, reusable extraction, customer answer draft, KB/canonical proposal | Implemented with caps | Three-plus resolved tickets per entity produce useful reviewed proposals |
| 8 | Product friction intelligence | Implemented and enabled with caps | Founder sees product-confusion areas without BI-style dashboards |
| 9 | AI failure escalation | Source-hardened but default off; active widget fallback is separate; browser ticket authority removed | Add/enable a Help Chat handoff only after a server-authoritative, explicitly confirmed, deterministic/idempotent route and representative false-interruption, answer-quality, and founder-usefulness proof |
| 10 | Public API v1 | Implemented but default off | Enable after canonical coverage, API keys, rate limits, and docs are verified for the target tenant |
| 11 | Workflow integrations | Implemented with guards | Keep Slack/email self-service; Linear/GitHub controlled until secret lifecycle is production-safe |
| 12 | Jira integration | Not implemented; do not build now | Reconsider one read-only provider only after paying-client concentration, export-friction, selected-scope, deletion, cost, and concierge-outcome proof |
| 13 | Helpdesk integrations | Not implemented as native connectors; do not build now | Keep export/import; reconsider one read-only provider only after the complete Feature 43 admission gate |
| 14 | Changelog-to-knowledge automation | Partially implemented through releases/surfaces/drift | Widen only after releases are consistently linked to entities and stale-answer review |
| 15 | Knowledge graph traversal | Implemented and active with 1-hop summary-backed guards | Keep bounded; no visualization unless owner value is proven |
| 16 | Predictive support | Implemented and active with cooldown/fail-closed guards | Keep rule-based and quiet; no prompt spam |
| 17 | Content package generation | Not a standalone product surface yet | Generate drafts only from governed sources and review queues |
| 18 | Team approval routing | Partially covered by staff access/governance roles | Add only when review volume requires routing by support/product/engineering/legal/billing |
| 19 | Customer-facing distribution expansion | Widget/hosted help active; other channels not implemented | Expand only after answer source of truth is stable |
| 20 | White-label and multi-language expansion | Gated prototypes; multilingual review/publish/delivery is not implemented | Validate demand after the core workflow is selling, then design the governed read model before enabling |

---

## Jira Rule

Do not build Jira as ticket sync.

Do not build a native Jira connector now. The flow below is a future admission boundary only after Jira is the single provider that passes the Feature 43 paying-demand, export-friction, selected-resource permission, revocation/deletion, privacy, retention, recovery, cost, and concierge-outcome gate.

The only acceptable Jira flow is:

1. Jira issue resolved.
2. Map issue to a product entity or product surface.
3. Check existing canonical answer and linked KB/help content.
4. Detect missing, stale, or scope-conflicted knowledge.
5. Generate a draft answer, article, support macro, or stale-answer review item.
6. Send the draft to Governance.
7. Publish only after approval.

Implementation requirements before Jira starts:

- Full feature doc set under `__docs__/answerlattice/jira-integration/`.
- Feature flag in `src/config/features.ts`.
- Server-side secret storage and redaction rules.
- No raw Jira payloads in browser responses.
- No direct canonical answer mutation.
- No issue creation/comment bot unless a separate doctrine review approves that scope.
- Firebase cost notes for imports, status sync, labels/signals, delivery logs, and retry behavior.

---

## Helpdesk Integration Rule

Native helpdesk connectors are not the next step.

Day-one helpdesk history should enter through Knowledge Intake as owner-provided exports, CSV/JSON, macros, canned replies, repeated replies, or transcripts. Native Zendesk, Intercom, Freshdesk, or Help Scout OAuth/API connectors require a separate docs-first feature because they introduce credential scope, privacy, rate-limit, and retention risk.

The acceptable helpdesk flow is:

1. Import reviewed support history.
2. Cluster resolved conversations by entity/surface.
3. Extract reusable answer material.
4. Generate customer-facing draft, support macro draft, KB update proposal, or canonical answer proposal.
5. Send to Governance.
6. Publish only after approval.

Feature 43 now has an executable no-runtime/no-claim boundary and a complete dossier under `__docs__/answerlattice/native-helpdesk-and-jira-connectors/`. Reconsider one provider only after at least three paying workspaces request the same provider, concierge imports prove useful governed outcomes, and selected-resource permissions, revocation, deletion, privacy, rate limits, retention, recovery, and cost are designed. Do not create a generic connector framework first.

---

## Public API Rollout Gate

Public API v1 routes exist, but `ENABLE_ANSWERLATTICE_PUBLIC_API` remains off by default.

Before enabling it for a tenant:

1. Confirm at least one approved canonical-answer set for high-traffic entities.
2. Confirm `al_*` key creation, hashing, scope validation, and rate limits.
3. Confirm answer endpoint does not run expensive RAG fallback.
4. Confirm entities endpoint reads capped approved ontology data only.
5. Confirm signal ingestion writes low-payload `answerlattice_signalEvents` with tenant scope resolved from the key.
6. Confirm public docs and quickstart do not market raw KB editing, ticket automation, or direct canonical mutation.
7. Confirm usage logs and failure modes are visible without exposing secrets.

---

## What Not To Build Now

| Item | Decision | Reason |
| --- | --- | --- |
| Jira before governance proof | Reject | Jira is valuable only when it becomes trusted knowledge proposals |
| Native helpdesk OAuth before export/import proof | Reject | Credential/privacy risk before intake loop is proven |
| Opaque signal-quality score | Reject until calibrated | Visible evidence counts are safer than an unexplained percentage; require reviewed-proposal outcomes before ranking |
| Autonomous browser or account-changing actions | Reject | Guided Explain + Guide delivers safer task help; broad execution violates product boundaries and requires disproportionate authorization/recovery risk |
| Helpdesk replacement features | Reject | Violates Answerlattice non-goals |
| Live chat infrastructure | Reject for core roadmap | Operational support system, not governed answer infrastructure |
| Broad multi-channel distribution | Defer | Spreads unreliable answers if source truth is not proven |
| White-label/multi-language as core activation | Defer | Market expansion, not the first-client proof |
| Autonomous publishing | Reject permanently | Violates governance invariant |
| BI dashboards unrelated to support truth | Reject | Metrics must serve governance health |

---

## Support Expansion Follow-Up Sequence

This sequence was validated after the SupportLayer category comparison and is tracked in `support-expansion-sequence.md`.

| Order | Item | Current status | Firebase posture |
| --- | --- | --- | --- |
| 1 | Repeated reply import to approved-answer draft | Implemented through Knowledge Intake | No new collection, Storage path, Cloud Function, scheduler, index, connector, or AI call |
| 2 | Soft role-based answer approval | Next candidate after queue volume proof | Must reuse staff roles and governance docs before adding routing data |
| 3 | Support gap to product task | Later | One-way sanitized handoff only; no workflow sync by default |
| 4 | Email-to-support-gap | Later | Start with export/import; native inbox sync remains rejected until docs-first credential review |

---

## Documentation and Implementation Rules

For any new roadmap item:

1. Read doctrine first: `doctrine/01-core-doctrine.md`, `02-non-goals-charter.md`, and `03-infrastructure-freeze-v1.md`.
2. Create or update the full feature doc set before code when the feature is new.
3. Keep docs under `__docs__/answerlattice/[feature-name]/`.
4. Use `ENABLE_ANSWERLATTICE_*` flags for rollout control.
5. Keep Answerlattice data scoped by `pId`, `tId`, and `sId`.
6. Use Answerlattice Firebase helpers and `functions-answerlattice/` for Answerlattice server work.
7. Record every Firestore read/write/delete, Storage operation, Cloud Function trigger, rate limit, and retry path.
8. Update this roadmap, `system-inventory/README.md`, the relevant feature docs, and `__docs__/changelog.md`.

---

## First Execution Target

The next end-to-end work should be the sellable-launch proof, not a new connector.

Checklist:

- Fresh account completes onboarding.
- Knowledge Intake accepts sources and creates review items.
- Product surfaces are mapped.
- Entity candidates and canonical drafts appear.
- Owner approves at least one canonical answer.
- Widget install is verified on a separate test client page.
- Widget receives safe page context.
- Feedback/fallback/ticket signals create reviewable proposals.
- Weekly digest/trust/coverage views read compact summaries.
- Activation shows `summary.launchProof` so first-client setup, knowledge, ontology, widget, governance-summary, and signal-source blockers are visible before connector rollout. Signal Queue still confirms generated proposal quality.
- Public API remains off unless specifically selected for that tenant.
- Jira/helpdesk native connectors remain out of scope.

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-06 | Added repeated reply import as the first SupportLayer-derived expansion item and documented the remaining follow-up sequence. |
| 2026-06-06 | Added Activation-backed first-client launch proof so setup, knowledge, ontology, widget, governance summaries, and signal-source blockers are visible before connector rollout. |
| 2026-07-19 | Corrected signal-quality truth: the reserved flag has no runtime, production uses transparent evidence counts, and scoring requires reviewed-proposal calibration before development. |
| 2026-07-20 | Audited native helpdesk/Jira connectors, confirmed zero runtime, and set a one-provider paying-demand, concierge-proof, permission, deletion, and cost gate before implementation. |
| 2026-07-20 | Audited autonomous browser/account actions, preserved Explain + Guide only, and added executable no-click/no-action-API/no-account-mutation boundaries. |
| 2026-06-06 | Rebuilt roadmap around current runtime truth and the first-client governed answer loop; added explicit Jira, helpdesk, Public API, distribution, white-label, and multi-language gates. |
| 2026-03-07 | Initial consolidated roadmap from internal docs, industry research, and codebase truth. |
| 2026-03-07 | Governance UI, signal quality, white-label, and multi-language implementation statuses recorded. |
