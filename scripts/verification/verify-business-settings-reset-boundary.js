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
assertIncludes(businessSettings, 'function getBusinessSettingsLocaleDefaults(storeDetails: any, timeZone?: string)', 'Business Settings locale default projection');
assertIncludes(businessSettings, 'timeZone: storeDetails?.timeZone || timeZone || defaultTimezone', 'Business Settings deterministic timezone fallback');
assert(
  (businessSettings.match(/\.\.\.getBusinessSettingsLocaleDefaults\(storeDetails, timezone\)/g) || []).length === 2,
  'Business Settings initial load and Reset must share the exact locale default projection',
);
for (const localeDefaultField of [
  'businessDayEndTime',
  'country',
  'currencyCode',
  'currencySymbol',
  'dateFormat',
  'timeFormat',
  'timeZone',
]) {
  assertIncludes(
    businessSettings,
    `${localeDefaultField}:`,
    `Business Settings Reset locale default ${localeDefaultField}`,
  );
}
assert(
  !businessSettings.includes('currencyCode: storeDetails?.currencyCode,')
    && !businessSettings.includes('currencySymbol: storeDetails?.currencySymbol,')
    && !businessSettings.includes('country: storeDetails?.country,'),
  'Business Settings Reset must not replace visible locale defaults with missing persisted values',
);
assertIncludes(businessSettings, 'function preventBusinessSettingsPickerEnterSubmit(', 'Business Settings picker Enter guard');
assertIncludes(businessSettings, "if (!event.target.closest('.ant-picker')) return;", 'Business Settings picker-only Enter guard');
assertIncludes(businessSettings, 'event.preventDefault();', 'Business Settings picker Enter submit prevention');
assertIncludes(businessSettings, 'onKeyDown={preventBusinessSettingsPickerEnterSubmit}', 'Business Settings form picker Enter guard wiring');
assertIncludes(businessSettings, "form.setFieldValue(\n                                                    'businessAttributes'", 'Business Settings Reset atomic business-attribute replacement');
assertIncludes(businessSettings, 'BUSINESS_ATTRIBUTE_CONFIG.map(({ key }) => [', 'Business Settings Reset complete business-attribute projection');
assert(
  !businessSettings.includes("form.setFieldValue(\n                                                        ['businessAttributes', key]"),
  'Business Settings Reset must not perform repeated nested field writes that trigger Ant circular-reference diagnostics',
);
for (const persistedOptionalField of [
  'area',
  'canonicalUrl',
  'contactPersonEmail',
  'contactPersonName',
  'contactPersonNumber',
  'countryCode',
  'dialCode',
  'district',
  'domain',
  'email',
  'gstn',
  'phoneNumber',
]) {
  assertIncludes(
    businessSettings,
    `${persistedOptionalField}: storeDetails?.${persistedOptionalField}`,
    `Business Settings Reset explicit optional ${persistedOptionalField} projection`,
  );
}
for (const persistedOptionalPublicPresenceField of [
  'accentColor',
  'businessCover',
  'establishedYear',
  'googleMapsUrl',
  'googleRating',
  'googleReviewCount',
  'googleReviewUrl',
  'iconVariant',
  'orderUrl',
  'photos',
  'reservationUrl',
  'whatsappNumber',
]) {
  assertIncludes(
    businessSettings,
    `${persistedOptionalPublicPresenceField}: storeDetails?.publicPresence?.${persistedOptionalPublicPresenceField}`,
    `Business Settings Reset explicit optional publicPresence.${persistedOptionalPublicPresenceField} projection`,
  );
}
assertIncludes(
  businessSettings,
  'const normalizedAnalytics = normalizeAnalyticsSettings(storeDetails?.analytics);',
  'Business Settings Reset normalized persisted analytics draft',
);
for (const persistedOptionalAnalyticsField of [
  'facebookPixelId',
  'googleAnalyticsId',
  'googleSearchConsole',
]) {
  assertIncludes(
    businessSettings,
    `${persistedOptionalAnalyticsField}: normalizedAnalytics.${persistedOptionalAnalyticsField}`,
    `Business Settings Reset explicit optional analytics.${persistedOptionalAnalyticsField} projection`,
  );
}
assertIncludes(businessSettings, 'display: "inline-flex"', 'Business Settings Search & Discovery inline menu label layout');
assert(
  !businessSettings.includes('<Flex align="center" gap={8}>\n                    <span>Search & Discovery</span>'),
  'Business Settings Search & Discovery label must not render a block Flex inside the inline Ant Menu label',
);
const officialPage = read('src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx');
assert(
  (officialPage.match(/controls=\{false\}/g) || []).length >= 3,
  'Official Page numeric inputs must not expose duplicate ambiguous and undersized Ant stepper buttons',
);
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
