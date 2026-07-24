import assert from 'node:assert/strict';
import {
    isAnswerlatticeChatAnalyticsStoreScope,
    parseAnswerlatticeChatAnalyticsBackfillInput,
} from '../../functions-answerlattice/src/answerlattice/chatAnalyticsBackfillBoundary';
import {
    isCurrentAnswerlatticePlatformCallableUser,
} from '../../functions-answerlattice/src/callableAuthBoundary';
import {
    parseAnswerlatticeChatAnalyticsBackfillResponse,
} from '../../src/lib/answerlattice/chatAnalyticsBackfillContracts';
import {
    buildAnswerlatticePlatformWorkspaceOptions,
    isCurrentAnswerlatticePlatformWorkspaceOperator,
    parseAnswerlatticePlatformWorkspaceOptionsResponse,
} from '../../src/lib/answerlattice/platformWorkspaceOptions';

assert.deepEqual(parseAnswerlatticeChatAnalyticsBackfillInput({ tId: 10, sId: 20, days: 30 }), {
    tId: 10,
    sId: 20,
    days: 30,
});
for (const invalid of [
    null,
    [],
    { tId: '10', sId: 20, days: 30 },
    { tId: 10, sId: 20, days: 0 },
    { tId: 10, sId: 20, days: 91 },
    { tId: 10, sId: 20, days: 1.5 },
    { tId: 10, sId: 20, days: 30, tenantId: 10 },
]) {
    assert.throws(() => parseAnswerlatticeChatAnalyticsBackfillInput(invalid), /answerlattice_chat_backfill_input_invalid/);
}

const store = { pId: 'AL', tId: 10, sId: 20, active: true };
assert.equal(isAnswerlatticeChatAnalyticsStoreScope(store, 10, 20), true);
assert.equal(isAnswerlatticeChatAnalyticsStoreScope({ ...store, sId: undefined, storeId: 20 }, 10, 20), true);
assert.equal(isAnswerlatticeChatAnalyticsStoreScope({ ...store, pId: 'ML' }, 10, 20), false);
assert.equal(isAnswerlatticeChatAnalyticsStoreScope({ ...store, tId: 11 }, 10, 20), false);
assert.equal(isAnswerlatticeChatAnalyticsStoreScope({ ...store, sId: 21 }, 10, 20), false);
assert.equal(isAnswerlatticeChatAnalyticsStoreScope({ ...store, active: false }, 10, 20), false);
assert.equal(isAnswerlatticeChatAnalyticsStoreScope({ ...store, deleted: true }, 10, 20), false);
assert.equal(isAnswerlatticeChatAnalyticsStoreScope({ ...store, productId: 'ML' }, 10, 20), false);
assert.equal(isAnswerlatticeChatAnalyticsStoreScope({ ...store, tenantId: 11 }, 10, 20), false);
assert.equal(isAnswerlatticeChatAnalyticsStoreScope({ ...store, storeId: 21 }, 10, 20), false);
assert.equal(isAnswerlatticeChatAnalyticsStoreScope({ ...store, authDisabled: true }, 10, 20), false);
assert.equal(isAnswerlatticeChatAnalyticsStoreScope({ ...store, blocked: true }, 10, 20), false);

const callableIdentity = {
    accessRevision: 4,
    email: 'platform@example.com',
    platformRole: 'PLATFORM',
    userId: 'platform-user',
};
const currentCallableUser = {
    accessRevision: 4,
    active: true,
    email: 'platform@example.com',
    id: 'platform-user',
    isVerified: true,
    pId: 'AL',
    platformRole: 'PLATFORM',
    productId: 'AL',
    uId: 'platform-user',
};
assert.equal(isCurrentAnswerlatticePlatformCallableUser(currentCallableUser, callableIdentity), true);
assert.equal(
    isCurrentAnswerlatticePlatformCallableUser(
        { ...currentCallableUser, accessRevision: undefined },
        { ...callableIdentity, accessRevision: 0 },
    ),
    true,
);
for (const invalid of [
    { ...currentCallableUser, accessRevision: 3 },
    { ...currentCallableUser, active: false },
    { ...currentCallableUser, authDisabled: true },
    { ...currentCallableUser, blocked: true },
    { ...currentCallableUser, deleted: true },
    { ...currentCallableUser, email: 'other@example.com' },
    { ...currentCallableUser, isVerified: false },
    { ...currentCallableUser, pId: 'ML' },
    { ...currentCallableUser, platformRole: 'PLATFORM_SUPPORT' },
    { ...currentCallableUser, uId: 'other-user' },
]) {
    assert.equal(isCurrentAnswerlatticePlatformCallableUser(invalid, callableIdentity), false);
}

const validResults = [
    { chats: 2, date: '2026-07-21', partial: false, status: 'success' as const },
    { chats: 0, date: '2026-07-22', partial: false, status: 'skipped' as const },
];
assert.deepEqual(
    parseAnswerlatticeChatAnalyticsBackfillResponse(
        { tId: 10, sId: 20, days: 2, results: validResults },
        { tId: 10, sId: 20, days: 2 },
    ),
    { tenantId: 10, storeId: 20, days: 2, results: validResults },
);
for (const invalid of [
    { tId: 11, sId: 20, days: 2, results: validResults },
    { tId: 10, sId: 21, days: 2, results: validResults },
    { tId: 10, sId: 20, days: 1, results: validResults },
    { tId: 10, sId: 20, days: 2, results: [validResults[0], validResults[0]] },
    { tId: 10, sId: 20, days: 2, results: [{ ...validResults[0], date: '2026-02-31' }, validResults[1]] },
    { tId: 10, sId: 20, days: 2, results: validResults, tenantId: 10 },
]) {
    assert.throws(
        () => parseAnswerlatticeChatAnalyticsBackfillResponse(invalid, { tId: 10, sId: 20, days: 2 }),
        /chat_analytics_backfill_response_invalid/,
    );
}

const workspaceOptions = buildAnswerlatticePlatformWorkspaceOptions({
    stores: {
        '20': { active: true, name: 'Product\u0000 One', tId: 10, tenantName: 'Acme' },
        '21': { active: false, name: 'Inactive', tId: 10 },
        '022': { active: true, name: 'Leading zero', tId: 10 },
        '23': { active: true, name: '', tId: 11 },
    },
});
assert.deepEqual(workspaceOptions, [
    { label: 'Product One · Acme · T10 / S20', name: 'Product One', sId: 20, tId: 10 },
    { label: 'Workspace 23 · T11 / S23', name: 'Workspace 23', sId: 23, tId: 11 },
]);
assert.deepEqual(
    parseAnswerlatticePlatformWorkspaceOptionsResponse({ workspaces: workspaceOptions }),
    workspaceOptions,
);
assert.throws(
    () => parseAnswerlatticePlatformWorkspaceOptionsResponse({
        workspaces: [workspaceOptions[0], { ...workspaceOptions[0], tId: 99 }],
    }),
    /answerlattice_platform_workspaces_response_invalid/,
);
const currentWorkspaceOperator = {
    active: true,
    email: 'platform@example.com',
    id: 'platform-user',
    isVerified: true,
    pId: 'AL',
    platformRole: 'PLATFORM',
    productId: 'AL',
    uId: 'platform-user',
};
assert.equal(
    isCurrentAnswerlatticePlatformWorkspaceOperator(currentWorkspaceOperator, 'platform@example.com'),
    true,
);
for (const invalid of [
    { ...currentWorkspaceOperator, active: false },
    { ...currentWorkspaceOperator, authDisabled: true },
    { ...currentWorkspaceOperator, email: 'other@example.com' },
    { ...currentWorkspaceOperator, isVerified: false },
    { ...currentWorkspaceOperator, pId: 'ML' },
    { ...currentWorkspaceOperator, platformRole: 'PLATFORM_SUPPORT' },
    { ...currentWorkspaceOperator, uId: 'other-user' },
]) {
    assert.equal(
        isCurrentAnswerlatticePlatformWorkspaceOperator(invalid, 'platform@example.com'),
        false,
    );
}

console.log('Answerlattice chat analytics backfill boundary tests passed.');
