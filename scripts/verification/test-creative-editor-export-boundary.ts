import assert from "node:assert/strict";

import { serializeCreativeDocumentToSvg } from "../../src/modules/creative-editor/export";
import type {
    CreativeEditorDocument,
    CreativeEditorTextElement,
} from "../../src/modules/creative-editor/types";

const textElement = (
    id: string,
    text: string,
    flags: Partial<CreativeEditorTextElement> = {},
): CreativeEditorTextElement => ({
    color: "#111111",
    fontSize: 24,
    height: 40,
    id,
    name: id,
    text,
    type: "text",
    width: 240,
    x: 10,
    y: 10,
    ...flags,
});

const documentValue: CreativeEditorDocument = {
    canvas: {
        backgroundColor: "#ffffff",
        height: 300,
        width: 300,
    },
    elements: [
        textElement("public-layer", "PUBLIC OUTPUT"),
        textElement("excluded-layer", "PRIVATE EXPORT GUIDE", { excludeFromExport: true }),
        textElement("editor-guide", "EDITOR GUIDE", { editorGuide: true }),
        textElement("hidden-layer", "HIDDEN LAYER", { visible: false }),
    ],
    id: "export-boundary",
    productContext: {
        productId: "internal",
        sourceSurface: "verification",
    },
    schemaVersion: "creative-editor.v1",
    title: "Export boundary",
};

async function main(): Promise<void> {
    const svg = await serializeCreativeDocumentToSvg(documentValue);

    assert.match(svg, /PUBLIC OUTPUT/);
    assert.doesNotMatch(svg, /PRIVATE EXPORT GUIDE/);
    assert.doesNotMatch(svg, /EDITOR GUIDE/);
    assert.doesNotMatch(svg, /HIDDEN LAYER/);

    console.log("Creative Editor export boundary tests passed.");
}

void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
