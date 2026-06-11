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

import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import { secureError } from "@lib/security/secureLogger";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "../../../../middleware/auth";

// Valid tags for customer-facing invalidation.
const VALID_TAG_PREFIXES = ['menu-store-', 'store-'];
const VALID_EXACT_TAGS = ['client-stores', 'screen-data'];

const StoreIdSchema = z.union([
    z.string().trim().min(1).max(128),
    z.number().finite(),
]);

const RevalidateMenuRequestSchema = z.object({
    storeId: StoreIdSchema.optional(),
    tags: z.array(z.string().trim().min(1).max(128)).max(10).optional(),
}).refine(
    (value) => value.storeId !== undefined || (Array.isArray(value.tags) && value.tags.length > 0),
    { message: "Provide storeId or tags" },
);

function isValidTag(tag: string): boolean {
    return VALID_EXACT_TAGS.includes(tag) || VALID_TAG_PREFIXES.some(prefix => tag.startsWith(prefix));
}

function isPlatformSession(session: any | null): boolean {
    return session?.user?.platformRole === 'PLATFORM' || session?.platformRole === 'PLATFORM';
}

function getSessionStoreIds(session: any | null): Set<string> {
    const ids = new Set<string>();
    const add = (value: unknown) => {
        const normalized = String(value ?? '').trim();
        if (normalized) ids.add(normalized);
    };

    add(session?.sId);
    add(session?.storeId);
    add(session?.user?.storeId);
    if (Array.isArray(session?.user?.storeIds)) {
        session.user.storeIds.forEach(add);
    }
    if (Array.isArray(session?.user?.stores)) {
        session.user.stores.forEach((store: any) => add(store?.storeId));
    }

    return ids;
}

function canRevalidateStore(session: any | null, storeId: string): boolean {
    if (!session) return true;
    if (isPlatformSession(session)) return true;
    return getSessionStoreIds(session).has(storeId);
}

async function handleRevalidateMenuCache(request: NextRequest, session: any | null) {
    try {
        const json = await request.json().catch(() => ({}));
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
            const storeId = String(body.storeId).trim();
            if (!canRevalidateStore(session, storeId)) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            tags = [`menu-store-${storeId}`, `store-${storeId}`, 'client-stores', 'screen-data'];
        } else if (body.tags) {
            if (session && !isPlatformSession(session)) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            tags = body.tags.map((tag) => tag.trim()).filter(isValidTag);
        }

        if (tags.length === 0) {
            return NextResponse.json(
                { error: "Provide storeId or valid tags array", validPrefixes: VALID_TAG_PREFIXES, validExactTags: VALID_EXACT_TAGS },
                { status: 400 }
            );
        }

        // Revalidate each tag
        for (const tag of tags) {
            revalidateTag(tag);
        }

        const ownerBusinessAssistant = body.storeId
            ? await invalidateOwnerBusinessAssistantPacketCache({
                tId: (session as any)?.tId || (session as any)?.user?.tenantId,
                sId: String(body.storeId).trim(),
            })
            : { attempted: false, keysDeleted: 0, patterns: [] };

        return NextResponse.json({
            revalidated: true,
            tags,
            ownerBusinessAssistant,
            timestamp: Date.now(),
        });
    } catch (error) {
        secureError('[Menu Cache] Revalidation failed', error as Error, {
            endpoint: request.nextUrl.pathname,
        });
        return NextResponse.json(
            { error: "Revalidation failed" },
            { status: 500 }
        );
    }
}

const authenticatedRevalidateMenuCache = withAuth(async (request: NextRequest, session) => {
    return handleRevalidateMenuCache(request, session);
});

export async function POST(request: NextRequest) {
    const secret = request.headers.get("x-revalidate-secret");
    const hasValidSecret = Boolean(process.env.REVALIDATION_SECRET) && secret === process.env.REVALIDATION_SECRET;

    if (hasValidSecret) {
        return handleRevalidateMenuCache(request, null);
    }

    return authenticatedRevalidateMenuCache(request);
}
