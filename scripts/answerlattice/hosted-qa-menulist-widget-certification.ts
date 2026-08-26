#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { chmod, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const QA_BASE_URL = 'https://canonica.app';
const MENULIST_QA_ORIGIN = 'https://app.menulist.digital';
const QUESTION_FILE = resolve(
    process.cwd(),
    'menulist-answerlattice-upload-inputs/production-onboarding/live-owner-support-test-questions.csv',
);
const FULL_QUESTION_COUNT = 75;
const MIN_DELAY_MS = 3_100;
const MAX_RATE_LIMIT_RETRIES = 2;
const REQUEST_TIMEOUT_MS = 45_000;

type Mode = 'smoke' | 'full';

type Question = {
    id: string;
    question: string;
    coverageArea: string;
    expectedBehavior: string;
    riskLevel: string;
};

type FixtureCredentials = {
    credentialVersion: 1;
    fixtureId: string;
    widgetKey: string;
};

type RuntimeAuthorization = {
    expiresAt: number;
    token: string;
};

function readArg(name: string): string | null {
    const prefix = `--${name}=`;
    const match = process.argv.slice(3).find(argument => argument.startsWith(prefix));
    return match ? match.slice(prefix.length) : null;
}

function readMode(): Mode {
    const mode = process.argv[2];
    if (mode === 'smoke' || mode === 'full') return mode;
    throw new Error(
        'Usage: hosted-qa-menulist-widget-certification.ts <smoke|full> '
        + '--credential-input=/tmp/<fixture>-credentials.json '
        + '[--report-output=/tmp/<fixture>-widget-certification.json]',
    );
}

function parseCsv(raw: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let quoted = false;
    for (let index = 0; index < raw.length; index += 1) {
        const character = raw[index];
        if (quoted) {
            if (character === '"' && raw[index + 1] === '"') {
                field += '"';
                index += 1;
            } else if (character === '"') quoted = false;
            else field += character;
        } else if (character === '"') quoted = true;
        else if (character === ',') {
            row.push(field);
            field = '';
        } else if (character === '\n') {
            row.push(field.replace(/\r$/, ''));
            if (row.some(Boolean)) rows.push(row);
            row = [];
            field = '';
        } else field += character;
    }
    if (quoted) throw new Error('Owner-support question CSV has an unclosed quoted field.');
    if (field || row.length) {
        row.push(field.replace(/\r$/, ''));
        if (row.some(Boolean)) rows.push(row);
    }
    return rows;
}

async function readQuestions(): Promise<Question[]> {
    const rows = parseCsv(await readFile(QUESTION_FILE, 'utf8'));
    assert.deepEqual(rows[0], ['id', 'question', 'coverage_area', 'expected_behavior', 'risk_level']);
    const questions = rows.slice(1).map((row) => {
        assert.equal(row.length, 5, `Invalid question row: ${row[0] || '(missing id)'}`);
        return {
            id: row[0],
            question: row[1],
            coverageArea: row[2],
            expectedBehavior: row[3],
            riskLevel: row[4],
        };
    });
    assert.equal(questions.length, FULL_QUESTION_COUNT);
    assert.equal(new Set(questions.map(question => question.id)).size, FULL_QUESTION_COUNT);
    return questions;
}

function getQuestionContext(question: Question) {
    const normalizedArea = question.coverageArea.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 64);
    return {
        contextVersion: 1,
        path: '/dashboard',
        title: 'MenuList owner dashboard',
        contextKey: `menulist_cert_${normalizedArea}`.slice(0, 100),
        feature: normalizedArea,
        page: 'dashboard',
        workflow: 'owner_support_certification',
        userRole: 'owner',
        entityHints: normalizedArea.split('_').filter(Boolean).slice(0, 5),
    };
}

function expectsEscalation(question: Question): boolean {
    return /\b(escalat(?:e|ion)|route to support|approved privacy\/data process)\b/i
        .test(question.expectedBehavior);
}

async function getRuntimeAuthorization(widgetKey: string): Promise<RuntimeAuthorization> {
    const response = await fetch(`${QA_BASE_URL}/api/widget/config`, {
        cache: 'no-store',
        headers: {
            origin: MENULIST_QA_ORIGIN,
            'user-agent': 'Answerlattice-MenuList-QA-Certification/1.0',
            'x-api-key': widgetKey,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = await response.json() as Record<string, any>;
    if (
        response.status !== 200
        || body.runtimeAuthorization?.required !== true
        || typeof body.runtimeAuthorization?.token !== 'string'
        || !Number.isFinite(body.runtimeAuthorization?.expiresAt)
    ) throw new Error(`Hosted QA widget configuration failed with status ${response.status}.`);
    return body.runtimeAuthorization;
}

const delay = (milliseconds: number) => new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds));

function readRetryAfterMs(response: Response): number {
    const rawRetryAfter = response.headers.get('retry-after')?.trim() || '';
    const retryAfterSeconds = Number(rawRetryAfter);
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
        return Math.max(Math.ceil(retryAfterSeconds * 1_000), MIN_DELAY_MS);
    }
    const retryAt = Date.parse(rawRetryAfter);
    if (Number.isFinite(retryAt)) return Math.max(retryAt - Date.now(), MIN_DELAY_MS);
    return 60_000;
}

async function main(): Promise<void> {
    const mode = readMode();
    const credentialInput = readArg('credential-input');
    if (!credentialInput?.startsWith('/tmp/') || !credentialInput.endsWith('.json')) {
        throw new Error('Credential input must be an absolute /tmp/*.json path.');
    }
    const credentialStat = await stat(credentialInput);
    assert.equal(credentialStat.mode & 0o777, 0o600, 'Credential input must use mode 0600.');
    const credentials = JSON.parse(await readFile(credentialInput, 'utf8')) as FixtureCredentials;
    assert.equal(credentials.credentialVersion, 1);
    assert.match(credentials.fixtureId, /^al-first-client-qa-[a-z0-9]{10}$/);
    assert.match(credentials.widgetKey, /^al_[A-Za-z0-9_-]{20,128}$/);

    const reportOutput = readArg('report-output')
        || `/tmp/${credentials.fixtureId}-widget-certification.json`;
    if (!reportOutput.startsWith('/tmp/') || !reportOutput.endsWith('.json')) {
        throw new Error('Report output must be an absolute /tmp/*.json path.');
    }

    const allQuestions = await readQuestions();
    const questions = mode === 'full' ? allQuestions : allQuestions.slice(0, 3);
    const results: Array<Record<string, unknown>> = [];
    let runtimeAuthorization = await getRuntimeAuthorization(credentials.widgetKey);

    for (let index = 0; index < questions.length; index += 1) {
        const question = questions[index];
        if (Date.now() > runtimeAuthorization.expiresAt - 30_000) {
            runtimeAuthorization = await getRuntimeAuthorization(credentials.widgetKey);
        }
        const requestId = `mlqa-${question.id.toLowerCase()}-${randomUUID().replaceAll('-', '').slice(0, 16)}`;
        const startedAt = Date.now();
        let response: Response;
        let payload: Record<string, any> = {};
        let networkError: string | null = null;
        let rateLimitRetries = 0;
        while (true) {
            try {
                response = await fetch(`${QA_BASE_URL}/api/widget/search`, {
                    method: 'POST',
                    cache: 'no-store',
                    headers: {
                        'content-type': 'application/json',
                        origin: MENULIST_QA_ORIGIN,
                        'user-agent': 'Answerlattice-MenuList-QA-Certification/1.0',
                        'x-answerlattice-widget-runtime': runtimeAuthorization.token,
                        'x-api-key': credentials.widgetKey,
                    },
                    body: JSON.stringify({
                        requestId,
                        query: question.question,
                        sessionId: `${credentials.fixtureId}-owner-support-certification`,
                        context: getQuestionContext(question),
                        visitor: { id: 'menulist-qa-certification-owner' },
                    }),
                    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
                });
                payload = await response.json().catch(() => ({}));
                if (response.status !== 429 || rateLimitRetries >= MAX_RATE_LIMIT_RETRIES) break;
                rateLimitRetries += 1;
                await delay(readRetryAfterMs(response));
                if (Date.now() > runtimeAuthorization.expiresAt - 30_000) {
                    runtimeAuthorization = await getRuntimeAuthorization(credentials.widgetKey);
                }
            } catch (error) {
                response = new Response(null, { status: 599 });
                networkError = error instanceof Error ? error.name : 'unknown_network_error';
                break;
            }
        }
        const answer = typeof payload.answer === 'string' ? payload.answer.trim() : '';
        results.push({
            ...question,
            expectedEscalation: expectsEscalation(question),
            requestId,
            status: response.status,
            durationMs: Date.now() - startedAt,
            answer,
            answerHash: answer ? createHash('sha256').update(answer).digest('hex') : null,
            answerPresent: Boolean(answer),
            answerSource: typeof payload.answerSource === 'string' ? payload.answerSource : null,
            canonical: payload.canonical === true,
            fallbackSuggested: payload.fallbackSuggested === true,
            fallbackReason: typeof payload.fallbackReason === 'string' ? payload.fallbackReason : null,
            referenceCount: Array.isArray(payload.references) ? payload.references.length : 0,
            citationCount: Array.isArray(payload.citations) ? payload.citations.length : 0,
            searchHistoryIdPresent: typeof payload.searchHistoryId === 'string' && payload.searchHistoryId.length > 0,
            rateLimitRetries,
            networkError,
        });
        if (index < questions.length - 1) await delay(MIN_DELAY_MS);
    }

    const summary = {
        mode,
        fixtureId: credentials.fixtureId,
        questionCount: questions.length,
        passedTransport: results.filter(result => result.status === 200 && result.answerPresent === true).length,
        emptyAnswers: results.filter(result => result.answerPresent !== true).length,
        emptySource: results.filter(result => result.answerSource === 'empty').length,
        canonicalAnswers: results.filter(result => result.canonical === true).length,
        fallbackSuggested: results.filter(result => result.fallbackSuggested === true).length,
        highRiskQuestions: results.filter(result => result.riskLevel === 'high').length,
        unsupportedNonEscalation: results.filter(result => (
            result.answerSource === 'empty'
            && result.expectedEscalation !== true
        )).length,
        p95DurationMs: [...results]
            .map(result => Number(result.durationMs))
            .sort((left, right) => left - right)[Math.max(Math.ceil(results.length * 0.95) - 1, 0)] || 0,
    };
    await writeFile(reportOutput, JSON.stringify({
        schemaVersion: 1,
        environment: 'answerlattice_qa',
        baseUrl: QA_BASE_URL,
        origin: MENULIST_QA_ORIGIN,
        generatedAt: new Date().toISOString(),
        summary,
        results,
    }, null, 2), { mode: 0o600 });
    await chmod(reportOutput, 0o600);
    assert.equal((await stat(reportOutput)).mode & 0o777, 0o600);
    process.stdout.write(JSON.stringify({ reportOutput, summary }, null, 2) + '\n');

    if (
        summary.passedTransport !== questions.length
        || summary.emptyAnswers > 0
        || summary.unsupportedNonEscalation > 0
    ) process.exitCode = 1;
}

main().catch(error => {
    console.error(error instanceof Error ? error.message : 'Hosted QA widget certification failed.');
    process.exitCode = 1;
});
