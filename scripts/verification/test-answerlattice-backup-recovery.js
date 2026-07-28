const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  APPLY_ENV,
  DAILY_RETENTION_SECONDS,
  DEFAULT_DATABASE,
  PROJECTS,
  RESTORE_DATABASE_PATTERN,
  assertBackupResource,
  assertProjectConfirmation,
  assertRestoreDatabase,
  isExpectedDailySchedule,
  resolveStage,
} = require('../answerlattice/backup-recovery');

assert.deepStrictEqual(PROJECTS, {
  qa: 'answerlattice-qa',
  prod: 'answerlattice',
});
assert.strictEqual(DEFAULT_DATABASE, '(default)');
assert.strictEqual(APPLY_ENV, 'ANSWERLATTICE_BACKUP_APPLY');
assert.strictEqual(DAILY_RETENTION_SECONDS, '8467200s');
assert.strictEqual(resolveStage('qa'), 'answerlattice-qa');
assert.strictEqual(resolveStage('prod'), 'answerlattice');
assert.throws(() => resolveStage('production'), /Stage must be one of/);
assert.doesNotThrow(() => assertProjectConfirmation('answerlattice-qa', 'answerlattice-qa'));
assert.throws(
  () => assertProjectConfirmation('answerlattice-qa', 'answerlattice'),
  /--confirm-project answerlattice-qa/,
);
assert.throws(
  () => assertProjectConfirmation('answerlattice', undefined),
  /--confirm-project answerlattice/,
);

assert.doesNotThrow(() => assertBackupResource(
  'answerlattice-qa',
  'projects/answerlattice-qa/locations/nam5/backups/2026-07-18T010203_12345',
));
assert.throws(
  () => assertBackupResource(
    'answerlattice-qa',
    'projects/answerlattice/locations/nam5/backups/2026-07-18T010203_12345',
  ),
  /must belong to answerlattice-qa/,
);
assert.throws(
  () => assertBackupResource('answerlattice-qa', 'backup-id-only'),
  /full managed-backup resource name/,
);

assert(RESTORE_DATABASE_PATTERN.test('answerlattice-recovery-20260718'));
assert.doesNotThrow(() => assertRestoreDatabase('answerlattice-recovery-20260718'));
assert.throws(() => assertRestoreDatabase('(default)'), /answerlattice-recovery/);
assert.throws(() => assertRestoreDatabase('answerlattice'), /answerlattice-recovery/);
assert.throws(
  () => assertRestoreDatabase('answerlattice-recovery-2026_07_18'),
  /answerlattice-recovery/,
);

assert.strictEqual(isExpectedDailySchedule({
  dailyRecurrence: {},
  retention: DAILY_RETENTION_SECONDS,
}), true);
assert.strictEqual(isExpectedDailySchedule({
  weeklyRecurrence: { day: 'MONDAY' },
  retention: DAILY_RETENTION_SECONDS,
}), false);
assert.strictEqual(isExpectedDailySchedule({
  dailyRecurrence: {},
  retention: '604800s',
}), false);
assert.strictEqual(isExpectedDailySchedule(null), false);

const toolPath = path.resolve(__dirname, '../answerlattice/backup-recovery.js');
const missingConfirmation = spawnSync(
  process.execPath,
  [toolPath, 'ensure-daily', 'qa'],
  {
    encoding: 'utf8',
    env: { ...process.env, [APPLY_ENV]: '1' },
  },
);
assert.notStrictEqual(missingConfirmation.status, 0);
assert.match(missingConfirmation.stderr, /--confirm-project answerlattice-qa/);
assert.doesNotMatch(
  `${missingConfirmation.stdout}\n${missingConfirmation.stderr}`,
  /gcloud is required|No active gcloud account/,
);

console.log('Answerlattice backup/recovery contract tests passed');
