#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import { normalizeStoredMenuChange } from '../../src/database/menuChangeLog';
import {
    createMenuChangeLogDebounceKey,
    createMenuChangeLogPendingKey,
    createPendingMenuChange,
    DEFAULT_MENU_CHANGE_LOG_QUERY_LIMIT,
    MAX_MENU_CHANGE_LOG_QUERY_LIMIT,
    normalizeMenuChangeLogIdentifier,
    normalizeMenuChangeLogQueryLimit,
    normalizeMenuChangeLogScope,
    normalizeMenuChangeLogScopeId,
    shouldDebounceMenuChange,
    takePendingMenuChanges,
} from '../../src/database/menuChangeLog/menuChangeLogBoundary';
import type {
    ChangeLogDebounceKey,
    MenuChangeLogInput,
    PendingMenuChange,
} from '../../src/types/menuObservation';

const entry = (overrides: Partial<MenuChangeLogInput> = {}): MenuChangeLogInput => ({
    projectId: 'project-1',
    itemId: 'item-1',
    changeType: 'PRICE',
    oldValue: '10.00',
    newValue: '12.00',
    changedBy: 'OWNER',
    ...overrides,
});

const assertThrows = (callback: () => unknown, message: string): void => {
    assert.throws(callback, message);
};

async function run(): Promise<void> {
    assert.equal(normalizeMenuChangeLogScopeId(1), 1);
    assert.equal(normalizeMenuChangeLogScopeId('101'), 101);
    for (const invalid of [null, undefined, true, 0, -1, 1.5, Number.NaN, '01', '1.0', '1e0', ' 1', '1 ', 'x', String(Number.MAX_SAFE_INTEGER + 1)]) {
        assert.equal(normalizeMenuChangeLogScopeId(invalid), null, `scope must reject ${String(invalid)}`);
    }
    assert.deepEqual(normalizeMenuChangeLogScope({ tId: '1', sId: 101 }), { tId: 1, sId: 101 });
    assert.equal(normalizeMenuChangeLogScope({ tId: '1', sId: '0101' }), null);

    assert.equal(normalizeMenuChangeLogIdentifier('project-1', 'projectId'), 'project-1');
    for (const invalid of ['', ' project', 'project ', 'project/child', 'x'.repeat(181)]) {
        assertThrows(
            () => normalizeMenuChangeLogIdentifier(invalid, 'projectId'),
            `identifier must reject ${JSON.stringify(invalid)}`,
        );
    }

    const scope = { tId: 1, sId: 101 };
    const legacyCollisionA = createMenuChangeLogDebounceKey(scope, entry({
        projectId: 'project_a',
        itemId: 'item',
    }));
    const legacyCollisionB = createMenuChangeLogDebounceKey(scope, entry({
        projectId: 'project',
        itemId: 'a_item',
    }));
    assert.notEqual(legacyCollisionA, legacyCollisionB, 'tuple encoding must prevent underscore collisions');

    const categoryA = createMenuChangeLogDebounceKey(scope, entry({
        itemId: undefined,
        categoryId: 'category-a',
        changeType: 'CATEGORY_REORDER',
    }));
    const categoryB = createMenuChangeLogDebounceKey(scope, entry({
        itemId: undefined,
        categoryId: 'category-b',
        changeType: 'CATEGORY_REORDER',
    }));
    assert.notEqual(categoryA, categoryB, 'different categories must not overwrite one pending event');

    const mutableScope = { tId: 1, sId: 101 };
    const originalEntry = entry();
    const key = createMenuChangeLogDebounceKey(mutableScope, originalEntry);
    const queued = createPendingMenuChange(originalEntry, mutableScope, key, 1234);
    mutableScope.tId = 2;
    mutableScope.sId = 202;
    assert.deepEqual(queued.scope, { tId: 1, sId: 101 }, 'queued scope must be an immutable snapshot');

    const secondScope = { tId: 2, sId: 202 };
    const secondEntry = entry({ projectId: 'project-2' });
    const secondKey = createMenuChangeLogDebounceKey(secondScope, secondEntry);
    const pending = new Map<ChangeLogDebounceKey, PendingMenuChange>([
        [key, queued],
        [secondKey, createPendingMenuChange(secondEntry, secondScope, secondKey, 5678)],
    ]);
    const activeSessionAfterSwitch = { tId: 9, sId: 909 };
    const drained = takePendingMenuChanges(pending);
    assert.equal(pending.size, 0);
    assert.deepEqual(
        drained.map(change => change.scope),
        [{ tId: 1, sId: 101 }, { tId: 2, sId: 202 }],
        'flush destinations must come from queued scope, not the current session',
    );
    assert.notDeepEqual(drained[0].scope, activeSessionAfterSwitch);

    assert.equal(shouldDebounceMenuChange('PRICE'), true);
    assert.equal(shouldDebounceMenuChange('AVAILABILITY'), true);
    assert.equal(
        shouldDebounceMenuChange('MENU_REVISION_SUMMARY'),
        false,
        'completed revision summaries must not replace one another inside the debounce window',
    );
    assert.equal(
        shouldDebounceMenuChange('PUBLISH'),
        false,
        'completed publish events must remain append-only',
    );
    assert.notEqual(
        createMenuChangeLogPendingKey(scope, entry({
            itemId: undefined,
            changeType: 'MENU_REVISION_SUMMARY',
        }), 1),
        createMenuChangeLogPendingKey(scope, entry({
            itemId: undefined,
            changeType: 'MENU_REVISION_SUMMARY',
        }), 2),
        'completed summaries must occupy separate flushable queue entries',
    );
    assert.equal(
        createMenuChangeLogPendingKey(scope, entry(), 1),
        createMenuChangeLogPendingKey(scope, entry(), 2),
        'replaceable detailed changes must retain a stable debounce key',
    );

    assert.equal(normalizeMenuChangeLogQueryLimit(), DEFAULT_MENU_CHANGE_LOG_QUERY_LIMIT);
    assert.equal(normalizeMenuChangeLogQueryLimit(25), 25);
    assert.equal(normalizeMenuChangeLogQueryLimit(10_000), MAX_MENU_CHANGE_LOG_QUERY_LIMIT);
    for (const invalid of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
        assertThrows(
            () => normalizeMenuChangeLogQueryLimit(invalid),
            `query limit must reject ${String(invalid)}`,
        );
    }

    const storedTimestamp = Timestamp.fromMillis(1_700_000_000_000);
    const storedEntry = {
        projectId: 'project-1',
        itemId: 'item-1',
        changeType: 'PRICE',
        oldValue: '10.00',
        newValue: '12.00',
        changedBy: 'OWNER',
        timestamp: storedTimestamp,
        tId: 1,
        sId: 101,
    };
    assert.deepEqual(
        normalizeStoredMenuChange('event-1', storedEntry, scope),
        { id: 'event-1', ...storedEntry },
        'persisted event projection must preserve exact admitted scope and fields',
    );
    assert.equal(
        normalizeStoredMenuChange('event-foreign', { ...storedEntry, sId: 102 }, scope),
        null,
        'persisted event projection must reject embedded foreign scope',
    );
    assert.equal(
        normalizeStoredMenuChange('event-missing-scope', {
            ...storedEntry,
            tId: undefined,
        }, scope),
        null,
        'persisted event projection must reject missing scope aliases',
    );
    assert.equal(
        normalizeStoredMenuChange('event-unsafe-project', {
            ...storedEntry,
            projectId: 'foreign/project',
        }, scope),
        null,
        'persisted event projection must reject path-shaped project identity',
    );
    assert.equal(
        normalizeStoredMenuChange('event-unsafe-item', {
            ...storedEntry,
            itemId: 'x'.repeat(181),
        }, scope),
        null,
        'persisted event projection must reject oversized optional identity',
    );

    process.stdout.write('Menu change log boundary tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
