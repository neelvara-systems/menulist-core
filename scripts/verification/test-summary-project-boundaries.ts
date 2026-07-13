import assert from 'node:assert/strict';
import {
    isActiveRegularSummaryProject,
    isCurrentActiveSpecialSummaryProject,
    normalizeSummaryProjectLocalizedText,
    parseSummaryProjects,
    withAuthoritativeSummaryProjectId,
} from '../../src/lib/firestore/parseSummaryProjects';
import {
    buildSummaryProjectDeletePayload,
    buildSummaryProjectFieldPayload,
    buildSummaryProjectPayload,
    buildSummaryProjectsBatchPayload,
} from '../../src/lib/firestore/summaryProjectsWriter';
import {
    parseSummaryStores,
    withAuthoritativeSummaryStoreId,
} from '../../src/lib/firestore/parseSummaryStores';

const parsed = parseSummaryProjects({
    projects: {
        modern: { active: true, name: 'Modern' },
    },
    'projects.flat': { active: true, name: 'Flat' },
    'projects.flat.flags.featured': true,
});

assert.equal(Object.getPrototypeOf(parsed), null);
assert.equal(Object.getPrototypeOf(parsed.modern), null);
assert.deepEqual({ ...parsed.modern }, { active: true, name: 'Modern' });
assert.equal(Object.getPrototypeOf(parsed.flat.flags), null);
assert.deepEqual({ ...parsed.flat, flags: { ...(parsed.flat.flags as Record<string, unknown>) } }, {
    active: true,
    flags: { featured: true },
    name: 'Flat',
});

const pollutionInput = JSON.parse(`{
    "projects": {
        "safe": { "active": true },
        "__proto__": { "nestedPollution": true }
    },
    "projects.__proto__.flatPollution": true,
    "projects.constructor.prototype.constructorPollution": true,
    "projects.safe.__proto__.childPollution": true
}`) as unknown;
const pollutionResult = parseSummaryProjects(pollutionInput);

for (const property of ['nestedPollution', 'flatPollution', 'constructorPollution', 'childPollution']) {
    assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, property), false);
    assert.equal(Object.prototype.hasOwnProperty.call(pollutionResult, property), false);
}
assert.deepEqual(Object.keys(pollutionResult), ['safe']);
assert.deepEqual({ ...pollutionResult.safe }, { active: true });
assert.deepEqual(
    withAuthoritativeSummaryProjectId('document_project', {
        active: true,
        projectId: 'embedded_wrong_project',
    }),
    { active: true, projectId: 'document_project' },
);
assert.equal(isActiveRegularSummaryProject({ active: true, deleted: false }), true);
assert.equal(isActiveRegularSummaryProject({ active: true, isSpecialMenu: true }), false);
const normalizedSummaryName = normalizeSummaryProjectLocalizedText({ en: 'Menu', hi: null, fr: 5 });
if (!normalizedSummaryName || typeof normalizedSummaryName !== 'object') {
    throw new Error('Expected a normalized localized summary name');
}
assert.deepEqual({ ...normalizedSummaryName }, { en: 'Menu' });
assert.equal(normalizeSummaryProjectLocalizedText(JSON.parse('{"__proto__":"bad"}')), null);
assert.equal(normalizeSummaryProjectLocalizedText({ en: null }), null);
assert.equal(isCurrentActiveSpecialSummaryProject({
    projectId: 'special_1',
    active: true,
    deleted: false,
    isSpecialMenu: true,
    specialMenuStatus: 'active',
    specialMenuEndsAt: 'not-a-date',
}, 'special_1', Date.now()), false);
assert.equal(isCurrentActiveSpecialSummaryProject({
    projectId: 'special_1',
    active: true,
    deleted: false,
    isSpecialMenu: true,
    specialMenuStatus: 'active',
    specialMenuEndsAt: '2099-01-01T00:00:00.000Z',
}, 'special_1', Date.now()), true);

assert.deepEqual(buildSummaryProjectPayload('project_1', { active: true }), {
    'projects.project_1': { active: true },
});
assert.deepEqual(buildSummaryProjectFieldPayload('project_1', 'flags.featured', true), {
    'projects.project_1.flags.featured': true,
});
const deleteMarker = { __deleteSentinel: true };
assert.deepEqual(buildSummaryProjectDeletePayload('project_1', deleteMarker), {
    'projects.project_1': deleteMarker,
});
assert.throws(() => buildSummaryProjectPayload('__proto__', {}));
assert.throws(() => buildSummaryProjectPayload('project.with.dot', {}));
assert.throws(() => buildSummaryProjectFieldPayload('project_1', '__proto__.polluted', true));
assert.throws(() => buildSummaryProjectDeletePayload('project.with.dot', deleteMarker));
assert.throws(() => buildSummaryProjectsBatchPayload({ constructor: { active: true } }));

const parsedStores = parseSummaryStores({
    stores: {
        '101': { active: true, name: 'Main', storeId: 'embedded_wrong_store' },
    },
    'stores.202': { active: true, name: 'Outlet' },
    'stores.202.routing.outletSlug': 'outlet',
});
assert.equal(Object.getPrototypeOf(parsedStores), null);
assert.deepEqual(withAuthoritativeSummaryStoreId('101', parsedStores['101']), {
    active: true,
    name: 'Main',
    storeId: '101',
});
const parsedStoreRouting = parsedStores['202'].routing;
if (!parsedStoreRouting || typeof parsedStoreRouting !== 'object' || Array.isArray(parsedStoreRouting)) {
    throw new Error('Expected parsed store routing data');
}
assert.deepEqual({
    ...parsedStores['202'],
    routing: { ...parsedStoreRouting },
}, {
    active: true,
    name: 'Outlet',
    routing: { outletSlug: 'outlet' },
});

const pollutedStores = parseSummaryStores(JSON.parse(`{
    "stores": { "safe": { "active": true }, "__proto__": { "nestedStorePollution": true } },
    "stores.__proto__.flatStorePollution": true,
    "stores.constructor.prototype.constructorStorePollution": true,
    "stores.safe.__proto__.childStorePollution": true
}`));
for (const property of ['nestedStorePollution', 'flatStorePollution', 'constructorStorePollution', 'childStorePollution']) {
    assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, property), false);
    assert.equal(Object.prototype.hasOwnProperty.call(pollutedStores, property), false);
}
assert.deepEqual(Object.keys(pollutedStores), ['safe']);

console.log('Summary project parser and writer boundaries passed.');
