# Security Operating System

> Status: Version 1.1 implemented
> Scope: internal repository security evidence and audit orchestration
> Last reviewed: July 29, 2026

SecurityOS is the portfolio-wide internal contract for answering three questions:

1. Which security surfaces exist for each product?
2. What repo-native evidence already checks them?
3. Which conclusions are mapped, incomplete, not run, or confirmed?

It follows the useful operating shape of Website Asset Operating System: governed manifests, product boundaries, local commands, and reusable agent guidance. It does not create a public security product, copy an external scanner, or replace product-specific implementation rules.

## Current Outcome

- MenuList and Answerlattice have detailed surface maps and grouped evidence-selection paths.
- CampaignCue, SignalDesk, and MyCodex have registered-only bundles; Neelvara remains explicitly unknown rather than being claimed as audited.
- 39 existing policies, verifiers, and local emulator tests are mapped into 7 manually selectable bundles.
- `npm run security-os:audit` validates registry integrity without executing every mapped check.
- `npm run security-os:plan` lists bundles and prints a selected bundle's execution/network policies without executing evidence.
- `npm run verify:security-os` verifies the package, docs, skill, feature flag, and prohibited-integration boundary.
- Raw findings are excluded from Git and require private handling.

## Truth Model

| Field | Meaning |
| --- | --- |
| `coverageStatus: mapped` | A relevant existing evidence command is registered. It has not necessarily run. |
| `coverageStatus: partial` | Useful evidence exists, but it does not cover the entire surface. |
| `coverageStatus: registered` | Product/surface is visible for later review; Phase one claims no audit completion. |
| `coverageStatus: unknown` | A real gap is recorded without invented coverage. |
| `verificationStatus: not-run` | No current passing claim is allowed. |
| `verificationStatus: passed` | The mapped command ran successfully and its output was manually reviewed in the relevant worktree. |
| `selectionMode: manual-selective` | A bundle helps choose evidence; it is never an executable suite. |

The registry audit leaves all initial surfaces at `not-run`. A valid registry is not a vulnerability-free result.

## Boundaries

- Internal only: no route, website, owner/customer UI, Firebase data model, or provider service.
- Local-first: no source upload, external account, API key, cloud scan, or network probing.
- Read-only by default: no auto-fix, commit, merge, deployment, production mutation, or public disclosure.
- Product-separated: evidence for one product never proves another product.
- Evidence-backed: severity requires an owned target, violated trust boundary, safe proof, and realistic impact.

## Entry Points

- Package: `packages/security-os/README.md`
- Surface registry: `packages/security-os/manifest/security-surfaces.json`
- Evidence map: `packages/security-os/evidence/verifier-evidence.json`
- Product profiles: `packages/security-os/products/security-profiles.ts`
- External provenance review: `packages/security-os/provenance/external-tool-review.md`
- Repo security policy: `SECURITY.md`
- Agent skill: `.agents/skills/security-os/SKILL.md`

## Commands

```bash
npm run security-os:audit
npm run security-os:audit -- --product answerlattice
npm run security-os:plan
npm run security-os:plan -- --product answerlattice
npm run security-os:plan -- --bundle answerlattice.authority-and-ingress
npm run verify:security-os
```

Then select only the smallest relevant evidence command from the printed plan or map. Do not run an entire bundle or the whole portfolio matrix merely to produce a reassuring number.

## External Source and Legal Position

The Phase-one implementation is original repository code. It borrows operating ideas, not source, rules, or branding. OpenAI Codex Security and several established tools were reviewed as references; none was installed, invoked, copied, bundled, or offered as a product.

The reviewed OpenAI repository is Apache-2.0, but its authentication/service access is a separate operational dependency. Future reuse of any upstream source must preserve the exact license and applicable notices, mark modifications, respect trademark limits, and pass a fresh legal/provenance review. See `packages/security-os/provenance/external-tool-review.md`.

## Documentation

- [Specification](security-operating-system_spec.md)
- [Implementation](security-operating-system_impl.md)
- [Internal positioning](security-operating-system_marketing.md)
- [Website boundary](security-operating-system_website.md)
- [Operator guide](security-operating-system_helpdoc.md)
- [Firebase cost](security-operating-system_firebase.md)
- [Mobile assessment](security-operating-system_mobile-support.md)
- [Test cases](security-operating-system_test-cases.md)
- [Validation](security-operating-system_validation.md)
