# Source Governance Validation

> Result: Locally verified; controlled rollout remains disabled
> Date: 2026-07-26

## Verified Scope

- Typed authority, approval, access, citation, applicability, date, conflict, and reviewer fields.
- Strict request and persisted-document parsing.
- Server-owned, tenant-scoped, idempotent transaction with reciprocal conflict add/remove.
- Append-only compact audit history without source-content copying.
- Canonical acceptance and publication checks for approved, conflict-free evidence.
- Responsive Knowledge Intake review surface and compact multi-source bundle reconciliation.
- Existing dedicated and shared Firestore browser-write denial.
- Firebase cost and rollback documentation.

## Code Evidence

| Contract | Evidence |
| --- | --- |
| Source enums and additive source field | `src/types/answerlattice/index.ts:1922`, `src/types/answerlattice/index.ts:2084` |
| Strict request and stored schemas | `src/lib/answerlattice/knowledgeIntakeContracts.ts:57` |
| Transaction, reciprocal conflict invariant, scope validation, idempotency, and audit | `src/lib/answerlattice/knowledgeIntake.ts:868` |
| Acceptance recheck | `src/lib/answerlattice/knowledgeIntake.ts:1523` |
| Publication recheck | `src/lib/answerlattice/knowledgeIntake.ts:2478` |
| Authenticated and bounded API route | `src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/sources/[sourceId]/governance/route.ts:31` |
| Exact client response and reciprocal local reconciliation | `src/hooks/answerlattice/useKnowledgeIntake.ts:354` |
| Source review UI | `src/components/templates/answerlattice/knowledgeIntake/AnswerlatticeKnowledgeIntake.tsx:871` |
| Controlled rollout flag | `src/config/features.ts:2675` |
| Persistent forensic gate | `package.json:187` |

## Commands

| Command | Result |
| --- | --- |
| `npm run test:answerlattice-knowledge-intake-contracts` | Passed |
| `npm run test:answerlattice-source-governance` | Passed |
| `npm run test:answerlattice-knowledge-intake:rules` | Passed |
| `npm run test:answerlattice-knowledge-intake:shared-rules` | Passed |
| `node scripts/verification/verify-answerlattice-runtime-truth.js` | Passed |
| `npx eslint` on all changed Source Governance TypeScript files | Passed |
| `npx tsc --noEmit --incremental false` | Passed |
| `npm run lint` | Passed with zero warnings on the current worktree |
| `npm run docs:check-links` | Passed with zero broken links; 62 unrelated existing filename warnings remain |
| `npm run verify:dependency-freeze` | Passed on the current worktree after the governed Gemini migration and lineage-specific brace-expansion resolution were reconciled |

The emulator emitted the expected missing Gemini-key warning. Source Governance
does not call AI, and the test completed successfully without an AI key.

The current-worktree cross-check initially exposed two unrelated concurrent
package-contract failures: the governed Gemini migration had not yet updated
the freeze verifier, and legacy `minimatch` briefly resolved an incompatible
`brace-expansion` module shape. The active migration work reconciled the Gemini
freeze and final dependency graph: `minimatch` 3 uses `brace-expansion` 1.1.16,
while `minimatch` 10 uses patched 5.0.8. Exact TypeScript, focused lint, full
lint, dependency freeze, and the repository security audit pass on the
resulting worktree.

## Behavior Proven

The focused emulator proves:

1. The feature flag fails closed.
2. Unreviewed evidence blocks canonical acceptance.
3. Conflict links cannot cross intake jobs.
4. Public citations require public source access.
5. Excluded or superseded evidence cannot remain citable.
6. Review dates cannot precede effective dates.
7. A source cannot conflict with itself.
8. A valid update creates one source update and one compact audit event.
9. An identical request replay does not create another audit event.
10. Reusing a request ID with a changed payload is rejected.
11. Approved, conflict-free evidence permits the existing acceptance flow.
12. A later conflict blocks publication and creates no mutation proposal.
13. An unreviewed peer cannot be linked as a conflict.
14. Adding a conflict writes the reciprocal link in the same transaction.
15. A proposal using only the other source is still blocked.
16. Resolving a conflict clears both links and allows evidence review to proceed.
17. A reciprocal peer at the five-conflict cap rejects with no partial mutation.
18. An idempotent retry replays both committed source patches without another audit write.

The maintained runtime source verifier additionally gates the browser contract:

19. The browser reuses one request ID for an unchanged failed payload, rejects stale response settlement, clears only the matching success, and caps pending state at 20 attempts.
20. The browser rejects excessive, duplicate, malformed, or target-divergent governance patches.

## Deployment Decision

No Firestore rules, indexes, Storage rules, Firebase Functions, or public website
runtime changed. Therefore no Firebase deployment or Vercel deployment was run.

`ENABLE_ANSWERLATTICE_SOURCE_GOVERNANCE` remains `false`. Enable it only after:

1. authenticated desktop and narrow-viewport browser validation;
2. one real SaaS workspace reviews a bounded set of source evidence;
3. review burden and blocked-proposal behavior are measured;
4. the founder explicitly accepts the rollout.

No build was run. The maintained type, lint, contract, emulator, rules, and
dependency-freeze gates are the local source validation for this change.

## Market Brief Cross-Check

Official sources checked on 2026-07-26 confirm the strategic direction:

- Intercom announced Wait for Webhook inside Fin Procedures on 2026-07-24,
  including pause/resume and timeout escalation:
  `https://www.intercom.com/changes/en/152263-let-fin-wait-for-external-systems-before-continuing`.
- Intercom had already documented a Workflow-level Wait for Webhook on
  2026-01-07. The July change is Procedure integration, not the first existence
  of webhook waiting:
  `https://www.intercom.com/help/en/articles/10714075-use-wait-for-webhook-in-workflows`.
- Zendesk announced step-level Action Builder error handling on 2026-07-24,
  with rollout from 2026-07-15 through 2026-08-10:
  `https://support.zendesk.com/hc/en-us/sections/4405298833818-Announcements`.
- Zendesk announced Freshdesk as an external knowledge source on 2026-07-22:
  `https://support.zendesk.com/hc/en-us/articles/11041311584666-Announcing-Freshdesk-as-an-external-content-source-for-use-across-knowledge-experiences`.
- Intercom announced its opt-in Modern Help Center on 2026-07-23:
  `https://www.intercom.com/changes/en/152189-a-faster-modern-design-for-your-help-center`.

These changes support Source Governance as the bounded Answerlattice response.
They do not justify a generic workflow builder, broad connector catalog, or
help-center theme system.
