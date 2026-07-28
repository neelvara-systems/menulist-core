import assert from 'node:assert/strict';

import { AnswerlatticePublicContactRequestSchema } from '../../src/lib/answerlattice/publicContactContracts';

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

process.stdout.write('Answerlattice public contact contracts passed.\n');
