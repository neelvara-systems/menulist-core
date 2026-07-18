import assert from "node:assert/strict";
import { CAMPAIGNCUE_CUE_LAYERS } from "@constant/campaigncue/cueLayers";
import {
    assertCampaignCueCueLayerDocumentScope,
    collectCampaignCueCueLayerDocumentAssetIds,
    dehydrateCampaignCueCueLayerDocumentAssets,
    fingerprintCampaignCueCueLayerDocument,
    getCampaignCueCueLayerExportBindingError,
    hydrateCampaignCueCueLayerDocumentAssets,
} from "@lib/campaigncue/cue-layers/documentBoundary";
import { CampaignCueCueLayerEditorDocumentSchema } from "@lib/validation/campaigncueCueLayersSchemas";
import type { CreativeEditorDocument } from "@/modules/creative-editor/types";

const workspaceId = "cc_1_101";
const designId = "cccl_design_test";
const assetId = "cccl_asset_test";
const assetUri = `cue-asset://${assetId}`;

const imageElement = (id: string, src = "https://storage.example.test/runtime.png") => ({
    editorGuide: false,
    excludeFromExport: false,
    fit: "contain" as const,
    height: 400,
    id,
    locked: true,
    name: "Original image",
    printFrameId: "print_frame_1",
    printFrameLocked: true,
    sourceRefs: [{ label: "Original preserved", locked: true, productId: "CC", sourceRef: assetUri }],
    src,
    type: "image" as const,
    width: 400,
    x: 0,
    y: 0,
});

const qrElement = {
    darkColor: "#111111",
    errorCorrectionLevel: "H" as const,
    height: 120,
    id: "qr_1",
    lightColor: "#ffffff",
    margin: 4,
    name: "Booking QR",
    type: "qr" as const,
    value: "https://example.test/book",
    width: 120,
    x: 20,
    y: 20,
};

const documentValue: CreativeEditorDocument = {
    activePageId: "page_1",
    canvas: {
        backgroundColor: "#ffffff",
        backgroundGradient: { angle: 45, enabled: true, from: "#ffffff", to: "#eeeeee" },
        height: 1080,
        width: 1080,
    },
    elements: [imageElement("image_root"), qrElement],
    id: "cccl_editor_test",
    metadata: {
        brand: { name: "Test business", primaryColor: "#112233" },
        cueLayers: { designId, outcome: "flat_safe", reconstructionId: "reconstruction_1", revision: 1, sourcePackageId: "source_1" },
    } as CreativeEditorDocument["metadata"],
    pages: [{
        canvas: {
            backgroundColor: "#ffffff",
            backgroundGradient: { angle: 45, enabled: true, from: "#ffffff", to: "#eeeeee" },
            height: 1080,
            width: 1080,
        },
        elements: [imageElement("image_page"), qrElement],
        id: "page_1",
        locked: false,
        title: "Square",
        updatedAt: "2026-07-13T12:00:00.000Z",
    }],
    productContext: { productId: "CC", sourceSurface: "cue-layers", workspaceId },
    schemaVersion: "creative-editor.v1",
    title: "Reusable image",
};

const parsed = CampaignCueCueLayerEditorDocumentSchema.parse(documentValue);
assert.equal(parsed.pages?.[0]?.canvas.backgroundGradient?.enabled, true);
assert.equal(parsed.pages?.[0]?.elements[0]?.editorGuide, false);
assert.equal(parsed.pages?.[0]?.elements[0]?.printFrameId, "print_frame_1");
assert.equal(parsed.pages?.[0]?.elements[1]?.type, "qr");
assert.equal(parsed.pages?.[0]?.elements[1]?.errorCorrectionLevel, "H");
assert.equal(parsed.pages?.[0]?.elements[1]?.margin, 4);
assert.deepEqual([...collectCampaignCueCueLayerDocumentAssetIds(documentValue)], [assetId]);

const dehydrated = dehydrateCampaignCueCueLayerDocumentAssets(documentValue, new Set([assetId]));
assert.equal(dehydrated.elements[0]?.type === "image" ? dehydrated.elements[0].src : "", assetUri);
assert.equal(dehydrated.pages?.[0]?.elements[0]?.type === "image" ? dehydrated.pages[0].elements[0].src : "", assetUri);

const runtimeUrl = "https://storage.example.test/signed.png?X-Goog-Signature=test";
const hydrated = hydrateCampaignCueCueLayerDocumentAssets(dehydrated, new Map([[assetId, runtimeUrl]]));
assert.equal(hydrated.elements[0]?.type === "image" ? hydrated.elements[0].src : "", runtimeUrl);
assert.equal(hydrated.pages?.[0]?.elements[0]?.type === "image" ? hydrated.pages[0].elements[0].src : "", runtimeUrl);
assert.equal(
    fingerprintCampaignCueCueLayerDocument(hydrated),
    fingerprintCampaignCueCueLayerDocument({
        ...dehydrated,
        metadata: { ...dehydrated.metadata, updatedAt: "2026-07-13T14:00:00.000Z" },
    }),
);
assert.notEqual(
    fingerprintCampaignCueCueLayerDocument(hydrated),
    fingerprintCampaignCueCueLayerDocument({ ...hydrated, title: "Changed title" }),
);
assert.equal(getCampaignCueCueLayerExportBindingError({
    renderedHeight: 1080,
    renderedWidth: 1080,
    savedDocument: dehydrated,
    submittedDocument: hydrated,
}), null);
assert.equal(getCampaignCueCueLayerExportBindingError({
    renderedHeight: 1080,
    renderedWidth: 1080,
    savedDocument: dehydrated,
    submittedDocument: { ...hydrated, title: "Unsaved title" },
}), "Save the latest edit before exporting.");
assert.equal(getCampaignCueCueLayerExportBindingError({
    renderedHeight: 1200,
    renderedWidth: 1080,
    savedDocument: dehydrated,
    submittedDocument: hydrated,
}), "Export size does not match the saved design.");

assert.throws(
    () => dehydrateCampaignCueCueLayerDocumentAssets(documentValue, new Set(["another_asset"])),
    /existing design asset/,
);
assert.throws(
    () => hydrateCampaignCueCueLayerDocumentAssets(dehydrated, new Map()),
    /asset is unavailable/,
);
assert.throws(
    () => assertCampaignCueCueLayerDocumentScope(documentValue, designId, "cc_2_202"),
    /another workspace/,
);

const duplicatePages = {
    ...documentValue,
    pages: [documentValue.pages![0], { ...documentValue.pages![0] }],
};
assert.equal(CampaignCueCueLayerEditorDocumentSchema.safeParse(duplicatePages).success, false);

const invalidActivePage = { ...documentValue, activePageId: "page_missing" };
assert.equal(CampaignCueCueLayerEditorDocumentSchema.safeParse(invalidActivePage).success, false);

const oversizedCanvas = {
    ...documentValue,
    canvas: { ...documentValue.canvas, height: 4096, width: 4096 },
};
assert.equal(CampaignCueCueLayerEditorDocumentSchema.safeParse(oversizedCanvas).success, false);

const tooManyPages = {
    ...documentValue,
    activePageId: "page_0",
    pages: Array.from({ length: CAMPAIGNCUE_CUE_LAYERS.MAX_EDITOR_PAGES + 1 }, (_, index) => ({
        ...documentValue.pages![0],
        id: `page_${index}`,
    })),
};
assert.equal(CampaignCueCueLayerEditorDocumentSchema.safeParse(tooManyPages).success, false);

const metadataWithUnknownUrl = {
    ...documentValue,
    metadata: {
        ...documentValue.metadata,
        brand: { ...documentValue.metadata?.brand, logoUrl: "https://untrusted.example/logo.png" },
        injectedUrl: "https://untrusted.example/signed.png",
    },
};
const sanitizedMetadata = CampaignCueCueLayerEditorDocumentSchema.parse(metadataWithUnknownUrl).metadata as Record<string, unknown>;
assert.equal("injectedUrl" in sanitizedMetadata, false);
assert.equal("logoUrl" in (sanitizedMetadata.brand as Record<string, unknown>), false);

const externalTextPlaceholderSource = {
    ...documentValue,
    metadata: {
        ...documentValue.metadata,
        textPlaceholders: [{ id: "placeholder_1", label: "Unsafe", sourceRef: "https://untrusted.example", value: "Test" }],
    },
};
assert.equal(CampaignCueCueLayerEditorDocumentSchema.safeParse(externalTextPlaceholderSource).success, false);

process.stdout.write("CampaignCue CueLayers document boundary tests passed.\n");
