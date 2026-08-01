import assert from 'node:assert/strict';
import { MemoryCache, debounce, lazyWithRetry, throttle } from '@lib/utils/performance';

async function run(): Promise<void> {
    let debouncedCalls = 0;
    const debounced = debounce(() => {
        debouncedCalls += 1;
    }, Number.NaN);
    debounced();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(debouncedCalls, 1);

    let throttledCalls = 0;
    const throttled = throttle(() => {
        throttledCalls += 1;
        throw new Error('expected callback failure');
    }, -1);
    assert.throws(throttled, /expected callback failure/);
    assert.doesNotThrow(throttled, 'a throwing callback must still enter the throttle window');
    assert.equal(throttledCalls, 1);

    let importAttempts = 0;
    await assert.rejects(
        lazyWithRetry(async () => {
            importAttempts += 1;
            throw new Error('import failed');
        }, -1),
        /import failed/,
    );
    assert.equal(importAttempts, 1, 'invalid retry counts must not create an unbounded retry chain');

    const cache = new MemoryCache<string>();
    cache.set('nan', 'unsafe', Number.NaN);
    cache.set('infinite', 'unsafe', Number.POSITIVE_INFINITY);
    cache.set('zero', 'unsafe', 0);
    assert.equal(cache.get('nan'), null);
    assert.equal(cache.get('infinite'), null);
    assert.equal(cache.get('zero'), null);
    cache.set('valid', 'value', 100);
    assert.equal(cache.get('valid'), 'value');

    console.log('Performance utility tests passed.');
}

void run();
