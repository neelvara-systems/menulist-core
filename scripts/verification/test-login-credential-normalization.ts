import assert from 'node:assert/strict';
import {
    normalizeCredentialLoginIdentifier,
    normalizeCredentialLoginPassword,
} from '../../src/lib/auth/loginIdentifiers';

assert.equal(
    normalizeCredentialLoginIdentifier('  MenuList.QA.Owner.A@Neelvara.com\t'),
    'menulist.qa.owner.a@neelvara.com',
);
assert.equal(normalizeCredentialLoginIdentifier('  S-123456  '), 's-123456');
assert.equal(normalizeCredentialLoginIdentifier(null), '');

assert.equal(normalizeCredentialLoginPassword('  MenuListQA2026!\n'), 'MenuListQA2026!');
assert.equal(normalizeCredentialLoginPassword('  Menu List QA  '), 'Menu List QA');
assert.equal(normalizeCredentialLoginPassword(null), '');

console.log('Login credential normalization tests passed.');
