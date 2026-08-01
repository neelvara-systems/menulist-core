import assert from 'node:assert/strict';

import { AnswerlatticePublicContactRequestSchema } from '../../src/lib/answerlattice/publicContactContracts';
import {
    normalizePublicContactReferrer,
    normalizePublicContactSourcePath,
} from '../../src/lib/publicContact/contactBoundary';

const validRequest = {
    name: '  <b>Owner Name</b>  ',
    workEmail: 'Owner@Example.COM',
    phoneNumber: ' <span>+91 99999 99999</span> ',
    productUrl: 'https://example.com/product',
    helpTopic: 'demo',
    message: '<p>We need governed support answers.</p>',
    consent: true,
    sourcePath: ' /contact ',
    website: '',
};

assert.deepEqual(AnswerlatticePublicContactRequestSchema.parse(validRequest), {
    ...validRequest,
    name: 'Owner Name',
    workEmail: 'owner@example.com',
    phoneNumber: '+91 99999 99999',
    message: 'We need governed support answers.',
    sourcePath: '/contact',
});

for (const invalidRequest of [
    { ...validRequest, name: '<b></b>' },
    { ...validRequest, message: '<p></p><span></span>' },
    { ...validRequest, productUrl: 'javascript:alert(1)' },
    { ...validRequest, productUrl: 'not a URL' },
    { ...validRequest, consent: false },
    { ...validRequest, unexpected: true },
]) {
    assert.equal(AnswerlatticePublicContactRequestSchema.safeParse(invalidRequest).success, false);
}

assert.equal(AnswerlatticePublicContactRequestSchema.safeParse({
    ...validRequest,
    phoneNumber: ' <b></b> ',
    productUrl: null,
}).success, true);

assert.equal(normalizePublicContactSourcePath('/contact?token=secret#private'), '/contact');
assert.equal(normalizePublicContactSourcePath('https://attacker.example/contact'), null);
assert.equal(normalizePublicContactSourcePath('//attacker.example/contact'), null);
assert.equal(normalizePublicContactSourcePath('/contact%5c..%5cprivate'), null);
assert.equal(
    normalizePublicContactReferrer('https://answerlattice.com/contact?token=secret#private'),
    'https://answerlattice.com/contact',
);
assert.equal(normalizePublicContactReferrer('javascript:alert(1)'), null);

process.stdout.write('Answerlattice public contact contracts passed.\n');
