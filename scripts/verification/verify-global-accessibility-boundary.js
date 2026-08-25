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
  'const isCloseIcon = isValidElement(backIcon) && backIcon.type === LuX',
  "const effectiveBackLabel = backLabel ?? (isCloseIcon ? localeText.close : 'Back')",
  'aria-label={effectiveBackLabel}',
].forEach((token) => assert(mobilePrimitives.includes(token), `mobile primitive boundary must include ${token}`));

const pricingComparison = read('src/components/website/pricing-pages/FeatureComparisonTable.tsx');
[
  'const [expandedFeatureId, setExpandedFeatureId] = useState<string | null>(null)',
  'aria-controls={descriptionId}',
  'aria-expanded={isDescriptionExpanded}',
  'onClick={() => setExpandedFeatureId((current) => current === feature.id ? null : feature.id)}',
  '<p id={descriptionId}',
  'className="flex min-h-11 items-center gap-2 cursor-help text-left"',
].forEach((token) => assert(pricingComparison.includes(token), `pricing comparison accessibility boundary must include ${token}`));

const unauthorizedPage = read('src/app/(global-pages)/unauthorized/page.tsx');
assert(
  !unauthorizedPage.includes('&apos;'),
  'global access-denied copy must not render encoded apostrophe text',
);
assert(
  unauthorizedPage.includes("You don't have permission to access this page."),
  'global access-denied primary recovery copy must remain readable',
);
assert(
  unauthorizedPage.includes("Make sure you're signed in with the correct account."),
  'global access-denied secondary recovery copy must remain readable',
);
assert(
  unauthorizedPage.includes("style={{ width: '100%', maxWidth: 560, padding: 0 }}"),
  'global access-denied result must stay within narrow mobile viewports',
);
assert(
  unauthorizedPage.includes('wrap="wrap"'),
  'global access-denied recovery actions must wrap on narrow mobile viewports',
);
assert(
  unauthorizedPage.includes("import { PLATFORM_URL } from '@constant/urls';"),
  'global access-denied recovery must use the environment-governed public website URL',
);
assert(
  unauthorizedPage.includes('onClick={() => window.location.assign(PLATFORM_URL)}'),
  'global access-denied home action must leave the owner-app host for the public website',
);
assert(
  !unauthorizedPage.includes('router.push(HOME_ROUTING)'),
  'global access-denied home action must not route into the protected owner dashboard',
);
assert(
  (unauthorizedPage.match(/style=\{\{ minHeight: 44 \}\}/g) || []).length === 2,
  'both global access-denied recovery actions must meet the 44px mobile touch target',
);
assert(
  unauthorizedPage.includes("style={{ width: 'clamp(128px, 40vw, 192px)' }}"),
  'global access-denied illustration must yield vertical space to recovery actions on small mobile viewports',
);
assert(
  unauthorizedPage.includes("style={{ boxSizing: 'border-box', minHeight: '100dvh', padding: 24 }}"),
  'global access-denied viewport shell must include safe padding inside the dynamic viewport height',
);
assert(
  unauthorizedPage.includes('<Flex gap={8} justify="center" wrap="wrap"'),
  'global access-denied recovery actions must use the compact mobile-safe gap',
);

const notFoundPage = read('src/app/(global-pages)/404/page.tsx');
assert(
  notFoundPage.includes("import { PLATFORM_URL } from '@constant/urls';"),
  'global not-found recovery must use the environment-governed public website URL',
);
assert(
  notFoundPage.includes('onClick={() => window.location.assign(PLATFORM_URL)}'),
  'global not-found home action must not route public surfaces into the protected owner dashboard',
);
assert(
  !notFoundPage.includes('router.push(HOME_ROUTING)'),
  'global not-found home action must not retain the owner-app-relative root',
);
assert(
  (notFoundPage.match(/style=\{\{ minHeight: 44 \}\}/g) || []).length === 2,
  'both global not-found recovery actions must meet the 44px mobile touch target',
);
assert(
  notFoundPage.includes("style={{ width: '100%', maxWidth: 560, padding: 0 }}"),
  'global not-found recovery actions must remain in the initial small-mobile viewport',
);
assert(
  notFoundPage.includes("style={{ width: 'clamp(128px, 40vw, 192px)' }}"),
  'global not-found illustration must yield vertical space to recovery actions on small mobile viewports',
);
assert(
  notFoundPage.includes("style={{ boxSizing: 'border-box', minHeight: '100dvh', padding: 24 }}"),
  'global not-found viewport shell must include safe padding inside the dynamic viewport height',
);

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
