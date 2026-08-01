#!/usr/bin/env ts-node

import assert = require('node:assert/strict');
import {
    isBlockedServerNetworkTarget,
    isPrivateServerIpv4Address,
    isPrivateServerIpv6Address,
} from '@lib/security/serverNetworkTarget';
import {
    isBlockedNetworkTarget,
    isPrivateIpv4Address,
    isPrivateIpv6Address,
} from '../../functions-answerlattice/src/utils/networkTarget';

const blockedIpv4 = [
    '0.0.0.1',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.0.0.1',
    '192.0.2.1',
    '192.168.0.1',
    '198.18.0.1',
    '198.51.100.1',
    '203.0.113.1',
    '224.0.0.1',
];
for (const address of blockedIpv4) {
    assert.equal(isPrivateServerIpv4Address(address), true, `root must block ${address}`);
    assert.equal(isPrivateIpv4Address(address), true, `Functions must block ${address}`);
    assert.equal(isBlockedServerNetworkTarget(address), true);
    assert.equal(isBlockedNetworkTarget(address), true);
}
assert.equal(isPrivateServerIpv4Address('8.8.8.8'), false);
assert.equal(isPrivateIpv4Address('8.8.8.8'), false);

const blockedIpv6 = [
    '::',
    '::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    'fc00::1',
    'fd00::1',
    'fe90::1',
    'febf::1',
    'ff02::1',
    '2001:db8::1',
    '2002::1',
    '3fff::1',
    '2001:::1',
];
for (const address of blockedIpv6) {
    assert.equal(isPrivateServerIpv6Address(address), true, `root must block ${address}`);
    assert.equal(isPrivateIpv6Address(address), true, `Functions must block ${address}`);
    assert.equal(isBlockedServerNetworkTarget(address), true);
    assert.equal(isBlockedNetworkTarget(address), true);
}
assert.equal(isPrivateServerIpv6Address('2001:4860:4860::8888'), false);
assert.equal(isPrivateIpv6Address('2001:4860:4860::8888'), false);

process.stdout.write('Server network target boundary tests passed.\n');
