import assert from 'node:assert/strict';
import TIMEZONES_LIST from '../../src/data/timeZones';

const codes = new Set<string>();
const labels = new Set<string>();

for (const [index, entry] of TIMEZONES_LIST.entries()) {
    assert.equal(typeof entry.label, 'string', `timezone ${index} must have a label`);
    assert(entry.label.trim(), `timezone ${index} label must not be empty`);
    assert.equal(typeof entry.tzCode, 'string', `timezone ${index} must have a code`);
    assert(entry.tzCode.trim(), `timezone ${index} code must not be empty`);
    assert.equal(codes.has(entry.tzCode), false, `duplicate timezone code ${entry.tzCode}`);
    assert.equal(labels.has(entry.label), false, `duplicate timezone label ${entry.label}`);
    codes.add(entry.tzCode);
    labels.add(entry.label);
    assert.doesNotThrow(
        () => new Intl.DateTimeFormat('en-US', { timeZone: entry.tzCode }).format(0),
        `pinned Node runtime must support timezone ${entry.tzCode}`,
    );
}

assert.equal(codes.has('UTC'), true, 'the canonical UTC fallback must be selectable');
assert.equal(codes.has('Asia/Kolkata'), true);
assert.equal(codes.has('Europe/Zaporizhzhia'), false);
assert.equal(codes.has('Europe/Zaporozhye'), true);

console.log(`Timezone catalog regression passed for ${TIMEZONES_LIST.length} entries.`);
