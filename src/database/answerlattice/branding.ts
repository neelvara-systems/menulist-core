/**
 * Answerlattice — Advanced Branding Profile DAL
 *
 * Private rollout-gated profile. No customer-facing surface currently consumes it.
 * Stored in platformSummary collection using key: branding_{tId}_{sId}
 *
 * @see __docs__/answerlattice/advanced-white-label/
 */

import { DB_COLLECTIONS } from "@constant/database";
import { PRODUCT_IDS } from "@constant/product";
import { doc, getDoc, setDoc } from "@firebase/firestore";
import {
    normalizeStoredAnswerlatticeAdvancedBranding,
    parseAnswerlatticeAdvancedBranding,
} from '@lib/answerlattice/advancedBrandingContracts';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import { ANSWERLATTICE_DEFAULT_BRANDING, AnswerlatticeBrandingConfig } from "@type/answerlattice";

const COLLECTION = DB_COLLECTIONS.PLATFORM_SUMMARY;

const normalizeBrandingScope = (tId: unknown, sId: unknown) => {
    const tenantId = normalizeAnswerlatticeScopeDocumentId(tId);
    const storeId = normalizeAnswerlatticeScopeDocumentId(sId);
    if (!tenantId || !storeId) {
        throw new Error('Answerlattice branding scope is not available.');
    }
    return { tId: tenantId, sId: storeId };
};

const getBrandingDocRef = (tId: number, sId: number) => {
    const scope = normalizeBrandingScope(tId, sId);
    return doc(answerlatticeFirebaseClient, COLLECTION, `branding_${scope.tId}_${scope.sId}`);
};

/**
 * Get branding config for a tenant+store.
 * Returns default branding if no config saved yet.
 */
export const getBrandingConfig = async (tId: number, sId: number): Promise<AnswerlatticeBrandingConfig> => {
    const scope = normalizeBrandingScope(tId, sId);
    return apiCallComposer(
        async () => {
            const docSnap = await getDoc(getBrandingDocRef(scope.tId, scope.sId));
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (
                    data.pId !== PRODUCT_IDS.ANSWERLATTICE
                    || normalizeAnswerlatticeScopeDocumentId(data.tId) !== scope.tId
                    || normalizeAnswerlatticeScopeDocumentId(data.sId) !== scope.sId
                ) {
                    throw new Error('Answerlattice branding ownership is invalid.');
                }
                return normalizeStoredAnswerlatticeAdvancedBranding(data.branding);
            }
            return { ...ANSWERLATTICE_DEFAULT_BRANDING };
        },
        "getBrandingConfig"
    );
};

/**
 * Save branding config for a tenant+store.
 * Merge-writes to prevent overwriting other fields on the doc.
 */
export const saveBrandingConfig = async (
    tId: number,
    sId: number,
    config: AnswerlatticeBrandingConfig
): Promise<AnswerlatticeBrandingConfig> => {
    const scope = normalizeBrandingScope(tId, sId);
    const normalizedConfig = parseAnswerlatticeAdvancedBranding(config);
    return apiCallComposer(
        async () => {
            const composedData = await answerlatticeRequestBodyComposer({
                ...scope,
                branding: normalizedConfig,
            }, { isNew: false });
            await setDoc(getBrandingDocRef(scope.tId, scope.sId), composedData, { merge: true });
            return normalizedConfig;
        },
        { ...scope, brandingKeys: Object.keys(normalizedConfig) },
        "saveBrandingConfig"
    );
};
