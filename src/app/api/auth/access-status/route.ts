export const dynamic = "force-dynamic";

import { DB_COLLECTIONS } from "@constant/database";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { logger } from "@lib/monitoring/logger";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getBoundedRuntimeStringContext } from "@lib/runtime/runtimeDiagnostics";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { withAuth } from "../../../../middleware/auth";

const ACCESS_STATUS_RATE_LIMIT_KEY = "auth-access-status";
const CANONICAL_ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const noStoreJson = (body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) => NextResponse.json(body, {
    headers: {
        "Cache-Control": "no-store, max-age=0",
        ...headers,
    },
    status,
});

const canonicalIsoTimestampToMillis = (value: string): number => {
    const normalized = value.trim();
    if (!CANONICAL_ISO_TIMESTAMP_PATTERN.test(normalized)) return 0;
    const millis = new Date(normalized).getTime();
    return Number.isFinite(millis) && new Date(millis).toISOString() === normalized ? millis : 0;
};

const timestampToMillis = (value: any): number => {
    if (!value) return 0;
    if (typeof value === "number") return value < 1_000_000_000_000 ? value * 1000 : value;
    if (typeof value === "string") return canonicalIsoTimestampToMillis(value);
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value?._seconds === "number") return (value._seconds * 1000) + Math.floor((value._nanoseconds || 0) / 1_000_000);
    if (value instanceof admin.firestore.Timestamp) return value.toMillis();
    return 0;
};

const normalizeOptionalDocumentId = (value?: string | number | null): string | null => {
    if (value == null || value === "") return null;
    const documentId = String(value).trim();
    return isValidFirestoreDocumentId(documentId) ? documentId : null;
};

const getCurrentUserSnapshot = async (session: any) => {
    const userId = session?.uId || session?.user?.id;
    if (userId) {
        const userDocumentId = normalizeOptionalDocumentId(userId);
        if (!userDocumentId) return null;
        const snapshot = await firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userDocumentId).get();
        if (snapshot.exists) return snapshot;
    }

    const email = String(session?.user?.email || "").toLowerCase().trim();
    if (!email) return null;

    const snapshot = await firestoreAdmin
        .collection(DB_COLLECTIONS.USERS)
        .where("email", "==", email)
        .limit(1)
        .get();

    return snapshot.empty ? null : snapshot.docs[0];
};

const getEntityData = async (collectionName: string, id?: string | number | null) => {
    if (id == null || id === "") return { data: null, invalidId: false };
    const documentId = normalizeOptionalDocumentId(id);
    if (!documentId) return { data: null, invalidId: true };
    const snapshot = await firestoreAdmin.collection(collectionName).doc(documentId).get();
    return { data: snapshot.exists ? snapshot.data() : null, invalidId: false };
};

const checkAccessStatusRateLimit = async (request: NextRequest, session: any) => {
    const rateLimitConfig = getRateLimitForFeature("DATA_READ");
    const userId = session?.uId || session?.user?.id || "unknown";
    const tenantId = session?.tId || session?.user?.tenantId || "unknown";
    const storeId = session?.sId || session?.user?.storeId || "unknown";
    const userRateLimitHash = hashPublicRateLimitValue(userId);
    const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);
    const storeRateLimitHash = hashPublicRateLimitValue(storeId);

    const rateLimit = await checkRateLimit({
        key: `${ACCESS_STATUS_RATE_LIMIT_KEY}:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
        ...rateLimitConfig,
    });

    if (rateLimit.allowed) return null;

    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    logger.security("Rate Limit Exceeded - Session Access Check", {
        ...getBoundedSecurityRouteContext(session, request),
        endpoint: request.nextUrl.pathname,
        limit: rateLimitConfig.limit,
        method: request.method,
        ...getBoundedRuntimeStringContext("tenantId", tenantId),
        ...getBoundedRuntimeStringContext("storeId", storeId),
        ...getBoundedRuntimeStringContext("userId", userId),
        waitSeconds,
        window: rateLimitConfig.window,
    }, "medium");

    return noStoreJson(
        {
            error: "Too many requests. Please try again later.",
            retryAfter: waitSeconds,
            resetAt: rateLimit.resetAt,
        },
        429,
        {
            "Retry-After": String(waitSeconds),
            "X-RateLimit-Limit": String(rateLimitConfig.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.resetAt),
        },
    );
};

const invalidAccess = (
    request: NextRequest,
    session: any,
    reason: string,
    details: Record<string, unknown> = {},
) => {
    logger.security("Authorization Failed - Session Access Check", {
        ...getBoundedSecurityRouteContext(session, request),
        endpoint: request.nextUrl.pathname,
        error: reason,
        method: request.method,
        ...details,
    }, "high");

    return noStoreJson({
        reason,
        valid: false,
    });
};

export const GET = withAuth(async (request: NextRequest, session) => {
    const rateLimitResponse = await checkAccessStatusRateLimit(request, session);
    if (rateLimitResponse) return rateLimitResponse;

    const userSnapshot = await getCurrentUserSnapshot(session);
    if (!userSnapshot?.exists) {
        return invalidAccess(request, session, "USER_NOT_FOUND");
    }

    const userData = userSnapshot.data() || {};
    if (userData.deleted === true) return invalidAccess(request, session, "USER_DELETED");
    if (userData.active === false) return invalidAccess(request, session, "USER_INACTIVE");
    if (userData.isVerified === false) return invalidAccess(request, session, "USER_UNVERIFIED");
    if (isPlatformEntityBlocked(userData)) return invalidAccess(request, session, "USER_BLOCKED");

    const tenantId = userData.tenantId ?? session?.tId ?? session?.user?.tenantId;
    const tenant = await getEntityData(DB_COLLECTIONS.TENANTS, tenantId);
    if (tenant.invalidId) {
        return invalidAccess(request, session, "TENANT_REFERENCE_INVALID", {
            ...getBoundedRuntimeStringContext("tenantId", tenantId),
        });
    }
    if (isPlatformEntityBlocked(tenant.data)) {
        return invalidAccess(request, session, "TENANT_BLOCKED", {
            ...getBoundedRuntimeStringContext("tenantId", tenantId),
        });
    }

    const storeId = userData.storeId ?? session?.sId ?? session?.user?.storeId;
    const store = await getEntityData(DB_COLLECTIONS.STORES, storeId);
    if (store.invalidId) {
        return invalidAccess(request, session, "STORE_REFERENCE_INVALID", {
            ...getBoundedRuntimeStringContext("storeId", storeId),
        });
    }
    if (isPlatformEntityBlocked(store.data)) {
        return invalidAccess(request, session, "STORE_BLOCKED", {
            ...getBoundedRuntimeStringContext("storeId", storeId),
        });
    }

    const revokedAtMs = Math.max(
        timestampToMillis(userData.sessionRevokedAt),
        timestampToMillis(userData.authTokensRevokedAt),
        timestampToMillis(userData.accessRevokedAt),
    );
    const issuedAtMs = timestampToMillis(session?.authIssuedAt ?? session?.user?.authIssuedAt);
    if (revokedAtMs > 0 && (!issuedAtMs || revokedAtMs > issuedAtMs)) {
        return invalidAccess(request, session, "SESSION_REVOKED", {
            issuedAtMs,
            revokedAtMs,
        });
    }

    return noStoreJson({
        checkedAt: new Date().toISOString(),
        valid: true,
    });
});
