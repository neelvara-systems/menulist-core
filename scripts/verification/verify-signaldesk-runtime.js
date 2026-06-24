const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const checks = [];

const SECTIONS = [
  ["dashboard", "DASHBOARD", "/signaldesk", "src/app/(signaldesk)/signaldesk/page.tsx"],
  ["mission", "MISSION", "/signaldesk/mission", "src/app/(signaldesk)/signaldesk/mission/page.tsx"],
  ["targets", "TARGETS", "/signaldesk/targets", "src/app/(signaldesk)/signaldesk/targets/page.tsx"],
  ["imports", "IMPORTS", "/signaldesk/imports", "src/app/(signaldesk)/signaldesk/imports/page.tsx"],
  ["approvals", "APPROVALS", "/signaldesk/approvals", "src/app/(signaldesk)/signaldesk/approvals/page.tsx"],
  ["templates", "TEMPLATES", "/signaldesk/templates", "src/app/(signaldesk)/signaldesk/templates/page.tsx"],
  ["inbox", "INBOX", "/signaldesk/inbox", "src/app/(signaldesk)/signaldesk/inbox/page.tsx"],
  ["attribution", "ATTRIBUTION", "/signaldesk/attribution", "src/app/(signaldesk)/signaldesk/attribution/page.tsx"],
  ["policies", "POLICIES", "/signaldesk/policies", "src/app/(signaldesk)/signaldesk/policies/page.tsx"],
  ["sources", "SOURCES", "/signaldesk/sources", "src/app/(signaldesk)/signaldesk/sources/page.tsx"],
  ["ai", "AI", "/signaldesk/ai", "src/app/(signaldesk)/signaldesk/ai/page.tsx"],
  ["channels", "CHANNELS", "/signaldesk/channels", "src/app/(signaldesk)/signaldesk/channels/page.tsx"],
  ["content", "CONTENT", "/signaldesk/content", "src/app/(signaldesk)/signaldesk/content/page.tsx"],
  ["partners", "PARTNERS", "/signaldesk/partners", "src/app/(signaldesk)/signaldesk/partners/page.tsx"],
  ["settings", "SETTINGS", "/signaldesk/settings", "src/app/(signaldesk)/signaldesk/settings/page.tsx"],
  ["control-room", "CONTROL_ROOM", "/signaldesk/control-room", "src/app/(signaldesk)/signaldesk/control-room/page.tsx"],
  ["audit", "AUDIT", "/signaldesk/audit", "src/app/(signaldesk)/signaldesk/audit/page.tsx"],
];

const ACTIONS = [
  "seed-defaults",
  "create-source-policy",
  "import-targets",
  "score-target",
  "create-evidence",
  "create-draft",
  "review-approval",
  "export-message",
  "capture-reply",
  "record-outcome",
  "capture-demand-signal",
  "run-source-provider",
  "run-ai-assist",
  "prepare-channel-handoff",
  "upsert-channel-window-state",
  "send-approved-message",
  "upsert-provider-account",
  "upsert-budget-policy",
  "upsert-connector-setting",
  "upsert-model-route",
  "upsert-enrichment-waterfall",
  "upsert-audience-segment",
  "recommend-market-pod-plan",
  "upsert-sender-domain",
  "upsert-self-service-cta",
  "create-daily-growth-mission",
  "review-growth-mission",
  "create-experiment-card",
  "review-experiment-card",
  "upsert-offer-cta",
  "upsert-reply-playbook",
  "create-source-quality-snapshot",
  "refresh-provider-source-retention",
  "create-weekly-strategist-memo",
  "create-provider-evaluation",
  "run-enrichment-waterfall",
  "create-approval-packet",
  "create-sequencer-handoff",
  "send-owned-sequence-step",
  "upsert-content-source",
  "create-content-asset",
  "generate-content-distribution-drafts",
  "review-content-distribution-draft",
  "schedule-content-distribution-draft",
  "record-content-performance",
  "upsert-trust-partner-profile",
  "create-trust-partner-niche-test",
  "create-trust-partner-brief",
  "review-trust-partner-deal",
  "record-trust-partner-deliverable",
  "record-trust-partner-metrics",
  "review-trust-partner-renewal",
];

const KILL_SWITCH_SCOPES = [
  "global-outbound",
  "email",
  "whatsapp",
  "instagram",
  "messenger",
  "source-provider",
  "ai-worker",
  "campaign",
  "content-distribution",
  "trust-partner",
  "menu-list-bridge",
];

const CONNECTOR_KINDS = [
  "email-smtp",
  "meta-whatsapp",
  "meta-instagram",
  "meta-messenger",
  "smartlead",
  "apify",
];

function resolvePath(relPath) {
  return path.join(ROOT, relPath);
}

function read(relPath) {
  return fs.readFileSync(resolvePath(relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(resolvePath(relPath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
  checks.push(message);
}

function assertExists(relPath, label = relPath) {
  assert(exists(relPath), `${label} exists`);
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} includes ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} does not include ${needle}`);
}

function walkTextFiles(relPath) {
  const absolute = resolvePath(relPath);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [relPath];

  const files = [];
  for (const entry of fs.readdirSync(absolute)) {
    const nestedRelPath = path.join(relPath, entry);
    const nestedAbsPath = resolvePath(nestedRelPath);
    const nestedStat = fs.statSync(nestedAbsPath);
    if (nestedStat.isDirectory()) {
      files.push(...walkTextFiles(nestedRelPath));
    } else if (/\.(css|js|jsx|json|md|scss|ts|tsx|txt|xml)$/i.test(entry)) {
      files.push(nestedRelPath);
    }
  }
  return files;
}

function verifyProductBoundary() {
  const product = read("src/constants/product.ts");
  const signaldeskProduct = read("src/constants/signaldesk/product.ts");
  const deploymentTargets = read("src/constants/deploymentTargets.ts");
  const urls = read("src/constants/urls.ts");
  const productDomains = read("src/constants/productDomains.ts");

  assertIncludes(product, "SIGNALDESK: 'SD'", "Product IDs");
  assertIncludes(signaldeskProduct, "PRODUCT_IDS.SIGNALDESK", "SignalDesk product constant");
  assertIncludes(signaldeskProduct, 'SIGNALDESK_PRODUCT_SLUG = "signaldesk"', "SignalDesk slug");
  assertIncludes(signaldeskProduct, "SIGNALDESK_RATE_LIMIT_NAMESPACE", "SignalDesk rate-limit namespace");
  assertIncludes(deploymentTargets, "productId: 'signaldesk'", "Deployment targets");
  assertIncludes(deploymentTargets, "firebaseProjectId: 'menulist-signaldesk-qa'", "SignalDesk QA Firebase target");
  assertIncludes(deploymentTargets, "firebaseProjectId: 'menulist-signaldesk'", "SignalDesk production Firebase target");
  assertIncludes(urls, "'signaldesk'", "SignalDesk reserved subdomain");
  assertNotIncludes(productDomains, "signaldesk", "Public product-domain registry");
}

function verifyFeatureFlags() {
  const flags = read("src/config/features.ts");
  const functionFlags = read("functions-signaldesk/src/constants/features.ts");

  [
    "ENABLE_MENULIST_SIGNALDESK_APP_SHELL: true",
    "ENABLE_MENULIST_SIGNALDESK_IMPORTS: true",
    "ENABLE_MENULIST_SIGNALDESK_AI_INTELLIGENCE: true",
    "ENABLE_MENULIST_SIGNALDESK_DRAFTS: true",
    "ENABLE_MENULIST_SIGNALDESK_APPROVALS: true",
    "ENABLE_MENULIST_SIGNALDESK_EMAIL_EXPORT: true",
    "ENABLE_MENULIST_SIGNALDESK_INBOX: true",
    "ENABLE_MENULIST_SIGNALDESK_OUTCOME_BRIDGE: true",
    "ENABLE_MENULIST_SIGNALDESK_DEMAND_SIGNALS: true",
    "ENABLE_MENULIST_SIGNALDESK_CONTROL_ROOM: true",
    "ENABLE_MENULIST_SIGNALDESK_SOURCE_PROVIDERS: true",
    "ENABLE_MENULIST_SIGNALDESK_APIFY_SOURCE_BROKER: true",
    "ENABLE_MENULIST_SIGNALDESK_AI_PROVIDER_CALLS: true",
    "ENABLE_MENULIST_SIGNALDESK_PROVIDER_WEBHOOKS: true",
    "ENABLE_MENULIST_SIGNALDESK_ASSISTED_CHANNELS: true",
    "ENABLE_MENULIST_SIGNALDESK_OWNED_EMAIL_SEQUENCER: true",
    "ENABLE_MENULIST_SIGNALDESK_CONTENT_DISTRIBUTION_RAIL: true",
    "ENABLE_MENULIST_SIGNALDESK_TRUST_PARTNER_RAIL: true",
    "ENABLE_MENULIST_SIGNALDESK_OPERATING_LAYER: true",
    "ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND: false",
  ].forEach((needle) => assertIncludes(flags, needle, "SignalDesk feature flags"));

  assertIncludes(functionFlags, "ENABLE_SIGNALDESK_HEALTH_CHECK: true", "SignalDesk function health flag");
  assertIncludes(functionFlags, "ENABLE_SIGNALDESK_PROVIDER_WEBHOOKS: false", "SignalDesk function webhook flag");
  assertIncludes(functionFlags, "ENABLE_SIGNALDESK_AI_WORKERS: false", "SignalDesk function AI worker flag");
  assertIncludes(functionFlags, "ENABLE_SIGNALDESK_SCHEDULED_SUMMARIES: false", "SignalDesk function scheduler flag");
}

function verifyRoutesAndUi() {
  const routes = read("src/constants/signaldesk/routes.ts");
  const types = read("src/types/signaldesk/index.ts");
  const workspaceRoute = read("src/app/api/signaldesk/workspace/route.ts");
  const workspace = read("src/components/signaldesk/SignalDeskWorkspace.tsx");
  const layout = read("src/app/(signaldesk)/layout.tsx");
  const pathProvider = read("src/components/signaldesk/SignalDeskPathProvider.tsx");
  const middleware = read("src/middleware.ts");

  assertIncludes(routes, 'SIGNALDESK_BASE_PATH = "/signaldesk"', "SignalDesk base path");
  assertIncludes(routes, 'SIGNALDESK_MENULIST_DIGITAL_ALIAS_PATH = "/sd"', "SignalDesk menulist.digital alias path");
  assertIncludes(pathProvider, "withSignalDeskBasePath", "SignalDesk path provider");
  assertIncludes(layout, "SignalDeskPathProvider", "SignalDesk layout base-path provider");
  assertIncludes(layout, "AntdThemeProvider", "SignalDesk layout uses shared AntD theme provider");
  assertIncludes(layout, "x-product-base-path", "SignalDesk layout reads middleware base path");
  assertIncludes(middleware, "buildSignalDeskAliasRewritePath", "Middleware rewrites /sd alias");
  assertIncludes(middleware, "setSignalDeskProductHeaders", "Middleware sets SignalDesk product headers");
  assertIncludes(middleware, "X-Robots-Tag", "Middleware noindexes SignalDesk");

  for (const [section, routeKey, routePath, page] of SECTIONS) {
    assertExists(page, `${section} page`);
    assertIncludes(read(page), `activeSection="${section}"`, `${section} page active section`);
    assertIncludes(types, `| "${section}"`, `SignalDeskSection ${section}`);
    assertIncludes(routes, `${routeKey}:`, `SignalDesk route ${routeKey}`);
    if (routePath === "/signaldesk") {
      assertIncludes(routes, `${routeKey}: SIGNALDESK_BASE_PATH`, `SignalDesk route path ${routePath}`);
    } else {
      const suffix = routePath.slice("/signaldesk".length);
      assertIncludes(routes, `${routeKey}: \`\${SIGNALDESK_BASE_PATH}${suffix}\``, `SignalDesk route path ${routePath}`);
    }
    assertIncludes(workspaceRoute, `"${section}"`, `Workspace API section ${section}`);
    assertIncludes(workspace, `section: "${section}"`, `Workspace nav section ${section}`);
  }

  assertIncludes(workspace, "Observe", "Solo-owner dashboard posture");
  assertIncludes(workspace, "Monitor", "Solo-owner dashboard posture");
  assertIncludes(workspace, "Approve", "Solo-owner dashboard posture");
  assertIncludes(workspace, "DashboardSidebarShell", "SignalDesk uses shared dashboard sidebar shell");
  assertIncludes(workspace, "DashboardHeaderShell", "SignalDesk uses shared dashboard header shell");
  assertIncludes(workspace, "from \"antd\"", "SignalDesk workspace uses Ant Design components");
  assertIncludes(workspace, "function WorkspaceButton", "SignalDesk workspace wraps buttons with Ant Design");
  assertIncludes(workspace, "function WorkspaceInput", "SignalDesk workspace wraps inputs with Ant Design");
  assertIncludes(workspace, "function WorkspaceSelect", "SignalDesk workspace wraps selects with Ant Design");
  assertIncludes(workspace, "function WorkspaceTextarea", "SignalDesk workspace wraps textareas with Ant Design");
  assert(!/<button\b|<input\b|<select\b|<textarea\b/.test(workspace), "SignalDesk workspace has no raw form controls");
  const savingOnlyButtons = workspace
    .split("\n")
    .filter((line) => (
      line.includes("<WorkspaceButton")
      && line.includes("disabled={saving")
      && !line.includes("mobileReadOnly")
    ));
  assert(
    savingOnlyButtons.every((line) => line.includes("setSelectedContent")),
    "SignalDesk mutation buttons use mobile-aware actionDisabled gate",
  );
  assertIncludes(workspace, "data.setup.providerSendEnabled", "Send-step UI remains gated by provider send flag");
}

function verifyApiSecurityAndActions() {
  const apiRoutes = [
    "src/app/api/signaldesk/overview/route.ts",
    "src/app/api/signaldesk/workspace/route.ts",
    "src/app/api/signaldesk/actions/route.ts",
    "src/app/api/signaldesk/kill-switches/route.ts",
  ];

  for (const relPath of apiRoutes) {
    const content = read(relPath);
    assertIncludes(content, "withAuth", `${relPath} auth guard`);
    assertIncludes(content, "requireSignalDeskRuntime", `${relPath} runtime guard`);
    assertIncludes(content, "requireSignalDeskAccess", `${relPath} access guard`);
    assertIncludes(content, "applySignalDeskRateLimit", `${relPath} rate limit`);
  }

  const actions = read("src/app/api/signaldesk/actions/route.ts");
  const dal = read("src/database/signaldesk/index.ts");
  const killSwitches = read("src/app/api/signaldesk/kill-switches/route.ts");
  const workflow = read("src/lib/signaldesk/workflowServer.ts");
  const overviewServer = read("src/lib/signaldesk/server.ts");
  const workspace = read("src/components/signaldesk/SignalDeskWorkspace.tsx");
  const apiGuards = read("src/lib/signaldesk/apiGuards.ts");
  const clientDal = read("src/database/signaldesk/index.ts");
  const webhookRoute = read("src/app/api/signaldesk/webhooks/[provider]/route.ts");
  const webhookServer = read("src/lib/signaldesk/webhookServer.ts");

  assertIncludes(actions, "parseSignalDeskJsonBody", "Actions route shared JSON parser");
  assertIncludes(actions, "logSignalDeskValidationFailure", "Actions route validation logging");
  assertIncludes(killSwitches, "parseSignalDeskJsonBody", "Kill-switch route shared JSON parser");
  assertIncludes(killSwitches, "logSignalDeskValidationFailure", "Kill-switch route validation logging");
  assertIncludes(apiGuards, "Invalid JSON - SignalDesk API", "SignalDesk invalid JSON security log");
  assertIncludes(apiGuards, "isSignalDeskMobileRequest", "SignalDesk mobile request detector");
  assertIncludes(apiGuards, "blockSignalDeskMobileMutation", "SignalDesk mobile mutation blocker");
  assertIncludes(actions, "SIGNALDESK_MOBILE_ACTION_CLASS", "Actions route classifies mobile actions");
  assertIncludes(actions, "recordSignalDeskMobileActionBlockedServer", "Actions route audits mobile blocked actions");
  assertIncludes(actions, "MOBILE_READ_ONLY_ACTION_BLOCKED", "Actions route blocks mobile mutations");
  assertIncludes(killSwitches, "MOBILE_EMERGENCY_PAUSE", "Kill-switch route requires mobile emergency-pause confirmation");
  assertIncludes(killSwitches, "recordSignalDeskMobileActionBlockedServer", "Kill-switch route audits mobile blocked actions");
  assertIncludes(clientDal, "x-signaldesk-client-mode", "Client marks mobile read-only mode");

  for (const action of ACTIONS) {
    assertIncludes(actions, `"${action}"`, `Actions route action ${action}`);
    assertIncludes(dal, `| "${action}"`, `Client DAL action ${action}`);
  }

  for (const scope of KILL_SWITCH_SCOPES) {
    assertIncludes(killSwitches, `"${scope}"`, `Kill-switch API scope ${scope}`);
    assertIncludes(overviewServer, `"${scope}"`, `Overview normalizes kill-switch scope ${scope}`);
    assertIncludes(workspace, `"${scope}"`, `Control-room UI exposes kill-switch scope ${scope}`);
  }

  assertIncludes(actions, 'if (action === "send-approved-message") return "message.send"', "Provider send requires send permission");
  assertIncludes(actions, 'if (action === "send-owned-sequence-step") return "message.send"', "Owned sequence send requires send permission");
  assertIncludes(actions, '"SignalDesk provider send is disabled"', "Provider-send disabled safe error");
  assertIncludes(actions, '"Draft has unsupported claims"', "Unsupported draft-claim safe error");
  assertIncludes(actions, '"SOURCE_POLICY_EXPIRED"', "Expired source policy safe error");
  assertIncludes(actions, '"SOURCE_POLICY_REVIEW_REQUIRED"', "Source policy review-required safe error");
  assertIncludes(actions, '"SOURCE_POLICY_USE_NOT_ALLOWED"', "Source policy allowed-use safe error");
  assertIncludes(actions, '"SOURCE_POLICY_RETENTION_MISSING"', "Source policy retention safe error");
  assertIncludes(workflow, "sendSignalDeskApprovedMessageServer", "Approved message send server path");
  assertIncludes(workflow, "sendSignalDeskOwnedSequenceStepServer", "Owned sequencer send server path");
  assertIncludes(workflow, "recommendSignalDeskMarketPodPlanServer", "Market pod recommender server path");
  assertIncludes(workflow, "createSignalDeskWeeklyStrategistMemoServer", "Weekly strategist memo server path");
  assertIncludes(workflow, "createSignalDeskDailyGrowthMissionServer", "Daily growth mission server path");
  assertIncludes(workflow, "reviewSignalDeskGrowthMissionServer", "Growth mission review server path");
  assertIncludes(workflow, "createSignalDeskExperimentCardServer", "Experiment card server path");
  assertIncludes(workflow, "reviewSignalDeskExperimentCardServer", "Experiment review server path");
  assertIncludes(workflow, "upsertSignalDeskOfferCtaServer", "Offer CTA server path");
  assertIncludes(workflow, "upsertSignalDeskReplyPlaybookServer", "Reply playbook server path");
  assertIncludes(workflow, "createSignalDeskSourceQualitySnapshotServer", "Source quality snapshot server path");
  assertIncludes(workflow, "upsertSignalDeskChannelWindowStateServer", "Channel window state server path");
  assertIncludes(workflow, "refreshSignalDeskProviderSourceRetentionServer", "Provider source retention server path");
  assertIncludes(workflow, "createSignalDeskProviderEvaluationServer", "Provider evaluation server path");
  assertIncludes(workflow, "upsertSignalDeskTrustPartnerProfileServer", "Trust partner profile server path");
  assertIncludes(workflow, "reviewSignalDeskTrustPartnerRenewalServer", "Trust partner renewal server path");
  assertIncludes(workflow, "upsertSignalDeskContentSourceServer", "Content source server path");
  assertIncludes(workflow, "generateSignalDeskContentDistributionDraftsServer", "Content draft generation server path");
  assertIncludes(workflow, "Content asset is not ready", "Content draft generation blocks held assets");
  assertIncludes(workflow, "scheduleSignalDeskContentDistributionDraftServer", "Content schedule server path");
  assertIncludes(workflow, "recordSignalDeskContentPerformanceServer", "Content performance server path");
  assertIncludes(workflow, "ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND", "Workflow checks provider-send flag");
  assertIncludes(workflow, "ENABLE_MENULIST_SIGNALDESK_CONTENT_DISTRIBUTION_RAIL", "Workflow checks content distribution flag");
  assertIncludes(workflow, "ENABLE_MENULIST_SIGNALDESK_OPERATING_LAYER", "Workflow checks operating-layer flag");
  assertIncludes(workflow, 'throw new Error("SignalDesk provider send is disabled")', "Workflow blocks real send");
  assertIncludes(workflow, "unsupportedClaims?.length", "Approval review blocks unsupported draft claims");
  assertIncludes(workflow, "assertSourcePolicyUsable", "Workflow centralizes source policy active/expiry guard");
  assertIncludes(workflow, "appendSourcePolicyBlockedAudit", "Workflow audits source policy blocks");
  assertIncludes(workflow, "isSourcePolicyExpired", "Workflow checks source policy expiry");
  assertIncludes(workflow, "getSourcePolicyState", "Workflow computes source policy UI state");
  assertIncludes(workflow, "expiresAt: timestampFromIsoOrDefault(input.expiresAt, input.retentionDays)", "Source policy creation sets expiry");
  assertIncludes(workflow, 'if (!isSenderDomainReady(await readReadySenderDomain(db))) throw new Error("Sender domain is not ready")', "Email export requires sender readiness");
  assertIncludes(actions, '"SignalDesk Operating Layer is disabled"', "Actions route exposes operating-layer safe error");
  assertIncludes(actions, '"Content asset is not ready"', "Actions route exposes content asset readiness safe error");

  assertIncludes(webhookRoute, "checkRateLimit", "Webhook route rate limit");
  assertIncludes(webhookRoute, "processSignalDeskProviderWebhook", "Webhook route processing");
  assertIncludes(webhookRoute, "verifySignalDeskWebhookChallenge", "Webhook challenge verification");
  assertIncludes(webhookServer, "Invalid SignalDesk webhook signature", "Webhook signature failure");
  assertIncludes(webhookServer, "const db = getSignalDeskDb();", "Webhook gets DB after signature verification block");
  assertIncludes(webhookServer, "existingEventSnap.exists", "Webhook duplicate event guard");
  assertIncludes(webhookServer, 'status: "duplicate"', "Webhook duplicate event status");
}

function verifyConnectorProviderAndInvestmentControls() {
  const actions = read("src/app/api/signaldesk/actions/route.ts");
  const types = read("src/types/signaldesk/index.ts");
  const workspace = read("src/components/signaldesk/SignalDeskWorkspace.tsx");
  const workflow = read("src/lib/signaldesk/workflowServer.ts");
  const integrations = read("src/constants/signaldesk/integrations.ts");
  const sourceProviders = read("src/lib/signaldesk/sourceProviders.ts");

  for (const connector of CONNECTOR_KINDS) {
    assertIncludes(actions, `"${connector}"`, `Connector action schema ${connector}`);
    assertIncludes(types, `| "${connector}"`, `Connector type ${connector}`);
    assertIncludes(workspace, `value="${connector}"`, `Connector UI option ${connector}`);
  }

  [
    "upsertSignalDeskConnectorSettingServer",
    "getSignalDeskChannelReadiness",
    "runSignalDeskSourceProviderServer",
    "runSignalDeskAiAssistServer",
    "runSignalDeskEnrichmentWaterfallServer",
    "createSignalDeskApprovalPacketServer",
    "createSignalDeskSequencerHandoffServer",
    "upsertSignalDeskSenderDomainServer",
    "upsertSignalDeskSelfServiceCtaServer",
    "Provider budget is ready",
    "No provider spend",
  ].forEach((needle) => assertIncludes(workflow, needle, `Workflow investment control ${needle}`));

  assertIncludes(integrations, "MENULIST_SIGNALDESK_APIFY_SOURCE_ACTOR_ID", "Apify Actor ID env is product-scoped");
  assertIncludes(sourceProviders, "SIGNALDESK_INTEGRATION_ENV.APIFY_SOURCE_ACTOR_ID", "Apify Actor ID is read from env constants");

  [
    "providerAccounts",
    "budgetPolicies",
    "vendorRuns",
    "enrichmentResults",
    "enrichmentWaterfalls",
    "modelRoutes",
    "approvalPackets",
    "marketPods",
    "audienceSegments",
    "channelWindows",
    "providerEvaluations",
    "providerSourceRetentions",
    "strategistMemos",
    "sequencerHandoffs",
    "senderDomains",
    "runTimelines",
    "selfServiceCtas",
    "growthMissions",
    "experimentCards",
    "offerCtas",
    "replyPlaybooks",
    "sourceQualitySnapshots",
    "contentSources",
    "contentAssets",
    "contentDistributionDrafts",
    "contentCalendarItems",
    "contentPerformanceSummaries",
    "trustPartnerProfiles",
    "trustPartnerRenewalDecisions",
  ].forEach((needle) => assertIncludes(types, needle, `Workspace data includes ${needle}`));

  assertIncludes(workspace, "Queue Owned", "Owned email sequencer UI is first path");
  assertIncludes(workspace, "Weekly Strategist Memos", "Weekly strategist memo UI");
  assertIncludes(workspace, "Refresh Plan", "Market pod recommendation UI");
  assertIncludes(workspace, "Daily Mission", "Daily Growth Mission UI");
  assertIncludes(workspace, "Experiment Card", "Experiment card UI");
  assertIncludes(workspace, "Offer CTA", "Offer CTA UI");
  assertIncludes(workspace, "Reply Playbook", "Reply playbook UI");
  assertIncludes(workspace, "Smartlead", "Smartlead connector remains fallback metadata");
  assertIncludes(workspace, "Content Distribution", "Content Distribution Rail UI");
  assertIncludes(workflow, 'provider: "owned-email"', "Owned email sequencer provider is seeded");
  assertIncludes(workflow, 'provider: "smartlead"', "Smartlead fallback is held as provider record");
}

function verifyFirebaseIsolation() {
  [
    "firebase-signaldesk.json",
    "firestore-signaldesk.rules",
    "firestore-signaldesk.indexes.json",
    "storage-signaldesk.rules",
    "functions-signaldesk/src/index.ts",
    "src/lib/firebase/signaldeskConfig.ts",
    "src/lib/firebase/signaldeskFirebaseAdmin.ts",
    "src/constants/signaldesk/database.ts",
    "scripts/verification/smoke-signaldesk-routes.js",
    "scripts/verification/smoke-signaldesk-workflow.js",
    "scripts/verification/e2e-signaldesk-local.js",
    "scripts/verification/verify-signaldesk-security-rules.js",
  ].forEach((relPath) => assertExists(relPath));

  const firebaseConfig = read("firebase-signaldesk.json");
  const firestoreRules = read("firestore-signaldesk.rules");
  const firestoreIndexes = read("firestore-signaldesk.indexes.json");
  const storageRules = read("storage-signaldesk.rules");
  const admin = read("src/lib/firebase/signaldeskFirebaseAdmin.ts");
  const config = read("src/lib/firebase/signaldeskConfig.ts");
  const firebaseConstants = read("src/constants/signaldesk/firebase.ts");
  const database = read("src/constants/signaldesk/database.ts");
  const rulesVerifier = read("scripts/verification/verify-signaldesk-security-rules.js");

  assertIncludes(firebaseConfig, '"source": "functions-signaldesk"', "SignalDesk Firebase functions source");
  assertIncludes(firebaseConfig, '"codebase": "signaldesk"', "SignalDesk Firebase functions codebase");
  assertIncludes(firebaseConfig, '"rules": "firestore-signaldesk.rules"', "SignalDesk Firestore rules config");
  assertIncludes(firebaseConfig, '"rules": "storage-signaldesk.rules"', "SignalDesk Storage rules config");
  assertIncludes(firestoreRules, "allow read, write: if false;", "SignalDesk Firestore default deny");
  assertIncludes(firestoreRules, "function canReadSignalDesk()", "SignalDesk Firestore read helper");
  assertIncludes(firestoreRules, "allow write: if false;", "SignalDesk Firestore denies client writes");
  assertIncludes(firestoreRules, "signaldeskStrategistMemos", "SignalDesk strategist memos are readable through rules");
  assertIncludes(firestoreRules, "signaldeskProviderEvaluations", "SignalDesk provider evaluations are readable through rules");
  assertIncludes(firestoreRules, "signaldeskProviderSourceRetention", "SignalDesk provider source retention is readable through rules");
  assertIncludes(firestoreRules, "signaldeskChannelWindowStates", "SignalDesk channel-window states are readable through rules");
  assertIncludes(firestoreRules, "signaldeskContentDistributionDrafts", "SignalDesk content drafts are readable through rules");
  assertIncludes(firestoreRules, "signaldeskContentPerformanceSummaries", "SignalDesk content performance is readable through rules");
  assertIncludes(firestoreRules, "signaldeskGrowthMissions", "SignalDesk growth missions are readable through rules");
  assertIncludes(firestoreRules, "signaldeskExperimentCards", "SignalDesk experiment cards are readable through rules");
  assertIncludes(firestoreRules, "signaldeskOfferCtas", "SignalDesk offer CTAs are readable through rules");
  assertIncludes(firestoreRules, "signaldeskReplyPlaybooks", "SignalDesk reply playbooks are readable through rules");
  assertIncludes(firestoreRules, "signaldeskSourceQualitySnapshots", "SignalDesk source quality snapshots are readable through rules");
  assertIncludes(firestoreRules, "signaldeskTrustPartnerProfiles", "SignalDesk partner rail collections remain read-only");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskProviderSourceRetention"', "SignalDesk provider source retention index");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskContentDistributionDrafts"', "SignalDesk content draft indexes");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskContentPerformanceSummaries"', "SignalDesk content performance indexes");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskGrowthMissions"', "SignalDesk growth mission indexes");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskExperimentCards"', "SignalDesk experiment card indexes");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskSourceQualitySnapshots"', "SignalDesk source quality indexes");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskTrustPartnerMetrics"', "SignalDesk trust partner metrics index");
  assertIncludes(storageRules, "allow read, write: if false;", "SignalDesk Storage default deny");
  assertIncludes(storageRules, "function canReadSignalDesk()", "SignalDesk Storage read helper");
  assertIncludes(rulesVerifier, "Public summary read", "SignalDesk rules verifier covers unauth summary read denial");
  assertIncludes(rulesVerifier, "Public summary write", "SignalDesk rules verifier covers unauth summary write denial");
  assertIncludes(rulesVerifier, "Public SignalDesk storage upload", "SignalDesk rules verifier covers unauth storage upload denial");
  assertIncludes(rulesVerifier, "initializeTestEnvironment", "SignalDesk rules verifier covers rules-unit semantic checks");
  assertIncludes(rulesVerifier, "signaldeskTargets", "SignalDesk rules verifier covers raw target denial");
  assertIncludes(firebaseConstants, "MENULIST_SIGNALDESK_FIREBASE_MODE", "SignalDesk Firebase mode env");
  assertIncludes(firebaseConstants, "MENULIST_SIGNALDESK_FIREBASE", "SignalDesk Admin credential prefix");
  assertIncludes(config, "SIGNALDESK_FIREBASE_MODE_ENV_KEYS", "SignalDesk Firebase config uses mode env constants");
  assertIncludes(admin, "SIGNALDESK_FIREBASE_CREDENTIAL_PREFIX", "SignalDesk Admin uses credential prefix constants");
  assertIncludes(database, 'TARGETS: "signaldeskTargets"', "SignalDesk product-local collection names");
  assertIncludes(database, 'SELF_SERVICE_CTAS: "signaldeskSelfServiceCtas"', "SignalDesk self-service CTA collection");
  assertIncludes(database, 'CONTENT_DISTRIBUTION_DRAFTS: "signaldeskContentDistributionDrafts"', "SignalDesk content distribution collection");
  assertIncludes(database, 'STRATEGIST_MEMOS: "signaldeskStrategistMemos"', "SignalDesk strategist memo collection");
  assertIncludes(database, 'PROVIDER_EVALUATIONS: "signaldeskProviderEvaluations"', "SignalDesk provider evaluation collection");
  assertIncludes(database, 'GROWTH_MISSIONS: "signaldeskGrowthMissions"', "SignalDesk growth mission collection");
  assertIncludes(database, 'EXPERIMENT_CARDS: "signaldeskExperimentCards"', "SignalDesk experiment card collection");
  assertIncludes(database, 'OFFER_CTAS: "signaldeskOfferCtas"', "SignalDesk offer CTA collection");
  assertIncludes(database, 'REPLY_PLAYBOOKS: "signaldeskReplyPlaybooks"', "SignalDesk reply playbook collection");
  assertIncludes(database, 'SOURCE_QUALITY_SNAPSHOTS: "signaldeskSourceQualitySnapshots"', "SignalDesk source quality snapshot collection");
}

function verifyPublicIsolation() {
  const isolatedPaths = [
    "src/app/(website)",
    "src/components/website",
    "src/app/client",
    "src/components/templates/main-app",
    "public/sitemap.xml",
    "public/robots.txt",
    "public/llms.txt",
    "public/llms-full.txt",
  ];

  for (const relPath of isolatedPaths) {
    for (const filePath of walkTextFiles(relPath)) {
      const content = read(filePath);
      assertNotIncludes(content, "signaldesk", `${filePath} public isolation`);
      assertNotIncludes(content, "SignalDesk", `${filePath} public isolation`);
    }
  }
}

function verifyDocsTruth() {
  const readme = read("__docs__/menulist-signaldesk/README.md");
  const impl = read("__docs__/menulist-signaldesk/menulist-signaldesk_impl.md");
  const firebase = read("__docs__/menulist-signaldesk/menulist-signaldesk_firebase.md");
  const validation = read("__docs__/menulist-signaldesk/menulist-signaldesk_validation.md");
  const trustPartnerRail = read("__docs__/menulist-signaldesk/signaldesk-trust-partner-rail/README.md");
  const contentDistributionRail = read("__docs__/menulist-signaldesk/signaldesk-content-distribution-rail/README.md");
  const operatingLayer = read("__docs__/menulist-signaldesk/signaldesk-operating-layer/README.md");

  assertIncludes(readme, "private growth control room", "SignalDesk README internal boundary");
  assertIncludes(readme, "observe, monitor, and approve", "SignalDesk README solo-owner posture");
  assertIncludes(readme, "| Product code | `SD` via `PRODUCT_IDS.SIGNALDESK` |", "SignalDesk README current product code");
  assertNotIncludes(readme, "Future product code", "SignalDesk README product code drift");
  assertIncludes(impl, "observe -> monitor -> approve -> pause or redirect", "SignalDesk implementation posture");
  assertIncludes(impl, '| Product code | `PRODUCT_IDS.SIGNALDESK = "SD"` is implemented.', "SignalDesk implementation current product code");
  assertIncludes(firebase, "Dedicated SignalDesk Firebase projects", "SignalDesk Firebase dedicated project posture");
  assertIncludes(validation, "No paid campaign automation was implemented.", "SignalDesk paid campaign skip");
  assertIncludes(validation, "No Firebase deploy was run.", "SignalDesk deploy skip");
  assertIncludes(validation, "Local emulator data-flow smoke now runs through `scripts/verification/smoke-signaldesk-workflow.js`", "SignalDesk local workflow smoke status");
  assertIncludes(validation, "`npm run verify:signaldesk`", "SignalDesk verifier documented");
  assertIncludes(trustPartnerRail, "Runtime implemented for internal testing", "Trust Partner Rail runtime status");
  assertIncludes(trustPartnerRail, "Broad consumer influencer tactics are not copied", "Trust Partner Rail rejects consumer influencer copying");
  assertIncludes(contentDistributionRail, "Runtime implemented for internal testing", "Content Distribution Rail runtime status");
  assertIncludes(contentDistributionRail, "No auto-publish", "Content Distribution Rail publish boundary");
  assertIncludes(operatingLayer, "Implementation slice approved", "Operating Layer doc status");
  assertIncludes(operatingLayer, "Daily Growth Mission", "Operating Layer Daily Growth Mission doc");
  assertIncludes(operatingLayer, "No provider send", "Operating Layer send boundary");
}

verifyProductBoundary();
verifyFeatureFlags();
verifyRoutesAndUi();
verifyApiSecurityAndActions();
verifyConnectorProviderAndInvestmentControls();
verifyFirebaseIsolation();
verifyPublicIsolation();
verifyDocsTruth();

console.log(`SignalDesk runtime verifier passed (${checks.length} checks)`);
