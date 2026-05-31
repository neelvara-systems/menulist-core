# VisualMeta - Implementation Plan

**Status:** Planning implementation guide
**Created:** May 31, 2026
**Product code:** `VM`
**Implementation status:** Not started. This document is the build plan, not runtime truth.

---

## 1. Implementation Principle

Build VisualMeta with Canonica-grade product separation.

VisualMeta may reuse generalized engineering patterns from MenuList and Canonica, but it must own its runtime data, billing, routes, Storage paths, and functions.

Do not implement VisualMeta by placing records inside MenuList `projects`, MenuList AI packs, Canonica collections, or GrowthOS docs.

## 2. Existing Repo Reuse

Reusable patterns:

- product code already reserved as `PRODUCT_IDS.VISUAL_META`
- product-domain placeholder exists but is disabled
- Canonica product separation docs define a working model for shared app, separate host, and separate Firebase
- MenuList image generation APIs prove auth, Safe Mode, rate limits, capacity checks, provider calls, Storage upload, Cloud Tasks, and AI operation logging
- AI unit-cost constants already cover image generation, batch image generation, image editing, translation, and rewrite categories

Must not reuse directly:

- MenuList project collections as VisualMeta collections
- MenuList owner navigation as VisualMeta navigation
- MenuList AI enhancement packs as VisualMeta credits
- Canonica Firebase helpers for VisualMeta data
- GrowthOS action model for VisualMeta projects

## 3. Required Feature Flags

Add flags to `src/config/features.ts`, all defaulting to off:

```ts
ENABLE_VISUALMETA_PRODUCT: false
ENABLE_VISUALMETA_PUBLIC_SITE: false
ENABLE_VISUALMETA_DASHBOARD: false
ENABLE_VISUALMETA_MENU_IMPORT: false
ENABLE_VISUALMETA_SOURCE_UPLOADS: false
ENABLE_VISUALMETA_GENERATION: false
ENABLE_VISUALMETA_BATCH_JOBS: false
ENABLE_VISUALMETA_REVIEW: false
ENABLE_VISUALMETA_EXPORT_KITS: false
```

Server/function flags:

```txt
ENABLE_VISUALMETA_FUNCTIONS=false
ENABLE_VISUALMETA_PROVIDER_CALLS=false
ENABLE_VISUALMETA_EXPORT_PACKAGING=false
VISUALMETA_FIREBASE_MODE=separate
```

No VisualMeta route, API, or provider call should run when the product flag is off.

## 4. Routing Plan

Add VisualMeta only after domain and target approval:

- extend `src/constants/deploymentTargets.ts` with a VisualMeta target
- keep `src/constants/productDomains.ts` VisualMeta entry disabled until ready
- use `src/app/sites/visualmeta/` for public website routes
- use local dev prefix `/__visualmeta`
- keep dashboard/product workspace routes outside MenuList owner navigation
- verify product hosts classify before tenant/custom-domain resolution

Required smoke tests before activation:

```txt
Host: visualmeta.app
Path: /
Expected: VisualMeta public website

Host: localhost:3000
Path: /__visualmeta
Expected: VisualMeta local website or dashboard entry

Host: visualmeta.app
Path: /client/...
Expected: not MenuList tenant route
```

## 5. Proposed File Map

```txt
src/app/sites/visualmeta/
src/app/visualmeta/
src/app/api/visualmeta/
src/components/visualmeta/
src/constants/visualmeta/
src/database/visualmeta/
src/hooks/visualmeta/
src/lib/visualmeta/
src/lib/firebase/visualMetaConfig.ts
src/lib/firebase/visualMetaFirebaseClient.ts
src/lib/firebase/visualMetaFirebaseAdmin.ts
src/types/visualmeta.ts
firebase-visualmeta.json
firestore-visualmeta.rules
firestore-visualmeta.indexes.json
storage-visualmeta.rules
functions-visualmeta/
```

Do not add VisualMeta scheduled jobs to MenuList or Canonica functions.

## 6. Data Model

Every owned document uses:

```ts
type VisualMetaIdentity = {
  pId: "VM";
  tId: number;
  sId: number;
};
```

Core types:

```ts
type VisualMetaProject = VisualMetaIdentity & {
  id: string;
  name: string;
  clientLabel?: string;
  goal: "menu" | "product_catalog" | "marketplace" | "website" | "social_handoff" | "other";
  status: "draft" | "in_review" | "approved" | "exported" | "stale" | "archived";
  localeDefaults: string[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type VisualMetaContentUnit = VisualMetaIdentity & {
  id: string;
  projectId: string;
  sourceSnapshotId: string;
  label: string;
  subjectType: "menu_item" | "product" | "offer" | "place" | "listing" | "article" | "other";
  facts: Record<string, unknown>;
  status: "source_ready" | "candidate_ready" | "changes_requested" | "approved" | "stale" | "exported";
  approvedAssetIds: string[];
  approvedTextIds: string[];
  sourceHash: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type VisualMetaExportKit = VisualMetaIdentity & {
  id: string;
  projectId: string;
  version: number;
  status: "creating" | "ready" | "failed" | "revoked";
  contentUnitIds: string[];
  manifestPath: string;
  zipPath?: string;
  approvedBy: string;
  approvedAt: Timestamp;
  exportedAt?: Timestamp;
};
```

Source imports use copied context:

```ts
type VisualMetaSourceContext = {
  sourcePId: "ML" | "CN" | "GR" | "external";
  sourceTId?: number;
  sourceSId?: number;
  sourceDocId?: string;
  sourceLabel?: string;
  importedBy: string;
  importedAt: Timestamp;
  sourceHash: string;
};
```

## 7. API Plan

All mutation APIs require:

- `withAuth()`
- product flag check
- VisualMeta account/scope resolution
- Zod validation
- rate limit before expensive work
- Safe Mode check before provider calls
- VisualMeta credit capacity check before provider calls
- secure logging without raw sensitive payloads
- VisualMeta Firebase writes only

Planned APIs:

| Route | Purpose |
| --- | --- |
| `POST /api/visualmeta/projects/create` | Create project shell. |
| `POST /api/visualmeta/source/upload` | Register uploaded source files. |
| `POST /api/visualmeta/source/import` | Copy source snapshot from MenuList, Canonica, GrowthOS, or external source. |
| `POST /api/visualmeta/content-units/create` | Create content units from source snapshot. |
| `POST /api/visualmeta/generation/candidate` | Generate image/text/translation candidate. |
| `POST /api/visualmeta/generation/batch-trigger` | Enqueue bounded batch jobs. |
| `POST /api/visualmeta/generation/worker` | Cloud Tasks worker with shared-secret validation. |
| `POST /api/visualmeta/review/decision` | Approve, reject, comment, or request correction. |
| `POST /api/visualmeta/export-kits/create` | Create immutable manifest and optional ZIP. |
| `GET /api/visualmeta/export-kits/[id]` | Return signed download metadata for approved users. |

Do not expose public write APIs in v1.

## 8. Firebase And Storage Plan

VisualMeta must use separate Firebase files:

```txt
firebase-visualmeta.json
firestore-visualmeta.rules
firestore-visualmeta.indexes.json
storage-visualmeta.rules
```

Suggested Storage prefixes:

```txt
visualmeta/source/{tId}/{sId}/{projectId}/...
visualmeta/generated/{tId}/{sId}/{projectId}/...
visualmeta/export-kits/{tId}/{sId}/{kitId}/...
```

No VisualMeta asset may write to MenuList project image paths.

## 9. Billing Plan

Extend product-aware billing before generation:

- add VisualMeta plan definitions
- add VisualMeta credit packs
- resolve subscription under `productId: "VM"`
- log AI/provider operations under VisualMeta account
- block provider work when credits are unavailable
- keep MenuList AI enhancement packs separate

Billing code must not silently fall back to MenuList when `VM` scope is missing.

## 10. UI Plan

Desktop workspace:

- project list
- project detail
- source snapshot panel
- content unit table/grid
- candidate generation panel
- review panel
- export kit panel
- audit/history panel

Mobile workspace:

- review queue
- content unit detail
- approve/reject/comment
- copy approved text
- download approved kit where supported

Mobile is not the primary batch setup or canvas surface.

## 11. Import Rules

MenuList import is snapshot-only:

- copy item facts
- copy source image metadata or signed export
- compute source hash
- store `sourceContext`
- mark source product and timestamp

VisualMeta must not:

- hold live MenuList listeners
- read MenuList data during normal VisualMeta render
- mutate MenuList projects or stores
- invalidate MenuList public cache unless a separate approved write-back feature exists

## 12. Export Rules

Export kit creation must:

- require all included units to be approved
- create immutable manifest
- store export metadata
- optionally create ZIP in VisualMeta Storage
- record audit log
- produce signed URLs with expiration

Correction after export creates a new version.

## 13. Observability

Track:

- provider call attempts and failures
- credit blocks
- batch job queue/failure counts
- export packaging failures
- stale source markers
- approval/rejection ratios
- generation cost per approved kit

Avoid raw prompts, source images, customer notes, or sensitive payloads in logs.

## 14. Implementation Sequence

1. Confirm domain, Firebase targets, and billing packages.
2. Add disabled flags and product target constants.
3. Add VisualMeta Firebase config files and emulator-safe helpers.
4. Add types, constants, and DAL skeleton.
5. Add Firestore and Storage rules.
6. Add project/source/content-unit CRUD.
7. Add review events and approval state.
8. Add provider calls behind VisualMeta credits.
9. Add export kit manifest and Storage packaging.
10. Add mobile review surface.
11. Add public website behind disabled flag.
12. Run routing, rules, cost, mobile, and product-boundary tests.

## 15. Non-Activation Rule

Do not enable `ENABLE_VISUALMETA_PRODUCT` until:

- type checks pass
- Firebase rules and indexes validate
- functions deploy target is verified if functions are used
- product host smoke tests pass
- billing scope cannot fall back to MenuList
- provider costs are blocked when credits are absent
- export manifests are immutable
- no direct publishing or auto-approval control exists

## 16. Documentation Cost

This implementation plan creates no runtime cost. It is a planning document only.
