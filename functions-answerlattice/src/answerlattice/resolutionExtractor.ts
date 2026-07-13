/**
 * Answerlattice — Ticket Resolution Knowledge Extractor (Cloud Function)
 * 
 * Nightly Step 14: Extracts knowledge candidates from resolved ticket clusters.
 * Uses accumulation architecture — only processes when 3+ tickets cluster around
 * the same entity with substantive resolutions.
 * 
 * Expansion Item #9 — Ticket → Knowledge Loop
 * Feature-flagged: ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE
 * 
 * RULES:
 * - Accumulation only (3+ tickets per entity required)
 * - Max 5 drafts per nightly run (LLM cost cap)
 * - Deduplication: 3 stages (existing answer, pending proposal, post-extraction)
 * - Read-only ticket access — resolution captured at signal emission time
 * - Failure never blocks other nightly steps (fire-and-forget)
 * - Idempotent: running twice produces identical results
 * 
 * @see __docs__/answerlattice/ticket-knowledge-loop/
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { createHash } from 'crypto';
import { ANSWERLATTICE_TEXT_MODEL } from '../constants/ai';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { firestoreAdmin as db } from '../firebaseAdmin';
import {
    ANSWERLATTICE_AI_ACTIONS,
    AnswerlatticeGeminiCallResult,
    callAnswerlatticeGeminiContent,
    recordGeminiCallOperation,
} from './aiOperationAccounting';
import {
    buildTicketKnowledgePrompt,
    parseTicketResolutionResponse,
    TICKET_KNOWLEDGE_SYSTEM_PROMPT,
} from './ticketKnowledgePrompt';
import { normalizeAnswerlatticeResolvedFunctionEntityId } from './entityIdBoundary';
import { parseExactAnswerlatticeScope } from './scopeBoundary';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
    minTicketsForCandidate: 3,     // Minimum resolved tickets per entity
    minResolutionLength: 50,        // Minimum chars in resolution to be substantive
    maxTicketClustersToProcess: 50, // Max entity clusters to analyze per run
    maxDraftsPerRun: 5,             // Max draft proposals to generate per run (LLM cost cap)
    maxResolutionExamples: 5,       // Max ticket resolutions per Gemini call
    windowDays: 14,                 // Rolling window for ticket signal analysis
    confidenceThreshold: 0.7,       // Minimum extraction confidence to create proposal
    draftPromptVersion: 'v1-ticket',
};

const normalizeNonNegativeSafeCount = (value: unknown): number | null => (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
        ? value
        : null
);

const normalizeOptionalNonNegativeSafeCount = (value: unknown, fallback: number): number | null => (
    value === undefined ? fallback : normalizeNonNegativeSafeCount(value)
);

const ANSWERLATTICE_PRODUCT_ID = 'AL';
const ANSWERLATTICE_TICKET_KNOWLEDGE_GEMINI_CALL_FAILED = 'ANSWERLATTICE_TICKET_KNOWLEDGE_GEMINI_CALL_FAILED';
const ANSWERLATTICE_TICKET_KNOWLEDGE_ENTITY_NOT_FOUND = 'ANSWERLATTICE_TICKET_KNOWLEDGE_ENTITY_NOT_FOUND';
const ANSWERLATTICE_TICKET_KNOWLEDGE_ENTITY_LOAD_FAILED = 'ANSWERLATTICE_TICKET_KNOWLEDGE_ENTITY_LOAD_FAILED';
const ANSWERLATTICE_TICKET_KNOWLEDGE_PARSE_FAILED = 'ANSWERLATTICE_TICKET_KNOWLEDGE_PARSE_FAILED';
const ANSWERLATTICE_TICKET_KNOWLEDGE_ENTITY_EXTRACTION_FAILED = 'ANSWERLATTICE_TICKET_KNOWLEDGE_ENTITY_EXTRACTION_FAILED';
const ANSWERLATTICE_TICKET_KNOWLEDGE_EXISTING_ANSWERS_LOAD_FAILED = 'ANSWERLATTICE_TICKET_KNOWLEDGE_EXISTING_ANSWERS_LOAD_FAILED';
const ANSWERLATTICE_TICKET_KNOWLEDGE_FATAL_FAILED = 'ANSWERLATTICE_TICKET_KNOWLEDGE_FATAL_FAILED';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface TicketKnowledgeResult {
    candidatesFound: number;
    proposalsCreated: number;
    proposalsMerged: number;
    skippedDuplicate: number;
    skippedLowConfidence: number;
    errors: string[];
}

interface TicketSignalCluster {
    entityId: string;
    ticketIds: Array<string>;
    subjects: Array<string>;
    resolutionMessages: Array<Array<string>>;
    totalCount: number;
}

function getTicketKnowledgeSourceErrorContext(error: unknown): {
    sourceErrorName: string | null;
    sourceErrorCode: string | number | null;
    sourceStatusCode: number | null;
} {
    const source = error && typeof error === 'object' ? error as Record<string, unknown> : {};
    const sourceStatusCode = typeof source.status === 'number'
        ? source.status
        : (typeof source.statusCode === 'number' ? source.statusCode : null);

    return {
        sourceErrorName: typeof source.name === 'string' ? source.name : null,
        sourceErrorCode: typeof source.code === 'string' || typeof source.code === 'number' ? source.code : null,
        sourceStatusCode,
    };
}

function getTicketKnowledgeScopeContext(tId?: number, sId?: number): {
    hasTenantScope: boolean;
    hasStoreScope: boolean;
} {
    return {
        hasTenantScope: Number.isFinite(tId),
        hasStoreScope: Number.isFinite(sId),
    };
}

function getTicketKnowledgeStringContext(label: string, value: unknown): Record<string, boolean | number> {
    const stringValue = typeof value === 'string' ? value : '';
    return {
        [`${label}Present`]: stringValue.length > 0,
        [`${label}Length`]: stringValue.length,
    };
}

// ═══════════════════════════════════════════════════════════════
// STEP 1: GATHER TICKET RESOLUTION SIGNALS
// ═══════════════════════════════════════════════════════════════

/**
 * Query ticket-type signals with resolution metadata, group by entity.
 * Only includes signals that have resolutionMessages (enriched signals from Item #9).
 */
async function gatherTicketResolutionClusters(
    tId: number,
    sId: number
): Promise<TicketSignalCluster[]> {
    const windowStart = Timestamp.fromMillis(Date.now() - CONFIG.windowDays * 24 * 60 * 60 * 1000);

    const signalsSnap = await db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('type', '==', 'ticket')
        .where('timestamp', '>=', windowStart)
        .orderBy('timestamp', 'desc')
        .limit(500)
        .get();

    if (signalsSnap.empty) return [];

    // Group by entityId, only include signals with resolution metadata
    const clusterMap = new Map<string, TicketSignalCluster>();

    for (const doc of signalsSnap.docs) {
        const data = doc.data();
        if (data.pId !== ANSWERLATTICE_PRODUCT_ID) continue;
        const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(data.entityId);
        const meta = data.metadata || {};

        // Skip unresolved entity signals and signals without resolution content
        if (!entityId) continue;
        if (!meta.resolutionMessages || !Array.isArray(meta.resolutionMessages)) continue;
        const resolutionMessages = meta.resolutionMessages
            .filter((message: unknown): message is string => typeof message === 'string' && message.trim().length > 0)
            .slice(0, 10)
            .map((message: string) => message.trim().slice(0, 500));
        const ticketId = typeof meta.ticketId === 'string' ? meta.ticketId.trim().slice(0, 180) : '';
        if (!ticketId || resolutionMessages.length === 0) continue;

        // Check resolution is substantive
        const resolutionText = resolutionMessages.join(' ');
        if (resolutionText.length < CONFIG.minResolutionLength) continue;

        const cluster: TicketSignalCluster = clusterMap.get(entityId) || {
            entityId,
            ticketIds: [] as Array<string>,
            subjects: [] as Array<string>,
            resolutionMessages: [] as Array<Array<string>>,
            totalCount: 0,
        };

        // Avoid duplicate tickets in same cluster
        if (!cluster.ticketIds.includes(ticketId)) {
            cluster.ticketIds.push(ticketId);
            cluster.subjects.push(typeof meta.subject === 'string' ? meta.subject.trim().slice(0, 200) || 'No subject' : 'No subject');
            cluster.resolutionMessages.push(resolutionMessages);
            cluster.totalCount++;
        }

        clusterMap.set(entityId, cluster);
    }

    // Filter to clusters meeting minimum threshold and sort by count (highest first)
    return Array.from(clusterMap.values())
        .filter(c => c.totalCount >= CONFIG.minTicketsForCandidate)
        .sort((a, b) => b.totalCount - a.totalCount)
        .slice(0, CONFIG.maxTicketClustersToProcess);
}

// ═══════════════════════════════════════════════════════════════
// STEP 2: DEDUPLICATION (3 Stages)
// ═══════════════════════════════════════════════════════════════

/**
 * Stage 1: Check if active canonical answer already exists for this entity.
 * If yes → skip (answer already exists).
 */
async function getExistingCanonicalAnswerIds(tId: number, sId: number, entityId: string): Promise<string[]> {
    const snap = await db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('scope.entityIds', 'array-contains', entityId)
        .where('status', '==', 'active')
        .limit(2)
        .get();

    return snap.docs
        .filter(document => document.data().pId === ANSWERLATTICE_PRODUCT_ID)
        .map(document => document.id);
}

/**
 * Stage 2: Check if pending proposal already exists for this entity.
 * If yes → merge (increment sourceTicketCount, append sourceTicketIds).
 * Returns the existing proposal doc reference if found, null otherwise.
 */
async function findExistingPendingProposal(
    tId: number,
    sId: number,
    entityId: string
): Promise<FirebaseFirestore.QueryDocumentSnapshot | null> {
    const snap = await db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('relatedEntityIds', 'array-contains', entityId)
        .where('status', '==', 'pending_review')
        .limit(1)
        .get();

    return snap.empty ? null : snap.docs[0];
}

// ═══════════════════════════════════════════════════════════════
// STEP 3: GEMINI EXTRACTION
// ═══════════════════════════════════════════════════════════════

async function callGeminiForExtraction(userPrompt: string): Promise<AnswerlatticeGeminiCallResult | null> {
    try {
        return await callAnswerlatticeGeminiContent({
            model: ANSWERLATTICE_TEXT_MODEL,
            systemPrompt: TICKET_KNOWLEDGE_SYSTEM_PROMPT,
            userPrompt,
        });
    } catch (error) {
        logger.error('[Answerlattice TicketKnowledge] Gemini call failed', {
            failureCode: ANSWERLATTICE_TICKET_KNOWLEDGE_GEMINI_CALL_FAILED,
            ...getTicketKnowledgeSourceErrorContext(error),
        });
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// STEP 4: CONTEXT HELPERS
// ═══════════════════════════════════════════════════════════════

async function getEntityInfo(tId: number, sId: number, entityId: string): Promise<{ name: string; description: string; type: string } | null> {
    try {
        const normalizedEntityId = normalizeAnswerlatticeResolvedFunctionEntityId(entityId);
        if (!normalizedEntityId) return null;
        const doc = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(normalizedEntityId).get();
        if (!doc.exists) return null;
        const data = doc.data() || {};
        const entityScope = parseExactAnswerlatticeScope(data.tId, data.sId);
        if (
            data.pId !== ANSWERLATTICE_PRODUCT_ID
            || !entityScope
            || entityScope.tId !== tId
            || entityScope.sId !== sId
            || data.status === 'deprecated'
        ) return null;
        return {
            name: data?.name || 'Unknown',
            description: data?.description || '',
            type: data?.type || 'feature',
        };
    } catch (error) {
        logger.error('[Answerlattice TicketKnowledge] Entity load failed', {
            failureCode: ANSWERLATTICE_TICKET_KNOWLEDGE_ENTITY_LOAD_FAILED,
            ...getTicketKnowledgeScopeContext(tId, sId),
            ...getTicketKnowledgeStringContext('entityId', entityId),
            ...getTicketKnowledgeSourceErrorContext(error),
        });
        return null;
    }
}

async function getExistingAnswerTitles(tId: number, sId: number, entityId: string): Promise<string[]> {
    const titles: string[] = [];
    try {
        const snap = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('scope.entityIds', 'array-contains', entityId)
            .limit(5)
            .get();

        for (const doc of snap.docs) {
            const data = doc.data();
            if (data.title) titles.push(data.title);
        }
    } catch (error) {
        logger.warn('[Answerlattice TicketKnowledge] Existing answer lookup failed', {
            failureCode: ANSWERLATTICE_TICKET_KNOWLEDGE_EXISTING_ANSWERS_LOAD_FAILED,
            ...getTicketKnowledgeScopeContext(tId, sId),
            ...getTicketKnowledgeStringContext('entityId', entityId),
            ...getTicketKnowledgeSourceErrorContext(error),
        });
    }
    return titles;
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXTRACTION PIPELINE
// ═══════════════════════════════════════════════════════════════

/**
 * Extract ticket knowledge for a tenant — Step 14 of nightly batch.
 * 
 * Pipeline:
 * 1. Gather ticket resolution signal clusters (entity-based)
 * 2. For each cluster meeting threshold:
 *    a. Dedup Stage 1: existing canonical answer → skip
 *    b. Dedup Stage 2: existing pending proposal → merge
 *    c. Extract resolution via Gemini
 *    d. Create mutation proposal with draftSource: 'ticket_resolution'
 * 3. Cap at maxDraftsPerRun
 */
export async function extractTicketKnowledge(
    tId: number,
    sId: number
): Promise<TicketKnowledgeResult> {
    const result: TicketKnowledgeResult = {
        candidatesFound: 0,
        proposalsCreated: 0,
        proposalsMerged: 0,
        skippedDuplicate: 0,
        skippedLowConfidence: 0,
        errors: [],
    };

    if (!FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE) {
        return result;
    }

    try {
        // 1. Gather ticket resolution clusters
        const clusters = await gatherTicketResolutionClusters(tId, sId);
        result.candidatesFound = clusters.length;

        if (clusters.length === 0) return result;

        let draftsGenerated = 0;

        for (const cluster of clusters) {
            // Cost cap
            if (draftsGenerated >= CONFIG.maxDraftsPerRun) break;

            try {
                // 2a. Existing pending proposal → merge bounded ticket lineage.
                const existingProposal = await findExistingPendingProposal(tId, sId, cluster.entityId);
                if (existingProposal) {
                    const merged = await db.runTransaction(async transaction => {
                        const currentSnap = await transaction.get(existingProposal.ref);
                        const current = currentSnap.data() || {};
                        const currentScope = parseExactAnswerlatticeScope(current.tId, current.sId);
                        if (
                            !currentSnap.exists
                            || current.pId !== ANSWERLATTICE_PRODUCT_ID
                            || !currentScope
                            || currentScope.tId !== tId
                            || currentScope.sId !== sId
                            || current.status !== 'pending_review'
                            || !Array.isArray(current.relatedEntityIds)
                            || !current.relatedEntityIds.includes(cluster.entityId)
                        ) return false;
                        const existingTicketIds = Array.isArray(current.suggestedChange?.sourceTicketIds)
                            ? current.suggestedChange.sourceTicketIds.filter((id: unknown): id is string => typeof id === 'string').slice(0, 100)
                            : [];
                        const newTicketIds = cluster.ticketIds.filter(id => !existingTicketIds.includes(id));
                        if (newTicketIds.length === 0) return false;
                        const storedSourceCount = normalizeOptionalNonNegativeSafeCount(
                            current.suggestedChange?.sourceTicketCount,
                            existingTicketIds.length,
                        );
                        const storedSignalCount = normalizeOptionalNonNegativeSafeCount(
                            current.signalSummary?.ticketCount,
                            existingTicketIds.length,
                        );
                        if (storedSourceCount === null || storedSignalCount === null) {
                            throw new Error('answerlattice_ticket_knowledge_proposal_counter_invalid');
                        }
                        const priorSourceCount = Math.max(
                            storedSourceCount,
                            existingTicketIds.length,
                        );
                        transaction.update(existingProposal.ref, {
                            'suggestedChange.sourceTicketIds': [...existingTicketIds, ...newTicketIds].slice(0, 100),
                            'suggestedChange.sourceTicketCount': priorSourceCount + newTicketIds.length,
                            'signalSummary.ticketCount': storedSignalCount + newTicketIds.length,
                            modifiedOn: Timestamp.now(),
                            modifiedBy: 'system:ticket_resolution_extractor',
                        });
                        return true;
                    });
                    if (merged) {
                        result.proposalsMerged++;
                    } else {
                        result.skippedDuplicate++;
                    }
                    continue;
                }

                // 2b. A single existing answer can receive a governed content
                // refinement. Multiple scoped answers are ambiguous and remain
                // owner triage rather than choosing one arbitrarily.
                const existingAnswerIds = await getExistingCanonicalAnswerIds(tId, sId, cluster.entityId);
                if (existingAnswerIds.length > 1) {
                    result.skippedDuplicate++;
                    continue;
                }
                const mutationType = existingAnswerIds.length === 1 ? 'content_refinement' : 'new_answer_required';
                const targetAnswerId = existingAnswerIds[0] || '';
                const proposalId = `almp_ticket_${createHash('sha256')
                    .update(`${tId}:${sId}:${cluster.entityId}:${cluster.ticketIds.slice().sort().join(',')}`)
                    .digest('hex')
                    .slice(0, 36)}`;
                const proposalRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS).doc(proposalId);
                if ((await proposalRef.get()).exists) {
                    result.skippedDuplicate++;
                    continue;
                }

                // 2c. Extract resolution via Gemini
                const entity = await getEntityInfo(tId, sId, cluster.entityId);
                if (!entity) {
                    result.errors.push(ANSWERLATTICE_TICKET_KNOWLEDGE_ENTITY_NOT_FOUND);
                    continue;
                }

                const existingTitles = await getExistingAnswerTitles(tId, sId, cluster.entityId);

                const userPrompt = buildTicketKnowledgePrompt({
                    entityName: entity.name,
                    entityDescription: entity.description,
                    entityType: entity.type,
                    ticketSubjects: cluster.subjects,
                    resolutionMessages: cluster.resolutionMessages.slice(0, CONFIG.maxResolutionExamples),
                    existingAnswerTitles: existingTitles,
                });

                const geminiResult = await callGeminiForExtraction(userPrompt);
                const rawResponse = geminiResult?.text || null;
                if (geminiResult) {
                    await recordGeminiCallOperation({
                        action: ANSWERLATTICE_AI_ACTIONS.TICKET_KNOWLEDGE_EXTRACTION,
                        clientResponse: {
                            entityId: cluster.entityId,
                            sourceTicketCount: cluster.totalCount,
                        },
                        processingTime: geminiResult.processingTime,
                        sId,
                        source: 'answerlattice_ticket_resolution_extractor',
                        tId,
                        usageMetadata: geminiResult.usageMetadata,
                    });
                }
                const parsed = parseTicketResolutionResponse(rawResponse);

                if (!parsed) {
                    result.errors.push(ANSWERLATTICE_TICKET_KNOWLEDGE_PARSE_FAILED);
                    continue;
                }

                // Confidence check
                if (parsed.confidence < CONFIG.confidenceThreshold) {
                    result.skippedLowConfidence++;
                    continue;
                }

                // 2d. Create mutation proposal with ticket_resolution source
                const proposalData = {
                    pId: ANSWERLATTICE_PRODUCT_ID,
                    tId,
                    sId,
                    targetAnswerId,
                    relatedEntityIds: [cluster.entityId],
                    mutationType,
                    signalSummary: {
                        ticketCount: cluster.totalCount,
                        chatCount: 0,
                        negativeFeedbackRate: 0,
                        exampleReferences: [],
                    },
                    suggestedChange: {
                        // Draft content (from extraction)
                        draftTitle: parsed.title,
                        structuredSummary: parsed.structuredSummary,
                        detailedExplanation: parsed.detailedExplanation,
                        edgeCases: parsed.edgeCases,
                        constraints: parsed.constraints,
                        procedure: parsed.procedure,
                        ...(mutationType === 'content_refinement' ? {
                            proposedContent: {
                                structuredSummary: parsed.structuredSummary,
                                detailedExplanation: parsed.detailedExplanation,
                                ...(parsed.edgeCases ? { edgeCases: parsed.edgeCases } : {}),
                                ...(parsed.constraints ? { constraints: parsed.constraints } : {}),
                                ...(parsed.procedure ? { procedure: parsed.procedure } : {}),
                            },
                        } : {}),
                        draftStatus: 'generated',
                        draftSource: 'ticket_resolution',
                        draftGeneratedAt: Timestamp.now(),
                        draftSignalExamples: cluster.subjects.slice(0, 5),
                        draftEntityContext: `${entity.name}: ${entity.description}`.substring(0, 500),
                        draftPromptVersion: CONFIG.draftPromptVersion,
                        // Ticket lineage
                        sourceTicketIds: cluster.ticketIds.slice(0, 100),
                        sourceTicketCount: cluster.totalCount,
                        resolutionContext: parsed.extractedProblem,
                        extractionConfidence: parsed.confidence,
                    },
                    confidenceScore: parsed.confidence,
                    status: 'pending_review',
                    createdOn: Timestamp.now(),
                    modifiedOn: Timestamp.now(),
                    createdBy: 'system:ticket_resolution_extractor',
                    modifiedBy: 'system:ticket_resolution_extractor',
                };

                const auditRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).doc(`created_${proposalId}`);
                const batch = db.batch();
                batch.create(proposalRef, proposalData);
                batch.create(auditRef, {
                    pId: ANSWERLATTICE_PRODUCT_ID,
                    tId,
                    sId,
                    action: 'ticket_knowledge_extracted',
                    entityType: 'mutationProposal',
                    entityId: proposalRef.id,
                    previousState: null,
                    newState: {
                        draftTitle: parsed.title,
                        draftSource: 'ticket_resolution',
                        mutationType,
                        entityId: cluster.entityId,
                        entityName: entity.name,
                        sourceTicketCount: cluster.totalCount,
                        extractionConfidence: parsed.confidence,
                        promptVersion: CONFIG.draftPromptVersion,
                    },
                    performedBy: 'system:ticket_knowledge_nightly',
                    timestamp: Timestamp.now(),
                });
                await batch.commit();

                result.proposalsCreated++;
                draftsGenerated++;

            } catch (error) {
                result.errors.push(ANSWERLATTICE_TICKET_KNOWLEDGE_ENTITY_EXTRACTION_FAILED);
                logger.error('[Answerlattice TicketKnowledge] Entity extraction failed', {
                    failureCode: ANSWERLATTICE_TICKET_KNOWLEDGE_ENTITY_EXTRACTION_FAILED,
                    ...getTicketKnowledgeScopeContext(tId, sId),
                    ...getTicketKnowledgeStringContext('entityId', cluster.entityId),
                    ...getTicketKnowledgeSourceErrorContext(error),
                });
            }
        }

        if (result.proposalsCreated > 0 || result.proposalsMerged > 0) {
            logger.info('[Answerlattice TicketKnowledge] Extraction completed', {
                ...getTicketKnowledgeScopeContext(tId, sId),
                candidatesFound: result.candidatesFound,
                proposalsCreated: result.proposalsCreated,
                proposalsMerged: result.proposalsMerged,
                skippedDuplicate: result.skippedDuplicate,
                skippedLowConfidence: result.skippedLowConfidence,
            });
        }
    } catch (error) {
        result.errors.push(ANSWERLATTICE_TICKET_KNOWLEDGE_FATAL_FAILED);
        logger.error('[Answerlattice TicketKnowledge] Fatal extraction failure', {
            failureCode: ANSWERLATTICE_TICKET_KNOWLEDGE_FATAL_FAILED,
            ...getTicketKnowledgeScopeContext(tId, sId),
            ...getTicketKnowledgeSourceErrorContext(error),
        });
    }

    return result;
}
