# Answerlattice Production Incident and Recovery Runbook

**Status:** Required release runbook; cloud backup and restore rehearsal are not yet verified  
**Product:** Answerlattice (`AL`)  
**Runtime namespace:** Historical `canonica` names remain where migration compatibility requires them  
**Last verified:** 2026-07-11

## Purpose

This runbook defines the minimum operator response for Answerlattice authentication, retrieval, ingestion, scheduler, billing, credential, and data-recovery incidents. It does not claim that a backup exists. Production release remains blocked until the backup configuration and isolated restore rehearsal below are completed with cloud evidence.

## Immediate Safety Actions

1. Stop the affected expensive path with its existing Answerlattice flag or `opsConfig/system.SAFE_MODE` when provider spend or answer correctness is at risk.
2. Revoke or rotate affected widget/public API credentials without deleting tenant data.
3. Disable the affected integration adapter before retrying delivery failures.
4. Preserve scheduler, AI-operation, integration-delivery, and audit-log evidence. Do not copy raw prompts, uploaded material, or credentials into incident chat.
5. Do not auto-publish a replacement canonical answer. Restore or draft it through Governance and human approval.

## Severity Matrix

| Severity | Examples | First action |
|---|---|---|
| P0 | Cross-tenant exposure, active credential disclosure, destructive write corruption | Disable affected public/runtime path, revoke keys, preserve evidence, begin incident response immediately |
| P1 | Auth outage, widget outage, canonical retrieval bypass, billing entitlement corruption, failed production scheduler across tenants | Fail closed, stop affected rollout, use bounded manual recovery only after scope verification |
| P2 | One-tenant ingestion failure, stale summary, integration adapter failure, isolated cache failure | Keep source of truth intact, retry idempotent work, rebuild derived data |

## Recovery Order

1. Verify the target environment and project: QA is `answerlattice-qa`; production is `answerlattice`.
2. Verify authentication and product-account scope before touching tenant data.
3. Restore authoritative records before derived records.
4. Rebuild summaries, bundles, indexes, embeddings, and caches from authoritative data.
5. Run tenant/store isolation and canonical retrieval tests.
6. Re-enable flags one subsystem at a time.
7. Record the deployment version, run IDs, affected scope, and verification result.

## Authoritative and Rebuildable Data

Authoritative data includes tenants, workspaces, users, subscriptions, KB source content, canonical answers and versions, entities and relations, releases, widget configuration and credential metadata, tickets, governance records, and required audit history.

Rebuildable data includes compact summaries, compiled context bundles, query caches, entity search indexes, embeddings, coverage/trust summaries, and scheduler cursors where the source state is intact.

## Required Backup Configuration Before Production

The cloud owner must configure and verify all of the following in the production Answerlattice project:

- Daily managed Firestore export to a dedicated, access-controlled Google Cloud Storage bucket.
- Bucket retention/lifecycle policy that cannot be shortened by the application runtime identity.
- Encryption and IAM restricted to backup operators and the Firestore service agent.
- A documented export job identity and alert for missed exports.
- Separate retention for authoritative exports and short-lived test exports.
- Storage asset backup or an explicit proof that every retained object is rebuildable.

Target objectives, pending rehearsal: RPO 24 hours and RTO 4 hours. These are targets, not measured guarantees.

## Isolated Restore Rehearsal

Run only in an isolated QA recovery project. Never import a rehearsal into production.

1. Select a known successful production export without displaying object contents.
2. Grant the isolated QA Firestore service agent read access to that export.
3. Import into an empty recovery database/project.
4. Verify one workspace, one canonical answer/version chain, one KB article, one widget config, and one ticket.
5. Run project-boundary, tenant/store rules, canonical retrieval, widget-key, and cache-rebuild checks.
6. Rebuild summaries, context bundles, embeddings, and entity indexes.
7. Record elapsed time, missing references, manual steps, and final checks.
8. Delete the recovery project/data under the approved retention policy.

The exact cloud commands must use the project and bucket selected by the operator at execution time. They must not be hard-coded into source or copied into public documentation.

## Scenario Playbooks

### Canonical or KB corruption

- Disable affected answer/runtime exposure if incorrect answers can be served.
- Restore the authoritative document/version or prepare a Governance proposal from the last audited version.
- Rebuild cache versions, compiled bundles, embeddings, and summaries.
- Verify canonical-first retrieval and no cross-scope cache hit.

### Scheduler partial failure

- Inspect the bounded scheduler run summary and per-workspace state.
- Retry only idempotent failed tasks through the existing manual operator path.
- Do not start a second scheduler or reset cursors blindly.
- Confirm proposals, drafts, and integration events were not duplicated.

### Widget/public credential exposure

- Revoke or rotate the credential.
- Confirm only hashes and encrypted recoverable material remain persisted by design.
- Purge credential-validation caches by deployment/restart where required.
- Verify allowed origins, blocked routes, and active-workspace status before re-enabling.

### AI provider or Redis outage

- Keep canonical retrieval and explicit no-answer behavior available where possible.
- SAFE_MODE must fail closed when its state cannot be checked.
- Do not loop retries or bypass support-credit accounting.
- Restore provider paths only after rate-limit and accounting checks pass.

### Billing/webhook mismatch

- Treat provider settlement evidence and server-owned subscription documents as authoritative inputs.
- Do not let client state grant entitlement.
- Reconcile idempotently; never delete tenant data for a transient payment failure.
- Verify credit balances and billing history after recovery.

## Release and Rollback

Deploy rules and indexes before code that depends on them, then Functions, then the web application. Keep user-visible/provider-spend features flag-controlled until QA evidence exists. Roll back application and Functions independently when contracts remain compatible; do not roll back Firestore data by deleting newer authoritative records without a reviewed migration plan.

## Current Blockers

- No cloud backup job was visible or verifiable from repository source.
- No isolated restore rehearsal was executed in this audit environment.
- QA Firebase deployment is blocked by cloud IAM/Service Usage access.
- Production provider, billing-webhook, DNS, and browser/device telemetry were not available.

These blockers prevent a production-ready verdict.
