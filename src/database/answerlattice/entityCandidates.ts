/**
 * Answerlattice — Entity Candidates DAL (Ontology Bootstrap)
 * 
 * Staging collection for AI-extracted entity candidates.
 * Candidates go through human validation before becoming real entities.
 * 
 * Flow: KB → AI extraction → entity_candidates → human review → entities
 * 
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md
 */

import { DB_COLLECTIONS } from "@constant/database";
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where } from "@firebase/firestore";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import { AnswerlatticeEntityCandidate } from "@type/answerlattice";

const COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_ENTITY_CANDIDATES;
const PENDING_CANDIDATES_LIMIT = 200;

const getCollectionRef = () => collection(answerlatticeFirebaseClient, COLLECTION);
const getDocRef = (docId: string) => doc(answerlatticeFirebaseClient, COLLECTION, docId);

/**
 * Get all entity candidates for a tenant+store
 */
export const getEntityCandidates = async (tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                orderBy('confidence', 'desc'),
                limit(500)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeEntityCandidate[] = [];
            snapshot.forEach((d) => {
                list.push({ ...d.data(), id: d.id } as AnswerlatticeEntityCandidate);
            });
            return list;
        },
        "getEntityCandidates"
    );
};

/**
 * Get pending entity candidates (awaiting review)
 */
export const getPendingCandidates = async (tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                where('status', '==', 'pending'),
                orderBy('confidence', 'desc'),
                limit(PENDING_CANDIDATES_LIMIT)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeEntityCandidate[] = [];
            snapshot.forEach((d) => {
                list.push({ ...d.data(), id: d.id } as AnswerlatticeEntityCandidate);
            });
            return list;
        },
        "getPendingCandidates"
    );
};

/**
 * Add a new entity candidate (from AI extraction)
 */
export const addEntityCandidate = async (data: Omit<AnswerlatticeEntityCandidate, 'id'>) => {
    return await apiCallComposer(
        async () => {
            const submitData = await answerlatticeRequestBodyComposer({
                ...data,
                status: 'pending',
            });
            const docRef = await addDoc(getCollectionRef(), submitData);
            return { ...submitData, id: docRef.id } as AnswerlatticeEntityCandidate;
        },
        data,
        "addEntityCandidate"
    );
};

/**
 * Approve a candidate (moves to entities collection separately)
 */
export const approveCandidateStatus = async (candidateId: string) => {
    return await apiCallComposer(
        async () => {
            const composedData = await answerlatticeRequestBodyComposer({ status: 'approved' });
            await setDoc(getDocRef(candidateId), composedData, { merge: true });
            return composedData;
        },
        { candidateId },
        "approveCandidateStatus"
    );
};

/**
 * Reject a candidate
 */
export const rejectCandidateStatus = async (candidateId: string) => {
    return await apiCallComposer(
        async () => {
            const composedData = await answerlatticeRequestBodyComposer({ status: 'rejected' });
            await setDoc(getDocRef(candidateId), composedData, { merge: true });
            return composedData;
        },
        { candidateId },
        "rejectCandidateStatus"
    );
};

/**
 * Promote an approved candidate to a real entity + search index entry (one-click)
 * 
 * This is the critical exit point of the ontology bootstrap pipeline:
 * candidate → real entity + search index → available for canonical retrieval
 * 
 * Without this, candidates pile up with no path to production.
 */
// Ontology Authority Rules (Phase 4 — ChatGPT Review Fix)
// Prevents entity explosion from weak KB extraction.
// Entity must meet minimum authority threshold to be promoted.
const ONTOLOGY_AUTHORITY_RULES = {
    minArticleReferences: 2,    // Must be referenced in ≥2 KB articles
    minSignalReferences: 3,     // OR must appear in ≥3 support signals
    minConfidence: 0.5,         // AND must have ≥50% extraction confidence
};

export const promoteCandidate = async (candidateId: string, tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            // 1. Fetch candidate
            const candidateSnap = await getDoc(getDocRef(candidateId));
            if (!candidateSnap.exists()) {
                throw new Error(`Candidate ${candidateId} not found`);
            }
            const candidate = candidateSnap.data() as AnswerlatticeEntityCandidate;

            if (Number(candidate.tId) !== Number(tId) || Number(candidate.sId) !== Number(sId)) {
                throw new Error('Candidate is outside the current Answerlattice workspace');
            }

            if (candidate.status !== 'approved' && candidate.status !== 'pending') {
                throw new Error(`Cannot promote candidate in '${candidate.status}' state`);
            }

            // 1b. Ontology Authority Guard — prevents entity pollution
            const freq = candidate.frequency || { articles: 0, tickets: 0, chat: 0 };
            const totalSignals = freq.tickets + freq.chat;
            const meetsArticleThreshold = freq.articles >= ONTOLOGY_AUTHORITY_RULES.minArticleReferences;
            const meetsSignalThreshold = totalSignals >= ONTOLOGY_AUTHORITY_RULES.minSignalReferences;
            const meetsConfidence = candidate.confidence >= ONTOLOGY_AUTHORITY_RULES.minConfidence;

            if (!meetsConfidence) {
                throw new Error(`Candidate confidence ${candidate.confidence} below minimum ${ONTOLOGY_AUTHORITY_RULES.minConfidence}. Review and adjust before promoting.`);
            }
            if (!meetsArticleThreshold && !meetsSignalThreshold) {
                throw new Error(
                    `Candidate does not meet authority threshold: needs ≥${ONTOLOGY_AUTHORITY_RULES.minArticleReferences} article refs (has ${freq.articles}) OR ≥${ONTOLOGY_AUTHORITY_RULES.minSignalReferences} signal refs (has ${totalSignals}). Enrich frequency data or manually approve.`
                );
            }

            // 2. Create real entity
            const { addEntity } = await import('@database/answerlattice/entities');
            const slug = candidate.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
            const entity = await addEntity({
                tId,
                sId,
                type: candidate.type,
                name: candidate.name,
                slug,
                description: candidate.description,
                status: 'active',
                currentVersion: 1000000, // v1.0.0 normalized
            });

            if (!entity?.id) {
                throw new Error('Failed to create entity from candidate');
            }

            // 3. Create search index entry
            const { upsertEntitySearchIndex } = await import('@database/answerlattice/entities');
            const { buildSearchIndexEntry } = await import('@lib/answerlattice/entityExtraction');
            const indexData = buildSearchIndexEntry({
                name: candidate.name,
                slug,
                description: candidate.description,
            });

            await upsertEntitySearchIndex({
                tId,
                sId,
                entityId: entity.id,
                ...indexData,
            });

            // 4. Mark candidate as approved
            const composedData = await answerlatticeRequestBodyComposer({ status: 'approved' });
            await setDoc(getDocRef(candidateId), composedData, { merge: true });

            // 5. Audit log
            const { addAuditLog } = await import('@database/answerlattice/auditLogs');
            const { Timestamp } = await import('firebase/firestore');
            await addAuditLog({
                tId,
                sId,
                action: 'entity_promoted_from_candidate',
                entityType: 'entity',
                entityId: entity.id,
                previousState: { candidateId, candidateStatus: candidate.status },
                newState: { entityId: entity.id, name: candidate.name, type: candidate.type },
                performedBy: 'admin',
                timestamp: Timestamp.now(),
            });

            return { entity, candidateId, promoted: true };
        },
        { candidateId, tId, sId },
        "promoteCandidate"
    );
};

/**
 * Mark a candidate as merged (duplicate merged into existing entity)
 */
export const mergeCandidateStatus = async (candidateId: string) => {
    return await apiCallComposer(
        async () => {
            const composedData = await answerlatticeRequestBodyComposer({ status: 'merged' });
            await setDoc(getDocRef(candidateId), composedData, { merge: true });
            return composedData;
        },
        { candidateId },
        "mergeCandidateStatus"
    );
};
