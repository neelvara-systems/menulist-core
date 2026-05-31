# VisualMeta - Infrastructure Freeze v1

**Status:** Draft freeze target
**Created:** May 31, 2026
**Duration:** 3-year architecture freeze after implementation approval

---

## 1. Frozen Product Identity

VisualMeta is a separate product with product code `VM`.

Its root document identity is:

```txt
pId / tId / sId / docId
```

VisualMeta-owned documents use:

```txt
pId = "VM"
```

Names may change. The product code must not.

## 2. Frozen Data Model

Initial VisualMeta collections:

| Collection | Purpose |
| --- | --- |
| `visualmetaWorkspaces` | Tenant/scope workspace metadata. |
| `visualmetaProjects` | Project shell: client, goal, source channel, due date, status. |
| `visualmetaContentUnits` | Atomic item/content units inside a project. |
| `visualmetaAssets` | Source and generated/edited asset metadata. |
| `visualmetaGenerationJobs` | Image/text/translation/edit generation job state. |
| `visualmetaReviewEvents` | Notes, approvals, rejections, stale markers. |
| `visualmetaExportKits` | Final kit package metadata and manifest. |
| `visualmetaAuditLogs` | Append-only security and governance events. |

Do not put VisualMeta projects into MenuList `projects`.

## 3. Frozen Invariants

- source snapshots are immutable per kit version
- generated output is draft until approved
- final kits require explicit approval
- export manifests are immutable after export
- stale source facts invalidate affected output
- `pId: "VM"` is required on VisualMeta-owned documents
- cross-product source data lives in `sourceContext`
- MenuList, Answerlattice, and GrowthOS data cannot be mutated from VisualMeta
- provider calls require cost/capacity checks before execution
- audit logs are append-only

## 4. Frozen Runtime Separation

VisualMeta must have:

- separate Firebase client configuration
- separate Firebase admin helper
- separate Firestore rules
- separate Storage rules
- separate Cloud Functions package if functions are used
- separate deployment target matrix entry before public route activation
- separate billing/product scope

Proposed files:

```txt
firebase-visualmeta.json
firestore-visualmeta.rules
firestore-visualmeta.indexes.json
storage-visualmeta.rules
functions-visualmeta/
src/lib/firebase/visualMetaConfig.ts
src/lib/firebase/visualMetaFirebaseClient.ts
src/lib/firebase/visualMetaFirebaseAdmin.ts
```

## 5. Frozen AI Discipline

All provider calls must:

- validate input with Zod
- check Safe Mode
- check rate limits
- check VisualMeta credit capacity
- log operation cost against product `VM`
- store provider result safely
- avoid raw sensitive payload logs
- return structured output only

Generation cannot approve output.

## 6. Frozen Export Contract

Every Final Content Kit contains:

- `manifest.json`
- approved images
- approved text variants
- approved translations
- source snapshot summary
- approval metadata
- export timestamp
- usage notes

An exported kit is immutable. A correction creates a new kit version.

## 7. Allowed During Freeze

Allowed:

- additive fields
- new import adapters
- new export formats
- provider abstraction improvements
- cost optimizations
- index tuning
- UI polish
- bug fixes
- additional review status metadata

Not allowed without doctrine review:

- direct publishing
- auto-approval
- live MenuList write-back
- turning VisualMeta into CMS/PIM/DAM
- changing `pId` semantics
- removing source snapshot requirement
- making generation authoritative

## 8. Freeze-Break Procedure

Any break requires:

1. written RFC
2. risk analysis
3. migration plan
4. rollback plan
5. cost impact
6. security review
7. docs update

Without all seven, do not change frozen architecture.
