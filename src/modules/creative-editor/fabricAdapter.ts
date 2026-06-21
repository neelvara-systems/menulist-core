import QRCode from "qrcode";
import { fabric } from "fabric";
import {
    CREATIVE_EDITOR_SCHEMA_VERSION,
    CreativeEditorDocument,
    CreativeEditorElement,
    CreativeEditorElementType,
    CreativeEditorImageFilter,
    CreativeEditorImageFilterAdjustments,
    CreativeEditorLinearGradient,
    CreativeEditorLineArrowStyle,
    CreativeEditorPathTextElement,
    CreativeEditorPathElement,
    CreativeEditorPoint,
    CreativeEditorPolygonElement,
    CreativeEditorSourceRef,
    CreativeEditorStrokeLineCap,
    CreativeEditorStrokeStyle,
    CreativeEditorVisibleWatermark,
} from "./types";

export type FabricStatic = typeof fabric;
export type CreativeFabricObject = fabric.Object & {
    arrowStyle?: CreativeEditorLineArrowStyle;
    creativeEditorType?: CreativeEditorElementType | "visibleWatermark" | "watermark" | "workspace";
    darkColor?: string;
    editorGuide?: boolean;
    excludeFromExport?: boolean;
    gradient?: CreativeEditorLinearGradient;
    imageFilterAdjustments?: CreativeEditorImageFilterAdjustments;
    imageFilter?: CreativeEditorImageFilter;
    id?: string;
    lightColor?: string;
    locked?: boolean;
    name?: string;
    outlineColor?: string;
    outlineEnabled?: boolean;
    outlineOnly?: boolean;
    outlineWidth?: number;
    pathStroke?: string;
    pathVisible?: boolean;
    printFrameId?: string;
    printFrameLocked?: boolean;
    sourceRefs?: CreativeEditorSourceRef[];
    src?: string;
    strokeLineCap?: CreativeEditorStrokeLineCap;
    value?: string;
};

export const CREATIVE_EDITOR_WORKSPACE_ID = "creative-editor-workspace";
export const CREATIVE_EDITOR_WATERMARK_ID = "creative-editor-watermark";
export const CREATIVE_EDITOR_FABRIC_ATTRIBUTES = [
    "creativeEditorType",
    "arrowStyle",
    "darkColor",
    "editorGuide",
    "excludeFromExport",
    "gradient",
    "imageFilterAdjustments",
    "imageFilter",
    "id",
    "lightColor",
    "locked",
    "name",
    "outlineColor",
    "outlineEnabled",
    "outlineOnly",
    "outlineWidth",
    "pathStroke",
    "pathVisible",
    "printFrameId",
    "printFrameLocked",
    "sourceRefs",
    "src",
    "strokeLineCap",
    "value",
];

const DEFAULT_SELECTION_COLOR = "#45b99f";

type FabricTextStyleContext = {
    path?: unknown;
    pathAlign?: string;
    _getFontDeclaration?: (charStyle?: unknown, forMeasuring?: boolean) => string;
};

type FabricTextPrototypeWithBaselinePatch = {
    __creativeEditorBaselinePatched?: boolean;
    _setTextStyles?: (
        this: FabricTextStyleContext,
        ctx: CanvasRenderingContext2D,
        charStyle?: unknown,
        forMeasuring?: boolean,
    ) => void;
};

export const isWorkspaceObject = (object?: fabric.Object | null) => (
    Boolean((object as CreativeFabricObject | undefined)?.creativeEditorType === "workspace")
);

export const isWatermarkObject = (object?: fabric.Object | null) => (
    Boolean((object as CreativeFabricObject | undefined)?.creativeEditorType === "watermark")
);

export const isVisibleWatermarkObject = (object?: fabric.Object | null) => (
    Boolean((object as CreativeFabricObject | undefined)?.creativeEditorType === "visibleWatermark")
);

export const isEditableFabricObject = (object?: fabric.Object | null) => (
    Boolean(object && !isWorkspaceObject(object) && !isWatermarkObject(object) && !isVisibleWatermarkObject(object))
);

function patchFabricTextBaseline(fabricApi: FabricStatic) {
    const prototype = fabricApi.Text?.prototype as FabricTextPrototypeWithBaselinePatch | undefined;
    if (!prototype || prototype.__creativeEditorBaselinePatched || typeof prototype._setTextStyles !== "function") return;

    prototype._setTextStyles = function patchedSetTextStyles(
        this: FabricTextStyleContext,
        ctx: CanvasRenderingContext2D,
        charStyle?: unknown,
        forMeasuring?: boolean,
    ) {
        ctx.textBaseline = "alphabetic";
        if (this.path) {
            if (this.pathAlign === "center") ctx.textBaseline = "middle";
            else if (this.pathAlign === "ascender") ctx.textBaseline = "top";
            else if (this.pathAlign === "descender") ctx.textBaseline = "bottom";
        }
        if (typeof this._getFontDeclaration === "function") {
            ctx.font = this._getFontDeclaration(charStyle, forMeasuring);
        }
    };
    prototype.__creativeEditorBaselinePatched = true;
}

export function configureCreativeFabric(fabricApi: FabricStatic, selectionColor = DEFAULT_SELECTION_COLOR) {
    (fabricApi.Object as unknown as { NUM_FRACTION_DIGITS: number }).NUM_FRACTION_DIGITS = 4;
    (fabricApi as unknown as { SHARED_ATTRIBUTES: string[] }).SHARED_ATTRIBUTES = CREATIVE_EDITOR_FABRIC_ATTRIBUTES;
    patchFabricTextBaseline(fabricApi);
    fabricApi.Object.prototype.set({
        borderColor: selectionColor,
        borderOpacityWhenMoving: 1,
        borderScaleFactor: 2,
        cornerColor: "#ffffff",
        cornerSize: 12,
        cornerStrokeColor: selectionColor,
        cornerStyle: "circle",
        padding: 0,
        transparentCorners: false,
    });
}

export function createWorkspaceObject(fabricApi: FabricStatic, documentValue: CreativeEditorDocument) {
    const workspace = new fabricApi.Rect({
        absolutePositioned: true,
        evented: false,
        excludeFromExport: false,
        fill: createLinearGradientFill(
            fabricApi,
            documentValue.canvas.backgroundGradient,
            documentValue.canvas.width,
            documentValue.canvas.height,
            documentValue.canvas.backgroundColor,
        ),
        hasBorders: false,
        hasControls: false,
        height: documentValue.canvas.height,
        hoverCursor: "default",
        left: 0,
        lockMovementX: true,
        lockMovementY: true,
        name: "Background",
        objectCaching: false,
        selectable: false,
        top: 0,
        width: documentValue.canvas.width,
    }) as CreativeFabricObject;
    workspace.id = CREATIVE_EDITOR_WORKSPACE_ID;
    workspace.creativeEditorType = "workspace";
    workspace.gradient = documentValue.canvas.backgroundGradient;
    return workspace;
}

export function findWorkspaceObject(canvas: fabric.Canvas) {
    return canvas.getObjects().find(isWorkspaceObject) as CreativeFabricObject | undefined;
}

export function keepWorkspaceAtBack(canvas: fabric.Canvas) {
    const workspace = findWorkspaceObject(canvas);
    if (workspace) workspace.sendToBack();
}

function setFabricCanvasBackground(canvas: fabric.Canvas, color: string) {
    (canvas as unknown as { backgroundColor?: string }).backgroundColor = color;
    const canvasWithElements = canvas as unknown as {
        lowerCanvasEl?: HTMLCanvasElement;
        upperCanvasEl?: HTMLCanvasElement;
        wrapperEl?: HTMLElement;
    };
    if (canvasWithElements.lowerCanvasEl) canvasWithElements.lowerCanvasEl.style.backgroundColor = color;
    if (canvasWithElements.upperCanvasEl) canvasWithElements.upperCanvasEl.style.backgroundColor = "transparent";
    if (canvasWithElements.wrapperEl) canvasWithElements.wrapperEl.style.backgroundColor = color;
}

function applyBaseObjectData(fabricApi: FabricStatic, object: CreativeFabricObject, element: CreativeEditorElement) {
    object.id = element.id;
    object.name = element.name;
    object.creativeEditorType = element.type;
    object.gradient = "gradient" in element ? element.gradient : undefined;
    object.arrowStyle = "arrowStyle" in element ? element.arrowStyle : undefined;
    object.strokeLineCap = "strokeLineCap" in element ? element.strokeLineCap : undefined;
    object.pathStroke = "pathStroke" in element ? element.pathStroke : undefined;
    object.pathVisible = "pathVisible" in element ? element.pathVisible : undefined;
    object.outlineColor = "outlineColor" in element ? element.outlineColor : undefined;
    object.outlineEnabled = "outlineEnabled" in element ? element.outlineEnabled : undefined;
    object.outlineOnly = "outlineOnly" in element ? element.outlineOnly : undefined;
    object.outlineWidth = "outlineWidth" in element ? element.outlineWidth : undefined;
    object.editorGuide = element.editorGuide;
    object.excludeFromExport = element.excludeFromExport;
    object.printFrameId = element.printFrameId;
    object.printFrameLocked = element.printFrameLocked;
    object.sourceRefs = element.sourceRefs;
    const locked = Boolean(element.locked || element.printFrameLocked);
    object.locked = locked;
    object.visible = element.visible !== false;
    object.opacity = element.opacity ?? 1;
    object.angle = element.rotation || 0;
    object.flipX = Boolean(element.flipX);
    object.flipY = Boolean(element.flipY);
    object.selectable = true;
    object.evented = true;
    object.hasControls = !locked;
    object.lockMovementX = locked;
    object.lockMovementY = locked;
    object.lockScalingX = locked;
    object.lockScalingY = locked;
    object.lockRotation = locked;
    if (element.shadow) {
        object.shadow = new fabricApi.Shadow({
            blur: element.shadow.blur,
            color: element.shadow.color,
            offsetX: element.shadow.offsetX,
            offsetY: element.shadow.offsetY,
        });
    } else if (element.blur) {
        object.shadow = new fabricApi.Shadow({
            blur: element.blur,
            color: "rgba(0,0,0,0.22)",
            offsetX: 0,
            offsetY: 0,
        });
    }
}

function createLinearGradientFill(
    fabricApi: FabricStatic,
    gradient: CreativeEditorLinearGradient | undefined,
    width: number,
    height: number,
    fallback: string,
) {
    if (!gradient?.enabled) return fallback;
    const colorStops = (gradient.stops && gradient.stops.length >= 2 ? gradient.stops : [
        { color: gradient.from, offset: 0 },
        { color: gradient.to, offset: 1 },
    ])
        .filter((stop) => typeof stop.color === "string" && Number.isFinite(stop.offset))
        .map((stop) => ({
            color: stop.color,
            offset: Math.max(0, Math.min(1, stop.offset)),
        }))
        .sort((a, b) => a.offset - b.offset);
    const angle = -gradient.angle * (Math.PI / 180);
    const coords = {
        x1: Math.round(50 + Math.sin(angle) * 50) / 100,
        x2: Math.round(50 + Math.sin(angle + Math.PI) * 50) / 100,
        y1: Math.round(50 + Math.cos(angle) * 50) / 100,
        y2: Math.round(50 + Math.cos(angle + Math.PI) * 50) / 100,
    };
    return new fabricApi.Gradient({
        colorStops: colorStops.length >= 2 ? colorStops : [
            { color: gradient.from, offset: 0 },
            { color: gradient.to, offset: 1 },
        ],
        coords: {
            x1: coords.x1 * width,
            x2: coords.x2 * width,
            y1: coords.y1 * height,
            y2: coords.y2 * height,
        },
        gradientUnits: "pixels",
        type: "linear",
    });
}

function getGradientFallback(fill: unknown, fallback: string) {
    if (typeof fill === "string") return fill;
    const gradient = fill as { colorStops?: Array<{ color?: string; offset?: number }> } | undefined;
    return gradient?.colorStops?.[0]?.color || fallback;
}

function getGradientFromFabricObject(object: CreativeFabricObject): CreativeEditorLinearGradient | undefined {
    if (object.gradient?.enabled) return object.gradient;
    const fill = object.fill as { colorStops?: Array<{ color?: string; offset?: number }> } | undefined;
    const stops = fill?.colorStops;
    if (!stops || stops.length < 2) return undefined;
    const normalizedStops = stops.map((stop) => ({
        color: stop.color || "#ffffff",
        offset: Math.max(0, Math.min(1, Number(stop.offset || 0))),
    }));
    return {
        angle: object.gradient?.angle ?? 90,
        enabled: true,
        from: normalizedStops[0]?.color || "#ffffff",
        stops: normalizedStops,
        to: normalizedStops[normalizedStops.length - 1]?.color || "#000000",
    };
}

function hasAdjustmentValue(value: number | undefined, defaultValue = 0) {
    return typeof value === "number" && Number.isFinite(value) && value !== defaultValue;
}

function applyImageFilter(
    fabricApi: FabricStatic,
    image: fabric.Image,
    filter?: CreativeEditorImageFilter,
    adjustments?: CreativeEditorImageFilterAdjustments,
) {
    const nextFilter = filter || "none";
    const filtersApi = fabricApi.Image.filters as unknown as {
        BlackWhite?: new () => fabric.IBaseFilter;
        Blur?: new (options: { blur: number }) => fabric.IBaseFilter;
        Brightness?: new (options: { brightness: number }) => fabric.IBaseFilter;
        Brownie?: new () => fabric.IBaseFilter;
        Contrast?: new (options: { contrast: number }) => fabric.IBaseFilter;
        Gamma?: new (options: { gamma: [number, number, number] }) => fabric.IBaseFilter;
        Grayscale?: new (options?: { mode?: "average" | "lightness" | "luminosity" }) => fabric.IBaseFilter;
        HueRotation?: new (options: { rotation: number }) => fabric.IBaseFilter;
        Invert?: new () => fabric.IBaseFilter;
        Kodachrome?: new () => fabric.IBaseFilter;
        Noise?: new (options: { noise: number }) => fabric.IBaseFilter;
        Pixelate?: new (options: { blocksize: number }) => fabric.IBaseFilter;
        Polaroid?: new () => fabric.IBaseFilter;
        RemoveColor?: new (options: { color: string; distance: number }) => fabric.IBaseFilter;
        Saturation?: new (options: { saturation: number }) => fabric.IBaseFilter;
        Sepia?: new () => fabric.IBaseFilter;
        Technicolor?: new () => fabric.IBaseFilter;
        Vibrance?: new (options: { vibrance: number }) => fabric.IBaseFilter;
        Vintage?: new () => fabric.IBaseFilter;
    };
    const filters: fabric.IBaseFilter[] = [];
    if (nextFilter === "blackwhite" && filtersApi.BlackWhite) filters.push(new filtersApi.BlackWhite());
    if (nextFilter === "brownie" && filtersApi.Brownie) filters.push(new filtersApi.Brownie());
    if (nextFilter === "grayscale" && filtersApi.Grayscale) filters.push(new filtersApi.Grayscale({ mode: adjustments?.grayscaleMode || "average" }));
    if (nextFilter === "invert" && filtersApi.Invert) filters.push(new filtersApi.Invert());
    if (nextFilter === "kodachrome" && filtersApi.Kodachrome) filters.push(new filtersApi.Kodachrome());
    if (nextFilter === "polaroid" && filtersApi.Polaroid) filters.push(new filtersApi.Polaroid());
    if (nextFilter === "sepia" && filtersApi.Sepia) filters.push(new filtersApi.Sepia());
    if (nextFilter === "technicolor" && filtersApi.Technicolor) filters.push(new filtersApi.Technicolor());
    if (nextFilter === "vintage" && filtersApi.Vintage) filters.push(new filtersApi.Vintage());
    if (adjustments) {
        if (hasAdjustmentValue(adjustments.brightness) && filtersApi.Brightness) filters.push(new filtersApi.Brightness({ brightness: adjustments.brightness! }));
        if (hasAdjustmentValue(adjustments.contrast) && filtersApi.Contrast) filters.push(new filtersApi.Contrast({ contrast: adjustments.contrast! }));
        if (hasAdjustmentValue(adjustments.saturation) && filtersApi.Saturation) filters.push(new filtersApi.Saturation({ saturation: adjustments.saturation! }));
        if (hasAdjustmentValue(adjustments.vibrance) && filtersApi.Vibrance) filters.push(new filtersApi.Vibrance({ vibrance: adjustments.vibrance! }));
        if (hasAdjustmentValue(adjustments.hueRotation) && filtersApi.HueRotation) filters.push(new filtersApi.HueRotation({ rotation: adjustments.hueRotation! }));
        if (hasAdjustmentValue(adjustments.blur) && filtersApi.Blur) filters.push(new filtersApi.Blur({ blur: adjustments.blur! }));
        if (hasAdjustmentValue(adjustments.noise) && filtersApi.Noise) filters.push(new filtersApi.Noise({ noise: adjustments.noise! }));
        if (hasAdjustmentValue(adjustments.pixelate, 1) && filtersApi.Pixelate) filters.push(new filtersApi.Pixelate({ blocksize: Math.max(1, adjustments.pixelate!) }));
        if (adjustments.removeColor && filtersApi.RemoveColor) {
            filters.push(new filtersApi.RemoveColor({
                color: adjustments.removeColor,
                distance: Math.max(0, Math.min(1, adjustments.removeColorDistance ?? 0.08)),
            }));
        }
        const hasGamma = hasAdjustmentValue(adjustments.gammaRed, 1)
            || hasAdjustmentValue(adjustments.gammaGreen, 1)
            || hasAdjustmentValue(adjustments.gammaBlue, 1);
        if (hasGamma && filtersApi.Gamma) {
            filters.push(new filtersApi.Gamma({
                gamma: [
                    Math.max(0.01, adjustments.gammaRed ?? 1),
                    Math.max(0.01, adjustments.gammaGreen ?? 1),
                    Math.max(0.01, adjustments.gammaBlue ?? 1),
                ],
            }));
        }
    }
    image.filters = filters;
    image.applyFilters();
    (image as CreativeFabricObject).imageFilter = nextFilter;
    (image as CreativeFabricObject).imageFilterAdjustments = adjustments;
}

const getDashArray = (strokeStyle?: CreativeEditorStrokeStyle, strokeWidth = 1) => {
    if (strokeStyle === "dashed" || strokeStyle === "dashed-round") return [Math.max(6, strokeWidth * 4), Math.max(4, strokeWidth * 3)];
    if (strokeStyle === "long-dashed" || strokeStyle === "long-dashed-round") return [Math.max(12, strokeWidth * 7), Math.max(5, strokeWidth * 3)];
    if (strokeStyle === "dash-dot" || strokeStyle === "dash-dot-round") return [Math.max(9, strokeWidth * 5), Math.max(4, strokeWidth * 2), Math.max(2, strokeWidth), Math.max(4, strokeWidth * 2)];
    if (strokeStyle === "dotted" || strokeStyle === "dotted-round") return [Math.max(1, strokeWidth), Math.max(4, strokeWidth * 2.5)];
    return undefined;
};

const getStrokeLineCap = (
    strokeStyle?: CreativeEditorStrokeStyle,
    explicit?: CreativeEditorStrokeLineCap,
): CreativeEditorStrokeLineCap => {
    if (explicit) return explicit;
    if (strokeStyle?.endsWith("-round")) return "round";
    if (strokeStyle === "dotted") return "round";
    return "butt";
};

const getStrokeStyleFromDash = (
    dash?: number[] | null,
    lineCap?: string,
): CreativeEditorStrokeStyle => {
    if (!dash || dash.length === 0) return "solid";
    const isRound = lineCap === "round";
    if (dash.length >= 4) return isRound ? "dash-dot-round" : "dash-dot";
    if (dash[0] >= 24) return isRound ? "long-dashed-round" : "long-dashed";
    if (dash[0] <= 4) return isRound ? "dotted-round" : "dotted";
    return isRound ? "dashed-round" : "dashed";
};

const serializeFabricPath = (pathValue: fabric.Path["path"] | unknown) => {
    if (!Array.isArray(pathValue)) return "";

    return pathValue
        .map((segment) => {
            if (Array.isArray(segment)) return segment.join(" ");
            if (segment && typeof segment === "object" && "x" in segment && "y" in segment) {
                const point = segment as CreativeEditorPoint;
                return `${point.x} ${point.y}`;
            }
            return String(segment ?? "");
        })
        .filter(Boolean)
        .join(" ");
};

function scaleObjectToElementSize(object: fabric.Object, width: number, height: number) {
    const naturalWidth = object.width || width;
    const naturalHeight = object.height || height;
    object.set({
        scaleX: naturalWidth ? width / naturalWidth : 1,
        scaleY: naturalHeight ? height / naturalHeight : 1,
    });
}

async function loadFabricImage(fabricApi: FabricStatic, src: string, options: fabric.IObjectOptions = {}) {
    return new Promise<fabric.Image>((resolve, reject) => {
        const imageOptions = src.startsWith("data:") || src.startsWith("blob:")
            ? undefined
            : { crossOrigin: "anonymous" as const };
        fabricApi.Image.fromURL(
            src,
            (image) => {
                if (!image) {
                    reject(new Error("Image could not be loaded."));
                    return;
                }
                image.set(options);
                resolve(image);
            },
            imageOptions,
        );
    });
}

async function buildOutlinedImageSrc(element: Extract<CreativeEditorElement, { type: "image" }>) {
    if (!element.outlineEnabled || typeof document === "undefined") return element.src;
    return new Promise<string>((resolve) => {
        const image = document.createElement("img");
        image.crossOrigin = "anonymous";
        image.onload = () => {
            const width = Math.max(1, image.naturalWidth || image.width || element.width);
            const height = Math.max(1, image.naturalHeight || image.height || element.height);
            const outlineWidth = Math.max(1, Math.round(element.outlineWidth || 8));
            const canvas = document.createElement("canvas");
            canvas.width = width + outlineWidth * 2;
            canvas.height = height + outlineWidth * 2;
            const context = canvas.getContext("2d");
            if (!context) {
                resolve(element.src);
                return;
            }
            const color = element.outlineColor || element.stroke || "#ffffff";
            context.save();
            context.shadowColor = color;
            context.shadowBlur = outlineWidth;
            for (let index = 0; index < 8; index += 1) {
                const angle = (Math.PI * 2 * index) / 8;
                context.shadowOffsetX = Math.cos(angle) * outlineWidth;
                context.shadowOffsetY = Math.sin(angle) * outlineWidth;
                context.drawImage(image, outlineWidth, outlineWidth, width, height);
            }
            context.restore();
            if (!element.outlineOnly) {
                context.drawImage(image, outlineWidth, outlineWidth, width, height);
            }
            try {
                resolve(canvas.toDataURL("image/png"));
            } catch {
                resolve(element.src);
            }
        };
        image.onerror = () => resolve(element.src);
        image.src = element.src;
    });
}

function createLineObject(fabricApi: FabricStatic, element: Extract<CreativeEditorElement, { type: "line" }>) {
    const strokeStyle = element.strokeStyle || "solid";
    const strokeWidth = element.strokeWidth || 4;
    const strokeLineCap = getStrokeLineCap(strokeStyle, element.strokeLineCap || "round");
    if (!element.arrowStyle || element.arrowStyle === "none") {
        return new fabricApi.Line([element.x, element.y, element.x + element.width, element.y + element.height], {
            fill: element.stroke,
            stroke: element.stroke,
            strokeDashArray: getDashArray(strokeStyle, strokeWidth),
            strokeLineCap,
            strokeWidth,
        }) as CreativeFabricObject;
    }

    const angle = Math.atan2(element.height, element.width) * (180 / Math.PI);
    const headSize = element.arrowStyle === "thin-tail-arrow" ? Math.max(18, strokeWidth * 4) : Math.max(24, strokeWidth * 4.5);
    const line = new fabricApi.Line([0, 0, element.width, element.height], {
        fill: element.stroke,
        stroke: element.stroke,
        strokeDashArray: getDashArray(strokeStyle, strokeWidth),
        strokeLineCap,
        strokeWidth,
    });
    const head = new fabricApi.Triangle({
        angle: angle + 90,
        fill: element.stroke,
        height: headSize,
        left: element.width,
        originX: "center",
        originY: "center",
        stroke: element.stroke,
        strokeWidth: 0,
        top: element.height,
        width: headSize,
    });
    const group = new fabricApi.Group([line, head], {
        left: element.x,
        objectCaching: false,
        top: element.y,
    }) as CreativeFabricObject;
    group.stroke = element.stroke;
    group.strokeDashArray = getDashArray(strokeStyle, strokeWidth);
    group.strokeLineCap = strokeLineCap;
    group.strokeWidth = strokeWidth;
    return group;
}

function createPathTextObject(fabricApi: FabricStatic, element: CreativeEditorPathTextElement) {
    const path = new fabricApi.Path(element.path, {
        fill: "",
        left: 0,
        stroke: "transparent",
        strokeWidth: 0,
        top: 0,
    });
    const textTop = element.pathVisible === false ? element.y : Math.max(0, element.height * 0.22);
    const text = new fabricApi.Textbox(element.text, {
        charSpacing: element.charSpacing || 0,
        fill: createLinearGradientFill(fabricApi, element.gradient, element.width, element.height, element.color),
        fontFamily: element.fontFamily || "Inter, Arial, sans-serif",
        fontSize: element.fontSize,
        fontStyle: element.fontStyle || "normal",
        fontWeight: element.fontWeight || "700",
        left: element.pathVisible === false ? element.x : 0,
        lineHeight: element.lineHeight || 1.12,
        linethrough: Boolean(element.linethrough),
        objectCaching: false,
        textAlign: element.align || "center",
        textBackgroundColor: element.textBackgroundColor || "",
        top: textTop,
        underline: Boolean(element.underline),
        width: element.width,
    } as fabric.ITextboxOptions) as unknown as CreativeFabricObject & { path?: fabric.Path };
    text.height = Math.max(1, element.height - textTop);
    if (element.pathVisible !== false) {
        const guide = new fabricApi.Path(element.path, {
            evented: false,
            fill: "",
            left: 0,
            selectable: false,
            stroke: element.pathStroke || "#d7dbdf",
            strokeDashArray: [6, 5],
            strokeLineCap: "round",
            strokeWidth: 1,
            top: 0,
        });
        const group = new fabricApi.Group([guide, text], {
            left: element.x,
            objectCaching: false,
            top: element.y,
        }) as CreativeFabricObject;
        group.stroke = element.stroke || "transparent";
        group.strokeWidth = element.strokeWidth || 0;
        return group;
    }
    return text;
}

async function createObjectFromElement(
    fabricApi: FabricStatic,
    element: CreativeEditorElement,
): Promise<CreativeFabricObject> {
    const baseOptions: fabric.IObjectOptions = {
        left: element.x,
        objectCaching: false,
        top: element.y,
    };
    let object: CreativeFabricObject;
    if (element.type === "text") {
        object = new fabricApi.Textbox(element.text, {
            ...baseOptions,
            charSpacing: element.charSpacing || 0,
            fill: createLinearGradientFill(fabricApi, element.gradient, element.width, element.height, element.color),
            fontFamily: element.fontFamily || "Inter, Arial, sans-serif",
            fontSize: element.fontSize,
            fontWeight: element.fontWeight || "700",
            fontStyle: element.fontStyle || "normal",
            height: element.height,
            lineHeight: element.lineHeight || 1.12,
            linethrough: Boolean(element.linethrough),
            splitByGrapheme: true,
            textBackgroundColor: element.textBackgroundColor || "",
            textAlign: element.align || "left",
            underline: Boolean(element.underline),
            width: element.width,
        }) as CreativeFabricObject;
    } else if (element.type === "pathText") {
        object = createPathTextObject(fabricApi, element);
    } else if (element.type === "rect") {
        object = new fabricApi.Rect({
            ...baseOptions,
            fill: createLinearGradientFill(fabricApi, element.gradient, element.width, element.height, element.fill),
            height: element.height,
            rx: element.radius || 0,
            ry: element.radius || 0,
            stroke: element.stroke || "transparent",
            strokeDashArray: getDashArray(element.strokeStyle, element.strokeWidth || 1),
            strokeLineCap: getStrokeLineCap(element.strokeStyle, element.strokeLineCap),
            strokeWidth: element.strokeWidth || 0,
            width: element.width,
        }) as CreativeFabricObject;
    } else if (element.type === "ellipse") {
        object = new fabricApi.Ellipse({
            ...baseOptions,
            fill: createLinearGradientFill(fabricApi, element.gradient, element.width, element.height, element.fill),
            rx: element.width / 2,
            ry: element.height / 2,
            stroke: element.stroke || "transparent",
            strokeDashArray: getDashArray(element.strokeStyle, element.strokeWidth || 1),
            strokeLineCap: getStrokeLineCap(element.strokeStyle, element.strokeLineCap),
            strokeWidth: element.strokeWidth || 0,
        }) as CreativeFabricObject;
    } else if (element.type === "triangle") {
        object = new fabricApi.Triangle({
            ...baseOptions,
            fill: createLinearGradientFill(fabricApi, element.gradient, element.width, element.height, element.fill),
            height: element.height,
            stroke: element.stroke || "transparent",
            strokeDashArray: getDashArray(element.strokeStyle, element.strokeWidth || 1),
            strokeLineCap: getStrokeLineCap(element.strokeStyle, element.strokeLineCap),
            strokeWidth: element.strokeWidth || 0,
            width: element.width,
        }) as CreativeFabricObject;
    } else if (element.type === "line") {
        object = createLineObject(fabricApi, element);
    } else if (element.type === "polygon") {
        object = new fabricApi.Polygon(element.points, {
            ...baseOptions,
            fill: createLinearGradientFill(fabricApi, element.gradient, element.width, element.height, element.fill),
            stroke: element.stroke || "transparent",
            strokeDashArray: getDashArray(element.strokeStyle, element.strokeWidth || 1),
            strokeLineCap: getStrokeLineCap(element.strokeStyle, element.strokeLineCap),
            strokeLineJoin: "round",
            strokeWidth: element.strokeWidth || 0,
        }) as CreativeFabricObject;
        scaleObjectToElementSize(object, element.width, element.height);
    } else if (element.type === "path") {
        object = new fabricApi.Path(element.path, {
            ...baseOptions,
            fill: createLinearGradientFill(fabricApi, element.gradient, element.width, element.height, element.fill),
            stroke: element.stroke || "transparent",
            strokeDashArray: getDashArray(element.strokeStyle, element.strokeWidth || 1),
            strokeLineCap: getStrokeLineCap(element.strokeStyle, element.strokeLineCap),
            strokeLineJoin: "round",
            strokeWidth: element.strokeWidth || 0,
        }) as CreativeFabricObject;
        scaleObjectToElementSize(object, element.width, element.height);
    } else {
        const src = element.type === "qr"
            ? await QRCode.toDataURL(element.value || "https://example.com", {
                color: {
                    dark: element.darkColor || "#16231f",
                    light: element.lightColor || "#ffffff",
                },
                margin: 1,
                width: Math.max(128, Math.round(Math.max(element.width, element.height))),
            })
            : await buildOutlinedImageSrc(element);
        const image = await loadFabricImage(fabricApi, src, baseOptions);
        scaleObjectToElementSize(image, element.width, element.height);
        object = image as CreativeFabricObject;
        object.src = element.type === "image" ? element.src : src;
        if (element.type === "image") {
            image.set({
                stroke: element.stroke || "transparent",
                strokeDashArray: getDashArray(element.strokeStyle, element.strokeWidth || 1),
                strokeLineCap: getStrokeLineCap(element.strokeStyle, element.strokeLineCap),
                strokeWidth: element.strokeWidth || 0,
            });
            applyImageFilter(fabricApi, image, element.filter, element.filterAdjustments);
        }
        if (element.type === "qr") {
            object.value = element.value;
            object.darkColor = element.darkColor;
            object.lightColor = element.lightColor;
        }
    }
    applyBaseObjectData(fabricApi, object, element);
    return object;
}

function buildWatermarkObject(fabricApi: FabricStatic, documentValue: CreativeEditorDocument, productLabel: string) {
    const mark = new fabricApi.Group([
        new fabricApi.Path("M10 18 C20 4 35 4 45 18 C35 32 20 32 10 18Z", {
            fill: "",
            left: 0,
            stroke: "#32ace7",
            strokeLineCap: "round",
            strokeWidth: 4,
            top: 0,
        }),
        new fabricApi.Path("M45 18 C55 4 70 4 80 18 C70 32 55 32 45 18Z", {
            fill: "",
            left: 34,
            stroke: "#32ace7",
            strokeLineCap: "round",
            strokeWidth: 4,
            top: 0,
        }),
        new fabricApi.Text(productLabel, {
            fill: "#111111",
            fontFamily: "Inter, Arial, sans-serif",
            fontSize: 16,
            fontWeight: "800",
            left: 18,
            top: 44,
        }),
    ], {
        evented: false,
        excludeFromExport: true,
        hasBorders: false,
        hasControls: false,
        left: Math.max(20, documentValue.canvas.width - 148),
        opacity: 0.94,
        selectable: false,
        top: Math.max(20, documentValue.canvas.height - 84),
    }) as CreativeFabricObject;
    mark.id = CREATIVE_EDITOR_WATERMARK_ID;
    mark.name = productLabel;
    mark.creativeEditorType = "watermark";
    return mark;
}

function getVisibleWatermarkPosition(
    documentValue: CreativeEditorDocument,
    watermark: CreativeEditorVisibleWatermark,
) {
    const margin = Math.max(24, documentValue.canvas.width * 0.03);
    const width = Math.max(80, watermark.text.length * watermark.fontSize * 0.55);
    const height = watermark.fontSize * 1.4;
    if (watermark.position === "top-left") return { left: margin, top: margin };
    if (watermark.position === "top-right") return { left: documentValue.canvas.width - width - margin, top: margin };
    if (watermark.position === "bottom-left") return { left: margin, top: documentValue.canvas.height - height - margin };
    if (watermark.position === "center") return { left: (documentValue.canvas.width - width) / 2, top: (documentValue.canvas.height - height) / 2 };
    return { left: documentValue.canvas.width - width - margin, top: documentValue.canvas.height - height - margin };
}

function buildVisibleWatermarkObjects(
    fabricApi: FabricStatic,
    documentValue: CreativeEditorDocument,
) {
    const watermark = documentValue.metadata?.visibleWatermark;
    if (!watermark?.enabled || !watermark.text.trim()) return [];
    const baseTextOptions = {
        evented: false,
        excludeFromExport: false,
        fill: watermark.color,
        fontFamily: watermark.fontFamily || "Inter, Arial, sans-serif",
        fontSize: watermark.fontSize,
        fontWeight: "800",
        hasBorders: false,
        hasControls: false,
        opacity: watermark.opacity,
        selectable: false,
    } satisfies fabric.ITextOptions;
    if (watermark.position === "tiled") {
        const objects: CreativeFabricObject[] = [];
        const stepX = Math.max(260, watermark.text.length * watermark.fontSize * 0.78);
        const stepY = Math.max(150, watermark.fontSize * 5);
        for (let top = 36; top < documentValue.canvas.height; top += stepY) {
            for (let left = -40; left < documentValue.canvas.width; left += stepX) {
                const item = new fabricApi.Text(watermark.text, {
                    ...baseTextOptions,
                    angle: watermark.rotation ?? -24,
                    left,
                    top,
                }) as CreativeFabricObject;
                item.creativeEditorType = "visibleWatermark";
                item.name = "Visible watermark";
                objects.push(item);
            }
        }
        return objects;
    }
    const position = getVisibleWatermarkPosition(documentValue, watermark);
    const item = new fabricApi.Text(watermark.text, {
        ...baseTextOptions,
        angle: watermark.rotation || 0,
        left: position.left,
        top: position.top,
    }) as CreativeFabricObject;
    item.creativeEditorType = "visibleWatermark";
    item.name = "Visible watermark";
    return [item];
}

export async function loadDocumentIntoFabricCanvas(params: {
    canvas: fabric.Canvas;
    documentValue: CreativeEditorDocument;
    fabricApi: FabricStatic;
    productLabel: string;
    selectedId?: string;
    showCanvasWatermark?: boolean;
    viewportSize?: {
        height: number;
        width: number;
    };
}) {
    const { canvas, documentValue, fabricApi, productLabel, selectedId, showCanvasWatermark = true, viewportSize } = params;
    const viewportWidth = Math.max(1, Math.round(viewportSize?.width || canvas.getWidth() || documentValue.canvas.width));
    const viewportHeight = Math.max(1, Math.round(viewportSize?.height || canvas.getHeight() || documentValue.canvas.height));
    canvas.clear();
    canvas.setDimensions({
        height: viewportHeight,
        width: viewportWidth,
    });
    setFabricCanvasBackground(canvas, "transparent");
    const workspace = createWorkspaceObject(fabricApi, documentValue);
    canvas.add(workspace);
    for (const element of documentValue.elements) {
        const object = await createObjectFromElement(fabricApi, element);
        canvas.add(object);
    }
    buildVisibleWatermarkObjects(fabricApi, documentValue).forEach((object) => canvas.add(object));
    if (showCanvasWatermark) canvas.add(buildWatermarkObject(fabricApi, documentValue, productLabel));
    keepWorkspaceAtBack(canvas);
    const selectedObject = selectedId
        ? canvas.getObjects().find((object) => (object as CreativeFabricObject).id === selectedId && isEditableFabricObject(object))
        : undefined;
    if (selectedObject) canvas.setActiveObject(selectedObject);
    canvas.requestRenderAll();
}

const getCommonElementData = (object: CreativeFabricObject) => {
    const boundingRect = object.getBoundingRect(true, true);
    const shadow = object.shadow && typeof object.shadow === "object"
        ? {
            blur: Math.round(object.shadow.blur || 0),
            color: object.shadow.color || "rgba(0,0,0,0.22)",
            offsetX: Math.round(object.shadow.offsetX || 0),
            offsetY: Math.round(object.shadow.offsetY || 0),
        }
        : undefined;
    return {
        blur: shadow?.blur,
        flipX: Boolean(object.flipX),
        flipY: Boolean(object.flipY),
        height: Math.max(1, Math.round(boundingRect.height)),
        id: object.id || `layer_${Date.now().toString(36)}`,
        locked: Boolean(object.locked || object.printFrameLocked),
        name: object.name || "Layer",
        opacity: object.opacity ?? 1,
        editorGuide: object.editorGuide,
        excludeFromExport: object.excludeFromExport,
        printFrameId: object.printFrameId,
        printFrameLocked: object.printFrameLocked,
        rotation: object.angle || 0,
        shadow,
        sourceRefs: object.sourceRefs,
        visible: object.visible !== false,
        width: Math.max(1, Math.round(boundingRect.width)),
        x: Math.round(boundingRect.left),
        y: Math.round(boundingRect.top),
    };
};

const toNumber = (value: unknown, fallback = 0) => (
    typeof value === "number" && Number.isFinite(value) ? value : fallback
);

function serializePoints(points?: Array<{ x: number; y: number }>): CreativeEditorPoint[] {
    return (points || []).map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) }));
}

const inferCreativeEditorType = (object: CreativeFabricObject): CreativeEditorElementType | undefined => {
    if (
        object.creativeEditorType
        && object.creativeEditorType !== "visibleWatermark"
        && object.creativeEditorType !== "watermark"
        && object.creativeEditorType !== "workspace"
    ) {
        return object.creativeEditorType;
    }
    if (object.type === "textbox" || object.type === "text" || object.type === "i-text") return "text";
    if (object.type === "rect") return "rect";
    if (object.type === "circle" || object.type === "ellipse") return "ellipse";
    if (object.type === "triangle") return "triangle";
    if (object.type === "line") return "line";
    if (object.type === "polygon") return "polygon";
    if (object.type === "path") return "path";
    if (object.type === "image") return "image";
    return undefined;
};

export function serializeFabricCanvasToDocument(
    canvas: fabric.Canvas,
    previous: CreativeEditorDocument,
): CreativeEditorDocument {
    const workspace = findWorkspaceObject(canvas);
    const elements = canvas.getObjects()
        .filter(isEditableFabricObject)
        .map((rawObject) => {
            const object = rawObject as CreativeFabricObject;
            const creativeType = inferCreativeEditorType(object);
            const common = getCommonElementData(object);
            const strokeWidth = toNumber(object.strokeWidth, 0);
            const stroke = typeof object.stroke === "string" ? object.stroke : "transparent";
            const fill = getGradientFallback(object.fill, "#ffffff");
            const gradient = getGradientFromFabricObject(object);
            const strokeLineCap = (object.strokeLineCap as CreativeEditorStrokeLineCap | undefined) || object.strokeLineCap;
            const strokeStyle = getStrokeStyleFromDash(object.strokeDashArray, strokeLineCap);
            if (creativeType === "text") {
                const textObject = object as unknown as fabric.Textbox;
                return {
                    ...common,
                    align: (textObject.textAlign as "center" | "left" | "right") || "left",
                    charSpacing: toNumber(textObject.charSpacing, 0),
                    color: getGradientFallback(textObject.fill, "#16231f"),
                    fontFamily: textObject.fontFamily,
                    fontSize: toNumber(textObject.fontSize, 24),
                    fontWeight: `${textObject.fontWeight || "700"}` as "400" | "600" | "700" | "800",
                    fontStyle: (textObject.fontStyle as "italic" | "normal") || "normal",
                    gradient,
                    lineHeight: toNumber(textObject.lineHeight, 1.12),
                    linethrough: Boolean(textObject.linethrough),
                    text: textObject.text || "",
                    textBackgroundColor: typeof textObject.textBackgroundColor === "string" ? textObject.textBackgroundColor : "",
                    type: "text",
                    underline: Boolean(textObject.underline),
                } satisfies CreativeEditorElement;
            }
            if (creativeType === "pathText") {
                const groupedObjects = object.type === "group" && "getObjects" in object
                    ? (object as fabric.Group).getObjects()
                    : [];
                const groupedText = groupedObjects.find((item) => (
                    item.type === "text" || item.type === "textbox" || item.type === "i-text"
                )) as (fabric.Textbox & { path?: unknown }) | undefined;
                const groupedPath = groupedObjects.find((item) => item.type === "path") as fabric.Path | undefined;
                const textObject = groupedText || object as unknown as fabric.Textbox & { path?: unknown };
                return {
                    ...common,
                    align: (textObject.textAlign as "center" | "left" | "right") || "center",
                    charSpacing: toNumber(textObject.charSpacing, 0),
                    color: getGradientFallback(textObject.fill, "#16231f"),
                    fontFamily: textObject.fontFamily,
                    fontSize: toNumber(textObject.fontSize, 38),
                    fontWeight: `${textObject.fontWeight || "800"}` as "400" | "600" | "700" | "800",
                    fontStyle: (textObject.fontStyle as "italic" | "normal") || "normal",
                    gradient,
                    lineHeight: toNumber(textObject.lineHeight, 1.12),
                    linethrough: Boolean(textObject.linethrough),
                    path: serializeFabricPath(groupedPath?.path || (textObject.path as { path?: unknown } | undefined)?.path || textObject.path) || "M 10 90 C 140 0 300 0 430 90",
                    pathStroke: object.pathStroke || "#d7dbdf",
                    pathVisible: object.pathVisible !== false,
                    stroke: typeof object.stroke === "string" ? object.stroke : "transparent",
                    strokeStyle,
                    strokeWidth,
                    text: textObject.text || "",
                    textBackgroundColor: typeof textObject.textBackgroundColor === "string" ? textObject.textBackgroundColor : "",
                    type: "pathText",
                    underline: Boolean(textObject.underline),
                } satisfies CreativeEditorElement;
            }
            if (creativeType === "rect") {
                return {
                    ...common,
                    fill,
                    gradient,
                    radius: toNumber((object as fabric.Rect).rx, 0),
                    stroke,
                    strokeLineCap: strokeLineCap as CreativeEditorStrokeLineCap,
                    strokeStyle,
                    strokeWidth,
                    type: "rect",
                } satisfies CreativeEditorElement;
            }
            if (creativeType === "ellipse") {
                return {
                    ...common,
                    fill,
                    gradient,
                    stroke,
                    strokeLineCap: strokeLineCap as CreativeEditorStrokeLineCap,
                    strokeStyle,
                    strokeWidth,
                    type: "ellipse",
                } satisfies CreativeEditorElement;
            }
            if (creativeType === "triangle") {
                return {
                    ...common,
                    fill,
                    gradient,
                    stroke,
                    strokeLineCap: strokeLineCap as CreativeEditorStrokeLineCap,
                    strokeStyle,
                    strokeWidth,
                    type: "triangle",
                } satisfies CreativeEditorElement;
            }
            if (creativeType === "line") {
                return {
                    ...common,
                    arrowStyle: object.arrowStyle || "none",
                    stroke: typeof object.stroke === "string" ? object.stroke : "#24564d",
                    strokeLineCap: (strokeLineCap as CreativeEditorStrokeLineCap) || "round",
                    strokeStyle,
                    strokeWidth: strokeWidth || 4,
                    type: "line",
                } satisfies CreativeEditorElement;
            }
            if (creativeType === "polygon") {
                const polygonObject = object as unknown as fabric.Polygon;
                return {
                    ...common,
                    fill,
                    gradient,
                    points: serializePoints(polygonObject.points),
                    stroke,
                    strokeLineCap: strokeLineCap as CreativeEditorStrokeLineCap,
                    strokeStyle,
                    strokeWidth,
                    type: "polygon",
                } satisfies CreativeEditorPolygonElement;
            }
            if (creativeType === "path") {
                const pathObject = object as unknown as fabric.Path;
                return {
                    ...common,
                    fill,
                    gradient,
                    path: serializeFabricPath(pathObject.path),
                    stroke,
                    strokeLineCap: strokeLineCap as CreativeEditorStrokeLineCap,
                    strokeStyle,
                    strokeWidth,
                    type: "path",
                } satisfies CreativeEditorPathElement;
            }
            if (creativeType === "qr") {
                return {
                    ...common,
                    darkColor: object.darkColor || "#16231f",
                    lightColor: object.lightColor || "#ffffff",
                    type: "qr",
                    value: object.value || "https://example.com",
                } satisfies CreativeEditorElement;
            }
            return {
                ...common,
                alt: object.name || "Image",
                filterAdjustments: object.imageFilterAdjustments,
                filter: object.imageFilter || "none",
                fit: "cover",
                outlineColor: object.outlineColor,
                outlineEnabled: object.outlineEnabled,
                outlineOnly: object.outlineOnly,
                outlineWidth: object.outlineWidth,
                src: object.src || (object as fabric.Image).getSrc?.() || "",
                stroke,
                strokeLineCap: strokeLineCap as CreativeEditorStrokeLineCap,
                strokeStyle,
                strokeWidth,
                type: "image",
            } satisfies CreativeEditorElement;
        });
    return {
        ...previous,
        canvas: {
            backgroundColor: typeof workspace?.fill === "string"
                ? workspace.fill
                : typeof (canvas as unknown as { backgroundColor?: unknown }).backgroundColor === "string"
                    ? (canvas as unknown as { backgroundColor: string }).backgroundColor
                    : previous.canvas.backgroundColor,
            backgroundGradient: workspace?.gradient?.enabled ? workspace.gradient : undefined,
            height: Math.round(toNumber(workspace?.height, previous.canvas.height)),
            width: Math.round(toNumber(workspace?.width, previous.canvas.width)),
        },
        elements,
        metadata: {
            ...previous.metadata,
            updatedAt: new Date().toISOString(),
        },
        schemaVersion: CREATIVE_EDITOR_SCHEMA_VERSION,
    };
}

export function setObjectLocked(object: CreativeFabricObject, locked: boolean) {
    const nextLocked = Boolean(object.printFrameLocked || locked);
    object.locked = nextLocked;
    object.set({
        evented: true,
        hasControls: !nextLocked,
        lockMovementX: nextLocked,
        lockMovementY: nextLocked,
        lockRotation: nextLocked,
        lockScalingX: nextLocked,
        lockScalingY: nextLocked,
        selectable: true,
    });
}

export function applyCanvasBackground(
    canvas: fabric.Canvas,
    color: string,
    backgroundGradient?: CreativeEditorLinearGradient,
) {
    const workspace = findWorkspaceObject(canvas);
    setFabricCanvasBackground(canvas, workspace ? "transparent" : color);
    if (workspace) {
        workspace.gradient = backgroundGradient?.enabled ? backgroundGradient : undefined;
        workspace.set("fill", createLinearGradientFill(
            fabric as FabricStatic,
            workspace.gradient,
            Math.round(workspace.width || canvas.getWidth()),
            Math.round(workspace.height || canvas.getHeight()),
            color,
        ));
        workspace.dirty = true;
    }
    canvas.requestRenderAll();
}

export function initFabricDragging(
    fabricApi: FabricStatic,
    canvas: fabric.Canvas,
    getGrabMode: () => boolean,
    onViewportChange?: () => void,
) {
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    canvas.on("mouse:down", (event) => {
        const pointerEvent = event.e as MouseEvent;
        if (!pointerEvent.altKey && !getGrabMode()) return;
        canvas.discardActiveObject();
        canvas.defaultCursor = "grab";
        canvas.getObjects().forEach((object) => {
            if (isEditableFabricObject(object)) object.selectable = false;
        });
        canvas.selection = false;
        isDragging = true;
        lastX = pointerEvent.clientX;
        lastY = pointerEvent.clientY;
        canvas.requestRenderAll();
    });

    canvas.on("mouse:move", (event) => {
        if (!isDragging || !canvas.viewportTransform) return;
        const pointerEvent = event.e as MouseEvent;
        canvas.defaultCursor = "grabbing";
        const transform = canvas.viewportTransform;
        transform[4] += pointerEvent.clientX - lastX;
        transform[5] += pointerEvent.clientY - lastY;
        lastX = pointerEvent.clientX;
        lastY = pointerEvent.clientY;
        canvas.requestRenderAll();
        onViewportChange?.();
    });

    canvas.on("mouse:up", () => {
        if (canvas.viewportTransform) canvas.setViewportTransform(canvas.viewportTransform);
        isDragging = false;
        canvas.selection = true;
        canvas.getObjects().forEach((object) => {
            if (isEditableFabricObject(object)) object.selectable = true;
        });
        canvas.defaultCursor = getGrabMode() ? "grab" : "default";
        canvas.requestRenderAll();
        onViewportChange?.();
    });

    canvas.on("mouse:wheel", (event) => {
        const wheelEvent = event.e as WheelEvent;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** wheelEvent.deltaY;
        zoom = Math.max(0.2, Math.min(4, zoom));
        canvas.zoomToPoint(new fabricApi.Point(wheelEvent.offsetX, wheelEvent.offsetY), zoom);
        wheelEvent.preventDefault();
        wheelEvent.stopPropagation();
        canvas.requestRenderAll();
        onViewportChange?.();
    });
}

export function initFabricAlignmentGuidelines(fabricApi: FabricStatic, canvas: fabric.Canvas, color = DEFAULT_SELECTION_COLOR) {
    const context = canvas.getSelectionContext();
    const lineOffset = 5;
    const margin = 4;
    const lineWidth = 1;
    let viewportTransform: number[] = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    let zoom = 1;
    let verticalLines: Array<{ x: number; y1: number; y2: number }> = [];
    let horizontalLines: Array<{ x1: number; x2: number; y: number }> = [];

    const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
        context.save();
        context.lineWidth = lineWidth;
        context.strokeStyle = color;
        context.beginPath();
        context.moveTo(x1 * zoom + viewportTransform[4], y1 * zoom + viewportTransform[5]);
        context.lineTo(x2 * zoom + viewportTransform[4], y2 * zoom + viewportTransform[5]);
        context.stroke();
        context.restore();
    };
    const inRange = (first: number, second: number) => {
        const roundedFirst = Math.round(first);
        const roundedSecond = Math.round(second);
        for (let value = roundedFirst - margin; value <= roundedFirst + margin; value += 1) {
            if (value === roundedSecond) return true;
        }
        return false;
    };

    canvas.on("mouse:down", () => {
        viewportTransform = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        zoom = canvas.getZoom();
    });

    canvas.on("object:moving", (event) => {
        const activeObject = event.target;
        if (!activeObject || !canvas.viewportTransform) return;
        const activeCenter = activeObject.getCenterPoint();
        const activeRect = activeObject.getBoundingRect();
        const activeHeight = activeRect.height / canvas.viewportTransform[3];
        const activeWidth = activeRect.width / canvas.viewportTransform[0];
        let horizontalMatched = false;
        let verticalMatched = false;

        canvas.getObjects().forEach((object) => {
            if (object === activeObject || !isEditableFabricObject(object)) return;
            const objectCenter = object.getCenterPoint();
            const objectRect = object.getBoundingRect();
            const objectHeight = objectRect.height / canvas.viewportTransform![3];
            const objectWidth = objectRect.width / canvas.viewportTransform![0];

            if (inRange(objectCenter.x, activeCenter.x)) {
                verticalMatched = true;
                verticalLines.push({
                    x: objectCenter.x,
                    y1: objectCenter.y < activeCenter.y ? objectCenter.y - objectHeight / 2 - lineOffset : objectCenter.y + objectHeight / 2 + lineOffset,
                    y2: activeCenter.y > objectCenter.y ? activeCenter.y + activeHeight / 2 + lineOffset : activeCenter.y - activeHeight / 2 - lineOffset,
                });
                activeObject.setPositionByOrigin(new fabricApi.Point(objectCenter.x, activeCenter.y), "center", "center");
            }
            if (inRange(objectCenter.x - objectWidth / 2, activeCenter.x - activeWidth / 2)) {
                verticalMatched = true;
                const x = objectCenter.x - objectWidth / 2;
                verticalLines.push({
                    x,
                    y1: objectCenter.y < activeCenter.y ? objectCenter.y - objectHeight / 2 - lineOffset : objectCenter.y + objectHeight / 2 + lineOffset,
                    y2: activeCenter.y > objectCenter.y ? activeCenter.y + activeHeight / 2 + lineOffset : activeCenter.y - activeHeight / 2 - lineOffset,
                });
                activeObject.setPositionByOrigin(new fabricApi.Point(x + activeWidth / 2, activeCenter.y), "center", "center");
            }
            if (inRange(objectCenter.x + objectWidth / 2, activeCenter.x + activeWidth / 2)) {
                verticalMatched = true;
                const x = objectCenter.x + objectWidth / 2;
                verticalLines.push({
                    x,
                    y1: objectCenter.y < activeCenter.y ? objectCenter.y - objectHeight / 2 - lineOffset : objectCenter.y + objectHeight / 2 + lineOffset,
                    y2: activeCenter.y > objectCenter.y ? activeCenter.y + activeHeight / 2 + lineOffset : activeCenter.y - activeHeight / 2 - lineOffset,
                });
                activeObject.setPositionByOrigin(new fabricApi.Point(x - activeWidth / 2, activeCenter.y), "center", "center");
            }
            if (inRange(objectCenter.y, activeCenter.y)) {
                horizontalMatched = true;
                horizontalLines.push({
                    y: objectCenter.y,
                    x1: objectCenter.x < activeCenter.x ? objectCenter.x - objectWidth / 2 - lineOffset : objectCenter.x + objectWidth / 2 + lineOffset,
                    x2: activeCenter.x > objectCenter.x ? activeCenter.x + activeWidth / 2 + lineOffset : activeCenter.x - activeWidth / 2 - lineOffset,
                });
                activeObject.setPositionByOrigin(new fabricApi.Point(activeCenter.x, objectCenter.y), "center", "center");
            }
            if (inRange(objectCenter.y - objectHeight / 2, activeCenter.y - activeHeight / 2)) {
                horizontalMatched = true;
                const y = objectCenter.y - objectHeight / 2;
                horizontalLines.push({
                    y,
                    x1: objectCenter.x < activeCenter.x ? objectCenter.x - objectWidth / 2 - lineOffset : objectCenter.x + objectWidth / 2 + lineOffset,
                    x2: activeCenter.x > objectCenter.x ? activeCenter.x + activeWidth / 2 + lineOffset : activeCenter.x - activeWidth / 2 - lineOffset,
                });
                activeObject.setPositionByOrigin(new fabricApi.Point(activeCenter.x, y + activeHeight / 2), "center", "center");
            }
            if (inRange(objectCenter.y + objectHeight / 2, activeCenter.y + activeHeight / 2)) {
                horizontalMatched = true;
                const y = objectCenter.y + objectHeight / 2;
                horizontalLines.push({
                    y,
                    x1: objectCenter.x < activeCenter.x ? objectCenter.x - objectWidth / 2 - lineOffset : objectCenter.x + objectWidth / 2 + lineOffset,
                    x2: activeCenter.x > objectCenter.x ? activeCenter.x + activeWidth / 2 + lineOffset : activeCenter.x - activeWidth / 2 - lineOffset,
                });
                activeObject.setPositionByOrigin(new fabricApi.Point(activeCenter.x, y - activeHeight / 2), "center", "center");
            }
        });

        if (!horizontalMatched) horizontalLines = [];
        if (!verticalMatched) verticalLines = [];
    });

    canvas.on("before:render", () => {
        canvas.clearContext(context);
    });

    canvas.on("after:render", () => {
        verticalLines.forEach((line) => drawLine(line.x + 0.5, Math.min(line.y1, line.y2), line.x + 0.5, Math.max(line.y1, line.y2)));
        horizontalLines.forEach((line) => drawLine(Math.min(line.x1, line.x2), line.y + 0.5, Math.max(line.x1, line.x2), line.y + 0.5));
        verticalLines = [];
        horizontalLines = [];
    });

    canvas.on("mouse:up", () => {
        verticalLines = [];
        horizontalLines = [];
    });
}
