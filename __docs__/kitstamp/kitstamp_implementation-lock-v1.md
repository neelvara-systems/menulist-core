# KitStamp - Implementation Lock v1

**Status:** Active planning lock for first implementation
**Created:** May 31, 2026
**Product code:** `KS`
**Purpose:** Freeze the contracts that engineering should use before any KitStamp product feature implementation starts.

---

## 1. Lock Position

KitStamp implementation may begin only with foundation work.

Allowed first:

- disabled feature flags
- product constants
- disabled route skeleton
- Firebase config/rules/index/storage skeleton
- KitStamp Firebase helpers
- types and constants
- DAL skeleton
- emulator/rules test skeleton

Not allowed first:

- provider generation
- MenuList import
- export adapters
- guest review links
- public launch
- downstream API push
- billing-enabled provider calls

## 2. Environment Matrix

| Environment | Route/domain | Firebase target | Status |
| --- | --- | --- | --- |
| Local | `http://localhost:3000/__kitstamp` | `kitstamp-qa` | selected for planning |
| Preview / QA | final QA domain TBD | `kitstamp-qa` | must be provisioned |
| Production | `https://kitstamp.com` unless founder chooses another domain | `kitstamp` | must be provisioned |

Activation rule:

> Keep KitStamp product-domain routing disabled until the deployment target, Firebase target, route smoke tests, and billing scope are verified.

## 3. Feature Flags

All default off:

```ts
ENABLE_KITSTAMP_PRODUCT: false
ENABLE_KITSTAMP_PUBLIC_SITE: false
ENABLE_KITSTAMP_DASHBOARD: false
ENABLE_KITSTAMP_SOURCE_UPLOADS: false
ENABLE_KITSTAMP_REVIEW: false
ENABLE_KITSTAMP_EXPORT_KITS: false
ENABLE_KITSTAMP_EXPORT_TEMPLATES: false
ENABLE_KITSTAMP_EXPORT_ADAPTERS: false
ENABLE_KITSTAMP_MENU_IMPORT: false
ENABLE_KITSTAMP_GENERATION: false
ENABLE_KITSTAMP_BATCH_JOBS: false
```

Server/function flags:

```txt
ENABLE_KITSTAMP_FUNCTIONS=false
ENABLE_KITSTAMP_PROVIDER_CALLS=false
ENABLE_KITSTAMP_EXPORT_PACKAGING=false
KITSTAMP_FIREBASE_MODE=separate
```

Rule:

> No KitStamp route, mutation API, provider call, Storage write, export operation, or external handoff runs unless `ENABLE_KITSTAMP_PRODUCT=true` and the specific feature flag is also true.

## 4. Product Identity

Every KitStamp-owned document uses:

```ts
type KitStampIdentity = {
  pId: "KS";
  tId: number;
  sId: number;
};
```

Do not use MenuList tenant/store IDs as KitStamp scope. MenuList IDs can appear only inside copied `sourceContext`.

## 5. V1 Collections

First implementation collections:

- `kitstampWorkspaces`
- `kitstampProjects`
- `kitstampSourceSnapshots`
- `kitstampContentUnits`
- `kitstampAssets`
- `kitstampTextVariants`
- `kitstampGenerationJobs`
- `kitstampReviewEvents`
- `kitstampExportKits`
- `kitstampAuditLogs`

Do not create these as first implementation blockers:

- `kitstampImportRows`
- `kitstampImportFiles`
- `kitstampAnnotations`
- `kitstampReviewInvites`
- `kitstampGuestReviewSessions`
- `kitstampDestinationProfiles`
- `kitstampStyleProfiles`
- `kitstampLocaleGlossaries`
- `kitstampExportTemplates`
- `kitstampExportAdapters`
- `kitstampAdapterMappings`

For the first implementation, export templates and adapters should be code registries, not Firestore collections.

## 6. Source Snapshot Schema

```ts
type KitStampSourceSnapshot = KitStampIdentity & {
  id: string;
  projectId: string;
  contentUnitId?: string;
  version: number;
  status: "active" | "superseded" | "locked_for_export" | "archived";
  sourceContext: {
    sourcePId: "ML" | "AL" | "GR" | "external" | "manual" | "upload";
    sourceTId?: number;
    sourceSId?: number;
    sourceDocId?: string;
    sourceLabel?: string;
    importedBy: string;
    importedAt: Timestamp;
    sourceHash: string;
  };
  facts: Record<string, unknown>;
  lockedFacts: Array<{
    key: string;
    label: string;
    value: unknown;
    mode: "hard_lock" | "soft_lock" | "display_only" | "review_required";
    riskLevel: "low" | "medium" | "high" | "critical";
    requiredForApproval: boolean;
  }>;
  sourceAssetIds: string[];
  sourceHash: string;
  hashInputVersion: "source-snapshot-v1";
  createdBy: string;
  createdAt: Timestamp;
};
```

Rule:

> Never mutate an approved-against or exported source snapshot in place. Create a new snapshot version and mark affected content stale.

## 7. Source Hash Contract

Use:

```txt
sha256(normalizedFacts + sourceAssetRefs + requirementKeys + hashInputVersion)
```

Rules:

- normalize JSON keys
- normalize safe strings
- sort list fields only where order is not meaningful
- include source asset references or copied file hashes
- exclude volatile fields such as `updatedAt`
- store `hashInputVersion`

Source hash is required for:

- candidate generation
- review approval
- stale detection
- export manifest
- provenance report

## 8. Content Unit Schema

```ts
type KitStampContentUnit = KitStampIdentity & {
  id: string;
  projectId: string;
  label: string;
  subjectType:
    | "menu_item"
    | "product"
    | "offer"
    | "place"
    | "listing"
    | "article"
    | "service"
    | "other";
  sourceSnapshotId: string;
  sourceHash: string;
  sourceContext?: {
    sourcePId: "ML" | "AL" | "GR" | "external" | "manual" | "upload";
    sourceDocId?: string;
    sourceLabel?: string;
    importedAt?: Timestamp;
  };
  factsSummary: Record<string, unknown>;
  sourceAssetIds: string[];
  candidateAssetIds: string[];
  candidateTextVariantIds: string[];
  approvedAssetIds: string[];
  approvedTextVariantIds: string[];
  status:
    | "draft"
    | "source_missing"
    | "source_ready"
    | "candidate_missing"
    | "candidate_ready"
    | "in_review"
    | "changes_requested"
    | "approved"
    | "stale"
    | "exported"
    | "archived";
  readiness: {
    hasSourceFacts: boolean;
    hasSourceAsset: boolean;
    hasCandidateImage: boolean;
    hasCandidateText: boolean;
    hasApprovedImage: boolean;
    hasApprovedText: boolean;
    hasRequiredTranslations: boolean;
    hasApprovedAltText: boolean;
    hasUnresolvedNotes: boolean;
    hasBlockingWarnings: boolean;
    isSourceStale: boolean;
    isExportEligible: boolean;
    missingRequirements: string[];
    blockers: string[];
  };
  reviewSummary: {
    unresolvedCommentCount: number;
    requestedChangesCount: number;
    assignedReviewerIds: string[];
    lastReviewEventId?: string;
    approvedBy?: string;
    approvedAt?: Timestamp;
  };
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

## 9. Asset Schema

```ts
type KitStampAsset = KitStampIdentity & {
  id: string;
  projectId: string;
  contentUnitId: string;
  sourceSnapshotId: string;
  sourceHash: string;
  kind:
    | "source"
    | "uploaded_candidate"
    | "generated_candidate"
    | "edited_candidate"
    | "approved_output";
  role:
    | "source"
    | "primary"
    | "secondary"
    | "lifestyle"
    | "thumbnail"
    | "social_square"
    | "social_vertical"
    | "website_banner"
    | "transparent_background"
    | "marketplace_primary"
    | "menu_item_photo"
    | "other";
  status:
    | "draft"
    | "ready_for_review"
    | "in_review"
    | "changes_requested"
    | "approved"
    | "rejected"
    | "stale"
    | "superseded"
    | "archived";
  storagePath: string;
  fileName: string;
  mimeType: string;
  width?: number;
  height?: number;
  fileSizeBytes?: number;
  fileHash?: string;
  parentAssetId?: string;
  generationJobId?: string;
  importBatchId?: string;
  approvedBy?: string;
  approvedAt?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

Uploaded, imported, or generated assets never become approved by default.

## 10. Text Variant Schema

```ts
type KitStampTextVariant = KitStampIdentity & {
  id: string;
  projectId: string;
  contentUnitId: string;
  sourceSnapshotId: string;
  sourceHash: string;
  kind:
    | "description_short"
    | "description_long"
    | "caption"
    | "alt_text"
    | "translation"
    | "usage_note"
    | "marketplace_title"
    | "seo_description"
    | "menu_description"
    | "social_caption"
    | "other";
  locale: string;
  body: string;
  status:
    | "draft"
    | "ready_for_review"
    | "in_review"
    | "changes_requested"
    | "approved"
    | "rejected"
    | "stale"
    | "superseded"
    | "archived";
  sourceTextVariantId?: string;
  translatedFromLocale?: string;
  targetLocale?: string;
  generationJobId?: string;
  styleProfileId?: string;
  destinationProfileId?: string;
  factCheck?: {
    status: "not_checked" | "passed" | "warnings" | "failed" | "resolved";
    blockingWarningCount: number;
  };
  approvedBy?: string;
  approvedAt?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

Generated, translated, rewritten, and imported text stays candidate/draft until approved.

## 11. Review Event Schema

```ts
type KitStampReviewEvent = KitStampIdentity & {
  id: string;
  projectId: string;
  contentUnitId: string;
  sourceSnapshotId: string;
  sourceHashAtDecision: string;
  type:
    | "comment"
    | "request_changes"
    | "reject_candidate"
    | "approve_candidate"
    | "approve_content_unit"
    | "mark_stale"
    | "resolve_comment"
    | "reopen_review"
    | "system_stale_marker";
  decision:
    | "none"
    | "approved"
    | "rejected"
    | "changes_requested"
    | "stale";
  assetId?: string;
  textVariantId?: string;
  candidateIds?: string[];
  note?: string;
  reasonCode?: string;
  sourceFactsVisible: boolean;
  sourceImageVisible?: boolean;
  staleWarningVisible?: boolean;
  factCheckStatusAtDecision?: "not_checked" | "passed" | "warnings" | "failed" | "resolved";
  blockingFactWarningsAtDecision?: number;
  createdBy: string;
  createdByRole:
    | "owner"
    | "admin"
    | "editor"
    | "reviewer"
    | "guest_reviewer"
    | "system";
  createdAt: Timestamp;
};
```

Approval is blocked when source snapshot is missing, source is stale, source hash mismatches, blocking warnings exist, or reviewer scope is missing.

## 12. Manifest v1 Schema

```ts
type KitStampManifestV1 = {
  manifestVersion: "1.0";
  product: {
    pId: "KS";
    name: "KitStamp";
  };
  kit: {
    kitId: string;
    projectId: string;
    workspaceId: string;
    version: number;
    status: "ready";
    exportedAt: string;
    exportedBy: string;
    manifestHash: string;
  };
  destinationProfile?: {
    id: string;
    version: string;
    label: string;
  };
  exportTemplate?: {
    id: string;
    version: string;
    label: string;
  };
  exportAdapters?: Array<{
    id: string;
    version: string;
    label: string;
    mode: "file_export";
    outputFilePaths: string[];
  }>;
  contentUnits: Array<{
    contentUnitId: string;
    label: string;
    subjectType: string;
    sourceSnapshotId: string;
    sourceHash: string;
    approvedAssetIds: string[];
    approvedTextVariantIds: string[];
    approvalEventIds: string[];
    exportReadiness: {
      sourceStale: false;
      unresolvedBlockingWarnings: 0;
      requiredOutputsComplete: true;
    };
  }>;
  assets: Array<{
    assetId: string;
    contentUnitId: string;
    role: string;
    fileName: string;
    path: string;
    fileHash?: string;
    approvedBy: string;
    approvedAt: string;
  }>;
  textVariants: Array<{
    textVariantId: string;
    contentUnitId: string;
    kind: string;
    locale: string;
    path?: string;
    bodyHash: string;
    approvedBy: string;
    approvedAt: string;
  }>;
  sourceSnapshots: Array<{
    sourceSnapshotId: string;
    sourceHash: string;
    sourceContext?: {
      sourcePId: string;
      sourceDocId?: string;
      sourceLabel?: string;
    };
  }>;
  approvals: Array<{
    reviewEventId: string;
    contentUnitId: string;
    approvedBy: string;
    approvedAt: string;
    sourceSnapshotId: string;
    sourceHashAtDecision: string;
  }>;
  integrity: {
    hashAlgorithm: "sha256";
    manifestHash: string;
    sourceHashes: string[];
  };
};
```

Manifest is immutable after kit reaches `ready`.

## 13. Export Kit Schema

```ts
type KitStampExportKit = KitStampIdentity & {
  id: string;
  projectId: string;
  version: number;
  status: "creating" | "ready" | "failed" | "revoked" | "superseded";
  contentUnitIds: string[];
  manifestPath: string;
  zipPath?: string;
  readmePath?: string;
  approvalReportPath?: string;
  provenanceReportPath?: string;
  manifestHash?: string;
  sourceHashes: string[];
  destinationProfileId?: string;
  destinationProfileVersion?: string;
  exportTemplateId?: string;
  exportTemplateVersion?: string;
  outputFiles: Array<{
    role:
      | "manifest"
      | "zip"
      | "readme"
      | "csv"
      | "json"
      | "image"
      | "translation"
      | "approval_report"
      | "source_summary"
      | "provenance_report";
    path: string;
    fileName: string;
    mimeType: string;
    hash?: string;
  }>;
  failureCode?: string;
  failureMessageSafe?: string;
  createdBy: string;
  createdAt: Timestamp;
  exportedBy?: string;
  exportedAt?: Timestamp;
  supersedesKitId?: string;
  supersededByKitId?: string;
};
```

## 14. Export Templates

First implementation uses built-in templates:

- `generic_client_handoff`
- `menu_item_handoff`
- `product_catalog_handoff`
- `social_handoff`
- `translation_pack`
- `developer_json`

Rules:

- template ID and version are recorded on the export kit
- template preflight is required
- file naming is sanitized server-side
- collisions are resolved or blocked
- template output can only include approved, non-stale content
- custom template builder is not first implementation
- template marketplace is rejected
- arbitrary template scripting is rejected

## 15. Export Adapters

First implementation may include a generic file-based handoff adapter only after export kits are stable.

Allowed early:

- Generic PIM/DAM handoff package
- Menu item CSV/JSON handoff
- Developer JSON package

Later behind separate flags:

- Shopify CSV package
- DAM asset metadata package
- Cloudinary-ready media manifest

Deferred:

- Google Merchant feed
- Akeneo-specific mapping
- Salsify/SupplierXM package
- Bynder direct upload
- Shopify Admin API push
- Cloudinary API push
- custom webhooks

Rules:

- adapters create files inside the Final Content Kit
- no API push in first implementation
- no credentials in first implementation
- no live sync
- no downstream acceptance guarantee
- adapter ID/version must be recorded in manifest

## 16. MenuList Snapshot Import

Allowed:

- preview selected MenuList items
- verify MenuList source access server-side
- copy selected item facts
- copy/export source image into KitStamp Storage when needed
- store `sourceContext.sourcePId = "ML"`
- compute source hash
- create KitStamp source snapshot
- create KitStamp content unit
- manual refresh creates a new source snapshot version

Forbidden:

- live MenuList listener
- MenuList read during normal KitStamp render
- MenuList write-back
- MenuList price/availability/hours mutation
- MenuList public cache invalidation
- MenuList AI pack usage
- MenuList Storage path write

Recommended limits:

- max MenuList items per import: 250
- import preview required
- manual refresh only
- duplicate source item in same project defaults to skip or refresh existing

## 17. Storage Paths And Limits

Paths:

```txt
kitstamp/source/{tId}/{sId}/{projectId}/...
kitstamp/generated/{tId}/{sId}/{projectId}/...
kitstamp/export-kits/{tId}/{sId}/{kitId}/...
```

Initial limits:

- max source image size: 15 MB
- max source file size: 25 MB
- max project assets: 2,000
- max CSV/XLSX import rows: 1,000
- max folder import files: 500
- max export units per kit: 500
- max output files per kit: 2,000
- public bucket reads: never
- downloads: signed URLs only

## 18. Billing And Credits

Plan names:

- Starter
- Operator
- Agency

Credit categories:

- `image_generation`
- `image_edit`
- `copy_generation`
- `translation`
- `alt_text`
- `batch_generation`

Provider calls remain blocked until exact credit values and provider-cost margins are approved.

Provider call sequence:

1. feature flag
2. auth
3. KS scope
4. Zod validation
5. Safe Mode
6. rate limit
7. cost estimate
8. credit reservation
9. provider call
10. store result as draft
11. settle or refund credits
12. operation log under `KS`

## 19. API Route Contract

Foundation routes:

```txt
POST /api/kitstamp/projects/create
GET  /api/kitstamp/projects
GET  /api/kitstamp/projects/[id]
POST /api/kitstamp/source-snapshots/create
POST /api/kitstamp/source/upload
POST /api/kitstamp/content-units/create
GET  /api/kitstamp/projects/[id]/content-units
POST /api/kitstamp/candidates/assets/create
POST /api/kitstamp/candidates/text/create
POST /api/kitstamp/review/decision
POST /api/kitstamp/export-kits/preflight
POST /api/kitstamp/export-kits/create
GET  /api/kitstamp/export-kits/[id]
```

Do not add generation routes until billing is locked.

Later routes:

```txt
POST /api/kitstamp/generation/candidate
POST /api/kitstamp/generation/batch-trigger
POST /api/kitstamp/generation/worker
POST /api/kitstamp/source/menulist/preview
POST /api/kitstamp/source/menulist/import
POST /api/kitstamp/source/menulist/refresh
GET  /api/kitstamp/export-templates
POST /api/kitstamp/export-templates/preview
GET  /api/kitstamp/export-adapters
POST /api/kitstamp/export-adapters/preflight
```

## 20. Implementation Order

1. Foundation and separation
2. Core workspace and source snapshots
3. Candidate assets/text and review
4. Final Content Kit export
5. Controlled provider calls after billing lock
6. CSV/XLSX and folder intake
7. MenuList snapshot import
8. Export templates
9. File-based export adapters
10. Guest review, annotations, destination profiles, style rules, and localization review

## 21. Activation Gates

Do not enable `ENABLE_KITSTAMP_PRODUCT` until:

- `npx tsc --noEmit --incremental false` passes
- Firebase rules emulator tests exist and pass
- Storage rules tests exist and pass
- `/__kitstamp` local route smoke passes
- product host does not fall into MenuList tenant routing
- KitStamp APIs reject MenuList-only sessions
- KitStamp writes only to KitStamp Firebase
- KitStamp Storage writes only to KitStamp prefixes
- provider calls are blocked when credits are missing
- export manifest is immutable after ready
- no direct publishing controls exist
- no auto-approval controls exist
- no MenuList write-back path exists

## 22. Documentation Cost

This implementation lock creates no runtime cost.
