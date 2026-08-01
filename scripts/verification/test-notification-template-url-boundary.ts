import assert from 'node:assert/strict';

import { resolveTemplate as resolveAppLifecycleTemplate } from '@lib/messaging/templates';
import { renderOwnerNotificationTemplate } from '@lib/owner-notifications/templates';
import { resolveTemplate as resolveFunctionsLifecycleTemplate } from '../../functions/src/messaging/templates';

const credentialUrl = 'https://menulist.ai:secret@attacker.example/account';
const validUrl = 'https://menulist.ai/account';

const appCredentialTemplate = resolveAppLifecycleTemplate('STORE_PUBLISHED', {
    dashboardUrl: credentialUrl,
    publicUrl: credentialUrl,
    storeName: 'Example Store',
});
assert.ok(appCredentialTemplate);
assert.doesNotMatch(appCredentialTemplate.html, /attacker\.example/);

const appValidTemplate = resolveAppLifecycleTemplate('STORE_PUBLISHED', {
    dashboardUrl: validUrl,
    publicUrl: validUrl,
    storeName: 'Example Store',
});
assert.ok(appValidTemplate);
assert.match(appValidTemplate.html, /https:\/\/menulist\.ai\/account/);

const functionsCredentialTemplate = resolveFunctionsLifecycleTemplate('STORE_PUBLISHED', {
    dashboardUrl: credentialUrl,
    publicUrl: credentialUrl,
    storeName: 'Example Store',
});
assert.ok(functionsCredentialTemplate);
assert.doesNotMatch(functionsCredentialTemplate.html, /attacker\.example/);

const menuListCredentialTemplate = renderOwnerNotificationTemplate(
    'ML',
    'menulist.menu_published',
    {
        dashboardUrl: credentialUrl,
        publicUrl: credentialUrl,
        storeName: 'Example Store',
    },
);
assert.ok(menuListCredentialTemplate);
assert.doesNotMatch(menuListCredentialTemplate.html, /attacker\.example/);
assert.doesNotMatch(menuListCredentialTemplate.text, /attacker\.example/);

const answerlatticeCredentialTemplate = renderOwnerNotificationTemplate(
    'AL',
    'answerlattice.support_email_missing',
    {
        actionUrl: credentialUrl,
        productName: 'Example Product',
        supportEmail: 'owner@example.com',
    },
);
assert.ok(answerlatticeCredentialTemplate);
assert.doesNotMatch(answerlatticeCredentialTemplate.html, /attacker\.example/);

process.stdout.write('Notification template URL boundary tests passed.\n');
