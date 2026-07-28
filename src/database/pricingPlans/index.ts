import { DB_COLLECTIONS } from "@constant/database";
import { PlanType, PricingPlan } from "@data/common";
import { collection, getDoc, getDocs, limit, query, where } from "@firebase/firestore";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { addDoc, doc, runTransaction, serverTimestamp } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.PRICING_PLANS;
const PLAN_NAME_MAX_LENGTH = 120;
const PLAN_DESCRIPTION_MAX_LENGTH = 1000;
const PLAN_FEATURE_MAX_LENGTH = 240;
const PLAN_FEATURE_MAX_ITEMS = 50;
const PLAN_PROVIDER_ID_MAX_LENGTH = 128;
export const PRICING_PLAN_QUERY_MAX_RESULTS = 100;

export type PricingPlanMutationInput = Omit<PricingPlan, 'createdOn' | 'id' | 'modifiedOn' | 'version'>;

const normalizeRequiredString = (value: unknown, maxLength: number): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized && normalized.length <= maxLength ? normalized : null;
};

const normalizeOptionalString = (value: unknown, maxLength: number): string | null | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    return normalizeRequiredString(value, maxLength);
};

const isFirestoreTimestampLike = (value: unknown): boolean => {
    if (!value || typeof value !== 'object') return false;
    try {
        const toMillis = (value as { toMillis?: unknown }).toMillis;
        return typeof toMillis === 'function'
            && Number.isFinite(toMillis.call(value));
    } catch {
        return false;
    }
};

const normalizePricingPlanFields = (value: unknown): PricingPlanMutationInput | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const plan = value as Partial<PricingPlan>;
    const name = normalizeRequiredString(plan.name, PLAN_NAME_MAX_LENGTH);
    const description = normalizeRequiredString(plan.description, PLAN_DESCRIPTION_MAX_LENGTH);
    const razorpayPlanId = normalizeOptionalString(plan.razorpayPlanId, PLAN_PROVIDER_ID_MAX_LENGTH);
    const features = Array.isArray(plan.features)
        ? plan.features.map((feature) => normalizeRequiredString(feature, PLAN_FEATURE_MAX_LENGTH))
        : [];
    if (
        !name
        || !description
        || typeof plan.price !== 'number'
        || !Number.isSafeInteger(plan.price)
        || plan.price < 0
        || (plan.periodicity !== 'MONTH' && plan.periodicity !== 'YEAR')
        || (plan.currency !== 'USD' && plan.currency !== 'INR')
        || !Array.isArray(plan.features)
        || plan.features.length > PLAN_FEATURE_MAX_ITEMS
        || features.some((feature) => feature === null)
        || typeof plan.active !== 'boolean'
        || (plan.planType !== 'B2C' && plan.planType !== 'B2B')
        || razorpayPlanId === null
        || (plan.recommended !== undefined && typeof plan.recommended !== 'boolean')
    ) {
        return null;
    }

    return {
        active: plan.active,
        currency: plan.currency,
        description,
        features: features as string[],
        name,
        periodicity: plan.periodicity,
        planType: plan.planType,
        price: plan.price,
        ...(plan.recommended !== undefined ? { recommended: plan.recommended } : {}),
        ...(razorpayPlanId !== undefined ? { razorpayPlanId } : {}),
    };
};

const getCollectionRef = () => {
    return collection(firebaseClient, COLLECTION)
}

const getDocRef = (docId: string) => {
    return doc(firebaseClient, `${COLLECTION}`, docId)
}

export const assertPricingPlanQueryWithinLimit = (size: number): void => {
    if (
        !Number.isSafeInteger(size)
        || size < 0
        || size > PRICING_PLAN_QUERY_MAX_RESULTS
    ) {
        throw new Error('Pricing plan query limit exceeded');
    }
};

export const normalizePricingPlan = (value: unknown, id: string): PricingPlan | null => {
    const fields = normalizePricingPlanFields(value);
    const version = value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Partial<PricingPlan>).version
        : null;
    if (!fields || !isValidFirestoreDocumentId(id) || !Number.isSafeInteger(version) || Number(version) < 1) {
        return null;
    }
    return { ...fields, id, version: Number(version) };
};

export const getAllPricingPlans = async () => {
    return await apiCallComposer(
        async () => {
            const querySnapshot = await getDocs(query(
                getCollectionRef(),
                limit(PRICING_PLAN_QUERY_MAX_RESULTS + 1),
            ));
            assertPricingPlanQueryWithinLimit(querySnapshot.size);
            return querySnapshot.docs
                .map((planDoc) => normalizePricingPlan(planDoc.data(), planDoc.id))
                .filter((plan): plan is PricingPlan => plan !== null);
        },
        "getAllPricingPlans"
    );
}

export const getActivePricingPlans = async (planType?: PlanType) => {
    return await apiCallComposer(
        async () => {
            if (planType !== undefined && planType !== 'B2C' && planType !== 'B2B') {
                throw new Error('Invalid pricing plan type');
            }
            // Create base query for active plans
            let queryRef = query(
                getCollectionRef(),
                where("active", "==", true),
                where("publicSafe", "==", true),
                limit(PRICING_PLAN_QUERY_MAX_RESULTS + 1),
            );

            // Add planType filter if specified
            if (planType) {
                queryRef = query(queryRef, where("planType", "==", planType));
            }

            const querySnapshot = await getDocs(queryRef);
            assertPricingPlanQueryWithinLimit(querySnapshot.size);
            if (querySnapshot.empty) {
                return ([]);
            } else {
                return querySnapshot.docs
                    .map((planDoc) => normalizePricingPlan(planDoc.data(), planDoc.id))
                    .filter((plan): plan is PricingPlan => plan !== null);
            }
        },
        "getActivePricingPlans"
    );
}

export const getPricingPlanById = async (id: string) => {
    return await apiCallComposer(
        async () => {
            if (!isValidFirestoreDocumentId(id)) return null;
            const collectionDocRef = getDocRef(id);
            const docSnap = await getDoc(collectionDocRef);
            if (docSnap.exists()) {
                return normalizePricingPlan(docSnap.data(), docSnap.id);
            } else {
                return null
            }
        },
        id,
        "getPricingPlanById"
    );
}

export const addPricingPlan = async (data: PricingPlanMutationInput) => {
    return await apiCallComposer(
        async () => {
            const fields = normalizePricingPlanFields(data);
            if (!fields) throw new Error('Invalid pricing plan data');
            const planData = {
                ...fields,
                publicSafe: true,
                version: 1,
                createdOn: serverTimestamp(),
                modifiedOn: serverTimestamp()
            };

            const docRef = await addDoc(getCollectionRef(), planData);

            return {
                ...fields,
                id: docRef.id,
                version: 1,
            };
        },
        data,
        "addPricingPlan"
    );
}

export const updatePricingPlan = async (data: PricingPlanMutationInput & { id: string }) => {
    return await apiCallComposer(
        async () => {
            if (!data.id || !isValidFirestoreDocumentId(data.id)) {
                throw new Error("Plan ID is required for updates");
            }
            const fields = normalizePricingPlanFields(data);
            if (!fields) throw new Error('Invalid pricing plan data');
            const planRef = getDocRef(data.id);
            return runTransaction(firebaseClient, async (transaction) => {
                const snapshot = await transaction.get(planRef);
                const currentPlan = snapshot.exists() ? normalizePricingPlan(snapshot.data(), snapshot.id) : null;
                const createdOn = snapshot.exists() ? snapshot.data().createdOn : null;
                const currentFields = normalizePricingPlanFields(currentPlan);
                if (
                    !currentPlan
                    || !currentFields
                    || !isFirestoreTimestampLike(createdOn)
                    || currentPlan.version >= Number.MAX_SAFE_INTEGER
                ) {
                    throw new Error('Pricing plan is unavailable for update');
                }
                const version = currentPlan.version + 1;
                transaction.set(planRef, {
                    ...fields,
                    createdOn,
                    publicSafe: true,
                    version,
                    modifiedOn: serverTimestamp(),
                }, { merge: false });
                return { ...fields, id: data.id, version };
            });
        },
        data,
        "updatePricingPlan"
    );
}

export const deactivatePricingPlan = async (id: string) => {
    return await apiCallComposer(
        async () => {
            if (!isValidFirestoreDocumentId(id)) {
                throw new Error('Invalid plan ID');
            }
            const planRef = getDocRef(id);
            return runTransaction(firebaseClient, async (transaction) => {
                const snapshot = await transaction.get(planRef);
                const currentPlan = snapshot.exists() ? normalizePricingPlan(snapshot.data(), snapshot.id) : null;
                const createdOn = snapshot.exists() ? snapshot.data().createdOn : null;
                const currentFields = normalizePricingPlanFields(currentPlan);
                if (
                    !currentPlan
                    || !currentFields
                    || !isFirestoreTimestampLike(createdOn)
                    || currentPlan.version >= Number.MAX_SAFE_INTEGER
                ) {
                    throw new Error('Pricing plan is unavailable for deactivation');
                }
                const version = currentPlan.version + 1;
                transaction.set(planRef, {
                    ...currentFields,
                    active: false,
                    createdOn,
                    modifiedOn: serverTimestamp(),
                    publicSafe: true,
                    version,
                }, { merge: false });
                return { id, active: false, version };
            });
        },
        id,
        "deactivatePricingPlan"
    );
}
