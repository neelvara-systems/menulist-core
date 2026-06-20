export const dynamic = 'force-dynamic';

/**
 * Help Center Search API — Authenticated endpoint for owner dashboard
 *
 * This is a THIN AUTH WRAPPER around the unified coreSearch() pipeline.
 * All retrieval logic lives in src/lib/search/searchCore.ts.
 *
 * Auth: NextAuth session via withAuth()
 * Rate limiting: Per-user AI operation limit
 *
 * @see src/lib/search/searchCore.ts — The canonical search pipeline
 * @see __docs__/answerlattice/help-center/
 */

import { LOG_FILES } from '@constant/logging';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { recordAiOperationForSession } from '@lib/ai/operationLog';
import { getAIProviderRetryAfter, isAIProviderRateLimitError } from '@lib/ai/providerErrors';
import {
    getAnswerlatticeScopedSession,
    isAnswerlatticeRuntimeRoute,
    isAnswerlatticeSupportClientRoute,
    resolveAnswerlatticeSessionScope,
} from '@lib/answerlattice/sessionScope';
import { checkAIOperationLimit } from '@lib/rateLimit/helpers';
import { coreSearch } from '@lib/search/searchCore';
import { SearchRequestSchema } from '@lib/validation/chatSchemas';
import { writeLogEntry } from 'logs/utils';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const PERF_LOG = LOG_FILES.KB_SEARCH_PERFORMANCE;

const parseHeaderUrl = (value: string | null): URL | null => {
    if (!value) return null;
    try {
        return new URL(value);
    } catch {
        return null;
    }
};

export const POST = withAuth(async (request: NextRequest, session) => {
    try {
        // ✅ Session guaranteed by withAuth middleware

        // 🔒 VALIDATE INPUT: Prevent injection attacks and invalid data
        const rawBody = await request.json();

        let validatedInput;
        try {
            validatedInput = SearchRequestSchema.parse(rawBody);
        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.issues.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));

                return NextResponse.json(
                    { error: 'Validation failed', details: errors },
                    { status: 400 }
                );
            }
            throw error;
        }

        const {
            query: searchQuery,
            imageUrl,
            mode,
            context,
            productContext: rawProductContext,
            sessionFailureCount
        } = validatedInput;

        // 🔒 RATE LIMITING: Prevent API abuse
        const rateLimitResponse = await checkAIOperationLimit();
        if (rateLimitResponse) return rateLimitResponse;

        // ===== CONTEXT-AWARE SUPPORT =====
        // Parse product context from request if present (feature-flagged)
        const { FEATURE_FLAGS: contextFlags } = await import('@config/features');
        let productContext: import('@lib/validation/contextSchema').ValidatedContextPayload | undefined;
        const legacyProductContext = context && !Array.isArray(context)
            ? (context as any).productContext
            : undefined;
        const candidateProductContext = rawProductContext || legacyProductContext;
        if (candidateProductContext && contextFlags.ENABLE_ANSWERLATTICE_CONTEXT_AWARE) {
            try {
                const { AnswerlatticeContextSchema } = await import('@lib/validation/contextSchema');
                const parsedContext = AnswerlatticeContextSchema.parse(candidateProductContext);
                const trustedSessionRole = session?.user?.role || session?.role;
                productContext = {
                    ...parsedContext,
                    ...(trustedSessionRole ? { userRole: String(trustedSessionRole).trim().toLowerCase() } : {}),
                };
            } catch {
                productContext = undefined;
            }
        }

        const refererUrl = parseHeaderUrl(request.headers.get('referer'));
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
        const isAnswerlatticeRuntimeSearch = isAnswerlatticeRuntimeRoute(refererUrl?.pathname, refererUrl?.hostname)
            || isAnswerlatticeRuntimeRoute(null, host);
        const isAnswerlatticeClientSupportSearch = isAnswerlatticeSupportClientRoute(refererUrl?.pathname)
            && Boolean(resolveAnswerlatticeSessionScope(session));
        const shouldUseAnswerlatticeScopedSearch = isAnswerlatticeRuntimeSearch || isAnswerlatticeClientSupportSearch;
        const searchSession = shouldUseAnswerlatticeScopedSearch ? getAnswerlatticeScopedSession(session) : session;
        if (shouldUseAnswerlatticeScopedSearch && !resolveAnswerlatticeSessionScope(searchSession)) {
            return NextResponse.json({ error: 'Answerlattice workspace is not available' }, { status: 403 });
        }

        // ===== CORE SEARCH — Single source of truth =====
        const operationStart = Date.now();
        const result = await coreSearch({
            query: searchQuery,
            mountContext: 'help_center',
            tId: searchSession.tId,
            sId: searchSession.sId,
            uId: searchSession.uId,
            mode,
            conversationHistory: mode === 'assistant' && context ? context : undefined,
            imageUrl: imageUrl || undefined,
            productContext,
            sessionFailureCount: typeof sessionFailureCount === 'number' ? sessionFailureCount : undefined,
        });

        // ===== FORMAT RESPONSE for Help Center frontend =====
        // Help Center expects: craftedAnswer, references (full objects), suggestedQuestions, id
        const response: Record<string, any> = {
            craftedAnswer: result.craftedAnswer,
            references: result.references,
            suggestedQuestions: result.suggestedQuestions || [],
            id: result.searchHistoryId,
            imageProcessed: result.imageProcessed,
            answerSource: result.answerSource || (result.canonical ? 'canonical' : 'rag'),
        };

        if (result.relatedContent) {
            response.relatedContent = result.relatedContent;
        }

        // Add canonical-specific fields when applicable
        if (result.canonical) {
            response.canonical = true;
            response.canonicalAnswerId = result.canonicalAnswerId;
            response.confidence = result.confidence;
            response.answerType = result.answerType;
            response.drifted = result.drifted;
        }

        // Add procedure for guided workflows
        if (result.procedure) {
            response.procedure = result.procedure;
        }

        // Add graph expansion data for Knowledge Graph Exploitation (Item #11)
        if (result.graphExpansion) {
            response.graphExpansion = {
                originalEntities: result.graphExpansion.originalEntities,
                expandedEntities: result.graphExpansion.expandedEntities,
                interactionDetected: result.graphExpansion.interactionDetected || null,
                relatedSuggestions: result.graphExpansion.relatedSuggestions || [],
            };
        }

        // Add escalation data for AI Failure Escalation (Item #8)
        if (result.escalation?.escalationSuggested) {
            response.escalation = {
                suggested: true,
                type: result.escalation.escalationType,
                triggers: result.escalation.triggerTypes,
                context: result.escalation.escalationContext,
            };
        }

        if (result.aiProviderUsed) {
            recordAiOperationForSession(searchSession, {
                action: AI_ACTIONS_TYPES.HELP_CENTER_SEARCH,
                billingMode: 'internal',
                clientResponse: {
                    aiProviderOperations: result.aiProviderOperations || [],
                    answerType: result.answerType || null,
                    answerSource: result.answerSource || null,
                    canonical: Boolean(result.canonical),
                    imageProcessed: Boolean(result.imageProcessed),
                    referencesCount: result.references?.length || 0,
                    searchHistoryId: result.searchHistoryId || null,
                    suggestedQuestionsCount: result.suggestedQuestions?.length || 0,
                },
                model: 'coreSearch',
                processingTime: Date.now() - operationStart,
                promptTokenCount: result.aiProviderTokenUsage?.promptTokenCount || 0,
                source: 'help_center_search',
                totalTokenCount: result.aiProviderTokenUsage?.totalTokenCount || 0,
                candidatesTokenCount: result.aiProviderTokenUsage?.candidatesTokenCount || 0,
                tokenCountSource: result.aiProviderTokenUsage?.tokenCountSource || 'none',
            }).catch((error) => {
                void writeLogEntry({
                    logFileName: PERF_LOG,
                    userId: session?.uId,
                    logType: 'SEARCH_OPERATION_LOG_ERROR',
                    data: { error: error instanceof Error ? error.message : String(error) },
                });
            });
        }

        return NextResponse.json(response);

    } catch (err: any) {
        await writeLogEntry({
            logFileName: PERF_LOG,
            userId: session?.uId,
            logType: 'SEARCH_ERROR',
            data: {
                mountContext: 'help_center',
                error: err.message,
            }
        });

        if (isAIProviderRateLimitError(err)) {
            const retryAfter = getAIProviderRetryAfter(err) || 60;
            return NextResponse.json(
                {
                    error: `Search is temporarily busy. Please wait ${retryAfter} seconds before trying again.`,
                    retryAfter,
                },
                {
                    status: 429,
                    headers: { 'Retry-After': String(retryAfter) },
                }
            );
        }

        return NextResponse.json({ error: 'Search is temporarily unavailable. Please try again.' }, { status: 500 });
    }
});
