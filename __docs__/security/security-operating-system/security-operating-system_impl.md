# Security Operating System - Implementation

> Version: 1.1
> Status: Implemented
> Date: July 29, 2026

## Architecture

```text
root SECURITY.md
        |
        v
product profiles --> security surfaces --> grouped evidence bundles
        |                    |                     |
        +--------------------+---------------------+
                             |
                             v
                    strict evidence map
                      /             \
                     v               v
          local registry audit   read-only planner
                                      |
                                      v
                       manually selected evidence command
```

The registry audit and planner only read files. The audit validates contracts; the planner resolves a bundle to evidence metadata. Neither spawns evidence commands.

## Components

| Component | Responsibility |
| --- | --- |
| `packages/security-os/schemas/security-os-schema.ts` | Typed and strict runtime-validated registry contract |
| `packages/security-os/products/security-profiles.ts` | Portfolio scope and exclusions |
| `packages/security-os/manifest/security-surfaces.json` | Surface registry, direct evidence references, bundle references, and evidence state |
| `packages/security-os/evidence/verifier-evidence.json` | Approved existing evidence commands and seven manual-selection bundles |
| `packages/security-os/scripts/lib/security-os-audit.ts` | Pure validation logic and prohibited-token checks |
| `packages/security-os/scripts/audit-security-os.ts` | Human-readable CLI output |
| `packages/security-os/scripts/lib/security-os-plan.ts` | Pure bundle lookup and evidence-plan projection |
| `packages/security-os/scripts/plan-security-os.ts` | Human-readable plan-only CLI output |
| `scripts/verification/verify-security-os.js` | Repo source-contract verifier |
| `.agents/skills/security-os/SKILL.md` | Reusable authorized-agent workflow |
| `SECURITY.md` | Root assessment, artifact, validation, and reporting policy |

## Audit Checks

The audit validates:

- exact internal-only boundary flags;
- strict manifest/evidence JSON shapes, real calendar dates, and unique IDs;
- complete product profile coverage;
- source and evidence path existence;
- npm evidence command existence and nested command resolution;
- declared emulator/package-registry network policy matching known command behavior;
- product/evidence/bundle agreement;
- unique bundle IDs and evidence membership;
- direct evidence or a bundle required for mapped and partial surfaces;
- explicit warnings for partial, registered, and unknown surfaces;
- enabled internal feature flag;
- absence of external scanner SDK, credentials, HTTP client, Firebase SDK, and child-process integration from Phase-one package code.

## Command Contract

```bash
npm run security-os:audit
npm run security-os:audit -- --product menulist
npm run security-os:plan
npm run security-os:plan -- --product menulist
npm run security-os:plan -- --bundle menulist.data-and-trust-boundaries
npm run verify:security-os
```

The audit product flag validates the whole registry while rejecting unknown product names. The planner product flag filters bundles; the bundle flag prints the exact evidence command, execution mode, and network policy. The planner contains no execution primitive. SecurityOS does not persist run results because a durable pass needs review time, worktree identity, command identity, and controlled artifact retention.

## Existing Evidence Reuse

The evidence map points to existing scripts rather than duplicating their security assertions. The seven grouped bundles help an operator choose among them without registering or running a separate SecurityOS wrapper for every command. Examples include:

- MenuList API tenant safety;
- authentication failure behavior;
- tenant/store Firestore rules;
- Storage path hardening;
- MenuList input, file, server-network-target, webhook, security-event, and POS-secret boundaries;
- Answerlattice repository security audit;
- Answerlattice Storage, governance, public API, intake, integration, billing, chat-session, release, and ontology emulator tests;
- product-separated MenuList, Answerlattice, and SignalDesk Gemini spend-window deny-rule emulator tests;
- dependency-freeze validation.

Registered-only products retain their own evidence commands without receiving a false completion status. Neelvara remains unknown.

## External Tool Boundary

The implementation contains no `@openai/codex-security` dependency and no copied upstream source. OSV-Scanner, Gitleaks, CodeQL, Semgrep, Trivy, and OWASP ASVS remain provenance-recorded candidates or references only.

## Change Procedure

1. Confirm the product and security surface.
2. Add or update the product profile.
3. Add evidence only when its path, npm command, execution mode, and data boundary are known.
4. Add evidence to the smallest product-compatible bundle; keep every bundle `manual-selective`.
5. Keep coverage and verification states distinct.
6. Update docs and skill when the operating rule changes.
7. Run the focused source verifier, registry audit, typecheck, and lint.
8. Do not deploy; SecurityOS has no runtime target.
