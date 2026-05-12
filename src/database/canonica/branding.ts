/**
 * Canonica — Branding Config DAL (White-Label)
 * 
 * Per-tenant branding configuration for help widget, KB pages, emails.
 * Stored in platformSummary collection using key: branding_{tId}_{sId}
 * 
 * Phase 4 — Competitive Differentiator (4.1)
 * Feature-flagged: ENABLE_CANONICA_WHITE_LABEL
 * 
 * No new collection needed — reuses existing platformSummary pattern.
 * 
 * @see __docs__/canonica/canonica-build-priority-roadmap.md Phase 4
 */

import { DB_COLLECTIONS } from "@constant/database";
import { doc, getDoc, setDoc } from "@firebase/firestore";
import { canonicaRequestBodyComposer } from '@lib/canonica/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { canonicaFirebaseClient } from "@lib/firebase/canonicaFirebaseClient";
import { CANONICA_DEFAULT_BRANDING, CanonicaBrandingConfig } from "@type/canonica";

const COLLECTION = DB_COLLECTIONS.PLATFORM_SUMMARY;

const getBrandingDocRef = (tId: number, sId: number) =>
    doc(canonicaFirebaseClient, COLLECTION, `branding_${tId}_${sId}`);

/**
 * Get branding config for a tenant+store.
 * Returns default branding if no config saved yet.
 */
export const getBrandingConfig = async (tId: number, sId: number): Promise<CanonicaBrandingConfig> => {
    return await apiCallComposer(
        async () => {
            const docSnap = await getDoc(getBrandingDocRef(tId, sId));
            if (docSnap.exists()) {
                const data = docSnap.data();
                return (data.branding ?? CANONICA_DEFAULT_BRANDING) as CanonicaBrandingConfig;
            }
            return CANONICA_DEFAULT_BRANDING;
        },
        "getBrandingConfig"
    ) ?? CANONICA_DEFAULT_BRANDING;
};

/**
 * Save branding config for a tenant+store.
 * Merge-writes to prevent overwriting other fields on the doc.
 */
export const saveBrandingConfig = async (
    tId: number,
    sId: number,
    config: CanonicaBrandingConfig
): Promise<CanonicaBrandingConfig> => {
    return await apiCallComposer(
        async () => {
            const composedData = await canonicaRequestBodyComposer({
                tId,
                sId,
                branding: config,
            });
            await setDoc(getBrandingDocRef(tId, sId), composedData, { merge: true });
            return config;
        },
        { tId, sId, config },
        "saveBrandingConfig"
    ) ?? config;
};
