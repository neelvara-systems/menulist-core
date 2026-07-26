/**
 * Server Action: Revalidate customer menu cache (GPT FIX 1)
 *
 * Called from updateProject() after menu saves.
 * Invalidates per-store Vercel Data Cache tags so customer
 * pages refresh from the acknowledged source before the next TTL cycle.
 *
 * Tag format matches page.tsx cached wrappers:
 * - `menu-store-${storeId}` → project data, decision blocks
 * - `store-${storeId}` → store details
 * - `client-stores` → public lookup and OBP summary helpers
 * - `screen-data` → digital screen SSR reads
 *
 * 3-Year Freeze: Without explicit invalidation, price changes
 * could show stale data until the 60s cache window expires.
 */
"use server";

import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import { runStorePublicTruthPostCommitEffects } from "@lib/cache/storePublicTruthPostCommit";
import { touchDigitalScreenContentVersionForStoreServer } from "@lib/screen/serverScreenInvalidation";
import { revalidateTag } from "next/cache";

export async function revalidateMenuCache(
    storeId: string | number,
    options: { tId?: string | number; projectId?: string | number } = {},
): Promise<void> {
    const normalizedStoreId = String(storeId).trim();
    if (!normalizedStoreId) {
        throw new Error("menu_cache_revalidation_store_id_required");
    }

    const postCommit = await runStorePublicTruthPostCommitEffects({
        chunkSize: 1,
        storeIds: [normalizedStoreId],
        tenantId: String(options.tId ?? "").trim(),
        deps: {
            invalidateAssistant: (currentStoreId, tenantId) =>
                invalidateOwnerBusinessAssistantPacketCache({
                    tId: tenantId || undefined,
                    sId: currentStoreId,
                    projectId: options.projectId,
                }),
            revalidate: (tag) => revalidateTag(tag, { expire: 0 }),
            touchScreen: (currentStoreId) =>
                touchDigitalScreenContentVersionForStoreServer(
                    currentStoreId,
                    "revalidateMenuCache",
                ),
        },
    });

    if (postCommit.effectsPending) {
        throw postCommit.firstError ?? new Error("menu_cache_revalidation_effect_failed");
    }
}
