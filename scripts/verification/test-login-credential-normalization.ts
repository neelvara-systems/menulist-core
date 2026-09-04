import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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

const loginPageSource = fs.readFileSync(
    path.join(process.cwd(), 'src/components/templates/loginPage/index.tsx'),
    'utf8',
);
assert.match(
    loginPageSource,
    /<Text[^>]*>Having trouble signing in\?<\/Text>/,
    'sign-in recovery guidance must explain the problem in owner language',
);
assert.match(
    loginPageSource,
    /<Button[^>]*onClick=\{openProductHelp\}[^>]*>Get help<\/Button>/,
    'sign-in recovery guidance must provide a working help action',
);
assert.match(loginPageSource, /placeholder="name@example\.com, phone number, or staff ID"/);
assert.match(loginPageSource, />Continue<\/Button>/);
assert.doesNotMatch(
    loginPageSource,
    /<Input\.Password\b/,
    'login and account-claim secrets must not use the pointer-only Ant password toggle',
);
assert.match(loginPageSource, /aria-label=\{visibilityLabel\}/);
assert.match(loginPageSource, /aria-pressed=\{passwordVisible\}/);
assert.match(loginPageSource, /passwordVisible \? 'Hide password' : 'Show password'/);

console.log('Login credential normalization tests passed.');
