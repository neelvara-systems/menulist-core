import assert from 'node:assert/strict';
import { buildShortcuts } from '@lib/pwa/shortcutsBuilder';

const withoutMenu = buildShortcuts({
    menuPath: null,
    phone: '+919999999999',
});
assert.equal(withoutMenu.some((shortcut) => shortcut.name === 'View Menu'), false);
assert.equal(withoutMenu.some((shortcut) => shortcut.name === 'Call'), true);

const withMenu = buildShortcuts({ menuPath: '/menu' });
assert.deepEqual(withMenu, [{
    name: 'View Menu',
    short_name: 'Menu',
    description: 'Open the menu',
    url: '/menu?entry_source=shortcut-menu',
}]);

console.log('Public delivery PWA shortcut boundary tests passed.');
