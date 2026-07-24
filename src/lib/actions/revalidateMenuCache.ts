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
import { touchDigitalScreenContentVersionForStoreServer } from "@lib/screen/serverScreenInvalidation";
import { revalidateTag } from "next/cache";

export async function revalidateMenuCache(
    storeId: string | number,
    options: { tId?: string | number; projectId?: string | number } = {},
) {
    revalidateTag(`menu-store-${storeId}`, { expire: 0 });
    revalidateTag(`store-${storeId}`, { expire: 0 });
    revalidateTag('client-stores', { expire: 0 });
    revalidateTag('screen-data', { expire: 0 });
    await touchDigitalScreenContentVersionForStoreServer(storeId, 'revalidateMenuCache');
    await invalidateOwnerBusinessAssistantPacketCache({
        tId: options.tId,
        sId: storeId,
        projectId: options.projectId,
    });
}
