# Multi-Product Implementation — Historical Action Items

> **Created:** 2025-03-05 | Post-implementation checklist
> **Status:** Superseded setup history. Do not execute this file as a current checklist.
> **Current authority:** `../deployment/answerlattice-environment-setup-checklist.md`

The company-owned projects are `neelvara-answerlattice-qa` and
`neelvara-answerlattice-prod`. The former external project IDs
`answerlattice-qa` and `answerlattice` are retired literal cloud targets.
Current Vercel server authentication uses project-local Workload Identity
Federation, not service-account JSON or static Admin private keys.

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
20. Added Answerlattice Functions KB embedding helpers using Answerlattice Firebase Admin + Answerlattice-owned Gemini API secrets
21. Hardened Answerlattice auth sync so Firebase Auth lookup failures are not mistaken for missing users
22. Hardened direct Answerlattice identity: Answerlattice onboarding writes `pId/productId = 'AL'`, Firebase custom claims include `pId`, and direct Answerlattice `sourceContext` omits cross-product `pId/tId/sId` while MenuList-client writes retain `sourceContext.pId = "ML"`

---

## Historical Action Items (Completed And Superseded)

### 1. Create Answerlattice Firebase Project in GCP Console

1. QA project: `neelvara-answerlattice-qa`.
2. Production project: `neelvara-answerlattice-prod`.
3. Firestore, Authentication, Storage, App Check, required APIs, and billing
   are configured independently in both projects.

### 2. Fill Answerlattice Environment Variables

Open `.env` and fill in the empty Answerlattice values (lines 50-59):

```
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE=separate
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_API_KEY=<from Firebase console>
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID=neelvara-answerlattice-qa   # local/QA
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID=neelvara-answerlattice-prod # production
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_BUCKET=<project-id>.appspot.com
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MESSAGING_SENDER_ID=<from Firebase console>
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_APP_ID=<from Firebase console>
NEXT_PUBLIC_ANSWERLATTICE_FIRESTORE_DATABASE_ID=<optional database id>
ANSWERLATTICE_GCP_PROJECT_ID=<matching company-owned project ID>
ANSWERLATTICE_GCP_SERVICE_ACCOUNT_EMAIL=<project-local runtime service account>
ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_PROVIDER=<project-local WIF provider resource>
```

The server reuses the canonical public mode, project ID, storage bucket, and
optional database ID. Local and QA use `neelvara-answerlattice-qa`; Production
uses `neelvara-answerlattice-prod`. Use `shared` only for explicit
legacy/emulator recovery. Never download, store, or configure a service-account
private-key JSON for Vercel.

### 3. Add Answerlattice Env Vars to Vercel

The shared Vercel project has product-isolated Answerlattice selectors in
custom environment `qa` and Production. Each environment uses its own public
Firebase values and project-local WIF selectors. Do not copy values between
QA, Production, or MenuList.

### 4. Deploy

```bash
# Deploy MenuList functions only when MenuList infrastructure changed.
# Use External Certification Gate 1; do not run a broad --only functions deploy.
npm run verify:functions-deploy-preflight
firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImages,functions:processMenuImagesJob,functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:verifyMenuPublish --non-interactive

# MenuList production Functions require QA evidence and explicit production deploy approval.

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
- [x] No `answerlattice-service-account.json` exists; Vercel uses project-local
      OIDC/WIF and Firebase Functions use Google-managed runtime credentials
- [x] `functions-answerlattice/` has Answerlattice nightly + KB callable functions
- [ ] `tsc --noEmit` still passes with zero errors
- [ ] `npm --prefix functions-answerlattice run build` still passes with zero errors
- [ ] MenuList dashboard loads without errors
- [ ] Help center features work (reads from Answerlattice Firestore)
- [ ] KB search works
- [ ] Both function deployments succeed
