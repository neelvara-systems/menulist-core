# Security Operating System - Internal Operator Guide

> Audience: authorized repository owner or maintainer

## Quick Audit

1. From the repository root, run:

   ```bash
   npm run security-os:audit
   ```

2. Confirm the audit reports zero errors.
3. Read every warning. Warnings identify incomplete product/surface coverage.
4. Do not interpret `Registry integrity passed` as a security pass.

## Review One Product

1. Run the registry audit with the full product slug:

   ```bash
   npm run security-os:audit -- --product menulist
   ```

2. List the product's evidence groups:

   ```bash
   npm run security-os:plan -- --product menulist
   ```

3. Print one relevant group:

   ```bash
   npm run security-os:plan -- --bundle menulist.identity-and-tenant
   ```

4. Open `packages/security-os/manifest/security-surfaces.json` and confirm the relevant product surface.
5. Confirm the chosen evidence command's execution and network policy in the printed plan.
6. Run only the smallest relevant command. Do not run the full bundle by default.
7. Review the output manually.
8. Report command, worktree, result, gaps, and external blockers separately.

## Handle a Possible Finding

1. Confirm the target is owned and authorized.
2. Identify the exact violated trust boundary.
3. Reproduce it safely without production/customer data.
4. Remove secrets and unrelated source from the artifact.
5. Store raw details outside Git.
6. Distinguish confirmed impact from a suspicious pattern.
7. Share privately with repository owners.
8. Propose a patch only after the owner accepts the finding and scope.

## Common Mistakes

### The audit passes, so are all products secure?

No. It only proves that the registry is internally consistent.

### Can SecurityOS run every command automatically?

No. Bundles are manual selection aids, and commands have different cost, emulator, network, and scope requirements. The planner only prints evidence metadata.

### Can an external scanner be installed now?

No. It first needs the adoption gate in `packages/security-os/provenance/external-tool-review.md`.

### Where do raw findings go?

Prefer a protected location outside the Git worktree. The gitignored `packages/security-os/private/` directory is a short-lived local fallback, not an access-control system.
