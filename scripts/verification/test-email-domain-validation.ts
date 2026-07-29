import assert from 'node:assert/strict';
import {
    getEmailValidationError,
    isEmailAllowed,
    validateEmail,
} from '../../src/lib/validation/emailDomainValidator';
import {
    getEmailDomain,
    isDisposableEmail,
} from '../../src/lib/validation/disposableEmailDomains';
import disposableDomains from '../../src/lib/validation/disposable-domains-full.json';
import { validateDisposableDomainArtifact } from '../update-disposable-email-domains';

const canonicalDisposableDomainPattern = /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/;
assert.ok(disposableDomains.length > 70_000);
assert.equal(new Set(disposableDomains).size, disposableDomains.length);
for (const domain of disposableDomains) {
    assert.equal(typeof domain, 'string');
    assert.equal(domain, domain.trim().toLowerCase());
    assert.equal(domain.length <= 253, true);
    assert.equal(domain.includes('.') && !domain.includes('..'), true);
    assert.equal(canonicalDisposableDomainPattern.test(domain), true);
}
assert.equal(
    validateDisposableDomainArtifact(disposableDomains).length,
    disposableDomains.length,
);
assert.throws(
    () => validateDisposableDomainArtifact(disposableDomains.slice(0, 9_999)),
    /at least 10000 entries/,
);
assert.throws(
    () => validateDisposableDomainArtifact([
        ...disposableDomains.slice(0, -1),
        disposableDomains.at(-2),
    ]),
    /sorted with no duplicate entries/,
);
assert.throws(
    () => validateDisposableDomainArtifact([
        ...disposableDomains.slice(0, -1),
        'INVALID.example',
    ]),
    /invalid entry/,
);

assert.equal(getEmailDomain(' Owner@Example.COM '), 'example.com');
assert.equal(getEmailDomain('owner@@example.com'), null);
assert.equal(getEmailDomain('@example.com'), null);
assert.equal(getEmailDomain('owner@'), null);

assert.equal(isDisposableEmail('owner@mailinator.com'), true);
assert.equal(isDisposableEmail('owner@sub.mailinator.com'), true);
assert.equal(isDisposableEmail('owner@gmail.com'), false);

for (const email of [
    'owner@contest.com',
    'owner@latest.example.net',
    'owner@locality.org',
]) {
    assert.deepEqual(validateEmail(email), {
        valid: true,
        domain: email.split('@')[1],
    });
}

for (const email of [
    'owner@example.com',
    'owner@sub.example.org',
    'owner@business.test',
    'owner@business.local',
    'owner@sub.mailinator.com',
    'owner@-leading.example',
    'owner@trailing-.example',
    'owner@under_score.example',
    'owner@example.12',
    `owner@${'a'.repeat(64)}.example`,
    `owner@${'a'.repeat(250)}.com`,
    `${'a'.repeat(65)}@example.com`,
]) {
    assert.equal(isEmailAllowed(email), false, `${email} must be rejected`);
    assert.notEqual(getEmailValidationError(email), '');
}

assert.equal(isEmailAllowed('owner@xn--bcher-kva.example'), true);
assert.equal(isEmailAllowed('owner@@example.com'), false);

process.stdout.write('Email domain validation tests passed.\n');
