import assert from 'node:assert/strict';

import {
    isValidOptionalContactEmail,
    normalizeOptionalContactEmail,
} from '../../src/lib/validation/optionalContactEmail';

assert.equal(isValidOptionalContactEmail(''), true);
assert.equal(isValidOptionalContactEmail('   '), true);
assert.equal(isValidOptionalContactEmail('owner@example.com'), true);
assert.equal(isValidOptionalContactEmail(' owner+qa@example.co.in '), true);
assert.equal(isValidOptionalContactEmail('not-an-email'), false);
assert.equal(isValidOptionalContactEmail('owner@example'), false);
assert.equal(isValidOptionalContactEmail('owner @example.com'), false);
assert.equal(isValidOptionalContactEmail(`${'a'.repeat(245)}@example.com`), false);
assert.equal(normalizeOptionalContactEmail(' owner@example.com '), 'owner@example.com');

console.log('Business contact email boundary tests passed.');
