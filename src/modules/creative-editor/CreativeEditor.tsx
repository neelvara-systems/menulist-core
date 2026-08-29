"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentType, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import type * as fabric from "fabric";
import {
    LuAlignCenter,
    LuAlignCenterVertical,
    LuAlignEndHorizontal,
    LuAlignEndVertical,
    LuAlignHorizontalJustifyCenter,
    LuAlignStartHorizontal,
    LuAlignStartVertical,
    LuArrowDown,
    LuArrowDownToLine,
    LuArrowLeft,
    LuArrowRight,
    LuArrowUp,
    LuArrowUpToLine,
    LuBold,
    LuCircle,
    LuCopy,
    LuDownload,
    LuEye,
    LuEyeOff,
    LuFileImage,
    LuFileInput,
    LuFileJson,
    LuFilter,
    LuFlipHorizontal2,
    LuFlipVertical2,
    LuGroup,
    LuHand,
    LuHash,
    LuHelpCircle,
    LuHexagon,
    LuHome,
    LuImage,
    LuItalic,
    LuKeyboard,
    LuLayers,
    LuLock,
    LuMaximize,
    LuMessageSquare,
    LuMoon,
    LuMousePointer2,
    LuPanelLeftOpen,
    LuPalette,
    LuPencil,
    LuPlus,
    LuQrCode,
    LuRedo2,
    LuRotateCcw,
    LuShapes,
    LuShare2,
    LuShieldCheck,
    LuShuffle,
    LuSparkles,
    LuSquare,
    LuStar,
    LuStrikethrough,
    LuTrash2,
    LuTriangle,
    LuType,
    LuUngroup,
    LuUndo2,
    LuUnderline,
    LuUnlock,
    LuUploadCloud,
    LuGrid,
    LuGripVertical,
    LuZoomIn,
    LuZoomOut,
} from "react-icons/lu";
import { SOLID_COLORS_LIST } from "@constant/craftBuilder";
import {
    copyRuntimeTextToClipboard,
    getBoundedRuntimeStringContext,
    hasRuntimeClipboardWrite,
    hasRuntimeCopyFallback,
    logRuntimeFailure,
} from "@lib/runtime/runtimeDiagnostics";
import { getCreativeEditorDraftStorageKey } from "@lib/browserStorage/creativeEditorDraft";
import { validateMagicBytes } from "@lib/security/magicBytesValidator";
import { creativeEditorDocumentSchema } from "@lib/validation/creativeEditorTemplateSchemas";
import {
    isCreativeEditorRasterDataUrl,
    isSafeCreativeEditorNetworkImageSource,
} from "./imageSourceBoundary";
import {
    buildCreativeEditorArrowElement,
    buildCreativeEditorEggElement,
    buildCreativeEditorEllipseElement,
    buildCreativeEditorHexagonElement,
    buildCreativeEditorId,
    buildCreativeEditorImageElement,
    buildCreativeEditorLineElement,
    buildCreativeEditorPentagonElement,
    buildCreativeEditorPathTextElement,
    buildCreativeEditorPolygonElement,
    buildCreativeEditorQrElement,
    buildCreativeEditorRectElement,
    buildCreativeEditorStarElement,
    buildCreativeEditorTextElement,
    buildCreativeEditorTriangleElement,
    createCreativeEditorStarterDocument,
    CREATIVE_EDITOR_STARTER_TEMPLATES,
    type CreativeEditorStarterTemplateId,
} from "./templates";
import { buildCreativeEditorFilename, downloadCreativeEditorJson } from "./export";
import {
    applyCanvasBackground,
    configureCreativeFabric,
    CREATIVE_EDITOR_FABRIC_ATTRIBUTES,
    CreativeFabricObject,
    FabricStatic,
    findWorkspaceObject,
    initFabricAlignmentGuidelines,
    initFabricDragging,
    isEditableFabricObject,
    isWatermarkObject,
    keepWorkspaceAtBack,
    loadDocumentIntoFabricCanvas,
    serializeFabricCanvasToDocument,
    setObjectLocked,
} from "./fabricAdapter";
import {
    CreativeEditorAssetSource,
    CreativeEditorAiToolAction,
    CreativeEditorAiToolFinding,
    CreativeEditorAiToolHandler,
    CreativeEditorAiToolResult,
    CreativeEditorAiToolSuggestion,
    CreativeEditorDesignCueApplyHandler,
    CreativeEditorDesignCueCommand,
    CreativeEditorDesignCueHandler,
    CreativeEditorDesignCuePatchSet,
    CreativeEditorDesignCueRequest,
    CreativeEditorDocument,
    CreativeEditorElement,
    CreativeEditorExportFormat,
    CreativeEditorExportResult,
    CreativeEditorGradientStop,
    CreativeEditorImageFilter,
    CreativeEditorImageFilterAdjustments,
    CreativeEditorLinearGradient,
    CreativeEditorPage,
    CreativeEditorShadow,
    CreativeEditorStrokeLineCap,
    CreativeEditorStrokeStyle,
    CreativeEditorTemplateSaveHandler,
    CreativeEditorTextPlaceholder,
    CreativeEditorVisibleWatermark,
} from "./types";
import {
    CraftAiToolsIcon,
    CraftBackgroundIcon,
    CraftBarcodeIcon,
    CraftBrandKitIcon,
    CraftCharacterIcon,
    CraftGraphicsIcon,
    CraftIllustrationsIcon,
    CraftImagesIcon,
    CraftMyStuffIcon,
    CraftQrCodeIcon,
    CraftShapesIcon,
    CraftStylesIcon,
    CraftTemplateIcon,
    CraftTextIcon,
} from "./icons/craft-builder";
import DesignCuePanel from "./DesignCuePanel";
import textTemplateLibrary from "./textTemplates.json";
import styles from "./CreativeEditor.module.scss";

type EditorTheme = "light" | "dark";
export type CreativeEditorToolId =
    | "ai"
    | "templates"
    | "background"
    | "illustrations"
    | "images"
    | "text"
    | "styles"
    | "graphics"
    | "characters"
    | "shapes"
    | "qr"
    | "barcode"
    | "myStuff"
    | "brandKit";
export type CreativeEditorWorkspaceControl = "grid" | "preview" | "review" | "safeArea";
type EditorToolId = CreativeEditorToolId;
type InteractionMode = "selection" | "grab" | "draw" | "polygon";
type LayerAction = "back" | "backward" | "forward" | "front";
type AlignmentAction = "bottom" | "center" | "centerX" | "centerY" | "left" | "right" | "top";
type FloatingSelectionToolbarVariant = "group" | "multi" | "single";
type FloatingSelectionToolbarState = {
    activeObjectType: string;
    anchorLeft: number;
    isMultiSelection: boolean;
    left: number;
    locked: boolean;
    selectionBottom: number;
    selectionCount: number;
    top: number;
    variant: FloatingSelectionToolbarVariant;
};

type WorkspaceViewportState = {
    height: number;
    left: number;
    top: number;
    width: number;
};

type RightPanelMode = "layers" | "properties";

type KeyboardShortcutItem = {
    action: string;
    keys: string[];
};

type KeyboardShortcutGroup = {
    id: string;
    items: KeyboardShortcutItem[];
    title: string;
};

type DrawerSearchItem = {
    description?: string;
    id: string;
    label: string;
    search: string;
};

type TextPreset = {
    color?: string;
    fontSize: number;
    fontFamily?: string;
    fontWeight: Extract<CreativeEditorElement, { type: "text" }>["fontWeight"];
    id: string;
    label: string;
    lineHeight?: number;
    shadow?: CreativeEditorShadow;
    textBackgroundColor?: string;
    text: string;
};

type TextTemplateLayerDefinition = {
    align?: Extract<CreativeEditorElement, { type: "text" }>["align"];
    charSpacing?: number;
    color?: string;
    fontFamily?: string;
    fontSize?: number;
    fontStyle?: Extract<CreativeEditorElement, { type: "text" }>["fontStyle"];
    fontWeight?: Extract<CreativeEditorElement, { type: "text" }>["fontWeight"];
    height?: number;
    id: string;
    lineHeight?: number;
    name?: string;
    opacity?: number;
    rotation?: number;
    shadow?: CreativeEditorShadow;
    text: string;
    textBackgroundColor?: string;
    underline?: boolean;
    width?: number;
    x?: number;
    y?: number;
};

type TextTemplateDefinition = {
    category: string;
    description: string;
    id: string;
    label: string;
    layers: TextTemplateLayerDefinition[];
    previewBackground?: string;
    search: string;
    tags?: string[];
    type: "composition" | "single";
};

type ProjectStylePreset = {
    accentColor: string;
    backgroundColor: string;
    description: string;
    fontFamily: string;
    id: string;
    label: string;
    mutedColor: string;
    secondaryColor: string;
    textColor: string;
};

type CanvasSizePreset = {
    description: string;
    height: number;
    id: string;
    label: string;
    width: number;
};

type ExportBundlePreset = {
    height: number;
    id: string;
    label: string;
    width: number;
};

type CampaignStarterAction = {
    backgroundColor: string;
    description: string;
    id: string;
    includeQr?: boolean;
    label: string;
    templateSearch: string;
};

type QrActionPreset = {
    accentColor: string;
    backgroundColor: string;
    description: string;
    helper: string;
    id: "book" | "feedback" | "loyalty" | "menu" | "offer" | "order";
    label: string;
    title: string;
};

type ReadinessIssue = {
    actionLabel?: string;
    detail: string;
    elementId?: string;
    id: string;
    label: string;
    tone: "danger" | "good" | "note" | "warning";
};

type RulerTick = {
    id: string;
    label?: string;
    major: boolean;
    position: number;
};

type CreativeEditorDraftStorageOperation = "cleanup" | "dismiss" | "read" | "write";
const reportedCreativeEditorDraftStorageFailures = new Set<CreativeEditorDraftStorageOperation>();

const buildRulerTicks = (total: number, minorStep = 40, majorStep = 160): RulerTick[] => {
    const safeTotal = Math.max(1, Math.round(total));
    const ticks: RulerTick[] = [];
    for (let value = 0; value <= safeTotal; value += minorStep) {
        const major = value % majorStep === 0;
        ticks.push({
            id: `tick-${value}`,
            label: major ? String(value) : undefined,
            major,
            position: (value / safeTotal) * 100,
        });
    }
    const last = ticks[ticks.length - 1];
    if (!last || last.position < 100) {
        ticks.push({
            id: `tick-${safeTotal}`,
            label: safeTotal - Number(last?.label || 0) >= majorStep / 2 ? String(safeTotal) : undefined,
            major: true,
            position: 100,
        });
    }
    return ticks;
};

const createDocumentPageSnapshot = (
    documentValue: CreativeEditorDocument,
    page?: Partial<CreativeEditorPage>,
): CreativeEditorPage => ({
    canvas: {
        ...documentValue.canvas,
        ...page?.canvas,
    },
    elements: page?.elements || documentValue.elements,
    id: page?.id || buildCreativeEditorId("page"),
    locked: Boolean(page?.locked),
    title: page?.title || "Page 1",
    updatedAt: page?.updatedAt || documentValue.metadata?.updatedAt || documentValue.metadata?.createdAt,
});

const normalizeCreativeEditorDocumentPages = (documentValue: CreativeEditorDocument): CreativeEditorDocument => {
    const fallbackPage = createDocumentPageSnapshot(documentValue, {
        id: documentValue.activePageId || "page_1",
        title: "Page 1",
    });
    const pages = (documentValue.pages?.length ? documentValue.pages : [fallbackPage])
        .map((page, index) => createDocumentPageSnapshot(documentValue, {
            ...page,
            title: page.title || `Page ${index + 1}`,
        }));
    const activePageId = pages.some((page) => page.id === documentValue.activePageId)
        ? documentValue.activePageId
        : pages[0].id;
    const activePage = pages.find((page) => page.id === activePageId) || pages[0];
    return {
        ...documentValue,
        activePageId,
        canvas: activePage.canvas,
        elements: activePage.elements,
        pages,
    };
};

const syncActivePageSnapshot = (documentValue: CreativeEditorDocument): CreativeEditorDocument => {
    const activeCanvas = documentValue.canvas;
    const activeElements = documentValue.elements;
    const normalized = normalizeCreativeEditorDocumentPages(documentValue);
    const activePageId = normalized.activePageId || normalized.pages?.[0]?.id;
    const pages = (normalized.pages || []).map((page) => (
        page.id === activePageId
            ? {
                ...page,
                canvas: activeCanvas,
                elements: activeElements,
                updatedAt: new Date().toISOString(),
            }
            : page
    ));
    return {
        ...normalized,
        canvas: activeCanvas,
        elements: activeElements,
        pages,
    };
};

const cloneElementForPage = (element: CreativeEditorElement): CreativeEditorElement => ({
    ...element,
    id: buildCreativeEditorId("layer"),
    name: `${element.name} copy`,
    sourceRefs: element.sourceRefs ? [...element.sourceRefs] : undefined,
} as CreativeEditorElement);

const matchesDrawerSearch = (item: DrawerSearchItem, query: string) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    return item.search.toLowerCase().includes(normalized);
};

const getTextTemplateScale = (canvas: CreativeEditorDocument["canvas"]) => (
    Math.max(0.36, Math.min(1.15, Math.min(canvas.width, canvas.height) / 1080))
);

const resolveTemplateMetric = (value: number | undefined, total: number, fallback: number, min = 1) => {
    const resolved = typeof value === "number"
        ? (Math.abs(value) <= 1 ? value * total : value)
        : fallback;
    return Math.max(min, Math.round(resolved));
};

const renderTextTemplatePreview = (template: TextTemplateDefinition) => (
    <span className={styles.textTemplatePreview} style={{ background: template.previewBackground || "var(--field-bg)" }}>
        {template.layers.slice(0, 3).map((layer) => (
            <span
                key={layer.id}
                style={{
                    background: layer.textBackgroundColor || "transparent",
                    color: layer.color || "var(--ink)",
                    fontFamily: layer.fontFamily,
                    fontSize: Math.min(30, Math.max(13, (layer.fontSize || 28) * 0.36)),
                    fontStyle: layer.fontStyle,
                    fontWeight: layer.fontWeight || "700",
                    lineHeight: layer.lineHeight || 1.05,
                    textAlign: layer.align || "left",
                    textShadow: layer.shadow
                        ? `${Math.round(layer.shadow.offsetX * 0.25)}px ${Math.round(layer.shadow.offsetY * 0.25)}px ${Math.round(layer.shadow.blur * 0.25)}px ${layer.shadow.color}`
                        : undefined,
                }}
            >
                {layer.text}
            </span>
        ))}
    </span>
);

type EditorTool = {
    disabled?: boolean;
    icon: ComponentType<{ active?: boolean }>;
    id: EditorToolId;
    label: string;
};

export type CreativeEditorHeaderActionTone = "accent" | "default" | "primary";

export interface CreativeEditorHeaderAction {
    ariaLabel?: string;
    disabled?: boolean;
    icon?: ReactNode;
    id: string;
    label: string;
    loading?: boolean;
    onClick: () => Promise<void> | void;
    requiresReadiness?: boolean;
    tone?: CreativeEditorHeaderActionTone;
}

export interface CreativeEditorProps {
    allowDesignImport?: boolean;
    allowNewDesign?: boolean;
    allowRasterImports?: boolean;
    assetSources?: CreativeEditorAssetSource[];
    availableToolIds?: CreativeEditorToolId[];
    aiToolActions?: CreativeEditorAiToolAction[];
    enableBrowserDrafts?: boolean;
    chromeMode?: "embedded" | "full";
    designCueCommands?: CreativeEditorDesignCueCommand[];
    disabledExportFormats?: CreativeEditorExportFormat[];
    headerActions?: CreativeEditorHeaderAction[];
    initialDocument: CreativeEditorDocument;
    initialDrawerCollapsed?: boolean;
    initialSelectedLayerId?: string | null;
    onAiToolAction?: CreativeEditorAiToolHandler;
    onDesignCueApply?: CreativeEditorDesignCueApplyHandler;
    onDesignCueRequest?: CreativeEditorDesignCueHandler;
    onDocumentChange?: (documentValue: CreativeEditorDocument) => void;
    onExport?: (result: CreativeEditorExportResult) => Promise<void> | void;
    onTemplateSave?: CreativeEditorTemplateSaveHandler;
    productLabel?: string;
    sourceLabel?: string;
    templateSaveLabel?: string;
    templateSavePreview?: boolean;
    workspaceControls?: CreativeEditorWorkspaceControl[];
}

const EDITOR_TOOLS: EditorTool[] = [
    { id: "ai", label: "AI Tools", icon: CraftAiToolsIcon },
    { id: "templates", label: "Templates", icon: CraftTemplateIcon },
    { id: "background", label: "Background", icon: CraftBackgroundIcon },
    { id: "illustrations", label: "Illustrations", icon: CraftIllustrationsIcon },
    { id: "graphics", label: "Graphics", icon: CraftGraphicsIcon },
    { id: "characters", label: "Characters", icon: CraftCharacterIcon },
    { id: "images", label: "Images", icon: CraftImagesIcon },
    { id: "text", label: "Text", icon: CraftTextIcon },
    { id: "styles", label: "Styles", icon: CraftStylesIcon },
    { id: "shapes", label: "Tools", icon: CraftShapesIcon },
    { id: "qr", label: "QRCode", icon: CraftQrCodeIcon },
    { id: "barcode", label: "Barcode", icon: CraftBarcodeIcon },
    { id: "myStuff", label: "My Stuff", icon: CraftMyStuffIcon },
    { id: "brandKit", label: "Brand Kit", icon: CraftBrandKitIcon },
];

const TOOL_LABELS = EDITOR_TOOLS.reduce<Record<EditorToolId, string>>((labels, tool) => {
    labels[tool.id] = tool.label;
    return labels;
}, {} as Record<EditorToolId, string>);

const AI_TOOL_CATEGORY_LABELS: Record<CreativeEditorAiToolAction["category"], string> = {
    check: "Checks",
    copy: "Copy",
    export: "Export",
    image: "Image",
    recommended: "Recommended",
};

const AI_TOOL_CATEGORY_ORDER: CreativeEditorAiToolAction["category"][] = [
    "recommended",
    "copy",
    "check",
    "image",
    "export",
];

const COLOR_SWATCHES = [
    "#6563ff",
    "#000000",
    "#ef6680",
    "#f3b4b4",
    "#3c3a55",
    "#ffffff",
    "#ffd45d",
    "#a5a5a5",
    "#4ab8f1",
    "#4fac96",
];

const FONT_FAMILY_OPTIONS = [
    "Inter, Arial, sans-serif",
    "Arial, sans-serif",
    "Georgia, serif",
    "Impact, Haettenschweiler, sans-serif",
    "Trebuchet MS, sans-serif",
];

const FONT_WEIGHT_OPTIONS = ["normal", "400", "600", "700", "800", "bold"] as const;

const TEXT_TEMPLATE_LIBRARY = textTemplateLibrary as TextTemplateDefinition[];

const createTextPresetFromTemplate = (template: TextTemplateDefinition): TextPreset => {
    const layer = template.layers[0] || {
        id: template.id,
        text: template.label,
    };
    return {
        color: layer.color,
        fontFamily: layer.fontFamily,
        fontSize: layer.fontSize || 36,
        fontWeight: layer.fontWeight || "700",
        id: template.id,
        label: template.label,
        lineHeight: layer.lineHeight,
        shadow: layer.shadow,
        text: layer.text,
        textBackgroundColor: layer.textBackgroundColor,
    };
};

const getTextTemplateSearch = (template: TextTemplateDefinition) => (
    [
        template.label,
        template.category,
        template.description,
        template.search,
        ...(template.tags || []),
        ...template.layers.map((layer) => `${layer.name || ""} ${layer.text}`),
    ].join(" ")
);

const TEXT_PRESETS = TEXT_TEMPLATE_LIBRARY
    .filter((template) => template.type === "single")
    .map(createTextPresetFromTemplate);

const TEXT_TEMPLATE_COMBINATIONS = TEXT_TEMPLATE_LIBRARY
    .filter((template) => template.type === "composition");

const PROJECT_STYLE_PRESETS: ProjectStylePreset[] = [
    {
        accentColor: "#e7782c",
        backgroundColor: "#fff3d6",
        description: "Warm offer posts, food specials, salon deals.",
        fontFamily: "Inter, Arial, sans-serif",
        id: "warm-offer",
        label: "Warm offer",
        mutedColor: "#f8c961",
        secondaryColor: "#7a4a2e",
        textColor: "#16231f",
    },
    {
        accentColor: "#4ab8f1",
        backgroundColor: "#e9f7ff",
        description: "Clean announcements, service updates, reminders.",
        fontFamily: "Trebuchet MS, sans-serif",
        id: "fresh-local",
        label: "Fresh local",
        mutedColor: "#bde7f3",
        secondaryColor: "#24564d",
        textColor: "#111827",
    },
    {
        accentColor: "#ef6680",
        backgroundColor: "#fff0f4",
        description: "Beauty, retail, launch, and limited-time messages.",
        fontFamily: "Georgia, serif",
        id: "soft-premium",
        label: "Soft premium",
        mutedColor: "#f3b4b4",
        secondaryColor: "#3c3a55",
        textColor: "#2d1f28",
    },
    {
        accentColor: "#6563ff",
        backgroundColor: "#f4f3ff",
        description: "Bold social posts, events, and high-contrast promos.",
        fontFamily: "Impact, Haettenschweiler, sans-serif",
        id: "bold-social",
        label: "Bold social",
        mutedColor: "#c8c7ff",
        secondaryColor: "#303052",
        textColor: "#111827",
    },
];

const IMAGE_FILTER_OPTIONS: Array<{ label: string; value: CreativeEditorImageFilter }> = [
    { label: "None", value: "none" },
    { label: "Black White", value: "blackwhite" },
    { label: "Brownie", value: "brownie" },
    { label: "Grayscale", value: "grayscale" },
    { label: "Invert", value: "invert" },
    { label: "Kodachrome", value: "kodachrome" },
    { label: "Polaroid", value: "polaroid" },
    { label: "Sepia", value: "sepia" },
    { label: "Technicolor", value: "technicolor" },
    { label: "Vintage", value: "vintage" },
];

const GRAYSCALE_MODE_OPTIONS: Array<{ label: string; value: NonNullable<CreativeEditorImageFilterAdjustments["grayscaleMode"]> }> = [
    { label: "Average", value: "average" },
    { label: "Lightness", value: "lightness" },
    { label: "Luminosity", value: "luminosity" },
];

const IMAGE_FILTER_ADJUSTMENTS: Array<{
    key: keyof CreativeEditorImageFilterAdjustments;
    label: string;
    max: number;
    min: number;
    step: number;
}> = [
    { key: "brightness", label: "Bright", min: -1, max: 1, step: 0.01 },
    { key: "contrast", label: "Contrast", min: -1, max: 1, step: 0.01 },
    { key: "saturation", label: "Sat", min: -1, max: 1, step: 0.01 },
    { key: "vibrance", label: "Vibrance", min: -1, max: 1, step: 0.01 },
    { key: "hueRotation", label: "Hue", min: -1, max: 1, step: 0.01 },
    { key: "blur", label: "Blur", min: 0, max: 1, step: 0.01 },
    { key: "noise", label: "Noise", min: 0, max: 1000, step: 1 },
    { key: "pixelate", label: "Pixel", min: 1, max: 100, step: 1 },
];

const DEFAULT_GRADIENT: CreativeEditorLinearGradient = {
    angle: 90,
    enabled: false,
    from: "#6563ff",
    stops: [
        { color: "#6563ff", offset: 0 },
        { color: "#ef6680", offset: 1 },
    ],
    to: "#ef6680",
};

const STROKE_STYLE_OPTIONS: Array<{ label: string; value: CreativeEditorStrokeStyle }> = [
    { label: "Solid", value: "solid" },
    { label: "Dashed", value: "dashed" },
    { label: "Dashed round", value: "dashed-round" },
    { label: "Long dash", value: "long-dashed" },
    { label: "Long dash round", value: "long-dashed-round" },
    { label: "Dash dot", value: "dash-dot" },
    { label: "Dash dot round", value: "dash-dot-round" },
    { label: "Dotted", value: "dotted" },
    { label: "Dotted round", value: "dotted-round" },
];

const STROKE_CAP_OPTIONS: Array<{ label: string; value: CreativeEditorStrokeLineCap }> = [
    { label: "Butt", value: "butt" },
    { label: "Round", value: "round" },
    { label: "Square", value: "square" },
];

const DEFAULT_VISIBLE_WATERMARK: CreativeEditorVisibleWatermark = {
    color: "#16231f",
    enabled: false,
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: 28,
    opacity: 0.18,
    position: "bottom-right",
    rotation: 0,
    text: "Watermark",
};

const RASTER_IMAGE_MIME_TYPES = new Set(["image/gif", "image/jpeg", "image/png", "image/webp"]);
const UNSAFE_OWNER_IMAGE_URL_PATTERN = /^(?:data|file|javascript|vbscript):/i;
const SVG_IMAGE_URL_PATTERN = /(?:^data:image\/svg|\.(?:svg|svgz)(?:[?#]|$))/i;
const RASTER_IMAGE_URL_PATTERN = /\.(?:gif|jpe?g|png|webp)(?:[?#]|$)/i;
const SAFE_AREA_INSET_RATIO = 0.075;

const CANVAS_SIZE_PRESETS: CanvasSizePreset[] = [
    { description: "1:1", height: 1080, id: "square-post", label: "Square post", width: 1080 },
    { description: "4:5", height: 1350, id: "portrait-post", label: "Portrait post", width: 1080 },
    { description: "9:16", height: 1920, id: "story-status", label: "Story / status", width: 1080 },
    { description: "A4", height: 1754, id: "flyer", label: "Flyer", width: 1240 },
    { description: "16:9", height: 1080, id: "menu-screen", label: "Menu screen", width: 1920 },
    { description: "3:4", height: 1200, id: "qr-table-card", label: "QR table card", width: 900 },
];

const DRAWER_ITEM_LIMIT = 24;

const EXPORT_BUNDLE_PRESETS: ExportBundlePreset[] = [
    { height: 1080, id: "instagram-square", label: "Instagram square", width: 1080 },
    { height: 1350, id: "instagram-portrait", label: "Instagram portrait", width: 1080 },
    { height: 1920, id: "story-status", label: "Story / status", width: 1080 },
    { height: 1754, id: "flyer-a4", label: "Flyer", width: 1240 },
];

const TEMPLATE_THUMBNAIL_PRESET: ExportBundlePreset = {
    height: 260,
    id: "template-thumbnail",
    label: "Template thumbnail",
    width: 260,
};
const TEMPLATE_THUMBNAIL_MAX_DATA_URL_CHARS = 180_000;
const CREATIVE_EDITOR_JSON_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
const CREATIVE_EDITOR_RASTER_IMPORT_MAX_BYTES = 1_400_000;
const CREATIVE_EDITOR_FABRIC_IMPORT_MAX_OBJECTS = 300;
const CREATIVE_EDITOR_FABRIC_IMPORT_MAX_NODES = 5_000;

const CAMPAIGN_STARTER_ACTIONS: CampaignStarterAction[] = [
    {
        backgroundColor: "#fff3d6",
        description: "Offer copy, CTA, and warm sale styling.",
        id: "weekend-offer",
        includeQr: true,
        label: "Weekend offer",
        templateSearch: "sale offer callout",
    },
    {
        backgroundColor: "#e9f7ff",
        description: "Clear announcement layout for updates.",
        id: "new-arrival",
        label: "New arrival",
        templateSearch: "new arrival",
    },
    {
        backgroundColor: "#fff0f4",
        description: "Short premium reminder with business text.",
        id: "appointment-reminder",
        includeQr: true,
        label: "Appointment reminder",
        templateSearch: "thank you soft",
    },
    {
        backgroundColor: "#f4f3ff",
        description: "Bold customer action and contact prompt.",
        id: "follow-share",
        label: "Follow or share",
        templateSearch: "call to action",
    },
];

const QR_ACTION_PRESETS: QrActionPreset[] = [
    {
        accentColor: "#2f80ed",
        backgroundColor: "#f0f7ff",
        description: "Menu or service list.",
        helper: "Open the live menu.",
        id: "menu",
        label: "Menu",
        title: "Scan to view menu",
    },
    {
        accentColor: "#4fac96",
        backgroundColor: "#eefaf5",
        description: "Review and feedback card.",
        helper: "Tell us how we did.",
        id: "feedback",
        label: "Feedback",
        title: "Leave feedback",
    },
    {
        accentColor: "#e7792b",
        backgroundColor: "#fff3e8",
        description: "Order, reorder, or buy again.",
        helper: "Open camera and order.",
        id: "order",
        label: "Order",
        title: "Order now",
    },
    {
        accentColor: "#ef6680",
        backgroundColor: "#fff0f4",
        description: "Coupon or seasonal offer.",
        helper: "Get today's offer.",
        id: "offer",
        label: "Offer",
        title: "Unlock offer",
    },
    {
        accentColor: "#6d5dfc",
        backgroundColor: "#f4f3ff",
        description: "Appointment or reservation.",
        helper: "Book in a few taps.",
        id: "book",
        label: "Book",
        title: "Book a visit",
    },
    {
        accentColor: "#d7a414",
        backgroundColor: "#fff9dc",
        description: "Rewards or repeat visits.",
        helper: "Join rewards.",
        id: "loyalty",
        label: "Loyalty",
        title: "Join rewards",
    },
];

const KEYBOARD_SHORTCUT_GROUPS: KeyboardShortcutGroup[] = [
    {
        id: "general",
        items: [
            { action: "Show shortcuts", keys: ["? / Cmd Ctrl + Shift + ?"] },
            { action: "Undo", keys: ["Cmd/Ctrl + Z"] },
            { action: "Redo", keys: ["Cmd/Ctrl + Shift + Z", "Cmd/Ctrl + Y"] },
            { action: "Save PNG to product library", keys: ["Cmd/Ctrl + S"] },
            { action: "Preview", keys: ["Cmd/Ctrl + Enter"] },
            { action: "Review before download", keys: ["Cmd/Ctrl + Shift + K"] },
            { action: "Close panel, clear selection, then hide drawer", keys: ["Esc"] },
        ],
        title: "General",
    },
    {
        id: "create",
        items: [
            { action: "Add text", keys: ["T"] },
            { action: "Add rectangle", keys: ["R"] },
            { action: "Add circle", keys: ["C"] },
            { action: "Add line", keys: ["L"] },
            { action: "Add QR code", keys: ["Q"] },
        ],
        title: "Create",
    },
    {
        id: "select-edit",
        items: [
            { action: "Select all layers", keys: ["Cmd/Ctrl + A"] },
            { action: "Delete selected layer", keys: ["Delete", "Backspace"] },
            { action: "Copy selected layer", keys: ["Cmd/Ctrl + C"] },
            { action: "Paste copied layer", keys: ["Cmd/Ctrl + V"] },
            { action: "Duplicate selected layer", keys: ["Cmd/Ctrl + D"] },
            { action: "Open selected item properties", keys: ["Cmd/Ctrl + /"] },
            { action: "Open Active Layers", keys: ["Cmd/Ctrl + Shift + L"] },
        ],
        title: "Select And Edit",
    },
    {
        id: "move-resize",
        items: [
            { action: "Nudge selected layer", keys: ["Arrow keys"] },
            { action: "Large nudge", keys: ["Shift + Arrow", "Alt + Arrow"] },
            { action: "Resize selected layer", keys: ["Cmd/Ctrl + Arrow"] },
            { action: "Large resize", keys: ["Cmd/Ctrl + Shift + Arrow"] },
            { action: "Temporarily grab canvas", keys: ["Hold Space"] },
        ],
        title: "Move And Resize",
    },
    {
        id: "arrange",
        items: [
            { action: "Group selection", keys: ["Cmd/Ctrl + G"] },
            { action: "Ungroup selection", keys: ["Cmd/Ctrl + Shift + G"] },
            { action: "Move forward/backward", keys: ["Cmd/Ctrl + ]", "Cmd/Ctrl + ["] },
            { action: "Move to front/back", keys: ["Cmd/Ctrl + Alt + ]", "Cmd/Ctrl + Alt + ["] },
            { action: "Align left/center/right", keys: ["Alt + Shift + L/C/R"] },
            { action: "Align top/middle/bottom", keys: ["Alt + Shift + T/M/B"] },
            { action: "Distribute X/Y", keys: ["Cmd/Ctrl + Shift + H/V"] },
        ],
        title: "Arrange",
    },
    {
        id: "text",
        items: [
            { action: "Bold", keys: ["Cmd/Ctrl + B"] },
            { action: "Italic", keys: ["Cmd/Ctrl + I"] },
            { action: "Underline", keys: ["Cmd/Ctrl + U"] },
            { action: "Strike", keys: ["Cmd/Ctrl + Shift + X"] },
            { action: "Increase/decrease text size", keys: ["Cmd/Ctrl + Shift + .", "Cmd/Ctrl + Shift + ,"] },
            { action: "Text align left/center/right", keys: ["Alt + Shift + L/C/R"] },
        ],
        title: "Text",
    },
    {
        id: "view",
        items: [
            { action: "Zoom in/out", keys: ["Cmd/Ctrl + +", "Cmd/Ctrl + -"] },
            { action: "Fit to screen", keys: ["Cmd/Ctrl + 0"] },
            { action: "100% zoom", keys: ["Cmd/Ctrl + Alt + 0"] },
            { action: "Toggle grid and rulers", keys: ["Cmd/Ctrl + '"] },
            { action: "Toggle safe area", keys: ["Cmd/Ctrl + Shift + '"] },
        ],
        title: "View",
    },
];

const clampNumber = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const FLOATING_SELECTION_TOOLBAR_GAP = 10;
const FLOATING_SELECTION_TOOLBAR_EDGE_PADDING = 8;
const FLOATING_SELECTION_TOOLBAR_FALLBACK_SIZE: Record<FloatingSelectionToolbarVariant, { height: number; width: number }> = {
    group: { height: 50, width: 152 },
    multi: { height: 50, width: 290 },
    single: { height: 50, width: 330 },
};

const TEXT_ACTION_PATTERN = /\b(book|buy|call|contact|dm|join|learn|message|order|reserve|shop|visit|whatsapp)\b/i;
const CONTACT_PLACEHOLDER_PATTERN = /(booking|contact|link|menu|phone|site|url|web|whatsapp)/i;
const CTA_PLACEHOLDER_PATTERN = /(action|book|buy|call|cta|message|order|reserve|shop|visit)/i;

const numberInput = (value: number, fallback = 0) => {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
};

const normalizeHexColor = (color: string) => {
    const value = color.trim();
    if (/^#[0-9a-f]{3}$/i.test(value)) {
        return `#${value.slice(1).split("").map((part) => `${part}${part}`).join("")}`.toLowerCase();
    }
    if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
    return "";
};

const getRelativeLuminance = (color: string) => {
    const normalized = normalizeHexColor(color);
    if (!normalized) return null;
    const channels = [1, 3, 5].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16) / 255)
        .map((channel) => (
            channel <= 0.03928
                ? channel / 12.92
                : ((channel + 0.055) / 1.055) ** 2.4
        ));
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const getContrastRatio = (foreground: string, background: string) => {
    const foregroundLuminance = getRelativeLuminance(foreground);
    const backgroundLuminance = getRelativeLuminance(background);
    if (foregroundLuminance === null || backgroundLuminance === null) return null;
    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);
    return (lighter + 0.05) / (darker + 0.05);
};

const getReadableTextColor = (background: string) => {
    const blackContrast = getContrastRatio("#111111", background) || 0;
    const whiteContrast = getContrastRatio("#ffffff", background) || 0;
    return blackContrast >= whiteContrast ? "#111111" : "#ffffff";
};

const shortenBusinessText = (text: string, maxWords = 8) => {
    const normalized = text.trim().replace(/\s+/g, " ");
    const words = normalized.split(" ").filter(Boolean);
    if (words.length <= maxWords && normalized.length <= 64) return normalized;
    return words.slice(0, maxWords).join(" ").replace(/[,:;.-]+$/, "");
};

const normalizeGradientStops = (gradient: CreativeEditorLinearGradient): CreativeEditorGradientStop[] => {
    const stops = gradient.stops && gradient.stops.length >= 2
        ? gradient.stops
        : [
            { color: gradient.from, offset: 0 },
            { color: gradient.to, offset: 1 },
        ];
    return stops
        .map((stop) => ({
            color: stop.color || "#ffffff",
            offset: clampNumber(Number(stop.offset), 0, 1),
        }))
        .sort((a, b) => a.offset - b.offset);
};

const getPrimaryColor = (documentValue: CreativeEditorDocument) => (
    documentValue.metadata?.brand?.primaryColor || "#24564d"
);

const formatQrDestinationHint = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "Set a destination";
    try {
        const url = new URL(trimmed);
        const path = url.pathname && url.pathname !== "/" ? url.pathname.replace(/\/$/, "") : "";
        const label = `${url.host}${path}`;
        return label.length > 42 ? `${label.slice(0, 39)}...` : label;
    } catch {
        return trimmed.length > 42 ? `${trimmed.slice(0, 39)}...` : trimmed;
    }
};

const encodeSvgDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const escapeSvgValue = (value: unknown) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const CODE128_PATTERNS = [
    "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
    "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
    "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
    "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
    "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
    "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
    "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
    "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224",
    "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
    "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
    "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112",
    "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113",
    "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412",
    "211214", "211232", "2331112",
];

function normalizeBarcodeValue(value: string) {
    const ascii = Array.from(value)
        .filter((character) => {
            const code = character.charCodeAt(0);
            return code >= 32 && code <= 126;
        })
        .join("")
        .trim();
    return ascii || "Sample";
}

function buildCode128Values(value: string) {
    const data = Array.from(normalizeBarcodeValue(value)).map((character) => character.charCodeAt(0) - 32);
    const checksum = data.reduce((sum, code, index) => sum + code * (index + 1), 104) % 103;
    return [104, ...data, checksum, 106];
}

function buildCode128BarcodeSvg(params: {
    backgroundColor: string;
    displayText: boolean;
    lineColor: string;
    text: string;
    value: string;
}) {
    const encodedValues = buildCode128Values(params.value);
    const moduleWidth = 2;
    const quietZone = 20;
    const barHeight = 92;
    const textHeight = params.displayText ? 30 : 0;
    const patterns = encodedValues.map((code) => CODE128_PATTERNS[code]).join("");
    const totalUnits = Array.from(patterns).reduce((sum, width) => sum + Number(width), 0);
    const width = quietZone * 2 + totalUnits * moduleWidth;
    const height = barHeight + textHeight + 18;
    let cursor = quietZone;
    const rects: string[] = [];
    Array.from(patterns).forEach((rawWidth, index) => {
        const segmentWidth = Number(rawWidth) * moduleWidth;
        if (index % 2 === 0) {
            rects.push(`<rect x="${cursor}" y="10" width="${segmentWidth}" height="${barHeight}" fill="${escapeSvgValue(params.lineColor)}" />`);
        }
        cursor += segmentWidth;
    });
    const label = params.text.trim() || normalizeBarcodeValue(params.value);
    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Barcode">`,
        `<rect width="${width}" height="${height}" fill="${escapeSvgValue(params.backgroundColor)}" />`,
        `<g shape-rendering="crispEdges">${rects.join("")}</g>`,
        params.displayText
            ? `<text x="${width / 2}" y="${barHeight + 38}" text-anchor="middle" fill="${escapeSvgValue(params.lineColor)}" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700">${escapeSvgValue(label)}</text>`
            : "",
        "</svg>",
    ].join("");
}

const buildBarcodeDataUri = (params: {
    backgroundColor: string;
    displayText: boolean;
    lineColor: string;
    text: string;
    value: string;
}) => encodeSvgDataUri(buildCode128BarcodeSvg(params));

const buildCuratedSvg = (index: number, accent = "#6563ff") => {
    const pink = ["#ef6680", "#f3b4b4", "#ff7f96"][index % 3];
    const dark = ["#3c3a55", "#303052", "#22253c"][index % 3];
    const offset = (index % 4) * 12;
    return encodeSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 170">
            <rect width="240" height="170" rx="18" fill="#f4f3ff"/>
            <ellipse cx="${126 + offset / 2}" cy="92" rx="76" ry="52" fill="${accent}" opacity=".84"/>
            <circle cx="${54 + offset}" cy="72" r="20" fill="${dark}"/>
            <circle cx="${183 - offset / 2}" cy="62" r="8" fill="${dark}" opacity=".85"/>
            <path d="M72 122 C94 93 119 98 140 124 C112 141 91 143 72 122Z" fill="#ffffff"/>
            <path d="M102 59 h42 a22 22 0 0 1 22 22 v13 h-86 v-13 a22 22 0 0 1 22-22Z" fill="${pink}"/>
            <circle cx="123" cy="65" r="18" fill="#f2c0ba"/>
            <path d="M95 134 h18 l-4 27 h-18Z" fill="${dark}"/>
            <path d="M128 134 h18 l7 27 h-18Z" fill="${dark}"/>
            <path d="M52 42 l10 -10 l10 10 l-10 10Z" fill="${pink}"/>
            <path d="M183 94 l12 -12 l12 12 l-12 12Z" fill="${pink}"/>
            <path d="M170 140 c5 -20 12 -29 29 -35" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>
            <circle cx="203" cy="103" r="5" fill="${accent}"/>
        </svg>
    `);
};

const buildStickerSvg = (label: string, accent: string, secondary: string, shape: "burst" | "pill" | "tag" | "bubble") => {
    const content = escapeSvgValue(label);
    const shapeMarkup = {
        bubble: `<path d="M38 44 h164 a24 24 0 0 1 24 24 v50 a24 24 0 0 1-24 24 h-83 l-34 29 8-29 H38 a24 24 0 0 1-24-24 V68 a24 24 0 0 1 24-24Z" fill="${escapeSvgValue(accent)}"/>`,
        burst: `<path d="m120 13 18 34 37-10 1 38 36 12-30 23 18 34-38 1-14 35-28-26-29 26-14-35-38-1 18-34-30-23 36-12 1-38 37 10 19-34Z" fill="${escapeSvgValue(accent)}"/>`,
        pill: `<rect x="18" y="52" width="204" height="96" rx="48" fill="${escapeSvgValue(accent)}"/>`,
        tag: `<path d="M28 54 a26 26 0 0 1 26-26 h75 l83 83-74 74-83-83 V54Z" fill="${escapeSvgValue(accent)}"/> <circle cx="67" cy="68" r="9" fill="${escapeSvgValue(secondary)}"/>`,
    }[shape];
    return encodeSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" width="240" height="200" viewBox="0 0 240 200">
            <rect width="240" height="200" rx="24" fill="#f8fafc"/>
            ${shapeMarkup}
            <text x="120" y="${shape === "tag" ? 118 : 108}" text-anchor="middle" fill="${escapeSvgValue(secondary)}" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="900">${content}</text>
        </svg>
    `);
};

const STICKER_ASSETS = [
    { id: "sticker-sale", label: "Sale sticker", src: buildStickerSvg("SALE", "#f97316", "#ffffff", "burst") },
    { id: "sticker-new", label: "New sticker", src: buildStickerSvg("NEW", "#10b981", "#ffffff", "pill") },
    { id: "sticker-offer", label: "Offer tag", src: buildStickerSvg("OFFER", "#6366f1", "#ffffff", "tag") },
    { id: "sticker-call", label: "Callout bubble", src: buildStickerSvg("TODAY", "#facc15", "#111827", "bubble") },
];

const CURATED_ASSETS = Array.from({ length: 12 }, (_, index) => ({
    id: `curated-${index}`,
    label: `Illustration ${index + 1}`,
    src: buildCuratedSvg(index, index % 2 ? "#4744a4" : "#6563ff"),
}));

const GRAPHIC_ASSETS = Array.from({ length: 8 }, (_, index) => ({
    id: `graphic-${index}`,
    label: `Graphic ${index + 1}`,
    src: buildCuratedSvg(index + 12, index % 2 ? "#4fac96" : "#4ab8f1"),
}));

const CHARACTER_ASSETS = Array.from({ length: 8 }, (_, index) => ({
    id: `character-${index}`,
    label: `Character ${index + 1}`,
    src: buildCuratedSvg(index + 20, index % 2 ? "#ef6680" : "#3c3a55"),
}));

const canFillElement = (
    element: CreativeEditorElement | null,
): element is Extract<CreativeEditorElement, { type: "ellipse" | "path" | "polygon" | "rect" | "triangle" }> => (
    Boolean(element && (
        element.type === "ellipse"
        || element.type === "path"
        || element.type === "polygon"
        || element.type === "rect"
        || element.type === "triangle"
    ))
);

const canStrokeElement = (
    element: CreativeEditorElement | null,
): element is Extract<CreativeEditorElement, { type: "ellipse" | "image" | "line" | "path" | "pathText" | "polygon" | "rect" | "triangle" }> => (
    Boolean(element && (
        element.type === "ellipse"
        || element.type === "image"
        || element.type === "line"
        || element.type === "path"
        || element.type === "pathText"
        || element.type === "polygon"
        || element.type === "rect"
        || element.type === "triangle"
    ))
);

const canGradientElement = (
    element: CreativeEditorElement | null,
): element is Extract<CreativeEditorElement, { type: "ellipse" | "path" | "pathText" | "polygon" | "rect" | "text" | "triangle" }> => (
    Boolean(element && (
        element.type === "ellipse"
        || element.type === "path"
        || element.type === "pathText"
        || element.type === "polygon"
        || element.type === "rect"
        || element.type === "text"
        || element.type === "triangle"
    ))
);

const canEditTextElement = (
    element: CreativeEditorElement | null,
): element is Extract<CreativeEditorElement, { type: "pathText" | "text" }> => (
    Boolean(element && (element.type === "pathText" || element.type === "text"))
);

const SELECTED_PATCH_RELOAD_KEYS = new Set([
    "filter",
    "filterAdjustments",
    "outlineColor",
    "outlineEnabled",
    "outlineOnly",
    "outlineWidth",
    "points",
    "src",
]);

const getLiveDashArray = (strokeStyle?: CreativeEditorStrokeStyle, strokeWidth = 1) => {
    if (strokeStyle === "dashed" || strokeStyle === "dashed-round") return [Math.max(6, strokeWidth * 4), Math.max(4, strokeWidth * 3)];
    if (strokeStyle === "long-dashed" || strokeStyle === "long-dashed-round") return [Math.max(12, strokeWidth * 7), Math.max(5, strokeWidth * 3)];
    if (strokeStyle === "dash-dot" || strokeStyle === "dash-dot-round") return [Math.max(9, strokeWidth * 5), Math.max(4, strokeWidth * 2), Math.max(2, strokeWidth), Math.max(4, strokeWidth * 2)];
    if (strokeStyle === "dotted" || strokeStyle === "dotted-round") return [Math.max(1, strokeWidth), Math.max(4, strokeWidth * 2.5)];
    return undefined;
};

const getLiveStrokeLineCap = (
    strokeStyle?: CreativeEditorStrokeStyle,
    explicit?: CreativeEditorStrokeLineCap,
): CreativeEditorStrokeLineCap => {
    if (explicit) return explicit;
    if (strokeStyle?.endsWith("-round")) return "round";
    if (strokeStyle === "dotted") return "round";
    return "butt";
};

const getFabricGroupChildren = (object: CreativeFabricObject) => (
    object.type === "group" && typeof (object as fabric.Group).getObjects === "function"
        ? (object as fabric.Group).getObjects()
        : []
);

const getFabricTextChild = (object: CreativeFabricObject) => {
    if (object.type === "textbox" || object.type === "text" || object.type === "i-text") {
        return object as unknown as fabric.Textbox;
    }
    return getFabricGroupChildren(object).find((item) => (
        item.type === "textbox" || item.type === "text" || item.type === "i-text"
    )) as fabric.Textbox | undefined;
};

const isFormTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    return target.isContentEditable || tag === "input" || tag === "textarea" || tag === "select";
};

const triggerDownload = (href: string, filename: string) => {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
};

const getTextFromElement = (element: CreativeEditorElement | null) => (
    canEditTextElement(element) ? element.text : ""
);

const getAiToolIcon = (action: CreativeEditorAiToolAction) => {
    if (action.category === "copy") return LuMessageSquare;
    if (action.category === "check") return LuShieldCheck;
    if (action.category === "image") return LuImage;
    if (action.category === "export") return LuDownload;
    return LuSparkles;
};

const getAiFindingToneLabel = (finding: CreativeEditorAiToolFinding) => {
    if (finding.tone === "danger") return "Blocked";
    if (finding.tone === "warning") return "Review";
    if (finding.tone === "success") return "Ready";
    return "Note";
};

const readFileAsText = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File could not be read."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsText(file);
});

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File could not be read."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
});

const normalizeOwnerImageUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || UNSAFE_OWNER_IMAGE_URL_PATTERN.test(trimmed) || SVG_IMAGE_URL_PATTERN.test(trimmed)) return "";
    try {
        const url = new URL(trimmed, window.location.origin);
        if (url.protocol !== "http:" && url.protocol !== "https:") return "";
        const normalizedPath = `${url.pathname}${url.search}`;
        if (SVG_IMAGE_URL_PATTERN.test(normalizedPath) || !RASTER_IMAGE_URL_PATTERN.test(normalizedPath)) return "";
        return url.toString();
    } catch {
        return "";
    }
};

const parseCreativeEditorDocument = (value: unknown): CreativeEditorDocument | null => {
    const parsed = creativeEditorDocumentSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
};

const isSafeCurrentImageSource = (value: string) => {
    const trimmed = value.trim();
    return Boolean(
        trimmed
        && (
            isCreativeEditorRasterDataUrl(trimmed)
            || isSafeCreativeEditorNetworkImageSource(trimmed, window.location.origin)
        )
    );
};

const isSafeImportedImageSource = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (isCreativeEditorRasterDataUrl(trimmed)) {
        const mimeType = trimmed.slice(5, trimmed.indexOf(";")).toLowerCase();
        return validateMagicBytes(trimmed, mimeType).valid;
    }
    return isSafeCreativeEditorNetworkImageSource(trimmed, window.location.origin);
};

const importedDocumentHasUnsafeImageSource = (documentValue: CreativeEditorDocument) => {
    const elements = [
        ...documentValue.elements,
        ...(documentValue.pages || []).flatMap((page) => page.elements),
    ];
    return elements.some((element) => (
        element.type === "image" && !isSafeImportedImageSource(element.src)
    ));
};

const isSafeFabricImportPayload = (payload: unknown) => {
    const stack: unknown[] = [payload];
    let fabricObjectCount = 0;
    let visitedNodeCount = 0;
    while (stack.length) {
        const value = stack.pop();
        visitedNodeCount += 1;
        if (visitedNodeCount > CREATIVE_EDITOR_FABRIC_IMPORT_MAX_NODES) return false;
        if (Array.isArray(value)) {
            stack.push(...value);
            continue;
        }
        if (!value || typeof value !== "object") continue;
        const record = value as Record<string, unknown>;
        if (typeof record.type === "string") {
            fabricObjectCount += 1;
            if (fabricObjectCount > CREATIVE_EDITOR_FABRIC_IMPORT_MAX_OBJECTS) return false;
        }
        if (typeof record.src === "string" && !isSafeImportedImageSource(record.src)) return false;
        stack.push(...Object.values(record));
    }
    return true;
};

const parsePolygonPoints = (value: string) => value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
        const [rawX, rawY] = line.split(/[,\s]+/);
        const x = Number(rawX);
        const y = Number(rawY);
        return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    })
    .filter((point): point is { x: number; y: number } => Boolean(point));

export default function CreativeEditor({
    allowDesignImport = true,
    allowNewDesign = true,
    allowRasterImports = true,
    assetSources = [],
    availableToolIds,
    aiToolActions = [],
    enableBrowserDrafts,
    chromeMode = "full",
    designCueCommands = [],
    disabledExportFormats = [],
    headerActions = [],
    initialDocument,
    initialDrawerCollapsed = false,
    initialSelectedLayerId,
    onAiToolAction,
    onDesignCueApply,
    onDesignCueRequest,
    onDocumentChange,
    onExport,
    onTemplateSave,
    productLabel = "Product",
    sourceLabel = "Blank asset",
    templateSaveLabel = "Save as template",
    templateSavePreview = false,
    workspaceControls,
}: CreativeEditorProps) {
    const initialEditorDocument = useMemo(
        () => normalizeCreativeEditorDocumentPages(initialDocument),
        [initialDocument],
    );
    const browserDraftsEnabled = enableBrowserDrafts ?? chromeMode === "full";
    const showInternalExportTools = chromeMode === "full";
    const showDesignManagementActions = chromeMode === "full";
    const showWorkspaceNavigationActions = chromeMode === "full";
    const initialBarcodeText = initialEditorDocument.metadata?.brand?.name || productLabel || "Product";
    const [documentValue, setDocumentValue] = useState<CreativeEditorDocument>(initialEditorDocument);
    const resolveInitialSelectedId = (documentValue: CreativeEditorDocument) => {
        if (initialSelectedLayerId === null) return "";
        if (typeof initialSelectedLayerId === "string") {
            return documentValue.elements.some((element) => element.id === initialSelectedLayerId)
                ? initialSelectedLayerId
                : "";
        }
        return documentValue.elements[0]?.id || "";
    };
    const availableTools = useMemo(() => {
        if (!availableToolIds?.length) return EDITOR_TOOLS;
        const admittedIds = new Set(availableToolIds);
        return EDITOR_TOOLS.filter((tool) => admittedIds.has(tool.id));
    }, [availableToolIds]);
    const visibleWorkspaceControls = useMemo(
        () => new Set<CreativeEditorWorkspaceControl>(workspaceControls || ["grid", "safeArea", "review", "preview"]),
        [workspaceControls],
    );
    const [selectedId, setSelectedIdState] = useState(() => resolveInitialSelectedId(initialEditorDocument));
    const [activeTool, setActiveTool] = useState<EditorToolId>("background");
    const [drawerSearch, setDrawerSearch] = useState("");
    const [recentInsertions, setRecentInsertions] = useState<DrawerSearchItem[]>([]);
    const [theme, setTheme] = useState<EditorTheme>("dark");
    const [interactionMode, setInteractionModeState] = useState<InteractionMode>("selection");
    const [zoom, setZoom] = useState(0.61);
    const [notice, setNotice] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [qrValue, setQrValue] = useState("https://example.com/");
    const [qrDarkColor, setQrDarkColor] = useState("#16231f");
    const [qrSize, setQrSize] = useState(164);
    const [selectedQrActionPresetId, setSelectedQrActionPresetId] = useState<QrActionPreset["id"]>("menu");
    const [backgroundMode, setBackgroundMode] = useState<"solid" | "gradient">(
        initialDocument.canvas.backgroundGradient?.enabled ? "gradient" : "solid",
    );
    const [barcodeValue, setBarcodeValue] = useState("https://example.com/");
    const [barcodeText, setBarcodeText] = useState(initialBarcodeText);
    const [barcodeLineColor, setBarcodeLineColor] = useState("#000000");
    const [barcodeBackgroundColor, setBarcodeBackgroundColor] = useState("#ffffff");
    const [barcodeDisplayText, setBarcodeDisplayText] = useState(true);
    const [fabricReady, setFabricReady] = useState(false);
    const [historyState, setHistoryState] = useState({ version: 0 });
    const [drawerCollapsed, setDrawerCollapsed] = useState(initialDrawerCollapsed);
    const [showGrid, setShowGrid] = useState(false);
    const [showSafeArea, setShowSafeArea] = useState(false);
    const [inspectorOpen, setInspectorOpen] = useState(false);
    const [rightPanelModeState, setRightPanelModeState] = useState<RightPanelMode>("properties");
    const [styleShuffleIndex, setStyleShuffleIndex] = useState(0);
    const [previewDataUrl, setPreviewDataUrl] = useState("");
    const [aiToolBusyId, setAiToolBusyId] = useState("");
    const [aiToolResult, setAiToolResult] = useState<{
        action: CreativeEditorAiToolAction;
        result: CreativeEditorAiToolResult;
    } | null>(null);
    const [designCueBusy, setDesignCueBusy] = useState(false);
    const [designCuePatchSet, setDesignCuePatchSet] = useState<CreativeEditorDesignCuePatchSet | null>(null);
    const [floatingSelectionToolbar, setFloatingSelectionToolbar] = useState<FloatingSelectionToolbarState | null>(null);
    const [autosaveDraft, setAutosaveDraft] = useState<CreativeEditorDocument | null>(null);
    const [readinessIssues, setReadinessIssues] = useState<ReadinessIssue[]>([]);
    const [readinessPanelOpen, setReadinessPanelOpen] = useState(false);
    const [historyLabelState, setHistoryLabelState] = useState({ current: "Opened design" });
    const [reviewMode, setReviewMode] = useState(false);
    const [shortcutPanelOpen, setShortcutPanelOpen] = useState(false);
    const [draggedLayerId, setDraggedLayerId] = useState("");
    const [workspaceViewport, setWorkspaceViewport] = useState<WorkspaceViewportState>({
        height: 0,
        left: 0,
        top: 0,
        width: 0,
    });

    const canvasHostRef = useRef<HTMLDivElement | null>(null);
    const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
    const stageScrollerRef = useRef<HTMLDivElement | null>(null);
    const floatingSelectionToolbarRef = useRef<HTMLDivElement | null>(null);
    const fabricApiRef = useRef<FabricStatic | null>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const jsonInputRef = useRef<HTMLInputElement | null>(null);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const replaceImageInputRef = useRef<HTMLInputElement | null>(null);
    const shortcutButtonRef = useRef<HTMLButtonElement | null>(null);
    const shortcutCloseButtonRef = useRef<HTMLButtonElement | null>(null);
    const previewButtonRef = useRef<HTMLButtonElement | null>(null);
    const previewCloseButtonRef = useRef<HTMLButtonElement | null>(null);
    const inspectorRef = useRef<HTMLElement | null>(null);
    const documentRef = useRef<CreativeEditorDocument>(initialEditorDocument);
    const selectedIdRef = useRef(selectedId);
    const interactionModeRef = useRef(interactionMode);
    const zoomRef = useRef(zoom);
    const rightPanelModeRef = useRef<RightPanelMode>("properties");
    const isLoadingRef = useRef(false);
    const loadDocumentGenerationRef = useRef(0);
    const loadDocumentQueueRef = useRef<Promise<void>>(Promise.resolve());
    const fileImportInFlightRef = useRef(false);
    const documentRevisionRef = useRef(0);
    const operationSequenceRef = useRef(0);
    const aiToolOperationRef = useRef(0);
    const designCueOperationRef = useRef(0);
    const designCueApplyOperationRef = useRef(0);
    const exportOperationRef = useRef(0);
    const templateSaveOperationRef = useRef(0);
    const clipboardOperationRef = useRef(0);
    const clipboardRef = useRef<fabric.FabricObject | fabric.ActiveSelection | null>(null);
    const historyRef = useRef<CreativeEditorDocument[]>([initialEditorDocument]);
    const historyLabelsRef = useRef<string[]>(["Opened design"]);
    const historyIndexRef = useRef(0);
    const autosaveReadyRef = useRef(false);
    const lastReadinessSignatureRef = useRef("");
    const spacebarModeRestoreRef = useRef<InteractionMode | null>(null);
    const pendingFloatingToolbarRefreshRef = useRef(false);
    const floatingToolbarFrameRef = useRef<number | null>(null);
    const floatingToolbarSizeRef = useRef<{ height: number; variant: FloatingSelectionToolbarVariant | ""; width: number }>({
        height: FLOATING_SELECTION_TOOLBAR_FALLBACK_SIZE.single.height,
        variant: "",
        width: FLOATING_SELECTION_TOOLBAR_FALLBACK_SIZE.single.width,
    });
    const workspaceViewportFrameRef = useRef<number | null>(null);
    const lastDesignCueRequestRef = useRef<Omit<CreativeEditorDesignCueRequest, "document" | "selectedElement" | "selectedText"> | null>(null);
    const polygonDraftRef = useRef<{
        points: Array<{ x: number; y: number }>;
        preview: CreativeFabricObject | null;
    }>({ points: [], preview: null });

    useEffect(() => {
        if (!inspectorOpen || rightPanelModeState !== "properties" || !readinessPanelOpen) return undefined;
        const frameId = window.requestAnimationFrame(() => {
            if (inspectorRef.current) inspectorRef.current.scrollTop = 0;
        });
        return () => window.cancelAnimationFrame(frameId);
    }, [inspectorOpen, readinessPanelOpen, rightPanelModeState]);

    const selectedElement = useMemo(
        () => documentValue.elements.find((element) => element.id === selectedId) || null,
        [documentValue.elements, selectedId],
    );
    const pageList = documentValue.pages?.length ? documentValue.pages : [];
    const activePage = pageList.find((page) => page.id === documentValue.activePageId) || pageList[0] || null;
    const activePageIndex = Math.max(0, pageList.findIndex((page) => page.id === activePage?.id));
    const activePageLocked = Boolean(activePage?.locked);
    const showPageNavigation = pageList.length > 1;
    const canUndo = historyState.version >= 0 && historyIndexRef.current > 0;
    const canRedo = historyState.version >= 0 && historyIndexRef.current < historyRef.current.length - 1;
    const layerList = [...documentValue.elements].reverse();
    const primaryColor = getPrimaryColor(documentValue);
    const brand = documentValue.metadata?.brand;
    const selectedQrActionPreset = QR_ACTION_PRESETS.find((preset) => preset.id === selectedQrActionPresetId) || QR_ACTION_PRESETS[0];
    const brandColorItems = [
        { id: "primary", label: "Primary", value: brand?.primaryColor },
        { id: "secondary", label: "Secondary", value: brand?.secondaryColor },
        { id: "accent", label: "Accent", value: brand?.accentColor },
    ].filter((item): item is { id: string; label: string; value: string } => Boolean(item.value));
    const brandLogoAssets = [
        ...(brand?.logoUrl ? [{
            id: "document-brand-logo",
            label: `${brand.name || "Business"} logo`,
            sourceRef: "document_brand",
            type: "logo" as const,
            url: brand.logoUrl,
        }] : []),
        ...assetSources.filter((asset) => asset.type === "logo"),
    ].slice(0, 6);
    const textPlaceholders = documentValue.metadata?.textPlaceholders || [];
    const selectedText = getTextFromElement(selectedElement);
    const horizontalRulerTicks = useMemo(
        () => buildRulerTicks(documentValue.canvas.width),
        [documentValue.canvas.width],
    );
    const verticalRulerTicks = useMemo(
        () => buildRulerTicks(documentValue.canvas.height),
        [documentValue.canvas.height],
    );
    const activeObjectType = floatingSelectionToolbar?.activeObjectType || "";
    const isGroupedSelection = activeObjectType === "group";
    const isActiveMultiSelection = Boolean(floatingSelectionToolbar?.isMultiSelection && activeObjectType === "activeSelection");
    const selectionCount = floatingSelectionToolbar?.selectionCount || (selectedElement ? 1 : 0);
    const canGroupActiveSelection = isActiveMultiSelection && selectionCount > 1 && !floatingSelectionToolbar?.locked && !activePageLocked;
    const canUngroupActiveSelection = isGroupedSelection && !floatingSelectionToolbar?.locked && !activePageLocked;
    const canDistributeActiveSelection = canGroupActiveSelection && selectionCount > 2;
    const selectedLayerFrameLocked = Boolean(selectedElement?.printFrameLocked);
    const selectedLayerLocked = Boolean(selectedElement?.locked || selectedLayerFrameLocked);
    const selectedLayerReadOnly = Boolean(selectedLayerLocked || activePageLocked);
    const printFramesLocked = Boolean(documentValue.metadata?.printFrames?.some((frame) => frame.locked));
    const visibleLayerCount = documentValue.elements.filter((element) => element.visible !== false).length;
    const lockedLayerCount = documentValue.elements.filter((element) => element.locked || element.printFrameLocked).length;
    const currentHistoryLabel = historyLabelsRef.current[historyIndexRef.current] || historyLabelState.current;
    const autosaveKey = useMemo(() => getCreativeEditorDraftStorageKey({
        documentId: initialEditorDocument.id,
        productId: documentValue.productContext.productId,
        sourceLabel,
        workspaceId: documentValue.productContext.workspaceId,
    }), [documentValue.productContext.productId, documentValue.productContext.workspaceId, initialEditorDocument.id, sourceLabel]);

    const showCreativeEditorFailure = (
        failureCode: string,
        error: unknown,
        noticeMessage: string,
        metadata: Record<string, unknown> = {},
    ) => {
        const context: Record<string, boolean | number | string | null | undefined> = {
            ...getBoundedRuntimeStringContext("productLabel", productLabel),
            ...getBoundedRuntimeStringContext("sourceLabel", sourceLabel),
            ...getBoundedRuntimeStringContext("documentId", documentRef.current.id),
            ...getBoundedRuntimeStringContext("productId", documentRef.current.productContext.productId),
        };

        Object.entries(metadata).forEach(([key, value]) => {
            if (typeof value === "boolean" || typeof value === "number") {
                context[key] = value;
                return;
            }
            Object.assign(context, getBoundedRuntimeStringContext(key, value));
        });

        logRuntimeFailure(failureCode, error, context);
        setNotice(noticeMessage);
    };

    const logCreativeEditorDraftStorageFailure = (
        operation: CreativeEditorDraftStorageOperation,
        error: unknown,
    ): void => {
        if (reportedCreativeEditorDraftStorageFailures.has(operation)) return;
        reportedCreativeEditorDraftStorageFailures.add(operation);
        logRuntimeFailure("creative_editor_browser_draft_storage_failed", error, {
            operation,
            ...getBoundedRuntimeStringContext("autosaveKey", autosaveKey),
            ...getBoundedRuntimeStringContext("documentId", initialEditorDocument.id),
            ...getBoundedRuntimeStringContext("productId", documentValue.productContext.productId),
            ...getBoundedRuntimeStringContext("workspaceId", documentValue.productContext.workspaceId),
        });
    };

    const setRightPanelMode = (mode: RightPanelMode) => {
        rightPanelModeRef.current = mode;
        setRightPanelModeState((current) => current === mode ? current : mode);
    };

    const restoreFocusToElement = (element: HTMLElement | null) => {
        if (!element) return;
        window.requestAnimationFrame(() => {
            element.focus({ preventScroll: true });
        });
    };

    const openShortcutPanel = () => {
        setShortcutPanelOpen(true);
    };

    const closeShortcutPanel = () => {
        setShortcutPanelOpen(false);
        restoreFocusToElement(shortcutButtonRef.current);
    };

    const closePreviewPanel = () => {
        setPreviewDataUrl("");
        restoreFocusToElement(previewButtonRef.current);
    };

    const trapDialogFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "Tab") return;
        const focusableElements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
            "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        )).filter((element) => element.offsetParent !== null || element === document.activeElement);
        if (!focusableElements.length) return;
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus({ preventScroll: true });
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus({ preventScroll: true });
        }
    };

    function getStageViewportSize() {
        const stage = stageScrollerRef.current;
        return {
            height: Math.max(1, Math.round(stage?.clientHeight || documentRef.current.canvas.height)),
            width: Math.max(1, Math.round(stage?.clientWidth || documentRef.current.canvas.width)),
        };
    }

    function syncZoomStateFromCanvas() {
        const canvas = fabricCanvasRef.current;
        const nextZoom = clampNumber(canvas?.getZoom() || zoomRef.current || 1, 0.05, 4);
        zoomRef.current = nextZoom;
        setZoom((current) => Math.abs(current - nextZoom) < 0.001 ? current : nextZoom);
    }

    function refreshWorkspaceViewportMetrics() {
        const canvas = fabricCanvasRef.current;
        const workspace = canvas ? findWorkspaceObject(canvas) : null;
        if (!canvas || !workspace) {
            setWorkspaceViewport((current) => current.width || current.height
                ? { height: 0, left: 0, top: 0, width: 0 }
                : current);
            return;
        }
        const rect = workspace.getBoundingRect();
        const nextRect = {
            height: Math.max(0, rect.height),
            left: rect.left,
            top: rect.top,
            width: Math.max(0, rect.width),
        };
        setWorkspaceViewport((current) => (
            Math.abs(current.left - nextRect.left) < 0.5
            && Math.abs(current.top - nextRect.top) < 0.5
            && Math.abs(current.width - nextRect.width) < 0.5
            && Math.abs(current.height - nextRect.height) < 0.5
                ? current
                : nextRect
        ));
    }

    function scheduleWorkspaceViewportMetricsRefresh() {
        if (workspaceViewportFrameRef.current !== null) return;
        workspaceViewportFrameRef.current = window.requestAnimationFrame(() => {
            workspaceViewportFrameRef.current = null;
            refreshWorkspaceViewportMetrics();
        });
    }

    function centerWorkspaceAtZoom(nextZoom: number) {
        const canvas = fabricCanvasRef.current;
        const workspace = canvas ? findWorkspaceObject(canvas) : null;
        if (!canvas || !workspace) return;
        const safeZoom = clampNumber(nextZoom, 0.05, 4);
        const workspaceCenter = workspace.getCenterPoint();
        canvas.setViewportTransform([
            safeZoom,
            0,
            0,
            safeZoom,
            canvas.getWidth() / 2 - workspaceCenter.x * safeZoom,
            canvas.getHeight() / 2 - workspaceCenter.y * safeZoom,
        ]);
        canvas.calcOffset();
        canvas.requestRenderAll();
        syncZoomStateFromCanvas();
        refreshWorkspaceViewportMetrics();
        scheduleFloatingSelectionToolbarRefresh();
    }

    function resizeFabricViewportToStage() {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const size = getStageViewportSize();
        canvas.setDimensions(size);
        canvas.calcOffset();
        canvas.requestRenderAll();
        refreshWorkspaceViewportMetrics();
        scheduleFloatingSelectionToolbarRefresh();
    }

    const fitZoomToStage = useCallback(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        resizeFabricViewportToStage();
        const availableWidth = Math.max(260, canvas.getWidth() - 136);
        const availableHeight = Math.max(220, canvas.getHeight() - 156);
        const nextZoom = clampNumber(
            Math.min(
                availableWidth / Math.max(1, documentRef.current.canvas.width),
                availableHeight / Math.max(1, documentRef.current.canvas.height),
                1,
            ),
            0.05,
            1,
        );
        centerWorkspaceAtZoom(nextZoom);
        // fitZoomToStage is intentionally bound to the current Fabric refs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function zoomFabricViewport(delta: number) {
        const canvas = fabricCanvasRef.current;
        const fabricApi = fabricApiRef.current;
        if (!canvas || !fabricApi) return;
        const center = canvas.getCenterPoint();
        const nextZoom = clampNumber(canvas.getZoom() + delta, 0.05, 4);
        canvas.zoomToPoint(new fabricApi.Point(center.x, center.y), nextZoom);
        canvas.requestRenderAll();
        syncZoomStateFromCanvas();
        refreshWorkspaceViewportMetrics();
        scheduleFloatingSelectionToolbarRefresh();
    }

    const blockIfActivePageLocked = () => {
        if (!activePageLocked) return false;
        setNotice("Unlock this page before editing it.");
        return true;
    };

    const recordRecentInsertion = (item: DrawerSearchItem) => {
        setRecentInsertions((current) => [
            item,
            ...current.filter((existing) => existing.id !== item.id),
        ].slice(0, 6));
    };

    const getDocumentTimestampMs = (documentSnapshot: CreativeEditorDocument) => (
        Date.parse(documentSnapshot.metadata?.updatedAt || documentSnapshot.metadata?.createdAt || "") || 0
    );

    const isAutosaveDraftNewer = (draft: CreativeEditorDocument, current: CreativeEditorDocument) => {
        const draftTime = getDocumentTimestampMs(draft);
        const currentTime = getDocumentTimestampMs(current);
        if (draftTime && currentTime) return draftTime > currentTime + 1000;
        return JSON.stringify({
            canvas: draft.canvas,
            elements: draft.elements,
            pages: draft.pages,
            title: draft.title,
        }) !== JSON.stringify({
            canvas: current.canvas,
            elements: current.elements,
            pages: current.pages,
            title: current.title,
        });
    };

    const describeSelectedPatch = (
        element: CreativeEditorElement,
        patch: Partial<CreativeEditorElement>,
    ) => {
        const keys = new Set(Object.keys(patch));
        if (keys.has("name")) return `Renamed ${element.name}`;
        if (keys.has("text")) return `Edited ${element.name}`;
        if (keys.has("src")) return `Replaced ${element.name}`;
        if (keys.has("filter") || keys.has("filterAdjustments")) return `Adjusted ${element.name}`;
        if (keys.has("color") || keys.has("fill") || keys.has("darkColor") || keys.has("lightColor")) return `Changed color`;
        if (keys.has("fontFamily") || keys.has("fontSize") || keys.has("fontWeight") || keys.has("fontStyle") || keys.has("lineHeight")) return `Changed text style`;
        if (keys.has("x") || keys.has("y") || keys.has("width") || keys.has("height") || keys.has("rotation")) return `Moved or resized ${element.name}`;
        if (keys.has("opacity")) return `Changed opacity`;
        if (keys.has("gradient") || keys.has("stroke") || keys.has("strokeWidth") || keys.has("strokeStyle")) return `Styled ${element.name}`;
        return `Edited ${element.name}`;
    };

    const describeCanvasPatch = (patch: Partial<CreativeEditorDocument["canvas"]>) => {
        if (patch.width || patch.height) return "Resized canvas";
        if (patch.backgroundGradient) return "Changed background gradient";
        if (patch.backgroundColor) return "Changed background color";
        return "Changed canvas";
    };

    const setSelectedId = (id: string) => {
        selectedIdRef.current = id;
        setSelectedIdState((current) => current === id ? current : id);
    };

    function clearFloatingSelectionToolbar() {
        setFloatingSelectionToolbar((current) => current ? null : current);
    }

    function getFloatingToolbarSize(variant: FloatingSelectionToolbarVariant) {
        const measuredSize = floatingToolbarSizeRef.current;
        if (measuredSize.variant === variant && measuredSize.width > 0 && measuredSize.height > 0) {
            return measuredSize;
        }
        return {
            ...FLOATING_SELECTION_TOOLBAR_FALLBACK_SIZE[variant],
            variant,
        };
    }

    function resolveFloatingToolbarPosition({
        anchorLeft,
        canvasHeight,
        canvasWidth,
        selectionBottom,
        toolbarHeight,
        toolbarWidth,
    }: {
        anchorLeft: number;
        canvasHeight: number;
        canvasWidth: number;
        selectionBottom: number;
        toolbarHeight: number;
        toolbarWidth: number;
    }) {
        const safeToolbarWidth = Math.min(
            Math.max(1, toolbarWidth),
            Math.max(1, canvasWidth - FLOATING_SELECTION_TOOLBAR_EDGE_PADDING * 2),
        );
        const safeToolbarHeight = Math.max(1, toolbarHeight);
        const minLeft = FLOATING_SELECTION_TOOLBAR_EDGE_PADDING;
        const maxLeft = Math.max(minLeft, canvasWidth - safeToolbarWidth - FLOATING_SELECTION_TOOLBAR_EDGE_PADDING);
        const minTop = FLOATING_SELECTION_TOOLBAR_EDGE_PADDING;
        const maxTop = Math.max(minTop, canvasHeight - safeToolbarHeight - FLOATING_SELECTION_TOOLBAR_EDGE_PADDING);

        return {
            left: clampNumber(anchorLeft - safeToolbarWidth / 2, minLeft, maxLeft),
            top: clampNumber(selectionBottom + FLOATING_SELECTION_TOOLBAR_GAP, minTop, maxTop),
        };
    }

    function measureFloatingSelectionToolbar() {
        const toolbar = floatingSelectionToolbarRef.current;
        if (!toolbar || !floatingSelectionToolbar) return false;
        const nextSize = {
            height: Math.ceil(toolbar.offsetHeight || toolbar.getBoundingClientRect().height || FLOATING_SELECTION_TOOLBAR_FALLBACK_SIZE[floatingSelectionToolbar.variant].height),
            variant: floatingSelectionToolbar.variant,
            width: Math.ceil(toolbar.offsetWidth || toolbar.getBoundingClientRect().width || FLOATING_SELECTION_TOOLBAR_FALLBACK_SIZE[floatingSelectionToolbar.variant].width),
        };
        const currentSize = floatingToolbarSizeRef.current;
        const changed = currentSize.variant !== nextSize.variant
            || Math.abs(currentSize.width - nextSize.width) > 1
            || Math.abs(currentSize.height - nextSize.height) > 1;
        if (changed) {
            floatingToolbarSizeRef.current = nextSize;
        }
        return changed;
    }

    function isSameFloatingSelectionToolbar(
        current: FloatingSelectionToolbarState | null,
        next: FloatingSelectionToolbarState,
    ) {
        return Boolean(current
            && current.activeObjectType === next.activeObjectType
            && current.variant === next.variant
            && current.isMultiSelection === next.isMultiSelection
            && current.locked === next.locked
            && current.selectionCount === next.selectionCount
            && Math.abs(current.anchorLeft - next.anchorLeft) < 0.5
            && Math.abs(current.selectionBottom - next.selectionBottom) < 0.5
            && Math.abs(current.left - next.left) < 0.5
            && Math.abs(current.top - next.top) < 0.5);
    }

    function refreshFloatingSelectionToolbar() {
        const canvas = fabricCanvasRef.current;
        const activeObject = canvas?.getActiveObject();
        if (!canvas || !activeObject || interactionModeRef.current !== "selection") {
            clearFloatingSelectionToolbar();
            return;
        }
        const activeObjectType = activeObject.type || "";
        const activeIsTemporaryGroup = activeObjectType === "group";
        if (!activeIsTemporaryGroup && !isEditableFabricObject(activeObject)) {
            clearFloatingSelectionToolbar();
            return;
        }
        const activeObjects = activeIsTemporaryGroup
            ? (activeObject as fabric.Group).getObjects().filter(isEditableFabricObject)
            : canvas.getActiveObjects().filter(isEditableFabricObject);
        if (!activeObjects.length) {
            clearFloatingSelectionToolbar();
            return;
        }
        const rect = activeObject.getBoundingRect();
        const canvasWidth = Math.max(1, canvas.getWidth());
        const canvasHeight = Math.max(1, canvas.getHeight());
        const anchorLeft = rect.left + rect.width / 2;
        const selectionBottom = rect.top + rect.height;
        if (![rect.left, rect.top, rect.width, rect.height, anchorLeft, selectionBottom].every(Number.isFinite)) {
            clearFloatingSelectionToolbar();
            return;
        }
        const variant: FloatingSelectionToolbarVariant = activeIsTemporaryGroup
            ? "group"
            : activeObjects.length > 1 || activeObjectType === "activeSelection"
                ? "multi"
                : "single";
        const toolbarSize = getFloatingToolbarSize(variant);
        const { left, top } = resolveFloatingToolbarPosition({
            anchorLeft,
            canvasHeight,
            canvasWidth,
            selectionBottom,
            toolbarHeight: toolbarSize.height,
            toolbarWidth: toolbarSize.width,
        });
        const nextToolbar = {
            activeObjectType,
            anchorLeft,
            isMultiSelection: activeObjects.length > 1 || activeObjectType === "activeSelection",
            left,
            locked: activeObjects.some((object) => Boolean((object as CreativeFabricObject).locked)),
            selectionBottom,
            selectionCount: activeObjects.length,
            top,
            variant,
        };
        setFloatingSelectionToolbar((current) => (
            isSameFloatingSelectionToolbar(current, nextToolbar) ? current : nextToolbar
        ));
    }

    function scheduleFloatingSelectionToolbarRefresh(options: { force?: boolean } | fabric.TEvent<Event> = {}) {
        const force = "force" in options ? Boolean(options.force) : false;
        if (!force && isFormTarget(document.activeElement)) {
            pendingFloatingToolbarRefreshRef.current = true;
            return;
        }
        pendingFloatingToolbarRefreshRef.current = false;
        if (floatingToolbarFrameRef.current !== null) return;
        floatingToolbarFrameRef.current = window.requestAnimationFrame(() => {
            floatingToolbarFrameRef.current = null;
            refreshFloatingSelectionToolbar();
        });
    }

    function flushPendingFloatingToolbarRefresh() {
        if (!pendingFloatingToolbarRefreshRef.current) return;
        window.requestAnimationFrame(() => {
            if (!isFormTarget(document.activeElement)) {
                scheduleFloatingSelectionToolbarRefresh({ force: true });
            }
        });
    }

    const configureDrawingBrush = (canvas: fabric.Canvas) => {
        const fabricApi = fabricApiRef.current;
        if (!fabricApi) return;
        const brush = new fabricApi.PencilBrush(canvas);
        brush.color = getPrimaryColor(documentRef.current);
        brush.width = 4;
        canvas.freeDrawingBrush = brush;
    };

    const clearPolygonPreview = () => {
        const canvas = fabricCanvasRef.current;
        const preview = polygonDraftRef.current.preview;
        if (canvas && preview) canvas.remove(preview);
        polygonDraftRef.current.preview = null;
    };

    const updatePolygonPreview = () => {
        const fabricApi = fabricApiRef.current;
        const canvas = fabricCanvasRef.current;
        if (!fabricApi || !canvas) return;
        clearPolygonPreview();
        const points = polygonDraftRef.current.points;
        if (points.length < 2) return;
        const preview = new fabricApi.Polyline(points, {
            evented: false,
            excludeFromExport: true,
            fill: "rgba(80, 189, 241, 0.12)",
            objectCaching: false,
            selectable: false,
            stroke: "#32ace7",
            strokeDashArray: [8, 6],
            strokeLineCap: "round",
            strokeLineJoin: "round",
            strokeWidth: 3,
        }) as CreativeFabricObject;
        preview.creativeEditorType = "visibleWatermark";
        preview.name = "Polygon draft";
        polygonDraftRef.current.preview = preview;
        canvas.add(preview);
        canvas.requestRenderAll();
    };

    const cancelPolygonDraft = () => {
        clearPolygonPreview();
        polygonDraftRef.current.points = [];
        fabricCanvasRef.current?.requestRenderAll();
    };

    const finishPolygonDraft = () => {
        const points = polygonDraftRef.current.points;
        if (points.length < 3) {
            setNotice("Add at least three polygon points.");
            return;
        }
        const minX = Math.min(...points.map((point) => point.x));
        const minY = Math.min(...points.map((point) => point.y));
        const maxX = Math.max(...points.map((point) => point.x));
        const maxY = Math.max(...points.map((point) => point.y));
        const element = buildCreativeEditorPolygonElement({
            fill: getPrimaryColor(documentRef.current),
            height: Math.max(20, Math.round(maxY - minY)),
            name: "Custom polygon",
            points: points.map((point) => ({
                x: Math.round(point.x - minX),
                y: Math.round(point.y - minY),
            })),
            width: Math.max(20, Math.round(maxX - minX)),
            x: Math.round(minX),
            y: Math.round(minY),
        });
        cancelPolygonDraft();
        setInteractionMode("selection");
        addElement(element);
    };

    const handlePolygonPointer = (event: fabric.TPointerEventInfo) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || interactionModeRef.current !== "polygon") return;
        const pointerEvent = event.e as MouseEvent;
        if (pointerEvent.detail > 1) return;
        const pointer = canvas.getScenePoint(event.e);
        const existingPoints = polygonDraftRef.current.points;
        const firstPoint = existingPoints[0];
        if (firstPoint && existingPoints.length >= 3) {
            const distanceFromStart = Math.hypot(pointer.x - firstPoint.x, pointer.y - firstPoint.y);
            if (distanceFromStart <= 14) {
                finishPolygonDraft();
                return;
            }
        }
        polygonDraftRef.current.points.push({
            x: Math.round(pointer.x),
            y: Math.round(pointer.y),
        });
        updatePolygonPreview();
        if (polygonDraftRef.current.points.length === 1) {
            setNotice("Click more points, then double-click or press Enter to finish.");
        }
    };

    const setInteractionMode = (mode: InteractionMode) => {
        if (mode !== "polygon") cancelPolygonDraft();
        interactionModeRef.current = mode;
        setInteractionModeState((current) => current === mode ? current : mode);
        if (mode !== "selection") {
            clearFloatingSelectionToolbar();
        } else {
            scheduleFloatingSelectionToolbarRefresh();
        }
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const isDrawing = mode === "draw";
        const pageLocked = Boolean(documentRef.current.pages?.find((page) => page.id === documentRef.current.activePageId)?.locked);
        canvas.isDrawingMode = isDrawing;
        if (isDrawing) configureDrawingBrush(canvas);
        canvas.defaultCursor = mode === "grab" ? "grab" : (isDrawing || mode === "polygon") ? "crosshair" : "default";
        canvas.getObjects().forEach((object) => {
            if (isEditableFabricObject(object)) {
                object.selectable = mode === "selection" && !pageLocked;
                object.evented = !pageLocked;
            }
        });
        canvas.selection = mode === "selection" && !pageLocked;
        canvas.requestRenderAll();
        if (mode === "polygon") setNotice("Click points on the canvas, then double-click or press Enter to finish.");
    };

    function pushHistory(documentSnapshot: CreativeEditorDocument, label = "Changed design") {
        const baseHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
        const baseLabels = historyLabelsRef.current.slice(0, historyIndexRef.current + 1);
        historyRef.current = [...baseHistory, documentSnapshot].slice(-60);
        historyLabelsRef.current = [...baseLabels, label].slice(-60);
        historyIndexRef.current = historyRef.current.length - 1;
        setHistoryLabelState({ current: label });
        setHistoryState((current) => ({ version: current.version + 1 }));
    }

    async function loadDocument(documentSnapshot: CreativeEditorDocument, nextSelectedId = selectedIdRef.current) {
        const generation = loadDocumentGenerationRef.current + 1;
        loadDocumentGenerationRef.current = generation;
        const executeLoad = async () => {
            if (generation !== loadDocumentGenerationRef.current) return;
            const fabricApi = fabricApiRef.current;
            const canvas = fabricCanvasRef.current;
            if (!fabricApi || !canvas) return;
            isLoadingRef.current = true;
            try {
                await loadDocumentIntoFabricCanvas({
                    canvas,
                    documentValue: documentSnapshot,
                    fabricApi,
                    productLabel,
                    selectedId: nextSelectedId,
                    showCanvasWatermark: chromeMode === "full",
                    viewportSize: getStageViewportSize(),
                });
                if (
                    generation !== loadDocumentGenerationRef.current
                    || fabricCanvasRef.current !== canvas
                ) return;
                canvasElementRef.current?.setAttribute("data-creative-object-count", String(canvas.getObjects().length));
                const active = canvas.getActiveObject() as CreativeFabricObject | undefined;
                setSelectedId(active?.id && isEditableFabricObject(active) ? active.id : nextSelectedId || "");
                const page = documentSnapshot.pages?.find((item) => item.id === documentSnapshot.activePageId);
                if (page?.locked) {
                    canvas.discardActiveObject();
                    canvas.selection = false;
                    canvas.getObjects().forEach((object) => {
                        if (isEditableFabricObject(object)) {
                            object.selectable = false;
                            object.evented = false;
                        }
                    });
                    setSelectedId("");
                }
                scheduleFloatingSelectionToolbarRefresh();
                refreshWorkspaceViewportMetrics();
            } catch (error) {
                if (generation !== loadDocumentGenerationRef.current) return;
                showCreativeEditorFailure("creative_editor_canvas_load_failed", error, "Canvas could not load.");
            } finally {
                if (generation === loadDocumentGenerationRef.current) {
                    isLoadingRef.current = false;
                }
            }
        };
        const queuedLoad = loadDocumentQueueRef.current
            .catch((): void => undefined)
            .then(executeLoad);
        loadDocumentQueueRef.current = queuedLoad;
        await queuedLoad;
    }

    function convertGroupToActiveSelection(
        canvas: fabric.Canvas,
        fabricApi: FabricStatic,
        group: fabric.Group,
    ) {
        canvas.discardActiveObject();
        const objects = group.removeAll();
        canvas.remove(group);
        canvas.add(...objects);
        const selection = new fabricApi.ActiveSelection(objects, { canvas });
        canvas.setActiveObject(selection);
        return selection;
    }

    function convertActiveSelectionToGroup(
        canvas: fabric.Canvas,
        fabricApi: FabricStatic,
        selection: fabric.ActiveSelection,
    ) {
        const objects = selection.getObjects();
        canvas.discardActiveObject();
        canvas.remove(...objects);
        const group = new fabricApi.Group(objects, { objectCaching: false });
        canvas.add(group);
        canvas.setActiveObject(group);
        return group;
    }

    function releaseActiveGroupForPersistence(canvas: fabric.Canvas) {
        const activeObject = canvas.getActiveObject();
        const fabricApi = fabricApiRef.current;
        const creativeType = (activeObject as CreativeFabricObject | undefined)?.creativeEditorType;
        if (activeObject?.type === "group" && !creativeType && fabricApi) {
            convertGroupToActiveSelection(canvas, fabricApi, activeObject as fabric.Group);
            canvas.requestRenderAll();
        }
    }

    function commitDocument(
        next: CreativeEditorDocument,
        recordHistory = true,
        nextSelectedId = selectedIdRef.current,
        reloadCanvas = true,
        historyLabel = "Changed design",
    ) {
        const synced = syncActivePageSnapshot(next);
        const stamped = {
            ...synced,
            metadata: {
                ...synced.metadata,
                updatedAt: new Date().toISOString(),
            },
        };
        const validated = parseCreativeEditorDocument(stamped);
        if (!validated) {
            setNotice("That change contains an invalid value and was not applied.");
            return;
        }
        documentRevisionRef.current += 1;
        documentRef.current = validated;
        setDocumentValue(validated);
        setSelectedId(nextSelectedId);
        if (recordHistory) pushHistory(validated, historyLabel);
        if (reloadCanvas) void loadDocument(validated, nextSelectedId);
    }

    function shouldReloadCanvasForSelectedPatch(
        element: CreativeEditorElement,
        patch: Partial<CreativeEditorElement>,
    ) {
        const patchKeys = Object.keys(patch);
        if (patchKeys.some((key) => SELECTED_PATCH_RELOAD_KEYS.has(key))) return true;
        if (element.type === "qr" && patchKeys.some((key) => key === "value" || key === "darkColor" || key === "lightColor" || key === "errorCorrectionLevel" || key === "margin")) return true;
        if ((element.type === "path" || element.type === "pathText") && patchKeys.includes("path")) return true;
        if (element.type === "pathText" && patchKeys.some((key) => key === "pathStroke" || key === "pathVisible")) return true;
        if (element.type === "line" && patchKeys.includes("arrowStyle")) return true;
        return false;
    }

    function selectedElementPatchHasChanges(
        element: CreativeEditorElement,
        patch: Partial<CreativeEditorElement>,
    ) {
        return Object.entries(patch).some(([key, value]) => (
            !Object.is((element as unknown as Record<string, unknown>)[key], value)
        ));
    }

    function findFabricObjectByElementId(id: string) {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return null;
        const object = canvas.getObjects().find((item) => (
            (item as CreativeFabricObject).id === id && isEditableFabricObject(item)
        )) as CreativeFabricObject | undefined;
        return object || null;
    }

    function createLiveGradientFill(element: CreativeEditorElement, fallback: string) {
        const fabricApi = fabricApiRef.current;
        const gradient = "gradient" in element ? element.gradient : undefined;
        if (!fabricApi || !gradient?.enabled) return fallback;
        const colorStops = normalizeGradientStops(gradient);
        const angle = -gradient.angle * (Math.PI / 180);
        const coords = {
            x1: Math.round(50 + Math.sin(angle) * 50) / 100,
            x2: Math.round(50 + Math.sin(angle + Math.PI) * 50) / 100,
            y1: Math.round(50 + Math.cos(angle) * 50) / 100,
            y2: Math.round(50 + Math.cos(angle + Math.PI) * 50) / 100,
        };
        return new fabricApi.Gradient({
            colorStops,
            coords: {
                x1: coords.x1 * element.width,
                x2: coords.x2 * element.width,
                y1: coords.y1 * element.height,
                y2: coords.y2 * element.height,
            },
            gradientUnits: "pixels",
            type: "linear",
        });
    }

    function applyLiveObjectSize(object: CreativeFabricObject, element: CreativeEditorElement) {
        if (element.type === "line" && object.type === "line") {
            (object as unknown as fabric.Line).set({
                x1: element.x,
                x2: element.x + element.width,
                y1: element.y,
                y2: element.y + element.height,
            });
            return;
        }
        if (object.type === "ellipse") {
            (object as unknown as fabric.Ellipse).set({
                rx: Math.max(1, element.width / 2),
                ry: Math.max(1, element.height / 2),
            });
            return;
        }
        if (object.type === "image" || object.type === "path" || object.type === "polygon") {
            const naturalWidth = object.width || element.width;
            const naturalHeight = object.height || element.height;
            object.set({
                scaleX: naturalWidth ? element.width / naturalWidth : 1,
                scaleY: naturalHeight ? element.height / naturalHeight : 1,
            });
            return;
        }
        if (object.type !== "group") {
            object.set({
                height: element.height,
                width: element.width,
            });
        }
    }

    function applyLiveStroke(object: CreativeFabricObject, element: CreativeEditorElement) {
        if (!canStrokeElement(element)) return;
        const stroke = element.stroke || "transparent";
        const strokeWidth = element.strokeWidth || 0;
        const strokeDashArray = getLiveDashArray(element.strokeStyle, Math.max(1, strokeWidth));
        const strokeLineCap = getLiveStrokeLineCap(element.strokeStyle, element.strokeLineCap);
        object.set({
            stroke,
            strokeDashArray,
            strokeLineCap,
            strokeWidth,
        });
        object.strokeLineCap = strokeLineCap;
        if (element.type === "line" && object.type === "group") {
            getFabricGroupChildren(object).forEach((child) => {
                child.set({
                    fill: stroke,
                    stroke,
                    strokeDashArray,
                    strokeLineCap,
                    strokeWidth,
                });
            });
        }
    }

    function applySelectedElementPatchToFabricObject(element: CreativeEditorElement) {
        const fabricApi = fabricApiRef.current;
        const canvas = fabricCanvasRef.current;
        const object = findFabricObjectByElementId(element.id);
        if (!fabricApi || !canvas || !object) return false;
        object.id = element.id;
        object.name = element.name;
        object.creativeEditorType = element.type;
        object.editorGuide = element.editorGuide;
        object.excludeFromExport = element.excludeFromExport ?? false;
        object.printFrameId = element.printFrameId;
        object.printFrameLocked = element.printFrameLocked;
        object.sourceRefs = element.sourceRefs;
        object.gradient = "gradient" in element ? element.gradient : undefined;
        object.set({
            angle: element.rotation || 0,
            flipX: Boolean(element.flipX),
            flipY: Boolean(element.flipY),
            left: element.x,
            opacity: element.opacity ?? 1,
            top: element.y,
            visible: element.visible !== false,
        });
        setObjectLocked(object, Boolean(element.locked || element.printFrameLocked));
        if (element.shadow) {
            object.set("shadow", new fabricApi.Shadow({
                blur: element.shadow.blur,
                color: element.shadow.color,
                offsetX: element.shadow.offsetX,
                offsetY: element.shadow.offsetY,
            }));
        } else if (element.blur) {
            object.set("shadow", new fabricApi.Shadow({
                blur: element.blur,
                color: "rgba(0,0,0,0.22)",
                offsetX: 0,
                offsetY: 0,
            }));
        } else {
            object.set("shadow", undefined);
        }
        applyLiveObjectSize(object, element);
        if (canEditTextElement(element)) {
            const textObject = getFabricTextChild(object);
            if (!textObject) return false;
            textObject.set({
                charSpacing: element.charSpacing || 0,
                fill: createLiveGradientFill(element, element.color),
                fontFamily: element.fontFamily || "Inter, Arial, sans-serif",
                fontSize: element.fontSize,
                fontStyle: element.fontStyle || "normal",
                fontWeight: element.fontWeight || "700",
                height: element.height,
                lineHeight: element.lineHeight || 1.12,
                linethrough: Boolean(element.linethrough),
                text: element.text,
                textAlign: element.align || (element.type === "pathText" ? "center" : "left"),
                textBackgroundColor: element.textBackgroundColor || "",
                underline: Boolean(element.underline),
                width: element.width,
            } as Partial<fabric.TextboxProps>);
        } else if (canFillElement(element)) {
            object.set({
                fill: createLiveGradientFill(element, element.fill),
            });
            if (element.type === "rect") {
                (object as unknown as fabric.Rect).set({
                    rx: element.radius || 0,
                    ry: element.radius || 0,
                });
            }
        } else if (element.type === "line") {
            object.set({ fill: element.stroke });
        } else if (element.type === "image") {
            object.set({
                src: element.src,
            } as Partial<CreativeFabricObject>);
        }
        applyLiveStroke(object, element);
        object.setCoords();
        getFabricGroupChildren(object).forEach((child) => child.setCoords());
        if (canvas.getActiveObject() !== object) canvas.setActiveObject(object);
        canvas.requestRenderAll();
        scheduleFloatingSelectionToolbarRefresh();
        return true;
    }

    function syncDocumentFromCanvas(recordHistory = true, historyLabel = "Changed design") {
        const canvas = fabricCanvasRef.current;
        if (!canvas || isLoadingRef.current) return;
        releaseActiveGroupForPersistence(canvas);
        const next = syncActivePageSnapshot(serializeFabricCanvasToDocument(canvas, documentRef.current));
        if (!parseCreativeEditorDocument(next)) {
            setNotice("The canvas produced an invalid value. The last valid design was restored.");
            void loadDocument(documentRef.current, selectedIdRef.current);
            return;
        }
        const active = canvas.getActiveObject() as CreativeFabricObject | undefined;
        const nextSelectedId = active?.id && isEditableFabricObject(active) ? active.id : selectedIdRef.current;
        commitDocument(next, recordHistory, nextSelectedId, false, historyLabel);
        scheduleFloatingSelectionToolbarRefresh();
    }

    useEffect(() => {
        documentRef.current = documentValue;
        onDocumentChange?.(documentValue);
    }, [documentValue, onDocumentChange]);

    useEffect(() => {
        if (!browserDraftsEnabled || !autosaveKey) {
            autosaveReadyRef.current = false;
            setAutosaveDraft(null);
            return;
        }
        autosaveReadyRef.current = false;
        setAutosaveDraft(null);
        try {
            const stored = window.localStorage.getItem(autosaveKey);
            if (!stored) {
                autosaveReadyRef.current = true;
                return;
            }
            const payload = parseCreativeEditorDocument(JSON.parse(stored) as unknown);
            if (
                !payload
                || payload.id !== initialEditorDocument.id
                || payload.productContext.productId !== documentRef.current.productContext.productId
                || (payload.productContext.workspaceId || undefined)
                    !== (documentRef.current.productContext.workspaceId || undefined)
            ) {
                window.localStorage.removeItem(autosaveKey);
                autosaveReadyRef.current = true;
                return;
            }
            const normalizedDraft = normalizeCreativeEditorDocumentPages({
                ...payload,
                productContext: documentRef.current.productContext,
            });
            if (isAutosaveDraftNewer(normalizedDraft, documentRef.current)) {
                setAutosaveDraft(normalizedDraft);
                return;
            }
            autosaveReadyRef.current = true;
        } catch (error) {
            logCreativeEditorDraftStorageFailure("read", error);
            try {
                window.localStorage.removeItem(autosaveKey);
            } catch (cleanupError) {
                logCreativeEditorDraftStorageFailure("cleanup", cleanupError);
            }
            autosaveReadyRef.current = true;
        }
    }, [autosaveKey, browserDraftsEnabled, initialEditorDocument.id]);

    useEffect(() => {
        if (!browserDraftsEnabled || !autosaveKey) return undefined;
        if (!autosaveReadyRef.current || autosaveDraft) return undefined;
        const timeout = window.setTimeout(() => {
            try {
                window.localStorage.setItem(autosaveKey, JSON.stringify(documentValue));
            } catch (error) {
                logCreativeEditorDraftStorageFailure("write", error);
            }
        }, 700);
        return () => window.clearTimeout(timeout);
    }, [autosaveDraft, autosaveKey, browserDraftsEnabled, documentValue]);

    useEffect(() => {
        let cancelled = false;
        void import("fabric").then((fabricApi) => {
            const canvasHost = canvasHostRef.current;
            if (cancelled || !canvasHost) return;
            const canvasElement = document.createElement("canvas");
            canvasElement.className = styles.canvasSurface;
            canvasElement.setAttribute("aria-label", documentRef.current.title);
            canvasElement.setAttribute("data-creative-editor-canvas", "true");
            canvasElement.setAttribute("role", "img");
            canvasHost.replaceChildren(canvasElement);
            canvasElementRef.current = canvasElement;
            configureCreativeFabric(fabricApi);
            const canvas = new fabricApi.Canvas(canvasElement, {
                allowTouchScrolling: true,
                controlsAboveOverlay: true,
                fireRightClick: true,
                imageSmoothingEnabled: false,
                isDrawingMode: false,
                preserveObjectStacking: true,
                renderOnAddRemove: false,
                stopContextMenu: true,
            });
            fabricApiRef.current = fabricApi;
            fabricCanvasRef.current = canvas;
            canvas.setDimensions(getStageViewportSize());
            initFabricDragging(fabricApi, canvas, () => interactionModeRef.current === "grab", () => {
                syncZoomStateFromCanvas();
                scheduleWorkspaceViewportMetricsRefresh();
                scheduleFloatingSelectionToolbarRefresh();
            });
            initFabricAlignmentGuidelines(fabricApi, canvas, "#45b99f");

            const handleSelection = () => {
                const active = canvas.getActiveObject() as CreativeFabricObject | undefined;
                const selectedObjectId = active?.id && isEditableFabricObject(active) ? active.id : "";
                const keepLayerPanelOpen = rightPanelModeRef.current === "layers" && isLoadingRef.current;
                setSelectedId(selectedObjectId);
                if (!keepLayerPanelOpen) {
                    setRightPanelMode("properties");
                }
                setInspectorOpen(Boolean(selectedObjectId || active?.type === "activeSelection" || active?.type === "group"));
                scheduleFloatingSelectionToolbarRefresh();
            };
            const handlePathCreated = (event: { path: fabric.FabricObject }) => {
                const path = event.path as CreativeFabricObject | undefined;
                if (!path) return;
                path.id = buildCreativeEditorId("layer");
                path.name = "Drawing";
                path.creativeEditorType = "path";
                path.fill = "transparent";
                path.stroke = typeof path.stroke === "string" ? path.stroke : getPrimaryColor(documentRef.current);
                path.strokeLineCap = "round";
                path.strokeLineJoin = "round";
                path.strokeWidth = typeof path.strokeWidth === "number" ? path.strokeWidth : 4;
                path.objectCaching = false;
                canvas.setActiveObject(path);
                syncDocumentFromCanvas(true, "Added drawing");
            };
            canvas.on("selection:created", handleSelection);
            canvas.on("selection:updated", handleSelection);
            canvas.on("selection:cleared", () => {
                setSelectedId("");
                if (rightPanelModeRef.current === "properties") {
                    setInspectorOpen(false);
                }
                clearFloatingSelectionToolbar();
            });
            canvas.on("mouse:down", handlePolygonPointer);
            canvas.on("mouse:dblclick", () => finishPolygonDraft());
            canvas.on("object:moving", scheduleFloatingSelectionToolbarRefresh);
            canvas.on("object:scaling", scheduleFloatingSelectionToolbarRefresh);
            canvas.on("object:rotating", scheduleFloatingSelectionToolbarRefresh);
            canvas.on("object:modified", () => {
                syncDocumentFromCanvas(true, "Moved or resized layer");
                scheduleFloatingSelectionToolbarRefresh();
            });
            canvas.on("path:created", handlePathCreated);
            const bootstrapDocument = documentRef.current;
            const bootstrapSelectedId = resolveInitialSelectedId(bootstrapDocument);
            void loadDocument(bootstrapDocument, bootstrapSelectedId).then(() => {
                if (!cancelled) {
                    fitZoomToStage();
                    setFabricReady(true);
                }
            });
        }).catch((error) => {
            showCreativeEditorFailure("creative_editor_fabric_load_failed", error, "Fabric could not load.");
        });
        return () => {
            cancelled = true;
            loadDocumentGenerationRef.current += 1;
            fileImportInFlightRef.current = false;
            operationSequenceRef.current += 1;
            aiToolOperationRef.current = 0;
            designCueOperationRef.current = 0;
            designCueApplyOperationRef.current = 0;
            exportOperationRef.current = 0;
            templateSaveOperationRef.current = 0;
            clipboardOperationRef.current = 0;
            if (floatingToolbarFrameRef.current !== null) {
                window.cancelAnimationFrame(floatingToolbarFrameRef.current);
                floatingToolbarFrameRef.current = null;
            }
            if (workspaceViewportFrameRef.current !== null) {
                window.cancelAnimationFrame(workspaceViewportFrameRef.current);
                workspaceViewportFrameRef.current = null;
            }
            const canvas = fabricCanvasRef.current;
            fabricCanvasRef.current = null;
            fabricApiRef.current = null;
            canvasElementRef.current = null;
            const clearCanvasHost = () => {
                canvasHostRef.current?.replaceChildren();
            };
            if (canvas) {
                // Fabric 7 disposal is asynchronous. Handle either outcome so an
                // unmount cannot leave an unhandled rejection or a stale canvas.
                void canvas.dispose().then(clearCanvasHost, clearCanvasHost);
            } else {
                clearCanvasHost();
            }
        };
        // Fabric is intentionally initialized once; document changes are loaded through commitDocument.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const canvasElement = canvasElementRef.current;
        if (!canvasElement) return;
        canvasElement.setAttribute("aria-label", documentValue.title);
        canvasElement.setAttribute("data-frame-left", String(Math.round(workspaceViewport.left)));
        canvasElement.setAttribute("data-frame-top", String(Math.round(workspaceViewport.top)));
        canvasElement.setAttribute("data-viewport-height", String(Math.round(workspaceViewport.height)));
        canvasElement.setAttribute("data-viewport-width", String(Math.round(workspaceViewport.width)));
    }, [documentValue.title, workspaceViewport.height, workspaceViewport.left, workspaceViewport.top, workspaceViewport.width]);

    useEffect(() => {
        documentRevisionRef.current += 1;
        operationSequenceRef.current += 1;
        aiToolOperationRef.current = 0;
        designCueOperationRef.current = 0;
        designCueApplyOperationRef.current = 0;
        exportOperationRef.current = 0;
        templateSaveOperationRef.current = 0;
        clipboardOperationRef.current = 0;
        documentRef.current = initialEditorDocument;
        historyRef.current = [initialEditorDocument];
        historyLabelsRef.current = ["Opened design"];
        historyIndexRef.current = 0;
        setHistoryLabelState({ current: "Opened design" });
        setHistoryState((current) => ({ version: current.version + 1 }));
        setNotice("");
        setImageUrl("");
        setQrValue("https://example.com/");
        setQrDarkColor("#16231f");
        setQrSize(164);
        setDrawerSearch("");
        setRecentInsertions([]);
        setStyleShuffleIndex(0);
        setAiToolBusyId("");
        setAiToolResult(null);
        setDesignCueBusy(false);
        setDesignCuePatchSet(null);
        setAutosaveDraft(null);
        setReadinessIssues([]);
        setReadinessPanelOpen(false);
        setReviewMode(false);
        setShortcutPanelOpen(false);
        autosaveReadyRef.current = false;
        lastReadinessSignatureRef.current = "";
        spacebarModeRestoreRef.current = null;
        clearFloatingSelectionToolbar();
        setInspectorOpen(false);
        setRightPanelMode("properties");
        setDrawerCollapsed(initialDrawerCollapsed);
        lastDesignCueRequestRef.current = null;
        setBarcodeText(initialEditorDocument.metadata?.brand?.name || productLabel || "Product");
        setBarcodeValue("https://example.com/");
        setBackgroundMode(initialEditorDocument.canvas.backgroundGradient?.enabled ? "gradient" : "solid");
        setDocumentValue(initialEditorDocument);
        const nextInitialSelectedId = resolveInitialSelectedId(initialEditorDocument);
        setSelectedId(nextInitialSelectedId);
        void loadDocument(initialEditorDocument, nextInitialSelectedId).then(() => fitZoomToStage());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialEditorDocument]);

    useEffect(() => {
        zoomRef.current = zoom;
        scheduleFloatingSelectionToolbarRefresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoom]);

    useEffect(() => {
        if (!floatingSelectionToolbar || !fabricReady) return;
        if (measureFloatingSelectionToolbar()) {
            scheduleFloatingSelectionToolbarRefresh({ force: true });
        }
    });

    useEffect(() => {
        if (!shortcutPanelOpen) return undefined;
        const frame = window.requestAnimationFrame(() => {
            shortcutCloseButtonRef.current?.focus({ preventScroll: true });
        });
        return () => window.cancelAnimationFrame(frame);
    }, [shortcutPanelOpen]);

    useEffect(() => {
        if (!previewDataUrl) return undefined;
        const frame = window.requestAnimationFrame(() => {
            previewCloseButtonRef.current?.focus({ preventScroll: true });
        });
        return () => window.cancelAnimationFrame(frame);
    }, [previewDataUrl]);

    useEffect(() => {
        fitZoomToStage();
        const stage = stageScrollerRef.current;
        if (!stage) return undefined;
        const observer = new ResizeObserver(() => fitZoomToStage());
        observer.observe(stage);
        return () => observer.disconnect();
    }, [documentValue.canvas.height, documentValue.canvas.width, drawerCollapsed, fitZoomToStage]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            const isMod = event.metaKey || event.ctrlKey;
            const targetIsForm = isFormTarget(event.target);
            const isAlt = event.altKey;
            const isShortcutPanelKey = !targetIsForm && (event.key === "?" || (event.shiftKey && event.key === "/")) && (isMod || event.shiftKey);
            if (isShortcutPanelKey) {
                event.preventDefault();
                if (shortcutPanelOpen) {
                    closeShortcutPanel();
                } else {
                    openShortcutPanel();
                }
                return;
            }
            const canvas = fabricCanvasRef.current;
            const fabricApi = fabricApiRef.current;
            const activeObject = canvas?.getActiveObject() as CreativeFabricObject | fabric.ActiveSelection | undefined;
            const activeTextChild = activeObject ? getFabricTextChild(activeObject as CreativeFabricObject) : undefined;
            if (activeTextChild?.isEditing) return;
            if (event.key === "Escape") {
                event.preventDefault();
                if (shortcutPanelOpen) {
                    closeShortcutPanel();
                    return;
                }
                if (previewDataUrl) {
                    closePreviewPanel();
                    return;
                }
                if (readinessPanelOpen) {
                    setReadinessPanelOpen(false);
                    return;
                }
                if (designCuePatchSet) {
                    cancelDesignCuePatchSet();
                    return;
                }
                if (aiToolResult) {
                    setAiToolResult(null);
                    setNotice("");
                    return;
                }
                if (interactionModeRef.current === "polygon") {
                    cancelPolygonDraft();
                    setInteractionMode("selection");
                    return;
                }
                if (activeObject || selectedIdRef.current) {
                    clearSelection();
                    setInspectorOpen(false);
                    setRightPanelMode("properties");
                    return;
                }
                if (inspectorOpen) {
                    setInspectorOpen(false);
                    setRightPanelMode("properties");
                    return;
                }
                if (!drawerCollapsed) {
                    setDrawerCollapsed(true);
                    setDrawerSearch("");
                }
                return;
            }
            if (!canvas || !fabricApi || targetIsForm) return;
            const pageLocked = Boolean(documentRef.current.pages?.find((page) => page.id === documentRef.current.activePageId)?.locked);
            const activeObjects = activeObject?.type === "activeSelection"
                ? (activeObject as fabric.ActiveSelection).getObjects().filter(isEditableFabricObject)
                : activeObject && isEditableFabricObject(activeObject)
                    ? [activeObject as CreativeFabricObject]
                    : [];
            const selectedSelectionLocked = activeObjects.some((object) => (
                Boolean((object as CreativeFabricObject).locked || (object as CreativeFabricObject).printFrameLocked)
            ));
            const isArrowKey = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key);
            const isMutationShortcut = event.key === "Backspace"
                || event.key === "Delete"
                || (!isMod && !event.altKey && !event.shiftKey && ["c", "l", "q", "r", "t"].includes(key))
                || (isMod && ["a", "c", "d", "g", "s", "v", "x", "y", "z", "[", "]"].includes(key))
                || isArrowKey;
            if (pageLocked && isMutationShortcut) {
                event.preventDefault();
                setNotice("Unlock this page before editing it.");
                return;
            }
            if (interactionModeRef.current === "polygon" && event.key === "Enter") {
                event.preventDefault();
                finishPolygonDraft();
                return;
            }
            if (event.key === " " && !event.repeat && !event.metaKey && !event.ctrlKey && !event.altKey) {
                event.preventDefault();
                spacebarModeRestoreRef.current = interactionModeRef.current;
                setInteractionMode("grab");
                return;
            }
            if (isMod && event.shiftKey && key === "k") {
                event.preventDefault();
                enterReviewMode();
                return;
            }
            if (isMod && event.key === "Enter" && showInternalExportTools) {
                event.preventDefault();
                openPreview();
                return;
            }
            if (isMod && key === "s") {
                event.preventDefault();
                if (onTemplateSave) {
                    void saveTemplate();
                } else if (showInternalExportTools) {
                    void registerAsset();
                }
                return;
            }
            if (isMod && (event.key === "=" || event.key === "+")) {
                event.preventDefault();
                zoomFabricViewport(0.1);
                return;
            }
            if (isMod && (event.key === "-" || event.key === "_")) {
                event.preventDefault();
                zoomFabricViewport(-0.1);
                return;
            }
            if (isMod && key === "0") {
                event.preventDefault();
                if (event.altKey) {
                    centerWorkspaceAtZoom(1);
                } else {
                    fitZoomToStage();
                }
                return;
            }
            if (isMod && (event.key === "'" || event.key === "\"")) {
                event.preventDefault();
                if (event.shiftKey) {
                    setShowSafeArea((current) => !current);
                } else {
                    setShowGrid((current) => !current);
                }
                return;
            }
            if (isMod && !event.shiftKey && event.key === "/") {
                event.preventDefault();
                openSelectionInspector();
                return;
            }
            if (isMod && event.shiftKey && key === "l") {
                event.preventDefault();
                openLayerPanel();
                return;
            }
            if (!isMod && !event.altKey && !event.shiftKey && !event.repeat) {
                if (key === "t") {
                    event.preventDefault();
                    setActiveTool("text");
                    setDrawerSearch("");
                    addTextPreset(TEXT_PRESETS[0]);
                    return;
                }
                if (key === "r") {
                    event.preventDefault();
                    addElement(buildCreativeEditorRectElement());
                    return;
                }
                if (key === "c") {
                    event.preventDefault();
                    addElement(buildCreativeEditorEllipseElement());
                    return;
                }
                if (key === "l") {
                    event.preventDefault();
                    addElement(buildCreativeEditorLineElement());
                    return;
                }
                if (key === "q") {
                    event.preventDefault();
                    addElement(buildCreativeEditorQrElement(qrValue));
                    return;
                }
            }
            if ((event.key === "Backspace" || event.key === "Delete") && activeObject) {
                event.preventDefault();
                const removableObjects = canvas.getActiveObjects()
                    .filter(isEditableFabricObject)
                    .filter((object) => {
                        const creativeObject = object as CreativeFabricObject;
                        return !creativeObject.locked && !creativeObject.printFrameLocked;
                });
                if (!removableObjects.length) {
                    setNotice("Locked or protected layers cannot be deleted.");
                    return;
                }
                removableObjects.forEach((object) => canvas.remove(object));
                canvas.discardActiveObject();
                canvas.requestRenderAll();
                clearFloatingSelectionToolbar();
                syncDocumentFromCanvas(true, "Deleted layer");
                return;
            }
            if (isMod && event.key.toLowerCase() === "a") {
                event.preventDefault();
                const selectableObjects = canvas.getObjects().filter(isEditableFabricObject);
                if (selectableObjects.length) {
                    canvas.discardActiveObject();
                    canvas.setActiveObject(new fabricApi.ActiveSelection(selectableObjects, { canvas }));
                    canvas.requestRenderAll();
                    scheduleFloatingSelectionToolbarRefresh();
                }
                return;
            }
            if (isMod && key === "d" && activeObject) {
                event.preventDefault();
                duplicateSelected();
                return;
            }
            if (isMod && event.key.toLowerCase() === "c" && activeObject) {
                event.preventDefault();
                if (selectedSelectionLocked) {
                    setNotice("Locked or protected layers cannot be copied.");
                    return;
                }
                void activeObject.clone(CREATIVE_EDITOR_FABRIC_ATTRIBUTES)
                    .then((cloned: fabric.FabricObject | fabric.ActiveSelection) => {
                        clipboardRef.current = cloned;
                    })
                    .catch((error) => {
                        showCreativeEditorFailure("creative_editor_copy_failed", error, "Layer could not be copied.");
                    });
                return;
            }
            if (isMod && event.key.toLowerCase() === "v" && clipboardRef.current) {
                event.preventDefault();
                void clipboardRef.current.clone(CREATIVE_EDITOR_FABRIC_ATTRIBUTES)
                    .then((cloned: fabric.FabricObject | fabric.ActiveSelection) => {
                        const clonedObjects = "getObjects" in cloned
                            ? (cloned as fabric.ActiveSelection).getObjects()
                            : [cloned as fabric.FabricObject];
                        if (clonedObjects.some((object) => Boolean((object as CreativeFabricObject).printFrameLocked))) {
                            setNotice("Protected print-frame layers cannot be pasted.");
                            return;
                        }
                        const cloneAsObject = cloned as CreativeFabricObject;
                        cloneAsObject.left = (cloneAsObject.left || 0) + 24;
                        cloneAsObject.top = (cloneAsObject.top || 0) + 24;
                        if (cloned instanceof fabricApi.ActiveSelection) {
                            const objects = cloned.removeAll();
                            objects.forEach((object) => {
                                const editable = object as CreativeFabricObject;
                                editable.id = buildCreativeEditorId("layer");
                                editable.name = `${editable.name || "Layer"} copy`;
                            });
                            canvas.add(...objects);
                            canvas.setActiveObject(new fabricApi.ActiveSelection(objects, { canvas }));
                        } else {
                            cloneAsObject.id = buildCreativeEditorId("layer");
                            cloneAsObject.name = `${cloneAsObject.name || "Layer"} copy`;
                            canvas.add(cloned);
                            canvas.setActiveObject(cloned);
                        }
                        canvas.requestRenderAll();
                        syncDocumentFromCanvas(true, "Pasted layer");
                        scheduleFloatingSelectionToolbarRefresh();
                    })
                    .catch((error) => {
                        showCreativeEditorFailure("creative_editor_paste_failed", error, "Layer could not be pasted.");
                    });
                return;
            }
            if (isMod && key === "g" && activeObject) {
                event.preventDefault();
                if (selectedSelectionLocked) {
                    setNotice("Locked or protected layers cannot be grouped.");
                    return;
                }
                if (event.shiftKey && activeObject.type === "group") {
                    convertGroupToActiveSelection(canvas, fabricApi, activeObject as fabric.Group);
                    canvas.requestRenderAll();
                    syncDocumentFromCanvas(true, "Ungrouped layers");
                    scheduleFloatingSelectionToolbarRefresh();
                } else if (!event.shiftKey && activeObject.type === "activeSelection") {
                    convertActiveSelectionToGroup(canvas, fabricApi, activeObject as fabric.ActiveSelection);
                    canvas.requestRenderAll();
                    syncDocumentFromCanvas(true, "Grouped layers");
                    scheduleFloatingSelectionToolbarRefresh();
                } else {
                    setNotice(event.shiftKey ? "Select a grouped layer first." : "Select more than one layer first.");
                }
                return;
            }
            if (isMod && key === "z") {
                event.preventDefault();
                if (event.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                return;
            }
            if (isMod && key === "y") {
                event.preventDefault();
                redo();
                return;
            }
            if (isMod && ["[", "]"].includes(key) && selectedIdRef.current) {
                event.preventDefault();
                moveLayerById(selectedIdRef.current, key === "]" ? (event.altKey ? "front" : "forward") : (event.altKey ? "back" : "backward"));
                return;
            }
            if (isMod && event.shiftKey && ["h", "v"].includes(key)) {
                event.preventDefault();
                distributeSelection(key === "h" ? "x" : "y");
                return;
            }
            if (event.altKey && event.shiftKey && ["b", "c", "l", "m", "r", "t"].includes(key)) {
                event.preventDefault();
                if (selectedElement && canEditTextElement(selectedElement) && ["c", "l", "r"].includes(key)) {
                    updateSelected({ align: key === "c" ? "center" : key === "l" ? "left" : "right" } as Partial<CreativeEditorElement>);
                    return;
                }
                const alignment: AlignmentAction = key === "l" ? "left"
                    : key === "r" ? "right"
                        : key === "c" ? "centerX"
                            : key === "t" ? "top"
                                : key === "m" ? "centerY"
                                    : "bottom";
                alignSelected(alignment);
                return;
            }
            if (selectedElement && canEditTextElement(selectedElement) && isMod) {
                if (key === "b") {
                    event.preventDefault();
                    const isBold = selectedElement.fontWeight === "bold" || selectedElement.fontWeight === "800" || selectedElement.fontWeight === "700";
                    updateSelected({ fontWeight: isBold ? "normal" : "bold" } as Partial<CreativeEditorElement>);
                    return;
                }
                if (key === "i") {
                    event.preventDefault();
                    updateSelected({ fontStyle: selectedElement.fontStyle === "italic" ? "normal" : "italic" } as Partial<CreativeEditorElement>);
                    return;
                }
                if (key === "u") {
                    event.preventDefault();
                    updateSelected({ underline: !selectedElement.underline } as Partial<CreativeEditorElement>);
                    return;
                }
                if (event.shiftKey && key === "x") {
                    event.preventDefault();
                    updateSelected({ linethrough: !selectedElement.linethrough } as Partial<CreativeEditorElement>);
                    return;
                }
                if (event.shiftKey && (event.key === "." || event.key === ">")) {
                    event.preventDefault();
                    updateSelected({ fontSize: clampNumber((selectedElement.fontSize || 28) + 2, 8, 240) } as Partial<CreativeEditorElement>);
                    return;
                }
                if (event.shiftKey && (event.key === "," || event.key === "<")) {
                    event.preventDefault();
                    updateSelected({ fontSize: clampNumber((selectedElement.fontSize || 28) - 2, 8, 240) } as Partial<CreativeEditorElement>);
                    return;
                }
            }
            if (isArrowKey && activeObject && activeObjects.length) {
                event.preventDefault();
                if (selectedSelectionLocked) {
                    setNotice("Unlock selected layers before editing them.");
                    return;
                }
                const transformTarget = activeObject as fabric.FabricObject;
                const delta = event.shiftKey || event.altKey ? 10 : 1;
                if (isMod) {
                    const width = Math.max(1, transformTarget.getScaledWidth());
                    const height = Math.max(1, transformTarget.getScaledHeight());
                    const nextWidth = clampNumber(width + (event.key === "ArrowLeft" ? -delta : event.key === "ArrowRight" ? delta : 0), 8, 8000);
                    const nextHeight = clampNumber(height + (event.key === "ArrowUp" ? -delta : event.key === "ArrowDown" ? delta : 0), 8, 8000);
                    transformTarget.set({
                        scaleX: (transformTarget.scaleX || 1) * (nextWidth / width),
                        scaleY: (transformTarget.scaleY || 1) * (nextHeight / height),
                    });
                } else {
                    transformTarget.set({
                        left: (transformTarget.left || 0) + (event.key === "ArrowLeft" ? -delta : event.key === "ArrowRight" ? delta : 0),
                        top: (transformTarget.top || 0) + (event.key === "ArrowUp" ? -delta : event.key === "ArrowDown" ? delta : 0),
                    });
                }
                transformTarget.setCoords();
                canvas.requestRenderAll();
                syncDocumentFromCanvas(true, isMod ? "Resized layer" : "Moved layer");
                scheduleFloatingSelectionToolbarRefresh();
                return;
            }
            if (isArrowKey && !activeObject) {
                event.preventDefault();
                const viewport: fabric.TMat2D = canvas.viewportTransform
                    ? [...canvas.viewportTransform] as fabric.TMat2D
                    : [1, 0, 0, 1, 0, 0];
                const delta = event.shiftKey ? 80 : 24;
                viewport[4] += event.key === "ArrowLeft" ? delta : event.key === "ArrowRight" ? -delta : 0;
                viewport[5] += event.key === "ArrowUp" ? delta : event.key === "ArrowDown" ? -delta : 0;
                canvas.setViewportTransform(viewport);
                canvas.requestRenderAll();
                refreshWorkspaceViewportMetrics();
                scheduleFloatingSelectionToolbarRefresh();
            }
        };
        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.key !== " " || !spacebarModeRestoreRef.current || isFormTarget(event.target)) return;
            event.preventDefault();
            setInteractionMode(spacebarModeRestoreRef.current);
            spacebarModeRestoreRef.current = null;
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    });

    const updateDocumentTitle = (title: string) => {
        commitDocument({ ...documentRef.current, title }, true, selectedIdRef.current, false, "Renamed design");
    };

    const addElement = (element: CreativeEditorElement) => {
        if (blockIfActivePageLocked()) return;
        setRightPanelMode("properties");
        setInspectorOpen(true);
        commitDocument({
            ...documentRef.current,
            elements: [...documentRef.current.elements, element],
        }, true, element.id, true, `Added ${element.name}`);
        recordRecentInsertion({
            id: `recent-layer-${element.id}`,
            label: element.name,
            search: `${element.name} ${element.type}`,
        });
        setNotice(`${element.name} added.`);
    };

    const getAiToolDisabledReason = (action: CreativeEditorAiToolAction) => {
        if (action.disabled) return action.disabledReason || "This tool is not active.";
        if (action.requiresSelection && !selectedText) return "Select a text layer first.";
        if (action.requiresImageSelection && selectedElement?.type !== "image") return "Select an image layer first.";
        if (!onAiToolAction) return "This product has not connected AI Tools yet.";
        return "";
    };

    const addTextPreset = (preset: TextPreset) => {
        const baseElement = buildCreativeEditorTextElement(preset.text);
        const scale = getTextTemplateScale(documentRef.current.canvas);
        const element = {
            ...baseElement,
            color: preset.color || baseElement.color,
            fontFamily: preset.fontFamily || documentRef.current.metadata?.brand?.fontFamily || FONT_FAMILY_OPTIONS[0],
            fontSize: Math.max(8, Math.round(preset.fontSize * scale)),
            fontWeight: preset.fontWeight,
            height: Math.round((preset.id === "body" ? 170 : 120) * scale),
            lineHeight: preset.lineHeight,
            name: preset.label,
            shadow: preset.shadow,
            textBackgroundColor: preset.textBackgroundColor,
            width: Math.min(700, Math.max(320, documentRef.current.canvas.width - 180)),
            x: Math.round(documentRef.current.canvas.width * 0.1),
            y: Math.round(documentRef.current.canvas.height * 0.15),
        };
        addElement(element);
    };

    const buildTextTemplateElements = (template: TextTemplateDefinition, canvas = documentRef.current.canvas) => {
        const scale = getTextTemplateScale(canvas);
        const brandFont = documentRef.current.metadata?.brand?.fontFamily || FONT_FAMILY_OPTIONS[0];
        return template.layers.map((layer, index) => {
            const baseElement = buildCreativeEditorTextElement(layer.text);
            return {
                ...baseElement,
                align: layer.align || baseElement.align,
                charSpacing: layer.charSpacing,
                color: layer.color || baseElement.color,
                fontFamily: layer.fontFamily || brandFont,
                fontSize: Math.max(8, Math.round((layer.fontSize || baseElement.fontSize) * scale)),
                fontStyle: layer.fontStyle,
                fontWeight: layer.fontWeight || baseElement.fontWeight,
                height: resolveTemplateMetric(layer.height, canvas.height, baseElement.height * scale, 18),
                lineHeight: layer.lineHeight || baseElement.lineHeight,
                linethrough: false,
                name: layer.name || `${template.label} ${index + 1}`,
                opacity: typeof layer.opacity === "number" ? layer.opacity : baseElement.opacity,
                rotation: layer.rotation,
                shadow: layer.shadow,
                textBackgroundColor: layer.textBackgroundColor,
                underline: layer.underline,
                visible: true,
                width: resolveTemplateMetric(layer.width, canvas.width, baseElement.width * scale, 24),
                x: resolveTemplateMetric(layer.x, canvas.width, canvas.width * 0.1, 0),
                y: resolveTemplateMetric(layer.y, canvas.height, canvas.height * 0.16, 0),
            } as Extract<CreativeEditorElement, { type: "text" }>;
        });
    };

    const addTextTemplate = (template: TextTemplateDefinition) => {
        if (blockIfActivePageLocked()) return;
        const elements = buildTextTemplateElements(template);
        if (!elements.length) return;
        setRightPanelMode("properties");
        setInspectorOpen(true);
        commitDocument({
            ...documentRef.current,
            elements: [...documentRef.current.elements, ...elements],
        }, true, elements[0].id, true, `Added ${template.label}`);
        recordRecentInsertion({
            id: `recent-template-${template.id}-${Date.now().toString(36)}`,
            label: template.label,
            search: `${template.label} text template ${template.category}`,
        });
        setNotice(`${template.label} text template added. Edit or delete each text layer from the canvas or Layers.`);
    };

    const applyCampaignStarter = (action: CampaignStarterAction) => {
        if (blockIfActivePageLocked()) return;
        const current = documentRef.current;
        const canvas = current.canvas;
        const nextElements: CreativeEditorElement[] = [];
        const query = action.templateSearch.toLowerCase();
        const template = TEXT_TEMPLATE_COMBINATIONS.find((item) => (
            getTextTemplateSearch(item).toLowerCase().includes(query)
        )) || TEXT_TEMPLATE_COMBINATIONS.find((item) => (
            query.split(/\s+/).some((term) => getTextTemplateSearch(item).toLowerCase().includes(term))
        ));
        if (template) {
            nextElements.push(...buildTextTemplateElements(template, canvas));
            recordRecentInsertion({
                id: `recent-template-${template.id}-${Date.now().toString(36)}`,
                label: template.label,
                search: `${template.label} text template ${template.category}`,
            });
        }
        if (action.includeQr) {
            const destinationPlaceholder = textPlaceholders.find((placeholder) => CONTACT_PLACEHOLDER_PATTERN.test(`${placeholder.id} ${placeholder.label}`));
            const value = destinationPlaceholder?.value || qrValue;
            const size = Math.round(Math.min(canvas.width, canvas.height) * 0.14);
            nextElements.push({
                ...buildCreativeEditorQrElement(value),
                darkColor: getReadableTextColor(action.backgroundColor),
                errorCorrectionLevel: "H",
                height: size,
                lightColor: "#ffffff",
                margin: 4,
                name: "Customer link QR",
                width: size,
                x: Math.round(canvas.width - size - canvas.width * 0.07),
                y: Math.round(canvas.height - size - canvas.height * 0.07),
            });
        }
        setRightPanelMode("properties");
        setInspectorOpen(Boolean(nextElements.length));
        commitDocument({
            ...current,
            canvas: {
                ...canvas,
                backgroundColor: action.backgroundColor,
                backgroundGradient: undefined,
            },
            elements: [...current.elements, ...nextElements],
        }, true, nextElements[0]?.id || selectedIdRef.current, true, `Added ${action.label} starter`);
        setActiveTool("text");
        setDrawerSearch("");
        setNotice(`${action.label} starter added.`);
    };

    const addPlaceholderText = (placeholder: CreativeEditorTextPlaceholder) => {
        const text = placeholder.value.trim();
        if (!text) return;
        const element = {
            ...buildCreativeEditorTextElement(text),
            fontFamily: documentRef.current.metadata?.brand?.fontFamily || FONT_FAMILY_OPTIONS[0],
            fontSize: text.length > 90 ? 24 : text.length > 42 ? 30 : 38,
            fontWeight: placeholder.id.includes("cta") ? "800" as const : "700" as const,
            height: text.length > 90 ? 210 : 130,
            name: placeholder.label,
            sourceRefs: [{
                label: placeholder.label,
                locked: true,
                productId: documentRef.current.productContext.productId,
                sourceRef: placeholder.sourceRef || placeholder.id,
                value: placeholder.value,
            }],
            width: Math.min(720, Math.max(320, documentRef.current.canvas.width - 180)),
            x: Math.round(documentRef.current.canvas.width * 0.1),
            y: Math.round(documentRef.current.canvas.height * 0.2),
        };
        addElement(element);
    };

    const addAiSuggestionToCanvas = (suggestionValue: CreativeEditorAiToolSuggestion) => {
        const text = suggestionValue.text.trim();
        if (!text) {
            setNotice("Suggestion is empty.");
            return;
        }
        const current = documentRef.current;
        const width = Math.min(680, Math.max(260, current.canvas.width - 180));
        const fontSize = text.length > 220 ? 24 : text.length > 120 ? 30 : 40;
        const element = {
            ...buildCreativeEditorTextElement(text),
            fontSize,
            height: text.length > 220 ? 260 : text.length > 120 ? 210 : 140,
            name: suggestionValue.label,
            sourceRefs: [
                {
                    label: `${productLabel} AI Tools`,
                    locked: true,
                    productId: current.productContext.productId,
                    sourceRef: suggestionValue.id,
                },
            ],
            width,
            x: Math.round((current.canvas.width - width) / 2),
            y: Math.round(Math.max(80, (current.canvas.height - 190) / 2)),
        };
        addElement(element);
    };

    const copyAiSuggestion = async (suggestionValue: CreativeEditorAiToolSuggestion) => {
        try {
            await copyRuntimeTextToClipboard(suggestionValue.text);
            setNotice("Text copied.");
        } catch (error) {
            showCreativeEditorFailure("creative_editor_ai_suggestion_copy_failed", error, "Copy failed.", {
                hasClipboardWrite: hasRuntimeClipboardWrite(),
                hasCopyFallback: hasRuntimeCopyFallback(),
                suggestionId: suggestionValue.id,
                suggestionTextLength: suggestionValue.text.length,
            });
        }
    };

    const runAiToolAction = async (action: CreativeEditorAiToolAction) => {
        const disabledReason = getAiToolDisabledReason(action);
        if (disabledReason) {
            setNotice(disabledReason);
            return;
        }
        if (aiToolOperationRef.current) {
            setNotice("Wait for the current AI tool to finish.");
            return;
        }
        const operationId = operationSequenceRef.current + 1;
        operationSequenceRef.current = operationId;
        aiToolOperationRef.current = operationId;
        setAiToolBusyId(action.id);
        setNotice("");
        try {
            const latestDocument = getLatestDocumentFromCanvas();
            const requestRevision = documentRevisionRef.current;
            const result = await onAiToolAction?.({
                action,
                actionId: action.id,
                document: latestDocument,
                productLabel,
                selectedElement,
                selectedText,
                sourceLabel,
            });
            if (aiToolOperationRef.current !== operationId) return;
            if (documentRevisionRef.current !== requestRevision) {
                setNotice("The design changed while the tool was running. Run it again.");
                return;
            }
            const safeResult = result || {
                findings: [
                    {
                        id: "empty-result",
                        text: "No result was returned.",
                        tone: "warning" as const,
                    },
                ],
                notice: "No result was returned.",
            };
            setAiToolResult({ action, result: safeResult });
            setNotice(safeResult.notice || `${action.label} complete.`);
        } catch (error) {
            if (aiToolOperationRef.current !== operationId) return;
            showCreativeEditorFailure("creative_editor_ai_tool_failed", error, "Tool failed.", {
                actionId: action.id,
            });
            setAiToolResult({
                action,
                result: {
                    findings: [
                        {
                            id: "ai-tool-error",
                            text: "Tool failed.",
                            tone: "warning",
                        },
                    ],
                    notice: "Tool failed.",
                },
            });
        } finally {
            if (aiToolOperationRef.current === operationId) {
                aiToolOperationRef.current = 0;
                setAiToolBusyId("");
            }
        }
    };

    const getDesignCueSelectedContext = (latestDocument: CreativeEditorDocument) => {
        const element = latestDocument.elements.find((item) => item.id === selectedIdRef.current) || null;
        return {
            selectedElement: element,
            selectedText: getTextFromElement(element),
            target: element
                ? { type: "layer" as const, elementId: element.id }
                : { type: "document" as const },
        };
    };

    const runDesignCueRequest = async (
        request: Omit<CreativeEditorDesignCueRequest, "document" | "selectedElement" | "selectedText">,
    ) => {
        if (!onDesignCueRequest) {
            setNotice("Design Cue is not connected for this product surface.");
            return;
        }
        if (designCueOperationRef.current || designCueApplyOperationRef.current) {
            setNotice("Wait for the current Design Cue request to finish.");
            return;
        }
        const operationId = operationSequenceRef.current + 1;
        operationSequenceRef.current = operationId;
        designCueOperationRef.current = operationId;
        setDesignCueBusy(true);
        setNotice("");
        try {
            const latestDocument = getLatestDocumentFromCanvas();
            const requestRevision = documentRevisionRef.current;
            const selectedContext = getDesignCueSelectedContext(latestDocument);
            const patchSet = await onDesignCueRequest({
                ...request,
                document: latestDocument,
                selectedElement: selectedContext.selectedElement,
                selectedText: selectedContext.selectedText,
                target: request.target || selectedContext.target,
            });
            if (designCueOperationRef.current !== operationId) return;
            if (documentRevisionRef.current !== requestRevision) {
                setNotice("The design changed while Design Cue was reviewing it. Try again.");
                return;
            }
            lastDesignCueRequestRef.current = request;
            setDesignCuePatchSet(patchSet);
            setNotice(patchSet.summary || "Design Cue review is ready.");
        } catch (error) {
            if (designCueOperationRef.current !== operationId) return;
            showCreativeEditorFailure("creative_editor_design_cue_failed", error, "Design Cue failed.", {
                commandId: request.commandId,
                source: request.source,
            });
        } finally {
            if (designCueOperationRef.current === operationId) {
                designCueOperationRef.current = 0;
                setDesignCueBusy(false);
            }
        }
    };

    const runDesignCueCommand = (commandId: string) => {
        const latestDocument = getLatestDocumentFromCanvas();
        const selectedContext = getDesignCueSelectedContext(latestDocument);
        void runDesignCueRequest({
            commandId,
            productLabel,
            source: "command_chip",
            sourceLabel,
            target: selectedContext.target,
        });
    };

    const runDesignCueComment = (comment: string) => {
        const latestDocument = getLatestDocumentFromCanvas();
        const selectedContext = getDesignCueSelectedContext(latestDocument);
        void runDesignCueRequest({
            comment,
            productLabel,
            source: selectedContext.selectedElement ? "selected_layer_comment" : "free_text",
            sourceLabel,
            target: selectedContext.target,
        });
    };

    const tryDesignCueAgain = () => {
        const lastRequest = lastDesignCueRequestRef.current;
        if (!lastRequest) {
            setNotice("Ask Design Cue for a change first.");
            return;
        }
        void runDesignCueRequest(lastRequest);
    };

    const applyDesignCuePatchSet = async () => {
        if (!designCuePatchSet) {
            setNotice("No Design Cue change is ready.");
            return;
        }
        if (!onDesignCueApply) {
            setNotice("Design Cue apply is not connected for this product surface.");
            return;
        }
        if (designCueApplyOperationRef.current || designCueOperationRef.current) {
            setNotice("Wait for the current Design Cue change to finish.");
            return;
        }
        const operationId = operationSequenceRef.current + 1;
        operationSequenceRef.current = operationId;
        designCueApplyOperationRef.current = operationId;
        setDesignCueBusy(true);
        setNotice("");
        try {
            const latestDocument = getLatestDocumentFromCanvas();
            const requestRevision = documentRevisionRef.current;
            const requestedPatchSet = designCuePatchSet;
            const result = await onDesignCueApply({
                document: latestDocument,
                patchSet: requestedPatchSet,
            });
            if (designCueApplyOperationRef.current !== operationId) return;
            if (
                documentRevisionRef.current !== requestRevision
                || designCuePatchSet !== requestedPatchSet
            ) {
                setNotice("The design changed before the reviewed change finished. Review it again.");
                return;
            }
            if (result.appliedOperationCount > 0) {
                commitDocument(result.document, true, result.selectedElementId || selectedIdRef.current, true, "Applied Design Cue");
            }
            setDesignCuePatchSet(null);
            setNotice(result.notice || "Design Cue change applied.");
        } catch (error) {
            if (designCueApplyOperationRef.current !== operationId) return;
            showCreativeEditorFailure("creative_editor_design_cue_apply_failed", error, "Design Cue apply failed.");
        } finally {
            if (designCueApplyOperationRef.current === operationId) {
                designCueApplyOperationRef.current = 0;
                setDesignCueBusy(false);
            }
        }
    };

    const cancelDesignCuePatchSet = () => {
        operationSequenceRef.current += 1;
        designCueApplyOperationRef.current = 0;
        setDesignCueBusy(false);
        setDesignCuePatchSet(null);
        setNotice("Design Cue change cancelled.");
    };

    const updateSelected = (patch: Partial<CreativeEditorElement>) => {
        if (blockIfActivePageLocked()) return;
        const current = documentRef.current;
        const element = current.elements.find((item) => item.id === selectedIdRef.current);
        if (!element || element.locked || element.printFrameLocked) return;
        if (!selectedElementPatchHasChanges(element, patch)) return;
        const candidate = {
            ...current,
            elements: current.elements.map((item) => (
                item.id === element.id ? { ...element, ...patch } as CreativeEditorElement : item
            )),
        };
        const validatedCandidate = parseCreativeEditorDocument(candidate);
        if (!validatedCandidate) {
            setNotice("That change contains an invalid value and was not applied.");
            return;
        }
        const nextElement = validatedCandidate.elements.find((item) => item.id === element.id);
        if (!nextElement) return;
        const reloadCanvas = shouldReloadCanvasForSelectedPatch(element, patch);
        const didPatchCanvas = reloadCanvas ? false : applySelectedElementPatchToFabricObject(nextElement); const historyLabel = describeSelectedPatch(element, patch);
        commitDocument(
            validatedCandidate,
            true,
            element.id,
            reloadCanvas || !didPatchCanvas,
            historyLabel,
        ); setNotice(`${historyLabel}.`);
    };

    const updateCanvas = (patch: Partial<CreativeEditorDocument["canvas"]>) => {
        if (blockIfActivePageLocked()) return;
        const current = documentRef.current;
        const nextWidth = patch.width ?? current.canvas.width;
        const nextHeight = patch.height ?? current.canvas.height;
        const scaleX = nextWidth / current.canvas.width;
        const scaleY = nextHeight / current.canvas.height;
        const resized = patch.width || patch.height;
        if (resized && current.metadata?.printFrames?.some((frame) => frame.locked)) {
            setNotice("This print template has protected front/back frames.");
            return;
        }
        const nextElements = resized
            ? current.elements.map((element) => ({
                ...element,
                height: Math.round(element.height * scaleY),
                width: Math.round(element.width * scaleX),
                x: Math.round(element.x * scaleX),
                y: Math.round(element.y * scaleY),
            }) as CreativeEditorElement)
            : current.elements;
        const next = {
            ...current,
            canvas: {
                ...current.canvas,
                ...patch,
            },
            elements: nextElements,
        };
        const canvas = fabricCanvasRef.current;
        const backgroundChanged = Object.prototype.hasOwnProperty.call(patch, "backgroundColor")
            || Object.prototype.hasOwnProperty.call(patch, "backgroundGradient");
        if (canvas && backgroundChanged && !resized) {
            applyCanvasBackground(canvas, next.canvas.backgroundColor, next.canvas.backgroundGradient);
        }
        commitDocument(next, true, selectedIdRef.current, Boolean(resized), describeCanvasPatch(patch));
    };

    const updateBackgroundGradient = (patch: Partial<CreativeEditorLinearGradient> = {}) => {
        const current = documentRef.current.canvas.backgroundGradient || {
            ...DEFAULT_GRADIENT,
            from: documentRef.current.canvas.backgroundColor,
        };
        const nextGradient: CreativeEditorLinearGradient = {
            ...current,
            enabled: true,
            ...patch,
        };
        if (!patch.stops && (patch.from || patch.to)) {
            nextGradient.stops = [
                { color: nextGradient.from, offset: 0 },
                { color: nextGradient.to, offset: 1 },
            ];
        }
        const normalized = {
            ...nextGradient,
            stops: normalizeGradientStops(nextGradient),
        };
        setBackgroundMode("gradient");
        updateCanvas({
            backgroundColor: normalized.from,
            backgroundGradient: normalized,
        });
    };

    const useSolidBackground = () => {
        setBackgroundMode("solid");
        updateCanvas({ backgroundGradient: undefined });
    };

    const applyProjectStyle = (preset: ProjectStylePreset) => {
        if (blockIfActivePageLocked()) return;
        const current = documentRef.current;
        const palette = [preset.accentColor, preset.secondaryColor, preset.mutedColor];
        const nextElements = current.elements.map((element, index) => {
            if (element.locked || element.printFrameLocked) return element;
            const accent = palette[index % palette.length];
            if (canEditTextElement(element)) {
                return {
                    ...element,
                    color: preset.textColor,
                    fontFamily: preset.fontFamily,
                    shadow: element.shadow,
                } as CreativeEditorElement;
            }
            if (canFillElement(element)) {
                return {
                    ...element,
                    fill: element.fill === "transparent" ? element.fill : accent,
                    stroke: element.stroke || preset.secondaryColor,
                } as CreativeEditorElement;
            }
            if (element.type === "line") {
                return {
                    ...element,
                    stroke: accent,
                } as CreativeEditorElement;
            }
            if (element.type === "qr") {
                return {
                    ...element,
                    darkColor: preset.textColor,
                    errorCorrectionLevel: "H",
                    lightColor: "#ffffff",
                    margin: 4,
                } as CreativeEditorElement;
            }
            if (element.type === "image" && element.outlineEnabled) {
                return {
                    ...element,
                    outlineColor: accent,
                } as CreativeEditorElement;
            }
            return element;
        });
        setBackgroundMode("solid");
        commitDocument({
            ...current,
            canvas: {
                ...current.canvas,
                backgroundColor: preset.backgroundColor,
                backgroundGradient: undefined,
            },
            elements: nextElements,
        }, true, selectedIdRef.current, true, `Applied ${preset.label}${preset.label.toLowerCase().endsWith("style") ? "" : " style"}`);
        setNotice(`${preset.label}${preset.label.toLowerCase().endsWith("style") ? "" : " style"} applied.`);
    };

    const applyBrandProjectStyle = () => {
        const brandStyle: ProjectStylePreset = {
            accentColor: brand?.accentColor || "#ffd45d",
            backgroundColor: documentRef.current.canvas.backgroundColor || "#ffffff",
            description: "Uses connected brand colors and font.",
            fontFamily: brand?.fontFamily || FONT_FAMILY_OPTIONS[0],
            id: "brand-current",
            label: "Brand style",
            mutedColor: brand?.secondaryColor || "#4fac96",
            secondaryColor: brand?.secondaryColor || "#24564d",
            textColor: brand?.primaryColor || "#16231f",
        };
        applyProjectStyle(brandStyle);
    };

    const shuffleProjectStyle = () => {
        const nextIndex = (styleShuffleIndex + 1) % PROJECT_STYLE_PRESETS.length;
        setStyleShuffleIndex(nextIndex);
        applyProjectStyle(PROJECT_STYLE_PRESETS[nextIndex]);
    };

    const addQrCode = () => {
        const value = qrValue.trim() || "https://example.com/";
        const size = Math.round(clampNumber(numberInput(qrSize, 164), 96, 520));
        addElement({
            ...buildCreativeEditorQrElement(value),
            darkColor: qrDarkColor,
            errorCorrectionLevel: "H",
            height: size,
            lightColor: "#ffffff",
            margin: 4,
            width: size,
            x: Math.round((documentRef.current.canvas.width - size) / 2),
            y: Math.round((documentRef.current.canvas.height - size) / 2),
        });
    };

    const addQrActionCard = (preset: QrActionPreset = selectedQrActionPreset) => {
        if (blockIfActivePageLocked()) return;
        const current = documentRef.current;
        const canvas = current.canvas;
        const value = qrValue.trim() || "https://example.com/";
        const accentColor = normalizeHexColor(brand?.accentColor || "") || preset.accentColor;
        const backgroundColor = normalizeHexColor(brand?.secondaryColor || "") || preset.backgroundColor;
        const brandTextColor = normalizeHexColor(brand?.primaryColor || "");
        const textColor = brandTextColor && (getContrastRatio(brandTextColor, backgroundColor) || 0) >= 3
            ? brandTextColor
            : getReadableTextColor(backgroundColor);
        const destinationHint = formatQrDestinationHint(value);
        const canvasMin = Math.min(canvas.width, canvas.height);
        const qrSizeForCard = Math.round(clampNumber(numberInput(qrSize, 164), 132, Math.min(420, canvasMin * 0.34)));
        const cardWidth = Math.round(clampNumber(canvas.width * 0.68, Math.min(canvas.width - 72, 430), Math.min(canvas.width - 72, 840)));
        const cardHeight = Math.round(clampNumber(Math.max(qrSizeForCard + 112, canvas.height * 0.28), 300, Math.min(canvas.height - 72, 560)));
        const cardX = Math.round((canvas.width - cardWidth) / 2);
        const cardY = Math.round((canvas.height - cardHeight) / 2);
        const padding = Math.round(clampNumber(cardWidth * 0.07, 24, 52));
        const qrPanelPadding = Math.round(clampNumber(qrSizeForCard * 0.12, 18, 34));
        const qrPanelSize = qrSizeForCard + qrPanelPadding * 2;
        const qrPanelX = Math.round(cardX + cardWidth - padding - qrPanelSize);
        const qrPanelY = Math.round(cardY + (cardHeight - qrPanelSize) / 2);
        const qrX = qrPanelX + qrPanelPadding;
        const qrY = qrPanelY + qrPanelPadding;
        const textX = cardX + padding;
        const textWidth = Math.max(180, qrPanelX - textX - Math.round(padding * 0.75));
        const titleSize = Math.round(clampNumber(canvasMin * 0.052, 28, 58));
        const helperSize = Math.round(clampNumber(titleSize * 0.48, 16, 24));
        const hintSize = Math.round(clampNumber(titleSize * 0.34, 12, 18));
        const headline = buildCreativeEditorTextElement(preset.title);
        const helper = buildCreativeEditorTextElement(preset.helper);
        const hint = buildCreativeEditorTextElement(destinationHint);
        const elements: CreativeEditorElement[] = [
            {
                ...buildCreativeEditorRectElement(backgroundColor),
                height: cardHeight,
                name: `${preset.label} QR card`,
                radius: Math.round(clampNumber(cardWidth * 0.04, 18, 34)),
                stroke: accentColor,
                strokeWidth: Math.max(2, Math.round(canvasMin * 0.003)),
                width: cardWidth,
                x: cardX,
                y: cardY,
            },
            {
                ...buildCreativeEditorRectElement(accentColor),
                height: Math.round(cardHeight * 0.12),
                name: `${preset.label} QR accent`,
                radius: Math.round(cardHeight * 0.06),
                stroke: "transparent",
                strokeWidth: 0,
                width: Math.round(cardWidth * 0.38),
                x: cardX + padding,
                y: cardY + padding,
            },
            {
                ...headline,
                align: "left",
                color: textColor,
                fontFamily: brand?.fontFamily || headline.fontFamily,
                fontSize: titleSize,
                fontWeight: "800",
                height: Math.round(titleSize * 2.2),
                lineHeight: 1.02,
                name: `${preset.label} QR headline`,
                width: textWidth,
                x: textX,
                y: cardY + Math.round(cardHeight * 0.32),
            },
            {
                ...helper,
                color: textColor,
                fontFamily: brand?.fontFamily || helper.fontFamily,
                fontSize: helperSize,
                fontWeight: "600",
                height: Math.round(helperSize * 2.4),
                lineHeight: 1.16,
                name: `${preset.label} QR helper`,
                opacity: 0.8,
                width: textWidth,
                x: textX,
                y: cardY + Math.round(cardHeight * 0.58),
            },
            {
                ...hint,
                color: textColor,
                fontFamily: brand?.fontFamily || hint.fontFamily,
                fontSize: hintSize,
                fontWeight: "700",
                height: Math.round(hintSize * 1.8),
                lineHeight: 1.1,
                name: `${preset.label} QR destination`,
                opacity: 0.68,
                width: textWidth,
                x: textX,
                y: cardY + cardHeight - padding - Math.round(hintSize * 1.8),
            },
            {
                ...buildCreativeEditorRectElement("#ffffff"),
                height: qrPanelSize,
                name: "QR quiet-zone panel",
                radius: Math.round(clampNumber(qrPanelSize * 0.07, 16, 30)),
                stroke: "rgba(22, 35, 31, 0.14)",
                strokeWidth: Math.max(1, Math.round(canvasMin * 0.0015)),
                width: qrPanelSize,
                x: qrPanelX,
                y: qrPanelY,
            },
            {
                ...buildCreativeEditorQrElement(value),
                darkColor: qrDarkColor,
                errorCorrectionLevel: "H",
                height: qrSizeForCard,
                lightColor: "#ffffff",
                margin: 4,
                name: `${preset.label} QR`,
                sourceRefs: [
                    {
                        label: `${preset.label} QR destination`,
                        productId: current.productContext.productId,
                        sourceRef: "creative-editor-qr-action",
                        value,
                    },
                ],
                width: qrSizeForCard,
                x: qrX,
                y: qrY,
            },
        ];
        const selectedQr = elements[elements.length - 1];
        setRightPanelMode("properties");
        setInspectorOpen(true);
        commitDocument({
            ...current,
            elements: [...current.elements, ...elements],
        }, true, selectedQr.id, true, `Added ${preset.label} QR action`);
        recordRecentInsertion({
            id: `recent-qr-action-${preset.id}-${Date.now().toString(36)}`,
            label: `${preset.label} QR action`,
            search: `${preset.label} QR action ${preset.title} ${preset.description}`,
        });
        setNotice(`${preset.label} QR action added.`);
    };

    const addBarcode = () => {
        const value = normalizeBarcodeValue(barcodeValue);
        addElement(buildCreativeEditorImageElement({
            alt: `Barcode for ${value}`,
            fit: "contain",
            height: 170,
            name: "Barcode",
            sourceRefs: [
                {
                    label: "Barcode value",
                    locked: true,
                    productId: documentRef.current.productContext.productId,
                    value,
                },
            ],
            src: buildBarcodeDataUri({
                backgroundColor: barcodeBackgroundColor,
                displayText: barcodeDisplayText,
                lineColor: barcodeLineColor,
                text: barcodeText,
                value,
            }),
            width: 430,
            x: Math.round((documentRef.current.canvas.width - 430) / 2),
            y: Math.round((documentRef.current.canvas.height - 170) / 2),
        }));
    };

    const updateVisibleWatermark = (patch: Partial<CreativeEditorVisibleWatermark>) => {
        const current = documentRef.current;
        const currentWatermark = {
            ...DEFAULT_VISIBLE_WATERMARK,
            text: current.metadata?.brand?.name || productLabel || DEFAULT_VISIBLE_WATERMARK.text,
            ...current.metadata?.visibleWatermark,
        };
        commitDocument({
            ...current,
            metadata: {
                ...current.metadata,
                visibleWatermark: {
                    ...currentWatermark,
                    ...patch,
                },
            },
        }, true, selectedIdRef.current, true, "Changed watermark"); setNotice(typeof patch.enabled === "boolean" ? `Visible watermark ${patch.enabled ? "enabled" : "disabled"}.` : "Visible watermark updated.");
    };

    const removeSelected = () => {
        if (blockIfActivePageLocked()) return;
        const canvas = fabricCanvasRef.current;
        const activeObject = canvas?.getActiveObject();
        if (canvas && activeObject) {
            canvas.getActiveObjects().filter(isEditableFabricObject).forEach((object) => {
                const creativeObject = object as CreativeFabricObject;
                if (!creativeObject.locked && !creativeObject.printFrameLocked) canvas.remove(object);
            });
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            clearFloatingSelectionToolbar();
            syncDocumentFromCanvas(true, "Deleted layer");
            return;
        }
        const element = selectedElement;
        if (!element || element.locked || element.printFrameLocked) return;
        const nextElements = documentRef.current.elements.filter((item) => item.id !== element.id);
        clearFloatingSelectionToolbar();
        commitDocument({ ...documentRef.current, elements: nextElements }, true, nextElements[nextElements.length - 1]?.id || "", true, "Deleted layer");
    };

    const duplicateSelected = () => {
        if (blockIfActivePageLocked()) return;
        const canvas = fabricCanvasRef.current;
        const activeObject = canvas?.getActiveObject();
        if (!canvas || !activeObject || !isEditableFabricObject(activeObject)) return;
        const activeObjects = "getObjects" in activeObject
            ? (activeObject as fabric.ActiveSelection).getObjects()
            : [activeObject];
        if (activeObjects.some((object) => Boolean((object as CreativeFabricObject).locked || (object as CreativeFabricObject).printFrameLocked))) {
            setNotice("Locked or protected layers cannot be duplicated.");
            return;
        }
        void activeObject.clone(CREATIVE_EDITOR_FABRIC_ATTRIBUTES)
            .then((cloned: fabric.FabricObject | fabric.ActiveSelection) => {
                const cloneAsObject = cloned as CreativeFabricObject;
                cloneAsObject.left = (cloneAsObject.left || 0) + 28;
                cloneAsObject.top = (cloneAsObject.top || 0) + 28;
                const fabricApi = fabricApiRef.current;
                if (cloned.type === "activeSelection" && fabricApi) {
                    const objects = (cloned as fabric.ActiveSelection).removeAll();
                    objects.forEach((object) => {
                        const editable = object as CreativeFabricObject;
                        editable.id = buildCreativeEditorId("layer");
                        editable.name = `${editable.name || "Layer"} copy`;
                    });
                    canvas.add(...objects);
                    canvas.setActiveObject(new fabricApi.ActiveSelection(objects, { canvas }));
                } else {
                    cloneAsObject.id = buildCreativeEditorId("layer");
                    cloneAsObject.name = `${cloneAsObject.name || "Layer"} copy`;
                    canvas.add(cloned);
                    canvas.setActiveObject(cloned);
                }
                canvas.requestRenderAll();
                syncDocumentFromCanvas(true, "Duplicated layer");
                scheduleFloatingSelectionToolbarRefresh();
            })
            .catch((error) => {
                showCreativeEditorFailure("creative_editor_duplicate_failed", error, "Layer could not be duplicated.");
            });
    };

    const toggleSelectedLock = () => {
        if (blockIfActivePageLocked()) return;
        const canvas = fabricCanvasRef.current;
        const activeObject = canvas?.getActiveObject() as CreativeFabricObject | undefined;
        if (!canvas || !activeObject || !isEditableFabricObject(activeObject)) return;
        if (activeObject.printFrameLocked) {
            setNotice("This print-frame layer is protected.");
            return;
        }
        const nextLocked = !activeObject.locked;
        setObjectLocked(activeObject, nextLocked);
        canvas.discardActiveObject();
        canvas.setActiveObject(activeObject);
        canvas.requestRenderAll();
        syncDocumentFromCanvas(true, nextLocked ? "Locked layer" : "Unlocked layer");
        scheduleFloatingSelectionToolbarRefresh();
    };

    const moveLayerById = (id: string, action: LayerAction) => {
        if (blockIfActivePageLocked()) return;
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const object = canvas.getObjects().find((item) => (item as CreativeFabricObject).id === id);
        if (!object || !isEditableFabricObject(object)) return;
        const creativeObject = object as CreativeFabricObject;
        if (creativeObject.locked || creativeObject.printFrameLocked) {
            setNotice("Unlock this layer before moving it.");
            return;
        }
        if (action === "front") canvas.bringObjectToFront(object);
        if (action === "forward") canvas.bringObjectForward(object);
        if (action === "backward") canvas.sendObjectBackwards(object);
        if (action === "back") canvas.sendObjectToBack(object);
        keepWorkspaceAtBack(canvas);
        canvas.setActiveObject(object);
        canvas.requestRenderAll();
        syncDocumentFromCanvas(true, "Moved layer");
        scheduleFloatingSelectionToolbarRefresh(); setNotice({ back: "Layer moved to back.", backward: "Layer moved backward.", forward: "Layer moved forward.", front: "Layer moved to front." }[action]);
    };

    const reorderLayerByDrop = (draggedId: string, targetId: string) => {
        if (blockIfActivePageLocked()) return;
        if (!draggedId || !targetId || draggedId === targetId) {
            setDraggedLayerId("");
            return;
        }
        const currentDocument = documentRef.current;
        const fromIndex = currentDocument.elements.findIndex((element) => element.id === draggedId);
        const targetIndex = currentDocument.elements.findIndex((element) => element.id === targetId);
        if (fromIndex < 0 || targetIndex < 0) {
            setDraggedLayerId("");
            return;
        }
        const draggedElement = currentDocument.elements[fromIndex];
        if (draggedElement.locked || draggedElement.printFrameLocked) {
            setNotice("Unlock this layer before reordering it.");
            setDraggedLayerId("");
            return;
        }
        const nextElements = [...currentDocument.elements];
        const [movedElement] = nextElements.splice(fromIndex, 1);
        nextElements.splice(targetIndex, 0, movedElement);
        commitDocument(
            { ...currentDocument, elements: nextElements },
            true,
            draggedId,
            true,
            "Reordered layers",
        );
        setDraggedLayerId("");
    };

    const toggleLayer = (id: string, key: "locked" | "visible") => {
        if (blockIfActivePageLocked()) return;
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const object = canvas.getObjects().find((item) => (item as CreativeFabricObject).id === id) as CreativeFabricObject | undefined;
        if (!object || !isEditableFabricObject(object)) return;
        if (key === "locked") {
            if (object.printFrameLocked) {
                setNotice("This print-frame layer is protected.");
                return;
            }
            setObjectLocked(object, !object.locked);
        } else {
            object.visible = object.visible === false;
        }
        canvas.requestRenderAll();
        syncDocumentFromCanvas(true, key === "locked" ? "Changed layer lock" : "Changed layer visibility");
        scheduleFloatingSelectionToolbarRefresh();
    };

    const selectLayer = (id: string) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) {
            setSelectedId(id);
            return;
        }
        const object = canvas.getObjects().find((item) => (item as CreativeFabricObject).id === id);
        if (!object || !isEditableFabricObject(object)) return;
        canvas.discardActiveObject();
        if ((object as CreativeFabricObject).locked || object.visible === false) {
            setSelectedId(id);
            return;
        }
        canvas.setActiveObject(object);
        canvas.requestRenderAll();
        setSelectedId(id);
        scheduleFloatingSelectionToolbarRefresh();
    };

    const selectLayerFromPanel = (id: string) => {
        selectLayer(id);
        setRightPanelMode("layers");
        setInspectorOpen(true);
    };

    const clearSelection = () => {
        const canvas = fabricCanvasRef.current;
        canvas?.discardActiveObject();
        canvas?.requestRenderAll();
        setSelectedId("");
        clearFloatingSelectionToolbar();
        if (rightPanelModeRef.current === "properties") {
            setInspectorOpen(false);
        }
    };

    const alignSelected = (alignment: AlignmentAction) => {
        if (blockIfActivePageLocked()) return;
        const canvas = fabricCanvasRef.current;
        const activeObject = canvas?.getActiveObject() as CreativeFabricObject | undefined;
        if (!canvas || !activeObject || !isEditableFabricObject(activeObject) || activeObject.locked) return;
        const rect = activeObject.getBoundingRect();
        let targetLeft = rect.left;
        let targetTop = rect.top;
        if (alignment === "left") targetLeft = 0;
        if (alignment === "right") targetLeft = documentRef.current.canvas.width - rect.width;
        if (alignment === "centerX" || alignment === "center") targetLeft = (documentRef.current.canvas.width - rect.width) / 2;
        if (alignment === "top") targetTop = 0;
        if (alignment === "bottom") targetTop = documentRef.current.canvas.height - rect.height;
        if (alignment === "centerY" || alignment === "center") targetTop = (documentRef.current.canvas.height - rect.height) / 2;
        activeObject.set({
            left: (activeObject.left || 0) + targetLeft - rect.left,
            top: (activeObject.top || 0) + targetTop - rect.top,
        });
        activeObject.setCoords();
        canvas.requestRenderAll();
        syncDocumentFromCanvas(true, "Aligned layer");
        scheduleFloatingSelectionToolbarRefresh(); setNotice({ bottom: "Layer aligned bottom.", center: "Layer centered on background.", centerX: "Layer centered horizontally.", centerY: "Layer centered vertically.", left: "Layer aligned left.", right: "Layer aligned right.", top: "Layer aligned top." }[alignment]);
    };

    const distributeSelection = (axis: "x" | "y") => {
        if (blockIfActivePageLocked()) return;
        const canvas = fabricCanvasRef.current;
        const fabricApi = fabricApiRef.current;
        const activeObject = canvas?.getActiveObject();
        if (!canvas || !fabricApi || !activeObject || activeObject.type !== "activeSelection") {
            setNotice("Select at least three layers first.");
            return;
        }
        const objects = (activeObject as fabric.ActiveSelection).getObjects()
            .filter((object) => isEditableFabricObject(object) && !(object as CreativeFabricObject).locked);
        if (objects.length < 3) {
            setNotice("Select at least three unlocked layers first.");
            return;
        }
        const sorted = [...objects].sort((a, b) => {
            const aRect = a.getBoundingRect();
            const bRect = b.getBoundingRect();
            return axis === "x" ? aRect.left - bRect.left : aRect.top - bRect.top;
        });
        const firstRect = sorted[0].getBoundingRect();
        const lastRect = sorted[sorted.length - 1].getBoundingRect();
        const totalSize = sorted.reduce((sum, object) => {
            const rect = object.getBoundingRect();
            return sum + (axis === "x" ? rect.width : rect.height);
        }, 0);
        const span = axis === "x"
            ? (lastRect.left + lastRect.width) - firstRect.left
            : (lastRect.top + lastRect.height) - firstRect.top;
        const gap = (span - totalSize) / (sorted.length - 1);
        let cursor = axis === "x" ? firstRect.left + firstRect.width + gap : firstRect.top + firstRect.height + gap;
        sorted.slice(1, -1).forEach((object) => {
            const rect = object.getBoundingRect();
            if (axis === "x") {
                object.set({ left: (object.left || 0) + cursor - rect.left });
                cursor += rect.width + gap;
            } else {
                object.set({ top: (object.top || 0) + cursor - rect.top });
                cursor += rect.height + gap;
            }
            object.setCoords();
        });
        canvas.requestRenderAll();
        syncDocumentFromCanvas(true, "Distributed layers");
        scheduleFloatingSelectionToolbarRefresh();
        setNotice(axis === "x" ? "Layers spaced evenly across." : "Layers spaced evenly down.");
    };

    const applyTemplate = (templateId: CreativeEditorStarterTemplateId) => {
        if (blockIfActivePageLocked()) return;
        const current = syncActivePageSnapshot(documentRef.current);
        const templateDocument = createCreativeEditorStarterDocument({
            brandName: documentRef.current.metadata?.brand?.name,
            primaryColor: getPrimaryColor(documentRef.current),
            productContext: documentRef.current.productContext,
            templateId,
            title: documentRef.current.title,
        });
        const template = CREATIVE_EDITOR_STARTER_TEMPLATES.find((item) => item.id === templateId);
        const pages = (current.pages || []).map((page) => (
            page.id === current.activePageId
                ? {
                    ...page,
                    canvas: templateDocument.canvas,
                    elements: templateDocument.elements,
                    title: template?.label || page.title,
                    updatedAt: new Date().toISOString(),
                }
                : page
        ));
        commitDocument({
            ...current,
            canvas: templateDocument.canvas,
            elements: templateDocument.elements,
            metadata: {
                ...current.metadata,
                templateId,
            },
            pages,
        }, true, templateDocument.elements[0]?.id || "", true, `Applied ${template?.label || "template"}`);
        setNotice(`Applied ${template?.label || "template"} template.`);
    };
    const startBlankDesign = () => {
        if (blockIfActivePageLocked()) return;
        const createdAt = new Date().toISOString();
        const blankPage: CreativeEditorPage = {
            canvas: documentRef.current.canvas,
            elements: [],
            id: "page_1",
            locked: false,
            title: "Page 1",
            updatedAt: createdAt,
        };
        const next: CreativeEditorDocument = {
            ...documentRef.current,
            activePageId: blankPage.id,
            id: buildCreativeEditorId("cedoc"),
            elements: [],
            metadata: {
                ...documentRef.current.metadata,
                createdAt,
                templateId: "blank",
                updatedAt: createdAt,
            },
            pages: [blankPage],
            title: "Untitled design",
        };
        commitDocument(next, true, "", true, "Started blank design");
        setNotice("New blank design ready.");
    };

    const switchPage = (pageId: string) => {
        if (pageId === documentRef.current.activePageId) return;
        const current = syncActivePageSnapshot(getLatestDocumentFromCanvas());
        const targetPage = current.pages?.find((page) => page.id === pageId);
        if (!targetPage) return;
        const next: CreativeEditorDocument = {
            ...current,
            activePageId: targetPage.id,
            canvas: targetPage.canvas,
            elements: targetPage.elements,
        };
        commitDocument(next, true, targetPage.elements[0]?.id || "", true, `Opened ${targetPage.title}`);
        setBackgroundMode(targetPage.canvas.backgroundGradient?.enabled ? "gradient" : "solid");
        setNotice(`${targetPage.title} selected.`);
    };

    const addPage = () => {
        const current = syncActivePageSnapshot(getLatestDocumentFromCanvas());
        const nextIndex = (current.pages?.length || 0) + 1;
        const createdAt = new Date().toISOString();
        const page: CreativeEditorPage = {
            canvas: {
                ...current.canvas,
            },
            elements: [],
            id: buildCreativeEditorId("page"),
            locked: false,
            title: `Page ${nextIndex}`,
            updatedAt: createdAt,
        };
        commitDocument({
            ...current,
            activePageId: page.id,
            canvas: page.canvas,
            elements: page.elements,
            pages: [...(current.pages || []), page],
        }, true, "", true, `Added ${page.title}`);
        setBackgroundMode(page.canvas.backgroundGradient?.enabled ? "gradient" : "solid");
        setNotice(`${page.title} added.`);
    };

    const duplicateActivePage = () => {
        const current = syncActivePageSnapshot(getLatestDocumentFromCanvas());
        const page = current.pages?.find((item) => item.id === current.activePageId);
        if (!page) return;
        const duplicated: CreativeEditorPage = {
            ...page,
            elements: page.elements.map(cloneElementForPage),
            id: buildCreativeEditorId("page"),
            locked: false,
            title: `${page.title} copy`,
            updatedAt: new Date().toISOString(),
        };
        const pages = [...(current.pages || [])];
        pages.splice(activePageIndex + 1, 0, duplicated);
        commitDocument({
            ...current,
            activePageId: duplicated.id,
            canvas: duplicated.canvas,
            elements: duplicated.elements,
            pages,
        }, true, duplicated.elements[0]?.id || "", true, `Duplicated ${page.title}`);
        setNotice(`${duplicated.title} ready.`);
    };

    const toggleActivePageLock = () => {
        const current = syncActivePageSnapshot(getLatestDocumentFromCanvas());
        const pages = (current.pages || []).map((page) => (
            page.id === current.activePageId ? { ...page, locked: !page.locked } : page
        ));
        const active = pages.find((page) => page.id === current.activePageId);
        commitDocument({
            ...current,
            pages,
        }, true, active?.locked ? "" : selectedIdRef.current, true, active?.locked ? "Locked page" : "Unlocked page");
        setNotice(active?.locked ? "Page locked." : "Page unlocked.");
    };

    const adoptImportedFabricObjects = (canvas: fabric.Canvas) => {
        canvas.getObjects().filter(isEditableFabricObject).forEach((object, index) => {
            const editable = object as CreativeFabricObject;
            editable.id = editable.id || buildCreativeEditorId("layer");
            editable.name = editable.name || `Imported layer ${index + 1}`;
            if (!editable.creativeEditorType) {
                if (object.type === "textbox" || object.type === "i-text" || object.type === "text") editable.creativeEditorType = "text";
                else if (object.type === "rect") editable.creativeEditorType = "rect";
                else if (object.type === "circle" || object.type === "ellipse") editable.creativeEditorType = "ellipse";
                else if (object.type === "triangle") editable.creativeEditorType = "triangle";
                else if (object.type === "line") editable.creativeEditorType = "line";
                else if (object.type === "polygon") editable.creativeEditorType = "polygon";
                else if (object.type === "path") editable.creativeEditorType = "path";
                else if (object.type === "image") editable.creativeEditorType = "image";
            }
            if (editable.creativeEditorType === "image") {
                editable.creativeEditorSrc = editable.creativeEditorSrc
                    || (object as unknown as fabric.FabricImage).getSrc?.()
                    || "";
            }
        });
    };

    const importFabricJson = async (payload: unknown) => {
        const fabricApi = fabricApiRef.current;
        if (!fabricApi || !fabricCanvasRef.current) throw new Error("Canvas is still loading.");
        const requestRevision = documentRevisionRef.current;
        const importCanvasElement = document.createElement("canvas");
        const importCanvas = new fabricApi.Canvas(importCanvasElement, {
            renderOnAddRemove: false,
        });
        importCanvas.setDimensions({
            height: documentRef.current.canvas.height,
            width: documentRef.current.canvas.width,
        });
        try {
            await importCanvas.loadFromJSON(payload as Record<string, unknown>);
            adoptImportedFabricObjects(importCanvas);
            importCanvas.renderAll();
            if (documentRevisionRef.current !== requestRevision) {
                setNotice("The design changed while the file was loading. Import it again.");
                return;
            }
            const next = parseCreativeEditorDocument(serializeFabricCanvasToDocument(importCanvas, {
                ...documentRef.current,
                id: buildCreativeEditorId("cedoc"),
                title: "Imported design",
            }));
            if (!next) {
                setNotice("This Fabric file contains invalid design values.");
                return;
            }
            commitDocument(next, true, next.elements[0]?.id || "", true, "Imported design");
            setNotice("Design imported.");
        } finally {
            importCanvas.dispose();
        }
    };

    const importJsonFile = async (file: File) => {
        if (fileImportInFlightRef.current) {
            setNotice("Wait for the current import to finish.");
            return;
        }
        if (file.size > CREATIVE_EDITOR_JSON_IMPORT_MAX_BYTES) {
            setNotice("Use a JSON design smaller than 5 MB.");
            return;
        }
        fileImportInFlightRef.current = true;
        const startingDocumentRevision = documentRevisionRef.current;
        setNotice("");
        try {
            const text = await readFileAsText(file);
            if (documentRevisionRef.current !== startingDocumentRevision) {
                setNotice("The design changed while the file was loading. Import it again.");
                return;
            }
            const payload = JSON.parse(text) as unknown;
            const parsedDocument = parseCreativeEditorDocument(payload);
            if (parsedDocument) {
                if (importedDocumentHasUnsafeImageSource(parsedDocument)) {
                    setNotice("Imported designs may use PNG, JPG, WebP, or GIF image sources only.");
                    return;
                }
                const next: CreativeEditorDocument = normalizeCreativeEditorDocumentPages({
                    ...parsedDocument,
                    productContext: documentRef.current.productContext,
                    metadata: {
                        ...parsedDocument.metadata,
                        updatedAt: new Date().toISOString(),
                    },
                });
                commitDocument(next, true, next.elements[0]?.id || "", true, "Imported design");
                setNotice("Design imported.");
                return;
            }
            if (payload && typeof payload === "object" && "objects" in payload) {
                if (!isSafeFabricImportPayload(payload)) {
                    setNotice("This Fabric file is too complex or contains an unsafe image source.");
                    return;
                }
                await importFabricJson(payload);
                return;
            }
            setNotice("This JSON file is not an editor design.");
        } catch (error) {
            showCreativeEditorFailure("creative_editor_design_import_failed", error, "Design import failed.");
        } finally {
            fileImportInFlightRef.current = false;
        }
    };

    const importImageFile = async (file: File) => {
        if (file.size > CREATIVE_EDITOR_RASTER_IMPORT_MAX_BYTES) {
            setNotice("Use an image smaller than 1.4 MB.");
            return;
        }
        const startingDocumentId = documentRef.current.id;
        const startingPageId = documentRef.current.activePageId;
        setNotice("");
        try {
            if (!RASTER_IMAGE_MIME_TYPES.has(file.type)) {
                setNotice("Use a PNG, JPG, WebP, or GIF image file.");
                return;
            }
            const dataUrl = await readFileAsDataUrl(file);
            if (!validateMagicBytes(dataUrl, file.type).valid) {
                setNotice("The selected file does not contain a valid raster image.");
                return;
            }
            if (
                documentRef.current.id !== startingDocumentId
                || documentRef.current.activePageId !== startingPageId
            ) {
                setNotice("The page changed while the image was loading. Add it again.");
                return;
            }
            addElement(buildCreativeEditorImageElement({
                name: file.name.replace(/\.[^.]+$/, "") || "Imported image",
                src: dataUrl,
                x: Math.round(documentRef.current.canvas.width * 0.28),
                y: Math.round(documentRef.current.canvas.height * 0.22),
            }));
        } catch (error) {
            showCreativeEditorFailure("creative_editor_image_import_failed", error, "Image import failed.", {
                fileName: file.name,
                fileType: file.type,
            });
        }
    };

    const replaceSelectedImageFile = async (file: File) => {
        if (!allowRasterImports || selectedElement?.type !== "image" || selectedElement.locked) return;
        if (file.size > CREATIVE_EDITOR_RASTER_IMPORT_MAX_BYTES) {
            setNotice("Use an image smaller than 1.4 MB.");
            return;
        }
        const targetElementId = selectedElement.id;
        const startingDocumentId = documentRef.current.id;
        const startingPageId = documentRef.current.activePageId;
        setNotice("");
        try {
            if (!RASTER_IMAGE_MIME_TYPES.has(file.type)) {
                setNotice("Use a PNG, JPG, WebP, or GIF image file.");
                return;
            }
            const dataUrl = await readFileAsDataUrl(file);
            if (!validateMagicBytes(dataUrl, file.type).valid) {
                setNotice("The selected file does not contain a valid raster image.");
                return;
            }
            if (
                documentRef.current.id !== startingDocumentId
                || documentRef.current.activePageId !== startingPageId
                || selectedIdRef.current !== targetElementId
            ) {
                setNotice("The selected image changed while the file was loading. Replace it again.");
                return;
            }
            updateSelected({
                alt: file.name.replace(/\.[^.]+$/, "") || selectedElement.alt,
                name: file.name.replace(/\.[^.]+$/, "") || selectedElement.name,
                src: dataUrl,
            } as Partial<CreativeEditorElement>);
            setNotice("Image replaced.");
        } catch (error) {
            showCreativeEditorFailure("creative_editor_image_replace_failed", error, "Image replace failed.", {
                fileName: file.name,
                fileType: file.type,
            });
        }
    };

    const fillSelectedImageToFrame = () => {
        if (selectedElement?.type !== "image" || selectedLayerReadOnly) return;
        updateSelected({
            fit: "cover",
            height: documentRef.current.canvas.height,
            width: documentRef.current.canvas.width,
            x: 0,
            y: 0,
        } as Partial<CreativeEditorElement>);
    };

    const fitSelectedImageInsideFrame = () => {
        if (selectedElement?.type !== "image" || selectedLayerReadOnly) return;
        const margin = Math.round(Math.min(documentRef.current.canvas.width, documentRef.current.canvas.height) * 0.08);
        const maxWidth = documentRef.current.canvas.width - margin * 2;
        const maxHeight = documentRef.current.canvas.height - margin * 2;
        const scale = Math.min(maxWidth / selectedElement.width, maxHeight / selectedElement.height, 1);
        const width = Math.max(24, Math.round(selectedElement.width * scale));
        const height = Math.max(24, Math.round(selectedElement.height * scale));
        updateSelected({
            fit: "contain",
            height,
            width,
            x: Math.round((documentRef.current.canvas.width - width) / 2),
            y: Math.round((documentRef.current.canvas.height - height) / 2),
        } as Partial<CreativeEditorElement>);
    };

    const makeSelectedImageLarger = () => {
        if (selectedElement?.type !== "image" || selectedLayerReadOnly) return;
        const width = Math.round(selectedElement.width * 1.18);
        const height = Math.round(selectedElement.height * 1.18);
        updateSelected({
            height,
            width,
            x: Math.round(selectedElement.x - (width - selectedElement.width) / 2),
            y: Math.round(selectedElement.y - (height - selectedElement.height) / 2),
        } as Partial<CreativeEditorElement>);
    };

    const sendSelectedImageBehindText = () => {
        if (selectedElement?.type !== "image" || selectedLayerReadOnly) return;
        moveLayerById(selectedElement.id, "back");
        setNotice("Image placed behind text.");
    };

    const handleFileInput = (event: ChangeEvent<HTMLInputElement>, kind: "image" | "json") => {
        const files = Array.from(event.target.files || []);
        event.target.value = "";
        if (!files.length) return;
        if (kind === "json" && !allowDesignImport) return;
        if (kind === "image" && !allowRasterImports) return;
        if (kind === "json") {
            void importJsonFile(files[0]);
            return;
        }
        files.forEach((file) => {
            void importImageFile(file);
        });
    };

    const handleReplaceImageInput = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) void replaceSelectedImageFile(file);
    };

    const restoreAutosaveDraft = () => {
        if (!autosaveDraft) return;
        autosaveReadyRef.current = true;
        commitDocument(
            autosaveDraft,
            true,
            autosaveDraft.elements[0]?.id || "",
            true,
            "Recovered draft",
        );
        setAutosaveDraft(null);
    };

    const dismissAutosaveDraft = () => {
        if (!autosaveKey) {
            autosaveReadyRef.current = true;
            setAutosaveDraft(null);
            return;
        }
        try {
            window.localStorage.removeItem(autosaveKey);
        } catch (error) {
            logCreativeEditorDraftStorageFailure("dismiss", error);
        }
        autosaveReadyRef.current = true;
        setAutosaveDraft(null);
    };

    const applyColor = (color: string) => {
        if (!selectedElement) {
            updateCanvas({ backgroundColor: color });
            return;
        }
        if (selectedElement.locked) return;
        if (canEditTextElement(selectedElement)) {
            updateSelected({ color } as Partial<CreativeEditorElement>);
            return;
        }
        if (canFillElement(selectedElement)) {
            updateSelected({ fill: color } as Partial<CreativeEditorElement>);
            return;
        }
        if (selectedElement.type === "line") {
            updateSelected({ stroke: color } as Partial<CreativeEditorElement>);
            return;
        }
        if (selectedElement.type === "qr") {
            updateSelected({ darkColor: color } as Partial<CreativeEditorElement>);
        } else { setNotice("Select text, a shape, a line, or a QR code before applying a brand color."); }
    };

    const undo = () => {
        if (historyIndexRef.current <= 0) return;
        const undoneLabel = historyLabelsRef.current[historyIndexRef.current] || "last change";
        historyIndexRef.current -= 1;
        documentRevisionRef.current += 1;
        const next = historyRef.current[historyIndexRef.current];
        const nextLabel = historyLabelsRef.current[historyIndexRef.current] || "Opened design";
        documentRef.current = next;
        setDocumentValue(next);
        setSelectedId(next.elements.find((element) => element.id === selectedIdRef.current)?.id || next.elements[0]?.id || "");
        setHistoryLabelState({ current: nextLabel });
        setHistoryState((current) => ({ version: current.version + 1 }));
        void loadDocument(next, selectedIdRef.current);
        setNotice(`Undid ${undoneLabel.toLowerCase()}.`);
    };

    const redo = () => {
        if (historyIndexRef.current >= historyRef.current.length - 1) return;
        historyIndexRef.current += 1;
        documentRevisionRef.current += 1;
        const next = historyRef.current[historyIndexRef.current];
        const nextLabel = historyLabelsRef.current[historyIndexRef.current] || "Changed design";
        documentRef.current = next;
        setDocumentValue(next);
        setSelectedId(next.elements.find((element) => element.id === selectedIdRef.current)?.id || next.elements[0]?.id || "");
        setHistoryLabelState({ current: nextLabel });
        setHistoryState((current) => ({ version: current.version + 1 }));
        void loadDocument(next, selectedIdRef.current);
        setNotice(`Redid ${nextLabel.toLowerCase()}.`);
    };

    const withHiddenWatermark = <T,>(callback: () => T) => {
        const canvas = fabricCanvasRef.current;
        const watermark = canvas?.getObjects().find(isWatermarkObject);
        const previousVisible = watermark?.visible;
        if (watermark) {
            watermark.visible = false;
            canvas?.requestRenderAll();
        }
        try {
            return callback();
        } finally {
            if (watermark) {
                watermark.visible = previousVisible ?? true;
                canvas?.requestRenderAll();
            }
        }
    };

    const getWorkspaceExportBox = (canvas: fabric.Canvas, fallback: CreativeEditorDocument["canvas"]) => {
        const workspace = findWorkspaceObject(canvas);
        return {
            height: Math.max(1, Math.round(workspace?.height || fallback.height)),
            left: Math.round(workspace?.left || 0),
            top: Math.round(workspace?.top || 0),
            width: Math.max(1, Math.round(workspace?.width || fallback.width)),
        };
    };

    const withWorkspaceExportViewport = <T,>(canvas: fabric.Canvas, callback: () => T) => {
        const previousTransform: fabric.TMat2D | null = canvas.viewportTransform
            ? [...canvas.viewportTransform] as fabric.TMat2D
            : null;
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        canvas.renderAll();
        try {
            return callback();
        } finally {
            if (previousTransform) {
                canvas.setViewportTransform(previousTransform);
            }
            canvas.renderAll();
            syncZoomStateFromCanvas();
            refreshWorkspaceViewportMetrics();
            scheduleFloatingSelectionToolbarRefresh();
        }
    };

    const getLatestDocumentFromCanvas = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return documentRef.current;
        releaseActiveGroupForPersistence(canvas);
        const latestDocument = syncActivePageSnapshot(serializeFabricCanvasToDocument(canvas, documentRef.current));
        const validated = parseCreativeEditorDocument(latestDocument);
        if (!validated) {
            setNotice("The canvas produced an invalid value. The last valid design was restored.");
            void loadDocument(documentRef.current, selectedIdRef.current);
            return documentRef.current;
        }
        documentRevisionRef.current += 1;
        documentRef.current = validated;
        setDocumentValue(validated);
        return validated;
    };

    const buildFabricExport = async (type: "png" | "svg"): Promise<CreativeEditorExportResult> => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) throw new Error("Canvas is still loading.");
        const latestDocument = getLatestDocumentFromCanvas();
        const exportBox = getWorkspaceExportBox(canvas, latestDocument.canvas);
        if (type === "svg") {
            const svg = withHiddenWatermark(() => withWorkspaceExportViewport(canvas, () => canvas.toSVG({
                height: String(exportBox.height),
                viewBox: {
                    height: exportBox.height,
                    width: exportBox.width,
                    x: exportBox.left,
                    y: exportBox.top,
                },
                width: String(exportBox.width),
            })));
            const filename = buildCreativeEditorFilename(latestDocument, "svg");
            const href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
            triggerDownload(href, filename);
            return {
                document: latestDocument,
                filename,
                format: "svg",
                mimeType: "image/svg+xml",
                sizeBytes: new Blob([svg]).size,
                svg,
            };
        }
        const dataUrl = withHiddenWatermark(() => withWorkspaceExportViewport(canvas, () => canvas.toDataURL({
            enableRetinaScaling: true,
            format: "png",
            height: exportBox.height,
            left: exportBox.left,
            multiplier: 1,
            quality: 1,
            top: exportBox.top,
            width: exportBox.width,
        })));
        const filename = buildCreativeEditorFilename(latestDocument, "png");
        triggerDownload(dataUrl, filename);
        return {
            dataUrl,
            document: latestDocument,
            filename,
            format: "png",
            mimeType: "image/png",
            sizeBytes: Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75),
        };
    };

    const buildCurrentPngDataUrl = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) throw new Error("Canvas is still loading.");
        const latestDocument = getLatestDocumentFromCanvas();
        const exportBox = getWorkspaceExportBox(canvas, latestDocument.canvas);
        return withHiddenWatermark(() => withWorkspaceExportViewport(canvas, () => canvas.toDataURL({
            enableRetinaScaling: true,
            format: "png",
            height: exportBox.height,
            left: exportBox.left,
            multiplier: 1,
            quality: 1,
            top: exportBox.top,
            width: exportBox.width,
        })));
    };

    const dataUrlToBlob = async (dataUrl: string) => {
        const response = await fetch(dataUrl);
        return response.blob();
    };

    const copyPngToClipboard = async () => {
        if (clipboardOperationRef.current) {
            setNotice("Wait for the current clipboard copy to finish.");
            return;
        }
        const operationId = operationSequenceRef.current + 1;
        operationSequenceRef.current = operationId;
        clipboardOperationRef.current = operationId;
        setNotice("");
        try {
            const dataUrl = buildCurrentPngDataUrl();
            if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
                setNotice("Image clipboard is not available in this browser.");
                return;
            }
            const blob = await dataUrlToBlob(dataUrl);
            await navigator.clipboard.write([new ClipboardItem({ [blob.type || "image/png"]: blob })]);
            if (clipboardOperationRef.current !== operationId) return;
            setNotice("PNG copied to clipboard.");
        } catch (error) {
            if (clipboardOperationRef.current !== operationId) return;
            showCreativeEditorFailure("creative_editor_png_clipboard_copy_failed", error, "Clipboard copy failed.");
        } finally {
            if (clipboardOperationRef.current === operationId) {
                clipboardOperationRef.current = 0;
            }
        }
    };

    const copyBase64ToClipboard = async () => {
        if (clipboardOperationRef.current) {
            setNotice("Wait for the current clipboard copy to finish.");
            return;
        }
        const operationId = operationSequenceRef.current + 1;
        operationSequenceRef.current = operationId;
        clipboardOperationRef.current = operationId;
        setNotice("");
        let dataUrl = "";
        try {
            dataUrl = buildCurrentPngDataUrl();
            await copyRuntimeTextToClipboard(dataUrl);
            if (clipboardOperationRef.current !== operationId) return;
            setNotice("Base64 PNG copied.");
        } catch (error) {
            if (clipboardOperationRef.current !== operationId) return;
            showCreativeEditorFailure("creative_editor_base64_clipboard_copy_failed", error, "Base64 copy failed.", {
                base64TextLength: dataUrl.length,
                hasClipboardWrite: hasRuntimeClipboardWrite(),
                hasCopyFallback: hasRuntimeCopyFallback(),
            });
        } finally {
            if (clipboardOperationRef.current === operationId) {
                clipboardOperationRef.current = 0;
            }
        }
    };

    const buildReadinessIssues = (documentSnapshot: CreativeEditorDocument): ReadinessIssue[] => {
        const visibleElements = documentSnapshot.elements.filter((element) => element.visible !== false);
        const textElements = visibleElements.filter(canEditTextElement);
        const imageElements = visibleElements.filter((element): element is Extract<CreativeEditorElement, { type: "image" }> => element.type === "image");
        const qrElements = visibleElements.filter((element): element is Extract<CreativeEditorElement, { type: "qr" }> => element.type === "qr");
        const issues: ReadinessIssue[] = [];
        if (!visibleElements.length) {
            issues.push({
                detail: "The final export has no visible layer.",
                id: "empty-design",
                label: "Nothing to download",
                tone: "danger",
            });
        }
        if (documentSnapshot.canvas.width < 300 || documentSnapshot.canvas.height < 300) {
            issues.push({
                detail: "Small exports may look soft on social apps and print.",
                id: "small-canvas",
                label: "Canvas is small",
                tone: "warning",
            });
        }
        const safeLeft = Math.round(documentSnapshot.canvas.width * SAFE_AREA_INSET_RATIO);
        const safeTop = Math.round(documentSnapshot.canvas.height * SAFE_AREA_INSET_RATIO);
        const safeRight = Math.round(documentSnapshot.canvas.width * (1 - SAFE_AREA_INSET_RATIO));
        const safeBottom = Math.round(documentSnapshot.canvas.height * (1 - SAFE_AREA_INSET_RATIO));
        textElements.forEach((element) => {
            const text = element.text.trim();
            if (!text) {
                issues.push({
                    actionLabel: "Select",
                    detail: `${element.name} is empty.`,
                    elementId: element.id,
                    id: `empty-text-${element.id}`,
                    label: "Empty text",
                    tone: "warning",
                });
                return;
            }
            const backgroundForContrast = normalizeHexColor(element.textBackgroundColor || "")
                ? element.textBackgroundColor || documentSnapshot.canvas.backgroundColor
                : documentSnapshot.canvas.backgroundColor;
            const contrastRatio = getContrastRatio(element.color, backgroundForContrast);
            if (contrastRatio !== null && contrastRatio < 4.5) {
                issues.push({
                    actionLabel: "Select",
                    detail: `${element.name} may be hard to read.`,
                    elementId: element.id,
                    id: `contrast-${element.id}`,
                    label: "Low text contrast",
                    tone: "warning",
                });
            }
            if (element.fontSize < 22) {
                issues.push({
                    actionLabel: "Select",
                    detail: `${element.name} is small for phones.`,
                    elementId: element.id,
                    id: `small-text-${element.id}`,
                    label: "Small text",
                    tone: "note",
                });
            }
            if (element.x < safeLeft
                || element.y < safeTop
                || element.x + element.width > safeRight
                || element.y + element.height > safeBottom) {
                issues.push({
                    actionLabel: "Select",
                    detail: `${element.name} is close to an edge.`,
                    elementId: element.id,
                    id: `edge-text-${element.id}`,
                    label: "Text near edge",
                    tone: "warning",
                });
            }
        });
        if (textElements.length && !textElements.some((element) => TEXT_ACTION_PATTERN.test(element.text))) {
            const hasPlaceholderCta = textPlaceholders.some((placeholder) => CTA_PLACEHOLDER_PATTERN.test(`${placeholder.id} ${placeholder.label}`));
            issues.push({
                detail: hasPlaceholderCta
                    ? "Add a business call to action before posting."
                    : "Add a clear next step like Order now, Book now, or Call us.",
                id: "missing-action",
                label: "No clear action",
                tone: "note",
            });
        }
        imageElements.forEach((element) => {
            if (!isSafeCurrentImageSource(element.src)) {
                issues.push({
                    actionLabel: "Select",
                    detail: `${element.name} needs a safe image source.`,
                    elementId: element.id,
                    id: `image-source-${element.id}`,
                    label: "Image source issue",
                    tone: "warning",
                });
            }
        });
        qrElements.forEach((element) => {
            if (!element.value.trim()) {
                issues.push({
                    actionLabel: "Select",
                    detail: `${element.name} has no link or text.`,
                    elementId: element.id,
                    id: `qr-empty-${element.id}`,
                    label: "Empty QR code",
                    tone: "danger",
                });
            }
        });
        if (!issues.length) {
            issues.push({
                detail: "Readable text, visible layers, and export size look ready.",
                id: "ready",
                label: "Ready to download",
                tone: "good",
            });
        }
        return issues;
    };

    const getReadinessSignature = (issues: ReadinessIssue[]) => (
        issues
            .filter((issue) => issue.tone !== "good")
            .map((issue) => `${issue.id}:${issue.elementId || ""}:${issue.tone}`)
            .join("|")
    );

    const runReadinessCheck = () => {
        const latestDocument = getLatestDocumentFromCanvas();
        const issues = buildReadinessIssues(latestDocument);
        setReadinessIssues(issues);
        setReadinessPanelOpen(true);
        setRightPanelMode("properties");
        setInspectorOpen(true);
        const actionableCount = issues.filter((issue) => issue.tone !== "good").length;
        setNotice(actionableCount ? `${actionableCount} item${actionableCount === 1 ? "" : "s"} need review.` : "Design is ready to download.");
        return issues;
    };

    const shouldPauseForReadiness = (issues: ReadinessIssue[]) => {
        const signature = getReadinessSignature(issues);
        if (!signature) return false;
        setReadinessIssues(issues);
        setReadinessPanelOpen(true);
        setRightPanelMode("properties");
        setInspectorOpen(true);
        if (lastReadinessSignatureRef.current === signature) return false;
        lastReadinessSignatureRef.current = signature;
        setNotice("Review these items before download. Click Download again to continue.");
        return true;
    };

    const selectReadinessIssue = (issue: ReadinessIssue) => {
        if (!issue.elementId) return;
        selectLayer(issue.elementId);
        setRightPanelMode("properties");
        setInspectorOpen(true);
    };

    const resizePngDataUrl = (dataUrl: string, preset: ExportBundlePreset, backgroundColor: string) => new Promise<string>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const outputCanvas = document.createElement("canvas");
            outputCanvas.width = preset.width;
            outputCanvas.height = preset.height;
            const context = outputCanvas.getContext("2d");
            if (!context) {
                reject(new Error("Could not prepare export."));
                return;
            }
            context.fillStyle = normalizeHexColor(backgroundColor) || "#ffffff";
            context.fillRect(0, 0, preset.width, preset.height);
            const scale = Math.min(preset.width / image.width, preset.height / image.height);
            const width = image.width * scale;
            const height = image.height * scale;
            context.drawImage(image, (preset.width - width) / 2, (preset.height - height) / 2, width, height);
            resolve(outputCanvas.toDataURL("image/png"));
        };
        image.onerror = () => reject(new Error("Could not resize export."));
        image.src = dataUrl;
    });

    const downloadExportBundle = async () => {
        if (exportOperationRef.current) {
            setNotice("Wait for the current export to finish.");
            return;
        }
        const operationId = operationSequenceRef.current + 1;
        operationSequenceRef.current = operationId;
        exportOperationRef.current = operationId;
        setNotice("");
        try {
            const latestDocument = getLatestDocumentFromCanvas();
            const issues = buildReadinessIssues(latestDocument);
            if (shouldPauseForReadiness(issues)) return;
            const sourceDataUrl = buildCurrentPngDataUrl();
            const baseFilename = buildCreativeEditorFilename(latestDocument, "png").replace(/\.png$/i, "");
            await Promise.all(EXPORT_BUNDLE_PRESETS.map(async (preset) => {
                const resized = await resizePngDataUrl(sourceDataUrl, preset, latestDocument.canvas.backgroundColor);
                if (exportOperationRef.current !== operationId) return;
                triggerDownload(resized, `${baseFilename}-${preset.id}-${preset.width}x${preset.height}.png`);
            }));
            if (exportOperationRef.current !== operationId) return;
            setNotice("Export bundle downloaded.");
        } catch (error) {
            if (exportOperationRef.current !== operationId) return;
            showCreativeEditorFailure("creative_editor_export_bundle_failed", error, "Export bundle failed.");
        } finally {
            if (exportOperationRef.current === operationId) {
                exportOperationRef.current = 0;
            }
        }
    };

    const runExport = async (type: CreativeEditorExportFormat) => {
        if (exportOperationRef.current) {
            setNotice("Wait for the current export to finish.");
            return null;
        }
        const operationId = operationSequenceRef.current + 1;
        operationSequenceRef.current = operationId;
        exportOperationRef.current = operationId;
        setNotice("");
        if (disabledExportFormats.includes(type)) {
            setNotice(`${type.toUpperCase()} export is not available for this document.`);
            exportOperationRef.current = 0;
            return null;
        }
        try {
            if (type === "json") {
                const result = await downloadCreativeEditorJson(getLatestDocumentFromCanvas());
                setNotice("Document downloaded.");
                return result;
            }
            const issues = buildReadinessIssues(getLatestDocumentFromCanvas());
            if (shouldPauseForReadiness(issues)) return null;
            const result = await buildFabricExport(type);
            await onExport?.(result);
            if (exportOperationRef.current !== operationId) return null;
            setNotice("Asset downloaded.");
            return result;
        } catch (error) {
            if (exportOperationRef.current !== operationId) return null;
            showCreativeEditorFailure("creative_editor_export_failed", error, "Export failed.", {
                exportType: type,
            });
            return null;
        } finally {
            if (exportOperationRef.current === operationId) {
                exportOperationRef.current = 0;
            }
        }
    };

    const saveTemplate = async () => {
        if (!onTemplateSave) return;
        if (templateSaveOperationRef.current) {
            setNotice("Wait for the current template save to finish.");
            return;
        }
        const operationId = operationSequenceRef.current + 1;
        operationSequenceRef.current = operationId;
        templateSaveOperationRef.current = operationId;
        setNotice("");
        try {
            const latestDocument = getLatestDocumentFromCanvas();
            let previewDataUrl: string | undefined;
            if (templateSavePreview) {
                try {
                    const fullPreviewDataUrl = buildCurrentPngDataUrl();
                    previewDataUrl = fullPreviewDataUrl.length <= TEMPLATE_THUMBNAIL_MAX_DATA_URL_CHARS
                        ? fullPreviewDataUrl
                        : await resizePngDataUrl(fullPreviewDataUrl, TEMPLATE_THUMBNAIL_PRESET, latestDocument.canvas.backgroundColor);
                    if (previewDataUrl.length > TEMPLATE_THUMBNAIL_MAX_DATA_URL_CHARS) previewDataUrl = undefined;
                } catch {
                    previewDataUrl = undefined;
                }
            }
            const result = await onTemplateSave({ document: latestDocument, previewDataUrl });
            if (templateSaveOperationRef.current !== operationId) return;
            setNotice(result && "notice" in result ? result.notice || "Template saved." : "Template saved.");
        } catch (error) {
            if (templateSaveOperationRef.current !== operationId) return;
            showCreativeEditorFailure("creative_editor_template_save_failed", error, "Template save failed.");
        } finally {
            if (templateSaveOperationRef.current === operationId) {
                templateSaveOperationRef.current = 0;
            }
        }
    };

    const registerAsset = async () => {
        if (onTemplateSave) {
            await saveTemplate();
            return;
        }
        const result = await runExport("png");
        if (result) setNotice("Asset saved.");
    };

    const openPreview = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) {
            setNotice("Canvas is still loading.");
            return;
        }
        const latestDocument = getLatestDocumentFromCanvas();
        const exportBox = getWorkspaceExportBox(canvas, latestDocument.canvas);
        const dataUrl = withHiddenWatermark(() => withWorkspaceExportViewport(canvas, () => canvas.toDataURL({
            enableRetinaScaling: true,
            format: "png",
            height: exportBox.height,
            left: exportBox.left,
            multiplier: 1,
            quality: 1,
            top: exportBox.top,
            width: exportBox.width,
        })));
        setPreviewDataUrl(dataUrl);
    };

    const flipSelected = (axis: "x" | "y") => {
        const canvas = fabricCanvasRef.current;
        const activeObject = canvas?.getActiveObject() as CreativeFabricObject | undefined;
        if (!canvas || !activeObject || !isEditableFabricObject(activeObject) || activeObject.locked) return;
        if (axis === "x") activeObject.flipX = !activeObject.flipX;
        if (axis === "y") activeObject.flipY = !activeObject.flipY;
        activeObject.setCoords();
        canvas.requestRenderAll();
        syncDocumentFromCanvas(true, "Flipped layer");
        scheduleFloatingSelectionToolbarRefresh(); setNotice(axis === "x" ? "Layer flipped horizontally." : "Layer flipped vertically.");
    };

    const groupSelection = () => {
        if (blockIfActivePageLocked()) return;
        const canvas = fabricCanvasRef.current;
        const fabricApi = fabricApiRef.current;
        const activeObject = canvas?.getActiveObject();
        if (!canvas || !fabricApi || !activeObject || activeObject.type !== "activeSelection") {
            setNotice("Select more than one layer first.");
            return;
        }
        const objects = (activeObject as fabric.ActiveSelection).getObjects().filter(isEditableFabricObject);
        if (objects.length < 2) {
            setNotice("Select more than one layer first.");
            return;
        }
        if (objects.some((object) => Boolean((object as CreativeFabricObject).locked))) {
            setNotice("Unlock selected layers before grouping.");
            return;
        }
        convertActiveSelectionToGroup(canvas, fabricApi, activeObject as fabric.ActiveSelection);
        canvas.requestRenderAll();
        scheduleFloatingSelectionToolbarRefresh();
        setNotice("Selected layers grouped for this edit.");
    };

    const ungroupSelection = () => {
        if (blockIfActivePageLocked()) return;
        const canvas = fabricCanvasRef.current;
        const fabricApi = fabricApiRef.current;
        const activeObject = canvas?.getActiveObject();
        if (!canvas || !fabricApi || !activeObject || activeObject.type !== "group") {
            setNotice("Select a grouped layer first.");
            return;
        }
        convertGroupToActiveSelection(canvas, fabricApi, activeObject as fabric.Group);
        canvas.requestRenderAll();
        syncDocumentFromCanvas(true, "Ungrouped layers");
        scheduleFloatingSelectionToolbarRefresh();
        setNotice("Group released into editable layers.");
    };

    const addCuratedImage = (asset: { label: string; src: string }) => {
        addElement(buildCreativeEditorImageElement({
            name: asset.label,
            src: asset.src,
            x: Math.round(documentRef.current.canvas.width * 0.31),
            y: Math.round(documentRef.current.canvas.height * 0.22),
        }));
    };

    const renderCuratedGrid = (assets: Array<{ id: string; label: string; src: string }>) => {
        const searchableAssets = activeTool === "graphics" ? [...STICKER_ASSETS, ...assets] : assets;
        const filteredAssets = searchableAssets.filter((asset) => matchesDrawerSearch({
            id: asset.id,
            label: asset.label,
            search: `${asset.label} ${activeTool}`,
        }, drawerSearch));
        const visibleAssets = filteredAssets.slice(0, DRAWER_ITEM_LIMIT);
        const hiddenAssetCount = Math.max(0, filteredAssets.length - visibleAssets.length);
        return (
            <>
                {recentInsertions.length && !drawerSearch ? (
                    <section className={styles.drawerSection}>
                        <h3>Recently used</h3>
                        <div className={styles.recentChipRow}>
                            {recentInsertions.map((item) => (
                                <span key={item.id}>{item.label}</span>
                            ))}
                        </div>
                    </section>
                ) : null}
                {activeTool === "graphics" && !drawerSearch ? (
                    <>
                        <section className={styles.drawerSection}>
                            <div className={styles.drawerSectionHeader}>
                                <h3>Stickers</h3>
                                <span>Local</span>
                            </div>
                            <div className={styles.stickerGrid}>
                                {STICKER_ASSETS.map((asset) => (
                                    <button aria-label={`Add ${asset.label}`} key={asset.id} onClick={() => addCuratedImage(asset)} title={asset.label} type="button">
                                        <img alt="" src={asset.src} />
                                    </button>
                                ))}
                            </div>
                        </section>
                        <section className={styles.drawerSection}>
                            <h3>Popular searches</h3>
                            <div className={styles.popularChipRow}>
                                {["Sale", "New", "Offer", "Callout", "Graphic", "Sticker"].map((label) => (
                                    <button key={label} onClick={() => setDrawerSearch(label.toLowerCase())} type="button">{label}</button>
                                ))}
                            </div>
                        </section>
                    </>
                ) : null}
                <section className={styles.drawerSection}>
                    <h3>{drawerSearch ? "Search results" : "Recommended for you"}</h3>
                    {filteredAssets.length ? (
                        <div className={styles.assetGrid}>
                            {visibleAssets.map((asset) => (
                                <button
                                    aria-label={`Add ${asset.label}`}
                                    key={asset.id}
                                    onClick={() => addCuratedImage(asset)}
                                    type="button"
                                >
                                    <img alt="" src={asset.src} />
                                    <span>{asset.label}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.legacyHelperText}>No matching assets.</p>
                    )}
                    {hiddenAssetCount ? <p className={styles.legacyHelperText}>Showing first {visibleAssets.length}. Search to narrow {hiddenAssetCount} more.</p> : null}
                </section>
            </>
        );
    };

    const renderAiToolResult = () => {
        if (!aiToolResult) return null;
        const suggestions = aiToolResult.result.suggestions || [];
        const findings = aiToolResult.result.findings || [];
        return (
            <div className={styles.aiResultPanel}>
                <div className={styles.aiResultHeader}>
                    <strong>{aiToolResult.action.label}</strong>
                    <span>{aiToolResult.result.notice || "Result ready"}</span>
                </div>
                {suggestions.length ? (
                    <div className={styles.aiSuggestionList}>
                        {suggestions.map((suggestionValue) => (
                            <article className={styles.aiSuggestionCard} key={suggestionValue.id}>
                                <strong>{suggestionValue.label}</strong>
                                <p>{suggestionValue.text}</p>
                                <div>
                                    <button onClick={() => copyAiSuggestion(suggestionValue)} type="button">
                                        <LuCopy size={14} />
                                        Copy
                                    </button>
                                    <button onClick={() => addAiSuggestionToCanvas(suggestionValue)} type="button">
                                        <LuPlus size={14} />
                                        {suggestionValue.actionLabel || "Add text"}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : null}
                {findings.length ? (
                    <div className={styles.aiFindingList}>
                        {findings.map((findingValue) => (
                            <div className={styles.aiFinding} data-tone={findingValue.tone} key={findingValue.id}>
                                <span>{getAiFindingToneLabel(findingValue)}</span>
                                <p>{findingValue.text}</p>
                            </div>
                        ))}
                    </div>
                ) : null}
                {!suggestions.length && !findings.length ? (
                    <p className={styles.legacyHelperText}>No change was suggested.</p>
                ) : null}
            </div>
        );
    };

    const renderAiToolsPanel = () => (
        <div className={styles.aiToolsPanel}>
            <div className={styles.aiToolsIntro}>
                <LuSparkles size={18} />
                <div>
                    <strong>{productLabel} assists, you approve.</strong>
                    <span>Text stays editable. Export/download remains manual.</span>
                </div>
            </div>
            {designCueCommands.length && onDesignCueRequest && onDesignCueApply ? (
                <DesignCuePanel
                    busy={designCueBusy}
                    commands={designCueCommands}
                    hasTextSelection={Boolean(selectedText)}
                    onApply={() => { void applyDesignCuePatchSet(); }}
                    onCancel={cancelDesignCuePatchSet}
                    onRunCommand={runDesignCueCommand}
                    onRunComment={runDesignCueComment}
                    onTryAgain={tryDesignCueAgain}
                    patchSet={designCuePatchSet}
                    selectedLayerName={selectedElement?.name}
                />
            ) : null}
            {renderAiToolResult()}
            {aiToolActions.length ? (
                AI_TOOL_CATEGORY_ORDER.map((category) => {
                    const actions = aiToolActions.filter((action) => action.category === category);
                    if (!actions.length) return null;
                    return (
                        <section className={styles.aiToolGroup} key={category}>
                            <h3>{AI_TOOL_CATEGORY_LABELS[category]}</h3>
                            <div className={styles.aiToolGrid}>
                                {actions.map((action) => {
                                    const Icon = getAiToolIcon(action);
                                    const disabledReason = getAiToolDisabledReason(action);
                                    const busy = aiToolBusyId === action.id;
                                    return (
                                        <button
                                            data-active={aiToolResult?.action.id === action.id ? "true" : "false"}
                                            disabled={Boolean(disabledReason) || Boolean(aiToolBusyId)}
                                            key={action.id}
                                            onClick={() => runAiToolAction(action)}
                                            type="button"
                                        >
                                            <span className={styles.aiToolIcon}>
                                                <Icon size={17} />
                                            </span>
                                            <span>
                                                <strong>{busy ? "Working..." : action.label}</strong>
                                                <small>{action.description}</small>
                                                <em>{disabledReason || action.ownerHint || action.costLabel || "Ready"}</em>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })
            ) : (
                <div className={styles.aiEmptyState}>
                    <LuShieldCheck size={18} />
                    <span>AI Tools are not configured for this product surface.</span>
                </div>
            )}
        </div>
    );

    const renderDrawerContent = () => {
        if (activeTool === "ai") {
            return renderAiToolsPanel();
        }
        if (activeTool === "background") {
            return (
                <>
                    <div className={styles.legacySegmented}>
                        <div
                            className={`${styles.legacySegmentButton} ${styles.legacySegmentStatus}`}
                            data-active="true" data-creative-editor-background-status="color"
                            role="status"
                        >
                            <LuPalette size={17} />
                            Color background
                        </div>
                        <button
                            className={styles.legacySegmentButton}
                            onClick={() => setActiveTool("images")}
                            type="button"
                        >
                            <LuImage size={17} />
                            Add image layer
                        </button>
                    </div>
                    <p className={styles.legacyHelperText}>Choose color type of background</p>
                    <div className={styles.legacyColorModeRow}>
                        <button data-active={backgroundMode === "solid" ? "true" : "false"} onClick={useSolidBackground} type="button">
                            <LuDownload size={14} />
                            Solid
                        </button>
                        <button
                            data-active={backgroundMode === "gradient" ? "true" : "false"}
                            onClick={() => updateBackgroundGradient()}
                            type="button"
                        >
                            <LuMoon size={14} />
                            Gradient
                        </button>
                    </div>
                    <div className={styles.legacyCurrentColor}>
                        <span>Current Color:</span>
                        <label>
                            <input
                                aria-label="Current background color"
                                onChange={(event) => (
                                    backgroundMode === "gradient"
                                        ? updateBackgroundGradient({ from: event.target.value })
                                        : updateCanvas({ backgroundColor: event.target.value })
                                )}
                                type="color"
                                value={documentValue.canvas.backgroundColor}
                            />
                            <span>{documentValue.canvas.backgroundColor.toUpperCase()}</span>
                        </label>
                    </div>
                    <div className={styles.drawerSection}>
                        <div className={styles.drawerSectionHeader}>
                            <h3>Common sizes</h3>
                            <span>{documentValue.canvas.width} x {documentValue.canvas.height}</span>
                        </div>
                        <div className={styles.sizePresetGrid}>
                            {CANVAS_SIZE_PRESETS.map((preset) => {
                                const active = documentValue.canvas.width === preset.width && documentValue.canvas.height === preset.height;
                                return (
                                    <button
                                        data-active={active ? "true" : "false"}
                                        disabled={printFramesLocked}
                                        key={preset.id}
                                        onClick={() => updateCanvas({ height: preset.height, width: preset.width })}
                                        type="button"
                                    >
                                        <span>{preset.label}</span>
                                        <small>{preset.width} x {preset.height} / {preset.description}</small>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {backgroundMode === "gradient" ? (
                        <div className={styles.gradientGrid}>
                            <label>
                                From
                                <input
                                    aria-label="Gradient from color"
                                    onChange={(event) => updateBackgroundGradient({ from: event.target.value })}
                                    type="color"
                                    value={documentValue.canvas.backgroundGradient?.from || documentValue.canvas.backgroundColor}
                                />
                            </label>
                            <label>
                                To
                                <input
                                    aria-label="Gradient to color"
                                    onChange={(event) => updateBackgroundGradient({ to: event.target.value })}
                                    type="color"
                                    value={documentValue.canvas.backgroundGradient?.to || DEFAULT_GRADIENT.to}
                                />
                            </label>
                            <label>
                                Angle
                                <input
                                    max={360}
                                    min={0}
                                    onChange={(event) => updateBackgroundGradient({ angle: numberInput(Number(event.target.value), 90) })}
                                    type="number"
                                    value={documentValue.canvas.backgroundGradient?.angle ?? 90}
                                />
                            </label>
                        </div>
                    ) : null}
                    <div className={styles.legacyPaletteList}>
                        {SOLID_COLORS_LIST.map((group, groupIndex) => (
                            <div className={styles.legacyPaletteGroup} key={`${group.label}-${groupIndex}`}>
                                <strong>{group.label}</strong>
                                <div>
                                    {group.colors.map((color) => (
                                        <button
                                            aria-label={`Set background ${color}`}
                                            className={styles.legacyColorSwatch}
                                            data-active={documentValue.canvas.backgroundColor.toLowerCase() === color.toLowerCase() ? "true" : "false"}
                                            key={color}
                                            onClick={() => (
                                                backgroundMode === "gradient"
                                                    ? updateBackgroundGradient({ from: color })
                                                    : updateCanvas({ backgroundColor: color })
                                            )}
                                            style={{ background: color }}
                                            type="button"
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className={styles.fieldGrid}>
                        <label>
                            Width
                            <input
                                min={120}
                                onChange={(event) => updateCanvas({ width: numberInput(Number(event.target.value), documentValue.canvas.width) })}
                                type="number"
                                value={documentValue.canvas.width}
                            />
                        </label>
                        <label>
                            Height
                            <input
                                min={120}
                                onChange={(event) => updateCanvas({ height: numberInput(Number(event.target.value), documentValue.canvas.height) })}
                                type="number"
                                value={documentValue.canvas.height}
                            />
                        </label>
                    </div>
                </>
            );
        }
        if (activeTool === "images") {
            const filteredAssetSources = assetSources.filter((asset) => matchesDrawerSearch({
                id: asset.id,
                label: asset.label,
                search: `${asset.label} ${asset.type} ${asset.sourceRef || ""}`,
            }, drawerSearch));
            return (
                <>
                    <div className={styles.imageAdder}>
                        <button disabled={!allowRasterImports} onClick={() => imageInputRef.current?.click()} type="button">
                            <LuFileImage size={16} />
                            Upload image file
                        </button>
                        <input
                            aria-label="Image URL"
                            disabled={!allowRasterImports}
                            onChange={(event) => setImageUrl(event.target.value)}
                            placeholder="https://image..."
                            value={imageUrl}
                        />
                        <button
                            disabled={!allowRasterImports || !imageUrl.trim()}
                            onClick={() => {
                                const safeImageUrl = normalizeOwnerImageUrl(imageUrl);
                                if (!safeImageUrl) {
                                    setNotice("Use a direct PNG, JPG, WebP, GIF, or approved Asset Library image URL.");
                                    return;
                                }
                                addElement(buildCreativeEditorImageElement({ src: safeImageUrl }));
                                setImageUrl("");
                            }}
                            type="button"
                        >
                            <LuImage size={16} />
                            Add image
                        </button>
                        <p className={styles.legacyHelperText}>Use PNG, JPG, WebP, GIF, or approved Asset Library images. Pasted SVG code is not imported for safety.</p>
                    </div>
                    {recentInsertions.length && !drawerSearch ? (
                        <section className={styles.drawerSection}>
                            <h3>Recently used</h3>
                            <div className={styles.recentChipRow}>
                                {recentInsertions.map((item) => <span key={item.id}>{item.label}</span>)}
                            </div>
                        </section>
                    ) : null}
                    {allowRasterImports && filteredAssetSources.length ? (
                        <section className={styles.drawerSection}>
                            <h3>{drawerSearch ? "Search results" : "Approved assets"}</h3>
                            <div className={styles.assetSourceList}>
                                {filteredAssetSources.slice(0, 12).map((asset) => (
                                    <button
                                        key={asset.id}
                                        onClick={() => addElement(buildCreativeEditorImageElement({ name: asset.label, src: asset.url }))}
                                        type="button"
                                    >
                                        <LuImage size={15} />
                                        <span>{asset.label}</span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    ) : allowRasterImports && drawerSearch ? (
                        <p className={styles.legacyHelperText}>No approved image matched the search.</p>
                    ) : null}
                </>
            );
        }
        if (activeTool === "text") {
            const filteredPresets = TEXT_PRESETS.filter((preset) => matchesDrawerSearch({
                id: preset.id,
                label: preset.label,
                search: `${preset.label} ${preset.text}`,
            }, drawerSearch));
            const filteredTextTemplates = TEXT_TEMPLATE_COMBINATIONS.filter((template) => matchesDrawerSearch({
                description: template.description,
                id: template.id,
                label: template.label,
                search: `${getTextTemplateSearch(template)} font combination text effect ready made template`,
            }, drawerSearch));
            const visibleTextTemplates = filteredTextTemplates.slice(0, DRAWER_ITEM_LIMIT);
            const hiddenTextTemplateCount = Math.max(0, filteredTextTemplates.length - visibleTextTemplates.length);
            const filteredPlaceholders = textPlaceholders.filter((placeholder) => matchesDrawerSearch({
                id: placeholder.id,
                label: placeholder.label,
                search: `${placeholder.label} ${placeholder.value}`,
            }, drawerSearch));
            return (
                <>
                    <button className={styles.textPrimaryAction} onClick={() => addTextPreset(TEXT_PRESETS[0])} type="button">
                        <LuType size={22} />
                        Add a text box
                    </button>
                    <section className={styles.drawerSection}>
                        <div className={styles.drawerSectionHeader}>
                            <h3>Brand Kit</h3>
                            <button onClick={() => setActiveTool("brandKit")} type="button">Edit</button>
                        </div>
                        <button
                            className={styles.brandFontAction}
                            onClick={() => setActiveTool("brandKit")}
                            type="button"
                        >
                            Add your brand fonts
                        </button>
                    </section>
                    <section className={styles.drawerSection}>
                        <h3>Default text styles</h3>
                        <div className={styles.textPresetList}>
                            {filteredPresets.map((preset) => (
                                <button key={preset.id} onClick={() => addTextPreset(preset)} type="button">
                                    <span style={{ fontSize: Math.min(28, Math.max(16, preset.fontSize * 0.45)) }}>{preset.text}</span>
                                    <small>{preset.label}</small>
                                </button>
                            ))}
                            {!filteredPresets.length ? <p className={styles.legacyHelperText}>No matching text style.</p> : null}
                        </div>
                    </section>
                    <section className={styles.drawerSection}>
                        <h3>Business text</h3>
                        {filteredPlaceholders.length ? (
                            <div className={styles.placeholderList}>
                                {filteredPlaceholders.map((placeholder) => (
                                    <button key={placeholder.id} onClick={() => addPlaceholderText(placeholder)} type="button">
                                        <strong>{placeholder.label}</strong>
                                        <span>{placeholder.value}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.legacyHelperText}>No business text matched the search.</p>
                        )}
                    </section>
                    {!drawerSearch || filteredTextTemplates.length ? (
                        <section className={styles.drawerSection}>
                            <div className={styles.drawerSectionHeader}>
                                <h3>{drawerSearch ? "Text template results" : "Ready-made text templates"}</h3>
                                <span>{filteredTextTemplates.length}</span>
                            </div>
                            <div className={styles.textTemplateGrid}>
                                {visibleTextTemplates.map((template) => (
                                    <button
                                        aria-label={`Add ${template.label} text template`}
                                        key={template.id}
                                        onClick={() => addTextTemplate(template)}
                                        title={template.label}
                                        type="button"
                                    >
                                        {renderTextTemplatePreview(template)}
                                    </button>
                                ))}
                            </div>
                            {hiddenTextTemplateCount ? <p className={styles.legacyHelperText}>Showing first {visibleTextTemplates.length}. Search to narrow {hiddenTextTemplateCount} more.</p> : null}
                        </section>
                    ) : null}
                    <div className={styles.drawerActionGrid}>
                        <button onClick={() => addElement(buildCreativeEditorPathTextElement("Curved text"))} type="button">
                            <LuPencil size={18} />
                            Path text
                        </button>
                    </div>
                </>
            );
        }
        if (activeTool === "styles") {
            const filteredProjectStyles = PROJECT_STYLE_PRESETS.filter((preset) => matchesDrawerSearch({
                description: preset.description,
                id: preset.id,
                label: preset.label,
                search: `${preset.label} ${preset.description} ${preset.backgroundColor} ${preset.accentColor}`,
            }, drawerSearch));
            const filteredTextTemplates = TEXT_TEMPLATE_COMBINATIONS.filter((template) => matchesDrawerSearch({
                description: template.description,
                id: template.id,
                label: template.label,
                search: `${getTextTemplateSearch(template)} font combination style text effect`,
            }, drawerSearch));
            return (
                <>
                    <section className={styles.drawerSection}>
                        <div className={styles.drawerSectionHeader}>
                            <h3>Project style</h3>
                            <button onClick={shuffleProjectStyle} type="button">
                                <LuShuffle size={15} />
                                Shuffle
                            </button>
                        </div>
                        <div className={styles.projectStyleCard}>
                            <div className={styles.styleSwatchRow}>
                                <span style={{ background: documentValue.canvas.backgroundColor }} />
                                <span style={{ background: primaryColor }} />
                                <span style={{ background: brand?.secondaryColor || "#4fac96" }} />
                                <span style={{ background: brand?.accentColor || "#ffd45d" }} />
                            </div>
                            <strong>{brand?.name || productLabel}</strong>
                            <p>Apply a ready campaign look without rebuilding the design.</p>
                        </div>
                        <div className={styles.styleQuickActions}>
                            <button onClick={applyBrandProjectStyle} type="button">
                                <LuPalette size={16} />
                                Apply brand style
                            </button>
                            <button onClick={shuffleProjectStyle} type="button">
                                <LuShuffle size={16} />
                                Shuffle style
                            </button>
                        </div>
                    </section>
                    <section className={styles.drawerSection}>
                        <h3>{drawerSearch ? "Style results" : "Ready-made styles"}</h3>
                        {filteredProjectStyles.length ? (
                            <div className={styles.stylePresetGrid}>
                                {filteredProjectStyles.map((preset) => (
                                    <button
                                        className={styles.stylePresetButton}
                                        key={preset.id}
                                        onClick={() => applyProjectStyle(preset)}
                                        type="button"
                                    >
                                        <span className={styles.styleSwatchRow}>
                                            <span style={{ background: preset.backgroundColor }} />
                                            <span style={{ background: preset.textColor }} />
                                            <span style={{ background: preset.accentColor }} />
                                            <span style={{ background: preset.secondaryColor }} />
                                        </span>
                                        <strong>{preset.label}</strong>
                                        <small>{preset.description}</small>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.legacyHelperText}>No matching style.</p>
                        )}
                    </section>
                    {!drawerSearch || filteredTextTemplates.length ? (
                        <section className={styles.drawerSection}>
                            <div className={styles.drawerSectionHeader}>
                                <h3>{drawerSearch ? "Font combination results" : "Text combinations"}</h3>
                                <span>{filteredTextTemplates.length}</span>
                            </div>
                            <div className={styles.textTemplateGrid}>
                                {filteredTextTemplates.slice(0, 12).map((template) => (
                                    <button
                                        aria-label={`Add ${template.label} text template`}
                                        key={template.id}
                                        onClick={() => addTextTemplate(template)}
                                        title={template.label}
                                        type="button"
                                    >
                                        {renderTextTemplatePreview(template)}
                                    </button>
                                ))}
                            </div>
                        </section>
                    ) : null}
                </>
            );
        }
        if (activeTool === "shapes") {
            const shapeActions = [
                { id: "rect", label: "Rectangle", search: "rectangle square box", icon: <LuSquare size={18} />, run: () => addElement(buildCreativeEditorRectElement(primaryColor)) },
                { id: "circle", label: "Circle", search: "circle ellipse round", icon: <LuCircle size={18} />, run: () => addElement(buildCreativeEditorEllipseElement(primaryColor)) },
                { id: "triangle", label: "Triangle", search: "triangle", icon: <LuTriangle size={18} />, run: () => addElement(buildCreativeEditorTriangleElement(primaryColor)) },
                { id: "line", label: "Line", search: "line stroke", icon: <LuPencil size={18} />, run: () => addElement(buildCreativeEditorLineElement(primaryColor)) },
                { id: "arrow", label: "Arrow", search: "arrow", icon: <LuArrowRight size={18} />, run: () => addElement(buildCreativeEditorArrowElement(primaryColor, "arrow")) },
                { id: "thin-arrow", label: "Thin arrow", search: "thin arrow", icon: <LuArrowRight size={18} />, run: () => addElement(buildCreativeEditorArrowElement(primaryColor, "thin-tail-arrow")) },
                { id: "draw-polygon", label: "Draw polygon", search: "draw polygon custom shape", icon: <LuPencil size={18} />, run: () => setInteractionMode("polygon") },
                { id: "hexagon", label: "Hexagon", search: "hexagon polygon", icon: <LuHexagon size={18} />, run: () => addElement(buildCreativeEditorHexagonElement(primaryColor)) },
                { id: "pentagon", label: "Pentagon", search: "pentagon polygon", icon: <LuShapes size={18} />, run: () => addElement(buildCreativeEditorPentagonElement(primaryColor)) },
                { id: "star", label: "Star", search: "star", icon: <LuStar size={18} />, run: () => addElement(buildCreativeEditorStarElement(primaryColor)) },
                { id: "egg", label: "Egg", search: "egg oval organic", icon: <LuCircle size={18} />, run: () => addElement(buildCreativeEditorEggElement(primaryColor)) },
            ].filter((item) => matchesDrawerSearch(item, drawerSearch));
            return (
                <div className={styles.drawerActionGrid}>
                    {shapeActions.map((action) => (
                        <button key={action.id} onClick={action.run} type="button">
                            {action.icon}
                            {action.label}
                        </button>
                    ))}
                    {!shapeActions.length ? <p className={styles.legacyHelperText}>No matching tools.</p> : null}
                </div>
            );
        }
        if (activeTool === "qr") {
            return (
                <div className={styles.barcodePanel}>
                    <div className={styles.qrPreviewCard} style={{ background: selectedQrActionPreset.backgroundColor }}>
                        <span className={styles.qrPreviewBadge} style={{ background: selectedQrActionPreset.accentColor }}>
                            {selectedQrActionPreset.label}
                        </span>
                        <LuQrCode color={qrDarkColor} size={72} />
                        <strong>{selectedQrActionPreset.title}</strong>
                        <small>{formatQrDestinationHint(qrValue)}</small>
                    </div>
                    <div className={styles.drawerSection}>
                        <div className={styles.drawerSectionHeader}>
                            <span>Action styles</span>
                            <small>Scan-safe</small>
                        </div>
                        <div className={styles.qrActionGrid}>
                            {QR_ACTION_PRESETS.map((preset) => (
                                <button
                                    data-active={preset.id === selectedQrActionPresetId ? "true" : "false"}
                                    key={preset.id}
                                    onClick={() => setSelectedQrActionPresetId(preset.id)}
                                    type="button"
                                >
                                    <span style={{ background: preset.accentColor }}>
                                        <LuQrCode size={15} />
                                    </span>
                                    <strong>{preset.label}</strong>
                                    <small>{preset.description}</small>
                                </button>
                            ))}
                        </div>
                    </div>
                    <label>
                        Link or text
                        <textarea
                            onChange={(event) => setQrValue(event.target.value)}
                            placeholder="https://example.com/"
                            value={qrValue}
                        />
                    </label>
                    <div className={styles.gradientGrid}>
                        <label>
                            QR color
                            <input
                                aria-label="QR foreground color"
                                onChange={(event) => setQrDarkColor(event.target.value)}
                                type="color"
                                value={qrDarkColor}
                            />
                        </label>
                    </div>
                    <p className={styles.legacyHelperText}>QR scan panel stays white for reliable printing.</p>
                    <label>
                        Size
                        <input
                            max={520}
                            min={96}
                            onChange={(event) => setQrSize(numberInput(Number(event.target.value), qrSize))}
                            type="number"
                            value={qrSize}
                        />
                    </label>
                    <div className={styles.drawerActionGrid}>
                        <button disabled={!qrValue.trim()} onClick={() => addQrActionCard(selectedQrActionPreset)} type="button">
                            <LuSparkles size={18} />
                            Add action card
                        </button>
                        <button disabled={!qrValue.trim()} onClick={addQrCode} type="button">
                            <LuQrCode size={18} />
                            Add plain QR
                        </button>
                    </div>
                </div>
            );
        }
        if (activeTool === "barcode") {
            const barcodePreview = buildBarcodeDataUri({
                backgroundColor: barcodeBackgroundColor,
                displayText: barcodeDisplayText,
                lineColor: barcodeLineColor,
                text: barcodeText,
                value: barcodeValue,
            });
            return (
                <div className={styles.barcodePanel}>
                    <div className={styles.barcodePreview}>
                        <img alt="Barcode preview" src={barcodePreview} />
                    </div>
                    <label>
                        Value
                        <input
                            onChange={(event) => setBarcodeValue(event.target.value)}
                            placeholder="https://example.com/"
                            value={barcodeValue}
                        />
                    </label>
                    <label>
                        Text
                        <input
                            onChange={(event) => setBarcodeText(event.target.value)}
                            placeholder={productLabel}
                            value={barcodeText}
                        />
                    </label>
                    <div className={styles.gradientGrid}>
                        <label>
                            Background
                            <input
                                aria-label="Barcode background color"
                                onChange={(event) => setBarcodeBackgroundColor(event.target.value)}
                                type="color"
                                value={barcodeBackgroundColor}
                            />
                        </label>
                        <label>
                            Bars
                            <input
                                aria-label="Barcode bar color"
                                onChange={(event) => setBarcodeLineColor(event.target.value)}
                                type="color"
                                value={barcodeLineColor}
                            />
                        </label>
                    </div>
                    <label className={styles.legacyCheckboxField}>
                        <input
                            checked={barcodeDisplayText}
                            onChange={(event) => setBarcodeDisplayText(event.target.checked)}
                            type="checkbox"
                        />
                        Display text
                    </label>
                    <div className={styles.drawerActionGrid}>
                        <button disabled={!barcodeValue.trim()} onClick={addBarcode} type="button">
                            <LuFileJson size={18} />
                            Add barcode
                        </button>
                    </div>
                </div>
            );
        }
        if (activeTool === "myStuff") {
            const filteredAssetSources = assetSources.filter((asset) => matchesDrawerSearch({
                id: asset.id,
                label: asset.label,
                search: `${asset.label} ${asset.type} ${asset.sourceRef || ""} asset upload`,
            }, drawerSearch));
            return (
                <>
                    <section className={styles.drawerSection}>
                        <div className={styles.uploadDropCard}>
                            <LuUploadCloud size={26} />
                            <strong>Upload image file</strong>
                            <span>PNG, JPG, WebP, or GIF. SVG markup stays blocked.</span>
                            <button disabled={!allowRasterImports} onClick={() => imageInputRef.current?.click()} type="button">
                                <LuFileImage size={16} />
                                Choose file
                            </button>
                        </div>
                    </section>
                    <section className={styles.drawerSection}>
                        <h3>Recent</h3>
                        {recentInsertions.length ? (
                            <div className={styles.recentChipRow}>
                                {recentInsertions.map((item) => <span key={item.id}>{item.label}</span>)}
                            </div>
                        ) : (
                            <p className={styles.legacyHelperText}>Recent uploads and inserted assets appear here during this editing session.</p>
                        )}
                    </section>
                    <section className={styles.drawerSection}>
                        <h3>{drawerSearch ? "Asset results" : "Approved assets"}</h3>
                        {filteredAssetSources.length ? (
                            <div className={styles.assetSourceList}>
                                {filteredAssetSources.slice(0, 12).map((asset) => (
                                    <button
                                        key={asset.id}
                                        onClick={() => addElement(buildCreativeEditorImageElement({ name: asset.label, src: asset.url }))}
                                        type="button"
                                    >
                                        <LuImage size={15} />
                                        <span>{asset.label}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.legacyHelperText}>No approved assets matched the search.</p>
                        )}
                    </section>
                </>
            );
        }
        if (activeTool === "brandKit") {
            const filteredBrandColors = brandColorItems.filter((item) => matchesDrawerSearch({
                id: item.id,
                label: item.label,
                search: `${item.label} ${item.value}`,
            }, drawerSearch));
            const filteredBrandLogos = brandLogoAssets.filter((asset) => matchesDrawerSearch({
                id: asset.id,
                label: asset.label,
                search: `${asset.label} logo brand`,
            }, drawerSearch));
            return (
                <>
                    <section className={styles.drawerSection}>
                        <h3>Brand colors</h3>
                        {filteredBrandColors.length ? (
                            <div className={styles.brandColorGrid}>
                                {filteredBrandColors.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => applyColor(item.value)}
                                        style={{ background: item.value }}
                                        title={`Apply ${item.label}`}
                                        type="button"
                                    >
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.legacyHelperText}>No brand colors matched the search.</p>
                        )}
                    </section>
                    <section className={styles.drawerSection}>
                        <h3>Brand assets</h3>
                        {filteredBrandLogos.length ? (
                            <div className={styles.assetSourceList}>
                                {filteredBrandLogos.map((asset) => (
                                    <button
                                        key={asset.id}
                                        onClick={() => addElement(buildCreativeEditorImageElement({
                                            name: asset.label,
                                            src: asset.url,
                                            x: Math.round(documentRef.current.canvas.width * 0.72),
                                            y: Math.round(documentRef.current.canvas.height * 0.08),
                                        }))}
                                        type="button"
                                    >
                                        <LuImage size={15} />
                                        <span>{asset.label}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.legacyHelperText}>No brand logos connected.</p>
                        )}
                    </section>
                    <section className={styles.drawerSection}>
                        <h3>Brand text</h3>
                        <div className={styles.drawerActionGrid}>
                            <button
                                disabled={!brand?.name}
                                onClick={() => brand?.name && addPlaceholderText({
                                    id: "brand-name",
                                    label: "Business name",
                                    sourceRef: "document_brand",
                                    value: brand.name,
                                })}
                                type="button"
                            >
                                <LuType size={18} />
                                Add business name
                            </button>
                            <button
                                disabled={!selectedElement || !canEditTextElement(selectedElement)}
                                onClick={() => selectedElement && canEditTextElement(selectedElement) && updateSelected({ fontFamily: brand?.fontFamily || FONT_FAMILY_OPTIONS[0] } as Partial<CreativeEditorElement>)}
                                type="button"
                            >
                                <LuPalette size={18} />
                                Apply brand font
                            </button>
                        </div>
                    </section>
                </>
            );
        }
        if (activeTool === "templates") {
            const filteredTemplates = CREATIVE_EDITOR_STARTER_TEMPLATES.filter((template) => matchesDrawerSearch({
                description: template.description,
                id: template.id,
                label: template.label,
                search: `${template.label} ${template.description} ${template.width} ${template.height}`,
            }, drawerSearch));
            return (
                <>
                    {!drawerSearch ? (
                        <section className={styles.drawerSection}>
                            <div className={styles.drawerSectionHeader}>
                                <h3>Start from goal</h3>
                                <span>SMB</span>
                            </div>
                            <div className={styles.campaignStarterGrid}>
                                {CAMPAIGN_STARTER_ACTIONS.map((action) => (
                                    <button key={action.id} onClick={() => applyCampaignStarter(action)} type="button">
                                        <strong>{action.label}</strong>
                                        <span>{action.description}</span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    ) : null}
                    <section className={styles.drawerSection}>
                        <h3>{drawerSearch ? "Search results" : "Starter templates"}</h3>
                        {filteredTemplates.length ? (
                            <div className={styles.templateGrid}>
                                {filteredTemplates.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => applyTemplate(template.id)}
                                        type="button"
                                    >
                                        <span className={styles.templateCardHeader}>
                                            <strong>{template.label}</strong>
                                            <span>{template.width} x {template.height}</span>
                                        </span>
                                        <small>{template.description}</small>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.legacyHelperText}>No matching templates.</p>
                        )}
                    </section>
                </>
            );
        }
        if (activeTool === "graphics") return renderCuratedGrid(GRAPHIC_ASSETS);
        if (activeTool === "characters") return renderCuratedGrid(CHARACTER_ASSETS);
        return renderCuratedGrid(CURATED_ASSETS);
    };

    const selectedStrokeColor = canStrokeElement(selectedElement) ? selectedElement.stroke || "#000000" : "#000000";
    const selectedStrokeWidth = canStrokeElement(selectedElement) ? selectedElement.strokeWidth || 0 : 0;
    const selectedStrokeStyle = canStrokeElement(selectedElement) ? selectedElement.strokeStyle || "solid" : "solid";
    const selectedStrokeLineCap = canStrokeElement(selectedElement) ? selectedElement.strokeLineCap || "round" : "round";
    const selectedColor = canEditTextElement(selectedElement)
        ? selectedElement.color
        : canFillElement(selectedElement)
            ? selectedElement.fill
            : selectedElement?.type === "line"
                ? selectedElement.stroke
                : selectedElement?.type === "qr"
                    ? selectedElement.darkColor || "#16231f"
                    : documentValue.canvas.backgroundColor;
    const selectedColorValue = selectedColor || "#000000";
    const selectedShadow = selectedElement?.shadow || {
        blur: selectedElement?.blur || 0,
        color: "rgba(0,0,0,0.22)",
        offsetX: 0,
        offsetY: 0,
    };
    const selectedImageFilter: CreativeEditorImageFilter = selectedElement?.type === "image"
        ? selectedElement.filter || "none"
        : "none";
    const selectedImageAdjustments: CreativeEditorImageFilterAdjustments = selectedElement?.type === "image"
        ? selectedElement.filterAdjustments || {}
        : {};
    const selectedGradient: CreativeEditorLinearGradient = canGradientElement(selectedElement)
        ? selectedElement.gradient || DEFAULT_GRADIENT
        : DEFAULT_GRADIENT;
    const selectedGradientStops = normalizeGradientStops(selectedGradient);
    const visibleWatermark: CreativeEditorVisibleWatermark = {
        ...DEFAULT_VISIBLE_WATERMARK,
        text: documentValue.metadata?.brand?.name || productLabel || DEFAULT_VISIBLE_WATERMARK.text,
        ...documentValue.metadata?.visibleWatermark,
    };
    const updateSelectedShadow = (patch: Partial<typeof selectedShadow>) => {
        const nextShadow = { ...selectedShadow, ...patch };
        updateSelected({
            blur: nextShadow.blur,
            shadow: nextShadow,
        } as Partial<CreativeEditorElement>);
    };
    const updateSelectedGradient = (patch: Partial<CreativeEditorLinearGradient>) => {
        if (!canGradientElement(selectedElement)) return;
        const next = {
            ...selectedGradient,
            ...patch,
        };
        if ((patch.from || patch.to) && !patch.stops) {
            const existingStops = normalizeGradientStops(selectedGradient);
            next.stops = existingStops.map((stop, index) => {
                if (index === 0) return { ...stop, color: next.from };
                if (index === existingStops.length - 1) return { ...stop, color: next.to };
                return stop;
            });
        }
        updateSelected({
            gradient: next,
        } as Partial<CreativeEditorElement>);
    };
    const updateGradientStop = (index: number, patch: Partial<CreativeEditorGradientStop>) => {
        if (!canGradientElement(selectedElement)) return;
        const stops = selectedGradientStops.map((stop, currentIndex) => (
            currentIndex === index ? { ...stop, ...patch } : stop
        ));
        const normalized = normalizeGradientStops({ ...selectedGradient, stops });
        updateSelectedGradient({
            from: normalized[0]?.color || selectedGradient.from,
            stops: normalized,
            to: normalized[normalized.length - 1]?.color || selectedGradient.to,
        });
    };
    const addGradientStop = () => {
        if (!canGradientElement(selectedElement)) return;
        const stops = normalizeGradientStops({
            ...selectedGradient,
            stops: [
                ...selectedGradientStops,
                { color: "#ffffff", offset: 0.5 },
            ],
        });
        updateSelectedGradient({
            from: stops[0]?.color || selectedGradient.from,
            stops,
            to: stops[stops.length - 1]?.color || selectedGradient.to,
        });
    };
    const removeGradientStop = (index: number) => {
        if (selectedGradientStops.length <= 2) return;
        const stops = normalizeGradientStops({
            ...selectedGradient,
            stops: selectedGradientStops.filter((_, currentIndex) => currentIndex !== index),
        });
        updateSelectedGradient({
            from: stops[0]?.color || selectedGradient.from,
            stops,
            to: stops[stops.length - 1]?.color || selectedGradient.to,
        });
    };
    const updateImageAdjustment = (
        key: keyof CreativeEditorImageFilterAdjustments,
        value: CreativeEditorImageFilterAdjustments[keyof CreativeEditorImageFilterAdjustments],
    ) => {
        updateSelected({
            filterAdjustments: {
                ...selectedImageAdjustments,
                [key]: value,
            },
        } as Partial<CreativeEditorElement>);
    };

    const openSelectionInspector = () => {
        setRightPanelMode("properties");
        setInspectorOpen(true);
    };

    const openLayerPanel = () => {
        if (rightPanelModeState === "layers" && inspectorOpen) {
            setInspectorOpen(false);
            return;
        }
        setRightPanelMode("layers");
        setInspectorOpen(true);
    };

    const openSelectionAiTools = () => {
        setActiveTool("ai");
        setDrawerCollapsed(false);
    };

    const enterReviewMode = () => {
        const nextReviewMode = !reviewMode;
        setReviewMode(nextReviewMode);
        if (nextReviewMode) {
            setDrawerCollapsed(true);
            setRightPanelMode("properties");
            setInspectorOpen(true);
            runReadinessCheck();
            window.requestAnimationFrame(() => fitZoomToStage());
        } else {
            setReadinessPanelOpen(false);
            window.requestAnimationFrame(() => fitZoomToStage());
        }
    };

    const renderContextualSelectionToolbar = () => {
        const selectedIsLocked = selectedLayerReadOnly;
        const isMultiSelection = isActiveMultiSelection;
        if (!selectedElement && !isMultiSelection && !isGroupedSelection) return null;

        if (isGroupedSelection) {
            return (
                <div aria-label="Selected group properties" className={styles.contextualToolbar} onMouseDown={(event) => event.stopPropagation()} role="toolbar">
                    <button disabled={!canUngroupActiveSelection} onClick={ungroupSelection} type="button">
                        <LuUngroup size={16} />
                        Ungroup
                    </button>
                    <button onClick={openSelectionInspector} type="button">
                        <LuLayers size={16} />
                        Position
                    </button>
                </div>
            );
        }

        if (isMultiSelection) {
            return (
                <div aria-label="Selected layers properties" className={styles.contextualToolbar} onMouseDown={(event) => event.stopPropagation()} role="toolbar">
                    <button disabled={!canGroupActiveSelection} onClick={groupSelection} type="button">
                        <LuGroup size={16} />
                        Group
                    </button>
                    <button disabled={!canDistributeActiveSelection} onClick={() => distributeSelection("x")} type="button">
                        <LuAlignHorizontalJustifyCenter size={16} />
                        Distribute X
                    </button>
                    <button disabled={!canDistributeActiveSelection} onClick={() => distributeSelection("y")} type="button">
                        <LuAlignCenterVertical size={16} />
                        Distribute Y
                    </button>
                    <span className={styles.toolbarDivider} />
                    <button disabled={activePageLocked || Boolean(floatingSelectionToolbar?.locked)} onClick={duplicateSelected} type="button">
                        <LuCopy size={16} />
                        Duplicate
                    </button>
                    <button disabled={activePageLocked} onClick={openSelectionInspector} type="button">
                        <LuLayers size={16} />
                        Position
                    </button>
                    <button disabled={activePageLocked || Boolean(floatingSelectionToolbar?.locked)} onClick={removeSelected} type="button">
                        <LuTrash2 size={16} />
                    </button>
                </div>
            );
        }

        if (!selectedElement) return null;

        if (canEditTextElement(selectedElement)) {
            return (
                <div aria-label="Selected text properties" className={styles.contextualToolbar} onMouseDown={(event) => event.stopPropagation()} role="toolbar">
                    <select
                        aria-label="Font family"
                        disabled={selectedIsLocked}
                        onChange={(event) => updateSelected({ fontFamily: event.target.value } as Partial<CreativeEditorElement>)}
                        value={selectedElement.fontFamily || FONT_FAMILY_OPTIONS[0]}
                    >
                        {FONT_FAMILY_OPTIONS.map((fontFamily) => (
                            <option key={fontFamily} value={fontFamily}>{fontFamily.split(",")[0]}</option>
                        ))}
                    </select>
                    <div className={styles.sizeStepper}>
                        <button disabled={selectedIsLocked} onClick={() => updateSelected({ fontSize: Math.max(8, selectedElement.fontSize - 2) } as Partial<CreativeEditorElement>)} type="button">
                            -
                        </button>
                        <input
                            aria-label="Font size"
                            disabled={selectedIsLocked}
                            min={8}
                            onChange={(event) => updateSelected({ fontSize: numberInput(Number(event.target.value), selectedElement.fontSize) } as Partial<CreativeEditorElement>)}
                            type="number"
                            value={selectedElement.fontSize}
                        />
                        <button disabled={selectedIsLocked} onClick={() => updateSelected({ fontSize: selectedElement.fontSize + 2 } as Partial<CreativeEditorElement>)} type="button">
                            +
                        </button>
                    </div>
                    <label className={styles.toolbarSwatch} title="Text color">
                        <span style={{ background: selectedColorValue }} />
                        <input
                            aria-label="Text color"
                            disabled={selectedIsLocked}
                            onChange={(event) => applyColor(event.target.value)}
                            type="color"
                            value={selectedColorValue}
                        />
                    </label>
                    <span className={styles.toolbarDivider} />
                    <button aria-label="Bold" aria-pressed={selectedElement.fontWeight === "bold" || selectedElement.fontWeight === "800"} data-active={selectedElement.fontWeight === "bold" || selectedElement.fontWeight === "800" ? "true" : "false"} disabled={selectedIsLocked} onClick={() => updateSelected({ fontWeight: selectedElement.fontWeight === "bold" || selectedElement.fontWeight === "800" ? "normal" : "800" } as Partial<CreativeEditorElement>)} type="button">
                        <LuBold size={16} />
                    </button>
                    <button aria-label="Italic" aria-pressed={selectedElement.fontStyle === "italic"} data-active={selectedElement.fontStyle === "italic" ? "true" : "false"} disabled={selectedIsLocked} onClick={() => updateSelected({ fontStyle: selectedElement.fontStyle === "italic" ? "normal" : "italic" } as Partial<CreativeEditorElement>)} type="button">
                        <LuItalic size={16} />
                    </button>
                    <button aria-label="Underline" aria-pressed={Boolean(selectedElement.underline)} data-active={selectedElement.underline ? "true" : "false"} disabled={selectedIsLocked} onClick={() => updateSelected({ underline: !selectedElement.underline } as Partial<CreativeEditorElement>)} type="button">
                        <LuUnderline size={16} />
                    </button>
                    <button aria-label="Strikethrough" aria-pressed={Boolean(selectedElement.linethrough)} data-active={selectedElement.linethrough ? "true" : "false"} disabled={selectedIsLocked} onClick={() => updateSelected({ linethrough: !selectedElement.linethrough } as Partial<CreativeEditorElement>)} type="button">
                        <LuStrikethrough size={16} />
                    </button>
                    <span className={styles.toolbarDivider} />
                    <button data-active={(selectedElement.align || "left") === "left" ? "true" : "false"} disabled={selectedIsLocked} onClick={() => updateSelected({ align: "left" } as Partial<CreativeEditorElement>)} type="button">
                        Left
                    </button>
                    <button data-active={selectedElement.align === "center" ? "true" : "false"} disabled={selectedIsLocked} onClick={() => updateSelected({ align: "center" } as Partial<CreativeEditorElement>)} type="button">
                        Center
                    </button>
                    <button data-active={selectedElement.align === "right" ? "true" : "false"} disabled={selectedIsLocked} onClick={() => updateSelected({ align: "right" } as Partial<CreativeEditorElement>)} type="button">
                        Right
                    </button>
                    <span className={styles.toolbarDivider} />
                    <label className={styles.toolbarRange}>
                        <span>Opacity</span>
                        <input
                            disabled={selectedIsLocked}
                            max={1}
                            min={0.1}
                            onChange={(event) => updateSelected({ opacity: Number(event.target.value) } as Partial<CreativeEditorElement>)}
                            step={0.05}
                            type="range"
                            value={selectedElement.opacity ?? 1}
                        />
                    </label>
                    <button onClick={openSelectionInspector} type="button">Effects</button>
                    <button onClick={openSelectionInspector} type="button">Position</button>
                </div>
            );
        }

        if (selectedElement.type === "image") {
            return (
                <div aria-label="Selected image properties" className={styles.contextualToolbar} onMouseDown={(event) => event.stopPropagation()} role="toolbar">
                    <button disabled={selectedIsLocked} onClick={() => replaceImageInputRef.current?.click()} type="button">
                        <LuFileImage size={16} />
                        Replace
                    </button>
                    <select
                        aria-label="Image filter"
                        disabled={selectedIsLocked}
                        onChange={(event) => updateSelected({ filter: event.target.value as CreativeEditorImageFilter } as Partial<CreativeEditorElement>)}
                        value={selectedImageFilter}
                    >
                        {IMAGE_FILTER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <button disabled={selectedIsLocked} onClick={() => updateSelected({ fit: selectedElement.fit === "contain" ? "cover" : "contain" } as Partial<CreativeEditorElement>)} type="button">
                        {selectedElement.fit === "contain" ? "Crop" : "Fit"}
                    </button>
                    <button disabled={selectedIsLocked} onClick={() => flipSelected("x")} type="button">
                        <LuFlipHorizontal2 size={16} />
                        Flip
                    </button>
                    <label className={styles.toolbarRange}>
                        <span>Opacity</span>
                        <input
                            disabled={selectedIsLocked}
                            max={1}
                            min={0.1}
                            onChange={(event) => updateSelected({ opacity: Number(event.target.value) } as Partial<CreativeEditorElement>)}
                            step={0.05}
                            type="range"
                            value={selectedElement.opacity ?? 1}
                        />
                    </label>
                    <button onClick={openSelectionInspector} type="button">Style</button>
                    <button onClick={openSelectionInspector} type="button">Position</button>
                </div>
            );
        }

        return (
            <div aria-label="Selected layer properties" className={styles.contextualToolbar} onMouseDown={(event) => event.stopPropagation()} role="toolbar">
                <button onClick={openSelectionInspector} type="button">Edit</button>
                <label className={styles.toolbarSwatch} title="Layer color">
                    <span style={{ background: selectedColorValue }} />
                    <input
                        aria-label="Layer color"
                        disabled={selectedIsLocked}
                        onChange={(event) => applyColor(event.target.value)}
                        type="color"
                        value={selectedColorValue}
                    />
                </label>
                {canStrokeElement(selectedElement) ? (
                    <>
                        <select
                            aria-label="Stroke style"
                            disabled={selectedIsLocked}
                            onChange={(event) => updateSelected({ strokeStyle: event.target.value as CreativeEditorStrokeStyle } as Partial<CreativeEditorElement>)}
                            value={selectedStrokeStyle}
                        >
                            {STROKE_STYLE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <label className={styles.toolbarRange}>
                            <span>Stroke</span>
                            <input
                                disabled={selectedIsLocked}
                                max={36}
                                min={0}
                                onChange={(event) => updateSelected({ strokeWidth: Number(event.target.value) } as Partial<CreativeEditorElement>)}
                                type="range"
                                value={selectedStrokeWidth}
                            />
                        </label>
                    </>
                ) : null}
                <button disabled={selectedIsLocked} onClick={() => flipSelected("x")} type="button">
                    <LuFlipHorizontal2 size={16} />
                    Flip
                </button>
                <label className={styles.toolbarRange}>
                    <span>Opacity</span>
                    <input
                        disabled={selectedIsLocked}
                        max={1}
                        min={0.1}
                        onChange={(event) => updateSelected({ opacity: Number(event.target.value) } as Partial<CreativeEditorElement>)}
                        step={0.05}
                        type="range"
                        value={selectedElement.opacity ?? 1}
                    />
                </label>
                <button onClick={openSelectionInspector} type="button">Style</button>
                <button onClick={openSelectionInspector} type="button">Position</button>
            </div>
        );
    };

    const renderPriorityInspectorSection = () => {
        if (!selectedElement) return null;
        const selectedIsLocked = selectedLayerReadOnly;
        const designCueAvailable = Boolean(designCueCommands.length && onDesignCueRequest && onDesignCueApply);
        const canUseQuickColor = canEditTextElement(selectedElement)
            || canFillElement(selectedElement)
            || selectedElement.type === "line"
            || selectedElement.type === "qr";

        const renderPriorityHeader = (label: string) => (
            <div className={styles.priorityHeader}>
                <h3>{label}</h3>
                {designCueAvailable ? (
                    <button onClick={openSelectionAiTools} type="button">
                        <LuSparkles size={15} />
                        Ask Design Cue
                    </button>
                ) : null}
            </div>
        );

        const renderPositionControls = () => (
            <div className={styles.fieldGrid}>
                <label>
                    X
                    <input disabled={selectedIsLocked} onChange={(event) => updateSelected({ x: Number(event.target.value) })} type="number" value={Math.round(selectedElement.x)} />
                </label>
                <label>
                    Y
                    <input disabled={selectedIsLocked} onChange={(event) => updateSelected({ y: Number(event.target.value) })} type="number" value={Math.round(selectedElement.y)} />
                </label>
                <label>
                    W
                    <input disabled={selectedIsLocked} min={4} onChange={(event) => updateSelected({ width: Number(event.target.value) })} type="number" value={Math.round(selectedElement.width)} />
                </label>
                <label>
                    H
                    <input disabled={selectedIsLocked} min={4} onChange={(event) => updateSelected({ height: Number(event.target.value) })} type="number" value={Math.round(selectedElement.height)} />
                </label>
            </div>
        );

        const renderOpacityControl = () => (
            <label className={styles.rangeField}>
                <span>Opacity</span>
                <input
                    disabled={selectedIsLocked}
                    max={1}
                    min={0.1}
                    onChange={(event) => updateSelected({ opacity: Number(event.target.value) })}
                    step={0.05}
                    type="range"
                    value={selectedElement.opacity ?? 1}
                />
            </label>
        );

        const renderQuickColorControls = () => {
            if (!canUseQuickColor) return null;
            return (
                <>
                    <label className={styles.priorityColorField}>
                        Color
                        <input
                            disabled={selectedIsLocked}
                            onChange={(event) => applyColor(event.target.value)}
                            type="color"
                            value={selectedColorValue}
                        />
                    </label>
                    <div className={styles.prioritySwatchRow}>
                        {COLOR_SWATCHES.slice(0, 8).map((color) => (
                            <button
                                aria-label={`Apply ${color}`}
                                data-active={selectedColor === color ? "true" : "false"}
                                disabled={selectedIsLocked}
                                key={color}
                                onClick={() => applyColor(color)}
                                style={{ background: color }}
                                type="button"
                            />
                        ))}
                    </div>
                </>
            );
        };

        if (canEditTextElement(selectedElement)) {
            const textValue = selectedElement.text.trim();
            const wordCount = textValue ? textValue.split(/\s+/).length : 0;
            const textBackgroundColor = normalizeHexColor(selectedElement.textBackgroundColor || "")
                ? selectedElement.textBackgroundColor || documentValue.canvas.backgroundColor
                : documentValue.canvas.backgroundColor;
            const contrastRatio = getContrastRatio(selectedElement.color, textBackgroundColor);
            const safeLeft = Math.round(documentValue.canvas.width * SAFE_AREA_INSET_RATIO);
            const safeTop = Math.round(documentValue.canvas.height * SAFE_AREA_INSET_RATIO);
            const safeRight = Math.round(documentValue.canvas.width * (1 - SAFE_AREA_INSET_RATIO));
            const safeBottom = Math.round(documentValue.canvas.height * (1 - SAFE_AREA_INSET_RATIO));
            const outsideSafeArea = selectedElement.x < safeLeft
                || selectedElement.y < safeTop
                || selectedElement.x + selectedElement.width > safeRight
                || selectedElement.y + selectedElement.height > safeBottom;
            const ctaPlaceholder = textPlaceholders.find((placeholder) => (
                CTA_PLACEHOLDER_PATTERN.test(`${placeholder.id} ${placeholder.label}`)
            ));
            const contactPlaceholder = textPlaceholders.find((placeholder) => (
                CONTACT_PLACEHOLDER_PATTERN.test(`${placeholder.id} ${placeholder.label}`)
                && !CTA_PLACEHOLDER_PATTERN.test(`${placeholder.id} ${placeholder.label}`)
            ));
            const ctaLine = ctaPlaceholder?.value.trim() || "Order now";
            const contactLine = contactPlaceholder?.value.trim() || "";
            const hasActionText = TEXT_ACTION_PATTERN.test(textValue);
            const appendTextLine = (line: string, layerName: string) => {
                const cleanLine = line.trim();
                if (!cleanLine) return;
                const currentText = selectedElement.text.trim();
                const nextText = currentText.toLowerCase().includes(cleanLine.toLowerCase())
                    ? currentText
                    : [currentText, cleanLine].filter(Boolean).join("\n");
                updateSelected({
                    height: Math.max(selectedElement.height, selectedElement.height + 42),
                    name: layerName,
                    text: nextText,
                } as Partial<CreativeEditorElement>);
            };
            const makeTextReadable = () => {
                const backgroundForContrast = normalizeHexColor(selectedElement.textBackgroundColor || "")
                    ? selectedElement.textBackgroundColor || documentValue.canvas.backgroundColor
                    : documentValue.canvas.backgroundColor;
                updateSelected({
                    color: getReadableTextColor(backgroundForContrast),
                    fontSize: Math.max(selectedElement.fontSize, textValue.length > 80 ? 28 : 34),
                    fontWeight: "800",
                    lineHeight: clampNumber(selectedElement.lineHeight || 1.12, 1.05, 1.28),
                } as Partial<CreativeEditorElement>);
            };
            const shortenSelectedText = () => {
                const shortened = shortenBusinessText(selectedElement.text, textValue.length > 110 ? 10 : 8);
                if (shortened) {
                    updateSelected({
                        height: Math.max(72, Math.round(selectedElement.height * 0.82)),
                        text: shortened,
                    } as Partial<CreativeEditorElement>);
                }
            };
            const fitTextToSafeArea = () => {
                const maxWidth = Math.max(120, safeRight - safeLeft);
                const maxHeight = Math.max(72, safeBottom - safeTop);
                const nextWidth = Math.min(selectedElement.width, maxWidth);
                const nextHeight = Math.min(selectedElement.height, maxHeight);
                updateSelected({
                    height: Math.round(nextHeight),
                    width: Math.round(nextWidth),
                    x: Math.round(clampNumber(selectedElement.x, safeLeft, safeRight - nextWidth)),
                    y: Math.round(clampNumber(selectedElement.y, safeTop, safeBottom - nextHeight)),
                } as Partial<CreativeEditorElement>);
            };
            const textFindings: Array<{
                actionLabel?: string;
                detail: string;
                id: string;
                label: string;
                onAction?: () => void;
                tone: "good" | "note" | "warning";
            }> = [];
            if (contrastRatio !== null && contrastRatio < 4.5) {
                textFindings.push({
                    actionLabel: "Fix",
                    detail: "Text may be hard to read on this background.",
                    id: "contrast",
                    label: "Low contrast",
                    onAction: makeTextReadable,
                    tone: "warning",
                });
            }
            if (selectedElement.fontSize < 22) {
                textFindings.push({
                    actionLabel: "Enlarge",
                    detail: "Small text is easy to miss on phones.",
                    id: "size",
                    label: "Text is small",
                    onAction: () => updateSelected({ fontSize: 28 } as Partial<CreativeEditorElement>),
                    tone: "warning",
                });
            }
            if (textValue.length > 90 || wordCount > 14) {
                textFindings.push({
                    actionLabel: "Shorten",
                    detail: "Shorter copy is easier to scan in a social post.",
                    id: "length",
                    label: "Too much copy",
                    onAction: shortenSelectedText,
                    tone: "note",
                });
            }
            if (outsideSafeArea) {
                textFindings.push({
                    actionLabel: "Fit",
                    detail: "Important text is close to the edge of the final image.",
                    id: "safe-area",
                    label: "Near edge",
                    onAction: fitTextToSafeArea,
                    tone: "warning",
                });
            }
            if (!hasActionText && ctaLine) {
                textFindings.push({
                    actionLabel: "Add CTA",
                    detail: "A clear next step helps customers act.",
                    id: "cta",
                    label: "No clear action",
                    onAction: () => appendTextLine(ctaLine, "Text with CTA"),
                    tone: "note",
                });
            }
            if (!textFindings.length) {
                textFindings.push({
                    detail: "Text is readable, inside the guide, and concise.",
                    id: "ready",
                    label: "Looks ready",
                    tone: "good",
                });
            }
            const businessTextChips = textPlaceholders
                .filter((placeholder) => placeholder.value.trim())
                .slice(0, 8);
            return (
                <div className={`${styles.inspectorSection} ${styles.priorityInspectorSection}`}>
                    {renderPriorityHeader("Text")}
                    <label>
                        Text
                        <textarea
                            data-creative-editor-field="selected-text"
                            disabled={selectedIsLocked}
                            onChange={(event) => updateSelected({ text: event.target.value } as Partial<CreativeEditorElement>)}
                            value={selectedElement.text}
                        />
                    </label>
                    {businessTextChips.length ? (
                        <div className={styles.businessChipPanel}>
                            <span>Business text</span>
                            <div>
                                {businessTextChips.map((placeholder) => (
                                    <button
                                        disabled={selectedIsLocked}
                                        key={placeholder.id}
                                        onClick={() => appendTextLine(placeholder.value, placeholder.label)}
                                        type="button"
                                    >
                                        {placeholder.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}
                    <div className={styles.textStyleRow} role="group" aria-label="Text style">
                        <button aria-label="Bold" aria-pressed={selectedElement.fontWeight === "bold" || selectedElement.fontWeight === "800" || selectedElement.fontWeight === "700"}
                            data-active={selectedElement.fontWeight === "bold" || selectedElement.fontWeight === "800" || selectedElement.fontWeight === "700"}
                            disabled={selectedIsLocked}
                            onClick={() => updateSelected({ fontWeight: selectedElement.fontWeight === "bold" || selectedElement.fontWeight === "800" || selectedElement.fontWeight === "700" ? "normal" : "bold" } as Partial<CreativeEditorElement>)}
                            type="button"
                        >
                            <LuBold size={16} />
                        </button>
                        <button aria-label="Italic" aria-pressed={selectedElement.fontStyle === "italic"}
                            data-active={selectedElement.fontStyle === "italic"}
                            disabled={selectedIsLocked}
                            onClick={() => updateSelected({ fontStyle: selectedElement.fontStyle === "italic" ? "normal" : "italic" } as Partial<CreativeEditorElement>)}
                            type="button"
                        >
                            <LuItalic size={16} />
                        </button>
                        <button aria-label="Underline" aria-pressed={Boolean(selectedElement.underline)}
                            data-active={selectedElement.underline ? "true" : "false"}
                            disabled={selectedIsLocked}
                            onClick={() => updateSelected({ underline: !selectedElement.underline } as Partial<CreativeEditorElement>)}
                            type="button"
                        >
                            <LuUnderline size={16} />
                        </button>
                        <button aria-label="Strikethrough" aria-pressed={Boolean(selectedElement.linethrough)}
                            data-active={selectedElement.linethrough ? "true" : "false"}
                            disabled={selectedIsLocked}
                            onClick={() => updateSelected({ linethrough: !selectedElement.linethrough } as Partial<CreativeEditorElement>)}
                            type="button"
                        >
                            <LuStrikethrough size={16} />
                        </button>
                    </div>
                    <div className={styles.fieldGrid}>
                        <label>
                            Font
                            <select
                                disabled={selectedIsLocked}
                                onChange={(event) => updateSelected({ fontFamily: event.target.value } as Partial<CreativeEditorElement>)}
                                value={selectedElement.fontFamily || FONT_FAMILY_OPTIONS[0]}
                            >
                                {FONT_FAMILY_OPTIONS.map((fontFamily) => (
                                    <option key={fontFamily} value={fontFamily}>{fontFamily.split(",")[0]}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Size
                            <input
                                data-creative-editor-field="selected-font-size"
                                disabled={selectedIsLocked}
                                min={8}
                                onChange={(event) => updateSelected({ fontSize: Number(event.target.value) } as Partial<CreativeEditorElement>)}
                                type="number"
                                value={selectedElement.fontSize}
                            />
                        </label>
                        <label>
                            Align
                            <select disabled={selectedIsLocked} onChange={(event) => updateSelected({ align: event.target.value as "center" | "left" | "right" } as Partial<CreativeEditorElement>)} value={selectedElement.align || "left"}>
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                            </select>
                        </label>
                        <label>
                            Line
                            <input
                                disabled={selectedIsLocked}
                                max={2.4}
                                min={0.8}
                                onChange={(event) => updateSelected({ lineHeight: Number(event.target.value) } as Partial<CreativeEditorElement>)}
                                step={0.05}
                                type="number"
                                value={selectedElement.lineHeight || 1.12}
                            />
                        </label>
                    </div>
                    <div className={styles.textSmartActionGrid}>
                        <button disabled={selectedIsLocked} onClick={makeTextReadable} type="button">
                            Readable
                        </button>
                        <button disabled={selectedIsLocked || textValue.length < 30} onClick={shortenSelectedText} type="button">
                            Shorten
                        </button>
                        <button disabled={selectedIsLocked || !ctaLine} onClick={() => appendTextLine(ctaLine, "Text with CTA")} type="button">
                            Add CTA
                        </button>
                        <button disabled={selectedIsLocked || !contactLine} onClick={() => appendTextLine(contactLine, "Text with contact")} type="button">
                            Add contact
                        </button>
                        <button disabled={selectedIsLocked} onClick={() => alignSelected("center")} type="button">
                            Center
                        </button>
                        <button disabled={selectedIsLocked} onClick={() => moveLayerById(selectedElement.id, "front")} type="button">
                            Bring front
                        </button>
                    </div>
                    <div className={styles.textHealthList} aria-label="Text checks">
                        {textFindings.slice(0, 4).map((finding) => (
                            <article data-tone={finding.tone} key={finding.id}>
                                <div>
                                    <strong>{finding.label}</strong>
                                    <span>{finding.detail}</span>
                                </div>
                                {finding.onAction ? (
                                    <button disabled={selectedIsLocked} onClick={finding.onAction} type="button">
                                        {finding.actionLabel}
                                    </button>
                                ) : null}
                            </article>
                        ))}
                    </div>
                    {renderQuickColorControls()}
                    {renderOpacityControl()}
                    {renderPositionControls()}
                </div>
            );
        }

        if (selectedElement.type === "image") {
            return (
                <div className={`${styles.inspectorSection} ${styles.priorityInspectorSection}`}>
                    {renderPriorityHeader("Image")}
                    <div className={styles.priorityActionRow}>
                        <button disabled={selectedIsLocked} onClick={() => replaceImageInputRef.current?.click()} type="button">
                            <LuFileImage size={15} />
                            Replace
                        </button>
                        <button disabled={selectedIsLocked} onClick={() => { updateSelected({ fit: selectedElement.fit === "contain" ? "cover" : "contain" } as Partial<CreativeEditorElement>); setNotice(selectedElement.fit === "contain" ? "Image set to crop." : "Image fit inside frame."); }} type="button">
                            {selectedElement.fit === "contain" ? "Crop" : "Fit"}
                        </button>
                        <button disabled={selectedIsLocked} onClick={() => { flipSelected("x"); setNotice("Image flipped horizontally."); }} type="button">
                            <LuFlipHorizontal2 size={15} />
                            Flip
                        </button>
                    </div>
                    <div className={styles.imageSmartActionGrid}>
                        <button disabled={selectedIsLocked} onClick={() => { fillSelectedImageToFrame(); setNotice("Image filled the frame."); }} type="button">
                            Fill frame
                        </button>
                        <button disabled={selectedIsLocked} onClick={() => { fitSelectedImageInsideFrame(); setNotice("Image fit inside frame."); }} type="button">
                            Fit inside
                        </button>
                        <button disabled={selectedIsLocked} onClick={() => { makeSelectedImageLarger(); setNotice("Image enlarged."); }} type="button">
                            Larger
                        </button>
                        <button disabled={selectedIsLocked} onClick={sendSelectedImageBehindText} type="button">
                            Behind text
                        </button>
                    </div>
                    <label className={styles.selectField}>
                        <LuFilter size={16} />
                        <select
                            aria-label="Image filter"
                            disabled={selectedIsLocked}
                            onChange={(event) => updateSelected({ filter: event.target.value as CreativeEditorImageFilter } as Partial<CreativeEditorElement>)}
                            value={selectedImageFilter}
                        >
                            {IMAGE_FILTER_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                    {renderOpacityControl()}
                    {renderPositionControls()}
                </div>
            );
        }

        return (
            <div className={`${styles.inspectorSection} ${styles.priorityInspectorSection}`}>
                {renderPriorityHeader(selectedElement.type === "qr" ? "QR" : "Layer")}
                {selectedElement.type === "qr" ? (
                    <>
                        <label>
                            QR value
                            <textarea disabled={selectedIsLocked} onChange={(event) => updateSelected({ value: event.target.value } as Partial<CreativeEditorElement>)} value={selectedElement.value} />
                        </label>
                        <div className={styles.fieldGrid}>
                            <label>
                                QR color
                                <input
                                    disabled={selectedIsLocked}
                                    onChange={(event) => updateSelected({ darkColor: event.target.value } as Partial<CreativeEditorElement>)}
                                    type="color"
                                    value={selectedElement.darkColor || "#16231f"}
                                />
                            </label>
                        </div>
                        {selectedElement.lightColor && selectedElement.lightColor !== "#ffffff" ? (
                            <button
                                className={styles.inlineActionButton}
                                disabled={selectedIsLocked}
                                onClick={() => updateSelected({ errorCorrectionLevel: "H", lightColor: "#ffffff", margin: 4 } as Partial<CreativeEditorElement>)}
                                type="button"
                            >
                                <LuShieldCheck size={16} />
                                Reset white scan panel
                            </button>
                        ) : (
                            <p className={styles.legacyHelperText}>QR scan panel stays white for reliable printing.</p>
                        )}
                    </>
                ) : null}
                {renderQuickColorControls()}
                {canStrokeElement(selectedElement) ? (
                    <div className={styles.fieldGrid}>
                        <label>
                            Border
                            <select
                                disabled={selectedIsLocked}
                                onChange={(event) => updateSelected({ strokeStyle: event.target.value as CreativeEditorStrokeStyle } as Partial<CreativeEditorElement>)}
                                value={selectedStrokeStyle}
                            >
                                {STROKE_STYLE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Width
                            <input disabled={selectedIsLocked} min={0} onChange={(event) => updateSelected({ strokeWidth: Number(event.target.value) } as Partial<CreativeEditorElement>)} type="number" value={selectedStrokeWidth} />
                        </label>
                    </div>
                ) : null}
                {renderOpacityControl()}
                {renderPositionControls()}
            </div>
        );
    };

    const renderLayerThumb = (element: CreativeEditorElement) => {
        if (element.type === "image") {
            return <img alt="" src={element.src} />;
        }
        if (element.type === "qr") {
            return <LuQrCode size={20} />;
        }
        if (canEditTextElement(element)) {
            return <span>T</span>;
        }
        if (element.type === "line") {
            return <LuArrowRight size={18} />;
        }
        return <LuShapes size={18} />;
    };

    const renderReadinessPanel = () => {
        if (!readinessPanelOpen) return null;
        const actionableIssues = readinessIssues.filter((issue) => issue.tone !== "good");
        return (
            <div className={`${styles.inspectorSection} ${styles.readinessPanel}`}>
                <div className={styles.readinessHeader}>
                    <div>
                        <h3>Download check</h3>
                        <span>{actionableIssues.length ? `${actionableIssues.length} item${actionableIssues.length === 1 ? "" : "s"} to review` : "Ready"}</span>
                    </div>
                    <button aria-label="Close download check" onClick={() => setReadinessPanelOpen(false)} type="button">
                        <LuPanelLeftOpen size={16} />
                    </button>
                </div>
                <div className={styles.readinessList}>
                    {readinessIssues.map((issue) => (
                        <article data-tone={issue.tone} key={issue.id}>
                            <div>
                                <strong>{issue.label}</strong>
                                <span>{issue.detail}</span>
                            </div>
                            {issue.elementId ? (
                                <button onClick={() => selectReadinessIssue(issue)} type="button">
                                    {issue.actionLabel || "Select"}
                                </button>
                            ) : null}
                        </article>
                    ))}
                </div>
                {showInternalExportTools ? (
                    <div className={styles.readinessActions}>
                        <button onClick={() => void runExport("png")} type="button">
                            <LuDownload size={16} />
                            Download PNG
                        </button>
                        <button onClick={() => { void downloadExportBundle(); }} type="button">
                            <LuFileImage size={16} />
                            Bundle
                        </button>
                    </div>
                ) : null}
            </div>
        );
    };

    const renderLayerPanel = () => (
        <>
            <div className={styles.layerPanelHeader}>
                <div>
                    <span>Active Layers</span>
                    <strong>{layerList.length} {layerList.length === 1 ? "layer" : "layers"}</strong>
                </div>
                <button aria-label="Close layers panel" onClick={() => setInspectorOpen(false)} type="button">
                    <LuPanelLeftOpen size={22} />
                </button>
            </div>
            <div className={styles.layerPanelStats} aria-label="Layer summary">
                <span>{visibleLayerCount} visible</span>
                <span>{lockedLayerCount} locked</span>
                <span>{currentHistoryLabel}</span>
            </div>

            {selectedElement ? (
                <div className={styles.layerPanelSelected}>
                    <div className={styles.layerPanelSelectedPreview}>
                        {renderLayerThumb(selectedElement)}
                    </div>
                    <div>
                        <label className={styles.layerPanelNameField}>
                            <span>Layer name</span>
                            <input
                                disabled={selectedLayerReadOnly}
                                onChange={(event) => updateSelected({ name: event.target.value })}
                                value={selectedElement.name}
                            />
                        </label>
                        <span>{selectedElement.visible === false ? "Hidden layer" : selectedElement.printFrameLocked ? "Protected layer" : selectedElement.locked ? "Locked layer" : "Selected layer"}</span>
                    </div>
                    <button data-creative-editor-action="edit-selected-layer" onClick={openSelectionInspector} type="button">
                        <LuPencil size={16} />
                        Edit
                    </button>
                </div>
            ) : (
                <p className={styles.layerPanelHint}>Select a layer to edit, reorder, hide, or lock it.</p>
            )}

            <div className={styles.quickActions}>
                <button disabled={!selectedElement || activePageLocked || selectedLayerFrameLocked} onClick={toggleSelectedLock} type="button">
                    {selectedLayerFrameLocked ? <LuLock size={20} /> : selectedLayerLocked ? <LuUnlock size={20} /> : <LuLock size={20} />}
                </button>
                <button disabled={!selectedElement || selectedLayerReadOnly || selectedElement.visible === false} onClick={duplicateSelected} type="button">
                    <LuCopy size={20} />
                </button>
                <button disabled={!selectedElement || selectedLayerReadOnly} onClick={removeSelected} type="button">
                    <LuTrash2 size={20} />
                </button>
            </div>

            <div className={`${styles.inspectorSection} ${styles.layersInspectorSection}`}>
                <h3>Layer stack</h3>
                <p className={styles.legacyHelperText}>Drag rows to reorder. Top item appears in front.</p>
                <div className={styles.layerList}>
                    {layerList.map((element) => (
                        <div
                            className={styles.layerRow}
                            data-active={selectedId === element.id}
                            data-creative-layer-id={element.id}
                            data-creative-layer-name={element.name}
                            data-creative-layer-type={element.type}
                            data-dragging={draggedLayerId === element.id ? "true" : "false"}
                            draggable={!activePageLocked && !element.locked && !element.printFrameLocked}
                            key={element.id}
                            onDragEnd={() => setDraggedLayerId("")}
                            onDragOver={(event) => {
                                if (activePageLocked) return;
                                const draggedId = event.dataTransfer.getData("text/plain") || draggedLayerId;
                                if (!draggedId || draggedId === element.id) return;
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                            }}
                            onDragStart={(event) => {
                                if (activePageLocked || element.locked || element.printFrameLocked) {
                                    event.preventDefault();
                                    return;
                                }
                                setDraggedLayerId(element.id);
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", element.id);
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                const draggedId = event.dataTransfer.getData("text/plain") || draggedLayerId;
                                reorderLayerByDrop(draggedId, element.id);
                            }}
                        >
                            <span
                                aria-label={element.locked || element.printFrameLocked ? "Locked layer cannot be dragged" : "Drag to reorder layer"}
                                className={styles.layerDragHandle}
                                title={element.printFrameLocked ? "Protected print-frame layer" : element.locked ? "Unlock to reorder" : "Drag to reorder"}
                            >
                                <LuGripVertical size={16} />
                            </span>
                            <button
                                className={styles.layerName}
                                data-creative-editor-action="select-layer"
                                onClick={() => selectLayerFromPanel(element.id)}
                                type="button"
                            >
                                <span className={styles.layerThumb}>{renderLayerThumb(element)}</span>
                                <span className={styles.layerTitle}>
                                    <span>{element.name}</span>
                                    <small>{element.visible === false ? "hidden" : element.printFrameLocked ? "protected" : element.locked ? "locked" : element.type}</small>
                                </span>
                            </button>
                            <button aria-label="Toggle visible" disabled={activePageLocked} onClick={() => toggleLayer(element.id, "visible")} type="button">
                                {element.visible === false ? <LuEyeOff size={14} /> : <LuEye size={14} />}
                            </button>
                            <button aria-label="Toggle lock" disabled={activePageLocked || element.printFrameLocked} onClick={() => toggleLayer(element.id, "locked")} type="button">
                                {element.locked || element.printFrameLocked ? <LuLock size={14} /> : <LuUnlock size={14} />}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className={`${styles.inspectorSection} ${styles.layerOrderInspectorSection}`}>
                <h3>Move selected layer</h3>
                <div className={styles.layerAlignmentGrid}>
                    <button disabled={!selectedElement || selectedLayerReadOnly} onClick={() => selectedElement && moveLayerById(selectedElement.id, "forward")} type="button">
                        <LuArrowUp size={17} />
                        Move Forward
                    </button>
                    <button disabled={!selectedElement || selectedLayerReadOnly} onClick={() => selectedElement && moveLayerById(selectedElement.id, "front")} type="button">
                        <LuArrowUpToLine size={17} />
                        Move To Front
                    </button>
                    <button disabled={!selectedElement || selectedLayerReadOnly} onClick={() => selectedElement && moveLayerById(selectedElement.id, "backward")} type="button">
                        <LuArrowDown size={17} />
                        Move Backward
                    </button>
                    <button disabled={!selectedElement || selectedLayerReadOnly} onClick={() => selectedElement && moveLayerById(selectedElement.id, "back")} type="button">
                        <LuArrowDownToLine size={17} />
                        Move To Back
                    </button>
                </div>
            </div>

            {showInternalExportTools ? (
                <div className={styles.exportRow}>
                    <button onClick={runReadinessCheck} type="button">
                        <LuShieldCheck size={16} />
                        Check
                    </button>
                    <button disabled={disabledExportFormats.includes("svg")} onClick={() => runExport("svg")} type="button">
                        <LuDownload size={16} />
                        SVG
                    </button>
                    <button disabled={disabledExportFormats.includes("png")} onClick={() => runExport("png")} type="button">
                        <LuDownload size={16} />
                        PNG
                    </button>
                    <button disabled={disabledExportFormats.includes("json")} onClick={() => runExport("json")} type="button">
                        <LuFileJson size={16} />
                        JSON
                    </button>
                    <button onClick={copyPngToClipboard} type="button">
                        <LuCopy size={16} />
                        Copy
                    </button>
                    <button onClick={copyBase64ToClipboard} type="button">
                        <LuHash size={16} />
                        Base64
                    </button>
                    <button disabled={disabledExportFormats.includes("png")} onClick={() => { void downloadExportBundle(); }} type="button">
                        <LuFileImage size={16} />
                        Bundle
                    </button>
                </div>
            ) : null}
            {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
        </>
    );

    const renderFloatingSelectionToolbar = () => {
        if (!floatingSelectionToolbar || !fabricReady) return null;
        const selectedIsLocked = Boolean(selectedLayerReadOnly || floatingSelectionToolbar.locked);
        if (isGroupedSelection) {
            return (
                <div
                    aria-label="Selected group actions"
                    className={styles.floatingSelectionToolbar}
                    data-anchor-left={Math.round(floatingSelectionToolbar.anchorLeft)}
                    data-creative-editor-floating-toolbar="true"
                    data-multi="false"
                    data-selection-bottom={Math.round(floatingSelectionToolbar.selectionBottom)}
                    data-toolbar-left={Math.round(floatingSelectionToolbar.left)}
                    data-toolbar-top={Math.round(floatingSelectionToolbar.top)}
                    data-toolbar-variant={floatingSelectionToolbar.variant}
                    ref={floatingSelectionToolbarRef}
                    role="toolbar"
                    style={{
                        left: `${floatingSelectionToolbar.left}px`,
                        top: `${floatingSelectionToolbar.top}px`,
                    }}
                >
                    <button disabled={!canUngroupActiveSelection} onClick={ungroupSelection} title="Ungroup selected layers" type="button">
                        <LuUngroup size={17} />
                        <span>Ungroup</span>
                    </button>
                    <button onClick={openSelectionInspector} title="Position and layers" type="button">
                        <LuLayers size={17} />
                    </button>
                </div>
            );
        }
        return (
            <div
                aria-label="Selected layer actions"
                className={styles.floatingSelectionToolbar}
                data-anchor-left={Math.round(floatingSelectionToolbar.anchorLeft)}
                data-creative-editor-floating-toolbar="true"
                data-multi={floatingSelectionToolbar.isMultiSelection ? "true" : "false"}
                data-selection-bottom={Math.round(floatingSelectionToolbar.selectionBottom)}
                data-toolbar-left={Math.round(floatingSelectionToolbar.left)}
                data-toolbar-top={Math.round(floatingSelectionToolbar.top)}
                data-toolbar-variant={floatingSelectionToolbar.variant}
                onMouseDown={(event) => event.stopPropagation()}
                ref={floatingSelectionToolbarRef}
                role="toolbar"
                style={{
                    left: `${floatingSelectionToolbar.left}px`,
                    top: `${floatingSelectionToolbar.top}px`,
                }}
            >
                {floatingSelectionToolbar.isMultiSelection ? (
                    <>
                        <button disabled={!canGroupActiveSelection} onClick={groupSelection} title="Group selected layers" type="button">
                            <LuGroup size={17} />
                            <span>Group</span>
                        </button>
                        <button disabled={!canDistributeActiveSelection} onClick={() => distributeSelection("x")} title="Distribute across" type="button">
                            <LuAlignHorizontalJustifyCenter size={17} />
                        </button>
                        <button disabled={!canDistributeActiveSelection} onClick={() => distributeSelection("y")} title="Distribute down" type="button">
                            <LuAlignCenterVertical size={17} />
                        </button>
                        <button disabled={activePageLocked || floatingSelectionToolbar.locked} onClick={duplicateSelected} title="Duplicate selected layers" type="button">
                            <LuCopy size={17} />
                        </button>
                        <button disabled={floatingSelectionToolbar.locked || activePageLocked} onClick={removeSelected} title="Delete selected layers" type="button">
                            <LuTrash2 size={17} />
                        </button>
                        <button onClick={openSelectionInspector} title="More layer controls" type="button">
                            <LuPanelLeftOpen size={17} />
                        </button>
                    </>
                ) : (
                    <>
                        {designCueCommands.length && onDesignCueRequest && onDesignCueApply ? (
                            <button onClick={openSelectionAiTools} title="Open Design Cue" type="button">
                                <LuSparkles size={17} />
                                <span>Ask</span>
                            </button>
                        ) : null}
                        <button onClick={openSelectionInspector} title="Edit selected layer" type="button">
                            <LuPencil size={17} />
                            <span>Edit</span>
                        </button>
                        <label
                            className={styles.floatingColorPicker}
                            data-disabled={!selectedElement || selectedIsLocked ? "true" : "false"}
                            title="Layer color"
                        >
                            <span style={{ background: selectedColorValue }} />
                            <input
                                aria-label="Layer color"
                                disabled={!selectedElement || selectedIsLocked}
                                onChange={(event) => applyColor(event.target.value)}
                                type="color"
                                value={selectedColorValue}
                            />
                        </label>
                        <button onClick={openSelectionInspector} title="Style and effects" type="button">
                            <LuPalette size={17} />
                        </button>
                        <button disabled={!selectedElement || selectedIsLocked} onClick={() => flipSelected("x")} title="Flip selected layer" type="button">
                            <LuFlipHorizontal2 size={17} />
                        </button>
                        <button onClick={openSelectionInspector} title="Position and layers" type="button">
                            <LuLayers size={17} />
                        </button>
                        <button
                            disabled={!selectedElement || activePageLocked || selectedLayerFrameLocked}
                            onClick={toggleSelectedLock}
                            title={selectedLayerFrameLocked ? "Protected print-frame layer" : selectedLayerLocked ? "Unlock layer" : "Lock layer"}
                            type="button"
                        >
                            {selectedLayerFrameLocked ? <LuLock size={17} /> : selectedLayerLocked ? <LuUnlock size={17} /> : <LuLock size={17} />}
                        </button>
                        <button disabled={!selectedElement || selectedIsLocked} onClick={duplicateSelected} title="Duplicate selected layer" type="button">
                            <LuCopy size={17} />
                        </button>
                        <button disabled={!selectedElement || selectedIsLocked} onClick={removeSelected} title="Delete selected layer" type="button">
                            <LuTrash2 size={17} />
                        </button>
                        <button onClick={openSelectionInspector} title="More controls" type="button">
                            <LuPanelLeftOpen size={17} />
                        </button>
                    </>
                )}
            </div>
        );
    };

    const renderShortcutPanel = () => {
        if (!shortcutPanelOpen) return null;
        return (
            <div
                className={styles.shortcutOverlay}
                data-creative-editor-dialog="shortcuts"
                onKeyDown={trapDialogFocus}
                role="dialog"
                aria-modal="true"
                aria-label="Keyboard shortcuts"
            >
                <div className={styles.shortcutPanel}>
                    <div className={styles.shortcutHeader}>
                        <div>
                            <h2>Keyboard shortcuts</h2>
                            <p>Fast canvas actions for creating, selecting, arranging, text editing, zooming, and review.</p>
                        </div>
                        <button onClick={closeShortcutPanel} ref={shortcutCloseButtonRef} type="button">Close</button>
                    </div>
                    <div className={styles.shortcutGrid}>
                        {KEYBOARD_SHORTCUT_GROUPS.map((group) => (
                            <section className={styles.shortcutGroup} key={group.id}>
                                <h3>{group.title}</h3>
                                <div className={styles.shortcutRows}>
                                    {group.items.map((item) => (
                                        <div className={styles.shortcutRow} key={`${group.id}-${item.action}`}>
                                            <span>{item.action}</span>
                                            <div className={styles.shortcutKeys} aria-label={`${item.action} shortcuts`}>
                                                {item.keys.map((shortcut) => (
                                                    <kbd className={styles.shortcutKey} key={shortcut}>{shortcut}</kbd>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <section
            className={styles.editorShell}
            data-creative-editor-active-tool={activeTool}
            data-creative-editor-root="true"
            data-creative-editor-layer-count={documentValue.elements.length} data-creative-editor-selected-layer-id={selectedId}
            data-chrome-mode={chromeMode}
            data-theme={theme}
            data-review-mode={reviewMode ? "true" : "false"}
            aria-label="Creative editor"
            onBlurCapture={flushPendingFloatingToolbarRefresh}
        >
            <input
                accept="application/json,.json"
                aria-hidden="true"
                className={styles.hiddenFileInput}
                disabled={!allowDesignImport}
                hidden
                onChange={(event) => handleFileInput(event, "json")}
                ref={jsonInputRef}
                tabIndex={-1}
                type="file"
            />
            <input
                accept="image/png,image/jpeg,image/webp,image/gif"
                aria-hidden="true"
                className={styles.hiddenFileInput}
                multiple
                disabled={!allowRasterImports}
                hidden
                onChange={(event) => handleFileInput(event, "image")}
                ref={imageInputRef}
                tabIndex={-1}
                type="file"
            />
            <input
                accept="image/png,image/jpeg,image/webp,image/gif"
                aria-hidden="true"
                className={styles.hiddenFileInput}
                disabled={!allowRasterImports}
                hidden
                onChange={handleReplaceImageInput}
                ref={replaceImageInputRef}
                tabIndex={-1}
                type="file"
            />
            <header className={styles.topBar}>
                <div className={styles.topLeft}>
                    <div className={styles.productMark} title={productLabel}>
                        <LuLayers size={18} />
                        <span>{productLabel}</span>
                    </div>
                    {showWorkspaceNavigationActions ? (
                        <button
                            aria-label="Back to product workspace"
                            className={styles.iconButton}
                            onClick={() => setNotice("Use the product workspace navigation to leave the editor. Unsaved exports stay in this browser until downloaded or saved.")}
                            type="button"
                        >
                            <LuHome size={20} />
                        </button>
                    ) : null}
                    <label className={styles.titleInput} title={sourceLabel}>
                        <LuPencil size={15} />
                        <input
                            aria-label="Your drawing title"
                            onChange={(event) => updateDocumentTitle(event.target.value)}
                            placeholder="Your drawing title"
                            value={documentValue.title}
                        />
                    </label>
                    {showDesignManagementActions && allowNewDesign ? (
                        <button className={styles.newDesignButton} onClick={startBlankDesign} type="button">
                            <LuPlus size={18} />
                            New Design
                        </button>
                    ) : null}
                </div>
                <div className={styles.topRight}>
                    <div className={styles.dimensionPill}>
                        <LuHash size={18} />
                        {documentValue.canvas.width} X {documentValue.canvas.height}
                    </div>
                    {showDesignManagementActions && allowDesignImport ? (
                        <button aria-label="Import design JSON" className={styles.roundButton} onClick={() => jsonInputRef.current?.click()} type="button">
                            <LuFileInput size={18} />
                        </button>
                    ) : null}
                    {showDesignManagementActions && allowRasterImports ? (
                        <button aria-label="Import image file" className={styles.roundButton} onClick={() => imageInputRef.current?.click()} type="button">
                            <LuFileImage size={18} />
                        </button>
                    ) : null}
                    {visibleWorkspaceControls.has("grid") ? (
                        <button
                            aria-label="Toggle grid and rulers"
                            className={styles.roundButton}
                            data-creative-editor-action="toggle-grid"
                            data-active={showGrid ? "true" : "false"}
                            onClick={() => setShowGrid((value) => !value)}
                            type="button"
                        >
                            <LuGrid size={18} />
                        </button>
                    ) : null}
                    {visibleWorkspaceControls.has("safeArea") ? (
                        <button
                            aria-label="Toggle safe area guides"
                            className={styles.roundButton}
                            data-creative-editor-action="toggle-safe-area"
                            data-active={showSafeArea ? "true" : "false"}
                            onClick={() => setShowSafeArea((value) => !value)}
                            type="button"
                        >
                            <LuShieldCheck size={18} />
                        </button>
                    ) : null}
                    {visibleWorkspaceControls.has("review") ? (
                        <button
                            aria-label="Review before download"
                            className={styles.roundButton}
                            data-creative-editor-action="review"
                            data-active={readinessPanelOpen ? "true" : "false"}
                            onClick={enterReviewMode}
                            type="button"
                        >
                            <LuShieldCheck size={18} />
                        </button>
                    ) : null}
                    {showDesignManagementActions && allowNewDesign ? (
                        <button aria-label="Reset design" className={styles.roundButton} onClick={startBlankDesign} type="button">
                            <LuRotateCcw size={18} />
                        </button>
                    ) : null}
                    <span className={styles.divider} />
                    <button aria-label="Undo" className={styles.roundButton} disabled={!canUndo} onClick={undo} type="button">
                        <LuUndo2 size={18} />
                    </button>
                    <button aria-label="Redo" className={styles.roundButton} disabled={!canRedo} onClick={redo} type="button">
                        <LuRedo2 size={18} />
                    </button>
                    {showDesignManagementActions ? (
                        <button
                            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                            className={styles.roundButton}
                            data-creative-editor-action="toggle-theme"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            type="button"
                        >
                            {theme === "dark" ? <LuPalette size={18} /> : <LuMoon size={18} />}
                        </button>
                    ) : null}
                    {showInternalExportTools ? (
                        <button
                            aria-label="Export handoff"
                            className={styles.roundButton}
                            onClick={() => setNotice("Download or copy the asset, then post it manually. Direct provider posting is not connected.")}
                            type="button"
                        >
                            <LuShare2 size={18} />
                        </button>
                    ) : null}
                    {visibleWorkspaceControls.has("preview") ? (
                        <button
                            aria-label="Preview"
                            className={styles.roundButton}
                            data-creative-editor-action="preview"
                            onClick={openPreview}
                            ref={previewButtonRef}
                            type="button"
                        >
                            <LuEye size={18} />
                        </button>
                    ) : null}
                    {showInternalExportTools ? (
                        <>
                            <button
                                className={styles.downloadButton}
                                disabled={disabledExportFormats.includes("png")}
                                onClick={() => void runExport("png")}
                                type="button"
                            >
                                <LuDownload size={18} />
                                Download
                            </button>
                            <button
                                className={styles.downloadButton}
                                disabled={disabledExportFormats.includes("png")}
                                onClick={() => { void downloadExportBundle(); }}
                                type="button"
                            >
                                <LuFileImage size={18} />
                                Bundle
                            </button>
                            <button className={styles.saveButton} onClick={registerAsset} type="button">
                                <LuUploadCloud size={18} />
                                {onTemplateSave ? templateSaveLabel : "Save"}
                            </button>
                        </>
                    ) : onTemplateSave ? (
                        <button className={styles.saveButton} onClick={registerAsset} type="button">
                            <LuUploadCloud size={18} />
                            {templateSaveLabel}
                        </button>
                    ) : null}
                    {headerActions.length ? (
                        <div className={styles.headerActionGroup}>
                            {headerActions.map((action) => (
                                <button
                                    aria-label={action.ariaLabel || action.label}
                                    className={styles.headerActionButton}
                                    data-tone={action.tone || "default"}
                                    disabled={action.disabled || action.loading}
                                    key={action.id}
                                    onClick={() => {
                                        if (action.requiresReadiness) {
                                            const issues = buildReadinessIssues(getLatestDocumentFromCanvas());
                                            if (shouldPauseForReadiness(issues)) return;
                                        }
                                        void action.onClick();
                                    }}
                                    type="button"
                                >
                                    {action.icon}
                                    <span>{action.loading ? "Working..." : action.label}</span>
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>
            </header>
            {browserDraftsEnabled && autosaveDraft ? (
                <div className={styles.autosaveBanner} role="status">
                    <span>Browser draft found for this design.</span>
                    <button onClick={restoreAutosaveDraft} type="button">Restore</button>
                    <button onClick={dismissAutosaveDraft} type="button">Dismiss</button>
                </div>
            ) : null}

            <div
                className={styles.editorBody}
                data-creative-editor-body="true"
                data-drawer-collapsed={drawerCollapsed ? "true" : "false"}
                data-inspector-open={inspectorOpen ? "true" : "false"}
                data-review-mode={reviewMode ? "true" : "false"}
            >
                <nav className={styles.toolRail} data-creative-editor-rail="true" aria-label="Editor tools">
                    {availableTools.map((tool) => {
                        const Icon = tool.icon;
                        const active = !drawerCollapsed && activeTool === tool.id;
                        return (
                            <button
                                className={styles.railButton}
                                data-active={active ? "true" : "false"}
                                data-creative-editor-tool={tool.id}
                                disabled={tool.disabled}
                                key={tool.id}
                                onClick={() => {
                                    setActiveTool(tool.id);
                                    setDrawerCollapsed(false);
                                    setDrawerSearch("");
                                }}
                                title={tool.disabled ? `${tool.label} is not available in this editor` : tool.label}
                                type="button"
                            >
                                <span className={styles.railIcon} aria-hidden="true">
                                    <Icon active={active} />
                                </span>
                                <span>{tool.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <aside className={styles.assetDrawer} data-creative-editor-asset-drawer="true">
                    <div className={styles.drawerHeader}>
                        <button aria-label="Collapse drawer" onClick={() => setDrawerCollapsed(true)} type="button">
                            <LuArrowLeft size={19} />
                        </button>
                        <h2>{TOOL_LABELS[activeTool]}</h2>
                    </div>
                    <label className={styles.drawerSearch} hidden={!SEARCHABLE_EDITOR_TOOL_IDS.has(activeTool)}>
                        <LuFilter size={16} />
                        <input
                            aria-label={`Search ${TOOL_LABELS[activeTool]}`}
                            onChange={(event) => setDrawerSearch(event.target.value)}
                            placeholder={`Search ${TOOL_LABELS[activeTool].toLowerCase()}`}
                            value={drawerSearch}
                        />
                    </label>
                    <div className={styles.drawerContent}>{renderDrawerContent()}</div>
                </aside>

                <main className={styles.workspaceArea} data-creative-editor-workspace="true">
                    {!inspectorOpen ? renderContextualSelectionToolbar() : null}
                    <div
                        className={styles.stageScroller}
                        data-creative-editor-stage="true"
                        data-grid={showGrid ? "true" : "false"}
                        data-mode={interactionMode}
                        data-safe-area={showSafeArea ? "true" : "false"}
                        ref={stageScrollerRef}
                    >
                        {showPageNavigation ? (
                            <div className={styles.pageQuickControls} aria-label="Page controls">
                                <button aria-label={activePageLocked ? "Unlock page" : "Lock page"} onClick={toggleActivePageLock} type="button">
                                    {activePageLocked ? <LuUnlock size={16} /> : <LuLock size={16} />}
                                </button>
                                <button aria-label="Duplicate page" onClick={duplicateActivePage} type="button">
                                    <LuCopy size={16} />
                                </button>
                                <button aria-label="Add page" onClick={addPage} type="button">
                                    <LuPlus size={16} />
                                </button>
                            </div>
                        ) : null}
                        <div
                            className={styles.fabricZoomBox}
                        >
                            {showGrid ? (
                                <>
                                    <div
                                        className={styles.canvasRulerTop}
                                        aria-hidden="true"
                                        style={{
                                            left: `${workspaceViewport.left}px`,
                                            top: `${Math.max(8, workspaceViewport.top - 31)}px`,
                                            width: `${workspaceViewport.width}px`,
                                        }}
                                    >
                                        {horizontalRulerTicks.map((tick) => (
                                            <span
                                                data-major={tick.major ? "true" : "false"}
                                                key={tick.id}
                                                style={{ left: `${tick.position}%` }}
                                            >
                                                {tick.label ? <em>{tick.label}</em> : null}
                                            </span>
                                        ))}
                                    </div>
                                    <div
                                        className={styles.canvasRulerLeft}
                                        aria-hidden="true"
                                        style={{
                                            height: `${workspaceViewport.height}px`,
                                            left: `${Math.max(8, workspaceViewport.left - 35)}px`,
                                            top: `${workspaceViewport.top}px`,
                                        }}
                                    >
                                        {verticalRulerTicks.map((tick) => (
                                            <span
                                                data-major={tick.major ? "true" : "false"}
                                                key={tick.id}
                                                style={{ top: `${tick.position}%` }}
                                            >
                                                {tick.label ? <em>{tick.label}</em> : null}
                                            </span>
                                        ))}
                                    </div>
                                </>
                            ) : null}
                            <div
                                className={styles.canvasSurfaceHost}
                                data-creative-editor-canvas-host="true"
                                ref={canvasHostRef}
                            />
                            {showSafeArea && workspaceViewport.width > 1 && workspaceViewport.height > 1 ? (
                                <div
                                    aria-hidden="true"
                                    className={styles.safeAreaOverlay}
                                    style={{
                                        height: `${workspaceViewport.height * (1 - SAFE_AREA_INSET_RATIO * 2)}px`,
                                        left: `${workspaceViewport.left + workspaceViewport.width * SAFE_AREA_INSET_RATIO}px`,
                                        top: `${workspaceViewport.top + workspaceViewport.height * SAFE_AREA_INSET_RATIO}px`,
                                        width: `${workspaceViewport.width * (1 - SAFE_AREA_INSET_RATIO * 2)}px`,
                                    }}
                                />
                            ) : null}
                            {renderFloatingSelectionToolbar()}
                        </div>
                        {!fabricReady ? <p className={styles.canvasLoading}>Loading editor...</p> : null}
                    </div>
                    {showPageNavigation ? (
                        <div className={styles.pageStrip} aria-label="Design pages">
                            <div className={styles.pageTabs}>
                                {pageList.map((page, index) => (
                                    <button
                                        data-active={page.id === documentValue.activePageId ? "true" : "false"}
                                        key={page.id}
                                        onClick={() => switchPage(page.id)}
                                        type="button"
                                    >
                                        {page.locked ? <LuLock size={14} /> : null}
                                        <span>{page.title || `Page ${index + 1}`}</span>
                                    </button>
                                ))}
                            </div>
                            <button onClick={addPage} type="button">
                                <LuPlus size={16} />
                                Add page
                            </button>
                            <span>{activePageIndex + 1}/{Math.max(1, pageList.length)}</span>
                        </div>
                    ) : null}
                    <div className={styles.bottomControls}>
                        <button aria-label="Zoom in" onClick={() => zoomFabricViewport(0.1)} type="button">
                            <LuZoomIn size={20} />
                        </button>
                        <button aria-label="Zoom out" onClick={() => zoomFabricViewport(-0.1)} type="button">
                            <LuZoomOut size={20} />
                        </button>
                        <button aria-label="Fit to screen" onClick={fitZoomToStage} type="button">
                            <LuMaximize size={20} />
                        </button>
                        <div className={styles.modeToggle} role="group" aria-label="Canvas mode">
                            <button
                                data-active={interactionMode === "selection" ? "true" : "false"}
                                onClick={() => setInteractionMode("selection")}
                                type="button"
                            >
                                <LuMousePointer2 size={18} />
                                Selection
                            </button>
                            <button
                                data-active={interactionMode === "grab" ? "true" : "false"}
                                onClick={() => setInteractionMode("grab")}
                                type="button"
                            >
                                <LuHand size={18} />
                                Grab
                            </button>
                        </div>
                        <button aria-label="Duplicate selected layer" disabled={!selectedElement || selectedLayerReadOnly} onClick={duplicateSelected} type="button">
                            <LuCopy size={20} />
                        </button>
                        <button
                            aria-label="Keyboard shortcuts"
                            data-creative-editor-action="shortcuts"
                            onClick={openShortcutPanel}
                            ref={shortcutButtonRef}
                            type="button"
                        >
                            <LuKeyboard size={20} />
                        </button>
                        <button aria-label="Help" onClick={() => setNotice("Use the left rail to add content, the canvas to position layers, and the right panel to refine details. Polygon mode finishes with double-click or Enter.")} type="button">
                            <LuHelpCircle size={20} />
                        </button>
                    </div>
                    <button
                        className={styles.layersButton}
                        data-active={inspectorOpen && rightPanelModeState === "layers" ? "true" : "false"}
                        data-creative-editor-action="layers"
                        onClick={openLayerPanel}
                        type="button"
                    >
                        <LuLayers size={18} />
                        Layers
                    </button>
                </main>

                <aside
                    aria-hidden={!inspectorOpen}
                    className={styles.inspector}
                    data-creative-editor-inspector="true"
                    data-panel-mode={rightPanelModeState}
                    ref={inspectorRef}
                >
                    {rightPanelModeState === "layers" ? renderLayerPanel() : (
                        <>
                    <div className={styles.selectedSummary}>
                        <button aria-label="Clear selected layer" onClick={clearSelection} type="button">
                            <LuPanelLeftOpen size={25} />
                        </button>
                        <div className={styles.selectedPreview}>
                            {selectedElement?.type === "image" ? (
                                <img alt="" src={selectedElement.src} />
                            ) : selectedElement ? (
                                <span>{selectedElement.name.slice(0, 2).toUpperCase()}</span>
                            ) : (
                                <LuLayers size={32} />
                            )}
                        </div>
                    </div>

                    <div className={styles.quickActions}>
                        <button
                            aria-label={selectedLayerFrameLocked ? "Selected layer is protected" : selectedLayerLocked ? "Unlock selected layer" : "Lock selected layer"}
                            disabled={!selectedElement || activePageLocked || selectedLayerFrameLocked}
                            onClick={toggleSelectedLock}
                            type="button"
                        >
                            {selectedLayerFrameLocked ? <LuLock size={20} /> : selectedLayerLocked ? <LuUnlock size={20} /> : <LuLock size={20} />}
                        </button>
                        <button aria-label="Duplicate selected layer" disabled={!selectedElement || selectedLayerReadOnly} onClick={duplicateSelected} type="button">
                            <LuCopy size={20} />
                        </button>
                        <button aria-label="Delete selected layer" disabled={!selectedElement || selectedLayerReadOnly} onClick={removeSelected} type="button">
                            <LuTrash2 size={20} />
                        </button>
                    </div>

                    {renderReadinessPanel()}

                    {renderPriorityInspectorSection()}

                    <div className={`${styles.inspectorSection} ${styles.utilityInspectorSection}`}>
                        <h3>Quick Tools</h3>
                        <div className={styles.transformActionGrid}>
                            {canGroupActiveSelection ? (
                                <button onClick={groupSelection} type="button">
                                    <LuGroup size={17} />
                                    Group
                                </button>
                            ) : null}
                            {canUngroupActiveSelection ? (
                                <button onClick={ungroupSelection} type="button">
                                    <LuUngroup size={17} />
                                    Ungroup
                                </button>
                            ) : null}
                            <button disabled={!selectedElement || selectedLayerReadOnly} onClick={() => flipSelected("x")} type="button">
                                <LuFlipHorizontal2 size={17} />
                                Flip X
                            </button>
                            <button disabled={!selectedElement || selectedLayerReadOnly} onClick={() => flipSelected("y")} type="button">
                                <LuFlipVertical2 size={17} />
                                Flip Y
                            </button>
                            {canDistributeActiveSelection ? (
                                <>
                                    <button onClick={() => distributeSelection("x")} type="button">
                                        <LuAlignHorizontalJustifyCenter size={17} />
                                        Distribute X
                                    </button>
                                    <button onClick={() => distributeSelection("y")} type="button">
                                        <LuAlignCenterVertical size={17} />
                                        Distribute Y
                                    </button>
                                </>
                            ) : null}
                        </div>
                    </div>

                    <div className={`${styles.inspectorSection} ${styles.layerOrderInspectorSection}`}>
                        <h3>Layer Alignment</h3>
                        <div className={styles.layerAlignmentGrid}>
                            <button disabled={!selectedElement || selectedLayerReadOnly} onClick={() => selectedElement && moveLayerById(selectedElement.id, "forward")} type="button">
                                <LuArrowUp size={17} />
                                Move Forward
                            </button>
                            <button disabled={!selectedElement || selectedLayerReadOnly} onClick={() => selectedElement && moveLayerById(selectedElement.id, "front")} type="button">
                                <LuArrowUpToLine size={17} />
                                Move To Front
                            </button>
                            <button disabled={!selectedElement || selectedLayerReadOnly} onClick={() => selectedElement && moveLayerById(selectedElement.id, "backward")} type="button">
                                <LuArrowDown size={17} />
                                Move Backward
                            </button>
                            <button disabled={!selectedElement || selectedLayerReadOnly} onClick={() => selectedElement && moveLayerById(selectedElement.id, "back")} type="button">
                                <LuArrowDownToLine size={17} />
                                Move To Back
                            </button>
                        </div>
                    </div>

                    <div className={`${styles.inspectorSection} ${styles.alignmentInspectorSection}`}>
                        <h3>Alignment With Background</h3>
                        <div className={styles.alignIconRow}>
                            <button aria-label="Align selected layer to left edge" disabled={!selectedElement || selectedLayerReadOnly} onClick={() => alignSelected("left")} type="button"><LuAlignStartVertical size={21} /></button>
                            <button aria-label="Center selected layer horizontally" disabled={!selectedElement || selectedLayerReadOnly} onClick={() => alignSelected("centerX")} type="button"><LuAlignCenterVertical size={21} /></button>
                            <button aria-label="Align selected layer to right edge" disabled={!selectedElement || selectedLayerReadOnly} onClick={() => alignSelected("right")} type="button"><LuAlignEndVertical size={21} /></button>
                            <button aria-label="Center selected layer on background" disabled={!selectedElement || selectedLayerReadOnly} onClick={() => alignSelected("center")} type="button"><LuAlignCenter size={21} /></button>
                            <button aria-label="Align selected layer to top edge" disabled={!selectedElement || selectedLayerReadOnly} onClick={() => alignSelected("top")} type="button"><LuAlignStartHorizontal size={21} /></button>
                            <button aria-label="Center selected layer vertically" disabled={!selectedElement || selectedLayerReadOnly} onClick={() => alignSelected("centerY")} type="button"><LuAlignHorizontalJustifyCenter size={21} /></button>
                            <button aria-label="Align selected layer to bottom edge" disabled={!selectedElement || selectedLayerReadOnly} onClick={() => alignSelected("bottom")} type="button"><LuAlignEndHorizontal size={21} /></button>
                        </div>
                    </div>

                    <div
                        className={`${styles.inspectorSection} ${styles.colorInspectorSection}`}
                        hidden={!(canEditTextElement(selectedElement) || canFillElement(selectedElement) || selectedElement?.type === "line" || selectedElement?.type === "qr")}
                    >
                        <h3>Colors</h3>
                        <div className={styles.swatchGrid}>
                            {COLOR_SWATCHES.map((color) => (
                                <button
                                    aria-label={`Apply ${color}`}
                                    className={styles.swatch}
                                    data-active={selectedColor === color ? "true" : "false"}
                                    key={color}
                                    onClick={() => applyColor(color)}
                                    style={{ background: color }}
                                    type="button"
                                />
                            ))}
                        </div>
                    </div>

                    <div className={`${styles.inspectorSection} ${styles.exportInspectorSection}`}>
                        <h3>Watermark</h3>
                        <label className={styles.checkboxField}>
                            <input
                                checked={Boolean(visibleWatermark.enabled)}
                                onChange={(event) => updateVisibleWatermark({ enabled: event.target.checked })}
                                type="checkbox"
                            />
                            Show on export
                        </label>
                        <label>
                            Text
                            <input
                                disabled={!visibleWatermark.enabled}
                                onChange={(event) => updateVisibleWatermark({ text: event.target.value })}
                                value={visibleWatermark.text}
                            />
                        </label>
                        <div className={styles.fieldGrid}>
                            <label>
                                Position
                                <select
                                    disabled={!visibleWatermark.enabled}
                                    onChange={(event) => updateVisibleWatermark({ position: event.target.value as CreativeEditorVisibleWatermark["position"] })}
                                    value={visibleWatermark.position}
                                >
                                    <option value="bottom-right">Bottom right</option>
                                    <option value="bottom-left">Bottom left</option>
                                    <option value="top-right">Top right</option>
                                    <option value="top-left">Top left</option>
                                    <option value="center">Center</option>
                                    <option value="tiled">Tiled</option>
                                </select>
                            </label>
                            <label>
                                Color
                                <input
                                    disabled={!visibleWatermark.enabled}
                                    onChange={(event) => updateVisibleWatermark({ color: event.target.value })}
                                    type="color"
                                    value={visibleWatermark.color}
                                />
                            </label>
                            <label>
                                Size
                                <input
                                    disabled={!visibleWatermark.enabled}
                                    max={120}
                                    min={10}
                                    onChange={(event) => updateVisibleWatermark({ fontSize: Number(event.target.value) })}
                                    type="number"
                                    value={visibleWatermark.fontSize}
                                />
                            </label>
                            <label>
                                Rotate
                                <input
                                    disabled={!visibleWatermark.enabled}
                                    max={90}
                                    min={-90}
                                    onChange={(event) => updateVisibleWatermark({ rotation: Number(event.target.value) })}
                                    type="number"
                                    value={visibleWatermark.rotation || 0}
                                />
                            </label>
                        </div>
                        <label className={styles.rangeField}>
                            <span>Opacity</span>
                            <input
                                disabled={!visibleWatermark.enabled}
                                max={0.9}
                                min={0.05}
                                onChange={(event) => updateVisibleWatermark({ opacity: Number(event.target.value) })}
                                step={0.01}
                                type="range"
                                value={visibleWatermark.opacity}
                            />
                        </label>
                    </div>

                    <div className={`${styles.inspectorSection} ${styles.advancedInspectorSection}`} hidden={!canGradientElement(selectedElement)}>
                        <h3>Gradient</h3>
                        <label className={styles.checkboxField}>
                            <input
                                checked={Boolean(selectedGradient.enabled)}
                                disabled={!canGradientElement(selectedElement) || selectedElement.locked}
                                onChange={(event) => updateSelectedGradient({ enabled: event.target.checked })}
                                type="checkbox"
                            />
                            Use gradient fill
                        </label>
                        <div className={styles.gradientGrid}>
                            <label>
                                From
                                <input
                                    disabled={!canGradientElement(selectedElement) || selectedElement.locked || !selectedGradient.enabled}
                                    onChange={(event) => updateSelectedGradient({ from: event.target.value })}
                                    type="color"
                                    value={selectedGradient.from}
                                />
                            </label>
                            <label>
                                To
                                <input
                                    disabled={!canGradientElement(selectedElement) || selectedElement.locked || !selectedGradient.enabled}
                                    onChange={(event) => updateSelectedGradient({ to: event.target.value })}
                                    type="color"
                                    value={selectedGradient.to}
                                />
                            </label>
                            <label>
                                Angle
                                <input
                                    disabled={!canGradientElement(selectedElement) || selectedElement.locked || !selectedGradient.enabled}
                                    max={360}
                                    min={0}
                                    onChange={(event) => updateSelectedGradient({ angle: Number(event.target.value) })}
                                    type="number"
                                    value={selectedGradient.angle}
                                />
                            </label>
                        </div>
                        <div className={styles.gradientStopList}>
                            {selectedGradientStops.map((stop, index) => (
                                <div className={styles.gradientStopRow} key={`${stop.color}-${index}`}>
                                    <input
                                        aria-label={`Gradient stop ${index + 1} color`}
                                        disabled={!canGradientElement(selectedElement) || selectedElement.locked || !selectedGradient.enabled}
                                        onChange={(event) => updateGradientStop(index, { color: event.target.value })}
                                        type="color"
                                        value={stop.color}
                                    />
                                    <input
                                        aria-label={`Gradient stop ${index + 1} offset`}
                                        disabled={!canGradientElement(selectedElement) || selectedElement.locked || !selectedGradient.enabled}
                                        max={1}
                                        min={0}
                                        onChange={(event) => updateGradientStop(index, { offset: Number(event.target.value) })}
                                        step={0.01}
                                        type="range"
                                        value={stop.offset}
                                    />
                                    <button
                                        aria-label={`Remove gradient stop ${index + 1}`}
                                        disabled={!canGradientElement(selectedElement) || selectedElement.locked || !selectedGradient.enabled || selectedGradientStops.length <= 2}
                                        onClick={() => removeGradientStop(index)}
                                        type="button"
                                    >
                                        <LuTrash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            <button
                                className={styles.addStopButton}
                                disabled={!canGradientElement(selectedElement) || selectedElement.locked || !selectedGradient.enabled}
                                onClick={addGradientStop}
                                type="button"
                            >
                                <LuPlus size={15} />
                                Add stop
                            </button>
                        </div>
                    </div>

                    <div className={`${styles.inspectorSection} ${styles.advancedInspectorSection}`} hidden={!selectedElement}>
                        <h3>Shadow</h3>
                        <label className={styles.rangeField}>
                            <span>Blur</span>
                            <input
                                disabled={!selectedElement || selectedElement.locked}
                                max={40}
                                min={0}
                                onChange={(event) => updateSelectedShadow({ blur: Number(event.target.value) })}
                                type="range"
                                value={selectedShadow.blur}
                            />
                        </label>
                        <div className={styles.shadowGrid}>
                            <label>
                                Color
                                <input
                                    disabled={!selectedElement || selectedElement.locked}
                                    onChange={(event) => updateSelectedShadow({ color: event.target.value })}
                                    type="color"
                                    value={selectedShadow.color.startsWith("#") ? selectedShadow.color : "#000000"}
                                />
                            </label>
                            <label>
                                X
                                <input
                                    disabled={!selectedElement || selectedElement.locked}
                                    onChange={(event) => updateSelectedShadow({ offsetX: Number(event.target.value) })}
                                    type="number"
                                    value={selectedShadow.offsetX}
                                />
                            </label>
                            <label>
                                Y
                                <input
                                    disabled={!selectedElement || selectedElement.locked}
                                    onChange={(event) => updateSelectedShadow({ offsetY: Number(event.target.value) })}
                                    type="number"
                                    value={selectedShadow.offsetY}
                                />
                            </label>
                        </div>
                    </div>

                    <div className={`${styles.inspectorSection} ${styles.advancedInspectorSection}`} hidden={!selectedElement}>
                        <label className={styles.rangeField}>
                            <span>Angle</span>
                            <input
                                disabled={!selectedElement || selectedElement.locked}
                                max={360}
                                min={0}
                                onChange={(event) => updateSelected({ rotation: Number(event.target.value) })}
                                type="range"
                                value={selectedElement?.rotation || 0}
                            />
                        </label>
                    </div>

                    <div className={`${styles.inspectorSection} ${styles.advancedInspectorSection}`} hidden={selectedElement?.type !== "image"}>
                        <h3>Image Filter</h3>
                        <label className={styles.selectField}>
                            <LuFilter size={16} />
                            <select
                                aria-label="Image filter adjustments"
                                disabled={selectedElement?.type !== "image" || selectedElement.locked}
                                onChange={(event) => updateSelected({ filter: event.target.value as CreativeEditorImageFilter } as Partial<CreativeEditorElement>)}
                                value={selectedImageFilter}
                            >
                                {IMAGE_FILTER_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                        {IMAGE_FILTER_ADJUSTMENTS.map((adjustment) => (
                            <label className={styles.rangeField} key={adjustment.key}>
                                <span>{adjustment.label}</span>
                                <input
                                    disabled={selectedElement?.type !== "image" || selectedElement.locked}
                                    max={adjustment.max}
                                    min={adjustment.min}
                                    onChange={(event) => updateImageAdjustment(adjustment.key, Number(event.target.value))}
                                    step={adjustment.step}
                                    type="range"
                                    value={selectedImageAdjustments[adjustment.key] ?? (adjustment.key === "pixelate" ? 1 : 0)}
                                />
                            </label>
                        ))}
                        <div className={styles.fieldGrid}>
                            <label>
                                Gray mode
                                <select
                                    disabled={selectedElement?.type !== "image" || selectedElement.locked || selectedImageFilter !== "grayscale"}
                                    onChange={(event) => updateImageAdjustment("grayscaleMode", event.target.value as CreativeEditorImageFilterAdjustments["grayscaleMode"])}
                                    value={selectedImageAdjustments.grayscaleMode || "average"}
                                >
                                    {GRAYSCALE_MODE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Remove
                                <input
                                    disabled={selectedElement?.type !== "image" || selectedElement.locked}
                                    onChange={(event) => updateImageAdjustment("removeColor", event.target.value)}
                                    type="color"
                                    value={selectedImageAdjustments.removeColor || "#ffffff"}
                                />
                            </label>
                        </div>
                        <label className={styles.rangeField}>
                            <span>Distance</span>
                            <input
                                disabled={selectedElement?.type !== "image" || selectedElement.locked || !selectedImageAdjustments.removeColor}
                                max={1}
                                min={0}
                                onChange={(event) => updateImageAdjustment("removeColorDistance", Number(event.target.value))}
                                step={0.01}
                                type="range"
                                value={selectedImageAdjustments.removeColorDistance ?? 0.08}
                            />
                        </label>
                        <div className={styles.fieldGrid}>
                            <label>
                                Gamma R
                                <input
                                    disabled={selectedElement?.type !== "image" || selectedElement.locked}
                                    max={3}
                                    min={0.1}
                                    onChange={(event) => updateImageAdjustment("gammaRed", Number(event.target.value))}
                                    step={0.05}
                                    type="number"
                                    value={selectedImageAdjustments.gammaRed ?? 1}
                                />
                            </label>
                            <label>
                                Gamma G
                                <input
                                    disabled={selectedElement?.type !== "image" || selectedElement.locked}
                                    max={3}
                                    min={0.1}
                                    onChange={(event) => updateImageAdjustment("gammaGreen", Number(event.target.value))}
                                    step={0.05}
                                    type="number"
                                    value={selectedImageAdjustments.gammaGreen ?? 1}
                                />
                            </label>
                            <label>
                                Gamma B
                                <input
                                    disabled={selectedElement?.type !== "image" || selectedElement.locked}
                                    max={3}
                                    min={0.1}
                                    onChange={(event) => updateImageAdjustment("gammaBlue", Number(event.target.value))}
                                    step={0.05}
                                    type="number"
                                    value={selectedImageAdjustments.gammaBlue ?? 1}
                                />
                            </label>
                        </div>
                        <label className={styles.checkboxField}>
                            <input
                                checked={selectedElement?.type === "image" && Boolean(selectedElement.outlineEnabled)}
                                disabled={selectedElement?.type !== "image" || selectedElement.locked}
                                onChange={(event) => updateSelected({ outlineEnabled: event.target.checked } as Partial<CreativeEditorElement>)}
                                type="checkbox"
                            />
                            Image outline
                        </label>
                        <div className={styles.fieldGrid}>
                            <label>
                                Outline
                                <input
                                    disabled={selectedElement?.type !== "image" || selectedElement.locked || !selectedElement.outlineEnabled}
                                    onChange={(event) => updateSelected({ outlineColor: event.target.value } as Partial<CreativeEditorElement>)}
                                    type="color"
                                    value={selectedElement?.type === "image" ? selectedElement.outlineColor || selectedStrokeColor : "#ffffff"}
                                />
                            </label>
                            <label>
                                Width
                                <input
                                    disabled={selectedElement?.type !== "image" || selectedElement.locked || !selectedElement.outlineEnabled}
                                    max={64}
                                    min={1}
                                    onChange={(event) => updateSelected({ outlineWidth: Number(event.target.value) } as Partial<CreativeEditorElement>)}
                                    type="number"
                                    value={selectedElement?.type === "image" ? selectedElement.outlineWidth || 8 : 8}
                                />
                            </label>
                        </div>
                        <label className={styles.checkboxField}>
                            <input
                                checked={selectedElement?.type === "image" && Boolean(selectedElement.outlineOnly)}
                                disabled={selectedElement?.type !== "image" || selectedElement.locked || !selectedElement.outlineEnabled}
                                onChange={(event) => updateSelected({ outlineOnly: event.target.checked } as Partial<CreativeEditorElement>)}
                                type="checkbox"
                            />
                            Outline only
                        </label>
                    </div>

                    <div className={`${styles.inspectorSection} ${styles.advancedInspectorSection}`} hidden={!canStrokeElement(selectedElement)}>
                        <h3>Border</h3>
                        <div className={styles.borderGrid}>
                            <label>
                                Type
                                <select
                                    disabled={!canStrokeElement(selectedElement) || selectedElement?.locked}
                                    onChange={(event) => updateSelected({ strokeStyle: event.target.value as CreativeEditorStrokeStyle } as Partial<CreativeEditorElement>)}
                                    value={selectedStrokeStyle}
                                >
                                    {STROKE_STYLE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Cap
                                <select
                                    disabled={!canStrokeElement(selectedElement) || selectedElement?.locked}
                                    onChange={(event) => updateSelected({ strokeLineCap: event.target.value as CreativeEditorStrokeLineCap } as Partial<CreativeEditorElement>)}
                                    value={selectedStrokeLineCap}
                                >
                                    {STROKE_CAP_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Color
                                <input
                                    disabled={!canStrokeElement(selectedElement) || selectedElement?.locked}
                                    onChange={(event) => updateSelected({ stroke: event.target.value } as Partial<CreativeEditorElement>)}
                                    type="color"
                                    value={selectedStrokeColor}
                                />
                            </label>
                            <label>
                                Width
                                <input
                                    disabled={!canStrokeElement(selectedElement) || selectedElement?.locked}
                                    min={0}
                                    onChange={(event) => updateSelected({ strokeWidth: Number(event.target.value) } as Partial<CreativeEditorElement>)}
                                    type="number"
                                    value={selectedStrokeWidth}
                                />
                            </label>
                            {selectedElement?.type === "line" ? (
                                <label>
                                    Arrow
                                    <select
                                        disabled={selectedElement.locked}
                                        onChange={(event) => updateSelected({ arrowStyle: event.target.value as Extract<CreativeEditorElement, { type: "line" }>["arrowStyle"] } as Partial<CreativeEditorElement>)}
                                        value={selectedElement.arrowStyle || "none"}
                                    >
                                        <option value="none">None</option>
                                        <option value="arrow">Arrow</option>
                                        <option value="thin-tail-arrow">Thin tail</option>
                                    </select>
                                </label>
                            ) : null}
                        </div>
                    </div>

                    {selectedElement ? (
                        <div className={`${styles.inspectorSection} ${styles.detailInspectorSection}`}>
                            <h3>Layer details</h3>
                            <label>
                                Name
                                <input
                                    disabled={selectedElement.locked}
                                    onChange={(event) => updateSelected({ name: event.target.value })}
                                    value={selectedElement.name}
                                />
                            </label>
                            <div className={styles.fieldGrid}>
                                <label>
                                    X
                                    <input disabled={selectedElement.locked} onChange={(event) => updateSelected({ x: Number(event.target.value) })} type="number" value={Math.round(selectedElement.x)} />
                                </label>
                                <label>
                                    Y
                                    <input disabled={selectedElement.locked} onChange={(event) => updateSelected({ y: Number(event.target.value) })} type="number" value={Math.round(selectedElement.y)} />
                                </label>
                                <label>
                                    W
                                    <input disabled={selectedElement.locked} min={4} onChange={(event) => updateSelected({ width: Number(event.target.value) })} type="number" value={Math.round(selectedElement.width)} />
                                </label>
                                <label>
                                    H
                                    <input disabled={selectedElement.locked} min={4} onChange={(event) => updateSelected({ height: Number(event.target.value) })} type="number" value={Math.round(selectedElement.height)} />
                                </label>
                            </div>
                            <label className={styles.rangeField}>
                                <span>Opacity</span>
                                <input
                                    disabled={selectedElement.locked}
                                    max={1}
                                    min={0.1}
                                    onChange={(event) => updateSelected({ opacity: Number(event.target.value) })}
                                    step={0.05}
                                    type="range"
                                    value={selectedElement.opacity ?? 1}
                                />
                            </label>
                            {canEditTextElement(selectedElement) ? (
                                <>
                                    <label>
                                        Text
                                        <textarea disabled={selectedElement.locked} onChange={(event) => updateSelected({ text: event.target.value } as Partial<CreativeEditorElement>)} value={selectedElement.text} />
                                    </label>
                                    <div className={styles.textStyleRow} role="group" aria-label="Text style">
                                        <button aria-label="Bold" aria-pressed={selectedElement.fontWeight === "bold" || selectedElement.fontWeight === "800" || selectedElement.fontWeight === "700"}
                                            data-active={selectedElement.fontWeight === "bold" || selectedElement.fontWeight === "800" || selectedElement.fontWeight === "700"}
                                            disabled={selectedElement.locked}
                                            onClick={() => updateSelected({ fontWeight: selectedElement.fontWeight === "bold" || selectedElement.fontWeight === "800" || selectedElement.fontWeight === "700" ? "normal" : "bold" } as Partial<CreativeEditorElement>)}
                                            type="button"
                                        >
                                            <LuBold size={16} />
                                        </button>
                                        <button aria-label="Italic" aria-pressed={selectedElement.fontStyle === "italic"}
                                            data-active={selectedElement.fontStyle === "italic"}
                                            disabled={selectedElement.locked}
                                            onClick={() => updateSelected({ fontStyle: selectedElement.fontStyle === "italic" ? "normal" : "italic" } as Partial<CreativeEditorElement>)}
                                            type="button"
                                        >
                                            <LuItalic size={16} />
                                        </button>
                                        <button aria-label="Underline" aria-pressed={Boolean(selectedElement.underline)}
                                            data-active={selectedElement.underline ? "true" : "false"}
                                            disabled={selectedElement.locked}
                                            onClick={() => updateSelected({ underline: !selectedElement.underline } as Partial<CreativeEditorElement>)}
                                            type="button"
                                        >
                                            <LuUnderline size={16} />
                                        </button>
                                        <button aria-label="Strikethrough" aria-pressed={Boolean(selectedElement.linethrough)}
                                            data-active={selectedElement.linethrough ? "true" : "false"}
                                            disabled={selectedElement.locked}
                                            onClick={() => updateSelected({ linethrough: !selectedElement.linethrough } as Partial<CreativeEditorElement>)}
                                            type="button"
                                        >
                                            <LuStrikethrough size={16} />
                                        </button>
                                    </div>
                                    <div className={styles.fieldGrid}>
                                        <label>
                                            Font
                                            <select
                                                disabled={selectedElement.locked}
                                                onChange={(event) => updateSelected({ fontFamily: event.target.value } as Partial<CreativeEditorElement>)}
                                                value={selectedElement.fontFamily || FONT_FAMILY_OPTIONS[0]}
                                            >
                                                {FONT_FAMILY_OPTIONS.map((fontFamily) => (
                                                    <option key={fontFamily} value={fontFamily}>{fontFamily.split(",")[0]}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label>
                                            Weight
                                            <select
                                                disabled={selectedElement.locked}
                                                onChange={(event) => updateSelected({ fontWeight: event.target.value as typeof FONT_WEIGHT_OPTIONS[number] } as Partial<CreativeEditorElement>)}
                                                value={selectedElement.fontWeight || "700"}
                                            >
                                                {FONT_WEIGHT_OPTIONS.map((weight) => (
                                                    <option key={weight} value={weight}>{weight}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label>
                                            Size
                                            <input disabled={selectedElement.locked} min={8} onChange={(event) => updateSelected({ fontSize: Number(event.target.value) } as Partial<CreativeEditorElement>)} type="number" value={selectedElement.fontSize} />
                                        </label>
                                        <label>
                                            Line
                                            <input
                                                disabled={selectedElement.locked}
                                                max={2.4}
                                                min={0.8}
                                                onChange={(event) => updateSelected({ lineHeight: Number(event.target.value) } as Partial<CreativeEditorElement>)}
                                                step={0.05}
                                                type="number"
                                                value={selectedElement.lineHeight || 1.12}
                                            />
                                        </label>
                                        <label>
                                            Align
                                            <select disabled={selectedElement.locked} onChange={(event) => updateSelected({ align: event.target.value as "center" | "left" | "right" } as Partial<CreativeEditorElement>)} value={selectedElement.align || "left"}>
                                                <option value="left">Left</option>
                                                <option value="center">Center</option>
                                                <option value="right">Right</option>
                                            </select>
                                        </label>
                                        <label>
                                            Spacing
                                            <input
                                                disabled={selectedElement.locked}
                                                max={800}
                                                min={-100}
                                                onChange={(event) => updateSelected({ charSpacing: Number(event.target.value) } as Partial<CreativeEditorElement>)}
                                                type="number"
                                                value={selectedElement.charSpacing || 0}
                                            />
                                        </label>
                                        <label>
                                            Text BG
                                            <input
                                                disabled={selectedElement.locked}
                                                onChange={(event) => updateSelected({ textBackgroundColor: event.target.value } as Partial<CreativeEditorElement>)}
                                                type="color"
                                                value={selectedElement.textBackgroundColor || "#ffffff"}
                                            />
                                        </label>
                                    </div>
                                    {selectedElement.type === "pathText" ? (
                                        <>
                                            <label>
                                                Path
                                                <textarea
                                                    disabled={selectedElement.locked}
                                                    onChange={(event) => updateSelected({ path: event.target.value } as Partial<CreativeEditorElement>)}
                                                    value={selectedElement.path}
                                                />
                                            </label>
                                            <div className={styles.fieldGrid}>
                                                <label>
                                                    Path color
                                                    <input
                                                        disabled={selectedElement.locked}
                                                        onChange={(event) => updateSelected({ pathStroke: event.target.value } as Partial<CreativeEditorElement>)}
                                                        type="color"
                                                        value={selectedElement.pathStroke || "#d7dbdf"}
                                                    />
                                                </label>
                                                <label className={styles.checkboxField}>
                                                    <input
                                                        checked={selectedElement.pathVisible !== false}
                                                        disabled={selectedElement.locked}
                                                        onChange={(event) => updateSelected({ pathVisible: event.target.checked } as Partial<CreativeEditorElement>)}
                                                        type="checkbox"
                                                    />
                                                    Show path
                                                </label>
                                            </div>
                                        </>
                                    ) : null}
                                </>
                            ) : null}
                            {selectedElement.type === "polygon" ? (
                                <label>
                                    Points
                                    <textarea
                                        disabled={selectedElement.locked}
                                        onChange={(event) => {
                                            const points = parsePolygonPoints(event.target.value);
                                            if (points.length >= 3) {
                                                updateSelected({ points } as Partial<CreativeEditorElement>);
                                            }
                                        }}
                                        value={selectedElement.points.map((point) => `${point.x}, ${point.y}`).join("\n")}
                                    />
                                </label>
                            ) : null}
                            {selectedElement.type === "image" ? (
                                <>
                                    <label>
                                        Image URL
                                        <textarea disabled readOnly value={selectedElement.src} />
                                    </label>
                                    <p className={styles.legacyHelperText}>Use Replace image file or the Images panel to change this source safely.</p>
                                    <button
                                        className={styles.inlineActionButton}
                                        disabled={selectedElement.locked}
                                        onClick={() => replaceImageInputRef.current?.click()}
                                        type="button"
                                    >
                                        <LuFileImage size={16} />
                                        Replace image file
                                    </button>
                                </>
                            ) : null}
                            {selectedElement.type === "qr" ? (
                                <>
                                    <label>
                                        QR value
                                        <textarea disabled={selectedElement.locked} onChange={(event) => updateSelected({ value: event.target.value } as Partial<CreativeEditorElement>)} value={selectedElement.value} />
                                    </label>
                                    <div className={styles.fieldGrid}>
                                        <label>
                                            QR color
                                            <input
                                                disabled={selectedElement.locked}
                                                onChange={(event) => updateSelected({ darkColor: event.target.value } as Partial<CreativeEditorElement>)}
                                                type="color"
                                                value={selectedElement.darkColor || "#16231f"}
                                            />
                                        </label>
                                    </div>
                                    {selectedElement.lightColor && selectedElement.lightColor !== "#ffffff" ? (
                                        <button
                                            className={styles.inlineActionButton}
                                            disabled={selectedElement.locked}
                                            onClick={() => updateSelected({ errorCorrectionLevel: "H", lightColor: "#ffffff", margin: 4 } as Partial<CreativeEditorElement>)}
                                            type="button"
                                        >
                                            <LuShieldCheck size={16} />
                                            Reset white scan panel
                                        </button>
                                    ) : (
                                        <p className={styles.legacyHelperText}>QR scan panel stays white for reliable printing.</p>
                                    )}
                                </>
                            ) : null}
                        </div>
                    ) : null}

                    {showInternalExportTools ? (
                        <div className={styles.exportRow}>
                            <button onClick={runReadinessCheck} type="button">
                                <LuShieldCheck size={16} />
                                Check
                            </button>
                            <button disabled={disabledExportFormats.includes("svg")} onClick={() => runExport("svg")} type="button">
                                <LuDownload size={16} />
                                SVG
                            </button>
                            <button disabled={disabledExportFormats.includes("png")} onClick={() => runExport("png")} type="button">
                                <LuDownload size={16} />
                                PNG
                            </button>
                            <button disabled={disabledExportFormats.includes("json")} onClick={() => runExport("json")} type="button">
                                <LuFileJson size={16} />
                                JSON
                            </button>
                            <button onClick={copyPngToClipboard} type="button">
                                <LuCopy size={16} />
                                Copy
                            </button>
                            <button onClick={copyBase64ToClipboard} type="button">
                                <LuHash size={16} />
                                Base64
                            </button>
                            <button disabled={disabledExportFormats.includes("png")} onClick={() => { void downloadExportBundle(); }} type="button">
                                <LuFileImage size={16} />
                                Bundle
                            </button>
                        </div>
                    ) : null}
                    {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
                        </>
                    )}
                </aside>
            </div>
            {previewDataUrl ? (
                <div
                    className={styles.previewOverlay}
                    data-creative-editor-dialog="preview"
                    onKeyDown={trapDialogFocus}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Design preview"
                >
                    <div className={styles.previewDialog}>
                        <div className={styles.previewHeader}>
                            <h2>Preview</h2>
                            <button onClick={closePreviewPanel} ref={previewCloseButtonRef} type="button">Close</button>
                        </div>
                        <img alt={`${documentValue.title} preview`} src={previewDataUrl} />
                    </div>
                </div>
            ) : null}
            {renderShortcutPanel()}
        </section>
    );
}

const SEARCHABLE_EDITOR_TOOL_IDS = new Set<EditorToolId>([
    "templates",
    "illustrations",
    "graphics",
    "characters",
    "images",
    "text",
    "styles",
    "shapes",
    "myStuff",
    "brandKit",
]);
