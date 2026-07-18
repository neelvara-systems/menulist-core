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
import { requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import { buildTestPayload } from "@lib/posSync/payloadFormatter";
import { normalizePosSyncNumericDocumentId } from "@lib/posSync/posSyncDocumentId";
import { isPosSyncPinnedRequestTimeout, postPosSyncWebhook } from "@lib/posSync/pinnedWebhookRequest";
import {
    getPosSyncSecretRef,
    normalizePosSyncSecretVersion,
    resolvePosSyncSecretInTransaction,
} from "@lib/posSync/serverSecretStore";
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
    storeId: z.number().int().positive(),
    tenantId: z.number().int().positive(),
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

export const POST = withAuth(async (request, session) => {
    if (!FEATURE_FLAGS.ENABLE_POS_SYNC) {
        return NextResponse.json({ error: "Feature disabled" }, { status: 403 });
    }

    const bodyResult = await readBoundedJsonBody(request, POS_SYNC_ACTION_MAX_BODY_BYTES, {
        invalidJsonMessage: "Invalid input",
    });
    if (bodyResult.ok === false) return bodyResult.response;
    const validation = validateAPIInput(schema, bodyResult.data);
    if (!validation.success) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { storeId, tenantId } = validation.data;
    const tenantScope = normalizePosSyncNumericDocumentId(tenantId);
    const storeScope = normalizePosSyncNumericDocumentId(storeId);
    if (!tenantScope || !storeScope) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const storeDocumentId = storeScope.documentId;
    const tenantDocumentId = tenantScope.documentId;

    if (!verifyTenantAccess(session, tenantId, storeId, request)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const storeRateLimitHash = hashPublicRateLimitValue(`${tenantDocumentId}:${storeDocumentId}`);
    const rlResult = await checkRateLimit({
        key: `pos-test:${storeRateLimitHash}`,
        limit: 10,
        window: 60,
        failClosedOnProviderError: true,
    });
    if (!rlResult.allowed) {
        const providerUnavailable = rlResult.reason === 'provider_unavailable';
        return NextResponse.json(
            { error: providerUnavailable ? 'Service temporarily unavailable' : 'Too many requests' },
            {
                status: providerUnavailable ? 503 : 429,
                headers: {
                    'Retry-After': String(Math.max(Math.ceil((rlResult.resetAt - Date.now()) / 1000), 1)),
                },
            },
        );
    }

    try {
        const db = admin.firestore();
        const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId);
        const storeDoc = await storeRef.get();
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
        if (!posSync?.enabled || !posSync?.webhookUrl) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }
        let connectionSecretVersion = normalizePosSyncSecretVersion(posSync.secretVersion);

        const updateConnectionStatusIfCurrent = async (success: boolean) => {
            await db.runTransaction(async (transaction) => {
                const freshDoc = await transaction.get(storeRef);
                if (!freshDoc.exists) return;
                const freshStore = freshDoc.data();
                const freshPermissionError = requireAnyStorePermissionForStoreData(
                    request,
                    session,
                    freshStore,
                    [PERMISSIONS.MANAGE_INTEGRATIONS],
                    "POS sync",
                    storeId,
                    tenantId,
                );
                const currentPosSync = freshStore?.posSync;
                if (
                    freshPermissionError
                    || !currentPosSync?.enabled
                    || String(currentPosSync.webhookUrl || '') !== String(posSync.webhookUrl)
                    || normalizePosSyncSecretVersion(currentPosSync.secretVersion) !== connectionSecretVersion
                ) return;

                transaction.update(storeRef, success ? {
                    'posSync.status': 'healthy',
                    'posSync.lastStatus': 'success',
                    'posSync.lastError': '',
                    'posSync.consecutiveFailures': 0,
                } : {
                    'posSync.status': 'connection_issue',
                    'posSync.lastStatus': 'failed',
                    'posSync.lastError': POS_SYNC_CONNECTION_ISSUE_MESSAGE,
                    'posSync.consecutiveFailures': POS_SYNC_CONNECTION_ISSUE_FAILURE_THRESHOLD,
                });
            });
        };

        const webhookValidation = validatePosSyncWebhookUrl(String(posSync.webhookUrl));
        if (!webhookValidation.valid || !webhookValidation.normalizedUrl) {
            logSecurityDiagnostic(POS_SYNC_INVALID_WEBHOOK_URL, {
                ...buildPosSyncSecurityContext(storeId, tenantId),
                ...getBoundedSecurityStringContext('validationError', webhookValidation.error),
            });
            await updateConnectionStatusIfCurrent(false);
            return NextResponse.json({
                success: false,
                statusCode: null,
                responseTime: 0,
                error: POS_SYNC_CONNECTION_ISSUE_MESSAGE,
            });
        }

        const networkValidation = await validatePosSyncWebhookNetworkTarget(webhookValidation.normalizedUrl);
        if (!networkValidation.valid || !networkValidation.approvedAddresses?.length) {
            logSecurityDiagnostic(POS_SYNC_BLOCKED_WEBHOOK_TARGET, {
                ...buildPosSyncSecurityContext(storeId, tenantId),
                addressCount: networkValidation.addressCount,
                ...getBoundedSecurityStringContext('networkError', networkValidation.error),
                ...getBoundedSecurityStringContext('networkErrorName', networkValidation.errorName),
            });
            await updateConnectionStatusIfCurrent(false);
            return NextResponse.json({
                success: false,
                statusCode: null,
                responseTime: 0,
                error: POS_SYNC_CONNECTION_ISSUE_MESSAGE,
            });
        }

        const secretRef = getPosSyncSecretRef(db, tenantDocumentId, storeDocumentId);
        const connectionClaim = await db.runTransaction(async (transaction) => {
            const [freshStoreDoc, secretDoc] = await Promise.all([
                transaction.get(storeRef),
                transaction.get(secretRef),
            ]);
            if (!freshStoreDoc.exists) return null;
            const freshStore = freshStoreDoc.data();
            const freshPermissionError = requireAnyStorePermissionForStoreData(
                request,
                session,
                freshStore,
                [PERMISSIONS.MANAGE_INTEGRATIONS],
                "POS sync",
                storeId,
                tenantId,
            );
            if (freshPermissionError) return null;
            const freshPosSync = freshStore?.posSync;
            const freshWebhookValidation = validatePosSyncWebhookUrl(String(freshPosSync?.webhookUrl || ''));
            if (
                !freshPosSync?.enabled
                || !freshWebhookValidation.valid
                || freshWebhookValidation.normalizedUrl !== webhookValidation.normalizedUrl
            ) return null;

            const secret = resolvePosSyncSecretInTransaction({
                transaction,
                storeRef,
                storeData: freshStore || {},
                secretRef,
                secretSnapshot: secretDoc,
                storeId,
                tenantId,
            });
            if (!secret) return null;
            return {
                currency: freshStore?.currencyCode || freshStore?.currency || 'INR',
                secret: secret.secret,
                secretVersion: secret.version,
            };
        });
        if (!connectionClaim) {
            return NextResponse.json({ error: "Connection changed" }, { status: 409 });
        }
        connectionSecretVersion = connectionClaim.secretVersion;

        const testPayload = buildTestPayload(storeId, tenantId, connectionClaim.currency);
        const rawBody = JSON.stringify(testPayload);
        const timestamp = Math.floor(Date.now() / 1000);
        const deliveryId = generateDeliveryId();
        const signature = signPayload(rawBody, connectionClaim.secret, timestamp);

        const startTime = Date.now();

        try {
            const response = await postPosSyncWebhook({
                approvedAddresses: networkValidation.approvedAddresses,
                normalizedUrl: webhookValidation.normalizedUrl,
                timeoutMs: WEBHOOK_TIMEOUT_MS,
                headers: {
                    'Content-Type': 'application/json',
                    'X-MenuList-Signature': signature,
                    'X-MenuList-Event': 'test.ping',
                    'X-MenuList-Version': '0',
                    'X-MenuList-Timestamp': String(timestamp),
                    'X-MenuList-Delivery-Id': deliveryId,
                },
                body: rawBody,
            });

            const responseTime = Date.now() - startTime;

            if (response.ok) {
                await updateConnectionStatusIfCurrent(true);

                logSecurityDiagnostic(POS_SYNC_TEST_SUCCESS, {
                    ...buildPosSyncSecurityContext(storeId, tenantId),
                    responseTime,
                });

                return NextResponse.json({
                    success: true,
                    statusCode: response.statusCode,
                    responseTime,
                });
            }

            logSecurityDiagnostic(POS_SYNC_TEST_HTTP_FAILED, {
                ...buildPosSyncSecurityContext(storeId, tenantId),
                responseStatusCode: response.statusCode,
                responseTime,
            });
            await updateConnectionStatusIfCurrent(false);
            return NextResponse.json({
                success: false,
                statusCode: response.statusCode,
                responseTime,
                error: POS_SYNC_CONNECTION_ISSUE_MESSAGE,
            });
        } catch (fetchError: unknown) {
            const responseTime = Date.now() - startTime;

            const isTimeout = isPosSyncPinnedRequestTimeout(fetchError);
            const failureCode = isTimeout ? POS_SYNC_TEST_TIMEOUT : POS_SYNC_TEST_CONNECTION_FAILED;
            logSecurityFailure(failureCode, fetchError, {
                ...buildPosSyncSecurityContext(storeId, tenantId),
                responseTime,
                timedOut: isTimeout,
            });
            await updateConnectionStatusIfCurrent(false);
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
