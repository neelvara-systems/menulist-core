import assert from 'node:assert/strict';
import deepMerge, { getObjectDifferance } from '../../src/utils/deepMerge';

const nested = deepMerge(
    {
        settings: {
            languages: ['en-US'],
            theme: 'light',
        },
    },
    {
        settings: {
            languages: ['hi-IN'],
            theme: 'dark',
        },
    },
    true,
);
assert.deepEqual(nested, {
    settings: {
        languages: ['en-US', 'hi-IN'],
        theme: 'dark',
    },
});

const pollutedInput = JSON.parse(
    '{"safe":"updated","__proto__":{"platformRole":"PLATFORM_ADMIN"},"constructor":{"prototype":{"blocked":false}}}',
) as object;
const merged = deepMerge({ safe: 'original' }, pollutedInput);
assert.deepEqual(merged, { safe: 'updated' });
assert.equal(Object.getPrototypeOf(merged), Object.prototype);
assert.equal(Object.prototype.hasOwnProperty.call(merged, '__proto__'), false);
assert.equal(({} as { platformRole?: string }).platformRole, undefined);

const difference = getObjectDifferance(
    pollutedInput,
    { safe: 'original' },
);
assert.deepEqual(difference, { safe: 'updated' });
assert.equal(Object.getPrototypeOf(difference), Object.prototype);

let accessorReads = 0;
const accessorInput = Object.create(null) as Record<string, unknown>;
Object.defineProperty(accessorInput, 'safe', {
    enumerable: true,
    get() {
        accessorReads += 1;
        return 'executed';
    },
});
assert.deepEqual(deepMerge({ retained: true }, accessorInput), { retained: true });
assert.deepEqual(getObjectDifferance(accessorInput, {}), {});
assert.equal(accessorReads, 0);

const hostileProxy = new Proxy({}, {
    ownKeys() {
        throw new Error('must stay contained');
    },
});
assert.deepEqual(deepMerge({ retained: true }, hostileProxy), { retained: true });
assert.deepEqual(getObjectDifferance(hostileProxy, {}), {});

const inherited = Object.create({ tenantId: 'foreign-tenant' }) as Record<string, unknown>;
inherited.name = 'Current name';
assert.deepEqual(
    getObjectDifferance(inherited, { name: 'Previous name' }),
    { name: 'Current name' },
);

console.log('Deep merge and object-difference boundary tests passed.');
