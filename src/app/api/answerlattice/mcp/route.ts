export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import {
    ANSWERLATTICE_MCP_RESPONSE_HEADERS,
    acceptsAnswerlatticeMcpStreamableHttp,
    isAnswerlatticeMcpNotification,
    negotiateAnswerlatticeMcpProtocolVersion,
    parseAnswerlatticeMcpEmptyParams,
    parseAnswerlatticeMcpInitializeParams,
    parseAnswerlatticeMcpJsonRpcRequest,
    parseAnswerlatticeMcpProtocolVersionHeader,
    parseAnswerlatticeMcpToolsCallParams,
    parseAnswerlatticeMcpToolsListParams,
    AnswerlatticeMcpJsonRpcId,
    AnswerlatticeMcpProtocolVersion,
} from '@lib/answerlattice/mcpProtocol';
import { hasAnswerlatticeMcpSessionScope, verifyAnswerlatticeMcpSessionToken } from '@lib/answerlattice/mcpSession';
import {
    ANSWERLATTICE_MCP_TOOLS,
    getAnswerlatticeMcpToolRequiredScope,
    handleAnswerlatticeMcpToolCall,
    isAnswerlatticeMcpToolName,
    parseAnswerlatticeMcpToolArguments,
} from '@lib/answerlattice/mcpTools';
import { ANSWERLATTICE_CONTEXT_BUNDLE_LIMITS } from '@lib/answerlattice/compiledContext';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';

const ANSWERLATTICE_MCP_MAX_BODY_BYTES = 16 * 1024;

const buildResponseHeaders = (protocolVersion?: AnswerlatticeMcpProtocolVersion) => ({
    ...ANSWERLATTICE_MCP_RESPONSE_HEADERS,
    ...(protocolVersion ? { 'MCP-Protocol-Version': protocolVersion } : {}),
});

const jsonRpcResult = (
    id: AnswerlatticeMcpJsonRpcId,
    result: unknown,
    protocolVersion?: AnswerlatticeMcpProtocolVersion,
) => NextResponse.json(
    { jsonrpc: '2.0', id, result },
    { headers: buildResponseHeaders(protocolVersion) },
);

const jsonRpcError = (
    id: AnswerlatticeMcpJsonRpcId,
    code: number,
    message: string,
    status = 200,
    protocolVersion?: AnswerlatticeMcpProtocolVersion,
    headers: Record<string, string> = {},
) => NextResponse.json({
    jsonrpc: '2.0',
    id,
    error: { code, message },
}, {
    status,
    headers: {
        ...buildResponseHeaders(protocolVersion),
        ...headers,
    },
});

const notificationAccepted = (protocolVersion: AnswerlatticeMcpProtocolVersion) => new NextResponse(null, {
    status: 202,
    headers: buildResponseHeaders(protocolVersion),
});

const getRateLimitResponse = (
    id: AnswerlatticeMcpJsonRpcId,
    rateLimit: { reason?: 'limit_exceeded' | 'provider_unavailable'; resetAt: number },
    protocolVersion?: AnswerlatticeMcpProtocolVersion,
) => jsonRpcError(
    id,
    -32003,
    rateLimit.reason === 'provider_unavailable'
        ? 'MCP temporarily unavailable'
        : 'Rate limit exceeded',
    rateLimit.reason === 'provider_unavailable' ? 503 : 429,
    protocolVersion,
    {
        'Retry-After': String(Math.max(Math.ceil((rateLimit.resetAt - Date.now()) / 1000), 1)),
    },
);

const isMcpEnabled = () => (
    FEATURE_FLAGS.ENABLE_ANSWERLATTICE_MCP
    && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES
);

const isMcpToolRuntimeAvailable = (toolName: string) => (
    toolName !== 'report_missing_context' || FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION
);

export async function GET(request: NextRequest) {
    if (!isMcpEnabled()) {
        return jsonRpcError(null, -32000, 'Answerlattice MCP is not enabled', 404);
    }
    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin) {
        return jsonRpcError(null, -32001, 'Origin not allowed', 403);
    }
    return jsonRpcError(null, -32600, 'Use POST for this MCP endpoint', 405, undefined, {
        Allow: 'POST',
    });
}

export async function POST(request: NextRequest) {
    let requestId: AnswerlatticeMcpJsonRpcId = null;
    let protocolVersion: AnswerlatticeMcpProtocolVersion | undefined;

    if (!isMcpEnabled()) {
        return jsonRpcError(null, -32000, 'Answerlattice MCP is not enabled', 404);
    }

    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin) {
        return jsonRpcError(null, -32001, 'Origin not allowed', 403);
    }

    if (!acceptsAnswerlatticeMcpStreamableHttp(request.headers.get('accept'))) {
        return jsonRpcError(
            null,
            -32600,
            'Accept must include application/json and text/event-stream',
            406,
        );
    }

    const authorization = request.headers.get('authorization') || '';
    const tokenMatch = authorization.match(/^Bearer\s+(\S+)$/i);
    const session = verifyAnswerlatticeMcpSessionToken(tokenMatch?.[1]);
    if (!session) {
        return jsonRpcError(null, -32002, 'Invalid MCP session', 401);
    }

    const rateLimit = await checkRateLimit({
        key: buildAnswerlatticeRateLimitKey('answerlattice-mcp-tool', session.tId, session.sId),
        limit: ANSWERLATTICE_CONTEXT_BUNDLE_LIMITS.maxMcpToolCallsPerMinute,
        window: 60,
        failClosedOnProviderError: true,
    });
    if (!rateLimit.allowed) {
        return getRateLimitResponse(null, rateLimit);
    }

    try {
        const bodyResult = await readBoundedJsonBody(request, ANSWERLATTICE_MCP_MAX_BODY_BYTES);
        if (bodyResult.ok === false) {
            return jsonRpcError(
                null,
                bodyResult.response.status === 413 ? -32004 : -32700,
                bodyResult.response.status === 413 ? 'Request body too large' : 'Parse error',
                bodyResult.response.status,
            );
        }

        const parsedRequest = parseAnswerlatticeMcpJsonRpcRequest(bodyResult.data);
        if (!parsedRequest.success) {
            return jsonRpcError(null, -32600, 'Invalid Request');
        }
        const body = parsedRequest.data;
        requestId = body.id ?? null;

        if (body.method === 'initialize') {
            if (isAnswerlatticeMcpNotification(body)) {
                return jsonRpcError(null, -32600, 'Initialize requires a request ID');
            }
            const parsedParams = parseAnswerlatticeMcpInitializeParams(body.params);
            if (!parsedParams.success) {
                return jsonRpcError(requestId, -32602, 'Invalid initialize parameters');
            }
            protocolVersion = negotiateAnswerlatticeMcpProtocolVersion(parsedParams.data.protocolVersion);
            return jsonRpcResult(requestId, {
                protocolVersion,
                serverInfo: {
                    name: 'answerlattice',
                    title: 'Answerlattice Governed Context',
                    version: '1.0.0',
                },
                capabilities: {
                    tools: { listChanged: false },
                },
            }, protocolVersion);
        }

        protocolVersion = parseAnswerlatticeMcpProtocolVersionHeader(
            request.headers.get('mcp-protocol-version'),
        ) || undefined;
        if (!protocolVersion) {
            return jsonRpcError(
                requestId,
                -32600,
                'Unsupported MCP protocol version',
                400,
            );
        }

        if (isAnswerlatticeMcpNotification(body)) {
            return notificationAccepted(protocolVersion);
        }

        if (body.method === 'ping') {
            if (!parseAnswerlatticeMcpEmptyParams(body.params).success) {
                return jsonRpcError(requestId, -32602, 'Invalid ping parameters', 200, protocolVersion);
            }
            return jsonRpcResult(requestId, {}, protocolVersion);
        }

        if (body.method === 'tools/list') {
            if (!parseAnswerlatticeMcpToolsListParams(body.params).success) {
                return jsonRpcError(requestId, -32602, 'Invalid tools/list parameters', 200, protocolVersion);
            }
            const tools = ANSWERLATTICE_MCP_TOOLS.filter((tool) => {
                const requiredScope = getAnswerlatticeMcpToolRequiredScope(tool.name);
                return requiredScope !== null
                    && isMcpToolRuntimeAvailable(tool.name)
                    && hasAnswerlatticeMcpSessionScope(session, requiredScope);
            });
            return jsonRpcResult(requestId, { tools }, protocolVersion);
        }

        if (body.method === 'tools/call') {
            const parsedParams = parseAnswerlatticeMcpToolsCallParams(body.params);
            if (!parsedParams.success || !isAnswerlatticeMcpToolName(parsedParams.data.name)) {
                return jsonRpcError(requestId, -32602, 'Unknown tool or invalid tool parameters', 200, protocolVersion);
            }
            const toolName = parsedParams.data.name;
            if (!isMcpToolRuntimeAvailable(toolName)) {
                return jsonRpcError(requestId, -32601, 'Tool not found', 200, protocolVersion);
            }
            const parsedArguments = parseAnswerlatticeMcpToolArguments(
                toolName,
                parsedParams.data.arguments || {},
            );
            if (!parsedArguments.success) {
                return jsonRpcError(requestId, -32602, 'Invalid tool arguments', 200, protocolVersion);
            }

            const requiredScope = getAnswerlatticeMcpToolRequiredScope(toolName);
            if (!requiredScope || !hasAnswerlatticeMcpSessionScope(session, requiredScope)) {
                return jsonRpcError(requestId, -32005, 'Tool scope not authorized', 403, protocolVersion);
            }

            if (toolName === 'report_missing_context') {
                const signalRateLimit = await checkRateLimit({
                    key: buildAnswerlatticeRateLimitKey('answerlattice-mcp-signal', session.tId, session.sId),
                    limit: 30,
                    window: 60 * 60,
                    failClosedOnProviderError: true,
                });
                if (!signalRateLimit.allowed) {
                    return getRateLimitResponse(requestId, signalRateLimit, protocolVersion);
                }
            }

            const result = await handleAnswerlatticeMcpToolCall(
                session.tId,
                session.sId,
                session.bundleVersion,
                toolName,
                parsedArguments.data,
            );
            return jsonRpcResult(requestId, result, protocolVersion);
        }

        return jsonRpcError(requestId, -32601, 'Method not found', 200, protocolVersion);
    } catch (error) {
        logRuntimeFailure('answerlattice_mcp_json_rpc_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', session.tId),
            ...getBoundedRuntimeStringContext('storeId', session.sId),
        });
        return jsonRpcError(requestId, -32603, 'Internal error', 200, protocolVersion);
    }
}
