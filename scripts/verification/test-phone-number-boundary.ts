import assert = require('node:assert/strict');

import {
    buildInternationalPhoneDigits,
    buildTelHref,
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
for (const invalidPublicPhone of [
    { countryCode: 'IN', phoneNumber: '0000000000' },
    { phoneNumber: '+91' },
    { phoneNumber: '+0000000' },
]) {
    assert.equal(buildInternationalPhoneDigits(invalidPublicPhone), '');
    assert.equal(buildWhatsAppPhoneParam(invalidPublicPhone), '');
    assert.equal(buildFunctionsWhatsAppPhoneParam(invalidPublicPhone), '');
    assert.equal(buildTelHref(invalidPublicPhone), null);
}
assert.equal(normalizePhoneDigits({
    toString() {
        throw new Error('must not execute');
    },
} as never), '');

process.stdout.write('Phone number boundary tests passed.\n');
