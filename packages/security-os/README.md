# Security Operating System Package

SecurityOS is the repository-local security evidence and audit-orchestration contract for the Neelvara product portfolio. It maps existing source boundaries, policies, verifiers, and local emulator tests without introducing a new scanner.

## Boundary

- Internal-only; no public route, owner UI, customer UI, or public marketing.
- Read-only registry audit; no source patching, deployments, or production access.
- No OpenAI, Firebase, or third-party scanner SDK integration.
- No repository upload, credentials, live exploitation, or automatic finding publication.
- Findings and reproductions belong outside the Git worktree or in `packages/security-os/private/`, which tracks only its `.gitignore`.

SecurityOS may read product code, docs, rules, and verifier metadata. It must not write product data or claim that a registered verifier has passed when it has not been executed in the current review.

## Phase-One Products

MenuList and Answerlattice receive the first detailed surface map. MyCodex now has a focused partial map for its private founder-console and persisted platform-role boundary. CampaignCue, SignalDesk, and Neelvara remain registered with explicit incomplete status so they cannot be silently treated as audited.

## Source of Truth

- `products/security-profiles.ts` — current product scope and exclusions.
- `manifest/security-surfaces.json` — security surfaces and current evidence state.
- `evidence/verifier-evidence.json` — approved repo-native evidence commands and manually selectable evidence bundles.
- `schemas/security-os-schema.ts` — registry contract.
- `scripts/audit-security-os.ts` — local registry-integrity audit.
- `scripts/plan-security-os.ts` — read-only grouped evidence planner; it never executes evidence.
- `/SECURITY.md` — repository-wide safe audit and reporting policy.
- `/__docs__/security/security-operating-system/` — governed feature documentation.

## Commands

```bash
npm run security-os:audit
npm run security-os:audit -- --product menulist
npm run security-os:plan
npm run security-os:plan -- --product menulist
npm run security-os:plan -- --bundle menulist.identity-and-tenant
npm run verify:security-os
```

The audit validates the registry. The planner groups related evidence for manual selection and prints each command's execution and network policy. Neither command executes mapped security evidence. Run only the smallest relevant command, review the output, and record a current result before making a security claim.

## Grouped Evidence Bundles

The registry currently provides seven bundles: repository baseline and configuration, two MenuList groups, one Answerlattice group, registered-only groups for CampaignCue and SignalDesk, and a focused MyCodex boundary group. Every bundle uses `manual-selective`; a bundle is a navigation layer, not an executable suite. Neelvara remains an explicit unknown until focused repo-native evidence exists.

## External Tool Rule

An external scanner may be evaluated later only through an explicit dependency, license, data-flow, cost, credential, retention, and false-positive review. It remains additive to this contract and cannot replace product-specific security rules or human approval.
