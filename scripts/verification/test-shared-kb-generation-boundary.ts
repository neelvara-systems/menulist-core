import assert from 'node:assert/strict';
import {
    normalizeProcessedKBData,
    normalizeVector,
} from '../../functions/src/utils';

const paragraph = (text: string) => ({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

const validPayload = JSON.stringify(Object.fromEntries([
    ['__proto__', {
        id: '__proto__',
        title: 'Getting started',
        articles: [
            { id: 'duplicate', title: 'Install', content: paragraph('Install the widget.') },
            { id: 'duplicate', title: 'Configure', content: paragraph('Configure the workspace.') },
        ],
    }],
    ['second', {
        id: 'second',
        title: 'Billing',
        sections: [{
            title: 'Invoices',
            articles: [{ title: 'Download invoice', content: paragraph('Open Billing and select Download.') }],
        }],
    }],
]));

const first = normalizeProcessedKBData(validPayload);
const second = normalizeProcessedKBData(validPayload);
assert.deepEqual(first, second, 'Fallback and duplicate IDs must be deterministic across replay.');
assert.equal(Object.getPrototypeOf(first), Object.prototype, 'Normalized category maps must retain a plain prototype.');
assert.equal(Object.prototype.hasOwnProperty.call(first, '__proto__'), false, 'Reserved object keys must not survive normalization.');
assert.deepEqual(
    Object.values(first).flatMap(category => [
        ...(category.articles || []).map(article => article.id),
        ...(category.sections || []).flatMap(section => (section.articles || []).map(article => article.id)),
    ]),
    ['duplicate', 'duplicate-2', 'article-2-1-1'],
    'Article IDs must remain unique across the generated knowledge map.',
);

assert.throws(
    () => normalizeProcessedKBData(JSON.stringify({ invalid: { title: 'Mixed', articles: [{}], sections: [{}] } })),
    /cannot mix direct articles and sections/,
);
assert.throws(() => normalizeProcessedKBData('[]'), /invalid/);
assert.throws(() => normalizeProcessedKBData('{not-json}'), /invalid/);
assert.throws(() => normalizeProcessedKBData('x'.repeat(1024 * 1024 + 1)), /too large/);
assert.throws(
    () => normalizeProcessedKBData(JSON.stringify(Object.fromEntries(
        Array.from({ length: 21 }, (_, index) => [
            `category-${index}`,
            { title: `Category ${index}`, articles: [{ title: 'A', content: paragraph('Body') }] },
        ]),
    ))),
    /category count/,
);
assert.throws(
    () => normalizeProcessedKBData(JSON.stringify({
        invalid: {
            title: 'Invalid content',
            articles: [{ title: 'Unsafe', content: { type: 'doc', content: [{ type: 'script', text: 'x' }] } }],
        },
    })),
    /content is invalid/,
);

const normalizedVector = normalizeVector([3, 4]);
assert(Math.abs(normalizedVector[0] - 0.6) < Number.EPSILON);
assert(Math.abs(normalizedVector[1] - 0.8) < Number.EPSILON);
for (const invalid of [[], [0, 0], [Number.NaN], [Number.POSITIVE_INFINITY]]) {
    assert.throws(() => normalizeVector(invalid), /Embedding vector/);
}

console.log('Shared KB generation boundary tests passed.');
