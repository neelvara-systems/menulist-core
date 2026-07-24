import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import { normalizeAnswerlatticeResolvedEntityId } from './governanceIdBoundary';
import {
    parseAnswerlatticeRetrievalEntity,
    parseAnswerlatticeRetrievalSearchIndex,
} from './retrievalContracts';
import { answerlatticeTokenize } from './tokenizer';
import type { AnswerlatticeEntity, AnswerlatticeEntitySearchIndex } from '@type/answerlattice';

export type AnswerlatticeEntityLookupOption = {
    id: string;
    name: string;
    type?: string;
    description?: string;
    status?: string;
    matchedTokens: string[];
    score: number;
};

const MIN_ENTITY_QUERY_LENGTH = 3;
const MAX_ENTITY_QUERY_CHARS = 80;
const MAX_QUERY_TOKENS = 8;
const MAX_INDEX_MATCHES = 24;
const MAX_LEGACY_INDEX_READS = 40;
const MAX_ENTITY_OPTIONS = 10;

const getAnswerlatticeAdminDb = () => {
    const db = answerlatticeFirestoreAdmin as any;
    if (!db || typeof db.collection !== 'function') {
        throw new Error('Answerlattice Firebase is not configured');
    }
    return db;
};

export function normalizeAnswerlatticeEntityLookupQuery(queryText: string): string {
    return String(queryText || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_ENTITY_QUERY_CHARS);
}

export function getAnswerlatticeEntityLookupTokens(queryText: string): string[] {
    return Array.from(new Set(answerlatticeTokenize(queryText, MIN_ENTITY_QUERY_LENGTH))).slice(0, MAX_QUERY_TOKENS);
}

const scoreIndexEntry = (
    entry: AnswerlatticeEntitySearchIndex,
    queryTokens: string[],
): { score: number; matchedTokens: string[] } => {
    const normalizedTokens = new Set((entry.normalizedTokens || []).map(token => String(token).toLowerCase()));
    const canonicalName = String(entry.canonicalName || '').toLowerCase();
    const canonicalTokens = answerlatticeTokenize(canonicalName, MIN_ENTITY_QUERY_LENGTH);
    const synonymTokens = (entry.synonyms || []).flatMap(synonym => answerlatticeTokenize(synonym, MIN_ENTITY_QUERY_LENGTH));
    const weight = Number(entry.weight || 1);
    const matchedTokens: string[] = [];
    let score = 0;

    for (const token of queryTokens) {
        let tokenScore = 0;
        if (normalizedTokens.has(token)) tokenScore += weight * 5;
        if (canonicalTokens.some(canonicalToken => canonicalToken === token)) tokenScore += weight * 5;
        if (canonicalTokens.some(canonicalToken => canonicalToken.startsWith(token))) tokenScore += weight * 4;
        if (synonymTokens.some(synonymToken => synonymToken === token || synonymToken.startsWith(token))) tokenScore += weight * 3;
        if (canonicalName.includes(token)) tokenScore += weight;

        if (tokenScore > 0) {
            matchedTokens.push(token);
            score += tokenScore;
        }
    }

    return { score, matchedTokens };
};

const getEntityDocsById = async (
    entityIds: string[],
    scope: { tId: number; sId: number },
): Promise<Map<string, AnswerlatticeEntity>> => {
    const db = getAnswerlatticeAdminDb();
    const normalizedEntityIds = Array.from(new Set(
        entityIds
            .map(entityId => normalizeAnswerlatticeResolvedEntityId(entityId))
            .filter((entityId): entityId is string => Boolean(entityId)),
    ));
    if (!normalizedEntityIds.length) return new Map();

    const docs = await Promise.all(
        normalizedEntityIds.map(entityId => db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(entityId).get()),
    );
    const entities = new Map<string, AnswerlatticeEntity>();

    docs.forEach((doc: any) => {
        if (!doc.exists) return;
        try {
            const entity = parseAnswerlatticeRetrievalEntity({ ...(doc.data() || {}), id: doc.id }, scope);
            entities.set(entity.id, entity);
        } catch {
            // Malformed or cross-scope persisted rows are omitted from lookup.
        }
    });

    return entities;
};

const isReturnableEntityStatus = (status: unknown) => {
    const normalized = String(status || 'active').toLowerCase();
    return normalized === 'active' || normalized === 'beta';
};

export async function searchAnswerlatticeEntityLookupOptions(
    scope: { tId: number; sId: number },
    queryText: string,
): Promise<AnswerlatticeEntityLookupOption[]> {
    const tId = typeof scope.tId === 'number' ? normalizeAnswerlatticeScopeDocumentId(scope.tId) : null;
    const sId = typeof scope.sId === 'number' ? normalizeAnswerlatticeScopeDocumentId(scope.sId) : null;
    if (!tId || !sId) return [];
    const exactScope = { tId, sId };
    const normalizedQuery = normalizeAnswerlatticeEntityLookupQuery(queryText);
    const queryTokens = getAnswerlatticeEntityLookupTokens(normalizedQuery);
    if (queryTokens.length === 0) return [];

    const db = getAnswerlatticeAdminDb();
    const indexRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX);
    const prefixSnapshot = await indexRef
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('prefixTokens', 'array-contains-any', queryTokens)
        .limit(MAX_INDEX_MATCHES)
        .get();

    const snapshot = prefixSnapshot.empty
        ? await indexRef
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .limit(MAX_LEGACY_INDEX_READS)
            .get()
        : prefixSnapshot;

    const ranked = snapshot.docs
        .map((doc: any) => {
            try {
                return parseAnswerlatticeRetrievalSearchIndex({ ...(doc.data() || {}), id: doc.id }, exactScope);
            } catch {
                return null;
            }
        })
        .filter((entry): entry is AnswerlatticeEntitySearchIndex => entry !== null)
        .map((entry) => {
            const scored = scoreIndexEntry(entry, queryTokens);
            return { entry, ...scored };
        })
        .filter(item => item.score > 0 && item.entry.entityId)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_ENTITY_OPTIONS);

    if (!ranked.length) return [];

    const entitiesById = await getEntityDocsById(ranked.map(item => item.entry.entityId), exactScope);

    return ranked
        .map((item): AnswerlatticeEntityLookupOption | null => {
            const entityId = normalizeAnswerlatticeResolvedEntityId(item.entry.entityId);
            const entity = entityId ? entitiesById.get(entityId) : null;
            if (!entity) return null;
            if (!isReturnableEntityStatus(entity.status)) return null;

            return {
                id: entity.id,
                name: entity.name || item.entry.canonicalName || entity.id,
                type: entity.type,
                description: entity.description,
                status: entity.status,
                matchedTokens: item.matchedTokens,
                score: item.score,
            };
        })
        .filter((item): item is AnswerlatticeEntityLookupOption => Boolean(item))
        .slice(0, MAX_ENTITY_OPTIONS);
}
