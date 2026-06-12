"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { IconType } from "react-icons";
import type { fabric } from "fabric";
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
    LuBot,
    LuBoxSelect,
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
    LuGift,
    LuGrid,
    LuGroup,
    LuHand,
    LuHash,
    LuHelpCircle,
    LuHexagon,
    LuHome,
    LuImage,
    LuImport,
    LuItalic,
    LuLayers,
    LuLock,
    LuMaximize,
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
    LuUser2,
    LuZoomIn,
    LuZoomOut,
} from "react-icons/lu";
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
    CreativeEditorDocument,
    CreativeEditorElement,
    CreativeEditorExportResult,
    CreativeEditorGradientStop,
    CreativeEditorImageFilter,
    CreativeEditorImageFilterAdjustments,
    CreativeEditorLinearGradient,
    CreativeEditorStrokeLineCap,
    CreativeEditorStrokeStyle,
    CreativeEditorVisibleWatermark,
} from "./types";
import styles from "./CreativeEditor.module.scss";

type EditorTheme = "light" | "dark";
type EditorToolId =
    | "ai"
    | "templates"
    | "background"
    | "illustrations"
    | "images"
    | "text"
    | "graphics"
    | "characters"
    | "shapes"
    | "qr";
type InteractionMode = "selection" | "grab" | "draw" | "polygon";
type LayerAction = "back" | "backward" | "forward" | "front";
type AlignmentAction = "bottom" | "center" | "centerX" | "centerY" | "left" | "right" | "top";

type EditorTool = {
    disabled?: boolean;
    icon: IconType;
    id: EditorToolId;
    label: string;
};

export interface CreativeEditorProps {
    assetSources?: CreativeEditorAssetSource[];
    initialDocument: CreativeEditorDocument;
    onDocumentChange?: (documentValue: CreativeEditorDocument) => void;
    onExport?: (result: CreativeEditorExportResult) => Promise<void> | void;
    productLabel?: string;
    sourceLabel?: string;
}

const EDITOR_TOOLS: EditorTool[] = [
    { id: "ai", label: "AI Tools", icon: LuBot, disabled: true },
    { id: "templates", label: "Templates", icon: LuGrid },
    { id: "background", label: "Background", icon: LuImage },
    { id: "illustrations", label: "Illustrations", icon: LuBoxSelect },
    { id: "images", label: "Images", icon: LuImage },
    { id: "text", label: "Text", icon: LuType },
    { id: "graphics", label: "Graphics", icon: LuGift },
    { id: "characters", label: "Characters", icon: LuUser2 },
    { id: "shapes", label: "Shapes", icon: LuShapes },
    { id: "qr", label: "QR", icon: LuQrCode },
];

const TOOL_LABELS = EDITOR_TOOLS.reduce<Record<EditorToolId, string>>((labels, tool) => {
    labels[tool.id] = tool.label;
    return labels;
}, {} as Record<EditorToolId, string>);

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

const clampNumber = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const numberInput = (value: number, fallback = 0) => {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
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

const encodeSvgDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

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

const isCreativeEditorDocument = (value: unknown): value is CreativeEditorDocument => {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Partial<CreativeEditorDocument>;
    return Boolean(
        candidate.schemaVersion
        && candidate.canvas
        && typeof candidate.canvas.width === "number"
        && typeof candidate.canvas.height === "number"
        && Array.isArray(candidate.elements)
        && candidate.productContext,
    );
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
    assetSources = [],
    initialDocument,
    onDocumentChange,
    onExport,
    productLabel = "Product",
    sourceLabel = "Blank asset",
}: CreativeEditorProps) {
    const [documentValue, setDocumentValue] = useState<CreativeEditorDocument>(initialDocument);
    const [selectedId, setSelectedIdState] = useState(initialDocument.elements[0]?.id || "");
    const [activeTool, setActiveTool] = useState<EditorToolId>("illustrations");
    const [theme, setTheme] = useState<EditorTheme>("light");
    const [interactionMode, setInteractionModeState] = useState<InteractionMode>("selection");
    const [zoom, setZoom] = useState(0.72);
    const [notice, setNotice] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [svgMarkup, setSvgMarkup] = useState("");
    const [fabricReady, setFabricReady] = useState(false);
    const [historyState, setHistoryState] = useState({ version: 0 });
    const [drawerCollapsed, setDrawerCollapsed] = useState(false);
    const [showGrid, setShowGrid] = useState(true);
    const [previewDataUrl, setPreviewDataUrl] = useState("");

    const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
    const fabricApiRef = useRef<FabricStatic | null>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const jsonInputRef = useRef<HTMLInputElement | null>(null);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const replaceImageInputRef = useRef<HTMLInputElement | null>(null);
    const svgInputRef = useRef<HTMLInputElement | null>(null);
    const documentRef = useRef<CreativeEditorDocument>(initialDocument);
    const selectedIdRef = useRef(selectedId);
    const interactionModeRef = useRef(interactionMode);
    const isLoadingRef = useRef(false);
    const clipboardRef = useRef<fabric.Object | fabric.ActiveSelection | null>(null);
    const historyRef = useRef<CreativeEditorDocument[]>([initialDocument]);
    const historyIndexRef = useRef(0);
    const polygonDraftRef = useRef<{
        points: Array<{ x: number; y: number }>;
        preview: CreativeFabricObject | null;
    }>({ points: [], preview: null });

    const selectedElement = useMemo(
        () => documentValue.elements.find((element) => element.id === selectedId) || null,
        [documentValue.elements, selectedId],
    );
    const canUndo = historyState.version >= 0 && historyIndexRef.current > 0;
    const canRedo = historyState.version >= 0 && historyIndexRef.current < historyRef.current.length - 1;
    const layerList = [...documentValue.elements].reverse();
    const primaryColor = getPrimaryColor(documentValue);
    const scaledWidth = Math.max(180, documentValue.canvas.width * zoom);
    const scaledHeight = Math.max(140, documentValue.canvas.height * zoom);

    const setSelectedId = (id: string) => {
        selectedIdRef.current = id;
        setSelectedIdState(id);
    };

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

    const handlePolygonPointer = (event: fabric.IEvent<Event>) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || interactionModeRef.current !== "polygon") return;
        const pointerEvent = event.e as MouseEvent;
        if (pointerEvent.detail > 1) return;
        const pointer = canvas.getPointer(event.e);
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
        setInteractionModeState(mode);
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const isDrawing = mode === "draw";
        canvas.isDrawingMode = isDrawing;
        if (isDrawing) configureDrawingBrush(canvas);
        canvas.defaultCursor = mode === "grab" ? "grab" : (isDrawing || mode === "polygon") ? "crosshair" : "default";
        canvas.getObjects().forEach((object) => {
            if (isEditableFabricObject(object)) {
                object.selectable = mode === "selection" && !(object as CreativeFabricObject).locked;
            }
        });
        canvas.selection = mode === "selection";
        canvas.requestRenderAll();
        if (mode === "polygon") setNotice("Click points on the canvas, then double-click or press Enter to finish.");
    };

    function pushHistory(documentSnapshot: CreativeEditorDocument) {
        const baseHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
        historyRef.current = [...baseHistory, documentSnapshot].slice(-60);
        historyIndexRef.current = historyRef.current.length - 1;
        setHistoryState((current) => ({ version: current.version + 1 }));
    }

    async function loadDocument(documentSnapshot: CreativeEditorDocument, nextSelectedId = selectedIdRef.current) {
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
            });
            const active = canvas.getActiveObject() as CreativeFabricObject | undefined;
            setSelectedId(active?.id && isEditableFabricObject(active) ? active.id : nextSelectedId || "");
        } catch (error) {
            setNotice(error instanceof Error ? error.message : "Canvas could not load.");
        } finally {
            isLoadingRef.current = false;
        }
    }

    function releaseActiveGroupForPersistence(canvas: fabric.Canvas) {
        const activeObject = canvas.getActiveObject();
        const creativeType = (activeObject as CreativeFabricObject | undefined)?.creativeEditorType;
        if (activeObject?.type === "group" && !creativeType) {
            (activeObject as fabric.Group).toActiveSelection();
            canvas.requestRenderAll();
        }
    }

    function commitDocument(
        next: CreativeEditorDocument,
        recordHistory = true,
        nextSelectedId = selectedIdRef.current,
        reloadCanvas = true,
    ) {
        const stamped = {
            ...next,
            metadata: {
                ...next.metadata,
                updatedAt: new Date().toISOString(),
            },
        };
        documentRef.current = stamped;
        setDocumentValue(stamped);
        setSelectedId(nextSelectedId);
        if (recordHistory) pushHistory(stamped);
        if (reloadCanvas) void loadDocument(stamped, nextSelectedId);
    }

    function syncDocumentFromCanvas(recordHistory = true) {
        const canvas = fabricCanvasRef.current;
        if (!canvas || isLoadingRef.current) return;
        releaseActiveGroupForPersistence(canvas);
        const next = serializeFabricCanvasToDocument(canvas, documentRef.current);
        documentRef.current = next;
        setDocumentValue(next);
        const active = canvas.getActiveObject() as CreativeFabricObject | undefined;
        setSelectedId(active?.id && isEditableFabricObject(active) ? active.id : selectedIdRef.current);
        if (recordHistory) pushHistory(next);
    }

    useEffect(() => {
        documentRef.current = documentValue;
        onDocumentChange?.(documentValue);
    }, [documentValue, onDocumentChange]);

    useEffect(() => {
        let cancelled = false;
        void import("fabric").then(({ fabric: fabricApi }) => {
            if (cancelled || !canvasElementRef.current) return;
            configureCreativeFabric(fabricApi);
            const canvas = new fabricApi.Canvas(canvasElementRef.current, {
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
            initFabricDragging(fabricApi, canvas, () => interactionModeRef.current === "grab");
            initFabricAlignmentGuidelines(fabricApi, canvas, "#45b99f");

            const handleSelection = () => {
                const active = canvas.getActiveObject() as CreativeFabricObject | undefined;
                setSelectedId(active?.id && isEditableFabricObject(active) ? active.id : "");
            };
            const handlePathCreated = (event: fabric.IEvent<Event> & { path?: fabric.Path }) => {
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
                syncDocumentFromCanvas(true);
            };
            canvas.on("selection:created", handleSelection);
            canvas.on("selection:updated", handleSelection);
            canvas.on("selection:cleared", () => setSelectedId(""));
            canvas.on("mouse:down", handlePolygonPointer);
            canvas.on("mouse:dblclick", () => finishPolygonDraft());
            canvas.on("object:modified", () => syncDocumentFromCanvas(true));
            canvas.on("path:created", handlePathCreated);
            void loadDocument(initialDocument, initialDocument.elements[0]?.id || "").then(() => {
                if (!cancelled) setFabricReady(true);
            });
        }).catch((error) => {
            setNotice(error instanceof Error ? error.message : "Fabric could not load.");
        });
        return () => {
            cancelled = true;
            fabricCanvasRef.current?.dispose();
            fabricCanvasRef.current = null;
            fabricApiRef.current = null;
        };
        // Fabric is intentionally initialized once; document changes are loaded through commitDocument.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        documentRef.current = initialDocument;
        historyRef.current = [initialDocument];
        historyIndexRef.current = 0;
        setHistoryState((current) => ({ version: current.version + 1 }));
        setNotice("");
        setImageUrl("");
        setSvgMarkup("");
        setDocumentValue(initialDocument);
        setSelectedId(initialDocument.elements[0]?.id || "");
        void loadDocument(initialDocument, initialDocument.elements[0]?.id || "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialDocument]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const canvas = fabricCanvasRef.current;
            const fabricApi = fabricApiRef.current;
            if (!canvas || !fabricApi || isFormTarget(event.target)) return;
            const isMod = event.metaKey || event.ctrlKey;
            const activeObject = canvas.getActiveObject();
            if (interactionModeRef.current === "polygon" && (event.key === "Enter" || event.key === "Escape")) {
                event.preventDefault();
                if (event.key === "Enter") finishPolygonDraft();
                if (event.key === "Escape") {
                    cancelPolygonDraft();
                    setInteractionMode("selection");
                }
                return;
            }
            if ((event.key === "Backspace" || event.key === "Delete") && activeObject) {
                event.preventDefault();
                canvas.getActiveObjects().filter(isEditableFabricObject).forEach((object) => canvas.remove(object));
                canvas.discardActiveObject();
                canvas.requestRenderAll();
                syncDocumentFromCanvas(true);
                return;
            }
            if (isMod && event.key.toLowerCase() === "a") {
                event.preventDefault();
                const selectableObjects = canvas.getObjects().filter(isEditableFabricObject);
                if (selectableObjects.length) {
                    canvas.discardActiveObject();
                    canvas.setActiveObject(new fabricApi.ActiveSelection(selectableObjects, { canvas }));
                    canvas.requestRenderAll();
                }
                return;
            }
            if (isMod && event.key.toLowerCase() === "c" && activeObject) {
                event.preventDefault();
                activeObject.clone((cloned: fabric.Object | fabric.ActiveSelection) => {
                    clipboardRef.current = cloned;
                }, CREATIVE_EDITOR_FABRIC_ATTRIBUTES);
                return;
            }
            if (isMod && event.key.toLowerCase() === "v" && clipboardRef.current) {
                event.preventDefault();
                clipboardRef.current.clone((cloned: fabric.Object | fabric.ActiveSelection) => {
                    const cloneAsObject = cloned as CreativeFabricObject;
                    cloneAsObject.left = (cloneAsObject.left || 0) + 24;
                    cloneAsObject.top = (cloneAsObject.top || 0) + 24;
                    if ("forEachObject" in cloned) {
                        (cloned as fabric.ActiveSelection).canvas = canvas;
                        (cloned as fabric.ActiveSelection).forEachObject((object) => {
                            const editable = object as CreativeFabricObject;
                            editable.id = buildCreativeEditorId("layer");
                            editable.name = `${editable.name || "Layer"} copy`;
                            canvas.add(object);
                        });
                    } else {
                        cloneAsObject.id = buildCreativeEditorId("layer");
                        cloneAsObject.name = `${cloneAsObject.name || "Layer"} copy`;
                        canvas.add(cloned);
                    }
                    canvas.setActiveObject(cloned);
                    canvas.requestRenderAll();
                    syncDocumentFromCanvas(true);
                }, CREATIVE_EDITOR_FABRIC_ATTRIBUTES);
                return;
            }
            if (isMod && event.key.toLowerCase() === "g" && activeObject) {
                event.preventDefault();
                if (activeObject.type === "activeSelection") {
                    (activeObject as fabric.ActiveSelection).toGroup();
                } else if (activeObject.type === "group") {
                    (activeObject as fabric.Group).toActiveSelection();
                }
                canvas.requestRenderAll();
                syncDocumentFromCanvas(true);
                return;
            }
            if (isMod && event.key.toLowerCase() === "z") {
                event.preventDefault();
                if (event.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                return;
            }
            if (isMod && event.key.toLowerCase() === "y") {
                event.preventDefault();
                redo();
                return;
            }
            if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) && activeObject && isEditableFabricObject(activeObject)) {
                event.preventDefault();
                const delta = event.shiftKey ? 10 : 2;
                const patch = {
                    left: (activeObject.left || 0) + (event.key === "ArrowLeft" ? -delta : event.key === "ArrowRight" ? delta : 0),
                    top: (activeObject.top || 0) + (event.key === "ArrowUp" ? -delta : event.key === "ArrowDown" ? delta : 0),
                };
                activeObject.set(patch);
                activeObject.setCoords();
                canvas.requestRenderAll();
                syncDocumentFromCanvas(true);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });

    const updateDocumentTitle = (title: string) => {
        commitDocument({ ...documentRef.current, title }, true, selectedIdRef.current, false);
    };

    const addElement = (element: CreativeEditorElement) => {
        commitDocument({
            ...documentRef.current,
            elements: [...documentRef.current.elements, element],
        }, true, element.id);
        setNotice(`${element.name} added.`);
    };

    const updateSelected = (patch: Partial<CreativeEditorElement>) => {
        const current = documentRef.current;
        const element = current.elements.find((item) => item.id === selectedIdRef.current);
        if (!element || element.locked) return;
        commitDocument({
            ...current,
            elements: current.elements.map((item) => (
                item.id === element.id ? { ...item, ...patch } as CreativeEditorElement : item
            )),
        }, true, element.id);
    };

    const updateCanvas = (patch: Partial<CreativeEditorDocument["canvas"]>) => {
        const current = documentRef.current;
        const nextWidth = patch.width ?? current.canvas.width;
        const nextHeight = patch.height ?? current.canvas.height;
        const scaleX = nextWidth / current.canvas.width;
        const scaleY = nextHeight / current.canvas.height;
        const resized = patch.width || patch.height;
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
        if (canvas && patch.backgroundColor && !resized) {
            applyCanvasBackground(canvas, patch.backgroundColor);
        }
        commitDocument(next, true, selectedIdRef.current, Boolean(resized));
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
        }, true, selectedIdRef.current);
    };

    const removeSelected = () => {
        const canvas = fabricCanvasRef.current;
        const activeObject = canvas?.getActiveObject();
        if (canvas && activeObject) {
            canvas.getActiveObjects().filter(isEditableFabricObject).forEach((object) => {
                if (!(object as CreativeFabricObject).locked) canvas.remove(object);
            });
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            syncDocumentFromCanvas(true);
            return;
        }
        const element = selectedElement;
        if (!element || element.locked) return;
        const nextElements = documentRef.current.elements.filter((item) => item.id !== element.id);
        commitDocument({ ...documentRef.current, elements: nextElements }, true, nextElements[nextElements.length - 1]?.id || "");
    };

    const duplicateSelected = () => {
        const canvas = fabricCanvasRef.current;
        const activeObject = canvas?.getActiveObject();
        if (!canvas || !activeObject || !isEditableFabricObject(activeObject)) return;
        activeObject.clone((cloned: fabric.Object | fabric.ActiveSelection) => {
            const cloneAsObject = cloned as CreativeFabricObject;
            cloneAsObject.id = buildCreativeEditorId("layer");
            cloneAsObject.name = `${cloneAsObject.name || "Layer"} copy`;
            cloneAsObject.left = (cloneAsObject.left || 0) + 28;
            cloneAsObject.top = (cloneAsObject.top || 0) + 28;
            canvas.add(cloned);
            canvas.setActiveObject(cloned);
            canvas.requestRenderAll();
            syncDocumentFromCanvas(true);
        }, CREATIVE_EDITOR_FABRIC_ATTRIBUTES);
    };

    const toggleSelectedLock = () => {
        const canvas = fabricCanvasRef.current;
        const activeObject = canvas?.getActiveObject() as CreativeFabricObject | undefined;
        if (!canvas || !activeObject || !isEditableFabricObject(activeObject)) return;
        setObjectLocked(activeObject, !activeObject.locked);
        canvas.discardActiveObject();
        if (!activeObject.locked) canvas.setActiveObject(activeObject);
        canvas.requestRenderAll();
        syncDocumentFromCanvas(true);
    };

    const moveLayerById = (id: string, action: LayerAction) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const object = canvas.getObjects().find((item) => (item as CreativeFabricObject).id === id);
        if (!object || !isEditableFabricObject(object)) return;
        if (action === "front") object.bringToFront();
        if (action === "forward") object.bringForward();
        if (action === "backward") object.sendBackwards();
        if (action === "back") object.sendToBack();
        keepWorkspaceAtBack(canvas);
        canvas.setActiveObject(object);
        canvas.requestRenderAll();
        syncDocumentFromCanvas(true);
    };

    const toggleLayer = (id: string, key: "locked" | "visible") => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const object = canvas.getObjects().find((item) => (item as CreativeFabricObject).id === id) as CreativeFabricObject | undefined;
        if (!object || !isEditableFabricObject(object)) return;
        if (key === "locked") {
            setObjectLocked(object, !object.locked);
        } else {
            object.visible = object.visible === false;
        }
        canvas.requestRenderAll();
        syncDocumentFromCanvas(true);
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
    };

    const clearSelection = () => {
        const canvas = fabricCanvasRef.current;
        canvas?.discardActiveObject();
        canvas?.requestRenderAll();
        setSelectedId("");
    };

    const alignSelected = (alignment: AlignmentAction) => {
        const canvas = fabricCanvasRef.current;
        const activeObject = canvas?.getActiveObject() as CreativeFabricObject | undefined;
        if (!canvas || !activeObject || !isEditableFabricObject(activeObject) || activeObject.locked) return;
        const rect = activeObject.getBoundingRect(false, true);
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
        syncDocumentFromCanvas(true);
    };

    const distributeSelection = (axis: "x" | "y") => {
        const canvas = fabricCanvasRef.current;
        const activeObject = canvas?.getActiveObject();
        if (!canvas || !activeObject || activeObject.type !== "activeSelection") {
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
            const aRect = a.getBoundingRect(false, true);
            const bRect = b.getBoundingRect(false, true);
            return axis === "x" ? aRect.left - bRect.left : aRect.top - bRect.top;
        });
        const firstRect = sorted[0].getBoundingRect(false, true);
        const lastRect = sorted[sorted.length - 1].getBoundingRect(false, true);
        const totalSize = sorted.reduce((sum, object) => {
            const rect = object.getBoundingRect(false, true);
            return sum + (axis === "x" ? rect.width : rect.height);
        }, 0);
        const span = axis === "x"
            ? (lastRect.left + lastRect.width) - firstRect.left
            : (lastRect.top + lastRect.height) - firstRect.top;
        const gap = (span - totalSize) / (sorted.length - 1);
        let cursor = axis === "x" ? firstRect.left + firstRect.width + gap : firstRect.top + firstRect.height + gap;
        sorted.slice(1, -1).forEach((object) => {
            const rect = object.getBoundingRect(false, true);
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
        syncDocumentFromCanvas(true);
        setNotice(axis === "x" ? "Layers spaced evenly across." : "Layers spaced evenly down.");
    };

    const applyTemplate = (templateId: CreativeEditorStarterTemplateId) => {
        const next = createCreativeEditorStarterDocument({
            brandName: documentRef.current.metadata?.brand?.name,
            primaryColor: getPrimaryColor(documentRef.current),
            productContext: documentRef.current.productContext,
            templateId,
            title: documentRef.current.title,
        });
        commitDocument(next, true, next.elements[0]?.id || "");
    };

    const startBlankDesign = () => {
        const createdAt = new Date().toISOString();
        const next: CreativeEditorDocument = {
            ...documentRef.current,
            id: buildCreativeEditorId("cedoc"),
            elements: [],
            metadata: {
                ...documentRef.current.metadata,
                createdAt,
                templateId: "blank",
                updatedAt: createdAt,
            },
            title: "Untitled design",
        };
        commitDocument(next, true, "");
        setNotice("New blank design ready.");
    };

    const adoptImportedFabricObjects = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
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
                editable.src = editable.src || (object as fabric.Image).getSrc?.() || "";
            }
        });
    };

    const importFabricJson = async (payload: unknown) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) throw new Error("Canvas is still loading.");
        await new Promise<void>((resolve) => {
            canvas.loadFromJSON(payload, () => {
                adoptImportedFabricObjects();
                canvas.renderAll();
                resolve();
            });
        });
        const next = serializeFabricCanvasToDocument(canvas, {
            ...documentRef.current,
            id: buildCreativeEditorId("cedoc"),
            title: "Imported design",
        });
        commitDocument(next, true, next.elements[0]?.id || "");
        setNotice("Design imported.");
    };

    const importJsonFile = async (file: File) => {
        setNotice("");
        try {
            const text = await readFileAsText(file);
            const payload = JSON.parse(text) as unknown;
            if (isCreativeEditorDocument(payload)) {
                const next: CreativeEditorDocument = {
                    ...payload,
                    productContext: documentRef.current.productContext,
                    metadata: {
                        ...payload.metadata,
                        updatedAt: new Date().toISOString(),
                    },
                };
                commitDocument(next, true, next.elements[0]?.id || "");
                setNotice("Design imported.");
                return;
            }
            if (payload && typeof payload === "object" && "objects" in payload) {
                await importFabricJson(payload);
                return;
            }
            throw new Error("This JSON file is not an editor design.");
        } catch (error) {
            setNotice(error instanceof Error ? error.message : "Design import failed.");
        }
    };

    const importImageFile = async (file: File) => {
        setNotice("");
        try {
            const dataUrl = await readFileAsDataUrl(file);
            addElement(buildCreativeEditorImageElement({
                name: file.name.replace(/\.[^.]+$/, "") || "Imported image",
                src: dataUrl,
                x: Math.round(documentRef.current.canvas.width * 0.28),
                y: Math.round(documentRef.current.canvas.height * 0.22),
            }));
        } catch (error) {
            setNotice(error instanceof Error ? error.message : "Image import failed.");
        }
    };

    const replaceSelectedImageFile = async (file: File) => {
        if (selectedElement?.type !== "image" || selectedElement.locked) return;
        setNotice("");
        try {
            const dataUrl = await readFileAsDataUrl(file);
            updateSelected({
                alt: file.name.replace(/\.[^.]+$/, "") || selectedElement.alt,
                name: file.name.replace(/\.[^.]+$/, "") || selectedElement.name,
                src: dataUrl,
            } as Partial<CreativeEditorElement>);
            setNotice("Image replaced.");
        } catch (error) {
            setNotice(error instanceof Error ? error.message : "Image replace failed.");
        }
    };

    const addSvgMarkup = () => {
        const svg = svgMarkup.trim();
        if (!svg) return;
        if (!svg.includes("<svg")) {
            setNotice("Paste valid SVG markup first.");
            return;
        }
        addElement(buildCreativeEditorImageElement({
            name: "SVG artwork",
            src: encodeSvgDataUri(svg),
            x: Math.round(documentRef.current.canvas.width * 0.28),
            y: Math.round(documentRef.current.canvas.height * 0.22),
        }));
        setSvgMarkup("");
    };

    const handleFileInput = (event: ChangeEvent<HTMLInputElement>, kind: "image" | "json" | "svg") => {
        const files = Array.from(event.target.files || []);
        event.target.value = "";
        if (!files.length) return;
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
        }
    };

    const undo = () => {
        if (historyIndexRef.current <= 0) return;
        historyIndexRef.current -= 1;
        const next = historyRef.current[historyIndexRef.current];
        documentRef.current = next;
        setDocumentValue(next);
        setSelectedId(next.elements.find((element) => element.id === selectedIdRef.current)?.id || next.elements[0]?.id || "");
        setHistoryState((current) => ({ version: current.version + 1 }));
        void loadDocument(next, selectedIdRef.current);
    };

    const redo = () => {
        if (historyIndexRef.current >= historyRef.current.length - 1) return;
        historyIndexRef.current += 1;
        const next = historyRef.current[historyIndexRef.current];
        documentRef.current = next;
        setDocumentValue(next);
        setSelectedId(next.elements.find((element) => element.id === selectedIdRef.current)?.id || next.elements[0]?.id || "");
        setHistoryState((current) => ({ version: current.version + 1 }));
        void loadDocument(next, selectedIdRef.current);
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
                watermark.visible = previousVisible;
                canvas?.requestRenderAll();
            }
        }
    };

    const getLatestDocumentFromCanvas = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return documentRef.current;
        releaseActiveGroupForPersistence(canvas);
        const latestDocument = serializeFabricCanvasToDocument(canvas, documentRef.current);
        documentRef.current = latestDocument;
        setDocumentValue(latestDocument);
        return latestDocument;
    };

    const buildFabricExport = async (type: "png" | "svg"): Promise<CreativeEditorExportResult> => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) throw new Error("Canvas is still loading.");
        const latestDocument = getLatestDocumentFromCanvas();
        if (type === "svg") {
            const svg = withHiddenWatermark(() => canvas.toSVG({
                height: latestDocument.canvas.height,
                viewBox: {
                    height: latestDocument.canvas.height,
                    width: latestDocument.canvas.width,
                    x: 0,
                    y: 0,
                },
                width: latestDocument.canvas.width,
            }));
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
        const dataUrl = withHiddenWatermark(() => canvas.toDataURL({
            enableRetinaScaling: true,
            format: "png",
            height: latestDocument.canvas.height,
            left: 0,
            multiplier: 1,
            quality: 1,
            top: 0,
            width: latestDocument.canvas.width,
        }));
        const filename = buildCreativeEditorFilename(latestDocument, "png");
        triggerDownload(dataUrl, filename);
        return {
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
        return withHiddenWatermark(() => canvas.toDataURL({
            enableRetinaScaling: true,
            format: "png",
            height: latestDocument.canvas.height,
            left: 0,
            multiplier: 1,
            quality: 1,
            top: 0,
            width: latestDocument.canvas.width,
        }));
    };

    const dataUrlToBlob = async (dataUrl: string) => {
        const response = await fetch(dataUrl);
        return response.blob();
    };

    const copyPngToClipboard = async () => {
        setNotice("");
        try {
            const dataUrl = buildCurrentPngDataUrl();
            if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
                throw new Error("Image clipboard is not available in this browser.");
            }
            const blob = await dataUrlToBlob(dataUrl);
            await navigator.clipboard.write([new ClipboardItem({ [blob.type || "image/png"]: blob })]);
            setNotice("PNG copied to clipboard.");
        } catch (error) {
            setNotice(error instanceof Error ? error.message : "Clipboard copy failed.");
        }
    };

    const copyBase64ToClipboard = async () => {
        setNotice("");
        try {
            const dataUrl = buildCurrentPngDataUrl();
            if (!navigator.clipboard?.writeText) throw new Error("Text clipboard is not available in this browser.");
            await navigator.clipboard.writeText(dataUrl);
            setNotice("Base64 PNG copied.");
        } catch (error) {
            setNotice(error instanceof Error ? error.message : "Base64 copy failed.");
        }
    };

    const runExport = async (type: "svg" | "png" | "json") => {
        setNotice("");
        try {
            if (type === "json") {
                const result = await downloadCreativeEditorJson(getLatestDocumentFromCanvas());
                setNotice("Document downloaded.");
                return result;
            }
            const result = await buildFabricExport(type);
            await onExport?.(result);
            setNotice("Asset downloaded.");
            return result;
        } catch (error) {
            setNotice(error instanceof Error ? error.message : "Export failed.");
            return null;
        }
    };

    const registerAsset = async () => {
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
        const dataUrl = withHiddenWatermark(() => canvas.toDataURL({
            enableRetinaScaling: true,
            format: "png",
            height: latestDocument.canvas.height,
            left: 0,
            multiplier: 1,
            quality: 1,
            top: 0,
            width: latestDocument.canvas.width,
        }));
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
        syncDocumentFromCanvas(true);
    };

    const groupSelection = () => {
        const canvas = fabricCanvasRef.current;
        const activeObject = canvas?.getActiveObject();
        if (!canvas || !activeObject || activeObject.type !== "activeSelection") {
            setNotice("Select more than one layer first.");
            return;
        }
        (activeObject as fabric.ActiveSelection).toGroup();
        canvas.requestRenderAll();
        setNotice("Selected layers grouped for this edit.");
    };

    const ungroupSelection = () => {
        const canvas = fabricCanvasRef.current;
        const activeObject = canvas?.getActiveObject();
        if (!canvas || !activeObject || activeObject.type !== "group") {
            setNotice("Select a grouped layer first.");
            return;
        }
        (activeObject as fabric.Group).toActiveSelection();
        canvas.requestRenderAll();
        syncDocumentFromCanvas(true);
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

    const renderCuratedGrid = (assets: Array<{ id: string; label: string; src: string }>) => (
        <div className={styles.assetGrid}>
            {assets.map((asset) => (
                <button
                    aria-label={`Add ${asset.label}`}
                    key={asset.id}
                    onClick={() => addCuratedImage(asset)}
                    type="button"
                >
                    <img alt="" src={asset.src} />
                </button>
            ))}
        </div>
    );

    const renderDrawerContent = () => {
        if (activeTool === "background") {
            return (
                <>
                    <div className={styles.backgroundPreview} style={{ background: documentValue.canvas.backgroundColor }} />
                    <div className={styles.swatchGrid}>
                        {COLOR_SWATCHES.map((color) => (
                            <button
                                aria-label={`Set background ${color}`}
                                className={styles.swatch}
                                key={color}
                                onClick={() => updateCanvas({ backgroundColor: color })}
                                style={{ background: color }}
                                type="button"
                            />
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
            return (
                <>
                    <div className={styles.imageAdder}>
                        <input
                            aria-label="Image URL"
                            onChange={(event) => setImageUrl(event.target.value)}
                            placeholder="https://image..."
                            value={imageUrl}
                        />
                        <button
                            disabled={!imageUrl.trim()}
                            onClick={() => {
                                addElement(buildCreativeEditorImageElement({ src: imageUrl.trim() }));
                                setImageUrl("");
                            }}
                            type="button"
                        >
                            <LuImage size={16} />
                            Add image
                        </button>
                        <textarea
                            aria-label="SVG markup"
                            onChange={(event) => setSvgMarkup(event.target.value)}
                            placeholder="<svg ..."
                            value={svgMarkup}
                        />
                        <button
                            disabled={!svgMarkup.trim()}
                            onClick={addSvgMarkup}
                            type="button"
                        >
                            <LuImport size={16} />
                            Add SVG code
                        </button>
                    </div>
                    {assetSources.length ? (
                        <div className={styles.assetSourceList}>
                            {assetSources.slice(0, 10).map((asset) => (
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
                    ) : null}
                </>
            );
        }
        if (activeTool === "text") {
            return (
                <div className={styles.drawerActionGrid}>
                    <button onClick={() => addElement(buildCreativeEditorTextElement("Headline"))} type="button">
                        <LuType size={18} />
                        Add headline
                    </button>
                    <button onClick={() => addElement(buildCreativeEditorTextElement("Subheading"))} type="button">
                        <LuType size={18} />
                        Add subheading
                    </button>
                    <button onClick={() => addElement(buildCreativeEditorTextElement("Body text"))} type="button">
                        <LuType size={18} />
                        Add body
                    </button>
                    <button onClick={() => addElement(buildCreativeEditorPathTextElement("Curved text"))} type="button">
                        <LuPencil size={18} />
                        Path text
                    </button>
                </div>
            );
        }
        if (activeTool === "shapes") {
            return (
                <div className={styles.drawerActionGrid}>
                    <button onClick={() => addElement(buildCreativeEditorRectElement(primaryColor))} type="button">
                        <LuSquare size={18} />
                        Rectangle
                    </button>
                    <button onClick={() => addElement(buildCreativeEditorEllipseElement(primaryColor))} type="button">
                        <LuCircle size={18} />
                        Circle
                    </button>
                    <button onClick={() => addElement(buildCreativeEditorTriangleElement(primaryColor))} type="button">
                        <LuTriangle size={18} />
                        Triangle
                    </button>
                    <button onClick={() => addElement(buildCreativeEditorLineElement(primaryColor))} type="button">
                        <LuPencil size={18} />
                        Line
                    </button>
                    <button onClick={() => addElement(buildCreativeEditorArrowElement(primaryColor, "arrow"))} type="button">
                        <LuArrowRight size={18} />
                        Arrow
                    </button>
                    <button onClick={() => addElement(buildCreativeEditorArrowElement(primaryColor, "thin-tail-arrow"))} type="button">
                        <LuArrowRight size={18} />
                        Thin arrow
                    </button>
                    <button onClick={() => setInteractionMode("polygon")} type="button">
                        <LuPencil size={18} />
                        Draw polygon
                    </button>
                    <button onClick={() => addElement(buildCreativeEditorHexagonElement(primaryColor))} type="button">
                        <LuHexagon size={18} />
                        Hexagon
                    </button>
                    <button onClick={() => addElement(buildCreativeEditorPentagonElement(primaryColor))} type="button">
                        <LuShapes size={18} />
                        Pentagon
                    </button>
                    <button onClick={() => addElement(buildCreativeEditorStarElement(primaryColor))} type="button">
                        <LuStar size={18} />
                        Star
                    </button>
                    <button onClick={() => addElement(buildCreativeEditorEggElement(primaryColor))} type="button">
                        <LuCircle size={18} />
                        Egg
                    </button>
                </div>
            );
        }
        if (activeTool === "qr") {
            return (
                <div className={styles.drawerActionGrid}>
                    <button
                        onClick={() => addElement(buildCreativeEditorQrElement(documentValue.metadata?.brand?.name || "https://example.com"))}
                        type="button"
                    >
                        <LuQrCode size={18} />
                        QR code
                    </button>
                </div>
            );
        }
        if (activeTool === "templates") {
            return (
                <div className={styles.templateGrid}>
                    {CREATIVE_EDITOR_STARTER_TEMPLATES.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => applyTemplate(template.id)}
                            type="button"
                        >
                            <strong>{template.label}</strong>
                            <span>{template.width} X {template.height}</span>
                        </button>
                    ))}
                </div>
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
        if (patch.from || patch.to) {
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

    return (
        <section className={styles.editorShell} data-theme={theme} aria-label="Creative editor">
            <input
                accept="application/json,.json"
                className={styles.hiddenFileInput}
                onChange={(event) => handleFileInput(event, "json")}
                ref={jsonInputRef}
                type="file"
            />
            <input
                accept="image/png,image/jpeg,image/webp,image/gif"
                className={styles.hiddenFileInput}
                multiple
                onChange={(event) => handleFileInput(event, "image")}
                ref={imageInputRef}
                type="file"
            />
            <input
                accept="image/png,image/jpeg,image/webp,image/gif"
                className={styles.hiddenFileInput}
                onChange={handleReplaceImageInput}
                ref={replaceImageInputRef}
                type="file"
            />
            <input
                accept=".svg,image/svg+xml"
                className={styles.hiddenFileInput}
                multiple
                onChange={(event) => handleFileInput(event, "svg")}
                ref={svgInputRef}
                type="file"
            />
            <header className={styles.topBar}>
                <div className={styles.topLeft}>
                    <div className={styles.productMark} title={productLabel}>
                        <LuLayers size={24} />
                    </div>
                    <button
                        aria-label="Back to product workspace"
                        className={styles.iconButton}
                        onClick={() => setNotice("Use the product workspace navigation to leave the editor. Unsaved exports stay in this browser until downloaded or saved.")}
                        type="button"
                    >
                        <LuHome size={20} />
                    </button>
                    <label className={styles.titleInput} title={sourceLabel}>
                        <LuPencil size={15} />
                        <input
                            aria-label="Your drawing title"
                            onChange={(event) => updateDocumentTitle(event.target.value)}
                            placeholder="Your drawing title"
                            value={documentValue.title}
                        />
                    </label>
                    <button className={styles.newDesignButton} onClick={startBlankDesign} type="button">
                        <LuPlus size={18} />
                        New Design
                    </button>
                </div>
                <div className={styles.topRight}>
                    <div className={styles.dimensionPill}>
                        <LuHash size={18} />
                        {documentValue.canvas.width} X {documentValue.canvas.height}
                    </div>
                    <button aria-label="Import design JSON" className={styles.roundButton} onClick={() => jsonInputRef.current?.click()} type="button">
                        <LuFileInput size={18} />
                    </button>
                    <button aria-label="Import image file" className={styles.roundButton} onClick={() => imageInputRef.current?.click()} type="button">
                        <LuFileImage size={18} />
                    </button>
                    <button aria-label="Import SVG file" className={styles.roundButton} onClick={() => svgInputRef.current?.click()} type="button">
                        <LuImport size={18} />
                    </button>
                    <button
                        aria-label="Toggle grid and rulers"
                        className={styles.roundButton}
                        data-active={showGrid ? "true" : "false"}
                        onClick={() => setShowGrid((value) => !value)}
                        type="button"
                    >
                        <LuGrid size={18} />
                    </button>
                    <button aria-label="Reset design" className={styles.roundButton} onClick={startBlankDesign} type="button">
                        <LuRotateCcw size={18} />
                    </button>
                    <span className={styles.divider} />
                    <button aria-label="Undo" className={styles.roundButton} disabled={!canUndo} onClick={undo} type="button">
                        <LuUndo2 size={18} />
                    </button>
                    <button aria-label="Redo" className={styles.roundButton} disabled={!canRedo} onClick={redo} type="button">
                        <LuRedo2 size={18} />
                    </button>
                    <button
                        aria-label="Toggle theme"
                        className={styles.roundButton}
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        type="button"
                    >
                        {theme === "dark" ? <LuMoon size={18} /> : <LuPalette size={18} />}
                    </button>
                    <button
                        aria-label="Export handoff"
                        className={styles.roundButton}
                        onClick={() => setNotice("Download or copy the asset, then post it manually. Direct provider posting is not connected.")}
                        type="button"
                    >
                        <LuShare2 size={18} />
                    </button>
                    <button
                        aria-label="Preview"
                        className={styles.roundButton}
                        onClick={openPreview}
                        type="button"
                    >
                        <LuEye size={18} />
                    </button>
                    <button className={styles.saveButton} onClick={registerAsset} type="button">
                        <LuUploadCloud size={18} />
                        Save PNG
                    </button>
                </div>
            </header>

            <div className={styles.editorBody} data-drawer-collapsed={drawerCollapsed ? "true" : "false"}>
                <nav className={styles.toolRail} aria-label="Editor tools">
                    {EDITOR_TOOLS.map((tool) => {
                        const Icon = tool.icon;
                        const active = activeTool === tool.id;
                        return (
                            <button
                                className={styles.railButton}
                                data-active={active ? "true" : "false"}
                                disabled={tool.disabled}
                                key={tool.id}
                                onClick={() => {
                                    setActiveTool(tool.id);
                                    setDrawerCollapsed(false);
                                }}
                                title={tool.disabled ? `${tool.label} is not available in this editor` : tool.label}
                                type="button"
                            >
                                <Icon size={29} />
                                <span>{tool.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <aside className={styles.assetDrawer}>
                    <div className={styles.drawerHeader}>
                        <button aria-label="Collapse drawer" onClick={() => setDrawerCollapsed(true)} type="button">
                            <LuArrowLeft size={19} />
                        </button>
                        <h2>{TOOL_LABELS[activeTool]}</h2>
                    </div>
                    <div className={styles.drawerContent}>{renderDrawerContent()}</div>
                </aside>

                <main className={styles.workspaceArea}>
                    <div className={styles.stageScroller} data-grid={showGrid ? "true" : "false"} data-mode={interactionMode}>
                        {showGrid ? (
                            <>
                                <div className={styles.rulerTop} aria-hidden="true" />
                                <div className={styles.rulerLeft} aria-hidden="true" />
                            </>
                        ) : null}
                        <div
                            className={styles.fabricZoomBox}
                            style={{ height: `${scaledHeight}px`, width: `${scaledWidth}px` }}
                        >
                            <div
                                className={styles.fabricScaleNode}
                                style={{
                                    height: `${documentValue.canvas.height}px`,
                                    transform: `scale(${zoom})`,
                                    width: `${documentValue.canvas.width}px`,
                                }}
                            >
                                <canvas
                                    aria-label={documentValue.title}
                                    className={styles.canvasSurface}
                                    height={documentValue.canvas.height}
                                    ref={canvasElementRef}
                                    role="img"
                                    width={documentValue.canvas.width}
                                />
                            </div>
                        </div>
                        {!fabricReady ? <p className={styles.canvasLoading}>Loading editor...</p> : null}
                    </div>
                    <div className={styles.bottomControls}>
                        <button aria-label="Zoom in" onClick={() => setZoom((value) => clampNumber(value + 0.1, 0.2, 1.8))} type="button">
                            <LuZoomIn size={20} />
                        </button>
                        <button aria-label="Zoom out" onClick={() => setZoom((value) => clampNumber(value - 0.1, 0.2, 1.8))} type="button">
                            <LuZoomOut size={20} />
                        </button>
                        <button aria-label="Fit to screen" onClick={() => setZoom(0.72)} type="button">
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
                            <button
                                data-active={interactionMode === "draw" ? "true" : "false"}
                                onClick={() => setInteractionMode("draw")}
                                type="button"
                            >
                                <LuPencil size={18} />
                                Draw
                            </button>
                            <button
                                data-active={interactionMode === "polygon" ? "true" : "false"}
                                onClick={() => setInteractionMode("polygon")}
                                type="button"
                            >
                                <LuShapes size={18} />
                                Polygon
                            </button>
                        </div>
                        <button aria-label="Duplicate selected layer" disabled={!selectedElement} onClick={duplicateSelected} type="button">
                            <LuCopy size={20} />
                        </button>
                        <button aria-label="Help" onClick={() => setNotice("Use the left rail to add content, the canvas to position layers, and the right panel to refine details. Polygon mode finishes with double-click or Enter.")} type="button">
                            <LuHelpCircle size={20} />
                        </button>
                    </div>
                </main>

                <aside className={styles.inspector}>
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
                        <button disabled={!selectedElement} onClick={toggleSelectedLock} type="button">
                            {selectedElement?.locked ? <LuUnlock size={20} /> : <LuLock size={20} />}
                        </button>
                        <button disabled={!selectedElement} onClick={duplicateSelected} type="button">
                            <LuCopy size={20} />
                        </button>
                        <button disabled={!selectedElement || selectedElement.locked} onClick={removeSelected} type="button">
                            <LuTrash2 size={20} />
                        </button>
                    </div>

                    <div className={styles.inspectorSection}>
                        <h3>Quick Tools</h3>
                        <div className={styles.transformActionGrid}>
                            <button onClick={groupSelection} type="button">
                                <LuGroup size={17} />
                                Group
                            </button>
                            <button onClick={ungroupSelection} type="button">
                                <LuUngroup size={17} />
                                Ungroup
                            </button>
                            <button disabled={!selectedElement || selectedElement.locked} onClick={() => flipSelected("x")} type="button">
                                <LuFlipHorizontal2 size={17} />
                                Flip X
                            </button>
                            <button disabled={!selectedElement || selectedElement.locked} onClick={() => flipSelected("y")} type="button">
                                <LuFlipVertical2 size={17} />
                                Flip Y
                            </button>
                            <button onClick={() => distributeSelection("x")} type="button">
                                <LuAlignHorizontalJustifyCenter size={17} />
                                Distribute X
                            </button>
                            <button onClick={() => distributeSelection("y")} type="button">
                                <LuAlignCenterVertical size={17} />
                                Distribute Y
                            </button>
                        </div>
                    </div>

                    <div className={styles.inspectorSection}>
                        <h3>Layer Alignment</h3>
                        <div className={styles.layerAlignmentGrid}>
                            <button disabled={!selectedElement} onClick={() => selectedElement && moveLayerById(selectedElement.id, "forward")} type="button">
                                <LuArrowUp size={17} />
                                Move Forward
                            </button>
                            <button disabled={!selectedElement} onClick={() => selectedElement && moveLayerById(selectedElement.id, "front")} type="button">
                                <LuArrowUpToLine size={17} />
                                Move To Front
                            </button>
                            <button disabled={!selectedElement} onClick={() => selectedElement && moveLayerById(selectedElement.id, "backward")} type="button">
                                <LuArrowDown size={17} />
                                Move Backward
                            </button>
                            <button disabled={!selectedElement} onClick={() => selectedElement && moveLayerById(selectedElement.id, "back")} type="button">
                                <LuArrowDownToLine size={17} />
                                Move To Back
                            </button>
                        </div>
                    </div>

                    <div className={styles.inspectorSection}>
                        <h3>Alignment With Background</h3>
                        <div className={styles.alignIconRow}>
                            <button disabled={!selectedElement} onClick={() => alignSelected("left")} type="button"><LuAlignStartVertical size={21} /></button>
                            <button disabled={!selectedElement} onClick={() => alignSelected("centerX")} type="button"><LuAlignCenterVertical size={21} /></button>
                            <button disabled={!selectedElement} onClick={() => alignSelected("right")} type="button"><LuAlignEndVertical size={21} /></button>
                            <button disabled={!selectedElement} onClick={() => alignSelected("center")} type="button"><LuAlignCenter size={21} /></button>
                            <button disabled={!selectedElement} onClick={() => alignSelected("top")} type="button"><LuAlignStartHorizontal size={21} /></button>
                            <button disabled={!selectedElement} onClick={() => alignSelected("centerY")} type="button"><LuAlignHorizontalJustifyCenter size={21} /></button>
                            <button disabled={!selectedElement} onClick={() => alignSelected("bottom")} type="button"><LuAlignEndHorizontal size={21} /></button>
                        </div>
                    </div>

                    <div className={styles.inspectorSection}>
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

                    <div className={styles.inspectorSection}>
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

                    <div className={styles.inspectorSection}>
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

                    <div className={styles.inspectorSection}>
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

                    <div className={styles.inspectorSection}>
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

                    <div className={styles.inspectorSection}>
                        <h3>Image Filter</h3>
                        <label className={styles.selectField}>
                            <LuFilter size={16} />
                            <select
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

                    <div className={styles.inspectorSection}>
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
                        <div className={styles.inspectorSection}>
                            <h3>Layer</h3>
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
                                        <button
                                            data-active={selectedElement.fontWeight === "bold" || selectedElement.fontWeight === "800" || selectedElement.fontWeight === "700"}
                                            disabled={selectedElement.locked}
                                            onClick={() => updateSelected({ fontWeight: selectedElement.fontWeight === "bold" ? "normal" : "bold" } as Partial<CreativeEditorElement>)}
                                            type="button"
                                        >
                                            <LuBold size={16} />
                                        </button>
                                        <button
                                            data-active={selectedElement.fontStyle === "italic"}
                                            disabled={selectedElement.locked}
                                            onClick={() => updateSelected({ fontStyle: selectedElement.fontStyle === "italic" ? "normal" : "italic" } as Partial<CreativeEditorElement>)}
                                            type="button"
                                        >
                                            <LuItalic size={16} />
                                        </button>
                                        <button
                                            data-active={selectedElement.underline ? "true" : "false"}
                                            disabled={selectedElement.locked}
                                            onClick={() => updateSelected({ underline: !selectedElement.underline } as Partial<CreativeEditorElement>)}
                                            type="button"
                                        >
                                            <LuUnderline size={16} />
                                        </button>
                                        <button
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
                                        <textarea disabled={selectedElement.locked} onChange={(event) => updateSelected({ src: event.target.value } as Partial<CreativeEditorElement>)} value={selectedElement.src} />
                                    </label>
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
                                <label>
                                    QR value
                                    <textarea disabled={selectedElement.locked} onChange={(event) => updateSelected({ value: event.target.value } as Partial<CreativeEditorElement>)} value={selectedElement.value} />
                                </label>
                            ) : null}
                        </div>
                    ) : null}

                    <div className={styles.inspectorSection}>
                        <h3>Layers</h3>
                        <div className={styles.layerList}>
                            {layerList.map((element) => (
                                <div className={styles.layerRow} data-active={selectedId === element.id} key={element.id}>
                                    <button className={styles.layerName} onClick={() => selectLayer(element.id)} type="button">
                                        <span>{element.name}</span>
                                        <small>{element.type}</small>
                                    </button>
                                    <button aria-label="Toggle visible" onClick={() => toggleLayer(element.id, "visible")} type="button">
                                        {element.visible === false ? <LuEyeOff size={14} /> : <LuEye size={14} />}
                                    </button>
                                    <button aria-label="Toggle lock" onClick={() => toggleLayer(element.id, "locked")} type="button">
                                        {element.locked ? <LuLock size={14} /> : <LuUnlock size={14} />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.exportRow}>
                        <button onClick={() => runExport("svg")} type="button">
                            <LuDownload size={16} />
                            SVG
                        </button>
                        <button onClick={() => runExport("png")} type="button">
                            <LuDownload size={16} />
                            PNG
                        </button>
                        <button onClick={() => runExport("json")} type="button">
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
                    </div>
                    {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
                </aside>
            </div>
            {previewDataUrl ? (
                <div className={styles.previewOverlay} role="dialog" aria-modal="true" aria-label="Design preview">
                    <div className={styles.previewDialog}>
                        <div className={styles.previewHeader}>
                            <h2>Preview</h2>
                            <button onClick={() => setPreviewDataUrl("")} type="button">Close</button>
                        </div>
                        <img alt={`${documentValue.title} preview`} src={previewDataUrl} />
                    </div>
                </div>
            ) : null}
        </section>
    );
}
