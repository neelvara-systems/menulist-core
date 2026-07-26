import assert from 'node:assert/strict';
import {
    CSP_REPORT_FIELD_MAX_LENGTH,
    determineCspViolationSeverity,
    normalizeCspViolationReport,
} from '../../src/lib/security/cspReport';

const canonical = normalizeCspViolationReport({
    'csp-report': {
        'blocked-uri': '  https://cdn.example.com/\nasset.js  ',
        'column-number': '12',
        'line-number': 9,
        'source-file': 'https://example.com/page',
        'violated-directive': 'SCRIPT-SRC-ELEM',
    },
});

assert.deepEqual(canonical, {
    blockedUri: 'https://cdn.example.com/ asset.js',
    columnNumber: 12,
    lineNumber: 9,
    sourceFile: 'https://example.com/page',
    violatedDirective: 'SCRIPT-SRC-ELEM',
});
assert.equal(determineCspViolationSeverity(canonical!), 'high');

for (const malformed of [
    null,
    false,
    1,
    'report',
    [],
    {},
    { 'csp-report': null },
    { 'csp-report': [] },
    { 'csp-report': 'report' },
]) {
    assert.equal(normalizeCspViolationReport(malformed), null);
}

const bounded = normalizeCspViolationReport({
    'csp-report': {
        'blocked-uri': `\u0000${'x'.repeat(CSP_REPORT_FIELD_MAX_LENGTH + 50)}`,
        'column-number': -1,
        'line-number': Number.MAX_SAFE_INTEGER,
    },
});
assert.equal(bounded?.blockedUri?.length, CSP_REPORT_FIELD_MAX_LENGTH);
assert.equal(bounded?.blockedUri?.includes('\u0000'), false);
assert.equal(bounded?.columnNumber, undefined);
assert.equal(bounded?.lineNumber, undefined);

assert.equal(
    determineCspViolationSeverity({
        blockedUri: 'https://not-google.example/script.js',
        violatedDirective: 'script-src-elem',
    }),
    'high',
);
assert.equal(
    determineCspViolationSeverity({
        blockedUri: 'https://evilgoogle.example/script.js',
        violatedDirective: 'script-src',
    }),
    'high',
);
assert.equal(
    determineCspViolationSeverity({
        blockedUri: 'inline',
        violatedDirective: 'SCRIPT-SRC',
    }),
    'high',
);
assert.equal(
    determineCspViolationSeverity({ violatedDirective: 'style-src-elem' }),
    'low',
);
assert.equal(
    determineCspViolationSeverity({ violatedDirective: 'font-src' }),
    'low',
);
assert.equal(
    determineCspViolationSeverity({ violatedDirective: 'connect-src' }),
    'medium',
);

console.log('CSP report boundary regression checks passed.');
