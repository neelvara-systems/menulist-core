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
    'scripts/verification/test-working-hours-boundary.ts',
    'package working-hours verifier script',
  );
}

function verifyFirestoreCostBoundary(firestoreIndexesJson) {
  const firestoreIndexes = JSON.parse(firestoreIndexesJson);
  assert(
    (firestoreIndexes.fieldOverrides || []).some((entry) => (
      entry.collectionGroup === 'stores'
      && entry.fieldPath === 'timeSlotPresets'
      && Array.isArray(entry.indexes)
      && entry.indexes.length === 0
    )),
    'stores.timeSlotPresets must stay exempt from unused automatic single-field indexes',
  );
}

function verifyStoreDal(storesDal, presetBoundary, cascadeReconciler) {
  [
    'type UpdateStoreOptions = Readonly<{',
    'export const updateStore = async (data: StoreMutationData, options: UpdateStoreOptions = {}) => {',
    'normalizeWorkingHoursUpdate',
    "throw new Error('store_working_hours_day_invalid')",
    "throw new Error('store_working_hours_range_invalid')",
    'await revalidatePublicClientCache(data.storeId, "updateStore", {',
    'touchScreen: hasDigitalScreenStoreOutputFieldChanges(data),',
    'export function assertStoreUpdateSucceeded(',
    "throw new Error(rejectionCode);",
    'export function assertTimeSlotPresetUpdateSucceeded',
    "throw new Error('time_slot_preset_update_rejected');",
    'export const updateTimeSlotPresets = async (',
    'cascadeMutation?: ProjectPresetReferenceMutation,',
    "await assertActiveSessionStore(storeId, 'time_slot_preset_store_scope_mismatch');",
    'const normalizedPresets = normalizeTimeSlotPresets(timeSlotPresets);',
    'const normalizedMutation = cascadeMutation === undefined',
    'await runTransaction(firebaseClient, async (transaction) => {',
    'if (currentSnapshot.data().timeSlotPresetCascadePending !== undefined) {',
    "throw new Error('time_slot_preset_cascade_pending');",
    'timeSlotPresetCascadePending: pendingCascade',
    'await revalidatePublicClientCache(storeId, "updateTimeSlotPresets");',
    '...(pendingCascade ? { pendingCascade } : {}),',
    'export const completeTimeSlotPresetCascade = async (',
    "await assertActiveSessionStore(storeId, 'time_slot_preset_store_scope_mismatch');",
    'if (!pending || pending.operationId !== normalizedOperationId) {',
    "throw new Error('time_slot_preset_cascade_operation_conflict');",
    'timeSlotPresetCascadePending: deleteField(),',
  ].forEach((token) => assertIncludes(storesDal, token, 'Store working-hours/time-slot DAL boundary'));

  [
    'export const normalizeProjectPresetReferenceMutation = (',
    'export const normalizeTimeSlotPresetCascadePending = (',
  ].forEach((token) => assertIncludes(presetBoundary, token, 'Time-slot durable cascade marker boundary'));

  [
    'export async function reconcileTimeSlotPresetCascade(',
    'const pending = normalizeTimeSlotPresetCascadePending(rawPending);',
    'assertProjectPresetCascadeSucceeded(',
    'const completionResult = await completeTimeSlotPresetCascade(',
    'assertTimeSlotPresetCascadeCompleted(completionResult);',
  ].forEach((token) => assertIncludes(cascadeReconciler, token, 'Time-slot cascade reconciliation boundary'));
}

function verifyProjectCascade(projectsDal) {
  [
    'export const removePresetFromAllCategories = async (',
    'expectedScope: { tenantId: number; storeId: number }',
    'scope.tId !== expectedScope.tenantId',
    'scope.sId !== expectedScope.storeId',
    'PROJECT_PRESET_CASCADE_PAGE_SIZE = 100',
    'const currentDoc = await transaction.get(projectDoc.ref);',
    'files: projection.files,',
    'await revalidatePublicClientCacheForProject(projectDoc.id, cacheContext);',
    'mutation.type === "remove"',
    '|| projectReferencesTimeSlotPreset(project, presetId)',
    'export function assertProjectPresetCascadeSucceeded(',
    'export const updatePresetInAllCategories = async (',
    'const normalizedPreset = normalizeTimeSlotPreset(preset);',
    'return await applyPresetMutationToAllProjects(',
  ].forEach((token) => assertIncludes(projectsDal, token, 'Project time-slot cascade boundary'));
}

function verifyDesktopSettings(businessSettings, workingHoursTab, integrationsTab, timeSlotPresetsTab, timeSlotPresetForm) {
  [
    'buildWorkingHourSlots(storeDetails?.workingHours)',
    'const [workingHoursDirty, setWorkingHoursDirty] = useState(false);',
    'const [workingHoursDirtyDays, setWorkingHoursDirtyDays] = useState<string[]>([]);',
    'if (workingHoursDirty) {',
    'changesToUpload.workingHours = getFormatedWorkingHours(workingHours);',
    'delete changesToUpload.workingHours;',
    'if ("workingHours" in updatedChanges) {',
    'updatedChanges.hoursLastUpdatedAt = new Date().toISOString();',
    'const savedDetails = await updateStore(updatedChanges);',
    'assertStoreUpdateSucceeded(',
    "'desktop_business_settings_store_update_rejected'",
    "key={`time-slot-presets:${String(storeDetails?.tenantId ?? '')}:${String(storeDetails?.storeId ?? '')}`}",
    "String(previous?.tenantId ?? '') === String(expectedTenantId ?? '')",
    "String(previous?.storeId ?? '') === String(expectedStoreId ?? '')",
    'function BusinessSettingsContent(',
    '<BusinessSettingsStateBoundary',
    'key={scopeKey}',
    "if (typeof update === 'function')",
    'notifyStoreSaved(update);',
    'const settingsSaveInFlightRef = useRef(false);',
    'const componentActiveRef = useRef(true);',
    'activeBusinessSettingsScopeRef.current !== requestScopeKey',
    'loading={isSettingsSaving}',
  ].forEach((token) => assertIncludes(businessSettings, token, 'Desktop working-hours save boundary'));

  assertOrder(
    businessSettings,
    [
      'if ("workingHours" in updatedChanges) {',
      'updatedChanges.hoursLastUpdatedAt = new Date().toISOString();',
      'const savedDetails = await updateStore(updatedChanges);',
      'assertStoreUpdateSucceeded(',
      'activeBusinessSettingsScopeRef.current === requestScopeKey',
    ],
    'Desktop working-hours acknowledgement order',
  );

  [
    'const [modal, modalContextHolder] = Modal.useModal();',
    'modal.confirm({',
    '{modalContextHolder}',
    "title: 'Clear regular weekly hours?'",
  ].forEach((token) => assertIncludes(workingHoursTab, token, 'Desktop working-hours confirmation context'));
  assertNotIncludes(workingHoursTab, 'Modal.confirm({', 'Desktop working-hours confirmation must not use detached static rendering');
  [
    'const [messageApi, messageContextHolder] = message.useMessage();',
    '{messageContextHolder}',
    "messageApi.error('Opening and closing times must be different.');",
  ].forEach((token) => assertIncludes(workingHoursTab, token, 'Desktop working-hours feedback context'));
  assertNotIncludes(workingHoursTab, 'message.error(', 'Desktop working-hours feedback must not use detached static rendering');

  [
    'const [modal, modalContextHolder] = Modal.useModal();',
    'modal.confirm({',
    '{modalContextHolder}',
    "title: 'Revoke public API key?'",
  ].forEach((token) => assertIncludes(integrationsTab, token, 'Desktop public API key confirmation context'));
  assertNotIncludes(integrationsTab, 'Modal.confirm({', 'Desktop public API key confirmation must not use detached static rendering');
  [
    'const [messageApi, messageContextHolder] = message.useMessage();',
    '{messageContextHolder}',
    "messageApi.success('Public API key generated');",
    "messageApi.success('Public API key revoked');",
    "messageApi.error('Failed to generate API key');",
  ].forEach((token) => assertIncludes(integrationsTab, token, 'Desktop public API key feedback context'));
  assertNotIncludes(integrationsTab, 'message.success(', 'Desktop public API key success feedback must not use detached static rendering');
  assertNotIncludes(integrationsTab, 'message.error(', 'Desktop public API key failure feedback must not use detached static rendering');

  [
    'const [messageApi, messageContextHolder] = message.useMessage();',
    '{messageContextHolder}',
    "messageApi.error(t('enterLabel'));",
    "messageApi.error(t('duplicatePreset'));",
    'messageApi.success(successMessage);',
    "messageApi.success(t('timeSlotDeleted'));",
  ].forEach((token) => assertIncludes(timeSlotPresetsTab, token, 'Desktop time-slot preset feedback context'));
  assertNotIncludes(timeSlotPresetsTab, 'message.success(', 'Desktop time-slot preset success feedback must not use detached static rendering');
  assertNotIncludes(timeSlotPresetsTab, 'message.error(', 'Desktop time-slot preset failure feedback must not use detached static rendering');

  [
    'const writeResult = await updateTimeSlotPresets(storeId, updatedPresets, cascadeMutation);',
    'assertTimeSlotPresetUpdateSucceeded(writeResult);',
    'if (!writeResult.pendingCascade) {',
    'await reconcileTimeSlotPresetCascade(expectedScope, writeResult.pendingCascade);',
    "'business_settings_time_slot_preset_cascade_update_rejected'",
    "'business_settings_time_slot_preset_cascade_delete_rejected'",
    'business_settings_time_slot_preset_recovery_failed',
    'recoveryAttemptedOperationRef.current = pendingCascade.operationId;',
    "'business_settings_time_slot_preset_save_failed'",
    "'business_settings_time_slot_preset_delete_failed'",
    "getBoundedBusinessSettingsStringContext('label', formData.label)",
    'const actionInFlightRef = useRef(false);',
    'const activeScopeRef = useRef(scopeKey);',
    'const componentActiveRef = useRef(true);',
    "aria-label={t('editTimeSlot')}",
    "aria-label={t('delete' as any)}",
  ].forEach((token) => assertIncludes(timeSlotPresetsTab, token, 'Desktop time-slot preset boundary'));

  [
    'aria-label={`Preset color ${color}`}',
    'aria-pressed={formData.color === color}',
    'htmlType="button"',
  ].forEach((token) => assertIncludes(timeSlotPresetForm, token, 'Shared time-slot preset color control boundary'));
}

function verifyMobileSettings(mobileWorkingHours, mobileHours, mobileTimeSlots, mobileMore) {
  [
    'const hoursLastUpdatedAt = new Date().toISOString();',
    'const previousWorkingHours = { ...(storeDetails.workingHours || {}) };',
    'const workingHours: Record<string, string> = { ...previousWorkingHours };',
    'getStoreDeepDifference(workingHours, previousWorkingHours, {',
    "String(previous?.tenantId ?? '') === String(expectedTenantId)",
    "String(previous?.storeId ?? '') === String(expectedStoreId)",
    'storeId: expectedStoreId,',
    'tenantId: expectedTenantId,',
    'workingHours,',
    'assertStoreUpdateSucceeded(',
    "'mobile_working_hours_store_update_rejected'",
    "'mobile_working_hours_save_failed'",
    'changedDayCount: DAYS.filter',
    'closedDayCount: DAYS.filter',
    'hasPreviousWorkingHours: Object.keys(previousWorkingHours).length > 0',
    'workingHours: previousWorkingHours',
    "Toast.show({ content: t('hoursSaved'), duration: 1000 });",
    'function MobileWorkingHoursEditScreenContent(',
    '<MobileWorkingHoursEditScreenContent key={scopeKey}',
    'const actionInFlightRef = useRef(false);',
    'const activeScopeRef = useRef(scopeKey);',
    'const componentActiveRef = useRef(true);',
  ].forEach((token) => assertIncludes(mobileWorkingHours, token, 'Mobile full working-hours save boundary'));
  [
    "aria-label={`${t('setSameHoursAllDays')}: ${t('selectOpeningTime')}`}",
    "aria-label={`${t('setSameHoursAllDays')}: ${t('selectClosingTime')}`}",
    "aria-label={`${localizedDayLabel || label}: ${t('selectOpeningTime')}`}",
    "aria-label={`${localizedDayLabel || label}: ${t('selectClosingTime')}`}",
  ].forEach((token) => assertIncludes(mobileWorkingHours, token, 'Mobile working-hours accessible time input boundary'));
  assertOrder(
    mobileWorkingHours,
    ['assertStoreUpdateSucceeded(', "Toast.show({ content: t('hoursSaved'), duration: 1000 });"],
    'Mobile full working-hours acknowledgement order',
  );
  assertNotIncludes(mobileWorkingHours, 'updateStore({ ...storeDetails', 'Mobile full working-hours save must not overwrite unrelated store truth');
  assertIncludes(
    mobileWorkingHours,
    'const isDirty = DAYS.some(',
    'Mobile full working-hours dirty state must compare published day truth',
  );
  assertIncludes(
    mobileWorkingHours,
    'serializeDay(schedule[key]) !== serializeDay(originalSchedule[key])',
    'Mobile full working-hours dirty state must ignore hidden times on closed days',
  );
  assertNotIncludes(
    mobileWorkingHours,
    'JSON.stringify(schedule) !== JSON.stringify(originalSchedule)',
    'Mobile full working-hours dirty state must not compare irrelevant closed-day editor values',
  );

  [
    'const previousHours = { ...(storeDetails.workingHours || {}) };',
    'const previousHoursLastUpdatedAt = (storeDetails as any).hoursLastUpdatedAt;',
    'storeId: expectedStoreId,',
    'tenantId: expectedTenantId,',
    'const previousSpecialHours = normalizeSpecialHours(storeDetails.specialHours) || {};',
    'const nextSpecialHours = todaySpecialHours',
    '? { specialHours: nextSpecialHours }',
    ': { workingHours: { [expectedTodayKey]: nextRange } }',
    'assertStoreUpdateSucceeded(',
    "'mobile_today_hours_store_update_rejected'",
    "'mobile_today_hours_update_failed'",
    'hasPreviousHours: Object.keys(previousHours).length > 0',
    'hasNextHours: Object.keys(nextHours).length > 0',
    'hasPreviousHoursLastUpdatedAt: Boolean(previousHoursLastUpdatedAt)',
    'workingHours: previousHours',
    'getStoreDayKey(storeDetails?.timeZone, hoursNow)',
    'storeDetails?.specialHours,',
    'todaySpecialHours?.hours ?? storeDetails?.workingHours?.[todayKey]',
    'isValidClockRange(todayOpenTime, todayCloseTime)',
    "aria-label={todaySpecialHours ? 'Edit Today’s Special Hours' : `Edit Regular ${todayLabel} Hours`}",
    'aria-label={`${todayLabel} opening time`}',
    'aria-label={`${todayLabel} closing time`}',
    'function MobileHoursScreenContent(',
    '<MobileHoursScreenContent key={scopeKey}',
    'const hoursActionInFlightRef = useRef(false);',
    'const activeScopeRef = useRef(scopeKey);',
    'const componentActiveRef = useRef(true);',
    "String(previous?.tenantId ?? '') === String(expectedTenantId)",
    "String(previous?.storeId ?? '') === String(expectedStoreId)",
  ].forEach((token) => assertIncludes(mobileHours, token, 'Mobile Today quick-hours save boundary'));
  assertNotIncludes(mobileHours, 'updateStore({ ...storeDetails', 'Mobile Today quick-hours save must not overwrite unrelated store truth');

  [
    'const writeResult = await updateTimeSlotPresets(',
    'assertTimeSlotPresetUpdateSucceeded(writeResult);',
    'await reconcileTimeSlotPresetCascade(',
    'if (!writeResult.pendingCascade) {',
    "'mobile_time_slot_preset_cascade_update_rejected'",
    "'mobile_time_slot_preset_cascade_delete_rejected'",
    'mobile_time_slot_preset_recovery_failed',
    'recoveryAttemptedOperationRef.current = pendingCascade.operationId;',
    "'mobile_time_slot_preset_save_failed'",
    "'mobile_time_slot_preset_delete_failed'",
    "getBoundedMobileOwnerStringContext('presetLabel', label)",
    'remainingPresetCount: Math.max(presets.length - 1, 0)',
    "String(previous?.tenantId ?? '') === String(expectedTenantId)",
    "String(previous?.storeId ?? '') === String(expectedStoreId)",
    'function MobileTimeSlotsScreenContent(',
    '<MobileTimeSlotsScreenContent key={scopeKey}',
    'const actionInFlightRef = useRef(false);',
    'const activeScopeRef = useRef(scopeKey);',
    'const componentActiveRef = useRef(true);',
    'getTimeSlotPresetDraftIssue({',
    "formIssue === 'duplicate_label'",
    "formIssue === 'invalid_range'",
    "id=\"mobile-time-slot-draft-error\" role=\"alert\"",
    'disabled={Boolean(formIssue)}',
  ].forEach((token) => assertIncludes(mobileTimeSlots, token, 'Mobile time-slot preset boundary'));
  assertNotIncludes(mobileTimeSlots, 'rangesOverlap(', 'Mobile time-slot presets must allow the same overlap contract as desktop');

  [
    "key: 'hoursEdit'",
    "key: 'timeSlots'",
    "subScreen === 'hoursEdit') subScreenContent = <MobileWorkingHoursEditScreen",
    "subScreen === 'timeSlots') subScreenContent = <MobileTimeSlotsScreen",
    "['basicSettings', 'locale', 'hoursEdit', 'timeSlots', 'tempStatus', 'businessAttributes', 'contactSettings', 'advancedSettings'].includes(screen)",
  ].forEach((token) => assertIncludes(mobileMore, token, 'Mobile More hours/time-slot route boundary'));
}

function verifySpecialHoursOwnerSettings(
  storesDal,
  desktopSpecialHours,
  mobileSpecialHours,
  mobileWorkingHours,
  aiMenuManagerResolver,
  aiMenuManagerPromptHints,
) {
  [
    'normalizeSpecialHoursUpdate',
    "throw new Error('store_special_hours_invalid')",
    'if (data.specialHours !== undefined) {',
    'data.specialHours = normalizeSpecialHoursUpdate(data.specialHours);',
  ].forEach((token) => assertIncludes(storesDal, token, 'Special-hours DAL boundary'));

  [
    'SPECIAL_HOURS_MAX_ENTRIES',
    'normalizeSpecialHours(storeDetails?.specialHours)',
    'const actionInFlightRef = useRef<symbol | null>(null);',
    'const activeScopeRef = useRef(scopeKey);',
    'const componentActiveRef = useRef(true);',
    "const attempt = Symbol('desktop-special-hours-save');",
    'actionInFlightRef.current !== attempt',
    'desktop_special_hours_store_update_rejected',
    'hoursLastUpdatedAt',
    'specialHours: Object.keys(normalized).length ? normalized : null',
    'assertStoreUpdateSucceeded',
    'Special hours published.',
    'sortSpecialHoursEntriesForOwner(specialHours, todayKey)',
    'const isPast = dateKey < todayKey;',
    '{!isPast ? (',
    'theme.useToken()',
    'token.colorBorderSecondary',
  ].forEach((token) => assertIncludes(desktopSpecialHours, token, 'Desktop special-hours owner boundary'));
  assertOrder(
    desktopSpecialHours,
    ['assertStoreUpdateSucceeded', 'activeScopeRef.current !== requestScopeKey', 'setStoreDetails'],
    'Desktop special-hours acknowledgement order',
  );

  [
    'SPECIAL_HOURS_MAX_ENTRIES',
    'normalizeSpecialHours(storeDetails?.specialHours)',
    'const actionInFlightRef = useRef<symbol | null>(null);',
    'const activeScopeRef = useRef(scopeKey);',
    'const componentActiveRef = useRef(true);',
    "const attempt = Symbol('mobile-special-hours-save');",
    'actionInFlightRef.current !== attempt',
    'mobile_special_hours_store_update_rejected',
    'hoursLastUpdatedAt',
    'specialHours: Object.keys(normalized).length ? normalized : null',
    'assertStoreUpdateSucceeded',
    'Special hours published.',
    'sortSpecialHoursEntriesForOwner(specialHours, todayKey)',
    'const isPast = dateKey < todayKey;',
    '{!isPast ? (',
  ].forEach((token) => assertIncludes(mobileSpecialHours, token, 'Mobile special-hours owner boundary'));
  [
    'aria-label="Special date"',
    'aria-label="Occasion (optional)"',
    'aria-label="Special hours opening time"',
    'aria-label="Special hours closing time"',
  ].forEach((token) => assertIncludes(mobileSpecialHours, token, 'Mobile special-hours accessible input boundary'));
  assertIncludes(
    mobileWorkingHours,
    '<MobileSpecialHoursManager />',
    'Mobile Working Hours special-hours placement',
  );
  assertIncludes(
    mobileWorkingHours,
    'Use Special hours below for a planned date, or Temporary Status for a live interruption.',
    'Mobile Working Hours planned-vs-live owner wording',
  );

  [
    '/\\bspecial hours\\b/',
    '/\\bholiday hours\\b/',
    "{ label: 'Special date', prompt: 'Set special hours for a date', helper: 'Planned closure or different hours' }",
    'regular weekly hours and planned date-specific special hours',
  ].forEach((token) => assertIncludes(aiMenuManagerResolver, token, 'AI Menu Manager special-hours routing'));
  assertNotIncludes(
    aiMenuManagerResolver,
    "prompt: 'Set temporary status: special hours'",
    'AI Menu Manager must not misroute planned special hours to Temporary Status',
  );
  assertIncludes(
    aiMenuManagerPromptHints,
    "{ kind: 'more', label: 'Special date', prompt: 'Set special hours for a date', helper: 'Planned closure or different hours' }",
    'AI Menu Manager special-date prompt hint',
  );
  assertNotIncludes(
    aiMenuManagerPromptHints,
    "prompt: 'Set temporary status: special hours'",
    'AI Menu Manager prompt hints must not misroute special hours',
  );
}

function verifyPublicHoursOutput(features, hoursBoundary, hoursEngine, hoursDiagnostics, obpHoursStatus, storeStatusBadge, clientWebsite, trustSignals, decisionBlocks, schema, obpSurface, menuFooter) {
  assertIncludes(features, 'ENABLE_HOURS_STATUS_DISPLAY: true', 'Hours status feature flag');
  assertIncludes(features, 'ENABLE_SPECIAL_HOURS: true', 'Special hours feature flag');

  [
    'hours_status_timezone_fallback_failed',
    'hours_status_time_range_invalid',
    'MAX_HOURS_STATUS_TIMEZONE_DIAGNOSTICS',
    'MAX_HOURS_STATUS_INVALID_TIME_RANGE_DIAGNOSTICS',
    'reportedHoursStatusTimeZoneFailures',
    'reportedHoursStatusInvalidTimeRanges',
    'const safeTimeZone = typeof timeZone === "string" ? timeZone : undefined;',
    'getBoundedRuntimeStringContext("timeZone", safeTimeZone)',
    'const safeHoursValue = typeof hoursValue === "string" ? hoursValue : undefined;',
    'logRuntimeFailure("hours_status_timezone_fallback_failed"',
    'logRuntimeDiagnostic("hours_status_time_range_invalid"',
  ].forEach((token) => assertIncludes(hoursDiagnostics, token, 'Hours status diagnostics boundary'));

  [
    'export function getStoreStatus(',
    "statusText: 'Hours not available'",
    'export function getStoreDayKey(',
    'const previousIntervals =',
    '.filter((range) => range.endMinutes < range.startMinutes)',
    'interval.start <= currentMinutes && currentMinutes < interval.end',
    'export function getMinutesUntilStoreStatusChange(',
    'return getStoreStatus(workingHours, timeZone, timeFormat, new Date(), specialHours);',
    "logHoursStatusTimeZoneFallback(error, timeZone, 'hours_engine_day_key', 'default_time_zone')",
    "logHoursStatusTimeZoneFallback(error, timeZone, 'hours_engine_time', 'default_time_zone')",
    "getRangesForValue(previousEffective.source, previousDateKey || previousDay, 'hours_engine_current_status')",
    "getRangesForValue(effective.source, dateKey, 'hours_engine_next_open')",
  ].forEach((token) => assertIncludes(hoursEngine, token, 'Hours engine boundary'));
  [
    'export function normalizeWorkingHoursValue(',
    'export function parseWorkingHoursRanges(',
  ].forEach((token) => assertIncludes(hoursBoundary, token, 'Hours normalization boundary'));
  assertNotIncludes(hoursEngine, '    } catch {\n        // Fallback', 'Hours engine timezone fallback must not be silent');

  [
    "import { getStoreStatus } from '@lib/hours/hoursEngine';",
    "const status = getStoreStatus(workingHours, timeZone, undefined, now, specialHours);",
    "status.statusText === 'Open' ? 'Open now' : status.statusText",
  ].forEach((token) => assertIncludes(obpHoursStatus, token, 'OBP hours status boundary'));

  assertIncludes(decisionBlocks, 'return isWithinTimeSlot(category.timeSlots, storeTimeZone);', 'Decision Blocks canonical time-slot boundary');
  assertNotIncludes(decisionBlocks, 'currentMinutes <= slotEnd', 'Decision Blocks must use the canonical exclusive-end time-slot boundary');
  assertIncludes(schema, 'parseWorkingHoursRanges(hours).map((range)', 'Structured-data hours validation boundary');
  assertIncludes(schema, 'export function buildSpecialOpeningHours(', 'Structured-data special-hours boundary');
  assertIncludes(obpSurface, 'parseWorkingHoursRanges(todayHours)', 'OBP hours display validation boundary');
  assertIncludes(obpSurface, "if (!workingHours && !specialEntry) return t('publicHoursNotAvailable');", 'OBP special-hours-only current-date boundary');
  assertIncludes(obpSurface, 'const hours = workingHours?.[day];', 'OBP special-hours-only weekly-list boundary');

  [
    'getStoreStatus(workingHours, timezone, undefined, new Date(), specialHours)',
    'getMinutesUntilStoreStatusChange(workingHours, timezone, new Date(), specialHours)',
    '&& (!specialHours || Object.keys(specialHours).length === 0)',
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
    'getStoreStatus(workingHours, timeZone, undefined, new Date(), specialHours)',
  ].forEach((token) => assertIncludes(trustSignals, token, 'Trust signals hours output boundary'));

  [
    'storeDetails?.specialHours',
    "storeStatus.statusText === 'Hours not available'",
  ].forEach((token) => assertIncludes(menuFooter, token, 'Public menu action-hours analytics boundary'));
}

function verifyDocs(readme, spec, impl, firebaseDoc, mobileDoc, websiteDoc, helpDoc, marketingDoc, inventory, report, audit, changelog) {
  [
    '**Launch boundary:** Not current launch certification or deploy approval.',
    'This README is source-gated working-hours and time-slot evidence only; Hours release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:working-hours-boundary`, authenticated desktop/mobile working-hours save QA, customer-facing public menu/OBP hours output QA across timezone/open/closed/temporary-status cases, cache/deploy evidence for store-output writes, and production-host smoke.',
    '## Source Gate',
    '`npm run verify:working-hours-boundary`',
    'Current Source Contract',
    '`ENABLE_HOURS_STATUS_DISPLAY`',
    '`ENABLE_SPECIAL_HOURS` gates owner exception management',
    'owner-set date-specific special hours',
  ].forEach((token) => assertIncludes(readme, token, 'Working hours README source gate'));

  [
    '## Current Source Boundary',
    'Current runtime covers owner-set weekly working hours, exact-date special hours, public open/closed status, Today quick-hours edits, and time-slot presets.',
    'Automatic holiday calendars are not shipped',
    'A current-date exception suppresses previous-day overnight carry.',
  ].forEach((token) => assertIncludes(spec, token, 'Working hours spec source boundary'));

  [
    '**Launch boundary:** Not current launch certification or deploy approval.',
    'This implementation doc is source-gated working-hours runtime evidence only; Hours release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:working-hours-boundary`, authenticated desktop/mobile working-hours save QA, customer-facing public menu/OBP hours output QA across timezone/open/closed/temporary-status cases, cache/deploy evidence for store-output writes, and production-host smoke.',
    '## Source Gate',
    'This implementation doc is source-gated by `npm run verify:working-hours-boundary`.',
    'Historical blueprint sections below are not launch approval',
    'Hours status fallback diagnostics',
  ].forEach((token) => assertIncludes(impl, token, 'Working hours implementation source gate'));

  [
    '**Launch boundary:** Not current launch certification or deploy approval.',
    'This Firebase cost doc is source-gated working-hours and time-slot cost evidence only; Hours release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:working-hours-boundary`, authenticated desktop/mobile working-hours save QA, customer-facing public menu/OBP hours output QA across timezone/open/closed/temporary-status cases, cache/deploy evidence for store-output writes, and production-host smoke.',
    '## Source Gate',
    '`npm run verify:working-hours-boundary`',
    'updateTimeSlotPresets()',
    'Hours status fallback diagnostics',
  ].forEach((token) => assertIncludes(firebaseDoc, token, 'Working hours Firebase source gate'));

  [
    '**Launch boundary:** Not current launch certification or deploy approval.',
    'This mobile-support doc is source-gated mobile working-hours evidence only; Hours mobile release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:working-hours-boundary`, authenticated mobile working-hours and Today quick-hours save QA, customer-facing public menu/OBP hours output QA, cache/deploy evidence for store-output writes, and production-host smoke.',
    '## Source Gate',
    '`npm run verify:working-hours-boundary`',
    'MobileWorkingHoursEditScreen',
    'MobileTimeSlotsScreen',
  ].forEach((token) => assertIncludes(mobileDoc, token, 'Working hours mobile source gate'));

  [
    'Current Source Boundary',
    'owner-set special dates',
    'add that date under Special hours',
    "Customers See If You're Open",
    'Customers see the status before they visit.',
    'current open/closed status',
  ].forEach((token) => assertIncludes(websiteDoc, token, 'Working hours website source boundary'));

  [
    'Current Source Boundary',
    'date-specific special hours',
    'Use **Temporary Status** for an unplanned closure',
  ].forEach((token) => assertIncludes(helpDoc, token, 'Working hours helpdoc source boundary'));

  assertIncludes(
    marketingDoc,
    'Automatic holiday calendars are not shipped.',
    'Working hours marketing launch boundary',
  );
  [
    'Current source-backed claim includes owner-set weekly hours, exact-date special hours, public open/closed status, Today quick edits, and time-slot presets.',
    'Use Special hours for a planned date.',
    'Use Temporary Status for a live interruption.',
  ].forEach((token) => assertIncludes(marketingDoc, token, 'Working hours marketing source boundary'));

  [
    'working-hours boundary and deterministic overnight/time-slot gates passed; browser/manual mutation pending',
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
    'Working Hours technical-doc top-boundary checkpoint',
    '`npm run verify:working-hours-boundary`',
  ].forEach((token) => assertIncludes(audit, token, 'Production audit working-hours public claim boundary'));

  [
    'Working Hours and Time-Slot Boundary',
    '`npm run verify:working-hours-boundary`',
    'Hours Status Fallback Diagnostics',
  ].forEach((token) => assertIncludes(changelog, token, 'Changelog working-hours source gate'));

  [
    'Working Hours Public Claim Boundary',
    'Working Hours technical docs have top launch boundaries',
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
  const firestoreIndexes = read('firestore.indexes.json');
  const storesDal = read('src/database/stores/index.tsx');
  const projectsDal = read('src/database/projects/index.ts');
  const presetBoundary = read('src/lib/menu/timeSlotPresetBoundary.ts');
  const cascadeReconciler = read('src/lib/menu/reconcileTimeSlotPresetCascade.ts');
  const businessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
  const workingHoursTab = read('src/components/templates/main-app/businessSettings/tabs/WorkingHoursTab.tsx');
  const integrationsTab = read('src/components/templates/main-app/businessSettings/tabs/IntegrationsTab.tsx');
  const timeSlotPresetsTab = read('src/components/templates/main-app/businessSettings/tabs/TimeSlotPresetsTab.tsx');
  const timeSlotPresetForm = read('src/components/atoms/timeSlotPresetForm/index.tsx');
  const desktopSpecialHours = read('src/components/templates/main-app/businessSettings/tabs/SpecialHoursEditor.tsx');
  const mobileWorkingHours = read('src/components/mobile/screens/MobileWorkingHoursEditScreen.tsx');
  const mobileSpecialHours = read('src/components/mobile/components/MobileSpecialHoursManager.tsx');
  const mobileHours = read('src/components/mobile/screens/MobileHoursScreen.tsx');
  const mobileTimeSlots = read('src/components/mobile/screens/MobileTimeSlotsScreen.tsx');
  const mobileMore = read('src/components/mobile/screens/MobileMoreScreen.tsx');
  const aiMenuManagerResolver = read('src/lib/ai-menu-manager/commandResolver.ts');
  const aiMenuManagerPromptHints = read('src/lib/ai-menu-manager/projectPromptHints.ts');
  const features = read('src/config/features.ts');
  const hoursEngine = read('src/lib/hours/hoursEngine.ts');
  const hoursBoundary = read('src/lib/hours/hoursBoundary.ts');
  const hoursDiagnostics = read('src/lib/hours/hoursDiagnostics.ts');
  const obpHoursStatus = read('src/lib/obp/hoursStatus.ts');
  const storeStatusBadge = read('src/components/atoms/StoreStatusBadge/index.tsx');
  const clientWebsite = read('src/components/templates/website/clientWebsite/index.tsx');
  const trustSignals = read('src/components/atoms/TrustSignals.tsx');
  const decisionBlocks = read('src/components/templates/main-app/projects/b2cView/output/DecisionBlocks.tsx');
  const schema = read('src/lib/schema/index.ts');
  const obpSurface = read('src/app/client/obp/OBPResolvedSurface.tsx');
  const menuFooter = read('src/components/templates/main-app/projects/b2cView/output/MenuFooter.tsx');
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
  const changelog = read('__docs__/changelog.md');

  verifyPackageScript(packageJson);
  verifyFirestoreCostBoundary(firestoreIndexes);
  verifyStoreDal(storesDal, presetBoundary, cascadeReconciler);
  verifyProjectCascade(projectsDal);
  verifyDesktopSettings(businessSettings, workingHoursTab, integrationsTab, timeSlotPresetsTab, timeSlotPresetForm);
  verifyMobileSettings(mobileWorkingHours, mobileHours, mobileTimeSlots, mobileMore);
  verifySpecialHoursOwnerSettings(
    storesDal,
    desktopSpecialHours,
    mobileSpecialHours,
    mobileWorkingHours,
    aiMenuManagerResolver,
    aiMenuManagerPromptHints,
  );
  verifyPublicHoursOutput(features, hoursBoundary, hoursEngine, hoursDiagnostics, obpHoursStatus, storeStatusBadge, clientWebsite, trustSignals, decisionBlocks, schema, obpSurface, menuFooter);
  verifyDocs(readme, spec, impl, firebaseDoc, mobileDoc, websiteDoc, helpDoc, marketingDoc, inventory, report, audit, changelog);

  console.log('Working Hours and time-slot boundary verifier passed');
}

main();
