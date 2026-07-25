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
import { runStorePublicTruthPostCommitEffects } from "@lib/cache/storePublicTruthPostCommit";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { admin } from "@lib/firebase/firebaseAdmin";
import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import {
    requireAnyStorePermissionForStoreData,
    resolveStorePermissionSessionScope,
} from "@lib/permissions/server";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { touchDigitalScreenContentVersionForStoreServer } from "@lib/screen/serverScreenInvalidation";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { getSafeZodValidationDetails } from "@lib/security/inputValidation";
import { isTempStatusMutationScopeCurrent } from "@lib/tempStatus/serverMutationScope";
import { normalizeTempStatusMessage, TEMP_STATUS_TYPES } from "@lib/tempStatus/statusBoundary";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { z } from "zod";
import { withAuth } from "../../../../middleware/auth";

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
const TEMP_STATUS_SESSION_DOCUMENT_ID_MAX_LENGTH = 160;

function normalizeSessionDocumentId(value: unknown): string | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    return documentId === raw
        && documentId.length > 0
        && documentId.length <= TEMP_STATUS_SESSION_DOCUMENT_ID_MAX_LENGTH
        && isValidFirestoreDocumentId(documentId)
        ? documentId
        : null;
}

class TempStatusScopeChangedError extends Error {
    constructor() {
        super('temp_status_scope_changed');
        this.name = 'TempStatusScopeChangedError';
    }
}

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

    const { tId: rawTenantId, sId: rawStoreId } = session;
    const rawUserId = session.uId || session.user?.id;
    const tenantId = normalizeSessionDocumentId(rawTenantId);
    const storeId = normalizeSessionDocumentId(rawStoreId);
    const userId = normalizeSessionDocumentId(rawUserId);
    const sessionScope = resolveStorePermissionSessionScope(session);
    if (
        !tenantId
        || !storeId
        || !sessionScope
        || sessionScope.tenantScope.documentId !== tenantId
        || sessionScope.storeScope.documentId !== storeId
    ) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }

    const rateLimitConfig = getRateLimitForFeature('DATA_WRITE');
    const userRateLimitHash = hashPublicRateLimitValue(userId || 'unknown');
    const storeRateLimitHash = hashPublicRateLimitValue(storeId);
    const rateLimitResult = await checkRateLimit({
        key: `temp-status:${userRateLimitHash}:${storeRateLimitHash}`,
        ...rateLimitConfig,
        failClosedOnProviderError: true,
    });
    if (!rateLimitResult.allowed) {
        const providerUnavailable = rateLimitResult.reason === 'provider_unavailable';
        return NextResponse.json(
            {
                error: providerUnavailable
                    ? "Temporary status is unavailable right now. Please try again in a minute."
                    : "Too many requests. Please try again later.",
                resetAt: rateLimitResult.resetAt,
            },
            {
                headers: { 'Retry-After': String(Math.max(1, Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000))) },
                status: providerUnavailable ? 503 : 429,
            },
        );
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
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeId);
    const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(tenantId);

    try {
        let storeUpdate: Record<string, unknown>;
        if (validation.data.action === 'set') {
            const { type, message, expiresAt } = validation.data;

            // Validate expiry is in the future
            if (new Date(expiresAt).getTime() <= Date.now()) {
                return NextResponse.json(
                    { error: "Expiry time must be in the future" },
                    { status: 400 }
                );
            }

            const finalMessage = normalizeTempStatusMessage(type, message);

            storeUpdate = {
                tempStatus: {
                    type,
                    message: finalMessage,
                    expiresAt,
                    createdAt: new Date().toISOString(),
                    createdBy: userId || null,
                },
            };
        } else {
            // Clear: remove tempStatus field
            storeUpdate = {
                tempStatus: admin.firestore.FieldValue.delete(),
            };
        }

        const transactionPermissionError = await db.runTransaction(async (transaction) => {
            const [freshStoreSnap, freshTenantSnap] = await Promise.all([
                transaction.get(storeRef),
                transaction.get(tenantRef),
            ]);
            const freshStore = freshStoreSnap.data();
            const freshTenant = freshTenantSnap.data();
            if (
                !freshStoreSnap.exists
                || !freshTenantSnap.exists
                || !isTempStatusMutationScopeCurrent({
                    store: freshStore,
                    tenant: freshTenant,
                    tenantDocumentId: tenantId,
                })
            ) {
                throw new TempStatusScopeChangedError();
            }

            const freshPermissionError = requireAnyStorePermissionForStoreData(
                request,
                session,
                freshStore,
                [PERMISSIONS.MANAGE_STORE, PERMISSIONS.MANAGE_PUBLIC_PRESENCE],
                "temporary status",
                storeId,
                tenantId,
            );
            if (freshPermissionError) return freshPermissionError;

            transaction.update(storeRef, storeUpdate);
            return null;
        });
        if (transactionPermissionError) return transactionPermissionError;

        const postCommit = await runStorePublicTruthPostCommitEffects({
            chunkSize: 1,
            deps: {
                invalidateAssistant: (targetStoreId, targetTenantId) => invalidateOwnerBusinessAssistantPacketCache({
                    sId: targetStoreId,
                    tId: targetTenantId,
                }),
                revalidate: (tag) => revalidateTag(tag, { expire: 0 }),
                touchScreen: (targetStoreId) => touchDigitalScreenContentVersionForStoreServer(targetStoreId, 'storeTempStatus'),
            },
            storeIds: [storeId],
            tenantId,
        });
        if (postCommit.effectsPending) {
            logRuntimeFailure('store_temp_status_post_commit_failed', postCommit.firstError, {
                ...getBoundedRuntimeStringContext('tenantId', tenantId),
                ...getBoundedRuntimeStringContext('storeId', storeId),
                action: validation.data.action,
                failedEffectCount: postCommit.failedEffectCount,
            });
        }

        return NextResponse.json({ effectsPending: postCommit.effectsPending, success: true });
    } catch (error) {
        if (error instanceof TempStatusScopeChangedError) {
            logRuntimeFailure("store_temp_status_scope_changed", error, {
                ...getBoundedRuntimeStringContext("tenantId", tenantId),
                ...getBoundedRuntimeStringContext("storeId", storeId),
                action: validation.data.action,
            });
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
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
