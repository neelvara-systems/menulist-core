import { renderCreativeEditorPngBlob } from "@/modules/creative-editor/export";
import {
    CREATIVE_EDITOR_SCHEMA_VERSION,
    CreativeEditorDocument,
    CreativeEditorElement,
} from "@/modules/creative-editor/types";
import { getOfferingLabels } from "@lib/menu-kit/businessTypeLabels";
import { drawMenuListAttribution, MENU_LIST_DOMAIN } from "@lib/menu-kit/platformAttribution";
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
    "campaign_flyer",
    "gift_certificate",
    "business_card",
    "event_invitation",
    "postcard",
    "product_tag",
    "campaign_poster",
]);

const PRINT_DIMENSIONS: Record<PrintableAssetTypeId, { height: number; heightMm: number; width: number; widthMm: number }> = {
    business_card: { width: 1063, height: 650, widthMm: 90, heightMm: 55 },
    campaign_flyer: { width: 1748, height: 2480, widthMm: 148, heightMm: 210 },
    campaign_poster: { width: 2480, height: 3508, widthMm: 210, heightMm: 297 },
    complete_menu_kit: { width: 1080, height: 1080, widthMm: 100, heightMm: 100 },
    counter_sticker: { width: 945, height: 945, widthMm: 80, heightMm: 80 },
    entrance_poster: { width: 2480, height: 3508, widthMm: 210, heightMm: 297 },
    event_invitation: { width: 1240, height: 1748, widthMm: 105, heightMm: 148 },
    feedback_qr: { width: 1181, height: 1772, widthMm: 100, heightMm: 150 },
    gift_certificate: { width: 1748, height: 826, widthMm: 210, heightMm: 99 },
    postcard: { width: 1748, height: 1240, widthMm: 148, heightMm: 105 },
    print_menu: { width: 2480, height: 3508, widthMm: 210, heightMm: 297 },
    product_tag: { width: 1063, height: 591, widthMm: 90, heightMm: 50 },
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
    surface: string;
    text: string;
};

function safeName(value: string): string {
    return value.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_") || "Menu";
}

function truncateForLayer(value: string | null | undefined, max = 52): string {
    const trimmed = (value || "").trim();
    return trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed;
}

function getDisplayShortLink(ctx: BuildContext): string {
    return ctx.input.shortLink || ctx.input.menuUrl.replace(/^https?:\/\//, "");
}

function initials(value: string) {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "M";
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return `${first}${second}`.toUpperCase();
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
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

function isPrintableAssetPlatformAttribution(element: CreativeEditorElement): boolean {
    const name = element.name.trim().toLowerCase();
    if (name === "menulist mark" || name === "menulist attribution") return true;
    return Boolean(element.sourceRefs?.some((sourceRef) => (
        sourceRef.label.toLowerCase() === "menulist attribution"
        || sourceRef.value === MENU_LIST_DOMAIN
    )));
}

export function stripPrintableAssetEditorAttributionLayers(documentValue: CreativeEditorDocument): CreativeEditorDocument {
    return {
        ...documentValue,
        elements: documentValue.elements.filter((element) => !isPrintableAssetPlatformAttribution(element)),
    };
}

function addQrPanel(ctx: BuildContext, x: number, y: number, size: number, rotation = 0) {
    const panelSize = size + 88;
    const panelX = clamp(x - 44, 2, Math.max(2, ctx.canvasWidth - panelSize - 2));
    const panelY = clamp(y - 44, 2, Math.max(2, ctx.canvasHeight - panelSize - 2));
    const qrX = panelX + 44;
    const qrY = panelY + 44;

    ctx.elements.push(rectElement(ctx, {
        fill: "#ffffff",
        height: panelSize,
        locked: true,
        name: "QR panel",
        radius: Math.round(size * 0.07),
        rotation,
        shadow: { blur: 30, color: "rgba(17,24,39,0.16)", offsetX: 0, offsetY: 14 },
        stroke: ctx.borderColor,
        strokeWidth: 2,
        width: panelSize,
        x: panelX,
        y: panelY,
    }));
    ctx.elements.push(qrElement(ctx, {
        height: size,
        rotation,
        width: size,
        x: qrX,
        y: qrY,
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
        const curveWidth = Math.round(ctx.canvasWidth * 0.60);
        const curveHeight = Math.round(ctx.canvasWidth * 0.52);
        ctx.elements.push(ellipseElement(ctx, {
            fill: ctx.accent,
            height: curveHeight,
            name: "Soft curve",
            opacity: 0.18,
            width: curveWidth,
            x: ctx.canvasWidth - curveWidth - Math.round(ctx.canvasWidth * 0.035),
            y: Math.round(ctx.canvasHeight * 0.03),
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
            value: getDisplayShortLink(ctx),
        }],
        text: truncateForLayer(getDisplayShortLink(ctx), 58),
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
        height: ctx.canvasHeight - 6,
        locked: true,
        name: "Fold line",
        stroke: ctx.borderColor,
        strokeStyle: "dashed",
        strokeWidth: 5,
        width: 0,
        x: faceWidth,
        y: 3,
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
        text: truncateForLayer(getDisplayShortLink(ctx), 62),
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.86),
    }));
}

function addShortLink(ctx: BuildContext, params: {
    align?: "left" | "center" | "right";
    color?: string;
    fontSize: number;
    height: number;
    width: number;
    x: number;
    y: number;
}) {
    ctx.elements.push(textElement(ctx, {
        align: params.align || "center",
        color: params.color || ctx.muted,
        fontSize: params.fontSize,
        fontWeight: "700",
        height: params.height,
        locked: true,
        name: "Short link",
        sourceRefs: [{
            label: "Short link",
            locked: true,
            productId: "menulist",
            sourceRef: "printable-asset-templates-short-link",
            value: getDisplayShortLink(ctx),
        }],
        text: truncateForLayer(getDisplayShortLink(ctx), 62),
        width: params.width,
        x: params.x,
        y: params.y,
    }));
}

function buildCampaignFlyer(ctx: BuildContext) {
    addDecor(ctx);
    const margin = Math.round(ctx.canvasWidth * 0.09);
    const isBanner = ctx.input.templateFamilyId === "brand-banner" || ctx.input.templateFamilyId === "local-bold";
    const headlineColor = isBanner ? ctx.accentText : ctx.accent;
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: headlineColor,
        fontSize: Math.round(ctx.canvasWidth * 0.095),
        fontWeight: "900",
        height: Math.round(ctx.canvasHeight * 0.16),
        name: "Offer headline",
        text: "WEEKEND OFFER",
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.12),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasWidth * 0.045),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.07),
        name: "Business name",
        text: truncateForLayer(ctx.input.storeName, 42),
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.30),
    }));
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.surface,
        height: Math.round(ctx.canvasHeight * 0.22),
        name: "Offer panel",
        radius: Math.round(ctx.canvasWidth * 0.035),
        shadow: { blur: 38, color: "rgba(17,24,39,0.10)", offsetX: 0, offsetY: 16 },
        stroke: ctx.borderColor,
        strokeWidth: 2,
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.40),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasWidth * 0.064),
        fontWeight: "900",
        height: Math.round(ctx.canvasHeight * 0.08),
        name: "Primary offer",
        text: "Buy 1, get 1 today",
        width: Math.round((ctx.canvasWidth - margin * 2) * 0.58),
        x: margin + Math.round(ctx.canvasWidth * 0.055),
        y: Math.round(ctx.canvasHeight * 0.45),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.muted,
        fontSize: Math.round(ctx.canvasWidth * 0.034),
        fontWeight: "700",
        height: Math.round(ctx.canvasHeight * 0.08),
        name: "Offer details",
        text: `Valid today only. Show this flyer or scan to view ${ctx.labels.yourLatest}.`,
        width: Math.round((ctx.canvasWidth - margin * 2) * 0.56),
        x: margin + Math.round(ctx.canvasWidth * 0.055),
        y: Math.round(ctx.canvasHeight * 0.54),
    }));
    const qrSize = Math.round(ctx.canvasWidth * 0.24);
    addQrPanel(ctx, ctx.canvasWidth - margin - qrSize - 72, Math.round(ctx.canvasHeight * 0.455), qrSize);
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accent,
        fontSize: Math.round(ctx.canvasWidth * 0.045),
        fontWeight: "900",
        height: Math.round(ctx.canvasHeight * 0.06),
        name: "Call to action",
        text: `SCAN FOR ${ctx.labels.offeringUpper}`,
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.71),
    }));
    addShortLink(ctx, {
        fontSize: Math.round(ctx.canvasWidth * 0.026),
        height: Math.round(ctx.canvasHeight * 0.04),
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.78),
    });
}

function buildGiftCertificate(ctx: BuildContext) {
    addDecor(ctx);
    const margin = Math.round(ctx.canvasWidth * 0.055);
    addIdentityBadge(ctx, margin, Math.round(ctx.canvasHeight * 0.12), Math.round(ctx.canvasHeight * 0.20));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.accent,
        fontFamily: ctx.input.templateFamilyId === "classic-luxe" ? "Georgia, serif" : "Inter, Arial, sans-serif",
        fontSize: Math.round(ctx.canvasHeight * 0.15),
        fontWeight: "900",
        height: Math.round(ctx.canvasHeight * 0.18),
        name: "Voucher headline",
        text: "GIFT CERTIFICATE",
        width: Math.round(ctx.canvasWidth * 0.62),
        x: Math.round(ctx.canvasWidth * 0.24),
        y: Math.round(ctx.canvasHeight * 0.13),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasHeight * 0.06),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.08),
        name: "Business name",
        text: truncateForLayer(ctx.input.storeName, 48),
        width: Math.round(ctx.canvasWidth * 0.56),
        x: Math.round(ctx.canvasWidth * 0.24),
        y: Math.round(ctx.canvasHeight * 0.36),
    }));
    ctx.elements.push(lineElement(ctx, {
        height: 0,
        name: "Value line",
        stroke: ctx.borderColor,
        strokeWidth: 4,
        width: Math.round(ctx.canvasWidth * 0.38),
        x: Math.round(ctx.canvasWidth * 0.24),
        y: Math.round(ctx.canvasHeight * 0.57),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.muted,
        fontSize: Math.round(ctx.canvasHeight * 0.046),
        fontWeight: "700",
        height: Math.round(ctx.canvasHeight * 0.07),
        name: "Voucher detail",
        text: "Value / valid until",
        width: Math.round(ctx.canvasWidth * 0.38),
        x: Math.round(ctx.canvasWidth * 0.24),
        y: Math.round(ctx.canvasHeight * 0.61),
    }));
    const qrSize = Math.round(ctx.canvasHeight * 0.36);
    addQrPanel(ctx, Math.round(ctx.canvasWidth * 0.76), Math.round(ctx.canvasHeight * 0.39), qrSize);
    addShortLink(ctx, {
        align: "right",
        fontSize: Math.round(ctx.canvasHeight * 0.038),
        height: Math.round(ctx.canvasHeight * 0.06),
        width: Math.round(ctx.canvasWidth * 0.44),
        x: Math.round(ctx.canvasWidth * 0.50),
        y: Math.round(ctx.canvasHeight * 0.82),
    });
}

function buildBusinessCard(ctx: BuildContext) {
    addDecor(ctx);
    const margin = Math.round(ctx.canvasWidth * 0.07);
    addIdentityBadge(ctx, margin, Math.round(ctx.canvasHeight * 0.13), Math.round(ctx.canvasHeight * 0.20));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasHeight * 0.098),
        fontWeight: "900",
        height: Math.round(ctx.canvasHeight * 0.18),
        name: "Business name",
        text: truncateForLayer(ctx.input.storeName, 34),
        width: Math.round(ctx.canvasWidth * 0.56),
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.40),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.accent,
        fontSize: Math.round(ctx.canvasHeight * 0.055),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.09),
        name: "Card purpose",
        text: `${ctx.labels.offeringTitle} & updates`,
        width: Math.round(ctx.canvasWidth * 0.56),
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.60),
    }));
    const qrSize = Math.round(ctx.canvasHeight * 0.38);
    addQrPanel(ctx, Math.round(ctx.canvasWidth * 0.70), Math.round(ctx.canvasHeight * 0.24), qrSize);
    addShortLink(ctx, {
        align: "left",
        fontSize: Math.round(ctx.canvasHeight * 0.038),
        height: Math.round(ctx.canvasHeight * 0.08),
        width: Math.round(ctx.canvasWidth * 0.56),
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.78),
    });
}

function buildEventInvitation(ctx: BuildContext) {
    addDecor(ctx);
    const margin = Math.round(ctx.canvasWidth * 0.10);
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accent,
        fontFamily: ctx.input.templateFamilyId === "classic-luxe" || ctx.input.templateFamilyId === "botanical-heritage" ? "Georgia, serif" : "Inter, Arial, sans-serif",
        fontSize: Math.round(ctx.canvasWidth * 0.095),
        fontWeight: "900",
        height: Math.round(ctx.canvasHeight * 0.12),
        name: "Invitation headline",
        text: "YOU ARE INVITED",
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.16),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasWidth * 0.058),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.08),
        name: "Business name",
        text: truncateForLayer(ctx.input.storeName, 42),
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.32),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.muted,
        fontSize: Math.round(ctx.canvasWidth * 0.038),
        fontWeight: "700",
        height: Math.round(ctx.canvasHeight * 0.08),
        name: "Invitation details",
        text: "Special evening, private event, or new launch. Edit this copy before printing.",
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.42),
    }));
    addQrPanel(ctx, Math.round(ctx.canvasWidth * 0.30), Math.round(ctx.canvasHeight * 0.56), Math.round(ctx.canvasWidth * 0.40));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accent,
        fontSize: Math.round(ctx.canvasWidth * 0.045),
        fontWeight: "900",
        height: Math.round(ctx.canvasHeight * 0.06),
        name: "Call to action",
        text: "SCAN FOR DETAILS",
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.82),
    }));
    addShortLink(ctx, {
        fontSize: Math.round(ctx.canvasWidth * 0.026),
        height: Math.round(ctx.canvasHeight * 0.04),
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.88),
    });
}

function buildPostcard(ctx: BuildContext) {
    addDecor(ctx);
    const margin = Math.round(ctx.canvasWidth * 0.08);
    const panelWidth = Math.round(ctx.canvasWidth * 0.46);
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.accent,
        height: Math.round(ctx.canvasHeight * 0.72),
        name: "Postcard accent panel",
        opacity: 0.16,
        radius: Math.round(ctx.canvasHeight * 0.035),
        width: panelWidth,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.14),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.accent,
        fontFamily: ctx.input.templateFamilyId === "classic-luxe" || ctx.input.templateFamilyId === "botanical-heritage" ? "Georgia, serif" : "Inter, Arial, sans-serif",
        fontSize: Math.round(ctx.canvasHeight * 0.13),
        fontWeight: "900",
        height: Math.round(ctx.canvasHeight * 0.18),
        name: "Postcard headline",
        text: "THANK YOU",
        width: panelWidth - margin,
        x: margin + Math.round(ctx.canvasWidth * 0.045),
        y: Math.round(ctx.canvasHeight * 0.23),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasHeight * 0.052),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.08),
        name: "Business name",
        text: truncateForLayer(ctx.input.storeName, 42),
        width: panelWidth - margin,
        x: margin + Math.round(ctx.canvasWidth * 0.045),
        y: Math.round(ctx.canvasHeight * 0.43),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.muted,
        fontSize: Math.round(ctx.canvasHeight * 0.038),
        fontWeight: "700",
        height: Math.round(ctx.canvasHeight * 0.13),
        name: "Postcard note",
        text: "A quick note, offer, reminder, or customer thank-you. Edit this before printing.",
        width: panelWidth - margin,
        x: margin + Math.round(ctx.canvasWidth * 0.045),
        y: Math.round(ctx.canvasHeight * 0.54),
    }));
    const qrSize = Math.round(ctx.canvasHeight * 0.42);
    addQrPanel(ctx, Math.round(ctx.canvasWidth * 0.68), Math.round(ctx.canvasHeight * 0.24), qrSize);
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accent,
        fontSize: Math.round(ctx.canvasHeight * 0.045),
        fontWeight: "900",
        height: Math.round(ctx.canvasHeight * 0.07),
        name: "Postcard call to action",
        text: "SCAN FOR LATEST",
        width: Math.round(ctx.canvasWidth * 0.32),
        x: Math.round(ctx.canvasWidth * 0.63),
        y: Math.round(ctx.canvasHeight * 0.70),
    }));
    addShortLink(ctx, {
        fontSize: Math.round(ctx.canvasHeight * 0.028),
        height: Math.round(ctx.canvasHeight * 0.05),
        width: Math.round(ctx.canvasWidth * 0.34),
        x: Math.round(ctx.canvasWidth * 0.62),
        y: Math.round(ctx.canvasHeight * 0.79),
    });
}

function buildProductTag(ctx: BuildContext) {
    addDecor(ctx);
    const margin = Math.round(ctx.canvasWidth * 0.07);
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.accent,
        fontSize: Math.round(ctx.canvasHeight * 0.18),
        fontWeight: "900",
        height: Math.round(ctx.canvasHeight * 0.22),
        name: "Tag headline",
        text: "NEW",
        width: Math.round(ctx.canvasWidth * 0.44),
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.16),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasHeight * 0.07),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.10),
        name: "Product detail",
        text: "Customer favorite",
        width: Math.round(ctx.canvasWidth * 0.48),
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.42),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.muted,
        fontSize: Math.round(ctx.canvasHeight * 0.046),
        fontWeight: "700",
        height: Math.round(ctx.canvasHeight * 0.08),
        name: "Business name",
        text: truncateForLayer(ctx.input.storeName, 32),
        width: Math.round(ctx.canvasWidth * 0.48),
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.56),
    }));
    const qrSize = Math.round(ctx.canvasHeight * 0.42);
    addQrPanel(ctx, Math.round(ctx.canvasWidth * 0.68), Math.round(ctx.canvasHeight * 0.24), qrSize);
    addShortLink(ctx, {
        align: "left",
        fontSize: Math.round(ctx.canvasHeight * 0.034),
        height: Math.round(ctx.canvasHeight * 0.07),
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.82),
    });
}

function buildCampaignPoster(ctx: BuildContext) {
    addDecor(ctx);
    const margin = Math.round(ctx.canvasWidth * 0.09);
    const isBanner = ctx.input.templateFamilyId === "brand-banner" || ctx.input.templateFamilyId === "local-bold";
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: isBanner ? ctx.accentText : ctx.accent,
        fontSize: Math.round(ctx.canvasWidth * 0.105),
        fontWeight: "900",
        height: Math.round(ctx.canvasHeight * 0.13),
        name: "Poster headline",
        text: "TODAY'S SPECIAL",
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.12),
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
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.accent,
        height: Math.round(ctx.canvasHeight * 0.12),
        name: "Offer strip",
        opacity: 0.16,
        radius: Math.round(ctx.canvasWidth * 0.04),
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.40),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasWidth * 0.052),
        fontWeight: "900",
        height: Math.round(ctx.canvasHeight * 0.08),
        name: "Offer copy",
        text: "Fresh offer available now",
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.425),
    }));
    addQrPanel(ctx, Math.round(ctx.canvasWidth * 0.29), Math.round(ctx.canvasHeight * 0.58), Math.round(ctx.canvasWidth * 0.42));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accent,
        fontSize: Math.round(ctx.canvasWidth * 0.045),
        fontWeight: "900",
        height: Math.round(ctx.canvasHeight * 0.06),
        name: "Call to action",
        text: "SCAN FOR OFFER",
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.84),
    }));
    addShortLink(ctx, {
        fontSize: Math.round(ctx.canvasWidth * 0.026),
        height: Math.round(ctx.canvasHeight * 0.04),
        width: ctx.canvasWidth - margin * 2,
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.90),
    });
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
    else if (input.assetTypeId === "campaign_flyer") buildCampaignFlyer(ctx);
    else if (input.assetTypeId === "gift_certificate") buildGiftCertificate(ctx);
    else if (input.assetTypeId === "business_card") buildBusinessCard(ctx);
    else if (input.assetTypeId === "event_invitation") buildEventInvitation(ctx);
    else if (input.assetTypeId === "postcard") buildPostcard(ctx);
    else if (input.assetTypeId === "product_tag") buildProductTag(ctx);
    else if (input.assetTypeId === "campaign_poster") buildCampaignPoster(ctx);
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

function readBlobAsDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Failed to read generated image"));
        reader.readAsDataURL(blob);
    });
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Failed to load generated image"));
        image.src = dataUrl;
    });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to render branded image"));
        }, "image/png");
    });
}

async function applyRuntimeMenuListAttribution(params: {
    activePlanType?: string | null;
    blob: Blob;
    documentValue: CreativeEditorDocument;
}): Promise<Blob> {
    if (!resolveMenuListAttributionPolicy({ activePlanType: params.activePlanType }).showAttribution) {
        return params.blob;
    }
    if (typeof document === "undefined") return params.blob;

    const image = await loadImageFromDataUrl(await readBlobAsDataUrl(params.blob));
    const width = Math.max(1, image.naturalWidth || params.documentValue.canvas.width);
    const height = Math.max(1, image.naturalHeight || params.documentValue.canvas.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return params.blob;
    ctx.drawImage(image, 0, 0, width, height);

    const fontSize = Math.round(Math.min(28, Math.max(16, width * 0.014)));
    const marginX = Math.round(Math.min(96, Math.max(42, width * 0.04)));
    const marginY = Math.round(Math.min(96, Math.max(44, height * 0.04)));
    drawMenuListAttribution(ctx, {
        activePlanType: params.activePlanType,
        align: "right",
        color: "rgba(75, 85, 99, 0.78)",
        font: `700 ${fontSize}px Inter, Arial, sans-serif`,
        gap: Math.max(6, Math.round(fontSize * 0.36)),
        logoHeight: Math.max(18, Math.round(fontSize * 1.35)),
        text: MENU_LIST_DOMAIN,
        x: width - marginX,
        y: height - marginY,
    });

    return canvasToPngBlob(canvas);
}

export async function renderPrintableAssetEditorDocument(params: {
    activePlanType?: string | null;
    assetTypeId: PrintableAssetTypeId;
    document: CreativeEditorDocument;
    outputFormat: Exclude<PrintableAssetOutputFormat, "zip">;
    templateFamilyId?: string;
}): Promise<PrintableAssetRenderResult> {
    const assetType = getPrintableAssetType(params.assetTypeId);
    const documentValue = stripPrintableAssetEditorAttributionLayers(params.document);
    if (params.outputFormat === "png") {
        const result = await renderCreativeEditorPngBlob(documentValue);
        if (!result.blob) throw new Error("PNG export failed");
        const blob = await applyRuntimeMenuListAttribution({
            activePlanType: params.activePlanType,
            blob: result.blob,
            documentValue,
        });
        return {
            blob,
            filename: result.filename.replace(/\.png$/i, `_${params.assetTypeId}.png`),
            label: assetType.title,
            mimeType: "image/png",
            outputFormat: "png",
        };
    }

    const result = await renderCreativeEditorPngBlob(documentValue);
    if (!result.blob) throw new Error("PDF export failed");
    const blob = await applyRuntimeMenuListAttribution({
        activePlanType: params.activePlanType,
        blob: result.blob,
        documentValue,
    });
    const dataUrl = await readBlobAsDataUrl(blob);
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
        activePlanType: input.activePlanType,
        assetTypeId: input.assetTypeId,
        document: documentValue,
        outputFormat: input.outputFormat === "pdf" ? "pdf" : "png",
        templateFamilyId: input.templateFamilyId,
    });
}
