import { renderCreativeEditorPngBlob } from "@/modules/creative-editor/export";
import {
    CREATIVE_EDITOR_SCHEMA_VERSION,
    CreativeEditorDocument,
    CreativeEditorElement,
} from "@/modules/creative-editor/types";
import { getOfferingLabels } from "@lib/menu-kit/businessTypeLabels";
import { createMenuListLogoMarkDataUrl, MENU_LIST_DOMAIN } from "@lib/menu-kit/platformAttribution";
import { resolveMenuListAttributionPolicy } from "@lib/platform/menuListBranding";
import { getPrintableAssetType } from "./assetTypes";
import { resolvePrintableTemplateBrandTokens } from "./templateStyles";
import type {
    PrintableAssetOutputFormat,
    PrintableAssetRenderInput,
    PrintableAssetRenderResult,
    PrintableAssetTypeId,
} from "./types";

const EDITOR_RENDERABLE_ASSETS = new Set<PrintableAssetTypeId>([
    "table_tent",
    "single_table_card",
    "counter_sticker",
    "entrance_poster",
    "feedback_qr",
]);

const PRINT_DIMENSIONS: Record<PrintableAssetTypeId, { height: number; heightMm: number; width: number; widthMm: number }> = {
    complete_menu_kit: { width: 1080, height: 1080, widthMm: 100, heightMm: 100 },
    counter_sticker: { width: 945, height: 945, widthMm: 80, heightMm: 80 },
    entrance_poster: { width: 2480, height: 3508, widthMm: 210, heightMm: 297 },
    feedback_qr: { width: 1181, height: 1772, widthMm: 100, heightMm: 150 },
    print_menu: { width: 2480, height: 3508, widthMm: 210, heightMm: 297 },
    single_table_card: { width: 1240, height: 1748, widthMm: 105, heightMm: 148 },
    table_tent: { width: 2480, height: 1748, widthMm: 210, heightMm: 148 },
};

type BuildContext = {
    accent: string;
    accentText: string;
    assetTitle: string;
    backgroundColor: string;
    borderColor: string;
    canvasHeight: number;
    canvasWidth: number;
    elements: CreativeEditorElement[];
    id: (prefix: string) => string;
    input: PrintableAssetRenderInput;
    labels: ReturnType<typeof getOfferingLabels>;
    muted: string;
    qrValue: string;
    showAttribution: boolean;
    surface: string;
    text: string;
};

function safeName(value: string): string {
    return value.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_") || "Menu";
}

function truncateForLayer(value: string, max = 52): string {
    const trimmed = value.trim();
    return trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed;
}

function initials(value: string) {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "M";
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return `${first}${second}`.toUpperCase();
}

function textElement(ctx: BuildContext, params: Partial<Extract<CreativeEditorElement, { type: "text" }>> & {
    height: number;
    text: string;
    width: number;
    x: number;
    y: number;
}): Extract<CreativeEditorElement, { type: "text" }> {
    return {
        align: "left",
        color: ctx.text,
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: 72,
        fontWeight: "800",
        id: ctx.id("text"),
        lineHeight: 1.08,
        name: "Text",
        opacity: 1,
        type: "text",
        visible: true,
        ...params,
    };
}

function rectElement(ctx: BuildContext, params: Partial<Extract<CreativeEditorElement, { type: "rect" }>> & {
    height: number;
    width: number;
    x: number;
    y: number;
}): Extract<CreativeEditorElement, { type: "rect" }> {
    return {
        fill: ctx.surface,
        id: ctx.id("shape"),
        name: "Shape",
        opacity: 1,
        radius: 0,
        stroke: "transparent",
        strokeStyle: "solid",
        strokeWidth: 0,
        type: "rect",
        visible: true,
        ...params,
    };
}

function ellipseElement(ctx: BuildContext, params: Partial<Extract<CreativeEditorElement, { type: "ellipse" }>> & {
    height: number;
    width: number;
    x: number;
    y: number;
}): Extract<CreativeEditorElement, { type: "ellipse" }> {
    return {
        fill: ctx.accent,
        id: ctx.id("shape"),
        name: "Shape",
        opacity: 1,
        stroke: "transparent",
        strokeStyle: "solid",
        strokeWidth: 0,
        type: "ellipse",
        visible: true,
        ...params,
    };
}

function lineElement(ctx: BuildContext, params: Partial<Extract<CreativeEditorElement, { type: "line" }>> & {
    height: number;
    width: number;
    x: number;
    y: number;
}): Extract<CreativeEditorElement, { type: "line" }> {
    return {
        arrowStyle: "none",
        id: ctx.id("line"),
        name: "Line",
        opacity: 1,
        stroke: ctx.borderColor,
        strokeLineCap: "round",
        strokeStyle: "solid",
        strokeWidth: 8,
        type: "line",
        visible: true,
        ...params,
    };
}

function qrElement(ctx: BuildContext, params: Partial<Extract<CreativeEditorElement, { type: "qr" }>> & {
    height: number;
    width: number;
    x: number;
    y: number;
}): Extract<CreativeEditorElement, { type: "qr" }> {
    return {
        darkColor: "#111827",
        errorCorrectionLevel: "H",
        height: params.height,
        id: ctx.id("qr"),
        lightColor: "#ffffff",
        locked: true,
        margin: 3,
        name: "Live QR code",
        opacity: 1,
        sourceRefs: [{
            label: ctx.input.assetTypeId === "feedback_qr" ? "Feedback link" : "Menu link",
            locked: true,
            productId: "menulist",
            sourceRef: "printable-asset-templates",
            value: ctx.qrValue,
        }],
        type: "qr",
        value: ctx.qrValue,
        visible: true,
        width: params.width,
        x: params.x,
        y: params.y,
        ...params,
    };
}

function imageElement(ctx: BuildContext, params: Partial<Extract<CreativeEditorElement, { type: "image" }>> & {
    height: number;
    src: string;
    width: number;
    x: number;
    y: number;
}): Extract<CreativeEditorElement, { type: "image" }> {
    return {
        alt: params.name || "Image",
        fit: "contain",
        id: ctx.id("image"),
        locked: true,
        name: params.name || "Image",
        opacity: 1,
        type: "image",
        visible: true,
        ...params,
    };
}

function addIdentityBadge(ctx: BuildContext, x: number, y: number, size: number, align: "left" | "center" = "left", rotation = 0) {
    const badgeX = align === "center" ? x - size / 2 : x;
    ctx.elements.push(ellipseElement(ctx, {
        fill: ctx.accent,
        height: size,
        name: "Business badge",
        rotation,
        width: size,
        x: badgeX,
        y,
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accentText,
        fontSize: Math.round(size * 0.32),
        fontWeight: "800",
        height: Math.round(size * 0.4),
        name: "Business initials",
        rotation,
        text: initials(ctx.input.storeName),
        width: size,
        x: badgeX,
        y: y + Math.round(size * 0.32),
    }));
}

function addAttribution(ctx: BuildContext, x: number, y: number, scale = 1, rotation = 0) {
    if (!ctx.showAttribution || typeof document === "undefined") return;
    const mark = createMenuListLogoMarkDataUrl(Math.round(34 * scale));
    ctx.elements.push(imageElement(ctx, {
        height: mark.height,
        name: "MenuList mark",
        opacity: 0.9,
        rotation,
        src: mark.dataUrl,
        width: mark.width,
        x,
        y,
    }));
    ctx.elements.push(textElement(ctx, {
        color: ctx.muted,
        fontSize: Math.round(22 * scale),
        fontWeight: "700",
        height: Math.round(34 * scale),
        locked: true,
        name: "MenuList attribution",
        rotation,
        sourceRefs: [{
            label: "MenuList attribution",
            locked: true,
            productId: "menulist",
            value: MENU_LIST_DOMAIN,
        }],
        text: MENU_LIST_DOMAIN,
        width: Math.round(220 * scale),
        x: x + Math.round(56 * scale),
        y: y + Math.round(4 * scale),
    }));
}

function addQrPanel(ctx: BuildContext, x: number, y: number, size: number, rotation = 0) {
    ctx.elements.push(rectElement(ctx, {
        fill: "#ffffff",
        height: size + 88,
        locked: true,
        name: "QR panel",
        radius: Math.round(size * 0.07),
        rotation,
        shadow: { blur: 30, color: "rgba(17,24,39,0.16)", offsetX: 0, offsetY: 14 },
        stroke: ctx.borderColor,
        strokeWidth: 2,
        width: size + 88,
        x: x - 44,
        y: y - 44,
    }));
    ctx.elements.push(qrElement(ctx, {
        height: size,
        rotation,
        width: size,
        x,
        y,
    }));
}

function addFrame(ctx: BuildContext, margin: number) {
    ctx.elements.push(rectElement(ctx, {
        fill: "transparent",
        height: ctx.canvasHeight - margin * 2,
        locked: true,
        name: "Print safe border",
        radius: 0,
        stroke: ctx.borderColor,
        strokeWidth: Math.max(4, Math.round(ctx.canvasWidth * 0.004)),
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: margin,
    }));
}

function addDecor(ctx: BuildContext) {
    const family = ctx.input.templateFamilyId;
    if (family === "soft-curve") {
        ctx.elements.push(ellipseElement(ctx, {
            fill: ctx.accent,
            height: Math.round(ctx.canvasWidth * 0.58),
            name: "Soft curve",
            opacity: 0.18,
            width: Math.round(ctx.canvasWidth * 0.72),
            x: Math.round(ctx.canvasWidth * 0.56),
            y: Math.round(ctx.canvasHeight * 0.02),
        }));
        return;
    }

    if (family === "local-bold" || family === "brand-banner") {
        ctx.elements.push(rectElement(ctx, {
            fill: ctx.accent,
            height: Math.round(ctx.canvasHeight * 0.18),
            locked: true,
            name: "Brand banner",
            width: ctx.canvasWidth,
            x: 0,
            y: 0,
        }));
        return;
    }

    if (family === "botanical-heritage" || family === "classic-luxe") {
        addFrame(ctx, Math.round(ctx.canvasWidth * 0.055));
        ctx.elements.push(ellipseElement(ctx, {
            fill: ctx.accent,
            height: Math.round(ctx.canvasWidth * 0.18),
            name: "Accent seal",
            opacity: 0.16,
            width: Math.round(ctx.canvasWidth * 0.18),
            x: Math.round(ctx.canvasWidth * 0.72),
            y: Math.round(ctx.canvasHeight * 0.09),
        }));
        return;
    }

    if (family === "executive-dark") {
        ctx.elements.push(lineElement(ctx, {
            height: 0,
            name: "Gold rule",
            stroke: ctx.accent,
            strokeWidth: Math.max(8, Math.round(ctx.canvasWidth * 0.006)),
            width: Math.round(ctx.canvasWidth * 0.62),
            x: Math.round(ctx.canvasWidth * 0.19),
            y: Math.round(ctx.canvasHeight * 0.14),
        }));
    }
}

function addMainCardFace(ctx: BuildContext, params: {
    cta: string;
    faceHeight: number;
    faceWidth: number;
    qrSize: number;
    rotation?: number;
    shortLinkYRatio?: number;
    subtitle: string;
    title: string;
    x: number;
    y: number;
}) {
    const { cta, faceHeight, faceWidth, qrSize, rotation = 0, subtitle, title, x, y } = params;
    const pad = Math.round(faceWidth * 0.08);
    const centerX = x + faceWidth / 2;
    const titleColor = ctx.input.templateFamilyId === "brand-banner" || ctx.input.templateFamilyId === "local-bold"
        ? ctx.accentText
        : ctx.text;

    addIdentityBadge(ctx, centerX, y + pad, Math.round(faceWidth * 0.14), "center", rotation);
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: titleColor,
        fontSize: Math.round(faceWidth * 0.058),
        fontWeight: "800",
        height: Math.round(faceHeight * 0.07),
        name: "Business name",
        rotation,
        text: truncateForLayer(ctx.input.storeName, 42),
        width: faceWidth - pad * 2,
        x: x + pad,
        y: y + Math.round(faceHeight * 0.22),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.muted,
        fontSize: Math.round(faceWidth * 0.04),
        fontWeight: "700",
        height: Math.round(faceHeight * 0.07),
        name: "Instruction",
        rotation,
        text: subtitle,
        width: faceWidth - pad * 2,
        x: x + pad,
        y: y + Math.round(faceHeight * 0.31),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accent,
        fontSize: Math.round(faceWidth * 0.07),
        fontWeight: "800",
        height: Math.round(faceHeight * 0.08),
        name: "Call to action",
        rotation,
        text: cta,
        width: faceWidth - pad * 2,
        x: x + pad,
        y: y + Math.round(faceHeight * 0.39),
    }));
    addQrPanel(ctx, Math.round(centerX - qrSize / 2), y + Math.round(faceHeight * 0.53), qrSize, rotation);
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.muted,
        fontSize: Math.round(faceWidth * 0.028),
        fontWeight: "700",
        height: Math.round(faceHeight * 0.05),
        locked: true,
        name: "Short link",
        rotation,
        sourceRefs: [{
            label: "Short link",
            locked: true,
            productId: "menulist",
            value: ctx.input.shortLink,
        }],
        text: truncateForLayer(ctx.input.shortLink, 58),
        width: faceWidth - pad * 2,
        x: x + pad,
        y: y + Math.round(faceHeight * (params.shortLinkYRatio ?? 0.86)),
    }));
}

function buildTableTent(ctx: BuildContext) {
    const faceWidth = ctx.canvasWidth / 2;
    const faceHeight = ctx.canvasHeight;
    const qrSize = Math.round(faceHeight * 0.31);
    addDecor(ctx);
    ctx.elements.push(lineElement(ctx, {
        height: ctx.canvasHeight,
        locked: true,
        name: "Fold line",
        stroke: ctx.borderColor,
        strokeStyle: "dashed",
        strokeWidth: 5,
        width: 0,
        x: faceWidth,
        y: 0,
    }));
    addMainCardFace(ctx, {
        cta: `SCAN FOR ${ctx.labels.offeringUpper}`,
        faceHeight,
        faceWidth,
        qrSize,
        rotation: 180,
        shortLinkYRatio: 0.88,
        subtitle: ctx.labels.scanToView,
        title: ctx.labels.offeringTitle,
        x: 0,
        y: 0,
    });
    addMainCardFace(ctx, {
        cta: `SCAN FOR ${ctx.labels.offeringUpper}`,
        faceHeight,
        faceWidth,
        qrSize,
        shortLinkYRatio: 0.88,
        subtitle: ctx.labels.scanToView,
        title: ctx.labels.offeringTitle,
        x: faceWidth,
        y: 0,
    });
    addAttribution(ctx, ctx.canvasWidth - 260, ctx.canvasHeight - 70, 0.9);
}

function buildSingleCard(ctx: BuildContext) {
    addDecor(ctx);
    addMainCardFace(ctx, {
        cta: ctx.input.assetTypeId === "feedback_qr" ? "LEAVE FEEDBACK" : `VIEW ${ctx.labels.offeringUpper}`,
        faceHeight: ctx.canvasHeight,
        faceWidth: ctx.canvasWidth,
        qrSize: Math.round(ctx.canvasWidth * 0.42),
        subtitle: ctx.input.assetTypeId === "feedback_qr" ? "Scan to leave feedback" : ctx.labels.scanToView,
        title: ctx.labels.offeringTitle,
        x: 0,
        y: 0,
    });
    addAttribution(ctx, ctx.canvasWidth - 260, ctx.canvasHeight - 76, 1);
}

function buildSticker(ctx: BuildContext) {
    ctx.elements.push(ellipseElement(ctx, {
        fill: ctx.accent,
        height: Math.round(ctx.canvasWidth * 0.92),
        name: "Sticker background",
        opacity: ctx.input.templateFamilyId === "clean-utility" ? 0.06 : 0.14,
        width: Math.round(ctx.canvasWidth * 0.92),
        x: Math.round(ctx.canvasWidth * 0.04),
        y: Math.round(ctx.canvasHeight * 0.04),
    }));
    addIdentityBadge(ctx, ctx.canvasWidth / 2, Math.round(ctx.canvasHeight * 0.08), Math.round(ctx.canvasWidth * 0.18), "center");
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasWidth * 0.07),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.09),
        name: "Business name",
        text: truncateForLayer(ctx.input.storeName, 30),
        width: Math.round(ctx.canvasWidth * 0.82),
        x: Math.round(ctx.canvasWidth * 0.09),
        y: Math.round(ctx.canvasHeight * 0.25),
    }));
    addQrPanel(ctx, Math.round(ctx.canvasWidth * 0.24), Math.round(ctx.canvasHeight * 0.39), Math.round(ctx.canvasWidth * 0.52));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accent,
        fontSize: Math.round(ctx.canvasWidth * 0.06),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.08),
        name: "Call to action",
        text: `SCAN ${ctx.labels.offeringUpper}`,
        width: Math.round(ctx.canvasWidth * 0.82),
        x: Math.round(ctx.canvasWidth * 0.09),
        y: Math.round(ctx.canvasHeight * 0.79),
    }));
}

function buildEntrancePoster(ctx: BuildContext) {
    addDecor(ctx);
    const margin = Math.round(ctx.canvasWidth * 0.09);
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.input.templateFamilyId === "brand-banner" || ctx.input.templateFamilyId === "local-bold" ? ctx.accentText : ctx.accent,
        fontFamily: ctx.input.templateFamilyId === "classic-luxe" ? "Georgia, serif" : "Inter, Arial, sans-serif",
        fontSize: Math.round(ctx.canvasWidth * 0.105),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.12),
        name: "Poster headline",
        text: ctx.input.assetTypeId === "feedback_qr" ? "TELL US HOW WE DID" : `OUR ${ctx.labels.offeringUpper}`,
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.13),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasWidth * 0.065),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.08),
        name: "Business name",
        text: truncateForLayer(ctx.input.storeName, 42),
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.29),
    }));
    addQrPanel(ctx, Math.round(ctx.canvasWidth * 0.29), Math.round(ctx.canvasHeight * 0.43), Math.round(ctx.canvasWidth * 0.42));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.muted,
        fontSize: Math.round(ctx.canvasWidth * 0.038),
        fontWeight: "700",
        height: Math.round(ctx.canvasHeight * 0.06),
        name: "Scan instruction",
        text: ctx.input.assetTypeId === "feedback_qr" ? "Scan to leave feedback" : ctx.labels.scanToView,
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.80),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.muted,
        fontSize: Math.round(ctx.canvasWidth * 0.026),
        fontWeight: "700",
        height: Math.round(ctx.canvasHeight * 0.04),
        locked: true,
        name: "Short link",
        text: truncateForLayer(ctx.input.shortLink, 62),
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.86),
    }));
    addAttribution(ctx, ctx.canvasWidth - 330, ctx.canvasHeight - 110, 1.15);
}

function buildContext(input: PrintableAssetRenderInput): BuildContext {
    const dims = PRINT_DIMENSIONS[input.assetTypeId];
    const tokens = resolvePrintableTemplateBrandTokens(input.brandColor, input.templateFamilyId);
    const elements: CreativeEditorElement[] = [];
    let index = 0;
    const qrValue = input.assetTypeId === "feedback_qr"
        ? (input.feedbackUrl || input.menuUrl)
        : input.menuUrl;
    const assetType = getPrintableAssetType(input.assetTypeId);

    return {
        accent: tokens.accent,
        accentText: tokens.accentText,
        assetTitle: assetType.title,
        backgroundColor: tokens.paper,
        borderColor: tokens.border,
        canvasHeight: dims.height,
        canvasWidth: dims.width,
        elements,
        id: (prefix: string) => `print_${input.assetTypeId}_${input.templateFamilyId}_${prefix}_${index += 1}`,
        input,
        labels: getOfferingLabels(input.businessType, input.businessCategory),
        muted: tokens.muted,
        qrValue,
        showAttribution: resolveMenuListAttributionPolicy({ activePlanType: input.activePlanType }).showAttribution,
        surface: tokens.surface,
        text: tokens.text,
    };
}

export function isPrintableAssetEditorRenderable(assetTypeId: PrintableAssetTypeId): boolean {
    return EDITOR_RENDERABLE_ASSETS.has(assetTypeId);
}

export function buildPrintableAssetEditorDocument(input: PrintableAssetRenderInput): CreativeEditorDocument {
    if (!isPrintableAssetEditorRenderable(input.assetTypeId)) {
        throw new Error(`Editor templates are not available for ${input.assetTypeId}`);
    }

    const ctx = buildContext(input);
    if (input.assetTypeId === "table_tent") buildTableTent(ctx);
    else if (input.assetTypeId === "counter_sticker") buildSticker(ctx);
    else if (input.assetTypeId === "entrance_poster") buildEntrancePoster(ctx);
    else buildSingleCard(ctx);

    const now = new Date().toISOString();
    return {
        canvas: {
            backgroundColor: ctx.backgroundColor,
            height: ctx.canvasHeight,
            width: ctx.canvasWidth,
        },
        elements: ctx.elements,
        id: `print_asset_${input.assetTypeId}_${input.templateFamilyId}_${Date.now().toString(36)}`,
        metadata: {
            brand: {
                accentColor: ctx.accent,
                fontFamily: "Inter, Arial, sans-serif",
                logoUrl: input.logoUrl || undefined,
                name: input.storeName,
                primaryColor: ctx.accent,
                secondaryColor: ctx.text,
            },
            createdAt: now,
            templateId: `${input.assetTypeId}:${input.templateFamilyId}`,
            textPlaceholders: [
                { id: "business-name", label: "Business name", value: input.storeName },
                { id: "offering", label: "Offering", value: ctx.labels.offeringTitle },
                { id: "scan-link", label: "Scan link", value: ctx.qrValue },
            ],
            updatedAt: now,
        },
        productContext: {
            productId: "menulist",
            sourceSurface: "printable-asset-templates",
            workspaceId: input.projectId || undefined,
        },
        schemaVersion: CREATIVE_EDITOR_SCHEMA_VERSION,
        title: `${safeName(input.storeName)} ${ctx.assetTitle} ${input.templateFamilyId}`,
    };
}

export function rehydratePrintableAssetEditorDocument(
    documentValue: CreativeEditorDocument,
    input: PrintableAssetRenderInput,
): CreativeEditorDocument {
    if (!isPrintableAssetEditorRenderable(input.assetTypeId)) {
        throw new Error(`Editor templates are not available for ${input.assetTypeId}`);
    }

    const ctx = buildContext(input);
    const now = new Date().toISOString();
    const shortLink = input.shortLink || input.menuUrl.replace(/^https?:\/\//, "");
    const updatedElements = documentValue.elements.map((element): CreativeEditorElement => {
        if (element.type === "qr") {
            return {
                ...element,
                locked: true,
                sourceRefs: [{
                    label: input.assetTypeId === "feedback_qr" ? "Feedback link" : "Menu link",
                    locked: true,
                    productId: "menulist",
                    sourceRef: "printable-asset-templates",
                    value: ctx.qrValue,
                }],
                value: ctx.qrValue,
            };
        }

        const hasShortLinkSource = element.sourceRefs?.some((sourceRef) => (
            sourceRef.label.toLowerCase().includes("short link")
            || sourceRef.sourceRef === "printable-asset-templates-short-link"
        ));
        if (element.type === "text" && (element.name.toLowerCase().includes("short link") || hasShortLinkSource)) {
            return {
                ...element,
                locked: true,
                sourceRefs: [{
                    label: "Short link",
                    locked: true,
                    productId: "menulist",
                    sourceRef: "printable-asset-templates-short-link",
                    value: shortLink,
                }],
                text: truncateForLayer(shortLink, 62),
            };
        }

        return element;
    });

    return {
        ...documentValue,
        elements: updatedElements,
        id: `print_asset_saved_${input.assetTypeId}_${Date.now().toString(36)}`,
        metadata: {
            ...documentValue.metadata,
            brand: {
                ...documentValue.metadata?.brand,
                accentColor: ctx.accent,
                logoUrl: input.logoUrl || documentValue.metadata?.brand?.logoUrl,
                name: input.storeName,
                primaryColor: ctx.accent,
                secondaryColor: ctx.text,
            },
            textPlaceholders: [
                { id: "business-name", label: "Business name", value: input.storeName },
                { id: "offering", label: "Offering", value: ctx.labels.offeringTitle },
                { id: "scan-link", label: "Scan link", value: ctx.qrValue },
            ],
            updatedAt: now,
        },
        productContext: {
            productId: "menulist",
            sourceSurface: "printable-asset-templates",
            workspaceId: input.projectId || undefined,
        },
        title: documentValue.title || `${safeName(input.storeName)} ${ctx.assetTitle}`,
    };
}

export async function renderPrintableAssetEditorDocument(params: {
    assetTypeId: PrintableAssetTypeId;
    document: CreativeEditorDocument;
    outputFormat: Exclude<PrintableAssetOutputFormat, "zip">;
    templateFamilyId?: string;
}): Promise<PrintableAssetRenderResult> {
    const assetType = getPrintableAssetType(params.assetTypeId);
    if (params.outputFormat === "png") {
        const result = await renderCreativeEditorPngBlob(params.document);
        if (!result.blob) throw new Error("PNG export failed");
        return {
            blob: result.blob,
            filename: result.filename.replace(/\.png$/i, `_${params.assetTypeId}.png`),
            label: assetType.title,
            mimeType: "image/png",
            outputFormat: "png",
        };
    }

    const result = await renderCreativeEditorPngBlob(params.document);
    if (!result.blob) throw new Error("PDF export failed");
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Failed to read generated image"));
        reader.readAsDataURL(result.blob as Blob);
    });
    const dims = PRINT_DIMENSIONS[params.assetTypeId];
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({
        orientation: dims.widthMm >= dims.heightMm ? "landscape" : "portrait",
        unit: "mm",
        format: [dims.widthMm, dims.heightMm],
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, dims.widthMm, dims.heightMm);
    return {
        blob: pdf.output("blob"),
        filename: result.filename.replace(/\.png$/i, `_${params.assetTypeId}.pdf`),
        label: assetType.title,
        mimeType: "application/pdf",
        outputFormat: "pdf",
    };
}

export async function renderPrintableAssetEditorTemplate(input: PrintableAssetRenderInput): Promise<PrintableAssetRenderResult> {
    if (input.outputFormat === "zip") {
        throw new Error("Editor templates cannot render ZIP bundles");
    }
    const documentValue = buildPrintableAssetEditorDocument(input);
    return renderPrintableAssetEditorDocument({
        assetTypeId: input.assetTypeId,
        document: documentValue,
        outputFormat: input.outputFormat === "pdf" ? "pdf" : "png",
        templateFamilyId: input.templateFamilyId,
    });
}
