export const dynamic = 'force-dynamic';

import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { getUnitCost } from '@constant/AI/unitCosts';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { recordAnswerlatticeAiOperation } from '@lib/answerlattice/aiAccounting';
import { DRAFT_PROMPT_VERSION, DRAFT_SYSTEM_PROMPT, buildDraftUserPrompt, parseDraftResponse } from '@lib/answerlattice/draftPrompt';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { admin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { secureError } from '@lib/security/secureLogger';
import { callGeminiChatWithMetadata } from '@lib/vectorEmbeddings';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../../middleware/auth';

const RequestSchema = z.object({
    proposalId: z.string().trim().min(1).max(160),
    regeneratedBy: z.string().trim().max(160).optional(),
});

function extractSignalText(metadata?: Record<string, any>): string | null {
    if (!metadata) return null;
    const text = metadata.query || metadata.subject || metadata.title || metadata.comments || '';
    return text && text.length > 5 ? String(text).substring(0, 200) : null;
}

async function gatherSignalExamples(tId: number, sId: number, entityId: string): Promise<string[]> {
    const examples: string[] = [];
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 14);

    const snapshot = await answerlatticeFirestoreAdmin
        .collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('entityId', '==', entityId)
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(windowStart))
        .orderBy('timestamp', 'desc')
        .limit(200)
        .get()
        .catch(() => null);

    snapshot?.docs.forEach((doc) => {
        const text = extractSignalText(doc.data().metadata);
        if (text && !examples.includes(text) && examples.length < 5) {
            examples.push(text);
        }
    });

    return examples;
}

async function getExistingAnswerSummaries(tId: number, sId: number, entityId: string): Promise<string[]> {
    const snapshot = await answerlatticeFirestoreAdmin
        .collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('scope.entityIds', 'array-contains', entityId)
        .where('status', '==', 'active')
        .limit(3)
        .get()
        .catch(() => null);

    return snapshot?.docs.map((doc) => {
        const answer = doc.data();
        return `${answer.title || 'Existing answer'}: ${String(answer.content?.structuredSummary || '').substring(0, 150)}`;
    }).filter(Boolean) || [];
}

export const POST = withAuth(async (request: NextRequest, session) => {
    try {
        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE);
        if (permission.response) return permission.response;

        const validation = RequestSchema.safeParse(await request.json().catch(() => null));
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid draft regeneration request', details: validation.error.flatten() },
                { status: 400 },
            );
        }

        const scope = resolveAnswerlatticeSessionScope(session);
        if (!scope) {
            return NextResponse.json({ error: 'Answerlattice account scope is missing' }, { status: 400 });
        }

        const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
        const userId = session.uId || session.user?.id || 'unknown';
        const rateLimit = await checkRateLimit({
            key: `answerlattice-draft-regenerate:${userId}:${scope.tenantId}:${scope.storeId}`,
            ...rateLimitConfig,
        });

        if (!rateLimit.allowed) {
            const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
            logger.security('Rate Limit Exceeded', {
                endpoint: '/api/answerlattice/mutation-proposals/regenerate-draft',
                limit: rateLimitConfig.limit,
                storeId: scope.storeId,
                tenantId: scope.tenantId,
                userId,
                waitSeconds,
                window: rateLimitConfig.window,
            }, 'medium');

            return NextResponse.json(
                {
                    error: `Too many requests. Please wait ${waitSeconds} seconds.`,
                    retryAfter: waitSeconds,
                    resetAt: rateLimit.resetAt,
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(waitSeconds),
                        'X-RateLimit-Limit': String(rateLimitConfig.limit),
                        'X-RateLimit-Remaining': String(rateLimit.remaining),
                        'X-RateLimit-Reset': String(rateLimit.resetAt),
                    },
                },
            );
        }

        const { proposalId, regeneratedBy } = validation.data;
        const actor = regeneratedBy || session.user?.email || session.user?.name || String(userId);
        const tenantId = Number(scope.tenantId);
        const storeId = Number(scope.storeId);
        const proposalRef = answerlatticeFirestoreAdmin
            .collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS)
            .doc(proposalId);
        const proposalSnap = await proposalRef.get();

        if (!proposalSnap.exists) {
            return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
        }

        const proposal = proposalSnap.data() || {};
        if (Number(proposal.tId) !== tenantId || Number(proposal.sId) !== storeId) {
            return NextResponse.json({ error: 'Proposal is outside the current Answerlattice workspace' }, { status: 403 });
        }
        if (proposal.mutationType !== 'new_answer_required') {
            return NextResponse.json({ error: 'Draft generation only supports new answer proposals' }, { status: 422 });
        }

        const entityId = Array.isArray(proposal.relatedEntityIds) ? proposal.relatedEntityIds[0] : null;
        if (!entityId) {
            return NextResponse.json({ error: 'No related entity is attached to this proposal' }, { status: 422 });
        }

        const entitySnap = await answerlatticeFirestoreAdmin
            .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
            .doc(String(entityId))
            .get();
        if (!entitySnap.exists) {
            return NextResponse.json({ error: 'Related entity not found' }, { status: 404 });
        }

        const entity = entitySnap.data() || {};
        if (Number(entity.tId) !== tenantId || Number(entity.sId) !== storeId) {
            return NextResponse.json({ error: 'Related entity is outside the current Answerlattice workspace' }, { status: 403 });
        }

        const [signalExamples, existingAnswerSummaries] = await Promise.all([
            gatherSignalExamples(tenantId, storeId, String(entityId)),
            getExistingAnswerSummaries(tenantId, storeId, String(entityId)),
        ]);
        const userPrompt = buildDraftUserPrompt({
            entityName: String(entity.name || 'Product entity'),
            entityDescription: String(entity.description || ''),
            entityType: String(entity.type || 'feature'),
            signalExamples,
            existingAnswerSummaries,
        });
        const combinedPrompt = `${DRAFT_SYSTEM_PROMPT}\n\n${userPrompt}`;
        const startedAt = Date.now();
        const geminiResult = await callGeminiChatWithMetadata(combinedPrompt, []);

        await recordAnswerlatticeAiOperation({
            tId: tenantId,
            sId: storeId,
        }, {
            action: AI_ACTIONS_TYPES.ANSWERLATTICE_DRAFT_GENERATION,
            billingMode: 'internal',
            clientResponse: {
                proposalId,
                trigger: 'manual_regenerate',
            },
            model: 'gemini-2.5-flash',
            processingTime: Date.now() - startedAt,
            source: 'answerlattice_governance_draft_regeneration',
            candidatesTokenCount: geminiResult.usageMetadata.candidatesTokenCount || 0,
            promptTokenCount: geminiResult.usageMetadata.promptTokenCount || 0,
            tokenCountSource: geminiResult.usageMetadata.tokenCountSource || 'none',
            totalTokenCount: geminiResult.usageMetadata.totalTokenCount || 0,
            unitsConsumed: getUnitCost(AI_ACTIONS_TYPES.ANSWERLATTICE_DRAFT_GENERATION),
        }, {
            id: userId,
            email: session.user?.email,
            name: session.user?.name,
        });

        const parsed = parseDraftResponse(geminiResult.text);
        if (!parsed) {
            await proposalRef.set({
                suggestedChange: {
                    ...(proposal.suggestedChange || {}),
                    draftStatus: 'failed',
                },
                modifiedBy: actor,
                modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 422 });
        }

        await proposalRef.set({
            suggestedChange: {
                ...(proposal.suggestedChange || {}),
                draftTitle: parsed.title,
                structuredSummary: parsed.structuredSummary,
                detailedExplanation: parsed.detailedExplanation,
                edgeCases: parsed.edgeCases,
                constraints: parsed.constraints,
                procedure: parsed.procedure,
                draftStatus: 'generated',
                draftSource: 'signal_cluster',
                draftGeneratedAt: admin.firestore.Timestamp.now(),
                draftSignalExamples: signalExamples.slice(0, 5),
                draftEntityContext: `${entity.name || ''}: ${entity.description || ''}`.substring(0, 500),
                draftPromptVersion: DRAFT_PROMPT_VERSION,
            },
            modifiedBy: actor,
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        await answerlatticeFirestoreAdmin.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).add({
            action: 'draft_regenerated',
            createdBy: actor,
            createdOn: admin.firestore.FieldValue.serverTimestamp(),
            entityId: proposalId,
            entityType: 'mutationProposal',
            modifiedBy: actor,
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
            newState: {
                draftSource: 'signal_cluster',
                draftTitle: parsed.title,
                promptVersion: DRAFT_PROMPT_VERSION,
            },
            pId: PRODUCT_IDS.ANSWERLATTICE,
            performedBy: actor,
            previousState: {
                draftStatus: proposal.suggestedChange?.draftStatus || 'none',
            },
            sId: storeId,
            tId: tenantId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ ok: true, success: true });
    } catch (error) {
        secureError('[Answerlattice Draft] Manual regeneration failed', error as Error, {
            path: request.nextUrl.pathname,
        });
        return NextResponse.json({ error: 'Could not generate draft' }, { status: 500 });
    }
});
