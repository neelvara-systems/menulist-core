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

import { authOptions } from "@lib/auth";
import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import { revalidateTag } from "next/cache";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// Valid tags for customer-facing invalidation.
const VALID_TAG_PREFIXES = ['menu-store-', 'store-'];
const VALID_EXACT_TAGS = ['client-stores', 'screen-data'];

function isValidTag(tag: string): boolean {
    return VALID_EXACT_TAGS.includes(tag) || VALID_TAG_PREFIXES.some(prefix => tag.startsWith(prefix));
}

export async function POST(request: NextRequest) {
    try {
        const secret = request.headers.get("x-revalidate-secret");
        const hasValidSecret = secret === process.env.REVALIDATION_SECRET;
        const session = hasValidSecret ? null : await getServerSession(authOptions);

        if (!hasValidSecret && !session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();

        // Build tags — support storeId shorthand or explicit tags array
        let tags: string[] = [];
        if (body.storeId) {
            tags = [`menu-store-${body.storeId}`, `store-${body.storeId}`, 'client-stores', 'screen-data'];
        } else if (body.tags && Array.isArray(body.tags)) {
            tags = body.tags.filter(isValidTag);
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
                sId: body.storeId,
            })
            : { attempted: false, keysDeleted: 0, patterns: [] };

        return NextResponse.json({
            revalidated: true,
            tags,
            ownerBusinessAssistant,
            timestamp: Date.now(),
        });
    } catch (error) {
        return NextResponse.json(
            { error: "Revalidation failed" },
            { status: 500 }
        );
    }
}
