import assert from 'node:assert/strict';
import {
    ANSWERLATTICE_MCP_LATEST_PROTOCOL_VERSION,
    acceptsAnswerlatticeMcpStreamableHttp,
    isAnswerlatticeMcpNotification,
    negotiateAnswerlatticeMcpProtocolVersion,
    parseAnswerlatticeMcpInitializeParams,
    parseAnswerlatticeMcpJsonRpcRequest,
    parseAnswerlatticeMcpProtocolVersionHeader,
    parseAnswerlatticeMcpToolsCallParams,
} from '../../src/lib/answerlattice/mcpProtocol';
import {
    ANSWERLATTICE_MCP_TOOLS,
    getAnswerlatticeMcpToolRequiredScope,
    isAnswerlatticeMcpToolName,
    parseAnswerlatticeMcpToolArguments,
} from '../../src/lib/answerlattice/mcpTools';

const initialize = parseAnswerlatticeMcpJsonRpcRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: { name: 'contract-test', version: '1.0.0' },
    },
});
assert.equal(initialize.success, true);
if (!initialize.success) throw new Error('initialize request did not parse');
assert.equal(isAnswerlatticeMcpNotification(initialize.data), false);
assert.equal(parseAnswerlatticeMcpInitializeParams(initialize.data.params).success, true);
assert.equal(negotiateAnswerlatticeMcpProtocolVersion('2025-11-25'), '2025-11-25');
assert.equal(negotiateAnswerlatticeMcpProtocolVersion('unsupported'), ANSWERLATTICE_MCP_LATEST_PROTOCOL_VERSION);
assert.equal(parseAnswerlatticeMcpProtocolVersionHeader(null), '2025-03-26');
assert.equal(parseAnswerlatticeMcpProtocolVersionHeader('2025-06-18'), '2025-06-18');
assert.equal(parseAnswerlatticeMcpProtocolVersionHeader('unsupported'), null);

assert.equal(acceptsAnswerlatticeMcpStreamableHttp('application/json, text/event-stream'), true);
assert.equal(acceptsAnswerlatticeMcpStreamableHttp('application/json'), false);
assert.equal(acceptsAnswerlatticeMcpStreamableHttp('*/*'), false);

const initializedNotification = parseAnswerlatticeMcpJsonRpcRequest({
    jsonrpc: '2.0',
    method: 'notifications/initialized',
});
assert.equal(initializedNotification.success, true);
if (!initializedNotification.success) throw new Error('notification did not parse');
assert.equal(isAnswerlatticeMcpNotification(initializedNotification.data), true);

assert.equal(parseAnswerlatticeMcpJsonRpcRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    unexpected: true,
}).success, false);
assert.equal(parseAnswerlatticeMcpJsonRpcRequest({
    jsonrpc: '2.0',
    id: 1.25,
    method: 'ping',
}).success, false, 'JSON-RPC numeric IDs must be safe integers');
assert.equal(parseAnswerlatticeMcpJsonRpcRequest({
    jsonrpc: '2.0',
    id: null,
    method: 'ping',
}).success, false, 'MCP request IDs must not be null');
assert.equal(parseAnswerlatticeMcpToolsCallParams({
    name: 'get_product_context',
    arguments: {},
    unexpected: true,
}).success, false);

assert.equal(isAnswerlatticeMcpToolName('get_product_context'), true);
assert.equal(isAnswerlatticeMcpToolName('unknown_tool'), false);
assert.equal(getAnswerlatticeMcpToolRequiredScope('get_product_context'), 'context:read');
assert.equal(getAnswerlatticeMcpToolRequiredScope('report_missing_context'), 'signals:write');

assert.equal(parseAnswerlatticeMcpToolArguments('get_product_context', {}).success, true);
assert.equal(parseAnswerlatticeMcpToolArguments('get_product_context', { unexpected: true }).success, false);
assert.equal(parseAnswerlatticeMcpToolArguments('get_route_context', {}).success, false);
assert.equal(parseAnswerlatticeMcpToolArguments('get_route_context', { path: '/settings/billing' }).success, true);
assert.equal(parseAnswerlatticeMcpToolArguments('get_route_context', { routeKey: '../unsafe' }).success, false);
assert.equal(parseAnswerlatticeMcpToolArguments('get_entity_context', { entityId: 'billing' }).success, true);
assert.equal(parseAnswerlatticeMcpToolArguments('get_entity_context', { entityId: 'unresolved' }).success, false);
assert.equal(parseAnswerlatticeMcpToolArguments('get_canonical_context', { answerId: 'answer-1' }).success, true);
assert.equal(parseAnswerlatticeMcpToolArguments('search_canonical_context', {
    query: 'How do I connect Slack?',
    limit: 8,
}).success, true);
assert.equal(parseAnswerlatticeMcpToolArguments('search_canonical_context', {
    query: 'x',
    limit: 21,
}).success, false);
assert.equal(parseAnswerlatticeMcpToolArguments('report_missing_context', {
    query: 'Unsupported setup question',
    routeKey: 'r_settings',
}).success, true);

const readTool = ANSWERLATTICE_MCP_TOOLS.find(tool => tool.name === 'get_product_context');
const signalTool = ANSWERLATTICE_MCP_TOOLS.find(tool => tool.name === 'report_missing_context');
assert.equal(readTool?.annotations.readOnlyHint, true);
assert.equal(signalTool?.annotations.readOnlyHint, false);
assert.equal(signalTool?.annotations.idempotentHint, false);
assert.equal(readTool?.inputSchema.additionalProperties, false);
assert.equal(signalTool?.inputSchema.additionalProperties, false);
assert.ok(readTool?.outputSchema);
assert.ok(signalTool?.outputSchema);

process.stdout.write('Answerlattice MCP protocol and tool contracts passed.\n');
