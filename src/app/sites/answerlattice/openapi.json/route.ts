import { NextResponse } from 'next/server';

const errorSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['error'],
    properties: {
        error: {
            type: 'object',
            additionalProperties: false,
            required: ['code', 'message', 'resolution'],
            properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                resolution: { type: 'string' },
            },
        },
    },
};

const errorResponse = (description: string) => ({
    description,
    content: {
        'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
    },
});

const specification = {
    openapi: '3.1.0',
    info: {
        title: 'AnswerLattice Public API v1',
        version: '1.3.0',
        description: 'Rollout-gated, server-side distribution of governed answers, public entity identifiers, and review signals. The API is disabled by default and is not a self-serve public entitlement. Existing v1 fields, required inputs, authentication semantics, and status-code meanings stay compatible inside v1; breaking changes require a new major path.',
        'x-versioning-policy': {
            currentMajor: 'v1',
            compatibleChanges: 'Optional response fields may be added after publication in this OpenAPI document; consumers should ignore unknown response fields.',
            breakingChanges: 'Removing, renaming, retyping, or restricting an existing contract requires a new major URL such as /v2 and a migration guide.',
            deprecation: 'Before retirement, the operation is marked deprecated, developer docs publish the replacement, migration steps, and exact sunset date, and responses emit Deprecation, Sunset, and successor-version Link headers.',
            currentDeprecations: [],
        },
    },
    servers: [{ url: 'https://answerlattice.com' }],
    externalDocs: {
        description: 'AnswerLattice Public API versioning and deprecation policy',
        url: 'https://answerlattice.com/developers#public-api-versioning',
    },
    paths: {
        '/api/answerlattice/public/v1/answers': {
            post: {
                operationId: 'retrieveGovernedAnswer',
                deprecated: false,
                summary: 'Retrieve an applicable governed answer',
                description: 'Returns an approved canonical answer or an explicit abstention, clarification, and bounded fallback reason. It does not generate a replacement answer.',
                security: [{ answerlatticeApiKey: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/AnswerRequest' },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Governed answer result or explicit abstention',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/AnswerResult' } } },
                    },
                    '400': errorResponse('Invalid bounded request'),
                    '401': errorResponse('Invalid or out-of-scope credential'),
                    '403': errorResponse('Browser-origin access is not supported'),
                    '404': errorResponse('Public API is not enabled for the workspace'),
                    '429': errorResponse('Request limit exceeded'),
                    '503': errorResponse('Required capability or admission service unavailable'),
                },
            },
        },
        '/api/answerlattice/public/v1/entities': {
            get: {
                operationId: 'listGovernedEntities',
                deprecated: false,
                summary: 'List active or beta public ontology entities',
                description: 'Returns a bounded, deterministically ordered entity projection. A true truncated field means the caller must narrow the query.',
                security: [{ answerlatticeApiKey: [] }],
                parameters: [
                    { name: 'type', in: 'query', required: false, schema: { type: 'string' }, description: 'Optional governed entity type.' },
                    { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['active', 'beta'] }, description: 'Optional public status filter.' },
                    { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 200, default: 100 }, description: 'Maximum number of projected entities.' },
                ],
                responses: {
                    '200': {
                        description: 'Bounded public entity projection',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/EntityList' } } },
                    },
                    '304': { description: 'Projection unchanged for the supplied ETag' },
                    '400': errorResponse('Invalid query parameters'),
                    '401': errorResponse('Invalid or out-of-scope credential'),
                    '403': errorResponse('Browser-origin access is not supported'),
                    '404': errorResponse('Public API is not enabled for the workspace'),
                    '429': errorResponse('Request limit exceeded'),
                    '503': errorResponse('Admission service unavailable'),
                },
            },
        },
        '/api/answerlattice/public/v1/signals': {
            post: {
                operationId: 'submitGovernanceSignal',
                deprecated: false,
                summary: 'Submit bounded support-friction evidence',
                description: 'Records allowlisted evidence for human-governed review. It never changes or publishes a canonical answer directly.',
                security: [{ answerlatticeApiKey: [] }],
                parameters: [
                    { name: 'Idempotency-Key', in: 'header', required: false, schema: { type: 'string', minLength: 1, maxLength: 180 }, description: 'Required here or as the matching externalId request field.' },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/SignalRequest' },
                        },
                    },
                },
                responses: {
                    '202': {
                        description: 'Signal accepted as review evidence',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/SignalAccepted' } } },
                    },
                    '400': errorResponse('Invalid request or missing idempotency key'),
                    '401': errorResponse('Invalid credential or missing signals:write scope'),
                    '403': errorResponse('Browser-origin access is not supported'),
                    '404': errorResponse('Public API is not enabled for the workspace'),
                    '409': errorResponse('Idempotency key conflict or changed replay payload'),
                    '429': errorResponse('Request limit exceeded'),
                    '503': errorResponse('Signal governance or admission service unavailable'),
                },
            },
        },
    },
    components: {
        securitySchemes: {
            answerlatticeApiKey: {
                type: 'apiKey',
                in: 'header',
                name: 'X-API-Key',
                description: 'Workspace-owned al_ credential. public:read is required for answers/entities; signals:write is required for signals.',
            },
        },
        schemas: {
            ErrorResponse: errorSchema,
            AnswerRequest: {
                type: 'object',
                additionalProperties: false,
                required: ['query'],
                properties: {
                    query: { type: 'string', minLength: 1, maxLength: 500 },
                    currentVersion: { type: 'integer', minimum: 1, maximum: 999999999 },
                    planId: { type: 'string', minLength: 1, maxLength: 80 },
                    roleId: { type: 'string', minLength: 1, maxLength: 80 },
                    stateId: { type: 'string', minLength: 1, maxLength: 80 },
                    context: { type: 'object', description: 'Optional safe page context admitted by the public context schema.' },
                    includeDebug: { type: 'boolean', default: false, description: 'Ignored in production unless the non-production debug gate is explicitly enabled.' },
                },
            },
            AnswerResult: {
                type: 'object',
                additionalProperties: false,
                required: ['schemaVersion', 'generatedAt', 'canonical', 'confidence', 'matchedEntityIds', 'answer', 'citations'],
                properties: {
                    schemaVersion: { type: 'string' },
                    generatedAt: { type: 'string', format: 'date-time' },
                    canonical: { type: 'boolean' },
                    confidence: { type: 'number', minimum: 0, maximum: 1 },
                    matchedEntityIds: { type: 'array', items: { type: 'string' } },
                    fallbackReason: { type: ['string', 'null'] },
                    answer: { type: ['object', 'null'], additionalProperties: true },
                    citations: { type: 'array', items: { type: 'object', additionalProperties: true } },
                    clarification: { type: ['object', 'null'], additionalProperties: true },
                    entityDebug: { type: ['object', 'null'], additionalProperties: true, description: 'Non-production-only debug projection when the separate debug gate is enabled.' },
                },
            },
            EntityList: {
                type: 'object',
                additionalProperties: false,
                required: ['schemaVersion', 'generatedAt', 'source', 'count', 'entities', 'truncated'],
                properties: {
                    schemaVersion: { type: 'string' },
                    generatedAt: { type: 'string', format: 'date-time' },
                    source: { type: 'string', enum: ['compiled_bundle', 'firestore_fallback'] },
                    count: { type: 'integer', minimum: 0 },
                    entities: { type: 'array', items: { type: 'object', additionalProperties: true } },
                    truncated: { type: 'boolean' },
                },
            },
            SignalAccepted: {
                type: 'object',
                additionalProperties: false,
                required: ['schemaVersion', 'accepted'],
                properties: {
                    schemaVersion: { type: 'string' },
                    accepted: { type: 'boolean', const: true },
                },
            },
            SignalRequest: {
                type: 'object',
                additionalProperties: false,
                required: ['type'],
                properties: {
                    type: { type: 'string', enum: ['ticket', 'chat_negative', 'escalation', 'feedback', 'guided_resolution'] },
                    entityId: { type: 'string', minLength: 1, maxLength: 180 },
                    externalId: { type: 'string', minLength: 1, maxLength: 180 },
                    metadata: { type: 'object', additionalProperties: true },
                },
            },
        },
    },
};

export function GET() {
    return NextResponse.json(specification, {
        headers: {
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
            'Content-Type': 'application/vnd.oai.openapi+json; charset=utf-8',
        },
    });
}
