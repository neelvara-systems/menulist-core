/**
 * Answerlattice — Trust Metrics DAL
 * 
 * Reads founder trust metrics from platformSummary/trustMetrics_{tId}_{sId}.
 * Data is written by the nightly scheduler (answerlatticeNightly.ts → aggregateTrustMetrics).
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_TRUST_METRICS
 * 
 * @see functions-answerlattice/src/answerlattice/answerlatticeNightly.ts
 * @see __docs__/answerlattice/founder-trust-layer/
 */

import { DB_COLLECTIONS } from "@constant/database";
import { doc, getDoc } from "@firebase/firestore";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { parseAnswerlatticeTrustMetrics } from "@lib/answerlattice/analyticsIntelligenceContracts";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import { AnswerlatticeTrustMetrics } from "@type/answerlattice";

/**
 * Get trust metrics for a tenant+store.
 * Reads from platformSummary/trustMetrics_{tId}_{sId} (1 read).
 */
export const getTrustMetrics = async (tId: number, sId: number): Promise<AnswerlatticeTrustMetrics | null> => {
    return await apiCallComposer(
        async () => {
            const docRef = doc(answerlatticeFirebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, `trustMetrics_${tId}_${sId}`);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return parseAnswerlatticeTrustMetrics(docSnap.data(), { tenantId: tId, storeId: sId });
            }
            return null;
        },
        "getTrustMetrics"
    );
};
