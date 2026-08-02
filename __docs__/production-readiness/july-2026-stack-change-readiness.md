# July 2026 Stack Change Readiness

**Status:** August 2 source reconciliation implemented; provider controls, Firebase IAM, and target deploy evidence pending
**Last updated:** August 2, 2026
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

#### August 2 rolling-spend and retry boundary

- Gemini's provider spend limit is enforced per Google Cloud project, not per API
  key. MenuList, Answerlattice, and SignalDesk therefore keep separate
  project/product spend windows; extra keys remain credential failover only.
- Every billed gateway attempt now reserves conservative capacity in the
  Admin-only `geminiSpendWindows/{product}` document before provider I/O and
  settles that reservation from Gemini usage metadata after the response. A
  failed attempt releases the reservation. Store failure fails closed before a
  paid call; settlement failure retains the conservative reservation.
- The default local ceiling is USD 8 per rolling ten-minute window, leaving
  headroom below the current Tier 1 provider ceiling. Override it only with the
  matching non-secret product variable:
  `MENULIST_GEMINI_SPEND_LIMIT_USD_10M`,
  `ANSWERLATTICE_GEMINI_SPEND_LIMIT_USD_10M`, or
  `SIGNALDESK_GEMINI_SPEND_LIMIT_USD_10M`. The source boundary admits USD 0.10
  through USD 190; the configured value must remain below the target project's
  active AI Studio ceiling.
- Ordinary `429` responses no longer hop to another key immediately. The
  affected key enters cooldown and the gateway uses bounded full-jitter
  backoff, honoring structured `RetryInfo`/`Retry-After` metadata. Hard project
  quota failures and retry windows beyond the 16-second inline budget fail
  fast. Provider message text is not used for retry classification.
- Internal real-cost accounting uses the actual admitted model and token usage
  when present. Image/non-token and legacy call sites retain current bounded
  fallback costs. Pricing changes must update the shared price registry, its
  byte-identical Functions mirrors, and the focused verifier together.

The rolling document contains only product, time buckets, micro-USD totals,
limit, and update time. It stores no prompt, response, key, tenant, store, or
user data. Each billed provider attempt adds one Firestore transaction read and
write for reservation and one transaction read and write for settlement or
release. MenuList, Answerlattice, and SignalDesk now carry explicit
server-only deny branches for `/geminiSpendWindows/{product}`; the emulator
matrix proves anonymous, product-member/owner, and platform browser access is
denied in all three projects. No index, scheduler, Storage, listener, or public
browser-access path is added.

#### Provider spend-cap operator decision

Create a separate **Spend cap enforcement** budget for the **Gemini API** in
each QA project before live smoke, then repeat for production only after the
owner chooses the monthly amount. This Preview control is project-and-service
scoped, blocks new Gemini usage when enforced, requires manual lifting, and is
not instantaneous; keep the app-local rolling guard and alert-only budgets too.

Do not enable a **Cloud Run** spend cap on a shared product project merely
because the feature exists. A Cloud Run cap pauses all Cloud Run services,
jobs, and worker pools in that project: services return `5xx`, jobs stop, and
worker pools stop processing. Adoption requires an explicit monthly amount,
outage/restore runbook, project-isolation decision, and QA drill. No repository
or console change is justified in this weekly pass.

Run:

```bash
npm run verify:gemini-runtime-migration
npm run test:gemini-spend-windows:rules
```

Provider smoke remains required in QA because local compilation cannot prove target keys, quota, region, billing, latency, or output quality.

### Firebase Functions and CLI

- MenuList, Answerlattice, and SignalDesk Functions pin stable `firebase-functions` 7.3.0.
- No `7.3.2` release candidate is allowed.
- Answerlattice CI pins Firebase CLI 15.24.0 without adding the CLI to the root production dependency tree.
- Package builds and manifest/deploy preflight must run under Node 22.23.1 before a scoped QA deploy.
- The current task queue call is `getFunctions().taskQueue('embedArticleWorker')`.
  It does not use an Extensions `extensionId` or `FunctionScope`; the reported
  `taskQueue()` deprecation shape therefore requires no source change.

### Firebase JavaScript SDK applicability

- The root remains frozen on Firebase JS 11.7.3. Its resolved
  `@firebase/util` 1.11.3 contains the older regex-based error-template
  replacement, while Firebase 12.17.0 resolves the rewritten utility.
- Repository code does not import or construct `ErrorFactory`; Firebase-owned
  static templates are not derived from request/user input. The Stack Change
  claim is therefore dependency debt, not evidence of a reachable
  application-controlled ReDoS path in this codebase.
- `verify:gemini-runtime-migration` now fails if application source introduces
  `ErrorFactory`. Do not perform a blind Firebase 11-to-12 major upgrade under
  the three-year freeze. A future upgrade needs explicit migration scope plus
  Auth, Firestore, Storage, App Check, PWA, emulator, type, lint, and browser
  evidence before the freeze changes.
- Firebase AI Logic, mobile SDK, on-device model, and automatic App Check
  initialization notes do not change this server-mediated Gemini architecture.
  App Check remains explicitly configured through the existing product site-key
  contract.

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
- [Google Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Google Gemini rate and spend limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Google Cloud Billing spend-cap budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps)
- [Cloud Run billing settings and spend-cap effects](https://docs.cloud.google.com/run/docs/configuring/billing-settings)
- [Firebase JavaScript SDK release notes](https://firebase.google.com/support/release-notes/js)
- [Firebase Extensions deprecation FAQ](https://firebase.google.com/docs/extensions/faq-and-troubleshooting)
- [Firebase CLI Extension commands](https://firebase.google.com/docs/cli)
- [Cloud Storage lifecycle release notes](https://cloud.google.com/storage/docs/release-notes)
- [Cloud Storage lifecycle conditions](https://cloud.google.com/storage/docs/lifecycle)
- [Upstash DigitalOcean migration notice](https://upstash.com/docs/redis/quickstarts/digitalocean)

## Local verification evidence

On August 2, 2026, under the pinned Node 22.23.1 runtime:

- `npm run verify:gemini-runtime-migration` passed the model compiler,
  byte-identical spend policy, rolling-window tests, pricing tests, and structured
  retry tests.
- `npm run verify:provider-resilience` passed, including Functions key
  attribution.
- Answerlattice and SignalDesk runtime source verifiers passed after admitting
  their product-scoped spend controllers.
- Root typecheck and MenuList/Answerlattice Functions builds passed during the
  implementation loop. The final aggregate gate and lint result are recorded in
  the session handoff rather than inferred here.
- `npm run verify:functions-deploy-preflight` passed. The exact scoped
  MenuList QA and Answerlattice QA Gemini-consumer deploy commands were then
  attempted; both stopped before predeploy/upload with
  `Error: Failed to authenticate, have you run firebase login?`. No QA or
  production Function revision changed.

## Release boundary

Source gates do not prove a deployed release. Remaining external evidence:

- authenticated Firebase Extension inventory;
- QA Functions deploy and provider smoke;
- target Upstash reachability and marketplace-origin confirmation;
- target-specific Gemini key/quota/billing/model smoke and workload benchmark;
- real QA/production spend-limit values plus Gemini API spend-cap budget
  evidence from the matching Google Cloud project;
- Vercel deployment and production-host smoke only after explicit deployment authorization.
