require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS' },
  require: ['tsconfig-paths/register'],
});

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} must not include ${needle}`);
}

function verifyPublicMenuApiSourceOfTruth() {
  const route = read('src/app/api/public/v1/menu/route.ts');

  assertIncludes(route, 'parseSummaryProjects', 'Public menu API default project resolver');
  assertIncludes(route, 'DB_COLLECTIONS.PLATFORM_SUMMARY', 'Public menu API default project resolver');
  assertIncludes(route, 'project.isDefault === true', 'Public menu API default project resolver');
  assertIncludes(route, 'projects[0]', 'Public menu API fallback resolver');
  assertIncludes(route, 'projectData.menuVersion', 'Public menu API menu version');
  assertIncludes(route, 'generatedAt', 'Public menu API response contract');
  assertNotIncludes(route, ".where('isDefault', '==', true)", 'Public menu API project lookup');
}

function verifyHoursDoNotInventOpenState() {
  const { getStoreStatus } = require('../../src/lib/hours/hoursEngine');
  const { resolveHoursOutput } = require('../../src/lib/outputControl/hoursConfidence');

  const missingHours = getStoreStatus(undefined, 'UTC');
  assert(missingHours.isOpen === false, 'Missing hours must not render as open');
  assert(missingHours.statusText === 'Hours not available', 'Missing hours must render as unavailable');

  const noHoursOutput = resolveHoursOutput({
    workingHours: undefined,
    timeZone: 'UTC',
  });
  assert(noHoursOutput.confidenceState === 'BROKEN', 'Output control must treat missing hours as broken');
  assert(noHoursOutput.statusText === 'Check with store', 'Output control must suppress missing-hours authority');
}

function verifyTimedCategoriesUseStoreTruth() {
  const menuPage = read('src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx');
  assertIncludes(menuPage, 'activeItemCategoryIds.has(cat.id)', 'Public menu category visibility');
  assertIncludes(menuPage, 'isCategoryVisibleByTime(cat, storeDetails?.timeZone)', 'Public menu category timezone');
  assertIncludes(menuPage, 'item.active !== false && typeof item.category', 'Public menu item visibility');

  const { isWithinTimeSlot } = require('../../src/hooks/useTimedCategories');
  const noonUtc = new Date('2026-01-01T12:30:00.000Z');
  const lunchSlot = [{ startTime: '12:00', endTime: '13:00' }];

  assert(isWithinTimeSlot(lunchSlot, 'UTC', noonUtc) === true, 'Timed categories must match store UTC time');
  assert(isWithinTimeSlot(lunchSlot, 'America/New_York', noonUtc) === false, 'Timed categories must not use customer/browser timezone');
  assert(isWithinTimeSlot([{ startTime: '12:00' }], 'UTC', noonUtc) === false, 'Partial timed category slots must not crash or render visible');
}

function verifyDomainOwnershipComparisonIsTypeSafe() {
  const route = read('src/app/api/domain/route.ts');

  assertIncludes(route, 'String(existingStoreId) !== String(storeId)', 'Custom domain duplicate-store guard');
  assertNotIncludes(route, 'existingStoreId !== storeId', 'Custom domain duplicate-store guard');
}

verifyPublicMenuApiSourceOfTruth();
verifyHoursDoNotInventOpenState();
verifyTimedCategoriesUseStoreTruth();
verifyDomainOwnershipComparisonIsTypeSafe();

console.log('Public business truth verifier passed');
