export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { verifyAnswerlatticeMcpSessionToken } from '@lib/answerlattice/mcpSession';
import { ANSWERLATTICE_MCP_TOOLS, handleAnswerlatticeMcpToolCall } from '@lib/answerlattice/mcpTools';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';

type JsonRpcRequest = {
    jsonrpc?: string;
    id?: string | number | null;
    method?: string;
    params?: any;
};

const ANSWERLATTICE_MCP_MAX_BODY_BYTES = 16 * 1024;

const jsonRpcResult = (id: JsonRpcRequest['id'], result: any) => NextResponse.json({ jsonrpc: '2.0', id, result });
const jsonRpcError = (id: JsonRpcRequest['id'], code: number, message: string, status = 200) => NextResponse.json({
    jsonrpc: '2.0',
    id,
    error: { code, message },
}, { status });

export async function POST(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_MCP || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES) {
        return jsonRpcError(null, -32000, 'Answerlattice MCP is not enabled', 404);
    }

    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin) {
        return jsonRpcError(null, -32001, 'Origin not allowed', 403);
    }

    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const session = verifyAnswerlatticeMcpSessionToken(token);
    if (!session) {
        return jsonRpcError(null, -32002, 'Invalid MCP session', 401);
    }

    const rateLimit = await checkRateLimit({
        key: buildAnswerlatticeRateLimitKey('answerlattice-mcp-tool', session.tId, session.sId),
        limit: 120,
        window: 60,
    });
    if (!rateLimit.allowed) {
        return jsonRpcError(null, -32003, 'Rate limit exceeded', 429);
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

        const body = bodyResult.data as JsonRpcRequest;
        if (!body || body.jsonrpc !== '2.0' || !body.method) {
            return jsonRpcError(null, -32600, 'Invalid Request');
        }

        if (body.method === 'initialize') {
            return jsonRpcResult(body.id, {
                protocolVersion: '2025-06-18',
                serverInfo: { name: 'answerlattice', version: '1.0.0' },
                capabilities: { tools: {} },
            });
        }

        if (body.method === 'tools/list') {
            return jsonRpcResult(body.id, { tools: ANSWERLATTICE_MCP_TOOLS });
        }

        if (body.method === 'tools/call') {
            const toolName = String(body.params?.name || '');
            const args = body.params?.arguments && typeof body.params.arguments === 'object'
                ? body.params.arguments
                : {};
            const result = await handleAnswerlatticeMcpToolCall(session.tId, session.sId, toolName, args);
            return jsonRpcResult(body.id, result);
        }

        return jsonRpcError(body.id, -32601, 'Method not found');
    } catch (error) {
        logRuntimeFailure('answerlattice_mcp_json_rpc_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', session.tId),
            ...getBoundedRuntimeStringContext('storeId', session.sId),
        });
        return jsonRpcError(null, -32603, 'Internal error');
    }
}
