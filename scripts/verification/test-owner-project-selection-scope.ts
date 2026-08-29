import assert from 'node:assert/strict';
import {
    getOwnerProjectSelectionScopeKey,
    getStoredOwnerProjectId,
    resolveSelectableProject,
    setStoredOwnerProjectId,
} from '../../src/lib/projects/projectSelection';

assert.equal(getOwnerProjectSelectionScopeKey(7, 11), 'mobileSelectedProjectId:11:7');
assert.equal(getOwnerProjectSelectionScopeKey(7, 22), 'mobileSelectedProjectId:22:7');
assert.equal(getOwnerProjectSelectionScopeKey('2:3', 1), null);
assert.equal(getOwnerProjectSelectionScopeKey(3, '1:2'), null);

class MemoryStorage {
    private readonly values = new Map<string, string>();

    get length() {
        return this.values.size;
    }

    clear() {
        this.values.clear();
    }

    getItem(key: string) {
        return this.values.get(key) ?? null;
    }

    key(index: number) {
        return Array.from(this.values.keys())[index] ?? null;
    }

    removeItem(key: string) {
        this.values.delete(key);
    }

    setItem(key: string, value: string) {
        this.values.set(key, String(value));
    }
}

const localStorage = new MemoryStorage();
const sessionStorage = new MemoryStorage();
Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage, sessionStorage } satisfies Pick<Window, 'localStorage' | 'sessionStorage'>,
});

setStoredOwnerProjectId('11-default-7', 7, 11);
setStoredOwnerProjectId('22-default-7', 7, 22);

assert.equal(
    getStoredOwnerProjectId(7, 11),
    '11-default-7',
    'tenant 11 must retain its own selected project when another tenant shares the store document ID',
);
assert.equal(
    getStoredOwnerProjectId(7, 22),
    '22-default-7',
    'tenant 22 must retain its own selected project when another tenant shares the store document ID',
);
assert.equal(localStorage.getItem('mobileSelectedProjectId:11:7'), '11-default-7');
assert.equal(localStorage.getItem('mobileSelectedProjectId:22:7'), '22-default-7');
assert.equal(sessionStorage.getItem('menulist_dashboard_project_id'), null);

setStoredOwnerProjectId('collision-attempt', '2:3', 1);
setStoredOwnerProjectId('collision-attempt-2', 3, '1:2');
assert.equal(localStorage.getItem('mobileSelectedProjectId:1:2:3'), null);
assert.equal(getStoredOwnerProjectId('2:3', 1), null);
assert.equal(getStoredOwnerProjectId(3, '1:2'), null);
setStoredOwnerProjectId('whitespace-scope', ' 7', 11);
assert.equal(getStoredOwnerProjectId(' 7', 11), null);

setStoredOwnerProjectId('unsafe-store-only', 7);
assert.equal(
    getStoredOwnerProjectId(7),
    null,
    'a store-scoped selection must fail closed when tenant identity is unavailable',
);
assert.equal(localStorage.getItem('mobileSelectedProjectId:7'), null);

localStorage.setItem('mobileSelectedProjectId:7', 'legacy-foreign-project');
assert.equal(
    getStoredOwnerProjectId(7, 33),
    null,
    'an exact tenant/store lookup must not fall back to the ambiguous legacy store-only key',
);

setStoredOwnerProjectId(null, 7, 11);
assert.equal(getStoredOwnerProjectId(7, 11), null);
assert.equal(
    getStoredOwnerProjectId(7, 22),
    '22-default-7',
    'clearing one tenant selection must not remove another tenant selection',
);

const activeProject = { active: true, projectId: 'active' };
const deletedProject = { active: true, deleted: true, isDefault: true, projectId: 'deleted' };
assert.equal(
    resolveSelectableProject([activeProject, deletedProject], 'deleted'),
    activeProject,
    'a stale preferred project ID must not reselect a deleted project',
);
assert.equal(
    resolveSelectableProject([deletedProject], 'deleted'),
    null,
    'deleted projects must not become the selection fallback',
);

Reflect.deleteProperty(globalThis, 'window');

console.log('Owner project-selection tenant/store scope tests passed.');
