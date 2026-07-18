const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const includes = (content, token, label) => assert(content.includes(token), `${label} must include ${token}`);
const excludes = (content, token, label) => assert(!content.includes(token), `${label} must not include ${token}`);

const page = read('src/app/client/[[...slug]]/page.tsx');
const obp = read('src/app/client/obp/OBPContent.tsx');
const sitemap = read('src/app/client/sitemap.ts');
const manifest = read('src/app/manifest.webmanifest/route.ts');
const shortcuts = read('src/lib/pwa/shortcutsBuilder.ts');
const pullApi = read('src/app/api/public/v1/menu/route.ts');
const projectProjection = read('src/lib/mce/utils.ts');
const storeProjection = read('src/lib/publicTruth/clientStoreProjection.ts');
const routingDoctrine = read('__docs__/client-menu/public-routing-doctrine.md');
const clientImpl = read('__docs__/client-menu/_impl.md');

[
  "if (!targetProject && normalizedSlug !== 'menu')",
  'if (!targetProject && !slug && projects.length > 0)',
  'projectPublicClientStore({',
].forEach((token) => includes(page, token, 'Public menu supplied-slug and browser projection boundary'));
excludes(page, 'const clientStoreDetails = serializeClientValue({\n        ...storeDetails,', 'Public menu full store client payload');

[
  'const publicProjectFields = [',
  'delete cleanItem.ownerBoost;',
  'delete cleanItem.qualityReview;',
  'sanitizePublicImages(cleanItem.images)',
].forEach((token) => includes(projectProjection, token, 'Public project browser projection'));
[
  'export function projectPublicClientStore',
  "'googleAnalyticsId'",
  "'promoteInstallation'",
  "'feedbackEnabled'",
].forEach((token) => includes(storeProjection, token, 'Public store browser projection'));
['publicApi', 'answerlatticeWidgetApi', 'posSync', 'notificationSettings', 'roles'].forEach(
  (token) => excludes(storeProjection, `'${token}',`, `Public store allowlist ${token}`),
);

[
  'normalizeMultiOutletProjectId(projectId)',
  "projectScope?.tenantDocumentId === String(tenantId)",
  'projectScope.storeDocumentId === String(storeId)',
].forEach((token) => includes(obp, token, 'OBP project-summary scope boundary'));

[
  'await getStoreByCustomDomain(customDomain)',
  'await getStoreBySubdomain(subdomain)',
  "data.subdomain.toLowerCase() !== subdomain.toLowerCase()",
  'normalizeMenuListPublicEntityIdentityAliases([',
  'normalizeMultiOutletProjectId(projectId)',
  '`menu-store-${storeId}`',
  'const MAX_TENANT_SITEMAP_STORES = FEATURE_FLAGS.MAX_OUTLETS_PER_TENANT + 1;',
  '.limit(MAX_TENANT_SITEMAP_STORES + 1)',
  'if (snapshot.size > MAX_TENANT_SITEMAP_STORES)',
  "throw new Error('tenant_sitemap_store_limit_exceeded')",
  'await Promise.all(outlets.map(async (outlet) => {',
].forEach((token) => includes(sitemap, token, 'Tenant sitemap public truth boundary'));
excludes(sitemap, "'projects-summary'", 'Tenant sitemap stale non-invalidated cache tag');

[
  'const hasResolvableMenuAlias = Object.entries(projects).some(',
  'project.deleted !== true',
  "normalizePublicProjectSlug(project.slug) === 'menu'",
  'getCachedStoreLevelStartUrl(store.tenantId, store.storeId)',
  "menuPath: startUrl === '/menu' ? startUrl : null",
].forEach((token) => includes(manifest, token, 'Customer App manifest start-url boundary'));
[
  'menuPath?: string | null;',
  'if (menuPath) {',
].forEach((token) => includes(shortcuts, token, 'Customer App menu shortcut admission boundary'));

[
  'projectScope?.tenantDocumentId === tenantDocumentId',
  'projectScope.storeDocumentId === storeDocumentId',
].forEach((token) => includes(pullApi, token, 'MenuList pull API summary scope boundary'));

[
  'Unknown supplied slugs',
  'it never chooses the first project',
  'maximum outlet + linked-master + active-special path is 8',
].forEach((token) => includes(routingDoctrine, token, 'Public routing doctrine parity'));
includes(clientImpl, 'Public browser projection boundary', 'Client menu implementation browser boundary');

console.log('Public customer delivery source boundary verification passed.');
