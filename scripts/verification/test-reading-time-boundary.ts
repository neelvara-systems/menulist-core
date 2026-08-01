import assert from 'node:assert/strict';
import {
    calculateReadingTimeFromTiptap,
    formatReadingTime,
    getReadingTime,
} from '@lib/readingTime';

const document = {
    type: 'doc',
    content: [
        { type: 'text', text: 'one two three' },
        { type: 'image' },
        { type: 'codeBlock', content: [{ type: 'text', text: 'const value = true' }] },
    ],
};
assert.equal(calculateReadingTimeFromTiptap(document), 3);
assert.equal(getReadingTime(document), '3 min read');

const cyclic: Record<string, unknown> = { type: 'doc' };
cyclic.content = [cyclic, { type: 'text', text: 'safe words' }];
assert.equal(calculateReadingTimeFromTiptap(cyclic), 1, 'cyclic documents must terminate');

const hostileNode = Object.defineProperty({}, 'type', {
    get() {
        throw new Error('hostile type getter');
    },
});
assert.doesNotThrow(() => calculateReadingTimeFromTiptap(hostileNode));
assert.equal(calculateReadingTimeFromTiptap(hostileNode), 1);

const hostileChildren = {
    type: 'doc',
    content: new Proxy([], {
        getOwnPropertyDescriptor() {
            throw new Error('hostile array');
        },
    }),
};
assert.equal(calculateReadingTimeFromTiptap(hostileChildren), 1);
assert.equal(formatReadingTime(Number.NaN), '< 1 min read');
assert.equal(formatReadingTime(Number.POSITIVE_INFINITY), '< 1 min read');
assert.equal(formatReadingTime(1.2), '2 min read');

console.log('Reading-time boundary tests passed.');
