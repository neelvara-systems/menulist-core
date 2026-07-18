#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function walk(directory, predicate) {
  const absoluteDirectory = path.join(ROOT, directory);
  const results = [];
  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const relPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(relPath, predicate));
    } else if (predicate(relPath)) {
      results.push(relPath);
    }
  }
  return results;
}

const appSourceFiles = walk('src/app', (relPath) => /\.(?:ts|tsx)$/.test(relPath));
for (const relPath of appSourceFiles) {
  const content = read(relPath);
  assert(!/maximumScale\s*:\s*1\b/.test(content), `${relPath} must not disable browser zoom`);
  assert(!/userScalable\s*:\s*false\b/.test(content), `${relPath} must not disable browser zoom`);
}

const rawImageFiles = [
  ...walk('src/app', (relPath) => relPath.endsWith('.tsx')),
  ...walk('src/components', (relPath) => relPath.endsWith('.tsx')),
];
const imagesWithoutAlt = [];
for (const relPath of rawImageFiles) {
  const source = read(relPath);
  const sourceFile = ts.createSourceFile(relPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (node.tagName.getText(sourceFile) === 'img') {
        const hasAlt = node.attributes.properties.some(
          (attribute) => ts.isJsxAttribute(attribute) && attribute.name.text === 'alt',
        );
        if (!hasAlt) {
          imagesWithoutAlt.push(`${relPath}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}
assert(imagesWithoutAlt.length === 0, `raw images require alt text:\n${imagesWithoutAlt.join('\n')}`);

const mobilePrimitives = read('src/components/mobile/antd.tsx');
[
  "minWidth: fill === 'none' ? 44 : undefined",
  "role={onClick ? 'button' : undefined}",
  'tabIndex={onClick ? 0 : undefined}',
  "event.key !== 'Enter' && event.key !== ' '",
  'aria-label={ariaLabel}',
  "backLabel = 'Back'",
].forEach((token) => assert(mobilePrimitives.includes(token), `mobile primitive boundary must include ${token}`));

const layoutWrapper = read('src/components/antdComponent/layoutWrapper/index.tsx');
assert(layoutWrapper.includes('<SkipToContentLink />'), 'owner shell must expose skip navigation');
assert(layoutWrapper.includes('id="main-content"'), 'owner shell must expose a main-content target');
assert(layoutWrapper.includes('<button'), 'desktop-to-mobile return control must use a native button');

const websiteLayout = read('src/app/(website)/layout.tsx');
assert(websiteLayout.includes('<SkipToContentLink />'), 'website shell must expose skip navigation');

const accessibilityStyles = read('public/styles/base/_accessibility.scss');
assert(accessibilityStyles.includes(':focus-visible'), 'global focus-visible treatment must exist');
assert(accessibilityStyles.includes('@media (prefers-reduced-motion: reduce)'), 'global reduced-motion treatment must exist');

const onboardingModal = read('src/components/website/pricing-pages/OnboardingModal.tsx');
assert(!/<span[^>]+onClick=/.test(onboardingModal), 'website sign-in control must not be a clickable span');

const mobileSources = walk('src/components/mobile', (relPath) => relPath.endsWith('.tsx'));
for (const relPath of mobileSources) {
  assert(!/minHeight\s*:\s*['"]auto['"]/.test(read(relPath)), `${relPath} must not override the shared touch-target height`);
}

const docs = [
  '__docs__/global-accessibility/README.md',
  '__docs__/global-accessibility/global-accessibility_spec.md',
  '__docs__/global-accessibility/global-accessibility_impl.md',
  '__docs__/global-accessibility/global-accessibility_firebase.md',
  '__docs__/global-accessibility/global-accessibility_mobile-support.md',
  '__docs__/global-accessibility/global-accessibility_test-cases.md',
  '__docs__/global-accessibility/global-accessibility_verification.md',
];
docs.forEach((relPath) => assert(fs.existsSync(path.join(ROOT, relPath)), `${relPath} must exist`));

console.log('Global accessibility source boundary passed.');
