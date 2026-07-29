import assert from 'node:assert/strict';
import {
  canShowPrompt,
  getVisitCount,
  incrementVisitCount,
  isPromptSuppressedByDismissal,
  markPromptDismissed,
} from '../../src/lib/pwa/visitCounter';
import {
  parseCanonicalPwaCount,
  parseCanonicalPwaTimestamp,
} from '../../src/lib/pwa/storageValue';

class LocalStorageMock {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const storage = new LocalStorageMock();
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    localStorage: storage,
    location: { search: '' },
  },
});

assert.equal(parseCanonicalPwaCount('3', 10), 3);
assert.equal(parseCanonicalPwaCount('1e3', 10_000), null);
assert.equal(parseCanonicalPwaCount('3visits', 10), null);
assert.equal(parseCanonicalPwaCount('-1', 10), null);
assert.equal(parseCanonicalPwaCount('11', 10), null);

const now = Date.now();
assert.equal(parseCanonicalPwaTimestamp(String(now), now), now);
assert.equal(parseCanonicalPwaTimestamp('1e3', now), null);
assert.equal(parseCanonicalPwaTimestamp(String(now + 1), now), null);

const tenantOneVisitKey = 'menulist_customerApp_visits_:1:10';
const tenantTwoVisitKey = 'menulist_customerApp_visits_:2:10';
const tenantOneDismissalKey = 'menulist_customerApp_dismissedAt_:1:10';
assert.equal(incrementVisitCount(1, 10), 1);
assert.equal(incrementVisitCount(1, 10), 2);
assert.equal(getVisitCount(1, 10), 2);
assert.equal(getVisitCount(2, 10), 0);
storage.setItem(tenantOneVisitKey, '2visits');
assert.equal(getVisitCount(1, 10), 0);
assert.equal(storage.getItem(tenantOneVisitKey), null);
storage.setItem(tenantOneVisitKey, '999999999999999999999');
assert.equal(incrementVisitCount(1, 10), 1);
assert.equal(storage.getItem(tenantTwoVisitKey), null);

markPromptDismissed(1, 10);
assert.equal(isPromptSuppressedByDismissal(1, 10), true);
assert.equal(isPromptSuppressedByDismissal(2, 10), false);
storage.setItem(tenantOneDismissalKey, String(Date.now() + 60_000));
assert.equal(isPromptSuppressedByDismissal(1, 10), false);
assert.equal(storage.getItem(tenantOneDismissalKey), null);
storage.setItem(tenantOneDismissalKey, '1e3');
assert.equal(isPromptSuppressedByDismissal(1, 10), false);
assert.equal(storage.getItem(tenantOneDismissalKey), null);

storage.setItem(tenantOneVisitKey, '3');
assert.equal(canShowPrompt(1, 10), true);
assert.equal(canShowPrompt(2, 10), false);
assert.equal(canShowPrompt('01', 10, true), false);

process.stdout.write('Customer App browser storage boundary tests passed.\n');
