# CueLayers - Test Cases

## Status

Planning test matrix. Implement these tests with the feature.

## Deterministic Fixture Requirement

Before plugging in live model providers, build a deterministic fixture harness:

```text
known source image
  -> synthetic observation bundle
  -> scene resolver
  -> reconstruction document
  -> editor projection
  -> shared Creative Editor load
  -> autosave
  -> validation
  -> export
```

This isolates schema, storage, editor, validation, and export bugs from nondeterministic model behavior.

## Golden Fixture Set

| Fixture | Expected coverage |
| --- | --- |
| Simple offer poster | Text, background shape, CTA, logo, z-order. |
| Text-heavy menu/service graphic | OCR grouping, text safety, fallback. |
| Photo-heavy food/salon banner | Raster masking, clean background, visual validation. |
| Logo/vector-like graphic | Vector eligibility and path limits. |
| Generated design-first poster | Intended text -> native editor text. |
| Generated flat image with wrong text | Text safety rejects generated-pixel text mismatch. |
| Generated design with intended text | Intended business text becomes native editor text and OCR conflicts are flagged. |
| Uploaded poster with known business facts | OCR/model text conflicting with CampaignCue facts stays raster or needs review. |
| Tiny text poster | Unsupported/flat-safe mode. |
| Overcompressed JPEG | Normalization and needs review path. |
| Watermarked image | Unsupported or rights-warning path. |
| Complex collage | Layer cap and flat-safe fallback. |
| Bad OCR case | Text remains raster fallback. |
| Ambiguous z-order design | Manual reorder remains available. |

## Unit Tests

| Area | Test |
| --- | --- |
| Source package | Reject unsupported source kind; require workspace/design/user/source ids. |
| Source package collision | Same design can have two source packages without overwriting original, normalized, layer, or report artifacts. |
| Storage paths | Generate deterministic immutable paths with workspace/design/sourcePackage/job/reconstruction/version/repair/export ids; prevent path traversal. |
| Signed URL stripping | Runtime URLs convert back to `cue-asset://` or asset id before persistence. |
| Asset URI scheme | Durable documents use `cue-asset://assetId`; hydration fails if the asset does not belong to the same workspace/design. |
| Schema validation | Reconstruction document rejects missing confidence/provenance/fallback. |
| Schema migration | Old `CreativeEditorDocumentSnapshot` fixtures open after a schema version bump through the migration reader. |
| Observation bundle | Model outputs remain observations and cannot directly become Fabric objects. |
| Scene resolver | Low-confidence observations downgrade to raster fallback. |
| Text safety | Semantic mismatch blocks editable text. |
| Business truth matching | Protected fields from CampaignCue facts block or downgrade conflicting text candidates. |
| Business truth snapshot replay | Facts changed after job creation do not change replay; reconstruction uses the original source-package truth snapshot. |
| Vector eligibility | Photographic/high-texture/complex path candidates remain raster. |
| Layer cap | Excess candidates merge/downgrade instead of overloading editor. |
| Status transitions | Invalid job transitions fail. |
| Idempotency | Retried worker step does not duplicate artifacts or mark double completion. |
| Cost estimator | Rejects job when budget/limits are exceeded. |
| Model registry | Chooses low-cost/default model for normal jobs and premium model only when route policy plus capacity allow it. |
| Model registry | Ignores disabled/deprecated entries and never writes exact model id assumptions into durable editor state. |
| Provider preflight | SAFE_MODE, rate limit, source quality, hash dedupe, and capacity checks run before provider dispatch. |
| Route resolver | Graphic/photo/text/vector/generated/unsupported routes choose expected budgets. |
| Engine adapter | Gemini/OCR/SAM/LayerD-style outputs become observations only. |
| CORS/runtime URLs | Durable JSON contains asset refs; runtime payload hydrates only allowed assets. |
| Cache headers | Immutable artifacts and short-lived runtime URLs use different cache policy. |

## API Tests

| Endpoint | Case |
| --- | --- |
| Upload session | 401 when signed out. |
| Upload session | 403 when tenant/store scope does not match workspace. |
| Upload session | Reject unsupported MIME and excessive file size. |
| Job create | Requires idempotency key. |
| Job create | Replays same idempotency key safely. |
| Job status | Reads only a single scoped job/design. |
| Cancel | Cannot cancel completed/failed jobs. |
| Boot | Hydrates only workspace-owned assets. |
| Autosave | Rejects huge editor document snapshots, base64 blobs, and unknown object types. |
| Repair | Rate-limited and requires existing design/layer. |
| Export | Flushes/uses saved runtime state, not stale browser-only state. |
| Export | Rejects when `exportRequest.sourceRevision` does not match `cueLayerDesigns.current.revision`. |
| Worker lease | Stale lease can retry without duplicating completed artifacts. |
| Job cancel | Soft cancel stops remaining expensive steps and leaves cleanup-safe artifacts. |

## Security Tests

| Risk | Expected result |
| --- | --- |
| Arbitrary SVG payload | Sanitized/rejected; never trusted as canonical. |
| JavaScript URL in image object | Rejected before render/export. |
| External image URL | Rejected unless product-owned and allowlisted. |
| Data URL/base64 blob | Rejected from durable autosave/export. |
| Unknown Fabric class | Rejected by renderer allowlist. |
| Unknown element type/property | Rejected before Playwright/server render, with a safe owner error. |
| Huge canvas | Rejected by hard limit. |
| Too many objects | Rejected or downgraded. |
| Tenant id in request body | Ignored in favor of session scope. |
| Signed URL in saved JSON | Test fails; durable JSON must not contain signed URL. |
| Raw prompt/contact data in logs | Test fails; logs must be sanitized. |
| Public bucket access | CueLayers source/runtime/report paths are not public by default. |
| App Check | Client upload/status requests enforce App Check when configured. |

## Editor Tests

| Flow | Expected result |
| --- | --- |
| Open ready CueLayers design | Loads existing shared Creative Editor. |
| Open needs review design | Shows warning and fallback labels. |
| Select text layer | Shows text safety status and fallback option. |
| Duplicate AI layer | Preserves source metadata with duplicate provenance. |
| Delete AI layer | Marks runtime dirty without mutating reconstruction truth. |
| Reorder layer | Updates runtime only and preserves layer id mapping. |
| Restore fallback | Replaces runtime object with fallback asset. |
| Deleted asset pointer | Missing `cue-asset://assetId` opens a flat-safe fallback or safe error, not a blank/crashing editor. |
| Replace image | Creates repair/user replacement path, not direct external URL persistence. |
| Save | Writes debounced `CreativeEditorDocumentSnapshot` to Storage and updates Firestore pointer. |
| Preview/export | Serializes current canvas state before export. |
| Browser SVG/JSON export | Disabled for active CueLayers documents so hydrated private asset URLs and unowned runtime JSON do not leave the product-owned export path. |
| User-edited text semantics | A later owner edit marks the text as user-owned and does not claim original AI text-safety approval for that object. |

## Visual Validation Tests

| Case | Expected result |
| --- | --- |
| Faithful render | `ready` if text safety also passes. |
| Slight mask drift | `needs_review` with layer warning. |
| Large visual mismatch | `failed` or flat-safe output. |
| Text visually close but semantically changed | Text safety blocks ready. |
| Background repair outside mask changes pixels | Validation fails. |
| Font mismatch | Renderer missing the preferred font uses an approved fallback or marks `outcome=needs_review`. |

## Accuracy Gate Tests

| Gate | Required tests |
| --- | --- |
| Pixel fidelity | Source-to-reconstruction render diff passes for a golden poster and fails for a deliberately shifted layer. |
| Text fidelity | Protected price/date/phone/business-name changes block editable text even when visual similarity is high. |
| Structural usefulness | Over-fragmented outputs are merged/downgraded and cannot mark the job `ready` by layer count alone. |
| Export fidelity | Server-rendered PNG matches saved editor preview within threshold before download is marked ready. |
| Quality report | Firestore stores only compact gate summary; full report and diff artifacts are stored in Storage/GCS. |

## Cost Tests

| Case | Expected result |
| --- | --- |
| Workspace load | Does not load all CueLayers artifacts. |
| Status UI | Uses one doc listener or bounded polling and unsubscribes/stops. |
| Autosave typing | Debounced; no write per keystroke. |
| Reopen design | Reads pointer doc plus one runtime artifact, not full history. |
| Export | Creates one export request and one output artifact. |
| Duplicate image upload | Dedupes or warns when hash already exists. |
| Duplicate generated design | Same source hash + design intent hash + prompt/model version does not create a duplicate provider job. |
| Premium model route | Premium image model is blocked when cost estimate or owner/account capacity fails. |
| Low-quality source | Low-quality source exits to flat-safe/unsupported before premium provider calls. |
| Diagnostics retention | Temporary reports and failed artifacts expire by lifecycle class. |

## MenuList Adapter Tests

| Case | Expected result |
| --- | --- |
| MenuList generated item image source | Creates a MenuList-owned source package with project/store/item ids and no CampaignCue workspace id. |
| Outlet inherited item | Reconstruction/edit flow is blocked by MenuList outlet image governance. |
| Accepted edited item image | Writes through MenuList media image paths and invalidates public menu/OBP cache through existing MenuList rules. |
| MenuList editor open | Uses shared Creative Editor through a MenuList adapter; base editor imports no MenuList project state. |
| MenuList cost accounting | Uses existing AI capacity/accounting and does not write CampaignCue cost records. |

MenuList adapter tests are required before MenuList adoption. They are not a blocker for CampaignCue CueLayers v1 as long as the shared core has no CampaignCue imports and all CampaignCue paths stay product-scoped.

## Export Tests

| Format | Expected result |
| --- | --- |
| PNG | Primary output renders from saved runtime state. |
| JPEG | Output flattens transparency safely. |
| WebP | Optional output only when renderer supports it. |
| Flattened PDF | PDF is flat output, not layered design-file promise. |
| SVG | Disabled or best-effort only after sanitizer/allowlist passes. |
| Editor document snapshot | Contains no signed URLs, base64 blobs, or untrusted external URLs. |
| Revision conflict | Repair patch or export generated against revision N cannot apply to revision N+1 without explicit conflict handling. |
| ZIP/PSD | Not required for production readiness unless explicitly implemented as a separate governed output. |

## Browser Tests

| Viewport | Flow |
| --- | --- |
| Desktop | Upload source, see progress, open editor, layer panel, fallback, save/export. |
| Desktop | Generated design source opens same editor runtime as upload source. |
| Desktop | Needs-review text shows plain warning and safe fallback. |
| Mobile | Upload/status/preview/download without horizontal overflow. |
| Mobile | Full layer editing is not exposed as a dense broken experience. |
| Mobile | Hidden routes cannot accidentally open dense layer editing outside the supported mobile subset. |

## Regression Gates

Implementation cannot be marked production-ready until:

- `npm run verify:campaigncue` includes CueLayers checks.
- TypeScript passes.
- Lint passes.
- Build passes.
- Firebase rules/index/storage validation passes after infrastructure edits.
- Deterministic fixture replay passes.
- Browser smoke passes desktop and mobile supported subset.
- No durable JSON contains signed URLs, base64 blobs, or untrusted external URLs.
- Accuracy gates pass for pixel fidelity, protected text fidelity, structural usefulness, and export fidelity.
- Provider preflight proves model calls cannot happen before dedupe, source quality, rate limit, SAFE_MODE, and capacity gates.
- Shared core has no CampaignCue imports.
- MenuList adapter tests pass before the shared core is reused by MenuList menu item image editing.
