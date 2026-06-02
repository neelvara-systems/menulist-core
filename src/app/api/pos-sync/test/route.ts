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
import { requireAnyStorePermission } from "@lib/permissions/server";
import { buildTestPayload } from "@lib/posSync/payloadFormatter";
import { generateDeliveryId, signPayload } from "@lib/posSync/signature";
import { checkRateLimit } from "@lib/rateLimit";
import { validateAPIInput } from "@lib/security/inputValidation";
import { secureError, secureLog } from "@lib/security/secureLogger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const schema = z.object({
    storeId: z.number().positive(),
    tenantId: z.number().positive(),
});

const WEBHOOK_TIMEOUT_MS = 5_000;

export const POST = withAuth(async (request, session) => {
    if (!FEATURE_FLAGS.ENABLE_POS_SYNC) {
        return NextResponse.json({ error: "Feature disabled" }, { status: 403 });
    }

    const permissionError = await requireAnyStorePermission(request, session, [PERMISSIONS.MANAGE_INTEGRATIONS], "POS sync");
    if (permissionError) return permissionError;

    const body = await request.json();
    const validation = validateAPIInput(schema, body);
    if (!validation.success) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { storeId, tenantId } = validation.data;

    if (!verifyTenantAccess(session, tenantId, storeId, request)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rlResult = await checkRateLimit({ key: `pos-test:${storeId}`, limit: 10, window: 60 });
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
        const posSync = store?.posSync;
        if (!posSync?.webhookUrl || !posSync?.webhookSecret) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
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
            const response = await fetch(posSync.webhookUrl, {
                method: 'POST',
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
                await db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).update({
                    'posSync.status': 'healthy',
                    'posSync.lastStatus': 'success',
                    'posSync.lastError': '',
                });

                secureLog('[POS Sync] Test webhook success', { storeId, responseTime });

                return NextResponse.json({
                    success: true,
                    statusCode: response.status,
                    responseTime,
                });
            }

            return NextResponse.json({
                success: false,
                statusCode: response.status,
                responseTime,
                error: `Webhook returned ${response.status}`,
            });
        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;

            const isTimeout = fetchError?.name === 'AbortError';
            return NextResponse.json({
                success: false,
                statusCode: null,
                responseTime,
                error: isTimeout ? 'Webhook timed out (5s)' : 'Could not reach webhook URL',
            });
        }
    } catch (error) {
        secureError('[POS Sync] Test webhook error', error as Error, { storeId });
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
});
