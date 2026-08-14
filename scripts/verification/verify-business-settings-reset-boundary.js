#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
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
assertIncludes(implementation, 'Desktop Business Settings Reset boundary', 'Business Settings Reset implementation documentation');
assertIncludes(changelog, 'Business Settings Controlled-Draft Reset Boundary', 'Business Settings Reset changelog evidence');

console.log('Business Settings Reset boundary verification passed.');
