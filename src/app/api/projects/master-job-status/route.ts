export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { admin } from "@lib/firebase/firebaseAdmin";
import { requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { z } from "zod";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const ACTIVE_MASTER_JOB_STATUSES = ["pending", "processing", "preview_ready"] as const;
const MASTER_JOB_STATUS_RATE_LIMIT_KEY = "master-job-status";

const projectIdSchema = z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/);
const querySchema = z.object({
    masterProjectId: projectIdSchema,
    outletProjectId: projectIdSchema.optional(),
});

const getMasterJobStatusRouteLogContext = (request: NextRequest, session: any) => ({
    endpoint: "/api/projects/master-job-status",
    ...getBoundedRuntimeStringContext("tenantId", session?.tId),
    ...getBoundedRuntimeStringContext("storeId", session?.sId),
    ...getBoundedRuntimeStringContext("masterProjectId", request.nextUrl.searchParams.get("masterProjectId")),
    ...getBoundedRuntimeStringContext("outletProjectId", request.nextUrl.searchParams.get("outletProjectId")),
});

const applyMasterJobStatusRateLimit = async (session: any) => {
    const rateLimitConfig = getRateLimitForFeature("DATA_READ");
    const userId = session?.uId || session?.user?.id || "unknown";
    const tenantId = session?.tId || session?.user?.tenantId || "unknown";
    const storeId = session?.sId || session?.user?.storeId || "unknown";
    const userRateLimitHash = hashPublicRateLimitValue(userId);
    const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);
    const storeRateLimitHash = hashPublicRateLimitValue(storeId);

    const rateLimit = await checkRateLimit({
        key: `${MASTER_JOB_STATUS_RATE_LIMIT_KEY}:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
        ...rateLimitConfig,
    });

    if (rateLimit.allowed) return null;

    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    return NextResponse.json(
        {
            error: "Too many requests. Please try again later.",
            retryAfter: waitSeconds,
            resetAt: rateLimit.resetAt,
        },
        {
            headers: {
                "Retry-After": String(waitSeconds),
                "X-RateLimit-Limit": String(rateLimitConfig.limit),
                "X-RateLimit-Remaining": String(rateLimit.remaining),
                "X-RateLimit-Reset": String(rateLimit.resetAt),
            },
            status: 429,
        },
    );
};

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
        const rateLimitResponse = await applyMasterJobStatusRateLimit(session);
        if (rateLimitResponse) return rateLimitResponse;

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
        logRuntimeFailure("master_job_status_route_failed", error, getMasterJobStatusRouteLogContext(request, session));
        return NextResponse.json({ error: "Master job status failed" }, { status: 500 });
    }
});
