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
import { secureError } from '@lib/security/secureLogger';
import { AnswerlatticeContextSchema } from '@lib/validation/contextSchema';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PublicAnswerRequestSchema = z.object({
    query: z.string().trim().min(1).max(500),
    currentVersion: z.number().int().positive().max(999_999_999).optional(),
    planId: z.string().trim().max(80).optional(),
    roleId: z.string().trim().max(80).optional(),
    context: z.unknown().optional(),
    includeDebug: z.boolean().optional().default(false),
});

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

export async function POST(request: NextRequest) {
    const auth = await authenticateAnswerlatticePublicApi(request, 'POST /api/answerlattice/public/v1/answers');
    if (auth.ok === false) return auth.response;

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS) {
        return apiError('CANONICAL_ANSWERS_DISABLED', 'Canonical answers are not enabled for this workspace', 503);
    }

    try {
        const validation = PublicAnswerRequestSchema.safeParse(await request.json().catch(() => null));
        if (!validation.success) {
            return apiError('INVALID_INPUT', 'Invalid request body', 400);
        }

        const body = validation.data;
        const productContext = body.context && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CONTEXT_AWARE
            ? AnswerlatticeContextSchema.safeParse(body.context)
            : null;

        const result = await attemptCanonicalRetrieval(body.query, {
            tId: auth.context.tId,
            sId: auth.context.sId,
            currentVersion: body.currentVersion,
            planId: body.planId,
            roleId: body.roleId,
            context: productContext?.success ? productContext.data : undefined,
        });

        const response: Record<string, any> = {
            schemaVersion: ANSWERLATTICE_PUBLIC_API_SCHEMA_VERSION,
            generatedAt: new Date().toISOString(),
            canonical: Boolean(result.found && result.canonical),
            confidence: result.confidence,
            matchedEntityIds: result.matchedEntityIds,
            fallbackReason: result.fallbackReason || null,
            answer: serializeAnswer(result.answer),
        };

        if (result.graphExpansion && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH) {
            response.graphExpansion = {
                interactionDetected: result.graphExpansion.interactionDetected || null,
                expandedEntities: result.graphExpansion.expandedEntities || [],
                relatedSuggestions: result.graphExpansion.relatedSuggestions || [],
            };
        }

        if (body.includeDebug) {
            response.entityDebug = result.entityDebug || null;
        }

        return NextResponse.json(response, {
            headers: {
                'Cache-Control': 'private, no-store',
            },
        });
    } catch (error) {
        secureError('[Answerlattice Public API] Answer retrieval failed', error as Error, {
            tId: auth.context.tId,
            sId: auth.context.sId,
        });
        return apiError('INTERNAL_ERROR', 'Internal error', 500);
    }
}
