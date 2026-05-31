# VisualMeta - Firebase And Cost Plan

**Status:** Planning cost document
**Created:** May 31, 2026
**Runtime status:** No Firebase resources exist for VisualMeta yet.

---

## 1. Current Cost

Current runtime cost is zero.

This doc set adds no:

- Firestore reads
- Firestore writes
- Firestore deletes
- realtime listeners
- Cloud Functions
- Cloud Tasks
- Storage operations
- Storage retention
- provider calls
- schedulers
- indexes
- deploys

## 2. Product Firebase Rule

VisualMeta must use a separate Firebase target, following the Canonica separation model.

Proposed files:

```txt
firebase-visualmeta.json
firestore-visualmeta.rules
firestore-visualmeta.indexes.json
storage-visualmeta.rules
functions-visualmeta/
```

Do not write VisualMeta data into MenuList or Canonica Firebase projects.

## 3. Planned Collections

| Collection | Read pattern | Write pattern | Cost risk |
| --- | --- | --- | --- |
| `visualmetaWorkspaces` | one scoped workspace read on entry | create/update workspace metadata | low |
| `visualmetaProjects` | paginated project list, project detail | create/update/archive project | medium if unbounded list |
| `visualmetaContentUnits` | paginated by `projectId`, status filters | create/update status, stale markers | high if realtime or unpaginated |
| `visualmetaAssets` | by project/unit, bounded | source/generated asset metadata writes | medium |
| `visualmetaGenerationJobs` | recent jobs by project/status | one job write plus status updates | high for batch jobs |
| `visualmetaReviewEvents` | by unit/project, newest first | append-only comments/decisions | medium |
| `visualmetaExportKits` | by project, latest first | one export write plus immutable metadata | medium |
| `visualmetaAuditLogs` | admin/support only, paginated | append-only security/governance logs | medium |

No collection should be read without `pId`, `tId`, and `sId` scope.

## 4. Required Indexes

Planned composite indexes:

| Collection | Query |
| --- | --- |
| `visualmetaProjects` | `pId + tId + sId + status + updatedAt desc` |
| `visualmetaContentUnits` | `pId + tId + sId + projectId + status + updatedAt desc` |
| `visualmetaAssets` | `pId + tId + sId + projectId + contentUnitId + createdAt desc` |
| `visualmetaGenerationJobs` | `pId + tId + sId + projectId + status + updatedAt desc` |
| `visualmetaReviewEvents` | `pId + tId + sId + projectId + contentUnitId + createdAt desc` |
| `visualmetaExportKits` | `pId + tId + sId + projectId + version desc` |
| `visualmetaAuditLogs` | `pId + tId + sId + createdAt desc` |

Indexes must be created in `firestore-visualmeta.indexes.json`, not the MenuList index file.

## 5. Read Budget

Target read budget per workspace open:

| Surface | Target reads |
| --- | ---: |
| Workspace shell | 1 workspace read |
| Project list | 20 to 50 project docs, paginated |
| Project detail | 1 project doc |
| Content units | 25 to 100 docs, paginated |
| Review panel | latest 20 review events per selected unit |
| Export kits | latest 10 kits |

Avoid realtime listeners for large project/unit lists. Use manual refresh or bounded polling only where necessary.

## 6. Write Budget

Expected write costs:

| Action | Writes |
| --- | ---: |
| Create project | 1 project write, 1 audit write |
| Upload source asset | 1 Storage object, 1 asset metadata write, 1 audit write |
| Import source snapshot | 1 source metadata write per imported unit or batch summary, 1 audit write |
| Create content unit | 1 content unit write |
| Generate candidate | 1 job write, 1 job update, 1 asset/text write, 1 operation ledger write, possible credit write |
| Review decision | 1 review event write, 1 content unit status update, 1 audit write |
| Create export kit | 1 export kit write, 1 Storage manifest object, optional ZIP object, 1 audit write |

Batch operations must group writes where possible and avoid per-item audit fanout unless required for security.

## 7. Storage Plan

Storage paths:

```txt
visualmeta/source/{tId}/{sId}/{projectId}/...
visualmeta/generated/{tId}/{sId}/{projectId}/...
visualmeta/export-kits/{tId}/{sId}/{kitId}/...
```

Retention rules:

- source files are retained while project is active
- generated rejected candidates can expire after a configured window
- approved assets are retained with the kit
- export ZIP files can be regenerated from manifest only if all approved source files remain available
- deletion must be explicit and audited

Storage rules must require VisualMeta account scope. Public read links should be signed URLs, not open bucket paths.

## 8. Provider Cost Rules

Before any provider call:

1. check `ENABLE_VISUALMETA_PROVIDER_CALLS`
2. check Safe Mode
3. validate request with Zod
4. rate limit by user/workspace
5. calculate estimated unit cost
6. reserve VisualMeta credits
7. execute provider call
8. settle or refund credits
9. log operation under product `VM`

Existing MenuList AI unit-cost categories can inform pricing, but VisualMeta must use a VisualMeta-owned ledger and billing scope.

## 9. Cloud Tasks And Functions

If batch generation is used:

- queue jobs from VisualMeta API only
- worker route validates Cloud Tasks/shared secret
- job reads are scoped by `pId/tId/sId/projectId`
- worker checks credits again before provider work
- failed jobs settle credits correctly
- retries are bounded

If Cloud Functions are needed, they live in:

```txt
functions-visualmeta/
```

No VisualMeta scheduled job may be added to MenuList or Canonica functions.

## 10. Security Rules

Firestore rules must:

- default deny
- require auth
- require product account with `VM` scope
- verify `pId == "VM"`
- verify scoped `tId` and `sId`
- allow owners/admins to write workspace data
- allow reviewers to create review events where invited
- block client writes to billing and operation ledger docs
- block direct mutation of immutable export manifests

Storage rules must:

- require auth and VisualMeta scope for source/generated uploads
- block public bucket reads
- allow signed download flow through server route
- reject writes outside VisualMeta prefixes

## 11. Cost Guardrails

Required guardrails:

- all expensive calls feature-flagged
- paid entitlement gate before provider work
- per-workspace monthly usage cap
- per-job max content units
- per-file size limits
- per-project asset count limit
- bounded project lists
- no broad collection scans
- no realtime listener on content units by default
- no retained rejected candidates forever

## 12. Billing Break-Even Check

Before launch, calculate:

- average provider cost per generated candidate
- average candidates per approved unit
- average units per kit
- Storage retention cost per kit
- function/task overhead
- support/review overhead
- credit margin by package

If VisualMeta cannot price safely above cost, do not enable generation.

## 13. Deploy Rule

When implementation modifies VisualMeta Firestore rules, indexes, Storage rules, or `functions-visualmeta/`, deploy the matching VisualMeta Firebase target after validation.

Do not deploy MenuList or Canonica Firebase targets for VisualMeta changes.
