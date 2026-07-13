#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    normalizePublicContactReferrer,
    normalizePublicContactSourcePath,
    preserveOptionalPublicContactCount,
} from '../../src/lib/publicContact/contactBoundary';

assert.equal(normalizePublicContactSourcePath('/contact?token=secret#private'), '/contact');
assert.equal(normalizePublicContactSourcePath('/tools/reports/abc?email=owner@example.com'), '/tools/reports/abc');
assert.equal(normalizePublicContactSourcePath('https://evil.example/path'), null);
assert.equal(normalizePublicContactSourcePath('//evil.example/path'), null);
assert.equal(normalizePublicContactSourcePath('contact'), null);

assert.equal(
    normalizePublicContactReferrer('https://www.menulist.ai/tools/reports?token=secret#private'),
    'https://www.menulist.ai/tools/reports',
);
assert.equal(normalizePublicContactReferrer('javascript:alert(1)'), null);
assert.equal(normalizePublicContactReferrer('not a url'), null);

assert.equal(preserveOptionalPublicContactCount(0), 0);
assert.equal(preserveOptionalPublicContactCount(12), 12);
assert.equal(preserveOptionalPublicContactCount(null), null);
assert.equal(preserveOptionalPublicContactCount(undefined), null);

process.stdout.write('Public contact persistence-boundary tests passed.\n');
