export const dynamic = 'force-dynamic';
/**
 * POST /api/pos-sync/deliver — Deliver menu snapshot to POS webhook
 *
 * Called by the client-side debounce after menu edits.
 * Builds full menu snapshot, signs it, and POSTs to webhook URL.
 * Handles retry logic and delivery logging.
 *
 * @see __docs__/pos-webhook-sync/pos-webhook-sync_impl.md §1
 */

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { admin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { requireAnyStorePermission, requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import {
    getNextPosSyncMenuVersion,
    POS_SYNC_CONNECTION_ISSUE_FAILURE_THRESHOLD,
    resolvePosSyncDeliveryOutcome,
} from "@lib/posSync/deliveryState";
import { buildMenuSnapshot } from "@lib/posSync/payloadFormatter";
import { normalizePosSyncNumericDocumentId } from "@lib/posSync/posSyncDocumentId";
import { isPosSyncPinnedRequestTimeout, postPosSyncWebhook } from "@lib/posSync/pinnedWebhookRequest";
import { validatePosSyncWebhookNetworkTarget } from "@lib/posSync/serverWebhookTarget";
import { generateDeliveryId, signPayload } from "@lib/posSync/signature";
import { validatePosSyncWebhookUrl } from "@lib/posSync/webhookUrl";
import { checkRateLimit } from "@lib/rateLimit";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { getBoundedSecurityStringContext, logSecurityDiagnostic, logSecurityFailure } from "@lib/security/securityDiagnostics";
import type { Project } from "@template/main-app/projects/types";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { createHash } from "node:crypto";

const schema = z.object({
    storeId: z.number().int().positive(),
    tenantId: z.number().int().positive(),
    projectId: z.string().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/).refine(isValidFirestoreDocumentId, 'Invalid project ID'),
});

const WEBHOOK_TIMEOUT_MS = 5_000;
const POS_SYNC_ACTION_MAX_BODY_BYTES = 8 * 1024;
const POS_SYNC_DELIVERY_LOG_RETENTION_LIMIT = 20;
const POS_SYNC_DELIVERY_LOG_RETENTION_SCAN_LIMIT = 100;
const POS_SYNC_CONNECTION_ISSUE_MESSAGE = 'Could not reach connected system';
const POS_SYNC_INVALID_WEBHOOK_URL = 'pos_sync_invalid_webhook_url';
const POS_SYNC_BLOCKED_WEBHOOK_TARGET = 'pos_sync_blocked_webhook_target';
const POS_SYNC_LARGE_PAYLOAD_WARNING = 'pos_sync_large_payload_warning';
const POS_SYNC_WEBHOOK_HTTP_FAILED = 'pos_sync_webhook_http_failed';
const POS_SYNC_WEBHOOK_TIMEOUT = 'pos_sync_webhook_timeout';
const POS_SYNC_WEBHOOK_CONNECTION_FAILED = 'pos_sync_webhook_connection_failed';
const POS_SYNC_DELIVERY_SUCCESS = 'pos_sync_delivery_success';
const POS_SYNC_DELIVERY_FAILED = 'pos_sync_delivery_failed';
const POS_SYNC_DELIVERY_LOG_RETENTION_FAILED = 'pos_sync_delivery_log_retention_failed';
const POS_SYNC_DELIVERY_ROUTE_FAILED = 'pos_sync_delivery_route_failed';

function buildPosSyncSecurityContext(
    storeId?: unknown,
    tenantId?: unknown,
    projectId?: unknown,
): Record<string, boolean | number | string | null | undefined> {
    return {
        ...getBoundedSecurityStringContext('storeId', storeId),
        ...getBoundedSecurityStringContext('tenantId', tenantId),
        ...getBoundedSecurityStringContext('projectId', projectId),
    };
}

async function getScopedProjectData(
    db: FirebaseFirestore.Firestore,
    tenantDocumentId: string,
    storeDocumentId: string,
    projectId: string,
): Promise<Project | null> {
    const projectDoc = await db
        .collection(DB_COLLECTIONS.PROJECTS)
        .doc(tenantDocumentId)
        .collection(storeDocumentId)
        .doc(projectId)
        .get();

    if (!projectDoc.exists) return null;

    const projectData = projectDoc.data() as Project | undefined;
    if (!projectData || projectData.deleted === true) return null;

    return {
        ...projectData,
        projectId: projectDoc.id,
    };
}

export const POST = withAuth(async (request, session) => {
    if (!FEATURE_FLAGS.ENABLE_POS_SYNC) {
        return NextResponse.json({ error: "Feature disabled" }, { status: 403 });
    }

    const permissionError = await requireAnyStorePermission(
        request,
        session,
        [PERMISSIONS.MANAGE_INTEGRATIONS, PERMISSIONS.PUBLISH_MENU],
        "POS delivery",
    );
    if (permissionError) return permissionError;

    const bodyResult = await readBoundedJsonBody(request, POS_SYNC_ACTION_MAX_BODY_BYTES, {
        invalidJsonMessage: "Invalid input",
    });
    if (bodyResult.ok === false) return bodyResult.response;
    const validation = validateAPIInput(schema, bodyResult.data);
    if (!validation.success) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { storeId, tenantId, projectId } = validation.data;
    const tenantScope = normalizePosSyncNumericDocumentId(tenantId);
    const storeScope = normalizePosSyncNumericDocumentId(storeId);
    if (!tenantScope || !storeScope) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const tenantDocumentId = tenantScope.documentId;
    const storeDocumentId = storeScope.documentId;

    if (!verifyTenantAccess(session, tenantId, storeId, request)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const storeRateLimitHash = hashPublicRateLimitValue(`${tenantDocumentId}:${storeDocumentId}`);
    const rlResult = await checkRateLimit({ key: `pos-deliver:${storeRateLimitHash}`, limit: 20, window: 60 });
    if (!rlResult.allowed) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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
            [PERMISSIONS.MANAGE_INTEGRATIONS, PERMISSIONS.PUBLISH_MENU],
            "POS delivery",
            storeId,
            tenantId,
        );
        if (targetPermissionError) return targetPermissionError;

        const posSync = store?.posSync;
        if (!posSync?.enabled || !posSync?.webhookUrl || !posSync?.webhookSecret) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const markConnectionIssueIfCurrent = async () => {
            await db.runTransaction(async (transaction) => {
                const freshDoc = await transaction.get(storeRef);
                if (!freshDoc.exists) return;
                const freshStore = freshDoc.data();
                const freshPermissionError = requireAnyStorePermissionForStoreData(
                    request,
                    session,
                    freshStore,
                    [PERMISSIONS.MANAGE_INTEGRATIONS, PERMISSIONS.PUBLISH_MENU],
                    "POS delivery",
                    storeId,
                    tenantId,
                );
                const currentPosSync = freshStore?.posSync;
                if (
                    freshPermissionError
                    || !currentPosSync?.enabled
                    || String(currentPosSync.webhookUrl || '') !== String(posSync.webhookUrl)
                    || String(currentPosSync.webhookSecret || '') !== String(posSync.webhookSecret)
                ) return;

                transaction.update(storeRef, {
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
                ...buildPosSyncSecurityContext(storeId, tenantId, projectId),
                ...getBoundedSecurityStringContext('validationError', webhookValidation.error),
            });
            await markConnectionIssueIfCurrent();
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const networkValidation = await validatePosSyncWebhookNetworkTarget(webhookValidation.normalizedUrl);
        if (!networkValidation.valid || !networkValidation.approvedAddresses?.length) {
            logSecurityDiagnostic(POS_SYNC_BLOCKED_WEBHOOK_TARGET, {
                ...buildPosSyncSecurityContext(storeId, tenantId, projectId),
                addressCount: networkValidation.addressCount,
                ...getBoundedSecurityStringContext('networkError', networkValidation.error),
                ...getBoundedSecurityStringContext('networkErrorName', networkValidation.errorName),
            });
            await markConnectionIssueIfCurrent();
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const projectData = await getScopedProjectData(db, tenantDocumentId, storeDocumentId, projectId);
        if (!projectData) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        // Re-read permission and connection state while claiming the version. A
        // URL/secret/enable change after the initial read invalidates this attempt.
        const deliveryClaim = await db.runTransaction(async (transaction) => {
            const freshDoc = await transaction.get(storeRef);
            if (!freshDoc.exists) return null;
            const freshStore = freshDoc.data();
            const freshPermissionError = requireAnyStorePermissionForStoreData(
                request,
                session,
                freshStore,
                [PERMISSIONS.MANAGE_INTEGRATIONS, PERMISSIONS.PUBLISH_MENU],
                "POS delivery",
                storeId,
                tenantId,
            );
            if (freshPermissionError) return null;

            const currentPosSync = freshStore?.posSync;
            const currentWebhookValidation = validatePosSyncWebhookUrl(String(currentPosSync?.webhookUrl || ''));
            if (
                !currentPosSync?.enabled
                || !currentPosSync?.webhookSecret
                || currentPosSync.webhookSecret !== posSync.webhookSecret
                || !currentWebhookValidation.valid
                || currentWebhookValidation.normalizedUrl !== webhookValidation.normalizedUrl
            ) return null;

            const next = getNextPosSyncMenuVersion(currentPosSync.menuVersion);
            if (next === null) return null;
            transaction.update(storeRef, { 'posSync.menuVersion': next });
            return {
                currency: freshStore?.currencyCode || freshStore?.currency || 'INR',
                menuVersion: next,
                webhookSecret: String(currentPosSync.webhookSecret),
                webhookUrl: String(currentPosSync.webhookUrl),
            };
        });
        if (!deliveryClaim) {
            return NextResponse.json({ error: "Connection changed" }, { status: 409 });
        }
        const newVersion = deliveryClaim.menuVersion;

        const payload = buildMenuSnapshot(
            projectData,
            storeId,
            tenantId,
            newVersion,
            deliveryClaim.currency,
        );

        const rawBody = JSON.stringify(payload);
        const payloadBytes = Buffer.byteLength(rawBody, 'utf8');
        const payloadHash = createHash('sha256').update(rawBody).digest('hex');

        // Internal warning for large payloads (ChatGPT feedback: monitor payload size)
        const PAYLOAD_WARN_BYTES = 1_000_000; // 1 MB
        if (payloadBytes > PAYLOAD_WARN_BYTES) {
            logSecurityDiagnostic(POS_SYNC_LARGE_PAYLOAD_WARNING, {
                ...buildPosSyncSecurityContext(storeId, tenantId, projectId),
                menuVersion: newVersion,
                payloadBytes,
                payloadMB: (payloadBytes / 1_000_000).toFixed(2),
            });
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const deliveryId = generateDeliveryId();
        const signature = signPayload(rawBody, deliveryClaim.webhookSecret, timestamp);

        const startTime = Date.now();
        let success = false;
        let responseCode: number | null = null;
        let ownerError: string | null = null;
        let failureCode: string | null = null;
        let deliveryStatus: 'success' | 'failed' | 'timeout' = 'success';

        try {
            const response = await postPosSyncWebhook({
                approvedAddresses: networkValidation.approvedAddresses,
                normalizedUrl: webhookValidation.normalizedUrl,
                timeoutMs: WEBHOOK_TIMEOUT_MS,
                headers: {
                    'Content-Type': 'application/json',
                    'X-MenuList-Signature': signature,
                    'X-MenuList-Event': 'menu.full.sync',
                    'X-MenuList-Version': String(newVersion),
                    'X-MenuList-Timestamp': String(timestamp),
                    'X-MenuList-Delivery-Id': deliveryId,
                },
                body: rawBody,
            });

            responseCode = response.statusCode;
            success = response.ok;

            if (!success) {
                ownerError = POS_SYNC_CONNECTION_ISSUE_MESSAGE;
                failureCode = POS_SYNC_WEBHOOK_HTTP_FAILED;
                deliveryStatus = 'failed';
            }
        } catch (fetchError: unknown) {
            const isTimeout = isPosSyncPinnedRequestTimeout(fetchError);
            ownerError = POS_SYNC_CONNECTION_ISSUE_MESSAGE;
            failureCode = isTimeout ? POS_SYNC_WEBHOOK_TIMEOUT : POS_SYNC_WEBHOOK_CONNECTION_FAILED;
            deliveryStatus = isTimeout ? 'timeout' : 'failed';
            logSecurityFailure(failureCode, fetchError, {
                ...buildPosSyncSecurityContext(storeId, tenantId, projectId),
                menuVersion: newVersion,
                timedOut: isTimeout,
            });
        }

        const duration = Date.now() - startTime;

        const logEntry = {
            deliveryId,
            menuVersion: newVersion,
            status: success ? 'success' : deliveryStatus,
            responseCode,
            attempt: 1,
            sentAt: admin.firestore.Timestamp.now(),
            duration,
            error: ownerError,
            payloadSize: payloadBytes,
            payloadHash,
        };
        const deliveryLogsRef = storeRef.collection(DB_COLLECTIONS.POS_DELIVERY_LOGS);
        const deliveryLogRef = deliveryLogsRef.doc(deliveryId);

        await db.runTransaction(async (transaction) => {
            const freshDoc = await transaction.get(storeRef);
            transaction.set(deliveryLogRef, logEntry);
            if (!freshDoc.exists) return;
            const freshStore = freshDoc.data();
            const currentPosSync = freshStore?.posSync;
            if (
                !currentPosSync?.enabled
                || String(currentPosSync.webhookUrl || '') !== deliveryClaim.webhookUrl
                || String(currentPosSync.webhookSecret || '') !== deliveryClaim.webhookSecret
            ) return;

            const outcome = resolvePosSyncDeliveryOutcome({
                connectionIssueMessage: POS_SYNC_CONNECTION_ISSUE_MESSAGE,
                currentConsecutiveFailures: currentPosSync.consecutiveFailures,
                currentLastCompletedMenuVersion: currentPosSync.lastCompletedMenuVersion,
                currentStatus: currentPosSync.status,
                menuVersion: newVersion,
                success,
            });
            if (!outcome) return;

            if (success) {
                transaction.update(storeRef, {
                    'posSync.status': outcome.status,
                    'posSync.lastSentAt': admin.firestore.Timestamp.now(),
                    'posSync.lastStatus': outcome.lastStatus,
                    'posSync.lastError': outcome.lastError,
                    'posSync.consecutiveFailures': outcome.consecutiveFailures,
                    'posSync.lastCompletedMenuVersion': outcome.lastCompletedMenuVersion,
                });
                return;
            }

            transaction.update(storeRef, {
                'posSync.status': outcome.status,
                'posSync.lastStatus': outcome.lastStatus,
                'posSync.lastError': outcome.lastError,
                'posSync.consecutiveFailures': outcome.consecutiveFailures,
                'posSync.lastCompletedMenuVersion': outcome.lastCompletedMenuVersion,
            });
        });

        try {
            const logsSnapshot = await deliveryLogsRef
                .orderBy('sentAt', 'desc')
                .limit(POS_SYNC_DELIVERY_LOG_RETENTION_SCAN_LIMIT)
                .get();
            const excessLogs = logsSnapshot.docs.slice(POS_SYNC_DELIVERY_LOG_RETENTION_LIMIT);
            if (excessLogs.length > 0) {
                const batch = db.batch();
                excessLogs.forEach((doc) => batch.delete(doc.ref));
                await batch.commit();
            }
        } catch (retentionError) {
            logSecurityFailure(POS_SYNC_DELIVERY_LOG_RETENTION_FAILED, retentionError, {
                ...buildPosSyncSecurityContext(storeId, tenantId, projectId),
                deliveryIdLength: deliveryId.length,
                retentionLimit: POS_SYNC_DELIVERY_LOG_RETENTION_LIMIT,
                retentionScanLimit: POS_SYNC_DELIVERY_LOG_RETENTION_SCAN_LIMIT,
            });
        }

        if (success) {

            logSecurityDiagnostic(POS_SYNC_DELIVERY_SUCCESS, {
                ...buildPosSyncSecurityContext(storeId, tenantId, projectId),
                menuVersion: newVersion,
                duration,
            });
        } else {
            logSecurityDiagnostic(POS_SYNC_DELIVERY_FAILED, {
                ...buildPosSyncSecurityContext(storeId, tenantId, projectId),
                menuVersion: newVersion,
                duration,
                responseStatusCode: responseCode,
                failureCode,
            });
        }

        return NextResponse.json({
            success,
            deliveryId,
            menuVersion: newVersion,
            responseCode,
            duration,
            error: ownerError,
        });
    } catch (error) {
        logSecurityFailure(POS_SYNC_DELIVERY_ROUTE_FAILED, error, buildPosSyncSecurityContext(storeId, tenantId, projectId));
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
});
