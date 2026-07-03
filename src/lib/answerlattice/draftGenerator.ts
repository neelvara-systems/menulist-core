/**
 * Answerlattice — Client-Side Draft Generator
 * 
 * Used for manual draft regeneration from the Governance UI.
 * When a founder clicks "Regenerate Draft" on a mutation proposal,
 * this function calls Gemini via the existing callGeminiChat infrastructure.
 * 
 * For the nightly batch (server-side), see:
 * functions-answerlattice/src/answerlattice/draftGenerator.ts
 * 
 * Expansion Item #4 — Automatic Knowledge Creation
 * Feature-flagged: ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE
 * 
 * @see __docs__/answerlattice/automatic-knowledge-creation/
 */

import { FEATURE_FLAGS } from '@config/features';
import { getActiveAnswersForEntity } from '@database/answerlattice/canonicalAnswers';
import { getEntityById } from '@database/answerlattice/entities';
import { getMutationProposalById } from '@database/answerlattice/mutationProposals';
import { getSignalEventsForEntity } from '@database/answerlattice/signalEvents';
import { AnswerlatticeMutationProposal } from '@type/answerlattice';
import { Timestamp } from 'firebase/firestore';
import { getAnswerlatticeScopeLogContext, logAnswerlatticeFailure } from './diagnostics';
import { buildDraftUserPrompt, DRAFT_PROMPT_VERSION, DRAFT_SYSTEM_PROMPT, parseDraftResponse } from './draftPrompt';
import type { DraftPromptInput } from './draftPrompt';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ClientDraftResult {
    success: boolean;
    error?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT GATHERING (Client-Side)
// ═══════════════════════════════════════════════════════════════

/**
 * Extract human-readable text from signal event metadata.
 */
function extractSignalText(metadata?: Record<string, any>): string | null {
    if (!metadata) return null;
    const text = metadata.query || metadata.subject || metadata.title || metadata.comments || '';
    return text && text.length > 5 ? text.substring(0, 200) : null;
}

/**
 * Gather signal example texts for a given entity from recent signals.
 */
async function gatherSignalExamples(tId: number, sId: number, entityId: string): Promise<string[]> {
    const examples: string[] = [];

    try {
        const signals = await getSignalEventsForEntity(tId, sId, entityId, 14);
        if (!signals) return examples;

        for (const signal of signals.slice(0, 10)) {
            const text = extractSignalText(signal.metadata);
            if (text && !examples.includes(text)) {
                examples.push(text);
            }
            if (examples.length >= 5) break;
        }
    } catch {
        // Non-blocking
    }

    return examples;
}

// ═══════════════════════════════════════════════════════════════
// MAIN CLIENT-SIDE DRAFT GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Regenerate a draft for an existing mutation proposal (client-side).
 * Called from governance UI "Regenerate Draft" button.
 * 
 * Uses dynamic import for callGeminiChat to avoid bundling when feature is off.
 * 
 * @param proposalId - The mutation proposal to generate a draft for
 * @param tId - Tenant ID
 * @param sId - Store ID
 * @param callGemini - Gemini chat function (injected to avoid circular dependency)
 */
export async function regenerateDraftForProposal(
    proposalId: string,
    tId: number,
    sId: number,
    callGemini: (systemPrompt: string, userPrompt: string) => Promise<string | null>,
    regeneratedBy = 'answerlattice_owner'
): Promise<ClientDraftResult> {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE) {
        return { success: false, error: 'Automatic Knowledge Creation is disabled' };
    }

    try {
        // 1. Fetch proposal
        const proposal = await getMutationProposalById(proposalId);
        if (!proposal) {
            return { success: false, error: 'Proposal not found' };
        }

        if (proposal.mutationType !== 'new_answer_required') {
            return { success: false, error: 'Draft generation only supports new_answer_required proposals' };
        }

        // 2. Get entity context
        const entityId = proposal.relatedEntityIds?.[0];
        if (!entityId) {
            return { success: false, error: 'No entity ID on proposal' };
        }

        const entity = await getEntityById(entityId);
        if (!entity) {
            return { success: false, error: 'Entity not found' };
        }

        // 3. Gather context
        const [signalExamples, existingAnswers] = await Promise.all([
            gatherSignalExamples(tId, sId, entityId),
            getActiveAnswersForEntity(tId, sId, entityId),
        ]);

        const existingAnswerSummaries = (existingAnswers || [])
            .slice(0, 3)
            .map(a => `${a.title}: ${a.content.structuredSummary?.substring(0, 150) || ''}`);

        // 4. Build prompt
        const promptInput: DraftPromptInput = {
            entityName: entity.name,
            entityDescription: entity.description,
            entityType: entity.type,
            signalExamples,
            existingAnswerSummaries,
        };

        const userPrompt = buildDraftUserPrompt(promptInput);

        // 5. Call Gemini
        const rawResponse = await callGemini(DRAFT_SYSTEM_PROMPT, userPrompt);

        // 6. Parse response
        const parsed = parseDraftResponse(rawResponse);
        if (!parsed) {
            // Update proposal with failed status
            const { setDoc, doc } = await import('firebase/firestore');
            const { answerlatticeFirebaseClient } = await import('@lib/firebase/answerlatticeFirebaseClient');
            const { DB_COLLECTIONS } = await import('@constant/database');
            const { answerlatticeRequestBodyComposer } = await import('@lib/answerlattice/documentComposer');

            const updateData = await answerlatticeRequestBodyComposer({
                suggestedChange: {
                    ...proposal.suggestedChange,
                    draftStatus: 'failed',
                },
            });
            await setDoc(
                doc(answerlatticeFirebaseClient, DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS, proposalId),
                updateData,
                { merge: true }
            );

            return { success: false, error: 'Failed to parse AI response' };
        }

        // 7. Store draft on proposal
        const { setDoc, doc } = await import('firebase/firestore');
        const { answerlatticeFirebaseClient } = await import('@lib/firebase/answerlatticeFirebaseClient');
        const { DB_COLLECTIONS } = await import('@constant/database');
        const { answerlatticeRequestBodyComposer } = await import('@lib/answerlattice/documentComposer');

        const updateData = await answerlatticeRequestBodyComposer({
            suggestedChange: {
                ...proposal.suggestedChange,
                draftTitle: parsed.title,
                structuredSummary: parsed.structuredSummary,
                detailedExplanation: parsed.detailedExplanation,
                edgeCases: parsed.edgeCases,
                constraints: parsed.constraints,
                procedure: parsed.procedure,
                draftStatus: 'generated' as const,
                draftSource: 'signal_cluster' as const,
                draftGeneratedAt: Timestamp.now(),
                draftSignalExamples: signalExamples.slice(0, 5),
                draftEntityContext: `${entity.name}: ${entity.description}`.substring(0, 500),
                draftPromptVersion: DRAFT_PROMPT_VERSION,
            },
        });

        await setDoc(
            doc(answerlatticeFirebaseClient, DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS, proposalId),
            updateData,
            { merge: true }
        );

        // 8. Audit log
        const { addAuditLog } = await import('@database/answerlattice/auditLogs');
        await addAuditLog({
            tId,
            sId,
            action: 'draft_regenerated',
            entityType: 'mutationProposal',
            entityId: proposalId,
            previousState: { draftStatus: proposal.suggestedChange?.draftStatus || 'none' },
            newState: {
                draftTitle: parsed.title,
                draftSource: 'signal_cluster',
                promptVersion: DRAFT_PROMPT_VERSION,
            },
            performedBy: regeneratedBy,
            timestamp: Timestamp.now(),
        });

        return { success: true };
    } catch (error) {
        logAnswerlatticeFailure('answerlattice_draft_regeneration_failed', error, {
            ...getAnswerlatticeScopeLogContext({
                proposalId,
                sId,
                tId,
            }),
        });
        return { success: false, error: 'Draft regeneration failed' };
    }
}
