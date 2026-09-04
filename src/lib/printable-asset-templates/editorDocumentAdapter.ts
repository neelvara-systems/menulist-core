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
import { getPrintableLibraryIconDataUri, getPrintableLibraryIconSymbolMarkup } from "./printableIconArtwork";
import { resolvePrintableTemplateBrandTokens } from "./templateStyles";
import { getPrintableThemeArtworkPaths, getPrintableThemeArtworkPlacement } from "./themeArtwork";
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
const MIN_PRINTABLE_EDITOR_CANVAS_DIMENSION = 120;
const MAX_PRINTABLE_EDITOR_CANVAS_DIMENSION = 4096;

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

    if (
        parsed.data.canvas.width < MIN_PRINTABLE_EDITOR_CANVAS_DIMENSION
        || parsed.data.canvas.height < MIN_PRINTABLE_EDITOR_CANVAS_DIMENSION
        || parsed.data.canvas.width > MAX_PRINTABLE_EDITOR_CANVAS_DIMENSION
        || parsed.data.canvas.height > MAX_PRINTABLE_EDITOR_CANVAS_DIMENSION
    ) {
        throw new Error("Printable asset editor document size is outside the supported range");
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

const EDITORIAL_SERIF_THEME_IDS = new Set([
    "classic-luxe",
    "botanical-heritage",
    "craft-kitchen",
    "ember-house",
    "coastal-table",
    "sunday-table",
    "roastery-ledger",
    "patisserie-conservatory",
    "gelateria-riviera",
    "salon-atelier",
    "petal-studio",
    "pearl-veil",
    "terracotta-glow",
    "ritual-sanctuary",
    "eucalyptus-retreat",
    "lotus-stillness",
    "sunlit-ritual",
    "ink-vine",
    "midnight-gold",
    "sunset-atelier",
    "rosewater-editorial",
    "mineral-sanctuary",
    "bombay-chronicle",
    "indian-atelier",
    "art-deco-garden",
    "japanese-night-luxe",
    "tea-salon-heritage",
    "lankan-block-print",
    "gallery-ledger",
    "neighbourhood-standard",
    "boutique-window",
    "market-label",
    "civic-letterpress",
    "maker-ledger",
    "hospitality-house",
]);

const VERTICAL_STORY_THEME_VEIL_OPACITY: Readonly<Record<string, number>> = {
    "ember-house": 0.72,
    "coastal-table": 0.70,
    "sunday-table": 0.72,
    "counter-rush": 0.78,
    "roastery-ledger": 0.64,
    "patisserie-conservatory": 0.70,
    "gelateria-riviera": 0.74,
    "salon-atelier": 0.62,
    "petal-studio": 0.62,
    "pearl-veil": 0.54,
    "terracotta-glow": 0.64,
    "glasshouse-beauty": 0.66,
    "ritual-sanctuary": 0.64,
    "eucalyptus-retreat": 0.62,
    "mineral-spring": 0.58,
    "lotus-stillness": 0.62,
    "sunlit-ritual": 0.64,
    "performance-circuit": 0.56,
    "neighbourhood-standard": 0.62,
    "field-notes": 0.62,
    "boutique-window": 0.62,
    "market-label": 0.66,
    "civic-letterpress": 0.60,
    "modern-practice": 0.60,
    "studio-contact-sheet": 0.72,
    "maker-ledger": 0.66,
    "clinical-calm": 0.62,
    "mindful-motion": 0.62,
    "hospitality-house": 0.62,
    "future-workshop": 0.64,
};

function getThemeDisplayFontFamily(templateFamilyId: string): string {
    return EDITORIAL_SERIF_THEME_IDS.has(templateFamilyId)
        ? "Georgia, serif"
        : "Inter, Arial, sans-serif";
}

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

export function getPrintableAssetDisplayHost(input: PrintableAssetRenderInput): string {
    const sourceUrl = input.assetTypeId === "feedback_qr"
        ? (input.feedbackUrl || input.menuUrl)
        : (input.menuUrl || input.shortLink);
    const candidate = /^https?:\/\//i.test(sourceUrl) ? sourceUrl : `https://${sourceUrl}`;
    try {
        return new URL(candidate).hostname.toLowerCase();
    } catch {
        return sourceUrl
            .replace(/^https?:\/\//i, "")
            .split(/[/?#]/, 1)[0]
            .toLowerCase();
    }
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

function fitSingleLineFontSize(text: string, width: number, maxFontSize: number, minFontSize: number): number {
    const characterCount = Math.max(1, Array.from(text.trim()).length);
    const conservativeWidthPerCharacter = 0.62;
    return clamp(
        Math.floor(width / (characterCount * conservativeWidthPerCharacter)),
        minFontSize,
        maxFontSize,
    );
}

type CenteredPrintableTextLayout = {
    fontSize: number;
    height: number;
    lineCount: number;
    lineHeight: number;
    text: string;
};

function estimatePrintableTextWidth(value: string, fontSize: number): number {
    return Array.from(value).reduce((width, character) => {
        if (/\s/.test(character)) return width + fontSize * 0.34;
        if (/[MW@%&]/.test(character)) return width + fontSize * 0.82;
        if (/[A-Z0-9]/.test(character)) return width + fontSize * 0.66;
        if (/[ilI1|.,:;'`]/.test(character)) return width + fontSize * 0.30;
        return width + fontSize * 0.56;
    }, 0);
}

type PrintableTextBreakUnit = {
    separatorBefore: "" | " ";
    text: string;
};

function getPrintableTextBreakUnits(value: string): PrintableTextBreakUnit[] {
    const units: PrintableTextBreakUnit[] = [];
    const words = value.trim().split(/\s+/).filter(Boolean);

    words.forEach((word, wordIndex) => {
        let segment = "";
        let isFirstSegment = true;
        const pushSegment = () => {
            if (!segment) return;
            units.push({
                separatorBefore: wordIndex > 0 && isFirstSegment ? " " : "",
                text: segment,
            });
            segment = "";
            isFirstSegment = false;
        };

        Array.from(word).forEach((character) => {
            segment += character;
            if (character === "." || character === "-" || character === "/") pushSegment();
        });
        pushSegment();
    });

    return units;
}

function splitPrintableTextUnitAtSize(value: string, width: number, fontSize: number): string[] | null {
    const chunks: string[] = [];
    let currentChunk = "";
    for (const character of Array.from(value)) {
        const candidate = `${currentChunk}${character}`;
        if (estimatePrintableTextWidth(candidate, fontSize) <= width) {
            currentChunk = candidate;
            continue;
        }
        if (!currentChunk) return null;
        chunks.push(currentChunk);
        currentChunk = character;
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
}

function wrapPrintableTextAtSize(
    value: string,
    width: number,
    fontSize: number,
    maxLines: number,
): string[] | null {
    const units = getPrintableTextBreakUnits(value);
    if (!units.length) return [""];
    const lines: string[] = [];
    let currentLine = "";

    for (const unit of units) {
        if (estimatePrintableTextWidth(unit.text, fontSize) > width) {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = "";
                if (lines.length >= maxLines) return null;
            }
            const chunks = splitPrintableTextUnitAtSize(unit.text, width, fontSize);
            if (!chunks) return null;
            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
                const chunk = chunks[chunkIndex];
                if (chunkIndex === chunks.length - 1) {
                    currentLine = chunk;
                    continue;
                }
                lines.push(chunk);
                if (lines.length >= maxLines) return null;
            }
            continue;
        }
        const separator = currentLine ? unit.separatorBefore : "";
        const candidate = `${currentLine}${separator}${unit.text}`;
        if (estimatePrintableTextWidth(candidate, fontSize) <= width) {
            currentLine = candidate;
            continue;
        }
        if (currentLine) lines.push(currentLine);
        currentLine = unit.text;
        if (lines.length >= maxLines) return null;
    }
    if (currentLine) lines.push(currentLine);
    return lines.length <= maxLines ? lines : null;
}

export function layoutCenteredPrintableText(params: {
    maxFontSize: number;
    maxLines?: number;
    minFontSize: number;
    preferSingleLine?: boolean;
    text: string;
    width: number;
    widthSafetyFactor?: number;
}): CenteredPrintableTextLayout {
    const normalizedText = params.text.trim().replace(/\s+/g, " ");
    const maxLines = Math.max(1, params.maxLines ?? 2);
    const lineHeight = 1.08;
    const effectiveWidth = params.width / Math.max(1, params.widthSafetyFactor ?? 1);
    if (params.preferSingleLine && maxLines > 1) {
        for (let fontSize = params.maxFontSize; fontSize >= params.minFontSize; fontSize -= 1) {
            const lines = wrapPrintableTextAtSize(normalizedText, effectiveWidth, fontSize, 1);
            if (!lines) continue;
            return {
                fontSize,
                height: Math.ceil(fontSize * lineHeight),
                lineCount: 1,
                lineHeight,
                text: lines[0],
            };
        }
    }
    for (let fontSize = params.maxFontSize; fontSize >= params.minFontSize; fontSize -= 1) {
        const lines = wrapPrintableTextAtSize(normalizedText, effectiveWidth, fontSize, maxLines);
        if (!lines) continue;
        return {
            fontSize,
            height: Math.ceil(fontSize * lineHeight * lines.length),
            lineCount: lines.length,
            lineHeight,
            text: lines.join("\n"),
        };
    }

    for (let fontSize = params.minFontSize - 1; fontSize >= 12; fontSize -= 1) {
        const lines = wrapPrintableTextAtSize(normalizedText, effectiveWidth, fontSize, maxLines);
        if (!lines) continue;
        return {
            fontSize,
            height: Math.ceil(fontSize * lineHeight * lines.length),
            lineCount: lines.length,
            lineHeight,
            text: lines.join("\n"),
        };
    }

    const fallbackFontSize = 12;
    return {
        fontSize: fallbackFontSize,
        height: Math.ceil(fallbackFontSize * lineHeight),
        lineCount: 1,
        lineHeight,
        text: normalizedText,
    };
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

function triangleElement(ctx: BuildContext, params: Partial<Extract<CreativeEditorElement, { type: "triangle" }>> & {
    height: number;
    width: number;
    x: number;
    y: number;
}): Extract<CreativeEditorElement, { type: "triangle" }> {
    return {
        fill: ctx.surface,
        id: ctx.id("shape"),
        name: "Shape",
        opacity: 1,
        stroke: "transparent",
        strokeStyle: "solid",
        strokeWidth: 0,
        type: "triangle",
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

function addBrandMark(
    ctx: BuildContext,
    x: number,
    y: number,
    size: number,
    align: "left" | "center" = "left",
    rotation = 0,
) {
    const markX = align === "center" ? x - size / 2 : x;
    if (ctx.input.logoUrl) {
        ctx.elements.push(imageElement(ctx, {
            height: size,
            locked: true,
            name: "Business logo",
            rotation,
            src: ctx.input.logoUrl,
            width: size,
            x: markX,
            y,
        }));
        return;
    }
    addIdentityBadge(ctx, x, y, size, align, rotation);
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
    const inset = Math.max(8, Math.round(ctx.canvasWidth * 0.025));
    const ruleHeight = Math.max(6, Math.round(ctx.canvasHeight * 0.014));
    ctx.elements.push(rectElement(ctx, {
        fill: "transparent",
        height: ctx.canvasHeight - inset * 2,
        locked: true,
        name: "Compact asset theme frame",
        radius: Math.round(ctx.canvasHeight * 0.025),
        stroke: ctx.borderColor,
        strokeWidth: Math.max(2, Math.round(ctx.canvasWidth * 0.003)),
        width: ctx.canvasWidth - inset * 2,
        x: inset,
        y: inset,
    }));
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.accent,
        height: ruleHeight,
        locked: true,
        name: "Compact asset accent rule",
        radius: Math.round(ruleHeight / 2),
        width: Math.round(ctx.canvasWidth * (variant === "id" ? 0.28 : 0.20)),
        x: Math.round(ctx.canvasWidth * (variant === "front" ? 0.74 : 0.08)),
        y: Math.round(ctx.canvasHeight * 0.055),
    }));
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.borderColor,
        height: Math.max(4, Math.round(ruleHeight * 0.65)),
        locked: true,
        name: "Compact asset finishing rule",
        radius: Math.round(ruleHeight / 2),
        width: Math.round(ctx.canvasWidth * (variant === "id" ? 0.18 : 0.12)),
        x: Math.round(ctx.canvasWidth * (variant === "front" ? 0.08 : 0.80)),
        y: Math.round(ctx.canvasHeight * 0.925),
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

function addQrPanel(
    ctx: BuildContext,
    x: number,
    y: number,
    size: number,
    rotation = 0,
    options: { compact?: boolean; padding?: number } = {},
) {
    const panelPadding = options.padding ?? 44;
    const panelSize = size + panelPadding * 2;
    const panelX = clamp(x - panelPadding, 2, Math.max(2, ctx.canvasWidth - panelSize - 2));
    const panelY = clamp(y - panelPadding, 2, Math.max(2, ctx.canvasHeight - panelSize - 2));
    const qrX = panelX + panelPadding;
    const qrY = panelY + panelPadding;

    ctx.elements.push(rectElement(ctx, {
        fill: "#ffffff",
        height: panelSize,
        locked: true,
        name: "QR panel",
        radius: Math.round(size * (options.compact ? 0.045 : 0.07)),
        rotation,
        shadow: options.compact
            ? { blur: 12, color: "rgba(17,24,39,0.11)", offsetX: 0, offsetY: 5 }
            : { blur: 30, color: "rgba(17,24,39,0.16)", offsetX: 0, offsetY: 14 },
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
    const themePaths = getPrintableThemeArtworkPaths(family);
    if (themePaths?.page && family !== "craft-kitchen") {
        const isLandscape = ctx.canvasWidth / Math.max(1, ctx.canvasHeight) >= 1.15;
        const responsiveBackground = isLandscape && themePaths.compact
            ? themePaths.compact
            : themePaths.page;
        ctx.elements.push(imageElement(ctx, {
            fit: "cover",
            height: ctx.canvasHeight,
            locked: true,
            name: `${family} responsive theme background`,
            src: responsiveBackground,
            width: ctx.canvasWidth,
            x: 0,
            y: 0,
        }));
        const verticalStoryVeilOpacity = VERTICAL_STORY_THEME_VEIL_OPACITY[family];
        if (verticalStoryVeilOpacity) {
            const insetX = Math.round(ctx.canvasWidth * 0.035);
            const insetY = Math.round(ctx.canvasHeight * 0.032);
            ctx.elements.push(rectElement(ctx, {
                fill: ctx.surface,
                height: ctx.canvasHeight - insetY * 2,
                locked: true,
                name: `${family} compact content veil`,
                opacity: verticalStoryVeilOpacity,
                radius: Math.round(Math.min(ctx.canvasWidth, ctx.canvasHeight) * 0.024),
                width: ctx.canvasWidth - insetX * 2,
                x: insetX,
                y: insetY,
            }));
        }
        if (family === "lankan-block-print") {
            const insetX = Math.round(ctx.canvasWidth * 0.065);
            const insetY = Math.round(ctx.canvasHeight * 0.075);
            ctx.elements.push(rectElement(ctx, {
                fill: ctx.surface,
                height: ctx.canvasHeight - insetY * 2,
                locked: true,
                name: "Lankan compact content safe field",
                opacity: 0.94,
                radius: Math.round(Math.min(ctx.canvasWidth, ctx.canvasHeight) * 0.025),
                width: ctx.canvasWidth - insetX * 2,
                x: insetX,
                y: insetY,
            }));
        }
        return;
    }
    if (family === "botanical-heritage" || family === "craft-kitchen") {
        const isCraftKitchen = family === "craft-kitchen";
        const paths = getPrintableThemeArtworkPaths(family);
        const placement = getPrintableThemeArtworkPlacement(family, {
            height: ctx.canvasHeight,
            width: ctx.canvasWidth,
            x: 0,
            y: 0,
        });
        ctx.elements.push(imageElement(ctx, {
            fit: "contain",
            height: Math.round(placement.corner.height),
            locked: true,
            name: isCraftKitchen ? "Craft Kitchen corner artwork" : "Botanical corner artwork",
            opacity: isCraftKitchen ? 0.58 : 0.72,
            src: paths?.corner || "",
            width: Math.round(placement.corner.width),
            x: Math.round(placement.corner.x),
            y: Math.round(placement.corner.y),
        }));
        ctx.elements.push(imageElement(ctx, {
            fit: "contain",
            height: Math.round(placement.rail.height),
            locked: true,
            name: isCraftKitchen ? "Craft Kitchen rail artwork" : "Botanical rail artwork",
            opacity: isCraftKitchen ? 0.40 : 0.50,
            src: paths?.rail || "",
            width: Math.round(placement.rail.width),
            x: Math.round(placement.rail.x),
            y: Math.round(placement.rail.y),
        }));
        addFrame(ctx, Math.round(ctx.canvasWidth * 0.055));
        return;
    }

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

    if (family === "classic-luxe") {
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
    subtitle?: string;
    subtitleName?: string;
    title: string;
    useBrandMark?: boolean;
    variant?: "default" | "premium-scan-card";
    x: number;
    y: number;
}) {
    const {
        cta,
        faceHeight,
        faceWidth,
        qrSize,
        rotation = 0,
        subtitle,
        subtitleName = "Instruction",
        useBrandMark = false,
        variant = "default",
        x,
        y,
    } = params;
    const isPremiumScanCard = variant === "premium-scan-card";
    const pad = Math.round(faceWidth * (isPremiumScanCard ? 0.12 : 0.08));
    const contentWidth = faceWidth - pad * 2;
    const centerX = x + faceWidth / 2;
    const businessName = truncateForLayer(ctx.input.storeName, 42);
    const hasSubtitle = Boolean(subtitle?.trim());
    const displayLink = isPremiumScanCard ? getPrintableAssetDisplayHost(ctx.input) : getDisplayShortLink(ctx);
    const businessNameFontFamily = isPremiumScanCard ? getThemeDisplayFontFamily(ctx.input.templateFamilyId) : undefined;
    const titleColor = ctx.input.templateFamilyId === "brand-banner" || ctx.input.templateFamilyId === "local-bold"
        ? ctx.accentText
        : ctx.text;
    const businessNameLayout = isPremiumScanCard
        ? layoutCenteredPrintableText({
            maxFontSize: Math.round(faceWidth * 0.062),
            minFontSize: Math.round(faceWidth * 0.032),
            preferSingleLine: true,
            text: businessName,
            width: contentWidth,
            widthSafetyFactor: businessNameFontFamily === "Georgia, serif" ? 1.12 : 1.04,
        })
        : {
            fontSize: Math.round(faceWidth * 0.058),
            height: Math.round(faceHeight * 0.07),
            lineCount: 1,
            lineHeight: 1.08,
            text: businessName,
        };
    const subtitleLayout = hasSubtitle
        ? isPremiumScanCard
            ? layoutCenteredPrintableText({
                maxFontSize: Math.round(faceWidth * 0.032),
                minFontSize: Math.round(faceWidth * 0.025),
                preferSingleLine: true,
                text: subtitle?.trim() || "",
                width: contentWidth,
                widthSafetyFactor: 1.04,
            })
            : {
                fontSize: Math.round(faceWidth * 0.04),
                height: Math.round(faceHeight * 0.07),
                lineCount: 1,
                lineHeight: 1.08,
                text: subtitle?.trim() || "",
            }
        : null;
    const ctaLayout = isPremiumScanCard
        ? layoutCenteredPrintableText({
            maxFontSize: Math.round(faceWidth * 0.058),
            minFontSize: Math.round(faceWidth * 0.042),
            preferSingleLine: true,
            text: cta,
            width: contentWidth,
            widthSafetyFactor: 1.04,
        })
        : {
            fontSize: Math.round(faceWidth * 0.07),
            height: Math.round(faceHeight * 0.08),
            lineCount: 1,
            lineHeight: 1.08,
            text: cta,
        };
    const linkLayout = isPremiumScanCard
        ? layoutCenteredPrintableText({
            maxFontSize: Math.round(faceWidth * 0.028),
            minFontSize: Math.round(faceWidth * 0.018),
            preferSingleLine: true,
            text: truncateForLayer(displayLink, 58),
            width: contentWidth,
            widthSafetyFactor: 1.04,
        })
        : {
            fontSize: Math.round(faceWidth * 0.028),
            height: Math.round(faceHeight * 0.05),
            lineCount: 1,
            lineHeight: 1.08,
            text: truncateForLayer(displayLink, 58),
        };
    const businessNameY = y + Math.round(faceHeight * (isPremiumScanCard ? 0.22 : 0.22));
    const subtitleY = isPremiumScanCard
        ? businessNameY + businessNameLayout.height + Math.round(faceHeight * 0.028)
        : y + Math.round(faceHeight * 0.31);
    const taglineToCtaGap = Math.round(faceHeight * 0.044);
    const nameToCtaGap = Math.round(faceHeight * 0.035);
    const ctaToQrGap = Math.round(faceHeight * 0.028);
    const preferredCtaToQrGap = Math.round(faceHeight * 0.036);
    const qrPanelPadding = isPremiumScanCard ? 24 : 44;
    const preferredQrPanelY = y + Math.round(faceHeight * (isPremiumScanCard ? 0.445 : 0.53)) - qrPanelPadding;
    const contentCtaY = subtitleLayout
        ? subtitleY + subtitleLayout.height + taglineToCtaGap
        : businessNameY + businessNameLayout.height + nameToCtaGap;
    const preferredCtaY = preferredQrPanelY - ctaLayout.height - preferredCtaToQrGap;
    const ctaY = isPremiumScanCard
        ? Math.max(contentCtaY, preferredCtaY)
        : y + Math.round(faceHeight * 0.39);
    const qrPanelY = isPremiumScanCard
        ? Math.max(preferredQrPanelY, ctaY + ctaLayout.height + ctaToQrGap)
        : preferredQrPanelY;
    const shortLinkY = isPremiumScanCard
        ? Math.max(
            y + Math.round(faceHeight * 0.82),
            qrPanelY + qrSize + qrPanelPadding * 2 + Math.round(faceHeight * 0.025),
        )
        : y + Math.round(faceHeight * (params.shortLinkYRatio ?? 0.86));

    if (useBrandMark) {
        addBrandMark(
            ctx,
            centerX,
            y + Math.round(faceHeight * (isPremiumScanCard ? 0.11 : 0.06)),
            Math.round(faceWidth * (isPremiumScanCard ? 0.12 : 0.13)),
            "center",
            rotation,
        );
    } else {
        addIdentityBadge(ctx, centerX, y + pad, Math.round(faceWidth * 0.14), "center", rotation);
    }
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: titleColor,
        fontFamily: businessNameFontFamily,
        fontSize: businessNameLayout.fontSize,
        fontWeight: isPremiumScanCard ? "700" : "800",
        height: businessNameLayout.height,
        lineHeight: businessNameLayout.lineHeight,
        name: "Business name",
        rotation,
        text: businessNameLayout.text,
        width: contentWidth,
        x: x + pad,
        y: businessNameY,
    }));
    if (subtitleLayout) {
        ctx.elements.push(textElement(ctx, {
            align: "center",
            color: ctx.muted,
            fontSize: subtitleLayout.fontSize,
            fontWeight: isPremiumScanCard ? "600" : "700",
            height: subtitleLayout.height,
            lineHeight: subtitleLayout.lineHeight,
            name: subtitleName,
            rotation,
            sourceRefs: subtitleName === "Business tagline" ? [{
                label: "Business tagline",
                locked: false,
                productId: "menulist",
                value: subtitle?.trim() || "",
            }] : undefined,
            text: subtitleLayout.text,
            width: contentWidth,
            x: x + pad,
            y: subtitleY,
        }));
    }
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accent,
        fontSize: ctaLayout.fontSize,
        fontWeight: "800",
        height: ctaLayout.height,
        lineHeight: ctaLayout.lineHeight,
        name: "Call to action",
        rotation,
        text: ctaLayout.text,
        width: contentWidth,
        x: x + pad,
        y: ctaY,
    }));
    addQrPanel(
        ctx,
        Math.round(centerX - qrSize / 2),
        qrPanelY + qrPanelPadding,
        qrSize,
        rotation,
        isPremiumScanCard ? { compact: true, padding: 24 } : undefined,
    );
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.muted,
        fontSize: linkLayout.fontSize,
        fontWeight: "700",
        height: linkLayout.height,
        lineHeight: linkLayout.lineHeight,
        locked: true,
        name: "Short link",
        rotation,
        sourceRefs: [{
            label: "Short link",
            locked: true,
            productId: "menulist",
            value: displayLink,
        }],
        text: linkLayout.text,
        width: contentWidth,
        x: x + pad,
        y: shortLinkY,
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
        cta: ctx.labels.scanToViewCompactUpper,
        faceHeight,
        faceWidth,
        qrSize,
        rotation: 180,
        subtitle: truncateForLayer(ctx.input.tagline, 60),
        subtitleName: "Business tagline",
        title: ctx.labels.offeringTitle,
        useBrandMark: true,
        variant: "premium-scan-card",
        x: 0,
        y: 0,
    });
    addMainCardFace(ctx, {
        cta: ctx.labels.scanToViewCompactUpper,
        faceHeight,
        faceWidth,
        qrSize,
        subtitle: truncateForLayer(ctx.input.tagline, 60),
        subtitleName: "Business tagline",
        title: ctx.labels.offeringTitle,
        useBrandMark: true,
        variant: "premium-scan-card",
        x: faceWidth,
        y: 0,
    });
}

function buildPremiumFeedbackQr(ctx: BuildContext) {
    addDecor(ctx);
    const contentInset = Math.round(ctx.canvasWidth * 0.10);
    const contentWidth = ctx.canvasWidth - contentInset * 2;
    const centerX = ctx.canvasWidth / 2;
    const businessName = truncateForLayer(ctx.input.storeName, 42);
    const tagline = truncateForLayer(ctx.input.tagline, 70);
    const hasTagline = Boolean(tagline?.trim());
    const displayHost = getPrintableAssetDisplayHost(ctx.input);
    const businessNameFontFamily = getThemeDisplayFontFamily(ctx.input.templateFamilyId);
    const businessNameLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasWidth * 0.065),
        minFontSize: Math.round(ctx.canvasWidth * 0.038),
        preferSingleLine: true,
        text: businessName,
        width: contentWidth,
        widthSafetyFactor: businessNameFontFamily === "Georgia, serif" ? 1.12 : 1.04,
    });
    const ctaLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasWidth * 0.046),
        minFontSize: Math.round(ctx.canvasWidth * 0.034),
        preferSingleLine: true,
        text: "TELL US HOW WE DID",
        width: contentWidth,
        widthSafetyFactor: 1.04,
    });
    const motivationLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasWidth * 0.024),
        minFontSize: Math.round(ctx.canvasWidth * 0.019),
        preferSingleLine: true,
        text: "Your feedback helps us improve.",
        width: Math.round(ctx.canvasWidth * 0.64),
        widthSafetyFactor: 1.04,
    });
    const taglineLayout = hasTagline
        ? layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasWidth * 0.030),
            minFontSize: Math.round(ctx.canvasWidth * 0.022),
            preferSingleLine: true,
            text: tagline?.trim() || "",
            width: contentWidth,
            widthSafetyFactor: 1.04,
        })
        : null;
    const hostLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasWidth * 0.025),
        minFontSize: Math.round(ctx.canvasWidth * 0.018),
        preferSingleLine: true,
        text: truncateForLayer(displayHost, 58),
        width: contentWidth,
        widthSafetyFactor: 1.04,
    });
    const markSize = Math.round(ctx.canvasWidth * 0.12);
    const businessNameY = Math.round(ctx.canvasHeight * 0.215);
    const taglineY = businessNameY
        + businessNameLayout.height
        + Math.round(ctx.canvasHeight * 0.028);
    const conversationPanelY = taglineLayout
        ? taglineY + taglineLayout.height + Math.round(ctx.canvasHeight * 0.044)
        : businessNameY + businessNameLayout.height + Math.round(ctx.canvasHeight * 0.075);
    const conversationPanelX = Math.round(ctx.canvasWidth * 0.14);
    const conversationPanelWidth = Math.round(ctx.canvasWidth * 0.72);
    const conversationPanelHeight = Math.round(ctx.canvasHeight * 0.11);
    const conversationCopyX = conversationPanelX + Math.round(ctx.canvasWidth * 0.145);
    const conversationCopyWidth = conversationPanelWidth - Math.round(ctx.canvasWidth * 0.175);
    const purposeArtworkWidth = Math.round(ctx.canvasWidth * 0.090);
    const purposeArtworkHeight = Math.round(purposeArtworkWidth * (141 / 191));
    const purposeArtworkX = conversationPanelX + Math.round(ctx.canvasWidth * 0.035);
    const purposeArtworkY = conversationPanelY + Math.round((conversationPanelHeight - purposeArtworkHeight) / 2);
    const ctaY = conversationPanelY + Math.round(ctx.canvasHeight * 0.017);
    const motivationY = ctaY + ctaLayout.height + Math.round(ctx.canvasHeight * 0.012);
    const qrSize = Math.round(ctx.canvasWidth * 0.39);
    const qrPanelPadding = 24;
    const qrPanelY = conversationPanelY
        + conversationPanelHeight
        + Math.round(ctx.canvasHeight * 0.032);
    const hostY = qrPanelY
        + qrSize
        + qrPanelPadding * 2
        + Math.round(ctx.canvasHeight * 0.035);

    addBrandMark(
        ctx,
        centerX,
        Math.round(ctx.canvasHeight * 0.09),
        markSize,
        "center",
    );
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.text,
        fontFamily: businessNameFontFamily,
        fontSize: businessNameLayout.fontSize,
        fontWeight: "700",
        height: businessNameLayout.height,
        lineHeight: businessNameLayout.lineHeight,
        name: "Business name",
        text: businessNameLayout.text,
        width: contentWidth,
        x: contentInset,
        y: businessNameY,
    }));
    if (taglineLayout) {
        ctx.elements.push(textElement(ctx, {
            align: "center",
            color: ctx.muted,
            fontSize: taglineLayout.fontSize,
            fontWeight: "400",
            height: taglineLayout.height,
            lineHeight: taglineLayout.lineHeight,
            name: "Business tagline",
            text: taglineLayout.text,
            width: contentWidth,
            x: contentInset,
            y: taglineY,
        }));
    }
    ctx.elements.push(triangleElement(ctx, {
        fill: ctx.surface,
        height: Math.round(ctx.canvasHeight * 0.034),
        name: "Feedback conversation tail",
        opacity: 0.88,
        rotation: 180,
        stroke: ctx.accent,
        strokeWidth: 2,
        width: Math.round(ctx.canvasWidth * 0.060),
        x: conversationPanelX + Math.round(ctx.canvasWidth * 0.075),
        y: conversationPanelY + conversationPanelHeight - Math.round(ctx.canvasHeight * 0.010),
    }));
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.surface,
        height: conversationPanelHeight,
        name: "Feedback conversation panel",
        opacity: 0.88,
        radius: 38,
        stroke: ctx.accent,
        strokeWidth: 2,
        width: conversationPanelWidth,
        x: conversationPanelX,
        y: conversationPanelY,
    }));
    ctx.elements.push(imageElement(ctx, {
        alt: "Hand-drawn review conversation",
        fit: "contain",
        height: purposeArtworkHeight,
        locked: true,
        name: "Feedback review quote artwork",
        opacity: 0.84,
        src: getPrintableLibraryIconDataUri("koboyo-review-quote", ctx.accent),
        width: purposeArtworkWidth,
        x: purposeArtworkX,
        y: purposeArtworkY,
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accent,
        fontSize: Math.min(ctaLayout.fontSize, Math.round(ctx.canvasWidth * 0.041)),
        fontWeight: "800",
        height: ctaLayout.height,
        lineHeight: ctaLayout.lineHeight,
        name: "Call to action",
        text: ctaLayout.text,
        width: conversationCopyWidth,
        x: conversationCopyX,
        y: ctaY,
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.muted,
        fontSize: motivationLayout.fontSize,
        fontWeight: "600",
        height: motivationLayout.height,
        lineHeight: motivationLayout.lineHeight,
        name: "Feedback motivation",
        text: motivationLayout.text,
        width: conversationCopyWidth,
        x: conversationCopyX,
        y: motivationY,
    }));
    addQrPanel(
        ctx,
        Math.round(centerX - qrSize / 2),
        qrPanelY + qrPanelPadding,
        qrSize,
        0,
        { compact: true, padding: qrPanelPadding },
    );
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.muted,
        fontSize: hostLayout.fontSize,
        fontWeight: "700",
        height: hostLayout.height,
        lineHeight: hostLayout.lineHeight,
        locked: true,
        name: "Short link",
        sourceRefs: [{
            label: "Feedback link",
            locked: true,
            productId: "menulist",
            value: displayHost,
        }],
        text: hostLayout.text,
        width: contentWidth,
        x: contentInset,
        y: hostY,
    }));
}

function buildSingleCard(ctx: BuildContext) {
    const isFeedbackCard = ctx.input.assetTypeId === "feedback_qr";
    if (isFeedbackCard) {
        buildPremiumFeedbackQr(ctx);
        return;
    }
    addDecor(ctx);
    addMainCardFace(ctx, {
        cta: isFeedbackCard ? "LEAVE FEEDBACK" : ctx.labels.scanToViewCompactUpper,
        faceHeight: ctx.canvasHeight,
        faceWidth: ctx.canvasWidth,
        qrSize: isFeedbackCard
            ? Math.round(ctx.canvasWidth * 0.42)
            : Math.round(ctx.canvasHeight * 0.31),
        subtitle: isFeedbackCard ? "Scan to leave feedback" : truncateForLayer(ctx.input.tagline, 60),
        subtitleName: isFeedbackCard ? "Instruction" : "Business tagline",
        title: ctx.labels.offeringTitle,
        useBrandMark: !isFeedbackCard,
        variant: isFeedbackCard ? "default" : "premium-scan-card",
        x: 0,
        y: 0,
    });
}

function buildSticker(ctx: BuildContext) {
    addDecor(ctx);
    const contentInset = Math.round(ctx.canvasWidth * 0.10);
    const contentWidth = ctx.canvasWidth - contentInset * 2;
    const centerX = ctx.canvasWidth / 2;
    const businessName = truncateForLayer(ctx.input.storeName, 36);
    const displayHost = getPrintableAssetDisplayHost(ctx.input);
    const compactViewCta = ctx.labels.scanToViewCompactUpper.replace(/^SCAN TO /, "");
    const businessNameFontFamily = getThemeDisplayFontFamily(ctx.input.templateFamilyId);
    const businessNameLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasWidth * 0.061),
        minFontSize: Math.round(ctx.canvasWidth * 0.034),
        preferSingleLine: true,
        text: businessName,
        width: contentWidth,
        widthSafetyFactor: businessNameFontFamily === "Georgia, serif" ? 1.12 : 1.04,
    });
    const ctaMaxFontSize = Math.min(
        Math.round(ctx.canvasWidth * 0.043),
        Math.max(Math.round(ctx.canvasWidth * 0.030), businessNameLayout.fontSize - 4),
    );
    const ctaLayout = layoutCenteredPrintableText({
        maxFontSize: ctaMaxFontSize,
        minFontSize: Math.min(Math.round(ctx.canvasWidth * 0.032), ctaMaxFontSize),
        preferSingleLine: true,
        text: compactViewCta,
        width: contentWidth,
        widthSafetyFactor: 1.04,
    });
    const hostLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasWidth * 0.025),
        minFontSize: Math.round(ctx.canvasWidth * 0.017),
        preferSingleLine: true,
        text: truncateForLayer(displayHost, 58),
        width: contentWidth,
        widthSafetyFactor: 1.04,
    });
    const markSize = Math.round(ctx.canvasWidth * 0.12);
    const nameY = Math.round(ctx.canvasHeight * 0.215);
    const ctaY = Math.max(
        Math.round(ctx.canvasHeight * 0.315),
        nameY + businessNameLayout.height + Math.round(ctx.canvasHeight * 0.045),
    );
    const qrSize = Math.round(ctx.canvasWidth * 0.405);
    const qrPanelPadding = 24;
    const qrPanelY = ctaY + ctaLayout.height + Math.round(ctx.canvasHeight * 0.036);
    const hostY = qrPanelY
        + qrSize
        + qrPanelPadding * 2
        + Math.round(ctx.canvasHeight * 0.028);

    addBrandMark(
        ctx,
        centerX,
        Math.round(ctx.canvasHeight * 0.075),
        markSize,
        "center",
    );
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.text,
        fontFamily: businessNameFontFamily,
        fontSize: businessNameLayout.fontSize,
        fontWeight: "700",
        height: businessNameLayout.height,
        lineHeight: businessNameLayout.lineHeight,
        name: "Business name",
        text: businessNameLayout.text,
        width: contentWidth,
        x: contentInset,
        y: nameY,
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accent,
        fontSize: ctaLayout.fontSize,
        fontWeight: "700",
        height: ctaLayout.height,
        lineHeight: ctaLayout.lineHeight,
        name: "Call to action",
        text: ctaLayout.text,
        width: contentWidth,
        x: contentInset,
        y: ctaY,
    }));
    addQrPanel(
        ctx,
        Math.round(centerX - qrSize / 2),
        qrPanelY + qrPanelPadding,
        qrSize,
        0,
        { compact: true, padding: qrPanelPadding },
    );
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.muted,
        fontSize: hostLayout.fontSize,
        fontWeight: "700",
        height: hostLayout.height,
        lineHeight: hostLayout.lineHeight,
        locked: true,
        name: "Short link",
        sourceRefs: [{
            label: "Short link",
            locked: true,
            productId: "menulist",
            value: displayHost,
        }],
        text: hostLayout.text,
        width: contentWidth,
        x: contentInset,
        y: hostY,
    }));
}

function buildPremiumEntrancePoster(ctx: BuildContext) {
    addDecor(ctx);
    const contentInset = Math.round(ctx.canvasWidth * 0.10);
    const contentWidth = ctx.canvasWidth - contentInset * 2;
    const centerX = ctx.canvasWidth / 2;
    const businessName = truncateForLayer(ctx.input.storeName, 42);
    const tagline = truncateForLayer(ctx.input.tagline, 70);
    const hasTagline = Boolean(tagline?.trim());
    const displayHost = getPrintableAssetDisplayHost(ctx.input);
    const businessNameFontFamily = getThemeDisplayFontFamily(ctx.input.templateFamilyId);
    const businessNameLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasWidth * 0.072),
        minFontSize: Math.round(ctx.canvasWidth * 0.040),
        preferSingleLine: true,
        text: businessName,
        width: contentWidth,
        widthSafetyFactor: businessNameFontFamily === "Georgia, serif" ? 1.12 : 1.04,
    });
    const taglineLayout = hasTagline
        ? layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasWidth * 0.032),
            minFontSize: Math.round(ctx.canvasWidth * 0.024),
            preferSingleLine: true,
            text: tagline?.trim() || "",
            width: contentWidth,
            widthSafetyFactor: 1.04,
        })
        : null;
    const ctaLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasWidth * 0.055),
        minFontSize: Math.round(ctx.canvasWidth * 0.040),
        preferSingleLine: true,
        text: ctx.labels.scanToViewCompactUpper,
        width: contentWidth,
        widthSafetyFactor: 1.04,
    });
    const hostLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasWidth * 0.025),
        minFontSize: Math.round(ctx.canvasWidth * 0.018),
        preferSingleLine: true,
        text: truncateForLayer(displayHost, 58),
        width: contentWidth,
        widthSafetyFactor: 1.04,
    });
    const markSize = Math.round(ctx.canvasWidth * 0.12);
    const businessNameY = Math.round(ctx.canvasHeight * 0.205);
    const taglineY = businessNameY
        + businessNameLayout.height
        + Math.round(ctx.canvasHeight * 0.028);
    const contentCtaY = taglineLayout
        ? taglineY + taglineLayout.height + Math.round(ctx.canvasHeight * 0.050)
        : businessNameY + businessNameLayout.height + Math.round(ctx.canvasHeight * 0.075);
    const ctaY = Math.max(Math.round(ctx.canvasHeight * 0.36), contentCtaY);
    const qrSize = Math.round(ctx.canvasWidth * 0.42);
    const qrPanelPadding = 24;
    const qrPanelY = ctaY + ctaLayout.height + Math.round(ctx.canvasHeight * 0.035);
    const hostY = qrPanelY
        + qrSize
        + qrPanelPadding * 2
        + Math.round(ctx.canvasHeight * 0.035);

    addBrandMark(
        ctx,
        centerX,
        Math.round(ctx.canvasHeight * 0.085),
        markSize,
        "center",
    );
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.text,
        fontFamily: businessNameFontFamily,
        fontSize: businessNameLayout.fontSize,
        fontWeight: "700",
        height: businessNameLayout.height,
        lineHeight: businessNameLayout.lineHeight,
        name: "Business name",
        text: businessNameLayout.text,
        width: contentWidth,
        x: contentInset,
        y: businessNameY,
    }));
    if (taglineLayout) {
        ctx.elements.push(textElement(ctx, {
            align: "center",
            color: ctx.muted,
            fontSize: taglineLayout.fontSize,
            fontWeight: "600",
            height: taglineLayout.height,
            lineHeight: taglineLayout.lineHeight,
            name: "Business tagline",
            sourceRefs: [{
                label: "Business tagline",
                locked: false,
                productId: "menulist",
                value: tagline?.trim() || "",
            }],
            text: taglineLayout.text,
            width: contentWidth,
            x: contentInset,
            y: taglineY,
        }));
    }
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accent,
        fontSize: ctaLayout.fontSize,
        fontWeight: "800",
        height: ctaLayout.height,
        lineHeight: ctaLayout.lineHeight,
        name: "Call to action",
        text: ctaLayout.text,
        width: contentWidth,
        x: contentInset,
        y: ctaY,
    }));
    addQrPanel(
        ctx,
        Math.round(centerX - qrSize / 2),
        qrPanelY + qrPanelPadding,
        qrSize,
        0,
        { compact: true, padding: qrPanelPadding },
    );
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.muted,
        fontSize: hostLayout.fontSize,
        fontWeight: "700",
        height: hostLayout.height,
        lineHeight: hostLayout.lineHeight,
        locked: true,
        name: "Short link",
        sourceRefs: [{
            label: "Short link",
            locked: true,
            productId: "menulist",
            value: displayHost,
        }],
        text: hostLayout.text,
        width: contentWidth,
        x: contentInset,
        y: hostY,
    }));
}

function buildEntrancePoster(ctx: BuildContext) {
    buildPremiumEntrancePoster(ctx);
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

function buildPremiumCampaignFlyer(ctx: BuildContext) {
    addDecor(ctx);
    const contentInset = Math.round(ctx.canvasWidth * 0.10);
    const contentWidth = ctx.canvasWidth - contentInset * 2;
    const centerX = ctx.canvasWidth / 2;
    const businessName = truncateForLayer(ctx.input.storeName, 42);
    const tagline = truncateForLayer(ctx.input.tagline, 76);
    const hasTagline = Boolean(tagline?.trim());
    const campaign = ctx.input.campaignContent || ctx.input.flyerCampaign;
    const displayHost = getPrintableAssetDisplayHost(ctx.input);
    const businessNameFontFamily = getThemeDisplayFontFamily(ctx.input.templateFamilyId);
    const businessNameLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasWidth * 0.070),
        minFontSize: Math.round(ctx.canvasWidth * 0.042),
        preferSingleLine: true,
        text: businessName,
        width: contentWidth,
        widthSafetyFactor: businessNameFontFamily === "Georgia, serif" ? 1.12 : 1.04,
    });
    const taglineLayout = hasTagline
        ? layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasWidth * 0.038),
            minFontSize: Math.round(ctx.canvasWidth * 0.026),
            preferSingleLine: true,
            text: tagline?.trim() || "",
            width: Math.round(ctx.canvasWidth * 0.70),
            widthSafetyFactor: 1.04,
        })
        : null;
    const campaignHeadlineLayout = campaign
        ? layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasWidth * 0.055),
            minFontSize: Math.round(ctx.canvasWidth * 0.038),
            preferSingleLine: true,
            text: campaign.headline,
            width: Math.round(ctx.canvasWidth * 0.76),
            widthSafetyFactor: businessNameFontFamily === "Georgia, serif" ? 1.10 : 1.04,
        })
        : null;
    const campaignOfferLayout = campaign?.offer
        ? layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasWidth * 0.034),
            minFontSize: Math.round(ctx.canvasWidth * 0.026),
            preferSingleLine: true,
            text: campaign.offer,
            width: Math.round(ctx.canvasWidth * 0.70),
            widthSafetyFactor: 1.04,
        })
        : null;
    const campaignDetailsLayout = campaign?.details
        ? layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasWidth * 0.026),
            minFontSize: Math.round(ctx.canvasWidth * 0.021),
            preferSingleLine: true,
            text: campaign.details,
            width: Math.round(ctx.canvasWidth * 0.68),
            widthSafetyFactor: 1.04,
        })
        : null;
    const campaignValidityLayout = campaign?.validUntil
        ? layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasWidth * 0.022),
            minFontSize: Math.round(ctx.canvasWidth * 0.018),
            preferSingleLine: true,
            text: campaign.validUntil,
            width: Math.round(ctx.canvasWidth * 0.66),
            widthSafetyFactor: 1.04,
        })
        : null;
    const campaignTermsLayout = campaign?.terms
        ? layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasWidth * 0.019),
            minFontSize: Math.round(ctx.canvasWidth * 0.016),
            preferSingleLine: true,
            text: campaign.terms,
            width: Math.round(ctx.canvasWidth * 0.66),
            widthSafetyFactor: 1.04,
        })
        : null;
    const ctaLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasWidth * 0.046),
        minFontSize: Math.round(ctx.canvasWidth * 0.032),
        preferSingleLine: true,
        text: ctx.labels.scanToViewCompactUpper,
        width: Math.round(ctx.canvasWidth * 0.40),
        widthSafetyFactor: 1.04,
    });
    const hostLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasWidth * 0.024),
        minFontSize: Math.round(ctx.canvasWidth * 0.017),
        preferSingleLine: true,
        text: truncateForLayer(displayHost, 58),
        width: contentWidth,
        widthSafetyFactor: 1.04,
    });
    const markSize = Math.round(ctx.canvasWidth * 0.105);
    const businessNameY = Math.round(ctx.canvasHeight * 0.19);
    const taglineY = businessNameY
        + businessNameLayout.height
        + Math.round(ctx.canvasHeight * 0.032);
    const dividerY = taglineLayout
        ? taglineY + taglineLayout.height + Math.round(ctx.canvasHeight * 0.055)
        : businessNameY + businessNameLayout.height + Math.round(ctx.canvasHeight * 0.075);
    const campaignHeadlineY = dividerY + Math.round(ctx.canvasHeight * 0.042);
    const campaignOfferY = campaignHeadlineY
        + (campaignHeadlineLayout?.height || 0)
        + Math.round(ctx.canvasHeight * 0.018);
    const campaignDetailsY = campaignOfferY
        + (campaignOfferLayout?.height || 0)
        + (campaignOfferLayout ? Math.round(ctx.canvasHeight * 0.014) : 0);
    const campaignValidityY = campaignDetailsY
        + (campaignDetailsLayout?.height || 0)
        + (campaignDetailsLayout ? Math.round(ctx.canvasHeight * 0.016) : 0);
    const campaignTermsY = campaignValidityY
        + (campaignValidityLayout?.height || 0)
        + (campaignValidityLayout ? Math.round(ctx.canvasHeight * 0.010) : 0);
    const campaignContentBottom = campaignTermsLayout
        ? campaignTermsY + campaignTermsLayout.height
        : campaignValidityLayout
            ? campaignValidityY + campaignValidityLayout.height
            : campaignDetailsLayout
                ? campaignDetailsY + campaignDetailsLayout.height
                : campaignOfferLayout
                    ? campaignOfferY + campaignOfferLayout.height
                    : campaignHeadlineLayout
                        ? campaignHeadlineY + campaignHeadlineLayout.height
                        : dividerY;
    const panelX = Math.round(ctx.canvasWidth * 0.09);
    const panelY = campaignHeadlineLayout
        ? Math.max(
            Math.round(ctx.canvasHeight * 0.66),
            campaignContentBottom + Math.round(ctx.canvasHeight * 0.026),
        )
        : Math.max(
            Math.round(ctx.canvasHeight * 0.475),
            dividerY + Math.round(ctx.canvasHeight * 0.055),
        );
    const panelWidth = ctx.canvasWidth - panelX * 2;
    const panelHeight = Math.round(ctx.canvasHeight * (campaignHeadlineLayout ? 0.22 : 0.265));
    const dividerX = Math.round(ctx.canvasWidth * 0.58);
    const qrSize = Math.round(ctx.canvasWidth * 0.24);
    const qrPadding = 24;
    const qrPanelX = panelX + panelWidth - qrSize - qrPadding * 2 - Math.round(ctx.canvasWidth * 0.035);
    const qrPanelY = panelY + Math.round((panelHeight - qrSize - qrPadding * 2) / 2);
    const ctaWidth = dividerX - panelX - Math.round(ctx.canvasWidth * 0.08);
    const ctaX = panelX + Math.round(ctx.canvasWidth * 0.04);
    const ctaY = panelY + Math.round((panelHeight - ctaLayout.height) / 2);
    const hostY = panelY + panelHeight + Math.round(ctx.canvasHeight * (
        ctx.input.templateFamilyId === "lankan-block-print" ? 0.012 : 0.045
    ));

    addBrandMark(
        ctx,
        centerX,
        Math.round(ctx.canvasHeight * 0.07),
        markSize,
        "center",
    );
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.text,
        fontFamily: businessNameFontFamily,
        fontSize: businessNameLayout.fontSize,
        fontWeight: "700",
        height: businessNameLayout.height,
        lineHeight: businessNameLayout.lineHeight,
        name: "Business name",
        text: businessNameLayout.text,
        width: contentWidth,
        x: contentInset,
        y: businessNameY,
    }));
    if (taglineLayout) {
        ctx.elements.push(textElement(ctx, {
            align: "center",
            color: ctx.muted,
            fontSize: taglineLayout.fontSize,
            fontWeight: "400",
            height: taglineLayout.height,
            lineHeight: taglineLayout.lineHeight,
            name: "Business tagline",
            text: taglineLayout.text,
            width: Math.round(ctx.canvasWidth * 0.70),
            x: Math.round(ctx.canvasWidth * 0.15),
            y: taglineY,
        }));
    }
    ctx.elements.push(lineElement(ctx, {
        height: 0,
        name: "Flyer editorial rule",
        opacity: 0.68,
        stroke: ctx.accent,
        strokeWidth: 3,
        width: Math.round(ctx.canvasWidth * 0.30),
        x: Math.round(ctx.canvasWidth * 0.35),
        y: dividerY,
    }));
    if (campaignHeadlineLayout) {
        const campaignTextWidth = Math.round(ctx.canvasWidth * 0.76);
        const campaignTextX = Math.round((ctx.canvasWidth - campaignTextWidth) / 2);
        ctx.elements.push(textElement(ctx, {
            align: "center",
            color: ctx.accent,
            fontFamily: businessNameFontFamily,
            fontSize: campaignHeadlineLayout.fontSize,
            fontWeight: "800",
            height: campaignHeadlineLayout.height,
            lineHeight: campaignHeadlineLayout.lineHeight,
            name: "Campaign headline",
            text: campaignHeadlineLayout.text,
            width: campaignTextWidth,
            x: campaignTextX,
            y: campaignHeadlineY,
        }));
        if (campaignOfferLayout) {
            ctx.elements.push(textElement(ctx, {
                align: "center",
                color: ctx.text,
                fontSize: campaignOfferLayout.fontSize,
                fontWeight: "800",
                height: campaignOfferLayout.height,
                lineHeight: campaignOfferLayout.lineHeight,
                name: "Campaign offer",
                text: campaignOfferLayout.text,
                width: Math.round(ctx.canvasWidth * 0.70),
                x: Math.round(ctx.canvasWidth * 0.15),
                y: campaignOfferY,
            }));
        }
        if (campaignDetailsLayout) {
            ctx.elements.push(textElement(ctx, {
                align: "center",
                color: ctx.muted,
                fontSize: campaignDetailsLayout.fontSize,
                fontWeight: "400",
                height: campaignDetailsLayout.height,
                lineHeight: campaignDetailsLayout.lineHeight,
                name: "Campaign details",
                text: campaignDetailsLayout.text,
                width: Math.round(ctx.canvasWidth * 0.68),
                x: Math.round(ctx.canvasWidth * 0.16),
                y: campaignDetailsY,
            }));
        }
        if (campaignValidityLayout) {
            ctx.elements.push(textElement(ctx, {
                align: "center",
                color: ctx.accent,
                fontSize: campaignValidityLayout.fontSize,
                fontWeight: "700",
                height: campaignValidityLayout.height,
                lineHeight: campaignValidityLayout.lineHeight,
                name: "Campaign validity",
                text: campaignValidityLayout.text,
                width: Math.round(ctx.canvasWidth * 0.66),
                x: Math.round(ctx.canvasWidth * 0.17),
                y: campaignValidityY,
            }));
        }
        if (campaignTermsLayout) {
            ctx.elements.push(textElement(ctx, {
                align: "center",
                color: ctx.muted,
                fontSize: campaignTermsLayout.fontSize,
                fontWeight: "400",
                height: campaignTermsLayout.height,
                lineHeight: campaignTermsLayout.lineHeight,
                name: "Campaign terms",
                text: campaignTermsLayout.text,
                width: Math.round(ctx.canvasWidth * 0.66),
                x: Math.round(ctx.canvasWidth * 0.17),
                y: campaignTermsY,
            }));
        }
    }
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.surface,
        height: panelHeight,
        name: "Flyer scan panel",
        opacity: 0.90,
        radius: Math.round(ctx.canvasWidth * 0.035),
        shadow: { blur: 32, color: "rgba(76,43,31,0.08)", offsetX: 0, offsetY: 14 },
        stroke: ctx.borderColor,
        strokeWidth: 2,
        width: panelWidth,
        x: panelX,
        y: panelY,
    }));
    ctx.elements.push(lineElement(ctx, {
        height: Math.round(panelHeight * 0.64),
        name: "Flyer scan divider",
        opacity: 0.46,
        stroke: ctx.accent,
        strokeWidth: 2,
        width: 0,
        x: dividerX,
        y: panelY + Math.round(panelHeight * 0.18),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accent,
        fontSize: ctaLayout.fontSize,
        fontWeight: "800",
        height: ctaLayout.height,
        lineHeight: ctaLayout.lineHeight,
        name: "Call to action",
        text: ctaLayout.text,
        width: ctaWidth,
        x: ctaX,
        y: ctaY,
    }));
    addQrPanel(
        ctx,
        qrPanelX + qrPadding,
        qrPanelY + qrPadding,
        qrSize,
        0,
        { compact: true, padding: qrPadding },
    );
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.muted,
        fontSize: hostLayout.fontSize,
        fontWeight: "700",
        height: hostLayout.height,
        lineHeight: hostLayout.lineHeight,
        locked: true,
        name: "Short link",
        sourceRefs: [{
            label: "Short link",
            locked: true,
            productId: "menulist",
            value: displayHost,
        }],
        text: hostLayout.text,
        width: contentWidth,
        x: contentInset,
        y: hostY,
    }));
}

function buildCampaignFlyer(ctx: BuildContext) {
    buildPremiumCampaignFlyer(ctx);
}

function buildPremiumGiftCertificate(ctx: BuildContext) {
    addDecor(ctx);
    const certificate = ctx.input.giftCertificateContent;
    const giftWrapOverlaySrc = getPrintableThemeArtworkPaths(ctx.input.templateFamilyId)?.giftCertificate;
    if (!giftWrapOverlaySrc) {
        throw new Error(`Gift Certificate artwork is unavailable for ${ctx.input.templateFamilyId}`);
    }
    const outerInsetX = Math.round(ctx.canvasWidth * 0.040);
    const outerInsetY = Math.round(ctx.canvasHeight * 0.060);
    const contentInset = Math.round(ctx.canvasWidth * 0.080);
    const dividerX = Math.round(ctx.canvasWidth * 0.650);
    const leftWidth = dividerX - contentInset - Math.round(ctx.canvasWidth * 0.050);
    const rightX = Math.round(ctx.canvasWidth * 0.690);
    const rightWidth = Math.round(ctx.canvasWidth * 0.235);
    const displayHost = getPrintableAssetDisplayHost(ctx.input);
    const displayFontFamily = getThemeDisplayFontFamily(ctx.input.templateFamilyId);
    const markSize = Math.round(ctx.canvasHeight * 0.115);
    const businessNameLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasHeight * 0.060),
        minFontSize: Math.round(ctx.canvasHeight * 0.040),
        preferSingleLine: true,
        text: truncateForLayer(ctx.input.storeName, 48),
        width: leftWidth - Math.round(ctx.canvasHeight * 0.14),
        widthSafetyFactor: displayFontFamily === "Georgia, serif" ? 1.12 : 1.04,
    });
    const tagline = truncateForLayer(ctx.input.tagline, 72);
    const brandCopyWidth = leftWidth - markSize - Math.round(ctx.canvasWidth * 0.025);
    const taglineLayout = tagline
        ? layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasHeight * 0.031),
            minFontSize: Math.round(ctx.canvasHeight * 0.023),
            preferSingleLine: true,
            text: tagline,
            width: brandCopyWidth,
            widthSafetyFactor: 1.04,
        })
        : null;
    const titleLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasHeight * 0.086),
        minFontSize: Math.round(ctx.canvasHeight * 0.060),
        preferSingleLine: true,
        text: "GIFT CERTIFICATE",
        width: leftWidth,
        widthSafetyFactor: displayFontFamily === "Georgia, serif" ? 1.12 : 1.04,
    });
    const ctaLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasHeight * 0.036),
        minFontSize: Math.round(ctx.canvasHeight * 0.026),
        preferSingleLine: true,
        text: ctx.labels.scanToViewCompactUpper.replace(/^SCAN TO /, ""),
        width: rightWidth,
        widthSafetyFactor: 1.04,
    });
    const hostLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasHeight * 0.025),
        minFontSize: Math.round(ctx.canvasHeight * 0.018),
        preferSingleLine: true,
        text: truncateForLayer(displayHost, 58),
        width: rightWidth,
        widthSafetyFactor: 1.04,
    });
    const brandY = Math.round(ctx.canvasHeight * 0.115);
    const giftDetailsPanelY = Math.round(ctx.canvasHeight * 0.145);

    ctx.elements.push(imageElement(ctx, {
        alt: "Edge-to-edge theme gift-wrap artwork",
        fit: "cover",
        height: ctx.canvasHeight,
        locked: true,
        name: "Gift wrap background overlay",
        src: giftWrapOverlaySrc,
        width: ctx.canvasWidth,
        x: 0,
        y: 0,
    }));

    ctx.elements.push(rectElement(ctx, {
        fill: "transparent",
        height: ctx.canvasHeight - outerInsetY * 2,
        locked: true,
        name: "Gift certificate border",
        radius: Math.round(ctx.canvasHeight * 0.030),
        stroke: ctx.borderColor,
        strokeWidth: Math.max(3, Math.round(ctx.canvasHeight * 0.005)),
        width: ctx.canvasWidth - outerInsetX * 2,
        x: outerInsetX,
        y: outerInsetY,
    }));
    ctx.elements.push(lineElement(ctx, {
        height: Math.round(ctx.canvasHeight * 0.74),
        locked: true,
        name: "Gift certificate column divider",
        stroke: ctx.borderColor,
        strokeWidth: Math.max(2, Math.round(ctx.canvasHeight * 0.003)),
        width: 0,
        x: dividerX,
        y: Math.round(ctx.canvasHeight * 0.13),
    }));

    addBrandMark(ctx, contentInset, brandY, markSize);
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.text,
        fontFamily: displayFontFamily,
        fontSize: businessNameLayout.fontSize,
        fontWeight: "700",
        height: businessNameLayout.height,
        lineHeight: businessNameLayout.lineHeight,
        name: "Business name",
        text: businessNameLayout.text,
        width: brandCopyWidth,
        x: contentInset + markSize + Math.round(ctx.canvasWidth * 0.025),
        y: brandY + Math.round(markSize * 0.08),
    }));
    if (taglineLayout) {
        ctx.elements.push(textElement(ctx, {
            align: "left",
            color: ctx.muted,
            fontSize: taglineLayout.fontSize,
            fontWeight: "600",
            height: taglineLayout.height,
            lineHeight: taglineLayout.lineHeight,
            name: "Business tagline",
            text: taglineLayout.text,
            width: brandCopyWidth,
            x: contentInset + markSize + Math.round(ctx.canvasWidth * 0.025),
            y: brandY + businessNameLayout.height + Math.round(ctx.canvasHeight * 0.018),
        }));
    }

    const brandCopyBottom = brandY
        + Math.round(markSize * 0.08)
        + businessNameLayout.height
        + (taglineLayout ? Math.round(ctx.canvasHeight * 0.018) + taglineLayout.height : 0);
    const titleY = Math.max(
        Math.round(ctx.canvasHeight * 0.300),
        brandCopyBottom + Math.round(ctx.canvasHeight * 0.045),
    );
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.accent,
        fontFamily: displayFontFamily,
        fontSize: titleLayout.fontSize,
        fontWeight: "700",
        height: titleLayout.height,
        lineHeight: titleLayout.lineHeight,
        name: "Voucher headline",
        text: titleLayout.text,
        width: leftWidth,
        x: contentInset,
        y: titleY,
    }));
    const titleRuleY = titleY + titleLayout.height + Math.round(ctx.canvasHeight * 0.030);
    ctx.elements.push(lineElement(ctx, {
        height: 0,
        locked: true,
        name: "Gift certificate title rule",
        stroke: ctx.borderColor,
        strokeWidth: Math.max(2, Math.round(ctx.canvasHeight * 0.003)),
        width: Math.round(leftWidth * 0.82),
        x: contentInset,
        y: titleRuleY,
    }));

    const addWriteInField = (name: string, label: string, y: number, value?: string, width = leftWidth) => {
        ctx.elements.push(textElement(ctx, {
            align: "left",
            color: ctx.muted,
            fontSize: Math.round(ctx.canvasHeight * 0.024),
            fontWeight: "700",
            height: Math.round(ctx.canvasHeight * 0.038),
            name,
            text: label,
            width,
            x: contentInset,
            y,
        }));
        ctx.elements.push(lineElement(ctx, {
            height: 0,
            locked: true,
            name: `${name} line`,
            stroke: ctx.borderColor,
            strokeWidth: Math.max(2, Math.round(ctx.canvasHeight * 0.003)),
            width,
            x: contentInset,
            y: y + Math.round(ctx.canvasHeight * 0.112),
        }));
        if (value) {
            const valueLayout = layoutCenteredPrintableText({
                maxFontSize: Math.round(ctx.canvasHeight * 0.030),
                maxLines: label === "PERSONAL MESSAGE" ? 2 : 1,
                minFontSize: Math.round(ctx.canvasHeight * 0.020),
                text: value,
                width,
                widthSafetyFactor: 1.04,
            });
            ctx.elements.push(textElement(ctx, {
                align: "left",
                color: ctx.text,
                fontSize: valueLayout.fontSize,
                fontWeight: "600",
                height: valueLayout.height,
                lineHeight: valueLayout.lineHeight,
                name: `${name} value`,
                text: valueLayout.text,
                width,
                x: contentInset,
                y: y + Math.round(ctx.canvasHeight * 0.044),
            }));
        }
    };
    const recipientY = Math.max(
        Math.round(ctx.canvasHeight * 0.475),
        titleRuleY + Math.round(ctx.canvasHeight * 0.045),
    );
    const fieldInterval = Math.round(ctx.canvasHeight * 0.145);
    addWriteInField("Recipient label", "PRESENTED TO", recipientY, certificate?.recipient);
    addWriteInField("Sender label", "FROM", recipientY + fieldInterval, certificate?.sender);
    addWriteInField("Message label", "PERSONAL MESSAGE", recipientY + fieldInterval * 2, certificate?.message);

    const fieldPanelY = giftDetailsPanelY;
    const fieldPanelHeight = Math.round(ctx.canvasHeight * 0.235);
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.surface,
        height: fieldPanelHeight,
        locked: true,
        name: "Gift details panel",
        opacity: 0.78,
        radius: Math.round(ctx.canvasHeight * 0.022),
        stroke: ctx.borderColor,
        strokeWidth: Math.max(2, Math.round(ctx.canvasHeight * 0.003)),
        width: rightWidth,
        x: rightX,
        y: fieldPanelY,
    }));
    const rightFieldInset = Math.round(rightWidth * 0.085);
    const rightFieldWidth = rightWidth - rightFieldInset * 2;
    const addRightField = (name: string, label: string, y: number, value?: string) => {
        ctx.elements.push(textElement(ctx, {
            align: "left",
            color: ctx.muted,
            fontSize: Math.round(ctx.canvasHeight * 0.021),
            fontWeight: "700",
            height: Math.round(ctx.canvasHeight * 0.032),
            name,
            text: label,
            width: rightFieldWidth,
            x: rightX + rightFieldInset,
            y,
        }));
        ctx.elements.push(lineElement(ctx, {
            height: 0,
            locked: true,
            name: `${name} line`,
            stroke: ctx.borderColor,
            strokeWidth: Math.max(2, Math.round(ctx.canvasHeight * 0.0025)),
            width: rightFieldWidth,
            x: rightX + rightFieldInset,
            y: y + Math.round(ctx.canvasHeight * 0.066),
        }));
        if (value) {
            const valueLayout = layoutCenteredPrintableText({
                maxFontSize: Math.round(ctx.canvasHeight * 0.025),
                maxLines: 1,
                minFontSize: Math.round(ctx.canvasHeight * 0.017),
                preferSingleLine: true,
                text: value,
                width: rightFieldWidth,
                widthSafetyFactor: 1.04,
            });
            ctx.elements.push(textElement(ctx, {
                align: "left",
                color: ctx.text,
                fontSize: valueLayout.fontSize,
                fontWeight: "700",
                height: valueLayout.height,
                lineHeight: valueLayout.lineHeight,
                name: `${name} value`,
                text: valueLayout.text,
                width: rightFieldWidth,
                x: rightX + rightFieldInset,
                y: y + Math.round(ctx.canvasHeight * 0.034),
            }));
        }
    };
    addRightField("Gift value label", "VALUE", fieldPanelY + Math.round(ctx.canvasHeight * 0.010), certificate?.value);
    addRightField("Gift validity label", "VALID UNTIL", fieldPanelY + Math.round(ctx.canvasHeight * 0.085), certificate?.validUntil);
    addRightField("Certificate number label", "CERTIFICATE NO.", fieldPanelY + Math.round(ctx.canvasHeight * 0.160), certificate?.certificateNumber);

    const ctaY = Math.round(ctx.canvasHeight * 0.415);
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accent,
        fontSize: ctaLayout.fontSize,
        fontWeight: "700",
        height: ctaLayout.height,
        lineHeight: ctaLayout.lineHeight,
        name: "Call to action",
        text: ctaLayout.text,
        width: rightWidth,
        x: rightX,
        y: ctaY,
    }));
    const qrSize = Math.round(ctx.canvasHeight * 0.245);
    const qrPanelPadding = 24;
    const qrPanelY = ctaY + ctaLayout.height + Math.round(ctx.canvasHeight * 0.035);
    addQrPanel(
        ctx,
        Math.round(rightX + rightWidth / 2 - qrSize / 2),
        qrPanelY + qrPanelPadding,
        qrSize,
        0,
        { compact: true, padding: qrPanelPadding },
    );
    const hostY = qrPanelY + qrSize + qrPanelPadding * 2 + Math.round(ctx.canvasHeight * 0.024);
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.muted,
        fontSize: hostLayout.fontSize,
        fontWeight: "700",
        height: hostLayout.height + Math.round(ctx.canvasHeight * 0.010),
        lineHeight: hostLayout.lineHeight,
        locked: true,
        name: "Short link",
        sourceRefs: [{
            label: "Short link",
            locked: true,
            productId: "menulist",
            value: displayHost,
        }],
        text: hostLayout.text,
        width: rightWidth,
        x: rightX,
        y: hostY,
    }));
}

function buildGiftCertificate(ctx: BuildContext) {
    buildPremiumGiftCertificate(ctx);
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
    addDecor(ctx);
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
        fill: ctx.accent,
        icon: "P",
        text: getContactPhone(ctx),
        width: Math.round(ctx.canvasWidth * 0.40),
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.72),
    });
    addContactLine(ctx, {
        fill: ctx.accent,
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
        color: ctx.accent,
        fontFamily: "Georgia, serif",
        fontSize: Math.round(ctx.canvasHeight * 0.05),
        fontStyle: "italic",
        fontWeight: "700",
        height: Math.round(ctx.canvasHeight * 0.08),
        name: "Scan note",
        text: `Scan for ${ctx.labels.offeringLower}`,
        width: Math.round(ctx.canvasWidth * 0.28),
        x: Math.round(ctx.canvasWidth * 0.64),
        y: Math.round(ctx.canvasHeight * 0.66),
    }));
    addShortLink(ctx, {
        align: "left",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasHeight * 0.036),
        height: Math.round(ctx.canvasHeight * 0.08),
        width: Math.round(ctx.canvasWidth * 0.50),
        x: margin,
        y: Math.round(ctx.canvasHeight * 0.84),
    });
}

function buildBusinessCardBackFace(ctx: BuildContext) {
    addDecor(ctx);
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
        x: Math.round(ctx.canvasWidth * 0.21),
        y: Math.round(ctx.canvasHeight * 0.73),
    }));
    addShortLink(ctx, {
        align: "center",
        color: ctx.text,
        fontSize: Math.round(ctx.canvasHeight * 0.062),
        height: Math.round(ctx.canvasHeight * 0.08),
        width: Math.round(ctx.canvasWidth * 0.68),
        x: Math.round(ctx.canvasWidth * 0.16),
        y: Math.round(ctx.canvasHeight * 0.84),
    });
}

function addPremiumBusinessCardMark(
    ctx: BuildContext,
    centerX: number,
    y: number,
    size: number,
    variant: "light" | "accent",
) {
    const fill = variant === "light" ? ctx.surface : ctx.accent;
    const textColor = variant === "light" ? ctx.accent : ctx.accentText;
    const markX = centerX - size / 2;
    ctx.elements.push(ellipseElement(ctx, {
        fill,
        height: size,
        name: "Business card brand mark field",
        opacity: 0.96,
        stroke: variant === "light" ? ctx.borderColor : ctx.accent,
        strokeWidth: 2,
        width: size,
        x: markX,
        y,
    }));
    if (ctx.input.logoUrl) {
        const logoInset = Math.round(size * 0.15);
        ctx.elements.push(imageElement(ctx, {
            height: size - logoInset * 2,
            locked: true,
            name: "Business logo",
            src: ctx.input.logoUrl,
            width: size - logoInset * 2,
            x: markX + logoInset,
            y: y + logoInset,
        }));
        return;
    }
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: textColor,
        fontSize: Math.round(size * 0.30),
        fontWeight: "800",
        height: Math.round(size * 0.40),
        name: "Business initials",
        text: initials(ctx.input.storeName),
        width: size,
        x: markX,
        y: y + Math.round(size * 0.31),
    }));
}

function getBusinessCardPerson(ctx: BuildContext): { name?: string } {
    const contactName = ctx.input.contactName?.trim();
    const isBusinessName = contactName?.localeCompare(ctx.input.storeName.trim(), undefined, { sensitivity: "accent" }) === 0;
    const isPlaceholder = /^(contact\s+name|name|your\s+name)$/i.test(contactName || "");
    const name = contactName && !isBusinessName && !isPlaceholder
        ? truncateForLayer(contactName, 38)
        : undefined;
    return { name };
}

type BusinessCardContactKind = "phone" | "email" | "address";

function getBusinessCardContactIconDataUri(kind: BusinessCardContactKind, color: string): string {
    const paths: Record<BusinessCardContactKind, string> = {
        address: '<path d="M12 21s6-5.35 6-11a6 6 0 1 0-12 0c0 5.65 6 11 6 11Z"/><circle cx="12" cy="10" r="2.25"/>',
        email: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4.5 7 7.5 6 7.5-6"/>',
        phone: '<path d="M7.15 3.75 4.9 5.15c-.7.44-.98 1.3-.68 2.08 2.05 5.28 6.27 9.5 11.55 11.55.78.3 1.64.02 2.08-.68l1.4-2.25a1.55 1.55 0 0 0-.35-2.02l-2.55-2.08a1.55 1.55 0 0 0-1.9-.04l-1.43 1.05a13.2 13.2 0 0 1-1.95-1.83 13.2 13.2 0 0 1-1.83-1.95l1.05-1.43a1.55 1.55 0 0 0-.04-1.9L9.17 4.1a1.55 1.55 0 0 0-2.02-.35Z"/>',
    };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths[kind]}</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getBusinessCardContactRows(ctx: BuildContext): Array<{ kind: BusinessCardContactKind; value: string }> {
    const phone = ctx.input.contactPhone?.trim();
    const phoneDigits = phone?.replace(/\D/g, "") || "";
    const validPhone = Boolean(
        phone
        && phoneDigits.length >= 7
        && phoneDigits.length <= 15
        && /^[+()\-.\s\d]+$/.test(phone),
    );
    const email = ctx.input.contactEmail?.trim();
    const validEmail = Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    const address = ctx.input.contactAddress?.trim();
    const validAddress = Boolean(
        address
        && address.length >= 5
        && !/^(address|business\s+address|your\s+address)$/i.test(address),
    );
    return [
        validPhone ? { kind: "phone" as const, value: truncateForLayer(phone, 40) } : null,
        validEmail ? { kind: "email" as const, value: truncateForLayer(email, 48) } : null,
        validAddress ? { kind: "address" as const, value: truncateForLayer(address, 68) } : null,
    ].filter((row): row is { kind: BusinessCardContactKind; value: string } => Boolean(row));
}

function addPremiumBusinessCardContactRow(
    ctx: BuildContext,
    params: { kind: BusinessCardContactKind; value: string; x: number; y: number; width: number },
) {
    const iconSize = Math.round(ctx.canvasHeight * 0.052);
    const iconGap = Math.round(ctx.canvasWidth * 0.018);
    const valueX = params.x + iconSize + iconGap;
    const valueWidth = params.width - iconSize - iconGap;
    const valueLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasHeight * 0.048),
        maxLines: 2,
        minFontSize: Math.round(ctx.canvasHeight * 0.038),
        preferSingleLine: true,
        text: params.value,
        width: valueWidth,
    });
    ctx.elements.push(imageElement(ctx, {
        alt: `${params.kind} contact icon`,
        height: iconSize,
        name: `Business card ${params.kind} icon`,
        src: getBusinessCardContactIconDataUri(params.kind, ctx.accent),
        width: iconSize,
        x: params.x,
        y: params.y + Math.max(0, Math.round((valueLayout.height - iconSize) / 2)),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.text,
        fontSize: valueLayout.fontSize,
        fontWeight: "600",
        height: valueLayout.height,
        lineHeight: valueLayout.lineHeight,
        name: `Business card ${params.kind} value`,
        text: valueLayout.text,
        width: valueWidth,
        x: valueX,
        y: params.y,
    }));
}

function buildPremiumThemedBusinessCardFrontFace(ctx: BuildContext) {
    addDecor(ctx);
    const accentPanelWidth = Math.round(ctx.canvasWidth * 0.31);
    const contentX = Math.round(ctx.canvasWidth * 0.38);
    const contentWidth = Math.round(ctx.canvasWidth * 0.53);
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.accent,
        height: ctx.canvasHeight,
        locked: true,
        name: "Business card front accent field",
        opacity: 0.94,
        width: accentPanelWidth,
        x: 0,
        y: 0,
    }));
    ctx.elements.push(lineElement(ctx, {
        height: Math.round(ctx.canvasHeight * 0.30),
        locked: true,
        name: "Business card front signature stroke",
        opacity: 0.42,
        stroke: ctx.accentText,
        strokeWidth: 4,
        width: Math.round(ctx.canvasWidth * 0.18),
        x: Math.round(ctx.canvasWidth * 0.02),
        y: Math.round(ctx.canvasHeight * 0.06),
    }));
    ctx.elements.push(lineElement(ctx, {
        height: Math.round(ctx.canvasHeight * 0.22),
        locked: true,
        name: "Business card front signature stroke",
        opacity: 0.24,
        stroke: ctx.accentText,
        strokeWidth: 3,
        width: Math.round(ctx.canvasWidth * 0.13),
        x: Math.round(ctx.canvasWidth * 0.13),
        y: Math.round(ctx.canvasHeight * 0.70),
    }));
    addPremiumBusinessCardMark(
        ctx,
        Math.round(accentPanelWidth * 0.50),
        Math.round(ctx.canvasHeight * 0.37),
        Math.round(ctx.canvasHeight * 0.25),
        "light",
    );

    const businessNameLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasHeight * 0.102),
        maxLines: 2,
        minFontSize: Math.round(ctx.canvasHeight * 0.057),
        preferSingleLine: true,
        text: ctx.input.storeName,
        width: contentWidth,
        widthSafetyFactor: 1.10,
    });
    const tagline = ctx.input.tagline?.trim();
    const nameY = tagline
        ? Math.round(ctx.canvasHeight * 0.35)
        : Math.round((ctx.canvasHeight - businessNameLayout.height) / 2);
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.text,
        fontFamily: getThemeDisplayFontFamily(ctx.input.templateFamilyId),
        fontSize: businessNameLayout.fontSize,
        fontWeight: "800",
        height: businessNameLayout.height,
        lineHeight: businessNameLayout.lineHeight,
        name: "Business name",
        text: businessNameLayout.text,
        width: contentWidth,
        x: contentX,
        y: nameY,
    }));
    if (tagline) {
        const taglineLayout = layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasHeight * 0.042),
            maxLines: 2,
            minFontSize: Math.round(ctx.canvasHeight * 0.032),
            preferSingleLine: true,
            text: tagline,
            width: contentWidth,
        });
        ctx.elements.push(lineElement(ctx, {
            height: 0,
            locked: true,
            name: "Business card identity divider",
            opacity: 0.72,
            stroke: ctx.accent,
            strokeWidth: 3,
            width: Math.round(contentWidth * 0.24),
            x: contentX,
            y: nameY + businessNameLayout.height + Math.round(ctx.canvasHeight * 0.055),
        }));
        ctx.elements.push(textElement(ctx, {
            align: "left",
            color: ctx.muted,
            fontSize: taglineLayout.fontSize,
            fontWeight: "600",
            height: taglineLayout.height,
            lineHeight: taglineLayout.lineHeight,
            name: "Tagline",
            text: taglineLayout.text,
            width: contentWidth,
            x: contentX,
            y: nameY + businessNameLayout.height + Math.round(ctx.canvasHeight * 0.095),
        }));
    }
}

function buildPremiumThemedBusinessCardBackFace(ctx: BuildContext) {
    addDecor(ctx);
    const margin = Math.round(ctx.canvasWidth * 0.065);
    const contactWidth = Math.round(ctx.canvasWidth * 0.50);
    const hasInsetCompactSafeField = ctx.input.templateFamilyId === "lankan-block-print";
    const utilityX = Math.round(ctx.canvasWidth * (hasInsetCompactSafeField ? 0.62 : 0.64));
    const utilityRight = hasInsetCompactSafeField
        ? Math.round(ctx.canvasWidth * 0.935)
        : ctx.canvasWidth;
    const utilityWidth = utilityRight - utilityX;
    const person = getBusinessCardPerson(ctx);
    const contactRows = getBusinessCardContactRows(ctx);

    ctx.elements.push(rectElement(ctx, {
        fill: ctx.accent,
        height: ctx.canvasHeight,
        locked: true,
        name: "Business card QR utility field",
        opacity: 0.94,
        width: utilityWidth,
        x: utilityX,
        y: 0,
    }));
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.borderColor,
        height: ctx.canvasHeight,
        locked: true,
        name: "Business card utility edge",
        opacity: 0.46,
        width: Math.round(ctx.canvasWidth * 0.012),
        x: utilityX,
        y: 0,
    }));
    addPremiumBusinessCardMark(
        ctx,
        margin + Math.round(ctx.canvasHeight * 0.080),
        Math.round(ctx.canvasHeight * 0.075),
        Math.round(ctx.canvasHeight * 0.16),
        "accent",
    );
    const brandX = margin + Math.round(ctx.canvasHeight * 0.19);
    const brandWidth = Math.round(ctx.canvasWidth * 0.36);
    const brandLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasHeight * 0.050),
        maxLines: 2,
        minFontSize: Math.round(ctx.canvasHeight * 0.034),
        preferSingleLine: true,
        text: ctx.input.storeName,
        width: brandWidth,
        widthSafetyFactor: 1.06,
    });
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.text,
        fontFamily: getThemeDisplayFontFamily(ctx.input.templateFamilyId),
        fontSize: brandLayout.fontSize,
        fontWeight: "800",
        height: brandLayout.height,
        lineHeight: brandLayout.lineHeight,
        name: "Business name",
        text: brandLayout.text,
        width: brandWidth,
        x: brandX,
        y: Math.round(ctx.canvasHeight * 0.105),
    }));

    const identityBottom = Math.max(
        Math.round(ctx.canvasHeight * 0.075) + Math.round(ctx.canvasHeight * 0.16),
        Math.round(ctx.canvasHeight * 0.105) + brandLayout.height,
    );
    let contactRowsY = identityBottom + Math.round(ctx.canvasHeight * 0.085);
    if (person.name) {
        const personFontSize = fitSingleLineFontSize(
            person.name,
            contactWidth,
            Math.round(ctx.canvasHeight * 0.056),
            Math.round(ctx.canvasHeight * 0.038),
        );
        ctx.elements.push(textElement(ctx, {
            align: "left",
            color: ctx.text,
            fontSize: personFontSize,
            fontWeight: "800",
            height: Math.round(ctx.canvasHeight * 0.064),
            name: "Contact name",
            text: person.name,
            width: contactWidth,
            x: margin,
            y: contactRowsY,
        }));
        contactRowsY += Math.round(ctx.canvasHeight * 0.105);
    }

    const availableRowsHeight = Math.round(ctx.canvasHeight * 0.91) - contactRowsY;
    const rowInterval = contactRows.length
        ? Math.min(
            Math.round(ctx.canvasHeight * 0.115),
            Math.floor(availableRowsHeight / contactRows.length),
        )
        : 0;
    contactRows.forEach((row, index) => {
        addPremiumBusinessCardContactRow(ctx, {
            ...row,
            width: contactWidth,
            x: margin,
            y: contactRowsY + rowInterval * index,
        });
    });

    const qrPanelPadding = 24;
    const qrSize = Math.round(ctx.canvasHeight * 0.32);
    const qrPanelSize = qrSize + qrPanelPadding * 2;
    const qrPanelX = utilityX + Math.round((utilityWidth - qrPanelSize) / 2);
    const qrX = qrPanelX + qrPanelPadding;
    const ctaText = ctx.labels.scanToViewCompactUpper.replace(/^SCAN TO /, "");
    const ctaLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasHeight * 0.040),
        maxLines: 2,
        minFontSize: Math.round(ctx.canvasHeight * 0.032),
        preferSingleLine: true,
        text: ctaText,
        width: Math.round(utilityWidth * 0.82),
    });
    ctx.elements.push(textElement(ctx, {
        align: "center",
        charSpacing: 80,
        color: ctx.accentText,
        fontSize: ctaLayout.fontSize,
        fontWeight: "800",
        height: ctaLayout.height,
        lineHeight: ctaLayout.lineHeight,
        name: "Business card action",
        text: ctaLayout.text,
        width: Math.round(utilityWidth * 0.82),
        x: utilityX + Math.round(utilityWidth * 0.09),
        y: Math.round(ctx.canvasHeight * 0.18),
    }));
    addQrPanel(
        ctx,
        qrX,
        Math.round(ctx.canvasHeight * 0.31),
        qrSize,
        0,
        { compact: true, padding: qrPanelPadding },
    );
    const hostLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasHeight * 0.034),
        maxLines: 2,
        minFontSize: Math.round(ctx.canvasHeight * 0.030),
        preferSingleLine: false,
        text: getPrintableAssetDisplayHost(ctx.input),
        width: Math.round(utilityWidth * 0.82),
    });
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accentText,
        fontSize: hostLayout.fontSize,
        fontWeight: "700",
        height: hostLayout.height + Math.round(hostLayout.fontSize * 0.25),
        lineHeight: hostLayout.lineHeight,
        locked: true,
        name: "Short link",
        sourceRefs: [{
            label: "Menu link",
            locked: true,
            productId: "menulist",
            value: getPrintableAssetDisplayHost(ctx.input),
        }],
        text: hostLayout.text,
        width: Math.round(utilityWidth * 0.82),
        x: utilityX + Math.round(utilityWidth * 0.09),
        y: Math.round(ctx.canvasHeight * 0.78),
    }));
}

function buildBusinessCard(ctx: BuildContext) {
    addBusinessCardFace(
        ctx,
        0,
        BUSINESS_CARD_FRONT_FACE_ID,
        buildPremiumThemedBusinessCardFrontFace,
    );
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
    addBusinessCardFace(
        ctx,
        BUSINESS_CARD_BACK_FACE_OFFSET,
        BUSINESS_CARD_BACK_FACE_ID,
        buildPremiumThemedBusinessCardBackFace,
    );
}

function getStaffBadgePerson(ctx: BuildContext): { name?: string; role?: string } {
    const staffName = ctx.input.staffName?.trim();
    const hasValidName = Boolean(staffName && !/^(name|staff|staff\s+member|staff\s+name|team\s+member|your\s+name)$/i.test(staffName));
    const staffRole = ctx.input.staffRole?.trim();
    const hasValidRole = Boolean(
        hasValidName
        && staffRole
        && !/^(role|designation|job\s+title)$/i.test(staffRole),
    );
    return {
        name: hasValidName ? truncateForLayer(staffName, 46) : undefined,
        role: hasValidRole ? truncateForLayer(staffRole, 34) : undefined,
    };
}

function buildPremiumThemedStaffNameBadge(ctx: BuildContext) {
    addDecor(ctx);
    const person = getStaffBadgePerson(ctx);
    const headerHeight = Math.round(ctx.canvasHeight * 0.205);
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.accent,
        height: headerHeight,
        locked: true,
        name: "Staff badge header field",
        opacity: 0.95,
        width: ctx.canvasWidth,
        x: 0,
        y: 0,
    }));
    const slotWidth = Math.round(ctx.canvasWidth * 0.16);
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.surface,
        height: Math.round(ctx.canvasHeight * 0.012),
        locked: true,
        name: "Lanyard slot guide",
        opacity: 0.90,
        radius: Math.round(ctx.canvasHeight * 0.006),
        width: slotWidth,
        x: Math.round((ctx.canvasWidth - slotWidth) / 2),
        y: Math.round(ctx.canvasHeight * 0.035),
    }));
    const markSize = Math.round(ctx.canvasWidth * 0.14);
    addPremiumBusinessCardMark(
        ctx,
        Math.round(ctx.canvasWidth * 0.13),
        Math.round(ctx.canvasHeight * 0.082),
        markSize,
        "light",
    );
    const businessNameX = Math.round(ctx.canvasWidth * 0.23);
    const businessNameWidth = Math.round(ctx.canvasWidth * 0.67);
    const businessNameLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasWidth * 0.062),
        maxLines: 2,
        minFontSize: Math.round(ctx.canvasWidth * 0.040),
        preferSingleLine: true,
        text: ctx.input.storeName,
        width: businessNameWidth,
        widthSafetyFactor: 1.08,
    });
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.accentText,
        fontFamily: getThemeDisplayFontFamily(ctx.input.templateFamilyId),
        fontSize: businessNameLayout.fontSize,
        fontWeight: "800",
        height: businessNameLayout.height,
        lineHeight: businessNameLayout.lineHeight,
        name: "Business name",
        text: businessNameLayout.text,
        width: businessNameWidth,
        x: businessNameX,
        y: Math.round(ctx.canvasHeight * 0.105),
    }));

    if (person.name) {
        const monogramHaloSize = Math.round(ctx.canvasWidth * 0.43);
        const monogramSize = Math.round(ctx.canvasWidth * 0.34);
        const monogramHaloY = Math.round(ctx.canvasHeight * 0.24);
        const monogramY = monogramHaloY + Math.round((monogramHaloSize - monogramSize) / 2);
        ctx.elements.push(ellipseElement(ctx, {
            fill: ctx.surface,
            height: monogramHaloSize,
            locked: true,
            name: "Staff monogram halo",
            opacity: 0.78,
            shadow: { blur: 22, color: "rgba(52,43,38,0.13)", offsetX: 0, offsetY: 10 },
            stroke: ctx.borderColor,
            strokeWidth: Math.round(ctx.canvasWidth * 0.005),
            width: monogramHaloSize,
            x: Math.round((ctx.canvasWidth - monogramHaloSize) / 2),
            y: monogramHaloY,
        }));
        ctx.elements.push(ellipseElement(ctx, {
            fill: ctx.accent,
            height: monogramSize,
            locked: true,
            name: "Staff monogram field",
            opacity: 0.96,
            stroke: ctx.surface,
            strokeWidth: Math.round(ctx.canvasWidth * 0.008),
            width: monogramSize,
            x: Math.round((ctx.canvasWidth - monogramSize) / 2),
            y: monogramY,
        }));
        ctx.elements.push(textElement(ctx, {
            align: "center",
            color: ctx.accentText,
            fontFamily: getThemeDisplayFontFamily(ctx.input.templateFamilyId),
            fontSize: Math.round(monogramSize * 0.32),
            fontWeight: "800",
            height: Math.round(monogramSize * 0.40),
            name: "Staff initials",
            text: initials(person.name),
            width: monogramSize,
            x: Math.round((ctx.canvasWidth - monogramSize) / 2),
            y: monogramY + Math.round(monogramSize * 0.31),
        }));
    }

    const identityWidth = Math.round(ctx.canvasWidth * 0.78);
    const identityX = Math.round((ctx.canvasWidth - identityWidth) / 2);
    const nameY = Math.round(ctx.canvasHeight * 0.56);
    if (person.name) {
        const staffNameLayout = layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasWidth * 0.078),
            maxLines: 2,
            minFontSize: Math.round(ctx.canvasWidth * 0.044),
            preferSingleLine: true,
            text: person.name,
            width: identityWidth,
            widthSafetyFactor: 1.08,
        });
        ctx.elements.push(textElement(ctx, {
            align: "center",
            color: ctx.text,
            fontFamily: getThemeDisplayFontFamily(ctx.input.templateFamilyId),
            fontSize: staffNameLayout.fontSize,
            fontWeight: "800",
            height: staffNameLayout.height,
            lineHeight: staffNameLayout.lineHeight,
            name: "Staff name",
            text: staffNameLayout.text,
            width: identityWidth,
            x: identityX,
            y: nameY,
        }));
        if (person.role) {
            const roleLayout = layoutCenteredPrintableText({
                maxFontSize: Math.round(ctx.canvasWidth * 0.038),
                maxLines: 2,
                minFontSize: Math.round(ctx.canvasWidth * 0.030),
                preferSingleLine: true,
                text: person.role.toUpperCase(),
                width: Math.round(identityWidth * 0.86),
            });
            ctx.elements.push(textElement(ctx, {
                align: "center",
                charSpacing: 130,
                color: ctx.accent,
                fontSize: roleLayout.fontSize,
                fontWeight: "800",
                height: roleLayout.height,
                lineHeight: roleLayout.lineHeight,
                name: "Staff role",
                text: roleLayout.text,
                width: Math.round(identityWidth * 0.86),
                x: Math.round((ctx.canvasWidth - identityWidth * 0.86) / 2),
                y: nameY + staffNameLayout.height + Math.round(ctx.canvasHeight * 0.026),
            }));
        }
    }

    const purposeY = Math.round(ctx.canvasHeight * 0.81);
    const purposeWidth = Math.round(ctx.canvasWidth * 0.38);
    const purposeLineWidth = Math.round(ctx.canvasWidth * 0.17);
    ctx.elements.push(lineElement(ctx, {
        height: 0,
        locked: true,
        name: "Staff badge purpose divider",
        opacity: 0.62,
        stroke: ctx.accent,
        strokeWidth: 3,
        width: purposeLineWidth,
        x: Math.round(ctx.canvasWidth * 0.08),
        y: purposeY + Math.round(ctx.canvasHeight * 0.014),
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        charSpacing: 220,
        color: ctx.accent,
        fontSize: Math.round(ctx.canvasWidth * 0.030),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.035),
        name: "Staff badge purpose",
        text: "STAFF BADGE",
        width: purposeWidth,
        x: Math.round((ctx.canvasWidth - purposeWidth) / 2),
        y: purposeY,
    }));
    ctx.elements.push(lineElement(ctx, {
        height: 0,
        locked: true,
        name: "Staff badge purpose divider",
        opacity: 0.62,
        stroke: ctx.accent,
        strokeWidth: 3,
        width: purposeLineWidth,
        x: Math.round(ctx.canvasWidth * 0.73),
        y: purposeY + Math.round(ctx.canvasHeight * 0.014),
    }));
}

function buildStaffIdCard(ctx: BuildContext) {
    buildPremiumThemedStaffNameBadge(ctx);
}

function addInvitationLibraryIconMotif(ctx: BuildContext) {
    const ornamentWidth = Math.round(ctx.canvasWidth * 0.082);
    const ornamentHeight = Math.round(ornamentWidth * (199 / 195));
    const ornamentX = Math.round((ctx.canvasWidth - ornamentWidth) / 2);
    const ornamentY = Math.round(ctx.canvasHeight * 0.047);
    ctx.elements.push(imageElement(ctx, {
        alt: "Hand-drawn ceremonial garland",
        fit: "contain",
        height: ornamentHeight,
        locked: true,
        name: "Invitation top garland ornament",
        opacity: 0.56,
        src: getPrintableLibraryIconDataUri("koboyo-may-garland", ctx.accent),
        width: ornamentWidth,
        x: ornamentX,
        y: ornamentY,
    }));
    const markSize = Math.round(ctx.canvasWidth * 0.052);
    addPremiumBusinessCardMark(
        ctx,
        ctx.canvasWidth / 2,
        Math.round(ctx.canvasHeight * 0.113),
        markSize,
        "accent",
    );

    const closingWidth = Math.round(ctx.canvasWidth * 0.105);
    const closingHeight = Math.round(closingWidth * (166 / 159));
    ctx.elements.push(imageElement(ctx, {
        alt: "Hand-drawn celebration burst",
        fit: "contain",
        height: closingHeight,
        locked: true,
        name: "Invitation closing celebration mark",
        opacity: 0.42,
        src: getPrintableLibraryIconDataUri("koboyo-celebration-burst", ctx.accent),
        width: closingWidth,
        x: Math.round((ctx.canvasWidth - closingWidth) / 2),
        y: Math.round(ctx.canvasHeight * 0.84),
    }));
}

function getInvitationBotanicalOrnamentDataUri(ctx: BuildContext): string {
    const flowerSymbol = getPrintableLibraryIconSymbolMarkup("koboyo-flower", "invitation-flower");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 1748" fill="none" data-copy-safe-center="true" data-icon-library="koboyo">
<defs>
  ${flowerSymbol}
</defs>
<g color="${ctx.accent}" opacity=".62">
  <use href="#invitation-flower" x="88" y="438" width="92" height="132"/>
  <use href="#invitation-flower" x="190" y="516" width="54" height="78"/>
  <use href="#invitation-flower" x="1060" y="438" width="92" height="132"/>
  <use href="#invitation-flower" x="996" y="516" width="54" height="78"/>
</g>
<g stroke="${ctx.borderColor}" stroke-linecap="round" opacity=".72">
  <path d="M410 450c55-38 365-38 420 0" stroke-width="3"/>
  <path d="M455 462c46-20 284-20 330 0" stroke-width="2" stroke-dasharray="2 12"/>
</g>
<g fill="${ctx.accent}" opacity=".36">
  <path d="M620 414l8 15 15 8-15 8-8 15-8-15-15-8 15-8 8-15Z"/>
  <circle cx="278" cy="534" r="4"/><circle cx="962" cy="534" r="4"/>
</g>
</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function addInvitationWriteInField(
    ctx: BuildContext,
    params: {
        label: string;
        labelY: number;
        lineY: number;
        name: string;
        width: number;
        x: number;
        value?: string;
    },
) {
    ctx.elements.push(textElement(ctx, {
        align: "center",
        charSpacing: 170,
        color: ctx.accent,
        fontSize: Math.round(ctx.canvasWidth * 0.021),
        fontWeight: "800",
        height: Math.round(ctx.canvasHeight * 0.025),
        name: `${params.name} label`,
        text: params.label,
        width: params.width,
        x: params.x,
        y: params.labelY,
    }));
    ctx.elements.push(lineElement(ctx, {
        height: 0,
        locked: true,
        name: `${params.name} write-in line`,
        opacity: 0.72,
        stroke: ctx.borderColor,
        strokeWidth: 3,
        width: params.width,
        x: params.x,
        y: params.lineY,
    }));
    if (params.value) {
        const valueY = params.labelY + Math.round(ctx.canvasHeight * 0.029);
        const availableValueHeight = Math.max(
            24,
            params.lineY - valueY - Math.round(ctx.canvasHeight * 0.006),
        );
        const baseLayoutParams = {
            maxFontSize: Math.round(ctx.canvasWidth * 0.026),
            maxLines: 2,
            minFontSize: Math.round(ctx.canvasWidth * 0.017),
            preferSingleLine: true,
            text: params.value,
            width: params.width,
            widthSafetyFactor: 1.06,
        } as const;
        let valueLayout = layoutCenteredPrintableText(baseLayoutParams);
        if (valueLayout.height > availableValueHeight) {
            valueLayout = layoutCenteredPrintableText({
                ...baseLayoutParams,
                maxFontSize: Math.max(12, Math.floor(availableValueHeight / (2 * 1.08))),
                minFontSize: 12,
            });
        }
        ctx.elements.push(textElement(ctx, {
            align: "center",
            color: ctx.text,
            fontSize: valueLayout.fontSize,
            fontWeight: "600",
            height: valueLayout.height,
            lineHeight: valueLayout.lineHeight,
            name: `${params.name} value`,
            text: valueLayout.text,
            width: params.width,
            x: params.x,
            y: valueY,
        }));
    }
}

function buildPremiumThemedEventInvitation(ctx: BuildContext) {
    addDecor(ctx);
    const invitation = ctx.input.invitationContent;
    const margin = Math.round(ctx.canvasWidth * 0.075);
    const contentWidth = ctx.canvasWidth - margin * 2;
    const stationeryY = Math.round(ctx.canvasHeight * 0.04);
    const stationeryHeight = Math.round(ctx.canvasHeight * 0.92);
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.surface,
        height: stationeryHeight,
        locked: true,
        name: "Invitation stationery field",
        opacity: 0.89,
        radius: Math.round(ctx.canvasWidth * 0.03),
        stroke: ctx.borderColor,
        strokeWidth: 3,
        width: contentWidth,
        x: margin,
        y: stationeryY,
    }));
    ctx.elements.push(imageElement(ctx, {
        fit: "cover",
        height: ctx.canvasHeight,
        locked: true,
        name: "Invitation botanical ornament",
        opacity: 0.92,
        src: getInvitationBotanicalOrnamentDataUri(ctx),
        width: ctx.canvasWidth,
        x: 0,
        y: 0,
    }));
    addInvitationLibraryIconMotif(ctx);

    const businessWidth = Math.round(contentWidth * 0.78);
    const businessNameLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasWidth * 0.036),
        maxLines: 2,
        minFontSize: Math.round(ctx.canvasWidth * 0.024),
        preferSingleLine: true,
        text: ctx.input.storeName,
        width: businessWidth,
        widthSafetyFactor: 1.06,
    });
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.text,
        fontFamily: getThemeDisplayFontFamily(ctx.input.templateFamilyId),
        fontSize: businessNameLayout.fontSize,
        fontWeight: "700",
        height: businessNameLayout.height,
        lineHeight: businessNameLayout.lineHeight,
        name: "Business name",
        text: businessNameLayout.text,
        width: businessWidth,
        x: Math.round((ctx.canvasWidth - businessWidth) / 2),
        y: Math.round(ctx.canvasHeight * 0.155),
    }));

    if (ctx.input.tagline) {
        const taglineWidth = Math.round(contentWidth * 0.66);
        const taglineLayout = layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasWidth * 0.021),
            maxLines: 2,
            minFontSize: Math.round(ctx.canvasWidth * 0.016),
            text: ctx.input.tagline,
            width: taglineWidth,
            widthSafetyFactor: 1.08,
        });
        ctx.elements.push(textElement(ctx, {
            align: "center",
            color: ctx.muted,
            fontSize: taglineLayout.fontSize,
            fontWeight: "600",
            height: taglineLayout.height,
            lineHeight: taglineLayout.lineHeight,
            name: "Business tagline",
            text: taglineLayout.text,
            width: taglineWidth,
            x: Math.round((ctx.canvasWidth - taglineWidth) / 2),
            y: Math.round(ctx.canvasHeight * 0.205),
        }));
    }

    ctx.elements.push(textElement(ctx, {
        align: "center",
        charSpacing: 35,
        color: ctx.accent,
        fontFamily: "Bodoni MT, Didot, Georgia, serif",
        fontSize: Math.round(ctx.canvasWidth * 0.052),
        fontStyle: "italic",
        fontWeight: "700",
        height: Math.round(ctx.canvasHeight * 0.058),
        name: "Invitation purpose",
        text: "You're invited",
        width: Math.round(ctx.canvasWidth * 0.64),
        x: Math.round(ctx.canvasWidth * 0.18),
        y: Math.round(ctx.canvasHeight * 0.272),
    }));

    const occasionWidth = Math.round(ctx.canvasWidth * 0.66);
    addInvitationWriteInField(ctx, {
        label: "OCCASION",
        labelY: Math.round(ctx.canvasHeight * 0.36),
        lineY: Math.round(ctx.canvasHeight * 0.425),
        name: "Invitation occasion",
        width: occasionWidth,
        x: Math.round((ctx.canvasWidth - occasionWidth) / 2),
        value: invitation?.occasion,
    });

    const detailPanelX = Math.round(ctx.canvasWidth * 0.13);
    const detailPanelY = Math.round(ctx.canvasHeight * 0.49);
    const detailPanelWidth = Math.round(ctx.canvasWidth * 0.74);
    const detailPanelHeight = Math.round(ctx.canvasHeight * 0.26);
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.surface,
        height: detailPanelHeight,
        locked: true,
        name: "Invitation write-in panel",
        opacity: 0.76,
        radius: Math.round(ctx.canvasWidth * 0.025),
        stroke: ctx.borderColor,
        strokeWidth: 2,
        width: detailPanelWidth,
        x: detailPanelX,
        y: detailPanelY,
    }));

    const panelPadding = Math.round(ctx.canvasWidth * 0.055);
    const columnGap = Math.round(ctx.canvasWidth * 0.055);
    const columnWidth = Math.round((detailPanelWidth - panelPadding * 2 - columnGap) / 2);
    const leftX = detailPanelX + panelPadding;
    const rightX = leftX + columnWidth + columnGap;
    addInvitationWriteInField(ctx, {
        label: "DATE",
        labelY: detailPanelY + Math.round(ctx.canvasHeight * 0.038),
        lineY: detailPanelY + Math.round(ctx.canvasHeight * 0.095),
        name: "Invitation date",
        width: columnWidth,
        x: leftX,
        value: invitation?.date,
    });
    addInvitationWriteInField(ctx, {
        label: "TIME",
        labelY: detailPanelY + Math.round(ctx.canvasHeight * 0.038),
        lineY: detailPanelY + Math.round(ctx.canvasHeight * 0.095),
        name: "Invitation time",
        width: columnWidth,
        x: rightX,
        value: invitation?.time,
    });

    const fullFieldWidth = detailPanelWidth - panelPadding * 2;
    addInvitationWriteInField(ctx, {
        label: "LOCATION",
        labelY: detailPanelY + Math.round(ctx.canvasHeight * 0.145),
        lineY: detailPanelY + Math.round(ctx.canvasHeight * 0.205),
        name: "Invitation location",
        width: fullFieldWidth,
        x: detailPanelX + panelPadding,
        value: invitation?.location,
    });
}

function buildEventInvitation(ctx: BuildContext) {
    buildPremiumThemedEventInvitation(ctx);
}
function buildPostcard(ctx: BuildContext) {
    buildPremiumThemedPostcard(ctx);
}

function buildPremiumThemedPostcard(ctx: BuildContext) {
    addDecor(ctx);
    const fieldX = Math.round(ctx.canvasWidth * 0.060);
    const fieldY = Math.round(ctx.canvasHeight * 0.070);
    const fieldWidth = ctx.canvasWidth - fieldX * 2;
    const fieldHeight = ctx.canvasHeight - fieldY * 2;
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.surface,
        height: fieldHeight,
        locked: true,
        name: "Postcard stationery field",
        opacity: 0.90,
        radius: Math.round(ctx.canvasHeight * 0.030),
        shadow: { blur: 28, color: "rgba(17,24,39,0.12)", offsetX: 0, offsetY: 10 },
        width: fieldWidth,
        x: fieldX,
        y: fieldY,
    }));

    const messageX = fieldX + Math.round(fieldWidth * 0.055);
    const messageWidth = Math.round(fieldWidth * 0.49);
    const brandMarkSize = Math.round(ctx.canvasHeight * 0.090);
    const brandMarkY = fieldY + Math.round(fieldHeight * 0.045);
    const identityCenterX = messageX + Math.round(messageWidth / 2);
    addBrandMark(ctx, identityCenterX, brandMarkY, brandMarkSize, "center");

    const identityX = messageX;
    const identityWidth = messageWidth;
    const businessNameLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasHeight * 0.047),
        maxLines: 2,
        minFontSize: Math.round(ctx.canvasHeight * 0.030),
        preferSingleLine: true,
        text: ctx.input.storeName,
        width: identityWidth,
        widthSafetyFactor: 1.08,
    });
    const businessNameY = brandMarkY + brandMarkSize + Math.round(ctx.canvasHeight * 0.014);
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.text,
        fontFamily: getThemeDisplayFontFamily(ctx.input.templateFamilyId),
        fontSize: businessNameLayout.fontSize,
        fontWeight: "800",
        height: businessNameLayout.height,
        lineHeight: businessNameLayout.lineHeight,
        name: "Business name",
        text: businessNameLayout.text,
        width: identityWidth,
        x: identityX,
        y: businessNameY,
    }));
    let identityBottom = businessNameY + businessNameLayout.height;
    if (ctx.input.tagline) {
        const taglineLayout = layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasHeight * 0.022),
            maxLines: 2,
            minFontSize: Math.round(ctx.canvasHeight * 0.016),
            preferSingleLine: true,
            text: ctx.input.tagline,
            width: identityWidth,
            widthSafetyFactor: 1.10,
        });
        const taglineY = identityBottom + Math.round(ctx.canvasHeight * 0.006);
        ctx.elements.push(textElement(ctx, {
            align: "center",
            color: ctx.muted,
            fontSize: taglineLayout.fontSize,
            fontWeight: "600",
            height: taglineLayout.height,
            lineHeight: taglineLayout.lineHeight,
            name: "Business tagline",
            text: taglineLayout.text,
            width: identityWidth,
            x: identityX,
            y: taglineY,
        }));
        identityBottom = taglineY + taglineLayout.height;
    }

    const dividerY = Math.max(
        fieldY + Math.round(fieldHeight * 0.30),
        identityBottom + Math.round(ctx.canvasHeight * 0.020),
    );
    const dividerWidth = Math.round(messageWidth * 0.27);
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.accent,
        height: Math.max(3, Math.round(ctx.canvasHeight * 0.004)),
        locked: true,
        name: "Postcard editorial rule",
        opacity: 0.86,
        radius: 3,
        width: dividerWidth,
        x: messageX + Math.round((messageWidth - dividerWidth) / 2),
        y: dividerY,
    }));

    const centerFlowerWidth = Math.round(ctx.canvasWidth * 0.064);
    const centerFlowerHeight = Math.round(centerFlowerWidth * (199 / 138));
    const sideFlowerWidth = Math.round(ctx.canvasWidth * 0.048);
    const sideFlowerHeight = Math.round(sideFlowerWidth * (199 / 138));
    const flowerGap = Math.round(ctx.canvasWidth * 0.014);
    const flowerRowWidth = sideFlowerWidth * 2 + centerFlowerWidth + flowerGap * 2;
    const flowerRowX = messageX + Math.round((messageWidth - flowerRowWidth) / 2);
    const flowerRowBottom = fieldY + fieldHeight - Math.round(ctx.canvasHeight * 0.026);
    [
        {
            height: sideFlowerHeight,
            name: "Postcard appreciation flower left",
            opacity: 0.32,
            rotation: -10,
            width: sideFlowerWidth,
            x: flowerRowX,
        },
        {
            height: centerFlowerHeight,
            name: "Postcard appreciation flower center",
            opacity: 0.42,
            rotation: 0,
            width: centerFlowerWidth,
            x: flowerRowX + sideFlowerWidth + flowerGap,
        },
        {
            height: sideFlowerHeight,
            name: "Postcard appreciation flower right",
            opacity: 0.32,
            rotation: 10,
            width: sideFlowerWidth,
            x: flowerRowX + sideFlowerWidth + centerFlowerWidth + flowerGap * 2,
        },
    ].forEach((flower) => {
        ctx.elements.push(imageElement(ctx, {
            alt: "Hand-drawn appreciation flower",
            fit: "contain",
            height: flower.height,
            locked: true,
            name: flower.name,
            opacity: flower.opacity,
            rotation: flower.rotation,
            src: getPrintableLibraryIconDataUri("koboyo-flower", ctx.accent),
            width: flower.width,
            x: flower.x,
            y: flowerRowBottom - flower.height,
        }));
    });

    const ownerContent = ctx.input.postcardContent;
    if (ownerContent) {
        const headlineLayout = layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasHeight * 0.071),
            maxLines: 2,
            minFontSize: Math.round(ctx.canvasHeight * 0.040),
            preferSingleLine: false,
            text: ownerContent.headline,
            width: messageWidth,
            widthSafetyFactor: 1.10,
        });
        const headlineY = dividerY + Math.round(ctx.canvasHeight * 0.050);
        ctx.elements.push(textElement(ctx, {
            align: "left",
            color: ctx.accent,
            fontFamily: getThemeDisplayFontFamily(ctx.input.templateFamilyId),
            fontSize: headlineLayout.fontSize,
            fontWeight: "900",
            height: headlineLayout.height,
            lineHeight: headlineLayout.lineHeight,
            name: "Postcard headline",
            text: headlineLayout.text,
            width: messageWidth,
            x: messageX,
            y: headlineY,
        }));

        if (ownerContent.message) {
            const messageLayout = layoutCenteredPrintableText({
                maxFontSize: Math.round(ctx.canvasHeight * 0.029),
                maxLines: 4,
                minFontSize: Math.round(ctx.canvasHeight * 0.021),
                preferSingleLine: false,
                text: ownerContent.message,
                width: messageWidth,
                widthSafetyFactor: 1.08,
            });
            ctx.elements.push(textElement(ctx, {
                align: "left",
                color: ctx.text,
                fontSize: messageLayout.fontSize,
                fontWeight: "600",
                height: messageLayout.height,
                lineHeight: 1.24,
                name: "Postcard message",
                text: messageLayout.text,
                width: messageWidth,
                x: messageX,
                y: headlineY + headlineLayout.height + Math.round(ctx.canvasHeight * 0.045),
            }));
        }
    }

    const utilityWidth = Math.round(fieldWidth * 0.34);
    const utilityHeight = Math.round(fieldHeight * 0.72);
    const utilityX = fieldX + fieldWidth - utilityWidth - Math.round(fieldWidth * 0.050);
    const utilityY = fieldY + Math.round(fieldHeight * 0.15);
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.backgroundColor,
        height: utilityHeight,
        locked: true,
        name: "Postcard action panel",
        opacity: 0.80,
        radius: Math.round(ctx.canvasHeight * 0.028),
        stroke: ctx.borderColor,
        strokeWidth: 2,
        width: utilityWidth,
        x: utilityX,
        y: utilityY,
    }));

    const ctaWidth = utilityWidth - Math.round(ctx.canvasWidth * 0.050);
    const ctaText = ctx.labels.scanToViewCompactUpper.replace(/^SCAN TO /, "");
    const ctaLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasHeight * 0.030),
        maxLines: 2,
        minFontSize: Math.round(ctx.canvasHeight * 0.021),
        preferSingleLine: true,
        text: ctaText,
        width: ctaWidth,
        widthSafetyFactor: 1.08,
    });
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accent,
        fontSize: ctaLayout.fontSize,
        fontWeight: "900",
        height: ctaLayout.height,
        lineHeight: ctaLayout.lineHeight,
        name: "Postcard call to action",
        text: ctaLayout.text,
        width: ctaWidth,
        x: utilityX + Math.round((utilityWidth - ctaWidth) / 2),
        y: utilityY + Math.round(ctx.canvasHeight * 0.055),
    }));

    const qrSize = Math.round(ctx.canvasHeight * 0.270);
    const qrX = utilityX + Math.round((utilityWidth - qrSize) / 2);
    const qrY = utilityY + Math.round(ctx.canvasHeight * 0.175);
    addQrPanel(ctx, qrX, qrY, qrSize, 0, { compact: true, padding: 12 });

    const displayHost = getPrintableAssetDisplayHost(ctx.input);
    const hostWidth = utilityWidth - Math.round(ctx.canvasWidth * 0.045);
    const hostLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasHeight * 0.021),
        maxLines: 2,
        minFontSize: Math.round(ctx.canvasHeight * 0.015),
        preferSingleLine: true,
        text: displayHost,
        width: hostWidth,
        widthSafetyFactor: 1.10,
    });
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.muted,
        fontSize: hostLayout.fontSize,
        fontWeight: "700",
        height: hostLayout.height + Math.round(hostLayout.fontSize * 0.35),
        lineHeight: hostLayout.lineHeight,
        locked: true,
        name: "Short link",
        sourceRefs: [{
            label: "Short link",
            locked: true,
            productId: "menulist",
            value: displayHost,
        }],
        text: hostLayout.text,
        width: hostWidth,
        x: utilityX + Math.round((utilityWidth - hostWidth) / 2),
        y: utilityY + utilityHeight - Math.round(ctx.canvasHeight * 0.090),
    }));
}

function buildPremiumThemedProductTag(ctx: BuildContext) {
    addDecor(ctx);
    const fieldX = Math.round(ctx.canvasWidth * 0.045);
    const fieldY = Math.round(ctx.canvasHeight * 0.065);
    const fieldWidth = ctx.canvasWidth - fieldX * 2;
    const fieldHeight = ctx.canvasHeight - fieldY * 2;
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.surface,
        height: fieldHeight,
        locked: true,
        name: "Product tag stationery field",
        opacity: 0.90,
        radius: Math.round(ctx.canvasHeight * 0.032),
        shadow: { blur: 24, color: "rgba(17,24,39,0.12)", offsetX: 0, offsetY: 8 },
        width: fieldWidth,
        x: fieldX,
        y: fieldY,
    }));

    const contentX = fieldX + Math.round(fieldWidth * 0.050);
    const contentY = fieldY + Math.round(fieldHeight * 0.070);
    const contentWidth = Math.round(fieldWidth * 0.555);
    const utilityX = fieldX + Math.round(fieldWidth * 0.665);
    const utilityY = fieldY + Math.round(fieldHeight * 0.075);
    const utilityWidth = fieldX + fieldWidth - utilityX - Math.round(fieldWidth * 0.045);
    const utilityHeight = fieldHeight - Math.round(fieldHeight * 0.150);

    ctx.elements.push(rectElement(ctx, {
        fill: ctx.backgroundColor,
        height: utilityHeight,
        locked: true,
        name: "Product tag action panel",
        opacity: 0.78,
        radius: Math.round(ctx.canvasHeight * 0.030),
        width: utilityWidth,
        x: utilityX,
        y: utilityY,
    }));
    ctx.elements.push(rectElement(ctx, {
        fill: ctx.accent,
        height: Math.round(utilityHeight * 0.72),
        locked: true,
        name: "Product tag editorial divider",
        opacity: 0.74,
        radius: 2,
        width: 3,
        x: utilityX - Math.round(ctx.canvasWidth * 0.027),
        y: utilityY + Math.round(utilityHeight * 0.14),
    }));

    const markSize = Math.round(ctx.canvasHeight * 0.105);
    addBrandMark(ctx, contentX, contentY, markSize);
    const identityX = contentX + markSize + Math.round(ctx.canvasWidth * 0.020);
    const identityWidth = contentWidth - markSize - Math.round(ctx.canvasWidth * 0.020);
    const businessNameLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasHeight * 0.056),
        maxLines: 2,
        minFontSize: Math.round(ctx.canvasHeight * 0.038),
        preferSingleLine: true,
        text: ctx.input.storeName,
        width: identityWidth,
        widthSafetyFactor: 1.08,
    });
    ctx.elements.push(textElement(ctx, {
        align: "left",
        color: ctx.text,
        fontFamily: getThemeDisplayFontFamily(ctx.input.templateFamilyId),
        fontSize: businessNameLayout.fontSize,
        fontWeight: "800",
        height: businessNameLayout.height,
        lineHeight: businessNameLayout.lineHeight,
        name: "Business name",
        text: businessNameLayout.text,
        width: identityWidth,
        x: identityX,
        y: contentY + Math.round(markSize * 0.06),
    }));

    let identityBottom = contentY + Math.max(markSize, businessNameLayout.height);
    if (ctx.input.tagline) {
        const taglineLayout = layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasHeight * 0.038),
            maxLines: 2,
            minFontSize: Math.round(ctx.canvasHeight * 0.030),
            preferSingleLine: true,
            text: ctx.input.tagline,
            width: identityWidth,
            widthSafetyFactor: 1.08,
        });
        const taglineY = Math.max(
            contentY + Math.round(markSize * 0.58),
            contentY + businessNameLayout.height + Math.round(ctx.canvasHeight * 0.008),
        );
        ctx.elements.push(textElement(ctx, {
            align: "left",
            color: ctx.muted,
            fontSize: taglineLayout.fontSize,
            fontWeight: "600",
            height: taglineLayout.height,
            lineHeight: taglineLayout.lineHeight,
            name: "Business tagline",
            text: taglineLayout.text,
            width: identityWidth,
            x: identityX,
            y: taglineY,
        }));
        identityBottom = Math.max(identityBottom, taglineY + taglineLayout.height);
    }

    const ownerContent = ctx.input.productTagContent;
    if (ownerContent) {
        const productNameLayout = layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasHeight * 0.090),
            maxLines: 2,
            minFontSize: Math.round(ctx.canvasHeight * 0.054),
            preferSingleLine: true,
            text: ownerContent.name,
            width: contentWidth,
            widthSafetyFactor: 1.10,
        });
        const productNameY = Math.max(
            fieldY + Math.round(fieldHeight * 0.39),
            identityBottom + Math.round(ctx.canvasHeight * 0.045),
        );
        ctx.elements.push(textElement(ctx, {
            align: "left",
            color: ctx.accent,
            fontFamily: getThemeDisplayFontFamily(ctx.input.templateFamilyId),
            fontSize: productNameLayout.fontSize,
            fontWeight: "900",
            height: productNameLayout.height,
            lineHeight: productNameLayout.lineHeight,
            name: "Product name",
            text: productNameLayout.text,
            width: contentWidth,
            x: contentX,
            y: productNameY,
        }));
        let productBottom = productNameY + productNameLayout.height;
        if (ownerContent.detail) {
            const detailLayout = layoutCenteredPrintableText({
                maxFontSize: Math.round(ctx.canvasHeight * 0.041),
                maxLines: 2,
                minFontSize: Math.round(ctx.canvasHeight * 0.030),
                preferSingleLine: true,
                text: ownerContent.detail,
                width: contentWidth,
                widthSafetyFactor: 1.08,
            });
            const detailY = productBottom + Math.round(ctx.canvasHeight * 0.025);
            ctx.elements.push(textElement(ctx, {
                align: "left",
                color: ctx.text,
                fontSize: detailLayout.fontSize,
                fontWeight: "600",
                height: detailLayout.height,
                lineHeight: detailLayout.lineHeight,
                name: "Product detail",
                text: detailLayout.text,
                width: contentWidth,
                x: contentX,
                y: detailY,
            }));
            productBottom = detailY + detailLayout.height;
        }
        if (ownerContent.options && ownerContent.options.length > 0) {
            const visibleOptions = ownerContent.options.slice(0, 3);
            const optionSummary = [
                ...visibleOptions.map((option) => (
                    option.priceLabel ? `${option.name} ${option.priceLabel}` : option.name
                )),
                ...(ownerContent.options.length > visibleOptions.length
                    ? [`${ownerContent.options.length - visibleOptions.length} more`]
                    : []),
            ].join(' · ');
            const optionsLayout = layoutCenteredPrintableText({
                maxFontSize: Math.round(ctx.canvasHeight * 0.034),
                maxLines: 3,
                minFontSize: Math.round(ctx.canvasHeight * 0.025),
                preferSingleLine: true,
                text: `Options: ${optionSummary}`,
                width: contentWidth,
                widthSafetyFactor: 1.08,
            });
            const optionsY = productBottom + Math.round(ctx.canvasHeight * 0.022);
            ctx.elements.push(textElement(ctx, {
                align: "left",
                color: ctx.muted,
                fontSize: optionsLayout.fontSize,
                fontWeight: "600",
                height: optionsLayout.height,
                lineHeight: optionsLayout.lineHeight,
                name: "Product options",
                text: optionsLayout.text,
                width: contentWidth,
                x: contentX,
                y: optionsY,
            }));
            productBottom = optionsY + optionsLayout.height;
        }
        if (ownerContent.price) {
            const priceLayout = layoutCenteredPrintableText({
                maxFontSize: Math.round(ctx.canvasHeight * 0.060),
                maxLines: 1,
                minFontSize: Math.round(ctx.canvasHeight * 0.042),
                preferSingleLine: true,
                text: ownerContent.price,
                width: contentWidth,
                widthSafetyFactor: 1.05,
            });
            ctx.elements.push(textElement(ctx, {
                align: "left",
                color: ctx.text,
                fontSize: priceLayout.fontSize,
                fontWeight: "800",
                height: priceLayout.height,
                lineHeight: priceLayout.lineHeight,
                name: "Product price",
                text: priceLayout.text,
                width: contentWidth,
                x: contentX,
                y: Math.min(
                    fieldY + fieldHeight - priceLayout.height - Math.round(ctx.canvasHeight * 0.045),
                    productBottom + Math.round(ctx.canvasHeight * 0.025),
                ),
            }));
        }
    }

    // Product Tags always open one exact item rather than a general menu or
    // service catalogue, so the action must remain truthful across every
    // business category.
    const ctaText = "VIEW DETAILS";
    const ctaWidth = utilityWidth - Math.round(ctx.canvasWidth * 0.040);
    const ctaLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasHeight * 0.043),
        maxLines: 2,
        minFontSize: Math.round(ctx.canvasHeight * 0.032),
        preferSingleLine: true,
        text: ctaText,
        width: ctaWidth,
        widthSafetyFactor: 1.08,
    });
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accent,
        fontSize: ctaLayout.fontSize,
        fontWeight: "900",
        height: ctaLayout.height,
        lineHeight: ctaLayout.lineHeight,
        name: "Product tag call to action",
        text: ctaLayout.text,
        width: ctaWidth,
        x: utilityX + Math.round((utilityWidth - ctaWidth) / 2),
        y: utilityY + Math.round(utilityHeight * 0.055),
    }));

    const qrSize = Math.round(ctx.canvasHeight * 0.285);
    const qrX = utilityX + Math.round((utilityWidth - qrSize) / 2);
    const qrY = utilityY + Math.round(utilityHeight * 0.24);
    addQrPanel(ctx, qrX, qrY, qrSize, 0, { compact: true, padding: 12 });

    const displayHost = getPrintableAssetDisplayHost(ctx.input);
    const hostWidth = utilityWidth - Math.round(ctx.canvasWidth * 0.036);
    const hostLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasHeight * 0.038),
        maxLines: 2,
        minFontSize: Math.round(ctx.canvasHeight * 0.030),
        preferSingleLine: true,
        text: displayHost,
        width: hostWidth,
        widthSafetyFactor: 1.10,
    });
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.muted,
        fontSize: hostLayout.fontSize,
        fontWeight: "700",
        height: hostLayout.height + Math.round(hostLayout.fontSize * 0.30),
        lineHeight: hostLayout.lineHeight,
        locked: true,
        name: "Short link",
        sourceRefs: [{
            label: "Short link",
            locked: true,
            productId: "menulist",
            value: displayHost,
        }],
        text: hostLayout.text,
        width: hostWidth,
        x: utilityX + Math.round((utilityWidth - hostWidth) / 2),
        y: utilityY + utilityHeight - hostLayout.height - Math.round(ctx.canvasHeight * 0.052),
    }));
}

function buildProductTag(ctx: BuildContext) {
    buildPremiumThemedProductTag(ctx);
}

function buildPremiumCampaignPoster(ctx: BuildContext) {
    addDecor(ctx);
    const contentInset = Math.round(ctx.canvasWidth * 0.10);
    const contentWidth = ctx.canvasWidth - contentInset * 2;
    const centerX = ctx.canvasWidth / 2;
    const campaign = ctx.input.campaignContent || ctx.input.flyerCampaign;
    const displayHost = getPrintableAssetDisplayHost(ctx.input);
    const displayFontFamily = getThemeDisplayFontFamily(ctx.input.templateFamilyId);
    const businessNameLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasWidth * 0.048),
        minFontSize: Math.round(ctx.canvasWidth * 0.036),
        preferSingleLine: true,
        text: truncateForLayer(ctx.input.storeName, 48),
        width: contentWidth,
        widthSafetyFactor: displayFontFamily === "Georgia, serif" ? 1.12 : 1.04,
    });
    const tagline = truncateForLayer(ctx.input.tagline, 76);
    const taglineLayout = tagline
        ? layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasWidth * 0.029),
            minFontSize: Math.round(ctx.canvasWidth * 0.022),
            preferSingleLine: true,
            text: tagline,
            width: Math.round(ctx.canvasWidth * 0.70),
            widthSafetyFactor: 1.04,
        })
        : null;
    const hasOffer = Boolean(campaign?.offer);
    const campaignHeadlineLayout = campaign
        ? layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasWidth * (hasOffer ? 0.048 : 0.088)),
            minFontSize: Math.round(ctx.canvasWidth * (hasOffer ? 0.034 : 0.052)),
            preferSingleLine: true,
            text: campaign.headline,
            width: Math.round(ctx.canvasWidth * 0.76),
            widthSafetyFactor: hasOffer ? 1.04 : 1.10,
        })
        : null;
    const campaignOfferLayout = campaign?.offer
        ? layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasWidth * 0.090),
            minFontSize: Math.round(ctx.canvasWidth * 0.044),
            preferSingleLine: true,
            text: campaign.offer,
            width: Math.round(ctx.canvasWidth * 0.84),
            widthSafetyFactor: displayFontFamily === "Georgia, serif" ? 1.12 : 1.06,
        })
        : null;
    const campaignDetailsLayout = campaign?.details
        ? layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasWidth * 0.028),
            minFontSize: Math.round(ctx.canvasWidth * 0.021),
            preferSingleLine: true,
            text: campaign.details,
            width: Math.round(ctx.canvasWidth * 0.68),
            widthSafetyFactor: 1.04,
        })
        : null;
    const campaignValidityLayout = campaign?.validUntil
        ? layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasWidth * 0.023),
            minFontSize: Math.round(ctx.canvasWidth * 0.018),
            preferSingleLine: true,
            text: campaign.validUntil,
            width: Math.round(ctx.canvasWidth * 0.62),
            widthSafetyFactor: 1.04,
        })
        : null;
    const campaignTermsLayout = campaign?.terms
        ? layoutCenteredPrintableText({
            maxFontSize: Math.round(ctx.canvasWidth * 0.019),
            minFontSize: Math.round(ctx.canvasWidth * 0.015),
            preferSingleLine: true,
            text: campaign.terms,
            width: Math.round(ctx.canvasWidth * 0.62),
            widthSafetyFactor: 1.04,
        })
        : null;
    const ctaWidth = Math.round(ctx.canvasWidth * 0.50);
    const ctaLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasWidth * 0.045),
        minFontSize: Math.round(ctx.canvasWidth * 0.027),
        preferSingleLine: true,
        text: ctx.labels.scanToViewCompactUpper,
        width: ctaWidth,
        widthSafetyFactor: 1.04,
    });
    const hostWidth = Math.round(ctx.canvasWidth * 0.50);
    const hostLayout = layoutCenteredPrintableText({
        maxFontSize: Math.round(ctx.canvasWidth * 0.023),
        minFontSize: Math.round(ctx.canvasWidth * 0.017),
        preferSingleLine: true,
        text: truncateForLayer(displayHost, 58),
        width: hostWidth,
        widthSafetyFactor: 1.04,
    });

    const markSize = Math.round(ctx.canvasWidth * 0.095);
    const businessNameY = Math.round(ctx.canvasHeight * 0.165);
    const taglineY = businessNameY + businessNameLayout.height + Math.round(ctx.canvasHeight * 0.020);
    const identityBottom = taglineLayout
        ? taglineY + taglineLayout.height
        : businessNameY + businessNameLayout.height;
    const identityRuleY = identityBottom + Math.round(ctx.canvasHeight * 0.040);
    const campaignHeadlineY = Math.max(
        Math.round(ctx.canvasHeight * 0.345),
        identityRuleY + Math.round(ctx.canvasHeight * 0.040),
    );
    const campaignOfferY = campaignHeadlineY
        + (campaignHeadlineLayout?.height || 0)
        + Math.round(ctx.canvasHeight * (campaignOfferLayout ? 0.020 : 0));
    const campaignDetailsY = campaignOfferY
        + (campaignOfferLayout?.height || 0)
        + Math.round(ctx.canvasHeight * (campaignDetailsLayout ? 0.024 : 0));
    const campaignValidityY = campaignDetailsY
        + (campaignDetailsLayout?.height || 0)
        + Math.round(ctx.canvasHeight * (campaignValidityLayout ? 0.026 : 0));
    const campaignTermsY = campaignValidityY
        + (campaignValidityLayout?.height || 0)
        + Math.round(ctx.canvasHeight * (campaignTermsLayout ? 0.012 : 0));
    const campaignContentBottom = campaignTermsLayout
        ? campaignTermsY + campaignTermsLayout.height
        : campaignValidityLayout
            ? campaignValidityY + campaignValidityLayout.height
            : campaignDetailsLayout
                ? campaignDetailsY + campaignDetailsLayout.height
                : campaignOfferLayout
                    ? campaignOfferY + campaignOfferLayout.height
                    : campaignHeadlineLayout
                        ? campaignHeadlineY + campaignHeadlineLayout.height
                        : identityRuleY;

    const actionPanelWidth = Math.round(ctx.canvasWidth * 0.60);
    const actionPanelX = Math.round((ctx.canvasWidth - actionPanelWidth) / 2);
    const actionPanelHeight = Math.round(ctx.canvasHeight * 0.292);
    const actionPanelY = Math.min(
        Math.max(
            Math.round(ctx.canvasHeight * 0.600),
            campaignContentBottom + Math.round(ctx.canvasHeight * 0.035),
        ),
        ctx.canvasHeight - actionPanelHeight - Math.round(ctx.canvasHeight * 0.005),
    );
    const qrSize = Math.ceil(Math.round(ctx.canvasWidth * 0.260) / 2) * 2;
    const qrPadding = 24;
    const qrPanelSize = qrSize + qrPadding * 2;
    const qrPanelX = Math.round((ctx.canvasWidth - qrPanelSize) / 2);
    const ctaX = Math.round((ctx.canvasWidth - ctaWidth) / 2);
    const ctaY = actionPanelY + Math.round(ctx.canvasHeight * 0.018);
    const qrPanelY = ctaY + ctaLayout.height + Math.round(ctx.canvasHeight * 0.012);
    const hostY = qrPanelY + qrPanelSize + Math.round(ctx.canvasHeight * 0.010);

    addBrandMark(ctx, centerX, Math.round(ctx.canvasHeight * 0.070), markSize, "center");
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.text,
        fontFamily: displayFontFamily,
        fontSize: businessNameLayout.fontSize,
        fontWeight: "700",
        height: businessNameLayout.height,
        lineHeight: businessNameLayout.lineHeight,
        name: "Business name",
        text: businessNameLayout.text,
        width: contentWidth,
        x: contentInset,
        y: businessNameY,
    }));
    if (taglineLayout) {
        ctx.elements.push(textElement(ctx, {
            align: "center",
            color: ctx.muted,
            fontSize: taglineLayout.fontSize,
            fontWeight: "600",
            height: taglineLayout.height,
            lineHeight: taglineLayout.lineHeight,
            name: "Business tagline",
            text: taglineLayout.text,
            width: Math.round(ctx.canvasWidth * 0.70),
            x: Math.round(ctx.canvasWidth * 0.15),
            y: taglineY,
        }));
    }
    ctx.elements.push(lineElement(ctx, {
        height: 0,
        name: "Campaign poster identity rule",
        opacity: 0.70,
        stroke: ctx.accent,
        strokeWidth: 3,
        width: Math.round(ctx.canvasWidth * 0.18),
        x: Math.round(ctx.canvasWidth * 0.41),
        y: identityRuleY,
    }));

    if (campaignHeadlineLayout) {
        const headlineWidth = Math.round(ctx.canvasWidth * 0.76);
        if (campaignHeadlineLayout.lineCount === 1) {
            const headlineRuleY = campaignHeadlineY + Math.round(campaignHeadlineLayout.height * 0.54);
            ctx.elements.push(lineElement(ctx, {
                height: 0,
                name: "Campaign poster headline rule left",
                opacity: 0.58,
                stroke: ctx.accent,
                strokeWidth: 2,
                width: Math.round(ctx.canvasWidth * 0.10),
                x: Math.round(ctx.canvasWidth * 0.12),
                y: headlineRuleY,
            }));
            ctx.elements.push(lineElement(ctx, {
                height: 0,
                name: "Campaign poster headline rule right",
                opacity: 0.58,
                stroke: ctx.accent,
                strokeWidth: 2,
                width: Math.round(ctx.canvasWidth * 0.10),
                x: Math.round(ctx.canvasWidth * 0.78),
                y: headlineRuleY,
            }));
        }
        ctx.elements.push(textElement(ctx, {
            align: "center",
            color: ctx.accent,
            fontFamily: hasOffer ? undefined : displayFontFamily,
            fontSize: campaignHeadlineLayout.fontSize,
            fontWeight: "800",
            height: campaignHeadlineLayout.height,
            lineHeight: campaignHeadlineLayout.lineHeight,
            name: "Campaign headline",
            text: campaignHeadlineLayout.text,
            width: headlineWidth,
            x: Math.round((ctx.canvasWidth - headlineWidth) / 2),
            y: campaignHeadlineY,
        }));
    }
    if (campaignOfferLayout) {
        const offerWidth = Math.round(ctx.canvasWidth * 0.84);
        ctx.elements.push(textElement(ctx, {
            align: "center",
            color: ctx.text,
            fontFamily: displayFontFamily,
            fontSize: campaignOfferLayout.fontSize,
            fontWeight: "900",
            height: campaignOfferLayout.height,
            lineHeight: campaignOfferLayout.lineHeight,
            name: "Campaign offer",
            text: campaignOfferLayout.text,
            width: offerWidth,
            x: Math.round((ctx.canvasWidth - offerWidth) / 2),
            y: campaignOfferY,
        }));
    }
    if (campaignDetailsLayout) {
        const detailsWidth = Math.round(ctx.canvasWidth * 0.68);
        ctx.elements.push(textElement(ctx, {
            align: "center",
            color: ctx.muted,
            fontSize: campaignDetailsLayout.fontSize,
            fontWeight: "600",
            height: campaignDetailsLayout.height,
            lineHeight: campaignDetailsLayout.lineHeight,
            name: "Campaign details",
            text: campaignDetailsLayout.text,
            width: detailsWidth,
            x: Math.round((ctx.canvasWidth - detailsWidth) / 2),
            y: campaignDetailsY,
        }));
    }
    if (campaignValidityLayout) {
        const validityWidth = Math.round(ctx.canvasWidth * 0.62);
        ctx.elements.push(textElement(ctx, {
            align: "center",
            color: ctx.accent,
            fontSize: campaignValidityLayout.fontSize,
            fontWeight: "800",
            height: campaignValidityLayout.height,
            lineHeight: campaignValidityLayout.lineHeight,
            name: "Campaign validity",
            text: campaignValidityLayout.text,
            width: validityWidth,
            x: Math.round((ctx.canvasWidth - validityWidth) / 2),
            y: campaignValidityY,
        }));
    }
    if (campaignTermsLayout) {
        const termsWidth = Math.round(ctx.canvasWidth * 0.62);
        ctx.elements.push(textElement(ctx, {
            align: "center",
            color: ctx.muted,
            fontSize: campaignTermsLayout.fontSize,
            fontWeight: "400",
            height: campaignTermsLayout.height,
            lineHeight: campaignTermsLayout.lineHeight,
            name: "Campaign terms",
            text: campaignTermsLayout.text,
            width: termsWidth,
            x: Math.round((ctx.canvasWidth - termsWidth) / 2),
            y: campaignTermsY,
        }));
    }

    ctx.elements.push(rectElement(ctx, {
        fill: ctx.surface,
        height: actionPanelHeight,
        name: "Campaign poster scan ticket",
        opacity: 0,
        radius: 0,
        stroke: "transparent",
        strokeWidth: 0,
        width: actionPanelWidth,
        x: actionPanelX,
        y: actionPanelY,
    }));
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.accent,
        fontSize: ctaLayout.fontSize,
        fontWeight: "900",
        height: ctaLayout.height,
        lineHeight: ctaLayout.lineHeight,
        name: "Call to action",
        text: ctaLayout.text,
        width: ctaWidth,
        x: ctaX,
        y: ctaY,
    }));
    addQrPanel(ctx, qrPanelX + qrPadding, qrPanelY + qrPadding, qrSize, 0, { compact: true, padding: qrPadding });
    ctx.elements.push(textElement(ctx, {
        align: "center",
        color: ctx.muted,
        fontSize: hostLayout.fontSize,
        fontWeight: "700",
        height: hostLayout.height,
        lineHeight: hostLayout.lineHeight,
        locked: true,
        name: "Short link",
        sourceRefs: [{
            label: "Short link",
            locked: true,
            productId: "menulist",
            value: displayHost,
        }],
        text: hostLayout.text,
        width: hostWidth,
        x: Math.round((ctx.canvasWidth - hostWidth) / 2),
        y: hostY,
    }));
}

function buildCampaignPoster(ctx: BuildContext) {
    buildPremiumCampaignPoster(ctx);
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
