import { NextResponse } from 'next/server';

const specification = {
    openapi: '3.1.0',
    info: {
        title: 'MenuList Platform Pull API',
        version: '1.0.0',
        description: 'Read-only access to owner-approved MenuList business and menu data.',
    },
    servers: [{ url: 'https://menulist.ai' }],
    paths: {
        '/api/public/v1/business': {
            get: {
                operationId: 'getPublicBusiness',
                summary: 'Read the approved public business profile',
                description: 'Returns the owner-approved public business projection for the store bound to the API key.',
                security: [{ menuListApiKey: [] }],
                responses: {
                    '200': {
                        description: 'Current approved public business data',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/PublicBusiness' } } },
                    },
                    '304': { description: 'Not modified for the supplied ETag' },
                    '401': { description: 'Missing, invalid, revoked, or out-of-scope API key' },
                    '429': { description: 'Request limit exceeded' },
                    '503': { description: 'Admission service temporarily unavailable' },
                },
            },
        },
        '/api/public/v1/menu': {
            get: {
                operationId: 'getPublicMenu',
                summary: 'Read the current published menu or service-list snapshot',
                description: 'Returns the current owner-published menu or service-list projection for the store bound to the API key.',
                security: [{ menuListApiKey: [] }],
                responses: {
                    '200': {
                        description: 'Current published menu or service-list snapshot',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/PublicMenu' } } },
                    },
                    '304': { description: 'Not modified for the supplied ETag' },
                    '401': { description: 'Missing, invalid, revoked, or out-of-scope API key' },
                    '404': { description: 'No published menu is available' },
                    '429': { description: 'Request limit exceeded' },
                    '503': { description: 'Admission service temporarily unavailable' },
                },
            },
        },
    },
    components: {
        securitySchemes: {
            menuListApiKey: {
                type: 'apiKey',
                in: 'header',
                name: 'X-API-Key',
                description: 'Store-generated ml_ credential with the public:read scope.',
            },
        },
        schemas: {
            PublicBusiness: {
                type: 'object',
                additionalProperties: true,
                required: ['schemaVersion', 'generatedAt', 'storeId', 'name'],
                properties: {
                    schemaVersion: { type: 'string' },
                    generatedAt: { type: 'string', format: 'date-time' },
                    storeId: { type: 'string' },
                    name: { type: 'string' },
                },
            },
            PublicMenu: {
                type: 'object',
                additionalProperties: true,
                required: ['schemaVersion', 'generatedAt', 'event', 'version', 'timestamp', 'tenantId', 'projectId', 'storeId', 'currency', 'languages', 'menu'],
                properties: {
                    schemaVersion: { type: 'string' },
                    generatedAt: { type: 'string', format: 'date-time' },
                    event: { type: 'string', const: 'menu.pull' },
                    version: { type: 'integer', minimum: 1 },
                    timestamp: { type: 'string', format: 'date-time' },
                    tenantId: { type: 'integer' },
                    projectId: { type: 'string' },
                    storeId: { type: 'integer' },
                    currency: { type: 'string' },
                    languages: { type: 'array', items: { type: 'object', additionalProperties: true } },
                    menu: { type: 'object', additionalProperties: true },
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
