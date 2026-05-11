# Multi-Product Implementation — Action Items for Founder

> **Created:** 2025-03-05 | Post-implementation checklist
> **Status:** Cascade completed codebase changes. Below are YOUR manual action items.

---

## What Cascade Already Did (COMPLETED)

1. Created `src/lib/firebase/canonicaConfig.ts` — Canonica Firebase config
2. Created `src/lib/firebase/canonicaFirebaseClient.ts` — Canonica client SDK
3. Created `src/lib/firebase/canonicaFirebaseAdmin.ts` — Canonica admin SDK
4. Created `src/constants/product.ts` — Product ID constants (ML, CN, SF, GR, VM)
5. Created `src/types/multiProduct.ts` — CCT, PlatformContext, SourceContext, Client types
6. Created `firebase-canonica.json` — Firebase CLI config for Canonica project
7. Created `functions-canonica/` — Directory with package.json, tsconfig, firebaseAdmin, index.ts
8. Updated `src/lib/firebase/functions.ts` — KB callables now use `canonicaFunctions`
9. Updated `src/lib/apiHelper/index.ts` — `pId` injected via `requestBodyComposer`
10. Updated `src/lib/auth/index.ts` — `pId = "ML"` added to NextAuth session
11. Updated `src/middleware/auth.ts` — `pId` added to `sanitizeSession`
12. Updated 19 Canonica DAL files — all switched from `firebaseClient` to `canonicaFirebaseClient`
13. Updated `src/database/queryEmbeddings/index.ts` — switched to `canonicaFirestoreAdmin`
14. Updated `src/constants/database.ts` — Canonica section comment notes separate Firestore
15. Updated `functions/src/decisionBlocksScoring.ts` — removed Canonica nightly block
16. `tsc --noEmit` — ZERO ERRORS
17. Switched 3 helpCenter API routes to `canonicaFirestoreAdmin` (search-kb, search-kb-stream, article-embedding)

---

## YOUR Action Items (Manual Steps Required)

### 1. Create Canonica Firebase Project in GCP Console

1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Name it (e.g., "canonica" or "canonica-prod")
4. Enable Firestore (Native mode)
5. Enable Authentication
6. Enable Storage
7. Note the project ID

### 2. Fill Canonica Environment Variables

Open `.env` and fill in the empty Canonica values (lines 50-59):

```
NEXT_PUBLIC_CANONICA_FIREBASE_MODE=separate
NEXT_PUBLIC_CANONICA_FIREBASE_API_KEY=<from Firebase console>
NEXT_PUBLIC_CANONICA_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
NEXT_PUBLIC_CANONICA_FIREBASE_PROJECT_ID=<project-id>
NEXT_PUBLIC_CANONICA_FIREBASE_STORAGE_BUCKET=<project-id>.appspot.com
NEXT_PUBLIC_CANONICA_FIREBASE_MESSAGING_SENDER_ID=<from Firebase console>
NEXT_PUBLIC_CANONICA_FIREBASE_APP_ID=<from Firebase console>
NEXT_PUBLIC_CANONICA_FIRESTORE_DATABASE_ID=<optional database id>
CANONICA_FIREBASE_MODE=separate
CANONICA_FIREBASE_PROJECT_ID=<project-id>
CANONICA_FIREBASE_PRIVATE_KEY=<from service account JSON>
CANONICA_FIREBASE_CLIENT_EMAIL=<from service account JSON>
CANONICA_FIRESTORE_DATABASE_ID=<optional database id>
```

For local/test environments that intentionally reuse MenuList's DB, set `NEXT_PUBLIC_CANONICA_FIREBASE_MODE=shared` and `CANONICA_FIREBASE_MODE=shared`. Production must use `separate` with Canonica credentials.

Also download the service account JSON and save as `canonica-service-account.json` in project root.

### 3. Add Canonica Env Vars to Vercel

Go to Vercel project settings → Environment Variables → add all `CANONICA_FIREBASE_*` vars.

### 4. Move Cloud Function Files

Move these files from `functions/src/` to `functions-canonica/src/`:

```
Legacy MenuList-side `canonicaNightly.ts` → `functions-canonica/src/canonica/canonicaNightly.ts` (moved; legacy duplicate removed)
functions/src/logic/embedArticleWorker.ts → functions-canonica/src/logic/embedArticleWorker.ts
functions/src/logic/regenerateEmbedding.ts → functions-canonica/src/logic/regenerateEmbedding.ts
functions/src/logic/publishApprovedJob.ts → functions-canonica/src/logic/publishApprovedJob.ts
functions/src/analytics/kbQuality.ts → functions-canonica/src/analytics/kbQuality.ts
functions/src/services/gemini/kbQuality.ts → functions-canonica/src/services/gemini/kbQuality.ts
functions/src/types/knowledgeBase.types.ts → functions-canonica/src/types/knowledgeBase.types.ts
```

Also copy shared utilities:

```
functions/src/constants/database.ts → functions-canonica/src/constants/database.ts
functions/src/constants/features.ts → functions-canonica/src/constants/features.ts
functions/src/utils/aiUtils.ts → functions-canonica/src/utils/aiUtils.ts
functions/src/genAiClient.ts → functions-canonica/src/genAiClient.ts
functions/src/config/secrets.ts → functions-canonica/src/config/secrets.ts
```

Then update `functions-canonica/src/index.ts` to export the moved functions.

### 5. Install functions-canonica Dependencies

```bash
cd functions-canonica && npm install
```

### 6. Remove Moved Files from MenuList Functions

After verifying functions-canonica works, remove:

- legacy MenuList-side Canonica scheduler directory (done for `canonicaNightly`; do not recreate Canonica schedulers in MenuList functions)
- KB function exports from `functions/src/triggers/shared.ts`
- KB function exports from `functions/src/index.ts`

### 7. Deploy

```bash
# Deploy MenuList functions
firebase deploy --only functions --project ecomsai

# Deploy Canonica functions
cd functions-canonica && npm run deploy
```

### 8. Create Canonica Client Registry

In Canonica Firestore, create collection `canonica_clients` with MenuList as client #1:

```json
{
  "clientId": "ml_001",
  "clientName": "MenuList",
  "tId": 1,
  "sId": 1,
  "secretKey": "<generate-a-secret>",
  "sourcePId": "ML",
  "active": true
}
```

---

## Verification Checklist

After completing above:

- [ ] Canonica Firebase project exists in GCP console
- [ ] All `CANONICA_FIREBASE_*` env vars filled in `.env`
- [ ] Same vars added to Vercel
- [ ] `canonica-service-account.json` exists in project root
- [ ] `functions-canonica/` has all moved files + dependencies installed
- [ ] `tsc --noEmit` still passes with zero errors
- [ ] MenuList dashboard loads without errors
- [ ] Help center features work (reads from Canonica Firestore)
- [ ] KB search works
- [ ] Both function deployments succeed
