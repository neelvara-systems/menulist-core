export const dynamic = 'force-dynamic';
/**
 * POST /api/store/public-api-key — Generate or regenerate public API key
 *
 * Allows store owner to create a read-only API key for external systems
 * to pull business and menu data from MenuList.
 *
 * Actions:
 * - generate: Create new API key (or regenerate, invalidating old one)
 * - revoke: Remove API key entirely
 *
 * @see __docs__/platform-pull-api/platform-pull-api_impl.md
 */

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { admin } from "@lib/firebase/firebaseAdmin";
import { hashApiKey } from "@lib/publicApi/auth";
import { checkRateLimit } from "@lib/rateLimit";
import { secureLog } from "@lib/security/secureLogger";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "../../../../middleware/auth";

const RequestSchema = z.object({
    action: z.enum(['generate', 'revoke']),
});

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_PUBLIC_API) {
        return NextResponse.json({ error: "Feature disabled" }, { status: 403 });
    }

    const { tId: tenantId, sId: storeId } = session;
    if (!tenantId || !storeId) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }

    const rlResult = await checkRateLimit({ key: `api-key-mgmt:${storeId}`, limit: 5, window: 60 });
    if (!rlResult.allowed) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const validation = RequestSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const db = admin.firestore();
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(storeId));

    try {
        if (validation.data.action === 'generate') {
            const apiKey = `ml_${randomUUID().replace(/-/g, '')}`;
            const apiKeyHash = hashApiKey(apiKey);
            await storeRef.update({
                publicApi: {
                    apiKeyHash,
                    keyPrefix: apiKey.slice(0, 7),
                    createdAt: new Date().toISOString(),
                },
            });

            secureLog('[Public API] Key generated', { storeId });
            return NextResponse.json({ apiKey });
        } else {
            // Revoke
            await storeRef.update({
                publicApi: admin.firestore.FieldValue.delete(),
            });

            secureLog('[Public API] Key revoked', { storeId });
            return NextResponse.json({ success: true });
        }
    } catch (error) {
        return NextResponse.json({ error: "Failed to manage API key" }, { status: 500 });
    }
});
