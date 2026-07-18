import assert from 'node:assert/strict';
import {
    hasFeedbackPresenceReadiness,
    hasPublishedMenuProject,
    hasPublishedStoreMenu,
    isMenuPresenceConfirmed,
    isPublishedMenuProject,
} from '@lib/menuPresence/presenceReadiness';

const publishedAt = '2026-07-16T10:00:00.000Z';
const publishedProject = {
    active: true,
    deleted: false,
    lastPublishedAt: publishedAt,
    projectId: '1-menu-1',
};

assert.equal(isPublishedMenuProject(publishedProject), true);
assert.equal(isPublishedMenuProject({ ...publishedProject, active: false }), false);
assert.equal(isPublishedMenuProject({ ...publishedProject, deleted: true }), false);
assert.equal(isPublishedMenuProject({ ...publishedProject, projectId: '   ' }), false);
assert.equal(isPublishedMenuProject({ ...publishedProject, lastPublishedAt: 'invalid' }), false);
assert.equal(isPublishedMenuProject({ ...publishedProject, lastPublishedAt: 0 }), false);
assert.equal(isPublishedMenuProject({ active: true, deleted: false, projectId: '1-draft-1' }), false);

assert.equal(hasPublishedMenuProject([
    { active: true, projectId: '1-draft-1' },
    publishedProject,
]), true);
assert.equal(hasPublishedMenuProject([{ active: true, projectId: '1-draft-1' }]), false);
assert.equal(hasPublishedMenuProject(null), false);

assert.equal(hasPublishedStoreMenu({ lastPublishedAt: { seconds: 1 } }), true);
assert.equal(hasPublishedStoreMenu({ lastPublishedAt: 'invalid' }), false);
assert.equal(hasPublishedStoreMenu(null), false);

assert.equal(hasFeedbackPresenceReadiness({ feedbackEnabled: undefined, hasPublishedMenu: true }), true);
assert.equal(hasFeedbackPresenceReadiness({ feedbackEnabled: false, hasPublishedMenu: true }), false);
assert.equal(hasFeedbackPresenceReadiness({ feedbackEnabled: true, hasPublishedMenu: false }), false);

assert.equal(isMenuPresenceConfirmed(publishedAt), true);
assert.equal(isMenuPresenceConfirmed(true), false);
assert.equal(isMenuPresenceConfirmed({ toDate: () => { throw new Error('bad timestamp'); } }), false);

console.log('PASS test-menu-presence-readiness');
