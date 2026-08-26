# Answerlattice Post-Rename Operator Checklist

Date: 2026-05-31
Owner: founder/operator

> **Historical boundary:** This checklist records the rename-era operator plan
> and is not executable current setup guidance. Its legacy project IDs, static
> Admin-key instructions, and former deployment sequence are superseded by the
> [Answerlattice Environment Setup Checklist](./deployment/answerlattice-environment-setup-checklist.md).
> Current external server access is keyless through project-local Vercel OIDC
> and Workload Identity Federation; never download or bind a service-account
> private key for Vercel.

Use this only to understand the completed rename history. Do not execute its
commands against a current environment.

## Read Order

1. `__docs__/answerlattice/answerlattice-rename-tracker.md`
2. `__docs__/answerlattice/answerlattice-post-rename-operator-checklist.md`
3. `__docs__/answerlattice/deployment/answerlattice-qa-deployment-runbook.md`
4. `__docs__/answerlattice/system-inventory/README.md`
5. `__docs__/url-routing-architecture/README.md`

## Current Answerlattice Contract

| Area | Current value |
| --- | --- |
| Primary public domain | `https://answerlattice.com` |
| Positioning line | Governed Answer Infrastructure for SaaS Support |
| Product id | `answerlattice` |
| Product code | `AL` |
| Dashboard route | `/answerlattice` |
| Local public website route | `/__answerlattice` |
| API namespace | `/api/answerlattice` |
| Hosted help internal route | `/answerlattice-hosted-help` |
| Widget script | `https://answerlattice.com/widget/v1/answerlattice-widget.js` |
| Widget global | `window.AnswerlatticeWidget` |
| Widget key prefix | `al_` |
| Firebase config file | `firebase-answerlattice.json` |
| Firestore rules/indexes | `firestore-answerlattice.rules`, `firestore-answerlattice.indexes.json` |
| Storage rules | `storage-answerlattice.rules` |
| Cloud Functions package | `functions-answerlattice/` |
| Web helper package | `packages/answerlattice-web/` |

## Domain And DNS

- Add `answerlattice.com` to the Vercel project.
- Add `www.answerlattice.com` and redirect it to `answerlattice.com`.
- Point apex and `www` DNS records to Vercel using the provider values from Vercel.
- Set up mailbox aliases used in the app and website:
  - `hello@answerlattice.com`
  - `partners@answerlattice.com`
  - `noreply@answerlattice.com`
- Configure SPF, DKIM, and DMARC for the mail provider before sending product email.

## Vercel Environment Variables

Set these in Vercel for Preview and Production. Preview should target the QA Firebase project; Production should target the production Firebase project.

### Browser Firebase Config

```bash
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE=separate
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_API_KEY=
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_APP_ID=
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_ANSWERLATTICE_FIRESTORE_DATABASE_ID=
```

### Server Firebase Admin Config

```bash
ANSWERLATTICE_FIREBASE_CLIENT_EMAIL=
ANSWERLATTICE_FIREBASE_PRIVATE_KEY=
```

Server code reuses the browser Firebase mode, project ID, storage bucket, and
optional Firestore database ID. Keep only Admin credentials private.

For local-only testing, `ANSWERLATTICE_GOOGLE_APPLICATION_CREDENTIALS=./answerlattice-service-account.json` is supported, but Vercel should use explicit env credentials instead of a local file.

### Runtime Secrets

```bash
ANSWERLATTICE_CRON_SECRET=
ANSWERLATTICE_MCP_SESSION_SECRET=
ANSWERLATTICE_PUBLIC_BUNDLE_SALT=
ANSWERLATTICE_TRIGGER_NIGHTLY_URL=
ANSWERLATTICE_NIGHTLY_TRIGGER_URL=
```

Only set one nightly trigger URL unless you need a temporary override.
Widget keys are shown once at creation time and are not recoverable by secret-backed copy later.

### MenuList-Side Widget Embed

MenuList loads Answerlattice as an external client only when this key exists:

```bash
NEXT_PUBLIC_ANSWERLATTICE_WIDGET_KEY=al_full_widget_key_shown_once
NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_SCRIPT_SRC=https://answerlattice.com/widget/v1/answerlattice-widget.js
```

Use the full `al_*` value shown immediately after key creation. The dashboard prefix is only for identifying the saved key later. The script source override is optional; use it only for temporary preview testing.

## Firebase Setup

Create or confirm these Firebase projects before any deploy:

- `answerlattice-qa`
- `answerlattice`

For each project:

- Enable Authentication and add the web app config values to Vercel.
- Enable Firestore and Storage.
- Create a service account for server-side Admin access.
- Set Secret Manager value `ANSWERLATTICE_CRON_SECRET`.
- Set the single declared Answerlattice Gemini secret: `ANSWERLATTICE_GEMINI_AI_KEY`. Rotate its managed value in place under the canonical deployment strategy.
- Confirm `firebase-answerlattice.json` points to the right functions source and rule files.
- Deploy only after validation:

```bash
firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json
firebase deploy --only firestore:indexes --project answerlattice-qa --config firebase-answerlattice.json
firebase deploy --only storage --project answerlattice-qa --config firebase-answerlattice.json
firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json
```

Repeat with `answerlattice` only after QA is verified.

## Local Files

- `.env` and `.env.prod` should use only `ANSWERLATTICE_*` and `NEXT_PUBLIC_ANSWERLATTICE_*` keys for this product.
- `answerlattice-service-account.json` is ignored and local-only.
- `functions-answerlattice/node_modules/` is local install output and should not be committed.
- `.next/` is generated output and should not be committed.

## Data And Product Codes

- New Answerlattice records must use `pId: "AL"`.
- Existing development-only test records with the pre-rename product code can be deleted or recreated.
- Do not migrate real customer data yet because no customers are onboarded.

## Validation Before Any Deploy

Run these after changing env values or external setup:

```bash
npx tsc --noEmit --incremental false
npm run lint
npx tsc --noEmit --project functions-answerlattice/tsconfig.json
npm run verify:agent-readiness
npm run verify:answerlattice-pwa
git diff --check
```

## Final Manual Checks

- `https://answerlattice.com` resolves to the Answerlattice public site.
- `https://www.answerlattice.com` redirects to `https://answerlattice.com`.
- `https://answerlattice.com/widget/v1/answerlattice-widget.js` returns the widget script.
- `https://answerlattice.com/llms.txt` and `https://answerlattice.com/llms-full.txt` return Answerlattice content.
- A new widget key starts with `al_`.
- Dashboard login lands under `/answerlattice`.
- Manual scheduler calls require `Authorization: Bearer $ANSWERLATTICE_CRON_SECRET`.
