import assert from 'node:assert/strict';
import { getUseMenuListPrerequisiteState } from '../../src/components/templates/main-app/useMenuList/useMenuListReadiness';

assert.equal(getUseMenuListPrerequisiteState({ hasMenu: false }), 'no_menu');
assert.equal(getUseMenuListPrerequisiteState({ hasMenu: true }), 'missing_public_address');
assert.equal(
    getUseMenuListPrerequisiteState({ hasMenu: true, subdomain: '   ' }),
    'missing_public_address',
);
assert.equal(
    getUseMenuListPrerequisiteState({ hasMenu: true, subdomain: 'local-qa' }),
    'ready',
);
assert.equal(
    getUseMenuListPrerequisiteState({ customDomain: 'menu.example.test', hasMenu: true }),
    'ready',
);

process.stdout.write('Use MenuList prerequisite-state boundary tests passed.\n');
