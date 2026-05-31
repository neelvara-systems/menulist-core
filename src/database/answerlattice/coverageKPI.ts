/**
 * Answerlattice — Coverage KPI DAL
 * 
 * Reads canonical coverage metrics from platformSummary/coverage_{tId}_{sId}.
 * Data is written by the nightly scheduler (answerlatticeNightly.ts → aggregateCoverageKPI).
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS
 * 
 * @see functions-answerlattice/src/answerlattice/answerlatticeNightly.ts
 * @see __docs__/answerlattice/doctrine/01-core-doctrine.md (canonical coverage is THE KPI)
 */

import { DB_COLLECTIONS } from "@constant/database";
import { doc, getDoc } from "@firebase/firestore";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";

export interface AnswerlatticeCoverageData {
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
export const getAnswerlatticeCoverage = async (tId: number, sId: number): Promise<AnswerlatticeCoverageData | null> => {
    const docRef = doc(answerlatticeFirebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, `coverage_${tId}_${sId}`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as AnswerlatticeCoverageData;
    }
    return null;
};
