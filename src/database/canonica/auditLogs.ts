/**
 * Canonica — Audit Logs DAL
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
 * @see __docs__/canonica/doctrine/05-architecture-evolution.md
 */

import { DB_COLLECTIONS } from "@constant/database";
import { addDoc, collection, getDocs, limit, orderBy, query, where } from "@firebase/firestore";
import { canonicaRequestBodyComposer } from '@lib/canonica/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { canonicaFirebaseClient } from "@lib/firebase/canonicaFirebaseClient";
import { CanonicaAuditLog } from "@type/canonica";

const COLLECTION = DB_COLLECTIONS.CANONICA_AUDIT_LOGS;

const getCollectionRef = () => collection(canonicaFirebaseClient, COLLECTION);

/**
 * Log an audit event (append-only — no update/delete allowed)
 */
export const addAuditLog = async (data: Omit<CanonicaAuditLog, 'id'>) => {
    return await apiCallComposer(
        async () => {
            const submitData = await canonicaRequestBodyComposer(data);
            const docRef = await addDoc(getCollectionRef(), submitData);
            return { ...submitData, id: docRef.id } as CanonicaAuditLog;
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
            const q = query(
                getCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                orderBy('timestamp', 'desc'),
                limit(maxResults)
            );
            const snapshot = await getDocs(q);
            const list: CanonicaAuditLog[] = [];
            snapshot.forEach((d) => {
                list.push({ ...d.data(), id: d.id } as CanonicaAuditLog);
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
                where('tId', '==', tId),
                where('sId', '==', sId),
                where('entityType', '==', 'canonicalAnswer'),
                where('entityId', '==', answerId),
                orderBy('timestamp', 'desc'),
                limit(100)
            );
            const snapshot = await getDocs(q);
            const list: CanonicaAuditLog[] = [];
            snapshot.forEach((d) => {
                list.push({ ...d.data(), id: d.id } as CanonicaAuditLog);
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
                where('tId', '==', tId),
                where('sId', '==', sId),
                where('entityId', '==', entityId),
                orderBy('timestamp', 'desc'),
                limit(200)
            );
            const snapshot = await getDocs(q);
            const list: CanonicaAuditLog[] = [];
            snapshot.forEach((d) => {
                list.push({ ...d.data(), id: d.id } as CanonicaAuditLog);
            });
            return list;
        },
        "getAuditLogsForEntity"
    );
};
