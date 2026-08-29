import assert from 'node:assert/strict';

import { DEFAULT_DARK_COLOR, DEFAULT_LIGHT_COLOR } from '../../src/constants/common';
import {
    DEFAULT_ANTD_LOCALE,
    hasLazyAntdLocale,
    loadAntdLocale,
} from '../../src/lib/antd/antdLocaleLoader';
import {
    projectPersistedThemeBoolean,
    projectPersistedThemeColor,
    resolveAntdLocaleKey,
} from '../../src/lib/antd/themeBoundary';

assert.equal(projectPersistedThemeBoolean(true), true);
assert.equal(projectPersistedThemeBoolean(false), false);
assert.equal(projectPersistedThemeBoolean('true'), false);
assert.equal(projectPersistedThemeBoolean(1), false);

assert.equal(projectPersistedThemeColor('#abcdef', 'light'), '#abcdef');
assert.equal(projectPersistedThemeColor(' #ABCDEF ', 'dark'), '#ABCDEF');
assert.equal(projectPersistedThemeColor('red', 'light'), DEFAULT_LIGHT_COLOR);
assert.equal(projectPersistedThemeColor({ toString: () => '#000000' }, 'dark'), DEFAULT_DARK_COLOR);

assert.equal(resolveAntdLocaleKey('pt_BR'), 'pt-BR');
assert.equal(resolveAntdLocaleKey('ar'), 'ar-SA');
assert.equal(resolveAntdLocaleKey({ toString: () => 'ar-SA' }), 'en-US');

async function verifyLocaleLoading(): Promise<void> {
    assert.equal(hasLazyAntdLocale('fr-FR'), true);
    assert.equal(hasLazyAntdLocale('en-US'), false);
    assert.equal(hasLazyAntdLocale('unsupported'), false);

    assert.equal(await loadAntdLocale('en-US'), DEFAULT_ANTD_LOCALE);
    assert.equal(await loadAntdLocale('unsupported'), DEFAULT_ANTD_LOCALE);
}

void verifyLocaleLoading().then(() => {
    console.log('Ant Design persisted theme and lazy locale boundary tests passed.');
});
