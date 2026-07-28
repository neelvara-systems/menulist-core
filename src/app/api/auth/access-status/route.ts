export const dynamic = "force-dynamic";

import { DB_COLLECTIONS } from "@constant/database";
import { ECOMSAI_PLATFORM_USER_ROLE } from "@constant/user";
import {
    isAccessStatusEntityIdentityConsistent,
    isAccessStatusStoreOwnedByTenant,
    resolveAccessStatusPreferredScope,
} from "@lib/auth/accessStatusScope";
import { resolveCurrentSessionUserDocumentId } from "@lib/auth/currentPlatformUser";
import { resolveExactSessionPlatformRole } from "@lib/auth/sessionPlatformRole";
import { getUniqueAuthUserByEmailFromCollection } from "@lib/auth/serverUserContext";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { logger } from "@lib/monitoring/logger";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import { resolveStorePermissionSessionScope } from "@lib/permissions/scopeDocumentId";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getBoundedRuntimeStringContext } from "@lib/runtime/runtimeDiagnostics";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { withAuth } from "../../../../middleware/auth";

const ACCESS_STATUS_RATE_LIMIT_KEY = "auth-access-status";
const CANONICAL_ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const noStoreJson = (body: Record<string, unknown>, status = 200, initHeaders: Record<string, string> = {}) => {
    const headers = new Headers(initHeaders);
    headers.set("Cache-Control", "private, no-store, max-age=0");
    headers.set("X-Content-Type-Options", "nosniff");
    return NextResponse.json(body, { headers, status });
};

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
    const rawDocumentId = String(value);
    const documentId = rawDocumentId.trim();
    return documentId === rawDocumentId && isValidFirestoreDocumentId(documentId) ? documentId : null;
};

const isPlatformAccessSession = (session: any, userData: Record<string, any>): boolean => (
    resolveExactSessionPlatformRole(session) === ECOMSAI_PLATFORM_USER_ROLE
    && userData.platformRole === ECOMSAI_PLATFORM_USER_ROLE
);

const getCurrentUserSnapshot = async (session: any) => {
    const userId = resolveCurrentSessionUserDocumentId(session);
    const hasSessionUserDocumentId = Boolean(session?.uId || session?.user?.id);
    if (!userId && hasSessionUserDocumentId) return null;
    if (userId) {
        const userDocumentId = normalizeOptionalDocumentId(userId);
        if (!userDocumentId) return null;
        const snapshot = await firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userDocumentId).get();
        if (snapshot.exists) return snapshot;
    }

    const email = String(session?.user?.email || "").toLowerCase().trim();
    if (!email) return null;

    const user = await getUniqueAuthUserByEmailFromCollection(
        firestoreAdmin.collection(DB_COLLECTIONS.USERS),
        email,
    );
    if (!user?.id) return null;
    return firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(user.id).get();
};

const getEntityData = async (collectionName: string, id?: string | number | null) => {
    if (id == null || id === "") return { data: null, documentId: null, invalidId: false };
    const documentId = normalizeOptionalDocumentId(id);
    if (!documentId) return { data: null, documentId: null, invalidId: true };
    const snapshot = await firestoreAdmin.collection(collectionName).doc(documentId).get();
    return { data: snapshot.exists ? snapshot.data() : null, documentId, invalidId: false };
};

const checkAccessStatusRateLimit = async (request: NextRequest, session: any) => {
    const rateLimitConfig = getRateLimitForFeature("DATA_READ");
    const userId = resolveCurrentSessionUserDocumentId(session);
    const platformRole = resolveExactSessionPlatformRole(session);
    const platformSession = platformRole === ECOMSAI_PLATFORM_USER_ROLE;
    const sessionScope = resolveStorePermissionSessionScope(session);
    if (!userId || platformRole === null || (!platformSession && !sessionScope)) {
        return noStoreJson({ error: "Forbidden" }, 403);
    }
    const tenantId = sessionScope?.tenantScope.documentId || "platform";
    const storeId = sessionScope?.storeScope.documentId || "platform";
    const userRateLimitHash = hashPublicRateLimitValue(userId);
    const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);
    const storeRateLimitHash = hashPublicRateLimitValue(storeId);

    const rateLimit = await checkRateLimit({
        key: `${ACCESS_STATUS_RATE_LIMIT_KEY}:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
        ...rateLimitConfig,
        failClosedOnProviderError: true,
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
            error: rateLimit.reason === "provider_unavailable"
                ? "Session access check is temporarily unavailable."
                : "Too many requests. Please try again later.",
            retryAfter: waitSeconds,
            resetAt: rateLimit.resetAt,
        },
        rateLimit.reason === "provider_unavailable" ? 503 : 429,
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

    const platformAccessSession = isPlatformAccessSession(session, userData);
    const tenantScope = resolveAccessStatusPreferredScope(
        [userData.tenantId, userData.tId],
        [session?.tId, session?.user?.tenantId],
    );
    if (tenantScope.state === "invalid") {
        return invalidAccess(request, session, "TENANT_REFERENCE_INVALID");
    }
    const tenantId = tenantScope.state === "resolved" ? tenantScope.documentId : null;
    const tenant = await getEntityData(DB_COLLECTIONS.TENANTS, tenantId);
    if (tenant.invalidId) {
        return invalidAccess(request, session, "TENANT_REFERENCE_INVALID", {
            ...getBoundedRuntimeStringContext("tenantId", tenantId),
        });
    }
    if (!platformAccessSession && tenantId != null && tenantId !== "" && !tenant.data) {
        return invalidAccess(request, session, "TENANT_NOT_FOUND", {
            ...getBoundedRuntimeStringContext("tenantId", tenantId),
        });
    }
    if (!platformAccessSession && tenant.data?.deleted === true) {
        return invalidAccess(request, session, "TENANT_DELETED", {
            ...getBoundedRuntimeStringContext("tenantId", tenantId),
        });
    }
    if (!platformAccessSession && tenant.data?.active === false) {
        return invalidAccess(request, session, "TENANT_INACTIVE", {
            ...getBoundedRuntimeStringContext("tenantId", tenantId),
        });
    }
    if (isPlatformEntityBlocked(tenant.data)) {
        return invalidAccess(request, session, "TENANT_BLOCKED", {
            ...getBoundedRuntimeStringContext("tenantId", tenantId),
        });
    }
    if (
        tenant.data
        && !isAccessStatusEntityIdentityConsistent(
            tenant.data,
            tenant.documentId,
            ["tenantId", "tId"],
        )
    ) {
        return invalidAccess(request, session, "TENANT_REFERENCE_INVALID");
    }

    const storeScope = resolveAccessStatusPreferredScope(
        [userData.storeId, userData.sId],
        [session?.sId, session?.user?.storeId],
    );
    if (storeScope.state === "invalid") {
        return invalidAccess(request, session, "STORE_REFERENCE_INVALID");
    }
    const storeId = storeScope.state === "resolved" ? storeScope.documentId : null;
    const store = await getEntityData(DB_COLLECTIONS.STORES, storeId);
    if (store.invalidId) {
        return invalidAccess(request, session, "STORE_REFERENCE_INVALID", {
            ...getBoundedRuntimeStringContext("storeId", storeId),
        });
    }
    if (!platformAccessSession && storeId != null && storeId !== "" && !store.data) {
        return invalidAccess(request, session, "STORE_NOT_FOUND", {
            ...getBoundedRuntimeStringContext("storeId", storeId),
        });
    }
    if (!platformAccessSession && store.data?.deleted === true) {
        return invalidAccess(request, session, "STORE_DELETED", {
            ...getBoundedRuntimeStringContext("storeId", storeId),
        });
    }
    if (!platformAccessSession && store.data?.active === false) {
        return invalidAccess(request, session, "STORE_INACTIVE", {
            ...getBoundedRuntimeStringContext("storeId", storeId),
        });
    }
    if (isPlatformEntityBlocked(store.data)) {
        return invalidAccess(request, session, "STORE_BLOCKED", {
            ...getBoundedRuntimeStringContext("storeId", storeId),
        });
    }
    if (
        store.data
        && !isAccessStatusEntityIdentityConsistent(
            store.data,
            store.documentId,
            ["storeId", "sId"],
        )
    ) {
        return invalidAccess(request, session, "STORE_REFERENCE_INVALID");
    }
    if (!platformAccessSession && store.data && !tenant.documentId) {
        return invalidAccess(request, session, "TENANT_NOT_FOUND", {
            ...getBoundedRuntimeStringContext("storeId", storeId),
            ...getBoundedRuntimeStringContext("tenantId", tenantId),
        });
    }
    if (!platformAccessSession && store.data && tenant.documentId && !isAccessStatusStoreOwnedByTenant(store.data, tenant.documentId)) {
        return invalidAccess(request, session, "STORE_TENANT_MISMATCH", {
            ...getBoundedRuntimeStringContext("storeId", storeId),
            ...getBoundedRuntimeStringContext("tenantId", tenantId),
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
