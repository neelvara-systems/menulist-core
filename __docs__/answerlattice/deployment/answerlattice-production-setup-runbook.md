# Answerlattice Production Setup Runbook

> **Last updated:** August 20, 2026
> **Firebase project:** `neelvara-answerlattice-prod`
> **Firebase alias:** `answerlattice-prod`
> **Public domains:** `answerlattice.com`, `www.answerlattice.com`
> **Status:** preparation only; production cloud state is not currently readable

This runbook explains the production-only execution sequence. Track completion
in [Answerlattice Environment Setup Checklist](./answerlattice-environment-setup-checklist.md); do not maintain a second checklist here.

## Entry Conditions

Do not start a production mutation until all are true:

1. `neelvara-answerlattice-qa` is visible to the setup account and QA setup has current
   readback.
2. The exact source revision has passed the focused Answerlattice gates and QA
   deploy.
3. Project `neelvara-answerlattice-prod` is visible to the setup account.
4. Production project number, organization, billing, budgets, Firestore
   location, existing resources, and IAM have been inventoried.
5. The requested deploy/provider action has explicit scoped approval.

The currently reachable production website proves only Vercel domain/routing
availability. It does not prove production Firebase, WIF, secrets, rules,
indexes, Functions, App Check, provider, or recovery readiness.

## Production Sequence

1. **Inventory without mutation.** Read project metadata, enabled APIs,
   Firebase apps, Auth domains, Firestore/Storage, rules, indexes, Functions,
   service accounts, keys, WIF, Secret Manager names/status, budgets, and
   provider ownership.
2. **Prepare keyless identity.** Use the project-owned
   `answerlattice-vercel-prod` service account, WIF pool
   `answerlattice-vercel`, and provider `answerlattice-prod`. Keep static Admin
   credentials absent.
3. **Enter production selectors.** Use the Answerlattice rows in
   `.env.production.example` and Vercel Production only. Do not import the QA
   environment wholesale.
4. **Create production secrets.** Generate independent values, add enabled
   Secret Manager versions, and bind only the Functions that declare them.
5. **Audit indexes.** Compare remote and
   `firestore-answerlattice.indexes.json`; resolve conflicts deliberately and
   never use `--force` without an approved deletion plan.
6. **Run source gates.** At minimum:

   ```bash
   npm run typecheck:answerlattice
   npm --prefix functions-answerlattice run build
   npm run test:vercel-workload-identity
   npm run verify:env-targets
   npm run verify:answerlattice-backup-recovery
   ```

7. **Deploy only approved Firebase targets.** Use project ID
   `neelvara-answerlattice-prod` and config `firebase-answerlattice.json`. A typical full infrastructure
   command is shown for reference, not as standing authorization:

   ```bash
   firebase deploy \
     --only firestore:rules,firestore:indexes,storage,functions:answerlattice \
     --project neelvara-answerlattice-prod \
     --config firebase-answerlattice.json \
     --non-interactive
   ```

   If remote index audit requires a narrower sequence, deploy rules, Storage,
   approved indexes, and approved Functions targets separately.

8. **Read back deployed state.** Verify active rules content/hash, Storage
   rules, index readiness, exact Functions, runtime service identities,
   scheduler/task resources, and secret bindings.
9. **Certify hosted identity.** Verify `/api/version`, environment selectors,
   OIDC/STS, custom-token signing, Firestore, Storage, and admitted task paths
   on the production deployment.
10. **Certify recovery.** Run the project-confirmed production backup/restore
    procedure without touching QA or MenuList.

## Provider Boundary

Core infrastructure readiness does not require enabling every optional
provider. Keep any provider disabled when its legal ownership, account access,
secret, webhook, delivery, spend, or real-client evidence is not ready. Record
the disabled state in the checklist instead of creating placeholders or
borrowing MenuList/QA credentials.

## Rollback Boundary

Before deployment, capture the active production ruleset, index inventory,
Functions inventory, env selector inventory, and backup resource. A rollback
must restore the previously verified production state; it must never redirect
production to `neelvara-answerlattice-qa` or attach production domains to the
custom QA environment.
