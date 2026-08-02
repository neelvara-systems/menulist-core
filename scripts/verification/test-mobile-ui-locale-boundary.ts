import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { APP_LANGUAGES } from '../../src/constants/common';
import { openIsolatedBrowserUrl } from '../../src/lib/browser/openIsolatedBrowserUrl';
import { resolveMobileUiLocaleText } from '../../src/lib/localization/mobileUiLocale';
import {
    getAiActionProgressLabel,
    normalizeAiActionProgressLabels,
} from '../../src/lib/mobile/aiActionProgress';
import {
    normalizeMobileMenuUpdatedAt,
    normalizeMobileMenuVersion,
} from '../../src/lib/mobile/menuCommandMetadata';

const english = resolveMobileUiLocaleText('en-US', undefined);
const hindi = resolveMobileUiLocaleText('hi-IN', undefined);
const french = resolveMobileUiLocaleText('fr-FR', undefined);
const portuguese = resolveMobileUiLocaleText('pt-BR', undefined);

assert.deepEqual(resolveMobileUiLocaleText('en', undefined), english);
assert.deepEqual(resolveMobileUiLocaleText('HI_in', undefined), hindi);
assert.deepEqual(resolveMobileUiLocaleText(' fr ', 'hi-IN'), french);
assert.deepEqual(resolveMobileUiLocaleText('pt', undefined), portuguese);
assert.deepEqual(resolveMobileUiLocaleText('invalid-locale', 'hi'), hindi);
assert.deepEqual(resolveMobileUiLocaleText({ malformed: true }, ['hi-IN']), english);

for (const { value } of APP_LANGUAGES) {
    const text = resolveMobileUiLocaleText(value, undefined);
    assert.deepEqual(Object.keys(text).sort(), Object.keys(english).sort(), `${value} must expose the complete mobile UI contract`);
    Object.values(text).forEach((entry) => {
        assert.equal(typeof entry, 'string');
        assert.ok(entry.trim().length > 0, `${value} must not expose blank mobile UI copy`);
    });
}

const isolated = resolveMobileUiLocaleText('hi-IN', undefined);
isolated.cancel = 'mutated';
assert.equal(resolveMobileUiLocaleText('hi-IN', undefined).cancel, hindi.cancel);

assert.deepEqual(normalizeAiActionProgressLabels([]), ['Working on it...']);
assert.deepEqual(normalizeAiActionProgressLabels([' ', ' Checking ', 42]), ['Checking']);
assert.equal(getAiActionProgressLabel(['Checking', 'Saving'], 3), 'Saving');
assert.equal(
    getAiActionProgressLabel(['Finished'], 2),
    'Finished',
    'a shorter live label list must not render an undefined stale index',
);
assert.equal(getAiActionProgressLabel(['Checking', 'Saving'], -1), 'Saving');

const currentDate = new Date('2026-08-01T12:00:00.000Z');
assert.equal(normalizeMobileMenuUpdatedAt(currentDate), currentDate);
assert.equal(normalizeMobileMenuUpdatedAt('2026-08-01T12:00:00.000Z')?.toISOString(), currentDate.toISOString());
assert.equal(normalizeMobileMenuUpdatedAt({ toDate: () => currentDate }), currentDate);
assert.equal(normalizeMobileMenuUpdatedAt({ toDate: () => 'not-a-date' }), undefined);
assert.equal(normalizeMobileMenuUpdatedAt({ toDate: () => { throw new Error('legacy timestamp failure'); } }), undefined);
assert.equal(normalizeMobileMenuUpdatedAt('not-a-date'), undefined);
assert.equal(normalizeMobileMenuUpdatedAt({ seconds: 1 }), undefined);
assert.equal(normalizeMobileMenuVersion(3), 3);
assert.equal(normalizeMobileMenuVersion(0), undefined);
assert.equal(normalizeMobileMenuVersion(2.5), undefined);
assert.equal(normalizeMobileMenuVersion(Number.NaN), undefined);

const originalDocumentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
let isolatedAnchorClicked = false;
let isolatedAnchorRemoved = false;
const isolatedAnchor = {
    href: '',
    rel: '',
    target: '',
    style: { display: '' },
    click: () => { isolatedAnchorClicked = true; },
    remove: () => { isolatedAnchorRemoved = true; },
};
Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
        body: {
            appendChild: (node: unknown) => assert.equal(node, isolatedAnchor),
        },
        createElement: (tagName: string) => {
            assert.equal(tagName, 'a');
            return isolatedAnchor;
        },
    },
});
try {
    assert.equal(openIsolatedBrowserUrl('https://example.test/path'), true);
    assert.equal(isolatedAnchor.href, 'https://example.test/path');
    assert.equal(isolatedAnchor.rel, 'noopener noreferrer');
    assert.equal(isolatedAnchor.target, '_blank');
    assert.equal(isolatedAnchor.style.display, 'none');
    assert.equal(isolatedAnchorClicked, true);
    assert.equal(isolatedAnchorRemoved, true);
} finally {
    if (originalDocumentDescriptor) {
        Object.defineProperty(globalThis, 'document', originalDocumentDescriptor);
    } else {
        Reflect.deleteProperty(globalThis, 'document');
    }
}

const mobileAntdSource = readFileSync(
    resolve(process.cwd(), 'src/components/mobile/antd.tsx'),
    'utf8',
);
const mobileInputSource = mobileAntdSource.slice(
    mobileAntdSource.indexOf('export function Input({'),
    mobileAntdSource.indexOf('export function TextArea('),
);
assert.ok(mobileInputSource.includes('onChange={(event) => onChange?.(event.target.value)}'));
assert.ok(
    !mobileInputSource.includes('onInput='),
    'the mobile input adapter must forward each native edit through one React change channel',
);
const pullToRefreshSource = mobileAntdSource.slice(
    mobileAntdSource.indexOf('export function PullToRefresh('),
    mobileAntdSource.indexOf('export function SearchBar('),
);
assert.ok(pullToRefreshSource.includes('.then(onRefresh)'));
assert.ok(pullToRefreshSource.includes('MOBILE_PULL_REFRESH_THRESHOLD'));
assert.ok(
    !pullToRefreshSource.includes('return <Fragment>{children}</Fragment>'),
    'the mobile pull-to-refresh adapter must invoke the supplied refresh callback',
);

const mobileLinkCardSource = readFileSync(
    resolve(process.cwd(), 'src/components/mobile/components/MobileLinkCard.tsx'),
    'utf8',
);
assert.ok(mobileLinkCardSource.includes('ariaLabel={`Copy ${label}`}'));
assert.ok(mobileLinkCardSource.includes('ariaLabel={`Share ${label}`}'));
assert.ok(mobileLinkCardSource.includes('ariaLabel={`Show QR code for ${label}`}'));
assert.ok(mobileLinkCardSource.includes('ariaLabel={`Open ${label}`}'));

const mobileMenuCommandSource = readFileSync(
    resolve(process.cwd(), 'src/components/mobile/components/MobileMenuCommandSheet.tsx'),
    'utf8',
);
assert.ok(mobileMenuCommandSource.includes("aria-label={t('close')}"));
assert.ok(mobileMenuCommandSource.includes("description: t('menuCompletionReadyDesc')"));
assert.ok(mobileMenuCommandSource.includes("title: tPrint('menuPdf')"));
assert.ok(mobileMenuCommandSource.includes("description: tPrint('menuPdfDesc')"));
assert.ok(mobileMenuCommandSource.includes("tMenuStatus('updated', { when: lastUpdatedLabel })"));
assert.ok(mobileMenuCommandSource.includes("tPosSync('menuVersion')"));
assert.ok(!mobileMenuCommandSource.includes('lastUpdatedAt?: any'));
assert.ok(!mobileMenuCommandSource.includes('v${menuVersion}'));

[
    'src/components/mobile/components/CommunicationKit.tsx',
    'src/components/mobile/components/MobileCompliancePagesEditor.tsx',
    'src/components/mobile/components/PresenceMonitor.tsx',
    'src/components/mobile/screens/MobileAdvancedSettingsScreen.tsx',
    'src/components/mobile/screens/MobileBillingScreen.tsx',
    'src/components/mobile/screens/MobileDigitalScreensScreen.tsx',
    'src/components/mobile/screens/MobileDomainSettingsScreen.tsx',
    'src/components/mobile/screens/MobileResellerDashboardScreen.tsx',
    'src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx',
    'src/components/mobile/utils/openMobilePublicLink.ts',
].forEach((relativePath) => {
    const source = readFileSync(resolve(process.cwd(), relativePath), 'utf8');
    assert.ok(source.includes('openIsolatedBrowserUrl('), `${relativePath} must use the isolated anchor handoff`);
    assert.ok(!source.includes("window.open("), `${relativePath} must not infer success from a no-opener window handle`);
});

function listRuntimeTypeScriptFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = resolve(directory, entry.name);
        if (entry.isDirectory()) return listRuntimeTypeScriptFiles(entryPath);
        return /\.tsx?$/.test(entry.name) ? [entryPath] : [];
    });
}

listRuntimeTypeScriptFiles(resolve(process.cwd(), 'src')).forEach((filePath) => {
    const source = readFileSync(filePath, 'utf8');
    assert.ok(
        !/window\.open\([^\n]*['"]_blank['"]\s*,\s*['"]noopener,noreferrer['"]/.test(source),
        `${filePath} must not infer browser-open acknowledgement from a no-opener window handle`,
    );
});

console.log('Mobile UI locale boundary tests passed.');
