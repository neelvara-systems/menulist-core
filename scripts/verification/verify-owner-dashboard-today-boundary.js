#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing required file: ${file}`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function requireToken(source, token, label) {
  if (!source.includes(token)) {
    failures.push(`${label} missing token: ${token}`);
  }
}

function forbidToken(source, token, label) {
  if (source.includes(token)) {
    failures.push(`${label} must not include token: ${token}`);
  }
}

function requireOrder(source, tokens, label) {
  let previousIndex = -1;
  for (const token of tokens) {
    const index = source.indexOf(token, previousIndex + 1);
    if (index === -1) {
      failures.push(`${label} missing ordered token: ${token}`);
      return;
    }
    if (index <= previousIndex) {
      failures.push(`${label} token out of order: ${token}`);
      return;
    }
    previousIndex = index;
  }
}

const packageJson = read('package.json');
const dashboardRoute = read('src/app/(main)/dashboard/page.tsx');
const todayRoute = read('src/app/(main)/today/page.tsx');
const todayHistoryRoute = read('src/app/(main)/today/history/page.tsx');
const desktopToday = read('src/components/templates/main-app/today/index.tsx');
const campaignActions = read('src/components/templates/main-app/today/hooks/useCampaignActions.ts');
const ownerDashboard = read('src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx');
const ownerDashboardHook = read('src/hooks/useOwnerDashboard.ts');
const obpDashboardHook = read('src/hooks/useOBPDashboard.ts');
const ownerDashboardDb = read('src/database/ownerDashboard/index.ts');
const ownerDashboardTypes = read('src/components/templates/main-app/projects/types/ownerDashboard.types.ts');
const ownerDashboardGraph = read('src/components/templates/main-app/dashboard/OwnerDashboard/OwnerDashboardGraphMode.tsx');
const dashboardSummaryAggregation = read('functions/src/analytics/dashboardSummaryAggregation.ts');
const mobileShell = read('src/components/mobile/MobileShell.tsx');
const mobileHours = read('src/components/mobile/screens/MobileHoursScreen.tsx');
const mobileDashboard = read('src/components/mobile/screens/MobileDashboardScreen.tsx');
const mobileHistory = read('src/components/mobile/screens/MobileTodayHistoryScreen.tsx');
const pastActivityHook = read('src/hooks/usePastActivity.ts');
const ownerDashboardDoc = read('__docs__/projects/owner-dashboard.md');
const obpImplDoc = read('__docs__/official-business-page/official-business-page_impl.md');
const obpFirebaseDoc = read('__docs__/official-business-page/official-business-page_firebase.md');
const mobileSupportDoc = read('__docs__/mobile-operational-support/mobile-operational-support_mobile-support.md');
const inventory = read('FEATURE_SWEEP_MASTER_INVENTORY.md');
const report = read('FEATURE_SWEEP_MASTER_REPORT.md');
const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');

requireToken(
  packageJson,
  '"verify:owner-dashboard-today-boundary": "node scripts/verification/verify-owner-dashboard-today-boundary.js"',
  'package scripts',
);

['import DashboardPage from "@template/main-app/dashboard"', '<DashboardPage />'].forEach((token) => {
  requireToken(dashboardRoute, token, 'desktop dashboard route');
});

['import TodayScreen from "@template/main-app/today";', 'return <TodayScreen />;'].forEach((token) => {
  requireToken(todayRoute, token, 'desktop Today route');
});

[
  "import { redirect } from 'next/navigation';",
  "import { FEATURE_FLAGS } from '@config/features';",
  "if (!FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY) {",
  "redirect('/today');",
  'return <PastActivityScreen />;',
].forEach((token) => requireToken(todayHistoryRoute, token, 'desktop Today history route'));

[
  "export type OwnerDashboardViewMode = 'today' | 'overview' | 'graph' | 'daily' | 'weekly' | 'monthly' | 'overall';",
  'today: {',
  "label: 'Today',",
  'isPrimary: true,',
].forEach((token) => requireToken(ownerDashboardTypes, token, 'owner dashboard view-mode contract'));

[
  'const SWR_CONFIG_TODAY = {',
  'dedupingInterval: 600000',
  'const loadHistorical = options?.loadHistorical ?? true;',
  "const [viewMode, setViewMode] = useState<OwnerDashboardViewMode>('today');",
  "canFetch && loadHistorical ? ['ownerDashboard', 'settled', tId, sId, projectId] : null",
  "canFetch ? ['ownerDashboard', 'today', tId, sId, projectId] : null",
  "canFetch && loadHistorical && viewMode === 'daily'",
  "canFetch && loadHistorical && viewMode === 'weekly'",
  "canFetch && loadHistorical && viewMode === 'monthly'",
  "case 'today':",
  'return todayData || null;',
  'trendSummary: settledData?.trendSummary',
  'await Promise.all(loadHistorical ? [mutateSettled(), mutateToday()] : [mutateToday()]);',
].forEach((token) => requireToken(ownerDashboardHook, token, 'owner dashboard hook'));
forbidToken(ownerDashboardHook, "Default view is now 'overview'", 'owner dashboard hook stale default-view comment');
forbidToken(ownerDashboardHook, 'Fetches overview + overall on initial load', 'owner dashboard hook stale initial-load comment');

[
  'const loadHistorical = options?.loadHistorical ?? true;',
  "canFetch && loadHistorical ? ['obpDashboard', 'settled', tId, sId] : null",
  "canFetch ? ['obpDashboard', 'today', tId, sId] : null",
  'await Promise.all(loadHistorical ? [mutateSettled(), mutateToday()] : [mutateToday()]);',
].forEach((token) => requireToken(obpDashboardHook, token, 'OBP dashboard hook'));

[
  'export async function getOwnerDashboardToday(',
  'const todayDate = getTodayDate(timeZone, businessDayEndTime);',
  'includeAiSummary: false,',
  'isPartial: true,',
  'export async function getOwnerDashboardSettled(',
  'const summaryDocId = getDocId.dashboardSummary(tId, sId, projectId);',
  'export async function getOBPDashboardToday(',
  'const docId = getDocId.daily(tId, sId, OBP_PROJECT_ID, todayDate);',
  'export async function getOBPDashboardData(',
  'const summaryDocId = getDocId.dashboardSummary(tId, sId, OBP_PROJECT_ID);',
  'normalizeTrendSummary(data.trendSummary)',
  'const OWNER_ACTION_MARK_DONE_RESPONSE_JSON_MAX_BYTES = 16 * 1024;',
  'readJsonResponseWithLimit<unknown>(response, OWNER_ACTION_MARK_DONE_RESPONSE_JSON_MAX_BYTES)',
  'const MAX_OBP_DASHBOARD_SUMMARY_READ_DIAGNOSTICS = 25;',
  'reportedOBPDashboardSummaryReadFailures',
  'function logOBPDashboardSummaryReadFailure(',
  "'owner_dashboard_obp_summary_read_failed'",
  "getBoundedAnalyticsStringContext('summaryDocId', params.summaryDocId)",
  "fallbackPolicy: 'use_daily_obp_docs_without_views_change'",
  "summaryDocKind: 'overall_summary'",
  'logOBPDashboardSummaryReadFailure(error, { tId, sId, summaryDocId });',
].forEach((token) => requireToken(ownerDashboardDb, token, 'owner dashboard DAL'));
forbidToken(ownerDashboardDb, '} catch {\n                // Non-critical\n            }', 'owner dashboard OBP summary read silent catch');

[
  'OwnerDashboardTrendSummary',
  'OwnerDashboardTrendComparison',
  "source: 'dashboard_summary' | 'daily30d_fallback'",
  "'item_interest'",
  "'unavailable_demand'",
  "'missing_searches'",
  'trendSummary?: OwnerDashboardTrendSummary;',
].forEach((token) => requireToken(ownerDashboardTypes, token, 'owner dashboard trend types'));

[
  'function buildOwnerDashboardTrendSummary(',
  'availableStartDate',
  "'item_interest'",
  "'unavailable_demand'",
  "'missing_searches'",
  'const trendSummary = buildOwnerDashboardTrendSummary(dailyMap, settlementDate);',
  'trendSummary,',
  'monthly',
].forEach((token) => requireToken(dashboardSummaryAggregation, token, 'dashboard summary trend cache'));

[
  'buildFallbackTrendSummary(fallbackTrendSummaryRows)',
  'fallbackTrendSummaryRows',
  'availableStartDate',
  'const trendSummary = data?.trendSummary || fallbackTrendSummary;',
  "source: 'daily30d_fallback'",
  'Trend summary',
  'Updated after your store day closes.',
  'Comparison charts',
  'comparisonChartGrid',
  'TREND_SIGNAL_METRICS',
  'missingSearches: metricValue(day,',
  "metric: 'item_interest'",
  "metric: 'unavailable_demand'",
  "metric: 'missing_searches'",
  "tone: 'problem'",
  'renderComparisonBadge',
  "findTrendComparison(trendSummary, chart.metric, 'week')",
  "findTrendComparison(trendSummary, chart.metric, 'month')",
].forEach((token) => requireToken(ownerDashboardGraph, token, 'owner dashboard graph mode trend summary'));
[
  'Branch Selection',
  'Export Excel',
  'Show Report',
  'Total Sale',
  'APC',
].forEach((token) => forbidToken(ownerDashboardGraph, token, 'owner dashboard graph mode must not copy sales report controls'));

[
  'const [showHistorical, setShowHistorical] = useState(false);',
  'useOwnerDashboard({',
  'loadHistorical: showHistorical,',
  'useOBPDashboard({ loadHistorical: showHistorical });',
  "setShowHistorical(mode !== 'today');",
  "case 'today':",
  '<TodaySoFarCard',
  'mode="today"',
  'MenuAnalyticsDetailsCard data={data?.today || null}',
  'BusinessHealthDashboardCard',
  'BusinessHealthAnalyticsStrip',
].forEach((token) => requireToken(ownerDashboard, token, 'desktop owner dashboard'));
requireOrder(
  ownerDashboard,
  [
    'const [showHistorical, setShowHistorical] = useState(false);',
    'useOwnerDashboard({',
    'loadHistorical: showHistorical,',
    "setShowHistorical(mode !== 'today');",
  ],
  'desktop owner dashboard historical-load order',
);

[
  'const { todayCampaigns, staffPrompt, physicalSurfaces, isLoading, mutate } = useTodayCampaigns();',
  'const { completeCampaign, skipCampaign, isProcessing } = useCampaignActions();',
  'const isEnabled = FEATURE_FLAGS.SOCIAL_CONTENT_ENABLED;',
  'Today is not available for this location.',
  'const result = await completeCampaign(campaignId, projectId, campaignType, surface, method);',
  'await mutate((current) => current ? { ...current, today: result.today } : current, { revalidate: false });',
  "logCampaignFailure('today_campaign_action_flow_failed'",
  "logCampaignFailure('today_campaign_skip_flow_failed'",
  'OwnerActionPlanCard',
  'StaffPromptSection staffPrompt={staffPrompt}',
].forEach((token) => requireToken(desktopToday, token, 'desktop Today screen'));
forbidToken(desktopToday, 'if (result?.today)', 'desktop Today optional success acknowledgement');

[
  'assertCampaignCompleteSucceeded(result, {',
  'assertCampaignSkipSucceeded(result, {',
  "logCampaignFailure('today_campaign_complete_failed'",
  "logCampaignFailure('today_campaign_skip_failed'",
  'hasTrackedMenuLink: Boolean(menuLinkWithTracking)',
].forEach((token) => requireToken(campaignActions, token, 'Today campaign action hook'));

[
  "'/dashboard': MOBILE_ROUTE_DEFAULT,",
  "'/today': MOBILE_ROUTE_DEFAULT,",
  "'/today/history': { tab: 'today', todayScreen: 'history', moreScreen: 'main' },",
  "parts[1] === 'history' && FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY ? 'history' : 'main'",
  "if (ownerRoute.todayScreen === 'history' && !FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY) {",
  'return MOBILE_ROUTE_DEFAULT;',
  "if (!FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY) {",
  "if (todayScreen === 'history' && !FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY) {",
  "todayScreen === 'dashboard'",
  'canViewAnalytics',
  "if (canViewAnalytics) setTodayScreen('dashboard');",
  "todayScreen === 'history' && FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY",
  '<MobileTodayHistoryScreen',
  '<MobileHoursScreen',
].forEach((token) => requireToken(mobileShell, token, 'MobileShell Today route map'));

[
  'onOpenDashboard?: () => void;',
  'onOpenHistory?: () => void;',
  'assertCampaignCompleteSucceeded(result, {',
  'assertCampaignSkipSucceeded(result, {',
  "logCampaignFailure('mobile_today_campaign_complete_failed'",
  "logCampaignFailure('mobile_today_campaign_skip_failed'",
  'readTempStatusResponse(res,',
  "surface: 'mobile_today_hours'",
  'assertStoreUpdateSucceeded(',
  'mobile_today_hours_store_update_rejected',
  'FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY ? (',
  'onClick={onOpenHistory}',
  'TodayWeeklyGrowthPackCard',
].forEach((token) => requireToken(mobileHours, token, 'mobile Today screen'));
forbidToken(mobileHours, 'if (result?.today)', 'mobile Today optional success acknowledgement');
forbidToken(mobileHours, 'console.error(', 'mobile Today raw error logging');

[
  'const [showHistorical, setShowHistorical] = useState(false);',
  'useOwnerDashboard(selectedProjectId ? {',
  'loadHistorical: showHistorical,',
  'useOBPDashboard({ loadHistorical: showHistorical });',
  "setShowHistorical(nextMode !== 'today');",
  "const isLoading = viewMode === 'today'",
  'MobileBusinessHealthCard',
  'MobileOwnerActionPlanCard',
  'MobileOBPMetricsCard',
  'MobileMenuAnalyticsDetailsCard data={today}',
  'const ownerActionLayer = useMemo(() => (',
  'const handleOwnerAction = useCallback((item: OwnerActionItem) => {',
].forEach((token) => requireToken(mobileDashboard, token, 'mobile dashboard screen'));
requireOrder(
  mobileDashboard,
  [
    'const businessHealthFreshnessNote = getOwnerBusinessHealthFreshnessNote(businessHealthCurrent);',
    'const ownerActionLayer = useMemo(() => (',
    'const handleOwnerAction = useCallback((item: OwnerActionItem) => {',
    'if (loadingProjects || (!selectedProjectId && loadingProjects)) {',
  ],
  'mobile dashboard owner-action hook order',
);

[
  'usePastActivity(selectedProjectId)',
  'Review generated, shared, and skipped Today actions from the last 7 days for the selected menu.',
  'ProjectSelectorTrigger',
  'MobileProjectSelectorSheet',
  'No activity in the last 7 days for this project.',
].forEach((token) => requireToken(mobileHistory, token, 'mobile Today history screen'));

[
  'getCampaignHistory(20, projectId)',
  'sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);',
  'return activityDate >= sevenDaysAgo;',
].forEach((token) => requireToken(pastActivityHook, token, 'past activity hook'));

[
  'Current Runtime Boundary',
  'not current launch certification',
  'External Certification Runbook',
  '`npm run verify:owner-dashboard-today-boundary`',
  'Today-first live dashboard',
  'loadHistorical: showHistorical',
  'OBP overview summary read diagnostics',
  'cached `trendSummary`',
  'cached weekly/monthly movement labels',
  'small comparison chart cards',
  'item interest, unavailable demand, and missing-search trends',
  'export controls, branch filters, date-range report builders',
  'owner_dashboard_obp_summary_read_failed',
  'viewsChange` as `null`',
  'Past Activity remains disabled unless `ENABLE_PAST_ACTIVITY_HISTORY` is enabled',
  'desktop/mobile browser QA',
].forEach((token) => requireToken(ownerDashboardDoc, token, 'owner dashboard docs'));
forbidToken(ownerDashboardDoc, '### Initial Load (Overview Mode)', 'owner dashboard stale initial overview heading');
forbidToken(ownerDashboardDoc, "viewMode = 'overview'", 'owner dashboard stale default view claim');
forbidToken(ownerDashboardDoc, "Default view is now 'overview'", 'owner dashboard stale default view comment');
forbidToken(ownerDashboardDoc, 'Overview data (fetched on initial load)', 'owner dashboard stale SWR key comment');

[
  'Route parity contract',
  '`npm run verify:mobile-shell-route-map`',
  '`npm run verify:owner-dashboard-today-boundary`',
  '`/dashboard` and `/today` both enter the Today tab',
  '`/today/history` enters Today history when Past Activity is enabled',
].forEach((token) => requireToken(mobileSupportDoc, token, 'mobile support docs'));

[
  ['OBP implementation', obpImplDoc, 'OBP dashboard summary read diagnostics'],
  ['OBP implementation', obpImplDoc, 'owner_dashboard_obp_summary_read_failed'],
  ['OBP implementation', obpImplDoc, 'use_daily_obp_docs_without_views_change'],
  ['OBP Firebase', obpFirebaseDoc, 'OBP dashboard summary-read diagnostics'],
  ['OBP Firebase', obpFirebaseDoc, 'owner_dashboard_obp_summary_read_failed'],
  ['OBP Firebase', obpFirebaseDoc, 'adds no fallback Firestore read, write, delete'],
].forEach(([label, source, token]) => requireToken(source, token, `${label} docs`));

[
  ['inventory', inventory, 'owner_dashboard_today'],
  ['inventory', inventory, 'owner-dashboard-today boundary source gate passed'],
  ['report', report, '## Owner Dashboard Today Boundary'],
  ['report', report, '`npm run verify:owner-dashboard-today-boundary`'],
  ['audit', audit, 'Owner Dashboard Today boundary checkpoint'],
  ['audit', audit, 'Owner Dashboard OBP summary read diagnostics checkpoint'],
  ['audit', audit, 'Mobile Dashboard owner-action hook-order checkpoint'],
  ['audit', audit, 'owner_dashboard_obp_summary_read_failed'],
  ['audit', audit, '`npm run verify:owner-dashboard-today-boundary`'],
  ['changelog', changelog, 'Owner Dashboard Today Boundary'],
  ['changelog', changelog, 'Owner Dashboard OBP Summary Read Diagnostics'],
  ['changelog', changelog, 'Mobile dashboard owner-action hooks are order-safe'],
  ['changelog', changelog, 'owner_dashboard_obp_summary_read_failed'],
  ['changelog', changelog, '`npm run verify:owner-dashboard-today-boundary`'],
].forEach(([label, source, token]) => requireToken(source, token, `owner dashboard Today ledger ${label}`));

if (failures.length > 0) {
  console.error('FAIL verify-owner-dashboard-today-boundary');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('PASS verify-owner-dashboard-today-boundary');
console.log('Validated Today-first owner dashboard routes, lazy historical reads, mobile route parity, Past Activity flag guards, campaign acknowledgements, and docs boundary.');
