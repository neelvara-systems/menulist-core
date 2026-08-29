import assert from 'node:assert/strict';
import {
    getEditorSaveVisibilityState,
    hasProjectPublishChanges,
} from '../../src/components/templates/main-app/projects/b2cView/projectPublishState';

assert.equal(
    getEditorSaveVisibilityState({ active: true, projectId: 'menu-1' }),
    'draft',
    'A saved menu without an explicit publish timestamp must remain labelled Draft.',
);
assert.equal(
    getEditorSaveVisibilityState({
        active: true,
        lastPublishedAt: '2026-08-27T00:00:00.000Z',
        projectId: 'menu-1',
    }),
    'live',
    'A valid explicitly published menu may be labelled Live.',
);
assert.equal(
    getEditorSaveVisibilityState({
        active: false,
        lastPublishedAt: '2026-08-27T00:00:00.000Z',
        projectId: 'menu-1',
    }),
    'draft',
    'An inactive menu must not be labelled Live even when it retains publish history.',
);

assert.equal(hasProjectPublishChanges(null, null), false);
assert.equal(
    hasProjectPublishChanges({ lastPublishedAt: null, name: 'First menu' } as any, { name: 'First menu' }),
    true,
    'A never-published menu must remain publishable even when preview state matches the draft.',
);
assert.equal(
    hasProjectPublishChanges(
        { lastPublishedAt: '2026-08-27T00:00:00.000Z', name: 'Menu' } as any,
        { lastPublishedAt: '2026-08-27T00:00:00.000Z', name: 'Menu' },
    ),
    false,
);
assert.equal(
    hasProjectPublishChanges(
        { lastPublishedAt: '2026-08-27T00:00:00.000Z', name: 'Updated menu' } as any,
        { lastPublishedAt: '2026-08-27T00:00:00.000Z', name: 'Menu' },
    ),
    true,
);

process.stdout.write('First project publish-state tests passed.\n');
