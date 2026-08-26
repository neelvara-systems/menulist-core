import assert from 'node:assert/strict';

import { renderTenantDomainCopy } from '../../src/lib/domains/tenantDomainCopy';

const translatedCopy = 'Customers use yourname.menulist.online. Visitors to menulist.online are redirected.';

assert.equal(
    renderTenantDomainCopy(translatedCopy, 'menulist.digital'),
    'Customers use yourname.menulist.digital. Visitors to menulist.digital are redirected.',
);
assert.equal(renderTenantDomainCopy(translatedCopy, 'menulist.online'), translatedCopy);
assert.equal(renderTenantDomainCopy(translatedCopy, ' MENULIST.DIGITAL '), 'Customers use yourname.menulist.digital. Visitors to menulist.digital are redirected.');
assert.equal(renderTenantDomainCopy(translatedCopy, ''), translatedCopy);

console.log('Tenant-domain owner copy tests passed.');
