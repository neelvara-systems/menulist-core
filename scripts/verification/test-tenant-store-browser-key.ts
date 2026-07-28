import assert from 'node:assert/strict';
import { getTenantStoreStorageKey } from '../../src/lib/browserStorage/tenantStoreKey';
import { getInactiveReminderDismissKey } from '../../src/lib/today/inactiveItemsReminder';

assert.equal(getTenantStoreStorageKey('menulist:activeJob', 10, 20), 'menulist:activeJob:10:20');
assert.equal(getTenantStoreStorageKey('menulist:activeJob', 11, 20), 'menulist:activeJob:11:20');
assert.equal(getTenantStoreStorageKey('menulist:activeJob', 0, 20), null);
assert.equal(getTenantStoreStorageKey('menulist:activeJob', '10', ' 20 '), 'menulist:activeJob:10:20');
assert.equal(getTenantStoreStorageKey('bad key', 10, 20), null);
assert.match(
    getInactiveReminderDismissKey(10, 20, '10-project-20') || '',
    /^today_inactive_items_dismissed_10_20_10-project-20_\d{4}-\d{2}-\d{2}$/,
);
assert.equal(getInactiveReminderDismissKey(null, 20, '10-project-20'), null);
assert.notEqual(
    getInactiveReminderDismissKey(10, 20, '10-project-20'),
    getInactiveReminderDismissKey(11, 20, '10-project-20'),
);

process.stdout.write('Tenant/store browser key tests passed.\n');
