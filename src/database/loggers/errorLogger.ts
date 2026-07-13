import { DB_COLLECTIONS } from "@constant/database";
import { requestBodyComposer } from "@lib/apiHelper";
import { firebaseDatabase } from "@lib/firebase/firebaseClient";
import { get, push, ref, set, update } from "firebase/database";
import {
    getBoundedDatabaseLoggerStringContext,
    logDatabaseLoggerFailure,
} from "./loggerDiagnostics";

const COLLECTION = DB_COLLECTIONS.ERROR_LOGS;
type DatabaseLogRecord = Record<string, unknown>;

const getCollectionRef = () => {
    return ref(firebaseDatabase, COLLECTION)
}

const getDocRef = (docId: string | number) => {
    const normalizedId = String(docId);
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(normalizedId)) {
        throw new Error('INVALID_ERROR_LOG_ID');
    }
    return ref(firebaseDatabase, `${COLLECTION}/${normalizedId}`)
}

export const addErrorLog = async (logDetails: DatabaseLogRecord): Promise<string | null> => {
    let logId: string | null = null;
    try {
        const logRef = push(getCollectionRef());
        logId = logRef.key;
        if (!logId) {
            logDatabaseLoggerFailure('error_log_id_allocation_failed');
            return null;
        }

        await set(logRef, await requestBodyComposer(logDetails, { isNew: true }));
        return logId;
    } catch (error) {
        logDatabaseLoggerFailure('error_log_write_failed', error, {
            ...(logId ? getBoundedDatabaseLoggerStringContext('logId', logId) : {}),
        });
        return null;
    }
}

export const getRealtimeErrorLogs = async (_filters?: unknown): Promise<unknown | null> => {
    try {
        const snapshot = await get(getCollectionRef());
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        logDatabaseLoggerFailure('error_log_realtime_read_failed', error);
        return null;
    }
}

// Read data once with get()
export const getErrorLog = async (_filters?: unknown): Promise<unknown | null> => {
    try {
        const snapshot = await get(getCollectionRef());
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        logDatabaseLoggerFailure('error_log_read_failed', error);
        return null;
    }
}

export const updateErrorLog = async (logDetails: DatabaseLogRecord & { id: string | number }): Promise<void> => {
    const { id, ...patch } = logDetails;
    await update(getDocRef(id), await requestBodyComposer(patch, { isNew: false }));
}

export const getErrorLogById = async (logId: string | number): Promise<unknown | null> => {
    try {
        const snapshot = await get(getDocRef(logId));
        if (!snapshot.exists()) return null;
        const value = snapshot.val();
        return value && typeof value === 'object' && !Array.isArray(value)
            ? { ...value, logId }
            : null;
    } catch (error) {
        logDatabaseLoggerFailure('error_log_read_by_id_failed', error, {
            ...getBoundedDatabaseLoggerStringContext('logId', logId),
        });
        return null;
    }
}

export const deleteErrorLog = async (logId: string | number): Promise<void> => {
    await set(getDocRef(logId), null);
}
