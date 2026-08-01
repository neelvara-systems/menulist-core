import assert from 'node:assert/strict';

import { DEFAULT_DARK_COLOR, DEFAULT_LIGHT_COLOR } from '../../src/constants/common';
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

console.log('Ant Design persisted theme boundary tests passed.');
