import assert from 'node:assert/strict';
import {
    getCacheDate,
    getCachedData,
    setCachedData,
    shouldRevalidate,
} from '../../src/lib/cache/swrLocalStorageProvider';

class MemoryStorage {
    private readonly values = new Map<string, string>();

    get length(): number {
        return this.values.size;
    }

    clear(): void {
        this.values.clear();
    }

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    key(index: number): string | null {
        return [...this.values.keys()][index] ?? null;
    }

    removeItem(key: string): void {
        this.values.delete(key);
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
});

const rawKey = (key: string) => `swr-cache-v1-${key}`;
const today = new Date().toISOString().slice(0, 10);

setCachedData('valid', { count: 2 }, today);
assert.deepEqual(getCachedData('valid', 60_000, today), { count: 2 });
assert.equal(getCacheDate('valid'), today);
assert.equal(shouldRevalidate('valid', today), false);

for (const [name, entry] of Object.entries({
    fractionalTimestamp: { data: { count: 1 }, timestamp: Date.now() - 0.5, date: today },
    futureTimestamp: { data: { count: 1 }, timestamp: Date.now() + 60_000, date: today },
    missingData: { timestamp: Date.now(), date: today },
    stringDate: { data: { count: 1 }, timestamp: Date.now(), date: 20260728 },
    stringTimestamp: { data: { count: 1 }, timestamp: String(Date.now()), date: today },
    impossibleDate: { data: { count: 1 }, timestamp: Date.now(), date: '2026-02-30' },
})) {
    storage.setItem(rawKey(name), JSON.stringify(entry));
    assert.equal(getCachedData(name, 60_000, today), undefined, name);
    assert.equal(storage.getItem(rawKey(name)), null, `${name} should be removed`);
}

storage.setItem(rawKey('invalidDateRead'), JSON.stringify({
    data: {},
    timestamp: Date.now(),
    date: 42,
}));
assert.equal(getCacheDate('invalidDateRead'), null);
assert.equal(storage.getItem(rawKey('invalidDateRead')), null);

setCachedData('invalidDayKey', { count: 1 }, '2026-02-30');
assert.equal(storage.getItem(rawKey('invalidDayKey')), null);
setCachedData('undefinedData', undefined, today);
assert.equal(storage.getItem(rawKey('undefinedData')), null);

setCachedData('invalidTtl', { count: 1 }, today);
assert.equal(getCachedData('invalidTtl', -1, today), undefined);
assert.equal(storage.getItem(rawKey('invalidTtl')), null);

setCachedData('invalidReadDay', { count: 1 }, today);
assert.equal(getCachedData('invalidReadDay', 60_000, '2026-02-30'), undefined);
assert.equal(storage.getItem(rawKey('invalidReadDay')), null);

console.log('SWR localStorage provider boundary tests passed');
