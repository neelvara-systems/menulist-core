export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { verifyCanonicaMcpSessionToken } from '@lib/canonica/mcpSession';
import { CANONICA_MCP_TOOLS, handleCanonicaMcpToolCall } from '@lib/canonica/mcpTools';
import { checkRateLimit } from '@lib/rateLimit';
import { secureError } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';

type JsonRpcRequest = {
    jsonrpc?: string;
    id?: string | number | null;
    method?: string;
    params?: any;
};

const jsonRpcResult = (id: JsonRpcRequest['id'], result: any) => NextResponse.json({ jsonrpc: '2.0', id, result });
const jsonRpcError = (id: JsonRpcRequest['id'], code: number, message: string, status = 200) => NextResponse.json({
    jsonrpc: '2.0',
    id,
    error: { code, message },
}, { status });

export async function POST(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_MCP || !FEATURE_FLAGS.ENABLE_CANONICA_CONTEXT_BUNDLES) {
        return jsonRpcError(null, -32000, 'Canonica MCP is not enabled', 404);
    }

    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin) {
        return jsonRpcError(null, -32001, 'Origin not allowed', 403);
    }

    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const session = verifyCanonicaMcpSessionToken(token);
    if (!session) {
        return jsonRpcError(null, -32002, 'Invalid MCP session', 401);
    }

    const rateLimit = await checkRateLimit({
        key: `canonica-mcp-tool:${session.tId}:${session.sId}`,
        limit: 120,
        window: 60,
    });
    if (!rateLimit.allowed) {
        return jsonRpcError(null, -32003, 'Rate limit exceeded', 429);
    }

    try {
        const body = await request.json().catch(() => null) as JsonRpcRequest;
        if (!body || body.jsonrpc !== '2.0' || !body.method) {
            return jsonRpcError(null, -32600, 'Invalid Request');
        }

        if (body.method === 'initialize') {
            return jsonRpcResult(body.id, {
                protocolVersion: '2025-06-18',
                serverInfo: { name: 'canonica', version: '1.0.0' },
                capabilities: { tools: {} },
            });
        }

        if (body.method === 'tools/list') {
            return jsonRpcResult(body.id, { tools: CANONICA_MCP_TOOLS });
        }

        if (body.method === 'tools/call') {
            const toolName = String(body.params?.name || '');
            const args = body.params?.arguments && typeof body.params.arguments === 'object'
                ? body.params.arguments
                : {};
            const result = await handleCanonicaMcpToolCall(session.tId, session.sId, toolName, args);
            return jsonRpcResult(body.id, result);
        }

        return jsonRpcError(body.id, -32601, 'Method not found');
    } catch (error) {
        secureError('[Canonica MCP] JSON-RPC request failed', error as Error, {
            tId: session.tId,
            sId: session.sId,
        });
        return jsonRpcError(null, -32603, 'Internal error');
    }
}
