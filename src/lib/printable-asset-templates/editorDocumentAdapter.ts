import { renderCreativeEditorPngBlob } from "@/modules/creative-editor/export";
import {
    CREATIVE_EDITOR_SCHEMA_VERSION,
    CreativeEditorDocument,
    CreativeEditorElement,
    CreativeEditorPrintFrame,
} from "@/modules/creative-editor/types";
import { getOfferingLabels } from "@lib/menu-kit/businessTypeLabels";
import { drawMenuListAttribution, MENU_LIST_DOMAIN } from "@lib/menu-kit/platformAttribution";
import { resolveMenuListAttributionPolicy } from "@lib/platform/menuListBranding";
import { creativeEditorDocumentSchema } from "@lib/validation/creativeEditorTemplateSchemas";
import { admitPrintableAssetRenderInput } from "./inputBoundary";
import { getPrintableAssetType } from "./assetTypes";
import { resolvePrintableTemplateBrandTokens } from "./templateStyles";
import type {
    PrintableAssetOutputFormat,
    PrintableAssetRenderInput,
    PrintableAssetRenderResult,
    PrintableAssetTypeId,
} from "./types";

const BUSINESS_CARD_FACE_WIDTH = 1063;
const BUSINESS_CARD_FACE_HEIGHT = 650;
const BUSINESS_CARD_FACE_GAP = 40;
const BUSINESS_CARD_COMBINED_WIDTH = BUSINESS_CARD_FACE_WIDTH * 2 + BUSINESS_CARD_FACE_GAP;
const BUSINESS_CARD_BACK_FACE_OFFSET = BUSINESS_CARD_FACE_WIDTH + BUSINESS_CARD_FACE_GAP;
type BusinessCardFace = "front" | "back";

const BUSINESS_CARD_FRONT_FACE_ID: BusinessCardFace = "front";
const BUSINESS_CARD_BACK_FACE_ID: BusinessCardFace = "back";

const EDITOR_RENDERABLE_ASSETS = new Set<PrintableAssetTypeId>([
    "table_tent",
    "single_table_card",
    "counter_sticker",
    "entrance_poster",
    "feedback_qr",
    "campaign_flyer",
    "gift_certificate",
    "business_card",
    "staff_id_card",
    "event_invitation",
    "postcard",
    "product_tag",
    "campaign_poster",
]);

const PRINT_DIMENSIONS: Record<PrintableAssetTypeId, { height: number; heightMm: number; width: number; widthMm: number }> = {
    business_card: { width: BUSINESS_CARD_COMBINED_WIDTH, height: BUSINESS_CARD_FACE_HEIGHT, widthMm: 183, heightMm: 55 },
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
    staff_id_card: { width: 900, height: 1420, widthMm: 54, heightMm: 85 },
    table_tent: { width: 2480, height: 1748, widthMm: 210, heightMm: 148 },
};

export function admitPrintableAssetEditorDocument(
    documentValue: unknown,
    assetTypeId: PrintableAssetTypeId,
): CreativeEditorDocument {
    if (!isPrintableAssetEditorRenderable(assetTypeId)) {
        throw new Error(`Editor templates are not available for ${assetTypeId}`);
    }
    const parsed = creativeEditorDocumentSchema.safeParse(documentValue);
    if (!parsed.success || parsed.data.productContext.productId !== "menulist") {
        throw new Error("Invalid printable asset editor document");
    }

    if (assetTypeId !== "business_card") {
        const dimensions = PRINT_DIMENSIONS[assetTypeId];
        if (
            parsed.data.canvas.width !== dimensions.width
            || parsed.data.canvas.height !== dimensions.height
        ) {
            throw new Error("Printable asset editor document size does not match the selected asset");
        }
    }
    return parsed.data;
}

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

export function getPrintableAssetDisplayShortLink(input: PrintableAssetRenderInput): string {
    const sourceUrl = input.assetTypeId === "feedback_qr"
        ? (input.feedbackUrl || input.menuUrl)
        : (input.shortLink || input.menuUrl);
    return sourceUrl.replace(/^https?:\/\//, "");
}

function getDisplayShortLink(ctx: BuildContext): string {
    return getPrintableAssetDisplayShortLink(ctx.input);
}

function getContactPhone(ctx: BuildContext): string {
    return truncateForLayer(ctx.input.contactPhone || "Phone number", 32);
}

function getContactName(ctx: BuildContext): string {
    return truncateForLayer(ctx.input.contactName || ctx.input.storeName, 34);
}

function getContactRole(ctx: BuildContext): string {
    return truncateForLayer(ctx.input.contactRole || "Owner / Manager", 28);
}

function getContactEmailOrLink(ctx: BuildContext): string {
    return truncateForLayer(ctx.input.contactEmail || getDisplayShortLink(ctx), 34);
}

function getContactAddress(ctx: BuildContext): string {
    return truncateForLayer(ctx.input.contactAddress || "Business address", 46);
}

function getSocialHandle(ctx: BuildContext): string {
    return truncateForLayer(ctx.input.socialHandle || "Follow / save / share", 30);
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

function getBusinessCardPrintFrames(): CreativeEditorPrintFrame[] {
    return [
        {
            height: BUSINESS_CARD_FACE_HEIGHT,
            id: BUSINESS_CARD_FRONT_FACE_ID,
            label: "Front",
            locked: true,
            width: BUSINESS_CARD_FACE_WIDTH,
            x: 0,
            y: 0,
        },
        {
            height: BUSINESS_CARD_FACE_HEIGHT,
            id: BUSINESS_CARD_BACK_FACE_ID,
            label: "Back",
            locked: true,
            width: BUSINESS_CARD_FACE_WIDTH,
            x: BUSINESS_CARD_BACK_FACE_OFFSET,
            y: 0,
        },
    ];
}

function getBusinessCardPrintFrame(face: BusinessCardFace): CreativeEditorPrintFrame {
    return getBusinessCardPrintFrames().find((frame) => frame.id === face) || getBusinessCardPrintFrames()[0];
}

function isNonExportEditorGuide(element: CreativeEditorElement): boolean {
    return Boolean(element.editorGuide || element.excludeFromExport || element.name === "Side divider");
}

function clampElementToFrame(element: CreativeEditorElement, frame: CreativeEditorPrintFrame): CreativeEditorElement {
    const maxX = Math.max(frame.x, frame.x + frame.width - element.width);
    const maxY = Math.max(frame.y, frame.y + frame.height - element.height);
    return {
        ...element,
        x: clamp(element.x, frame.x, maxX),
        y: clamp(element.y, frame.y, maxY),
    };
}

function inferBusinessCardPrintFrame(element: CreativeEditorElement): CreativeEditorPrintFrame {
    const frames = getBusinessCardPrintFrames();
    const centerX = element.x + element.width / 2;
    return frames.find((frame) => centerX >= frame.x && centerX <= frame.x + frame.width)
        || frames.reduce((closestFrame, frame) => {
            const frameCenterX = frame.x + frame.width / 2;
            const closestDistance = Math.abs(centerX - (closestFrame.x + closestFrame.width / 2));
            const frameDistance = Math.abs(centerX - frameCenterX);
            return frameDistance < closestDistance ? frame : closestFrame;
        }, frames[0]);
}

function normalizeBusinessCardEditorDocument(documentValue: CreativeEditorDocument): CreativeEditorDocument {
    const frameById = new Map(getBusinessCardPrintFrames().map((frame) => [frame.id, frame]));
    return {
        ...documentValue,
        canvas: {
            ...documentValue.canvas,
            height: BUSINESS_CARD_FACE_HEIGHT,
            width: BUSINESS_CARD_COMBINED_WIDTH,
        },
        elements: documentValue.elements.map((element) => {
            const frame = element.printFrameId
                ? frameById.get(element.printFrameId)
                : isNonExportEditorGuide(element)
                    ? undefined
                    : inferBusinessCardPrintFrame(element);
            const frameElement = frame && !element.printFrameId
                ? ({ ...element, printFrameId: frame.id } as CreativeEditorElement)
                : element;
            const nextElement = frame ? clampElementToFrame(frameElement, frame) : frameElement;
            if (nextElement.printFrameLocked) {
                return {
                    ...nextElement,
                    locked: true,
                } as CreativeEditorElement;
            }
            return nextElement;
        }),
        metadata: {
            ...documentValue.metadata,
            printFrames: getBusinessCardPrintFrames(),
        },
    };
}

function preparePrintableAssetDocumentForExport(
    documentValue: CreativeEditorDocument,
    assetTypeId: PrintableAssetTypeId,
): CreativeEditorDocument {
    const normalizedDocument = assetTypeId === "business_card"
        ? normalizeBusinessCardEditorDocument(documentValue)
        : documentValue;
    return {
        ...normalizedDocument,
        elements: normalizedDocument.elements.filter((element) => !isNonExportEditorGuide(element)),
    };
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
        id: ctx.id("qr"),
        lightColor: "#ffffff",
        locked: true,
        margin: 4,
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

function addBrandMark(ctx: BuildContext, x: number, y: number, size: number, align: "left" | "center" = "left") {
    const markX = align === "center" ? x - size / 2 : x;
    if (ctx.input.logoUrl) {
        ctx.elements.push(imageElement(ctx, {
            height: size,
            locked: true,
            name: "Business logo",
            src: ctx.input.logoUrl,
            width: size,
            x: markX,
            y,
        }));
        return;
    }
    addIdentityBadge(ctx, x, y, size, align);
}

function addContactLine(ctx: BuildContext, params: {
    fill?: string;
    icon: string;
    text: string;
    textColor?: string;
    width: number;
    x: number;
    y: number;
}) {
    const size = Math.round(ctx.canvasHeight * 0.072);
    const iconFill = params.fill || ctx.accent;
    const lineTextColor = params.textColor || ctx.text;
    ctx.elements.push(ellipseElement(ctx, {
        fill: iconFill,
        height: size,
        name: `${params.icon} icon`,
        width: size,
        x: params.x,
        y: params.y,
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accentText,
        fontSize: Math.round(size * 0.42),
        fontWeight: "900",
        height: size,
        name: `${params.icon} symbol`,
        text: params.icon,
        width: size,
        x: params.x,
        y: params.y + Math.round(size * 0.24),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: lineTextColor,
        fontSize: Math.round(ctx.canvasHeight * 0.045),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.075),
        name: "Contact detail",
        text: params.text,
        width: params.width,
        x: params.x + size + Math.round(ctx.canvasWidth * 0.028),
        y: params.y + Math.round(size * 0.14),
    }));
}

function addCardCornerRibbons(ctx: BuildContext, variant: "front" | "back" | "id" = "front") {
    const navy = ctx.input.templateFamilyId === "executive-dark" ? "#080d18" : "#071a74";
    const deep = ctx.input.templateFamilyId === "executive-dark" ? "#111827" : "#11246f";
    const pink = ctx.input.templateFamilyId === "executive-dark" ? ctx.accent : "#dd72a2";
    const subtle = ctx.input.templateFamilyId === "executive-dark" ? "rgba(255,255,255,0.06)" : "rgba(7,26,116,0.08)";

    if (variant === "id") {
        ctx.elements.push(rectElement(ctx, {
            fill: navy,
            height: Math.round(ctx.canvasHeight * 0.16),
            locked: true,
            name: "Top brand ribbon",
            radius: Math.round(ctx.canvasWidth * 0.05),
            rotation: 8,
            width: Math.round(ctx.canvasWidth * 0.74),
            x: Math.round(ctx.canvasWidth * 0.05),
            y: Math.round(ctx.canvasHeight * 0.00),
        }));
        ctx.elements.push(rectElement(ctx, {
            fill: pink,
            height: Math.round(ctx.canvasHeight * 0.16),
            locked: true,
            name: "Top accent ribbon",
            radius: Math.round(ctx.canvasWidth * 0.045),
            rotation: 36,
            width: Math.round(ctx.canvasWidth * 0.46),
            x: Math.round(ctx.canvasWidth * 0.50),
            y: Math.round(ctx.canvasHeight * 0.00),
        }));
        ctx.elements.push(rectElement(ctx, {
            fill: pink,
            height: Math.round(ctx.canvasHeight * 0.18),
            locked: true,
            name: "Bottom accent ribbon",
            radius: Math.round(ctx.canvasWidth * 0.045),
            rotation: -28,
            width: Math.round(ctx.canvasWidth * 0.64),
            x: Math.round(ctx.canvasWidth * 0.00),
            y: Math.round(ctx.canvasHeight * 0.78),
        }));
        ctx.elements.push(rectElement(ctx, {
            fill: navy,
            height: Math.round(ctx.canvasHeight * 0.18),
            locked: true,
            name: "Bottom brand ribbon",
            radius: Math.round(ctx.canvasWidth * 0.055),
            rotation: -18,
            width: Math.round(ctx.canvasWidth * 0.68),
            x: Math.round(ctx.canvasWidth * 0.28),
            y: Math.round(ctx.canvasHeight * 0.82),
        }));
        return;
    }

    ctx.elements.push(rectElement(ctx, {
        fill: navy,
        height: Math.round(ctx.canvasHeight * 0.86),
        locked: true,
        name: "Brand color field",
        radius: Math.round(ctx.canvasHeight * 0.05),
        rotation: variant === "front" ? 0 : -15,
        width: Math.round(ctx.canvasWidth * (variant === "front" ? 0.40 : 0.54)),
        x: Math.round(ctx.canvasWidth * (variant === "front" ? 0.56 : 0.02)),
        y: Math.round(ctx.canvasHeight * (variant === "front" ? 0.02 : 0.08)),
    }));
    ctx.elements.push(rectElement(ctx, {
        fill: pink,
        height: Math.round(ctx.canvasHeight * 0.23),
        locked: true,
        name: "Accent sweep",
        radius: Math.round(ctx.canvasHeight * 0.06),
        rotation: variant === "front" ? 38 : 16,
        width: Math.round(ctx.canvasWidth * (variant === "front" ? 0.50 : 0.62)),
        x: Math.round(ctx.canvasWidth * (variant === "front" ? 0.45 : 0.12)),
        y: Math.round(ctx.canvasHeight * (variant === "front" ? 0.50 : 0.00)),
    }));
    ctx.elements.push(rectElement(ctx, {
        fill: deep,
        height: Math.round(ctx.canvasHeight * 0.24),
        locked: true,
        name: "Deep corner",
        opacity: variant === "front" ? 1 : 0.9,
        radius: Math.round(ctx.canvasHeight * 0.045),
        rotation: variant === "front" ? 44 : -38,
        width: Math.round(ctx.canvasWidth * (variant === "front" ? 0.34 : 0.38)),
        x: Math.round(ctx.canvasWidth * (variant === "front" ? 0.63 : 0.58)),
        y: Math.round(ctx.canvasHeight * (variant === "front" ? 0.07 : 0.03)),
    }));
    ctx.elements.push(rectElement(ctx, {
        fill: subtle,
        height: Math.round(ctx.canvasHeight * 0.18),
        locked: true,
        name: "Soft shape",
        radius: Math.round(ctx.canvasHeight * 0.06),
        rotation: -28,
        width: Math.round(ctx.canvasWidth * 0.36),
        x: Math.round(ctx.canvasWidth * 0.00),
        y: Math.round(ctx.canvasHeight * 0.68),
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
        const curveHeight = Math.round(Math.min(ctx.canvasWidth * 0.52, ctx.canvasHeight * 0.78));
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
    addIdentityBadge(ctx, ctx.canvasWidth / 2, Math.round(ctx.canvasHeight * 0.05), Math.round(ctx.canvasWidth * 0.14), "center");
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasWidth * 0.057),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.075),
        name: "Business name",
        text: truncateForLayer(ctx.input.storeName, 30),
        width: Math.round(ctx.canvasWidth * 0.86),
        x: Math.round(ctx.canvasWidth * 0.07),
        y: Math.round(ctx.canvasHeight * 0.20),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accent,
        fontSize: Math.round(ctx.canvasWidth * 0.045),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.06),
        name: "Call to action",
        text: `SCAN ${ctx.labels.offeringUpper}`,
        width: Math.round(ctx.canvasWidth * 0.82),
        x: Math.round(ctx.canvasWidth * 0.09),
        y: Math.round(ctx.canvasHeight * 0.285),
    }));
    addQrPanel(ctx, Math.round(ctx.canvasWidth * 0.27), Math.round(ctx.canvasHeight * 0.39), Math.round(ctx.canvasWidth * 0.46));
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

function offsetFaceElements(
    elements: CreativeEditorElement[],
    offsetX: number,
    offsetY: number,
    printFrameId: BusinessCardFace,
): CreativeEditorElement[] {
    return elements.map((element) => ({
        ...element,
        locked: Boolean(element.locked || element.printFrameLocked),
        printFrameId,
        printFrameLocked: Boolean(element.locked || element.printFrameLocked),
        x: element.x + offsetX,
        y: element.y + offsetY,
    }));
}

function addBusinessCardFace(
    ctx: BuildContext,
    offsetX: number,
    printFrameId: BusinessCardFace,
    builder: (faceCtx: BuildContext) => void,
) {
    const faceElements: CreativeEditorElement[] = [];
    const faceCtx: BuildContext = {
        ...ctx,
        canvasHeight: BUSINESS_CARD_FACE_HEIGHT,
        canvasWidth: BUSINESS_CARD_FACE_WIDTH,
        elements: faceElements,
    };
    builder(faceCtx);
    ctx.elements.push(...offsetFaceElements(faceElements, offsetX, 0, printFrameId));
}

function buildBusinessCardFrontFace(ctx: BuildContext) {
    addCardCornerRibbons(ctx, "front");
    const margin = Math.round(ctx.canvasWidth * 0.07);
    addBrandMark(ctx, margin, Math.round(ctx.canvasHeight * 0.10), Math.round(ctx.canvasHeight * 0.16));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasHeight * 0.082),
        fontWeight: "900",
        height: Math.round(ctx.canvasHeight * 0.12),
        name: "Contact name",
        text: getContactName(ctx),
        width: Math.round(ctx.canvasWidth * 0.50),
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.38),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.accent,
        fontSize: Math.round(ctx.canvasHeight * 0.045),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.07),
        name: "Role",
        text: getContactRole(ctx),
        width: Math.round(ctx.canvasWidth * 0.48),
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.50),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasHeight * 0.044),
        fontWeight: "900",
        height: Math.round(ctx.canvasHeight * 0.08),
        name: "Business name",
        text: truncateForLayer(ctx.input.storeName, 34),
        width: Math.round(ctx.canvasWidth * 0.56),
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.60),
    }));
    addContactLine(ctx, {
        fill: "#071a74",
        icon: "P",
        text: getContactPhone(ctx),
        width: Math.round(ctx.canvasWidth * 0.40),
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.72),
    });
    addContactLine(ctx, {
        fill: "#dd72a2",
        icon: "@",
        text: getContactEmailOrLink(ctx),
        width: Math.round(ctx.canvasWidth * 0.40),
        x: Math.round(ctx.canvasWidth * 0.34),
        y: Math.round(ctx.canvasHeight * 0.72),
    });
    const qrSize = Math.round(ctx.canvasHeight * 0.34);
    addQrPanel(ctx, Math.round(ctx.canvasWidth * 0.72), Math.round(ctx.canvasHeight * 0.18), qrSize);
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: "#dd72a2",
        fontFamily: "Georgia, serif",
        fontSize: Math.round(ctx.canvasHeight * 0.05),
        fontStyle: "italic",
        fontWeight: "700",
        height: Math.round(ctx.canvasHeight * 0.08),
        name: "Scan note",
        text: `Scan for ${ctx.labels.offeringLower}`,
        width: Math.round(ctx.canvasWidth * 0.32),
        x: Math.round(ctx.canvasWidth * 0.65),
        y: Math.round(ctx.canvasHeight * 0.66),
    }));
    addShortLink(ctx, {
        align: "left",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasHeight * 0.036),
        height: Math.round(ctx.canvasHeight * 0.08),
        width: Math.round(ctx.canvasWidth * 0.50),
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.86),
    });
}

function buildBusinessCardBackFace(ctx: BuildContext) {
    addCardCornerRibbons(ctx, "back");
    const centerX = Math.round(ctx.canvasWidth * 0.50);
    const markSize = Math.round(ctx.canvasHeight * 0.20);
    addBrandMark(ctx, centerX, Math.round(ctx.canvasHeight * 0.26), markSize, "center");
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasHeight * 0.075),
        fontWeight: "900",
        height: Math.round(ctx.canvasHeight * 0.10),
        name: "Business name",
        text: truncateForLayer(ctx.input.storeName, 34),
        width: Math.round(ctx.canvasWidth * 0.60),
        x: Math.round(ctx.canvasWidth * 0.20),
        y: Math.round(ctx.canvasHeight * 0.49),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        charSpacing: 220,
        color: ctx.accent,
        fontSize: Math.round(ctx.canvasHeight * 0.034),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.07),
        name: "Tagline",
        text: "SCAN SAVE VISIT",
        width: Math.round(ctx.canvasWidth * 0.68),
        x: Math.round(ctx.canvasWidth * 0.16),
        y: Math.round(ctx.canvasHeight * 0.61),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasHeight * 0.042),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.07),
        name: "Social handles",
        text: getSocialHandle(ctx),
        width: Math.round(ctx.canvasWidth * 0.58),
        x: Math.round(ctx.canvasWidth * 0.37),
        y: Math.round(ctx.canvasHeight * 0.73),
    }));
    addShortLink(ctx, {
        align: "center",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasHeight * 0.062),
        height: Math.round(ctx.canvasHeight * 0.10),
        width: Math.round(ctx.canvasWidth * 0.68),
        x: Math.round(ctx.canvasWidth * 0.27),
        y: Math.round(ctx.canvasHeight * 0.84),
    });
}

function buildBusinessCard(ctx: BuildContext) {
    addBusinessCardFace(ctx, 0, BUSINESS_CARD_FRONT_FACE_ID, buildBusinessCardFrontFace);
    ctx.elements.push(lineElement(ctx, {
        editorGuide: true,
        excludeFromExport: true,
        height: Math.round(ctx.canvasHeight * 0.86),
        locked: true,
        name: "Side divider",
        opacity: 0.45,
        printFrameLocked: true,
        stroke: ctx.borderColor,
        strokeStyle: "dashed",
        strokeWidth: 3,
        width: 0,
        x: BUSINESS_CARD_FACE_WIDTH + Math.round(BUSINESS_CARD_FACE_GAP / 2),
        y: Math.round(ctx.canvasHeight * 0.07),
    }));
    addBusinessCardFace(ctx, BUSINESS_CARD_BACK_FACE_OFFSET, BUSINESS_CARD_BACK_FACE_ID, buildBusinessCardBackFace);
}

function buildStaffIdCard(ctx: BuildContext) {
    addCardCornerRibbons(ctx, "id");
    addBrandMark(ctx, Math.round(ctx.canvasWidth * 0.08), Math.round(ctx.canvasHeight * 0.08), Math.round(ctx.canvasWidth * 0.12));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasWidth * 0.055),
        fontWeight: "900",
        height: Math.round(ctx.canvasHeight * 0.06),
        name: "Business name",
        text: truncateForLayer(ctx.input.storeName, 28),
        width: Math.round(ctx.canvasWidth * 0.48),
        x: Math.round(ctx.canvasWidth * 0.22),
        y: Math.round(ctx.canvasHeight * 0.10),
    }));
    const photoSize = Math.round(ctx.canvasWidth * 0.42);
    const photoX = Math.round((ctx.canvasWidth - photoSize) / 2);
    const photoY = Math.round(ctx.canvasHeight * 0.27);
    ctx.elements.push(ellipseElement(ctx, {
        fill: ctx.input.templateFamilyId === "executive-dark" ? "#1f2937" : "#f3f4f6",
        height: photoSize,
        name: "Photo placeholder",
        stroke: "#dd72a2",
        strokeWidth: Math.round(ctx.canvasWidth * 0.025),
        width: photoSize,
        x: photoX,
        y: photoY,
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.muted,
        fontSize: Math.round(ctx.canvasWidth * 0.052),
        fontWeight: "900",
        height: Math.round(photoSize * 0.18),
        name: "Photo label",
        text: "PHOTO",
        width: photoSize,
        x: photoX,
        y: photoY + Math.round(photoSize * 0.42),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasWidth * 0.085),
        fontWeight: "900",
        height: Math.round(ctx.canvasHeight * 0.075),
        name: "Staff name",
        text: getContactName(ctx),
        width: Math.round(ctx.canvasWidth * 0.76),
        x: Math.round(ctx.canvasWidth * 0.12),
        y: Math.round(ctx.canvasHeight * 0.56),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        charSpacing: 160,
        color: ctx.accent,
        fontSize: Math.round(ctx.canvasWidth * 0.042),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.06),
        name: "Staff role",
        text: getContactRole(ctx).toUpperCase(),
        width: Math.round(ctx.canvasWidth * 0.68),
        x: Math.round(ctx.canvasWidth * 0.16),
        y: Math.round(ctx.canvasHeight * 0.63),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasWidth * 0.049),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.06),
        name: "Phone number",
        text: getContactPhone(ctx),
        width: Math.round(ctx.canvasWidth * 0.76),
        x: Math.round(ctx.canvasWidth * 0.12),
        y: Math.round(ctx.canvasHeight * 0.71),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasWidth * 0.04),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.085),
        name: "Address",
        text: getContactAddress(ctx),
        width: Math.round(ctx.canvasWidth * 0.76),
        x: Math.round(ctx.canvasWidth * 0.12),
        y: Math.round(ctx.canvasHeight * 0.77),
    }));
    addShortLink(ctx, {
        align: "center",
        color: "#ffffff",
        fontSize: Math.round(ctx.canvasWidth * 0.045),
        height: Math.round(ctx.canvasHeight * 0.05),
        width: Math.round(ctx.canvasWidth * 0.76),
        x: Math.round(ctx.canvasWidth * 0.12),
        y: Math.round(ctx.canvasHeight * 0.94),
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
    const admittedInput = admitPrintableAssetRenderInput(input);
    if (!isPrintableAssetEditorRenderable(admittedInput.assetTypeId)) {
        throw new Error(`Editor templates are not available for ${admittedInput.assetTypeId}`);
    }

    const ctx = buildContext(admittedInput);
    if (admittedInput.assetTypeId === "table_tent") buildTableTent(ctx);
    else if (admittedInput.assetTypeId === "counter_sticker") buildSticker(ctx);
    else if (admittedInput.assetTypeId === "entrance_poster") buildEntrancePoster(ctx);
    else if (admittedInput.assetTypeId === "campaign_flyer") buildCampaignFlyer(ctx);
    else if (admittedInput.assetTypeId === "gift_certificate") buildGiftCertificate(ctx);
    else if (admittedInput.assetTypeId === "business_card") buildBusinessCard(ctx);
    else if (admittedInput.assetTypeId === "staff_id_card") buildStaffIdCard(ctx);
    else if (admittedInput.assetTypeId === "event_invitation") buildEventInvitation(ctx);
    else if (admittedInput.assetTypeId === "postcard") buildPostcard(ctx);
    else if (admittedInput.assetTypeId === "product_tag") buildProductTag(ctx);
    else if (admittedInput.assetTypeId === "campaign_poster") buildCampaignPoster(ctx);
    else buildSingleCard(ctx);

    const now = new Date().toISOString();
    const documentValue: CreativeEditorDocument = {
        canvas: {
            backgroundColor: ctx.backgroundColor,
            height: ctx.canvasHeight,
            width: ctx.canvasWidth,
        },
        elements: ctx.elements,
        id: `print_asset_${admittedInput.assetTypeId}_${admittedInput.templateFamilyId}_${Date.now().toString(36)}`,
        metadata: {
            brand: {
                accentColor: ctx.accent,
                fontFamily: "Inter, Arial, sans-serif",
                logoUrl: admittedInput.logoUrl || undefined,
                name: admittedInput.storeName,
                primaryColor: ctx.accent,
                secondaryColor: ctx.text,
            },
            createdAt: now,
            printFrames: admittedInput.assetTypeId === "business_card" ? getBusinessCardPrintFrames() : undefined,
            templateId: `${admittedInput.assetTypeId}:${admittedInput.templateFamilyId}`,
            textPlaceholders: [
                { id: "business-name", label: "Business name", value: admittedInput.storeName },
                { id: "offering", label: "Offering", value: ctx.labels.offeringTitle },
                { id: "scan-link", label: "Scan link", value: ctx.qrValue },
            ],
            updatedAt: now,
        },
        productContext: {
            productId: "menulist",
            sourceSurface: "printable-asset-templates",
            workspaceId: admittedInput.projectId || undefined,
        },
        schemaVersion: CREATIVE_EDITOR_SCHEMA_VERSION,
        title: `${safeName(admittedInput.storeName)} ${ctx.assetTitle} ${admittedInput.templateFamilyId}`,
    };

    return admittedInput.assetTypeId === "business_card"
        ? normalizeBusinessCardEditorDocument(documentValue)
        : documentValue;
}

export function rehydratePrintableAssetEditorDocument(
    documentValue: CreativeEditorDocument,
    input: PrintableAssetRenderInput,
): CreativeEditorDocument {
    const admittedInput = admitPrintableAssetRenderInput(input);
    const admittedDocument = admitPrintableAssetEditorDocument(documentValue, admittedInput.assetTypeId);

    const ctx = buildContext(admittedInput);
    const now = new Date().toISOString();
    const shortLink = getPrintableAssetDisplayShortLink(admittedInput);
    const updatedElements = admittedDocument.elements.map((element): CreativeEditorElement => {
        if (element.type === "qr") {
            return {
                ...element,
                locked: true,
                sourceRefs: [{
                    label: admittedInput.assetTypeId === "feedback_qr" ? "Feedback link" : "Menu link",
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

    const nextDocument: CreativeEditorDocument = {
        ...admittedDocument,
        elements: updatedElements,
        id: `print_asset_saved_${admittedInput.assetTypeId}_${Date.now().toString(36)}`,
        metadata: {
            ...admittedDocument.metadata,
            brand: {
                ...admittedDocument.metadata?.brand,
                accentColor: ctx.accent,
                logoUrl: admittedInput.logoUrl || admittedDocument.metadata?.brand?.logoUrl,
                name: admittedInput.storeName,
                primaryColor: ctx.accent,
                secondaryColor: ctx.text,
            },
            textPlaceholders: [
                { id: "business-name", label: "Business name", value: admittedInput.storeName },
                { id: "offering", label: "Offering", value: ctx.labels.offeringTitle },
                { id: "scan-link", label: "Scan link", value: ctx.qrValue },
            ],
            updatedAt: now,
        },
        productContext: {
            productId: "menulist",
            sourceSurface: "printable-asset-templates",
            workspaceId: admittedInput.projectId || undefined,
        },
        title: admittedDocument.title || `${safeName(admittedInput.storeName)} ${ctx.assetTitle}`,
    };

    return admittedInput.assetTypeId === "business_card"
        ? normalizeBusinessCardEditorDocument(nextDocument)
        : nextDocument;
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
    const admittedDocument = admitPrintableAssetEditorDocument(params.document, params.assetTypeId);
    const documentValue = preparePrintableAssetDocumentForExport(
        stripPrintableAssetEditorAttributionLayers(admittedDocument),
        params.assetTypeId,
    );
    return renderPrintableAssetEditorDocumentFile(params, documentValue);
}

function getBusinessCardFaceDocument(documentValue: CreativeEditorDocument, face: BusinessCardFace): CreativeEditorDocument {
    const normalizedDocument = normalizeBusinessCardEditorDocument(documentValue);
    const frame = normalizedDocument.metadata?.printFrames?.find((item) => item.id === face) || getBusinessCardPrintFrame(face);
    const minX = frame.x;
    const maxX = frame.x + frame.width;
    const elements = normalizedDocument.elements
        .filter((element) => {
            if (isNonExportEditorGuide(element)) return false;
            if (element.printFrameId) return element.printFrameId === face;
            const left = element.x;
            const right = element.x + element.width;
            return right > minX && left < maxX;
        })
        .map((element) => {
            const maxLocalX = Math.max(0, BUSINESS_CARD_FACE_WIDTH - element.width);
            const maxLocalY = Math.max(0, BUSINESS_CARD_FACE_HEIGHT - element.height);
            return {
                ...element,
                id: `${element.id}-${face}`,
                printFrameId: face,
                x: clamp(element.x - frame.x, 0, maxLocalX),
                y: clamp(element.y - frame.y, 0, maxLocalY),
            } as CreativeEditorElement;
        });

    return {
        ...normalizedDocument,
        canvas: {
            ...normalizedDocument.canvas,
            height: BUSINESS_CARD_FACE_HEIGHT,
            width: BUSINESS_CARD_FACE_WIDTH,
        },
        elements,
        id: `${normalizedDocument.id}-${face}`,
        pages: undefined,
    };
}

async function renderPrintableAssetEditorDocumentFile(
    params: {
        activePlanType?: string | null;
        assetTypeId: PrintableAssetTypeId;
        document: CreativeEditorDocument;
        outputFormat: Exclude<PrintableAssetOutputFormat, "zip">;
        templateFamilyId?: string;
    },
    documentValue: CreativeEditorDocument,
    filenamePart?: string,
): Promise<PrintableAssetRenderResult> {
    const assetType = getPrintableAssetType(params.assetTypeId);
    const pngSuffix = filenamePart ? `_${params.assetTypeId}_${filenamePart}.png` : `_${params.assetTypeId}.png`;
    const pdfSuffix = filenamePart ? `_${params.assetTypeId}_${filenamePart}.pdf` : `_${params.assetTypeId}.pdf`;
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
            filename: result.filename.replace(/\.png$/i, pngSuffix),
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
        compress: true,
        orientation: dims.widthMm >= dims.heightMm ? "landscape" : "portrait",
        unit: "mm",
        format: [dims.widthMm, dims.heightMm],
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, dims.widthMm, dims.heightMm, undefined, "FAST");
    return {
        blob: pdf.output("blob"),
        filename: result.filename.replace(/\.png$/i, pdfSuffix),
        label: assetType.title,
        mimeType: "application/pdf",
        outputFormat: "pdf",
    };
}

export async function renderPrintableAssetEditorDocumentFiles(params: {
    activePlanType?: string | null;
    assetTypeId: PrintableAssetTypeId;
    document: CreativeEditorDocument;
    outputFormat: Exclude<PrintableAssetOutputFormat, "zip">;
    templateFamilyId?: string;
}): Promise<PrintableAssetRenderResult[]> {
    const admittedDocument = admitPrintableAssetEditorDocument(params.document, params.assetTypeId);
    const documentValue = preparePrintableAssetDocumentForExport(
        stripPrintableAssetEditorAttributionLayers(admittedDocument),
        params.assetTypeId,
    );
    if (params.assetTypeId === "business_card" && params.outputFormat === "png") {
        return Promise.all([
            renderPrintableAssetEditorDocumentFile(
                params,
                getBusinessCardFaceDocument(documentValue, "front"),
                "front",
            ),
            renderPrintableAssetEditorDocumentFile(
                params,
                getBusinessCardFaceDocument(documentValue, "back"),
                "back",
            ),
        ]);
    }

    return [await renderPrintableAssetEditorDocumentFile(params, documentValue)];
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

export async function renderPrintableAssetEditorTemplateFiles(input: PrintableAssetRenderInput): Promise<PrintableAssetRenderResult[]> {
    if (input.outputFormat === "zip") {
        throw new Error("Editor templates cannot render ZIP bundles");
    }
    const documentValue = buildPrintableAssetEditorDocument(input);
    return renderPrintableAssetEditorDocumentFiles({
        activePlanType: input.activePlanType,
        assetTypeId: input.assetTypeId,
        document: documentValue,
        outputFormat: input.outputFormat === "pdf" ? "pdf" : "png",
        templateFamilyId: input.templateFamilyId,
    });
}
