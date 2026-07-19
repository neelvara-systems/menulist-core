export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { AnswerlatticeAnswerTestRollbackSchema } from '@lib/answerlattice/answerTestContracts';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import {
    normalizeAnswerlatticeScopeDocumentId,
    resolveAnswerlatticeSessionScope,
} from '@lib/answerlattice/sessionScope';
import {
    normalizeAnswerlatticeCanonicalAnswerId,
    normalizeAnswerlatticeMutationProposalId,
    normalizeAnswerlatticeResolvedEntityIds,
} from '@lib/answerlattice/governanceIdBoundary';
import { validateProcedure } from '@lib/answerlattice/procedureValidation';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import type { AnswerlatticeAnswerType, AnswerlatticeProcedure } from '@type/answerlattice';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../../middleware/auth';

const ROLLBACK_REQUEST_MAX_BODY_BYTES = 8 * 1024;
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
        return NextResponse.json({ error: 'Answer tests are not enabled.' }, { status: 403 });
    }
    const sessionScope = resolveAnswerlatticeSessionScope(session);
    if (!sessionScope) {
        return NextResponse.json(
            { error: 'Not onboarded' },
            { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
        );
    }
    const userId = session.uId || session.user?.id || 'unknown';

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
        });
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many rollback proposals. Please wait before trying again.' },
                { status: 429, headers: { 'Cache-Control': 'private, no-store' } },
            );
        }

        const permission = await requireAnswerlatticePermission(
            request,
            session,
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE,
        );
        if (permission.response) return permission.response;
        const access = permission.access;
        if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const bodyResult = await readBoundedJsonBody(request, ROLLBACK_REQUEST_MAX_BODY_BYTES);
        if (bodyResult.ok === false) {
            return NextResponse.json({ error: 'Invalid rollback proposal request.' }, { status: bodyResult.response.status });
        }
        const parsed = AnswerlatticeAnswerTestRollbackSchema.safeParse(bodyResult.data);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid rollback proposal request.' }, { status: 400 });
        }
        const answerId = normalizeAnswerlatticeCanonicalAnswerId(parsed.data.answerId);
        const auditLogId = normalizeAnswerlatticeMutationProposalId(parsed.data.auditLogId);
        if (!answerId || !auditLogId) {
            return NextResponse.json({ error: 'Invalid rollback proposal request.' }, { status: 400 });
        }

        const db = answerlatticeFirestoreAdmin;
        const [answerSnapshot, auditSnapshot] = await Promise.all([
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS).doc(answerId).get(),
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).doc(auditLogId).get(),
        ]);
        if (!answerSnapshot.exists || !auditSnapshot.exists) {
            return NextResponse.json({ error: 'Answer version not found.' }, { status: 404 });
        }
        const answer = answerSnapshot.data() || {};
        const audit = auditSnapshot.data() || {};
        const inScope = answer.pId === PRODUCT_IDS.ANSWERLATTICE
            && audit.pId === PRODUCT_IDS.ANSWERLATTICE
            && normalizeAnswerlatticeScopeDocumentId(answer.tId) === access.scope.tenantId
            && normalizeAnswerlatticeScopeDocumentId(answer.sId) === access.scope.storeId
            && normalizeAnswerlatticeScopeDocumentId(audit.tId) === access.scope.tenantId
            && normalizeAnswerlatticeScopeDocumentId(audit.sId) === access.scope.storeId;
        if (!inScope || audit.entityType !== 'canonicalAnswer' || audit.entityId !== answerId) {
            return NextResponse.json({ error: 'Answer version not found.' }, { status: 404 });
        }
        if (audit.action !== 'canonical_answer_updated') {
            return NextResponse.json({ error: 'This history entry cannot be used for a rollback proposal.' }, { status: 409 });
        }

        const restorable = RestorableSnapshotSchema.safeParse(audit.previousState?.answerSnapshot);
        if (!restorable.success) {
            return NextResponse.json(
                { error: 'This older history entry does not contain a restorable answer snapshot.' },
                { status: 409 },
            );
        }
        const relatedEntityIds = normalizeAnswerlatticeResolvedEntityIds(answer.scope?.entityIds, 25);
        if (relatedEntityIds.length === 0) {
            return NextResponse.json({ error: 'The answer is not bound to a valid product entity.' }, { status: 409 });
        }

        const answerType = (restorable.data.answerType || answer.answerType || 'explanation') as AnswerlatticeAnswerType;
        const suggestedChange: Record<string, unknown> = {
            structuredSummary: restorable.data.content.structuredSummary,
            detailedExplanation: restorable.data.content.detailedExplanation,
            ...(restorable.data.content.edgeCases ? { edgeCases: restorable.data.content.edgeCases } : {}),
            ...(restorable.data.content.constraints ? { constraints: restorable.data.content.constraints } : {}),
            reviewReason: parsed.data.reason,
            rollbackAuditLogId: auditLogId,
        };
        if (answerType === 'procedure' && restorable.data.content.procedure) {
            const procedure = restorable.data.content.procedure as AnswerlatticeProcedure;
            const procedureValidation = validateProcedure(answerType, procedure);
            if (!procedureValidation.valid) {
                return NextResponse.json({ error: 'The saved procedure version is no longer valid.' }, { status: 409 });
            }
            suggestedChange.procedure = procedure;
        }

        const proposalId = `rollback_${auditLogId}`;
        const proposalRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS).doc(proposalId);
        const proposalAuditRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).doc(`rollback_proposal_${auditLogId}`);
        const actor = String(access.user.email || access.user.name || access.user.id || 'unknown').slice(0, 180);
        const result = await db.runTransaction(async transaction => {
            const existing = await transaction.get(proposalRef);
            const existingAudit = await transaction.get(proposalAuditRef);
            if (existing.exists) {
                const data = existing.data() || {};
                if (
                    data.pId !== PRODUCT_IDS.ANSWERLATTICE
                    || normalizeAnswerlatticeScopeDocumentId(data.tId) !== access.scope.tenantId
                    || normalizeAnswerlatticeScopeDocumentId(data.sId) !== access.scope.storeId
                    || data.targetAnswerId !== answerId
                    || data.mutationType !== 'version_update'
                    || data.suggestedChange?.rollbackAuditLogId !== auditLogId
                ) {
                    throw new Error('rollback_proposal_scope_conflict');
                }
            }
            if (existingAudit.exists) {
                const data = existingAudit.data() || {};
                if (
                    data.pId !== PRODUCT_IDS.ANSWERLATTICE
                    || normalizeAnswerlatticeScopeDocumentId(data.tId) !== access.scope.tenantId
                    || normalizeAnswerlatticeScopeDocumentId(data.sId) !== access.scope.storeId
                    || data.action !== 'answer_rollback_proposed'
                    || data.entityType !== 'mutationProposal'
                    || data.entityId !== proposalId
                ) {
                    throw new Error('rollback_proposal_scope_conflict');
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
            const existingStatus = existing.exists ? String(existing.data()?.status || '') : 'pending_review';
            return {
                id: proposalId,
                created: !existing.exists,
                status: existingStatus || 'pending_review',
            };
        });

        return NextResponse.json({
            proposalId: result.id,
            created: result.created,
            status: result.status,
        }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        if (error instanceof Error && error.message === 'rollback_proposal_scope_conflict') {
            return NextResponse.json({ error: 'Rollback proposal conflict.' }, { status: 409 });
        }
        logRuntimeFailure('answerlattice_answer_rollback_proposal_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', sessionScope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', sessionScope.storeId),
        });
        return NextResponse.json({ error: 'Could not create the rollback proposal.' }, { status: 500 });
    }
});
