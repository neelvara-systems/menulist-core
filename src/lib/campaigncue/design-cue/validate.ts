import {
    CAMPAIGNCUE_DESIGN_CUE_ALLOWED_LAYER_PATCH_KEYS,
    CAMPAIGNCUE_DESIGN_CUE_LIMITS,
} from "@constant/campaigncue/designCue";
import type {
    CreativeEditorDesignCuePatchOperation,
    CreativeEditorDesignCuePatchSet,
    CreativeEditorDesignCueSafeLayerPatch,
    CreativeEditorDocument,
    CreativeEditorElement,
} from "@/modules/creative-editor/types";

export type CampaignCueDesignCueValidationResult =
    | { ok: false; error: string }
    | { ok: true; warnings: string[] };

const allowedPatchKeys = new Set<string>(CAMPAIGNCUE_DESIGN_CUE_ALLOWED_LAYER_PATCH_KEYS);
const allowedCanvasPresets = new Set(["poster", "square", "story", "wide"]);
const allowedTextPlacements = new Set(["center", "cta_zone", "near_target"]);
const allowedAlignValues = new Set(["center", "left", "right"]);
const allowedFontStyleValues = new Set(["italic", "normal"]);
const allowedFontWeightValues = new Set(["400", "600", "700", "800", "900", "bold", "normal"]);

const UNSAFE_TEXT_PATTERN = /<\s*script|javascript:|data:text\/html|onerror\s*=|onload\s*=/i;

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const getElement = (documentValue: CreativeEditorDocument, elementId: string) => (
    documentValue.elements.find((element) => element.id === elementId)
);

const validateText = (value: string, label: string): CampaignCueDesignCueValidationResult => {
    if (!value.trim()) return { ok: false, error: `${label} is empty.` };
    if (value.length > CAMPAIGNCUE_DESIGN_CUE_LIMITS.MAX_TEXT_LENGTH) {
        return { ok: false, error: `${label} is too long.` };
    }
    if (UNSAFE_TEXT_PATTERN.test(value)) {
        return { ok: false, error: `${label} contains unsafe text.` };
    }
    return { ok: true, warnings: [] };
};

const validatePatchValue = (key: string, value: unknown): CampaignCueDesignCueValidationResult => {
    if (!allowedPatchKeys.has(key)) return { ok: false, error: `Patch key is not allowed: ${key}` };

    if (["height", "fontSize", "lineHeight", "opacity", "rotation", "strokeWidth", "width", "x", "y"].includes(key)) {
        if (!isFiniteNumber(value)) return { ok: false, error: `${key} must be a number.` };
        if ((key === "height" || key === "width") && value < CAMPAIGNCUE_DESIGN_CUE_LIMITS.MIN_LAYER_SIZE) {
            return { ok: false, error: `${key} is too small.` };
        }
        if ((key === "height" || key === "width") && value > 10000) return { ok: false, error: `${key} is too large.` };
        if ((key === "x" || key === "y") && Math.abs(value) > 10000) return { ok: false, error: `${key} is outside the allowed canvas range.` };
        if (key === "opacity" && (value < 0 || value > 1)) return { ok: false, error: "Opacity must stay between 0 and 1." };
        if (key === "fontSize" && (value < 8 || value > 180)) return { ok: false, error: "Font size is outside the allowed range." };
        if (key === "lineHeight" && (value < 0.5 || value > 3)) return { ok: false, error: "Line height is outside the allowed range." };
        if (key === "rotation" && (value < -360 || value > 360)) return { ok: false, error: "Rotation is outside the allowed range." };
        if (key === "strokeWidth" && (value < 0 || value > 200)) return { ok: false, error: "Stroke width is outside the allowed range." };
        return { ok: true, warnings: [] };
    }

    if (["color", "fill", "stroke"].includes(key)) {
        if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$|^transparent$/.test(value)) {
            return { ok: false, error: `${key} must be a safe color.` };
        }
        return { ok: true, warnings: [] };
    }

    if (["align", "fontStyle", "fontWeight", "name"].includes(key)) {
        if (typeof value !== "string") return { ok: false, error: `${key} must be text.` };
        if (key === "align" && !allowedAlignValues.has(value)) return { ok: false, error: "Alignment is not supported." };
        if (key === "fontStyle" && !allowedFontStyleValues.has(value)) return { ok: false, error: "Font style is not supported." };
        if (key === "fontWeight" && !allowedFontWeightValues.has(value)) return { ok: false, error: "Font weight is not supported." };
        if (key === "name" && !value.trim()) return { ok: false, error: "Layer name is empty." };
        if (UNSAFE_TEXT_PATTERN.test(value)) return { ok: false, error: `${key} contains unsafe text.` };
        if (value.length > 120) return { ok: false, error: `${key} is too long.` };
        return { ok: true, warnings: [] };
    }

    if (key === "visible") {
        if (typeof value !== "boolean") return { ok: false, error: "visible must be true or false." };
        return { ok: true, warnings: [] };
    }

    return { ok: true, warnings: [] };
};

const validateLayerMutation = (
    documentValue: CreativeEditorDocument,
    elementId: string,
): CampaignCueDesignCueValidationResult & { element?: CreativeEditorElement } => {
    const element = getElement(documentValue, elementId);
    if (!element) return { ok: false, error: "Target layer no longer exists." };
    if (element.locked) return { ok: false, error: "Target layer is locked." };
    return { ok: true, warnings: [], element };
};

const validateSafeLayerPatch = (patch: CreativeEditorDesignCueSafeLayerPatch): CampaignCueDesignCueValidationResult => {
    const warnings: string[] = [];
    const entries = Object.entries(patch);
    if (!entries.length) return { ok: false, error: "Layer patch is empty." };
    for (const [key, value] of entries) {
        const validation = validatePatchValue(key, value);
        if (!validation.ok) return validation;
        warnings.push(...validation.warnings);
    }
    return { ok: true, warnings };
};

const validateOperation = (
    documentValue: CreativeEditorDocument,
    operation: CreativeEditorDesignCuePatchOperation,
): CampaignCueDesignCueValidationResult => {
    if (operation.op === "add_finding") {
        return validateText(operation.text, "Finding");
    }
    if (operation.op === "add_text") {
        if (!allowedTextPlacements.has(operation.placement)) {
            return { ok: false, error: "Text placement is not supported." };
        }
        const textValidation = validateText(operation.text, "Added text");
        if (!textValidation.ok) return textValidation;
        if (operation.name !== undefined) {
            return validatePatchValue("name", operation.name);
        }
        return textValidation;
    }
    if (operation.op === "resize_canvas") {
        if (!allowedCanvasPresets.has(operation.preset)) {
            return { ok: false, error: "Canvas size preset is not supported." };
        }
        if (documentValue.canvas.width <= 0 || documentValue.canvas.height <= 0) {
            return { ok: false, error: "Canvas size is invalid." };
        }
        return { ok: true, warnings: [] };
    }
    if (operation.op === "update_text") {
        const layerValidation = validateLayerMutation(documentValue, operation.elementId);
        if (!layerValidation.ok) return layerValidation;
        if (layerValidation.element?.type !== "text" && layerValidation.element?.type !== "pathText") {
            return { ok: false, error: "Only text layers can receive text updates." };
        }
        return validateText(operation.text, "Updated text");
    }
    if (operation.op === "update_layer") {
        const layerValidation = validateLayerMutation(documentValue, operation.elementId);
        if (!layerValidation.ok) return layerValidation;
        return validateSafeLayerPatch(operation.patch);
    }
    return { ok: false, error: "Unsupported patch operation." };
};

const validateCampaignCueDesignCuePatchSetUnsafe = (
    documentValue: CreativeEditorDocument,
    patchSet: CreativeEditorDesignCuePatchSet,
): CampaignCueDesignCueValidationResult => {
    if (!patchSet.operations.length) {
        return { ok: false, error: "No change was prepared." };
    }
    if (patchSet.operations.length > CAMPAIGNCUE_DESIGN_CUE_LIMITS.MAX_OPERATIONS_PER_PATCH_SET) {
        return { ok: false, error: "Too many changes were prepared at once." };
    }

    const warnings: string[] = [];
    for (const operation of patchSet.operations) {
        const validation = validateOperation(documentValue, operation);
        if (!validation.ok) return validation;
        warnings.push(...validation.warnings);
    }

    return { ok: true, warnings };
};

export const validateCampaignCueDesignCuePatchSet = (
    documentValue: CreativeEditorDocument,
    patchSet: CreativeEditorDesignCuePatchSet,
): CampaignCueDesignCueValidationResult => {
    try {
        return validateCampaignCueDesignCuePatchSetUnsafe(documentValue, patchSet);
    } catch {
        return { ok: false, error: "Prepared changes are invalid." };
    }
};
