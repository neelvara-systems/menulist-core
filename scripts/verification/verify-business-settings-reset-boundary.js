#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MAIN_APP_ROOT = path.join(ROOT, 'src/components/templates/main-app');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

function collectTsxFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(absolutePath);
    return entry.isFile() && entry.name.endsWith('.tsx') ? [absolutePath] : [];
  });
}

const packageJson = JSON.parse(read('package.json'));
const businessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
const implementation = read('__docs__/official-business-page/official-business-page_impl.md');
const changelog = read('__docs__/changelog.md');

assert(
  packageJson.scripts['verify:business-settings-reset-boundary']
    === 'node scripts/verification/verify-business-settings-reset-boundary.js',
  'package.json must expose verify:business-settings-reset-boundary',
);

assertIncludes(businessSettings, 'const feedbackDraft = getFeedbackSettingsDraft(storeDetails);', 'Business Settings persisted feedback Reset draft');
assertIncludes(businessSettings, 'const socialMediaDraft = sanitizeSocialMediaMap(storeDetails?.socialMedia);', 'Business Settings persisted social Reset draft');
assertIncludes(businessSettings, 'const workingHoursDraft = buildWorkingHourSlots(storeDetails?.workingHours);', 'Business Settings persisted working-hours Reset draft');
assertIncludes(businessSettings, 'setFeedbackEnabled(feedbackDraft.feedbackEnabled);', 'Business Settings feedback enablement Reset');
assertIncludes(businessSettings, 'setFeedbackDefaults(feedbackDraft.feedbackDefaults);', 'Business Settings feedback defaults Reset');
assertIncludes(businessSettings, 'setReviewUrl(feedbackDraft.reviewUrl);', 'Business Settings feedback review URL Reset');
assertIncludes(businessSettings, 'setSocialMedia(socialMediaDraft);', 'Business Settings social-media Reset');
assertIncludes(businessSettings, 'setWorkingHours(workingHoursDraft);', 'Business Settings working-hours Reset');
assertIncludes(businessSettings, 'setWorkingHoursDirty(false);', 'Business Settings working-hours dirty Reset');
assertIncludes(businessSettings, 'setWorkingHoursDirtyDays([]);', 'Business Settings working-hours dirty-day Reset');
assertIncludes(businessSettings, 'function preventBusinessSettingsPickerEnterSubmit(', 'Business Settings picker Enter guard');
assertIncludes(businessSettings, "if (!event.target.closest('.ant-picker')) return;", 'Business Settings picker-only Enter guard');
assertIncludes(businessSettings, 'event.preventDefault();', 'Business Settings picker Enter submit prevention');
assertIncludes(businessSettings, 'onKeyDown={preventBusinessSettingsPickerEnterSubmit}', 'Business Settings form picker Enter guard wiring');
assertIncludes(implementation, 'Desktop Business Settings Reset boundary', 'Business Settings Reset implementation documentation');
assertIncludes(changelog, 'Business Settings Controlled-Draft Reset Boundary', 'Business Settings Reset changelog evidence');

const mainAppFiles = collectTsxFiles(MAIN_APP_ROOT);
const detachedFeedbackFiles = mainAppFiles.filter((absolutePath) => {
  const source = fs.readFileSync(absolutePath, 'utf8');
  const antImports = [...source.matchAll(/import\s*{([^}]*)}\s*from ['"]antd['"]/g)].map((match) => match[1]);
  return antImports.some((imports) => /\bmessage\b/.test(imports))
    && /\bmessage\.(success|error|warning|info)\(/.test(source);
});
const legacyComputedMessageFiles = mainAppFiles.filter((absolutePath) => (
  /\bmessage\s*\[/.test(fs.readFileSync(absolutePath, 'utf8'))
));
const scopedMessageApiFiles = mainAppFiles.filter((absolutePath) => (
  /\bmessageApi\.(success|error|warning|info)\(/.test(fs.readFileSync(absolutePath, 'utf8'))
));

assert(detachedFeedbackFiles.length === 0, `Main app must not import detached static Ant feedback: ${detachedFeedbackFiles.join(', ')}`);
assert(legacyComputedMessageFiles.length === 0, `Main app must not use legacy computed message calls: ${legacyComputedMessageFiles.join(', ')}`);
for (const absolutePath of scopedMessageApiFiles) {
  const source = fs.readFileSync(absolutePath, 'utf8');
  assert(
    source.includes('App.useApp()') || source.includes('message.useMessage()'),
    `${path.relative(ROOT, absolutePath)} messageApi must come from a mounted Ant feedback context`,
  );
}

console.log(`Business Settings Reset and owner feedback context verification passed across ${scopedMessageApiFiles.length} main-app files.`);
