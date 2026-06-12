import { notFound } from "next/navigation";
import { CreativeEditor } from "@/modules/creative-editor";
import {
    buildCreativeEditorEllipseElement,
    buildCreativeEditorHexagonElement,
    buildCreativeEditorImageElement,
    buildCreativeEditorQrElement,
    buildCreativeEditorRectElement,
    buildCreativeEditorTextElement,
    buildCreativeEditorTriangleElement,
    createCreativeEditorDocument,
} from "@/modules/creative-editor/templates";

const smokeImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">
        <rect width="240" height="180" rx="18" fill="#f4f3ff"/>
        <path d="M42 124 C78 66 132 50 196 110 C162 162 88 162 42 124Z" fill="#4744a4"/>
        <circle cx="86" cy="80" r="20" fill="#ef6680"/>
        <rect x="112" y="64" width="62" height="82" rx="24" fill="#ffffff"/>
        <path d="M110 78 C122 54 154 54 176 78" fill="none" stroke="#3c3a55" stroke-width="10" stroke-linecap="round"/>
        <circle cx="188" cy="58" r="8" fill="#6563ff"/>
    </svg>
`)}`;

export const dynamic = "force-dynamic";

export default function CreativeEditorSmokePage() {
    if (process.env.NODE_ENV === "production") {
        notFound();
    }

    const initialDocument = createCreativeEditorDocument({
        backgroundColor: "#ffffff",
        elements: [
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
        ],
        height: 427,
        primaryColor: "#4fac96",
        productContext: {
            productId: "internal",
            sourceSurface: "creative-editor-smoke",
        },
        title: "Fabric smoke asset",
        width: 620,
    });

    return (
        <main style={{ minHeight: "100vh", padding: 24 }}>
            <CreativeEditor
                assetSources={[]}
                initialDocument={initialDocument}
                productLabel="Shared"
                sourceLabel="Internal smoke route"
            />
        </main>
    );
}
