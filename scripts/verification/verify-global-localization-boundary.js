#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(content, token, label) {
  assert(content.includes(token), `${label} must include ${token}`);
}

const config = read('src/lib/localization/config.ts');
[
  "export const defaultTimezone = 'UTC';",
  'export const normalizeLocalePreference',
  'export const normalizeTimeZone',
  'export const normalizeDateFormatPreference',
  'export const normalizeTimeFormatPreference',
  'export const isRtlLocale',
  'export const getLocaleDirection',
].forEach((token) => assertIncludes(config, token, 'localization preference boundary'));

const actions = read('src/lib/localization/index.ts');
[
  "throw new Error('locale_preference_invalid')",
  "throw new Error('timezone_preference_invalid')",
  "throw new Error('date_format_preference_invalid')",
  "throw new Error('time_format_preference_invalid')",
  "sameSite: 'lax' as const",
].forEach((token) => assertIncludes(actions, token, 'localization server-action boundary'));

const requestConfig = read('src/i18n/request.ts');
assertIncludes(requestConfig, 'normalizeLocalePreference', 'request localization boundary');
assertIncludes(requestConfig, "parseAcceptLanguageLocales((await headers()).get('accept-language'))", 'bounded Accept-Language request boundary');
assert(!requestConfig.includes("from 'negotiator'"), 'request localization must not import an undeclared transitive parser');
assert(!requestConfig.includes("from '@formatjs/intl-localematcher'"), 'request localization must not import an undeclared transitive matcher');
assertIncludes(requestConfig, 'normalizeTimeZone', 'request timezone boundary');
assertIncludes(requestConfig, 'Record<string, AbstractIntlMessages>', 'request message registry type boundary');
assertIncludes(requestConfig, "const UNSAFE_MESSAGE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);", 'request message merge unsafe-key boundary');
assertIncludes(requestConfig, 'if (UNSAFE_MESSAGE_KEYS.has(key)) continue;', 'request message merge unsafe-key rejection');
assert(!requestConfig.includes('Record<string, Record<string, any>>'), 'request message registry must not use broad any values');

const clientProvider = read('src/providers/IntlClientWrapper.tsx');
assertIncludes(clientProvider, 'document.documentElement.lang = safeLocale;', 'document language boundary');
assertIncludes(clientProvider, 'document.documentElement.dir = getLocaleDirection(safeLocale);', 'document direction boundary');

const antdClient = read('src/lib/antd/antdClient.tsx');
assertIncludes(antdClient, 'isRTLDirection || isRtlLocale(appLocale)', 'Ant Design direction boundary');

const dateTime = read('src/utils/dateTime/index.tsx');
[
  'value === null || value === undefined',
  'const isValidCalendarDate',
  'getUserDateFormatOptions()',
  'getUserTimeFormatOptions()',
].forEach((token) => assertIncludes(dateTime, token, 'date/time normalization boundary'));
assert(!dateTime.includes('if (!formatter) return dateObj.toISOString();'), 'display fallback must not expose raw ISO timestamps');

const ownerDisplayFiles = [
  'src/app/(main)/locations/page.tsx',
  'src/components/mobile/components/MobileMenuCommandSheet.tsx',
  'src/components/mobile/components/MobilePublicTruthMonitorCard.tsx',
  'src/components/mobile/menu-card-export/MobileMenuCardExportScreen.tsx',
  'src/components/mobile/screens/MobileDashboardScreen.tsx',
  'src/components/mobile/screens/MobileMenuScreen.tsx',
  'src/components/mobile/screens/MobileTransactionsScreen.tsx',
  'src/components/mobile/screens/dashboardSections/MobileCustomerAppMetrics.tsx',
  'src/components/mobile/screens/dashboardSections/MobileOBPMetricsCard.tsx',
  'src/components/templates/answerlattice/ownerSupportAssistant/AnswerlatticeOwnerSupportAssistant.tsx',
  'src/components/templates/main-app/dashboard/AnalyticsDashboard/CustomerAppMetrics.tsx',
  'src/components/templates/main-app/dashboard/OwnerDashboard/OBPMetricsCard.tsx',
  'src/components/templates/main-app/dashboard/OwnerDashboard/OverviewView.tsx',
  'src/components/templates/main-app/dashboard/OwnerDashboard/OwnerDashboardGraphMode.tsx',
  'src/components/templates/main-app/transactions/TransactionDetailsModal.tsx',
  'src/components/templates/main-app/transactions/index.tsx',
  'src/components/templates/main-app/transactions/transaction-details/ImageProcessingDetailsView.tsx',
];

for (const relPath of ownerDisplayFiles) {
  const content = read(relPath);
  assert(!/\.toLocale(?:String|DateString|TimeString)\s*\(/.test(content), `${relPath} must use the shared owner formatter boundary`);
  assert(!/new Intl\.(?:NumberFormat|DateTimeFormat)\s*\(/.test(content), `${relPath} must not bypass the shared owner formatter boundary`);
}

const docs = [
  '__docs__/global-localization/README.md',
  '__docs__/global-localization/global-localization_spec.md',
  '__docs__/global-localization/global-localization_impl.md',
  '__docs__/global-localization/global-localization_firebase.md',
  '__docs__/global-localization/global-localization_mobile-support.md',
  '__docs__/global-localization/global-localization_test-cases.md',
  '__docs__/global-localization/global-localization_verification.md',
];
docs.forEach((relPath) => assert(fs.existsSync(path.join(ROOT, relPath)), `${relPath} must exist`));

console.log('Global localization source boundary passed.');
