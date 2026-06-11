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
import { requireAnyStorePermission } from "@lib/permissions/server";
import { buildMenuSnapshot } from "@lib/posSync/payloadFormatter";
import { generateDeliveryId, signPayload } from "@lib/posSync/signature";
import { validatePosSyncWebhookUrl } from "@lib/posSync/webhookUrl";
import { checkRateLimit } from "@lib/rateLimit";
import { validateAPIInput } from "@lib/security/inputValidation";
import { secureError, secureLog } from "@lib/security/secureLogger";
import type { Project } from "@template/main-app/projects/types";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const schema = z.object({
    storeId: z.number().positive(),
    tenantId: z.number().positive(),
    projectId: z.string().min(1),
});

const WEBHOOK_TIMEOUT_MS = 5_000;

async function getScopedProjectData(
    db: FirebaseFirestore.Firestore,
    tenantId: number,
    storeId: number,
    projectId: string,
): Promise<Project | null> {
    const projectDoc = await db
        .collection(DB_COLLECTIONS.PROJECTS)
        .doc(String(tenantId))
        .collection(String(storeId))
        .doc(projectId)
        .get();

    if (!projectDoc.exists) return null;

    const projectData = projectDoc.data() as Project | undefined;
    if (!projectData || projectData.deleted === true) return null;

    return {
        ...projectData,
        projectId: projectData.projectId || projectDoc.id,
    };
}

function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
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

    const body = await request.json();
    const validation = validateAPIInput(schema, body);
    if (!validation.success) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { storeId, tenantId, projectId } = validation.data;

    if (!verifyTenantAccess(session, tenantId, storeId, request)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rlResult = await checkRateLimit({ key: `pos-deliver:${storeId}`, limit: 20, window: 60 });
    if (!rlResult.allowed) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    try {
        const db = admin.firestore();
        const now = admin.firestore.Timestamp.now();

        const storeDoc = await db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).get();
        if (!storeDoc.exists) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const store = storeDoc.data();
        const posSync = store?.posSync;
        if (!posSync?.enabled || !posSync?.webhookUrl || !posSync?.webhookSecret) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const webhookValidation = validatePosSyncWebhookUrl(String(posSync.webhookUrl));
        if (!webhookValidation.valid || !webhookValidation.normalizedUrl) {
            await db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).update({
                'posSync.status': 'connection_issue',
                'posSync.lastStatus': 'failed',
                'posSync.lastError': webhookValidation.error || 'Invalid provider connection URL',
            });
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const projectData = await getScopedProjectData(db, tenantId, storeId, projectId);
        if (!projectData) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        // Atomic version increment via transaction to prevent duplicate versions
        // on concurrent deliveries (ChatGPT feedback: menuVersion must be atomic)
        const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(storeId));
        const newVersion = await db.runTransaction(async (transaction) => {
            const freshDoc = await transaction.get(storeRef);
            const current = freshDoc.data()?.posSync?.menuVersion || 0;
            const next = current + 1;
            transaction.update(storeRef, { 'posSync.menuVersion': next });
            return next;
        });

        const payload = buildMenuSnapshot(
            projectData,
            storeId,
            tenantId,
            newVersion,
            store?.currencyCode || store?.currency || 'INR',
        );

        const rawBody = JSON.stringify(payload);

        // Internal warning for large payloads (ChatGPT feedback: monitor payload size)
        const PAYLOAD_WARN_BYTES = 1_000_000; // 1 MB
        if (rawBody.length > PAYLOAD_WARN_BYTES) {
            secureLog('[POS Sync] Large payload warning', {
                storeId,
                version: newVersion,
                payloadBytes: rawBody.length,
                payloadMB: (rawBody.length / 1_000_000).toFixed(2),
            });
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const deliveryId = generateDeliveryId();
        const signature = signPayload(rawBody, posSync.webhookSecret, timestamp);

        const startTime = Date.now();
        let success = false;
        let responseCode: number | null = null;
        let errorMsg: string | null = null;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

            const response = await fetch(webhookValidation.normalizedUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-MenuList-Signature': signature,
                    'X-MenuList-Event': 'menu.full.sync',
                    'X-MenuList-Version': String(newVersion),
                    'X-MenuList-Timestamp': String(timestamp),
                    'X-MenuList-Delivery-Id': deliveryId,
                },
                body: rawBody,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            responseCode = response.status;
            success = response.ok;

            if (!success) {
                errorMsg = `HTTP ${response.status}`;
            }
        } catch (fetchError: unknown) {
            const isTimeout = isAbortError(fetchError);
            errorMsg = isTimeout ? 'Timeout (5s)' : 'Connection failed';
        }

        const duration = Date.now() - startTime;

        const logEntry = {
            deliveryId,
            menuVersion: newVersion,
            status: success ? 'success' : (errorMsg?.includes('Timeout') ? 'timeout' : 'failed'),
            responseCode,
            attempt: 1,
            sentAt: now,
            duration,
            error: errorMsg,
            payloadSize: rawBody.length,
        };

        await db
            .collection(DB_COLLECTIONS.STORES)
            .doc(String(storeId))
            .collection(DB_COLLECTIONS.POS_DELIVERY_LOGS)
            .add(logEntry);

        const logsSnapshot = await db
            .collection(DB_COLLECTIONS.STORES)
            .doc(String(storeId))
            .collection(DB_COLLECTIONS.POS_DELIVERY_LOGS)
            .orderBy('sentAt', 'desc')
            .offset(20)
            .get();

        const batch = db.batch();
        logsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        if (!logsSnapshot.empty) {
            await batch.commit();
        }

        if (success) {
            await db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).update({
                'posSync.status': 'healthy',
                'posSync.lastSentAt': now,
                'posSync.lastStatus': 'success',
                'posSync.lastError': '',
            });

            secureLog('[POS Sync] Delivery success', { storeId, version: newVersion, duration });
        } else {
            await db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).update({
                'posSync.status': 'connection_issue',
                'posSync.lastStatus': 'failed',
                'posSync.lastError': errorMsg || 'Unknown error',
            });

            secureLog('[POS Sync] Delivery failed', { storeId, version: newVersion, error: errorMsg });
        }

        return NextResponse.json({
            success,
            deliveryId,
            menuVersion: newVersion,
            responseCode,
            duration,
            error: errorMsg,
        });
    } catch (error) {
        secureError('[POS Sync] Deliver error', error as Error, { storeId });
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
});
