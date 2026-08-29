#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const includes = (source, value, message) => assert(source.includes(value), message);

function listPageRoutes(relativeRoot, routePrefix) {
    const root = path.join(ROOT, relativeRoot);
    return fs.readdirSync(root, { withFileTypes: true })
        .flatMap((entry) => {
            if (entry.isFile() && entry.name === 'page.tsx') return [routePrefix];
            if (!entry.isDirectory()) return [];
            const pagePath = path.join(root, entry.name, 'page.tsx');
            return fs.existsSync(pagePath) ? [`${routePrefix}/${entry.name}`] : [];
        });
}

const catalog = read('src/lib/mycodex/founderConsoleCatalog.ts');
const featureFlags = read('src/config/features.ts');
const myCodexLayout = read('src/app/sites/mycodex/layout.tsx');
const operationsLayout = read('src/app/sites/mycodex/operations/layout.tsx');
const operationsPage = read('src/app/sites/mycodex/operations/[[...surface]]/page.tsx');
const documentRoute = read('src/app/sites/mycodex/api/document/route.ts');
const proxy = read('src/proxy.ts');
const styles = read('src/app/sites/mycodex/styles.css');
const provider = read('src/components/templates/mycodex/founder-console/MyCodexFounderConsoleProviders.tsx');
const surfaceAdapter = read('src/components/templates/mycodex/founder-console/MyCodexFounderConsoleSurface.tsx');
const sessionProvider = read('src/providers/sessionProvider.tsx');
const shell = read('src/components/templates/mycodex/founder-console/MyCodexFounderConsoleShell.tsx');
const reader = read('src/app/sites/mycodex/components/MyCodexClientContainer.tsx');

includes(featureFlags, 'ENABLE_MYCODEX_FOUNDER_CONSOLE: true', 'Founder Console feature flag must be explicit.');
includes(myCodexLayout, 'requirePlatformAdminRouteAccess(', 'MyCodex pages must enforce the persisted platform route guard.');
includes(documentRoute, 'withPlatformAuth(', 'Document API must require exact platform session authorization.');
includes(documentRoute, 'getCurrentPlatformUser(session)', 'Document API must re-read the current persisted platform user.');
assert(!documentRoute.includes('verifyMyCodexSessionToken('), 'Legacy MyCodex cookie must not authorize document reads.');
includes(proxy, 'isActiveMenuListOwnerAppHost(hostname)', 'Owner-app routing must use the exact configured host check.');
includes(proxy, 'MYCODEX_OWNER_BASE_PATH', 'Owner-app MyCodex routing must use the dedicated path constant.');
includes(proxy, 'setMyCodexResponseHeaders(', 'Founder Console responses must remain private and no-store.');
includes(operationsLayout, 'getServerSession(authOptions)', 'Operations providers must receive the admitted NextAuth session.');
includes(provider, '<SessionProvider session={session}>', 'Console must retain governed Firebase-auth synchronization for existing components.');
includes(provider, '<NetworkStatusProvider>', 'Console must expose shared offline/slow-network state.');
includes(myCodexLayout, '<ReduxStoreProvider>', 'All MyCodex routes must share one persisted application theme store.');
assert(!provider.includes('<ReduxStoreProvider>'), 'Operations must not create a second nested Redux theme store.');
includes(myCodexLayout, "localStorage.getItem('persist:nextjs')", 'Pre-paint theme projection must read the persisted application theme.');
includes(myCodexLayout, 'themePreferences.darkMode', 'Pre-paint theme projection must use the shared dark-mode preference.');
includes(shell, 'dispatch(toggleDarkMode(!isDarkMode))', 'Founder Console theme controls must update the shared application theme.');
includes(shell, 'mycodex-founder-theme-toggle', 'Laptop Founder Console navigation must expose a theme control.');
includes(reader, 'dispatch(toggleDarkMode(!isDark))', 'Document reader theme controls must update the shared application theme.');
includes(sessionProvider, "normalizedPathname === '/__mycodex'", 'MyCodex root must be store-independent.');
includes(sessionProvider, "normalizedPathname.startsWith('/__mycodex/')", 'MyCodex nested routes must be store-independent.');
includes(sessionProvider, 'if (isPlatformSession && isStoreIndependentRoute)', 'Platform-only routes must skip unrelated store bootstrap reads.');
includes(shell, '!pathname.startsWith(MYCODEX_FOUNDER_CONSOLE_BASE_PATH)', 'Documents must not be highlighted while an operations route is active.');
includes(surfaceAdapter, "window.matchMedia('(max-width: 767px)')", 'Surface adapter must select phone-specific monitors without mounting duplicate readers.');
includes(surfaceAdapter, 'allowDesktopEscape={false}', 'Embedded tools must remain inside the MyCodex shell.');
includes(styles, '@media (max-width: 767px)', 'Console must define its phone layout.');
includes(styles, '@media (max-width: 980px)', 'Console must define its tablet/narrow-laptop layout.');
includes(styles, 'grid-template-columns: 248px minmax(0, 1fr)', 'Console must define its laptop navigation layout.');
includes(operationsPage, 'notFound()', 'Unknown operational surface paths must fail closed.');

const catalogKeys = [...catalog.matchAll(/\{ key: '([^']+)'/g)].map((match) => match[1]);
const legacyPaths = new Set([...catalog.matchAll(/legacyPath: '([^']+)'/g)].map((match) => match[1]));
assert(catalogKeys.length >= 30, `Expected at least 30 catalogued tools, found ${catalogKeys.length}.`);
assert(new Set(catalogKeys).size === catalogKeys.length, 'Founder Console surface keys must be unique.');
assert(!catalog.toLowerCase().includes('campaigncue'), 'CampaignCue must remain absent from the Founder Console.');
assert(
    featureFlags.includes('ENABLE_CAMPAIGNCUE_EDITOR_TEST_ROUTE: false'),
    'The parked CampaignCue test route must remain disabled in MyCodex.',
);

const compatibilityAliases = new Set([
    '/platform',
    '/ops',
    '/ops/scheduler',
    '/ops/extraction',
]);
const existingRoutes = [
    ...listPageRoutes('src/app/(main)/platform', '/platform'),
    ...listPageRoutes('src/app/(main)/ops', '/ops'),
];
for (const route of existingRoutes) {
    assert(
        compatibilityAliases.has(route) || legacyPaths.has(route),
        `Existing internal route is missing from the Founder Console catalog: ${route}`,
    );
}

for (const sourcePath of [
    'src/lib/mycodex/founderConsoleCatalog.ts',
    'src/lib/mycodex/requestBasePath.ts',
    'src/components/templates/mycodex/founder-console/MyCodexFounderConsoleHome.tsx',
    'src/components/templates/mycodex/founder-console/MyCodexFounderConsoleShell.tsx',
]) {
    const source = read(sourcePath).toLowerCase();
    assert(!source.includes('firebase/'), `${sourcePath} must not introduce a MyCodex Firebase dependency.`);
    assert(!source.includes('firestore'), `${sourcePath} must not introduce direct Firestore access.`);
}

console.log(`MyCodex Founder Console verification passed (${catalogKeys.length} tools, ${existingRoutes.length} compatibility routes).`);
