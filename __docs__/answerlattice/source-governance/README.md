# Answerlattice Source Governance

> Status: Implemented behind a controlled rollout flag
> Last updated: 2026-07-26

Source Governance extends the existing Knowledge Intake source record with owner-reviewed authority, approval, access, citation, applicability, freshness, and conflict metadata.

The feature does not make imported material authoritative. It helps a reviewer decide whether a source is suitable evidence before a canonical-answer proposal can be accepted.

## Product Boundary

- Reuses `answerlattice_knowledgeSources`; no new source collection.
- Reuses Knowledge Intake `MANAGE_KNOWLEDGE` permission and active-license checks.
- Browser writes remain denied by Firestore rules.
- Every governance mutation is server-owned and audit logged.
- Source authority is selected by a human and never inferred from model confidence.
- Conflict links are reciprocal and hold either source out of canonical evidence until a reviewer resolves the disagreement; Answerlattice does not silently select a winner.
- No crawler, connector, scheduler, AI call, retention change, or runtime retrieval branch is added.

## Documents

- [Specification](source-governance_spec.md)
- [Implementation](source-governance_impl.md)
- [Marketing](source-governance_marketing.md)
- [Website](source-governance_website.md)
- [Help](source-governance_helpdoc.md)
- [Firebase cost](source-governance_firebase.md)
- [Mobile support](source-governance_mobile-support.md)
- [Test cases](source-governance_test-cases.md)
- [Validation](source-governance_validation.md)

## Related Contracts

- [Knowledge Intake Command Center](../knowledge-intake-command-center/README.md)
- [Canonical Answer Governance](../canonical-answer-governance/README.md)
- [Drift Governance](../drift-governance/README.md)
- [Core Doctrine](../doctrine/01-core-doctrine.md)
