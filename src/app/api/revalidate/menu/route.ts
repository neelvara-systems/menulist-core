export const dynamic = 'force-dynamic';
/**
 * Menu Cache Revalidation API (Customer Infra Hardening - TASK 6 + GPT FIX 2)
 *
 * Invalidates Vercel Data Cache for client menu pages.
 * Supports per-store precision invalidation.
 *
 * Tags (GPT FIX 2 — per-store):
 * - `menu-store-{storeId}` — invalidates project data + decision blocks for one store
 * - `store-{storeId}` — legacy per-store tag for store-scoped cached helpers
 * - `client-stores` — invalidates public store lookup data used by OBP, menus, PWA shortcuts, and compliance pages
 * - `screen-data` — invalidates digital screen SSR reads
 *
 * Usage:
 *   // Per-store (preferred — via storeId shorthand):
 *   POST /api/revalidate/menu { storeId: "42" }
 *
 *   // Custom tags:
 *   POST /api/revalidate/menu { tags: ["menu-store-42", "store-42", "client-stores"] }
 *
 * Auth:
 * - server/external callers may use x-revalidate-secret
 * - authenticated app callers may use their normal NextAuth session
 */

import { logger } from "@lib/monitoring/logger";
import {
    canMenuRevalidationSessionAccessStore,
    resolveMenuRevalidationSessionAccess,
    type MenuRevalidationSessionAccess,
} from "@lib/cache/menuRevalidationSessionAccess";
import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "../../../../middleware/auth";
import { hashPublicRateLimitValue } from "../../../../middleware/publicApi";

// Valid tags for customer-facing invalidation.
const STORE_ID_PATTERN = /^\d{1,20}$/;
const VALID_TAG_PATTERNS = [/^menu-store-\d{1,20}$/, /^store-\d{1,20}$/];
const VALID_TAG_DESCRIPTIONS = ['menu-store-{numericStoreId}', 'store-{numericStoreId}'];
const VALID_EXACT_TAGS = ['client-stores', 'screen-data'];

const StoreIdSchema = z.union([
    z.string().trim().min(1).max(20),
    z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
]);

const RevalidateMenuRequestSchema = z.object({
    storeId: StoreIdSchema.optional(),
    tags: z.array(z.string().trim().min(1).max(128)).max(10).optional(),
}).refine(
    (value) => value.storeId !== undefined || (Array.isArray(value.tags) && value.tags.length > 0),
    { message: "Provide storeId or tags" },
);
const MENU_REVALIDATE_MAX_BODY_BYTES = 4 * 1024;
const MENU_REVALIDATE_RATE_LIMIT_KEY = 'menu-cache-revalidate';

type MenuRevalidationAuthMode = 'secret' | 'session';

function getMenuRevalidationLogContext({
    endpoint,
    hasSession,
    platformSession,
    storeId,
    tagCount,
}: {
    endpoint: string;
    hasSession: boolean;
    platformSession: boolean;
    storeId?: string;
    tagCount: number;
}) {
    return {
        ...getBoundedRuntimeStringContext('endpoint', endpoint),
        ...getBoundedRuntimeStringContext('storeId', storeId),
        hasSession,
        platformSession,
        tagCount,
    };
}

function isValidTag(tag: string): boolean {
    return VALID_EXACT_TAGS.includes(tag) || VALID_TAG_PATTERNS.some(pattern => pattern.test(tag));
}

function normalizeStoreId(value: string | number): string | null {
    const normalized = String(value).trim();
    return STORE_ID_PATTERN.test(normalized) ? normalized : null;
}

function getStoreIdFromCacheTag(tag: string): string | null {
    const match = tag.match(/^(?:menu-store|store)-(\d{1,20})$/);
    return match ? normalizeStoreId(match[1]) : null;
}

function deriveSingleStoreIdFromTags(tags: string[]): string | undefined {
    const storeIds = new Set<string>();
    tags.forEach((tag) => {
        const storeId = getStoreIdFromCacheTag(tag);
        if (storeId) storeIds.add(storeId);
    });

    return storeIds.size === 1 ? Array.from(storeIds)[0] : undefined;
}

function getMenuRevalidationRateLimitIdentity(
    request: NextRequest,
    session: any | null,
    authMode: MenuRevalidationAuthMode,
): string {
    if (authMode === 'session') {
        return String(session?.uId || session?.user?.id || session?.user?.email || 'session-unknown');
    }

    return String(
        request.headers.get('x-forwarded-for')
        || request.headers.get('x-real-ip')
        || request.headers.get('user-agent')
        || 'secret-unknown',
    );
}

async function applyMenuRevalidationRateLimit(
    request: NextRequest,
    session: any | null,
    authMode: MenuRevalidationAuthMode,
): Promise<NextResponse | null> {
    const rateLimitConfig = getRateLimitForFeature('MENU_CACHE_REVALIDATION');
    const sourceRateLimitHash = hashPublicRateLimitValue(
        getMenuRevalidationRateLimitIdentity(request, session, authMode),
    );
    const rateLimit = await checkRateLimit({
        key: `${MENU_REVALIDATE_RATE_LIMIT_KEY}:${authMode}:${sourceRateLimitHash}`,
        ...rateLimitConfig,
    });

    if (rateLimit.allowed) {
        return null;
    }

    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    logger.security('Rate Limit Exceeded - Menu Cache Revalidation', {
        ...getBoundedSecurityRouteContext(session, request),
        ...getBoundedRuntimeStringContext('endpoint', request.nextUrl.pathname),
        authMode,
        feature: 'MENU_CACHE_REVALIDATION',
    }, 'medium');

    return NextResponse.json(
        { error: "Too many requests. Please try again later.", retryAfter: waitSeconds },
        {
            status: 429,
            headers: {
                'Retry-After': String(waitSeconds),
                'X-RateLimit-Limit': String(rateLimitConfig.limit),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(rateLimit.resetAt),
            },
        },
    );
}

async function handleRevalidateMenuCache(
    request: NextRequest,
    session: any | null,
    authMode: MenuRevalidationAuthMode,
) {
    let requestedStoreId: string | undefined;
    let tagCount = 0;
    let sessionAccess: MenuRevalidationSessionAccess | null = null;

    try {
        const rateLimitResponse = await applyMenuRevalidationRateLimit(request, session, authMode);
        if (rateLimitResponse) return rateLimitResponse;
        sessionAccess = session ? resolveMenuRevalidationSessionAccess(session) : null;
        if (authMode === 'session' && !sessionAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const bodyResult = await readBoundedJsonBody(request, MENU_REVALIDATE_MAX_BODY_BYTES, {
            invalidJsonMessage: "Invalid revalidation request",
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const json = bodyResult.data;
        const parsed = RevalidateMenuRequestSchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid revalidation request" },
                { status: 400 },
            );
        }

        // Build tags — support storeId shorthand or explicit tags array
        let tags: string[] = [];
        const body = parsed.data;
        if (body.storeId !== undefined) {
            const storeId = normalizeStoreId(body.storeId);
            if (!storeId) {
                return NextResponse.json(
                    { error: "Invalid revalidation request" },
                    { status: 400 },
                );
            }
            requestedStoreId = storeId;
            if (sessionAccess && !canMenuRevalidationSessionAccessStore(sessionAccess, storeId)) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            tags = [`menu-store-${storeId}`, `store-${storeId}`, 'client-stores', 'screen-data'];
        } else if (body.tags) {
            if (sessionAccess && !sessionAccess.platformSession) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            tags = body.tags.map((tag) => tag.trim()).filter(isValidTag);
            requestedStoreId = deriveSingleStoreIdFromTags(tags);
        }

        if (tags.length === 0) {
            return NextResponse.json(
                { error: "Provide storeId or valid tags array", validTagPatterns: VALID_TAG_DESCRIPTIONS, validExactTags: VALID_EXACT_TAGS },
                { status: 400 }
            );
        }
        tagCount = tags.length;

        // Revalidate each tag
        for (const tag of tags) {
            revalidateTag(tag, { expire: 0 });
        }

        const ownerBusinessAssistant = requestedStoreId
            ? await invalidateOwnerBusinessAssistantPacketCache({
                tId: sessionAccess?.tenantId,
                sId: requestedStoreId,
            })
            : { attempted: false, keysDeleted: 0, patterns: [] };

        return NextResponse.json({
            revalidated: true,
            tags,
            ownerBusinessAssistant,
            timestamp: Date.now(),
        });
    } catch (error) {
        logRuntimeFailure('menu_cache_revalidation_failed', error, {
            ...getMenuRevalidationLogContext({
                endpoint: request.nextUrl.pathname,
                hasSession: Boolean(session),
                platformSession: sessionAccess?.platformSession === true,
                storeId: requestedStoreId,
                tagCount,
            }),
        });
        return NextResponse.json(
            { error: "Revalidation failed" },
            { status: 500 }
        );
    }
}

const authenticatedRevalidateMenuCache = withAuth(async (request: NextRequest, session) => {
    return handleRevalidateMenuCache(request, session, 'session');
});

export async function POST(request: NextRequest) {
    const secret = request.headers.get("x-revalidate-secret");
    const hasValidSecret = Boolean(process.env.REVALIDATION_SECRET) && secret === process.env.REVALIDATION_SECRET;

    if (hasValidSecret) {
        return handleRevalidateMenuCache(request, null, 'secret');
    }

    return authenticatedRevalidateMenuCache(request);
}
