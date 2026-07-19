import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    ANSWERLATTICE_TRANSLATED_CONTENT_MAX_CHARS,
    ANSWERLATTICE_TRANSLATION_SOURCE_HASH_PATTERN,
    AnswerlatticeTranslationProviderOutputError,
    buildAnswerlatticeTranslationDraftContent,
    getAnswerlatticeArticleTranslationSource,
    getAnswerlatticeTranslationDraftWriteBlockReason,
    parseAnswerlatticeTranslationProviderOutput,
} from '../../src/lib/answerlattice/articleTranslationServer';
import {
    getAnswerlatticeArticleTranslationState,
    isAnswerlatticeArticleTranslationApproved,
} from '../../src/lib/answerlattice/articleTranslationContracts';

const source = getAnswerlatticeArticleTranslationSource({
    title: 'Connect Slack',
    content: {
        type: 'doc',
        content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: 'Open settings and select Connect.' }],
        }],
    },
});
assert.equal(source.title, 'Connect Slack');
assert.equal(source.plainContent, 'Open settings and select Connect.');
assert.match(source.sourceHash, ANSWERLATTICE_TRANSLATION_SOURCE_HASH_PATTERN);
assert.equal(
    getAnswerlatticeArticleTranslationSource({
        title: 'Connect Slack',
        content: 'Open settings and select Connect.',
    }).sourceHash,
    source.sourceHash,
    'equivalent source text must produce a stable source fingerprint',
);
assert.notEqual(
    getAnswerlatticeArticleTranslationSource({
        title: 'Connect Slack',
        content: 'Open integrations and select Connect.',
    }).sourceHash,
    source.sourceHash,
    'a source edit must change the translation fingerprint',
);

assert.deepEqual(
    parseAnswerlatticeTranslationProviderOutput(
        '```json\n{"translatedTitle":"Conectar Slack","translatedContent":"Abre la configuracion."}\n```',
    ),
    {
        translatedTitle: 'Conectar Slack',
        translatedContent: 'Abre la configuracion.',
    },
);
for (const invalidOutput of [
    'not json',
    '{"translatedTitle":"Title"}',
    '{"translatedTitle":"Title","translatedContent":"Body","extra":"not allowed"}',
    JSON.stringify({
        translatedTitle: 'Title',
        translatedContent: 'x'.repeat(ANSWERLATTICE_TRANSLATED_CONTENT_MAX_CHARS + 1),
    }),
]) {
    assert.throws(
        () => parseAnswerlatticeTranslationProviderOutput(invalidOutput),
        AnswerlatticeTranslationProviderOutputError,
        'malformed, partial, extra, or oversized provider output must fail closed',
    );
}

assert.deepEqual(
    buildAnswerlatticeTranslationDraftContent('First paragraph.\n\nSecond paragraph.'),
    {
        type: 'doc',
        content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'First paragraph.' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'Second paragraph.' }] },
        ],
    },
);
assert.equal(
    getAnswerlatticeTranslationDraftWriteBlockReason({
        currentSourceHash: source.sourceHash,
        expectedSourceHash: 'changed',
        existingTranslation: undefined,
    }),
    'source_changed',
);
assert.equal(
    getAnswerlatticeTranslationDraftWriteBlockReason({
        currentSourceHash: source.sourceHash,
        expectedSourceHash: source.sourceHash,
        existingTranslation: { status: 'draft' },
    }),
    'translation_exists',
);
assert.equal(
    getAnswerlatticeTranslationDraftWriteBlockReason({
        currentSourceHash: source.sourceHash,
        expectedSourceHash: source.sourceHash,
        existingTranslation: undefined,
    }),
    null,
);

const draft = {
    status: 'draft',
    translatedBy: 'ai',
} as any;
const incompleteApproval = {
    status: 'approved',
    translatedBy: 'human',
} as any;
const approved = {
    status: 'approved',
    translatedBy: 'human',
    reviewedBy: 'reviewer',
    reviewedAt: { seconds: 1 },
} as any;
assert.equal(getAnswerlatticeArticleTranslationState(draft), 'draft');
assert.equal(isAnswerlatticeArticleTranslationApproved(incompleteApproval), false);
assert.equal(isAnswerlatticeArticleTranslationApproved(approved), true);

const repoRoot = path.resolve(__dirname, '../..');
const routeSource = fs.readFileSync(
    path.join(repoRoot, 'src/app/api/answerlattice/translate/route.ts'),
    'utf8',
);
const publicBoundarySource = fs.readFileSync(
    path.join(repoRoot, 'src/lib/answerlattice/publicContentBoundary.ts'),
    'utf8',
);
assert.match(routeSource, /failClosedOnProviderError:\s*true/);
assert.match(routeSource, /import \{ PRODUCT_IDS \} from '@constant\/product';/);
assert.equal(
    (routeSource.match(/pId !== PRODUCT_IDS\.ANSWERLATTICE/g) || []).length,
    2,
    'initial and transaction-current article reads must require the Answerlattice product identity',
);
assert.match(
    routeSource,
    /if \(safeModeResponse\) \{[\s\S]*return translationJson\([\s\S]*SAFE_MODE_ACTIVE/,
    'safe-mode responses must preserve the translation route private response contract',
);
assert.match(routeSource, /db\.runTransaction/);
assert.match(routeSource, /new admin\.firestore\.FieldPath\('translations', targetLocale\)/);
assert.match(routeSource, /status:\s*'draft'/);
assert.match(routeSource, /sourceHash/);
assert.match(routeSource, /TRANSLATION_SOURCE_CHANGED/);
assert.match(routeSource, /TRANSLATION_ALREADY_EXISTS/);
assert.doesNotMatch(routeSource, /bumpAnswerlatticeCacheVersionAdmin/);
assert.doesNotMatch(routeSource, /use raw response as content/i);
assert.doesNotMatch(
    publicBoundarySource,
    /translations\s*:/,
    'customer public-content projection must not expose translation drafts',
);

console.log('Answerlattice multi-language draft contracts passed.');
