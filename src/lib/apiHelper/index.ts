import { DEFAULT_PRODUCT_ID } from "@constant/product";
import {
    ECOMSAI_PLATFORM_STORE_ID,
    ECOMSAI_PLATFORM_TENANT_ID,
    ECOMSAI_PLATFORM_USER_ID,
    ECOMSAI_PLATFORM_USER_NAME,
    ECOMSAI_PLATFORM_USER_ROLE,
} from "@constant/user";
import getActiveSession from "@lib/auth/getActiveSession";
import { Timestamp } from "firebase/firestore";

/**
 * Sanitize object for Firestore - converts undefined → null recursively
 *
 * SECURITY RULE 16: Firestore Undefined Sanitization
 * Firestore rejects undefined values. This utility converts them to null.
 *
 * @param obj - Object to sanitize
 * @returns New object with undefined values converted to null
 */
export function replaceUndefined<T>(obj: T): T {
    // Handle null early
    if (obj === null) {
        return obj;
    }

    // --- THIS IS THE NEW, CRITICAL FIX ---
    // Add a guard clause to specifically check for Timestamp objects.
    // If we find one, we return it immediately without processing it further.
    if (obj instanceof Timestamp) {
        return obj;
    }
    // --- END OF FIX ---

    // Handle arrays, including typed arrays
    if (Array.isArray(obj)) {
        return obj.map((item) => replaceUndefined(item)) as T;
    }

    // Handle other objects, including class instances
    if (typeof obj === "object") {
        const result = {} as T;
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = obj[key];
                if (value === undefined) {
                    (result as any)[key] = null; // Storing null is often better than an empty string
                } else {
                    (result as any)[key] = replaceUndefined(value);
                }
            }
        }
        return result;
    }

    // Handle undefined at the top level
    if (obj === undefined) {
        return null as T;
    }

    // Return primitives as is
    return obj;
}

export const requestBodyComposer = async (data: any) => {
    const session = await getActiveSession();

    // Create a copy of the data object
    const dataCopy = { ...data };

    // If data already contains sId and tId, preserve them (webhook case)
    // Otherwise, try to get from session or use platform defaults
    if (session) {
        // Session is available - user-initiated action
        dataCopy.pId =
            data.pId !== undefined
                ? data.pId
                : (session as any)?.pId || DEFAULT_PRODUCT_ID;

        dataCopy.sId =
            data.sId !== undefined
                ? data.sId
                : session?.sId == 0 || session?.sId
                    ? session?.sId
                    : ECOMSAI_PLATFORM_STORE_ID;

        dataCopy.tId =
            data.tId !== undefined
                ? data.tId
                : session?.tId == 0 || session?.tId
                    ? session?.tId
                    : ECOMSAI_PLATFORM_TENANT_ID;

        dataCopy.role =
            data.role !== undefined
                ? data.role
                : session?.role || ECOMSAI_PLATFORM_USER_ROLE;

        dataCopy.uId =
            data.uId !== undefined
                ? data.uId
                : session?.uId || ECOMSAI_PLATFORM_USER_ID;

        dataCopy.modifiedBy =
            data.modifiedBy !== undefined
                ? data.modifiedBy
                : session?.user?.name || ECOMSAI_PLATFORM_USER_NAME;
    } else {
        // No session available - webhook or server-initiated action
        // Keep existing values or use platform defaults
        dataCopy.pId = data.pId || DEFAULT_PRODUCT_ID;
        dataCopy.sId = Number(data.sId || ECOMSAI_PLATFORM_STORE_ID);
        dataCopy.tId = Number(data.tId || ECOMSAI_PLATFORM_TENANT_ID);
        dataCopy.role = data.role || ECOMSAI_PLATFORM_USER_ROLE;
        dataCopy.uId = data.uId || ECOMSAI_PLATFORM_USER_ID;
        dataCopy.modifiedBy = data.modifiedBy || ECOMSAI_PLATFORM_USER_NAME;
    }

    // Always add modifiedOn timestamp
    dataCopy.modifiedOn = Timestamp.now();

    // Add creation metadata if this is a new item
    if (data && (!data.id || !data.createdOn)) {
        dataCopy.createdOn = Timestamp.now();
        dataCopy.createdBy =
            session?.user?.name || data.createdBy || ECOMSAI_PLATFORM_USER_NAME;
    }

    // Guard: pId must always be present on every document write
    if (!dataCopy.pId) {
        dataCopy.pId = DEFAULT_PRODUCT_ID;
    }

    const result = replaceUndefined(dataCopy);
    return result;
};
