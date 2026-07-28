# Product Separation Playbook — Answerlattice

> **v1.2.0** | 2026-05-25 | Ref: 07-multi-product-tenancy.md v4.1.0
> Local and QA separate-mode paths are fixed on `answerlattice-qa`. Production uses the `answerlattice` Firebase project and still requires production credentials/deploy verification.

> QA deployment status is tracked in `__docs__/answerlattice/deployment/answerlattice-qa-deployment-runbook.md`.

## Current Domain And Firebase Split

Answerlattice and MenuList share the same Vercel project, but product hostnames route to separate product surfaces and Firebase targets:

| Environment | MenuList URL | MenuList Firebase | Answerlattice URL | Answerlattice Firebase |
| --- | --- | --- | --- | --- |
| Local development | `http://localhost:3000/` | `menulist-qa` | `http://localhost:3000/__answerlattice/` | `answerlattice-qa` |
| Vercel Preview / QA | `https://menulist.online` | `menulist-qa` | `https://answerlattice.menulist.online` | `answerlattice-qa` |
| Vercel Production | `https://menulist.ai` | `menulist` | `https://answerlattice.com` | `answerlattice` |

The source-of-truth code for this matrix is `src/constants/deploymentTargets.ts`. Run `npm run verify:env-targets` after changing domain, Firebase, or deploy-script configuration.

Known product domains are stage-scoped. If a Vercel Production deployment receives a QA hostname, or a Vercel Preview deployment receives a production hostname, middleware redirects the request to the active hostname for that product instead of letting it fall through as a tenant/custom domain.

Answerlattice product hosts must pass through `/api/*`, `/_next/*`, `/signin`, `/unauthorized`, and `/widget/*` runtime/embed paths. Only dashboard paths rewrite into the Answerlattice dashboard route group; marketing paths rewrite into `src/app/sites/answerlattice/`.

MenuList owner navigation, including desktop sidebar and mobile More, must not expose Answerlattice management. Answerlattice settings and widget management belong to the Answerlattice dashboard, not the MenuList owner shell.

## Current Session/Product Account Bridge

Until external-client CCT auth becomes the primary cross-product contract, the shared Next.js app uses a narrow login bridge:

- The default NextAuth user document may contain `productAccounts.AL`.
- `productAccounts.AL` stores Answerlattice `pId`, `tenantId`, `storeId`, `platformRole`, `role`, `active`, and `isVerified` for that Answerlattice account.
- Answerlattice routes and APIs scope the session through this Answerlattice product account instead of using the MenuList root `tenantId`/`storeId`.
- `/api/auth/set-claims` issues Answerlattice Firebase custom claims from the Answerlattice user/account when `ANSWERLATTICE_FIREBASE_MODE=separate`.
- Answerlattice onboarding writes product data to the Answerlattice Firebase project and only writes the bridge object back to the default auth user document.

This bridge does not make MenuList the owner of Answerlattice data. It only lets one Google login access both products while Firebase data, rules, functions, and widget credentials stay separated.

The explicit default-auth bridge exceptions are `src/app/api/answerlattice/onboard/route.ts` and `src/lib/answerlattice/staffAccessServer.ts`. They may initialize MenuList Admin only for the documented default user/product-account, Firebase Auth, and session bridge writes while using Answerlattice Admin for Answerlattice-owned data/auth. Other Answerlattice routes, libraries, search/vector code, and DALs must use `answerlatticeFirebaseAdmin` or import `FieldValue`/`Timestamp` directly from `firebase-admin/firestore`; importing `@lib/firebase/firebaseAdmin` only for SDK utilities is not allowed.

---

## PART 1: DAL Files — Switch `firebaseClient` → `answerlatticeFirebaseClient`

### Core Answerlattice DAL (`src/database/answerlattice/`) — 8 files

| File                   | Purpose                                |
| ---------------------- | -------------------------------------- |
| `entities.ts`          | Entity CRUD + relations + search index |
| `canonicalAnswers.ts`  | Canonical answer CRUD + governance     |
| `mutationProposals.ts` | Mutation proposal CRUD                 |
| `signalEvents.ts`      | Signal event log (append-only)         |
| `releases.ts`          | Release timeline                       |
| `auditLogs.ts`         | Audit trail (append-only)              |
| `entityCandidates.ts`  | AI entity candidates                   |
| `coverageKPI.ts`       | Coverage KPI read                      |

### Feature DAL — 10 directories (all Answerlattice domain)

| Directory                       | Purpose                           |
| ------------------------------- | --------------------------------- |
| `src/database/knowledgeBase/`   | KB articles, categories, sections |
| `src/database/tickets/`         | Support tickets                   |
| `src/database/chatSessions/`    | AI chat sessions                  |
| `src/database/aiSearchHistory/` | KB search history                 |
| `src/database/queryEmbeddings/` | Cached query embeddings           |
| `src/database/contentFeedback/` | Chat feedback                     |
| `src/database/changelog/`       | Changelog entries                 |
| `src/database/feedback/`        | User feedback                     |
| `src/database/kb-generation/`   | KB ingestion jobs                 |
| `src/database/chatAnalytics/`   | Chat analytics                    |

**Change pattern (identical for all files above):**

```ts
// BEFORE
import { firebaseClient } from "@lib/firebase/firebaseClient";
// AFTER
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
```

---

## PART 2: New Files to Create

### Firebase Infrastructure

| New File                                     | Purpose                                                       |
| -------------------------------------------- | ------------------------------------------------------------- |
| `src/lib/firebase/answerlatticeConfig.ts`         | Answerlattice Firebase config (reads `ANSWERLATTICE_*` env vars)        |
| `src/lib/firebase/answerlatticeFirebaseClient.ts` | Answerlattice client: `getFirestore`, `getFunctions`, `getStorage` |
| `src/lib/firebase/answerlatticeFirebaseAdmin.ts`  | Answerlattice server admin: `firebase-admin` for Answerlattice project  |
| `firebase-answerlattice.json`                     | Firebase CLI config pointing to `functions-answerlattice/`         |

### Cloud Functions Directory

```
functions-answerlattice/
  src/
    index.ts                    — Entry point (exports all Answerlattice CFs)
    answerlattice/answerlatticeNightly.ts  — Drift + mutation + entity resolution (migrated)
    logic/embedArticleWorker.ts  — KB embedding worker
    logic/regenerateEmbedding.ts — KB embedding regen
    logic/publishApprovedJob.ts  — KB ingestion publish
    firebaseAdmin.ts             — Answerlattice admin init
    constants/database.ts        — Collection names
    constants/features.ts        — Feature flags
    config/secrets.ts            — Secrets config
    types/knowledgeBase.types.ts — KB types
    utils/aiUtils.ts             — AI utilities (copied from shared)
  package.json
  tsconfig.json
```

### New Environment Variables

Local development and staging use the Answerlattice QA Firebase project. Production must use the production Answerlattice Firebase project values, not the QA values.

```
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE=separate
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_API_KEY=...
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID=answerlattice-qa   # local/preview
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID=answerlattice      # production
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_APP_ID=...
NEXT_PUBLIC_ANSWERLATTICE_FIRESTORE_DATABASE_ID=
ANSWERLATTICE_FIREBASE_MODE=separate
ANSWERLATTICE_FIREBASE_PROJECT_ID=answerlattice-qa               # local/preview
ANSWERLATTICE_FIREBASE_PROJECT_ID=answerlattice                  # production
ANSWERLATTICE_FIREBASE_PRIVATE_KEY=...
ANSWERLATTICE_FIREBASE_CLIENT_EMAIL=...
ANSWERLATTICE_FIRESTORE_DATABASE_ID=
```

Use `shared` mode only for explicit legacy/emulator recovery. The active local path is separate mode against `answerlattice-qa`, and production stays separate against `answerlattice`.

---

## PART 3: Files That Need NO Firebase Changes

These files use DAL functions (not Firebase directly). Once DAL is updated, these work automatically.

### Lib Layer (`src/lib/answerlattice/`) — 6 files

canonicalRetrieval.ts, driftDetection.ts, signalMutation.ts, signalEmitter.ts, entityExtraction.ts, tokenizer.ts

### Hooks (`src/hooks/answerlattice/`) — 2 files

useEntityCandidates.ts, useMutationProposals.ts

### Components (use DAL/hooks/API routes, not Firebase)

- `src/components/templates/main-app/helpCenter/` — 26 files
- `src/components/templates/main-app/helpChat/` — 33 files
- `src/components/templates/platform/KBGeneration/` — 18 files
- `src/components/templates/platform/chatManagement/` — ~10 files
- `src/components/templates/platform/changelog/` — 9 files
- `src/components/templates/main-app/feedback/` — feedback UI

### Page Routes (render components, no Firebase)

- `src/app/(main)/platform/knowledge-base/`
- `src/app/(main)/platform/kb-generation/`
- `src/app/(main)/platform/changelog/`
- `src/app/(main)/platform/feedback-admin/`
- `src/app/(main)/platform/(chat-management)/` — 5 routes

### API Routes (use DAL, no direct Firebase)

- `src/app/api/helpCenter/search-kb/route.ts`
- `src/app/api/helpCenter/search-kb-stream/route.ts`

### Constants / Config (unchanged)

- `src/constants/database.ts` — collection names are strings
- `src/config/features.ts` — 5 Answerlattice flags stay
- `src/constants/navigations.ts` — nav items unchanged

### One Exception

`src/components/templates/platform/KBGeneration/index.tsx` calls `httpsCallable(functions, ...)` for KB embedding. Must switch to `httpsCallable(answerlatticeFunctions, ...)`.

---

## PART 4: Cloud Functions Migration

### Move to `functions-answerlattice/src/`

| Migrated / moving from legacy `functions/src/` | Purpose                                          |
| --------------------------------------------- | ------------------------------------------------ |
| `answerlattice/answerlatticeNightly.ts`                 | Drift, mutation, entity resolution, coverage KPI — migrated to `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` |
| `logic/embedArticleWorker.ts`  | KB embedding worker (task queue)                 |
| `logic/regenerateEmbedding.ts` | KB embedding regen (callable)                    |
| `logic/publishApprovedJob.ts`  | KB ingestion publish (callable)                  |
| Retired MenuList KB Quality source | The former worker and provider helper were removed; dedicated deterministic chat intelligence runs in `functions-answerlattice/`. |
| `types/knowledgeBase.types.ts` | KB types                                         |

### Copy Shared Utilities to `functions-answerlattice/src/`

| File                    | Why copied                             |
| ----------------------- | -------------------------------------- |
| `firebaseAdmin.ts`      | Re-create pointing to Answerlattice project |
| `constants/database.ts` | Collection name constants              |
| `constants/features.ts` | Feature flags                          |
| `config/secrets.ts`     | Secret references                      |
| `utils/aiUtils.ts`      | AI/embedding utilities                 |
| `genAiClient.ts`        | Gemini client init                     |

### Remove from MenuList Functions

Answerlattice nightly has been removed from `functions/src/decisionBlocksScoring.ts`; do not re-add Answerlattice scheduled work to MenuList functions.

Keep the legacy MenuList exports for now as explicit shared-mode/emulator recovery compatibility. In `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE=shared`, `answerlatticeFunctions` resolves to the MenuList Firebase Functions app, so removing the legacy exports would break those recovery deployments. The active local, preview, and production paths call the same function names from `functions-answerlattice/`.

Dormant MenuList chat-monitoring compatibility boundary: Feedback Intelligence, Weekly Narrative, and Health Signals source remains in `functions/src/` for recovery/history, but no active MenuList scheduler or callable invokes those workers. The former KB Quality worker, provider helper, and legacy support health check are retired and absent. `decisionBlocksScoring.ts` records the legacy task names as `moved_to_answerlattice_runtime`; the retained manual scheduler callables fail closed. Dedicated Answerlattice nightly aggregation and deterministic `chat_intelligence` own current feedback/weekly output. Do not reconnect the dormant workers or restore the retired KB path.

### Deployment Commands

```bash
# MenuList functions (local/preview target)
npm run verify:functions-deploy-preflight
firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImages,functions:processMenuImagesJob,functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:verifyMenuPublish --non-interactive

# MenuList production Functions require QA evidence and explicit production deploy approval.

# Answerlattice QA functions
firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json

# Answerlattice production functions
firebase deploy --only functions:answerlattice --project answerlattice --config firebase-answerlattice.json

# Answerlattice QA Firestore/Storage rules and indexes
firebase deploy --only firestore:rules,firestore:indexes,storage --project answerlattice-qa --config firebase-answerlattice.json --non-interactive

# Answerlattice production Firestore/Storage rules and indexes
firebase deploy --only firestore:rules,firestore:indexes,storage --project answerlattice --config firebase-answerlattice.json --non-interactive
```

---

## PART 5: Execution Order

1. Create GCP project `answerlattice` + enable Firestore/Auth/Storage
2. Add `ANSWERLATTICE_FIREBASE_*` env vars
3. Create 3 new Firebase files (config, client, admin)
4. Update all DAL imports (18 directories)
5. Create `functions-answerlattice/` + move 7 files + copy shared
6. Remove Answerlattice from MenuList functions
7. Create `firebase-answerlattice.json`
8. Export/import Firestore data + backfill `pId`
9. Build CCT + client registry
10. `tsc --noEmit` — zero errors
11. Deploy both projects

---

## PART 6: Future Product Template

When separating ANY new product (e.g., GrowthOS):

1. Assign `pId` code in product registry
2. Create Firebase project
3. Create `{product}Config.ts`, `{product}FirebaseClient.ts`, `{product}FirebaseAdmin.ts`
4. Move product DAL directories → switch import
5. Create `functions-{product}/` if needed
6. Add env vars
7. Create `firebase-{product}.json`
8. Register as Answerlattice client (if using Answerlattice)
9. Update `.cascade/rules/` if product has its own rules file
10. Deploy

---

## PART 7: Deep Audit Findings (2025-03-05)

Gaps discovered during full system audit. All must be addressed during implementation.

### 7.1 ANSWERLATTICE_RULES.md Was Outdated (FIXED)

- **Rule 6** said `tenantId` → fixed to `pId`/`tId`/`sId` + CCT + sourceContext
- **Rule 10** said "shared Firebase project" → fixed to "separate Firebase project" with full infrastructure separation rules

### 7.2 `src/lib/firebase/functions.ts` — Needs `answerlatticeFunctions` Export

Currently only exposes MenuList `functions`. Must add:

```ts
const answerlatticeFunctions = getFunctions(answerlatticeApp);
export { answerlatticeFunctions };
```

### 7.3 `functions/src/constants/database.ts` — Mirror to `functions-answerlattice/`

Answerlattice collection constants exist in MenuList's functions constants file. Must be copied to `functions-answerlattice/src/constants/database.ts` during function split.

### 7.4 `DB_COLLECTIONS` in `src/constants/database.ts`

Both MenuList and Answerlattice collection names live in ONE file. Collection names are just strings — they work with any Firestore. No split needed. But add a comment noting which Firestore each targets:

- MenuList collections → menulist-qa Firestore
- `ANSWERLATTICE_*` collections → answerlattice Firestore

### 7.5 `requestBodyComposer` Usage in Answerlattice DAL

Answerlattice DAL files now call `answerlatticeRequestBodyComposer` from `src/lib/answerlattice/documentComposer.ts`, not the shared MenuList composer directly.

- **Document ownership:** `pId` is forced to `"AL"` for Answerlattice writes.
- **Current embedded MenuList compatibility:** existing `tId`/`sId` query scopes are preserved so current screens do not lose their data.
- **CCT readiness:** `sourceContext`, `traceId`, and `requestId` are added as non-breaking fields. Full CCT verification still routes through `AnswerlatticePlatformContext` when external clients are activated.

### 7.6 Feature Docs Reference Old Architecture

Older feature docs (`help-center_impl.md`, `ticket-system_impl.md`, `feedback-system_impl.md`, etc.) may still mention the shared `requestBodyComposer` pattern. Runtime code now uses `answerlatticeRequestBodyComposer` for Answerlattice-owned writes. Feature docs should reference this section rather than re-defining the identity/composer contract.

### 7.7 `src/services/gemini/prompts/` — Answerlattice KB Quality

Three files in `src/services/gemini/prompts/` are legacy KB-quality prompt assets. The old MenuList Cloud Function worker and provider helper are retired and absent. Current Answerlattice chat feedback/weekly intelligence is deterministic and runs in the dedicated project, so those prompt assets must not be presented as current behavior or reconnected without a new reviewed runtime decision.

### 7.8 `src/lib/firebase/appCheck.ts`

App Check is per-Firebase project. When Answerlattice project is created, it needs its own App Check setup if Answerlattice dashboard/widget needs bot protection. Defer until external clients onboard.

---

## PART 8: Implementation Status (2025-03-05)

### Completed by Cascade

- [x] `answerlatticeConfig.ts` — Answerlattice Firebase config
- [x] `answerlatticeFirebaseClient.ts` — Answerlattice client SDK (Firestore, Auth, Storage, Functions)
- [x] `answerlatticeFirebaseAdmin.ts` — Answerlattice server admin SDK
- [x] `product.ts` — Product ID constants (ML, AL, SF, GR, KS)
- [x] `multiProduct.ts` — CCT, PlatformContext, SourceContext, Client types
- [x] `firebase-answerlattice.json` — Firebase CLI config
- [x] `functions-answerlattice/` — Directory structure (package.json, tsconfig, firebaseAdmin, index.ts)
- [x] `functions.ts` — KB callables switched to `answerlatticeFunctions`
- [x] `requestBodyComposer` — `pId` injection added (default "ML")
- [x] NextAuth session — `pId = "ML"` added
- [x] `sanitizeSession` — `pId` added
- [x] 19 Answerlattice DAL files — switched to `answerlatticeFirebaseClient`
- [x] `queryEmbeddings` — switched to `answerlatticeFirestoreAdmin`
- [x] `DB_COLLECTIONS` — Answerlattice section comment updated
- [x] `decisionBlocksScoring.ts` — Answerlattice nightly block removed
- [x] Legacy MenuList-side `answerlatticeNightly.ts` duplicate removed
- [x] `tsc --noEmit` — ZERO ERRORS
- [x] 3 helpCenter API routes switched to `answerlatticeFirestoreAdmin` (search-kb, search-kb-stream, article-embedding)
- [x] `.env` — Answerlattice env var placeholders added
- [x] `ANSWERLATTICE_RULES.md` — Rules 6 + 10 updated for multi-product
- [x] `MASTER-EXECUTION-PROMPT.md` — STEP 11 added
- [x] Mutation proposals — approve/reject/implement converted to Firestore transactions (race condition fix)
- [x] Ticket messages — MAX_TICKET_MESSAGES = 500 guard added (doc size safety)
- [x] `contextResolver.ts` — created at `src/lib/platform/`
- [x] pId validation guard — added to `requestBodyComposer` (never null)
- [x] `answerlatticeRequestBodyComposer` — Answerlattice DAL writes now force `pId = 'AL'` and attach source context + trace IDs
- [x] KB callable functions — `embedArticleWorker`, `regenerateEmbedding`, and `publishApprovedJobFn` exported from `functions-answerlattice/src/index.ts`
- [x] Answerlattice KB embeddings — callable functions use Answerlattice Firebase Admin and Answerlattice-owned Gemini API secrets so separate-mode cost/accounting stays inside Answerlattice
- [x] Answerlattice Next.js AI paths — embeddings, image-query interpretation, RAG fallback, entity extraction, draft regeneration, FAQ generation, translation, and Knowledge Intake media extraction use the app-side Answerlattice `ANSWERLATTICE_GEMINI_AI_KEY*` gateway without MenuList credential fallback
- [x] API hardening — Answerlattice translate/widget routes use Answerlattice Admin surfaces and structured secure logging

### Pending (User Action Items)

- [ ] Create Answerlattice Firebase project in GCP console
- [ ] Fill `ANSWERLATTICE_FIREBASE_*` env vars
- [ ] Add env vars to Vercel
- [ ] Deploy both Firebase projects
- [ ] Create `answerlattice_clients` collection with MenuList as client #1

See `10-implementation-action-items.md` for detailed instructions.
