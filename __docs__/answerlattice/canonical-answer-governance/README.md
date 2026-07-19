# Canonical Answer Governance

**Status:** Implemented and locally verified on July 18, 2026  
**Feature audit:** Feature 1 of 44  
**Product role:** Governed canonical truth for Answerlattice retrieval and support surfaces

Canonical answers are persistent, tenant-scoped, entity-bound, version-aware support assets. Owners and governance reviewers do not write canonical truth directly. Create and update requests become mutation proposals, and the server-owned governance transaction applies an answer only after approval.

## Maintained documents

- [Specification](./canonical-answer-governance_spec.md)
- [Implementation](./canonical-answer-governance_impl.md)
- [Firebase and cost](./canonical-answer-governance_firebase.md)
- [Mobile support](./canonical-answer-governance_mobile-support.md)
- [Help guidance](./canonical-answer-governance_helpdoc.md)
- [Marketing boundary](./canonical-answer-governance_marketing.md)
- [Website boundary](./canonical-answer-governance_website.md)
- [Test cases](./canonical-answer-governance_test-cases.md)

## Current source evidence

- Owner editor and applicability controls: `src/components/templates/answerlattice/governance/CanonicalAnswerEditor.tsx:763`
- Proposal-only owner DAL: `src/database/answerlattice/canonicalAnswers.ts:170`
- Authenticated governance route: `src/app/api/answerlattice/governance/actions/route.ts:26`
- Server transaction and revision protection: `src/lib/answerlattice/governanceServer.ts:177`
- Browser write denial: `firestore-answerlattice.rules:45`
- Version history: `src/components/templates/answerlattice/governance/AnswerVersionHistory.tsx:40`
- Emulator behavior proof: `scripts/verification/test-answerlattice-governance-emulator.ts:1`

Hosted authenticated-browser and deployed-environment smoke evidence remains external proof. No Firestore rules, indexes, or Cloud Functions changed in the July 18 hardening pass, so no Firebase deployment was required.
