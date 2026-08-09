# Answerlattice Customer Language Contract

> Status: Active presentation-layer contract
> Last updated: 2026-08-07
> Audience: product, design, support, documentation, and engineering

## Purpose

Answerlattice keeps its precise governed-answer architecture while presenting owner work in language that a first-time founder, small team, or larger product group can understand without learning the internal data model.

This contract changes presentation, not product behavior. Internal routes, schemas, permissions, feature flags, event names, and stored fields do not change.

## Customer-Facing Labels

| Internal or previous label | Customer-facing label | Meaning for an owner |
| --- | --- | --- |
| Launch Setup | Get Live | Complete the minimum safe launch path |
| Support Control | Run Support | Handle current customer support work |
| Knowledge Governance | Answer Quality | Keep approved answers correct |
| Canonical Answers | Trusted Answers | Answers approved for customer use |
| Product Ontology | Product Topics | Features, plans, roles, workflows, states, integrations, and errors |
| Entity Health | Topic Coverage | Whether important product topics have usable answer coverage |
| Entity Candidates | Suggested Topics | Product topics found in approved sources and waiting for review |
| Drift Review | Answers to Recheck | Answers that may no longer match current product truth |
| Signal Queue | Suggested Updates | Review-ready improvements based on bounded support evidence |
| Product Surfaces | Product Pages & Flows | Pages and workflows connected to relevant support context |
| Readiness Metrics | Setup Status | What is ready and what needs attention |
| Install Center | Install Support | Give the product one safe customer-support installation |
| AI install packet | Coding-agent install | Exact repository instructions and acceptance checks for a coding agent |
| Advanced tools | All tools | Reveal the operator's other authorized workflows only when needed |

`Knowledge Map` remains its own name. It is a curated visual view of product knowledge and must not be conflated with Product Topics.

## Approval Language

- Use **Approve** for actions that establish or publish accountable support truth.
- Use **Trusted Answer** as the customer-facing noun.
- Do not replace approval with **Mark as trusted**; that wording hides the accountable publication decision.
- Use **Widget key** only for the embeddable widget credential. Public API credentials remain **API keys**.

## First-Use Model

Activation presents one compact support loop:

1. Add product knowledge.
2. Approve important answers.
3. Test as a customer.
4. Install support.
5. Return when attention is needed.

The existing four evidence-backed Activation groups remain the executable launch path. After launch, Daily Brief remains the default owner habit and should surface only bounded work that needs a decision.

## Progressive Disclosure

- Navigation, page headings, first-use descriptions, empty states, and primary actions use customer-facing language.
- Technical evidence remains available through explicit technical or advanced disclosures.
- Developer docs and internal architecture code continue using canonical answer, entity, ontology, drift, signal mutation, and product surface where those terms are technically exact.
- Advanced screens may explain the precise internal term after first stating the owner-readable meaning.

### Default navigation

- Get Live shows Activation, First 10 Answers, Install Support, and Setup Status first.
- Run Support shows Daily Brief and Ticket Inbox first.
- Answer Quality shows Trusted Answers first.
- All tools reveals the remaining authorized items in that group; Show fewer tools restores the compact list.
- The reveal is local presentation state. It is not saved to a user, workspace, or browser-storage record.
- Direct links, bookmarks, and existing routes continue to work. An active deeper tool remains visible while selected.
- Feature flags and permission checks run before hidden tools are counted or revealed.

## Guide And PDF Decision

The maintained web operating guide is the source of truth. It may be printed or exported to PDF from the same content, but a separate PPT or independently maintained PDF must not become another onboarding authority. Screenshots are supporting evidence only because they become stale as navigation changes.

## Firebase And AI Cost

No Firestore reads, writes, listeners, collections, indexes, Functions, Storage objects, or AI calls are added by this presentation layer. The Activation support loop is static UI, the renamed screens reuse their existing data paths, and All tools uses component-local state only.

## Mobile Contract

The same labels apply on desktop and mobile. The Activation support loop stacks vertically on smaller screens, preserves 44 px actions, and does not add a separate mobile route or data load. In the mobile drawer, All tools expands the current group without closing the drawer; selecting a destination then follows the existing navigation behavior.

## Verification

Run:

```bash
npm run verify:answerlattice-customer-language
```

The verifier protects the shared label registry, unchanged governance route keys, Activation support loop, main owner headings, architecture boundary, and zero-cost contract.
