const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const checks = [];

const SECTIONS = [
  ["dashboard", "DASHBOARD", "/signaldesk", "src/app/(signaldesk)/signaldesk/page.tsx"],
  ["mission", "MISSION", "/signaldesk/mission", "src/app/(signaldesk)/signaldesk/mission/page.tsx"],
  ["revenue", "REVENUE", "/signaldesk/revenue", "src/app/(signaldesk)/signaldesk/revenue/page.tsx"],
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
  "review-market-pod",
  "upsert-sender-domain",
  "upsert-self-service-cta",
  "create-daily-growth-mission",
  "review-growth-mission",
  "create-experiment-card",
  "review-experiment-card",
  "upsert-offer-cta",
  "upsert-reply-playbook",
  "qualify-revenue-account",
  "upsert-commercial-opportunity",
  "upsert-commercial-offer",
  "upsert-operating-envelope",
  "refresh-activation-watch",
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
  "upsert-team-member",
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
    "ENABLE_MENULIST_SIGNALDESK_REVENUE_OPERATING_LAYER: true",
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
  assertIncludes(workspace, "Revenue Operating Layer", "SignalDesk revenue workspace title");
  assertIncludes(workspace, "Revenue Account", "SignalDesk revenue account UI");
  assertIncludes(workspace, "Commercial Offer Registry", "SignalDesk commercial offer UI");
  assertIncludes(workspace, "Operating Envelope", "SignalDesk operating envelope UI");
  assertIncludes(workspace, "Exception-only requests are stored as held", "SignalDesk exception-only UI boundary");
  assertIncludes(workspace, "read-only MenuList bridge", "SignalDesk activation bridge boundary");
  assertIncludes(workspace, "Stalled activations", "Revenue summary surfaces derived activation stalls");
  assertIncludes(workspace, "Recheck Watch", "Manual activation recheck remains a recovery action only");
  assertIncludes(workspace, "firstRevenueBudgetPolicyId", "Revenue UI selects only compatible budget scope");
  assertIncludes(workspace, "selectedCommercialOfferId", "Revenue UI supports explicit active offer selection");
  assertIncludes(workspace, 'fieldset aria-label="Revenue operating layer"', "Revenue mobile workspace uses disabled fieldset");
  assertIncludes(workspace, "resolvedRevenueMarketPodId", "Revenue envelope requires active market pod in UI");
  assertIncludes(workspace, "Approve Pod", "Market pod UI requires an explicit founder approval action");
  assertIncludes(workspace, "canApproveMarketPod", "Market pod approval UI is founder-role gated");
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
  const overviewRoute = read("src/app/api/signaldesk/overview/route.ts");
  const workspaceRoute = read("src/app/api/signaldesk/workspace/route.ts");
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
  assertIncludes(actions, 'if (action === "review-market-pod") return "signaldesk.configure";', "Market-pod review requires founder-only configure permission");
  assertIncludes(killSwitches, "parseSignalDeskJsonBody", "Kill-switch route shared JSON parser");
  assertIncludes(killSwitches, "logSignalDeskValidationFailure", "Kill-switch route validation logging");
  assertIncludes(apiGuards, "readBoundedJsonBody", "SignalDesk API guard bounded JSON body reader");
  assertIncludes(apiGuards, "const SIGNALDESK_JSON_BODY_MAX_BYTES = 256 * 1024;", "SignalDesk JSON body cap");
  assertNotIncludes(apiGuards, "request.json()", "SignalDesk API guard raw JSON parser");
  assertIncludes(apiGuards, "Invalid JSON - SignalDesk API", "SignalDesk invalid JSON security log");
  assertIncludes(apiGuards, "status: bodyResult.response.status", "SignalDesk invalid JSON bounded status log");
  assertIncludes(apiGuards, "getBoundedSignalDeskStringContext", "SignalDesk API guard bounded string context");
  assertIncludes(apiGuards, "getSignalDeskAccessLogContext", "SignalDesk API guard bounded access context");
  assertIncludes(apiGuards, "getBoundedSecurityRouteContext", "SignalDesk API guard bounded security route context");
  assertIncludes(apiGuards, "getSignalDeskSecurityLogContext", "SignalDesk API guard bounded security log context");
  assertIncludes(apiGuards, 'getBoundedSignalDeskStringContext("endpoint", request.nextUrl.pathname)', "SignalDesk API guard bounded endpoint metadata");
  assertIncludes(apiGuards, 'getBoundedSignalDeskStringContext("method", request.method)', "SignalDesk API guard bounded method metadata");
  assertNotIncludes(apiGuards, "buildSecurityContext", "SignalDesk API guard raw security context builder");
  assertNotIncludes(apiGuards, "endpoint: request.nextUrl.pathname", "SignalDesk API guard raw endpoint metadata");
  assertNotIncludes(apiGuards, "endpoint: params.request.nextUrl.pathname", "SignalDesk API guard raw params endpoint metadata");
  assertNotIncludes(apiGuards, "action: params.action", "SignalDesk API guard raw action metadata");
  assertIncludes(apiGuards, "logSignalDeskFailure", "SignalDesk API guard bounded failure logger");
  assertIncludes(apiGuards, "logRuntimeFailure(failureCode", "SignalDesk API guard runtime diagnostics");
  assertIncludes(apiGuards, 'getBoundedSignalDeskStringContext("validationDetails", params.details)', "SignalDesk API guard bounded validation details");
  assertNotIncludes(apiGuards, "error: params.details", "SignalDesk API guard raw validation details");
  assertNotIncludes(actions, "details: validation.error", "SignalDesk action route does not forward validation details");
  assertNotIncludes(killSwitches, "details: validation.error", "SignalDesk kill-switch route does not forward validation details");
  assertNotIncludes(actions, 'NextResponse.json({ error: "Invalid input", details: validation.error }', "SignalDesk action route raw validation details response");
  assertNotIncludes(killSwitches, 'NextResponse.json({ error: "Invalid input", details: validation.error }', "SignalDesk kill-switch route raw validation details response");
  assertIncludes(apiGuards, "const identityKey = hashPublicRateLimitValue(identity.userId || identity.email || \"unknown\");", "SignalDesk API guard hashes user/email rate-limit key material");
  assertIncludes(apiGuards, "key: `${SIGNALDESK_RATE_LIMIT_NAMESPACE}:${params.keyPrefix}:${identityKey}`", "SignalDesk API guard uses normalized rate-limit identity");
  assertNotIncludes(apiGuards, "const identityKey = identity.userId ||", "SignalDesk API guard does not store raw user IDs in rate-limit keys");
  assertNotIncludes(apiGuards, "key: `${SIGNALDESK_RATE_LIMIT_NAMESPACE}:${params.keyPrefix}:${identity.userId || identity.email || \"unknown\"}`", "SignalDesk API guard does not store raw email fallback in rate-limit keys");
  assertIncludes(apiGuards, "isSignalDeskMobileRequest", "SignalDesk mobile request detector");
  assertIncludes(apiGuards, "blockSignalDeskMobileMutation", "SignalDesk mobile mutation blocker");
  assertIncludes(overviewRoute, "signaldesk_overview_route_failed", "SignalDesk overview route diagnostics");
  assertIncludes(overviewRoute, "getSignalDeskAccessLogContext(accessResult.access)", "SignalDesk overview route bounded access context");
  assertIncludes(workspaceRoute, "signaldesk_workspace_route_failed", "SignalDesk workspace route diagnostics");
  assertIncludes(workspaceRoute, 'getBoundedSignalDeskStringContext("section", section)', "SignalDesk workspace bounded section context");
  assertIncludes(actions, "signaldesk_action_route_failed", "SignalDesk actions route diagnostics");
  assertIncludes(actions, 'getBoundedSignalDeskStringContext("action", envelope.data.action)', "SignalDesk actions bounded action context");
  assertIncludes(killSwitches, "signaldesk_kill_switch_update_failed", "SignalDesk kill-switch route diagnostics");
  assertIncludes(killSwitches, 'getBoundedSignalDeskStringContext("scope", validatedInput.scope)', "SignalDesk kill-switch bounded scope context");
  assertIncludes(overviewServer, "signaldesk_overview_load_failed", "SignalDesk overview server diagnostics");
  assertNotIncludes(overviewRoute, 'secureError("[SignalDesk API] Overview failed"', "SignalDesk overview route raw diagnostics");
  assertNotIncludes(workspaceRoute, 'secureError("[SignalDesk API] Workspace failed"', "SignalDesk workspace route raw diagnostics");
  assertNotIncludes(actions, 'secureError("[SignalDesk API] Action failed"', "SignalDesk actions route raw diagnostics");
  assertNotIncludes(killSwitches, 'secureError("[SignalDesk API] Kill switch update failed"', "SignalDesk kill-switch route raw diagnostics");
  assertNotIncludes(overviewServer, 'secureError("[SignalDesk] Failed to load overview"', "SignalDesk overview server raw diagnostics");
  assertIncludes(actions, "SIGNALDESK_MOBILE_ACTION_CLASS", "Actions route classifies mobile actions");
  assertIncludes(actions, "recordSignalDeskMobileActionBlockedServer", "Actions route audits mobile blocked actions");
  assertIncludes(actions, "MOBILE_READ_ONLY_ACTION_BLOCKED", "Actions route blocks mobile mutations");
  assertIncludes(killSwitches, "MOBILE_EMERGENCY_PAUSE", "Kill-switch route requires mobile emergency-pause confirmation");
  assertIncludes(killSwitches, "recordSignalDeskMobileActionBlockedServer", "Kill-switch route audits mobile blocked actions");
  assertIncludes(clientDal, "x-signaldesk-client-mode", "Client marks mobile read-only mode");
  assertIncludes(clientDal, "SIGNALDESK_OVERVIEW_LOAD_FAILED", "SignalDesk client DAL fixed overview failure copy");
  assertIncludes(clientDal, "SIGNALDESK_WORKSPACE_LOAD_FAILED", "SignalDesk client DAL fixed workspace failure copy");
  assertIncludes(clientDal, "SIGNALDESK_ACTION_FAILED", "SignalDesk client DAL fixed action failure copy");
  assertIncludes(clientDal, "SIGNALDESK_PAUSE_UPDATE_FAILED", "SignalDesk client DAL fixed pause failure copy");
  assertIncludes(clientDal, "SIGNALDESK_CLIENT_RESPONSE_JSON_MAX_BYTES", "SignalDesk client DAL response cap");
  assertIncludes(clientDal, "SIGNALDESK_CLIENT_RESPONSE_PARSE_FAILED", "SignalDesk client DAL stable response-parse diagnostic code");
  assertIncludes(clientDal, "SIGNALDESK_CLIENT_RESPONSE_REJECTED", "SignalDesk client DAL stable response-rejected diagnostic code");
  assertIncludes(clientDal, "SIGNALDESK_CLIENT_RESPONSE_INVALID", "SignalDesk client DAL stable invalid-response diagnostic code");
  assertIncludes(clientDal, "readSignalDeskClientDataResponse", "SignalDesk client DAL central response data parser");
  assertIncludes(clientDal, "readJsonResponseWithLimit<unknown>", "SignalDesk client DAL bounded response reader");
  assertIncludes(clientDal, "isSignalDeskOverviewData", "SignalDesk client DAL overview response guard");
  assertIncludes(clientDal, "isSignalDeskWorkspaceData", "SignalDesk client DAL workspace response guard");
  assertIncludes(clientDal, "isDataEnvelope(payload)", "SignalDesk client DAL requires data envelope");
  assertIncludes(clientDal, "logRuntimeFailure(SIGNALDESK_CLIENT_RESPONSE_PARSE_FAILED", "SignalDesk client DAL logs bounded response parse diagnostics");
  assertIncludes(clientDal, "logRuntimeFailure(SIGNALDESK_CLIENT_RESPONSE_REJECTED", "SignalDesk client DAL logs bounded response rejection diagnostics");
  assertIncludes(clientDal, "logRuntimeFailure(SIGNALDESK_CLIENT_RESPONSE_INVALID", "SignalDesk client DAL logs bounded invalid-response diagnostics");
  assertNotIncludes(clientDal, "payload?.error ||", "SignalDesk client DAL must not throw raw route response text");
  assertNotIncludes(clientDal, "responsePayload?.error ||", "SignalDesk client DAL must not throw raw action response text");
  assertNotIncludes(clientDal, "response.json().catch(() => null)", "SignalDesk client DAL must not silently swallow response parse failures");
  assertNotIncludes(clientDal, "await response.json()", "SignalDesk client DAL must not parse response bodies directly");
  assertIncludes(workspace, "Team Access", "Settings exposes internal team access panel");
  assertIncludes(workflow, "upsertSignalDeskTeamMemberServer", "Workflow supports audited SignalDesk team-member updates");
  assertIncludes(workflow, 'access.permissions.includes("signaldesk.configure")', "Workspace limits team-member list to configure permission");
  assertIncludes(actions, 'if (action === "upsert-team-member") return "signaldesk.configure"', "Team member updates require SignalDesk configure permission");
  assertIncludes(actions, '"upsert-team-member": "configure"', "Team member updates are blocked on mobile as configuration");
  assertIncludes(workflow, '"team_member_upsert"', "Team member update writes audit event");

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
  assertIncludes(workflow, "ENABLE_MENULIST_SIGNALDESK_REVENUE_OPERATING_LAYER", "Workflow checks revenue operating-layer flag");
  assertIncludes(workflow, "qualifySignalDeskRevenueAccountServer", "Revenue account qualification server path");
  assertIncludes(workflow, "upsertSignalDeskCommercialOpportunityServer", "Commercial opportunity server path");
  assertIncludes(workflow, "upsertSignalDeskCommercialOfferServer", "Commercial offer registry server path");
  assertIncludes(workflow, "upsertSignalDeskOperatingEnvelopeServer", "Operating envelope server path");
  assertIncludes(workflow, "refreshSignalDeskActivationWatchServer", "Activation watch server path");
  assertIncludes(workflow, "reviewSignalDeskMarketPodServer", "Founder market-pod review server path");
  assertIncludes(workflow, 'access.role !== "founder-admin"', "Market-pod strategy approval is founder-only");
  assertIncludes(workflow, 'input.status === "approved" && (access.role !== "founder-admin" || !access.permissions.includes("policy.approve"))', "Operating-envelope approval is founder-only");
  assertIncludes(workflow, 'marketPod.reviewDecision !== "approved"', "Operating envelopes require founder-approved market pods");
  assertIncludes(workflow, "currentSourcePolicySnaps", "Operating-envelope transaction revalidates current source policies");
  assertIncludes(workflow, "currentMarketPodSnap", "Operating-envelope transaction revalidates the current founder-approved market pod");
  assertIncludes(workflow, "currentBudgetSnap", "Operating-envelope transaction revalidates the current budget");
  assertIncludes(workflow, "currentSenderSnap", "Operating-envelope transaction revalidates the current sender identity");
  assertIncludes(workflow, "currentTemplateSnaps", "Operating-envelope transaction revalidates current templates");
  assertNotIncludes(workflow, 'status: recommendation === "hold" ? "hold" : "active"', "Market-pod recommendation cannot self-activate");
  assertNotIncludes(workflow, 'status: passCount > 0 ? "active" : "hold"', "Research agent cannot self-activate a market pod");
  assertIncludes(workflow, "SIGNALDESK_INTERESTED_REPLY_REVENUE_SYNC_FAILED", "Interested reply has bounded revenue-sync diagnostics");
  assertIncludes(workflow, "revenueSyncStatus", "Interested reply updates the revenue lifecycle automatically");
  assertIncludes(workflow, "SIGNALDESK_ACTIVATION_WATCH_AUTO_SYNC_FAILED", "Outcome activation auto-sync has bounded diagnostics");
  assertIncludes(workflow, "activationWatchSyncStatus", "Recorded outcomes update activation state automatically");
  assertIncludes(workflow, 'reconciliation: "qualification-after-outcome"', "Qualification reconciles outcomes recorded before the revenue account existed");
  assertIncludes(workflow, "hasTwoSurfaceActivation", "Revenue qualification distinguishes two-surface activation from generic conversion state");
  assertIncludes(workflow, 'where("outcomeType", "==", "two_surface_activation")', "Activation derivation preserves terminal activation evidence outside the latest window");
  assertIncludes(workflow, 'orderBy("updatedAt", "desc")', "Activation derivation reads a deterministic latest outcome window");
  assertIncludes(workflow, 'orderBy("updatedAt", "asc")', "Activation derivation reads the exact first outcome for the seven-day deadline");
  assertIncludes(workflow, "annotateActivationWatch", "Expired activation deadlines read as stalled without a scheduler");
  assertIncludes(workflow, 'name: "Bengaluru first proof pod"', "First proof pod matches the maintained Bengaluru recommendation");
  assertIncludes(workflow, "legacyUnapprovedMarketPod", "Default seeding migrates only the exact unapproved legacy first pod");
  assertIncludes(workflow, "!existingMarketPodSnap.exists || legacyUnapprovedMarketPod", "Default seeding cannot overwrite a founder-approved market pod");
  assertIncludes(workflow, "estimated spend today", "Daily founder brief includes spend");
  assertIncludes(workflow, "overdue revenue next action", "Daily founder brief includes stale revenue work");
  assertIncludes(workflow, 'const exceptionOnlyHeld = requestedApprovalMode === "exception-only"', "Exception-only envelope is deterministically held");
  assertIncludes(workflow, 'source: "signaldesk-outcome-summaries"', "Activation watch derives from SignalDesk outcomes");
  assertIncludes(workflow, "Commercial offer version already exists with different terms", "Commercial offer versions are immutable");
  assertIncludes(workflow, "Commercial opportunity stage and status do not match", "Commercial opportunity state dimensions stay consistent");
  assertIncludes(workflow, "Operating envelope total volume must cover the daily cap", "Operating envelope caps stay coherent");
  assertIncludes(workflow, "Operating envelope exceeds the remaining budget policy", "Operating envelope respects remaining budget");
  assertIncludes(workflow, "Sender domain is required for email envelope", "Email envelope requires explicit sender identity");
  assertIncludes(workflow, "Budget policy is not eligible for revenue envelope", "Revenue envelope rejects unrelated provider/model/partner budgets");
  assertIncludes(workflow, "Market pod is required for operating envelope", "Revenue envelope requires market pod scope");
  assertIncludes(workflow, "Commercial opportunity currency does not match revenue pipeline", "Revenue summary blocks mixed-currency minor units");
  assertIncludes(workflow, "Commercial offer is required for valued opportunity", "Valued opportunity requires commercial offer");
  assertIncludes(workflow, "Operating envelope version already exists with different terms", "Operating envelope versions are immutable");
  assertIncludes(workflow, "annotateOperatingEnvelope", "Expired operating envelopes read as held");
  assertIncludes(workflow, 'winLossReason: "Two-surface activation outcome recorded."', "Two-surface activation closes opportunity as won");
  assertIncludes(workflow, "return db.runTransaction", "Revenue workflow uses transactional integrity guards");
  assertIncludes(workflow, 'throw new Error("SignalDesk provider send is disabled")', "Workflow blocks real send");
  assertIncludes(workflow, "unsupportedClaims?.length", "Approval review blocks unsupported draft claims");
  assertIncludes(workflow, "assertSourcePolicyUsable", "Workflow centralizes source policy active/expiry guard");
  assertIncludes(workflow, "appendSourcePolicyBlockedAudit", "Workflow audits source policy blocks");
  assertIncludes(workflow, "SIGNALDESK_RESEARCH_SOURCE_POLICY_SCAN_FAILED", "Workflow has research source-policy scan diagnostic code");
  assertIncludes(workflow, "logRuntimeFailure(SIGNALDESK_RESEARCH_SOURCE_POLICY_SCAN_FAILED", "Workflow logs bounded research source-policy scan diagnostics");
  assertIncludes(workflow, "candidatePolicyCount: snap.docs.length", "Workflow logs bounded source-policy candidate count");
  assertIncludes(workflow, "rejectedPolicyCount", "Workflow tracks rejected provider policy candidates");
  assertIncludes(workflow, "isSourcePolicyExpired", "Workflow checks source policy expiry");
  assertIncludes(workflow, "getSourcePolicyState", "Workflow computes source policy UI state");
  assertIncludes(workflow, "expiresAt: timestampFromIsoOrDefault(input.expiresAt, input.retentionDays)", "Source policy creation sets expiry");
  assertIncludes(workflow, 'if (!isSenderDomainReady(await readReadySenderDomain(db))) throw new Error("Sender domain is not ready")', "Email export requires sender readiness");
  assertIncludes(actions, '"SignalDesk Operating Layer is disabled"', "Actions route exposes operating-layer safe error");
  assertIncludes(actions, '"Content asset is not ready"', "Actions route exposes content asset readiness safe error");

  assertIncludes(webhookRoute, "checkRateLimit", "Webhook route rate limit");
  assertIncludes(webhookRoute, "const ipHash = hashPublicRateLimitValue(getClientIp(request));", "Webhook route hashes public IP key material");
  assertIncludes(webhookRoute, "key: `signaldesk:webhook:${provider}:${ipHash}`", "Webhook route stores hashed IP rate-limit key material");
  assertIncludes(webhookRoute, "const SIGNALDESK_WEBHOOK_MAX_BODY_BYTES = 256 * 1024;", "Webhook route body cap");
  assertIncludes(webhookRoute, "readBoundedTextBody(request, SIGNALDESK_WEBHOOK_MAX_BODY_BYTES", "Webhook route bounded raw body");
  assertIncludes(webhookRoute, 'SIGNALDESK_WEBHOOK_REJECTED_REASON = "webhook_rejected"', "Webhook route uses stable rejection reason");
  assertIncludes(webhookRoute, "error: SIGNALDESK_WEBHOOK_REJECTED_REASON", "Webhook route logs stable rejection reason");
  assertIncludes(webhookRoute, "processSignalDeskProviderWebhook", "Webhook route processing");
  assertIncludes(webhookRoute, "verifySignalDeskWebhookChallenge", "Webhook challenge verification");
  assertNotIncludes(webhookRoute, "request.text()", "Webhook route direct raw body parser");
  assertNotIncludes(webhookRoute, 'key: `signaldesk:webhook:${provider}:${request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"}`', "Webhook route does not store raw request IP in rate-limit keys");
  assertNotIncludes(webhookRoute, 'error: error instanceof Error ? error.message : "Webhook failed"', "Webhook route does not log raw exception messages");
  assertIncludes(webhookServer, "Invalid SignalDesk webhook signature", "Webhook signature failure");
  assertIncludes(webhookServer, "SIGNALDESK_WEBHOOK_BODY_PARSE_FAILED", "Webhook server parse failure code");
  assertIncludes(webhookServer, "SIGNALDESK_WEBHOOK_BODY_SHAPE_INVALID", "Webhook server body-shape failure code");
  assertIncludes(webhookServer, "SIGNALDESK_WEBHOOK_EVENT_SHAPE_INVALID", "Webhook server event-shape failure code");
  assertIncludes(webhookServer, "parseSignalDeskWebhookPayload", "Webhook server central body parser");
  assertIncludes(webhookServer, "requireProviderEvent", "Webhook server requires provider event signal");
  assertIncludes(webhookServer, "fallbackWebhookExternalId", "Webhook server uses deterministic fallback event IDs");
  assertIncludes(webhookServer, "logRuntimeFailure(SIGNALDESK_WEBHOOK_BODY_PARSE_FAILED", "Webhook server parse diagnostics");
  assertIncludes(webhookServer, "logRuntimeFailure(SIGNALDESK_WEBHOOK_BODY_SHAPE_INVALID", "Webhook server body-shape diagnostics");
  assertIncludes(webhookServer, "logRuntimeFailure(SIGNALDESK_WEBHOOK_EVENT_SHAPE_INVALID", "Webhook server event-shape diagnostics");
  assertIncludes(webhookServer, "isRecord(parsed)", "Webhook server requires object-shaped body");
  assertNotIncludes(webhookServer, 'JSON.parse(params.rawBody || "{}")', "Webhook server does not accept empty body as default JSON object");
  assertNotIncludes(webhookServer, "randomUUID", "Webhook server does not create non-deterministic event IDs");
  assertIncludes(webhookServer, "const db = getSignalDeskDb();", "Webhook gets DB after signature verification block");
  assertIncludes(webhookServer, "existingEventSnap.exists", "Webhook duplicate event guard");
  assertIncludes(webhookServer, 'status: "duplicate"', "Webhook duplicate event status");

  assertIncludes(workflow, 'SIGNALDESK_PROVIDER_BUDGET_BLOCKED_REASON = "provider_budget_blocked"', "SignalDesk provider budget blocks use stable reason");
  assertIncludes(workflow, "blockedReasons.push(`${provider}: ${SIGNALDESK_PROVIDER_BUDGET_BLOCKED_REASON}`)", "SignalDesk waterfall block summaries avoid raw provider errors");
  assertIncludes(workflow, 'SIGNALDESK_RESEARCH_AGENT_BLOCKED_REASON = "research_agent_blocked"', "SignalDesk research-agent block audit uses stable reason");
  assertIncludes(workflow, 'appendAudit(db, blockBatch, access, "research_agent_blocked", "researchRun", researchRunId, SIGNALDESK_RESEARCH_AGENT_BLOCKED_REASON)', "SignalDesk research-agent block audit avoids raw exception text");
  assertNotIncludes(workflow, 'blockedReasons.push(`${provider}: ${error instanceof Error ? error.message : "Provider blocked"}`)', "SignalDesk waterfall block summaries do not persist raw provider errors");
  assertNotIncludes(workflow, 'appendAudit(db, blockBatch, access, "research_agent_blocked", "researchRun", researchRunId, error instanceof Error ? error.message : "blocked")', "SignalDesk research-agent block audit does not persist raw exception text");
}

function verifyConnectorProviderAndInvestmentControls() {
  const actions = read("src/app/api/signaldesk/actions/route.ts");
  const types = read("src/types/signaldesk/index.ts");
  const workspace = read("src/components/signaldesk/SignalDeskWorkspace.tsx");
  const workflow = read("src/lib/signaldesk/workflowServer.ts");
  const features = read("src/config/features.ts");
  const integrations = read("src/constants/signaldesk/integrations.ts");
  const database = read("src/constants/signaldesk/database.ts");
  const firestoreRules = read("firestore-signaldesk.rules");
  const firestoreIndexes = read("firestore-signaldesk.indexes.json");
  const sourceProviders = read("src/lib/signaldesk/sourceProviders.ts");
  const providerAdapters = read("src/lib/signaldesk/providerAdapters.ts");
  const aiProvider = read("src/lib/signaldesk/aiProvider.ts");
  const e2eLocal = read("scripts/verification/e2e-signaldesk-local.js");

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
  assertIncludes(aiProvider, "SIGNALDESK_AI_RESPONSE_PARSE_FAILED", "SignalDesk AI provider parse failure code");
  assertIncludes(aiProvider, "SIGNALDESK_AI_RESPONSE_SHAPE_INVALID", "SignalDesk AI provider shape failure code");
  assertIncludes(aiProvider, "parseSignalDeskAiJsonResponse", "SignalDesk AI provider central JSON parser");
  assertIncludes(aiProvider, "logRuntimeFailure(SIGNALDESK_AI_RESPONSE_PARSE_FAILED", "SignalDesk AI provider parse diagnostics");
  assertIncludes(aiProvider, "logRuntimeFailure(SIGNALDESK_AI_RESPONSE_SHAPE_INVALID", "SignalDesk AI provider shape diagnostics");
  assertIncludes(aiProvider, "isRecord(parsed)", "SignalDesk AI provider requires object-shaped output");
  assertNotIncludes(aiProvider, "const parseJson = (text: string)", "SignalDesk AI provider does not use raw parser helper");
  assertNotIncludes(aiProvider, "return JSON.parse(objectMatch ? objectMatch[0] : cleaned)", "SignalDesk AI provider does not return raw JSON parse output");
  assertIncludes(sourceProviders, "SIGNALDESK_INTEGRATION_ENV.APIFY_SOURCE_ACTOR_ID", "Apify Actor ID is read from env constants");
  assertIncludes(sourceProviders, "SIGNALDESK_SOURCE_PROVIDER_JSON_MAX_BYTES", "SignalDesk source-provider JSON response cap");
  assertIncludes(sourceProviders, "SIGNALDESK_SOURCE_PROVIDER_RESPONSE_PARSE_FAILED", "SignalDesk source-provider parse failure code");
  assertIncludes(sourceProviders, "readSourceProviderJsonResponse", "SignalDesk source-provider parse helper");
  assertIncludes(sourceProviders, "logRuntimeFailure(SIGNALDESK_SOURCE_PROVIDER_RESPONSE_PARSE_FAILED", "SignalDesk source-provider parse diagnostics");
  assertIncludes(sourceProviders, "readJsonResponseWithLimit<T>(response, SIGNALDESK_SOURCE_PROVIDER_JSON_MAX_BYTES)", "SignalDesk source-provider JSON responses are bounded");
  assert((sourceProviders.match(/redirect: "manual",/g) || []).length >= 3, "SignalDesk source-provider fetches use manual redirect handling");
  assertNotIncludes(sourceProviders, "response.json().catch(() => null)", "SignalDesk source providers do not parse uncapped provider JSON");
  assertNotIncludes(sourceProviders, "readJsonResponseWithLimit<any>(response, SIGNALDESK_SOURCE_PROVIDER_JSON_MAX_BYTES).catch(() => null)", "SignalDesk source providers do not silently swallow bounded provider JSON parse failures");
  assertIncludes(features, "ENABLE_MENULIST_SIGNALDESK_FHRS_FHIS_SOURCE_PROVIDER", "FHRS/FHIS source-provider feature flag");
  assertIncludes(types, '"fhrs-fhis"', "FHRS/FHIS provider type");
  assertIncludes(sourceProviders, "runFhrsFhisSourceSearch", "FHRS/FHIS source provider adapter");
  assertIncludes(sourceProviders, '"x-api-version": "2"', "FHRS/FHIS source provider uses API v2 header");
  assertIncludes(sourceProviders, "No contact permission is inferred", "FHRS/FHIS provider preserves contact boundary");
  assertIncludes(workflow, 'provider: "fhrs-fhis"', "FHRS/FHIS provider account seed");
  assertIncludes(workflow, "FHRS/FHIS source provider is disabled", "FHRS/FHIS provider feature flag block");
  assertIncludes(workspace, 'value="fhrs-fhis"', "FHRS/FHIS provider exposed in private source run UI");
  assertIncludes(e2eLocal, "assertFhrsFhisSourceProvider", "FHRS/FHIS provider local E2E fixture");
  assertIncludes(features, "ENABLE_MENULIST_SIGNALDESK_RESEARCH_AGENT_TABLE", "Research Agent Table feature flag");
  assertIncludes(actions, '"create-research-agent-run"', "Research Agent Table action schema");
  assertIncludes(actions, "ResearchAgentRunSchema", "Research Agent Table payload validation");
  assertIncludes(database, 'RESEARCH_RUNS: "signaldeskResearchRuns"', "Research Agent run collection");
  assertIncludes(database, 'RESEARCH_TABLE_ROWS: "signaldeskResearchTableRows"', "Research Agent table row collection");
  assertIncludes(types, "SignalDeskResearchRunSummary", "Research Agent run type");
  assertIncludes(types, "SignalDeskResearchTableRowSummary", "Research Agent table row type");
  assertIncludes(workflow, "createSignalDeskResearchAgentRunServer", "Research Agent Table workflow");
  assertIncludes(workflow, "fitDecision", "Research Agent pass/fail/unsure scoring");
  assertIncludes(workspace, "Research Agent Table", "Research Agent Table UI");
  assertIncludes(workspace, "Today&apos;s Lead Batch", "Dashboard lead batch UI");
  assertIncludes(workspace, "Market Search", "Dashboard market search UI");
  assertIncludes(workspace, "Find Leads", "Dashboard find-leads action");
  assertIncludes(workspace, "MARKET_SEARCH_PRESETS", "Market search prompt presets");
  assertIncludes(workspace, "Indiranagar Bengaluru", "Market search supports approved Bengaluru area/location prompt");
  assertIncludes(workspace, "Public business research", "Manual research defaults to the evidence-only public-business policy");
  assertIncludes(workspace, "Candidate discovery and evidence review only", "Evidence-only source policy copy blocks contact use");
  assertIncludes(workspace, "Approve Zero-Spend Trust Test", "First trust-partner test defaults to zero external spend");
  assertIncludes(workspace, "setResearchMaxResults(25)", "Approved Bengaluru market search presets use the 25-row trial batch");
  assertIncludes(workspace, 'useState("Find cafes, dessert shops, and QSRs in Indiranagar and Koramangala Bengaluru with weak current-menu presence")', "Market search default prompt");
  assertIncludes(workspace, ".filter((row) => row.fitDecision !== \"fail\")", "Lead batch excludes failed research rows");
  assertIncludes(workspace, "suppressionStatus === \"clear\"", "Fallback lead batch excludes suppressed targets");
  assertIncludes(workspace, "LeadPlanBlock", "Lead batch has structured evidence/contact/share blocks");
  assertIncludes(workspace, "LeadActionControls", "Lead batch has one recommended next action control");
  assertIncludes(workspace, "leadCard", "Lead batch card layout");
  assertIncludes(workspace, "contactPlanForLead", "Lead batch contact path helper");
  assertIncludes(workspace, "sharePlanForLead", "Lead batch share message helper");
  assertIncludes(workspace, ".slice(0, 30)", "Lead batch is capped at 30 rows");
  assertIncludes(workspace, "setResearchMaxResults", "Market search max-results control");
  assertIncludes(actions, "max(30).default(10)", "Research/source provider action max is 30 rows");
  assertIncludes(sourceProviders, "Math.min(Math.max(value, 1), 30)", "Source providers clamp to 30 rows");
  assertIncludes(workflow, "Math.min(30", "Research workflow clamps to 30 rows");
  assertIncludes(providerAdapters, "const encodedEndpointId = encodeURIComponent(endpointId);", "SignalDesk Meta endpoint ID is encoded");
  assertIncludes(providerAdapters, "${encodedEndpointId}/messages", "SignalDesk Meta endpoint uses encoded path segment");
  assertIncludes(providerAdapters, "SIGNALDESK_META_RESPONSE_JSON_MAX_BYTES", "SignalDesk Meta response JSON cap");
  assertIncludes(providerAdapters, "SIGNALDESK_META_RESPONSE_PARSE_FAILED", "SignalDesk Meta response parse failure code");
  assertIncludes(providerAdapters, "readMetaProviderResponseJson", "SignalDesk Meta response parse helper");
  assertIncludes(providerAdapters, "logRuntimeFailure(SIGNALDESK_META_RESPONSE_PARSE_FAILED", "SignalDesk Meta response parse diagnostics");
  assertIncludes(providerAdapters, "readJsonResponseWithLimit<any>(response, SIGNALDESK_META_RESPONSE_JSON_MAX_BYTES)", "SignalDesk Meta response JSON is bounded");
  assertIncludes(providerAdapters, 'redirect: "manual",', "SignalDesk Meta provider-send fetch uses manual redirect handling");
  assertNotIncludes(providerAdapters, "response.json().catch(() => ({}))", "SignalDesk Meta adapter does not parse uncapped provider JSON");
  assertNotIncludes(providerAdapters, "readJsonResponseWithLimit<any>(response, SIGNALDESK_META_RESPONSE_JSON_MAX_BYTES).catch(() => ({}))", "SignalDesk Meta adapter does not silently swallow bounded provider JSON parse failures");
  assertIncludes(firestoreRules, "signaldeskResearchRuns", "Research Agent run rules");
  assertIncludes(firestoreRules, "signaldeskResearchTableRows", "Research Agent row rules");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskResearchRuns"', "Research Agent run indexes");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskResearchTableRows"', "Research Agent row indexes");
  assertIncludes(e2eLocal, "assertResearchAgentTable", "Research Agent local E2E fixture");
  assertIncludes(e2eLocal, "assertRevenueOperatingLayer", "Revenue operating layer local E2E fixture");
  assertIncludes(e2eLocal, "new Response(JSON.stringify", "Provider E2E mocks implement bounded Response contract");
  assertIncludes(e2eLocal, "Promise.all([", "Revenue E2E covers concurrent qualification");
  assertIncludes(e2eLocal, "Mixed-currency pipeline", "Revenue E2E covers currency aggregation boundary");
  assertIncludes(e2eLocal, "Revenue envelope with provider budget", "Revenue E2E covers incompatible budget scope");
  assertIncludes(e2eLocal, "Two-surface activation did not close the commercial opportunity", "Revenue E2E covers activation-driven close");

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
    "revenueAccounts",
    "commercialOpportunities",
    "commercialOffers",
    "operatingEnvelopes",
    "activationWatches",
    "revenueControlSummaries",
    "sourceQualitySnapshots",
    "researchRuns",
    "researchTableRows",
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
  assertIncludes(firestoreRules, "signaldeskResearchRuns", "SignalDesk research runs are readable through rules");
  assertIncludes(firestoreRules, "signaldeskResearchTableRows", "SignalDesk research table rows are readable through rules");
  assertIncludes(firestoreRules, "signaldeskTrustPartnerProfiles", "SignalDesk partner rail collections remain read-only");
  assertIncludes(firestoreRules, "signaldeskRevenueAccounts", "SignalDesk revenue accounts remain client read-only");
  assertIncludes(firestoreRules, "signaldeskCommercialOpportunities", "SignalDesk commercial opportunities remain client read-only");
  assertIncludes(firestoreRules, "signaldeskCommercialOffers", "SignalDesk commercial offers remain client read-only");
  assertIncludes(firestoreRules, "signaldeskOperatingEnvelopes", "SignalDesk operating envelopes remain client read-only");
  assertIncludes(firestoreRules, "signaldeskActivationWatches", "SignalDesk activation watches remain client read-only");
  assertIncludes(firestoreRules, "signaldeskRevenueControlSummaries", "SignalDesk revenue summaries remain client read-only");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskProviderSourceRetention"', "SignalDesk provider source retention index");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskContentDistributionDrafts"', "SignalDesk content draft indexes");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskContentPerformanceSummaries"', "SignalDesk content performance indexes");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskGrowthMissions"', "SignalDesk growth mission indexes");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskExperimentCards"', "SignalDesk experiment card indexes");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskSourceQualitySnapshots"', "SignalDesk source quality indexes");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskResearchRuns"', "SignalDesk research run indexes");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskResearchTableRows"', "SignalDesk research table row indexes");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskTrustPartnerMetrics"', "SignalDesk trust partner metrics index");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskRevenueAccounts"', "SignalDesk revenue account index");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskCommercialOpportunities"', "SignalDesk commercial opportunity indexes");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskOperatingEnvelopes"', "SignalDesk operating envelope index");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskActivationWatches"', "SignalDesk activation watch indexes");
  assertIncludes(firestoreIndexes, '"collectionGroup": "signaldeskOutcomeSummaries"', "SignalDesk outcome summary indexes");
  assertIncludes(firestoreIndexes, '{ "fieldPath": "targetId", "order": "ASCENDING" },\n        { "fieldPath": "updatedAt", "order": "DESCENDING" }', "SignalDesk latest target outcome index");
  assertIncludes(firestoreIndexes, '{ "fieldPath": "targetId", "order": "ASCENDING" },\n        { "fieldPath": "updatedAt", "order": "ASCENDING" }', "SignalDesk earliest target outcome index");
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
  assertIncludes(database, 'REVENUE_ACCOUNTS: "signaldeskRevenueAccounts"', "SignalDesk revenue account collection");
  assertIncludes(database, 'COMMERCIAL_OPPORTUNITIES: "signaldeskCommercialOpportunities"', "SignalDesk commercial opportunity collection");
  assertIncludes(database, 'COMMERCIAL_OFFERS: "signaldeskCommercialOffers"', "SignalDesk commercial offer collection");
  assertIncludes(database, 'OPERATING_ENVELOPES: "signaldeskOperatingEnvelopes"', "SignalDesk operating envelope collection");
  assertIncludes(database, 'ACTIVATION_WATCHES: "signaldeskActivationWatches"', "SignalDesk activation watch collection");
  assertIncludes(database, 'REVENUE_CONTROL_SUMMARIES: "signaldeskRevenueControlSummaries"', "SignalDesk revenue summary collection");
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
  const featureMap = read("__docs__/menulist-signaldesk/menulist-signaldesk_feature-map.md");
  const feedbackReview = read("__docs__/menulist-signaldesk/menulist-signaldesk_chatgpt-feedback-review-2026-06-24.md");
  const trustPartnerRail = read("__docs__/menulist-signaldesk/signaldesk-trust-partner-rail/README.md");
  const contentDistributionRail = read("__docs__/menulist-signaldesk/signaldesk-content-distribution-rail/README.md");
  const operatingLayer = read("__docs__/menulist-signaldesk/signaldesk-operating-layer/README.md");
  const revenueOperatingLayer = read("__docs__/menulist-signaldesk/signaldesk-revenue-operating-layer/README.md");
  const revenueSpec = read("__docs__/menulist-signaldesk/signaldesk-revenue-operating-layer/signaldesk-revenue-operating-layer_spec.md");
  const revenueFirebase = read("__docs__/menulist-signaldesk/signaldesk-revenue-operating-layer/signaldesk-revenue-operating-layer_firebase.md");

  assertIncludes(readme, "private growth control room", "SignalDesk README internal boundary");
  assertIncludes(readme, "observe, monitor, and approve", "SignalDesk README solo-owner posture");
  assertIncludes(readme, "| Product code | `SD` via `PRODUCT_IDS.SIGNALDESK` |", "SignalDesk README current product code");
  assertNotIncludes(readme, "Future product code", "SignalDesk README product code drift");
  assertIncludes(impl, "observe -> monitor -> approve -> pause or redirect", "SignalDesk implementation posture");
  assertIncludes(impl, '| Product code | `PRODUCT_IDS.SIGNALDESK = "SD"` is implemented.', "SignalDesk implementation current product code");
  assertIncludes(firebase, "Dedicated SignalDesk Firebase projects", "SignalDesk Firebase dedicated project posture");
  assertIncludes(validation, "No paid campaign automation was implemented.", "SignalDesk paid campaign skip");
  assertIncludes(validation, "No Firebase deployment completed.", "SignalDesk blocked deployment boundary");
  assertIncludes(validation, "Local emulator data-flow smoke now runs through `scripts/verification/smoke-signaldesk-workflow.js`", "SignalDesk local workflow smoke status");
  assertIncludes(validation, "`npm run verify:signaldesk`", "SignalDesk verifier documented");
  assertIncludes(featureMap, "operating-layer roadmap, not as SignalDesk launch certification", "SignalDesk feature-map launch certification boundary");
  assertIncludes(feedbackReview, "Do not treat it as SignalDesk launch certification.", "SignalDesk feedback-review launch certification boundary");
  assertNotIncludes(featureMap, "proof that SignalDesk is production-ready", "SignalDesk feature-map stale production-ready wording");
  assertNotIncludes(feedbackReview, "proof that SignalDesk is production-ready", "SignalDesk feedback-review stale production-ready wording");
  assertIncludes(trustPartnerRail, "Runtime implemented for internal testing", "Trust Partner Rail runtime status");
  assertIncludes(trustPartnerRail, "Broad consumer influencer tactics are not copied", "Trust Partner Rail rejects consumer influencer copying");
  assertIncludes(contentDistributionRail, "Runtime implemented for internal testing", "Content Distribution Rail runtime status");
  assertIncludes(contentDistributionRail, "No auto-publish", "Content Distribution Rail publish boundary");
  assertIncludes(operatingLayer, "Implementation slice approved", "Operating Layer doc status");
  assertIncludes(operatingLayer, "Daily Growth Mission", "Operating Layer Daily Growth Mission doc");
  assertIncludes(operatingLayer, "No provider send", "Operating Layer send boundary");
  assertIncludes(revenueOperatingLayer, "bounded commercial lifecycle", "Revenue layer scope");
  assertIncludes(revenueSpec, "MenuList remains authoritative", "Revenue layer MenuList truth boundary");
  assertIncludes(revenueSpec, "exception-only", "Revenue layer exception-only mode is documented");
  assertIncludes(revenueSpec, "held", "Revenue layer exception-only hold is documented");
  assertIncludes(revenueSpec, "Currency Rule", "Revenue layer currency integrity is documented");
  assertIncludes(revenueSpec, "active market pod is required", "Revenue layer required market pod is documented");
  assertIncludes(revenueFirebase, "all client writes are denied", "Revenue layer Firestore write boundary");
  assertIncludes(revenueFirebase, "use transactions", "Revenue layer transactional cost/integrity contract is documented");
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
