import { CAMPAIGNCUE_PRODUCT_CODE } from "@constant/campaigncue/product";
import type { CampaignCueCreativeEditorDocumentSnapshot } from "@type/campaigncueCueLayers";
import type { CreativeEditorDocument, CreativeEditorElement } from "@/modules/creative-editor/types";
import { parseCampaignCueCueAssetUri, sha256Hex } from "./storagePaths";

function mapDocumentElements(
    documentValue: CreativeEditorDocument,
    mapper: (element: CreativeEditorElement) => CreativeEditorElement,
): CreativeEditorDocument {
    return {
        ...documentValue,
        elements: documentValue.elements.map(mapper),
        pages: documentValue.pages?.map((page) => ({
            ...page,
            elements: page.elements.map(mapper),
        })),
    };
}

const allDocumentElements = (documentValue: CreativeEditorDocument) => [
    ...documentValue.elements,
    ...(documentValue.pages?.flatMap((page) => page.elements) || []),
];

const canonicalJson = (value: unknown): string => {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry ?? null)).join(",")}]`;
    const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
};

export function fingerprintCampaignCueCueLayerDocument(documentValue: CreativeEditorDocument) {
    const dehydrated = dehydrateCampaignCueCueLayerDocumentAssets(documentValue);
    const metadata = dehydrated.metadata ? { ...dehydrated.metadata } : undefined;
    if (metadata) delete metadata.updatedAt;
    return sha256Hex(canonicalJson({ ...dehydrated, metadata }));
}

export function getCampaignCueCueLayerExportBindingError(params: {
    renderedHeight: number;
    renderedWidth: number;
    savedDocument: CreativeEditorDocument;
    submittedDocument: CreativeEditorDocument;
}) {
    if (
        fingerprintCampaignCueCueLayerDocument(params.savedDocument)
        !== fingerprintCampaignCueCueLayerDocument(params.submittedDocument)
    ) {
        return "Save the latest edit before exporting.";
    }
    if (
        params.renderedWidth !== params.savedDocument.canvas.width
        || params.renderedHeight !== params.savedDocument.canvas.height
    ) {
        return "Export size does not match the saved design.";
    }
    return null;
}

export function collectCampaignCueCueLayerDocumentAssetIds(documentValue: CreativeEditorDocument) {
    const assetIds = new Set<string>();
    allDocumentElements(documentValue).forEach((element) => {
        if (element.type !== "image") return;
        const assetId = parseCampaignCueCueAssetUri(element.src)
            || parseCampaignCueCueAssetUri(element.sourceRefs?.find((ref) => ref.sourceRef?.startsWith("cue-asset://"))?.sourceRef);
        if (!assetId) throw new Error("CueLayers image is missing its product-owned asset reference.");
        assetIds.add(assetId);
    });
    return assetIds;
}

export function assertCampaignCueCueLayerDocumentScope(
    documentValue: CreativeEditorDocument,
    designId: string,
    workspaceId: string,
) {
    if (documentValue.productContext.productId !== CAMPAIGNCUE_PRODUCT_CODE) {
        throw new Error("CueLayers editor document belongs to another product.");
    }
    if (documentValue.productContext.workspaceId !== workspaceId) {
        throw new Error("CueLayers editor document belongs to another workspace.");
    }
    const cueLayersMetadata = (documentValue.metadata as { cueLayers?: { designId?: unknown } } | undefined)?.cueLayers;
    if (cueLayersMetadata?.designId !== designId) {
        throw new Error("CueLayers editor document belongs to another design.");
    }
}

export function hydrateCampaignCueCueLayerDocumentAssets(
    documentValue: CreativeEditorDocument,
    urlByAssetId: ReadonlyMap<string, string>,
): CreativeEditorDocument {
    return mapDocumentElements(documentValue, (element) => {
        if (element.type !== "image") return element;
        const assetId = parseCampaignCueCueAssetUri(element.src)
            || parseCampaignCueCueAssetUri(element.sourceRefs?.find((ref) => ref.sourceRef?.startsWith("cue-asset://"))?.sourceRef);
        if (!assetId) return element;
        const runtimeUrl = urlByAssetId.get(assetId);
        if (!runtimeUrl) throw new Error("CueLayers design asset is unavailable.");
        return {
            ...element,
            src: runtimeUrl,
        };
    });
}

export function dehydrateCampaignCueCueLayerDocumentAssets(
    documentValue: CreativeEditorDocument,
    allowedAssetIds?: ReadonlySet<string>,
): CampaignCueCreativeEditorDocumentSnapshot {
    const dehydrated = mapDocumentElements(documentValue, (element) => {
        if (element.type !== "image") return element;
        const sourceAssetUri = element.sourceRefs?.find((ref) => ref.sourceRef?.startsWith("cue-asset://"))?.sourceRef;
        const directAssetUri = element.src?.startsWith("cue-asset://") ? element.src : "";
        const assetId = parseCampaignCueCueAssetUri(sourceAssetUri || directAssetUri);
        if (!sourceAssetUri && !directAssetUri) {
            throw new Error("CueLayers image edits must use product-owned asset references.");
        }
        if (!assetId || (allowedAssetIds && !allowedAssetIds.has(assetId))) {
            throw new Error("CueLayers image edits must reference an existing design asset.");
        }
        if (/^(javascript|data):/i.test(element.src)) {
            throw new Error("CueLayers image edits cannot persist unsafe image URLs.");
        }
        return {
            ...element,
            src: sourceAssetUri || directAssetUri,
        };
    });
    return {
        ...dehydrated,
        metadata: {
            ...dehydrated.metadata,
            updatedAt: new Date().toISOString(),
        },
    } as CampaignCueCreativeEditorDocumentSnapshot;
}
