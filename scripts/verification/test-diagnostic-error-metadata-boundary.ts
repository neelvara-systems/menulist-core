import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    getBoundedErrorCode,
    getBoundedErrorCodeAtPath,
    getBoundedErrorLogContext,
    getBoundedErrorName,
    getBoundedErrorNumberAtPath,
    getBoundedErrorStringField,
    getBoundedErrorStatus,
} from '../../src/lib/monitoring/boundedLogContext';
import {
    getBoundedFunctionsErrorContext as getMenuListFunctionsErrorContext,
} from '../../functions/src/utils/boundedErrorContext';
import {
    getAnalyticsErrorContext,
    getAnalyticsIdContext,
} from '../../functions/src/analytics/analyticsDiagnostics';
import { getGeminiErrorContext } from '../../functions/src/services/gemini/geminiDiagnostics';
import {
    getBoundedFunctionsErrorContext as getAnswerlatticeFunctionsErrorContext,
} from '../../functions-answerlattice/src/utils/boundedErrorContext';
import {
    getBoundedFunctionsErrorContext as getSignalDeskFunctionsErrorContext,
} from '../../functions-signaldesk/src/utils/boundedErrorContext';
import { normalizeRuntimeDiagnosticUrl } from '../../src/lib/runtime/runtimeDiagnostics';
import { getFirebaseBootstrapConsoleMessage } from '../../src/lib/firebase/firebaseDiagnostics';

const throwingError = new Error('original failure');
Object.defineProperties(throwingError, {
    code: {
        get: () => { throw new Error('must not read code unsafely'); },
    },
    name: {
        get: () => { throw new Error('must not read name unsafely'); },
    },
    status: {
        get: () => { throw new Error('must not read status unsafely'); },
    },
});

assert.deepEqual(getBoundedErrorLogContext(throwingError), {
    sourceErrorCode: undefined,
    sourceErrorName: 'object',
    sourceStatusCode: undefined,
});
assert.equal(getBoundedErrorName(throwingError), 'object');
assert.equal(getBoundedErrorCode(throwingError), undefined);
assert.equal(getBoundedErrorStatus(throwingError), undefined);
for (const getFunctionsErrorContext of [
    getMenuListFunctionsErrorContext,
    getAnswerlatticeFunctionsErrorContext,
    getSignalDeskFunctionsErrorContext,
]) {
    assert.deepEqual(getFunctionsErrorContext(throwingError), {
        sourceErrorCode: undefined,
        sourceErrorName: 'object',
        sourceStatusCode: undefined,
    });
}
assert.deepEqual(getAnalyticsErrorContext(throwingError), {
    code: undefined,
    name: 'object',
    status: undefined,
});
assert.deepEqual(getGeminiErrorContext(throwingError), {
    code: undefined,
    name: 'object',
    status: undefined,
});

const nested = {
    error: {
        code: 'provider/conflict',
        statusCode: '409',
    },
    response: {
        retryAfter: '30',
    },
};
assert.equal(getBoundedErrorCodeAtPath(nested, ['error', 'code']), 'provider/conflict');
assert.equal(getBoundedErrorNumberAtPath(nested, ['error', 'statusCode']), 409);
assert.equal(getBoundedErrorNumberAtPath(nested, ['response', 'retryAfter']), 30);
assert.equal(getBoundedErrorStringField({ digest: 'NEXT_REDIRECT;replace;/owner' }, 'digest'), 'NEXT_REDIRECT;replace;/owner');

const throwingProxy = new Proxy({}, {
    get: () => { throw new Error('must contain proxy get'); },
    has: () => { throw new Error('must contain proxy has'); },
});
assert.equal(getBoundedErrorCodeAtPath(throwingProxy, ['error', 'code']), undefined);
assert.equal(getBoundedErrorNumberAtPath(throwingProxy, ['response', 'status']), undefined);
assert.deepEqual(getAnalyticsErrorContext(throwingProxy), {
    code: undefined,
    name: 'object',
    status: undefined,
});
assert.deepEqual(getGeminiErrorContext(throwingProxy), {
    code: undefined,
    name: 'object',
    status: undefined,
});

const firebaseNetworkError = Object.assign(new Error('request failed'), {
    code: 'auth/network-request-failed',
    status: 503,
});
assert.equal(
    getFirebaseBootstrapConsoleMessage('firebase_auth_session_provider_sync_failed', firebaseNetworkError),
    '[Firebase Bootstrap] Operation failed failure=firebase_auth_session_provider_sync_failed source=auth/network-request-failed status=503',
);
assert.equal(
    getFirebaseBootstrapConsoleMessage('token=must-not-log', { code: 'secret value' }),
    '[Firebase Bootstrap] Operation failed failure=unknown source=unknown',
);

let analyticsIdCoercionAttempted = false;
assert.deepEqual(getAnalyticsIdContext({
    toString: () => {
        analyticsIdCoercionAttempted = true;
        throw new Error('must not coerce analytics identifiers');
    },
}), {
    present: false,
    length: 0,
});
assert.equal(analyticsIdCoercionAttempted, false);
assert.deepEqual(getAnalyticsIdContext(1204), {
    present: true,
    length: 4,
});

assert.equal(
    normalizeRuntimeDiagnosticUrl(
        'https://app.menulist.ai/client/acme?token=secret#private',
        'https://app.menulist.ai',
    ),
    'https://app.menulist.ai/client/acme',
);
assert.equal(
    normalizeRuntimeDiagnosticUrl(
        'https://private.example.com/customer/acme?email=owner@example.com',
        'https://app.menulist.ai',
    ),
    'https://private.example.com',
);
assert.equal(
    normalizeRuntimeDiagnosticUrl('https://user:secret@example.com/path', 'https://app.menulist.ai'),
    undefined,
);
assert.equal(
    normalizeRuntimeDiagnosticUrl('javascript:alert(1)', 'https://app.menulist.ai'),
    undefined,
);

const sourceFiles: string[] = [];
const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            visit(absolutePath);
        } else if (/\.(?:ts|tsx)$/.test(entry.name)) {
            sourceFiles.push(absolutePath);
        }
    }
};
[
    'src',
    'functions/src',
    'functions-answerlattice/src',
    'functions-signaldesk/src',
].forEach((sourceRoot) => visit(path.resolve(process.cwd(), sourceRoot)));

const forbiddenPatterns: Array<{ label: string; pattern: RegExp }> = [
    { label: 'unknown error code String coercion', pattern: /String\s*\(\s*(?:error|err)(?:\?|\.)[\s\S]{0,80}?code[\s\S]{0,30}?\)/ },
    { label: 'local code variable String coercion', pattern: /String\s*\(\s*code\s*\)\s*\.slice/ },
    { label: 'unknown status Number coercion', pattern: /Number\s*\(\s*(?:statusValue|(?:error|err)(?:\?|\.)[\s\S]{0,80}?(?:status|statusCode))\s*\)/ },
    {
        label: 'unsafe Error name conditional',
        pattern: /\b([A-Za-z_$][\w$]*)\s+instanceof Error\s*\?[\s\S]{0,80}?\1\.name/,
    },
    {
        label: 'unsafe Error name guard',
        pattern: /\b([A-Za-z_$][\w$]*)\s+instanceof Error\s*&&[\s\S]{0,80}?\1\.name/,
    },
    {
        label: 'Functions diagnostic code/status pre-read',
        pattern: /const\s+(?:record|sourceError)\s*=\s*error as [^;\n]*(?:code|status)/,
    },
    {
        label: 'Functions diagnostic local status coercion',
        pattern: /String\s*\(\s*(?:status|statusValue|record\.code|code)\s*\)\s*\.slice/,
    },
];

const violations: string[] = [];
for (const file of sourceFiles) {
    const source = fs.readFileSync(file, 'utf8');
    for (const { label, pattern } of forbiddenPatterns) {
        if (
            label.startsWith('unsafe Error name')
            && /(?:^|\/)bounded(?:Log|Error)Context\.ts$/.test(file)
        ) {
            continue;
        }
        if (pattern.test(source)) {
            violations.push(`${path.relative(process.cwd(), file)}: ${label}`);
        }
    }
}

assert.deepEqual(violations, [], `Unsafe diagnostic metadata coercion restored:\n${violations.join('\n')}`);

console.log(`Diagnostic error metadata boundary passed across ${sourceFiles.length} source files.`);
