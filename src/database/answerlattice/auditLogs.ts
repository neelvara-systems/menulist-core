/**
 * Answerlattice — Audit Logs DAL
 * 
 * Append-only audit trail for all governance actions.
 * 
 * RULES:
 * - Append-only (NO update, NO delete)
 * - Every state transition must be logged
 * - Includes who, what, previous state, new state, timestamp
 * - Tenant-scoped (tId + sId mandatory)
 * - Retention ≥ 3 years
 * 
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md
 */

import { DB_COLLECTIONS } from "@constant/database";
import { PRODUCT_IDS } from '@constant/product';
import { addDoc, collection, getDocs, limit, orderBy, query, where } from "@firebase/firestore";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import { AnswerlatticeAuditLog } from "@type/answerlattice";

const COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS;
const MAX_AUDIT_LOGS_PER_LOAD = 200;

const getCollectionRef = () => collection(answerlatticeFirebaseClient, COLLECTION);
const clampAuditLimit = (value: number, fallback: number) => {
    const normalized = Math.floor(Number(value));
    if (!Number.isFinite(normalized) || normalized <= 0) return fallback;
    return Math.min(normalized, MAX_AUDIT_LOGS_PER_LOAD);
};

/**
 * Log an audit event (append-only — no update/delete allowed)
 */
export const addAuditLog = async (data: Omit<AnswerlatticeAuditLog, 'id'>) => {
    return await apiCallComposer(
        async () => {
            const submitData = await answerlatticeRequestBodyComposer(data, { isNew: true });
            const docRef = await addDoc(getCollectionRef(), submitData);
            return { ...submitData, id: docRef.id } as AnswerlatticeAuditLog;
        },
        data,
        "addAuditLog"
    );
};

/**
 * Get audit logs for a tenant+store (paginated, most recent first)
 */
export const getAuditLogs = async (tId: number, sId: number, maxResults: number = 100) => {
    return await apiCallComposer(
        async () => {
            const boundedMaxResults = clampAuditLimit(maxResults, 100);
            const q = query(
                getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', tId),
                where('sId', '==', sId),
                orderBy('timestamp', 'desc'),
                limit(boundedMaxResults)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeAuditLog[] = [];
            snapshot.forEach((d) => {
                list.push({ ...d.data(), id: d.id } as AnswerlatticeAuditLog);
            });
            return list;
        },
        "getAuditLogs"
    );
};

/**
 * Get audit logs for a specific canonical answer (version history).
 * Filters by entityType='canonicalAnswer' and the answer's ID.
 * Phase 4 — Answer Version History (3.4)
 */
export const getAnswerVersionHistory = async (tId: number, sId: number, answerId: string) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', tId),
                where('sId', '==', sId),
                where('entityType', '==', 'canonicalAnswer'),
                where('entityId', '==', answerId),
                orderBy('timestamp', 'desc'),
                limit(100)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeAuditLog[] = [];
            snapshot.forEach((d) => {
                list.push({ ...d.data(), id: d.id } as AnswerlatticeAuditLog);
            });
            return list;
        },
        "getAnswerVersionHistory"
    );
};

/**
 * Get audit logs for a specific entity
 */
export const getAuditLogsForEntity = async (tId: number, sId: number, entityId: string) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', tId),
                where('sId', '==', sId),
                where('entityId', '==', entityId),
                orderBy('timestamp', 'desc'),
                limit(200)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeAuditLog[] = [];
            snapshot.forEach((d) => {
                list.push({ ...d.data(), id: d.id } as AnswerlatticeAuditLog);
            });
            return list;
        },
        "getAuditLogsForEntity"
    );
};
