export const dynamic = 'force-dynamic';

import { ANSWERLATTICE_TEXT_MODEL } from '@constant/answerlattice/ai';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { getUnitCost } from '@constant/AI/unitCosts';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS, requireAnswerlatticePermission, } from '@lib/answerlattice/accessControl';
import { recordAnswerlatticeAiOperation } from '@lib/answerlattice/aiAccounting';
import { DRAFT_PROMPT_VERSION, DRAFT_SYSTEM_PROMPT, buildDraftUserPrompt, parseDraftResponse } from '@lib/answerlattice/draftPrompt';
import { normalizeAnswerlatticeMutationProposalId, normalizeAnswerlatticeResolvedEntityId } from '@lib/answerlattice/governanceIdBoundary';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { isExactAnswerlatticePersistedAuthority, resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin, requireAnswerlatticeFirestoreAdmin, } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import { callGeminiChatWithMetadata } from '@lib/vectorEmbeddings';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../../middleware/auth';

const RequestSchema = z.object({
    proposalId: z.string().trim().refine((value) => normalizeAnswerlatticeMutationProposalId(value) === value),
    requestId: z.string().trim().min(8).max(80).regex(/^[A-Za-z0-9_-]+$/),
}).strict();
const DRAFT_REGENERATE_MAX_BODY_BYTES = 4 * 1024;
const DRAFT_REGENERATE_LEASE_MS = 15 * 60 * 1000;

const privateJson = (body: unknown, init: ResponseInit = {}) => {
    const headers = new Headers(init.headers);
    Object.entries(ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        headers.set(name, value);
    });
    return (NextResponse.json)(body, { ...init, headers });
};

const withPrivateHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
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

async function markManualDraftClaimFailed(
    proposalRef: FirebaseFirestore.DocumentReference,
    requestId: string,
    actor: string,
): Promise<void> {
    await requireAnswerlatticeFirestoreAdmin().runTransaction(async transaction => {
        const currentSnap = await transaction.get(proposalRef);
        const current = currentSnap.data() || {};
        if (
            !currentSnap.exists
            || current.status !== 'pending_review'
            || current.suggestedChange?.draftProcessingRun?.id !== requestId
        ) return;
        transaction.set(proposalRef, {
            suggestedChange: {
                ...(current.suggestedChange || {}),
                draftStatus: 'failed',
                draftProcessingRun: null,
            },
            modifiedBy: actor,
            modifiedOn: FieldValue.serverTimestamp(),
        }, { merge: true });
    });
}

function extractSignalText(metadata?: Record<string, any>): string | null {
    if (!metadata) return null;
    const text = metadata.query || metadata.subject || metadata.title || metadata.comments || '';
    return text && text.length > 5 ? String(text).substring(0, 200) : null;
}

const getDraftGroundingLogContext = (tId: number, sId: number, entityId: string) => ({
    ...getBoundedRuntimeStringContext('tenantId', tId),
    ...getBoundedRuntimeStringContext('storeId', sId),
    ...getBoundedRuntimeStringContext('entityId', entityId),
});

async function gatherSignalExamples(tId: number, sId: number, entityId: string): Promise<string[]> {
    const examples: string[] = [];
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 14);

    let snapshot;
    try {
        snapshot = await requireAnswerlatticeFirestoreAdmin()
            .collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
            .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('entityId', '==', entityId)
            .where('timestamp', '>=', Timestamp.fromDate(windowStart))
            .orderBy('timestamp', 'desc')
            .limit(200)
            .get();
    } catch (error) {
        logRuntimeFailure(
            'answerlattice_draft_regeneration_signal_examples_load_failed',
            error,
            getDraftGroundingLogContext(tId, sId, entityId),
        );
        return examples;
    }

    snapshot?.docs.forEach((doc) => {
        const text = extractSignalText(doc.data().metadata);
        if (text && !examples.includes(text) && examples.length < 5) {
            examples.push(text);
        }
    });

    return examples;
}

async function getExistingAnswerSummaries(tId: number, sId: number, entityId: string): Promise<string[]> {
    let snapshot;
    try {
        snapshot = await requireAnswerlatticeFirestoreAdmin()
            .collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
            .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('scope.entityIds', 'array-contains', entityId)
            .where('status', '==', 'active')
            .limit(3)
            .get();
    } catch (error) {
        logRuntimeFailure(
            'answerlattice_draft_regeneration_existing_answers_load_failed',
            error,
            getDraftGroundingLogContext(tId, sId, entityId),
        );
        return [];
    }

    return snapshot?.docs.map((doc) => {
        const answer = doc.data();
        return `${answer.title || 'Existing answer'}: ${String(answer.content?.structuredSummary || '').substring(0, 150)}`;
    }).filter(Boolean) || [];
}

export const POST = withAuth(async (request: NextRequest, session) => {
    let tenantIdForLog: number | string | undefined;
    let storeIdForLog: number | string | undefined;
    const userIdForLog = resolveCurrentSessionUserDocumentId(session);
    let proposalIdForLog: string | undefined;
    let requestIdForLog: string | undefined;
    let claimedProposalRef: FirebaseFirestore.DocumentReference | null = null;
    let claimedActor = 'answerlattice_owner';

    try {
        if (!userIdForLog) {
            return privateJson({ error: 'Forbidden' }, { status: 403 });
        }
        const scope = resolveAnswerlatticeSessionScope(session);
        tenantIdForLog = scope?.tenantId;
        storeIdForLog = scope?.storeId;
        if (!scope) {
            return privateJson({ error: 'Answerlattice account scope is missing' }, { status: 400 });
        }

        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return withPrivateHeaders(safeModeResponse);

        const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
        const userId = userIdForLog;
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-draft-regenerate', userId, scope.tenantId, scope.storeId),
            ...rateLimitConfig,
            failClosedOnProviderError: true,
        });

        if (!rateLimit.allowed) {
            const providerUnavailable = rateLimit.reason === 'provider_unavailable';
            const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
            logger.security('Rate Limit Exceeded', {
                endpoint: '/api/answerlattice/mutation-proposals/regenerate-draft',
                limit: rateLimitConfig.limit,
                ...getBoundedRuntimeStringContext('storeId', scope.storeId),
                ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
                ...getBoundedRuntimeStringContext('userId', userId),
                waitSeconds,
                window: rateLimitConfig.window,
            }, 'medium');

            return privateJson(
                {
                    error: providerUnavailable
                        ? 'Draft generation is temporarily unavailable. Please try again later.'
                        : `Too many requests. Please wait ${waitSeconds} seconds.`,
                    retryAfter: waitSeconds,
                    resetAt: rateLimit.resetAt,
                },
                {
                    status: providerUnavailable ? 503 : 429,
                    headers: {
                        'Retry-After': String(waitSeconds),
                        'X-RateLimit-Limit': String(rateLimitConfig.limit),
                        'X-RateLimit-Remaining': String(rateLimit.remaining),
                        'X-RateLimit-Reset': String(rateLimit.resetAt),
                    },
                },
            );
        }

        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE);
        if (permission.response) return withPrivateHeaders(permission.response);

        const bodyResult = await readBoundedJsonBody(request, DRAFT_REGENERATE_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid draft regeneration request',
            tooLargeMessage: 'Request body too large',
        });
        if (bodyResult.ok === false) {
            return privateJson(
                { error: bodyResult.response.status === 413 ? 'Request body too large' : 'Invalid draft regeneration request' },
                { status: bodyResult.response.status },
            );
        }

        const validation = RequestSchema.safeParse(bodyResult.data);
        if (!validation.success) {
            return privateJson(
                { error: 'Invalid draft regeneration request', details: getSafeZodValidationDetails(validation.error) },
                { status: 400 },
            );
        }

        const { proposalId, requestId } = validation.data;
        proposalIdForLog = proposalId;
        requestIdForLog = requestId;
        const actor = session.user?.email || session.user?.name || String(userId);
        claimedActor = actor;
        const tenantId = scope.tenantId;
        const storeId = scope.storeId;
        const proposalRef = requireAnswerlatticeFirestoreAdmin()
            .collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS)
            .doc(proposalId);
        const proposalSnap = await proposalRef.get();

        if (!proposalSnap.exists) {
            return privateJson({ error: 'Proposal not found' }, { status: 404 });
        }

        const proposal = proposalSnap.data() || {};
        if (!isExactAnswerlatticePersistedAuthority(proposal, { tenantId, storeId })) {
            return privateJson({ error: 'Proposal is outside the current Answerlattice workspace' }, { status: 403 });
        }
        if (proposal.status !== 'pending_review') {
            return privateJson({ error: 'Only pending proposals can generate a draft' }, { status: 409 });
        }
        if (proposal.mutationType !== 'new_answer_required' && proposal.mutationType !== 'content_refinement') {
            return privateJson({ error: 'This proposal type does not support draft generation' }, { status: 422 });
        }

        const entityId = Array.isArray(proposal.relatedEntityIds) ? normalizeAnswerlatticeResolvedEntityId(proposal.relatedEntityIds[0]) : null;
        if (!entityId) {
            return privateJson({ error: 'No related entity is attached to this proposal' }, { status: 422 });
        }

        const entitySnap = await requireAnswerlatticeFirestoreAdmin()
            .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
            .doc(entityId)
            .get();
        if (!entitySnap.exists) {
            return privateJson({ error: 'Related entity not found' }, { status: 404 });
        }

        const entity = entitySnap.data() || {};
        if (
            !isExactAnswerlatticePersistedAuthority(entity, { tenantId, storeId })
            || entity.status === 'deprecated'
        ) {
            return privateJson({ error: 'Related entity is outside the current Answerlattice workspace' }, { status: 403 });
        }

        const claimResult = await requireAnswerlatticeFirestoreAdmin().runTransaction(async transaction => {
            const currentSnap = await transaction.get(proposalRef);
            const current = currentSnap.data() || {};
            if (
                !currentSnap.exists
                || !isExactAnswerlatticePersistedAuthority(current, { tenantId, storeId })
                || current.status !== 'pending_review'
            ) return 'changed' as const;
            if (
                current.suggestedChange?.lastDraftRequestId === requestId
                && current.suggestedChange?.draftStatus === 'generated'
            ) return 'replayed' as const;
            const activeLease = timestampToMillis(current.suggestedChange?.draftProcessingRun?.leaseExpiresAt) > Date.now();
            if (activeLease) return 'busy' as const;
            const now = Timestamp.now();
            transaction.set(proposalRef, {
                suggestedChange: {
                    ...(current.suggestedChange || {}),
                    draftStatus: 'pending',
                    draftProcessingRun: {
                        id: requestId,
                        startedAt: now,
                        leaseExpiresAt: Timestamp.fromMillis(Date.now() + DRAFT_REGENERATE_LEASE_MS),
                    },
                },
                modifiedBy: actor,
                modifiedOn: FieldValue.serverTimestamp(),
            }, { merge: true });
            return 'claimed' as const;
        });
        if (claimResult === 'replayed') {
            return privateJson({ ok: true, success: true, replayed: true });
        }
        if (claimResult === 'busy') {
            return privateJson({ error: 'Draft generation is already in progress' }, { status: 409 });
        }
        if (claimResult !== 'claimed') {
            return privateJson({ error: 'Proposal changed before draft generation started' }, { status: 409 });
        }
        claimedProposalRef = proposalRef;

        const [signalExamples, existingAnswerSummaries] = await Promise.all([
            gatherSignalExamples(tenantId, storeId, entityId),
            getExistingAnswerSummaries(tenantId, storeId, entityId),
        ]);
        const userPrompt = buildDraftUserPrompt({
            entityName: String(entity.name || 'Product entity'),
            entityDescription: String(entity.description || ''),
            entityType: String(entity.type || 'feature'),
            signalExamples,
            existingAnswerSummaries,
            mode: proposal.mutationType === 'content_refinement' ? 'refine_existing' : 'new_answer',
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
            model: ANSWERLATTICE_TEXT_MODEL,
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
        }).catch((logError) => {
            logRuntimeFailure('answerlattice_draft_regeneration_operation_log_failed', logError, {
                ...getBoundedRuntimeStringContext('tenantId', tenantId),
                ...getBoundedRuntimeStringContext('storeId', storeId),
                ...getBoundedRuntimeStringContext('proposalId', proposalId),
                ...getBoundedRuntimeStringContext('requestId', requestId),
            });
        });

        const parsed = parseDraftResponse(geminiResult.text);
        if (!parsed) {
            await requireAnswerlatticeFirestoreAdmin().runTransaction(async transaction => {
                const currentSnap = await transaction.get(proposalRef);
                const current = currentSnap.data() || {};
                if (
                    !currentSnap.exists
                    || current.status !== 'pending_review'
                    || current.suggestedChange?.draftProcessingRun?.id !== requestId
                ) return;
                transaction.set(proposalRef, {
                    suggestedChange: {
                        ...(current.suggestedChange || {}),
                        draftStatus: 'failed',
                        draftProcessingRun: null,
                    },
                    modifiedBy: actor,
                    modifiedOn: FieldValue.serverTimestamp(),
                }, { merge: true });
            });
            return privateJson({ error: 'Failed to parse AI response' }, { status: 422 });
        }

        const auditRef = requireAnswerlatticeFirestoreAdmin().collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).doc();
        const committed = await requireAnswerlatticeFirestoreAdmin().runTransaction(async transaction => {
            const currentSnap = await transaction.get(proposalRef);
            const current = currentSnap.data() || {};
            if (
                !currentSnap.exists
                || !isExactAnswerlatticePersistedAuthority(current, { tenantId, storeId })
                || current.status !== 'pending_review'
                || current.suggestedChange?.draftProcessingRun?.id !== requestId
            ) return false;
            const proposedContent = {
                structuredSummary: parsed.structuredSummary,
                detailedExplanation: parsed.detailedExplanation,
                ...(parsed.edgeCases ? { edgeCases: parsed.edgeCases } : {}),
                ...(parsed.constraints ? { constraints: parsed.constraints } : {}),
                ...(parsed.procedure ? { procedure: parsed.procedure } : {}),
            };
            transaction.set(proposalRef, {
                suggestedChange: {
                    ...(current.suggestedChange || {}),
                    draftTitle: parsed.title,
                    structuredSummary: parsed.structuredSummary,
                    detailedExplanation: parsed.detailedExplanation,
                    edgeCases: parsed.edgeCases,
                    constraints: parsed.constraints,
                    procedure: parsed.procedure,
                    ...(current.mutationType === 'content_refinement' ? { proposedContent } : {}),
                    draftStatus: 'generated',
                    draftSource: 'signal_cluster',
                    draftGeneratedAt: Timestamp.now(),
                    draftSignalExamples: signalExamples.slice(0, 5),
                    draftEntityContext: `${entity.name || ''}: ${entity.description || ''}`.substring(0, 500),
                    draftPromptVersion: DRAFT_PROMPT_VERSION,
                    draftProcessingRun: null,
                    lastDraftRequestId: requestId,
                },
                modifiedBy: actor,
                modifiedOn: FieldValue.serverTimestamp(),
            }, { merge: true });
            transaction.create(auditRef, {
                action: 'draft_regenerated',
                createdBy: actor,
                createdOn: FieldValue.serverTimestamp(),
                entityId: proposalId,
                entityType: 'mutationProposal',
                modifiedBy: actor,
                modifiedOn: FieldValue.serverTimestamp(),
                newState: {
                    draftSource: 'signal_cluster',
                    draftTitle: parsed.title,
                    mutationType: current.mutationType,
                    promptVersion: DRAFT_PROMPT_VERSION,
                },
                pId: PRODUCT_IDS.ANSWERLATTICE,
                performedBy: actor,
                previousState: {
                    draftStatus: current.suggestedChange?.draftStatus || 'none',
                },
                sId: storeId,
                tId: tenantId,
                timestamp: FieldValue.serverTimestamp(),
            });
            return true;
        });

        if (!committed) {
            return privateJson({ error: 'Proposal changed while the draft was being generated' }, { status: 409 });
        }
        claimedProposalRef = null;

        return privateJson({ ok: true, success: true });
    } catch (error) {
        if (claimedProposalRef && requestIdForLog) {
            try {
                await markManualDraftClaimFailed(claimedProposalRef, requestIdForLog, claimedActor);
            } catch (recoveryError) {
                logRuntimeFailure('answerlattice_draft_regeneration_claim_recovery_failed', recoveryError, {
                    ...getBoundedRuntimeStringContext('tenantId', tenantIdForLog),
                    ...getBoundedRuntimeStringContext('storeId', storeIdForLog),
                    ...getBoundedRuntimeStringContext('proposalId', proposalIdForLog),
                    ...getBoundedRuntimeStringContext('requestId', requestIdForLog),
                });
            }
        }
        logRuntimeFailure('answerlattice_draft_regeneration_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', tenantIdForLog),
            ...getBoundedRuntimeStringContext('storeId', storeIdForLog),
            ...getBoundedRuntimeStringContext('userId', userIdForLog),
            ...getBoundedRuntimeStringContext('proposalId', proposalIdForLog),
            ...getBoundedRuntimeStringContext('requestId', requestIdForLog),
        });
        return privateJson({ error: 'Could not generate draft' }, { status: 500 });
    }
});
