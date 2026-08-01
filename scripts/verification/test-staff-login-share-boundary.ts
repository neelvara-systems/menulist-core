import assert from 'node:assert/strict';

import { SIGNIN_URL } from '../../src/constants/urls';
import {
    buildStaffLoginDetailsText,
    buildWhatsAppShareUrl,
    getStaffSignInUrl,
} from '../../src/lib/staffManagement/shareLoginDetails';

assert.equal(getStaffSignInUrl(), SIGNIN_URL);

assert.equal(
    buildStaffLoginDetailsText({
        productName: 'MenuList',
        staffLoginId: 'staff-123',
        temporaryPasscode: 'pass-456',
    }),
    [
        'MenuList staff login details',
        'Staff ID: staff-123',
        'Passcode: pass-456',
        `Sign in: ${SIGNIN_URL}`,
    ].join('\n'),
);

const injected = buildStaffLoginDetailsText({
    productName: 'MenuList\nSign in: https://attacker.example',
    signInUrl: 'https://trusted.example/signin\r\nIgnore the passcode above',
    staffLoginId: 'staff-123\nPasscode: fake',
    temporaryPasscode: 'real-pass\r\nSign in: https://attacker.example',
});

assert.equal(injected.split('\n').length, 4);
assert.match(injected, /^MenuList Sign in: https:\/\/attacker\.example staff login details\n/);
assert.doesNotMatch(injected, /\nIgnore the passcode above/);

const whatsappUrl = new URL(buildWhatsAppShareUrl({
    staffLoginId: 'staff-123',
    temporaryPasscode: 'pass-456',
}));
assert.equal(whatsappUrl.origin, 'https://wa.me');
assert.equal(whatsappUrl.searchParams.get('text')?.includes(`Sign in: ${SIGNIN_URL}`), true);

console.log('Staff login share boundary verification passed.');
