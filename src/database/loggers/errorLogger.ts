import { DB_COLLECTIONS } from "@constant/database";
import { requestBodyComposer } from "@lib/apiHelper";
import { firebaseDatabase } from "@lib/firebase/firebaseClient";
import { child, get, onValue, ref, set } from "firebase/database";
import {
    getBoundedDatabaseLoggerStringContext,
    logDatabaseLoggerFailure,
} from "./loggerDiagnostics";

const COLLECTION = DB_COLLECTIONS.ERROR_LOGS;

const getCollectionRef = (logId) => {
    return ref(firebaseDatabase, `${COLLECTION}/${logId}`)
}

const getDocRef = (docId) => {
    return ref(firebaseDatabase, `${COLLECTION}/${docId}`)
}

export const addErrorLog = (logDetails) => {
    return new Promise(async (res, rej) => {
        const logId = new Date().getTime();
        set(getCollectionRef(logId), await requestBodyComposer(logDetails)).then((docRef: any) => {
            res(logId)
        }).catch((err) => {
            logDatabaseLoggerFailure('error_log_write_failed', err, {
                ...getBoundedDatabaseLoggerStringContext('logId', logId),
            });
            res(null);
        })
    })
}

export const getRealtimeErrorLogs = (filters) => {
    return new Promise((res, rej) => {
        const starCountRef = ref(firebaseDatabase, COLLECTION);
        onValue(starCountRef, (snapshot) => {
            const data = snapshot.val();
            res(data);
        });
    })
}

// Read data once with get()
export const getErrorLog = (filters) => {
    return new Promise(async (res, rej) => {
        get(child(ref(firebaseDatabase), COLLECTION)).then((snapshot) => {
            if (snapshot.exists()) {
                res(snapshot.val())
            } else {
                res(null)
            }
        }).catch((error) => {
            res(null)
            logDatabaseLoggerFailure('error_log_read_failed', error);
        });


    })
}

export const updateErrorLog = (logDetails) => {
    return new Promise(async (res, rej) => {
        const response = await set(getDocRef(logDetails.id), await requestBodyComposer(logDetails))
        res(response)
    })
}

export const getErrorLogById = (logId) => {
    return new Promise(async (res, rej) => {
        get(child(ref(firebaseDatabase), `${COLLECTION}/${logId}`)).then((snapshot) => {
            if (snapshot.exists()) {
                res({ ...(snapshot.val()), logId })
            } else {
                res(null)
            }
        }).catch((error) => {
            logDatabaseLoggerFailure('error_log_read_by_id_failed', error, {
                ...getBoundedDatabaseLoggerStringContext('logId', logId),
            });
            res(null);
        });
    })
}

export const deleteErrorLog = (logId) => {
    return new Promise(async (res, rej) => {
        const response = await set(getDocRef(logId), null)
        res(response)
    })
}
