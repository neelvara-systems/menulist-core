import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { resolveStorePermissionSessionScope } from '@lib/permissions/scopeDocumentId';

const ROOT = path.resolve(__dirname, '..', '..');

assert.deepEqual(resolveStorePermissionSessionScope({
    sId: 101,
    tId: 1,
    user: { storeId: 101, tenantId: 1 },
}), {
    storeScope: { documentId: '101', numericId: 101 },
    tenantScope: { documentId: '1', numericId: 1 },
});
assert.deepEqual(resolveStorePermissionSessionScope({
    user: { storeId: 101, tenantId: 1 },
}), {
    storeScope: { documentId: '101', numericId: 101 },
    tenantScope: { documentId: '1', numericId: 1 },
});

for (const session of [
    { sId: 101, tId: 1, user: { storeId: 202, tenantId: 1 } },
    { sId: 101, tId: 1, user: { storeId: 101, tenantId: 2 } },
    { sId: '101 ', tId: 1 },
    { sId: 101, tId: '01' },
    { sId: 0, tId: 1 },
    { sId: 101, tId: Number.MAX_SAFE_INTEGER + 1 },
]) {
    assert.equal(
        resolveStorePermissionSessionScope(session),
        null,
        'invalid or contradictory session scope must fail closed',
    );
}

const route = fs.readFileSync(path.join(ROOT, 'src/app/api/ai-packs/status/route.ts'), 'utf8');
const permissionServer = fs.readFileSync(path.join(ROOT, 'src/lib/permissions/server.ts'), 'utf8');

assert.ok(route.includes('const scope = resolveStorePermissionSessionScope(session);'));
assert.ok(route.includes('scope.tenantScope.numericId'));
assert.ok(route.includes('scope.storeScope.numericId'));
assert.ok(route.includes('failClosedOnProviderError: true'));
assert.ok(route.includes('resolveCurrentSessionUserDocumentId(session)'));
assert.ok(route.includes('withAiPackStatusPrivateHeaders(permissionError)'));
assert.ok(route.includes('"Cache-Control": "private, no-store, max-age=0"'));
assert.equal((route.match(/NextResponse\.json/g) || []).length, 1);
assert.ok(!route.includes('const tenantId = session?.user?.tenantId || session?.tId'));
assert.ok(!route.includes('const storeId = session?.user?.storeId || session?.sId'));
assert.ok(!route.includes('Number(tenantId)'));
assert.ok(!route.includes('Number(storeId)'));
assert.ok(permissionServer.includes('const sessionScope = resolveStorePermissionSessionScope(session);'));

console.log('AI pack status exact session-scope contracts passed.');
