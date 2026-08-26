#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const scriptPath = path.join(root, 'scripts', 'answerlattice', 'hosted-qa-menulist-widget-certification.ts');
const source = fs.readFileSync(scriptPath, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

for (const required of [
    "const QA_BASE_URL = 'https://canonica.app'",
    "const MENULIST_QA_ORIGIN = 'https://app.menulist.digital'",
    'const FULL_QUESTION_COUNT = 75',
    'const MIN_DELAY_MS = 3_100',
    'const MAX_RATE_LIMIT_RETRIES = 2',
    "credentialInput?.startsWith('/tmp/')",
    "reportOutput.startsWith('/tmp/')",
    "assert.equal(credentialStat.mode & 0o777, 0o600",
    "'x-answerlattice-widget-runtime': runtimeAuthorization.token",
    "'x-api-key': credentials.widgetKey",
    'Date.now() > runtimeAuthorization.expiresAt - 30_000',
    "response.headers.get('retry-after')",
    'rateLimitRetries >= MAX_RATE_LIMIT_RETRIES',
    'rateLimitRetries,',
    'unsupportedNonEscalation',
    'expectsEscalation(question)',
    "await writeFile(reportOutput",
    "{ mode: 0o600 }",
]) {
    assert.ok(source.includes(required), `Missing hosted widget certification guard: ${required}`);
}

for (const forbidden of [
    'neelvara-answerlattice-prod',
    'console.log(credentials.widgetKey)',
    'process.stdout.write(credentials.widgetKey)',
    ['NEXT_PUBLIC_MENULIST', 'ANSWERLATTICE_WIDGET_KEY'].join('_'),
]) {
    assert.equal(source.includes(forbidden), false, `Hosted widget certification must not contain: ${forbidden}`);
}

assert.equal(
    packageJson.scripts?.['answerlattice:hosted-qa-menulist-widget-certification'],
    "ts-node --compiler-options '{\"module\":\"CommonJS\",\"target\":\"ES2022\"}' -r tsconfig-paths/register scripts/answerlattice/hosted-qa-menulist-widget-certification.ts",
);

process.stdout.write('Answerlattice hosted QA MenuList widget certification contract passed.\n');
