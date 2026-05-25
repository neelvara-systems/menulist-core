import { DB_COLLECTIONS } from '@constant/database';
import { buildCanonicaRouteKey, getCanonicaMcpSignalDocId } from '@lib/canonica/compiledContext';
import {
    getCanonicaContextBundleManifestServer,
    loadCanonicaBundleObjectServer,
} from '@lib/canonica/contextBundleBuilderServer';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';

export const CANONICA_MCP_TOOLS = [
    {
        name: 'get_product_context',
        description: 'Return compiled approved product context for the Canonica workspace.',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'get_route_context',
        description: 'Return compiled approved route/surface context by routeKey or path.',
        inputSchema: {
            type: 'object',
            properties: {
                routeKey: { type: 'string' },
                path: { type: 'string' },
            },
        },
    },
    {
        name: 'get_entity_context',
        description: 'Return compiled approved entity context by entityId.',
        inputSchema: {
            type: 'object',
            properties: { entityId: { type: 'string' } },
            required: ['entityId'],
        },
    },
    {
        name: 'get_canonical_context',
        description: 'Return an approved canonical answer by answerId.',
        inputSchema: {
            type: 'object',
            properties: { answerId: { type: 'string' } },
            required: ['answerId'],
        },
    },
    {
        name: 'search_canonical_context',
        description: 'Search approved canonical answer titles, summaries, and entity bindings.',
        inputSchema: {
            type: 'object',
            properties: { query: { type: 'string' }, limit: { type: 'number' } },
            required: ['query'],
        },
    },
    {
        name: 'get_release_context',
        description: 'Return latest approved release/changelog context.',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'report_missing_context',
        description: 'Report missing Canonica context as an aggregated signal bucket.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string' },
                routeKey: { type: 'string' },
                entityId: { type: 'string' },
            },
            required: ['query'],
        },
    },
] as const;

const sanitizeSegment = (value: unknown): string => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 96);

const textResponse = (value: any, maxBytes = 24_000) => {
    const text = JSON.stringify(value, null, 2);
    const output = Buffer.byteLength(text, 'utf8') > maxBytes
        ? `${text.slice(0, maxBytes - 80)}\n\n[truncated]`
        : text;
    return { content: [{ type: 'text', text: output }] };
};

const loadBundle = async (tId: number, sId: number) => {
    const manifest = await getCanonicaContextBundleManifestServer(tId, sId);
    if (!manifest || manifest.status !== 'ready') {
        throw new Error('Compiled context bundle is not ready.');
    }
    const loadByKey = async <T = any>(key: string): Promise<T | null> => {
        const ref = manifest.bundles?.[key];
        return ref?.path ? loadCanonicaBundleObjectServer<T>(ref.path) : null;
    };
    return { manifest, loadByKey };
};

const reportMissingContext = async (params: {
    tId: number;
    sId: number;
    query: string;
    routeKey?: string;
    entityId?: string;
}) => {
    const db = canonicaFirestoreAdmin as any;
    if (!db || typeof db.collection !== 'function') {
        throw new Error('Canonica Firestore Admin is not configured');
    }
    const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const safeQuery = String(params.query || '').trim().slice(0, 500);
    if (!safeQuery) {
        return { recorded: false, error: 'query is required' };
    }
    const hash = createHash('sha256')
        .update(`${safeQuery}:${params.routeKey || ''}:${params.entityId || ''}`)
        .digest('hex')
        .slice(0, 24);

    await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getCanonicaMcpSignalDocId(params.tId, params.sId, dateKey))
        .set({
            pId: 'CN',
            tId: params.tId,
            sId: params.sId,
            dateKey,
            updatedAt: FieldValue.serverTimestamp(),
            items: {
                [hash]: {
                    count: FieldValue.increment(1),
                    query: safeQuery,
                    routeKey: params.routeKey || null,
                    entityId: params.entityId || null,
                },
            },
        }, { merge: true });

    return { recorded: true, bucket: dateKey, id: hash };
};

export async function handleCanonicaMcpToolCall(
    tId: number,
    sId: number,
    name: string,
    args: Record<string, any>,
) {
    if (name === 'report_missing_context') {
        return textResponse(await reportMissingContext({
            tId,
            sId,
            query: String(args.query || ''),
            routeKey: args.routeKey ? sanitizeSegment(args.routeKey) : undefined,
            entityId: args.entityId ? sanitizeSegment(args.entityId) : undefined,
        }));
    }

    const { loadByKey } = await loadBundle(tId, sId);

    if (name === 'get_product_context') {
        return textResponse(await loadByKey('private:mcp/product-summary.json'));
    }

    if (name === 'get_route_context') {
        const routeKey = sanitizeSegment(args.routeKey) || (args.path ? buildCanonicaRouteKey(String(args.path)) : '');
        if (!routeKey) return textResponse({ error: 'routeKey or path is required' });
        const context = await loadByKey(`private:mcp/routes/${routeKey}.json`);
        return textResponse(context || { routeKey, found: false });
    }

    if (name === 'get_entity_context') {
        const entityId = sanitizeSegment(args.entityId);
        if (!entityId) return textResponse({ error: 'entityId is required' });
        const context = await loadByKey(`private:mcp/entities/${entityId}.json`);
        return textResponse(context || { entityId, found: false });
    }

    if (name === 'get_canonical_context') {
        const answerId = String(args.answerId || '').trim();
        const canonical = await loadByKey<{ answers?: any[] }>('private:mcp/canonical-index.json');
        const answer = (canonical?.answers || []).find(item => item.id === answerId);
        return textResponse(answer || { answerId, found: false });
    }

    if (name === 'search_canonical_context') {
        const query = String(args.query || '').trim().toLowerCase().slice(0, 500);
        if (!query) return textResponse({ error: 'query is required' });
        const limit = Math.min(Math.max(Number(args.limit || 8), 1), 20);
        const canonical = await loadByKey<{ answers?: any[] }>('private:mcp/canonical-index.json');
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
            .slice(0, limit);
        return textResponse({ query, count: matches.length, answers: matches });
    }

    if (name === 'get_release_context') {
        return textResponse(await loadByKey('private:mcp/release-context.json'));
    }

    return textResponse({ error: `Unknown tool: ${name}` });
}
