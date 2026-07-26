import assert from 'node:assert/strict';

import {
    parseTodoConfig,
    requireTodoConfigPatch,
    requireTodoDocumentId,
    requireTodoMutation,
    requireTodoScope,
} from '../../src/lib/todos/todoBoundary';

assert.deepEqual(
    requireTodoScope({ tId: 1, sId: '10', uId: ' owner-1 ' }),
    { tId: '1', sId: '10', uId: 'owner-1' },
);
for (const scope of [
    null,
    { tId: '01', sId: 10, uId: 'owner-1' },
    { tId: 1, sId: '../10', uId: 'owner-1' },
    { tId: 1, sId: 10, uId: '' },
]) {
    assert.throws(() => requireTodoScope(scope), /todo_(session|scope)_invalid/);
}

assert.equal(requireTodoDocumentId(' todo-1 '), 'todo-1');
for (const id of [null, '', '.', '..', 'a/b', '__reserved__']) {
    assert.throws(() => requireTodoDocumentId(id), /todo_document_id_invalid/);
}

assert.deepEqual(
    requireTodoMutation({ id: 'todo-1', title: 'Call supplier' }, { requireId: true }),
    { id: 'todo-1', payload: { title: 'Call supplier' } },
);
assert.deepEqual(
    requireTodoMutation({ title: 'Call supplier' }, { requireId: false }),
    { payload: { title: 'Call supplier' } },
);
for (const payload of [null, [], new Date(), 'todo']) {
    assert.throws(() => requireTodoMutation(payload, { requireId: false }), /todo_payload_invalid/);
}

const config = {
    statuses: [{ id: 'open', name: 'Open', color: '#ffffff' }],
    tags: [{ id: 'urgent', name: 'Urgent', color: '#ff0000' }],
};
assert.deepEqual(parseTodoConfig(config), config);
assert.equal(parseTodoConfig({ ...config, tags: [{ ...config.tags[0], id: '' }] }), null);
assert.equal(parseTodoConfig({ ...config, statuses: null }), null);
assert.deepEqual(requireTodoConfigPatch({ tags: config.tags }), { tags: config.tags });
assert.throws(() => requireTodoConfigPatch({}), /todo_config_payload_empty/);
assert.throws(
    () => requireTodoConfigPatch({ tags: [config.tags[0], config.tags[0]] }),
    /todo_tags_invalid/,
);

process.stdout.write('Todo runtime boundary tests passed.\n');
