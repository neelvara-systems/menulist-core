import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    ANSWERLATTICE_PRE_ONBOARDING_MARKDOWN_RESPONSE_HEADERS,
    ANSWERLATTICE_PRE_ONBOARDING_TOOL_KEYS,
    renderAnswerlatticePreOnboardingAgentGuide,
    renderAnswerlatticePreOnboardingOwnerGuide,
    renderAnswerlatticePreOnboardingPrompt,
    renderAnswerlatticePreOnboardingToolPrompt,
} from '../../src/lib/answerlattice/preOnboardingPrompt';
import {
    ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS,
    ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE,
} from '../../src/types/answerlattice';

const prompt = renderAnswerlatticePreOnboardingPrompt();
const ownerGuide = renderAnswerlatticePreOnboardingOwnerGuide();
const agentGuide = renderAnswerlatticePreOnboardingAgentGuide();
const publicPageSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/app/sites/answerlattice/pre-onboarding/page.tsx'),
    'utf8',
);
const publicGuideSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/app/sites/answerlattice/pre-onboarding/guide/page.tsx'),
    'utf8',
);
const activationCommandCenterSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/templates/answerlattice/activation/AnswerlatticeActivationCommandCenter.tsx'),
    'utf8',
);

const sourceModes = [
    'repo_and_website',
    'multi_product_repo',
    'website_only',
    'docs_only',
    'owner_notes_only',
    'mixed',
];
sourceModes.forEach(mode => {
    assert.equal(prompt.includes(`\`${mode}\``), true, `master prompt must preserve ${mode} source mode`);
});

const requiredSourceLines = prompt
    .split('\n')
    .filter(line => /^\d{2}-[^ ]/.test(line));
assert.equal(requiredSourceLines.length, 26, 'master prompt must define exactly 26 source families');
assert.deepEqual(
    requiredSourceLines.map(line => line.slice(0, 2)),
    Array.from({ length: 26 }, (_, index) => String(index + 1).padStart(2, '0')),
    'source family numbering must remain complete and ordered',
);
assert.equal(
    requiredSourceLines.length <= ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS.MAX_SOURCES_PER_JOB,
    true,
    'the standard package must fit one Knowledge Intake job',
);

assert.equal(
    prompt.includes(`no source exceeds ${ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS.MAX_SOURCE_TEXT_CHARS} characters`),
    true,
    'prompt source size must match the runtime text cap',
);
assert.equal(
    prompt.includes(`no more than ${ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS.MAX_SOURCES_PER_JOB} upload sources`),
    true,
    'prompt source count must match the runtime job cap',
);
Object.values(ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE).forEach(sourceType => {
    assert.equal(prompt.includes(`\`${sourceType}\``), true, `prompt must list supported source type ${sourceType}`);
});

assert.equal(prompt.includes('- originUrl when a source is one selected public HTTP(S) page'), true);
assert.equal(/^- sourceUrls\b/m.test(prompt), false, 'strict add-source payloads must not recommend the rejected sourceUrls field');
assert.equal(prompt.includes('Use singular `originUrl`, never `sourceUrls`.'), true);
assert.equal(prompt.includes('API-ready non-website source, include the reviewed source body in `contentText`'), true);
assert.equal(prompt.includes('Raw screenshot, audio, and video files use the authenticated Knowledge Intake media upload flow'), true);
assert.equal(prompt.includes('do not invent `pId`, `tId`, or `sId`'), true, 'authenticated tenant identity must not be client-authored');

[
    'metadata.authority',
    'metadata.approvalStatus',
    'metadata.accessScope',
    'metadata.citationEligibility',
    'metadata.applicability',
    'metadata.conflictsWith',
].forEach(field => {
    assert.equal(prompt.includes(field), true, `payload skeleton must preserve ${field}`);
});
assert.equal(prompt.includes('support records are signals, not approved truth'), true);
assert.equal(prompt.includes('Never expose a private source URL or private source text as a public citation'), true);
assert.equal(prompt.includes('AI_TOOL_PRIVATE_SOURCE_PERMISSION'), true);
assert.equal(ownerGuide.includes('AI_TOOL_PRIVATE_SOURCE_PERMISSION'), true);
assert.equal(ownerGuide.includes('Do not let it change product code or source documentation'), true);
assert.equal(agentGuide.includes('Do not modify the client product, source documentation, policies, or production data'), true);
assert.equal(agentGuide.includes('A connected source is evidence, not automatically approved truth'), true);
assert.equal(publicGuideSource.includes("'AI_TOOL_PRIVATE_SOURCE_PERMISSION'"), true);
assert.equal(publicGuideSource.includes('treat them as signals, not approved truth'), true);
assert.equal(publicGuideSource.includes('must not be exposed through public citations'), true);
assert.equal(publicPageSource.includes('No private-source processing without permission'), true);
assert.equal(publicPageSource.includes('No ticket, chat, macro, or repeated reply becomes approved truth without review.'), true);
assert.equal(
    activationCommandCenterSource.includes("group.key === 'product-knowledge' && group.status !== 'complete'"),
    true,
    'activation prompt entry must remain limited to incomplete product knowledge',
);
assert.equal(
    activationCommandCenterSource.includes('Prepare your product inputs with one prompt'),
    true,
    'activation must explain the single-prompt preparation path',
);
assert.equal(
    activationCommandCenterSource.includes('promptUrl="/sites/answerlattice/pre-onboarding.md"'),
    true,
    'activation must reuse the existing same-origin prompt route',
);
assert.equal(
    activationCommandCenterSource.includes('directPromptUrl="https://answerlattice.com/pre-onboarding.md"'),
    true,
    'activation must display the canonical public prompt URL',
);
assert.equal(
    activationCommandCenterSource.includes('Review privacy, accuracy, and product boundaries before using the Knowledge Intake action below.'),
    true,
    'activation must preserve owner review before Knowledge Intake',
);

assert.deepEqual(ANSWERLATTICE_PRE_ONBOARDING_MARKDOWN_RESPONSE_HEADERS, {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    'X-Content-Type-Options': 'nosniff',
});

assert.deepEqual(
    ANSWERLATTICE_PRE_ONBOARDING_TOOL_KEYS,
    ['codex', 'cursor', 'claude-code', 'replit', 'lovable'],
    'the documented tool wrapper set must remain explicit',
);
ANSWERLATTICE_PRE_ONBOARDING_TOOL_KEYS.forEach(tool => {
    const toolPrompt = renderAnswerlatticePreOnboardingToolPrompt(tool);
    assert.equal(toolPrompt.endsWith(prompt), true, `${tool} wrapper must embed the complete shared prompt`);
    assert.equal(toolPrompt.includes('not a product integration or endorsement'), true);
});

process.stdout.write('Answerlattice Pre-Onboarding contracts passed.\n');
