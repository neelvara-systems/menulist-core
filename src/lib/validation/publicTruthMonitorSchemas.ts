import { PUBLIC_TRUTH_MONITOR_API_MAX_BODY_BYTES } from "@constant/publicTruthMonitor";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import type { NextResponse } from "next/server";
import { z } from "zod";

export async function parsePublicTruthMonitorJsonBody(request: Request): Promise<
    | { data: unknown; success: true }
    | { response?: NextResponse; success: false }
> {
    const bodyResult = await readBoundedJsonBody(request, PUBLIC_TRUTH_MONITOR_API_MAX_BODY_BYTES, {
        invalidJsonMessage: "Invalid JSON",
    });
    if (bodyResult.ok === false) return { response: bodyResult.response, success: false };

    return { data: bodyResult.data, success: true };
}

const publicTruthMonitorProjectIdSchema = z.string()
    .min(1)
    .max(140)
    .refine(isValidFirestoreDocumentId, "Invalid project ID");

export const PublicTruthMonitorRefreshRequestSchema = z.object({
    forceRefresh: z.boolean().optional().default(false),
    selectedProjectId: publicTruthMonitorProjectIdSchema.optional(),
});
