export const dynamic = 'force-dynamic';

/**
 * Answerlattice Public Answers API
 *
 * Public, read-only canonical answer retrieval for external SaaS systems.
 * Authenticated with hash-only `al_*` API keys and scoped to the key's store.
 */

import { FEATURE_FLAGS } from '@config/features';
import { attemptCanonicalRetrieval } from '@lib/answerlattice/canonicalRetrieval';
import { ANSWERLATTICE_PUBLIC_API_SCHEMA_VERSION, authenticateAnswerlatticePublicApi, toIsoTimestamp } from '@lib/answerlattice/publicApi';
import { apiError } from '@lib/publicApi/auth';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { AnswerlatticeContextSchema } from '@lib/validation/contextSchema';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PUBLIC_ANSWER_REQUEST_MAX_BODY_BYTES = 16 * 1024;

const PublicAnswerRequestSchema = z.object({
    query: z.string().trim().min(1).max(500),
    currentVersion: z.number().int().positive().max(999_999_999).optional(),
    planId: z.string().trim().max(80).optional(),
    roleId: z.string().trim().max(80).optional(),
    stateId: z.string().trim().max(80).optional(),
    context: z.unknown().optional(),
    includeDebug: z.boolean().optional().default(false),
}).strict();

const isPublicApiDebugResponseAllowed = () => (
    process.env.ANSWERLATTICE_PUBLIC_API_DEBUG === 'true'
    && process.env.NODE_ENV !== 'production'
);

function serializeAnswer(answer: any) {
    if (!answer) return null;

    return {
        id: answer.id,
        title: answer.title,
        slug: answer.slug,
        answerType: answer.answerType || 'explanation',
        content: {
            structuredSummary: answer.content?.structuredSummary || '',
            detailedExplanation: answer.content?.detailedExplanation || '',
            edgeCases: answer.content?.edgeCases || null,
            constraints: answer.content?.constraints || null,
            procedure: FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS ? answer.content?.procedure || null : null,
        },
        scope: {
            entityIds: answer.scope?.entityIds || [],
            planIds: answer.scope?.planIds || [],
            roleIds: answer.scope?.roleIds || [],
            stateIds: answer.scope?.stateIds || [],
        },
        productBinding: answer.productBinding || null,
        validation: {
            confidenceScore: answer.validation?.confidenceScore ?? null,
            validationSource: answer.validation?.validationSource || null,
            lastValidatedOn: toIsoTimestamp(answer.validation?.lastValidatedOn),
        },
        governance: {
            driftFlag: Boolean(answer.governance?.driftFlag),
            reviewRequired: Boolean(answer.governance?.reviewRequired),
            driftReason: answer.governance?.driftReason || null,
        },
        modifiedOn: toIsoTimestamp(answer.modifiedOn),
    };
}

function serializeFallbackReason(reason?: string | null): string | null {
    if (!reason) return null;
    if (reason.startsWith('retrieval_error')) return 'retrieval_error';
    if (reason.startsWith('entity_match_below_threshold')) return 'low_confidence_entity_match';

    const allowedReasons = new Set([
        'canonical_answers_disabled',
        'no_entity_index',
        'no_entity_match',
        'no_canonical_answers_for_entities',
        'no_version_match',
        'canonical_answer_review_required',
        'canonical_scope_context_required',
        'canonical_scope_not_covered',
    ]);

    return allowedReasons.has(reason) ? reason : 'fallback_required';
}

export async function POST(request: NextRequest) {
    const auth = await authenticateAnswerlatticePublicApi(request, 'POST /api/answerlattice/public/v1/answers');
    if (auth.ok === false) return auth.response;

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS) {
        return apiError('CANONICAL_ANSWERS_DISABLED', 'Canonical answers are not enabled for this workspace', 503);
    }

    try {
        const bodyResult = await readBoundedJsonBody(request, PUBLIC_ANSWER_REQUEST_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid request body',
            tooLargeMessage: 'Request body too large',
        });
        if (bodyResult.ok === false) {
            return apiError(
                bodyResult.response.status === 413 ? 'REQUEST_BODY_TOO_LARGE' : 'INVALID_INPUT',
                bodyResult.response.status === 413 ? 'Request body too large' : 'Invalid request body',
                bodyResult.response.status,
            );
        }

        const validation = PublicAnswerRequestSchema.safeParse(bodyResult.data);
        if (!validation.success) {
            return apiError('INVALID_INPUT', 'Invalid request body', 400);
        }

        const body = validation.data;
        const productContext = body.context && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CONTEXT_AWARE
            ? AnswerlatticeContextSchema.safeParse(body.context)
            : null;
        if (productContext && !productContext.success) {
            return apiError('INVALID_INPUT', 'Invalid page context', 400);
        }

        const result = await attemptCanonicalRetrieval(body.query, {
            tId: auth.context.tId,
            sId: auth.context.sId,
            currentVersion: body.currentVersion,
            planId: body.planId,
            roleId: body.roleId,
            stateId: body.stateId,
            context: productContext?.success ? productContext.data : undefined,
        });

        const response: Record<string, any> = {
            schemaVersion: ANSWERLATTICE_PUBLIC_API_SCHEMA_VERSION,
            generatedAt: new Date().toISOString(),
            canonical: Boolean(result.found && result.canonical),
            confidence: result.confidence,
            matchedEntityIds: result.matchedEntityIds,
            fallbackReason: serializeFallbackReason(result.fallbackReason),
            answer: serializeAnswer(result.answer),
        };

        if (result.graphExpansion && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH) {
            response.graphExpansion = {
                interactionDetected: result.graphExpansion.interactionDetected || null,
                expandedEntities: result.graphExpansion.expandedEntities || [],
                relatedSuggestions: result.graphExpansion.relatedSuggestions || [],
            };
        }

        if (body.includeDebug && isPublicApiDebugResponseAllowed()) {
            response.entityDebug = result.entityDebug || null;
        }

        return NextResponse.json(response, {
            headers: {
                'Cache-Control': 'private, no-store',
            },
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_public_answers_retrieval_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', auth.context.tId),
            ...getBoundedRuntimeStringContext('storeId', auth.context.sId),
        });
        return apiError('INTERNAL_ERROR', 'Internal error', 500);
    }
}
