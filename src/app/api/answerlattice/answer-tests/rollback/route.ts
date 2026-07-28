export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    requireAnswerlatticePermission,
} from '@lib/answerlattice/accessControl';
import {
    AnswerlatticeAnswerTestRollbackResponseSchema,
    AnswerlatticeAnswerTestRollbackSchema,
    isAnswerlatticeAnswerTestRollbackAuthorityInScope,
} from '@lib/answerlattice/answerTestContracts';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import {
    normalizeAnswerlatticeCanonicalAnswerId,
    normalizeAnswerlatticeMutationProposalId,
    normalizeAnswerlatticeResolvedEntityIds,
} from '@lib/answerlattice/governanceIdBoundary';
import { AnswerlatticeProcedureSchema } from '@lib/answerlattice/procedureValidation';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../../middleware/auth';

const ROLLBACK_REQUEST_MAX_BODY_BYTES = 8 * 1024;
const PRIVATE_NO_STORE_HEADERS = ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS;
const RollbackStatusSchema = z.enum(['pending_review', 'approved', 'rejected', 'implemented']);
const AnswerTypeSchema = z.enum(['explanation', 'navigation', 'procedure']);

class AnswerlatticeRollbackProposalError extends Error {
    constructor(
        readonly publicMessage: string,
        readonly status: number,
    ) {
        super(publicMessage);
        this.name = 'AnswerlatticeRollbackProposalError';
    }
}
const RestorableContentSchema = z.object({
    structuredSummary: z.string().trim().min(1).max(2000),
    detailedExplanation: z.string().trim().min(1).max(24000),
    edgeCases: z.string().trim().max(8000).optional(),
    constraints: z.string().trim().max(8000).optional(),
    procedure: z.unknown().optional(),
}).strip();
const RestorableSnapshotSchema = z.object({
    answerType: z.enum(['explanation', 'navigation', 'procedure']).optional(),
    content: RestorableContentSchema,
}).strip();

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ANSWER_TESTS) {
        return NextResponse.json(
            { error: 'Answer tests are not enabled.' },
            { status: 403, headers: PRIVATE_NO_STORE_HEADERS },
        );
    }
    const sessionScope = resolveAnswerlatticeSessionScope(session);
    if (!sessionScope) {
        return NextResponse.json(
            { error: 'Not onboarded' },
            { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
        );
    }
    const userId = resolveCurrentSessionUserDocumentId(session);
    if (!userId) {
        return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403, headers: PRIVATE_NO_STORE_HEADERS },
        );
    }

    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey(
                'answerlattice-answer-rollback-proposal',
                userId,
                sessionScope.tenantId,
                sessionScope.storeId,
            ),
            limit: 10,
            window: 60,
            failClosedOnProviderError: true,
        });
        if (!rateLimit.allowed) {
            const providerUnavailable = rateLimit.reason === 'provider_unavailable';
            const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
            return NextResponse.json(
                {
                    error: providerUnavailable
                        ? 'Rollback proposals are temporarily unavailable. Please try again shortly.'
                        : 'Too many rollback proposals. Please wait before trying again.',
                },
                {
                    status: providerUnavailable ? 503 : 429,
                    headers: {
                        ...PRIVATE_NO_STORE_HEADERS,
                        'Retry-After': String(retryAfter),
                    },
                },
            );
        }

        const permission = await requireAnswerlatticePermission(
            request,
            session,
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE,
        );
        if (permission.response) {
            permission.response.headers.set('Cache-Control', PRIVATE_NO_STORE_HEADERS['Cache-Control']);
            permission.response.headers.set('X-Content-Type-Options', PRIVATE_NO_STORE_HEADERS['X-Content-Type-Options']);
            return permission.response;
        }
        const access = permission.access;
        if (!access) {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }

        const bodyResult = await readBoundedJsonBody(request, ROLLBACK_REQUEST_MAX_BODY_BYTES);
        if (bodyResult.ok === false) {
            return NextResponse.json(
                { error: 'Invalid rollback proposal request.' },
                { status: bodyResult.response.status, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        const parsed = AnswerlatticeAnswerTestRollbackSchema.safeParse(bodyResult.data);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid rollback proposal request.' },
                { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        const answerId = normalizeAnswerlatticeCanonicalAnswerId(parsed.data.answerId);
        const auditLogId = normalizeAnswerlatticeMutationProposalId(parsed.data.auditLogId);
        if (!answerId || !auditLogId) {
            return NextResponse.json(
                { error: 'Invalid rollback proposal request.' },
                { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }

        const db = answerlatticeFirestoreAdmin;
        const answerRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS).doc(answerId);
        const auditRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).doc(auditLogId);
        const proposalId = `rollback_${auditLogId}`;
        const proposalRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS).doc(proposalId);
        const proposalAuditRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).doc(`rollback_proposal_${auditLogId}`);
        const actor = String(access.user.email || access.user.name || access.user.id || 'unknown').slice(0, 180);
        const result = await db.runTransaction(async transaction => {
            const answerSnapshot = await transaction.get(answerRef);
            const auditSnapshot = await transaction.get(auditRef);
            const existing = await transaction.get(proposalRef);
            const existingAudit = await transaction.get(proposalAuditRef);
            if (!answerSnapshot.exists || !auditSnapshot.exists) {
                throw new AnswerlatticeRollbackProposalError('Answer version not found.', 404);
            }
            const answer = answerSnapshot.data() || {};
            const audit = auditSnapshot.data() || {};
            const expectedScope = { tId: access.scope.tenantId, sId: access.scope.storeId };
            const inScope = isAnswerlatticeAnswerTestRollbackAuthorityInScope(answer, expectedScope)
                && isAnswerlatticeAnswerTestRollbackAuthorityInScope(audit, expectedScope);
            if (!inScope || audit.entityType !== 'canonicalAnswer' || audit.entityId !== answerId) {
                throw new AnswerlatticeRollbackProposalError('Answer version not found.', 404);
            }
            if (audit.action !== 'canonical_answer_updated') {
                throw new AnswerlatticeRollbackProposalError(
                    'This history entry cannot be used for a rollback proposal.',
                    409,
                );
            }
            const restorable = RestorableSnapshotSchema.safeParse(audit.previousState?.answerSnapshot);
            if (!restorable.success) {
                throw new AnswerlatticeRollbackProposalError(
                    'This older history entry does not contain a restorable answer snapshot.',
                    409,
                );
            }
            const relatedEntityIds = normalizeAnswerlatticeResolvedEntityIds(answer.scope?.entityIds, 25);
            if (relatedEntityIds.length === 0) {
                throw new AnswerlatticeRollbackProposalError(
                    'The answer is not bound to a valid product entity.',
                    409,
                );
            }
            const currentAnswerType = AnswerTypeSchema.safeParse(answer.answerType);
            const answerType = restorable.data.answerType
                || (currentAnswerType.success ? currentAnswerType.data : 'explanation');
            const suggestedChange: Record<string, unknown> = {
                structuredSummary: restorable.data.content.structuredSummary,
                detailedExplanation: restorable.data.content.detailedExplanation,
                ...(restorable.data.content.edgeCases ? { edgeCases: restorable.data.content.edgeCases } : {}),
                ...(restorable.data.content.constraints ? { constraints: restorable.data.content.constraints } : {}),
                reviewReason: parsed.data.reason,
                rollbackAuditLogId: auditLogId,
            };
            if (answerType === 'procedure') {
                const procedure = AnswerlatticeProcedureSchema.safeParse(restorable.data.content.procedure);
                if (!procedure.success) {
                    throw new AnswerlatticeRollbackProposalError(
                        'The saved procedure version is no longer valid.',
                        409,
                    );
                }
                suggestedChange.procedure = procedure.data;
            }
            if (existing.exists) {
                const data = existing.data() || {};
                if (
                    !isAnswerlatticeAnswerTestRollbackAuthorityInScope(data, expectedScope)
                    || data.targetAnswerId !== answerId
                    || data.mutationType !== 'version_update'
                    || data.suggestedChange?.rollbackAuditLogId !== auditLogId
                ) {
                    throw new AnswerlatticeRollbackProposalError('Rollback proposal conflict.', 409);
                }
            }
            if (existingAudit.exists) {
                const data = existingAudit.data() || {};
                if (
                    !isAnswerlatticeAnswerTestRollbackAuthorityInScope(data, expectedScope)
                    || data.action !== 'answer_rollback_proposed'
                    || data.entityType !== 'mutationProposal'
                    || data.entityId !== proposalId
                ) {
                    throw new AnswerlatticeRollbackProposalError('Rollback proposal conflict.', 409);
                }
            }

            const timestamp = FieldValue.serverTimestamp();
            if (!existing.exists) {
                transaction.create(proposalRef, {
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    tId: access.scope.tenantId,
                    sId: access.scope.storeId,
                    targetAnswerId: answerId,
                    relatedEntityIds,
                    mutationType: 'version_update',
                    signalSummary: {
                        ticketCount: 0,
                        chatCount: 0,
                        negativeFeedbackRate: 0,
                        exampleReferences: [`answer_version:${auditLogId}`],
                    },
                    suggestedChange,
                    confidenceScore: 1,
                    status: 'pending_review',
                    createdOn: timestamp,
                    modifiedOn: timestamp,
                    createdBy: actor,
                    modifiedBy: actor,
                });
            }
            if (!existingAudit.exists) {
                transaction.create(proposalAuditRef, {
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    tId: access.scope.tenantId,
                    sId: access.scope.storeId,
                    action: 'answer_rollback_proposed',
                    entityType: 'mutationProposal',
                    entityId: proposalId,
                    previousState: { answerId, auditLogId },
                    newState: { mutationType: 'version_update', status: 'pending_review' },
                    performedBy: actor,
                    timestamp,
                    createdOn: timestamp,
                });
            }
            const existingStatus = existing.exists
                ? RollbackStatusSchema.safeParse(existing.data()?.status)
                : RollbackStatusSchema.safeParse('pending_review');
            if (!existingStatus.success) {
                throw new AnswerlatticeRollbackProposalError('Rollback proposal conflict.', 409);
            }
            return {
                id: proposalId,
                created: !existing.exists,
                status: existingStatus.data,
            };
        });

        const response = AnswerlatticeAnswerTestRollbackResponseSchema.parse({
            proposalId: result.id,
            created: result.created,
            status: result.status,
        });
        return NextResponse.json(response, { headers: PRIVATE_NO_STORE_HEADERS });
    } catch (error) {
        if (error instanceof AnswerlatticeRollbackProposalError) {
            return NextResponse.json(
                { error: error.publicMessage },
                { status: error.status, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        logRuntimeFailure('answerlattice_answer_rollback_proposal_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', sessionScope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', sessionScope.storeId),
        });
        return NextResponse.json(
            { error: 'Could not create the rollback proposal.' },
            { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
        );
    }
});
