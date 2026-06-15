import type {
    CreativeEditorDesignCueApplyResult,
    CreativeEditorDesignCueCanvasPreset,
    CreativeEditorDesignCuePatchOperation,
    CreativeEditorDesignCuePatchSet,
    CreativeEditorDesignCueTextPlacement,
    CreativeEditorDocument,
    CreativeEditorElement,
} from "@/modules/creative-editor/types";
import { buildCreativeEditorTextElement } from "@/modules/creative-editor/templates";
import { validateCampaignCueDesignCuePatchSet } from "./validate";

const CANVAS_PRESETS: Record<CreativeEditorDesignCueCanvasPreset, { height: number; width: number }> = {
    poster: { width: 1240, height: 1754 },
    square: { width: 1080, height: 1080 },
    story: { width: 1080, height: 1920 },
    wide: { width: 1600, height: 900 },
};

const textMetricsFor = (text: string) => {
    if (text.length > 180) return { fontSize: 28, height: 230, width: 700 };
    if (text.length > 90) return { fontSize: 34, height: 190, width: 650 };
    return { fontSize: 42, height: 140, width: 560 };
};

const placementFor = (
    documentValue: CreativeEditorDocument,
    placement: CreativeEditorDesignCueTextPlacement,
    width: number,
    height: number,
) => {
    if (placement === "cta_zone") {
        return {
            x: Math.round((documentValue.canvas.width - width) / 2),
            y: Math.round(Math.max(40, documentValue.canvas.height - height - 92)),
        };
    }
    if (placement === "near_target") {
        return {
            x: Math.round((documentValue.canvas.width - width) / 2),
            y: Math.round(Math.max(72, documentValue.canvas.height * 0.58)),
        };
    }
    return {
        x: Math.round((documentValue.canvas.width - width) / 2),
        y: Math.round((documentValue.canvas.height - height) / 2),
    };
};

const addTextElement = (
    documentValue: CreativeEditorDocument,
    operation: Extract<CreativeEditorDesignCuePatchOperation, { op: "add_text" }>,
): { document: CreativeEditorDocument; selectedElementId: string } => {
    const metrics = textMetricsFor(operation.text);
    const width = Math.min(metrics.width, Math.max(220, documentValue.canvas.width - 96));
    const placement = placementFor(documentValue, operation.placement, width, metrics.height);
    const element = {
        ...buildCreativeEditorTextElement(operation.text),
        fontSize: metrics.fontSize,
        height: metrics.height,
        name: operation.name || "Design Cue text",
        sourceRefs: [
            {
                label: "Design Cue",
                locked: true,
                productId: documentValue.productContext.productId,
                sourceRef: "campaigncue.design_cue",
            },
        ],
        width,
        x: placement.x,
        y: placement.y,
    };
    return {
        document: {
            ...documentValue,
            elements: [...documentValue.elements, element],
        },
        selectedElementId: element.id,
    };
};

const updateTextElement = (
    documentValue: CreativeEditorDocument,
    operation: Extract<CreativeEditorDesignCuePatchOperation, { op: "update_text" }>,
): CreativeEditorDocument => ({
    ...documentValue,
    elements: documentValue.elements.map((element) => {
        if (element.id !== operation.elementId) return element;
        if (element.type !== "text" && element.type !== "pathText") return element;
        return {
            ...element,
            text: operation.text,
        } as CreativeEditorElement;
    }),
});

const updateLayer = (
    documentValue: CreativeEditorDocument,
    operation: Extract<CreativeEditorDesignCuePatchOperation, { op: "update_layer" }>,
): CreativeEditorDocument => ({
    ...documentValue,
    elements: documentValue.elements.map((element) => (
        element.id === operation.elementId
            ? { ...element, ...operation.patch } as CreativeEditorElement
            : element
    )),
});

const resizeCanvas = (
    documentValue: CreativeEditorDocument,
    preset: CreativeEditorDesignCueCanvasPreset,
): CreativeEditorDocument => {
    if (documentValue.canvas.width <= 0 || documentValue.canvas.height <= 0) {
        throw new Error("Canvas size is invalid.");
    }
    const size = CANVAS_PRESETS[preset];
    const scaleX = size.width / documentValue.canvas.width;
    const scaleY = size.height / documentValue.canvas.height;
    return {
        ...documentValue,
        canvas: {
            ...documentValue.canvas,
            height: size.height,
            width: size.width,
        },
        elements: documentValue.elements.map((element) => ({
            ...element,
            height: Math.max(8, Math.round(element.height * scaleY)),
            width: Math.max(8, Math.round(element.width * scaleX)),
            x: Math.round(element.x * scaleX),
            y: Math.round(element.y * scaleY),
        }) as CreativeEditorElement),
    };
};

export const applyCampaignCueDesignCuePatchSet = (params: {
    document: CreativeEditorDocument;
    patchSet: CreativeEditorDesignCuePatchSet;
}): CreativeEditorDesignCueApplyResult => {
    const validation = validateCampaignCueDesignCuePatchSet(params.document, params.patchSet);
    if (validation.ok === false) {
        throw new Error(validation.error);
    }

    let nextDocument = params.document;
    let selectedElementId: string | undefined;
    let appliedOperationCount = 0;

    for (const operation of params.patchSet.operations) {
        if (operation.op === "add_finding") continue;
        if (operation.op === "add_text") {
            const result = addTextElement(nextDocument, operation);
            nextDocument = result.document;
            selectedElementId = result.selectedElementId;
            appliedOperationCount += 1;
            continue;
        }
        if (operation.op === "resize_canvas") {
            nextDocument = resizeCanvas(nextDocument, operation.preset);
            appliedOperationCount += 1;
            continue;
        }
        if (operation.op === "update_text") {
            nextDocument = updateTextElement(nextDocument, operation);
            selectedElementId = operation.elementId;
            appliedOperationCount += 1;
            continue;
        }
        if (operation.op === "update_layer") {
            nextDocument = updateLayer(nextDocument, operation);
            selectedElementId = operation.elementId;
            appliedOperationCount += 1;
        }
    }

    return {
        appliedOperationCount,
        document: nextDocument,
        findings: params.patchSet.findings,
        notice: appliedOperationCount
            ? "Design Cue change applied."
            : "Design Cue review is ready.",
        selectedElementId,
    };
};
