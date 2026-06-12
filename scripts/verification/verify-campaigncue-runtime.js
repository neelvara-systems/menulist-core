const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const checks = [];

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
  checks.push(message);
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} includes ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} does not include ${needle}`);
}

function verifyFeatureFlags() {
  const flags = read("src/config/features.ts");

  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_PUBLIC_SITE: true", "CampaignCue public site flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_APP_SHELL: true", "CampaignCue app shell flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_SOURCE_INTEGRATIONS: true", "CampaignCue source flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_GENERATION: true", "CampaignCue generation flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_ANALYTICS: true", "CampaignCue analytics flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_PUBLISHING: false", "CampaignCue publishing flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_BILLING: false", "CampaignCue billing flag");
}

function verifyApiRoutes() {
  const routeFiles = [
    "src/app/api/campaigncue/workspace/route.ts",
    "src/app/api/campaigncue/campaigns/route.ts",
    "src/app/api/campaigncue/campaigns/[campaignId]/actions/route.ts",
    "src/app/api/campaigncue/assets/route.ts",
    "src/app/api/campaigncue/analytics/route.ts",
    "src/app/api/campaigncue/sources/route.ts",
    "src/app/api/campaigncue/integrations/route.ts",
    "src/app/api/campaigncue/locations/route.ts",
  ];

  for (const relPath of routeFiles) {
    const content = read(relPath);
    assertIncludes(content, "withAuth", relPath);
    assertIncludes(content, "requireCampaignCueRuntime", relPath);
    assertIncludes(content, "requireCampaignCueSessionScope", relPath);
    assertIncludes(content, "applyCampaignCueRateLimit", relPath);
    assertIncludes(content, "buildCampaignCueApiError", relPath);
  }

  assertIncludes(read("src/app/api/campaigncue/workspace/route.ts"), "CampaignCueBusinessPatchSchema", "workspace PATCH validation");
  assertIncludes(read("src/app/api/campaigncue/campaigns/route.ts"), "CampaignCueCreateCampaignSchema", "campaign create validation");
  assertIncludes(read("src/app/api/campaigncue/campaigns/[campaignId]/actions/route.ts"), "CampaignCueCampaignActionSchema", "campaign action validation");
  assertIncludes(read("src/app/api/campaigncue/campaigns/[campaignId]/actions/route.ts"), "CampaignCueIdSchema", "campaign id validation");
  assertIncludes(read("src/app/api/campaigncue/assets/route.ts"), "CampaignCueAssetSchema", "asset validation");
  assertIncludes(read("src/app/api/campaigncue/sources/route.ts"), "CampaignCueSourceInputSchema", "source input validation");
  assertNotIncludes(read("src/app/api/campaigncue/integrations/route.ts"), "export const POST", "CampaignCue integrations route is read-only in export runtime");
  assertIncludes(read("src/app/api/campaigncue/locations/route.ts"), "CampaignCueLocationSchema", "location validation");
  assertIncludes(read("src/app/api/campaigncue/campaigns/route.ts"), "listCampaignCueCampaignsServer", "campaign list direct bounded loader");
  assertIncludes(read("src/app/api/campaigncue/assets/route.ts"), "listCampaignCueAssetsServer", "asset list direct bounded loader");
  assertIncludes(read("src/app/api/campaigncue/sources/route.ts"), "listCampaignCueSourceInputsServer", "source list direct bounded loader");
  assertIncludes(read("src/app/api/campaigncue/integrations/route.ts"), "listCampaignCueProviderConnectionsServer", "integration posture direct bounded loader");
  assertIncludes(read("src/app/api/campaigncue/locations/route.ts"), "listCampaignCueLocationsServer", "location list direct bounded loader");
  assertIncludes(read("src/app/api/campaigncue/analytics/route.ts"), "readCampaignCueAnalyticsServer", "analytics summary direct loader");
}

function verifyServerRuntime() {
  const server = read("src/lib/campaigncue/server.ts");
  const errors = read("src/constants/campaigncue/errors.ts");
  const blockedActionStart = server.indexOf("if (actionError) {");
  const blockedActionEnd = server.indexOf("const now = nowTimestamp();", blockedActionStart);
  assert(blockedActionStart > -1 && blockedActionEnd > blockedActionStart, "CampaignCue blocked action branch is discoverable");
  const blockedActionBlock = server.slice(blockedActionStart, blockedActionEnd);

  assertIncludes(server, "campaigncueFirestoreAdmin as firestoreAdmin", "CampaignCue server dedicated Firestore Admin");
  assertIncludes(server, "firestoreAdmin as menuListFirestoreAdmin", "CampaignCue server MenuList source-read Admin");
  assertIncludes(server, "menuListFirestoreAdmin.collection(DB_COLLECTIONS.STORES)", "CampaignCue source bootstrap reads MenuList store profile");
  assertNotIncludes(server, "Promise.all([ref.get(), readStoreData(scope)])", "CampaignCue workspace load avoids repeat MenuList source reads");
  assertIncludes(server, "firestoreAdmin.collection(CAMPAIGNCUE_COLLECTIONS.WORKSPACES)", "CampaignCue workspace writes use dedicated Admin");
  assertIncludes(server, "CAMPAIGNCUE_PAGE_SIZE", "CampaignCue server bounded list limit");
  assertIncludes(server, "CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS", "CampaignCue server idempotency collection");
  assertIncludes(server, "await ref.create", "CampaignCue server atomic idempotency claim");
  assertIncludes(server, "CAMPAIGNCUE_ERROR_CODES.IDEMPOTENCY_CONFLICT", "CampaignCue server idempotency conflict response");
  assertIncludes(server, "FieldValue.increment", "CampaignCue analytics summary atomic increments");
  assertIncludes(server, "ensureCampaignCueWorkspaceOnlyServer", "CampaignCue server workspace-only cost path");
  assertIncludes(server, "readCampaignCueAnalyticsServer", "CampaignCue server analytics summary-only read path");
  assertIncludes(server, "buildSourceFacts", "CampaignCue server derives source facts");
  assertIncludes(server, "missingFacts", "CampaignCue source snapshot tracks missing facts");
  assertIncludes(server, "outputFieldsForChannel", "CampaignCue server builds structured output fields");
  assertIncludes(server, "owner_outcome_recorded", "CampaignCue server records owner-reported outcomes");
  assertIncludes(server, "buildLaunchReadiness", "CampaignCue server exposes launch readiness");
  assertIncludes(server, "buildDeliveryPolicy", "CampaignCue server exposes export/download delivery policy");
  assertIncludes(server, "normalizeCampaignCueWorkspace", "CampaignCue server normalizes legacy workspace delivery settings");
  assertIncludes(server, "providerConnections: []", "CampaignCue overview avoids active provider connection reads");
  assertIncludes(server, "readsPerLoad: 8", "CampaignCue overview read cost excludes provider connection collection");
  assertIncludes(server, "const updated: CampaignCueCampaign", "CampaignCue action response avoids post-write campaign reread");
  assertIncludes(server, "responseError: actionError", "CampaignCue blocked actions complete idempotency with replayable error");
  assertNotIncludes(blockedActionBlock, "updateDashboardSummary", "CampaignCue blocked export actions do not increment analytics counters");
  assertIncludes(server, "CAMPAIGNCUE_COLLECTIONS.SOURCE_INPUTS", "CampaignCue server source input collection");
  assertIncludes(server, "CAMPAIGNCUE_COLLECTIONS.LOCATIONS", "CampaignCue server location collection");
  assertIncludes(server, "createCampaignCueSourceInputServer", "CampaignCue source input mutation");
  assertNotIncludes(server, "recordCampaignCueIntegrationServer", "CampaignCue server has no day-one integration mutation");
  assertIncludes(server, "createCampaignCueLocationServer", "CampaignCue location mutation");
  assertIncludes(server, "export_action_blocked", "CampaignCue trust-blocked export action event");
  assertIncludes(server, "manual_export_used", "CampaignCue manual export used event");
  assertIncludes(errors, "CAMPAIGNCUE_FIREBASE_UNAVAILABLE", "CampaignCue Firebase setup error code");
  assertIncludes(server, "status: 503", "CampaignCue Firebase setup HTTP status");
  assertIncludes(errors, "CAMPAIGNCUE_RUNTIME_ERROR", "CampaignCue generic runtime error code");
}

function verifyClientRuntime() {
  const app = read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx");
  const styles = read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.module.scss");
  const schemas = read("src/lib/validation/campaigncueSchemas.ts");
  const delivery = read("src/constants/campaigncue/delivery.ts");
  const workspaceConstants = read("src/constants/campaigncue/workspace.ts");
  const navigationConstants = read("src/constants/campaigncue/navigations.ts");
  const appAndConstants = `${app}\n${workspaceConstants}\n${navigationConstants}`;

  assertIncludes(app, "credentials: \"include\"", "CampaignCue workspace fetch includes credentials");
  assertIncludes(app, "cache: \"no-store\"", "CampaignCue workspace fetch avoids stale auth data");
  assertIncludes(app, "updateOverview(", "CampaignCue mutation responses merge into local overview");
  assertNotIncludes(app, "await load();", "CampaignCue successful mutations avoid full overview reloads");
  assertIncludes(app, "state.status === 401", "CampaignCue signed-out state");
  assertIncludes(app, "CAMPAIGNCUE_ERROR_CODES.FIREBASE_UNAVAILABLE", "CampaignCue setup-blocked client mapping");
  [
    "What to do first",
    "Business details",
    "Offers, events, and notes",
    "Export and download",
    "Owner settings",
    "Campaign ideas",
    "Campaign packs",
    "Creative outputs",
    "Reel briefs",
    "Creator scripts",
    "WhatsApp drafts",
    "Google local drafts",
    "Ad handoffs",
    "Can this be used?",
    "Posting reminders",
    "Photos and files",
    "Usage summary",
    "Approvals and handoff",
    "Multi-location Center",
    "Plan and access",
  ].forEach((label) => assertIncludes(appAndConstants, label, `CampaignCue screen ${label}`));
  ["Start", "Campaigns", "Channels", "Operations"].forEach((label) => (
    assertIncludes(navigationConstants, label, `CampaignCue navigation group ${label}`)
  ));
  assertIncludes(app, "CAMPAIGNCUE_API_ROUTES.SOURCES", "CampaignCue source UI API call");
  assertNotIncludes(app, "CAMPAIGNCUE_API_ROUTES.INTEGRATIONS", "CampaignCue owner UI has no day-one integration mutation call");
  assertIncludes(app, "CAMPAIGNCUE_API_ROUTES.LOCATIONS", "CampaignCue locations UI API call");
  assertIncludes(app, "getCampaignCueCampaignActionApiPath", "CampaignCue campaign action API path helper");
  assertIncludes(app, "No owner action is needed", "CampaignCue setup blocker uses owner-safe copy");
  assertIncludes(app, "Download pack", "CampaignCue owner can download full campaign pack");
  assertIncludes(app, "Delivery boundary", "CampaignCue settings explain export/download boundary");
  assertIncludes(app, "future provider layer off", "CampaignCue provider cards show future layer disabled");
  assertIncludes(app, "What CampaignCue can safely use", "CampaignCue home shows source facts");
  assertIncludes(app, "Manual handoff", "CampaignCue outputs show manual handoff steps");
  assertIncludes(app, "Record result", "CampaignCue owner can record manual outcomes");
  assertIncludes(app, "Valid until", "CampaignCue source inputs support expiry");
  assertIncludes(app, "Consent", "CampaignCue asset UI captures consent posture");
  assertNotIncludes(app, "Connect the CampaignCue Firebase project", "CampaignCue owner setup copy hides Firebase instructions");
  assertNotIncludes(app, "source confidence", "CampaignCue owner dashboard avoids internal source confidence wording");
  assertNotIncludes(app, "Deterministic generation", "CampaignCue settings avoid deterministic-generation jargon");
  assertNotIncludes(app, "Direct publish", "CampaignCue owner UI avoids direct publish as a normal action");
  assertIncludes(styles, "min-height: 44px", "CampaignCue mobile touch target floor");
  assertIncludes(styles, ".textarea", "CampaignCue owner input textarea style");
  assertIncludes(styles, ".toggleRow", "CampaignCue settings toggle style");
  assertIncludes(styles, ".stepGrid", "CampaignCue owner-first checklist grid");
  assertIncludes(styles, ".navGroupLabel", "CampaignCue grouped navigation styling");
  assertIncludes(styles, "@media (max-width: 640px)", "CampaignCue mobile responsive breakpoint");
  assertIncludes(schemas, "const optionalUrl", "CampaignCue optional URL fields can be blank");
  assertIncludes(schemas, "return trimmed ? trimmed : null", "CampaignCue blank URL normalization");
  assertIncludes(schemas, "CAMPAIGNCUE_EXPORT_ACTIONS", "CampaignCue schema uses delivery action constants");
  assertIncludes(delivery, "\"record_outcome\"", "CampaignCue delivery constants include outcome action");
  assertNotIncludes(schemas, "\"direct_publish\"", "CampaignCue action schema rejects direct publish");
  assertNotIncludes(schemas, "\"direct_send\"", "CampaignCue action schema rejects direct send");
  assertIncludes(schemas, "consentType", "CampaignCue schema validates asset consent type");
  assertIncludes(schemas, "expiresAt", "CampaignCue schema validates source expiry");
  assertIncludes(read("src/lib/campaigncue/server.ts"), "const patchOptionalUrl", "CampaignCue optional URL clearing helper");
  assertIncludes(read("src/lib/campaigncue/server.ts"), "writesPerCampaignCreate: 6", "CampaignCue campaign create write cost");
}

function verifyFirebaseBoundary() {
  const config = read("firebase-campaigncue.json");
  const firestoreRules = read("firestore-campaigncue.rules");
  const storageRules = read("storage-campaigncue.rules");
  const indexes = read("firestore-campaigncue.indexes.json");
  const admin = read("src/lib/firebase/campaigncueFirebaseAdmin.ts");
  const clientConfig = read("src/lib/firebase/campaigncueConfig.ts");

  assertIncludes(config, "firestore-campaigncue.rules", "CampaignCue Firebase config Firestore rules");
  assertIncludes(config, "storage-campaigncue.rules", "CampaignCue Firebase config Storage rules");
  assertIncludes(admin, "CAMPAIGNCUE_FIREBASE_APP_NAME", "CampaignCue Admin app name constant");
  assertIncludes(admin, "CAMPAIGNCUE_FIREBASE_CREDENTIAL_PREFIX", "CampaignCue Admin env prefix constant");
  assertIncludes(admin, "CAMPAIGNCUE_FIREBASE_ENV", "CampaignCue Admin env names constant");
  assertIncludes(clientConfig, "CAMPAIGNCUE_FIREBASE_MODE_ALIASES", "CampaignCue Firebase mode aliases constant");
  assertIncludes(clientConfig, "CAMPAIGNCUE_FIREBASE_PROJECT_ID_ENV_KEYS", "CampaignCue Firebase project env keys constant");
  assertIncludes(firestoreRules, "allow read, write: if false", "CampaignCue Firestore default deny");
  assertIncludes(firestoreRules, "allow write: if false", "CampaignCue Firestore server-only writes");
  assertIncludes(firestoreRules, "match /sourceInputs/{docId}", "CampaignCue source inputs rules");
  assertIncludes(firestoreRules, "match /idempotencyKeys/{docId}", "CampaignCue idempotency keys private");
  assertIncludes(storageRules, "allow read, write: if false", "CampaignCue Storage default deny");
  assertIncludes(storageRules, "request.resource.size <= 250 * 1024 * 1024", "CampaignCue Storage size cap");
  assertIncludes(storageRules, "isCampaignCueWorkspaceMember(workspaceId)", "CampaignCue Storage workspace scope");
  assertIncludes(indexes, "\"collectionGroup\": \"sourceInputs\"", "CampaignCue source inputs index");
  assertIncludes(indexes, "\"collectionGroup\": \"campaigns\"", "CampaignCue campaigns index");
  assertIncludes(indexes, "\"collectionGroup\": \"assets\"", "CampaignCue assets index");
  assertIncludes(indexes, "\"collectionGroup\": \"schedules\"", "CampaignCue schedules index");
  assertIncludes(indexes, "\"collectionGroup\": \"providerConnections\"", "CampaignCue provider connections index");
  assertIncludes(indexes, "\"collectionGroup\": \"locations\"", "CampaignCue locations index");
  assertIncludes(indexes, "\"collectionGroup\": \"events\"", "CampaignCue events index");
}

function verifyProductConstantSeparation() {
  const constantFiles = [
    "src/constants/campaigncue/index.ts",
    "src/constants/campaigncue/channels.ts",
    "src/constants/campaigncue/database.ts",
    "src/constants/campaigncue/delivery.ts",
    "src/constants/campaigncue/domains.ts",
    "src/constants/campaigncue/errors.ts",
    "src/constants/campaigncue/firebase.ts",
    "src/constants/campaigncue/navigations.ts",
    "src/constants/campaigncue/product.ts",
    "src/constants/campaigncue/routes.ts",
    "src/constants/campaigncue/website.ts",
    "src/constants/campaigncue/workspace.ts",
  ];
  constantFiles.forEach((relPath) => assert(exists(relPath), `${relPath} exists`));
  assert(!exists("src/constants/campaigncue.ts"), "CampaignCue flat constants file removed");

  const product = read("src/constants/campaigncue/product.ts");
  const database = read("src/constants/campaigncue/database.ts");
  const delivery = read("src/constants/campaigncue/delivery.ts");
  const domains = read("src/constants/campaigncue/domains.ts");
  const routes = read("src/constants/campaigncue/routes.ts");
  const firebase = read("src/constants/campaigncue/firebase.ts");
  const navigations = read("src/constants/campaigncue/navigations.ts");
  const workspace = read("src/constants/campaigncue/workspace.ts");
  const loader = read("src/components/organisms/loader/index.tsx");
  const productDomains = read("src/constants/productDomains.ts");
  const domainResolver = read("src/lib/multiTenant/domainResolver.ts");
  const urls = read("src/constants/urls.ts");

  assertIncludes(product, "CAMPAIGNCUE_PRODUCT_ID", "CampaignCue product id constant");
  assertIncludes(database, "CAMPAIGNCUE_COLLECTIONS", "CampaignCue collection constants");
  assertIncludes(database, "CAMPAIGNCUE_MAX_ASSET_SIZE_BYTES", "CampaignCue asset size constant");
  assertIncludes(delivery, "CAMPAIGNCUE_EXPORT_ACTIONS", "CampaignCue export action constants");
  assertIncludes(delivery, "CAMPAIGNCUE_DISABLED_PROVIDER_ACTIONS", "CampaignCue disabled provider action constants");
  assertIncludes(delivery, "CAMPAIGNCUE_FUTURE_PROVIDER_LAYER", "CampaignCue future provider layer constants");
  assertIncludes(domains, "isCampaignCueRuntimeRoute", "CampaignCue runtime route helper");
  assertIncludes(domains, "CAMPAIGNCUE_APP_INTERNAL_BASE_PATH", "CampaignCue app route-group base path constant");
  assertIncludes(domains, "CAMPAIGNCUE_APP_INTERNAL_WORKSPACE_PATH", "CampaignCue app workspace route-group path constant");
  assertIncludes(domains, "getCampaignCueWorkspaceRewritePath", "CampaignCue product-domain workspace rewrite helper");
  assertIncludes(routes, "CAMPAIGNCUE_API_ROUTES", "CampaignCue API route constants");
  assertIncludes(routes, "CAMPAIGN_ACTION_TEMPLATE", "CampaignCue action route template");
  assertIncludes(firebase, "CAMPAIGNCUE_FIREBASE_ENV", "CampaignCue Firebase env constants");
  assertIncludes(navigations, "CAMPAIGNCUE_WORKSPACE_TABS", "CampaignCue workspace navigation constants");
  assertIncludes(workspace, "CAMPAIGNCUE_CHANNEL_STUDIO_COPY", "CampaignCue workspace copy constants");
  assertIncludes(loader, "isCampaignCueRuntimeRoute", "CampaignCue loader uses product route helper");
  assertIncludes(productDomains, "CAMPAIGNCUE_SITE_INTERNAL_BASE_PATH", "Product domains use CampaignCue path constants");
  assertIncludes(productDomains, "pathname === product.devPathPrefix || pathname.startsWith(`${product.devPathPrefix}/`)", "Product dev prefixes require exact or slash-boundary match");
  assertIncludes(domainResolver, "CAMPAIGNCUE_LOCAL_DEV_PATH_PREFIX", "Domain resolver uses CampaignCue local prefix constant");
  assertIncludes(domainResolver, "campaigncue.ai", "Domain resolver comments include CampaignCue as active product domain");
  assertIncludes(urls, "Local: /__campaigncue", "URL architecture comments include CampaignCue local route");
  assertIncludes(urls, "QA: campaigncue.menulist.online", "URL architecture comments include CampaignCue preview domain");
  assertIncludes(urls, "Prod: campaigncue.ai", "URL architecture comments include CampaignCue production domain");
  assertIncludes(urls, "CAMPAIGNCUE_PRODUCT_ID", "URL constants reserve CampaignCue namespace");

  assertNotIncludes(read("src/lib/campaigncue/server.ts"), 'from "@constant/campaigncue";', "CampaignCue server avoids all-in barrel import");
  assertNotIncludes(read("src/lib/firebase/campaigncueFirebaseAdmin.ts"), 'const CAMPAIGNCUE_APP_NAME = "campaigncue-admin"', "CampaignCue Admin app name is not local literal");
  assertNotIncludes(read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx"), '"/api/campaigncue/sources"', "CampaignCue workspace avoids hardcoded source API path");
  assertNotIncludes(read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx"), '"/__campaigncue"', "CampaignCue workspace avoids hardcoded local public path");
}

function verifyRouteBoundary() {
  const middleware = read("src/middleware.ts");
  const productDomains = read("src/constants/productDomains.ts");
  const routingDoc = read("__docs__/url-routing-architecture/README.md");
  const boundaryDoc = read("__docs__/campaigncue/campaigncue-route-boundary.md");
  const nextConfig = read("next.config.js");

  assert(exists("src/app/sites/campaigncue/page.tsx"), "CampaignCue public site page exists under sites");
  assert(exists("src/app/sites/campaigncue/layout.tsx"), "CampaignCue public site layout exists under sites");
  assert(exists("src/app/(campaigncue)/layout.tsx"), "CampaignCue owner route-group layout exists");
  assert(exists("src/app/(campaigncue)/campaigncue/page.tsx"), "CampaignCue owner route-group base page exists");
  assert(exists("src/app/(campaigncue)/campaigncue/app/page.tsx"), "CampaignCue owner workspace page exists outside sites");
  assert(!exists("src/app/sites/campaigncue/app"), "CampaignCue owner app is not under public sites folder");
  assert(!exists("src/app/sites/campaigncue/app/page.tsx"), "CampaignCue old sites app page removed");

  assertIncludes(middleware, "getCampaignCueWorkspaceRewritePath(pathname)", "CampaignCue product-domain /app rewrite");
  assertIncludes(middleware, "productConfig.id === 'campaigncue'", "CampaignCue product-domain route special case");
  assertIncludes(middleware, "getCampaignCueWorkspaceRewritePath(strippedPath)", "CampaignCue local dev /__campaigncue/app rewrite");
  assertIncludes(productDomains, "Public product websites belong under src/app/sites/[productId]", "Product domain route-boundary comment");
  assertIncludes(routingDoc, "Product Site Vs Product App Routes", "Global routing doc product site/app boundary");
  assertIncludes(routingDoc, "`src/app/sites/[productId]` is public website only", "Global routing doc sites public-only rule");
  assertIncludes(boundaryDoc, "`src/app/sites/campaigncue` is public website only", "CampaignCue route-boundary public-only rule");
  assertIncludes(boundaryDoc, "src/app/(campaigncue)/campaigncue/app/page.tsx", "CampaignCue route-boundary owner app path");
  assertIncludes(nextConfig, "routes-manifest.json", "Next start routes manifest repair");
  assertIncludes(nextConfig, "app-path-routes-manifest.json", "Next start app route manifest input");
}

function verifyDocsAlignment() {
  const audit = read("__docs__/campaigncue/campaigncue-production-implementation-audit.md");
  const validation = read("__docs__/campaigncue/campaigncue-product/campaigncue-product_validation.md");
  const apiDoc = read("__docs__/campaigncue/api-boundaries/api-boundaries_impl.md");
  const readme = read("__docs__/campaigncue/README.md");
  const boundaryDoc = read("__docs__/campaigncue/campaigncue-route-boundary.md");
  const expansionDoc = read("__docs__/campaigncue/campaigncue-next-expansion-list.md");
  const deliveryDoc = read("__docs__/campaigncue/campaigncue-delivery-boundary.md");
  const changelog = read("__docs__/CHANGELOG.md");

  assertIncludes(audit, "CAMPAIGNCUE_FIREBASE_UNAVAILABLE", "CampaignCue audit setup-blocked code");
  assertIncludes(audit, "src/app/(campaigncue)/campaigncue/app", "CampaignCue audit owner route-group path");
  assertIncludes(validation, "CAMPAIGNCUE_FIREBASE_UNAVAILABLE", "CampaignCue validation setup-blocked code");
  assertIncludes(validation, "rewrites to `/campaigncue/app`", "CampaignCue validation workspace rewrite path");
  assertIncludes(apiDoc, "CAMPAIGNCUE_FIREBASE_UNAVAILABLE", "CampaignCue API doc setup-blocked code");
  assertIncludes(readme, "campaigncue-route-boundary.md", "CampaignCue README route-boundary link");
  assertIncludes(readme, "campaigncue-next-expansion-list.md", "CampaignCue README next expansion link");
  assertIncludes(readme, "campaigncue-delivery-boundary.md", "CampaignCue README delivery-boundary link");
  assertIncludes(expansionDoc, "Provider adapters behind capability checks", "CampaignCue next expansion provider gate");
  assertIncludes(deliveryDoc, "CampaignCue day-one delivery is export/download only", "CampaignCue delivery-boundary day-one rule");
  assertIncludes(deliveryDoc, "/api/campaigncue/integrations` is read-only", "CampaignCue delivery-boundary read-only integrations rule");
  assertIncludes(audit, "Main Gap Fix Pass", "CampaignCue audit documents main gap pass");
  assertIncludes(audit, "Delivery Boundary Pass", "CampaignCue audit documents delivery boundary pass");
  assertIncludes(changelog, "CampaignCue Main Gap Hardening", "CampaignCue changelog main gap entry");
  assertIncludes(changelog, "CampaignCue Export Delivery Boundary", "CampaignCue changelog delivery boundary entry");
  assertIncludes(boundaryDoc, "Do not add owner dashboard pages under `src/app/sites/campaigncue`", "CampaignCue route-boundary guardrail");
  assertIncludes(changelog, "CampaignCue Route Boundary Alignment", "CampaignCue changelog route-boundary entry");
  assertIncludes(changelog, "CampaignCue setup-blocked state added", "CampaignCue changelog setup-blocked entry");
}

function verifyRequiredFiles() {
  [
    "src/types/campaigncue.ts",
    "src/lib/validation/campaigncueSchemas.ts",
    "src/lib/campaigncue/apiGuards.ts",
    "src/lib/campaigncue/server.ts",
    "src/app/sites/campaigncue/page.tsx",
    "src/app/(campaigncue)/campaigncue/app/page.tsx",
    "src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx",
    "__docs__/campaigncue/campaigncue-delivery-boundary.md",
    "__docs__/campaigncue/campaigncue-production-implementation-audit.md",
  ].forEach((relPath) => assert(exists(relPath), `${relPath} exists`));
}

verifyRequiredFiles();
verifyProductConstantSeparation();
verifyRouteBoundary();
verifyFeatureFlags();
verifyApiRoutes();
verifyServerRuntime();
verifyClientRuntime();
verifyFirebaseBoundary();
verifyDocsAlignment();

console.log(`CampaignCue runtime verification passed (${checks.length} checks).`);
