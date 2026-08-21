const { spawnSync } = require('child_process');

const PROJECTS = Object.freeze({
  qa: 'neelvara-answerlattice-qa',
  prod: 'neelvara-answerlattice-prod',
});

const DEFAULT_DATABASE = '(default)';
const APPLY_ENV = 'ANSWERLATTICE_BACKUP_APPLY';
const DAILY_RETENTION_SECONDS = '8467200s';
const RESTORE_DATABASE_PATTERNS = Object.freeze({
  qa: /^answerlattice-recovery-[a-z0-9-]{8,40}$/,
  prod: /^answerlattice-prod-recovery-[a-z0-9-]{8,40}$/,
});

function fail(message) {
  throw new Error(message);
}

function resolveStage(stage) {
  const projectId = PROJECTS[stage];
  if (!projectId) {
    fail(`Stage must be one of: ${Object.keys(PROJECTS).join(', ')}`);
  }
  return projectId;
}

function assertApplyEnabled() {
  if (process.env[APPLY_ENV] !== '1') {
    fail(`Cloud changes require ${APPLY_ENV}=1`);
  }
}

function assertProjectConfirmation(projectId, confirmation) {
  if (confirmation !== projectId) {
    fail(`Cloud changes require --confirm-project ${projectId}`);
  }
}

function assertBackupResource(projectId, backupResource) {
  const pattern = new RegExp(
    `^projects/${projectId}/locations/[a-z0-9-]+/backups/[A-Za-z0-9_-]+$`,
  );
  if (!pattern.test(backupResource)) {
    fail(`Backup resource must belong to ${projectId} and use the full managed-backup resource name`);
  }
}

function assertRestoreDatabase(stage, databaseId) {
  const pattern = RESTORE_DATABASE_PATTERNS[stage];
  if (!pattern) {
    fail(`Stage must be one of: ${Object.keys(RESTORE_DATABASE_PATTERNS).join(', ')}`);
  }
  if (!pattern.test(databaseId)) {
    const prefix = stage === 'prod' ? 'answerlattice-prod-recovery-*' : 'answerlattice-recovery-*';
    fail(`Restore database for ${stage} must be a new ${prefix} database with a dated suffix`);
  }
  if (databaseId === DEFAULT_DATABASE) {
    fail('The default database is never a permitted restore target');
  }
}

function isExpectedDailySchedule(schedule) {
  return Boolean(
    schedule
    && typeof schedule === 'object'
    && Object.prototype.hasOwnProperty.call(schedule, 'dailyRecurrence')
    && schedule.retention === DAILY_RETENTION_SECONDS,
  );
}

function runGcloud(args, options = {}) {
  const result = spawnSync('gcloud', args, {
    encoding: options.capture ? 'utf8' : undefined,
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.error) {
    fail(`gcloud is required and could not be started: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = options.capture ? result.stderr.trim() : '';
    fail(`gcloud ${args[0]} failed${detail ? `: ${detail}` : ''}`);
  }
  return options.capture ? result.stdout.trim() : '';
}

function assertOperatorAccess(projectId) {
  runGcloud(['version']);
  const account = runGcloud(
    ['auth', 'list', '--filter=status:ACTIVE', '--format=value(account)'],
    { capture: true },
  );
  if (!account) {
    fail('No active gcloud account is available');
  }
  runGcloud(['projects', 'describe', projectId, '--format=value(projectId)']);
  return account;
}

function listSchedules(
  projectId,
  format = 'table(name,dailyRecurrence,weeklyRecurrence,retention)',
) {
  return runGcloud([
    'firestore',
    'backups',
    'schedules',
    'list',
    `--database=${DEFAULT_DATABASE}`,
    `--project=${projectId}`,
    `--format=${format}`,
  ], { capture: format === 'json' });
}

function listBackups(projectId) {
  runGcloud([
    'firestore',
    'backups',
    'list',
    `--project=${projectId}`,
    '--format=table(name,createTime,expireTime,state)',
  ]);
}

function preflight(stage) {
  const projectId = resolveStage(stage);
  const account = assertOperatorAccess(projectId);
  console.log(`Using ${account} against ${projectId}`);
  runGcloud([
    'firestore',
    'databases',
    'describe',
    `--database=${DEFAULT_DATABASE}`,
    `--project=${projectId}`,
  ]);
  listSchedules(projectId);
  listBackups(projectId);
}

function ensureDailyBackup(stage, confirmation) {
  const projectId = resolveStage(stage);
  assertApplyEnabled();
  assertProjectConfirmation(projectId, confirmation);
  assertOperatorAccess(projectId);

  const rawSchedules = listSchedules(projectId, 'json');
  let schedules;
  try {
    schedules = JSON.parse(rawSchedules || '[]');
  } catch {
    fail('Unable to parse the existing managed-backup schedules');
  }
  if (!Array.isArray(schedules)) {
    fail('Managed-backup schedules returned an unexpected response');
  }
  if (schedules.length === 1 && isExpectedDailySchedule(schedules[0])) {
    console.log('The daily 14-week managed-backup schedule already exists; no change was made.');
    console.log(JSON.stringify(schedules, null, 2));
    return;
  }
  if (schedules.length > 0) {
    console.log(JSON.stringify(schedules, null, 2));
    fail(
      'Existing managed-backup schedules do not exactly match one daily 14-week policy; review them manually',
    );
  }

  runGcloud([
    'firestore',
    'backups',
    'schedules',
    'create',
    `--database=${DEFAULT_DATABASE}`,
    '--recurrence=daily',
    '--retention=14w',
    `--project=${projectId}`,
    '--quiet',
  ]);
  listSchedules(projectId);
}

function restoreRehearsal(stage, backupResource, destinationDatabase, confirmation) {
  const projectId = resolveStage(stage);
  assertApplyEnabled();
  assertProjectConfirmation(projectId, confirmation);
  assertBackupResource(projectId, backupResource);
  assertRestoreDatabase(stage, destinationDatabase);
  assertOperatorAccess(projectId);

  const databasesRaw = runGcloud([
    'firestore',
    'databases',
    'list',
    `--project=${projectId}`,
    '--format=json',
  ], { capture: true });
  let databases;
  try {
    databases = JSON.parse(databasesRaw || '[]');
  } catch {
    fail('Unable to parse the current Firestore database list');
  }
  const destinationExists = Array.isArray(databases) && databases.some((database) => {
    const name = typeof database?.name === 'string' ? database.name : '';
    return name.endsWith(`/databases/${destinationDatabase}`);
  });
  if (destinationExists) {
    fail(`Restore destination ${destinationDatabase} already exists`);
  }

  runGcloud([
    'firestore',
    'databases',
    'restore',
    `--source-backup=${backupResource}`,
    `--destination-database=${destinationDatabase}`,
    `--project=${projectId}`,
    '--quiet',
  ]);
}

function printUsage() {
  console.log(`Usage:
  node scripts/answerlattice/backup-recovery.js preflight <qa|prod>
  ${APPLY_ENV}=1 node scripts/answerlattice/backup-recovery.js ensure-daily <qa|prod> --confirm-project <project-id>
  ${APPLY_ENV}=1 node scripts/answerlattice/backup-recovery.js restore-rehearsal qa <backup-resource> <answerlattice-recovery-* database> --confirm-project neelvara-answerlattice-qa
  ${APPLY_ENV}=1 node scripts/answerlattice/backup-recovery.js restore-rehearsal prod <backup-resource> <answerlattice-prod-recovery-* database> --confirm-project neelvara-answerlattice-prod`);
}

function main(argv) {
  const positional = [];
  let confirmation;
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--confirm-project') {
      if (confirmation !== undefined || index + 1 >= argv.length) {
        fail('--confirm-project must be supplied exactly once with a project ID');
      }
      confirmation = argv[index + 1];
      index += 1;
      continue;
    }
    if (value.startsWith('-')) {
      fail(`Unsupported option: ${value}`);
    }
    positional.push(value);
  }

  const [command, stage, backupResource, destinationDatabase, extra] = positional;
  if (extra) {
    printUsage();
    fail('Invalid backup/recovery command');
  }
  if (command === 'preflight' && stage && !backupResource) {
    if (confirmation !== undefined) {
      fail('--confirm-project is accepted only for cloud changes');
    }
    preflight(stage);
    return;
  }
  if (command === 'ensure-daily' && stage && !backupResource) {
    ensureDailyBackup(stage, confirmation);
    return;
  }
  if (
    command === 'restore-rehearsal'
    && stage
    && backupResource
    && destinationDatabase
  ) {
    restoreRehearsal(stage, backupResource, destinationDatabase, confirmation);
    return;
  }
  printUsage();
  fail('Invalid backup/recovery command');
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Backup/recovery command failed');
    process.exitCode = 1;
  }
}

module.exports = {
  APPLY_ENV,
  DAILY_RETENTION_SECONDS,
  DEFAULT_DATABASE,
  PROJECTS,
  RESTORE_DATABASE_PATTERNS,
  assertBackupResource,
  assertProjectConfirmation,
  assertRestoreDatabase,
  isExpectedDailySchedule,
  resolveStage,
};
