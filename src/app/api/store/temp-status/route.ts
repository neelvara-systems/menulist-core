export const dynamic = 'force-dynamic';
/**
 * Temporary Status API
 * 
 * POST /api/store/temp-status — Set or clear temporary status on a store
 * 
 * Sets a temporary banner ("Closed today", "Opening late", etc.) on the
 * store's public pages (OBP + digital menu) with auto-expiry.
 * 
 * @see __docs__/temp-status-layer/temp-status-layer_impl.md
 */
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { admin } from "@lib/firebase/firebaseAdmin";
import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import { requireAnyStorePermission } from "@lib/permissions/server";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { touchDigitalScreenContentVersionForStoreServer } from "@lib/screen/serverScreenInvalidation";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { getSafeZodValidationDetails } from "@lib/security/inputValidation";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { z } from "zod";
import { withAuth } from "../../../../middleware/auth";

const TEMP_STATUS_TYPES = ['closed_today', 'opening_late', 'closing_early', 'kitchen_closed', 'special_menu', 'custom'] as const;

const SetStatusSchema = z.object({
    action: z.literal('set'),
    type: z.enum(TEMP_STATUS_TYPES),
    message: z.string().max(100).optional(),
    expiresAt: z.string().datetime({ message: "expiresAt must be a valid ISO 8601 datetime" }),
});

const ClearStatusSchema = z.object({
    action: z.literal('clear'),
});

const RequestSchema = z.discriminatedUnion('action', [SetStatusSchema, ClearStatusSchema]);
const TEMP_STATUS_ACTION_MAX_BODY_BYTES = 4 * 1024;

/**
 * POST /api/store/temp-status
 * 
 * Body (set): { action: 'set', type: 'closed_today' | ..., message?: string, expiresAt: ISO string }
 * Body (clear): { action: 'clear' }
 */
export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_TEMP_STATUS) {
        return NextResponse.json({ error: "Feature disabled" }, { status: 403 });
    }

    const { tId: tenantId, sId: storeId, uId: userId } = session;
    if (!tenantId || !storeId) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }

    const permissionError = await requireAnyStorePermission(
        request,
        session,
        [PERMISSIONS.MANAGE_STORE, PERMISSIONS.MANAGE_PUBLIC_PRESENCE],
        "temporary status",
    );
    if (permissionError) return permissionError;

    const rateLimitConfig = getRateLimitForFeature('DATA_WRITE');
    const userRateLimitHash = hashPublicRateLimitValue(userId || session.user?.id || 'unknown');
    const storeRateLimitHash = hashPublicRateLimitValue(storeId);
    const rateLimitResult = await checkRateLimit({
        key: `temp-status:${userRateLimitHash}:${storeRateLimitHash}`,
        ...rateLimitConfig,
    });
    if (!rateLimitResult.allowed) {
        return NextResponse.json({
            error: "Too many requests. Please try again later.",
            resetAt: rateLimitResult.resetAt,
        }, { status: 429 });
    }

    const bodyResult = await readBoundedJsonBody(request, TEMP_STATUS_ACTION_MAX_BODY_BYTES, {
        invalidJsonMessage: "Invalid input",
    });
    if (bodyResult.ok === false) return bodyResult.response;
    const body = bodyResult.data;
    const validation = RequestSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            { error: "Invalid input", details: getSafeZodValidationDetails(validation.error) },
            { status: 400 }
        );
    }

    const db = admin.firestore();
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(storeId));

    try {
        if (validation.data.action === 'set') {
            const { type, message, expiresAt } = validation.data;

            // Validate expiry is in the future
            if (new Date(expiresAt).getTime() <= Date.now()) {
                return NextResponse.json(
                    { error: "Expiry time must be in the future" },
                    { status: 400 }
                );
            }

            // Default messages for predefined types
            const defaultMessages: Record<string, string> = {
                closed_today: 'Closed today',
                opening_late: 'Opening late today',
                closing_early: 'Closing early today',
                kitchen_closed: 'Kitchen is closed',
                special_menu: 'Special menu available today',
            };

            const finalMessage = type === 'custom'
                ? (message || 'Temporary notice')
                : (message || defaultMessages[type] || type);

            await storeRef.update({
                tempStatus: {
                    type,
                    message: finalMessage,
                    expiresAt,
                    createdAt: new Date().toISOString(),
                    createdBy: userId || null,
                },
            });
        } else {
            // Clear: remove tempStatus field
            await storeRef.update({
                tempStatus: admin.firestore.FieldValue.delete(),
            });
        }

        // Invalidate public menu/OBP cache so customers see the new status immediately.
        revalidateTag(`menu-store-${storeId}`);
        revalidateTag(`store-${storeId}`);
        revalidateTag('client-stores');
        revalidateTag('screen-data');
        await touchDigitalScreenContentVersionForStoreServer(storeId, 'storeTempStatus');
        await invalidateOwnerBusinessAssistantPacketCache({
            tId: tenantId,
            sId: storeId,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logRuntimeFailure("store_temp_status_update_failed", error, {
            ...getBoundedRuntimeStringContext("tenantId", tenantId),
            ...getBoundedRuntimeStringContext("storeId", storeId),
            ...getBoundedRuntimeStringContext("userId", userId || session.user?.id),
            action: validation.data.action,
            statusType: validation.data.action === "set" ? validation.data.type : undefined,
            messagePresent: validation.data.action === "set" ? Boolean(validation.data.message) : undefined,
            ...getBoundedRuntimeStringContext(
                "expiresAt",
                validation.data.action === "set" ? validation.data.expiresAt : undefined,
            ),
        });
        return NextResponse.json(
            { error: "Failed to update status" },
            { status: 500 }
        );
    }
});
