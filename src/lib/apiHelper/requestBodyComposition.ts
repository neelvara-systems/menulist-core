import { DEFAULT_PRODUCT_ID } from "@constant/product";
import {
    ECOMSAI_PLATFORM_STORE_ID,
    ECOMSAI_PLATFORM_TENANT_ID,
    ECOMSAI_PLATFORM_USER_ID,
    ECOMSAI_PLATFORM_USER_NAME,
    ECOMSAI_PLATFORM_USER_ROLE,
} from "@constant/user";
import { Timestamp } from "firebase/firestore";
import { sanitizeForFirestore } from "@lib/firestore/sanitizeForFirestore";

export type RequestBodyComposerOptions = Readonly<{
    isNew: boolean;
}>;

export type RequestBodyComposerSession = Readonly<{
    pId?: string | null;
    sId?: number | string | null;
    tId?: number | string | null;
    role?: string | null;
    uId?: string | null;
    user?: Readonly<{
        name?: string | null;
    }> | null;
}>;

export type RequestBodyPersistenceMetadata = {
    pId: string;
    sId: number | string;
    tId: number | string;
    role: string;
    uId: number | string;
    modifiedBy: string;
    modifiedOn: Timestamp;
    createdBy?: string;
    createdOn?: Timestamp;
};

// Runtime sanitization is deep, but TypeScript cannot distinguish a plain
// record from an arbitrary class structurally. Keep nested class types intact.
export type UndefinedToNull<T> = T extends undefined ? null : T;

const isPlainRecord = (value: object): value is Record<string, unknown> => {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};

/**
 * Converts undefined values to null without flattening Firestore SDK values or
 * arbitrary class instances. Plain records and arrays are copied defensively.
 */
export function replaceUndefined<T>(value: T): UndefinedToNull<T> {
    return sanitizeForFirestore(value) as UndefinedToNull<T>;
}

const normalizeScopeId = (value: unknown, fallback: number, field: "sId" | "tId"): number | string => {
    const candidate = value === undefined || value === null || value === "" ? fallback : value;
    if (typeof candidate === "number" && Number.isSafeInteger(candidate) && candidate >= 0) {
        return candidate;
    }
    if (typeof candidate === "string") {
        const normalized = candidate.trim();
        if (/^(0|[1-9]\d*)$/.test(normalized)) {
            const numeric = Number(normalized);
            if (Number.isSafeInteger(numeric)) return normalized;
        }
    }
    throw new TypeError(`Invalid ${field} in Firestore request body`);
};

const resolveNonEmptyString = (value: unknown, fallback: string) => (
    typeof value === "string" && value.trim() ? value.trim() : fallback
);

const resolveActorId = (value: unknown, fallback: number | string): number | string => {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
    return fallback;
};

/** Pure request-body composition boundary used by browser and server callers. */
export function composeRequestBody<T extends object>(
    data: T,
    session: RequestBodyComposerSession | null | undefined,
    options: RequestBodyComposerOptions,
    now: Timestamp = Timestamp.now(),
): UndefinedToNull<T & RequestBodyPersistenceMetadata> {
    if (!isPlainRecord(data) || Array.isArray(data)) {
        throw new TypeError("Firestore request body must be a plain object");
    }

    const dataRecord = data as Record<string, unknown>;
    const sessionName = resolveNonEmptyString(session?.user?.name, ECOMSAI_PLATFORM_USER_NAME);
    const modifiedBy = session
        ? sessionName
        : resolveNonEmptyString(dataRecord.modifiedBy, ECOMSAI_PLATFORM_USER_NAME);
    const dataCopy: Record<string, unknown> = {
        ...dataRecord,
        pId: resolveNonEmptyString(
            dataRecord.pId,
            resolveNonEmptyString(session?.pId, DEFAULT_PRODUCT_ID),
        ),
        sId: normalizeScopeId(
            dataRecord.sId ?? session?.sId,
            ECOMSAI_PLATFORM_STORE_ID,
            "sId",
        ),
        tId: normalizeScopeId(
            dataRecord.tId ?? session?.tId,
            ECOMSAI_PLATFORM_TENANT_ID,
            "tId",
        ),
        role: session
            ? resolveNonEmptyString(session.role, ECOMSAI_PLATFORM_USER_ROLE)
            : resolveNonEmptyString(dataRecord.role, ECOMSAI_PLATFORM_USER_ROLE),
        uId: session
            ? resolveActorId(session.uId, ECOMSAI_PLATFORM_USER_ID)
            : resolveActorId(dataRecord.uId, ECOMSAI_PLATFORM_USER_ID),
        modifiedBy,
        modifiedOn: now,
    };

    if (options.isNew) {
        dataCopy.createdOn = now;
        dataCopy.createdBy = modifiedBy;
    } else {
        // Creation metadata is immutable. Update callers use merge/update
        // semantics and must never forward stale or caller-controlled values.
        delete dataCopy.createdOn;
        delete dataCopy.createdBy;
    }

    return replaceUndefined(dataCopy) as UndefinedToNull<T & RequestBodyPersistenceMetadata>;
}
