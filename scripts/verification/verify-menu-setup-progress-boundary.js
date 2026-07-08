#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function assertIncludes(relativePath, expected, label = expected) {
  const content = read(relativePath);
  if (!content.includes(expected)) {
    throw new Error(`${relativePath} missing ${label}`);
  }
}

function assertNotIncludes(relativePath, unexpected, label = unexpected) {
  const content = read(relativePath);
  if (content.includes(unexpected)) {
    throw new Error(`${relativePath} contains disallowed ${label}`);
  }
}

function assertNotExists(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (fs.existsSync(fullPath)) {
    throw new Error(`Menu Setup Progress must not add backend/runtime artifact: ${relativePath}`);
  }
}

const docs = [
  '__docs__/menu-setup-progress/README.md',
  '__docs__/menu-setup-progress/menu-setup-progress_spec.md',
  '__docs__/menu-setup-progress/menu-setup-progress_impl.md',
  '__docs__/menu-setup-progress/menu-setup-progress_firebase.md',
  '__docs__/menu-setup-progress/menu-setup-progress_mobile-support.md',
  '__docs__/menu-setup-progress/menu-setup-progress_marketing.md',
  '__docs__/menu-setup-progress/menu-setup-progress_website.md',
  '__docs__/menu-setup-progress/menu-setup-progress_helpdoc.md',
  '__docs__/menu-setup-progress/menu-setup-progress_test-cases.md',
];

docs.forEach(read);

assertIncludes('src/config/features.ts', 'ENABLE_MENU_SETUP_PROGRESS');
assertIncludes('src/lib/menuSetupProgress/buildMenuSetupProgress.ts', 'buildMenuSetupProgress');
assertIncludes('src/lib/menuSetupProgress/buildMenuSetupProgress.ts', 'lastPublishedAt');
assertIncludes('src/lib/menuSetupProgress/buildMenuSetupProgress.ts', 'buildStarterActivationSummary');
assertIncludes('src/lib/menuSetupProgress/buildMenuSetupProgress.ts', "id: 'translations_ready'", 'conditional translations progress step');
assertIncludes('src/lib/menuSetupProgress/buildMenuSetupProgress.ts', "translationSignals.length > 0", 'translation step only when language signals exist');
assertNotIncludes('src/lib/menuSetupProgress/buildMenuSetupProgress.ts', 'activeCategories.length > 0', 'category-only import completion');
assertIncludes('src/components/templates/main-app/dashboard/MenuSetupProgress.tsx', 'Menu setup');
assertIncludes('src/components/mobile/components/MenuSetupProgress.tsx', 'Menu setup');
assertIncludes('src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx', 'MenuSetupProgress');
assertIncludes('src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx', 'ownerDashboardProjectSetup');
assertIncludes('src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx', 'owner_dashboard_project_setup_load_failed', 'dashboard missing-project guard');
assertIncludes('src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx', 'projectData={dashboardProjectForChildren}', 'shared project data passed to Menu Check');
assertIncludes('src/components/templates/main-app/dashboard/MenuQualitySignals.tsx', 'projectData?:', 'optional shared project prop');
assertIncludes('src/components/mobile/screens/MobileMenuScreen.tsx', 'MobileMenuSetupProgress');
assertIncludes('src/components/mobile/screens/MobileShareScreen.tsx', 'MobileMenuSetupProgress');
assertIncludes('src/components/mobile/MobileShell.tsx', 'onOpenOfficialPage');
assertIncludes('src/components/mobile/MobileShell.tsx', "'main',", 'More root selected-project provider cache');
assertIncludes('src/components/mobile/screens/MobileMoreScreen.tsx', 'buildMenuSetupProgress', 'More shortcut uses shared setup computation');
assertIncludes('src/components/mobile/screens/MobileMoreScreen.tsx', "key: 'menuSetup'", 'More shortcut item');
assertIncludes('src/components/mobile/screens/MobileMoreScreen.tsx', 'onOpenMenuTab?.()', 'More shortcut menu shell callback');
assertIncludes('src/components/mobile/screens/MobileMoreScreen.tsx', 'onOpenShareTab?.()', 'More shortcut share shell callback');
assertIncludes('src/components/mobile/screens/MobileMoreScreen.tsx', "openOfficialPage('main')", 'More shortcut official page shell callback');
assertIncludes('__docs__/menu-setup-progress/menu-setup-progress_spec.md', 'active extracted items exist', 'menu imported item-only contract');
assertIncludes('__docs__/menu-setup-progress/menu-setup-progress_spec.md', 'Translations ready', 'translations optional contract');
assertIncludes('__docs__/menu-setup-progress/menu-setup-progress_test-cases.md', 'categories exist but zero active items', 'category-only test case');
assertIncludes('__docs__/menu-setup-progress/menu-setup-progress_test-cases.md', 'Mobile More root while setup is incomplete', 'More shortcut test case');

assertNotExists('src/app/api/menu-setup-progress');
assertNotExists('src/app/api/menuSetupProgress');
assertNotExists('functions/src/menuSetupProgress');
assertNotExists('functions/src/menu-setup-progress');

console.log('verify-menu-setup-progress-boundary: PASS');
