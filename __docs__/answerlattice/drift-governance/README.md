# Drift Governance

**Status:** Implemented and locally verified on July 18, 2026  
**Feature audit:** Feature 10 of 44  
**Product role:** Detect probable canonical-answer drift and require governed human revalidation

Answerlattice drift governance identifies approved answers that may no longer be safe to serve because product versions, support evidence, answer scopes, or bound entities changed. Automated evaluation can add review reasons and require review; it cannot clear drift, edit answer content, or establish that an answer is correct. A reviewer must inspect the current answer, scope, product version, and supporting evidence before revalidation.

## Maintained documents

- [Specification](./drift-governance_spec.md)
- [Implementation](./drift-governance_impl.md)
- [Firebase and cost](./drift-governance_firebase.md)
- [Mobile support](./drift-governance_mobile-support.md)
- [Help guidance](./drift-governance_helpdoc.md)
- [Marketing boundary](./drift-governance_marketing.md)
- [Website boundary](./drift-governance_website.md)
- [Test cases](./drift-governance_test-cases.md)

## Current source evidence

- Frozen four-class policy and thresholds: `src/data/shared/answerlatticeDrift.ts:1`
- Server-owned manual evaluation: `src/lib/answerlattice/governanceServer.ts:1207`
- Browser evaluation request only: `src/database/answerlattice/canonicalAnswers.ts:216`
- Human review and attestation: `src/components/templates/answerlattice/governance/DriftDashboard.tsx:364`
- Release-version drift: `src/lib/answerlattice/releaseServer.ts:298`
- Nightly evaluation and bounded writes: `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts:514`
- Shared policy verifier: `scripts/verification/test-answerlattice-drift-state.ts:1`

The July 18 hardening changed the dedicated `answerlatticeNightly` Cloud Function. The narrow `answerlattice-qa` deployment was attempted and stopped before upload with `Error: Failed to authenticate, have you run firebase login?`. Authenticated deploy, hosted UI, and scheduled-run readback remain external evidence and are not part of local source completion.
