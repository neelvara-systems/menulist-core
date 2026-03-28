/**
 * Canonica — Trust Metrics DAL
 * 
 * Reads founder trust metrics from platformSummary/trustMetrics_{tId}_{sId}.
 * Data is written by the nightly scheduler (canonicaNightly.ts → aggregateTrustMetrics).
 * 
 * Feature-flagged: ENABLE_CANONICA_TRUST_METRICS
 * 
 * @see functions/src/canonica/canonicaNightly.ts
 * @see __docs__/canonica/founder-trust-layer/
 */

import { DB_COLLECTIONS } from "@constant/database";
import { doc, getDoc } from "@firebase/firestore";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { canonicaFirebaseClient } from "@lib/firebase/canonicaFirebaseClient";
import { CanonicaTrustMetrics } from "@type/canonica";

/**
 * Get trust metrics for a tenant+store.
 * Reads from platformSummary/trustMetrics_{tId}_{sId} (1 read).
 */
export const getTrustMetrics = async (tId: number, sId: number): Promise<CanonicaTrustMetrics | null> => {
    return await apiCallComposer(
        async () => {
            const docRef = doc(canonicaFirebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, `trustMetrics_${tId}_${sId}`);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as CanonicaTrustMetrics;
            }
            return null;
        },
        "getTrustMetrics"
    );
};
