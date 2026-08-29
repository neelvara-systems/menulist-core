import assert from 'node:assert/strict';
import {
    buildMenuListEmulatorConnectSources,
    resolveMenuListEmulatorPorts,
} from '../../src/lib/firebase/menuListEmulatorPorts';

assert.deepEqual(resolveMenuListEmulatorPorts({}), {
    auth: 9099,
    firestore: 8080,
    storage: 9199,
});
assert.deepEqual(resolveMenuListEmulatorPorts({
    auth: '9101',
    firestore: '8181',
    storage: '9201',
}), {
    auth: 9101,
    firestore: 8181,
    storage: 9201,
});
assert.deepEqual(buildMenuListEmulatorConnectSources({
    auth: 9101,
    firestore: 8181,
    storage: 9201,
}), [
    'http://127.0.0.1:9101',
    'http://localhost:9101',
    'http://127.0.0.1:8181',
    'http://localhost:8181',
    'http://127.0.0.1:9201',
    'http://localhost:9201',
]);
assert.deepEqual(resolveMenuListEmulatorPorts({ auth: ' 9102 ' }), {
    auth: 9102,
    firestore: 8080,
    storage: 9199,
});

for (const value of ['0', '65536', '-1', '9.5', 'port', '9099/path']) {
    assert.throws(
        () => resolveMenuListEmulatorPorts({ auth: value }),
        /Invalid MenuList Auth emulator port/,
        value,
    );
}

console.log('MenuList emulator port boundary tests passed.');
