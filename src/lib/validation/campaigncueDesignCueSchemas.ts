import {
    CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS,
    CAMPAIGNCUE_DESIGN_CUE_LIMITS,
} from "@constant/campaigncue/designCue";
import { z } from "zod";

const targetSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("document"),
    }),
    z.object({
        elementId: z.string().trim().min(1).max(160),
        type: z.literal("layer"),
    }),
    z.object({
        height: z.number().min(1).max(5000),
        type: z.literal("canvas_region"),
        width: z.number().min(1).max(5000),
        x: z.number().min(-5000).max(5000),
        y: z.number().min(-5000).max(5000),
    }),
]);

const elementSummarySchema = z.object({
    height: z.number().min(1).max(5000),
    id: z.string().trim().min(1).max(160),
    locked: z.boolean().optional(),
    name: z.string().trim().max(160),
    text: z.string().trim().max(700).optional(),
    type: z.string().trim().max(40),
    width: z.number().min(1).max(5000),
    x: z.number().min(-5000).max(5000),
    y: z.number().min(-5000).max(5000),
}).strip();

const safeDocumentSummarySchema = z.object({
    canvas: z.object({
        height: z.number().min(1).max(5000),
        width: z.number().min(1).max(5000),
    }),
    elementCount: z.number().int().min(0).max(250),
    visibleText: z.string().trim().max(2500),
}).strip();

export const CampaignCueDesignCueTurnSchema = z.object({
    commandId: z.nativeEnum(CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS).optional(),
    comment: z.string().trim().max(CAMPAIGNCUE_DESIGN_CUE_LIMITS.MAX_COMMENT_LENGTH).optional(),
    document: safeDocumentSummarySchema,
    selectedElement: elementSummarySchema.optional().nullable(),
    source: z.enum(["canvas_comment", "command_chip", "free_text", "selected_layer_comment"]),
    target: targetSchema,
}).refine((value) => Boolean(value.commandId || value.comment), {
    message: "Command or comment is required",
});

export type CampaignCueDesignCueTurnInput = z.infer<typeof CampaignCueDesignCueTurnSchema>;
