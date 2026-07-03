/**
 * Server Action: Revalidate customer menu cache (GPT FIX 1)
 *
 * Called from updateProject() after menu saves.
 * Invalidates per-store Vercel Data Cache tags so customers
 * see updated menu instantly (instead of waiting 60s TTL).
 *
 * Tag format matches page.tsx cached wrappers:
 * - `menu-store-${storeId}` → project data, decision blocks
 * - `store-${storeId}` → store details
 * - `client-stores` → public lookup and OBP summary helpers
 * - `screen-data` → digital screen SSR reads
 *
 * 3-Year Freeze: Without instant invalidation, price changes
 * could show stale data for up to 60s — unacceptable for infra product.
 */
"use server";

import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import { touchDigitalScreenContentVersionForStoreServer } from "@lib/screen/serverScreenInvalidation";
import { revalidateTag } from "next/cache";

export async function revalidateMenuCache(
    storeId: string | number,
    options: { tId?: string | number; projectId?: string | number } = {},
) {
    revalidateTag(`menu-store-${storeId}`);
    revalidateTag(`store-${storeId}`);
    revalidateTag('client-stores');
    revalidateTag('screen-data');
    await touchDigitalScreenContentVersionForStoreServer(storeId, 'revalidateMenuCache');
    await invalidateOwnerBusinessAssistantPacketCache({
        tId: options.tId,
        sId: storeId,
        projectId: options.projectId,
    });
}
