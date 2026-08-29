import assert from 'node:assert/strict';
import { buildAnswerlatticeKnowledgeIntakeTiptapDoc } from '../../src/lib/answerlattice/knowledgeIntake';
import { renderPublicTiptapArticle } from '../../src/lib/answerlattice/publicRichText';

const document = buildAnswerlatticeKnowledgeIntakeTiptapDoc([
    '# MenuList Account Help',
    '',
    '**Verified:** Owners review prepared changes before publishing.',
    '',
    '- Upload a current menu.',
    '- Review every prepared item.',
    '- Publish only after approval.',
    '',
    'Open `Projects` or read [the setup guide](https://menulist.ai/help).',
    '',
    '```',
    '/projects',
    '```',
].join('\n'));

assert.equal(document.type, 'doc');
assert.deepEqual(
    document.content.map(node => node.type),
    ['heading', 'paragraph', 'bulletList', 'paragraph', 'codeBlock'],
    'Markdown-like intake material must become structured TipTap nodes',
);

const rendered = renderPublicTiptapArticle(document);
assert.match(rendered.safeHtml, /<h1 id="topic-menulist-account-help">MenuList Account Help<\/h1>/);
assert.match(rendered.safeHtml, /<strong>Verified:<\/strong>/);
assert.match(rendered.safeHtml, /<ul><li>/);
assert.match(rendered.safeHtml, /<code>Projects<\/code>/);
assert.match(rendered.safeHtml, /href="https:\/\/menulist\.ai\/help"/);
assert.match(rendered.safeHtml, /<pre><code>\/projects<\/code><\/pre>/);
assert.doesNotMatch(rendered.safeHtml, /\*\*Verified:\*\*|# MenuList Account Help/);

const articleBody = buildAnswerlatticeKnowledgeIntakeTiptapDoc([
    '# MenuList Account Help',
    '',
    '# Recovery',
    '',
    'Use the verified recovery flow.',
].join('\n'), 'MenuList Account Help');
assert.deepEqual(
    articleBody.content.map(node => ({
        type: node.type,
        level: node.attrs && typeof node.attrs === 'object' && 'level' in node.attrs
            ? node.attrs.level
            : undefined,
    })),
    [
        { type: 'heading', level: 2 },
        { type: 'paragraph', level: undefined },
    ],
    'The page owns the sole H1; a duplicate source title is removed and later H1 headings are demoted',
);

process.stdout.write('Answerlattice knowledge-intake rich-text tests passed.\n');
