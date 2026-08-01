import assert = require('node:assert/strict');

import {
    buildInternationalPhoneDigits,
    buildWhatsAppPhoneParam,
    normalizePhoneDigits,
    normalizePhoneNumberForStorage,
} from '../../src/lib/phone/phoneNumber';
import {
    buildWhatsAppPhoneParam as buildFunctionsWhatsAppPhoneParam,
} from '../../functions/src/utils/phoneNumber';

const indianLocalStartingWithDialCode = {
    countryCode: 'IN',
    phoneNumber: '9198765432',
};
assert.equal(
    buildInternationalPhoneDigits(indianLocalStartingWithDialCode),
    '919198765432',
);
assert.equal(
    buildWhatsAppPhoneParam(indianLocalStartingWithDialCode),
    '919198765432',
);
assert.equal(
    buildFunctionsWhatsAppPhoneParam(indianLocalStartingWithDialCode),
    '919198765432',
);

const unprefixedInternational = normalizePhoneNumberForStorage({
    countryCode: 'IN',
    phoneNumber: '919876543210',
});
assert.equal(unprefixedInternational.internationalDigits, '919876543210');
assert.equal(unprefixedInternational.phoneNumber, '9876543210');
assert.equal(unprefixedInternational.displayNumber, '+91 9876543210');

assert.equal(buildWhatsAppPhoneParam({ phoneNumber: `+${'1'.repeat(16)}` }), '');
assert.equal(buildFunctionsWhatsAppPhoneParam({ phoneNumber: `+${'1'.repeat(16)}` }), '');
assert.equal(normalizePhoneDigits({
    toString() {
        throw new Error('must not execute');
    },
} as never), '');

process.stdout.write('Phone number boundary tests passed.\n');
