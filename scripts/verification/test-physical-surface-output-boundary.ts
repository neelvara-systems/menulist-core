import assert from 'node:assert/strict';
import { normalizePhysicalSurfaceQrUrl } from '@lib/physical-surfaces/outputBoundary';

assert.equal(
    normalizePhysicalSurfaceQrUrl(' https://menu.example.com/client/store/menu '),
    'https://menu.example.com/client/store/menu',
);
assert.equal(
    normalizePhysicalSurfaceQrUrl('https://menu.example.com/menu?source=table'),
    'https://menu.example.com/menu?source=table',
);

for (const invalid of [
    '',
    'http://menu.example.com',
    'javascript:alert(1)',
    '/client/store/menu',
    'https://user:secret@menu.example.com',
    'x'.repeat(4_097),
    null,
    { url: 'https://menu.example.com' },
]) {
    assert.equal(normalizePhysicalSurfaceQrUrl(invalid), null);
}

console.log('Physical surface output boundary tests passed.');
