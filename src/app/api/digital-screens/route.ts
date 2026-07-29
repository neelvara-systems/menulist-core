export const dynamic = "force-dynamic";

import { FEATURE_FLAGS } from "@config/features";
import { PERMISSIONS } from "@constant/permissions";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { requireAnyStorePermission, resolveStorePermissionSessionScope } from "@lib/permissions/server";
import { mutateDigitalScreenOwnerStateServer } from "@lib/screen/screenManagementServer";
import type { DigitalScreenManagementMutation } from "@lib/screen/screenManagementContracts";
import { logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "../../../middleware/auth";

const SlideSchema = z.object({
    availabilityLinked: z.literal(false),
    availabilityReliability: z.literal("high"),
    caption: z.string().max(48).optional(),
    confidenceScore: z.number().min(0).max(1),
    id: z.string().trim().min(1).max(128),
    imageUrl: z.string().trim().min(1).max(4096),
    source: z.literal("pinned"),
    type: z.literal("owner_upload"),
    validUntilMs: z.number().int().positive(),
}).strict();

const MutationSchema = z.discriminatedUnion("action", [
    z.object({
        action: z.literal("initialize"),
    }).strict(),
    z.object({
        action: z.literal("update_settings"),
        ownerOverrideEnabled: z.boolean(),
    }).strict(),
    z.object({
        action: z.literal("add_slide"),
        slide: SlideSchema,
    }).strict(),
    z.object({
        action: z.literal("remove_slide"),
        slideId: z.string().trim().min(1).max(128),
    }).strict(),
    z.object({
        action: z.literal("update_caption"),
        caption: z.string().max(48),
        slideId: z.string().trim().min(1).max(128),
    }).strict(),
]);

const MAX_BODY_BYTES = 8 * 1024;

async function applyDigitalScreenRateLimit(session: any) {
    const identity = String(session?.uId || session?.user?.id || session?.user?.email || "unknown");
    const result = await checkRateLimit({
        key: `digital-screen-management:${identity}`,
        ...getRateLimitForFeature("DATA_WRITE"),
    });
    return result.allowed
        ? null
        : NextResponse.json({ error: "Too many requests" }, { status: 429 });
}

async function authorize(request: NextRequest, session: any) {
    const rateLimitResponse = await applyDigitalScreenRateLimit(session);
    if (rateLimitResponse) return { response: rateLimitResponse };

    const permissionResponse = await requireAnyStorePermission(
        request,
        session,
        [PERMISSIONS.MANAGE_DIGITAL_SCREENS],
        "Digital Screens",
    );
    if (permissionResponse) return { response: permissionResponse };

    const scope = resolveStorePermissionSessionScope(session);
    if (!scope) {
        return {
            response: NextResponse.json({ error: "Not onboarded" }, { status: 400 }),
        };
    }

    return {
        scope: {
            storeId: scope.storeScope.documentId,
            tenantId: scope.tenantScope.documentId,
        },
    };
}

const getHandler = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const authorization = await authorize(request, session);
    if ("response" in authorization) return authorization.response;

    try {
        const screen = await mutateDigitalScreenOwnerStateServer(authorization.scope);
        return NextResponse.json({ screen, success: true });
    } catch (error) {
        logRuntimeFailure("digital_screen_management_read_failed", error, {
            endpoint: request.nextUrl.pathname,
            storeIdLength: authorization.scope.storeId.length,
        });
        return NextResponse.json({ error: "Unable to load Digital Screens" }, { status: 500 });
    }
});

const postHandler = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const authorization = await authorize(request, session);
    if ("response" in authorization) return authorization.response;

    const bodyResult = await readBoundedJsonBody(request, MAX_BODY_BYTES, {
        invalidJsonMessage: "Invalid request",
        invalidRequestMessage: "Invalid request",
        tooLargeMessage: "Invalid request",
    });
    if (bodyResult.ok === false) return bodyResult.response;

    const parsed = MutationSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    try {
        const screen = await mutateDigitalScreenOwnerStateServer(
            authorization.scope,
            parsed.data as DigitalScreenManagementMutation,
        );
        return NextResponse.json({ screen, success: true });
    } catch (error) {
        logRuntimeFailure("digital_screen_management_mutation_failed", error, {
            action: parsed.data.action,
            endpoint: request.nextUrl.pathname,
            storeIdLength: authorization.scope.storeId.length,
        });
        return NextResponse.json({ error: "Unable to update Digital Screens" }, { status: 500 });
    }
});

export const GET = getHandler;
export const POST = postHandler;
