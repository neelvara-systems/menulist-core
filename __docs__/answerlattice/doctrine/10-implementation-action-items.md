# Multi-Product Implementation — Action Items for Founder

> **Created:** 2025-03-05 | Post-implementation checklist
> **Status:** Core codebase split is complete. Remaining items are deployment/configuration actions.

---

## What Cascade Already Did (COMPLETED)

1. Created `src/lib/firebase/answerlatticeConfig.ts` — Answerlattice Firebase config
2. Created `src/lib/firebase/answerlatticeFirebaseClient.ts` — Answerlattice client SDK
3. Created `src/lib/firebase/answerlatticeFirebaseAdmin.ts` — Answerlattice admin SDK
4. Created `src/constants/product.ts` — Product ID constants (ML, AL, SF, GR, KS)
5. Created `src/types/multiProduct.ts` — CCT, PlatformContext, SourceContext, Client types
6. Created `firebase-answerlattice.json` — Firebase CLI config for Answerlattice project
7. Created `functions-answerlattice/` — Directory with package.json, tsconfig, firebaseAdmin, index.ts
8. Updated `src/lib/firebase/functions.ts` — KB callables now use `answerlatticeFunctions`
9. Updated `src/lib/apiHelper/index.ts` — `pId` injected via `requestBodyComposer`
10. Updated `src/lib/auth/index.ts` — NextAuth session derives `pId` from user/store/tenant product identity; MenuList defaults to `ML`, Answerlattice direct workspaces resolve to `AL`
11. Updated `src/middleware/auth.ts` — `pId` added to `sanitizeSession`
12. Updated 19 Answerlattice DAL files — all switched from `firebaseClient` to `answerlatticeFirebaseClient`
13. Updated `src/database/queryEmbeddings/index.ts` — switched to `answerlatticeFirestoreAdmin`
14. Updated `src/constants/database.ts` — Answerlattice section comment notes separate Firestore
15. Updated `functions/src/decisionBlocksScoring.ts` — removed Answerlattice nightly block
16. `tsc --noEmit` — ZERO ERRORS
17. Switched 3 helpCenter API routes to `answerlatticeFirestoreAdmin` (search-kb, search-kb-stream, article-embedding)
18. Added `src/lib/answerlattice/documentComposer.ts` — Answerlattice DAL writes now force `pId = 'AL'` and attach `sourceContext`, `traceId`, and `requestId`; source product scope (`pId/tId/sId`) is accepted only when explicitly provided by session/CCT context
19. Exported KB callables from `functions-answerlattice/src/index.ts`: `embedArticleWorker`, `regenerateEmbedding`, `publishApprovedJobFn`
20. Added Answerlattice Functions KB embedding helpers using Answerlattice Firebase Admin + Vertex AI
21. Hardened Answerlattice auth sync so Firebase Auth lookup failures are not mistaken for missing users
22. Hardened direct Answerlattice identity: Answerlattice onboarding writes `pId/productId = 'AL'`, Firebase custom claims include `pId`, and direct Answerlattice `sourceContext` omits cross-product `pId/tId/sId` while MenuList-client writes retain `sourceContext.pId = "ML"`

---

## YOUR Action Items (Manual Steps Required)

### 1. Create Answerlattice Firebase Project in GCP Console

1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Name it (e.g., "answerlattice" or "answerlattice-prod")
4. Enable Firestore (Native mode)
5. Enable Authentication
6. Enable Storage
7. Note the project ID

### 2. Fill Answerlattice Environment Variables

Open `.env` and fill in the empty Answerlattice values (lines 50-59):

```
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE=separate
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_API_KEY=<from Firebase console>
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID=answerlattice-qa  # local/preview
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID=answerlattice     # production
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_BUCKET=<project-id>.appspot.com
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MESSAGING_SENDER_ID=<from Firebase console>
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_APP_ID=<from Firebase console>
NEXT_PUBLIC_ANSWERLATTICE_FIRESTORE_DATABASE_ID=<optional database id>
ANSWERLATTICE_FIREBASE_MODE=separate
ANSWERLATTICE_FIREBASE_PROJECT_ID=answerlattice-qa              # local/preview
ANSWERLATTICE_FIREBASE_PROJECT_ID=answerlattice                 # production
ANSWERLATTICE_FIREBASE_PRIVATE_KEY=<from service account JSON>
ANSWERLATTICE_FIREBASE_CLIENT_EMAIL=<from service account JSON>
ANSWERLATTICE_FIRESTORE_DATABASE_ID=<optional database id>
```

The active local and preview path uses `separate` mode with `answerlattice-qa`. Production uses `separate` mode with `answerlattice`. Use `shared` only for explicit legacy/emulator recovery.

Also download the service account JSON and save as `answerlattice-service-account.json` in project root.

### 3. Add Answerlattice Env Vars to Vercel

Go to Vercel project settings → Environment Variables → add all `ANSWERLATTICE_FIREBASE_*` vars.

### 4. Deploy

```bash
# Deploy MenuList functions (local/preview target)
firebase deploy --only functions --project ecomsai

# Deploy MenuList functions (production target)
firebase deploy --only functions --project menulist

# Deploy Answerlattice functions
cd functions-answerlattice && npm run deploy:qa
cd functions-answerlattice && npm run deploy:prod
```

### 5. Create Answerlattice Client Registry

In Answerlattice Firestore, create collection `answerlattice_clients` with MenuList as client #1:

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

- [ ] Answerlattice Firebase project exists in GCP console
- [ ] All `ANSWERLATTICE_FIREBASE_*` env vars filled in `.env`
- [ ] Same vars added to Vercel
- [ ] `answerlattice-service-account.json` exists in project root
- [x] `functions-answerlattice/` has Answerlattice nightly + KB callable functions
- [ ] `tsc --noEmit` still passes with zero errors
- [ ] `npm --prefix functions-answerlattice run build` still passes with zero errors
- [ ] MenuList dashboard loads without errors
- [ ] Help center features work (reads from Answerlattice Firestore)
- [ ] KB search works
- [ ] Both function deployments succeed
