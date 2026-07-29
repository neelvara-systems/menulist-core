#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { PUBLIC_MENU_DRAFT_DATA_LIMITS } from '../../src/data/shared/publicMenuDraftData';
import {
    applyAiMenuManagerProjectPatch,
    projectContainsAiMenuManagerPatch,
} from '../../src/lib/ai-menu-manager/actions/projectPatches';
import { buildAiMenuManagerContextPacket } from '../../src/lib/ai-menu-manager/contextPacket';
import {
    AI_MENU_MANAGER_PROJECT_LIMITS,
    normalizeAiMenuManagerProjectSnapshot,
} from '../../src/lib/ai-menu-manager/projectIntegrity';
import {
    projectDocumentMutationVersionMillis,
    projectMutationVersionIso,
    projectMutationVersionMillis,
} from '../../src/lib/menu/projectMutationVersion';
import type { Project } from '../../src/components/templates/main-app/projects/types';

const projectId = 'project-integrity-menu';

function menuFile(params: {
    uid?: string;
    categories?: unknown[];
    items?: unknown[];
}) {
    return {
        uid: params.uid ?? 'file-1',
        extractedData: {
            data: {
                categories: params.categories ?? [{ id: 'cat-1', active: true, name: { en: 'Main' } }],
                items: params.items ?? [{
                    id: 'item-1',
                    category: 'cat-1',
                    name: { en: 'Tea' },
                    price: '20',
                    active: true,
                    available: true,
                    attributes: [{ id: 'size-1', name: { en: 'Regular' }, price: '20', active: true }],
                }],
                languages: [{ code: 'en', name: 'English', isPrimary: true }],
            },
        },
    };
}

function validProject(): Record<string, unknown> {
    return {
        name: { en: 'Integrity Menu' },
        defaultLanguage: 'en',
        languages: ['en'],
        files: [menuFile({})],
        menuSettings: {
            specialNote: 'Open daily',
            decisionBlocks: { enablePopular: true },
        },
        config: {
            design: {
                menu: { layout: 'grid', showImages: true },
                brand: { accentColor: '#111111' },
            },
        },
        retainedForOtherSurfaces: { untouched: true },
    };
}

function run(): void {
    const versionMillis = 1_700_000_000_123;
    assert.equal(projectMutationVersionMillis({ seconds: 1_700_000_000, nanoseconds: 123_000_000 }), versionMillis);
    assert.equal(projectMutationVersionMillis({ _seconds: 1_700_000_000, _nanoseconds: 123_000_000 }), versionMillis);
    assert.equal(projectMutationVersionMillis('Timestamp(seconds=1700000000, nanoseconds=123000000)'), versionMillis);
    assert.equal(projectMutationVersionMillis({ toMillis: () => versionMillis }), versionMillis);
    assert.equal(projectMutationVersionIso({ _seconds: 1_700_000_000, _nanoseconds: 123_000_000 }), '2023-11-14T22:13:20.123Z');
    assert.equal(projectDocumentMutationVersionMillis({ modifiedOn: { seconds: 1_700_000_000, nanoseconds: 123_000_000 } }), versionMillis);
    assert.equal(projectMutationVersionMillis({ seconds: 1, nanoseconds: 1_000_000_000 }), null);
    assert.equal(projectMutationVersionMillis({
        get toMillis() {
            throw new Error('timestamp getter must remain contained');
        },
    }), null);
    assert.equal(projectMutationVersionMillis({
        toMillis() {
            throw new Error('timestamp method must remain contained');
        },
    }), null);
    assert.equal(projectMutationVersionMillis({
        seconds: {
            valueOf() {
                throw new Error('timestamp coercion must not execute');
            },
        },
    }), null);
    assert.equal(projectMutationVersionMillis(new Proxy({}, {
        get() {
            throw new Error('timestamp proxy must remain contained');
        },
    })), null);
    assert.equal(projectDocumentMutationVersionMillis(new Proxy({}, {
        get() {
            throw new Error('project timestamp access must remain contained');
        },
    })), null);

    const normalized = normalizeAiMenuManagerProjectSnapshot(validProject(), projectId);
    assert.ok(normalized, 'valid project snapshots must normalize');
    assert.equal(normalized?.projectId, projectId, 'document identity must be projected as project identity');
    assert.deepEqual(
        (normalized as unknown as Record<string, unknown>).retainedForOtherSurfaces,
        { untouched: true },
        'fields owned by other project surfaces must remain untouched',
    );

    assert.ok(
        normalizeAiMenuManagerProjectSnapshot({ name: 'Legacy menu', files: [] }, projectId),
        'valid legacy string names and empty menus must remain supported',
    );
    assert.equal(normalizeAiMenuManagerProjectSnapshot({ ...validProject(), projectId: 'foreign' }, projectId), null);
    assert.equal(normalizeAiMenuManagerProjectSnapshot({ ...validProject(), files: {} }, projectId), null);
    assert.equal(normalizeAiMenuManagerProjectSnapshot({ ...validProject(), config: { design: [] } }, projectId), null);
    assert.equal(normalizeAiMenuManagerProjectSnapshot({
        ...validProject(),
        files: Array.from({ length: AI_MENU_MANAGER_PROJECT_LIMITS.MAX_FILES + 1 }, (_, index) => ({ uid: `file-${index}` })),
    }, projectId), null);
    assert.equal(normalizeAiMenuManagerProjectSnapshot({
        ...validProject(),
        files: [menuFile({ items: [{
            id: 'item-1',
            category: 'cat-1',
            name: { en: 'Tea' },
            active: true,
            extractionIdAliases: 'not-an-array',
        }] })],
    }, projectId), null);
    assert.equal(normalizeAiMenuManagerProjectSnapshot({
        ...validProject(),
        files: [
            menuFile({ uid: 'file-1' }),
            menuFile({ uid: 'file-2' }),
        ],
    }, projectId), null, 'duplicate item and category IDs across files must fail closed');
    assert.equal(normalizeAiMenuManagerProjectSnapshot({
        ...validProject(),
        files: [menuFile({ items: [{
            id: 'item-1',
            category: 'cat-1',
            name: { en: 'Tea' },
            active: true,
            attributes: [
                { id: 'size-1', name: { en: 'Small' }, price: '10', active: true },
                { id: 'size-1', name: { en: 'Large' }, price: '20', active: true },
            ],
        }] })],
    }, projectId), null, 'duplicate attribute IDs inside one item must fail closed');
    assert.equal(normalizeAiMenuManagerProjectSnapshot({
        ...validProject(),
        files: [menuFile({
            items: Array.from({ length: PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_ITEMS + 1 }, (_, index) => ({
                id: `item-${index}`,
                category: 'cat-1',
                name: { en: `Item ${index}` },
                active: true,
            })),
        })],
    }, projectId), null, 'oversized menu item sets must fail closed');

    const duplicateItemProject = {
        projectId,
        files: [menuFile({
            items: [
                { id: 'item-1', category: 'cat-1', name: { en: 'Tea' }, price: '10', active: true },
                { id: 'item-1', category: 'cat-1', name: { en: 'Tea' }, price: '20', active: true },
            ],
        })],
    } as unknown as Project;
    assert.equal(projectContainsAiMenuManagerPatch(duplicateItemProject, {
        kind: 'item_update',
        itemIds: ['item-1'],
        updates: { price: '20' },
    }), false, 'one duplicate item occurrence must not overwrite another failed verification');

    const duplicateAttributeProject = {
        projectId,
        files: [menuFile({
            items: [
                {
                    id: 'item-1',
                    category: 'cat-1',
                    name: { en: 'Tea' },
                    active: true,
                    attributes: [{ id: 'size-1', name: { en: 'Small' }, price: '10', active: true }],
                },
                {
                    id: 'item-2',
                    category: 'cat-1',
                    name: { en: 'Coffee' },
                    active: true,
                    attributes: [{ id: 'size-1', name: { en: 'Small' }, price: '20', active: true }],
                },
            ],
        })],
    } as unknown as Project;
    assert.equal(projectContainsAiMenuManagerPatch(duplicateAttributeProject, {
        kind: 'attribute_update',
        attributeIds: ['size-1'],
        updates: { price: '20' },
    }), false, 'attribute verification must require every targeted occurrence to match');

    const malformedDirectProject = { projectId, files: { malformed: true } } as unknown as Project;
    assert.throws(() => buildAiMenuManagerContextPacket({
        project: malformedDirectProject,
        storeName: 'Integrity Store',
    }), /Invalid project data/, 'direct context construction must reject malformed loaded project truth');
    assert.throws(() => buildAiMenuManagerContextPacket({
        expectedProjectId: 'different-project',
        project: { ...validProject(), projectId } as unknown as Project,
        storeName: 'Integrity Store',
    }), /Invalid project data/, 'direct context construction must reject project/request identity mismatches');
    assert.equal(buildAiMenuManagerContextPacket({
        expectedProjectId: projectId,
        project: {
            ...validProject(),
            projectId,
            modifiedOn: { _seconds: 1_700_000_000, _nanoseconds: 123_000_000 },
        } as unknown as Project,
        storeName: 'Integrity Store',
    }).projectUpdatedAt, '2023-11-14T22:13:20.123Z', 'Admin and browser timestamps must produce one canonical AMM project version');
    assert.equal(projectContainsAiMenuManagerPatch(malformedDirectProject, {
        kind: 'menu_settings_update',
        menuSettings: { specialNote: 'Weekend only' },
    }), false, 'direct already-applied checks must fail closed for malformed loaded project truth');
    assert.equal(projectContainsAiMenuManagerPatch(
        { ...validProject(), projectId } as unknown as Project,
        { kind: 'menu_settings_update', menuSettings: { specialNote: 'Open daily' } },
        'different-project',
    ), false, 'direct already-applied checks must reject operation/project identity mismatches');
    assert.throws(() => applyAiMenuManagerProjectPatch(malformedDirectProject, {
        proposalId: 'amm_prop_aaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        executionId: 'amm_exec_aaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        actionType: 'menu_special_note_update',
        scope: { type: 'project', tId: '1', sId: '2', projectId, label: 'Integrity Store' },
        patch: { kind: 'menu_settings_update', menuSettings: { specialNote: 'Weekend only' } },
        patchHash: 'a'.repeat(32),
        patchSummary: { title: 'Update note', beforeValue: 'Open', afterValue: 'Weekend only' },
        expiresAt: '2026-07-13T13:00:00.000Z',
    }), /Invalid project data/, 'direct patch application must reject malformed loaded project truth');
    assert.throws(() => applyAiMenuManagerProjectPatch({ ...validProject(), projectId } as unknown as Project, {
        proposalId: 'amm_prop_bbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        executionId: 'amm_exec_bbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        actionType: 'menu_special_note_update',
        scope: {
            type: 'project',
            tId: '1',
            sId: '2',
            projectId: 'different-project',
            label: 'Integrity Store',
        },
        patch: { kind: 'menu_settings_update', menuSettings: { specialNote: 'Weekend only' } },
        patchHash: 'b'.repeat(32),
        patchSummary: { title: 'Update note', beforeValue: 'Open', afterValue: 'Weekend only' },
        expiresAt: '2026-07-13T13:00:00.000Z',
    }), /Invalid project data/, 'direct patch application must reject directive/project identity mismatches');
    assert.throws(() => applyAiMenuManagerProjectPatch({ ...validProject(), projectId } as unknown as Project, {
        proposalId: 'amm_prop_cccccccccccccccccccccccccccc',
        executionId: 'amm_exec_cccccccccccccccccccccccccccc',
        actionType: 'menu_special_note_update',
        scope: { type: 'project', tId: '1', sId: '2', label: 'Integrity Store' },
        patch: { kind: 'menu_settings_update', menuSettings: { specialNote: 'Weekend only' } },
        patchHash: 'c'.repeat(32),
        patchSummary: { title: 'Update note', beforeValue: 'Open', afterValue: 'Weekend only' },
        expiresAt: '2026-07-13T13:00:00.000Z',
    }), /Invalid project data/, 'direct patch application must reject missing directive project identity');

    console.log('AI Menu Manager project integrity verification passed');
}

run();
