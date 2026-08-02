import assert from 'node:assert/strict';
import {
  resolveMenuListOwnerAppUrl,
  resolveMenuListOwnerSignInUrl,
  resolveMenuListTenantBaseDomain,
} from '../../functions/src/config/menulistRuntimeUrls';

assert.equal(
  resolveMenuListOwnerAppUrl({
    configuredUrl: 'https://app.menulist.digital',
    projectId: 'menulist-qa',
  }),
  'https://app.menulist.digital',
);

assert.equal(
  resolveMenuListTenantBaseDomain({
    configuredDomain: 'menulist.digital',
    projectId: 'menulist-qa',
  }),
  'menulist.digital',
);
assert.equal(
  resolveMenuListTenantBaseDomain({
    configuredDomain: 'menulist.online',
    projectId: 'menulist',
  }),
  'menulist.online',
);
assert.equal(
  resolveMenuListTenantBaseDomain({
    configuredDomain: 'menulist.online',
    projectId: 'menulist-qa',
  }),
  null,
  'QA must reject the production customer-domain suffix',
);
assert.equal(
  resolveMenuListTenantBaseDomain({
    configuredDomain: 'example.com',
    projectId: 'demo-functions-runtime-urls',
  }),
  null,
  'unknown customer-domain suffixes must fail closed',
);
assert.equal(
  resolveMenuListOwnerSignInUrl({
    configuredUrl: 'https://app.menulist.ai',
    projectId: 'menulist',
  }),
  'https://app.menulist.ai/signin',
);
assert.equal(
  resolveMenuListOwnerAppUrl({ projectId: 'menulist-qa' }),
  'https://app.menulist.digital',
);
assert.equal(
  resolveMenuListOwnerAppUrl({ projectId: 'menulist' }),
  'https://app.menulist.ai',
);

for (const configuredUrl of [
  'http://app.menulist.digital',
  'https://menulist.digital',
  'https://app.menulist.online',
  'https://dashboard.menulist.ai',
  'https://app.menulist.ai/dashboard',
  'https://app.menulist.ai?next=/dashboard',
  'https://user:pass@app.menulist.ai',
]) {
  assert.equal(
    resolveMenuListOwnerAppUrl({ configuredUrl, projectId: 'unknown-project' }),
    null,
    `${configuredUrl} must not be accepted as an owner-app origin`,
  );
}

assert.equal(
  resolveMenuListOwnerAppUrl({
    configuredUrl: 'https://app.menulist.ai',
    projectId: 'menulist-qa',
  }),
  null,
  'QA must reject the production owner-app origin',
);
assert.equal(
  resolveMenuListOwnerAppUrl({
    configuredUrl: 'https://app.menulist.digital',
    projectId: 'menulist',
  }),
  null,
  'Production must reject the QA owner-app origin',
);

console.log('MenuList Functions runtime URL tests passed.');
