import { notFound } from "next/navigation";
import {
    buildCreativeEditorEllipseElement,
    buildCreativeEditorHexagonElement,
    buildCreativeEditorImageElement,
    buildCreativeEditorLineElement,
    buildCreativeEditorQrElement,
    buildCreativeEditorRectElement,
    buildCreativeEditorTextElement,
    buildCreativeEditorTriangleElement,
    createCreativeEditorDocument,
} from "@/modules/creative-editor/templates";
import type { CreativeEditorDocument, CreativeEditorElement } from "@/modules/creative-editor/types";
import CreativeEditorSmokeClient from "./CreativeEditorSmokeClient";

const smokeImage = "/images/menu-card-export/botanical-corner-watercolor.png";

export const dynamic = "force-dynamic";

function buildBaseSmokeElements(): CreativeEditorElement[] {
    return [
        buildCreativeEditorImageElement({
            name: "Illustration",
            src: smokeImage,
            x: 178,
            y: 76,
        }),
        {
            ...buildCreativeEditorTextElement("Fabric editor"),
            color: "#252235",
            fontSize: 34,
            height: 88,
            name: "Smoke title",
            width: 230,
            x: 36,
            y: 44,
        },
        {
            ...buildCreativeEditorRectElement("#4fac96"),
            height: 68,
            name: "Offer card",
            radius: 12,
            width: 150,
            x: 44,
            y: 248,
        },
        {
            ...buildCreativeEditorEllipseElement("#ef6680"),
            height: 72,
            name: "Circle accent",
            width: 72,
            x: 492,
            y: 64,
        },
        {
            ...buildCreativeEditorTriangleElement("#ffd45d"),
            height: 80,
            name: "Triangle accent",
            width: 96,
            x: 470,
            y: 254,
        },
        {
            ...buildCreativeEditorHexagonElement("#6563ff"),
            height: 80,
            name: "Hexagon accent",
            width: 80,
            x: 290,
            y: 278,
        },
        {
            ...buildCreativeEditorQrElement("https://campaigncue.ai"),
            height: 78,
            name: "QR",
            width: 78,
            x: 70,
            y: 330,
        },
    ];
}

function buildStressElements(): CreativeEditorElement[] {
    const palette = ["#4fac96", "#ef6680", "#ffd45d", "#6563ff", "#16231f", "#f4f3ff"];
    const elements = buildBaseSmokeElements();
    for (let index = 0; index < 72; index += 1) {
        const column = index % 12;
        const row = Math.floor(index / 12);
        const x = 22 + column * 48;
        const y = 22 + row * 54;
        const color = palette[index % palette.length];
        if (index % 4 === 0) {
            elements.push({
                ...buildCreativeEditorRectElement(color),
                height: 30 + (index % 3) * 8,
                name: `Stress block ${index + 1}`,
                radius: 8,
                width: 38 + (index % 5) * 6,
                x,
                y,
            });
        } else if (index % 4 === 1) {
            elements.push({
                ...buildCreativeEditorEllipseElement(color),
                height: 34,
                name: `Stress circle ${index + 1}`,
                width: 34,
                x,
                y,
            });
        } else if (index % 4 === 2) {
            elements.push({
                ...buildCreativeEditorTextElement(index % 8 === 2 ? "OPEN" : "SALE"),
                color,
                fontSize: 15,
                height: 34,
                name: `Stress text ${index + 1}`,
                width: 72,
                x,
                y,
            });
        } else {
            elements.push({
                ...buildCreativeEditorLineElement(color),
                height: 20,
                name: `Stress line ${index + 1}`,
                rotation: (index % 6) * 12,
                strokeWidth: 3,
                width: 48,
                x,
                y,
            });
        }
    }
    return elements;
}

function buildSmokeDocument(variant: "default" | "stress"): CreativeEditorDocument {
    const documentValue = createCreativeEditorDocument({
        backgroundColor: variant === "stress" ? "#fff9df" : "#ffffff",
        elements: variant === "stress" ? buildStressElements() : buildBaseSmokeElements(),
        height: 427,
        primaryColor: "#4fac96",
        productContext: {
            productId: "internal",
            sourceSurface: variant === "stress" ? "creative-editor-smoke-stress" : "creative-editor-smoke",
        },
        title: variant === "stress" ? "Fabric stress asset" : "Fabric smoke asset",
        width: 620,
    });
    return {
        ...documentValue,
        id: `creative-editor-smoke-${variant}`,
        metadata: {
            ...documentValue.metadata,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
        },
    };
}

export default async function CreativeEditorSmokePage(
    props: {
        searchParams?: Promise<{ qa?: string; variant?: string }>;
    }
) {
    const searchParams = await props.searchParams;
    if (process.env.NODE_ENV === "production") {
        notFound();
    }

    const variant = searchParams?.variant === "stress" ? "stress" : "default";
    const initialDocument = buildSmokeDocument(variant);
    const enableQaProbe = searchParams?.qa === "1" || searchParams?.qa === "true";

    return (
        <main style={{ minHeight: "100vh", padding: 24 }}>
            <CreativeEditorSmokeClient enableQaProbe={enableQaProbe} initialDocument={initialDocument} variant={variant} />
        </main>
    );
}
