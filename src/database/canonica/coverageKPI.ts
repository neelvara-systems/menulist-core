/**
 * Canonica — Coverage KPI DAL
 * 
 * Reads canonical coverage metrics from platformSummary/coverage_{tId}_{sId}.
 * Data is written by the nightly scheduler (canonicaNightly.ts → aggregateCoverageKPI).
 * 
 * Feature-flagged: ENABLE_CANONICA_CANONICAL_ANSWERS
 * 
 * @see functions/src/canonica/canonicaNightly.ts
 * @see __docs__/canonica/doctrine/01-core-doctrine.md (canonical coverage is THE KPI)
 */

import { DB_COLLECTIONS } from "@constant/database";
import { doc, getDoc } from "@firebase/firestore";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { canonicaFirebaseClient } from "@lib/firebase/canonicaFirebaseClient";

export interface CanonicaCoverageData {
    lastUpdated: any;
    coverage: {
        date: string;       // YYYY-MM-DD
        hits: number;       // Canonical answer served
        misses: number;     // Fell through to RAG
        rate: number;       // 0-100 (percentage)
        total: number;      // hits + misses
    } | null;
}

/**
 * Get canonical coverage KPI for a tenant+store.
 * Reads from platformSummary/coverage_{tId}_{sId} (1 read).
 */
export const getCanonicaCoverage = async (tId: number, sId: number): Promise<CanonicaCoverageData | null> => {
    return await apiCallComposer(
        async () => {
            const docRef = doc(canonicaFirebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, `coverage_${tId}_${sId}`);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as CanonicaCoverageData;
            }
            return null;
        },
        "getCanonicaCoverage"
    );
};
