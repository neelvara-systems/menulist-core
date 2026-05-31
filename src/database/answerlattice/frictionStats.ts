/**
 * Answerlattice — Product Friction Intelligence DAL
 * 
 * Reads friction snapshot and weekly insight from platformSummary.
 * Data is written by the nightly scheduler (frictionAggregation + frictionInsight).
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE
 * 
 * @see functions-answerlattice/src/answerlattice/frictionAggregation.ts
 * @see functions-answerlattice/src/answerlattice/frictionInsight.ts
 * @see __docs__/answerlattice/product-friction-intelligence/
 */

import { DB_COLLECTIONS } from "@constant/database";
import { doc, getDoc } from "@firebase/firestore";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import { AnswerlatticeFrictionInsight, AnswerlatticeFrictionSnapshot } from "@type/answerlattice";

/**
 * Get the nightly friction snapshot for a tenant+store.
 * Reads from platformSummary/frictionSnapshot_{tId}_{sId} (1 read).
 */
export const getFrictionSnapshot = async (tId: number, sId: number): Promise<AnswerlatticeFrictionSnapshot | null> => {
    return await apiCallComposer(
        async () => {
            const docRef = doc(answerlatticeFirebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, `frictionSnapshot_${tId}_${sId}`);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as AnswerlatticeFrictionSnapshot;
            }
            return null;
        },
        "getFrictionSnapshot"
    );
};

/**
 * Get the weekly AI-generated friction insight for a tenant+store.
 * Reads from platformSummary/friction_{tId}_{sId} (1 read).
 */
export const getFrictionInsight = async (tId: number, sId: number): Promise<AnswerlatticeFrictionInsight | null> => {
    return await apiCallComposer(
        async () => {
            const docRef = doc(answerlatticeFirebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, `friction_${tId}_${sId}`);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as AnswerlatticeFrictionInsight;
            }
            return null;
        },
        "getFrictionInsight"
    );
};
