export const dynamic = 'force-dynamic';
/**
 * POST /api/pos-sync/test — Test webhook connectivity
 *
 * Sends a test.ping payload to the store's configured webhook URL.
 * Returns success/failure with response time.
 *
 * @see __docs__/pos-webhook-sync/pos-webhook-sync_impl.md §4.1
 */

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { admin } from "@lib/firebase/firebaseAdmin";
import { requireAnyStorePermission, requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import { buildTestPayload } from "@lib/posSync/payloadFormatter";
import { validatePosSyncWebhookNetworkTarget } from "@lib/posSync/serverWebhookTarget";
import { generateDeliveryId, signPayload } from "@lib/posSync/signature";
import { validatePosSyncWebhookUrl } from "@lib/posSync/webhookUrl";
import { checkRateLimit } from "@lib/rateLimit";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { getBoundedSecurityStringContext, logSecurityDiagnostic, logSecurityFailure } from "@lib/security/securityDiagnostics";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";

const schema = z.object({
    storeId: z.number().positive(),
    tenantId: z.number().positive(),
});

const WEBHOOK_TIMEOUT_MS = 5_000;
const POS_SYNC_ACTION_MAX_BODY_BYTES = 8 * 1024;
const POS_SYNC_CONNECTION_ISSUE_MESSAGE = 'Could not reach connected system';
const POS_SYNC_CONNECTION_ISSUE_FAILURE_THRESHOLD = 3;
const POS_SYNC_INVALID_WEBHOOK_URL = 'pos_sync_test_invalid_webhook_url';
const POS_SYNC_BLOCKED_WEBHOOK_TARGET = 'pos_sync_test_blocked_webhook_target';
const POS_SYNC_TEST_SUCCESS = 'pos_sync_test_success';
const POS_SYNC_TEST_HTTP_FAILED = 'pos_sync_test_http_failed';
const POS_SYNC_TEST_TIMEOUT = 'pos_sync_test_timeout';
const POS_SYNC_TEST_CONNECTION_FAILED = 'pos_sync_test_connection_failed';
const POS_SYNC_TEST_ROUTE_FAILED = 'pos_sync_test_route_failed';

function buildPosSyncSecurityContext(
    storeId?: unknown,
    tenantId?: unknown,
): Record<string, boolean | number | string | null | undefined> {
    return {
        ...getBoundedSecurityStringContext('storeId', storeId),
        ...getBoundedSecurityStringContext('tenantId', tenantId),
    };
}

function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
}

export const POST = withAuth(async (request, session) => {
    if (!FEATURE_FLAGS.ENABLE_POS_SYNC) {
        return NextResponse.json({ error: "Feature disabled" }, { status: 403 });
    }

    const permissionError = await requireAnyStorePermission(request, session, [PERMISSIONS.MANAGE_INTEGRATIONS], "POS sync");
    if (permissionError) return permissionError;

    const bodyResult = await readBoundedJsonBody(request, POS_SYNC_ACTION_MAX_BODY_BYTES, {
        invalidJsonMessage: "Invalid input",
    });
    if (bodyResult.ok === false) return bodyResult.response;
    const body = bodyResult.data as any;
    const validation = validateAPIInput(schema, body);
    if (!validation.success) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { storeId, tenantId } = validation.data;

    if (!verifyTenantAccess(session, tenantId, storeId, request)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const storeRateLimitHash = hashPublicRateLimitValue(storeId);
    const rlResult = await checkRateLimit({ key: `pos-test:${storeRateLimitHash}`, limit: 10, window: 60 });
    if (!rlResult.allowed) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    try {
        const db = admin.firestore();
        const storeDoc = await db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).get();
        if (!storeDoc.exists) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const store = storeDoc.data();
        const targetPermissionError = requireAnyStorePermissionForStoreData(
            request,
            session,
            store,
            [PERMISSIONS.MANAGE_INTEGRATIONS],
            "POS sync",
            storeId,
            tenantId,
        );
        if (targetPermissionError) return targetPermissionError;

        const posSync = store?.posSync;
        if (!posSync?.enabled || !posSync?.webhookUrl || !posSync?.webhookSecret) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(storeId));
        const markConnectionIssue = async () => {
            await storeRef.update({
                'posSync.status': 'connection_issue',
                'posSync.lastStatus': 'failed',
                'posSync.lastError': POS_SYNC_CONNECTION_ISSUE_MESSAGE,
                'posSync.consecutiveFailures': POS_SYNC_CONNECTION_ISSUE_FAILURE_THRESHOLD,
            });
        };

        const webhookValidation = validatePosSyncWebhookUrl(String(posSync.webhookUrl));
        if (!webhookValidation.valid || !webhookValidation.normalizedUrl) {
            logSecurityDiagnostic(POS_SYNC_INVALID_WEBHOOK_URL, {
                ...buildPosSyncSecurityContext(storeId, tenantId),
                ...getBoundedSecurityStringContext('validationError', webhookValidation.error),
            });
            await markConnectionIssue();
            return NextResponse.json({
                success: false,
                statusCode: null,
                responseTime: 0,
                error: POS_SYNC_CONNECTION_ISSUE_MESSAGE,
            });
        }

        const networkValidation = await validatePosSyncWebhookNetworkTarget(webhookValidation.normalizedUrl);
        if (!networkValidation.valid) {
            logSecurityDiagnostic(POS_SYNC_BLOCKED_WEBHOOK_TARGET, {
                ...buildPosSyncSecurityContext(storeId, tenantId),
                addressCount: networkValidation.addressCount,
                ...getBoundedSecurityStringContext('networkError', networkValidation.error),
                ...getBoundedSecurityStringContext('networkErrorName', networkValidation.errorName),
            });
            await markConnectionIssue();
            return NextResponse.json({
                success: false,
                statusCode: null,
                responseTime: 0,
                error: POS_SYNC_CONNECTION_ISSUE_MESSAGE,
            });
        }

        const testPayload = buildTestPayload(storeId, tenantId, store?.currencyCode || store?.currency || 'INR');
        const rawBody = JSON.stringify(testPayload);
        const timestamp = Math.floor(Date.now() / 1000);
        const deliveryId = generateDeliveryId();
        const signature = signPayload(rawBody, posSync.webhookSecret, timestamp);

        const startTime = Date.now();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

        try {
            const response = await fetch(webhookValidation.normalizedUrl, {
                method: 'POST',
                redirect: 'manual',
                headers: {
                    'Content-Type': 'application/json',
                    'X-MenuList-Signature': signature,
                    'X-MenuList-Event': 'test.ping',
                    'X-MenuList-Version': '0',
                    'X-MenuList-Timestamp': String(timestamp),
                    'X-MenuList-Delivery-Id': deliveryId,
                },
                body: rawBody,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;

            if (response.ok) {
                await storeRef.update({
                    'posSync.status': 'healthy',
                    'posSync.lastStatus': 'success',
                    'posSync.lastError': '',
                    'posSync.consecutiveFailures': 0,
                });

                logSecurityDiagnostic(POS_SYNC_TEST_SUCCESS, {
                    ...buildPosSyncSecurityContext(storeId, tenantId),
                    responseTime,
                });

                return NextResponse.json({
                    success: true,
                    statusCode: response.status,
                    responseTime,
                });
            }

            logSecurityDiagnostic(POS_SYNC_TEST_HTTP_FAILED, {
                ...buildPosSyncSecurityContext(storeId, tenantId),
                responseStatusCode: response.status,
                responseTime,
            });
            await markConnectionIssue();
            return NextResponse.json({
                success: false,
                statusCode: response.status,
                responseTime,
                error: POS_SYNC_CONNECTION_ISSUE_MESSAGE,
            });
        } catch (fetchError: unknown) {
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;

            const isTimeout = isAbortError(fetchError);
            const failureCode = isTimeout ? POS_SYNC_TEST_TIMEOUT : POS_SYNC_TEST_CONNECTION_FAILED;
            logSecurityFailure(failureCode, fetchError, {
                ...buildPosSyncSecurityContext(storeId, tenantId),
                responseTime,
                timedOut: isTimeout,
            });
            await markConnectionIssue();
            return NextResponse.json({
                success: false,
                statusCode: null,
                responseTime,
                error: POS_SYNC_CONNECTION_ISSUE_MESSAGE,
            });
        }
    } catch (error) {
        logSecurityFailure(POS_SYNC_TEST_ROUTE_FAILED, error, buildPosSyncSecurityContext(storeId, tenantId));
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
});
