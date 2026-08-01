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
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, where } from "@firebase/firestore";
import { parseAnswerlatticeAuditLog } from '@lib/answerlattice/auditLogPresentation';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import {
    normalizeAnswerlatticeCanonicalAnswerId,
    normalizeAnswerlatticeResolvedEntityId,
} from '@lib/answerlattice/governanceIdBoundary';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from '@lib/auth/getActiveSession';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/sessionUserDocumentId';
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import { AnswerlatticeAuditLog } from "@type/answerlattice";

const COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS;
const MAX_AUDIT_LOGS_PER_LOAD = 200;

const getCollectionRef = () => collection(answerlatticeFirebaseClient, COLLECTION);
const clampAuditLimit = (value: number, fallback: number) => {
    const normalized = typeof value === 'number' ? Math.floor(value) : Number.NaN;
    if (!Number.isFinite(normalized) || normalized <= 0) return fallback;
    return Math.min(normalized, MAX_AUDIT_LOGS_PER_LOAD);
};
const getActiveScope = async (expected?: { tId?: unknown; sId?: unknown }) => {
    const session = await getActiveSession();
    const scope = resolveAnswerlatticeSessionScope(session);
    const actorId = resolveCurrentSessionUserDocumentId(session);
    if (!scope || !actorId) throw new Error('Answerlattice workspace scope is required');
    if (expected?.tId !== undefined && expected.tId !== scope.tenantId) {
        throw new Error('Answerlattice tenant scope mismatch');
    }
    if (expected?.sId !== undefined && expected.sId !== scope.storeId) {
        throw new Error('Answerlattice workspace scope mismatch');
    }
    return { actorId, tId: scope.tenantId, sId: scope.storeId };
};

/**
 * Log an audit event (append-only — no update/delete allowed)
 */
export const addAuditLog = async (data: Omit<AnswerlatticeAuditLog, 'id' | 'pId'>) => {
    return await apiCallComposer(
        async () => {
            const scope = await getActiveScope({ tId: data.tId, sId: data.sId });
            const submitData = await answerlatticeRequestBodyComposer({
                ...data,
                performedBy: scope.actorId,
                timestamp: serverTimestamp(),
                tId: scope.tId,
                sId: scope.sId,
            }, { isNew: true });
            const docRef = await addDoc(getCollectionRef(), submitData);
            return { id: docRef.id };
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
            const scope = await getActiveScope({ tId, sId });
            const boundedMaxResults = clampAuditLimit(maxResults, 100);
            const q = query(
                getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                orderBy('timestamp', 'desc'),
                limit(boundedMaxResults)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeAuditLog[] = [];
            snapshot.forEach((d) => {
                const parsed = parseAnswerlatticeAuditLog(d.id, d.data(), scope);
                if (parsed) list.push(parsed);
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
            const scope = await getActiveScope({ tId, sId });
            const normalizedAnswerId = normalizeAnswerlatticeCanonicalAnswerId(answerId);
            if (!normalizedAnswerId) return [];
            const q = query(
                getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                where('entityType', '==', 'canonicalAnswer'),
                where('entityId', '==', normalizedAnswerId),
                orderBy('timestamp', 'desc'),
                limit(100)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeAuditLog[] = [];
            snapshot.forEach((d) => {
                const parsed = parseAnswerlatticeAuditLog(d.id, d.data(), scope);
                if (parsed) list.push(parsed);
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
            const scope = await getActiveScope({ tId, sId });
            const normalizedEntityId = normalizeAnswerlatticeResolvedEntityId(entityId);
            if (!normalizedEntityId) return [];
            const q = query(
                getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                where('entityId', '==', normalizedEntityId),
                orderBy('timestamp', 'desc'),
                limit(200)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeAuditLog[] = [];
            snapshot.forEach((d) => {
                const parsed = parseAnswerlatticeAuditLog(d.id, d.data(), scope);
                if (parsed) list.push(parsed);
            });
            return list;
        },
        "getAuditLogsForEntity"
    );
};
