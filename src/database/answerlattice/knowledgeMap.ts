import { DB_COLLECTIONS } from '@constant/database';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { getAnswerlatticeSourceVersionsDocId } from '@lib/answerlattice/compiledContext';
import {
    getAnswerlatticeEntityGraphFreshness,
    parseAnswerlatticeCurrentGraphSourceVersions,
    parseAnswerlatticeEntityGraphIndex,
    type AnswerlatticeEntityGraphFreshness,
} from '@lib/answerlattice/runtimeSummaryContracts';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import getActiveSession from '@lib/auth/getActiveSession';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import type { AnswerlatticeEntityGraphIndex } from '@type/answerlattice';
import { doc, getDoc } from 'firebase/firestore';

export type AnswerlatticeKnowledgeMapData = AnswerlatticeEntityGraphIndex & {
    freshness: AnswerlatticeEntityGraphFreshness;
};

/**
 * Reads the existing graph summary and its compact invalidation counters.
 * Node focus, filtering, and relationship expansion remain in memory.
 */
export const getAnswerlatticeKnowledgeMap = async (
    tId: number,
    sId: number,
): Promise<AnswerlatticeKnowledgeMapData | null> => apiCallComposer(
    async () => {
        const session = await getActiveSession();
        const scope = resolveAnswerlatticeSessionScope(session);
        if (!scope) throw new Error('Answerlattice workspace scope is required');
        if (scope.tenantId !== tId || scope.storeId !== sId) {
            throw new Error('Answerlattice knowledge map scope mismatch');
        }

        const [graphSnapshot, sourceVersionsSnapshot] = await Promise.all([
            getDoc(doc(
                answerlatticeFirebaseClient,
                DB_COLLECTIONS.PLATFORM_SUMMARY,
                `entityGraphIndex_${scope.tenantId}_${scope.storeId}`,
            )),
            getDoc(doc(
                answerlatticeFirebaseClient,
                DB_COLLECTIONS.PLATFORM_SUMMARY,
                getAnswerlatticeSourceVersionsDocId(scope.tenantId, scope.storeId),
            )),
        ]);
        if (!graphSnapshot.exists()) return null;
        const graph = parseAnswerlatticeEntityGraphIndex(graphSnapshot.data(), { tId, sId });
        if (!graph) throw new Error('Answerlattice knowledge map summary is invalid');
        const currentSourceVersions = sourceVersionsSnapshot.exists()
            ? parseAnswerlatticeCurrentGraphSourceVersions(sourceVersionsSnapshot.data(), { tId, sId })
            : null;
        return {
            ...graph,
            freshness: getAnswerlatticeEntityGraphFreshness(graph.sourceVersions, currentSourceVersions),
        };
    },
    { tId, sId },
    'getAnswerlatticeKnowledgeMap',
);
