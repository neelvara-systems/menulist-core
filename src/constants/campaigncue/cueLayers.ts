export const CAMPAIGNCUE_CUE_LAYERS = {
    FEATURE_LABEL: "CueLayers",
    MAX_UPLOAD_BYTES: 3 * 1024 * 1024,
    MAX_SOURCE_LONG_EDGE: 4096,
    MAX_EDITOR_LONG_EDGE: 2048,
    MAX_CANVAS_PIXELS: 8_000_000,
    MAX_EXPORT_BYTES: 12 * 1024 * 1024,
    MAX_FINAL_LAYERS: 30,
    MAX_EDITOR_PAGES: 12,
    MAX_EDITOR_DOCUMENT_BYTES: 2 * 1024 * 1024,
    MAX_EXPORT_LONG_EDGE: 4096,
    MAX_REPAIR_ATTEMPTS_PER_DAY: 10,
    MAX_PREMIUM_MODEL_CALLS_PER_JOB: 1,
    SCHEMA_VERSION: "campaigncue-cue-layers.v1",
    EDITOR_SNAPSHOT_SCHEMA_VERSION: "campaigncue-cue-layers-editor-snapshot.v1",
    LAYER_INDEX_SCHEMA_VERSION: "campaigncue-cue-layers-layer-index.v1",
} as const;

export const CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES = {
    SOURCE_PACKAGE: "cccl_source",
    DESIGN: "cccl_design",
    JOB: "cccl_job",
    RECONSTRUCTION: "cccl_reconstruction",
    PROJECTION: "cccl_projection",
    VERSION: "cccl_version",
    EXPORT: "cccl_export",
    QUALITY_REPORT: "cccl_quality",
    REPAIR: "cccl_repair",
    CORRECTION: "cccl_correction",
    ASSET: "cccl_asset",
} as const;

export const CAMPAIGNCUE_CUE_LAYER_SOURCE_KINDS = [
    "user_upload",
    "generated_flat_image",
    "generated_design",
] as const;

export const CAMPAIGNCUE_CUE_LAYER_JOB_STATUSES = [
    "created",
    "uploaded",
    "processing",
    "completed",
    "failed",
    "cancelled",
] as const;

export const CAMPAIGNCUE_CUE_LAYER_JOB_OUTCOMES = [
    "ready",
    "needs_review",
    "flat_safe",
    "unsupported",
    "failed",
] as const;

export const CAMPAIGNCUE_CUE_LAYER_PROCESSING_STEPS = [
    "normalizing",
    "observing",
    "decomposing",
    "recovering_text",
    "elementizing",
    "vectorizing",
    "repairing_background",
    "resolving_scene",
    "generating_editor_projection",
    "validating",
    "exporting",
] as const;

export const CAMPAIGNCUE_CUE_LAYER_DESIGN_STATUSES = [
    "draft",
    "processing",
    "ready",
    "needs_review",
    "failed",
    "cancelled",
] as const;

export const CAMPAIGNCUE_CUE_LAYER_ASSET_RETENTION_CLASSES = [
    "source_durable",
    "runtime_durable",
    "diagnostic_temporary",
    "export_durable",
    "repair_durable",
] as const;

export const CAMPAIGNCUE_CUE_LAYER_ALLOWED_EDITOR_ELEMENT_TYPES = [
    "image",
    "text",
    "pathText",
    "rect",
    "ellipse",
    "triangle",
    "polygon",
    "path",
    "line",
    "qr",
] as const;

export const CAMPAIGNCUE_CUE_LAYER_BLOCKED_URL_PREFIXES = [
    "javascript:",
    "data:",
] as const;

export const CAMPAIGNCUE_CUE_LAYER_OWNER_COPY = {
    READY: "Ready",
    NEEDS_REVIEW: "Needs review",
    FLAT_SAFE: "Kept as image for safety",
    TEXT_SAFE_FALLBACK: "Text kept as image because it could not be verified",
    ORIGINAL_PRESERVED: "Original preserved",
    EXPORT_READY: "Export ready",
} as const;

export const CAMPAIGNCUE_CUE_LAYER_MODEL_CAPABILITIES = [
    "image_generation",
    "image_editing",
    "layout_reasoning",
    "ocr",
    "segmentation_masks",
    "text_safety",
    "background_repair",
] as const;
