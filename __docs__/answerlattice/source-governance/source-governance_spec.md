# Source Governance Specification

> Status: Implemented behind a controlled rollout flag
> Date: 2026-07-26
> Product: Answerlattice

## Executive Summary

Knowledge Intake already preserves source text, provenance, source IDs, and destination lineage. It does not currently record whether a source was reviewed, who owns it, how authoritative it is, who may see or cite it, when it applies, when it needs review, or which other source conflicts with it.

Source Governance fills that gap on the existing source document. A reviewer classifies evidence before using it to approve a canonical-answer proposal. The system records the decision and its audit history without treating tickets, old documents, or model confidence as truth.

## Goals

1. Make evidence authority and ownership explicit.
2. Record approval, access, and citation boundaries.
3. Record product, plan, role, region, and version applicability.
4. Record effective and review dates.
5. Link unresolved source conflicts reciprocally so neither side appears conflict-free.
6. Prevent a canonical proposal from being accepted while its linked evidence is unreviewed, excluded, superseded, or conflicted.
7. Preserve the current source, review, publishing, and canonical-governance architecture.

## Out Of Scope

- Automatic conflict detection.
- Automatic source precedence or winner selection.
- Changing canonical-first retrieval.
- Native helpdesk, Jira, Slack, or documentation connectors.
- Source deletion, retention, or synchronization.
- A generic policy engine or workflow builder.
- New AI calls, scheduled work, or source polling.
- Making Knowledge Intake sources directly retrievable as approved answers.

## User Stories

| User | Need | Outcome |
| --- | --- | --- |
| Founder | Mark current docs as approved evidence | The source can support a canonical proposal after review. |
| Founder | Mark an old sales PDF as superseded | It cannot quietly support a new canonical proposal. |
| Support lead | Record that a source applies only to Pro in the EU | Reviewers see the scope before approving an answer. |
| Support lead | Link a pricing page to a conflicting macro | The proposal remains held until the conflict is resolved. |
| Auditor | See who changed the source classification | The append-only audit log preserves previous and new state. |

## Source Authority Model

Authority is a semantic class selected by a reviewer. It is not a confidence score.

| Authority | Intended evidence |
| --- | --- |
| `owner_policy` | Owner-approved product settings or policy pack |
| `owner_confirmed_fact` | Confirmed pricing, legal, security, privacy, or terms fact |
| `official_documentation` | Current official documentation or help content |
| `official_release` | Current release note or changelog |
| `official_website` | Current owner-selected product website page |
| `product_surface` | Product route, workflow, or surface evidence |
| `approved_support_material` | Reviewed FAQ, macro, or support guidance |
| `support_signal` | Ticket, conversation, repeated reply, or feedback signal |
| `unverified_reference` | Old, incomplete, or not-yet-verified material |

Canonical answers remain above source evidence in runtime authority. Approval of evidence means it is suitable for review; it does not publish product truth.

## Governance Record

Each source may carry one additive `governance` object:

| Field | Requirement |
| --- | --- |
| `authority` | Required enum after review |
| `owner` | Optional bounded owner/team label |
| `approvalStatus` | `unreviewed`, `approved`, `excluded`, or `superseded` |
| `accessScope` | `public`, `workspace_private`, or `restricted` |
| `citationEligibility` | `public`, `internal_only`, or `not_citable` |
| `effectiveDate` | Optional `YYYY-MM-DD` |
| `reviewDate` | Optional `YYYY-MM-DD` |
| `applicability` | Bounded product, plan, role, region, and version lists |
| `conflictSourceIds` | Up to five reviewed source IDs from the same intake job; the server keeps the relation reciprocal |
| `notes` | Optional bounded reviewer note |
| `reviewedBy` | Server-owned actor label |
| `reviewedOn` | Server timestamp |

## Exact Flow

1. Owner imports a source through Knowledge Intake.
2. Source starts as unreviewed evidence.
3. Owner opens Source governance for that source.
4. Owner selects authority, approval, access, citation, applicability, dates, conflicts, and optional notes.
5. Server validates scope, job membership, conflict-source membership, prior review, and permissions.
6. One transaction updates the source, adds or removes reciprocal links on affected peers, and appends one audit event.
7. The response carries compact governance patches for every affected source so the loaded bundle stays exact without a collection reread.
8. Review cards show source governance next to the excerpt.
9. A canonical proposal can be accepted only when every linked source is approved and has no unresolved conflict links.
10. Publishing still creates a mutation proposal; canonical truth still requires Governance approval.

## Security And Privacy

- `withAuth()` and `MANAGE_KNOWLEDGE` are required.
- Tenant and workspace identity come from the Answerlattice access context.
- Active license is required.
- Request bodies are bounded and Zod validated.
- Source and conflict IDs use the existing document-ID boundary.
- Conflict sources must share `pId`, `tId`, `sId`, and `jobId`.
- A source must be reviewed before another source can link it as a conflict.
- Reciprocal add/remove writes commit in the same transaction as the edited source and audit.
- Firestore browser writes remain denied.
- Notes and labels are bounded; no raw source content is copied into the audit event.

## Success Measures

- Percentage of canonical intake proposals whose evidence is reviewed.
- Number of proposals blocked by unreviewed or conflicted evidence.
- Median time from source import to evidence review.
- Percentage of approved evidence with an owner and review date.
- Human correction rate after source-governance review.

## Risks

| Risk | Control |
| --- | --- |
| Reviewer treats evidence approval as canonical truth | UI and help text state that canonical publication remains separate. |
| Authority labels become a false automatic ranking | No automatic resolver or runtime ranking is added. |
| Old sources lack governance | Missing governance is read as unreviewed; no migration scan is required. |
| Conflict links point across tenants or jobs | Server validates every linked source in the transaction. |
| One-sided conflict makes the other source look safe | Server maintains reciprocal links and the emulator proves either side blocks canonical evidence. |
| Extra Firestore cost | Common saves use 2-7 transaction reads/writes. Replacing five previous conflicts with five new conflicts is bounded at 12 reads and 12 writes; canonical acceptance/publication rereads up to five linked evidence sources. |

## External Advice Adjustment

The competitor brief correctly identifies source precedence and conflict handling as strategic. Answerlattice should not copy broad asynchronous action execution or connector catalogs. Current code already covers answer versioning, release drift, dependency impact, and Answer Tests. The missing implementable contract is source-level governance inside Knowledge Intake.

## Doctrine Check

No new doctrine is required. This feature directly implements the existing rule that knowledge is the spine, canonical truth remains human governed, and AI confidence never outranks source authority.
