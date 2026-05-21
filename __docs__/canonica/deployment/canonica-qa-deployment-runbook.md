# Canonica QA Deployment Runbook

> Last updated: 2026-05-21
> Environment: QA / staging
> Firebase project: `canonica-qa`
> Product staging domain: `ecomsai.com`
> Product production domain: `canonica.app`

This runbook records the Canonica QA infrastructure setup and the repeatable production checklist. Do not store service account private keys, cron secrets, API keys, OAuth client secrets, or SMTP secrets in this document.

## Current QA State

Canonica is running as a separate product inside the shared Next.js/Vercel codebase.

| Area | QA value |
| --- | --- |
| Canonica Firebase mode | `separate` |
| Firebase project | `canonica-qa` |
| Firestore database | `(default)` |
| Firestore location | `nam5` |
| App Engine region | `us-central` |
| Cloud Functions region | `us-central1` |
| Cloud Functions codebase | `canonica` |
| Cloud Functions source | `functions-canonica/` |
| Firestore rules file | `firestore-canonica.rules` |
| Firestore indexes file | `firestore-canonica.indexes.json` |
| Storage rules file | `storage-canonica.rules` |
| Firebase CLI config | `firebase-canonica.json` |

QA Auth, Firestore, Storage, Functions, Eventarc, Cloud Tasks, Cloud Scheduler, Artifact Registry, Secret Manager, Pub/Sub, Cloud Run, and App Engine are enabled.

## 2026-05-21 Product-Separation Verification

Current implementation:

- Canonica dashboard routes resolve Canonica scope from `productAccounts.CN` on the shared NextAuth profile, or from the Canonica `users` document when running in `CANONICA_FIREBASE_MODE=separate`.
- Canonica onboarding writes tenant, store, user, subscription, widget key, and summaries to the Canonica Firebase project, then writes only the `productAccounts.CN` bridge back to the default auth user document.
- Canonica widget config/key APIs use Canonica Firestore in separate mode.
- Public widget runtime keys validate only against Canonica `canonicaWidgetApi` for widget routes.
- Canonica AI operation logs write to `canonica_aiOperations` in the Canonica Firebase project.
- MenuList owner navigation does not expose Canonica management by default and no longer mounts a Canonica widget host from the shared MenuList layout.

Verification performed:

- Created a Canonica QA test user in default Auth for the NextAuth bridge and in Canonica Auth for Canonica Firebase claims.
- Created Canonica tenant/store/user data under `canonica-qa`.
- Created, queried, updated, and messaged a support ticket under Canonica Firestore.
- Created and updated a changelog page under Canonica Firestore.
- Confirmed the same ticket and changelog documents were not present in the default MenuList Firebase project.
- Called `/api/widget/config` with a real `cn_*` Canonica widget key and received remote config with route blocklist values.
- Deployed `firestore-canonica.rules` to `canonica-qa` after allowing tenant write roles to manage their own changelog documents and tenant-scoped reads of `canonica_aiOperations`.

Local route verification:

- `Host: ecomsai.com` + `/` rewrites to `/sites/canonica`.
- `Host: ecomsai.com` + `/dashboard` rewrites to `/canonica/dashboard`.
- `Host: menulist.online` + `/dashboard` stays in the MenuList owner app.
- `/__canonica` still renders the Canonica site directly for local/dev checks.

## 2026-05-21 Full-Flow QA Pass

Disposable QA account tested:

- Created a default Firebase Auth user and default auth `users/{uid}` record.
- Called the real `/api/canonica/onboard` route, which executed the Canonica onboarding transaction and created Canonica tenant, store, user, subscription, widget key, and summary docs in `canonica-qa`.
- Verified immediate post-onboarding session bridge returns nested `productAccounts.CN`.
- Called `/api/auth/set-claims` with `productId: "CN"` and verified Canonica custom token claims use `pId: "CN"`, the Canonica tenant ID, and the Canonica store ID.
- Signed into the Canonica Firebase client SDK with the returned Canonica custom token and exercised Firestore rules directly.

API/runtime flows tested:

- `GET /api/canonica/widget-config`
- `PUT /api/canonica/widget-config`
- `POST /api/canonica/widget-key`
- `GET /api/widget/config`
- widget runtime ETag `304`
- widget runtime origin denial `403`
- `POST /api/widget/search` validation path without AI generation
- `POST /api/widget/feedback` with a seeded `aiSearchHistory` record
- `POST /api/canonica/predictive-help` feature-gated graceful `204`
- Canonica public API feature gate `404`
- Canonica translation feature gate `403`
- `POST /api/canonica/tenant-summary`

Firestore client-rule flows tested against `canonica-qa`:

- Allowed tenant-scoped create/read/update for support tickets, changelog pages through a client transaction, KB articles, KB sections, KB generation jobs, KB staging sections/chunks, chat sessions, feedback, AI search history, Canonica entities, relations, canonical answers, releases, mutation proposals, signal events, entity search index, entity candidates, predictive triggers, cache versions, KB categories, and `platformSummary/trustMetrics_{tId}_{sId}`.
- Allowed tenant-scoped create/read for Canonica audit logs, with updates intentionally denied.
- Rejected cross-tenant support ticket and cross-tenant changelog writes with `permission-denied`.

Local route flows tested:

- `/__canonica`
- `/__canonica/dashboard`
- `/__canonica/widget`
- `/__canonica/tickets`
- `/__canonica/changelog`
- `/__canonica/settings`
- `/dashboard` remains MenuList.

Cleanup performed:

- Transient test documents were deleted where safe.
- Disposable Canonica tenant/store/user were marked inactive/deleted.
- Disposable default auth user was marked inactive/deleted and disabled in Firebase Auth.

Fix found during this pass:

- The auth session context cache could briefly serve a pre-onboarding user after the onboarding transaction. `getAuthSessionUserContext()` now bypasses cached users that still have no tenant/store so the immediate post-onboarding session can see `productAccounts.CN`.
- A QA harness initially attempted to update `canonica_auditLogs`, but audit logs are append-only by design. The final client-rule test was rerun using the intended create/read-only audit-log contract and passed.

## 2026-05-21 Client-Product Separation Cleanup

The temporary client-product-specific widget host and changelog connector have been removed from runtime code. Canonica remains available through its own routes/domains, while client products integrate the widget only by embedding the generic public script with a real Canonica-issued `canonicaWidgetApi` key from their own codebase.

Follow-up verification for this cleanup:

- `/dashboard` remains the MenuList owner app and should not mount a Canonica widget from the shared layout.
- Canonica dashboard routes remain available through `/__canonica/*` locally and Canonica host rewrites in QA.
- Widget runtime endpoints continue to accept only normal `canonicaWidgetApi` keys.

## 2026-05-20 Verification Log

Code and config validation:

- `npx tsc --noEmit --incremental false` passed.
- `npm --prefix functions-canonica run build` passed.
- `git diff --check` passed.
- `firestore-canonica.indexes.json` parses with 37 indexes and 0 field overrides.

QA deploy verification:

- Firestore rules deployed and compiled.
- Storage rules deployed and compiled.
- Canonica functions deployed successfully to `canonica-qa`.
- Live composite index count is 37.
- Support-ticket indexes are `READY`:
  - `deleted ASC, createdOn DESC`
  - `tId ASC, sId ASC, deleted ASC, createdOn DESC`
- Manual scheduler smoke test returned `status: "skipped"`, `enabled: false`, and wrote `canonica_schedulerRunLogs/{runLogId}` with `product: "canonica"`, `trigger: "manual"`, and `phase: "completed"`.

Local Chrome smoke test:

- `http://localhost:3000/__canonica` rendered the Canonica marketing home.
- `http://localhost:3000/canonica/dashboard` rendered the Canonica dashboard.
- `http://localhost:3000/canonica/widget` rendered the widget management route.
- `http://localhost:3000/canonica/settings` rendered the Canonica settings route.
- `http://localhost:3000/canonica/knowledge-base` rendered the Canonica knowledge-base route.
- `http://localhost:3000/canonica/tickets` rendered without the previous ticket realtime-sync warning after the support-ticket indexes became ready.

## Deployed QA Resources

Firestore rules and indexes:

- `firestore-canonica.rules` deployed to `canonica-qa`.
- `firestore-canonica.indexes.json` deployed to `canonica-qa`.
- Current index file has 37 composite indexes and no field overrides.

Storage rules:

- `storage-canonica.rules` deployed to `canonica-qa`.
- Rules are Canonica-only and deny unknown paths by default.
- Allowed tenant-scoped paths:
  - `/chatSessions/chatimages/{tId}/{sId}/{imageId}`
  - `/supportTickets/documents/{tId}/{sId}/{fileId}`
  - `/supportTickets/messages/{tId}/{sId}/{fileId}`
  - `/changelog/files/{tId}/{sId}/{fileId}`
  - `/ingestion_source_files/{tId}/{sId}/{fileId}`

Functions deployed in `us-central1`:

| Function | Trigger | Memory | Runtime |
| --- | --- | --- | --- |
| `canonicaNightly` | scheduled | 512 MiB | nodejs22 |
| `triggerCanonicaNightly` | HTTPS | 512 MiB | nodejs22 |
| `processIntegrationEvent` | Firestore create | 256 MiB | nodejs22 |
| `embedArticleWorker` | task queue | 1 GiB | nodejs22 |
| `publishApprovedJobFn` | callable | 1 GiB | nodejs22 |
| `regenerateEmbedding` | callable | 1 GiB | nodejs22 |

Operational configuration:

- Artifact Registry cleanup policy is set for `gcf-artifacts` in `us-central1`, deleting function images older than 7 days.
- Secret Manager secret `CANONICA_CRON_SECRET` exists in `canonica-qa`.
- The `triggerCanonicaNightly` function has access to `CANONICA_CRON_SECRET`.
- Manual scheduler auth uses `Authorization: Bearer $CANONICA_CRON_SECRET`.

## Commands Used For QA

Rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage --project canonica-qa --config firebase-canonica.json --non-interactive
```

App Engine application:

```bash
gcloud app create --project canonica-qa --region=us-central --quiet
```

Artifact cleanup:

```bash
firebase functions:artifacts:setpolicy --project canonica-qa --config firebase-canonica.json --location us-central1 --days 7 --force
```

Secret Manager:

```bash
gcloud services enable secretmanager.googleapis.com --project canonica-qa --quiet
gcloud secrets create CANONICA_CRON_SECRET --project canonica-qa --replication-policy=automatic
gcloud secrets versions add CANONICA_CRON_SECRET --project canonica-qa --data-file=<local-secret-file>
```

Functions:

```bash
npm --prefix functions-canonica run build
firebase deploy --only functions --project canonica-qa --config firebase-canonica.json --non-interactive
```

Inventory check:

```bash
firebase functions:list --project canonica-qa --config firebase-canonica.json
```

When Firebase CLI returns `409 index already exists`, verify live indexes before treating it as a failure. On 2026-05-20 the live Canonica QA index set matched `firestore-canonica.indexes.json` even though Firebase CLI still returned a 409 while reconciling existing vector indexes. Missing individual indexes can be created directly:

```bash
gcloud firestore indexes composite create \
  --project=canonica-qa \
  --database='(default)' \
  --collection-group=supportTickets \
  --query-scope=COLLECTION \
  --field-config=field-path=deleted,order=ascending \
  --field-config=field-path=createdOn,order=descending

gcloud firestore indexes composite create \
  --project=canonica-qa \
  --database='(default)' \
  --collection-group=supportTickets \
  --query-scope=COLLECTION \
  --field-config=field-path=tId,order=ascending \
  --field-config=field-path=sId,order=ascending \
  --field-config=field-path=deleted,order=ascending \
  --field-config=field-path=createdOn,order=descending
```

Manual scheduler smoke test:

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $CANONICA_CRON_SECRET" \
  -H "Content-Type: application/json" \
  https://us-central1-canonica-qa.cloudfunctions.net/triggerCanonicaNightly
```

Expected QA result while `ENABLE_CANONICA_NIGHTLY=false`:

```json
{
  "status": "skipped",
  "enabled": false,
  "trigger": "manual"
}
```

The manual trigger must also write a matching document under `canonica_schedulerRunLogs/{runLogId}` with:

- `product: "canonica"`
- `trigger: "manual"`
- `status: "skipped"`
- `phase: "completed"`
- `enabled: false`

## Local Development Notes

Local Canonica admin code supports two safe paths:

1. Valid explicit `CANONICA_FIREBASE_*` service account env vars.
2. `CANONICA_GOOGLE_APPLICATION_CREDENTIALS=./canonica-service-account.json` for local QA testing.
3. Local Application Default Credentials in non-production only.

If `CANONICA_FIREBASE_PRIVATE_KEY` is malformed in local `.env`, the app ignores that invalid local credential and tries the Canonica service-account JSON path before ADC. Production does not use the local ADC fallback; production must have valid explicit Canonica credentials.

`CANONICA_GOOGLE_APPLICATION_CREDENTIALS` should point to an ignored local service account JSON file only when needed. Do not commit service account JSON files.

## Production Setup Checklist

Before production launch on `canonica.app`:

1. Create the production Canonica Firebase/GCP project.
2. Enable Firebase Auth, Firestore, Storage, Functions, Eventarc, Cloud Tasks, Cloud Scheduler, Cloud Run, Pub/Sub, Artifact Registry, Secret Manager, and App Engine.
3. Choose App Engine region before creating the app. This is effectively irreversible.
4. Add production web app config to Vercel production env:
   - `NEXT_PUBLIC_CANONICA_FIREBASE_MODE=separate`
   - `NEXT_PUBLIC_CANONICA_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_CANONICA_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_CANONICA_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_CANONICA_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_CANONICA_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_CANONICA_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_CANONICA_FIREBASE_MEASUREMENT_ID`
5. Add production server env to Vercel production env:
   - `CANONICA_FIREBASE_MODE=separate`
   - `CANONICA_FIREBASE_PROJECT_ID`
   - `CANONICA_FIREBASE_CLIENT_EMAIL`
   - `CANONICA_FIREBASE_PRIVATE_KEY`
   - `CANONICA_FIRESTORE_DATABASE_ID` only if using a non-default database.
6. Create production `CANONICA_CRON_SECRET` in Secret Manager.
7. Deploy Firestore rules, Firestore indexes, Storage rules, and functions with `firebase-canonica.json` against the production Canonica project.
8. Run the manual scheduler smoke test and verify the `canonica_schedulerRunLogs/{runLogId}` document.
9. Keep `ENABLE_CANONICA_NIGHTLY=false` until production tenant data and alerts are verified.
10. Enable Canonica feature flags one by one and verify logs/cost after each change.

## Production Warnings

- Do not reuse QA service account credentials in production.
- Do not store service account JSON or secret values in docs or Git.
- Do not point production Canonica at the MenuList Firebase project.
- Do not add Canonica scheduled functions to MenuList functions; Canonica scheduled work stays in `functions-canonica/`.
- Do not enable `ENABLE_CANONICA_NIGHTLY` until manual trigger logs, tenant summary discovery, and cost expectations are verified in production.
