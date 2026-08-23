# Answerlattice Backup and Recovery Runbook

> **Status:** QA and production schedules active; available-snapshot recovery drills and cleanup complete; repeat tenant-lineage validation after a non-empty backup exists
> **Last Updated:** 2026-08-23
> **Scope:** Answerlattice Firestore managed backups and isolated restore rehearsal

## Recovery Objective

- Initial recovery point objective: one day, based on a daily managed backup.
- Initial recovery time objective: eight hours, until a timed restore rehearsal proves a lower number.
- Managed-backup retention: 14 weeks.
- Restore target: a new `answerlattice-recovery-*` Firestore database only.
- The default database must never be used as the rehearsal restore target.

These are operating targets, not verified production claims. The first QA cloud
restore met the eight-hour structural target with an observed upper-bound RTO of
32 minutes 7 seconds. The August 23 closeout completed TTL, Storage, Auth-export,
and cleanup evidence for the available empty snapshots. Tenant-lineage recovery
must be repeated after a later backup contains workspace data.

## Boundaries

Firestore managed backups do not cover all Answerlattice recovery requirements:

- Firestore backup restore does not restore TTL policies. Reapply and read back `firestore-answerlattice.indexes.json` TTL configuration after recovery.
- Firebase Storage objects require separate bucket retention, soft-delete/versioning, lifecycle, IAM, and recovery verification.
- Firebase Authentication users require a separate encrypted, access-controlled export procedure.
- Secret Manager values, OAuth credentials, DNS, Vercel configuration, and provider configuration are not Firestore data.
- Never commit backup exports, Auth exports, service-account JSON, secret values, or recovered tenant data.

## Prerequisites

1. Install the current Google Cloud CLI in the operator environment or use Google Cloud Shell.
2. Authenticate an operator with project visibility and Firestore backup/restore permissions.
3. Confirm the intended stage:
   - `qa` maps only to `neelvara-answerlattice-qa`.
   - `prod` maps only to `neelvara-answerlattice-prod`.
4. Keep `ANSWERLATTICE_BACKUP_APPLY` unset during inspection.

This workstation still has no `gcloud` binary. Firebase CLI `14.15.1` supports
schedule readback, backup readback, database restore, restored-database status,
and index readback and was used for the first QA structural rehearsal. The
repository helper still requires `gcloud` (or Cloud Shell) for its guarded
preflight workflow and percentage-level operation progress.

## Read-Only Preflight

Run against QA first:

```bash
npm run answerlattice:backup -- preflight qa
```

Expected result:

- an active gcloud account is printed;
- project `neelvara-answerlattice-qa` is accessible;
- the `(default)` database is described;
- existing managed-backup schedules are listed;
- existing backups and their states are listed.

Stop if the project is not exact, the database cannot be described, authentication is missing, or the operator cannot list backup state.

## Configure the Daily Schedule

Only run after the read-only preflight succeeds:

```bash
ANSWERLATTICE_BACKUP_APPLY=1 \
  npm run answerlattice:backup -- ensure-daily qa \
  --confirm-project neelvara-answerlattice-qa
```

The command creates a daily 14-week schedule only when no managed-backup schedule exists. It accepts an existing policy only when the API reports exactly one daily schedule with `8467200s` retention. Any weekly, shorter-retention, or additional schedule is printed and stops the command for manual review rather than being silently edited or supplemented.

Repeat for production only after QA schedule and restore evidence are approved:

```bash
ANSWERLATTICE_BACKUP_APPLY=1 \
  npm run answerlattice:backup -- ensure-daily prod \
  --confirm-project neelvara-answerlattice-prod
```

After the first scheduled run, rerun `preflight` and record the full ready backup resource name.

### Current QA Schedule Evidence

Read back on August 20, 2026:

- project: `neelvara-answerlattice-qa`;
- database: `(default)`;
- recurrence: daily;
- retention: `8467200s` (14 weeks);
- schedule resource:
  `projects/neelvara-answerlattice-qa/databases/(default)/backupSchedules/ec353e59-20bc-458e-b79e-a384e093ab07`.

The first scheduled backup reached `READY` on August 21, 2026:

- backup resource:
  `projects/neelvara-answerlattice-qa/locations/nam5/backups/36bebe19-9fd9-4f25-9609-d0facd1c34f2`;
- snapshot time: `2026-08-21T12:47:41.894133Z`;
- expiry time: `2026-11-27T12:47:41.894133Z`.

## Isolated Restore Rehearsal

Use a ready backup and the stage-specific new dated destination. QA uses
`answerlattice-recovery-*`; production uses `answerlattice-prod-recovery-*`.

```bash
ANSWERLATTICE_BACKUP_APPLY=1 \
  npm run answerlattice:backup -- restore-rehearsal \
  qa \
  projects/neelvara-answerlattice-qa/locations/LOCATION/backups/BACKUP_ID \
  answerlattice-recovery-YYYYMMDD \
  --confirm-project neelvara-answerlattice-qa
```

```bash
ANSWERLATTICE_BACKUP_APPLY=1 \
  npm run answerlattice:backup -- restore-rehearsal \
  prod \
  projects/neelvara-answerlattice-prod/locations/LOCATION/backups/BACKUP_ID \
  answerlattice-prod-recovery-YYYYMMDD \
  --confirm-project neelvara-answerlattice-prod
```

The tool rejects:

- a backup belonging to another project;
- a short or malformed backup identifier;
- `(default)` or any destination outside the selected stage's recovery prefix;
- an existing destination database;
- a cloud mutation without `ANSWERLATTICE_BACKUP_APPLY=1`.
- a confirmation project that is absent or does not exactly match the selected stage.

It does not switch application traffic, alter environment variables, copy secrets, delete the recovery database, or overwrite live data.

### Current QA Structural Restore Evidence

Completed on August 21, 2026:

- operator: `admin@neelvara.com` through the authenticated Firebase CLI;
- source project/database: `neelvara-answerlattice-qa` / `(default)`;
- destination database: `answerlattice-recovery-20260821`;
- location: `nam5`;
- restore start: `2026-08-21T15:12:44Z`;
- completion observed: `2026-08-21T15:44:51Z`;
- observed upper-bound RTO: 32 minutes 7 seconds;
- measured RPO at restore start: 2 hours 25 minutes 2 seconds;
- operation state: `COMPLETED`;
- destination delete protection: `ENABLED`;
- source composite indexes: 100;
- restored composite indexes: 100;
- source field overrides: 33, including 18 TTL policies;
- restored field overrides: 15, with 0 TTL policies, matching the documented
  Firestore backup limitation.

No runtime, Vercel environment, widget, API, scheduler, or public route was
pointed at the recovery database. It remained delete-protected until the
August 23 closeout recorded below.

### Current Production Structural Restore Evidence

Completed on August 21, 2026:

- operator: `admin@neelvara.com` through the authenticated Firebase CLI;
- source project/database: `neelvara-answerlattice-prod` / `(default)`;
- source backup:
  `projects/neelvara-answerlattice-prod/locations/nam5/backups/5bad4389-5ae1-42b8-bce3-1e1ec7720723`;
- source snapshot time: `2026-08-21T13:41:43.122400Z`;
- destination database: `answerlattice-prod-recovery-20260821`;
- location: `nam5`;
- restore start: `2026-08-21T16:19:59Z`;
- completion observed: `2026-08-21T17:06:56Z`;
- observed upper-bound RTO: 46 minutes 57 seconds;
- measured RPO at restore start: 2 hours 38 minutes 16 seconds;
- operation state: `COMPLETED`;
- destination delete protection: `ENABLED`;
- source composite indexes: 100;
- restored composite indexes: 100, structurally equal to the source inventory;
- source non-TTL field overrides: 15;
- restored non-TTL field overrides: 15, structurally equal to the source
  inventory;
- source TTL policies: 18;
- restored TTL policies: 0, matching the documented Firestore backup
  limitation.

No runtime, Vercel environment, widget, API, scheduler, or public route was
pointed at the production recovery database. The live production `(default)`
database remained unchanged. The isolated database remained delete-protected
until the August 23 closeout recorded below.

### August 23 Recovery Closeout

- Both restored databases exposed all 100 expected composite indexes and zero
  root document collections. The empty data state matches backups captured
  before workspace data existed; tenant-lineage validation is deferred to the
  first later backup containing real workspace documents.
- All 18 TTL policies from `firestore-answerlattice.indexes.json` were applied
  to each named recovery database and read back in state `ACTIVE`.
- Each primary Firebase Storage bucket retained a seven-day soft-delete policy.
  A labelled synthetic object passed upload, exact readback, soft delete,
  restore, second readback, and live-object cleanup in both environments. The
  soft-deleted generations expire on August 30, 2026.
- Firebase Auth exportability passed in a mode-`0700` temporary directory: QA
  exported one user and production exported zero. Counts only were recorded;
  plaintext exports were deleted immediately.
- With explicit owner approval, delete protection was disabled only on
  `answerlattice-recovery-20260821` and
  `answerlattice-prod-recovery-20260821`. Both databases were deleted, and
  readback from both projects lists only `(default)`. Their managed backups
  remain retained and can recreate isolated recovery databases.

## Restore Validation

Record start time, completion time, backup creation time, and measured RPO/RTO. Then verify with a least-privilege read-only recovery credential:

1. Workspace and store counts match the expected backup point.
2. At least five known workspaces retain exact `pId`, `tId`, and `sId` isolation.
3. Approved canonical answers retain source links, status, version, scope, owner, and review data.
4. Knowledge articles, FAQs, product surfaces, releases, signals, and compact summaries are internally consistent.
5. A private source remains inaccessible from a public or foreign-tenant context.
6. No recovery database is connected to a public widget, API, MCP, scheduler, or production environment.
7. TTL policy is reapplied and read back from the source-controlled Firebase configuration.
8. Storage references are sampled against the separately restored or retained Storage objects.

The rehearsal fails if any tenant boundary, canonical-answer lineage, source permission, required collection, or referenced object is missing.

## Separate Recovery Controls

Before production certification:

- enable and verify the approved Firebase Storage soft-delete/versioning and lifecycle posture;
- rehearse retrieval of representative private and public objects without broadening IAM;
- define an encrypted Firebase Auth export location, access list, retention period, and deletion receipt;
- use a current Firebase CLI for Auth export/import work and validate MFA handling before relying on it;
- record Secret Manager, DNS, OAuth, Vercel, email, payment, and model-provider reconstruction steps without storing secret values.

## Evidence Record

For each rehearsal, record:

- stage and exact project;
- operator identity;
- schedule resource;
- backup resource and state;
- backup creation and expiry time;
- destination recovery database;
- restore start/end time;
- measured RPO and RTO;
- validation results;
- TTL readback;
- Storage/Auth recovery evidence references;
- cleanup owner and completion evidence;
- final pass/fail decision.

For the August 21 snapshots, report: `The schedules, isolated restores, exact
TTL reapplication, Storage soft-delete recovery, Auth exportability, and cleanup
are verified. The snapshots contained no workspace documents, so tenant-lineage
recovery must be repeated after a non-empty backup exists.`

## Official References

- [Schedule and manage Firestore backups](https://cloud.google.com/firestore/docs/backups)
- [gcloud firestore backups commands](https://cloud.google.com/sdk/gcloud/reference/firestore/backups)
- [Restore a Firestore database](https://cloud.google.com/sdk/gcloud/reference/firestore/databases/restore)
- [Export and import Firebase Auth users](https://firebase.google.com/docs/cli/auth)
