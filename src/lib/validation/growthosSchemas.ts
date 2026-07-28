import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import type { NextResponse } from "next/server";
import { z } from "zod";

const GROWTHOS_API_MAX_BODY_BYTES = 16 * 1024;
const growthOSProjectIdSchema = z.string()
    .trim()
    .min(1)
    .max(100)
    .refine(isValidFirestoreDocumentId, "Invalid project ID");
const growthOSKitIdSchema = z.string()
    .trim()
    .min(1)
    .max(200)
    .refine(isValidFirestoreDocumentId, "Invalid kit ID");

export async function parseGrowthOSJsonBody(request: Request): Promise<
    | { data: unknown; success: true }
    | { response?: NextResponse; success: false }
> {
    const bodyResult = await readBoundedJsonBody(request, GROWTHOS_API_MAX_BODY_BYTES, {
        invalidJsonMessage: "Invalid JSON",
    });
    if (bodyResult.ok === false) return { response: bodyResult.response, success: false };

    return { data: bodyResult.data, success: true };
}

export const GrowthOSRefreshRequestSchema = z.object({
    projectId: growthOSProjectIdSchema,
    forceRefresh: z.boolean().optional().default(false),
}).strict();

export const GrowthOSGenerateKitRequestSchema = z.object({
    operationId: z.string().uuid(),
    projectId: growthOSProjectIdSchema,
    actionId: z.string().max(200).optional(),
}).strict();

export const GrowthOSExportRequestSchema = z.object({
    operationId: z.string().uuid(),
    kitId: growthOSKitIdSchema,
    destination: z.enum([
        "whatsapp_status",
        "whatsapp_message",
        "instagram_caption",
        "google_update_draft",
        "staff_brief",
        "counter_prompt",
        "qr_table_prompt",
        "review_reply",
    ]),
    method: z.enum(["copy", "share", "download", "print", "mark_used", "regenerate", "stale"]),
    outputId: z.string().max(100).optional(),
}).strict();

export const GrowthOSReviewSuggestRequestSchema = z.object({
    reviewText: z.string().min(1).max(2000),
    rating: z.number().int().min(1).max(5).optional(),
    tone: z.enum(["calm", "apology", "clarification", "thank_you"]).optional().default("calm"),
}).strict();
