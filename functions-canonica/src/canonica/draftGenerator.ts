/**
 * Canonica — Server-Side Draft Generator (Cloud Function)
 * 
 * Generates AI draft canonical answers for new_answer_required mutation proposals.
 * Called as Step 9 of the nightly batch in canonicaNightly.ts.
 * 
 * Uses firebase-admin (server-side Firestore) + Gemini via Google Generative AI SDK.
 * 
 * Expansion Item #4 — Automatic Knowledge Creation
 * Feature-flagged: ENABLE_CANONICA_AUTO_KNOWLEDGE
 * 
 * RULES:
 * - Max 10 drafts per nightly run (cost cap)
 * - Draft failure never blocks proposal creation (fire-and-forget)
 * - All drafts marked as AI-generated for founder review
 * - No auto-publish — doctrine compliance
 * 
 * @see __docs__/canonica/automatic-knowledge-creation/
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { firestoreAdmin as db } from '../firebaseAdmin';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_DRAFTS_PER_RUN = 10;
const DRAFT_PROMPT_VERSION = 'v1';
const DRAFT_ACTOR = 'system:draft_generator_nightly';

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT (mirrors src/lib/canonica/draftPrompt.ts)
// Duplicated here because CF cannot import from src/ (different TS project)
// ═══════════════════════════════════════════════════════════════

const DRAFT_SYSTEM_PROMPT = `You are Canonica's Knowledge Draft Generator. You create structured canonical answer skeletons from support signal evidence.

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
    tId: number;
    sId: number;
    relatedEntityIds: string[];
    signalSummary: {
        ticketCount: number;
        chatCount: number;
        exampleReferences: string[];
    };
    mutationType: string;
    suggestedChange: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT GATHERING
// ═══════════════════════════════════════════════════════════════

/**
 * Gather entity context for draft prompt.
 * Returns entity name + description. 1 Firestore read.
 */
async function getEntityContext(entityId: string): Promise<{ name: string; description: string; type: string } | null> {
    try {
        const doc = await db.collection(DB_COLLECTIONS.CANONICA_ENTITIES).doc(entityId).get();
        if (!doc.exists) return null;
        const data = doc.data();
        return {
            name: data?.name || 'Unknown',
            description: data?.description || '',
            type: data?.type || 'feature',
        };
    } catch {
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
            const doc = await db.collection(DB_COLLECTIONS.CANONICA_SIGNAL_EVENTS).doc(refId).get();
            if (!doc.exists) continue;

            const data = doc.data();
            const meta = data?.metadata || {};
            const text = meta.query || meta.subject || meta.title || meta.comments || '';
            if (text && text.length > 5) {
                examples.push(text.substring(0, 200));
            }
        }

        // If we still need more, query recent signals for this entity
        if (examples.length < 3) {
            const windowStart = Timestamp.fromMillis(Date.now() - 14 * 24 * 60 * 60 * 1000);
            const snap = await db.collection(DB_COLLECTIONS.CANONICA_SIGNAL_EVENTS)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('entityId', '==', entityId)
                .where('timestamp', '>=', windowStart)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            for (const doc of snap.docs) {
                if (examples.length >= 5) break;
                const meta = doc.data().metadata || {};
                const text = meta.query || meta.subject || meta.title || meta.comments || '';
                if (text && text.length > 5 && !examples.includes(text.substring(0, 200))) {
                    examples.push(text.substring(0, 200));
                }
            }
        }
    } catch {
        // Non-blocking — return whatever we have
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
        const snap = await db.collection(DB_COLLECTIONS.CANONICA_CANONICAL_ANSWERS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('scope.entityIds', 'array-contains', entityId)
            .where('status', '==', 'active')
            .limit(5)
            .get();

        for (const doc of snap.docs) {
            const data = doc.data();
            if (data.title && data.content?.structuredSummary) {
                summaries.push(`${data.title}: ${data.content.structuredSummary.substring(0, 150)}`);
            }
        }
    } catch {
        // Non-blocking
    }

    return summaries;
}

// ═══════════════════════════════════════════════════════════════
// PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════

function buildUserPrompt(
    entity: { name: string; description: string; type: string },
    signalExamples: string[],
    existingAnswerSummaries: string[]
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

    parts.push('');
    parts.push('Generate a canonical answer draft for this knowledge gap. Return JSON only.');

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

        const summary = parsed.structuredSummary.length > 500
            ? parsed.structuredSummary.substring(0, 497) + '...'
            : parsed.structuredSummary;

        return {
            title: parsed.title.substring(0, 200),
            structuredSummary: summary,
            detailedExplanation: parsed.detailedExplanation,
            edgeCases: typeof parsed.edgeCases === 'string' ? parsed.edgeCases : null,
            constraints: typeof parsed.constraints === 'string' ? parsed.constraints : null,
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
 * Uses Google Generative AI SDK (server-side).
 * 
 * Requires GEMINI_AI_KEY secret in Cloud Functions config.
 */
async function callGeminiForDraft(systemPrompt: string, userPrompt: string): Promise<string | null> {
    try {
        const apiKey = process.env.GEMINI_AI_KEY;
        if (!apiKey) {
            logger.error('[Canonica Draft] GEMINI_AI_KEY not configured');
            return null;
        }

        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: systemPrompt,
        });

        const result = await model.generateContent(userPrompt);
        const text = result.response?.text();
        return text || null;
    } catch (error) {
        logger.error('[Canonica Draft] Gemini call failed', { error });
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// MAIN DRAFT GENERATION (called from canonicaNightly.ts)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate AI drafts for new_answer_required proposals that don't have drafts yet.
 * 
 * Called as Step 9 of the nightly batch.
 * Max 10 drafts per run (cost cap).
 * Failure never blocks — proposals exist with or without drafts.
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

    if (!FUNCTION_FLAGS.ENABLE_CANONICA_AUTO_KNOWLEDGE) {
        return result;
    }

    try {
        // Find new_answer_required proposals without drafts
        const proposalsSnap = await db.collection(DB_COLLECTIONS.CANONICA_MUTATION_PROPOSALS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('mutationType', '==', 'new_answer_required')
            .where('status', '==', 'pending_review')
            .limit(MAX_DRAFTS_PER_RUN)
            .get();

        if (proposalsSnap.empty) return result;

        for (const proposalDoc of proposalsSnap.docs) {
            const proposal = { id: proposalDoc.id, ...proposalDoc.data() } as ProposalForDraft;

            // Skip if draft already exists
            if (proposal.suggestedChange?.draftStatus === 'generated' || proposal.suggestedChange?.draftStatus === 'pending') {
                continue;
            }

            // Cost cap
            if (result.draftsGenerated >= MAX_DRAFTS_PER_RUN) break;

            try {
                // Mark as pending
                await proposalDoc.ref.update({
                    'suggestedChange.draftStatus': 'pending',
                    modifiedOn: Timestamp.now(),
                    modifiedBy: DRAFT_ACTOR,
                });

                // Gather context
                const entityId = proposal.relatedEntityIds?.[0];
                if (!entityId) {
                    await proposalDoc.ref.update({
                        'suggestedChange.draftStatus': 'failed',
                        modifiedOn: Timestamp.now(),
                        modifiedBy: DRAFT_ACTOR,
                    });
                    result.draftsFailed++;
                    continue;
                }

                const entity = await getEntityContext(entityId);
                if (!entity) {
                    await proposalDoc.ref.update({
                        'suggestedChange.draftStatus': 'failed',
                        modifiedOn: Timestamp.now(),
                        modifiedBy: DRAFT_ACTOR,
                    });
                    result.draftsFailed++;
                    continue;
                }

                const [signalExamples, existingAnswers] = await Promise.all([
                    getSignalExamples(tId, sId, entityId, proposal.signalSummary?.exampleReferences || []),
                    getExistingAnswerSummaries(tId, sId, entityId),
                ]);

                // Build prompt and call Gemini
                const userPrompt = buildUserPrompt(entity, signalExamples, existingAnswers);
                const rawResponse = await callGeminiForDraft(DRAFT_SYSTEM_PROMPT, userPrompt);

                // Parse response
                const parsed = parseDraftResponse(rawResponse);
                if (!parsed) {
                    await proposalDoc.ref.update({
                        'suggestedChange.draftStatus': 'failed',
                        modifiedOn: Timestamp.now(),
                        modifiedBy: DRAFT_ACTOR,
                    });
                    result.draftsFailed++;
                    logger.warn('[Canonica Draft] Failed to parse Gemini response', {
                        tId,
                        sId,
                        proposalId: proposal.id,
                    });
                    continue;
                }

                // Store draft on proposal
                await proposalDoc.ref.update({
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
                    modifiedOn: Timestamp.now(),
                    modifiedBy: DRAFT_ACTOR,
                });

                // Audit log
                await db.collection(DB_COLLECTIONS.CANONICA_AUDIT_LOGS).add({
                    pId: 'CN',
                    tId,
                    sId,
                    action: 'draft_generated',
                    entityType: 'mutationProposal',
                    entityId: proposal.id,
                    previousState: null,
                    newState: {
                        draftTitle: parsed.title,
                        draftSource: 'signal_cluster',
                        entityId,
                        promptVersion: DRAFT_PROMPT_VERSION,
                    },
                    performedBy: 'system:draft_generator_nightly',
                    timestamp: Timestamp.now(),
                });

                result.draftsGenerated++;
                result.proposalIds.push(proposal.id);

            } catch (error) {
                // Per-proposal failure — continue with next
                logger.error('[Canonica Draft] Proposal draft generation failed', {
                    tId,
                    sId,
                    proposalId: proposal.id,
                    error,
                });
                try {
                    await proposalDoc.ref.update({
                        'suggestedChange.draftStatus': 'failed',
                        modifiedOn: Timestamp.now(),
                        modifiedBy: DRAFT_ACTOR,
                    });
                } catch { /* non-blocking */ }
                result.draftsFailed++;
            }
        }
    } catch (error) {
        logger.error('[Canonica Draft] Batch failed', { tId, sId, error });
    }

    return result;
}
