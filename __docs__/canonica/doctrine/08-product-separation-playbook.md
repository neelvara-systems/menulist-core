# Product Separation Playbook — Canonica

> **v1.0.0** | 2025-03-05 | Ref: 07-multi-product-tenancy.md v4.1.0
> No backward compat. Not live. Clean break.

---

## PART 1: DAL Files — Switch `firebaseClient` → `canonicaFirebaseClient`

### Core Canonica DAL (`src/database/canonica/`) — 8 files

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

### Feature DAL — 10 directories (all Canonica domain)

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
import { canonicaFirebaseClient } from "@lib/firebase/canonicaFirebaseClient";
```

---

## PART 2: New Files to Create

### Firebase Infrastructure

| New File                                     | Purpose                                                       |
| -------------------------------------------- | ------------------------------------------------------------- |
| `src/lib/firebase/canonicaConfig.ts`         | Canonica Firebase config (reads `CANONICA_*` env vars)        |
| `src/lib/firebase/canonicaFirebaseClient.ts` | Canonica client: `getFirestore`, `getFunctions`, `getStorage` |
| `src/lib/firebase/canonicaFirebaseAdmin.ts`  | Canonica server admin: `firebase-admin` for Canonica project  |
| `firebase-canonica.json`                     | Firebase CLI config pointing to `functions-canonica/`         |

### Cloud Functions Directory

```
functions-canonica/
  src/
    index.ts                    — Entry point (exports all Canonica CFs)
    canonica/canonicaNightly.ts  — Drift + mutation + entity resolution
    logic/embedArticleWorker.ts  — KB embedding worker
    logic/regenerateEmbedding.ts — KB embedding regen
    logic/publishApprovedJob.ts  — KB ingestion publish
    analytics/kbQuality.ts       — KB quality AI
    services/gemini/kbQuality.ts — KB quality prompts
    firebaseAdmin.ts             — Canonica admin init
    constants/database.ts        — Collection names
    constants/features.ts        — Feature flags
    config/secrets.ts            — Secrets config
    types/knowledgeBase.types.ts — KB types
    utils/aiUtils.ts             — AI utilities (copied from shared)
  package.json
  tsconfig.json
```

### New Environment Variables

```
NEXT_PUBLIC_CANONICA_FIREBASE_MODE=separate
NEXT_PUBLIC_CANONICA_FIREBASE_API_KEY=...
NEXT_PUBLIC_CANONICA_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_CANONICA_FIREBASE_PROJECT_ID=canonica
NEXT_PUBLIC_CANONICA_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_CANONICA_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_CANONICA_FIREBASE_APP_ID=...
NEXT_PUBLIC_CANONICA_FIRESTORE_DATABASE_ID=
CANONICA_FIREBASE_MODE=separate
CANONICA_FIREBASE_PROJECT_ID=canonica
CANONICA_FIREBASE_PRIVATE_KEY=...
CANONICA_FIREBASE_CLIENT_EMAIL=...
CANONICA_FIRESTORE_DATABASE_ID=
CANONICA_GOOGLE_APPLICATION_CREDENTIALS=./canonica-service-account.json
```

Use `shared` mode only for local/test environments that intentionally point Canonica at the MenuList DB. Production stays `separate`.

---

## PART 3: Files That Need NO Firebase Changes

These files use DAL functions (not Firebase directly). Once DAL is updated, these work automatically.

### Lib Layer (`src/lib/canonica/`) — 6 files

canonicalRetrieval.ts, driftDetection.ts, signalMutation.ts, signalEmitter.ts, entityExtraction.ts, tokenizer.ts

### Hooks (`src/hooks/canonica/`) — 2 files

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
- `src/config/features.ts` — 5 Canonica flags stay
- `src/constants/navigations.ts` — nav items unchanged

### One Exception

`src/components/templates/platform/KBGeneration/index.tsx` calls `httpsCallable(functions, ...)` for KB embedding. Must switch to `httpsCallable(canonicaFunctions, ...)`.

---

## PART 4: Cloud Functions Migration

### Move to `functions-canonica/src/`

| From `functions/src/`          | Purpose                                          |
| ------------------------------ | ------------------------------------------------ |
| `canonica/canonicaNightly.ts`  | Drift, mutation, entity resolution, coverage KPI |
| `logic/embedArticleWorker.ts`  | KB embedding worker (task queue)                 |
| `logic/regenerateEmbedding.ts` | KB embedding regen (callable)                    |
| `logic/publishApprovedJob.ts`  | KB ingestion publish (callable)                  |
| `analytics/kbQuality.ts`       | KB quality AI analysis                           |
| `services/gemini/kbQuality.ts` | KB quality prompts                               |
| `types/knowledgeBase.types.ts` | KB types                                         |

### Copy Shared Utilities to `functions-canonica/src/`

| File                    | Why copied                             |
| ----------------------- | -------------------------------------- |
| `firebaseAdmin.ts`      | Re-create pointing to Canonica project |
| `constants/database.ts` | Collection name constants              |
| `constants/features.ts` | Feature flags                          |
| `config/secrets.ts`     | Secret references                      |
| `utils/aiUtils.ts`      | AI/embedding utilities                 |
| `genAiClient.ts`        | Gemini client init                     |

### Remove from MenuList Functions

Remove Canonica block from `functions/src/decisionBlocksScoring.ts` (lines 1274-1312). Remove `canonica/` import.

Remove from `functions/src/triggers/shared.ts`: `embedArticleWorker`, `regenerateEmbedding`, `publishApprovedJobFn` exports.

Remove from `functions/src/index.ts`: corresponding exports.

### Deployment Commands

```bash
# MenuList functions
firebase deploy --only functions --project ecomsai

# Canonica functions
firebase deploy --only functions --project canonica --config firebase-canonica.json
```

---

## PART 5: Execution Order

1. Create GCP project `canonica` + enable Firestore/Auth/Storage
2. Add `CANONICA_FIREBASE_*` env vars
3. Create 3 new Firebase files (config, client, admin)
4. Update all DAL imports (18 directories)
5. Create `functions-canonica/` + move 7 files + copy shared
6. Remove Canonica from MenuList functions
7. Create `firebase-canonica.json`
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
8. Register as Canonica client (if using Canonica)
9. Update `.cascade/rules/` if product has its own rules file
10. Deploy

---

## PART 7: Deep Audit Findings (2025-03-05)

Gaps discovered during full system audit. All must be addressed during implementation.

### 7.1 CANONICA_RULES.md Was Outdated (FIXED)

- **Rule 6** said `tenantId` → fixed to `pId`/`tId`/`sId` + CCT + sourceContext
- **Rule 10** said "shared Firebase project" → fixed to "separate Firebase project" with full infrastructure separation rules

### 7.2 `src/lib/firebase/functions.ts` — Needs `canonicaFunctions` Export

Currently only exposes MenuList `functions`. Must add:

```ts
const canonicaFunctions = getFunctions(canonicaApp);
export { canonicaFunctions };
```

### 7.3 `functions/src/constants/database.ts` — Mirror to `functions-canonica/`

Canonica collection constants exist in MenuList's functions constants file. Must be copied to `functions-canonica/src/constants/database.ts` during function split.

### 7.4 `DB_COLLECTIONS` in `src/constants/database.ts`

Both MenuList and Canonica collection names live in ONE file. Collection names are just strings — they work with any Firestore. No split needed. But add a comment noting which Firestore each targets:

- MenuList collections → ecomsai Firestore
- `CANONICA_*` collections → canonica Firestore

### 7.5 `requestBodyComposer` Usage in Canonica DAL

Current Canonica DAL files call `requestBodyComposer` which injects `tId`/`sId` from session. After separation:

- **Single-product Canonica writes** (entities, answers, etc.): `requestBodyComposer` still works IF session has correct Canonica context
- **Cross-product writes** (tickets from MenuList users): Must NOT use `requestBodyComposer`. Build document from decoded CCT `CanonicaPlatformContext` instead.

### 7.6 Feature Docs Reference Old Architecture

20+ Canonica feature docs (`help-center_impl.md`, `ticket-system_impl.md`, `feedback-system_impl.md`, etc.) reference `requestBodyComposer` and shared Firebase. These describe current state — no update needed NOW. But implementation MUST follow new rules from `07-multi-product-tenancy.md`.

### 7.7 `src/services/gemini/prompts/` — Canonica KB Quality

3 files in `src/services/gemini/prompts/` are Canonica-related (KB quality). These stay in the Next.js app (they're client-side). No Firebase change needed. But the corresponding Cloud Function versions move to `functions-canonica/`.

### 7.8 `src/lib/firebase/appCheck.ts`

App Check is per-Firebase project. When Canonica project is created, it needs its own App Check setup if Canonica dashboard/widget needs bot protection. Defer until external clients onboard.

---

## PART 8: Implementation Status (2025-03-05)

### Completed by Cascade

- [x] `canonicaConfig.ts` — Canonica Firebase config
- [x] `canonicaFirebaseClient.ts` — Canonica client SDK (Firestore, Auth, Storage, Functions)
- [x] `canonicaFirebaseAdmin.ts` — Canonica server admin SDK
- [x] `product.ts` — Product ID constants (ML, CN, SF, GR, VM)
- [x] `multiProduct.ts` — CCT, PlatformContext, SourceContext, Client types
- [x] `firebase-canonica.json` — Firebase CLI config
- [x] `functions-canonica/` — Directory structure (package.json, tsconfig, firebaseAdmin, index.ts)
- [x] `functions.ts` — KB callables switched to `canonicaFunctions`
- [x] `requestBodyComposer` — `pId` injection added (default "ML")
- [x] NextAuth session — `pId = "ML"` added
- [x] `sanitizeSession` — `pId` added
- [x] 19 Canonica DAL files — switched to `canonicaFirebaseClient`
- [x] `queryEmbeddings` — switched to `canonicaFirestoreAdmin`
- [x] `DB_COLLECTIONS` — Canonica section comment updated
- [x] `decisionBlocksScoring.ts` — Canonica nightly block removed
- [x] `tsc --noEmit` — ZERO ERRORS
- [x] 3 helpCenter API routes switched to `canonicaFirestoreAdmin` (search-kb, search-kb-stream, article-embedding)
- [x] `.env` — Canonica env var placeholders added
- [x] `CANONICA_RULES.md` — Rules 6 + 10 updated for multi-product
- [x] `MASTER-EXECUTION-PROMPT.md` — STEP 11 added
- [x] Mutation proposals — approve/reject/implement converted to Firestore transactions (race condition fix)
- [x] Ticket messages — MAX_TICKET_MESSAGES = 500 guard added (doc size safety)
- [x] `contextResolver.ts` — created at `src/lib/platform/`
- [x] pId validation guard — added to `requestBodyComposer` (never null)

### Pending (User Action Items)

- [ ] Create Canonica Firebase project in GCP console
- [ ] Fill `CANONICA_FIREBASE_*` env vars
- [ ] Add env vars to Vercel
- [ ] Move 7 Cloud Function files to `functions-canonica/src/`
- [ ] Copy shared utilities to `functions-canonica/src/`
- [ ] `npm install` in `functions-canonica/`
- [ ] Remove moved files from `functions/src/`
- [ ] Deploy both Firebase projects
- [ ] Create `canonica_clients` collection with MenuList as client #1

See `10-implementation-action-items.md` for detailed instructions.
