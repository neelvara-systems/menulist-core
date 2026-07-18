import { normalizeAnswerlatticeResolvedEntityIds } from './governanceIdBoundary';

export const ANSWERLATTICE_HYBRID_EVIDENCE_ENTITY_LIMIT = 10;
export const ANSWERLATTICE_HYBRID_EVIDENCE_QUERY_LIMIT = 12;
export const ANSWERLATTICE_HYBRID_EVIDENCE_TOKEN_LIMIT = 8;

const ANSWERLATTICE_HYBRID_EVIDENCE_TEXT_LIMIT = 120_000;
const RRF_SMOOTHING = 60;
const VECTOR_LANE_WEIGHT = 1;
const EXACT_ENTITY_LANE_WEIGHT = 1.25;
const GENERIC_TECHNICAL_ACRONYMS = new Set([
    'api',
    'http',
    'https',
    'json',
    'sdk',
    'sql',
    'uri',
    'url',
    'uuid',
    'xml',
]);

const TECHNICAL_LITERAL_PATTERN =
    /(?<![A-Za-z0-9])--?[A-Za-z][A-Za-z0-9-]{0,80}(?![A-Za-z0-9-])|\/[A-Za-z0-9][A-Za-z0-9._~:/-]{1,120}|[A-Za-z0-9]+(?:[._:/-][A-Za-z0-9]+)+|[A-Z][A-Z0-9_]{3,}|(?<!\d)[45]\d{2}(?!\d)/g;

const normalizeTechnicalLiteral = (value: string): string => (
    value
        .trim()
        .replace(/^[([{"'`]+|[\])}"'`,.;:!?]+$/g, '')
        .toLowerCase()
        .slice(0, 128)
);

const isTechnicalLiteral = (rawValue: string, normalizedValue: string): boolean => {
    if (normalizedValue.length < 2) return false;
    if (GENERIC_TECHNICAL_ACRONYMS.has(normalizedValue)) return false;
    if (/^--?[a-z]/.test(normalizedValue)) return true;
    if (/[._:/]/.test(normalizedValue)) return true;
    if (/\d/.test(normalizedValue)) return true;
    return rawValue.length >= 4 && rawValue === rawValue.toUpperCase();
};

export const extractAnswerlatticeTechnicalLiterals = (query: string): string[] => {
    const rawMatches = String(query || '').match(TECHNICAL_LITERAL_PATTERN) || [];
    const literals: string[] = [];

    for (const rawValue of rawMatches) {
        const normalizedValue = normalizeTechnicalLiteral(rawValue);
        if (!isTechnicalLiteral(rawValue, normalizedValue)) continue;
        if (!literals.includes(normalizedValue)) literals.push(normalizedValue);
        if (literals.length >= ANSWERLATTICE_HYBRID_EVIDENCE_TOKEN_LIMIT) break;
    }

    return literals;
};

export type AnswerlatticeHybridEvidenceQuery = {
    eligible: boolean;
    entityIds: string[];
    technicalLiterals: string[];
};

export const prepareAnswerlatticeHybridEvidenceQuery = (
    query: string,
    entityIds: unknown,
): AnswerlatticeHybridEvidenceQuery => {
    const normalizedEntityIds = normalizeAnswerlatticeResolvedEntityIds(
        entityIds,
        ANSWERLATTICE_HYBRID_EVIDENCE_ENTITY_LIMIT,
    );
    const technicalLiterals = extractAnswerlatticeTechnicalLiterals(query);

    return {
        eligible: normalizedEntityIds.length > 0 && technicalLiterals.length > 0,
        entityIds: normalizedEntityIds,
        technicalLiterals,
    };
};

export type AnswerlatticeEntityEvidenceCandidate = {
    id: string;
    contentText?: string;
    entityIds?: unknown;
    modifiedOnMs?: number;
    tags?: string[];
    title?: string;
};

export type AnswerlatticeExactEntityEvidenceMatch = {
    id: string;
    matchedEntityIds: string[];
    matchedTechnicalLiterals: string[];
    modifiedOnMs: number;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const containsExactLiteral = (text: string, literal: string): boolean => {
    if (!text || !literal) return false;
    const leftBoundary = /^[a-z0-9]/i.test(literal)
        ? '(^|[^a-z0-9])'
        : literal.startsWith('-') ? '(^|[^a-z0-9-])' : '';
    const rightBoundary = /[a-z0-9]$/i.test(literal) ? '([^a-z0-9]|$)' : '';
    const pattern = new RegExp(`${leftBoundary}${escapeRegExp(literal)}${rightBoundary}`, 'i');
    return pattern.test(text);
};

export const rankAnswerlatticeExactEntityEvidence = (
    preparedQuery: AnswerlatticeHybridEvidenceQuery,
    candidates: AnswerlatticeEntityEvidenceCandidate[],
): AnswerlatticeExactEntityEvidenceMatch[] => {
    if (!preparedQuery.eligible) return [];

    const queryEntityIds = new Set(preparedQuery.entityIds);
    const matches: AnswerlatticeExactEntityEvidenceMatch[] = [];

    for (const candidate of candidates.slice(0, ANSWERLATTICE_HYBRID_EVIDENCE_QUERY_LIMIT)) {
        const id = String(candidate.id || '').trim();
        if (!id) continue;

        const candidateEntityIds = normalizeAnswerlatticeResolvedEntityIds(
            candidate.entityIds,
            ANSWERLATTICE_HYBRID_EVIDENCE_ENTITY_LIMIT,
        );
        const matchedEntityIds = candidateEntityIds.filter(entityId => queryEntityIds.has(entityId));
        if (matchedEntityIds.length === 0) continue;

        const evidenceText = [
            String(candidate.title || ''),
            ...(Array.isArray(candidate.tags) ? candidate.tags.map(String) : []),
            String(candidate.contentText || ''),
        ].join('\n').slice(0, ANSWERLATTICE_HYBRID_EVIDENCE_TEXT_LIMIT);
        const matchedTechnicalLiterals = preparedQuery.technicalLiterals.filter(
            literal => containsExactLiteral(evidenceText, literal),
        );
        if (matchedTechnicalLiterals.length === 0) continue;

        const modifiedOnMs = Number(candidate.modifiedOnMs);
        matches.push({
            id,
            matchedEntityIds,
            matchedTechnicalLiterals,
            modifiedOnMs: Number.isFinite(modifiedOnMs) && modifiedOnMs > 0 ? modifiedOnMs : 0,
        });
    }

    return matches.sort((left, right) => (
        right.matchedTechnicalLiterals.length - left.matchedTechnicalLiterals.length
        || right.matchedEntityIds.length - left.matchedEntityIds.length
        || right.modifiedOnMs - left.modifiedOnMs
        || left.id.localeCompare(right.id)
    ));
};

export type AnswerlatticeFusedEvidenceRank = {
    id: string;
    methods: Array<'vector' | 'exact_entity'>;
    score: number;
};

export const fuseAnswerlatticeEvidenceRanks = ({
    vectorDocumentIds,
    exactEntityMatches,
    limit = ANSWERLATTICE_HYBRID_EVIDENCE_QUERY_LIMIT,
}: {
    vectorDocumentIds: string[];
    exactEntityMatches: AnswerlatticeExactEntityEvidenceMatch[];
    limit?: number;
}): AnswerlatticeFusedEvidenceRank[] => {
    const ranks = new Map<string, {
        exactRank: number;
        exactTechnicalLiteralCount: number;
        methods: Set<'vector' | 'exact_entity'>;
        score: number;
        vectorRank: number;
    }>();

    const addRank = (
        id: string,
        method: 'vector' | 'exact_entity',
        rank: number,
        weight: number,
        exactTechnicalLiteralCount = 0,
    ) => {
        if (!id || rank < 1) return;
        const current = ranks.get(id) || {
            exactRank: Number.POSITIVE_INFINITY,
            exactTechnicalLiteralCount: 0,
            methods: new Set<'vector' | 'exact_entity'>(),
            score: 0,
            vectorRank: Number.POSITIVE_INFINITY,
        };
        if (current.methods.has(method)) return;

        current.methods.add(method);
        current.score += weight / (RRF_SMOOTHING + rank);
        if (method === 'vector') current.vectorRank = rank;
        if (method === 'exact_entity') {
            current.exactRank = rank;
            current.exactTechnicalLiteralCount = exactTechnicalLiteralCount;
        }
        ranks.set(id, current);
    };

    Array.from(new Set(vectorDocumentIds.filter(Boolean))).forEach((id, index) => {
        addRank(id, 'vector', index + 1, VECTOR_LANE_WEIGHT);
    });
    exactEntityMatches.forEach((match, index) => {
        addRank(
            match.id,
            'exact_entity',
            index + 1,
            EXACT_ENTITY_LANE_WEIGHT,
            match.matchedTechnicalLiterals.length,
        );
    });

    const safeLimit = Math.max(
        1,
        Math.min(ANSWERLATTICE_HYBRID_EVIDENCE_QUERY_LIMIT, Math.floor(Number(limit) || 1)),
    );

    return Array.from(ranks.entries())
        .sort(([leftId, left], [rightId, right]) => (
            right.score - left.score
            || right.methods.size - left.methods.size
            || right.exactTechnicalLiteralCount - left.exactTechnicalLiteralCount
            || left.vectorRank - right.vectorRank
            || left.exactRank - right.exactRank
            || leftId.localeCompare(rightId)
        ))
        .slice(0, safeLimit)
        .map(([id, rank]) => ({
            id,
            methods: Array.from(rank.methods),
            score: rank.score,
        }));
};
