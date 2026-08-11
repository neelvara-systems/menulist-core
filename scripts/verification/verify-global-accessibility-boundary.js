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

function sourceHasJsxTag(relPath, expectedTagName) {
  const source = read(relPath);
  const sourceFile = ts.createSourceFile(
    relPath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let found = false;
  const visit = (node) => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      && node.tagName.getText(sourceFile) === expectedTagName
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
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

assert(
  sourceHasJsxTag('src/app/(website)/layout.tsx', 'SkipToContentLink'),
  'website shell must expose skip navigation',
);

[
  'src/components/website/features/FeaturesPage.tsx',
  'src/components/website/trust-security/TrustSecurityPage.tsx',
  'src/components/website/legal/PrivacyPolicyPage.tsx',
  'src/components/website/legal/TermsOfServicePage.tsx',
  'src/components/website/legal/RefundPolicyPage.tsx',
].forEach((relPath) => assert(
  sourceHasJsxTag(relPath, 'main'),
  `${relPath} must expose a main landmark for website skip navigation`,
));

const websiteHeader = read('src/components/website/Header.tsx');
[
  'aria-hidden={openDesktopMenu !== "features"}',
  'aria-hidden={openDesktopMenu !== "resources"}',
  'data-open={openDesktopMenu === "features" ? "true" : "false"}',
  'data-open={openDesktopMenu === "resources" ? "true" : "false"}',
  'inert={openDesktopMenu !== "features" ? true : undefined}',
  'inert={openDesktopMenu !== "resources" ? true : undefined}',
  'current === "features" ? null : "features"',
  "querySelector<HTMLElement>('[aria-controls]')",
  'window.requestAnimationFrame(() => trigger?.focus())',
  'aria-label={isOpen ? t("Header.closeMenu") : t("Header.openMenu")}',
  'aria-labelledby="ws-mobile-navigation-title"',
  'id="ws-mobile-navigation-title"',
].forEach((token) => assert(
  websiteHeader.includes(token),
  `website dropdown accessibility boundary must include ${token}`,
));
assert(
  !websiteHeader.includes('aria-label={t("Header.featuresMenuAria")}'),
  'website Features trigger must use its visible label in both collapsed and expanded states',
);
assert(
  !websiteHeader.includes('aria-label={t("Header.resourcesMenuAria")}'),
  'website Resources trigger must use its visible label in both collapsed and expanded states',
);
assert(
  !websiteHeader.includes('import { signOutSession } from "@lib/auth/client";'),
  'public website header must not statically load the authenticated Firebase sign-out chain',
);
assert(
  websiteHeader.includes('await import("@lib/auth/client")'),
  'public website header must lazy-load authenticated sign-out only when requested',
);

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
