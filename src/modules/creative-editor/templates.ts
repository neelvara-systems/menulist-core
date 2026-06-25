import {
    CREATIVE_EDITOR_SCHEMA_VERSION,
    CreativeEditorDocument,
    CreativeEditorElement,
    CreativeEditorPoint,
    CreativeEditorProductContext,
} from "./types";

const DEFAULT_PRIMARY = "#24564d";

const nowIso = () => new Date().toISOString();

export const buildCreativeEditorId = (prefix = "cedoc") => (
    `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
);

const textElement = (params: Partial<Extract<CreativeEditorElement, { type: "text" }>>): Extract<CreativeEditorElement, { type: "text" }> => ({
    align: "left",
    color: "#16231f",
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: 54,
    fontWeight: "800",
    height: 160,
    id: buildCreativeEditorId("layer"),
    lineHeight: 1.08,
    name: "Headline",
    opacity: 1,
    text: "Weekend offer",
    type: "text",
    visible: true,
    width: 760,
    x: 90,
    y: 120,
    ...params,
});

const rectElement = (params: Partial<Extract<CreativeEditorElement, { type: "rect" }>>): Extract<CreativeEditorElement, { type: "rect" }> => ({
    fill: "#f6d365",
    height: 170,
    id: buildCreativeEditorId("layer"),
    name: "Accent block",
    opacity: 1,
    radius: 28,
    stroke: "transparent",
    strokeStyle: "solid",
    strokeWidth: 0,
    type: "rect",
    visible: true,
    width: 320,
    x: 90,
    y: 760,
    ...params,
});

const qrElement = (params: Partial<Extract<CreativeEditorElement, { type: "qr" }>>): Extract<CreativeEditorElement, { type: "qr" }> => ({
    darkColor: "#16231f",
    errorCorrectionLevel: "H",
    height: 164,
    id: buildCreativeEditorId("layer"),
    lightColor: "#ffffff",
    margin: 4,
    name: "QR code",
    opacity: 1,
    type: "qr",
    value: "https://example.com",
    visible: true,
    width: 164,
    x: 826,
    y: 826,
    ...params,
});

export type CreativeEditorStarterTemplateId = "square-post" | "story" | "wide-banner" | "poster";

export const CREATIVE_EDITOR_STARTER_TEMPLATES: Array<{
    description: string;
    height: number;
    id: CreativeEditorStarterTemplateId;
    label: string;
    width: number;
}> = [
    { id: "square-post", label: "Square", description: "Social feed", width: 1080, height: 1080 },
    { id: "story", label: "Story", description: "Vertical story", width: 1080, height: 1920 },
    { id: "wide-banner", label: "Banner", description: "Website cover", width: 1600, height: 900 },
    { id: "poster", label: "Poster", description: "Print poster", width: 1240, height: 1754 },
];

export function createCreativeEditorDocument(params: {
    backgroundColor?: string;
    brandName?: string;
    elements?: CreativeEditorElement[];
    height?: number;
    primaryColor?: string;
    productContext: CreativeEditorProductContext;
    title?: string;
    width?: number;
}): CreativeEditorDocument {
    const createdAt = nowIso();
    const primaryColor = params.primaryColor || DEFAULT_PRIMARY;
    return {
        canvas: {
            backgroundColor: params.backgroundColor || "#fffdfa",
            height: params.height || 1080,
            width: params.width || 1080,
        },
        elements: params.elements ?? [],
        id: buildCreativeEditorId(),
        metadata: {
            brand: {
                accentColor: "#f6d365",
                fontFamily: "Inter, Arial, sans-serif",
                name: params.brandName,
                primaryColor,
                secondaryColor: "#16231f",
            },
            createdAt,
            templateId: "blank",
            textPlaceholders: [
                ...(params.brandName ? [{
                    id: "brand-name",
                    label: "Business name",
                    value: params.brandName,
                }] : []),
                {
                    id: "offer",
                    label: "Offer",
                    value: "Weekend offer",
                },
                {
                    id: "cta",
                    label: "Call to action",
                    value: "Order now",
                },
            ],
            updatedAt: createdAt,
        },
        productContext: params.productContext,
        schemaVersion: CREATIVE_EDITOR_SCHEMA_VERSION,
        title: params.title || "Untitled asset",
    };
}

export function createCreativeEditorStarterDocument(params: {
    brandName?: string;
    primaryColor?: string;
    productContext: CreativeEditorProductContext;
    templateId: CreativeEditorStarterTemplateId;
    title?: string;
}): CreativeEditorDocument {
    const template = CREATIVE_EDITOR_STARTER_TEMPLATES.find((item) => item.id === params.templateId)
        || CREATIVE_EDITOR_STARTER_TEMPLATES[0];
    const primaryColor = params.primaryColor || DEFAULT_PRIMARY;
    const scaleX = template.width / 1080;
    const scaleY = template.height / 1080;
    const base = createCreativeEditorDocument({
        brandName: params.brandName,
        height: template.height,
        primaryColor,
        productContext: params.productContext,
        title: params.title || template.label,
        width: template.width,
    });
    return {
        ...base,
        elements: base.elements.map((element) => ({
            ...element,
            height: Math.round(element.height * scaleY),
            width: Math.round(element.width * scaleX),
            x: Math.round(element.x * scaleX),
            y: Math.round(element.y * scaleY),
        })),
        metadata: {
            ...base.metadata,
            templateId: template.id,
        },
        title: params.title || template.label,
    };
}

export function buildCreativeEditorImageElement(
    params: Partial<Extract<CreativeEditorElement, { type: "image" }>> & { src: string },
): Extract<CreativeEditorElement, { type: "image" }> {
    return {
        alt: params.name || "Image",
        fit: "cover",
        height: 360,
        id: buildCreativeEditorId("layer"),
        name: params.name || "Image",
        opacity: 1,
        src: params.src,
        type: "image",
        visible: true,
        width: 360,
        x: params.x ?? 620,
        y: params.y ?? 620,
        ...params,
    };
}

export function buildCreativeEditorQrElement(value: string): Extract<CreativeEditorElement, { type: "qr" }> {
    return qrElement({ value });
}

export function buildCreativeEditorRectElement(primaryColor = DEFAULT_PRIMARY): Extract<CreativeEditorElement, { type: "rect" }> {
    return rectElement({ fill: primaryColor });
}

export function buildCreativeEditorEllipseElement(primaryColor = DEFAULT_PRIMARY): Extract<CreativeEditorElement, { type: "ellipse" }> {
    return {
        fill: primaryColor,
        height: 220,
        id: buildCreativeEditorId("layer"),
        name: "Circle",
        opacity: 1,
        stroke: "transparent",
        strokeStyle: "solid",
        strokeWidth: 0,
        type: "ellipse",
        visible: true,
        width: 220,
        x: 720,
        y: 720,
    };
}

export function buildCreativeEditorTriangleElement(primaryColor = DEFAULT_PRIMARY): Extract<CreativeEditorElement, { type: "triangle" }> {
    return {
        fill: primaryColor,
        height: 240,
        id: buildCreativeEditorId("layer"),
        name: "Triangle",
        opacity: 1,
        stroke: "transparent",
        strokeStyle: "solid",
        strokeWidth: 0,
        type: "triangle",
        visible: true,
        width: 260,
        x: 620,
        y: 640,
    };
}

export function buildCreativeEditorLineElement(primaryColor = DEFAULT_PRIMARY): Extract<CreativeEditorElement, { type: "line" }> {
    return {
        arrowStyle: "none",
        height: 160,
        id: buildCreativeEditorId("layer"),
        name: "Line",
        opacity: 1,
        stroke: primaryColor,
        strokeLineCap: "round",
        strokeStyle: "solid",
        strokeWidth: 8,
        type: "line",
        visible: true,
        width: 300,
        x: 560,
        y: 560,
    };
}

export function buildCreativeEditorArrowElement(
    primaryColor = DEFAULT_PRIMARY,
    arrowStyle: Extract<CreativeEditorElement, { type: "line" }>["arrowStyle"] = "arrow",
): Extract<CreativeEditorElement, { type: "line" }> {
    return {
        ...buildCreativeEditorLineElement(primaryColor),
        arrowStyle,
        height: arrowStyle === "thin-tail-arrow" ? 90 : 130,
        name: arrowStyle === "thin-tail-arrow" ? "Thin-tail arrow" : "Arrow",
        strokeWidth: arrowStyle === "thin-tail-arrow" ? 5 : 8,
        width: 340,
        x: 520,
        y: 560,
    };
}

const getPolygonVertices = (sides: number, radius: number): CreativeEditorPoint[] => (
    Array.from({ length: sides }, (_, index) => {
        const angle = (Math.PI * 2 * index / sides) - Math.PI / 2;
        return {
            x: Math.round(radius + radius * Math.cos(angle)),
            y: Math.round(radius + radius * Math.sin(angle)),
        };
    })
);

const getStarVertices = (spikes: number, outerRadius: number, innerRadius: number): CreativeEditorPoint[] => {
    const points: CreativeEditorPoint[] = [];
    const center = outerRadius;
    const step = Math.PI / spikes;
    for (let index = 0; index < spikes * 2; index += 1) {
        const radius = index % 2 === 0 ? outerRadius : innerRadius;
        const angle = index * step - Math.PI / 2;
        points.push({
            x: Math.round(center + radius * Math.cos(angle)),
            y: Math.round(center + radius * Math.sin(angle)),
        });
    }
    return points;
};

export function buildCreativeEditorPolygonElement(params: {
    fill?: string;
    height?: number;
    name?: string;
    points: CreativeEditorPoint[];
    width?: number;
    x?: number;
    y?: number;
}): Extract<CreativeEditorElement, { type: "polygon" }> {
    return {
        fill: params.fill || DEFAULT_PRIMARY,
        height: params.height || 180,
        id: buildCreativeEditorId("layer"),
        name: params.name || "Polygon",
        opacity: 1,
        points: params.points,
        stroke: "transparent",
        strokeStyle: "solid",
        strokeWidth: 0,
        type: "polygon",
        visible: true,
        width: params.width || 180,
        x: params.x ?? 620,
        y: params.y ?? 640,
    };
}

export function buildCreativeEditorHexagonElement(primaryColor = DEFAULT_PRIMARY): Extract<CreativeEditorElement, { type: "polygon" }> {
    return buildCreativeEditorPolygonElement({
        fill: primaryColor,
        name: "Hexagon",
        points: getPolygonVertices(6, 90),
    });
}

export function buildCreativeEditorPentagonElement(primaryColor = DEFAULT_PRIMARY): Extract<CreativeEditorElement, { type: "polygon" }> {
    return buildCreativeEditorPolygonElement({
        fill: primaryColor,
        name: "Pentagon",
        points: getPolygonVertices(5, 90),
    });
}

export function buildCreativeEditorStarElement(primaryColor = DEFAULT_PRIMARY): Extract<CreativeEditorElement, { type: "polygon" }> {
    return buildCreativeEditorPolygonElement({
        fill: primaryColor,
        name: "Star",
        points: getStarVertices(5, 90, 42),
    });
}

export function buildCreativeEditorEggElement(primaryColor = DEFAULT_PRIMARY): Extract<CreativeEditorElement, { type: "path" }> {
    return {
        fill: primaryColor,
        height: 220,
        id: buildCreativeEditorId("layer"),
        name: "Egg",
        opacity: 1,
        path: "M225,75 C225,25 175,10 150,10 C125,10 75,25 75,75 C75,125 150,200 150,200 C150,200 225,125 225,75 z",
        stroke: "transparent",
        strokeStyle: "solid",
        strokeWidth: 0,
        type: "path",
        visible: true,
        width: 170,
        x: 620,
        y: 640,
    };
}

export function buildCreativeEditorTextElement(text = "New text"): Extract<CreativeEditorElement, { type: "text" }> {
    return textElement({
        fontSize: 44,
        height: 130,
        name: "Text",
        text,
        width: 520,
        x: 120,
        y: 120,
    });
}

export function buildCreativeEditorPathTextElement(text = "Curved text"): Extract<CreativeEditorElement, { type: "pathText" }> {
    return {
        align: "center",
        charSpacing: 0,
        color: "#16231f",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: 38,
        fontWeight: "800",
        height: 150,
        id: buildCreativeEditorId("layer"),
        lineHeight: 1.12,
        name: "Path text",
        opacity: 1,
        path: "M 10 90 C 140 0 300 0 430 90",
        pathStroke: "#d7dbdf",
        pathVisible: true,
        text,
        type: "pathText",
        visible: true,
        width: 460,
        x: 120,
        y: 140,
    };
}
