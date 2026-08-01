# Security Operating System - Test Cases

> Version: 1.1
> Date: July 29, 2026

## Registry Integrity

1. All product profile IDs are unique.
2. Product profiles exactly match the Phase-one product registry.
3. All surface IDs are unique.
4. All evidence IDs are unique.
5. All bundle IDs are unique and bundle evidence IDs do not repeat.
6. Every source and evidence path exists.
7. Every evidence npm command exists.
8. Mapped/partial surfaces have direct evidence or a bundle.
9. Product-scoped evidence and bundles agree with the referenced surface.
10. Bundle evidence agrees with the bundle product scope.
11. Unknown product and bundle filters fail.
12. Unknown or extra manifest/evidence fields fail strict runtime validation.
13. Impossible calendar dates fail.
14. Nested npm commands that launch Firebase emulators require emulator execution and local-emulator network declarations.
15. Evidence that invokes `npm audit` declares read-only package-registry access.

## Boundary

1. Internal-only is true.
2. Public runtime and public marketing are false.
3. Firebase operations and production writes are false.
4. External code upload is false.
5. Automatic fixes and deployments are false.
6. Package code has no external scanner SDK, credential, HTTP, Firebase SDK, or child-command integration.
7. Bundle planner package code has no command-execution primitive.
8. Private finding paths ignore all content except `.gitignore`.
9. Root policy prohibits unauthorized and live production testing.

## Truthfulness

1. Initial verification status is `not-run`.
2. Registry audit does not change verification status.
3. `mapped` is documented as evidence discovery, not pass.
4. Partial/registered/unknown surfaces produce warnings.
5. Registered-only products are not described as audited.
6. A failing evidence command is not automatically labeled exploitable.
7. Listing or printing a bundle does not execute evidence or alter verification state.

## Product Separation

1. MenuList evidence does not prove Answerlattice behavior.
2. Answerlattice evidence does not prove MenuList behavior.
3. CampaignCue, SignalDesk, MyCodex, and Neelvara remain incomplete in Phase one.
4. MyCodex receives no Firebase scope.
5. Answerlattice audit work cannot publish canonical answers or knowledge.

## Verification Commands

```bash
npm run verify:security-os
npm run security-os:plan
npm run security-os:plan -- --bundle menulist.identity-and-tenant
npm run typecheck
npm run lint
```

No production build, Firebase deploy, Vercel deploy, external scan, or production smoke test is required for this internal registry change.
