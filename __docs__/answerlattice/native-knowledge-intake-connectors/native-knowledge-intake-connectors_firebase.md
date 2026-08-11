# GitHub Change Intake - Firebase and Cost

> **Status:** Local source complete; QA rules deploy blocked by Firebase authentication
> **Last Updated:** 2026-08-11

## Storage Model

| Data | Location | Purpose |
| --- | --- | --- |
| Owner-safe connection state | `platformSummary/integrationConfig_{tId}_{sId}.githubChangeIntake` | One compact workspace configuration and recent delivery ledger |
| Repository-to-workspace binding | `answerlattice_githubIntakeBindings/{bindingId}` | Server-only webhook routing |
| Imported change evidence | Existing `answerlattice_knowledgeSources` | Private, bounded, unreviewed source |
| Rolling intake job | Existing `answerlattice_knowledgeIntakeJobs` | Existing owner review grouping |
| Intake counters | Existing `platformSummary/knowledgeIntakeSummary_{tId}_{sId}` | Existing Daily Brief and owner read model |
| Owner lifecycle audit | Existing `answerlattice_auditLogs` | Connect, policy update, and disconnect receipts |

No Storage object, vector index, new scheduler, Cloud Function, queue, or polling cursor is added.

## Normal Event Cost

For one selected workspace and one new accepted event:

- one binding query (normally one document read);
- the existing active-subscription lookup before a selected workspace can claim the event;
- one compact integration-config transaction for policy, replay, and daily-cap admission;
- existing intake job/source reads and writes;
- one compact completion update;
- one GitHub pull-request file-path query only for an admitted merged pull request;
- the PR request is a byte-bounded GraphQL path-only response, not the REST files payload containing patches;
- zero model calls until the owner explicitly chooses **Prepare drafts**.

Duplicate, unsupported, and unselected events stop before source creation. Recent delivery ids are hashed, bounded to 50 entries, and stored in the existing config document instead of an append-only webhook-event collection.

The same compact connection state stores the current monthly rolling-job slot. New events start at that slot instead of rereading every full job created earlier in the month. Sixty-four possible 50-source jobs cover the theoretical 3,100-event monthly maximum implied by the 100-per-day cap, while only jobs actually used are created.

## Cost Controls

- no polling;
- no realtime listener;
- inactive subscriptions stop before replay, source, job, or completion writes;
- no repository clone;
- no source-code or patch storage;
- at most ten selected repositories per workspace;
- at most 100 visible repositories during setup;
- at most 100 changed file paths per pull request;
- at most 100 accepted events per workspace per UTC day;
- at most 50 recent delivery receipts in the compact config;
- existing 50-source intake-job cap with deterministic rolling jobs;
- one compact monthly active-slot pointer to avoid an increasing read scan;
- expired first-time setup is projected as disconnected in the existing config read, avoiding a cleanup write;
- repository-removal events use one installation-scoped binding query and one transaction per affected workspace instead of one query per removed repository;
- exact source hashes prevent duplicate writes inside the active job;
- owner-triggered analysis retains existing credit accounting.

## Rules and Indexes

- Repository bindings are explicitly server-only under Firestore rules.
- Existing integration configuration remains server-only.
- The binding lookup uses one equality field and the normal single-field Firestore index; no composite index is required.
- The binding collection is added to workspace erasure using its actual `sId` field only, so disconnect and account deletion do not leave routing records or perform a redundant alias query.

## Retention and Disconnect

Disconnect deletes repository bindings and clears active/pending provider configuration. Historical imported sources remain as workspace evidence because they may already support owner decisions. Workspace erasure removes bindings, intake sources, jobs, review items, summaries, and audits through the existing lifecycle process.
