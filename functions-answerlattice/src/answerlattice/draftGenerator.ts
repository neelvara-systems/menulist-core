/**
 * Answerlattice — Server-Side Draft Generator (Cloud Function)
 * 
 * Generates AI draft canonical answers for new_answer_required mutation proposals.
 * Called as Step 9 of the nightly batch in answerlatticeNightly.ts.
 * 
 * Uses firebase-admin (server-side Firestore) + Gemini through the Answerlattice GenAI client.
 * 
 * Expansion Item #4 — Automatic Knowledge Creation
 * Feature-flagged: ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE
 * 
 * RULES:
 * - Max 10 drafts per nightly run (cost cap)
 * - Draft failure never blocks proposal creation (fire-and-forget)
 * - All drafts marked as AI-generated for founder review
 * - No auto-publish — doctrine compliance
 * 
 * @see __docs__/answerlattice/automatic-knowledge-creation/
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { randomUUID } from 'crypto';
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
import { normalizeAnswerlatticeResolvedFunctionEntityId } from './entityIdBoundary';
import { parseExactAnswerlatticeScope } from './scopeBoundary';
import { getBoundedFunctionsErrorContext } from '../utils/boundedErrorContext';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_DRAFTS_PER_RUN = 10;
const MAX_PENDING_PROPOSALS_TO_SCAN = 50;
const DRAFT_PROCESSING_LEASE_MS = 15 * 60 * 1000;
const DRAFT_PROMPT_VERSION = 'v1';
const DRAFT_ACTOR = 'system:draft_generator_nightly';
const ANSWERLATTICE_DRAFT_GEMINI_CALL_FAILED = 'ANSWERLATTICE_DRAFT_GEMINI_CALL_FAILED';
const ANSWERLATTICE_DRAFT_PARSE_FAILED = 'ANSWERLATTICE_DRAFT_PARSE_FAILED';
const ANSWERLATTICE_DRAFT_PROPOSAL_FAILED = 'ANSWERLATTICE_DRAFT_PROPOSAL_FAILED';
const ANSWERLATTICE_DRAFT_STATUS_MARK_FAILED = 'ANSWERLATTICE_DRAFT_STATUS_MARK_FAILED';
const ANSWERLATTICE_DRAFT_BATCH_FAILED = 'ANSWERLATTICE_DRAFT_BATCH_FAILED';
const ANSWERLATTICE_DRAFT_ENTITY_LOAD_FAILED = 'ANSWERLATTICE_DRAFT_ENTITY_LOAD_FAILED';
const ANSWERLATTICE_DRAFT_SIGNAL_CONTEXT_LOAD_FAILED = 'ANSWERLATTICE_DRAFT_SIGNAL_CONTEXT_LOAD_FAILED';
const ANSWERLATTICE_DRAFT_EXISTING_ANSWERS_LOAD_FAILED = 'ANSWERLATTICE_DRAFT_EXISTING_ANSWERS_LOAD_FAILED';

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT (mirrors src/lib/answerlattice/draftPrompt.ts)
// Duplicated here because CF cannot import from src/ (different TS project)
// ═══════════════════════════════════════════════════════════════

const DRAFT_SYSTEM_PROMPT = `You are Answerlattice's Knowledge Draft Generator. You create structured canonical answer skeletons from support signal evidence.

Your output will be reviewed by a human founder before publishing. Generate a helpful starting point, not a final document.

OUTPUT RULES:
1. Follow the JSON schema EXACTLY — no extra fields, no prose outside JSON
2. Be declarative: state what IS, not what the user should do (unless procedure)
3. Reference only product concepts from the provided entity context
4. Do NOT invent features, capabilities, or workflows not mentioned in context
5. structuredSummary must be ≤500 characters
6. detailedExplanation should be 2-4 paragraphs
7. If the topic is clearly procedural (how-to, setup, configure), include a procedure object with steps
8. Include warnings for destructive or irreversible actions
9. Include prerequisites if the workflow requires specific roles, plans, or prior states
10. If unsure about details, say "Verify with your product team" rather than guessing

OUTPUT FORMAT (strict JSON only, no markdown, no code fences):
{
  "title": "Clear, concise title for the canonical answer",
  "structuredSummary": "≤500 char declarative summary of the answer core",
  "detailedExplanation": "2-4 paragraph explanation with context and nuance",
  "edgeCases": "Edge cases, limitations, or special scenarios (or null if none)",
  "constraints": "Restrictions, limits, or caveats (or null if none)",
  "procedure": null
}

If the topic is procedural, include procedure with steps[]. Otherwise set procedure to null.
Return ONLY valid JSON. No explanation. No markdown.`;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface DraftGenerationResult {
    draftsGenerated: number;
    draftsFailed: number;
    proposalIds: string[];
}

interface ProposalForDraft {
    id: string;
    pId: string;
    tId: number;
    sId: number;
    status: string;
    targetAnswerId: string;
    relatedEntityIds: string[];
    signalSummary: {
        ticketCount: number;
        chatCount: number;
        exampleReferences: string[];
    };
    mutationType: SupportedDraftMutationType;
    suggestedChange: Record<string, any>;
    processingRunId: string;
}

type SupportedDraftMutationType = 'new_answer_required' | 'content_refinement';

const isSupportedDraftMutationType = (value: unknown): value is SupportedDraftMutationType => (
    value === 'new_answer_required' || value === 'content_refinement'
);

const isScopedAnswerlatticeDocument = (value: Record<string, any>, tId: number, sId: number): boolean => {
    const scope = parseExactAnswerlatticeScope(value.tId, value.sId);
    return value.pId === 'AL' && scope?.tId === tId && scope.sId === sId;
};

const normalizeDraftContextText = (value: unknown, fallback: string, maxLength: number): string => {
    if (typeof value !== 'string') return fallback;
    return value.trim().slice(0, maxLength) || fallback;
};

const normalizeAnswerlatticeFunctionEntityIds = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    const ids = new Set<string>();
    for (const candidate of value) {
        const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(candidate);
        if (entityId) ids.add(entityId);
    }
    return Array.from(ids);
};

const timestampToMillis = (value: unknown): number => {
    if (!value || typeof value !== 'object') return 0;
    const candidate = value as { toMillis?: () => number; seconds?: unknown };
    if (typeof candidate.toMillis === 'function') {
        const millis = candidate.toMillis();
        return Number.isFinite(millis) ? millis : 0;
    }
    const seconds = candidate.seconds;
    return typeof seconds === 'number' && Number.isSafeInteger(seconds) && seconds > 0
        ? seconds * 1_000
        : 0;
};

function getDraftSourceErrorContext(error: unknown): {
    sourceErrorName: string | null;
    sourceErrorCode: string | number | null;
    sourceStatusCode: number | null;
} {
    const context = getBoundedFunctionsErrorContext(error);
    return {
        sourceErrorName: context.sourceErrorName ?? null,
        sourceErrorCode: context.sourceErrorCode ?? null,
        sourceStatusCode: context.sourceStatusCode ?? null,
    };
}

function getDraftScopeContext(tId?: number, sId?: number): {
    hasTenantScope: boolean;
    hasStoreScope: boolean;
} {
    return {
        hasTenantScope: Number.isFinite(tId),
        hasStoreScope: Number.isFinite(sId),
    };
}

function getDraftIdentifierContext(value?: string | null): {
    hasValue: boolean;
    valueLength: number;
} {
    return {
        hasValue: typeof value === 'string' && value.length > 0,
        valueLength: typeof value === 'string' ? value.length : 0,
    };
}

function getDraftDiagnosticContext(context: {
    tId?: number;
    sId?: number;
    proposalId?: string | null;
    entityId?: string | null;
}): {
    hasTenantScope: boolean;
    hasStoreScope: boolean;
    proposalId: ReturnType<typeof getDraftIdentifierContext>;
    entityId: ReturnType<typeof getDraftIdentifierContext>;
} {
    return {
        ...getDraftScopeContext(context.tId, context.sId),
        proposalId: getDraftIdentifierContext(context.proposalId),
        entityId: getDraftIdentifierContext(context.entityId),
    };
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT GATHERING
// ═══════════════════════════════════════════════════════════════

/**
 * Gather entity context for draft prompt.
 * Returns entity name + description. 1 Firestore read.
 */
async function getEntityContext(tId: number, sId: number, entityId: string): Promise<{ name: string; description: string; type: string } | null> {
    try {
        const normalizedEntityId = normalizeAnswerlatticeResolvedFunctionEntityId(entityId);
        if (!normalizedEntityId) return null;
        const doc = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(normalizedEntityId).get();
        if (!doc.exists) return null;
        const data = doc.data() || {};
        if (!isScopedAnswerlatticeDocument(data, tId, sId) || data.status === 'deprecated') return null;
        return {
            name: normalizeDraftContextText(data.name, 'Unknown', 180),
            description: normalizeDraftContextText(data.description, '', 4_000),
            type: normalizeDraftContextText(data.type, 'feature', 80),
        };
    } catch (error) {
        logger.error('[Answerlattice Draft] Entity context load failed', {
            failureCode: ANSWERLATTICE_DRAFT_ENTITY_LOAD_FAILED,
            ...getDraftDiagnosticContext({ tId, sId, entityId }),
            ...getDraftSourceErrorContext(error),
        });
        return null;
    }
}

/**
 * Gather signal example texts from signal events.
 * Extracts human-readable text from signal metadata.
 * Max 5 examples. Reuses signals already fetched by mutation engine when possible.
 */
async function getSignalExamples(
    tId: number,
    sId: number,
    entityId: string,
    exampleRefIds: string[]
): Promise<string[]> {
    const examples: string[] = [];

    try {
        // First try: use the example reference IDs from the proposal
        for (const refId of exampleRefIds.slice(0, 5)) {
            if (!refId) continue;
            const doc = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS).doc(refId).get();
            if (!doc.exists) continue;

            const data = doc.data();
            if (!data || !isScopedAnswerlatticeDocument(data, tId, sId) || data.entityId !== entityId) continue;
            const meta = data?.metadata || {};
            const text = [meta.query, meta.subject, meta.title, meta.comments]
                .find((value): value is string => typeof value === 'string') || '';
            if (text && text.length > 5) {
                examples.push(text.substring(0, 200));
            }
        }

        // If we still need more, query recent signals for this entity
        if (examples.length < 3) {
            const windowStart = Timestamp.fromMillis(Date.now() - 14 * 24 * 60 * 60 * 1000);
            const snap = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
                .where('pId', '==', 'AL')
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('entityId', '==', entityId)
                .where('timestamp', '>=', windowStart)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            for (const doc of snap.docs) {
                if (examples.length >= 5) break;
                const data = doc.data();
                if (!isScopedAnswerlatticeDocument(data, tId, sId) || data.entityId !== entityId) continue;
                const meta = data.metadata || {};
                const text = [meta.query, meta.subject, meta.title, meta.comments]
                    .find((value): value is string => typeof value === 'string') || '';
                if (text && text.length > 5 && !examples.includes(text.substring(0, 200))) {
                    examples.push(text.substring(0, 200));
                }
            }
        }
    } catch (error) {
        logger.warn('[Answerlattice Draft] Signal context load failed', {
            failureCode: ANSWERLATTICE_DRAFT_SIGNAL_CONTEXT_LOAD_FAILED,
            ...getDraftDiagnosticContext({ tId, sId, entityId }),
            ...getDraftSourceErrorContext(error),
        });
    }

    return examples;
}

/**
 * Get summaries of existing canonical answers for related entities (for grounding).
 * Prevents AI from duplicating existing documentation.
 */
async function getExistingAnswerSummaries(tId: number, sId: number, entityId: string): Promise<string[]> {
    const summaries: string[] = [];

    try {
        const snap = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
            .where('pId', '==', 'AL')
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('scope.entityIds', 'array-contains', entityId)
            .where('status', '==', 'active')
            .limit(5)
            .get();

        for (const doc of snap.docs) {
            const data = doc.data();
            if (!isScopedAnswerlatticeDocument(data, tId, sId)) continue;
            if (typeof data.title === 'string' && typeof data.content?.structuredSummary === 'string') {
                summaries.push(`${data.title.slice(0, 180)}: ${data.content.structuredSummary.slice(0, 150)}`);
            }
        }
    } catch (error) {
        logger.warn('[Answerlattice Draft] Existing answer context load failed', {
            failureCode: ANSWERLATTICE_DRAFT_EXISTING_ANSWERS_LOAD_FAILED,
            ...getDraftDiagnosticContext({ tId, sId, entityId }),
            ...getDraftSourceErrorContext(error),
        });
    }

    return summaries;
}

// ═══════════════════════════════════════════════════════════════
// PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════

function buildUserPrompt(
    entity: { name: string; description: string; type: string },
    signalExamples: string[],
    existingAnswerSummaries: string[],
    mode: SupportedDraftMutationType,
    currentAnswerText?: string,
): string {
    const parts: string[] = [];

    parts.push(`Entity: ${entity.name} (${entity.type})`);
    parts.push(`Description: ${entity.description || 'No description available'}`);

    if (signalExamples.length > 0) {
        parts.push('');
        parts.push('Users are asking about this topic. Example support signals:');
        for (const example of signalExamples) {
            parts.push(`- "${example}"`);
        }
    }

    if (existingAnswerSummaries.length > 0) {
        parts.push('');
        parts.push('Related existing documentation (avoid duplicating):');
        for (const summary of existingAnswerSummaries) {
            parts.push(`- ${summary}`);
        }
    }

    if (mode === 'content_refinement' && currentAnswerText) {
        parts.push('');
        parts.push('Current approved answer to refine:');
        parts.push(currentAnswerText.slice(0, 6_000));
    }

    parts.push('');
    parts.push(mode === 'content_refinement'
        ? 'Generate a complete replacement draft for the existing canonical answer. Preserve confirmed facts, address the support signals, and do not invent new product behavior. Return JSON only.'
        : 'Generate a canonical answer draft for this knowledge gap. Return JSON only.');

    return parts.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// RESPONSE PARSER
// ═══════════════════════════════════════════════════════════════

interface ParsedDraft {
    title: string;
    structuredSummary: string;
    detailedExplanation: string;
    edgeCases: string | null;
    constraints: string | null;
    procedure: Record<string, any> | null;
}

function parseDraftResponse(rawResponse: string | null): ParsedDraft | null {
    if (!rawResponse) return null;

    try {
        let cleaned = rawResponse.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(cleaned);

        if (!parsed.title || typeof parsed.title !== 'string') return null;
        if (!parsed.structuredSummary || typeof parsed.structuredSummary !== 'string') return null;
        if (!parsed.detailedExplanation || typeof parsed.detailedExplanation !== 'string') return null;

        const title = parsed.title.trim().slice(0, 180);
        const detailedExplanation = parsed.detailedExplanation.trim().slice(0, 24_000);
        const normalizedSummary = parsed.structuredSummary.trim();
        if (!title || !detailedExplanation || !normalizedSummary) return null;

        const summary = normalizedSummary.length > 500
            ? normalizedSummary.substring(0, 497) + '...'
            : normalizedSummary;

        return {
            title,
            structuredSummary: summary,
            detailedExplanation,
            edgeCases: typeof parsed.edgeCases === 'string' ? parsed.edgeCases.trim().slice(0, 8_000) || null : null,
            constraints: typeof parsed.constraints === 'string' ? parsed.constraints.trim().slice(0, 8_000) || null : null,
            procedure: parsed.procedure && typeof parsed.procedure === 'object' ? parsed.procedure : null,
        };
    } catch {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// GEMINI CALLER
// ═══════════════════════════════════════════════════════════════

/**
 * Call Gemini for draft generation.
 * Uses the Answerlattice GenAI gateway with product-owned Gemini API credentials.
 */
async function callGeminiForDraft(
    systemPrompt: string,
    userPrompt: string,
    context: { tId?: number; sId?: number; proposalId?: string | null; entityId?: string | null } = {}
): Promise<AnswerlatticeGeminiCallResult | null> {
    try {
        return await callAnswerlatticeGeminiContent({
            model: ANSWERLATTICE_TEXT_MODEL,
            systemPrompt,
            userPrompt,
        });
    } catch (error) {
        logger.error('[Answerlattice Draft] Gemini call failed', {
            failureCode: ANSWERLATTICE_DRAFT_GEMINI_CALL_FAILED,
            ...getDraftDiagnosticContext(context),
            ...getDraftSourceErrorContext(error),
            systemPromptLength: systemPrompt.length,
            userPromptLength: userPrompt.length,
        });
        return null;
    }
}

async function getTargetAnswerText(
    tId: number,
    sId: number,
    answerId: string,
    entityId: string,
): Promise<string | null> {
    const normalizedAnswerId = normalizeAnswerlatticeResolvedFunctionEntityId(answerId);
    if (!normalizedAnswerId) return null;
    const snapshot = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS).doc(normalizedAnswerId).get();
    if (!snapshot.exists) return null;
    const answer = snapshot.data() || {};
    if (
        !isScopedAnswerlatticeDocument(answer, tId, sId)
        || answer.status !== 'active'
        || !normalizeAnswerlatticeFunctionEntityIds(answer.scope?.entityIds).includes(entityId)
    ) return null;
    return [
        `Title: ${String(answer.title || '').slice(0, 180)}`,
        `Summary: ${String(answer.content?.structuredSummary || '').slice(0, 500)}`,
        `Explanation: ${String(answer.content?.detailedExplanation || '').slice(0, 4_500)}`,
    ].join('\n');
}

async function claimProposalForDraft(
    proposalDoc: FirebaseFirestore.QueryDocumentSnapshot,
    tId: number,
    sId: number,
): Promise<ProposalForDraft | null> {
    const processingRunId = randomUUID();
    const nowMillis = Date.now();

    return db.runTransaction(async transaction => {
        const currentSnap = await transaction.get(proposalDoc.ref);
        if (!currentSnap.exists) return null;
        const current = currentSnap.data() || {};
        if (
            !isScopedAnswerlatticeDocument(current, tId, sId)
            || current.status !== 'pending_review'
            || !isSupportedDraftMutationType(current.mutationType)
        ) return null;

        const draftStatus = current.suggestedChange?.draftStatus;
        if (draftStatus === 'generated' || draftStatus === 'failed') return null;
        const leaseExpiresAt = timestampToMillis(current.suggestedChange?.draftProcessingRun?.leaseExpiresAt);
        if (draftStatus === 'pending' && leaseExpiresAt > nowMillis) return null;

        const now = Timestamp.fromMillis(nowMillis);
        transaction.update(proposalDoc.ref, {
            'suggestedChange.draftStatus': 'pending',
            'suggestedChange.draftProcessingRun': {
                id: processingRunId,
                startedAt: now,
                leaseExpiresAt: Timestamp.fromMillis(nowMillis + DRAFT_PROCESSING_LEASE_MS),
            },
            modifiedOn: now,
            modifiedBy: DRAFT_ACTOR,
        });

        return {
            ...current,
            id: currentSnap.id,
            processingRunId,
        } as ProposalForDraft;
    });
}

async function markDraftClaimFailed(proposal: ProposalForDraft): Promise<void> {
    const proposalRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS).doc(proposal.id);
    await db.runTransaction(async transaction => {
        const currentSnap = await transaction.get(proposalRef);
        const current = currentSnap.data() || {};
        if (
            !currentSnap.exists
            || !isScopedAnswerlatticeDocument(current, proposal.tId, proposal.sId)
            || current.status !== 'pending_review'
            || current.suggestedChange?.draftProcessingRun?.id !== proposal.processingRunId
        ) return;
        transaction.update(proposalRef, {
            'suggestedChange.draftStatus': 'failed',
            'suggestedChange.draftProcessingRun': null,
            modifiedOn: Timestamp.now(),
            modifiedBy: DRAFT_ACTOR,
        });
    });
}

async function commitGeneratedDraft(
    proposal: ProposalForDraft,
    entityId: string,
    entity: { name: string; description: string; type: string },
    signalExamples: string[],
    parsed: ParsedDraft,
): Promise<boolean> {
    const proposalRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS).doc(proposal.id);
    const auditRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).doc();
    return db.runTransaction(async transaction => {
        const currentSnap = await transaction.get(proposalRef);
        const current = currentSnap.data() || {};
        if (
            !currentSnap.exists
            || !isScopedAnswerlatticeDocument(current, proposal.tId, proposal.sId)
            || current.status !== 'pending_review'
            || current.mutationType !== proposal.mutationType
            || !normalizeAnswerlatticeFunctionEntityIds(current.relatedEntityIds).includes(entityId)
            || current.suggestedChange?.draftProcessingRun?.id !== proposal.processingRunId
        ) return false;

        const proposedContent = {
            structuredSummary: parsed.structuredSummary,
            detailedExplanation: parsed.detailedExplanation,
            ...(parsed.edgeCases ? { edgeCases: parsed.edgeCases } : {}),
            ...(parsed.constraints ? { constraints: parsed.constraints } : {}),
            ...(parsed.procedure ? { procedure: parsed.procedure } : {}),
        };
        const update: Record<string, unknown> = {
            'suggestedChange.draftTitle': parsed.title,
            'suggestedChange.structuredSummary': parsed.structuredSummary,
            'suggestedChange.detailedExplanation': parsed.detailedExplanation,
            'suggestedChange.edgeCases': parsed.edgeCases,
            'suggestedChange.constraints': parsed.constraints,
            'suggestedChange.procedure': parsed.procedure,
            'suggestedChange.draftStatus': 'generated',
            'suggestedChange.draftSource': 'signal_cluster',
            'suggestedChange.draftGeneratedAt': Timestamp.now(),
            'suggestedChange.draftSignalExamples': signalExamples.slice(0, 5),
            'suggestedChange.draftEntityContext': `${entity.name}: ${entity.description}`.substring(0, 500),
            'suggestedChange.draftPromptVersion': DRAFT_PROMPT_VERSION,
            'suggestedChange.draftProcessingRun': null,
            modifiedOn: Timestamp.now(),
            modifiedBy: DRAFT_ACTOR,
        };
        if (proposal.mutationType === 'content_refinement') {
            update['suggestedChange.proposedContent'] = proposedContent;
        }

        transaction.update(proposalRef, update);
        transaction.create(auditRef, {
            pId: 'AL',
            tId: proposal.tId,
            sId: proposal.sId,
            action: 'draft_generated',
            entityType: 'mutationProposal',
            entityId: proposal.id,
            previousState: null,
            newState: {
                draftTitle: parsed.title,
                draftSource: 'signal_cluster',
                mutationType: proposal.mutationType,
                entityId,
                promptVersion: DRAFT_PROMPT_VERSION,
            },
            performedBy: DRAFT_ACTOR,
            timestamp: Timestamp.now(),
        });
        return true;
    });
}

// ═══════════════════════════════════════════════════════════════
// MAIN DRAFT GENERATION (called from answerlatticeNightly.ts)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate AI drafts for new-answer and content-refinement proposals.
 * A bounded lease prevents duplicate AI calls and permits recovery from a
 * crashed pending run. Failed drafts wait for explicit owner regeneration.
 */
export async function generateDraftsForNewProposals(
    tId: number,
    sId: number
): Promise<DraftGenerationResult> {
    const result: DraftGenerationResult = {
        draftsGenerated: 0,
        draftsFailed: 0,
        proposalIds: [],
    };

    if (!FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE) {
        return result;
    }

    try {
        // Scan a bounded pending queue, then claim supported proposal types in
        // transactions so another scheduler/manual request cannot process them.
        const proposalsSnap = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS)
            .where('pId', '==', 'AL')
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('status', '==', 'pending_review')
            .limit(MAX_PENDING_PROPOSALS_TO_SCAN)
            .get();

        if (proposalsSnap.empty) return result;

        for (const proposalDoc of proposalsSnap.docs) {
            // Cost cap
            if (result.draftsGenerated >= MAX_DRAFTS_PER_RUN) break;
            const proposal = await claimProposalForDraft(proposalDoc, tId, sId);
            if (!proposal) continue;

            try {
                // Gather context
                const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(proposal.relatedEntityIds?.[0]);
                if (!entityId) {
                    await markDraftClaimFailed(proposal);
                    result.draftsFailed++;
                    continue;
                }

                const entity = await getEntityContext(tId, sId, entityId);
                if (!entity) {
                    await markDraftClaimFailed(proposal);
                    result.draftsFailed++;
                    continue;
                }

                const [signalExamples, existingAnswers, currentAnswerText] = await Promise.all([
                    getSignalExamples(tId, sId, entityId, proposal.signalSummary?.exampleReferences || []),
                    getExistingAnswerSummaries(tId, sId, entityId),
                    proposal.mutationType === 'content_refinement'
                        ? getTargetAnswerText(tId, sId, proposal.targetAnswerId, entityId)
                        : Promise.resolve(null),
                ]);
                if (proposal.mutationType === 'content_refinement' && !currentAnswerText) {
                    await markDraftClaimFailed(proposal);
                    result.draftsFailed++;
                    continue;
                }

                // Build prompt and call Gemini
                const userPrompt = buildUserPrompt(
                    entity,
                    signalExamples,
                    existingAnswers,
                    proposal.mutationType,
                    currentAnswerText || undefined,
                );
                const geminiResult = await callGeminiForDraft(DRAFT_SYSTEM_PROMPT, userPrompt, {
                    tId,
                    sId,
                    proposalId: proposal.id,
                    entityId,
                });
                const rawResponse = geminiResult?.text || null;

                if (geminiResult) {
                    await recordGeminiCallOperation({
                        action: ANSWERLATTICE_AI_ACTIONS.DRAFT_GENERATION,
                        clientResponse: {
                            entityId,
                            proposalId: proposal.id,
                            signalExamplesCount: signalExamples.length,
                        },
                        processingTime: geminiResult.processingTime,
                        sId,
                        source: 'answerlattice_draft_generator_nightly',
                        tId,
                        usageMetadata: geminiResult.usageMetadata,
                    });
                }

                // Parse response
                const parsed = parseDraftResponse(rawResponse);
                if (!parsed) {
                    await markDraftClaimFailed(proposal);
                    result.draftsFailed++;
                    logger.warn('[Answerlattice Draft] Failed to parse Gemini response', {
                        failureCode: ANSWERLATTICE_DRAFT_PARSE_FAILED,
                        ...getDraftDiagnosticContext({
                            tId,
                            sId,
                            proposalId: proposal.id,
                            entityId,
                        }),
                        hasResponse: rawResponse != null,
                        responseLength: rawResponse?.length ?? 0,
                    });
                    continue;
                }

                const committed = await commitGeneratedDraft(proposal, entityId, entity, signalExamples, parsed);
                if (committed) {
                    result.draftsGenerated++;
                    result.proposalIds.push(proposal.id);
                }

            } catch (error) {
                // Per-proposal failure — continue with next
                logger.error('[Answerlattice Draft] Proposal draft generation failed', {
                    failureCode: ANSWERLATTICE_DRAFT_PROPOSAL_FAILED,
                        ...getDraftDiagnosticContext({
                            tId,
                            sId,
                            proposalId: proposal.id,
                            entityId: normalizeAnswerlatticeResolvedFunctionEntityId(proposal.relatedEntityIds?.[0]),
                        }),
                        ...getDraftSourceErrorContext(error),
                });
                try {
                    await markDraftClaimFailed(proposal);
                } catch (statusError) {
                    logger.error('[Answerlattice Draft] Failed to mark proposal draft failed', {
                        failureCode: ANSWERLATTICE_DRAFT_STATUS_MARK_FAILED,
                        ...getDraftDiagnosticContext({
                            tId,
                            sId,
                            proposalId: proposal.id,
                            entityId: normalizeAnswerlatticeResolvedFunctionEntityId(proposal.relatedEntityIds?.[0]),
                        }),
                        ...getDraftSourceErrorContext(statusError),
                    });
                }
                result.draftsFailed++;
            }
        }
    } catch (error) {
        logger.error('[Answerlattice Draft] Batch failed', {
            failureCode: ANSWERLATTICE_DRAFT_BATCH_FAILED,
            ...getDraftScopeContext(tId, sId),
            ...getDraftSourceErrorContext(error),
        });
    }

    return result;
}
