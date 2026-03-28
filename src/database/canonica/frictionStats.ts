/**
 * Canonica — Product Friction Intelligence DAL
 * 
 * Reads friction snapshot and weekly insight from platformSummary.
 * Data is written by the nightly scheduler (frictionAggregation + frictionInsight).
 * 
 * Feature-flagged: ENABLE_CANONICA_FRICTION_INTELLIGENCE
 * 
 * @see functions-canonica/src/canonica/frictionAggregation.ts
 * @see functions-canonica/src/canonica/frictionInsight.ts
 * @see __docs__/canonica/product-friction-intelligence/
 */

import { DB_COLLECTIONS } from "@constant/database";
import { doc, getDoc } from "@firebase/firestore";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { canonicaFirebaseClient } from "@lib/firebase/canonicaFirebaseClient";
import { CanonicaFrictionInsight, CanonicaFrictionSnapshot } from "@type/canonica";

/**
 * Get the nightly friction snapshot for a tenant+store.
 * Reads from platformSummary/frictionSnapshot_{tId}_{sId} (1 read).
 */
export const getFrictionSnapshot = async (tId: number, sId: number): Promise<CanonicaFrictionSnapshot | null> => {
    return await apiCallComposer(
        async () => {
            const docRef = doc(canonicaFirebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, `frictionSnapshot_${tId}_${sId}`);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as CanonicaFrictionSnapshot;
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
export const getFrictionInsight = async (tId: number, sId: number): Promise<CanonicaFrictionInsight | null> => {
    return await apiCallComposer(
        async () => {
            const docRef = doc(canonicaFirebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, `friction_${tId}_${sId}`);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as CanonicaFrictionInsight;
            }
            return null;
        },
        "getFrictionInsight"
    );
};
