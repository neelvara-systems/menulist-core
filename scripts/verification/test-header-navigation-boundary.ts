import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IconType } from 'react-icons';

import type { NavItemType } from '../../src/constants/navigations';
import { resolveAppBreadcrumb } from '../../src/lib/navigation/resolveAppBreadcrumb';

const Icon: IconType = () => null;
const layout: NavItemType[] = [
    { icon: Icon, label: 'Dashboard', route: '/dashboard' },
    {
        icon: Icon,
        label: 'Users',
        route: '/users',
        subNav: [
            { icon: Icon, label: 'Users List', route: '/users/list' },
            { icon: Icon, label: 'Roles', route: '/users/permissions' },
        ],
    },
];
const originalLayout = structuredClone(layout.map((item) => ({
    ...item,
    icon: 'icon',
    subNav: item.subNav?.map((subItem) => ({ ...subItem, icon: 'icon' })),
})));

const usersBreadcrumb = resolveAppBreadcrumb('/users/permissions', layout);
assert.equal(usersBreadcrumb.length, 1);
assert.equal(usersBreadcrumb[0]?.label, 'Users');
assert.equal(usersBreadcrumb[0]?.key, '1:1');
assert.equal(usersBreadcrumb[0]?.subNav[0]?.active, false);
assert.equal(usersBreadcrumb[0]?.subNav[1]?.active, true);
assert.equal(usersBreadcrumb[0]?.subNav[1]?.route, '/users/permissions');
assert.deepEqual(
    layout.map((item) => ({
        ...item,
        icon: 'icon',
        subNav: item.subNav?.map((subItem) => ({ ...subItem, icon: 'icon' })),
    })),
    originalLayout,
    'breadcrumb resolution must not attach active flags or generated keys to shared navigation data',
);
assert.deepEqual(resolveAppBreadcrumb('/missing', layout), []);

const profileSource = readFileSync(
    resolve(process.cwd(), 'src/components/organisms/headerComponent/profileActionsModal/index.tsx'),
    'utf8',
);
const notificationSource = readFileSync(
    resolve(process.cwd(), 'src/components/organisms/headerComponent/notificationsModal/index.tsx'),
    'utf8',
);
const headerSource = readFileSync(
    resolve(process.cwd(), 'src/components/organisms/headerComponent/index.tsx'),
    'utf8',
);
for (const source of [profileSource, notificationSource]) {
    assert.ok(source.includes('open={isOpen}'));
    assert.ok(source.includes('onOpenChange={setIsOpen}'));
    assert.ok(!source.includes('document.getElementById'));
    assert.ok(!source.includes('modal-close-btn'));
}
assert.ok(!notificationSource.includes('Mark All Read'));
assert.ok(!notificationSource.includes('View All Notifications'));
assert.ok(headerSource.includes('const userData = session?.user;'));
assert.ok(headerSource.includes("sessionStatus === 'loading'"));
assert.ok(headerSource.includes('aria-label="Loading account"'));
assert.ok(headerSource.includes('aria-label="Sign in"'));
assert.ok(!headerSource.includes('useState<any>(session?.user)'));
assert.ok(!headerSource.includes("objectNullCheck(userData, 'email')"));

const websiteHeaderSource = readFileSync(
    resolve(process.cwd(), 'src/components/website/Header.tsx'),
    'utf8',
);
const websiteCssSource = readFileSync(
    resolve(process.cwd(), 'src/styles/website.css'),
    'utf8',
);
const websiteEnglishLocale = JSON.parse(readFileSync(
    resolve(process.cwd(), 'public/locales/menulist.ai/en-US.json'),
    'utf8',
));
const websiteHindiLocale = JSON.parse(readFileSync(
    resolve(process.cwd(), 'public/locales/menulist.ai/hi-IN.json'),
    'utf8',
));

assert.ok(websiteHeaderSource.includes('const mobileNavigationGroups = ['));
assert.ok(websiteHeaderSource.includes('key: "mobileProductLabel"'));
assert.ok(websiteHeaderSource.includes('key: "mobileLearnLabel"'));
assert.ok(websiteHeaderSource.includes('className="ws-mobile-account"'));
assert.ok(!websiteHeaderSource.includes('<p className="ws-mobile-nav-group__label">{t("Header.mobileAccountLabel")}</p>'));
assert.ok(websiteHeaderSource.includes('<WebsiteThemeSwitcher />'));
assert.ok(!websiteHeaderSource.includes('ws-mobile-accordion'));
assert.ok(!websiteHeaderSource.includes('openMobileSections'));
assert.ok(websiteCssSource.includes('.ws-mobile-nav-link:focus-visible'));
assert.ok(websiteCssSource.includes('min-height: 3.25rem;'));

for (const locale of [websiteEnglishLocale, websiteHindiLocale]) {
    assert.ok(locale.Website.Header.mobileNavigationLabel);
    assert.ok(locale.Website.Header.mobileProductLabel);
    assert.ok(locale.Website.Header.mobileLearnLabel);
    assert.ok(locale.Website.Header.mobileAccountLabel);
}

assert.equal(websiteEnglishLocale.Website.Header.mobileProductLabel, 'Product');
assert.equal(websiteEnglishLocale.Website.Header.mobileLearnLabel, 'Resources');
assert.ok(websiteHeaderSource.includes('links: resourceDropdownLinks'));
assert.ok(websiteHeaderSource.includes('className="ws-mobile-feature-sections"'));
assert.ok(websiteHeaderSource.includes('websiteFeatureNavGroups.map((featureGroup)'));
assert.ok(websiteHeaderSource.includes('featureGroup.links.map((featureLink)'));
assert.ok(!websiteHeaderSource.includes('mobileFeatureShortcutsOpen'));

console.log('Header navigation boundary tests passed.');
