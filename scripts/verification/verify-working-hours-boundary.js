#!/usr/bin/env node

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

function assertOrder(content, orderedTokens, label) {
  let previousIndex = -1;
  for (const token of orderedTokens) {
    const index = content.indexOf(token, previousIndex + 1);
    assert(index !== -1, `${label} missing token ${token}`);
    assert(index > previousIndex, `${label} must keep token order at ${token}`);
    previousIndex = index;
  }
}

function verifyPackageScript(packageJson) {
  assertIncludes(
    packageJson,
    '"verify:working-hours-boundary": "node scripts/verification/verify-working-hours-boundary.js"',
    'package working-hours verifier script',
  );
}

function verifyStoreDal(storesDal) {
  [
    'export const updateStore = async (data: any) => {',
    'await revalidatePublicClientCache(data.storeId, "updateStore");',
    'export function assertStoreUpdateSucceeded(',
    "throw new Error(rejectionCode);",
    'export function assertTimeSlotPresetUpdateSucceeded',
    "throw new Error('time_slot_preset_update_rejected');",
    'export const updateTimeSlotPresets = async (storeId: number, timeSlotPresets: TimeSlotPreset[]) => {',
    'await setDoc(docRef, { modifiedOn: serverTimestamp(), timeSlotPresets }, { merge: true });',
    'await revalidatePublicClientCache(storeId, "updateTimeSlotPresets");',
    'return { success: true, timeSlotPresets } satisfies TimeSlotPresetUpdateResult;',
  ].forEach((token) => assertIncludes(storesDal, token, 'Store working-hours/time-slot DAL boundary'));
}

function verifyProjectCascade(projectsDal) {
  [
    'export const removePresetFromAllCategories = async (presetId: string) => {',
    'PROJECT_PRESET_CASCADE_BATCH_LIMIT = 450',
    'await commitPendingProjectPresetWrites();',
    'revalidatePublicClientCacheForProject(projectId, "removePresetFromAllCategories")',
    'export function assertProjectPresetCascadeSucceeded(',
    'export const updatePresetInAllCategories = async (preset: TimeSlotPreset) => {',
    'if (!presetId) return { success: false, updatedProjects: 0 };',
    'await revalidatePublicClientCacheForProject(project.projectId, "updatePresetInAllCategories");',
  ].forEach((token) => assertIncludes(projectsDal, token, 'Project time-slot cascade boundary'));
}

function verifyDesktopSettings(businessSettings, timeSlotPresetsTab) {
  [
    'changesToUpload.workingHours = getFormatedWorkingHours(workingHours);',
    'if ("workingHours" in updatedChanges) {',
    'updatedChanges.hoursLastUpdatedAt = new Date().toISOString();',
    'const savedDetails = await updateStore(updatedChanges);',
    'assertStoreUpdateSucceeded(',
    "'desktop_business_settings_store_update_rejected'",
  ].forEach((token) => assertIncludes(businessSettings, token, 'Desktop working-hours save boundary'));

  assertOrder(
    businessSettings,
    [
      'if ("workingHours" in updatedChanges) {',
      'updatedChanges.hoursLastUpdatedAt = new Date().toISOString();',
      'const savedDetails = await updateStore(updatedChanges);',
      'assertStoreUpdateSucceeded(',
    ],
    'Desktop working-hours acknowledgement order',
  );

  [
    'const writeResult = await updateTimeSlotPresets(storeId, updatedPresets);',
    'assertTimeSlotPresetUpdateSucceeded(writeResult);',
    'const cascadeResult = await updatePresetInAllCategories(updatedPreset);',
    "'business_settings_time_slot_preset_cascade_update_rejected'",
    'const cascadeResult = await removePresetFromAllCategories(presetId);',
    "'business_settings_time_slot_preset_cascade_delete_rejected'",
    "'business_settings_time_slot_preset_save_failed'",
    "'business_settings_time_slot_preset_delete_failed'",
    "getBoundedBusinessSettingsStringContext('label', formData.label)",
  ].forEach((token) => assertIncludes(timeSlotPresetsTab, token, 'Desktop time-slot preset boundary'));
}

function verifyMobileSettings(mobileWorkingHours, mobileHours, mobileTimeSlots, mobileMore) {
  [
    'const hoursLastUpdatedAt = new Date().toISOString();',
    'setStoreDetails((previous: any) => ({ ...previous, hoursLastUpdatedAt, workingHours }));',
    'const writeResult = await updateStore({ ...storeDetails, hoursLastUpdatedAt, workingHours } as any);',
    'assertStoreUpdateSucceeded(',
    "'mobile_working_hours_store_update_rejected'",
    "'mobile_working_hours_save_failed'",
    'changedDayCount: DAYS.filter',
    'closedDayCount: DAYS.filter',
    'hasPreviousWorkingHours: Boolean(storeDetails.workingHours)',
    'workingHours: storeDetails.workingHours',
  ].forEach((token) => assertIncludes(mobileWorkingHours, token, 'Mobile full working-hours save boundary'));

  [
    'const previousHours = storeDetails.workingHours || {};',
    'const previousHoursLastUpdatedAt = (storeDetails as any).hoursLastUpdatedAt;',
    'const writeResult = await updateStore({ ...storeDetails, hoursLastUpdatedAt, workingHours: nextHours } as any);',
    'assertStoreUpdateSucceeded(',
    "'mobile_today_hours_store_update_rejected'",
    "'mobile_today_hours_update_failed'",
    'hasPreviousHours: Object.keys(previousHours).length > 0',
    'hasNextHours: Object.keys(nextHours).length > 0',
    'hasPreviousHoursLastUpdatedAt: Boolean(previousHoursLastUpdatedAt)',
    'workingHours: previousHours',
  ].forEach((token) => assertIncludes(mobileHours, token, 'Mobile Today quick-hours save boundary'));

  [
    'const writeResult = await updateTimeSlotPresets(storeDetails?.storeId, updated);',
    'assertTimeSlotPresetUpdateSucceeded(writeResult);',
    'const cascadeResult = await updatePresetInAllCategories(updatedPreset);',
    "'mobile_time_slot_preset_cascade_update_rejected'",
    'const cascadeResult = await removePresetFromAllCategories(preset.id);',
    "'mobile_time_slot_preset_cascade_delete_rejected'",
    "'mobile_time_slot_preset_save_failed'",
    "'mobile_time_slot_preset_delete_failed'",
    "getBoundedMobileOwnerStringContext('presetLabel', label)",
    'remainingPresetCount: Math.max(presets.length - 1, 0)',
  ].forEach((token) => assertIncludes(mobileTimeSlots, token, 'Mobile time-slot preset boundary'));

  [
    "key: 'hoursEdit'",
    "key: 'timeSlots'",
    "subScreen === 'hoursEdit') subScreenContent = <MobileWorkingHoursEditScreen",
    "subScreen === 'timeSlots') subScreenContent = <MobileTimeSlotsScreen",
    "['basicSettings', 'locale', 'hoursEdit', 'timeSlots', 'tempStatus', 'businessAttributes', 'contactSettings', 'advancedSettings'].includes(screen)",
  ].forEach((token) => assertIncludes(mobileMore, token, 'Mobile More hours/time-slot route boundary'));
}

function verifyPublicHoursOutput(features, hoursEngine, hoursDiagnostics, obpHoursStatus, storeStatusBadge, clientWebsite, trustSignals) {
  assertIncludes(features, 'ENABLE_HOURS_STATUS_DISPLAY: true', 'Hours status feature flag');

  [
    'hours_status_timezone_fallback_failed',
    'hours_status_time_range_invalid',
    'MAX_HOURS_STATUS_TIMEZONE_DIAGNOSTICS',
    'MAX_HOURS_STATUS_INVALID_TIME_RANGE_DIAGNOSTICS',
    'reportedHoursStatusTimeZoneFailures',
    'reportedHoursStatusInvalidTimeRanges',
    'getBoundedRuntimeStringContext("timeZone", timeZone)',
    'logRuntimeFailure("hours_status_timezone_fallback_failed"',
    'logRuntimeDiagnostic("hours_status_time_range_invalid"',
  ].forEach((token) => assertIncludes(hoursDiagnostics, token, 'Hours status diagnostics boundary'));

  [
    'export function getStoreStatus(',
    'statusText: "Hours not available"',
    'function isWithinWindow(',
    'if (endMinutes < startMinutes) {',
    'export function getMinutesUntilStoreStatusChange(',
    'return getStoreStatus(workingHours, timeZone, timeFormat);',
    'logHoursStatusTimeZoneFallback(error, timeZone, "hours_engine_day_key", "local_day_key")',
    'logHoursStatusTimeZoneFallback(error, timeZone, "hours_engine_time", "local_time")',
    'logHoursStatusInvalidTimeRange(currentDay, todayHours, "hours_engine_current_status")',
    'logHoursStatusInvalidTimeRange(checkDay, hours, "hours_engine_next_open")',
    'if (!Number.isFinite(currentMinutes))',
    'if (!Number.isFinite(openMinutes) || !Number.isFinite(closeMinutes))',
  ].forEach((token) => assertIncludes(hoursEngine, token, 'Hours engine boundary'));
  assertNotIncludes(hoursEngine, '    } catch {\n        // Fallback', 'Hours engine timezone fallback must not be silent');

  [
    "logHoursStatusTimeZoneFallback(error, timeZone, 'obp_hours_status_now', 'browser_local_time')",
    "logHoursStatusInvalidTimeRange(dayKey, range, 'obp_hours_status_current_status')",
    'let hasValidRange = false;',
    "return { isOpen: false, statusText: 'Hours not available' };",
    'hasValidTimeRange(hours)',
  ].forEach((token) => assertIncludes(obpHoursStatus, token, 'OBP hours status boundary'));
  assertNotIncludes(obpHoursStatus, '    } catch {\n        now = new Date();\n    }', 'OBP hours status timezone fallback must not be silent');

  [
    'getStoreStatus(workingHours, timezone)',
    'getMinutesUntilStoreStatusChange(workingHours, timezone)',
    'if (!workingHours || Object.keys(workingHours).length === 0) return null;',
    'if (urgentOnly && !isUrgentStatusChange) return null;',
  ].forEach((token) => assertIncludes(storeStatusBadge, token, 'Store status badge boundary'));

  [
    'FEATURE_FLAGS.ENABLE_HOURS_STATUS_DISPLAY && !FEATURE_FLAGS.ENABLE_OUTPUT_CONTROL',
    '<StoreStatusBadge',
    'urgentOnly',
    'urgencyWindowMinutes={5}',
  ].forEach((token) => assertIncludes(clientWebsite, token, 'Client website hours badge boundary'));

  [
    'hoursLastUpdatedAt',
    'getStoreStatus(workingHours, timeZone)',
  ].forEach((token) => assertIncludes(trustSignals, token, 'Trust signals hours output boundary'));
}

function verifyDocs(readme, spec, impl, firebaseDoc, mobileDoc, websiteDoc, helpDoc, marketingDoc, inventory, report, audit, changelog) {
  [
    '## Source Gate',
    '`npm run verify:working-hours-boundary`',
    'Current Source Contract',
    '`ENABLE_HOURS_STATUS_DISPLAY`',
    'public open/closed status from saved weekly working hours',
    "use Temporary Status or today's hours",
  ].forEach((token) => assertIncludes(readme, token, 'Working hours README source gate'));

  [
    '## Current Source Boundary',
    'Current runtime covers owner-set weekly working hours, public open/closed status, Today quick-hours edits, and time-slot presets.',
    'Holiday calendars and date-specific exception managers are not shipped',
    "Temporary Status or today's hours",
  ].forEach((token) => assertIncludes(spec, token, 'Working hours spec source boundary'));

  [
    '## Source Gate',
    'This implementation doc is source-gated by `npm run verify:working-hours-boundary`.',
    'Historical blueprint sections below are not launch approval',
    'Hours status fallback diagnostics',
  ].forEach((token) => assertIncludes(impl, token, 'Working hours implementation source gate'));

  [
    '## Source Gate',
    '`npm run verify:working-hours-boundary`',
    'updateTimeSlotPresets()',
    'Hours status fallback diagnostics',
  ].forEach((token) => assertIncludes(firebaseDoc, token, 'Working hours Firebase source gate'));

  [
    '## Source Gate',
    '`npm run verify:working-hours-boundary`',
    'MobileWorkingHoursEditScreen',
    'MobileTimeSlotsScreen',
  ].forEach((token) => assertIncludes(mobileDoc, token, 'Working hours mobile source gate'));

  [
    'Current Source Boundary',
    'No holiday-calendar or exception manager is shipped in the current runtime.',
    "Customers See If You're Open",
    'Customers see the status before they visit.',
    'current open/closed status',
  ].forEach((token) => assertIncludes(websiteDoc, token, 'Working hours website source boundary'));

  [
    'Current Source Boundary',
    'For an unscheduled closure, use Temporary Status or update today\'s hours.',
  ].forEach((token) => assertIncludes(helpDoc, token, 'Working hours helpdoc source boundary'));

  assertIncludes(
    marketingDoc,
    'Do not publish this as current public copy until a source-backed holiday/exception runtime exists.',
    'Working hours marketing launch boundary',
  );
  [
    'Current source-backed claim is limited to owner-set weekly working hours, public open/closed status, Today quick-hours edits, and time-slot presets.',
    'One setup. Current status.',
    "Use Temporary Status or today's hours",
  ].forEach((token) => assertIncludes(marketingDoc, token, 'Working hours marketing source boundary'));

  [
    'working-hours boundary source gate passed; browser/manual mutation pending',
  ].forEach((token) => assertIncludes(inventory, token, 'Feature sweep inventory working-hours source gate'));

  [
    '## Working Hours and Time-Slot Boundary',
    '`npm run verify:working-hours-boundary`',
  ].forEach((token) => assertIncludes(report, token, 'Feature sweep report working-hours source gate'));

  [
    'Working Hours and time-slot boundary checkpoint',
    '`npm run verify:working-hours-boundary`',
    'Hours status fallback diagnostics checkpoint',
  ].forEach((token) => assertIncludes(audit, token, 'Production audit working-hours source gate'));

  [
    'Working Hours public claim boundary checkpoint',
    '`npm run verify:working-hours-boundary`',
  ].forEach((token) => assertIncludes(audit, token, 'Production audit working-hours public claim boundary'));

  [
    'Working Hours and Time-Slot Boundary',
    '`npm run verify:working-hours-boundary`',
    'Hours Status Fallback Diagnostics',
  ].forEach((token) => assertIncludes(changelog, token, 'Changelog working-hours source gate'));

  [
    'Working Hours Public Claim Boundary',
    '`npm run verify:working-hours-boundary`',
  ].forEach((token) => assertIncludes(changelog, token, 'Changelog working-hours public claim boundary'));

  [
    'Holiday Exceptions (Coming Soon)',
    'How to set holiday closures (Coming Soon)',
    'Feature Flags\n\nNone required for P0',
  ].forEach((token) => {
    assertNotIncludes(readme, token, `Working hours README stale token ${token}`);
    assertNotIncludes(websiteDoc, token, `Working hours website stale token ${token}`);
    assertNotIncludes(helpDoc, token, `Working hours helpdoc stale token ${token}`);
  });

  const activeClaimDocs = [
    ['README', readme],
    ['spec', spec],
    ['website', websiteDoc],
    ['marketing', marketingDoc],
  ];

  [
    'always correct',
    'Always correct',
    'correct everywhere',
    'Correct everywhere',
    'customers always know',
    'Customers Always Know',
    'Set hours once. MenuList keeps them correct everywhere',
    'Your hours stay correct. Even on holidays.',
    'Enable holiday calendar',
    'Enable holiday handling',
    "Holiday closures used to be a mess. Now it's automatic.",
    'India holiday calendar built-in',
    'Global holiday calendar available',
    'One setup, always correct',
    'Holiday selector label',
    'Exception section label',
    'Closed today (holiday)',
    'Special hours today',
    'Set once, stays correct',
    'Holiday calendar handles it',
    'Staff view always current',
    'Menu shows correct status always',
    'Owner never touches it again',
    'Manual exceptions always override',
    'Add an exception in 10 seconds',
    'multiple windows per day. Morning and evening? No problem.',
    'Consistent everywhere',
  ].forEach((token) => {
    activeClaimDocs.forEach(([label, content]) => {
      assertNotIncludes(content, token, `Working hours ${label} stale claim ${token}`);
    });
  });
}

function main() {
  const packageJson = read('package.json');
  const storesDal = read('src/database/stores/index.tsx');
  const projectsDal = read('src/database/projects/index.ts');
  const businessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
  const timeSlotPresetsTab = read('src/components/templates/main-app/businessSettings/tabs/TimeSlotPresetsTab.tsx');
  const mobileWorkingHours = read('src/components/mobile/screens/MobileWorkingHoursEditScreen.tsx');
  const mobileHours = read('src/components/mobile/screens/MobileHoursScreen.tsx');
  const mobileTimeSlots = read('src/components/mobile/screens/MobileTimeSlotsScreen.tsx');
  const mobileMore = read('src/components/mobile/screens/MobileMoreScreen.tsx');
  const features = read('src/config/features.ts');
  const hoursEngine = read('src/lib/hours/hoursEngine.ts');
  const hoursDiagnostics = read('src/lib/hours/hoursDiagnostics.ts');
  const obpHoursStatus = read('src/lib/obp/hoursStatus.ts');
  const storeStatusBadge = read('src/components/atoms/StoreStatusBadge/index.tsx');
  const clientWebsite = read('src/components/templates/website/clientWebsite/index.tsx');
  const trustSignals = read('src/components/atoms/TrustSignals.tsx');
  const readme = read('__docs__/hours-holiday-accuracy/README.md');
  const spec = read('__docs__/hours-holiday-accuracy/hours-holiday-accuracy_spec.md');
  const impl = read('__docs__/hours-holiday-accuracy/hours-holiday-accuracy_impl.md');
  const firebaseDoc = read('__docs__/hours-holiday-accuracy/hours-holiday-accuracy_firebase.md');
  const mobileDoc = read('__docs__/hours-holiday-accuracy/hours-holiday-accuracy_mobile-support.md');
  const websiteDoc = read('__docs__/hours-holiday-accuracy/hours-holiday-accuracy_website.md');
  const helpDoc = read('__docs__/hours-holiday-accuracy/hours-holiday-accuracy_helpdoc.md');
  const marketingDoc = read('__docs__/hours-holiday-accuracy/hours-holiday-accuracy_marketing.md');
  const inventory = read('FEATURE_SWEEP_MASTER_INVENTORY.md');
  const report = read('FEATURE_SWEEP_MASTER_REPORT.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');

  verifyPackageScript(packageJson);
  verifyStoreDal(storesDal);
  verifyProjectCascade(projectsDal);
  verifyDesktopSettings(businessSettings, timeSlotPresetsTab);
  verifyMobileSettings(mobileWorkingHours, mobileHours, mobileTimeSlots, mobileMore);
  verifyPublicHoursOutput(features, hoursEngine, hoursDiagnostics, obpHoursStatus, storeStatusBadge, clientWebsite, trustSignals);
  verifyDocs(readme, spec, impl, firebaseDoc, mobileDoc, websiteDoc, helpDoc, marketingDoc, inventory, report, audit, changelog);

  console.log('Working Hours and time-slot boundary verifier passed');
}

main();
