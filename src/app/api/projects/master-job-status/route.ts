export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { admin } from "@lib/firebase/firebaseAdmin";
import { requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import { secureError } from "@lib/security/secureLogger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const ACTIVE_MASTER_JOB_STATUSES = ["pending", "processing", "preview_ready"] as const;

const projectIdSchema = z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/);
const querySchema = z.object({
    masterProjectId: projectIdSchema,
    outletProjectId: projectIdSchema.optional(),
});

const parseSafeProjectId = (projectId: string) => {
    const parts = projectId.split("-");
    const parsed = {
        tId: Number(parts[0]),
        sId: Number(parts[parts.length - 1]),
    };
    if (!Number.isSafeInteger(parsed.tId) || parsed.tId <= 0 || !Number.isSafeInteger(parsed.sId) || parsed.sId <= 0) {
        return null;
    }
    return parsed;
};

export const GET = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        return NextResponse.json({ error: "Multi-outlet disabled" }, { status: 403 });
    }

    try {
        const validation = querySchema.safeParse({
            masterProjectId: request.nextUrl.searchParams.get("masterProjectId"),
            outletProjectId: request.nextUrl.searchParams.get("outletProjectId") || undefined,
        });
        if (!validation.success) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        const { masterProjectId, outletProjectId } = validation.data;
        const masterRef = parseSafeProjectId(masterProjectId);
        if (!masterRef) {
            return NextResponse.json({ error: "Invalid project reference" }, { status: 400 });
        }

        const tenantId = masterRef.tId;
        const masterStoreId = masterRef.sId;
        const sessionStoreId = Number(session.sId || session.user?.storeId);
        if (!sessionStoreId || !verifyTenantAccess(session, tenantId, sessionStoreId, request)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const db = admin.firestore();
        const sessionStoreSnap = await db.doc(`${DB_COLLECTIONS.STORES}/${sessionStoreId}`).get();
        const sessionStore = sessionStoreSnap.data();
        if (!sessionStoreSnap.exists || Number(sessionStore?.tenantId) !== tenantId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const permissionError = requireAnyStorePermissionForStoreData(
            request,
            session,
            sessionStore,
            [PERMISSIONS.MANAGE_MENU],
            "Master extraction status",
            sessionStoreId,
            tenantId,
        );
        if (permissionError) return permissionError;

        if (sessionStoreId !== masterStoreId && sessionStore?.isMaster !== true) {
            if (!outletProjectId) {
                return NextResponse.json({ error: "Outlet project required" }, { status: 400 });
            }

            const outletRef = parseSafeProjectId(outletProjectId);
            if (!outletRef || outletRef.tId !== tenantId || outletRef.sId !== sessionStoreId) {
                return NextResponse.json({ error: "Invalid outlet project reference" }, { status: 400 });
            }

            const outletProjectSnap = await db
                .doc(`${DB_COLLECTIONS.PROJECTS}/${tenantId}/${sessionStoreId}/${outletProjectId}`)
                .get();
            if (!outletProjectSnap.exists || outletProjectSnap.data()?.masterProjectId !== masterProjectId) {
                return NextResponse.json({ error: "Linked outlet project not found" }, { status: 404 });
            }
        }

        const jobsSnap = await db
            .collection(DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS)
            .where("projectId", "==", masterProjectId)
            .where("status", "in", [...ACTIVE_MASTER_JOB_STATUSES])
            .limit(1)
            .get();

        if (jobsSnap.empty) {
            return NextResponse.json({ isMasterJobActive: false });
        }

        const jobDoc = jobsSnap.docs[0];
        const jobData = jobDoc.data();
        const status = ACTIVE_MASTER_JOB_STATUSES.includes(jobData.status)
            ? jobData.status
            : undefined;

        return NextResponse.json({
            isMasterJobActive: Boolean(status),
            masterJobId: jobDoc.id,
            masterJobStatus: status,
        });
    } catch (error) {
        secureError("[Projects] Master job status failed", error as Error, {
            tenantId: session?.tId,
            storeId: session?.sId,
        });
        return NextResponse.json({ error: "Master job status failed" }, { status: 500 });
    }
});
