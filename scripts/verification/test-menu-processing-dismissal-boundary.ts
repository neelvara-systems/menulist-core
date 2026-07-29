import assert from 'node:assert/strict';
import {
    clearExpiredMenuProcessingJobDismissals,
    clearMenuProcessingJobDismissal,
    getDismissedMenuProcessingJobIds,
    getMenuProcessingDismissalStorageKey,
    markMenuProcessingJobAsDismissed,
} from '../../src/lib/extraction/menuProcessingDismissal';

class SessionStorageMock {
    private readonly values = new Map<string, string>();
    public rejectWrites = false;

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    removeItem(key: string): void {
        this.values.delete(key);
    }

    setItem(key: string, value: string): void {
        if (this.rejectWrites) throw new Error('storage_blocked');
        this.values.set(key, value);
    }
}

const storage = new SessionStorageMock();
Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { sessionStorage: storage },
});

const storeA = { tenantId: 1, storeId: 10 };
const storeB = { tenantId: 2, storeId: 20 };
const storeAKey = getMenuProcessingDismissalStorageKey(storeA);
assert.equal(storeAKey, 'dismissedMenuProcessingJobs:1:10');
assert.equal(getMenuProcessingDismissalStorageKey({ tenantId: '01', storeId: 10 }), null);

markMenuProcessingJobAsDismissed(storeA, 'job-1');
assert.deepEqual(getDismissedMenuProcessingJobIds(storeA), ['job-1']);
assert.deepEqual(getDismissedMenuProcessingJobIds(storeB), []);

clearMenuProcessingJobDismissal(storeB, 'job-1');
assert.deepEqual(getDismissedMenuProcessingJobIds(storeA), ['job-1']);
clearMenuProcessingJobDismissal(storeA, 'job-1');
assert.deepEqual(getDismissedMenuProcessingJobIds(storeA), []);

const now = Date.now();
storage.setItem(storeAKey!, JSON.stringify({
    valid: { dismissedAt: now - 1_000, expiresAt: now + 1_000 },
    coerced: { dismissedAt: String(now - 1_000), expiresAt: now + 1_000 },
    future: { dismissedAt: now + 1_000, expiresAt: now + 2_000 },
    unbounded: { dismissedAt: now - 1_000, expiresAt: now + 3_600_001 },
}));
assert.deepEqual(getDismissedMenuProcessingJobIds(storeA, now), ['valid']);
clearExpiredMenuProcessingJobDismissals(storeA);

storage.setItem(storeAKey!, '{');
assert.deepEqual(getDismissedMenuProcessingJobIds(storeA), []);
assert.equal(storage.getItem(storeAKey!), null);

storage.rejectWrites = true;
assert.doesNotThrow(() => markMenuProcessingJobAsDismissed(storeA, 'job-2'));
assert.doesNotThrow(() => clearExpiredMenuProcessingJobDismissals(storeA));

process.stdout.write('Menu processing dismissal boundary tests passed.\n');
