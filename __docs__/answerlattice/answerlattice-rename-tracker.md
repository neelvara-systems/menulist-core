# Answerlattice Rename Tracker

Date: 2026-05-31
Branch: staging

## Scope

Full development-phase rename from the previous support product name to Answerlattice. There are no onboarded clients, so this migration intentionally changes public names, internal names, routes, file paths, collection constants, Firebase package names, widget globals, env variables, and the product code from `CN` to `AL`.

## Replacement Map

| Area | Current Answerlattice value | Status |
| --- | --- | --- |
| Title-case brand | `Answerlattice` | Applied to tracked text and path names |
| Lowercase product id | `answerlattice` | Applied to tracked text and path names |
| Uppercase product prefix | `ANSWERLATTICE` | Applied to tracked text and path names |
| Product code | `AL` | Applied to product-context references; real country/locale codes preserved |
| Website CSS/id prefix | `al-` | Applied under `src/app/sites/answerlattice` and `public/answerlattice-og-image.svg` |
| Dashboard route namespace | `/answerlattice` | Applied through path and content rename |
| API namespace | `/api/answerlattice` | Applied through path and content rename |
| Dev/internal route namespace | `/__answerlattice` | Applied through path and content rename |
| Primary product domain | `answerlattice.com` | Applied; non-primary `.app` and `.ai` leftovers removed |
| Functions package path | `functions-answerlattice` | Applied to tracked function package paths |
| Firebase app config path | `firebase-answerlattice.json` | Applied |
| Firestore rules/index paths | `firestore-answerlattice.*` | Applied |
| Storage rules path | `storage-answerlattice.rules` | Applied |
| Widget script filename | `answerlattice-widget.js` | Applied |
| Widget global | `window.AnswerlatticeWidget` | Applied |
| Widget data attributes | `data-answerlattice-*` | Applied |
| Env prefixes | `NEXT_PUBLIC_*ANSWERLATTICE*` / `ANSWERLATTICE_*` | Applied |

## Guardrails

- Preserve `zh-CN` locale identifiers.
- Preserve real country code `CN` for China in country data and analytics maps.
- Do not run production or Vercel deploys as part of this rename.
- Firebase deployment requires project/secret setup for the new Answerlattice target names before any deploy can be trusted.

## Verification Log

- Pre-rename checkpoint commit: `377901c7 chore: checkpoint pre-rename local changes`.
- Tracked path rename pass: 850 paths containing legacy product name variants renamed.
- Tracked text rename pass: 1221 text files updated.
- Product-code cleanup pass: 37 files updated from product-context `CN` to `AL`.
- Website prefix cleanup pass: 38 Answerlattice site/asset files updated from `cn-` to `al-`.
- Canonical-term repair pass: restored accidental malformed brand/canonical collateral back to `canonical` and renamed affected canonical files back to canonical paths.
- Primary domain cleanup pass: 82 files updated from non-primary Answerlattice domain variants to `answerlattice.com`.
- Local ignored residue cleanup: removed old generated legacy build folders and renamed the ignored local service-account file to `answerlattice-service-account.json`.
- Cross-check pass: 953 changed files inventoried through Git diff, exact-token scans, path scans, domain scans, grammar scans, and corruption-pattern scans.
- Wording pass: repaired article-agreement grammar artifacts and aligned top-level rules/doctrine/public footer wording to `Governed Answer Infrastructure for SaaS Support`.
- Semantic wording pass: reviewed changed-line wording for article agreement, repeated words, stale category language, public-language governance terms, and context-specific product meaning.
- Public positioning cleanup: changed remaining public/briefing references from old control-plane phrasing to answer-layer / governed-answer-infrastructure language where the text described buyer-facing Answerlattice positioning. Technical scheduler control-plane wording remains only where it describes internal scheduling architecture.
- Public language cleanup: removed user-facing `AI-powered` wording from changed Answerlattice docs and kept only technical uses such as dynamic imports, explicit forbidden-word guidance, or third-party product names.
- Text-governance audit pass: checked markdown, rule files, prompts, workflows, project memory docs, and agent skill docs; aligned Codex/Cascade Answerlattice rules, root documentation index, master prompt identity, runtime audit wording, and tracker/checklist grammar.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run lint`: passed.
- `npx tsc --noEmit --project functions-answerlattice/tsconfig.json`: passed after installing `functions-answerlattice` dependencies from its lockfile.
- JSON parse check for `package.json`, `firebase-answerlattice.json`, `firestore-answerlattice.indexes.json`, `tsconfig.json`, `functions-answerlattice/package.json`, and `functions-answerlattice/tsconfig.json`: passed.
- `npm run verify:agent-readiness`: passed.
- `npm run verify:answerlattice-pwa`: passed.
- `git diff --check`: passed.
- Final end-to-end check: repeated full stale-name/path/domain/env/product-code scans, main TypeScript check, lint, Answerlattice functions typecheck, verification scripts, JSON parse check, ignored env residue check, and whitespace check; all passed with no build or deploy.
- Final tracked exact-name audit: no pre-rename product-name tokens found.
- Final workspace exact-path audit: no pre-rename product-name paths found outside git rename/deletion status.
- Final domain audit: no pre-rename product domain, `.app`, or `.ai` references found.
- Final tracked product-code audit: no pre-rename support-product code references found; real China/`zh-CN` locale references remain intentionally preserved.

## Pending

- Create external Firebase/Vercel/project resources that do not exist locally yet, such as `answerlattice`, `answerlattice-qa`, DNS, secrets, and hosting environment variables.
- Do not deploy until those external resources are confirmed.

## Operator Follow-Up

Read `__docs__/answerlattice/answerlattice-post-rename-operator-checklist.md` for the external domain, env, Firebase, Vercel, widget, and deploy-prep items that must be handled outside Git.
