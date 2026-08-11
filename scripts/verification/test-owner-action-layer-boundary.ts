import assert from 'node:assert/strict';
import { buildOwnerActionLayer } from '@lib/ownerActions/buildOwnerActionLayer';

const now = new Date('2026-07-29T12:00:00.000Z');

const valid = buildOwnerActionLayer({
    now,
    project: {
        active: true,
        lastPublishedAt: { seconds: 1_753_699_200 },
        projectId: 'project-1',
    } as never,
    storeDetails: {
        feedbackEnabled: true,
        menuPresence: {
            googleBusiness: '2026-07-20T12:00:00.000Z',
        },
        subdomain: 'example',
        workingHours: {
            monday: '09:00-17:00',
        },
    },
});

assert.equal(valid.primaryAction.id, 'capture_daily_change');
assert.equal(valid.placement.confirmedCount, 1);
assert.equal(valid.placement.latestConfirmedTimestamp, '2026-07-20T12:00:00.000Z');

const missingProject = buildOwnerActionLayer({
    now,
    project: null,
    storeDetails: {
        feedbackEnabled: true,
        menuPresence: {
            googleBusiness: '2026-07-20T12:00:00.000Z',
        },
        subdomain: 'example',
        workingHours: {
            monday: '09:00-17:00',
        },
    },
});
assert.equal(missingProject.primaryAction.id, 'publish_menu');
assert.equal(
    missingProject.actions.filter((item) => item.id === 'publish_menu').length,
    1,
    'publish menu must remain one canonical action when no project exists',
);
assert.equal(missingProject.openCount, 1, 'missing project must not inflate the open-action count');

for (const project of [
    {
        active: false,
        lastPublishedAt: { seconds: 1_753_699_200 },
        projectId: 'project-1',
    },
    {
        active: true,
        deleted: true,
        lastPublishedAt: { seconds: 1_753_699_200 },
        projectId: 'project-1',
    },
    {
        active: true,
        lastPublishedAt: 'not-a-timestamp',
        projectId: 'project-1',
    },
]) {
    const result = buildOwnerActionLayer({
        now,
        project: project as never,
        storeDetails: {
            feedbackEnabled: true,
            menuPresence: {
                googleBusiness: '2026-07-20T12:00:00.000Z',
            },
            subdomain: 'example',
            workingHours: {
                monday: '09:00-17:00',
            },
        },
    });
    assert.equal(result.primaryAction.id, 'publish_menu');
    assert.equal(result.primaryAction.statusLabel, 'Not live');
}

const malformedStoreTruth = buildOwnerActionLayer({
    now,
    project: {
        active: true,
        lastPublishedAt: { seconds: 1_753_699_200 },
        projectId: 'project-1',
    } as never,
    storeDetails: {
        customDomain: { nested: 'example.com' },
        feedbackEnabled: true,
        menuPresence: {
            googleBusiness: 'not-a-timestamp',
            instagramBio: '2026-07-20T12:00:00.000Z',
            whatsappProfile: '' as never,
        },
        workingHours: {
            monday: { nested: '09:00-17:00' },
        },
    } as never,
});

assert.equal(malformedStoreTruth.primaryAction.id, 'set_hours');
assert.equal(malformedStoreTruth.placement.confirmedCount, 1);
assert.deepEqual(malformedStoreTruth.placement.missingLabels, ['Google', 'WhatsApp']);
assert.equal(
    malformedStoreTruth.actions.find((item) => item.id === 'set_customer_link')?.statusLabel,
    'Missing',
);

const missingStoreTruth = buildOwnerActionLayer({
    now,
    project: {
        active: true,
        lastPublishedAt: { seconds: 1_753_699_200 },
        projectId: 'project-1',
    } as never,
    storeDetails: null,
});
assert.equal(
    missingStoreTruth.actions.find((item) => item.id === 'open_private_feedback')?.statusLabel,
    'Off',
    'missing store truth must not be treated as enabled feedback',
);

console.log('Owner action layer boundary tests passed.');
