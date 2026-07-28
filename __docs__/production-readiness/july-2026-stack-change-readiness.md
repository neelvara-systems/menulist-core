# July 2026 Stack Change Readiness

**Status:** Source implemented; provider, Firebase IAM, and target deploy evidence pending
**Last updated:** July 26, 2026
**Scope:** Gemini, Firebase Functions/CLI, Firebase Extensions, Upstash, Cloud Storage lifecycle, and dependency audit

## Repository decisions

### Gemini

- Root, MenuList Functions, and Answerlattice Functions pin `@google/genai` 2.13.0.
- Text routing uses explicit stable IDs:
  - `gemini-3.5-flash-lite` for structured/high-throughput work.
  - `gemini-3.6-flash` for complex work and SignalDesk escalation.
  - `gemini-3.5-flash` only for deliberate balanced workloads.
- Image routing uses `gemini-3.1-flash-lite-image` or `gemini-3.1-flash-image`.
- `src/data/shared/geminiRuntime.ts` is mirrored byte-for-byte into MenuList and Answerlattice Functions.
- Every `generateContent` call is compiled before retry/provider execution. The compiler removes deprecated sampling fields for every admitted Gemini 3.x model, removes unsupported candidate-count fields, and rejects prefilled model turns where disallowed, `thinkingBudget`, invalid `thinkingLevel`, incomplete function responses, unstable aliases, and unknown models.
- Mature operations remain on `generateContent`. The Interactions API is not a blanket transport replacement; adopt it only for a workload that benefits from server-managed interaction state after measuring tool-loop behavior, latency, retries, schema success, and full request cost.
- Retired Gemini 2.5 IDs remain only in SignalDesk's explicit persisted-route migration registry. Exact untouched legacy seeds migrate to current defaults. Owner-modified routes are preserved but cannot reach Gemini until they use a supported model.

Run:

```bash
npm run verify:gemini-runtime-migration
```

Provider smoke remains required in QA because local compilation cannot prove target keys, quota, region, billing, latency, or output quality.

### Firebase Functions and CLI

- MenuList, Answerlattice, and SignalDesk Functions pin stable `firebase-functions` 7.3.0.
- No `7.3.2` release candidate is allowed.
- Answerlattice CI pins Firebase CLI 15.24.0 without adding the CLI to the root production dependency tree.
- Package builds and manifest/deploy preflight must run under Node 22.23.1 before a scoped QA deploy.

### Firebase Extensions

The management surface is an operational dead end. Do not add a new Firebase Extension. Inventory every project with:

```bash
npm run audit:firebase-extensions
```

The command checks MenuList, Answerlattice, CampaignCue, and SignalDesk QA/production projects through Firebase CLI 15.24.0 and emits only project, instance ID, extension ref, and state. On July 26, 2026 the complete inventory was blocked because this shell was not authenticated with Firebase. This is an owner/IAM evidence gap, not proof that zero extensions exist.

If an instance exists:

1. Record its configuration, Secret Manager references, triggers, IAM grants, generated resources, data ownership, retry behavior, and rollback path without copying secret values.
2. Replace business-critical behavior with owned second-generation Cloud Functions using the matching product's Firebase target and existing scheduler/function conventions.
3. Validate in QA, cut over, observe, and remove the extension before March 31, 2027.

### Upstash

- Both the Next.js and MenuList Functions limiters use one atomic Lua sliding-window operation.
- Provider operations have a 1.5-second timeout and a 60-second circuit-breaker window.
- Expensive AI, batch, upload, and mutation helpers fail closed with a retryable 503 when Redis is unavailable. Low-risk read paths may choose fail-open only through an explicit per-call policy.
- Rate-limit key identifiers remain HMAC-hashed.

Run target reachability:

```bash
npm run verify:upstash-readiness
```

This command never prints the token or full URL. It reports the hostname and PING result. The Upstash console must separately confirm whether the database originated through DigitalOcean Marketplace; endpoint shape alone is not reliable provenance evidence. The July 26 local check was blocked because this shell did not contain the Upstash URL/token.

### Cloud Storage lifecycle

Do not add size-aware deletion or transition rules merely because the platform supports `sizeAboveBytes` and `sizeBelowBytes`.

The current checked-in MenuList lifecycle keeps owner/source uploads and applies a narrow COLDLINE transition to the legacy `MenuListAi/project/files/` prefix. Before adding a size condition:

1. Read the live bucket lifecycle configuration.
2. Produce a bounded object inventory for the proposed prefix with object count, total bytes, size distribution, ownership class, legal/audit need, and existing references.
3. Draft a QA-only rule with prefix, age, and size conditions.
4. Confirm the matched object set before applying it.
5. Observe QA lifecycle behavior before requesting production approval.

No new size-aware rule is justified by current repository evidence.

### Dependency security

- Root production consumers are moved to compatible patched chains: ExcelJS uses current Archiver/Unzipper overrides, Google GAX uses current Rimraf, Sucrase uses current Glob, and Minimatch 10 resolves patched `brace-expansion` 5.0.8.
- The ExcelJS XLSX write/read roundtrip remains part of upgrade validation because those controls cross transitive dependency major ranges.
- Root production audit has the already governed private Next 16.2.11/PostCSS chain only: one high PostCSS entry and one moderate Next entry for the same upstream dependency.
- Root full audit additionally reports nine high entries in its development-only ESLint/minimatch chain; MenuList Functions full audit reports ten. Production installation excludes those legacy tooling paths, and forcing brace-expansion 5 into their CommonJS contract breaks lint. The security gate allowlists only those exact dev chains, still requires the governed two-entry root production result, and requires zero production vulnerabilities in all three Functions packages.
- Do not run `npm audit fix --force`, downgrade Next, patch `node_modules`, or install a canary.

## Authoritative references

- [Google Gemini latest-model migration contract](https://ai.google.dev/gemini-api/docs/latest-model)
- [Google Gemini API release notes](https://ai.google.dev/gemini-api/docs/changelog)
- [Firebase Extensions deprecation FAQ](https://firebase.google.com/docs/extensions/faq-and-troubleshooting)
- [Firebase CLI Extension commands](https://firebase.google.com/docs/cli)
- [Cloud Storage lifecycle release notes](https://cloud.google.com/storage/docs/release-notes)
- [Cloud Storage lifecycle conditions](https://cloud.google.com/storage/docs/lifecycle)
- [Upstash DigitalOcean migration notice](https://upstash.com/docs/redis/quickstarts/digitalocean)

## Local verification evidence

On July 26, 2026, under the pinned Node 22.23.1 runtime:

- `npm run verify:stack-change-readiness` passed the dependency freeze, Gemini compatibility, provider-resilience, and storage-lifecycle gates.
- Root typecheck and zero-warning lint passed.
- MenuList, Answerlattice, and SignalDesk Functions builds passed.
- `npm run build:vercel` generated all 439 pages and isolated-loaded the traced website, sign-in, and NextAuth API bundles.
- The exact production start returned HTTP 200 for `/`, `/signin?callbackUrl=%2Fdashboard`, and `/api/auth/session`; the sign-in response contained the expected authentication content and no Firebase Admin/JWKS ESM error.
- Chrome followed the desktop homepage Login link to the “Welcome back” authentication screen with no browser console error.
- The security gate accepted only the governed root Next/PostCSS production chain and the exact development-only lint chains; all three Functions production audits were clean.
- `git diff --check` passed.

## Release boundary

Source gates do not prove a deployed release. Remaining external evidence:

- authenticated Firebase Extension inventory;
- QA Functions deploy and provider smoke;
- target Upstash reachability and marketplace-origin confirmation;
- target-specific Gemini key/quota/billing/model smoke and workload benchmark;
- Vercel deployment and production-host smoke only after explicit deployment authorization.
