export const dynamic = 'force-dynamic';
/**
 * Menu Cache Revalidation API (Customer Infra Hardening - TASK 6 + GPT FIX 2)
 *
 * Invalidates Vercel Data Cache for client menu pages.
 * Supports per-store precision invalidation.
 *
 * Tags (GPT FIX 2 — per-store):
 * - `menu-store-{storeId}` — invalidates project data + decision blocks for one store
 * - `store-{storeId}` — invalidates store details for one store
 *
 * Usage:
 *   // Per-store (preferred — via storeId shorthand):
 *   POST /api/revalidate/menu { storeId: "42" }
 *
 *   // Custom tags:
 *   POST /api/revalidate/menu { tags: ["menu-store-42", "store-42"] }
 *
 * Auth: x-revalidate-secret header required.
 *
 * NOTE: Primary invalidation now happens via Server Action (revalidateMenuCache)
 * called from updateProject(). This API is a fallback / external trigger.
 */

import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// Valid tag prefixes for per-store invalidation (GPT FIX 2)
const VALID_TAG_PREFIXES = ['menu-store-', 'store-'];

function isValidTag(tag: string): boolean {
    return VALID_TAG_PREFIXES.some(prefix => tag.startsWith(prefix));
}

export async function POST(request: NextRequest) {
    try {
        // Validate secret to prevent unauthorized cache purges
        const secret = request.headers.get("x-revalidate-secret");
        if (secret !== process.env.REVALIDATION_SECRET) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();

        // Build tags — support storeId shorthand or explicit tags array
        let tags: string[] = [];
        if (body.storeId) {
            tags = [`menu-store-${body.storeId}`, `store-${body.storeId}`];
        } else if (body.tags && Array.isArray(body.tags)) {
            tags = body.tags.filter(isValidTag);
        }

        if (tags.length === 0) {
            return NextResponse.json(
                { error: "Provide storeId or valid tags array", validPrefixes: VALID_TAG_PREFIXES },
                { status: 400 }
            );
        }

        // Revalidate each tag
        for (const tag of tags) {
            revalidateTag(tag);
        }

        return NextResponse.json({
            revalidated: true,
            tags,
            timestamp: Date.now(),
        });
    } catch (error) {
        return NextResponse.json(
            { error: "Revalidation failed" },
            { status: 500 }
        );
    }
}
