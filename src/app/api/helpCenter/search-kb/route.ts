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
import { getAIProviderRetryAfter, isAIProviderRateLimitError } from '@lib/ai/providerErrors';
import {
    AnswerlatticeSupportSearchCapacityError,
    createAnswerlatticeSupportSearchAccounting,
} from '@lib/answerlattice/supportSearchAccounting';
import {
    getAnswerlatticeScopedSession,
    resolveAnswerlatticeSessionScope,
} from '@lib/answerlattice/sessionScope';
import { resolveExactSessionStoreRole } from '@lib/auth/sessionPlatformRole';
import { checkAIOperationLimit } from '@lib/rateLimit/helpers';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import { coreSearch } from '@lib/search/searchCore';
import { projectHelpCenterSearchResponse } from '@lib/search/helpCenterSearchResponse';
import { SearchRequestSchema } from '@lib/validation/chatSchemas';
import { writeLogEntry } from 'logs/utils';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { withAuth } from '../../../../middleware/auth';
import {
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';

const PERF_LOG = LOG_FILES.KB_SEARCH_PERFORMANCE;
const HELP_CENTER_SEARCH_MAX_BODY_BYTES = 64 * 1024;
const HELP_CENTER_PRIVATE_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
} as const;
const searchJsonResponse = (body: unknown, init: ResponseInit = {}) => {
    const headers = new Headers(init.headers);
    Object.entries(HELP_CENTER_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        headers.set(name, value);
    });
    return NextResponse.json(body, { ...init, headers });
};
const withSearchResponseHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(HELP_CENTER_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
};

const getHelpCenterSearchErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getHelpCenterSearchErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getHelpCenterSearchErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

const getHelpCenterSearchFailureLogData = (
    failureCode: string,
    error?: unknown,
    context: Record<string, boolean | number | string | null | undefined> = {},
) => ({
    failureCode,
    ...context,
    sourceErrorName: getHelpCenterSearchErrorName(error),
    sourceErrorCode: getHelpCenterSearchErrorCode(error),
    sourceStatusCode: getHelpCenterSearchErrorStatus(error),
});

const writeHelpCenterSearchLogSafely = async (entry: Parameters<typeof writeLogEntry>[0]) => {
    try {
        await writeLogEntry(entry);
    } catch (error) {
        logRuntimeFailure('answerlattice_search_operation_log_failed', error, {
            ...getBoundedRuntimeStringContext('logFileName', entry.logFileName),
            ...getBoundedRuntimeStringContext('logType', entry.logType),
            hasData: Boolean(entry.data),
            hasError: Boolean(entry.error),
        });
    }
};

export const POST = withAuth(async (request: NextRequest, session) => {
    let supportSearchAccounting: ReturnType<typeof createAnswerlatticeSupportSearchAccounting> | null = null;
    try {
        // ✅ Session guaranteed by withAuth middleware

        // 🔒 RATE LIMITING: Prevent API abuse
        const rateLimitResponse = await checkAIOperationLimit();
        if (rateLimitResponse) return withSearchResponseHeaders(rateLimitResponse);

        // 🔒 VALIDATE INPUT: Prevent injection attacks and invalid data
        const bodyResult = await readBoundedJsonBody(request, HELP_CENTER_SEARCH_MAX_BODY_BYTES);
        if (bodyResult.ok === false) return withSearchResponseHeaders(bodyResult.response);

        let validatedInput;
        try {
            validatedInput = SearchRequestSchema.parse(bodyResult.data);
        } catch (error) {
            if (error instanceof ZodError) {
                return searchJsonResponse(
                    { error: 'Validation failed', details: getSafeZodValidationDetails(error) },
                    { status: 400 }
                );
            }
            throw error;
        }

        const {
            requestId,
            query: searchQuery,
            imageUrl,
            mode,
            context,
            productContext: rawProductContext
        } = validatedInput;

        // ===== CONTEXT-AWARE SUPPORT =====
        // Parse product context from request if present (feature-flagged)
        const { FEATURE_FLAGS: contextFlags } = await import('@config/features');
        let productContext: import('@lib/validation/contextSchema').ValidatedContextPayload | undefined;
        const candidateProductContext = rawProductContext;
        if (candidateProductContext && contextFlags.ENABLE_ANSWERLATTICE_CONTEXT_AWARE) {
            try {
                const { AnswerlatticeContextSchema } = await import('@lib/validation/contextSchema');
                const parsedContext = AnswerlatticeContextSchema.parse(candidateProductContext);
                const trustedSessionRole = resolveExactSessionStoreRole(session);
                productContext = {
                    ...parsedContext,
                    ...(trustedSessionRole ? { userRole: String(trustedSessionRole).trim().toLowerCase() } : {}),
                };
            } catch {
                productContext = undefined;
            }
        }

        const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
        if (!answerlatticeScope) {
            return searchJsonResponse({ error: 'Answerlattice workspace is not available' }, { status: 403 });
        }
        const searchSession = getAnswerlatticeScopedSession(session);

        // ===== CORE SEARCH — Single source of truth =====
        const operationStart = Date.now();
        supportSearchAccounting = createAnswerlatticeSupportSearchAccounting({
            actor: {
                id: searchSession.uId,
                name: searchSession.user?.name,
                email: searchSession.user?.email,
            },
            mountContext: 'help_center',
            requestId,
            scope: { tId: searchSession.tId, sId: searchSession.sId },
        });
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
            beforeAiProviderCall: supportSearchAccounting.beforeAiProviderCall,
        });
        await supportSearchAccounting.settle(result, Date.now() - operationStart);

        // ===== FORMAT RESPONSE for Help Center frontend =====
        // Help Center expects: craftedAnswer, references (full objects), suggestedQuestions, id
        return searchJsonResponse(projectHelpCenterSearchResponse(result));

    } catch (err: any) {
        await supportSearchAccounting?.abort('request_failed').catch((refundError) => {
            logRuntimeFailure('answerlattice_help_center_search_reservation_refund_failed', refundError);
        });
        await writeHelpCenterSearchLogSafely({
            logFileName: PERF_LOG,
            userId: session?.uId,
            logType: 'SEARCH_ERROR',
            data: getHelpCenterSearchFailureLogData('answerlattice_help_center_search_failed', err, {
                mountContext: 'help_center',
            }),
        });

        if (err instanceof AnswerlatticeSupportSearchCapacityError) {
            return searchJsonResponse({
                error: err.message,
                code: err.code,
                remainingCredits: err.remaining,
                requiredCredits: err.required,
            }, { status: err.status });
        }

        if (isAIProviderRateLimitError(err)) {
            const retryAfter = getAIProviderRetryAfter(err) || 60;
            return searchJsonResponse(
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

        return searchJsonResponse({ error: 'Search is temporarily unavailable. Please try again.' }, { status: 500 });
    }
});
