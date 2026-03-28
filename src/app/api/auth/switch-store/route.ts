export const dynamic = 'force-dynamic';
/**
 * POST /api/auth/switch-store — Switch active store context
 * @see __docs__/multi-outlet-consistency/store-onboarding-flow_impl.md §8.4
 */
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { admin } from "@lib/firebase/firebaseAdmin";
import { validateAPIInput } from "@lib/security/inputValidation";
import { secureError } from "@lib/security/secureLogger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "../../../../middleware/auth";

const schema = z.object({ targetStoreId: z.number().int().positive() });

export const POST = withAuth(async (request, session) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        return NextResponse.json({ error: "Multi-outlet disabled" }, { status: 403 });
    }
    const { tId: tenantId, sId: currentStoreId } = session;
    if (!tenantId) return NextResponse.json({ error: "Not onboarded" }, { status: 400 });

    try {
        const body = await request.json();
        const v = validateAPIInput(schema, body);
        if (!v.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        const { targetStoreId } = v.data;

        const db = admin.firestore();
        const callerStoreSnap = await db.doc(`${DB_COLLECTIONS.STORES}/${currentStoreId}`).get();
        if (!callerStoreSnap.exists || !callerStoreSnap.data()?.isMaster) {
            return NextResponse.json({ error: "Only master users can switch" }, { status: 403 });
        }

        const tenantSnap = await db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantId}`).get();
        const storesList = tenantSnap.data()?.storesList || [];
        const targetStore = storesList.find((s: any) => s.storeId === targetStoreId);
        if (!targetStore) {
            return NextResponse.json({ error: "Store not in tenant" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            targetStoreId,
            targetStoreName: targetStore.name,
            isMaster: targetStore.isMaster || false,
        });
    } catch (error) {
        secureError("[SwitchStore] Failed", error as Error, { tenantId });
        return NextResponse.json({ error: "Switch failed" }, { status: 500 });
    }
});
