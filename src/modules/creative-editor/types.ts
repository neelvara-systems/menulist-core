export const CREATIVE_EDITOR_SCHEMA_VERSION = "creative-editor.v1" as const;

export type CreativeEditorProductId =
    | "CC"
    | "campaigncue"
    | "menulist"
    | "answerlattice"
    | "internal"
    | (string & {});

export type CreativeEditorElementType =
    | "text"
    | "rect"
    | "ellipse"
    | "image"
    | "qr"
    | "line"
    | "pathText"
    | "triangle"
    | "polygon"
    | "path";

export type CreativeEditorExportFormat = "svg" | "png" | "json";

export interface CreativeEditorProductContext {
    productId: CreativeEditorProductId;
    sourceSurface?: string;
    workspaceId?: string;
}

export interface CreativeEditorSourceRef {
    campaignId?: string;
    channel?: string;
    label: string;
    locked?: boolean;
    outputId?: string;
    productId?: CreativeEditorProductId;
    sourceRef?: string;
    value?: string;
}

export interface CreativeEditorCanvas {
    backgroundColor: string;
    backgroundGradient?: CreativeEditorLinearGradient;
    height: number;
    width: number;
}

export interface CreativeEditorElementBase {
    blur?: number;
    editorGuide?: boolean;
    excludeFromExport?: boolean;
    flipX?: boolean;
    flipY?: boolean;
    height: number;
    id: string;
    locked?: boolean;
    name: string;
    opacity?: number;
    rotation?: number;
    shadow?: CreativeEditorShadow;
    sourceRefs?: CreativeEditorSourceRef[];
    printFrameId?: string;
    printFrameLocked?: boolean;
    type: CreativeEditorElementType;
    visible?: boolean;
    width: number;
    x: number;
    y: number;
}

export type CreativeEditorStrokeStyle =
    | "solid"
    | "dashed"
    | "dashed-round"
    | "dash-dot"
    | "dash-dot-round"
    | "dotted"
    | "dotted-round"
    | "long-dashed"
    | "long-dashed-round";

export type CreativeEditorStrokeLineCap = "butt" | "round" | "square";
export type CreativeEditorLineArrowStyle = "none" | "arrow" | "thin-tail-arrow";
export type CreativeEditorImageFilter =
    | "none"
    | "blackwhite"
    | "brownie"
    | "grayscale"
    | "invert"
    | "kodachrome"
    | "polaroid"
    | "sepia"
    | "technicolor"
    | "vintage";

export type CreativeEditorGrayscaleMode = "average" | "lightness" | "luminosity";

export interface CreativeEditorGradientStop {
    color: string;
    offset: number;
}

export interface CreativeEditorLinearGradient {
    angle: number;
    enabled: boolean;
    from: string;
    stops?: CreativeEditorGradientStop[];
    to: string;
}

export interface CreativeEditorImageFilterAdjustments {
    blur?: number;
    brightness?: number;
    contrast?: number;
    gammaBlue?: number;
    gammaGreen?: number;
    gammaRed?: number;
    grayscaleMode?: CreativeEditorGrayscaleMode;
    hueRotation?: number;
    noise?: number;
    pixelate?: number;
    removeColor?: string;
    removeColorDistance?: number;
    saturation?: number;
    vibrance?: number;
}

export interface CreativeEditorShadow {
    blur: number;
    color: string;
    offsetX: number;
    offsetY: number;
}

export interface CreativeEditorTextElement extends CreativeEditorElementBase {
    align?: "left" | "center" | "right";
    charSpacing?: number;
    color: string;
    fontFamily?: string;
    fontSize: number;
    fontStyle?: "italic" | "normal";
    fontWeight?: "400" | "600" | "700" | "800" | "900" | "bold" | "normal";
    gradient?: CreativeEditorLinearGradient;
    lineHeight?: number;
    linethrough?: boolean;
    text: string;
    textBackgroundColor?: string;
    type: "text";
    underline?: boolean;
}

export interface CreativeEditorPathTextElement extends CreativeEditorElementBase {
    align?: "left" | "center" | "right";
    charSpacing?: number;
    color: string;
    fontFamily?: string;
    fontSize: number;
    fontStyle?: "italic" | "normal";
    fontWeight?: "400" | "600" | "700" | "800" | "900" | "bold" | "normal";
    gradient?: CreativeEditorLinearGradient;
    lineHeight?: number;
    linethrough?: boolean;
    path: string;
    pathStroke?: string;
    pathVisible?: boolean;
    stroke?: string;
    strokeLineCap?: CreativeEditorStrokeLineCap;
    strokeStyle?: CreativeEditorStrokeStyle;
    strokeWidth?: number;
    text: string;
    textBackgroundColor?: string;
    type: "pathText";
    underline?: boolean;
}

export interface CreativeEditorRectElement extends CreativeEditorElementBase {
    fill: string;
    gradient?: CreativeEditorLinearGradient;
    radius?: number;
    stroke?: string;
    strokeLineCap?: CreativeEditorStrokeLineCap;
    strokeStyle?: CreativeEditorStrokeStyle;
    strokeWidth?: number;
    type: "rect";
}

export interface CreativeEditorEllipseElement extends CreativeEditorElementBase {
    fill: string;
    gradient?: CreativeEditorLinearGradient;
    stroke?: string;
    strokeLineCap?: CreativeEditorStrokeLineCap;
    strokeStyle?: CreativeEditorStrokeStyle;
    strokeWidth?: number;
    type: "ellipse";
}

export interface CreativeEditorTriangleElement extends CreativeEditorElementBase {
    fill: string;
    gradient?: CreativeEditorLinearGradient;
    stroke?: string;
    strokeLineCap?: CreativeEditorStrokeLineCap;
    strokeStyle?: CreativeEditorStrokeStyle;
    strokeWidth?: number;
    type: "triangle";
}

export interface CreativeEditorPoint {
    x: number;
    y: number;
}

export interface CreativeEditorPolygonElement extends CreativeEditorElementBase {
    fill: string;
    gradient?: CreativeEditorLinearGradient;
    points: CreativeEditorPoint[];
    stroke?: string;
    strokeLineCap?: CreativeEditorStrokeLineCap;
    strokeStyle?: CreativeEditorStrokeStyle;
    strokeWidth?: number;
    type: "polygon";
}

export interface CreativeEditorPathElement extends CreativeEditorElementBase {
    fill: string;
    gradient?: CreativeEditorLinearGradient;
    path: string;
    stroke?: string;
    strokeLineCap?: CreativeEditorStrokeLineCap;
    strokeStyle?: CreativeEditorStrokeStyle;
    strokeWidth?: number;
    type: "path";
}

export interface CreativeEditorLineElement extends CreativeEditorElementBase {
    arrowStyle?: CreativeEditorLineArrowStyle;
    stroke: string;
    strokeLineCap?: CreativeEditorStrokeLineCap;
    strokeStyle?: CreativeEditorStrokeStyle;
    strokeWidth?: number;
    type: "line";
}

export interface CreativeEditorImageElement extends CreativeEditorElementBase {
    alt?: string;
    filter?: CreativeEditorImageFilter;
    filterAdjustments?: CreativeEditorImageFilterAdjustments;
    fit?: "cover" | "contain";
    outlineColor?: string;
    outlineEnabled?: boolean;
    outlineOnly?: boolean;
    outlineWidth?: number;
    src: string;
    stroke?: string;
    strokeLineCap?: CreativeEditorStrokeLineCap;
    strokeStyle?: CreativeEditorStrokeStyle;
    strokeWidth?: number;
    type: "image";
}

export interface CreativeEditorQrElement extends CreativeEditorElementBase {
    darkColor?: string;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    lightColor?: string;
    margin?: number;
    type: "qr";
    value: string;
}

export type CreativeEditorElement =
    | CreativeEditorTextElement
    | CreativeEditorPathTextElement
    | CreativeEditorRectElement
    | CreativeEditorEllipseElement
    | CreativeEditorTriangleElement
    | CreativeEditorPolygonElement
    | CreativeEditorPathElement
    | CreativeEditorLineElement
    | CreativeEditorImageElement
    | CreativeEditorQrElement;

export interface CreativeEditorBrand {
    accentColor?: string;
    fontFamily?: string;
    logoUrl?: string;
    name?: string;
    primaryColor?: string;
    secondaryColor?: string;
    voice?: string;
}

export interface CreativeEditorTextPlaceholder {
    id: string;
    label: string;
    sourceRef?: string;
    value: string;
}

export interface CreativeEditorVisibleWatermark {
    color: string;
    enabled: boolean;
    fontFamily?: string;
    fontSize: number;
    opacity: number;
    position: "bottom-left" | "bottom-right" | "center" | "top-left" | "top-right" | "tiled";
    rotation?: number;
    text: string;
}

export interface CreativeEditorPrintFrame {
    height: number;
    id: string;
    label: string;
    locked?: boolean;
    width: number;
    x: number;
    y: number;
}

export interface CreativeEditorMetadata {
    brand?: CreativeEditorBrand;
    campaignId?: string;
    channel?: string;
    createdAt?: string;
    outputId?: string;
    printFrames?: CreativeEditorPrintFrame[];
    sourceRefs?: CreativeEditorSourceRef[];
    templateId?: string;
    textPlaceholders?: CreativeEditorTextPlaceholder[];
    trustGate?: string;
    updatedAt?: string;
    visibleWatermark?: CreativeEditorVisibleWatermark;
}

export interface CreativeEditorPage {
    canvas: CreativeEditorCanvas;
    elements: CreativeEditorElement[];
    id: string;
    locked?: boolean;
    title: string;
    updatedAt?: string;
}

export interface CreativeEditorDocument {
    activePageId?: string;
    canvas: CreativeEditorCanvas;
    elements: CreativeEditorElement[];
    id: string;
    metadata?: CreativeEditorMetadata;
    pages?: CreativeEditorPage[];
    productContext: CreativeEditorProductContext;
    schemaVersion: typeof CREATIVE_EDITOR_SCHEMA_VERSION;
    title: string;
}

export type CreativeEditorTemplateOrigin = "platform" | "user";

export interface CreativeEditorTemplateSummary {
    assetTypeId?: string;
    businessCategory?: string;
    createdAt?: string;
    description?: string;
    documentPath?: string | null;
    height: number;
    id: string;
    origin: CreativeEditorTemplateOrigin;
    previewPath?: string | null;
    productId: CreativeEditorProductId;
    schemaVersion?: number;
    sourceSurface: string;
    status?: "draft" | "published" | "archived";
    templateFamilyId?: string;
    templateType: CreativeEditorTemplateOrigin;
    thumbnailUrl?: string | null;
    title: string;
    updatedAt?: string;
    version?: number;
    width: number;
}

export interface CreativeEditorTemplateSaveRequest {
    document: CreativeEditorDocument;
    previewDataUrl?: string;
}

export interface CreativeEditorTemplateSaveResult {
    notice?: string;
    template?: CreativeEditorTemplateSummary;
}

export type CreativeEditorTemplateSaveHandler = (
    request: CreativeEditorTemplateSaveRequest,
) => CreativeEditorTemplateSaveResult | Promise<CreativeEditorTemplateSaveResult | void> | void;

export interface CreativeEditorAssetSource {
    id: string;
    label: string;
    sourceRef?: string;
    type: "image" | "logo";
    url: string;
}

export type CreativeEditorAiToolCategory = "recommended" | "copy" | "image" | "check" | "export";

export type CreativeEditorAiToolTone = "success" | "warning" | "danger" | "neutral";

export interface CreativeEditorAiToolAction {
    category: CreativeEditorAiToolCategory;
    costLabel?: string;
    description: string;
    disabled?: boolean;
    disabledReason?: string;
    id: string;
    label: string;
    ownerHint?: string;
    requiresImageSelection?: boolean;
    requiresSelection?: boolean;
}

export interface CreativeEditorAiToolSuggestion {
    actionLabel?: string;
    id: string;
    label: string;
    text: string;
}

export interface CreativeEditorAiToolFinding {
    id: string;
    text: string;
    tone: CreativeEditorAiToolTone;
}

export interface CreativeEditorAiToolRequest {
    action: CreativeEditorAiToolAction;
    actionId: string;
    document: CreativeEditorDocument;
    productLabel?: string;
    selectedElement?: CreativeEditorElement | null;
    selectedText?: string;
    sourceLabel?: string;
}

export interface CreativeEditorAiToolResult {
    findings?: CreativeEditorAiToolFinding[];
    notice?: string;
    suggestions?: CreativeEditorAiToolSuggestion[];
}

export type CreativeEditorAiToolHandler = (
    request: CreativeEditorAiToolRequest,
) => CreativeEditorAiToolResult | Promise<CreativeEditorAiToolResult>;

export type CreativeEditorDesignCueIntentSource =
    | "canvas_comment"
    | "command_chip"
    | "free_text"
    | "selected_layer_comment";

export type CreativeEditorDesignCueExecutionMode =
    | "model_assisted_copy"
    | "model_assisted_critique"
    | "model_assisted_intent"
    | "programmatic";

export type CreativeEditorDesignCueFindingTone = "blocked" | "note" | "ready" | "review";

export type CreativeEditorDesignCueCanvasPreset = "poster" | "square" | "story" | "wide";

export type CreativeEditorDesignCueTextPlacement = "center" | "cta_zone" | "near_target";

export type CreativeEditorDesignCueTarget =
    | { type: "canvas_region"; height: number; width: number; x: number; y: number }
    | { type: "document" }
    | { type: "layer"; elementId: string };

export interface CreativeEditorDesignCueSafeLayerPatch {
    align?: "center" | "left" | "right";
    color?: string;
    fill?: string;
    fontSize?: number;
    fontStyle?: "italic" | "normal";
    fontWeight?: "400" | "600" | "700" | "800" | "900" | "bold" | "normal";
    height?: number;
    lineHeight?: number;
    name?: string;
    opacity?: number;
    rotation?: number;
    stroke?: string;
    strokeWidth?: number;
    visible?: boolean;
    width?: number;
    x?: number;
    y?: number;
}

export type CreativeEditorDesignCuePatchOperation =
    | {
        name?: string;
        op: "add_text";
        placement: CreativeEditorDesignCueTextPlacement;
        text: string;
    }
    | {
        id?: string;
        op: "add_finding";
        text: string;
        tone: CreativeEditorDesignCueFindingTone;
    }
    | {
        op: "resize_canvas";
        preset: CreativeEditorDesignCueCanvasPreset;
    }
    | {
        elementId: string;
        op: "update_layer";
        patch: CreativeEditorDesignCueSafeLayerPatch;
    }
    | {
        elementId: string;
        op: "update_text";
        text: string;
    };

export interface CreativeEditorDesignCueFinding {
    id: string;
    text: string;
    tone: CreativeEditorDesignCueFindingTone;
}

export interface CreativeEditorDesignCuePatchSet {
    executionMode: CreativeEditorDesignCueExecutionMode;
    findings?: CreativeEditorDesignCueFinding[];
    id: string;
    needsReview: boolean;
    operations: CreativeEditorDesignCuePatchOperation[];
    protectedFactsUsed: string[];
    summary: string;
    target: CreativeEditorDesignCueTarget;
    title: string;
}

export interface CreativeEditorDesignCueCommand {
    description: string;
    disabled?: boolean;
    disabledReason?: string;
    id: string;
    label: string;
    ownerHint?: string;
    requiresSelection?: boolean;
}

export interface CreativeEditorDesignCueRequest {
    commandId?: string;
    comment?: string;
    document: CreativeEditorDocument;
    productLabel?: string;
    selectedElement?: CreativeEditorElement | null;
    selectedText?: string;
    source: CreativeEditorDesignCueIntentSource;
    sourceLabel?: string;
    target: CreativeEditorDesignCueTarget;
}

export interface CreativeEditorDesignCueApplyRequest {
    document: CreativeEditorDocument;
    patchSet: CreativeEditorDesignCuePatchSet;
}

export interface CreativeEditorDesignCueApplyResult {
    appliedOperationCount: number;
    document: CreativeEditorDocument;
    findings?: CreativeEditorDesignCueFinding[];
    notice?: string;
    selectedElementId?: string;
}

export type CreativeEditorDesignCueHandler = (
    request: CreativeEditorDesignCueRequest,
) => CreativeEditorDesignCuePatchSet | Promise<CreativeEditorDesignCuePatchSet>;

export type CreativeEditorDesignCueApplyHandler = (
    request: CreativeEditorDesignCueApplyRequest,
) => CreativeEditorDesignCueApplyResult | Promise<CreativeEditorDesignCueApplyResult>;

export interface CreativeEditorExportResult {
    blob?: Blob;
    dataUrl?: string;
    document: CreativeEditorDocument;
    filename: string;
    format: CreativeEditorExportFormat;
    mimeType: string;
    sizeBytes: number;
    svg?: string;
}
