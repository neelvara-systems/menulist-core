import assert from 'node:assert/strict';

import { mergeSafeTiptapAttributes } from '../../src/lib/tiptap/safeAttributes';

const attackerAttributes = JSON.parse(`{
  "__proto__": {
    "data-inherited-canary": "present",
    "src": "x-invalid://canary",
    "onerror": "globalThis.__tiptapXss = true"
  }
}`) as Record<string, unknown>;

const merged = mergeSafeTiptapAttributes(
    { class: 'existing', style: 'color: #111111' },
    attackerAttributes,
    { class: 'safe', style: 'text-align: center' },
);

assert.equal(Object.getPrototypeOf(merged), Object.prototype);
assert.equal('onerror' in merged, false);
assert.equal('data-inherited-canary' in merged, false);
assert.equal(merged.src, undefined);
assert.equal(merged.class, 'existing safe');
assert.equal(merged.style, 'color: #111111; text-align: center');

console.log('Tiptap attribute security boundary tests passed.');
