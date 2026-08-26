const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const root = process.cwd();
const websiteStyles = fs.readFileSync(path.join(root, 'src/styles/website.css'), 'utf8');
const inventoryPath = path.join(
  root,
  '__docs__/audits/menulist-rc-certification-inventory.csv',
);
const runtimeEvidencePath = path.join(
  root,
  '__docs__/audits/menulist-rc-runtime-evidence.json',
);

function fail(message) {
  console.error(`MenuList RC inventory verification failed: ${message}`);
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') cell += char;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

if (!fs.existsSync(inventoryPath)) fail('generated CSV is missing');
const parsed = parseCsv(fs.readFileSync(inventoryPath, 'utf8'));
if (parsed.length < 2) fail('generated CSV contains no inventory rows');
const headers = parsed[0];
const required = [
  'inventory_id',
  'item_type',
  'product_area',
  'route_or_component',
  'control_or_action',
  'test_result',
  'final_verification_status',
  'evidence_or_notes',
];
for (const column of required) {
  if (!headers.includes(column)) fail(`required column ${column} is missing`);
}
const objects = parsed.slice(1).map((cells) => Object.fromEntries(
  headers.map((header, index) => [header, cells[index] ?? '']),
));
const ids = new Set();
for (const row of objects) {
  if (ids.has(row.inventory_id)) fail(`duplicate inventory ID ${row.inventory_id}`);
  ids.add(row.inventory_id);
  if (!row.product_area) fail(`row ${row.inventory_id} has no product classification`);
  if (!row.final_verification_status) fail(`row ${row.inventory_id} has no status`);
}
const functionExports = objects.filter((row) => row.item_type === 'firebase-function-export');
if (functionExports.length < 20) fail(`only ${functionExports.length} Firebase Function exports were discovered`);
const menuListRouteHandlers = objects.filter((row) => (
  row.item_type === 'api-route'
  && row.product_area === 'MenuList'
));
if (menuListRouteHandlers.length !== 140) {
  fail(`expected 140 MenuList route handlers, found ${menuListRouteHandlers.length}`);
}
for (const row of menuListRouteHandlers) {
  if (row.control_or_action === 'UNRESOLVED_METHOD') {
    fail(`route handler ${row.route_or_component} has unresolved exported methods`);
  }
  if (row.role === 'PUBLIC_OR_GUARD_TRACE_REQUIRED') {
    fail(`route handler ${row.route_or_component} has no explicit access-boundary classification`);
  }
}
const answerlatticeWidgetHandlers = objects.filter((row) => (
  row.item_type === 'api-route'
  && row.route_or_component.startsWith('/api/widget/')
));
if (
  answerlatticeWidgetHandlers.length !== 5
  || answerlatticeWidgetHandlers.some((row) => row.product_area !== 'Answerlattice boundary')
) fail('all five /api/widget handlers must remain classified as Answerlattice separation boundaries');
const signIn = objects.find((row) => row.item_type === 'page' && row.route_or_component === '/signin');
if (!signIn || signIn.product_area !== 'MenuList') fail('MenuList /signin page classification is missing');
const mainPages = objects.filter((row) => (
  row.item_type === 'page'
  && row.product_area === 'MenuList'
  && row.screen_or_tab.startsWith('src/app/(main)/')
));
if (mainPages.length !== 59) fail(`expected 59 MenuList private pages, found ${mainPages.length}`);
if (!fs.existsSync(runtimeEvidencePath)) fail('runtime evidence registry is missing');
const runtimeEvidence = JSON.parse(fs.readFileSync(runtimeEvidencePath, 'utf8'));
const privateAccessEvidence = runtimeEvidence.privateRouteAccess;
if (privateAccessEvidence?.result !== 'PASS') fail('private-route browser access evidence is not passing');
if (new Set(privateAccessEvidence.routes).size !== 58) fail('private-route browser access evidence must cover 58 unique routes');
const authenticatedOwnerNavigationEvidence = runtimeEvidence.authenticatedOwnerNavigation;
if (authenticatedOwnerNavigationEvidence?.result !== 'PASS') {
  fail('authenticated owner navigation evidence is not passing');
}
const authenticatedOwnerNavigationRoutes = new Set(authenticatedOwnerNavigationEvidence.routes);
const growthKitsPage = objects.find((row) => (
  row.item_type === 'page'
  && row.route_or_component === '/growth-kits'
));
if (
  !growthKitsPage
  || growthKitsPage.product_area !== 'MenuList'
  || growthKitsPage.test_result !== 'PASS_AUTHENTICATED_RENDER'
  || !authenticatedOwnerNavigationRoutes.has('/growth-kits')
) fail('Growth Kits must remain an in-scope authenticated MenuList owner surface');
const apiAnonymousBoundaryEvidence = runtimeEvidence.apiAnonymousBoundary;
if (apiAnonymousBoundaryEvidence?.result !== 'PASS') fail('anonymous API boundary evidence is not passing');
if (
  apiAnonymousBoundaryEvidence.handlers !== 140
  || apiAnonymousBoundaryEvidence.methodProbes !== 157
) fail('anonymous API boundary evidence must cover 140 handlers and 157 exported methods');
const currentApiRouteManifestSha256 = createHash('sha256')
  .update(menuListRouteHandlers.map((row) => [
    row.route_or_component,
    row.control_or_action,
    row.role,
    row.screen_or_tab,
  ].join('|')).join('\n'))
  .digest('hex');
if (apiAnonymousBoundaryEvidence.routeManifestSha256 !== currentApiRouteManifestSha256) {
  fail('anonymous API boundary evidence is stale for the current route/method/access manifest');
}
if (Object.keys(apiAnonymousBoundaryEvidence.statusCounts || {}).some((status) => Number(status) >= 500)) {
  fail('anonymous API boundary evidence must not contain 5xx responses');
}
const publicWebsiteRouteRenderEvidence = runtimeEvidence.publicWebsiteRouteRender;
if (publicWebsiteRouteRenderEvidence?.result !== 'PASS') {
  fail('public website route-render evidence is not passing');
}
const publicSitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8');
const publicSitemapPaths = [...publicSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((match) => new URL(match[1]).pathname);
const currentPublicRouteManifestSha256 = createHash('sha256')
  .update(publicSitemapPaths.join('\n'))
  .digest('hex');
if (
  publicSitemapPaths.length !== 186
  || publicWebsiteRouteRenderEvidence.sitemapRouteCount !== 186
  || publicWebsiteRouteRenderEvidence.uniqueRouteCount !== 186
  || publicWebsiteRouteRenderEvidence.routeManifestSha256 !== currentPublicRouteManifestSha256
) fail('public website route-render evidence is incomplete or stale for the current sitemap');
const browserRenderedWebsitePages = objects.filter((row) => (
  row.product_area === 'MenuList'
  && row.item_type === 'page'
  && row.screen_or_tab.startsWith('src/app/(website)/')
  && row.test_result === 'PASS_BROWSER_RENDER'
));
if (browserRenderedWebsitePages.length !== 62) {
  fail(`expected 62 sitemap-backed website page patterns, found ${browserRenderedWebsitePages.length}`);
}
for (const row of browserRenderedWebsitePages) {
  if (row.final_verification_status !== 'RENDER_PASSED_CONTROL_INTERACTION_PENDING') {
    fail(`website page ${row.route_or_component} is missing bounded render evidence`);
  }
}
for (const row of menuListRouteHandlers) {
  if (
    row.test_result !== 'PASS_ANONYMOUS_BOUNDARY'
    || row.final_verification_status !== 'ANONYMOUS_BOUNDARY_PASSED_FUNCTIONAL_STATE_PENDING'
  ) fail(`route handler ${row.route_or_component} is missing bounded anonymous runtime evidence`);
}
for (const row of mainPages) {
  for (const column of [
    'role',
    'tenant_state',
    'store_state',
    'subscription_or_entitlement_state',
    'feature_flag_state',
    'viewport',
  ]) {
    if (!row[column] || row[column].startsWith('DERIVE_')) {
      fail(`private page ${row.route_or_component} has unresolved ${column}`);
    }
  }
  const hasAccessBoundary = (
    row.test_result === 'PASS_ACCESS_BOUNDARY'
    && row.final_verification_status === 'ACCESS_PASSED_FUNCTIONAL_INTERACTION_PENDING'
  );
  const hasAuthenticatedRender = (
    row.test_result === 'PASS_AUTHENTICATED_RENDER'
    && row.final_verification_status === 'AUTHENTICATED_RENDER_PASSED_CONTROL_INTERACTION_PENDING'
  );
  if (!hasAccessBoundary && !hasAuthenticatedRender) {
    fail(`private page ${row.route_or_component} is missing bounded browser evidence`);
  }
}
const recoveryRoutes = mainPages
  .filter((row) => row.subscription_or_entitlement_state.includes('UNPAID'))
  .map((row) => row.route_or_component)
  .sort();
const expectedRecoveryRoutes = ['/billing', '/help-center', '/help-center/[...segments]'].sort();
if (JSON.stringify(recoveryRoutes) !== JSON.stringify(expectedRecoveryRoutes)) {
  fail(`owner recovery route inventory drifted: ${recoveryRoutes.join(', ')}`);
}
const desktopOnlyPrivatePages = mainPages.filter((row) => row.viewport === 'DESKTOP_ONLY');
if (
  desktopOnlyPrivatePages.length !== 1
  || desktopOnlyPrivatePages[0].route_or_component !== '/platform/test-sentry'
) fail('private viewport inventory must retain only /platform/test-sentry as desktop-only');
const menuListControls = objects.filter((row) => (
  row.item_type === 'user-control-candidate'
  && row.product_area === 'MenuList'
));
const unresolvedRenderTree = menuListControls.filter((row) => row.screen_or_tab === 'DERIVE_FROM_RENDER_TREE');
if (unresolvedRenderTree.length > 0) fail(`${unresolvedRenderTree.length} MenuList controls still lack static page reachability`);
const staticallyReachedControls = menuListControls.filter((row) => row.screen_or_tab !== 'UNREACHED_BY_APP_PAGE_STATIC_GRAPH');
const staticallyUnreachedControls = menuListControls.filter((row) => row.screen_or_tab === 'UNREACHED_BY_APP_PAGE_STATIC_GRAPH');
const controlKindsBySourceLine = new Map();
for (const row of menuListControls) {
  const separator = row.control_or_action.lastIndexOf('@');
  if (separator < 0) fail(`control ${row.inventory_id} has no source-line identity`);
  const sourceLine = `${row.route_or_component}@${row.control_or_action.slice(separator + 1)}`;
  const kinds = controlKindsBySourceLine.get(sourceLine) ?? [];
  kinds.push(row.control_or_action.slice(0, separator));
  controlKindsBySourceLine.set(sourceLine, kinds);
}
for (const [sourceLine, kinds] of controlKindsBySourceLine) {
  const concreteKinds = kinds.filter((kind) => [
    'button',
    'link',
    'form',
    'input',
    'selection',
    'upload',
  ].includes(kind));
  if (kinds.includes('action-handler') && concreteKinds.length > 0) {
    fail(`${sourceLine} double-counts a concrete control and its backing action handler`);
  }
  if (kinds.includes('upload') && kinds.includes('input')) {
    fail(`${sourceLine} double-counts one file upload as both input and upload`);
  }
}
for (const row of staticallyUnreachedControls) {
  if (
    row.test_result !== 'PASS_NOT_SHIPPED'
    || row.test_type !== 'static-app-page-reachability'
    || row.final_verification_status !== 'SOURCE_UNREACHABLE_NOT_USER_TRIGGERABLE'
  ) fail(`statically unreachable control ${row.inventory_id} lacks an explicit non-shipped classification`);
}
if (staticallyReachedControls.length / menuListControls.length < 0.95) {
  fail(`only ${staticallyReachedControls.length}/${menuListControls.length} MenuList controls map to an App Router page`);
}
if (!/\.ws-drawer-brand\s*\{[^}]*min-height:\s*2\.75rem;/s.test(websiteStyles)) {
  fail('mobile drawer brand target must retain a 44px minimum height');
}
if (
  fs.existsSync(path.join(root, 'public/sitemap.xml'))
  && fs.existsSync(path.join(root, 'src/app/sitemap.ts'))
) fail('public/sitemap.xml conflicts with the App Router sitemap route');
const mixedAnswerlattice = objects.find((row) => (
  row.product_area === 'MenuList'
  && row.item_type !== 'user-control-candidate'
  && /answerlattice/i.test(`${row.route_or_component} ${row.screen_or_tab}`)
));
if (mixedAnswerlattice) fail(`Answerlattice boundary misclassified at ${mixedAnswerlattice.inventory_id}`);

console.log(`MenuList RC inventory verified: ${objects.length} rows, ${functionExports.length} Function exports.`);
