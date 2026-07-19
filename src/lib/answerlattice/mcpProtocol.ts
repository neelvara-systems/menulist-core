import { z } from 'zod';

export const ANSWERLATTICE_MCP_PROTOCOL_VERSIONS = [
    '2025-11-25',
    '2025-06-18',
    '2025-03-26',
] as const;

export const ANSWERLATTICE_MCP_LATEST_PROTOCOL_VERSION = ANSWERLATTICE_MCP_PROTOCOL_VERSIONS[0];
export const ANSWERLATTICE_MCP_DEFAULT_PROTOCOL_VERSION = '2025-03-26';

export type AnswerlatticeMcpProtocolVersion = typeof ANSWERLATTICE_MCP_PROTOCOL_VERSIONS[number];
export type AnswerlatticeMcpJsonRpcId = string | number | null;

const JsonRpcIdSchema = z.union([
    z.string().max(180),
    z.number().int().safe(),
]);

const JsonRpcRequestSchema = z.object({
    jsonrpc: z.literal('2.0'),
    id: JsonRpcIdSchema.optional(),
    method: z.string().trim().min(1).max(180),
    params: z.unknown().optional(),
}).strict();

const InitializeParamsSchema = z.object({
    protocolVersion: z.string().trim().min(1).max(40),
    capabilities: z.record(z.unknown()),
    clientInfo: z.object({
        name: z.string().trim().min(1).max(120),
        version: z.string().trim().min(1).max(80),
        title: z.string().trim().min(1).max(160).optional(),
    }).passthrough(),
}).strict();

const EmptyParamsSchema = z.object({}).strict();

const ToolsListParamsSchema = z.object({
    cursor: z.string().trim().min(1).max(500).optional(),
}).strict();

const ToolsCallParamsSchema = z.object({
    name: z.string().trim().min(1).max(180),
    arguments: z.record(z.unknown()).optional(),
}).strict();

export type AnswerlatticeMcpJsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;
export type AnswerlatticeMcpInitializeParams = z.infer<typeof InitializeParamsSchema>;
export type AnswerlatticeMcpToolsCallParams = z.infer<typeof ToolsCallParamsSchema>;

export const parseAnswerlatticeMcpJsonRpcRequest = (value: unknown) => JsonRpcRequestSchema.safeParse(value);
export const parseAnswerlatticeMcpInitializeParams = (value: unknown) => InitializeParamsSchema.safeParse(value);
export const parseAnswerlatticeMcpEmptyParams = (value: unknown) => EmptyParamsSchema.safeParse(value ?? {});
export const parseAnswerlatticeMcpToolsListParams = (value: unknown) => ToolsListParamsSchema.safeParse(value ?? {});
export const parseAnswerlatticeMcpToolsCallParams = (value: unknown) => ToolsCallParamsSchema.safeParse(value);

export const isAnswerlatticeMcpNotification = (
    request: AnswerlatticeMcpJsonRpcRequest,
): boolean => request.id === undefined;

export const negotiateAnswerlatticeMcpProtocolVersion = (
    requestedVersion: unknown,
): AnswerlatticeMcpProtocolVersion => (
    ANSWERLATTICE_MCP_PROTOCOL_VERSIONS.includes(requestedVersion as AnswerlatticeMcpProtocolVersion)
        ? requestedVersion as AnswerlatticeMcpProtocolVersion
        : ANSWERLATTICE_MCP_LATEST_PROTOCOL_VERSION
);

export const parseAnswerlatticeMcpProtocolVersionHeader = (
    value: string | null,
): AnswerlatticeMcpProtocolVersion | null => {
    const protocolVersion = value?.trim() || ANSWERLATTICE_MCP_DEFAULT_PROTOCOL_VERSION;
    return ANSWERLATTICE_MCP_PROTOCOL_VERSIONS.includes(protocolVersion as AnswerlatticeMcpProtocolVersion)
        ? protocolVersion as AnswerlatticeMcpProtocolVersion
        : null;
};

export const acceptsAnswerlatticeMcpStreamableHttp = (value: string | null): boolean => {
    const accepted = new Set(
        String(value || '')
            .split(',')
            .map(item => item.split(';')[0]?.trim().toLowerCase())
            .filter(Boolean),
    );
    return accepted.has('application/json') && accepted.has('text/event-stream');
};

export const ANSWERLATTICE_MCP_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0',
    'Vary': 'Authorization, Origin, Accept, MCP-Protocol-Version',
    'X-Content-Type-Options': 'nosniff',
} as const;
