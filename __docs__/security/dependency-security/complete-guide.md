# Dependency Security

**Status:** Enforced  
**Last verified:** July 25, 2026  
**Scope:** Root Next.js app plus MenuList, Answerlattice, and SignalDesk Functions

## Authority

Exact declared versions and resolved lockfiles are the runtime authority. `npm run verify:dependency-freeze` rejects declaration/lock drift, and `npm run verify:answerlattice-security-audit` applies the maintained production-audit ceilings.

An audit count is not treated as proof that every finding is reachable, but no finding may be ignored. Each advisory must be removed, bounded by verified compensating controls, or blocked on a named upstream release. Never run `npm audit fix --force`: npm can propose unrelated framework downgrades that are less secure and break the supported runtime.

## Current root disposition

The July 25, 2026 root audit contains exactly one advisory family:

| Package reported | Severity | Parent | Disposition |
|---|---:|---|---|
| `postcss@8.4.31` | High | `next@16.2.11` | Upstream-only pending stable Next release |
| `next@16.2.11` | Moderate | Direct | Same PostCSS chain; not a separate defect |

This is two npm report entries for one dependency chain. There are zero critical and zero low findings. Both full and production-only audits report the same result.

Next 16.2.11 pins its private PostCSS dependency exactly. The repository root already pins patched `postcss@8.5.23`, but npm correctly reports Next's nested copy. Overriding Next's private pin, patching `node_modules`, installing a canary, or accepting npm's proposed Next 9 downgrade is prohibited. Before every release-readiness run, execute `npm view next dist-tags --json` and `npm view next@latest dependencies.postcss --json`. Remove this exception only after a stable Next release privately carries PostCSS 8.5.18 or newer, then regenerate the lockfile and rerun the full migration/build/runtime matrix.

Current exposure is bounded because first-party builds compile repository-controlled CSS only. No application route accepts owner/customer CSS and passes it to PostCSS, and there is no runtime PostCSS import under source, scripts, Functions, or internal packages. This is a compensating boundary, not a claim that the upstream advisory is resolved.

## Current Functions disposition

All three independent Cloud Functions package roots are clean:

| Package root | Full audit | Production audit | Clean install |
|---|---:|---:|---:|
| `functions/` | 0 vulnerabilities | 0 vulnerabilities | 507 packages audited |
| `functions-answerlattice/` | 0 vulnerabilities | 0 vulnerabilities | 253 packages audited |
| `functions-signaldesk/` | 0 vulnerabilities | 0 vulnerabilities | 250 packages audited |

All three `npm ls --all` trees have zero invalid, missing, or extraneous packages. These results were reproduced with Node 22.23.1 after deleting each installed tree through `npm ci`.

## Remediations completed

- Fabric moved from 5.3.0 to 7.4.0, removing the critical native `canvas` / `tar` / `node-pre-gyp` chain. The shared editor explicitly preserves left/top origins, Promise image/clone behavior, collection-owned stacking, coordinate-safe group/ungroup, filters, export, and async disposal.
- Firebase Admin moved from 12.7.0 to 14.2.0. Root namespace imports were replaced by `src/lib/firebase/firebaseAdminCompat.ts`, which exposes the narrow legacy-shaped surface through supported modular v14 entry points.
- `uuid@11.1.1` is a root security override for ExcelJS, Gaxios, and Teeny Request. ExcelJS buffer round-trip, CommonJS `v4`, UUID buffer output, and Firebase modular imports are regression-checked.
- MenuList Functions moved to Sentry 10.68.0, Firebase Admin 13.10.0, Nodemailer 9.0.3, and Razorpay 2.9.8. Answerlattice Functions moved to Firebase Admin 13.10.0, Firebase Functions 6.6.0, and Nodemailer 9.0.3. SignalDesk Functions moved to Firebase Admin 13.10.0 and Firebase Functions 6.6.0.
- Functions stay on Firebase Admin 13.10.0 because it removes the vulnerable UUID dependency while remaining inside the stable Firebase Functions 6.6 peer contract. Firebase Admin 14 requires Firebase Functions 7.3, which was still a release candidate on July 24, 2026. All three Functions initializers already use modular Admin entry points so a future stable paired upgrade will not require another namespace migration.
- All three Functions roots override transitive UUID to 11.1.1. The unused `firebase-functions-test` dependency was removed because no test imports it and its current release carries the vulnerable `ts-deepmerge` chain.
- Existing emulator compatibility is preserved through narrow modular `Timestamp`, `FieldValue`, and app-deletion adapters. Representative MenuList special-menu, Answerlattice Knowledge Intake summary, and SignalDesk proof-permission/source-data lifecycle emulator tests pass.
- The MenuList Functions lint command now uses flat-config-compatible `eslint .`; the deployment preflight again passes lint and strict build under Node 22.
- Next's optional Sharp is overridden to 0.35.3 and must be exercised through real Next image optimization during final runtime validation.
- Safe non-breaking audit updates moved YAML, WebSocket, minimatch, brace expansion, immutable, and diff to patched resolved versions.
- Root resolver pins for `@swc/helpers@0.5.23`, `picomatch@4.0.5`, `webpack@5.109.0`, and `ajv@8.20.0` keep the installed peer tree valid without `--force` or `--legacy-peer-deps`.
- Node 22 is the root runtime (`engines.node = 22`, `.nvmrc = 22.23.1`) because Firebase Admin 14 and the root/Functions toolchain share that long-term baseline.

A fresh `npm ci` installs 1,660 audited packages and reproduces the same two-entry Next/PostCSS result. `npm ls --all` exits successfully with no invalid or missing peers. On macOS, npm reports `@img/sharp-wasm32@0.35.3` and `@emnapi/runtime@1.11.2` as extraneous immediately after the clean install; these are Sharp's optional cross-platform WebAssembly artifacts and are not installed-tree drift.

## Required commands

Run with the pinned Node runtime:

```bash
npm run verify:dependency-freeze
npm run verify:answerlattice-security-audit
npm audit --omit=dev --json
npm audit --json
npm ls --all
npm run typecheck
npm run lint
npm --prefix functions ci
npm --prefix functions run build
npm --prefix functions-answerlattice ci
npm --prefix functions-answerlattice run build
npm --prefix functions-signaldesk ci
npm --prefix functions-signaldesk run build
```

For dependency migrations, also run the directly affected feature verifiers and both production builders. The Fabric migration requires `npm run verify:creative-editor-smoke` and CampaignCue runtime verification. Firebase Admin migration requires the shared product/server verifiers plus actual production-build module evaluation.

## Stop rules

Stop and investigate if any of these occurs:

- critical count is non-zero;
- a high or moderate package is not `postcss` or `next`;
- the accepted Next/PostCSS family grows above one high and one moderate entry;
- a direct `firebase-admin` root namespace import appears in the root app or any Functions source tree;
- any Functions full or production audit becomes non-zero;
- Fabric native canvas/tar packages reappear;
- a UUID override or the root Sharp override is removed;
- npm proposes a framework downgrade, canary, `--force`, or peer bypass;
- declaration, lockfile, and installed-tree versions disagree.

## Related evidence

- [Next.js runtime migration validation](../../nextjs-runtime-migration/nextjs-runtime-migration_validation.md)
- [Shared Creative Editor validation](../../shared-creative-editor/shared-creative-editor_validation.md)
- [Answerlattice final cross-cutting audit](../../answerlattice/system-inventory/answerlattice-final-cross-cutting-audit.md)
