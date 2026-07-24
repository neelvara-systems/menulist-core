import {
    ANSWERLATTICE_CONTEXT_BUNDLE_LIMITS,
    buildAnswerlatticeRouteKey,
    getAnswerlatticeBundleRefPath,
} from '@lib/answerlattice/compiledContext';
import {
    getAnswerlatticeContextBundleManifestServer,
    loadAnswerlatticeBundleObjectServer,
} from '@lib/answerlattice/contextBundleBuilderServer';
import {
    normalizeAnswerlatticeCanonicalAnswerId,
    normalizeAnswerlatticeResolvedEntityId,
} from '@lib/answerlattice/governanceIdBoundary';
import { emitAnswerlatticeSignal } from '@lib/answerlattice/signalEmitterServer';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { ANSWERLATTICE_SIGNAL_TYPE } from '@type/answerlattice';
import { createHash } from 'crypto';
import { z } from 'zod';

export type AnswerlatticeMcpToolScope = 'context:read' | 'signals:write';

const ANSWERLATTICE_MCP_TOOL_SCHEMA_VERSION = 'answerlattice.mcp.tool.v1';
const ANSWERLATTICE_MCP_TOOL_RESULT_MAX_BYTES = ANSWERLATTICE_CONTEXT_BUNDLE_LIMITS.maxMcpResponseBytes;
const ROUTE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,95}$/;

const ReadToolAnnotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
} as const;

const SignalToolAnnotations = {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
} as const;

const ToolOutputSchema = {
    type: 'object',
    properties: {
        schemaVersion: { type: 'string', const: ANSWERLATTICE_MCP_TOOL_SCHEMA_VERSION },
        ok: { type: 'boolean' },
        tool: { type: 'string' },
        bundleVersion: { type: ['number', 'null'] },
        generatedAt: { type: ['string', 'null'] },
        data: {},
        error: {
            anyOf: [
                { type: 'null' },
                {
                    type: 'object',
                    properties: {
                        code: { type: 'string' },
                        message: { type: 'string' },
                    },
                    required: ['code', 'message'],
                    additionalProperties: false,
                },
            ],
        },
    },
    required: ['schemaVersion', 'ok', 'tool', 'bundleVersion', 'generatedAt', 'data', 'error'],
    additionalProperties: false,
} as const;

const EmptyArgumentsSchema = z.object({}).strict();
const RouteArgumentsSchema = z.object({
    routeKey: z.string().trim().regex(ROUTE_KEY_PATTERN).optional(),
    path: z.string().trim().min(1).max(500).optional(),
}).strict().refine(value => Boolean(value.routeKey || value.path), {
    message: 'routeKey or path is required',
});
const EntityArgumentsSchema = z.object({
    entityId: z.string().trim().min(1).max(180)
        .refine(value => normalizeAnswerlatticeResolvedEntityId(value) === value, 'Invalid entity ID'),
}).strict();
const CanonicalArgumentsSchema = z.object({
    answerId: z.string().trim().min(1).max(180)
        .refine(value => normalizeAnswerlatticeCanonicalAnswerId(value) === value, 'Invalid answer ID'),
}).strict();
const SearchArgumentsSchema = z.object({
    query: z.string().trim().min(1).max(500),
    limit: z.number().int().min(1).max(20).optional(),
}).strict();
const MissingContextArgumentsSchema = z.object({
    query: z.string().trim().min(1).max(500),
    routeKey: z.string().trim().regex(ROUTE_KEY_PATTERN).optional(),
    entityId: z.string().trim().min(1).max(180)
        .refine(value => normalizeAnswerlatticeResolvedEntityId(value) === value, 'Invalid entity ID')
        .optional(),
}).strict();

const MCP_TOOL_ARGUMENT_SCHEMAS = {
    get_product_context: EmptyArgumentsSchema,
    get_route_context: RouteArgumentsSchema,
    get_entity_context: EntityArgumentsSchema,
    get_canonical_context: CanonicalArgumentsSchema,
    search_canonical_context: SearchArgumentsSchema,
    get_release_context: EmptyArgumentsSchema,
    report_missing_context: MissingContextArgumentsSchema,
} as const;

export type AnswerlatticeMcpToolName = keyof typeof MCP_TOOL_ARGUMENT_SCHEMAS;

export const ANSWERLATTICE_MCP_TOOLS = [
    {
        name: 'get_product_context',
        title: 'Get product context',
        description: 'Return compiled approved product context for the Answerlattice workspace.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        outputSchema: ToolOutputSchema,
        annotations: ReadToolAnnotations,
    },
    {
        name: 'get_route_context',
        title: 'Get route context',
        description: 'Return compiled approved route or product-surface context by stable route key or path.',
        inputSchema: {
            type: 'object',
            properties: {
                routeKey: { type: 'string', pattern: ROUTE_KEY_PATTERN.source, maxLength: 96 },
                path: { type: 'string', minLength: 1, maxLength: 500 },
            },
            anyOf: [{ required: ['routeKey'] }, { required: ['path'] }],
            additionalProperties: false,
        },
        outputSchema: ToolOutputSchema,
        annotations: ReadToolAnnotations,
    },
    {
        name: 'get_entity_context',
        title: 'Get entity context',
        description: 'Return compiled approved entity context by exact entity ID.',
        inputSchema: {
            type: 'object',
            properties: { entityId: { type: 'string', minLength: 1, maxLength: 180 } },
            required: ['entityId'],
            additionalProperties: false,
        },
        outputSchema: ToolOutputSchema,
        annotations: ReadToolAnnotations,
    },
    {
        name: 'get_canonical_context',
        title: 'Get canonical answer context',
        description: 'Return an approved canonical answer by exact answer ID.',
        inputSchema: {
            type: 'object',
            properties: { answerId: { type: 'string', minLength: 1, maxLength: 180 } },
            required: ['answerId'],
            additionalProperties: false,
        },
        outputSchema: ToolOutputSchema,
        annotations: ReadToolAnnotations,
    },
    {
        name: 'search_canonical_context',
        title: 'Search canonical answer context',
        description: 'Search approved canonical answer titles, summaries, and entity bindings.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', minLength: 1, maxLength: 500 },
                limit: { type: 'integer', minimum: 1, maximum: 20 },
            },
            required: ['query'],
            additionalProperties: false,
        },
        outputSchema: ToolOutputSchema,
        annotations: ReadToolAnnotations,
    },
    {
        name: 'get_release_context',
        title: 'Get release context',
        description: 'Return the latest approved release and changelog context.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        outputSchema: ToolOutputSchema,
        annotations: ReadToolAnnotations,
    },
    {
        name: 'report_missing_context',
        title: 'Report missing context',
        description: 'Record a bounded, governed knowledge-gap signal without changing approved product truth.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', minLength: 1, maxLength: 500 },
                routeKey: { type: 'string', pattern: ROUTE_KEY_PATTERN.source, maxLength: 96 },
                entityId: { type: 'string', minLength: 1, maxLength: 180 },
            },
            required: ['query'],
            additionalProperties: false,
        },
        outputSchema: ToolOutputSchema,
        annotations: SignalToolAnnotations,
    },
] as const;

export const isAnswerlatticeMcpToolName = (value: string): value is AnswerlatticeMcpToolName => (
    Object.prototype.hasOwnProperty.call(MCP_TOOL_ARGUMENT_SCHEMAS, value)
);

export const getAnswerlatticeMcpToolRequiredScope = (toolName: string): AnswerlatticeMcpToolScope | null => {
    if (!isAnswerlatticeMcpToolName(toolName)) return null;
    return toolName === 'report_missing_context' ? 'signals:write' : 'context:read';
};

export const parseAnswerlatticeMcpToolArguments = (
    toolName: AnswerlatticeMcpToolName,
    value: unknown,
) => MCP_TOOL_ARGUMENT_SCHEMAS[toolName].safeParse(value ?? {});

type McpToolEnvelope = {
    schemaVersion: typeof ANSWERLATTICE_MCP_TOOL_SCHEMA_VERSION;
    ok: boolean;
    tool: string;
    bundleVersion: number | null;
    generatedAt: string | null;
    data: unknown;
    error: { code: string; message: string } | null;
};

const serializeToolEnvelope = (envelope: McpToolEnvelope) => {
    const text = JSON.stringify(envelope);
    if (Buffer.byteLength(text, 'utf8') <= ANSWERLATTICE_MCP_TOOL_RESULT_MAX_BYTES) {
        return {
            content: [{ type: 'text' as const, text }],
            structuredContent: envelope,
            isError: !envelope.ok,
        };
    }

    const boundedEnvelope: McpToolEnvelope = {
        schemaVersion: ANSWERLATTICE_MCP_TOOL_SCHEMA_VERSION,
        ok: false,
        tool: envelope.tool,
        bundleVersion: envelope.bundleVersion,
        generatedAt: envelope.generatedAt,
        data: null,
        error: {
            code: 'RESULT_TOO_LARGE',
            message: 'The result exceeded the MCP response boundary. Use a narrower context tool.',
        },
    };
    return {
        content: [{ type: 'text' as const, text: JSON.stringify(boundedEnvelope) }],
        structuredContent: boundedEnvelope,
        isError: true,
    };
};

const buildToolSuccess = (
    tool: string,
    data: unknown,
    metadata: { bundleVersion?: number | null; generatedAt?: string | null } = {},
) => serializeToolEnvelope({
    schemaVersion: ANSWERLATTICE_MCP_TOOL_SCHEMA_VERSION,
    ok: true,
    tool,
    bundleVersion: metadata.bundleVersion ?? null,
    generatedAt: metadata.generatedAt ?? null,
    data,
    error: null,
});

const buildToolError = (
    tool: string,
    code: string,
    message: string,
    metadata: { bundleVersion?: number | null; generatedAt?: string | null } = {},
) => serializeToolEnvelope({
    schemaVersion: ANSWERLATTICE_MCP_TOOL_SCHEMA_VERSION,
    ok: false,
    tool,
    bundleVersion: metadata.bundleVersion ?? null,
    generatedAt: metadata.generatedAt ?? null,
    data: null,
    error: { code, message },
});

const sanitizeSegment = (value: string): string => value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 96);

const toIsoTimestamp = (value: unknown): string | null => {
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
    if (value instanceof Date) return value.toISOString();
    if (value && typeof value === 'object') {
        const timestamp = value as { toDate?: () => Date; toMillis?: () => number };
        if (typeof timestamp.toDate === 'function') return timestamp.toDate().toISOString();
        if (typeof timestamp.toMillis === 'function') return new Date(timestamp.toMillis()).toISOString();
    }
    return null;
};

const getBundleObjectGeneratedAt = (value: unknown, fallback: unknown): string | null => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return toIsoTimestamp((value as Record<string, unknown>).generatedAt) || toIsoTimestamp(fallback);
    }
    return toIsoTimestamp(fallback);
};

const loadBundle = async (tId: number, sId: number, expectedBundleVersion: number) => {
    const manifest = await getAnswerlatticeContextBundleManifestServer(tId, sId);
    if (!manifest || manifest.status !== 'ready') {
        throw new Error('MCP_CONTEXT_NOT_READY');
    }
    const bundleVersion = Number(manifest.activeVersion || manifest.bundleVersion || 0);
    if (!Number.isSafeInteger(bundleVersion) || bundleVersion <= 0) {
        throw new Error('MCP_CONTEXT_NOT_READY');
    }
    if (bundleVersion !== expectedBundleVersion) {
        throw new Error('MCP_CONTEXT_CHANGED');
    }
    const loadByKey = async <T = unknown>(key: string): Promise<T | null> => {
        const path = getAnswerlatticeBundleRefPath(manifest, key, tId, sId);
        return path ? loadAnswerlatticeBundleObjectServer<T>(path) : null;
    };
    return {
        manifest,
        bundleVersion,
        generatedAt: toIsoTimestamp(manifest.generatedAt || manifest.lastBuildCompletedAt),
        loadByKey,
    };
};

const reportMissingContext = async (
    tId: number,
    sId: number,
    input: z.infer<typeof MissingContextArgumentsSchema>,
) => {
    const hourKey = new Date().toISOString().slice(0, 13).replace(/[-T:]/g, '');
    const hash = createHash('sha256')
        .update(`${input.query}:${input.routeKey || ''}:${input.entityId || ''}`)
        .digest('hex')
        .slice(0, 24);
    const requestId = `mcp_missing_context:${hourKey}:${hash}`;
    const persisted = await emitAnswerlatticeSignal({
        type: ANSWERLATTICE_SIGNAL_TYPE.CHAT_NEGATIVE,
        tId,
        sId,
        entityId: input.entityId,
        failureMode: 'throw',
        metadata: {
            source: 'answerlattice_mcp',
            signalPurpose: 'mcp_missing_context',
            requestId,
            query: input.query,
            routeKey: input.routeKey || null,
        },
    });
    if (!persisted) throw new Error('MCP_SIGNAL_MUTATION_UNAVAILABLE');
    return { recorded: true, requestId };
};

export async function handleAnswerlatticeMcpToolCall(
    tId: number,
    sId: number,
    expectedBundleVersion: number,
    name: AnswerlatticeMcpToolName,
    args: Record<string, unknown>,
) {
    try {
        const parsed = parseAnswerlatticeMcpToolArguments(name, args);
        if (!parsed.success) {
            return buildToolError(name, 'INVALID_ARGUMENTS', 'Tool arguments are invalid.');
        }

        if (name === 'report_missing_context') {
            const result = await reportMissingContext(
                tId,
                sId,
                parsed.data as z.infer<typeof MissingContextArgumentsSchema>,
            );
            return buildToolSuccess(name, result, { generatedAt: new Date().toISOString() });
        }

        const bundle = await loadBundle(tId, sId, expectedBundleVersion);
        const metadata = {
            bundleVersion: bundle.bundleVersion,
            generatedAt: bundle.generatedAt,
        };

        if (name === 'get_product_context') {
            const value = await bundle.loadByKey('private:mcp/product-summary.json');
            return buildToolSuccess(name, value, {
                ...metadata,
                generatedAt: getBundleObjectGeneratedAt(value, metadata.generatedAt),
            });
        }

        if (name === 'get_route_context') {
            const input = parsed.data as z.infer<typeof RouteArgumentsSchema>;
            const routeKey = input.routeKey || buildAnswerlatticeRouteKey(input.path);
            const context = await bundle.loadByKey(`private:mcp/routes/${routeKey}.json`);
            return buildToolSuccess(name, context || { routeKey, found: false }, {
                ...metadata,
                generatedAt: getBundleObjectGeneratedAt(context, metadata.generatedAt),
            });
        }

        if (name === 'get_entity_context') {
            const input = parsed.data as z.infer<typeof EntityArgumentsSchema>;
            const entityPathId = sanitizeSegment(input.entityId);
            const context = await bundle.loadByKey(`private:mcp/entities/${entityPathId}.json`);
            return buildToolSuccess(name, context || { entityId: input.entityId, found: false }, {
                ...metadata,
                generatedAt: getBundleObjectGeneratedAt(context, metadata.generatedAt),
            });
        }

        if (name === 'get_canonical_context') {
            const input = parsed.data as z.infer<typeof CanonicalArgumentsSchema>;
            const canonical = await bundle.loadByKey<{ generatedAt?: unknown; answers?: any[] }>('private:mcp/canonical-index.json');
            const answer = (canonical?.answers || []).find(item => item.id === input.answerId);
            return buildToolSuccess(name, answer || { answerId: input.answerId, found: false }, {
                ...metadata,
                generatedAt: getBundleObjectGeneratedAt(canonical, metadata.generatedAt),
            });
        }

        if (name === 'search_canonical_context') {
            const input = parsed.data as z.infer<typeof SearchArgumentsSchema>;
            const query = input.query.toLowerCase();
            const canonical = await bundle.loadByKey<{ generatedAt?: unknown; answers?: any[] }>('private:mcp/canonical-index.json');
            const matches = (canonical?.answers || [])
                .filter(answer => {
                    const haystack = [
                        answer.id,
                        answer.title,
                        answer.slug,
                        answer.shortAnswer,
                        answer.content?.structuredSummary,
                        answer.content?.detailedExplanation,
                        ...(answer.entityIds || []),
                    ].join(' ').toLowerCase();
                    return haystack.includes(query);
                })
                .slice(0, input.limit || 8);
            return buildToolSuccess(name, {
                query: input.query,
                count: matches.length,
                answers: matches,
            }, {
                ...metadata,
                generatedAt: getBundleObjectGeneratedAt(canonical, metadata.generatedAt),
            });
        }

        const releases = await bundle.loadByKey('private:mcp/release-context.json');
        return buildToolSuccess(name, releases, {
            ...metadata,
            generatedAt: getBundleObjectGeneratedAt(releases, metadata.generatedAt),
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_mcp_tool_execution_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', tId),
            ...getBoundedRuntimeStringContext('storeId', sId),
            ...getBoundedRuntimeStringContext('toolName', name),
        });
        const code = error instanceof Error && error.message === 'MCP_CONTEXT_NOT_READY'
            ? 'CONTEXT_NOT_READY'
            : error instanceof Error && error.message === 'MCP_CONTEXT_CHANGED'
                ? 'CONTEXT_CHANGED'
            : error instanceof Error && error.message === 'MCP_SIGNAL_MUTATION_UNAVAILABLE'
                ? 'SIGNAL_MUTATION_UNAVAILABLE'
                : 'TOOL_EXECUTION_FAILED';
        const message = code === 'CONTEXT_NOT_READY'
            ? 'Compiled approved context is not ready.'
            : code === 'CONTEXT_CHANGED'
                ? 'Approved context changed. Create a new MCP session.'
            : code === 'SIGNAL_MUTATION_UNAVAILABLE'
                ? 'The governed signal lifecycle is not available.'
                : 'The tool could not complete.';
        return buildToolError(name, code, message);
    }
}
