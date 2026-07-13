# MenuList Incident Response Runbook

**Status:** ACTIVE operating runbook - source-maintained, not live-drill evidence
**Last updated:** July 11, 2026
**Scope:** MenuList application, public surfaces, MenuList Firebase targets, and MenuList providers

**Launch boundary:** This runbook closes the missing codebase-side operating procedure. It does not certify alert delivery, staff availability, provider access, deployment access, backups, recovery time, or production readiness. Launch approval still requires the active production-readiness audit, External Certification Runbook evidence, explicit target deploy approval, provider/browser/device QA, and production-host smoke.

## Purpose

Use this document when MenuList is unavailable, serving wrong public truth, crossing a tenant boundary, charging incorrectly, processing unexpectedly, or producing a sustained cost/provider failure. The objective is to contain impact, preserve evidence, restore known-good behavior, and record what proved recovery.

This is an internal response target, not a customer SLA or legal notification promise.

## Product Boundary

- MenuList local/Preview uses `menulist-qa`; MenuList Production uses `menulist`.
- Answerlattice incidents use its separate Firebase configuration, doctrine, credentials, and deployment evidence. Do not change MenuList data or deploy MenuList targets to contain an Answerlattice-only incident.
- CampaignCue, MyCodex, Neelvara, GrowthOS, and KitStamp remain separate product or site boundaries. Confirm the affected host and target before any mutation or rollback.
- A shared Vercel app incident may affect more than one product host. Record each affected host separately and do not infer shared Firebase impact from a shared deployment alone.

## Operational Truth

| Control | What it can do | What it cannot prove or stop |
| --- | --- | --- |
| `/ops` | Platform-only operational view and SAFE_MODE control | It is not proof that alerts or provider channels are live |
| `/ops/platform-notifications` | Review and acknowledge bounded platform alerts | It is not an external status page |
| SAFE_MODE | Blocks app routes/workers with explicit checks and all Gemini calls through the shared MenuList Functions AI gateway | SAFE_MODE is not a global read/write kill switch; public menus remain available and unguarded mutations continue |
| `checkSafeMode()` | Returns `503` when `ops_config/system.SAFE_MODE` is readable and active | The app helper fails open if its config read fails; use another containment path when Firestore/Admin access is impaired |
| Feature flags | Bound compiled capabilities | Most source flags require a deployment; they are not immediate remote switches unless the runtime explicitly reads remote state |
| Vercel rollback | Restores a previous application deployment | It does not roll back Firebase rules, indexes, Functions, provider state, or Firestore data |
| Scoped Firebase deploy | Restores selected rules, indexes, or Function targets from reviewed source | It requires target access and must not be widened into a broad deploy without an incident record and explicit approval |
| Public cache invalidation / force republish | Refreshes already-correct canonical public truth | It must not be used to publish unverified or corrupted source data |

Do not mute alerts during active P0 or P1 response. Alert mute is for bounded controlled-deploy noise only.

## Severity And Internal Targets

| Severity | Use when | Internal acknowledgement target | Update cadence |
| --- | --- | --- | --- |
| P0 | Confirmed or likely cross-tenant/data exposure, destructive corruption, widespread auth/billing failure, or full public outage | 15 minutes | Every 30 minutes until contained |
| P1 | Major owner/public workflow unavailable, wrong public truth across multiple stores, sustained provider/cost incident, or partial security impact | 30 minutes | Every 60 minutes |
| P2 | Bounded feature degradation, one provider adapter unavailable, or isolated store impact without exposure/corruption | 4 hours | At material state changes or daily |
| P3 | Low-impact defect, noisy diagnostic, documentation mismatch, or non-urgent operational follow-up | Next working day | Normal task updates |

When impact is uncertain, start one level higher. Downgrade only after evidence narrows the affected hosts, stores, users, operations, and time window.

## First 15 Minutes

1. Confirm the affected product, host, environment, Firebase project, and first known bad timestamp.
2. Create an incident ID such as `ML-INC-YYYYMMDD-NN` and name one incident commander. For a founder-only response, the founder/platform operator holds that role explicitly.
3. Open a private working record. After resolution, store the redacted durable record under `__docs__/audits/incidents/` using the filename convention `YYYY-MM-DD-incident-slug.md`.
4. Record the current application commit, deployment identifier, changed Firebase targets, active provider environment, and SAFE_MODE state. Do not print secret values.
5. Preserve bounded evidence before changing state: alert IDs, fixed failure codes, timestamps, deployment logs, provider request IDs, affected-count estimates, and screenshots with private data removed.
6. Classify severity and affected surfaces. State what is confirmed, inferred, and unknown.
7. Choose the smallest containment action from the matrix below. Do not start with data repair or a broad deploy.

Useful local evidence commands:

```bash
git rev-parse HEAD
git status --short
npm run verify:env-targets
npm run verify:production-readiness-local
```

The aggregate is recovery evidence, not a prerequisite to urgent containment.

## Containment Matrix

| Incident class | Immediate containment | Required checks before recovery |
| --- | --- | --- |
| Cross-tenant or sensitive-data exposure | Stop the affected route/provider path through an existing remote control, provider disable, or explicitly approved rollback. Preserve logs and do not query unrelated tenant data. Rotate only credentials shown to be exposed. | Reproduce the denied path in QA, verify tenant/document-ID guards and security rules, inspect affected access window, complete legal/privacy assessment |
| Wrong or stale public menu/OBP truth | Prefer showing less over showing wrong. Verify canonical store/project data before cache invalidation or force republish. Do not use SAFE_MODE as the public surface remains available by design. | Canonical data correct, public cache tags refreshed, menu/OBP/QR/custom-domain smoke passes on affected host |
| Auth, claim, role, or session failure | Stop the affected entry flow if a bounded control exists. Do not mass-revoke users or rewrite claims until scope is known. | Negative-path auth matrix, valid owner login, role/store-switch checks, affected-session decision recorded |
| Billing, Razorpay, entitlement, or webhook failure | Stop the affected mutation path/provider webhook if duplicate or incorrect charging is possible. Do not manually reconcile provider and Firestore state before comparing authoritative provider event IDs and local idempotency ledgers. | Sandbox or controlled provider replay, duplicate-event proof, subscription/credit/entitlement parity, owner-safe response check |
| AI/provider cost spike or runaway expensive work | Activate SAFE_MODE from `/ops` with the incident ID and reason. Verify a known guarded route returns `503` and a public menu still loads. Disable or rotate the affected provider key/queue separately if SAFE_MODE checks are failing open. | Cost slope stable, queue/provider activity bounded, guarded app and Functions paths verified, public menu unaffected |
| Messaging/POS/external adapter failure | Disable only the affected adapter or target flag. Preserve delivery IDs and signatures. Do not broaden to all public publishing unless canonical MenuList truth is affected. | Target provider smoke, signature/redirect/DNS guard proof, retry/idempotency evidence, failed-endpoint behavior |
| Vercel application regression | Roll back to the previous known-good deployment through Vercel, or prepare a non-interactive `git revert` and deploy only with explicit approval. | Current source gates, affected host/browser smoke, environment target confirmation, production-host evidence |
| Firebase Function regression | Stop enqueue/trigger admission when available. Revert source to a known-good commit, run the matching Functions lint/build/preflight, and deploy only the affected function targets. | QA target evidence where available, target list recorded, trigger/provider smoke, no unrelated function deployment |
| Firestore/Storage rule regression | Preserve the failing request and rule line. Restore reviewed previous rule source and deploy only the affected rules target. Do not relax QA rules as a shortcut. | Emulator/targeted rule tests, QA deploy evidence where available, denied and allowed path smoke |
| Data corruption or destructive mutation | Stop the writer first. Take/export a snapshot or bounded read-only inventory before repair. Never use an unbounded backfill, delete, or replacement write as first response. | Dry run with exact counts, identity/tenant validation, capped batch plan, rollback/compensation plan, post-write comparison |

## SAFE_MODE Procedure

1. Open `/ops` as a platform operator.
2. Activate SAFE_MODE with `ML-INC-...` and a short bounded reason.
3. Confirm `ops_config/system.SAFE_MODE` is true without copying unrelated document data.
4. Call one known guarded expensive route and require `503` with `SAFE_MODE_ACTIVE`.
5. Load one public menu/OBP route and confirm it remains readable.
6. Check any directly invoked MenuList Functions path separately. Shared Gemini provider calls inherit the Functions AI-gateway guard, while workflow-specific status and early-exit behavior remain explicit at the entry point.
7. If the SAFE_MODE config read fails, remember that `src/lib/ops/safeMode.ts` fails open. Use provider, queue, route, or deployment containment instead.

Do not deactivate SAFE_MODE until the initiating failure is contained, queued work is understood, cost/provider signals are stable, and a known guarded route plus public menu have both been rechecked. Record who deactivated it and why.

## Rollback Discipline

### Application

1. Identify the last known-good deployment and commit from deployment history, not memory.
2. Compare the incident diff and confirm the rollback does not remove unrelated emergency fixes.
3. Use the Vercel rollback control or a reviewed `git revert`. Do not use `git reset --hard` or rewrite shared history.
4. Record explicit deploy approval and the production host smoke result.

### Firebase

1. Record the exact project and target list before running a command.
2. Restore source from the previous known-good commit.
3. Run the target-specific verifier and preflight.
4. Prefer QA-first proof. During an active production P0/P1 where QA cannot reproduce, record why an explicitly approved production-only rollback is necessary.
5. Deploy only affected Functions, Firestore rules/indexes, or Storage rules. Never infer Vercel approval from Firebase approval or vice versa.

### Data

1. Stop the writer.
2. Preserve a read-only snapshot/export and record query boundaries.
3. Calculate exact affected document counts with a capped dry run.
4. Use idempotent, tenant-validated, batched repair with a stop rule.
5. Compare before/after canonical documents and public read models.

## Recovery Gate

Recovery is proven only when all applicable items pass:

- Containment remains effective and no new affected entities appear.
- Root cause is fixed, reverted, or isolated with a documented temporary boundary.
- The affected feature verifier and `npm run verify:production-readiness-local` pass on the recovery source.
- Target-specific deploy evidence exists for every changed runtime target.
- Valid and negative-path smoke tests pass in the affected environment.
- Canonical Firestore/provider state agrees with derived summaries, caches, and owner-visible state.
- Public menu/OBP/custom-domain/QR behavior is checked when public truth was involved.
- Billing/provider idempotency is checked when money or delivery was involved.
- Security/privacy review is complete when access or exposure was possible.
- Monitoring remains stable for a defined observation window and the next owner is named.

Do not call an incident resolved because a deploy succeeded or an error disappeared once.

## Communication Rules

- Use factual state: `Investigating`, `Contained`, `Recovering`, or `Resolved`.
- Separate confirmed impact from possible impact.
- Include incident ID, affected product/environment, start time, current containment, and next update time.
- Do not include secrets, raw tokens, full provider payloads, private tenant/store IDs, owner contact details, or unredacted screenshots.
- Do not promise breach notifications, refunds, recovery times, or regulatory outcomes before owner/legal assessment.
- Customer-facing messages describe observed impact and available safe action; they do not expose internal architecture.

Internal update template:

```text
Incident: ML-INC-YYYYMMDD-NN
Severity / state: P1 / Contained
Environment and host: Production / affected host
Confirmed impact: ...
Unknowns: ...
Containment: ...
Evidence: fixed codes, bounded counts, timestamps
Next action / owner: ...
Next update: ...
```

## Durable Incident Record

The redacted post-incident record must include:

1. Incident ID, severity, product, environment, hosts, start/containment/recovery timestamps.
2. Detection source and the first fixed failure code or alert ID.
3. Confirmed affected entities and how counts were derived.
4. Timeline of state-changing actions and operator approvals.
5. Root cause and contributing conditions.
6. Containment, rollback, repair, and recovery evidence.
7. Firestore reads/writes/deletes, Storage operations, provider calls, and deploy targets caused by response work.
8. Customer/security/legal communication decision and owner.
9. Follow-up tasks with owners, stop rules, and verifier/doc updates.
10. A statement that the incident record is historical evidence, not current launch certification.

## Maintenance And Drill

- Review this runbook whenever SAFE_MODE coverage, Ops routes, deployment targets, provider adapters, billing flows, public cache paths, or incident evidence locations change.
- Before launch, run a non-destructive QA tabletop: AI cost spike, wrong public menu truth, and failed scoped deploy rollback.
- Record drill evidence in the production-readiness audit. A source-complete runbook without a live drill remains codebase-side readiness only.
- Source gate: `npm run verify:agent-readiness`.
