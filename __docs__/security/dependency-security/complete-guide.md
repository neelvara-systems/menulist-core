# Dependency Security

**Status:** Enforced  
**Last verified:** September 4, 2026
**Scope:** Root Next.js app plus MenuList, Answerlattice, and SignalDesk Functions

## Authority

Exact declared versions and resolved lockfiles are the runtime authority. `npm run verify:dependency-freeze` rejects declaration/lock drift, and `npm run verify:answerlattice-security-audit` applies the maintained production-audit ceilings.

An audit count is not treated as proof that every finding is reachable, but no finding may be ignored. Each advisory must be removed, bounded by verified compensating controls, or blocked on a named upstream release. Never run `npm audit fix --force`: npm can propose unrelated framework downgrades that are less secure and break the supported runtime.

## Current root disposition

The September 4, 2026 root full and production-only audits contain no critical, high, or low findings. Both report exactly two moderate package entries (`@tiptap/core` and its direct parent `@tiptap/starter-kit`) for the same `GHSA-cp6q-959q-f8rh` advisory. The maintained audit gate accepts only those two exact entries and fails closed if their identity, severity, count, or parent relationship changes.

Stable Next 16.3.4 closes the August 2026 image-optimization RCE while retaining patched PostCSS 8.5.23. The repo upgraded `next`, `eslint-config-next`, and `@next/bundle-analyzer` together and retained the exact root `postcss@8.5.23` pin. No private override, `node_modules` patch, canary, preview, forced audit fix, or framework downgrade was used.

The same audit run exposed newer advisories outside the old Next chain. Exact compatible controls now resolve `browserslist@4.28.9`, `fflate@0.8.3`, direct `fast-uri@3.1.7`, and `postcss-selector-parser@6.1.3`; the existing `brace-expansion@1.1.18` and modern `brace-expansion@5.0.9` controls remain. These changes removed every compatible root advisory without downgrading Serwist or changing document-generation behavior.

Tiptap's direct packages remain pinned at 2.11.0, while the frozen lockfile resolves `@tiptap/core` and several internal extensions to 2.26.1. Its advisory requires an untrusted attribute object to enter `mergeAttributes()`. Standard fixed ProseMirror schemas discard unknown document attributes, but the repository's custom image renderer was still the one application-owned merge boundary. It now sanitizes each own key before the Tiptap v2 merge, explicitly rejects `__proto__`, preserves class/style semantics, and has a hostile JSON regression test. A Tiptap 3 upgrade remains a separate migration because it changes table packages, menu imports/positioning, StarterKit contents, and `setContent` signatures; it must not be smuggled into a framework security patch without editor and browser evidence.

Three later transitive advisories were closed without changing their parent runtimes: root `js-yaml@4.3.0` moved to `4.3.1`, Next/PostCSS's `nanoid@3.3.16` moved to `3.3.18`, and the shared sanitizer dependency `dompurify@3.4.12` moved to `3.4.13`. Exact root overrides and lockfile assertions keep all three patched. MenuList Functions separately overrides its development-only ESLint YAML chain to `js-yaml@4.3.1`.

## Current Functions disposition

All three independent Cloud Functions package roots are clean:

| Package root | Full audit | Production audit | Prior clean-install evidence |
|---|---:|---:|---:|
| `functions/` | 0 vulnerabilities | 0 vulnerabilities | 514 packages audited |
| `functions-answerlattice/` | 0 vulnerabilities | 0 vulnerabilities | 253 packages audited |
| `functions-signaldesk/` | 0 vulnerabilities | 0 vulnerabilities | 250 packages audited |

All three current `npm ls --all` trees exit successfully with no invalid or missing dependency. The package counts above are retained from the earlier Node 22.23.1 clean-install evidence; the September patch updated the deterministic lockfiles and installed trees without rerunning destructive clean installs in the concurrent worktree.

The September 4 refresh pins transitive `qs@6.16.0` in every Functions root. That removes the newly published `qs` advisory and its Express/body-parser parent projection without changing Firebase Functions or any HTTP handler contract.

## Remediations completed

- Fabric moved from 5.3.0 to 7.4.0, removing the critical native `canvas` / `tar` / `node-pre-gyp` chain. The shared editor explicitly preserves left/top origins, Promise image/clone behavior, collection-owned stacking, coordinate-safe group/ungroup, filters, export, and async disposal.
- Firebase Admin moved from 12.7.0 to 14.2.0. Root namespace imports were replaced by `src/lib/firebase/firebaseAdminCompat.ts`, which exposes the narrow legacy-shaped surface through supported modular v14 entry points.
- `uuid@11.1.1` is a root security override for ExcelJS, Gaxios, and Teeny Request. ExcelJS buffer round-trip, CommonJS `v4`, UUID buffer output, and Firebase modular imports are regression-checked.
- MenuList Functions use Sentry 10.68.0, Firebase Admin 13.10.0, stable Firebase Functions 7.3.0, Nodemailer 9.0.3, and Razorpay 2.9.8. Answerlattice and SignalDesk Functions use Firebase Admin 13.10.0 with stable Firebase Functions 7.3.0; Answerlattice also pins Nodemailer 9.0.3.
- Functions stay on Firebase Admin 13.10.0 because it removes the vulnerable UUID dependency while remaining inside the stable Firebase Functions 7.3 peer contract. All three Functions initializers use modular Admin entry points, and every Functions root pins patched transitive `qs@6.16.0`.
- All three Functions roots override transitive UUID to 11.1.1. The unused `firebase-functions-test` dependency was removed because no test imports it and its current release carries the vulnerable `ts-deepmerge` chain.
- Existing emulator compatibility is preserved through narrow modular `Timestamp`, `FieldValue`, and app-deletion adapters. Representative MenuList special-menu, Answerlattice Knowledge Intake summary, and SignalDesk proof-permission/source-data lifecycle emulator tests pass.
- The MenuList Functions lint command now uses flat-config-compatible `eslint .`; the deployment preflight again passes lint and strict build under Node 22.
- Next's optional Sharp is overridden to 0.35.3 and must be exercised through real Next image optimization during final runtime validation.
- Safe non-breaking audit updates moved YAML, WebSocket, minimatch, brace expansion, fast-uri, immutable, and diff to patched resolved versions.
- MenuList Functions overrides its legacy ESLint/Minimatch chain to compatible `brace-expansion@1.1.18`, so development and production audits are both zero without changing the deployed Functions runtime graph.
- Root resolver pins for `@swc/helpers@0.5.23`, `picomatch@4.0.5`, `webpack@5.109.0`, and `ajv@8.20.0` keep the installed peer tree valid without `--force` or `--legacy-peer-deps`.
- Root transitive security controls keep `browserslist@4.28.9`, `fflate@0.8.3`, direct `fast-uri@3.1.7`, and `postcss-selector-parser@6.1.3` exact. The Tiptap custom image renderer rejects own `__proto__` keys before invoking the v2 merger, with an executable hostile-input regression.
- Root transitive security overrides keep `js-yaml@4.3.1`, `nanoid@3.3.18`, and `dompurify@3.4.13` exact. The dependency-freeze verifier checks both the declarations and resolved lockfile nodes; MenuList Functions applies the same `js-yaml@4.3.1` control to its separate lint tree.
- Node 22 is the root runtime (`engines.node = 22`, `.nvmrc = 22.23.1`) because Firebase Admin 14 and the root/Functions toolchain share that long-term baseline.

The exact lockfile must reproduce only the controlled two-entry Tiptap advisory projection after `npm ci`; every critical, high, low, or differently identified root advisory is a failure. `npm ls --all` must exit successfully with no invalid or missing peers. On macOS, Sharp's optional cross-platform WebAssembly artifacts can appear as platform-specific installed-tree entries; confirm them against the clean lockfile rather than treating them as declaration drift.

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
- any root full or production audit differs from the exact two-entry controlled Tiptap advisory projection;
- a direct `firebase-admin` root namespace import appears in the root app or any Functions source tree;
- any Functions full or production audit becomes non-zero;
- Fabric native canvas/tar packages reappear;
- a UUID/Functions-`qs` override, a root browserslist/fflate/selector-parser/brace-expansion/fast-uri/js-yaml/nanoid/DOMPurify control, the Tiptap attribute boundary, a MenuList Functions brace-expansion/js-yaml control, or the root Sharp override is removed;
- npm proposes a framework downgrade, canary, `--force`, or peer bypass;
- declaration, lockfile, and installed-tree versions disagree.

## Related evidence

- [Next.js August 2026 security release](https://nextjs.org/blog/august-2026-security-release)
- [Tiptap attribute-merging advisory](https://github.com/advisories/GHSA-cp6q-959q-f8rh)
- [Tiptap v2-to-v3 migration guide](https://tiptap.dev/docs/guides/upgrade-tiptap-v2)
- [Next.js runtime migration validation](../../nextjs-runtime-migration/nextjs-runtime-migration_validation.md)
- [Shared Creative Editor validation](../../shared-creative-editor/shared-creative-editor_validation.md)
- [Answerlattice final cross-cutting audit](../../answerlattice/system-inventory/answerlattice-final-cross-cutting-audit.md)
