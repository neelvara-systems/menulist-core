export const CREATIVE_EDITOR_SCHEMA_VERSION = "creative-editor.v1" as const;

export type CreativeEditorProductId =
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
    height: number;
    width: number;
}

export interface CreativeEditorElementBase {
    blur?: number;
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
    fontWeight?: "400" | "600" | "700" | "800" | "bold" | "normal";
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
    fontWeight?: "400" | "600" | "700" | "800" | "bold" | "normal";
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
    lightColor?: string;
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
    logoUrl?: string;
    name?: string;
    primaryColor?: string;
    voice?: string;
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

export interface CreativeEditorMetadata {
    brand?: CreativeEditorBrand;
    campaignId?: string;
    channel?: string;
    createdAt?: string;
    outputId?: string;
    sourceRefs?: CreativeEditorSourceRef[];
    templateId?: string;
    trustGate?: string;
    updatedAt?: string;
    visibleWatermark?: CreativeEditorVisibleWatermark;
}

export interface CreativeEditorDocument {
    canvas: CreativeEditorCanvas;
    elements: CreativeEditorElement[];
    id: string;
    metadata?: CreativeEditorMetadata;
    productContext: CreativeEditorProductContext;
    schemaVersion: typeof CREATIVE_EDITOR_SCHEMA_VERSION;
    title: string;
}

export interface CreativeEditorAssetSource {
    id: string;
    label: string;
    sourceRef?: string;
    type: "image" | "logo";
    url: string;
}

export interface CreativeEditorExportResult {
    document: CreativeEditorDocument;
    filename: string;
    format: CreativeEditorExportFormat;
    mimeType: string;
    sizeBytes: number;
    svg?: string;
}
