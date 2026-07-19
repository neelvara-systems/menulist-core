import assert from 'node:assert/strict';
import { createPublicCustomerTranslator } from '@lib/localization/publicCustomerMessages';
import { buildShortcuts } from '@lib/pwa/shortcutsBuilder';

const withoutMenu = buildShortcuts({
    menuPath: null,
    phone: '+919999999999',
});
assert.equal(withoutMenu.some((shortcut) => shortcut.url.includes('shortcut-menu')), false);
assert.equal(withoutMenu.some((shortcut) => shortcut.name === 'Call'), true);

const withMenu = buildShortcuts({ menuPath: '/menu' });
assert.deepEqual(withMenu, [{
    name: 'Menu',
    short_name: 'Menu',
    description: 'Menu',
    url: '/menu?entry_source=shortcut-menu',
}]);

const hi = createPublicCustomerTranslator('hi');
assert.deepEqual(buildShortcuts({ menuPath: '/menu' }, 'hi'), [{
    name: hi('menu.menuOffering'),
    short_name: hi('menu.menuOffering'),
    description: hi('menu.menuOffering'),
    url: '/menu?lang=hi&entry_source=shortcut-menu',
}]);

console.log('Public delivery PWA shortcut boundary tests passed.');
