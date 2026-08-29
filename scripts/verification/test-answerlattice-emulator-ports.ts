import assert from 'node:assert/strict';
import {
    buildAnswerlatticeEmulatorConnectSources,
    normalizeAnswerlatticeFirestoreEmulatorHost,
    resolveAnswerlatticeEmulatorPorts,
} from '../../src/lib/firebase/answerlatticeEmulatorPorts';

assert.deepEqual(resolveAnswerlatticeEmulatorPorts({}), {
    auth: 9099,
    firestore: 8080,
    functions: 5001,
    storage: 9199,
});
assert.deepEqual(resolveAnswerlatticeEmulatorPorts({
    auth: '9101',
    firestore: '8181',
    functions: '5101',
    storage: '9201',
}), {
    auth: 9101,
    firestore: 8181,
    functions: 5101,
    storage: 9201,
});
assert.deepEqual(buildAnswerlatticeEmulatorConnectSources({
    auth: 9101,
    firestore: 8181,
    functions: 5101,
    storage: 9201,
}), [
    'http://127.0.0.1:9101',
    'http://localhost:9101',
    'http://127.0.0.1:8181',
    'http://localhost:8181',
    'http://127.0.0.1:5101',
    'http://localhost:5101',
    'http://127.0.0.1:9201',
    'http://localhost:9201',
]);
assert.equal(normalizeAnswerlatticeFirestoreEmulatorHost('127.0.0.1:8181'), '127.0.0.1:8181');
assert.equal(normalizeAnswerlatticeFirestoreEmulatorHost(' localhost:8181 '), 'localhost:8181');
assert.equal(normalizeAnswerlatticeFirestoreEmulatorHost(undefined), null);

for (const value of ['0', '65536', '-1', '9.5', 'port', '8080/path']) {
    assert.throws(
        () => resolveAnswerlatticeEmulatorPorts({ firestore: value }),
        /Invalid Answerlattice Firestore emulator port/,
        value,
    );
}
for (const value of ['0.0.0.0:8181', 'example.com:8181', 'localhost', 'localhost:0', 'localhost:65536']) {
    assert.throws(
        () => normalizeAnswerlatticeFirestoreEmulatorHost(value),
        /Invalid Answerlattice Firestore emulator host/,
        value,
    );
}

console.log('Answerlattice emulator port boundary tests passed.');
