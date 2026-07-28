import assert from 'node:assert/strict';
import * as menuListTiptap from '../../functions/src/utils/tiptapUtils';
import * as answerlatticeTiptap from '../../functions-answerlattice/src/utils/tiptapUtils';

const implementations = [
    ['MenuList', menuListTiptap],
    ['Answerlattice', answerlatticeTiptap],
] as const;

const validDocument = {
    type: 'doc',
    content: [
        {
            type: 'paragraph',
            attrs: {
                provenance: {
                    sourceFile: ' gs://bucket/source.pdf ',
                    timestamp: 123,
                    privateField: 'must not cross the projector',
                },
            },
            content: [
                { type: 'text', text: 'Hello' },
                null,
                { type: 'text', text: 'world' },
            ],
        },
        {
            type: 'paragraph',
            attrs: {
                provenance: {
                    sourceFile: 'gs://bucket/source.pdf',
                    timestamp: 123,
                },
            },
            content: [{ type: 'text', text: 'Again' }],
        },
    ],
};

for (const [label, implementation] of implementations) {
    assert.equal(implementation.tiptapToText(validDocument), 'Hello  worldAgain', `${label} text projection`);
    assert.equal(implementation.tiptapToText(null), '', `${label} null projection`);
    assert.equal(implementation.tiptapToText({ type: 'text', text: 123 }), '', `${label} non-string text`);
    assert.doesNotThrow(() => implementation.tiptapToText({ type: 'doc', content: [null, 1, 'text'] }));

    assert.deepEqual(
        implementation.extractProvenance(validDocument),
        [{ sourceFile: 'gs://bucket/source.pdf', timestamp: 123 }],
        `${label} provenance projection and deduplication`,
    );
    assert.deepEqual(
        implementation.extractProvenance({
            attrs: { provenance: { sourceFile: '', timestamp: {}, secret: 'drop' } },
            content: [null, { attrs: { provenance: 'invalid' } }],
        }),
        [],
        `${label} malformed provenance rejection`,
    );
}

assert.equal(
    menuListTiptap.tiptapToText(validDocument),
    answerlatticeTiptap.tiptapToText(validDocument),
    'Functions bundles must preserve identical Tiptap text behavior',
);

console.log('Functions Tiptap boundary passed.');
