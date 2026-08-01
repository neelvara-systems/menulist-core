import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { APP_LANGUAGES } from '../../src/constants/common';
import { resolveMobileUiLocaleText } from '../../src/lib/localization/mobileUiLocale';

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

console.log('Mobile UI locale boundary tests passed.');
