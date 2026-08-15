# Dependency Security

**Status:** Enforced  
**Last verified:** August 11, 2026
**Scope:** Root Next.js app plus MenuList, Answerlattice, and SignalDesk Functions

## Authority

Exact declared versions and resolved lockfiles are the runtime authority. `npm run verify:dependency-freeze` rejects declaration/lock drift, and `npm run verify:answerlattice-security-audit` applies the maintained production-audit ceilings.

An audit count is not treated as proof that every finding is reachable, but no finding may be ignored. Each advisory must be removed, bounded by verified compensating controls, or blocked on a named upstream release. Never run `npm audit fix --force`: npm can propose unrelated framework downgrades that are less secure and break the supported runtime.

## Current root disposition

The August 11, 2026 root full and production-only audits contain zero vulnerabilities.

Stable Next 16.3.0 closed the former upstream exception by moving its private PostCSS dependency from 8.4.31 to patched 8.5.23. The repo upgraded `next`, `eslint-config-next`, and `@next/bundle-analyzer` together and retained the exact root `postcss@8.5.23` pin. No private override, `node_modules` patch, canary, preview, forced audit fix, or framework downgrade was used.

The same audit run exposed newer advisories outside the old Next chain. The existing compatible direct pin moved from `brace-expansion@1.1.16` to `1.1.18`; every modern Minimatch chain resolves `brace-expansion@5.0.9`; and AJV's compatible tooling chain resolves the exact direct `fast-uri@3.1.5` security pin. Both full and production audits are therefore zero rather than replacing one exception with another.

Three later transitive advisories were closed without changing their parent runtimes: root `js-yaml@4.3.0` moved to `4.3.1`, Next/PostCSS's `nanoid@3.3.16` moved to `3.3.17`, and the shared sanitizer dependency `dompurify@3.4.12` moved to `3.4.13`. Exact root overrides and lockfile assertions keep all three patched. MenuList Functions separately overrides its development-only ESLint YAML chain to `js-yaml@4.3.1`.

## Current Functions disposition

All three independent Cloud Functions package roots are clean:

| Package root | Full audit | Production audit | Clean install |
|---|---:|---:|---:|
| `functions/` | 0 vulnerabilities | 0 vulnerabilities | 514 packages audited |
| `functions-answerlattice/` | 0 vulnerabilities | 0 vulnerabilities | 253 packages audited |
| `functions-signaldesk/` | 0 vulnerabilities | 0 vulnerabilities | 250 packages audited |

All three `npm ls --all` trees have zero invalid, missing, or extraneous packages. These results were reproduced with Node 22.23.1 after deleting each installed tree through `npm ci`.

## Remediations completed

- Fabric moved from 5.3.0 to 7.4.0, removing the critical native `canvas` / `tar` / `node-pre-gyp` chain. The shared editor explicitly preserves left/top origins, Promise image/clone behavior, collection-owned stacking, coordinate-safe group/ungroup, filters, export, and async disposal.
- Firebase Admin moved from 12.7.0 to 14.2.0. Root namespace imports were replaced by `src/lib/firebase/firebaseAdminCompat.ts`, which exposes the narrow legacy-shaped surface through supported modular v14 entry points.
- `uuid@11.1.1` is a root security override for ExcelJS, Gaxios, and Teeny Request. ExcelJS buffer round-trip, CommonJS `v4`, UUID buffer output, and Firebase modular imports are regression-checked.
- MenuList Functions use Sentry 10.68.0, Firebase Admin 13.10.0, stable Firebase Functions 7.3.0, Nodemailer 9.0.3, and Razorpay 2.9.8. Answerlattice and SignalDesk Functions use Firebase Admin 13.10.0 with stable Firebase Functions 7.3.0; Answerlattice also pins Nodemailer 9.0.3.
- Functions stay on Firebase Admin 13.10.0 because it removes the vulnerable UUID dependency while remaining inside the stable Firebase Functions 7.3 peer contract. All three Functions initializers use modular Admin entry points.
- All three Functions roots override transitive UUID to 11.1.1. The unused `firebase-functions-test` dependency was removed because no test imports it and its current release carries the vulnerable `ts-deepmerge` chain.
- Existing emulator compatibility is preserved through narrow modular `Timestamp`, `FieldValue`, and app-deletion adapters. Representative MenuList special-menu, Answerlattice Knowledge Intake summary, and SignalDesk proof-permission/source-data lifecycle emulator tests pass.
- The MenuList Functions lint command now uses flat-config-compatible `eslint .`; the deployment preflight again passes lint and strict build under Node 22.
- Next's optional Sharp is overridden to 0.35.3 and must be exercised through real Next image optimization during final runtime validation.
- Safe non-breaking audit updates moved YAML, WebSocket, minimatch, brace expansion, fast-uri, immutable, and diff to patched resolved versions.
- MenuList Functions overrides its legacy ESLint/Minimatch chain to compatible `brace-expansion@1.1.18`, so development and production audits are both zero without changing the deployed Functions runtime graph.
- Root resolver pins for `@swc/helpers@0.5.23`, `picomatch@4.0.5`, `webpack@5.109.0`, and `ajv@8.20.0` keep the installed peer tree valid without `--force` or `--legacy-peer-deps`.
- Root transitive security overrides keep `js-yaml@4.3.1`, `nanoid@3.3.18`, and `dompurify@3.4.13` exact. The dependency-freeze verifier checks both the declarations and resolved lockfile nodes; MenuList Functions applies the same `js-yaml@4.3.1` control to its separate lint tree.
- Node 22 is the root runtime (`engines.node = 22`, `.nvmrc = 22.23.1`) because Firebase Admin 14 and the root/Functions toolchain share that long-term baseline.

The exact lockfile must reproduce zero root vulnerabilities after `npm ci`, and `npm ls --all` must exit successfully with no invalid or missing peers. On macOS, Sharp's optional cross-platform WebAssembly artifacts can appear as platform-specific installed-tree entries; confirm them against the clean lockfile rather than treating them as declaration drift.

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
- any root full or production audit count is non-zero;
- a direct `firebase-admin` root namespace import appears in the root app or any Functions source tree;
- any Functions full or production audit becomes non-zero;
- Fabric native canvas/tar packages reappear;
- a UUID override, a root brace-expansion/fast-uri/js-yaml/nanoid/DOMPurify control, a MenuList Functions brace-expansion/js-yaml control, or the root Sharp override is removed;
- npm proposes a framework downgrade, canary, `--force`, or peer bypass;
- declaration, lockfile, and installed-tree versions disagree.

## Related evidence

- [Next.js runtime migration validation](../../nextjs-runtime-migration/nextjs-runtime-migration_validation.md)
- [Shared Creative Editor validation](../../shared-creative-editor/shared-creative-editor_validation.md)
- [Answerlattice final cross-cutting audit](../../answerlattice/system-inventory/answerlattice-final-cross-cutting-audit.md)
