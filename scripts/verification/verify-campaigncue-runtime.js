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

function assertOccurrenceCount(content, needle, expectedCount, label) {
  const count = content.split(needle).length - 1;
  assert(count === expectedCount, `${label} occurrence count is ${expectedCount}`);
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
  assertIncludes(flags, "ENABLE_SHARED_CREATIVE_EDITOR: true", "Shared creative editor flag");
  assertIncludes(flags, "ENABLE_SHARED_CREATIVE_EDITOR_INTERACTIVE_CANVAS: true", "Shared creative editor interactive canvas flag");
  assertIncludes(flags, "ENABLE_SHARED_CREATIVE_EDITOR_FABRIC_ADAPTER: true", "Shared creative editor Fabric adapter flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_CREATIVE_EDITOR: true", "CampaignCue creative editor adapter flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_DESIGN_CUE: true", "CampaignCue Design Cue deterministic surface flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_DESIGN_CUE_MODEL_ASSIST: false", "CampaignCue Design Cue model assist provider gate");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_RENDERED_ASSET_EXPORTS: true", "CampaignCue editor export registration flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_CUE_LAYERS: true", "CampaignCue CueLayers feature flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_CUE_LAYERS_UPLOAD: true", "CampaignCue CueLayers upload flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_CUE_LAYERS_GENERATED_SOURCE: false", "CampaignCue CueLayers generated-source provider gate");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_CUE_LAYERS_TEXT_EDITABLE: false", "CampaignCue CueLayers text-editable provider gate");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_CUE_LAYERS_VECTOR_EDITABLE: false", "CampaignCue CueLayers vector-editable provider gate");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_CUE_LAYERS_BACKGROUND_REPAIR: false", "CampaignCue CueLayers repair provider gate");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_CUE_LAYERS_REPAIR_WORKER: false", "CampaignCue CueLayers worker gate");
}

function verifyApiRoutes() {
  const routeFiles = [
    "src/app/api/campaigncue/workspace/route.ts",
    "src/app/api/campaigncue/campaigns/route.ts",
    "src/app/api/campaigncue/campaigns/[campaignId]/actions/route.ts",
    "src/app/api/campaigncue/assets/route.ts",
    "src/app/api/campaigncue/analytics/route.ts",
    "src/app/api/campaigncue/design-cue/turns/route.ts",
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
  const designCueRoute = read("src/app/api/campaigncue/design-cue/turns/route.ts");
  assertIncludes(designCueRoute, "CampaignCueDesignCueTurnSchema", "Design Cue model route input validation");
  assertIncludes(designCueRoute, "ENABLE_CAMPAIGNCUE_DESIGN_CUE_MODEL_ASSIST", "Design Cue model route provider gate");
  assertIncludes(designCueRoute, "feature: \"AI_OPERATION\"", "Design Cue model route AI rate limit");
  assertIncludes(designCueRoute, "programmatic_required", "Design Cue model route fails closed to deterministic path");
  assertIncludes(designCueRoute, "Invalid JSON", "Design Cue model route returns safe invalid JSON response");
  assertNotIncludes(read("src/app/api/campaigncue/integrations/route.ts"), "export const POST", "CampaignCue integrations route is read-only in export runtime");
  assertIncludes(read("src/app/api/campaigncue/locations/route.ts"), "CampaignCueLocationSchema", "location validation");
  assertIncludes(read("src/app/api/campaigncue/campaigns/route.ts"), "listCampaignCueCampaignsServer", "campaign list direct bounded loader");
  assertIncludes(read("src/app/api/campaigncue/assets/route.ts"), "listCampaignCueAssetsServer", "asset list direct bounded loader");
  assertIncludes(read("src/app/api/campaigncue/sources/route.ts"), "listCampaignCueSourceInputsServer", "source list direct bounded loader");
  assertIncludes(read("src/app/api/campaigncue/integrations/route.ts"), "listCampaignCueProviderConnectionsServer", "integration posture direct bounded loader");
  assertIncludes(read("src/app/api/campaigncue/locations/route.ts"), "listCampaignCueLocationsServer", "location list direct bounded loader");
  assertIncludes(read("src/app/api/campaigncue/analytics/route.ts"), "readCampaignCueAnalyticsServer", "analytics summary direct loader");

  const cueLayerRouteFiles = [
    "src/app/api/campaigncue/cue-layers/designs/route.ts",
    "src/app/api/campaigncue/cue-layers/uploads/route.ts",
    "src/app/api/campaigncue/cue-layers/jobs/[jobId]/route.ts",
    "src/app/api/campaigncue/cue-layers/designs/[designId]/boot/route.ts",
    "src/app/api/campaigncue/cue-layers/designs/[designId]/autosave/route.ts",
    "src/app/api/campaigncue/cue-layers/designs/[designId]/repair/route.ts",
    "src/app/api/campaigncue/cue-layers/designs/[designId]/exports/route.ts",
  ];
  for (const relPath of cueLayerRouteFiles) {
    const content = read(relPath);
    assertIncludes(content, "withAuth", relPath);
    assertIncludes(content, "requireCampaignCueRuntime", relPath);
    assertIncludes(content, "requireCampaignCueSessionScope", relPath);
    assertIncludes(content, "applyCampaignCueRateLimit", relPath);
    assertIncludes(content, "buildCampaignCueCueLayersApiError", relPath);
  }
  assertIncludes(read("src/app/api/campaigncue/cue-layers/uploads/route.ts"), "CampaignCueCueLayerUploadSchema", "CueLayers upload schema validation");
  assertIncludes(read("src/app/api/campaigncue/cue-layers/designs/[designId]/autosave/route.ts"), "CampaignCueCueLayerAutosaveSchema", "CueLayers autosave schema validation");
  assertIncludes(read("src/app/api/campaigncue/cue-layers/designs/[designId]/repair/route.ts"), "CampaignCueCueLayerRepairSchema", "CueLayers repair schema validation");
  assertIncludes(read("src/app/api/campaigncue/cue-layers/designs/[designId]/exports/route.ts"), "CampaignCueCueLayerExportSchema", "CueLayers export schema validation");
  const assetDownloadRoute = read("src/app/api/campaigncue/assets/[assetId]/download/route.ts");
  assertIncludes(assetDownloadRoute, "withAuth", "CampaignCue asset download route auth");
  assertIncludes(assetDownloadRoute, "requireCampaignCueRuntime", "CampaignCue asset download route runtime guard");
  assertIncludes(assetDownloadRoute, "requireCampaignCueSessionScope", "CampaignCue asset download route scope guard");
  assertIncludes(assetDownloadRoute, "applyCampaignCueRateLimit", "CampaignCue asset download route rate limit");
  assertIncludes(assetDownloadRoute, "createCampaignCueAssetDownloadServer", "CampaignCue asset download server handoff");
}

function verifyServerRuntime() {
  const server = read("src/lib/campaigncue/server.ts");
  const dailyDesk = read("src/lib/campaigncue/dailyDesk.ts");
  const decisionEngine = read("src/lib/campaigncue/decisionEngine.ts");
  const dailyDeskConstants = read("src/constants/campaigncue/dailyDesk.ts");
  const campaigncueTypes = read("src/types/campaigncue.ts");
  const errors = read("src/constants/campaigncue/errors.ts");
  const blockedActionStart = server.indexOf("if (actionError) {");
  const blockedActionEnd = server.indexOf("const now = nowTimestamp();", blockedActionStart);
  assert(blockedActionStart > -1 && blockedActionEnd > blockedActionStart, "CampaignCue blocked action branch is discoverable");
  const blockedActionBlock = server.slice(blockedActionStart, blockedActionEnd);
  const sourceInputSaveStart = server.indexOf("export async function createCampaignCueSourceInputServer");
  const sourceInputSaveEnd = server.indexOf("export async function createCampaignCueLocationServer", sourceInputSaveStart);
  assert(sourceInputSaveStart > -1 && sourceInputSaveEnd > sourceInputSaveStart, "CampaignCue source input save block is discoverable");
  const sourceInputSaveBlock = server.slice(sourceInputSaveStart, sourceInputSaveEnd);
  const businessPatchStart = server.indexOf("export async function patchCampaignCueBusinessServer");
  const businessPatchEnd = server.indexOf("export function buildCampaignCueAuthLaunchUrl", businessPatchStart);
  assert(businessPatchStart > -1 && businessPatchEnd > businessPatchStart, "CampaignCue business patch block is discoverable");
  const businessPatchBlock = server.slice(businessPatchStart, businessPatchEnd);
  const assetRegistrationStart = server.indexOf("export async function createCampaignCueAssetServer");
  const assetRegistrationEnd = server.indexOf("const isWorkspaceStoragePath", assetRegistrationStart);
  assert(assetRegistrationStart > -1 && assetRegistrationEnd > assetRegistrationStart, "CampaignCue asset registration block is discoverable");
  const assetRegistrationBlock = server.slice(assetRegistrationStart, assetRegistrationEnd);

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
  assertIncludes(server, "campaignCueBusinessHasCta", "CampaignCue server has shared CTA readiness helper");
  assertIncludes(server, "cue_local_visibility_refresh", "CampaignCue server exposes local visibility opportunity");
  assertIncludes(server, "cue_repeat_worked_before", "CampaignCue server recommends successful result patterns");
  assertIncludes(server, "cue_adjust_after_not_useful", "CampaignCue server recommends adjustment after poor result");
  assertIncludes(server, "handoffFields", "CampaignCue server creates structured manual handoff fields");
  assertIncludes(server, "owner_outcome_recorded", "CampaignCue server records owner-reported outcomes");
  assertIncludes(server, "resultSignalId", "CampaignCue server stores structured result memory signal");
  assertIncludes(server, "resultMemory", "CampaignCue server updates campaign result memory without extra reads");
  assertIncludes(server, "pack: {", "CampaignCue server persists compact campaign pack metadata");
  assertIncludes(server, "buildLaunchReadiness", "CampaignCue server exposes launch readiness");
  assertIncludes(server, "buildDeliveryPolicy", "CampaignCue server exposes export/download delivery policy");
  assertIncludes(server, "buildCampaignCueDailyDesk", "CampaignCue server returns Daily Campaign Desk from overview data");
  assertIncludes(server, "buildCampaignCueDecisions", "CampaignCue server stores selected deterministic campaign decision");
  assertIncludes(server, "listSubcollection<CampaignCueCampaign>", "CampaignCue create flow reads bounded campaign memory for scoring");
  assertIncludes(server, "decision: selectedDecision", "CampaignCue campaign pack stores selected decision object");
  assertIncludes(server, "recipeId: recipe.id", "CampaignCue campaign pack stores selected recipe id");
  assertIncludes(server, "CampaignCueDecisionGateError", "CampaignCue server blocks pack creation when missing-input gate is not ready");
  assertIncludes(errors, "CAMPAIGNCUE_DECISION_GATE", "CampaignCue decision gate has a dedicated API error code");
  assertIncludes(server, "selectedDecision.decisionStatus !== \"ready_to_prepare\"", "CampaignCue server requires ready decision before creating a pack");
  assertIncludes(server, "firstMissingInput?.ownerQuestion", "CampaignCue server returns owner-facing missing input reason");
  assertIncludes(server, "responseError: decisionGateMessage", "CampaignCue decision-gate rejection completes idempotency as replayable error");
  assertIncludes(server, "Daily Campaign Desk is computed from the same overview documents", "CampaignCue daily desk adds no overview read");
  assertIncludes(server, "normalizeCampaignCueWorkspace", "CampaignCue server normalizes legacy workspace delivery settings");
  assertIncludes(server, "providerConnections: []", "CampaignCue overview avoids active provider connection reads");
  assertIncludes(server, "readsPerLoad: 8", "CampaignCue overview read cost excludes provider connection collection");
  assertIncludes(server, "const updated: CampaignCueCampaign", "CampaignCue action response avoids post-write campaign reread");
  assertIncludes(server, "readSourceSnapshot", "CampaignCue source snapshot summary reader exists");
  assertIncludes(server, "buildSourceSnapshotFromExistingSnapshot", "CampaignCue source input save can merge into existing snapshot");
  assertIncludes(sourceInputSaveBlock, "readSourceSnapshot(workspaceId)", "CampaignCue source input save reads compact source snapshot");
  assertIncludes(sourceInputSaveBlock, "buildSourceSnapshotFromExistingSnapshot", "CampaignCue source input save merges source facts from snapshot");
  assertNotIncludes(sourceInputSaveBlock, "listSubcollection<CampaignCueSourceInput>", "CampaignCue source input save avoids source input collection scan");
  assertIncludes(businessPatchBlock, "readSourceSnapshot(workspaceId)", "CampaignCue business patch reads compact source snapshot");
  assertIncludes(businessPatchBlock, "buildSourceSnapshotFromExistingSnapshot", "CampaignCue business patch rebuilds facts from snapshot");
  assertNotIncludes(businessPatchBlock, "listSubcollection<CampaignCueSourceInput>", "CampaignCue business patch avoids source input collection scan");
  assertIncludes(server, "sourceSnapshot?: CampaignCueSourceSnapshot", "CampaignCue opportunity builder accepts compact source snapshot");
  assertIncludes(server, "enqueueDashboardSummaryIncrement", "CampaignCue summary increments can be batched with primary writes");
  assertIncludes(server, "enqueueIdempotencyCompletion", "CampaignCue idempotency completion can be batched with primary writes");
  assertIncludes(server, "enqueueEvent(blockedBatch", "CampaignCue blocked actions batch event and idempotency completion");
  assertNotIncludes(server, "await Promise.all([\n        updateDashboardSummary", "CampaignCue accepted actions avoid second summary commit");
  assertIncludes(assetRegistrationBlock, "const batch = firestoreAdmin.batch()", "CampaignCue asset registration batches asset and event writes");
  assertIncludes(assetRegistrationBlock, "action: \"asset_registered\"", "CampaignCue asset registration still records audit event");
  assertNotIncludes(assetRegistrationBlock, "await writeEvent({", "CampaignCue asset registration avoids a second Firestore event commit");
  assertIncludes(server, "responseError: actionError", "CampaignCue blocked actions complete idempotency with replayable error");
  assertIncludes(server, "CAMPAIGNCUE_TRUST_GATED_ACTIONS", "CampaignCue trust gate is scoped to public-use actions");
  assertIncludes(server, "campaign.trustGate === \"needs_fix\"", "CampaignCue trust gate treats needs-fix packs as blocked for public use");
  assertIncludes(server, "\"download\"", "CampaignCue trust gate blocks text downloads");
  assertIncludes(server, "\"export\"", "CampaignCue trust gate blocks campaign pack ZIP exports");
  assertIncludes(server, "\"mark_used\"", "CampaignCue trust gate blocks marking blocked packs as used");
  assertIncludes(server, "\"schedule\"", "CampaignCue trust gate blocks scheduling blocked packs");
  assertNotIncludes(server.slice(server.indexOf("CAMPAIGNCUE_TRUST_GATED_ACTIONS"), server.indexOf("function assertCampaignActionAllowed")), "\"request_approval\"", "CampaignCue trust gate does not block approval requests");
  assertNotIncludes(server.slice(server.indexOf("CAMPAIGNCUE_TRUST_GATED_ACTIONS"), server.indexOf("function assertCampaignActionAllowed")), "\"record_outcome\"", "CampaignCue trust gate does not block result recording");
  assertNotIncludes(blockedActionBlock, "updateDashboardSummary", "CampaignCue blocked export actions do not increment analytics counters");
  assertIncludes(server, "CAMPAIGNCUE_COLLECTIONS.SOURCE_INPUTS", "CampaignCue server source input collection");
  assertIncludes(server, "CAMPAIGNCUE_COLLECTIONS.LOCATIONS", "CampaignCue server location collection");
  assertIncludes(server, "createCampaignCueSourceInputServer", "CampaignCue source input mutation");
  assertIncludes(server, "createCampaignCueAssetDownloadServer", "CampaignCue asset download handoff");
  assertIncludes(server, "isWorkspaceStoragePath", "CampaignCue asset download is workspace-path scoped");
  assertIncludes(server, "getSignedUrl", "CampaignCue private Storage downloads use runtime signed URLs");
  assertNotIncludes(server, "recordCampaignCueIntegrationServer", "CampaignCue server has no day-one integration mutation");
  assertIncludes(server, "createCampaignCueLocationServer", "CampaignCue location mutation");
  assertIncludes(server, "export_action_blocked", "CampaignCue trust-blocked export action event");
  assertIncludes(server, "manual_export_used", "CampaignCue manual export used event");
  assertIncludes(errors, "CAMPAIGNCUE_FIREBASE_UNAVAILABLE", "CampaignCue Firebase setup error code");
  assertIncludes(server, "status: 503", "CampaignCue Firebase setup HTTP status");
  assertIncludes(errors, "CAMPAIGNCUE_RUNTIME_ERROR", "CampaignCue generic runtime error code");
  assertIncludes(dailyDesk, "buildCampaignCueDailyDesk", "CampaignCue Daily Desk shared builder exists");
  assertIncludes(dailyDesk, "buildCampaignCueDecisions", "CampaignCue Daily Desk uses deterministic Decision Engine");
  assertIncludes(dailyDesk, "candidateDecisions", "CampaignCue Daily Desk exposes ranked candidate decisions");
  assertIncludes(dailyDesk, "decision?.missingInputs", "CampaignCue Daily Desk converts decision missing inputs into owner cards");
  assertIncludes(dailyDesk, "buildMissingDailyDeskFacts", "CampaignCue Daily Desk missing input inbox is derived locally");
  assertIncludes(dailyDesk, "readyPack", "CampaignCue Daily Desk summarizes the ready campaign pack");
  assertIncludes(dailyDesk, "manualDeliveryTasks", "CampaignCue Daily Desk exposes manual delivery tasks");
  assertIncludes(dailyDesk, "buildManualDeliveryCard", "CampaignCue Daily Desk creates manual delivery cards");
  assertIncludes(dailyDesk, "buildLocalVisibilityCues", "CampaignCue Daily Desk creates local visibility cues");
  assertIncludes(dailyDesk, "packReview", "CampaignCue Daily Desk exposes first-class campaign pack review");
  assertIncludes(dailyDesk, "buildCampaignCueOutputPack", "CampaignCue Daily Desk builds canonical campaign output packs");
  assertIncludes(dailyDesk, "downloadBundle", "CampaignCue output pack exposes structured download bundle files");
  assertIncludes(dailyDesk, "miniPage", "CampaignCue output pack includes mini-page and QR brief contract");
  assertIncludes(dailyDesk, "emailSms", "CampaignCue output pack includes email and SMS copy blocks");
  assertIncludes(dailyDesk, "staff", "CampaignCue output pack includes staff sharing copy blocks");
  assertIncludes(dailyDesk, "buildLanguageHandoffNote", "CampaignCue output pack includes deterministic language handoff helper");
  assertIncludes(dailyDesk, "Local-language variants are a handoff item", "CampaignCue language handoff avoids auto-translation claims");
  assertIncludes(dailyDesk, "id: \"language_handoff\"", "CampaignCue output pack writes language handoff instruction block");
  assertIncludes(dailyDesk, "CampaignCue does not directly post, send WhatsApp messages, connect provider accounts, or start ad spend", "CampaignCue output pack preserves manual delivery boundary");
  assertIncludes(dailyDesk, "trustSummary", "CampaignCue Daily Desk summarizes trust checks for owners");
  assertIncludes(dailyDesk, "assetReuseTasks", "CampaignCue Daily Desk exposes asset reuse tasks");
  assertIncludes(dailyDesk, "resultOptions", "CampaignCue Daily Desk exposes one-tap result memory options");
  assertIncludes(dailyDesk, "photoTasks", "CampaignCue Daily Desk exposes owner photo tasks");
  assertIncludes(dailyDesk, "printTasks", "CampaignCue Daily Desk exposes print and in-store tasks");
  assertIncludes(dailyDeskConstants, "CAMPAIGNCUE_DAILY_DESK_RECIPES", "CampaignCue Daily Desk recipes live under product constants");
  assertIncludes(dailyDeskConstants, "restaurant_today_item_push", "CampaignCue Daily Desk includes restaurant recipe");
  assertIncludes(dailyDeskConstants, "salon_slot_fill", "CampaignCue Daily Desk includes salon recipe");
  assertIncludes(dailyDeskConstants, "retail_product_push", "CampaignCue Daily Desk includes retail recipe");
  assertIncludes(dailyDeskConstants, "local_service_reminder", "CampaignCue Daily Desk includes local service recipe");
  assertIncludes(dailyDeskConstants, "fitness_class_fill", "CampaignCue Daily Desk includes fitness recipe");
  assertIncludes(dailyDeskConstants, "clinic_appointment_reminder", "CampaignCue Daily Desk includes clinic recipe");
  assertIncludes(dailyDeskConstants, "generic_local_campaign", "CampaignCue Daily Desk includes generic local business recipe");
  assertIncludes(dailyDeskConstants, "restaurant_slow_lunch_push", "CampaignCue Daily Desk includes slow-period restaurant recipe");
  assertIncludes(dailyDeskConstants, "salon_weekend_slots", "CampaignCue Daily Desk includes slot-fill salon recipe");
  assertIncludes(dailyDeskConstants, "retail_new_arrival", "CampaignCue Daily Desk includes retail new-arrival recipe");
  assertIncludes(dailyDeskConstants, "asset_reuse_old_poster", "CampaignCue Daily Desk includes old-poster reuse recipe");
  assertIncludes(dailyDeskConstants, "google_local_visibility_refresh", "CampaignCue Daily Desk includes local visibility recipe");
  assertIncludes(decisionEngine, "buildCampaignCueDecisions", "CampaignCue deterministic Decision Engine builder exists");
  assertIncludes(decisionEngine, "finalScore", "CampaignCue Decision Engine computes ranked final score");
  assertIncludes(decisionEngine, "ownerEffortPenalty", "CampaignCue Decision Engine penalizes owner effort");
  assertIncludes(decisionEngine, "trustRiskPenalty", "CampaignCue Decision Engine penalizes trust risk");
  assertIncludes(decisionEngine, "resultMemoryBoost", "CampaignCue Decision Engine uses compact result memory");
  assertIncludes(decisionEngine, "factsUsed", "CampaignCue Decision Engine records facts used");
  assertIncludes(decisionEngine, "trustPreflight", "CampaignCue Decision Engine records trust preflight");
  assertIncludes(decisionEngine, "matchingRecipes.length ? matchingRecipes", "CampaignCue Decision Engine keeps a recipe fallback");
  assertNotIncludes(decisionEngine, "fetch(", "CampaignCue Decision Engine does not call providers");
  assertNotIncludes(decisionEngine, "firebase", "CampaignCue Decision Engine does not touch Firebase");
  assertNotIncludes(decisionEngine, "openai", "CampaignCue Decision Engine does not call AI provider");
  assertIncludes(campaigncueTypes, "CampaignCueDecision", "CampaignCue decision object type exists");
  assertIncludes(campaigncueTypes, "CampaignCueDecisionScore", "CampaignCue decision score type exists");
  assertIncludes(campaigncueTypes, "decision: CampaignCueDecision", "CampaignCue Daily Desk requires primary decision");
  assertIncludes(campaigncueTypes, "CampaignCueOutputPack", "CampaignCue output pack type exists");
  assertIncludes(campaigncueTypes, "CampaignCueOutputPackFile", "CampaignCue output pack file contract exists");
  assertIncludes(campaigncueTypes, "CampaignCueOutputPackCopyBlock", "CampaignCue output pack copy block contract exists");

  const cueLayersServer = read("src/lib/campaigncue/cue-layers/server.ts");
  const cueLayersProjection = read("src/lib/campaigncue/cue-layers/editorProjection.ts");
  const cueLayersStorage = read("src/lib/campaigncue/cue-layers/storagePaths.ts");
  const cueLayersModels = read("src/lib/campaigncue/cue-layers/modelRegistry.ts");
  const cueLayersSchemas = read("src/lib/validation/campaigncueCueLayersSchemas.ts");

  assertIncludes(cueLayersServer, "ensureCampaignCueWorkspaceServer", "CueLayers server validates workspace scope");
  assertIncludes(cueLayersServer, "CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_DESIGNS", "CueLayers server writes design collection");
  assertIncludes(cueLayersServer, "CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS", "CueLayers server uses idempotency keys");
  assertIncludes(cueLayersServer, "createCampaignCueCueLayerUploadServer", "CueLayers upload server entry");
  assertIncludes(cueLayersServer, "params.input.sourceKind !== \"user_upload\"", "CueLayers upload enforces generated-source gate");
  assertIncludes(cueLayersServer, "const replayJobId = boot.design.current.jobId", "CueLayers replay reads current job pointer");
  assertIncludes(cueLayersServer, ".doc(replayJobId)", "CueLayers replay uses direct job doc read when pointer exists");
  assertIncludes(cueLayersServer, "jobSnap.data() as CampaignCueCueLayerJob", "CueLayers replay hydrates pointed job directly");
  assertIncludes(cueLayersServer, "jobId,", "CueLayers design current stores latest job pointer");
  assertIncludes(cueLayersServer, "snapshots: sourceSnapshots", "CueLayers source package stores inline source truth snapshots");
  assertIncludes(cueLayersServer, "priceLabel: item.priceLabel", "CueLayers compact source snapshot preserves item price labels");
  assertIncludes(cueLayersServer, "priceLabel: service.priceLabel", "CueLayers compact source snapshot preserves service price labels");
  assertNotIncludes(cueLayersServer, "imageUrl: item.imageUrl", "CueLayers source snapshot avoids catalog image URL bloat");
  assertNotIncludes(cueLayersServer, "sourceRefs: item.sourceRefs", "CueLayers source snapshot avoids catalog source-ref bloat");
  assertIncludes(cueLayersServer, "layerIndexVersionId", "CueLayers autosave reuses unchanged layer-index artifact");
  assertNotIncludes(cueLayersServer, "CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_JOB_EVENTS", "CueLayers active v1 avoids job event collection writes");
  assertIncludes(cueLayersServer, "bootCampaignCueCueLayerDesignServer", "CueLayers boot server entry");
  assertIncludes(cueLayersServer, "autosaveCampaignCueCueLayerDesignServer", "CueLayers autosave server entry");
  assertIncludes(cueLayersServer, "await batch.commit();\n    return {\n        design:", "CueLayers autosave batches design pointer and version metadata writes");
  assertIncludes(cueLayersServer, "CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_REPAIR_REQUESTS", "CueLayers repair stores repair request metadata");
  assertNotIncludes(cueLayersServer, "CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_CORRECTION_EVENTS", "CueLayers active v1 avoids correction-event collection writes");
  assertIncludes(cueLayersServer, "exportCampaignCueCueLayerDesignServer", "CueLayers export server entry");
  assertIncludes(cueLayersServer, "params.input.sourceRevision !== design.current.revision", "CueLayers export rejects stale revisions");
  assertIncludes(cueLayersServer, "parseRenderedExportDataUrl", "CueLayers export validates rendered output bytes");
  assertIncludes(cueLayersServer, "path: exportOutputPath", "CueLayers export writes immutable output before asset registration");
  assertNotIncludes(cueLayersServer, "exportReportAsset", "CueLayers active v1 avoids duplicate export report artifacts");
  assertIncludes(cueLayersServer, "businessTruthSnapshot", "CueLayers snapshots business truth");
  assertIncludes(cueLayersServer, "protectedTextSnapshot", "CueLayers snapshots protected text truth");
  assertIncludes(cueLayersServer, "brandSnapshot", "CueLayers snapshots brand truth");
  assertIncludes(cueLayersServer, "rightsSnapshot", "CueLayers snapshots rights truth");
  assertIncludes(cueLayersServer, "getSignedUrl", "CueLayers hydrates signed URLs only at boot");
  assertIncludes(cueLayersServer, "url: await signedUrlForAsset(asset)", "CueLayers signed URL is runtime hydration only");
  assertNotIncludes(cueLayersProjection, "signedUrl", "CueLayers durable projection avoids signedUrl field naming");
  assertIncludes(cueLayersServer, "dehydrateDocumentAssets", "CueLayers dehydrates runtime URLs before persistence");
  assertIncludes(cueLayersServer, "collectLayerAssetIds", "CueLayers autosave validates image assets against layer index");
  assertIncludes(cueLayersServer, "existing design asset", "CueLayers rejects unknown cue asset references");
  assertIncludes(cueLayersProjection, "CreativeEditorDocumentSnapshot", "CueLayers projects into shared editor document snapshot");
  assertIncludes(cueLayersProjection, "editableLevel: \"locked_reference\"", "CueLayers safe flat reference layer");
  assertIncludes(cueLayersProjection, "params.editorReferenceAsset.assetUri", "CueLayers durable editor references use asset URIs");
  assertIncludes(cueLayersStorage, "/sources/${sourcePackageId}/", "CueLayers immutable source storage paths");
  assertIncludes(cueLayersStorage, "/reconstructions/${reconstructionId}/", "CueLayers immutable reconstruction storage paths");
  assertIncludes(cueLayersStorage, "/versions/${versionId}/", "CueLayers immutable editor version storage paths");
  assertIncludes(cueLayersStorage, "/exports/${exportId}/", "CueLayers immutable export storage paths");
  assertIncludes(cueLayersStorage, "storageGeneration", "CueLayers asset refs track Storage generation");
  assertIncludes(cueLayersModels, "CAMPAIGNCUE_CUE_LAYER_MODEL_REGISTRY", "CueLayers capability model registry");
  assertIncludes(cueLayersModels, "capability", "CueLayers model selection is capability-based");
  assertNotIncludes(cueLayersModels, "imagen", "CueLayers model registry avoids deprecated Imagen dependency");
  assertIncludes(cueLayersSchemas, "cue-asset://", "CueLayers schema accepts durable cue asset URI");
  assertIncludes(cueLayersSchemas, "/^(javascript|data):/i", "CueLayers schema blocks unsafe image URLs");
  assertIncludes(cueLayersSchemas, "MAX_FINAL_LAYERS", "CueLayers schema caps editor layer count");
  assertIncludes(cueLayersSchemas, ".strip()", "CueLayers schema strips unknown renderer properties");
  assertIncludes(cueLayersSchemas, "MAX_EDITOR_DOCUMENT_BYTES", "CueLayers schema caps editor document size");
  assertIncludes(cueLayersSchemas, "renderedDataUrl", "CueLayers export schema requires rendered bytes handoff");
  assertIncludes(cueLayersSchemas, "product-owned source reference", "CueLayers image schema requires product-owned asset reference");
  assertIncludes(cueLayersSchemas, '"900"', "CueLayers autosave accepts shared editor heavy font weight");
}

function verifyClientRuntime() {
  const app = read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx");
  const styles = read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.module.scss");
  const layout = read("src/app/(campaigncue)/layout.tsx");
  const enLocale = read("public/locales/menulist.ai/en-US.json");
  const hiLocale = read("public/locales/menulist.ai/hi-IN.json");
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
    "Daily campaign desk",
    "Business details",
    "Missing Input Inbox",
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
    "Search and profile readiness",
    "Multi-location Center",
    "Plan and access",
  ].forEach((label) => assertIncludes(appAndConstants, label, `CampaignCue screen ${label}`));
  ["Start", "Campaigns", "Channels", "Operations"].forEach((label) => (
    assertIncludes(navigationConstants, label, `CampaignCue navigation group ${label}`)
  ));
  assertIncludes(navigationConstants, "Offers, events, and notes", "CampaignCue navigation exposes owner input surface");
  assertIncludes(navigationConstants, "Visibility", "CampaignCue navigation exposes local visibility tab");
  assertIncludes(app, "CAMPAIGNCUE_API_ROUTES.SOURCES", "CampaignCue source UI API call");
  assertNotIncludes(app, "CAMPAIGNCUE_API_ROUTES.INTEGRATIONS", "CampaignCue owner UI has no day-one integration mutation call");
  assertIncludes(app, "CAMPAIGNCUE_API_ROUTES.LOCATIONS", "CampaignCue locations UI API call");
  assertIncludes(app, "getCampaignCueCampaignActionApiPath", "CampaignCue campaign action API path helper");
  assertIncludes(app, "useFormatter()", "CampaignCue workspace uses shared next-intl formatter");
  assertIncludes(app, "formatDateTime(value as DateLike", "CampaignCue owner dates use shared date/time formatter");
  assertIncludes(app, "fromNativeDateTimeInputValue(normalized", "CampaignCue source expiry converts native input through timezone-aware helper");
  assertIncludes(app, "parseDateTimeLocal(sourceDraft.expiresAt, businessDraft.timezone)", "CampaignCue source expiry converts local input with workspace timezone");
  assertIncludes(app, "value={sourceDraft.expiresAt}", "CampaignCue source expiry input keeps local datetime value");
  assertNotIncludes(app, "new Date(event.target.value).toISOString()", "CampaignCue source expiry input avoids timezone drift while typing");
  assertNotIncludes(app, ".toLocaleDateString()", "CampaignCue workspace avoids browser-default date display");
  assertNotIncludes(app, ".toLocaleTimeString()", "CampaignCue workspace avoids browser-default time display");
  assertNotIncludes(app, ".toLocaleString()", "CampaignCue workspace avoids browser-default date/time display");
  assertIncludes(schemas, "timeZoneSchema", "CampaignCue workspace timezone validation schema");
  assertIncludes(schemas, "Intl.DateTimeFormat(\"en-US\", { timeZone: value })", "CampaignCue timezone validation uses Intl");
  assertIncludes(app, "No owner action is needed", "CampaignCue setup blocker uses owner-safe copy");
  assertIncludes(app, "Download campaign pack ZIP", "CampaignCue owner can download full campaign pack ZIP");
  assertIncludes(app, "buildCampaignPackZipBlob", "CampaignCue owner export builds the ZIP before recording export");
  assertIncludes(app, "downloadCampaignPackZip", "CampaignCue owner export exposes a ZIP download helper");
  assertIncludes(app, "downloadBlob(exportZip.filename, exportZip.blob)", "CampaignCue export downloads ZIP only after protected action succeeds");
  assertIncludes(app, "campaign-pack.json", "CampaignCue ZIP includes machine-readable output pack contract");
  assertIncludes(app, "campaign-pack-summary.md", "CampaignCue ZIP keeps readable campaign summary");
  assertIncludes(app, "campaignBlocksPublicUse", "CampaignCue UI disables public-use actions for blocked or needs-fix campaigns");
  assertIncludes(app, "publicUseBlockedLabel", "CampaignCue UI explains blocked public-use actions");
  assertIncludes(app, "campaignCreationBlockedReason", "CampaignCue UI blocks pack creation when decision needs owner input");
  assertIncludes(app, "decision.decisionStatus === \"ready_to_prepare\"", "CampaignCue UI only enables pack creation for ready decisions");
  assertIncludes(app, "primaryCreateBlockedReason", "CampaignCue primary action surfaces missing input gate");
  assertIncludes(app, "OutputPackSummary", "CampaignCue owner UI summarizes output pack contents before download");
  assertIncludes(app, "Mini-page and QR brief", "CampaignCue owner UI exposes mini-page/QR brief status");
  assertIncludes(app, "Delivery boundary", "CampaignCue settings explain export/download boundary");
  assertIncludes(app, "future provider layer off", "CampaignCue provider cards show future layer disabled");
  assertIncludes(app, "What CampaignCue can safely use", "CampaignCue home shows source facts");
  assertIncludes(app, "Manual handoff", "CampaignCue outputs show manual handoff steps");
  assertIncludes(app, "Missing input inbox", "CampaignCue owner home surfaces missing input inbox");
  assertIncludes(app, "Why this recommendation", "CampaignCue owner home explains deterministic recommendation");
  assertIncludes(app, "CampaignCue decides from facts, recipes, readiness, and memory", "CampaignCue owner home rejects AI-oracle positioning");
  assertIncludes(app, "DecisionEvidenceCard", "CampaignCue owner UI renders decision evidence card");
  assertIncludes(app, "decision.score.finalScore", "CampaignCue owner UI shows decision score");
  assertIncludes(app, "dailyDesk.candidateDecisions", "CampaignCue ideas UI exposes ranked candidate decisions");
  assertIncludes(app, "Decision confidence", "CampaignCue pack export includes decision confidence");
  assertIncludes(app, "## Why this recommendation", "CampaignCue pack export includes decision explanation");
  assertIncludes(app, "Manual delivery cards", "CampaignCue owner delivery surface exposes manual delivery cards");
  assertIncludes(app, "Use this campaign", "CampaignCue owner delivery surface frames manual usage");
  assertIncludes(app, "Local visibility", "CampaignCue owner home exposes local visibility cues");
  assertIncludes(app, "copyHandoffValue", "CampaignCue manual handoff supports browser-local copy only");
  assertIncludes(app, "selectedOutcomeSignalId", "CampaignCue result memory tracks selected owner signal");
  assertIncludes(app, "resultSignalId", "CampaignCue record-result action sends structured result signal");
  assertIncludes(app, "Record result", "CampaignCue owner can record manual outcomes");
  assertIncludes(app, "Valid until", "CampaignCue source inputs support expiry");
  assertIncludes(app, "Consent", "CampaignCue asset UI captures consent posture");
  assertIncludes(app, "CreativeEditor", "CampaignCue uses shared creative editor component");
  assertIncludes(app, "buildCampaignCueBlankCreativeDocument", "CampaignCue blank editor adapter");
  assertIncludes(app, "buildCampaignCueOutputCreativeDocument", "CampaignCue output editor adapter");
  assertIncludes(app, "buildCampaignCueCreativeAssetSources", "CampaignCue editor asset source adapter");
  assertIncludes(app, 'productLabel="CampaignCue"', "CampaignCue editor keeps full CampaignCue chrome label");
  assertIncludes(app, "sourceLabel={editorSourceLabel}", "CampaignCue editor receives product source label");
  assertIncludes(app, "CAMPAIGNCUE_DESIGN_CUE_COMMANDS", "CampaignCue editor passes Design Cue command constants");
  assertIncludes(app, "runCampaignCueDesignCue", "CampaignCue editor uses deterministic Design Cue resolver");
  assertIncludes(app, "applyCampaignCueDesignCuePatchSet", "CampaignCue editor applies validated Design Cue patches");
  assertIncludes(app, "onDesignCueRequest={creativeEditorDesignCueEnabled ? runDesignCueRequest : undefined}", "CampaignCue editor gates Design Cue request handler");
  assertIncludes(app, "onDesignCueApply={creativeEditorDesignCueEnabled ? applyDesignCueRequest : undefined}", "CampaignCue editor gates Design Cue apply handler");
  assertIncludes(app, "registerEditorExport", "CampaignCue editor export callback");
  assertIncludes(app, "Campaign pack editor", "CampaignCue editor tab screen");
  assertIncludes(app, "Campaign Pack Editor Mode", "CampaignCue editor keeps campaign-pack context visible");
  assertIncludes(app, "Protected business text", "CampaignCue editor surfaces protected facts");
  assertIncludes(app, "One design, many outputs", "CampaignCue editor surfaces multi-output pack context");
  assertIncludes(app, "Manual delivery", "CampaignCue editor surfaces manual delivery context");
  assertIncludes(app, "Mobile review", "CampaignCue editor keeps mobile to review/download scope");
  assertIncludes(app, "buildCampaignOutputEditorContext", "CampaignCue editor context derives from campaign output");
  assertIncludes(app, "buildCueLayersEditorContext", "CampaignCue editor context derives from CueLayers boot package");
  assertIncludes(app, "headerActions={editorHeaderActions}", "CampaignCue editor adds product-owned header actions without changing shared editor");
  assertIncludes(app, "Create from scratch", "CampaignCue blank editor entry");
  assertIncludes(app, "Open editor", "CampaignCue campaign output editor entry");
  assertIncludes(app, "Reuse old image", "CampaignCue CueLayers upload entry");
  assertIncludes(app, "loadCueLayerDesigns", "CampaignCue CueLayers bounded design loader");
  assertIncludes(app, "saveCueLayerDocumentNow", "CampaignCue CueLayers autosave flow");
  assertIncludes(app, "repairCueLayerFallback", "CampaignCue CueLayers fallback repair action");
  assertIncludes(app, "getCampaignCueCueLayersExportApiPath", "CampaignCue CueLayers export API path helper");
  assertIncludes(app, "allowRasterImports={!activeCueLayerDesign}", "CampaignCue CueLayers disables unsafe raster imports in shared editor");
  assertIncludes(app, 'disabledExportFormats={activeCueLayerDesign ? ["svg", "json"] : []}', "CampaignCue CueLayers disables unsafe browser exports in shared editor");
  assertIncludes(app, "saveCueLayerDocumentNow(result.document)", "CampaignCue CueLayers saves exact export document before export registration");
  assertIncludes(app, "sourceRevision: savedRevision ?? activeCueLayerRevision", "CampaignCue CueLayers export pins to saved revision");
  assertIncludes(app, "renderedDataUrl: result.dataUrl", "CampaignCue CueLayers sends rendered export bytes");
  assertIncludes(app, "getCampaignCueAssetDownloadApiPath", "CampaignCue Asset Library uses scoped download API");
  assertIncludes(app, "asset-download:${asset.id}", "CampaignCue Asset Library has bounded asset download action");
  assertIncludes(app, "withFreshDailyDesk", "CampaignCue owner UI recomputes Daily Desk after local mutations");
  assertIncludes(app, "DashboardSidebarShell", "CampaignCue owner UI uses shared dashboard sidebar shell");
  assertIncludes(app, "DashboardHeaderShell", "CampaignCue owner UI uses shared dashboard header shell");
  assertIncludes(app, "AppSettingsPanel", "CampaignCue owner UI mounts shared app settings panel");
  assertIncludes(app, "ProfileActionsModal", "CampaignCue owner UI uses shared profile menu");
  assertIncludes(app, "toggleDarkMode", "CampaignCue owner UI shares MenuList dark/light theme state");
  assertIncludes(app, "toggleAppSettingsPanel", "CampaignCue owner UI opens shared settings drawer");
  assertIncludes(app, "getRTLDirectionState", "CampaignCue owner UI consumes shared RTL direction state");
  assertIncludes(app, "dir={isRTLDirection ? \"rtl\" : \"ltr\"}", "CampaignCue owner UI applies shared RTL direction to the dashboard frame");
  assertIncludes(app, "useTranslations(\"CampaignCue.Navigation\")", "CampaignCue owner UI translates dashboard chrome with shared i18n");
  assertIncludes(app, "tChrome(`tabs.${item.key}` as any)", "CampaignCue sidebar tab labels use translations");
  assertIncludes(enLocale, "\"CampaignCue\"", "CampaignCue English locale namespace");
  assertIncludes(enLocale, "\"Daily desk\"", "CampaignCue English chrome locale labels");
  assertIncludes(hiLocale, "\"CampaignCue\"", "CampaignCue Hindi locale namespace");
  assertIncludes(hiLocale, "\"डेली डेस्क\"", "CampaignCue Hindi chrome locale labels");
  assertOccurrenceCount(app, "dailyDesk.summary.blockerCount ? \"Needs detail\"", 1, "CampaignCue Daily Desk readiness chip");
  assertIncludes(app, "Daily campaign desk", "CampaignCue owner home starts on Daily Campaign Desk");
  assertIncludes(app, "Finish today&apos;s campaign path", "CampaignCue owner home shows the daily cue workflow");
  assertIncludes(app, "Campaign pack", "CampaignCue owner home shows multi-format campaign pack workflow");
  assertIncludes(app, "Assets and reuse", "CampaignCue owner home shows reusable-asset workflow");
  assertIncludes(app, "manualDeliveryTasks", "CampaignCue owner home shows manual delivery tasks");
  assertIncludes(app, "resultOptions", "CampaignCue owner home shows quick result-memory options");
  assertIncludes(app, "matchingReadyPack", "CampaignCue pack export only includes ready-pack fields for the matching campaign");
  assertIncludes(app, "buildCampaignPackExport(campaign, dailyDesk)", "CampaignCue pack ZIP includes owner desk context");
  assertIncludes(app, "onDocumentChange={setEditorDraftDocument}", "CampaignCue CueLayers editor change tracking");
  assertIncludes(app, "Use PNG export for reused images", "CampaignCue CueLayers server-export fallback guard");
  assertNotIncludes(app, 'chromeMode="embedded"', "CampaignCue editor does not use embedded print-assets chrome");
  assertNotIncludes(app, "onTemplateSave", "CampaignCue editor does not use MenuList template-save callback");
  assertNotIncludes(app, "templateSaveLabel", "CampaignCue editor does not expose MenuList save-template label");
  assertNotIncludes(app, "MenuList Assets", "CampaignCue editor does not use print-assets product label");
  assertNotIncludes(app, "Print assets", "CampaignCue editor does not use print-assets source label");
  assertNotIncludes(app, "storeAssetTemplates", "CampaignCue editor does not read MenuList store template indexes");
  assertNotIncludes(app, "Connect the CampaignCue Firebase project", "CampaignCue owner setup copy hides Firebase instructions");
  assertNotIncludes(app, "source confidence", "CampaignCue owner dashboard avoids internal source confidence wording");
  assertNotIncludes(app, "Deterministic generation", "CampaignCue settings avoid deterministic-generation jargon");
  assertNotIncludes(app, "Direct publish", "CampaignCue owner UI avoids direct publish as a normal action");
  assertIncludes(styles, "min-height: 44px", "CampaignCue mobile touch target floor");
  assertIncludes(styles, ".textarea", "CampaignCue owner input textarea style");
  assertIncludes(styles, ".toggleRow", "CampaignCue settings toggle style");
  assertIncludes(styles, ".stepGrid", "CampaignCue owner-first checklist grid");
  assertIncludes(styles, ".handoffField", "CampaignCue manual delivery card field styling");
  assertIncludes(styles, ".dashboardFrame", "CampaignCue shared dashboard frame styling");
  assertIncludes(styles, ".dashboardBody", "CampaignCue shared dashboard body offset styling");
  assertIncludes(styles, ".sidebarBrandMark", "CampaignCue product mark in shared sidebar");
  assertNotIncludes(styles, ".navGroupLabel", "CampaignCue no longer keeps stale private sidebar group styling");
  assertIncludes(styles, "var(--cc-bg", "CampaignCue workspace styles consume shared theme variables");
  assertIncludes(layout, "LocalisationProvider", "CampaignCue protected layout uses shared localization provider");
  assertIncludes(layout, "ReduxStoreProvider", "CampaignCue protected layout uses shared Redux theme persistence");
  assertIncludes(layout, "NextAuthSessionProvider", "CampaignCue protected layout uses same NextAuth session provider");
  assertIncludes(layout, "AntdThemeProvider", "CampaignCue protected layout uses shared Ant Design theme provider");
  assertIncludes(layout, "SessionExpiryMonitor", "CampaignCue protected layout uses shared session expiry monitor");
  assertIncludes(layout, "GlobalKeyboardShortcutsProvider", "CampaignCue protected layout uses shared keyboard shortcut provider");
  assertIncludes(layout, "NetworkStatusProvider", "CampaignCue protected layout uses shared network status provider");
  assertIncludes(layout, "isPlatformEntityBlocked", "CampaignCue protected layout blocks platform-blocked accounts");
  assertNotIncludes(layout, "@providers/sessionProvider", "CampaignCue shell avoids MenuList store/subscription bootstrap reads");
  assertIncludes(styles, "@media (max-width: 640px)", "CampaignCue mobile responsive breakpoint");
  assertIncludes(schemas, "const optionalUrl", "CampaignCue optional URL fields can be blank");
  assertIncludes(schemas, "return trimmed ? trimmed : null", "CampaignCue blank URL normalization");
  assertIncludes(schemas, "CAMPAIGNCUE_EXPORT_ACTIONS", "CampaignCue schema uses delivery action constants");
  assertIncludes(delivery, "\"record_outcome\"", "CampaignCue delivery constants include outcome action");
  assertNotIncludes(delivery, "\"copy\"", "CampaignCue active delivery constants exclude clipboard-copy action");
  assertNotIncludes(schemas, "\"direct_publish\"", "CampaignCue action schema rejects direct publish");
  assertNotIncludes(schemas, "\"direct_send\"", "CampaignCue action schema rejects direct send");
  assertIncludes(schemas, "consentType", "CampaignCue schema validates asset consent type");
  assertIncludes(schemas, "expiresAt", "CampaignCue schema validates source expiry");
  assertIncludes(schemas, "resultSignalId", "CampaignCue schema validates structured result memory signal");
  assertIncludes(read("src/lib/campaigncue/server.ts"), "const patchOptionalUrl", "CampaignCue optional URL clearing helper");
  assertIncludes(read("src/lib/campaigncue/server.ts"), "writesPerCampaignCreate: 6", "CampaignCue campaign create write cost");

  const designCueConstants = read("src/constants/campaigncue/designCue.ts");
  const designCueContext = read("src/lib/campaigncue/design-cue/context.ts");
  const designCueIntent = read("src/lib/campaigncue/design-cue/intent.ts");
  const designCuePatches = read("src/lib/campaigncue/design-cue/patches.ts");
  const designCueApply = read("src/lib/campaigncue/design-cue/apply.ts");
  const designCueValidate = read("src/lib/campaigncue/design-cue/validate.ts");
  assertIncludes(designCueConstants, "CAMPAIGNCUE_DESIGN_CUE_COMMANDS", "Design Cue command constants");
  assertIncludes(designCueConstants, "Add contact line", "Design Cue owner-facing contact command avoids WhatsApp-only wording");
  assertIncludes(designCueConstants, "Ready for WhatsApp", "Design Cue has WhatsApp readiness command");
  assertIncludes(designCueConstants, "Ready for Google", "Design Cue has Google readiness command");
  assertIncludes(designCueConstants, "Ready for print", "Design Cue has print readiness command");
  assertIncludes(designCueContext, "hasLocality", "Design Cue context tracks confirmed locality");
  assertIncludes(designCueContext, "hasContactLine", "Design Cue context tracks confirmed contact");
  assertIncludes(designCueIntent, "resolveFreeTextAction", "Design Cue deterministic free-text resolver");
  assertIncludes(designCueIntent, "buildCampaignCueDesignCueUnsupportedPatch", "Design Cue unknown requests fail closed");
  assertIncludes(designCuePatches, "missing-location", "Design Cue missing location creates review finding");
  assertIncludes(designCuePatches, "missing-contact", "Design Cue missing contact creates review finding");
  assertIncludes(designCuePatches, "buildCampaignCueDesignCueChannelReadyPatch", "Design Cue channel readiness checks are deterministic findings");
  assertIncludes(designCueApply, "validateCampaignCueDesignCuePatchSet", "Design Cue apply validates before mutation");
  assertIncludes(designCueApply, "buildCreativeEditorTextElement", "Design Cue added text remains editable");
  assertIncludes(designCueValidate, "CAMPAIGNCUE_DESIGN_CUE_ALLOWED_LAYER_PATCH_KEYS", "Design Cue patch allowlist enforced");
  assertIncludes(designCueValidate, "UNSAFE_TEXT_PATTERN", "Design Cue rejects unsafe script/url text");
  assertIncludes(designCueValidate, "outside the allowed canvas range", "Design Cue bounds generated geometry patches");
  assertIncludes(designCueValidate, "allowedCanvasPresets", "Design Cue validates canvas preset allowlist at runtime");
  assertIncludes(designCueValidate, "allowedTextPlacements", "Design Cue validates add-text placement allowlist at runtime");
  assertIncludes(designCueValidate, "validatePatchValue(\"name\", operation.name)", "Design Cue validates add-text layer names at runtime");
  assertIncludes(designCueValidate, "Layer patch is empty", "Design Cue rejects empty layer patches");
  assertIncludes(designCueValidate, "Font weight is not supported", "Design Cue validates font weight allowlist");
  assertNotIncludes(designCueIntent, "fetch(", "Design Cue deterministic resolver has no provider call");
  assertNotIncludes(designCueApply, "firebase", "Design Cue apply layer has no Firebase write");
}

function verifySharedCreativeEditor() {
  const requiredFiles = [
    "__docs__/shared-creative-editor/README.md",
    "__docs__/shared-creative-editor/shared-creative-editor_spec.md",
    "__docs__/shared-creative-editor/shared-creative-editor_impl.md",
    "__docs__/shared-creative-editor/shared-creative-editor_marketing.md",
    "__docs__/shared-creative-editor/shared-creative-editor_website.md",
    "__docs__/shared-creative-editor/shared-creative-editor_helpdoc.md",
    "__docs__/shared-creative-editor/shared-creative-editor_firebase.md",
    "__docs__/shared-creative-editor/shared-creative-editor_mobile-support.md",
    "__docs__/shared-creative-editor/shared-creative-editor_test-cases.md",
    "__docs__/shared-creative-editor/shared-creative-editor_validation.md",
    "src/app/(internal)/creative-editor-smoke/page.tsx",
    "src/modules/creative-editor/types.ts",
    "src/modules/creative-editor/templates.ts",
    "src/modules/creative-editor/export.ts",
    "src/modules/creative-editor/fabricAdapter.ts",
    "src/modules/creative-editor/CreativeEditor.tsx",
    "src/modules/creative-editor/DesignCuePanel.tsx",
    "src/modules/creative-editor/CreativeEditor.module.scss",
    "src/modules/creative-editor/textTemplates.json",
    "src/modules/creative-editor/index.ts",
    "src/modules/creative-editor/providers/campaigncue.ts",
  ];
  requiredFiles.forEach((relPath) => assert(exists(relPath), `${relPath} exists`));

  const types = read("src/modules/creative-editor/types.ts");
  const editor = read("src/modules/creative-editor/CreativeEditor.tsx");
  const designCuePanel = read("src/modules/creative-editor/DesignCuePanel.tsx");
  const editorStyles = read("src/modules/creative-editor/CreativeEditor.module.scss");
  const textTemplates = read("src/modules/creative-editor/textTemplates.json");
  const exporter = read("src/modules/creative-editor/export.ts");
  const fabricAdapter = read("src/modules/creative-editor/fabricAdapter.ts");
  const smokeRoute = read("src/app/(internal)/creative-editor-smoke/page.tsx");
  const templates = read("src/modules/creative-editor/templates.ts");
  const campaigncueProvider = read("src/modules/creative-editor/providers/campaigncue.ts");
  const sharedReadme = read("__docs__/shared-creative-editor/README.md");
  const sharedSpec = read("__docs__/shared-creative-editor/shared-creative-editor_spec.md");
  const sharedImpl = read("__docs__/shared-creative-editor/shared-creative-editor_impl.md");
  const sharedTests = read("__docs__/shared-creative-editor/shared-creative-editor_test-cases.md");
  const sharedValidation = read("__docs__/shared-creative-editor/shared-creative-editor_validation.md");
  const sharedHelpdoc = read("__docs__/shared-creative-editor/shared-creative-editor_helpdoc.md");
  const campaigncueReadme = read("__docs__/campaigncue/README.md");

  assertIncludes(types, "CreativeEditorDocument", "Shared editor neutral document type");
  assertIncludes(types, "CreativeEditorProductContext", "Shared editor product context type");
  assertIncludes(types, "\"line\"", "Shared editor line element type");
  assertIncludes(types, "\"pathText\"", "Shared editor path-text element type");
  assertIncludes(types, "\"triangle\"", "Shared editor triangle element type");
  assertIncludes(types, "\"polygon\"", "Shared editor polygon element type");
  assertIncludes(types, "\"path\"", "Shared editor path element type");
  assertIncludes(types, "blur?: number", "Shared editor blur property");
  assertIncludes(types, "CreativeEditorVisibleWatermark", "Shared editor visible watermark schema");
  assertIncludes(types, "CreativeEditorLineArrowStyle", "Shared editor line arrow schema");
  assertIncludes(types, "CreativeEditorDesignCuePatchSet", "Shared editor neutral Design Cue patch-set type");
  assertIncludes(types, "CreativeEditorDesignCueHandler", "Shared editor neutral Design Cue request handler type");
  assertIncludes(types, "CreativeEditorDesignCueApplyHandler", "Shared editor neutral Design Cue apply handler type");
  assertIncludes(types, "CreativeEditorPage", "Shared editor optional page schema");
  assertIncludes(types, "activePageId", "Shared editor active page pointer");
  assertIncludes(types, "CreativeEditorTextPlaceholder", "Shared editor text placeholder schema");
  assertIncludes(types, "accentColor", "Shared editor brand accent color schema");
  assertIncludes(fabricAdapter, "loadDocumentIntoFabricCanvas", "Shared editor Fabric document loader");
  assertIncludes(fabricAdapter, "serializeFabricCanvasToDocument", "Shared editor Fabric document serializer");
  assertIncludes(fabricAdapter, "buildVisibleWatermarkObjects", "Shared editor visible watermark renderer");
  assertIncludes(fabricAdapter, "buildOutlinedImageSrc", "Shared editor image outline renderer");
  assertIncludes(fabricAdapter, "hasControls: !locked", "Shared editor locked layers hide Fabric resize handles");
  assertIncludes(fabricAdapter, "selectable: true", "Shared editor locked layers stay selectable for unlock");
  assertIncludes(fabricAdapter, "object.selectable = true", "Shared editor reloaded locked layers stay selectable for unlock");
  assertIncludes(fabricAdapter, "RemoveColor", "Shared editor RemoveColor image filter support");
  assertIncludes(fabricAdapter, "Gamma", "Shared editor Gamma image filter support");
  assertIncludes(fabricAdapter, "src.startsWith(\"data:\") || src.startsWith(\"blob:\")", "Shared editor loads local data/blob sticker images without anonymous CORS");
  assertIncludes(fabricAdapter, "initFabricDragging", "Shared editor Fabric grab and wheel controls");
  assertIncludes(fabricAdapter, "initFabricAlignmentGuidelines", "Shared editor Fabric snap guidelines");
  assertIncludes(smokeRoute, "process.env.NODE_ENV === \"production\"", "Shared editor smoke route is production blocked");
  assertIncludes(smokeRoute, "notFound()", "Shared editor smoke route returns 404 in production");
  assertIncludes(smokeRoute, "width: 620", "Shared editor smoke route covers legacy width");
  assertIncludes(smokeRoute, "height: 427", "Shared editor smoke route covers legacy height");
  assertIncludes(editor, "LuLayers", "Shared editor layer UI icon");
  assertIncludes(editor, "buildCreativeEditorQrElement", "Shared editor QR tool");
  assertIncludes(editor, "buildCreativeEditorTriangleElement", "Shared editor triangle tool");
  assertIncludes(editor, "buildCreativeEditorLineElement", "Shared editor line tool");
  assertIncludes(editor, "buildCreativeEditorArrowElement", "Shared editor arrow tool");
  assertIncludes(editor, "buildCreativeEditorPathTextElement", "Shared editor path text tool");
  assertIncludes(editor, "buildCreativeEditorHexagonElement", "Shared editor hexagon tool");
  assertIncludes(editor, "buildCreativeEditorStarElement", "Shared editor star tool");
  assertIncludes(editor, "finishPolygonDraft", "Shared editor interactive polygon drawing");
  assertIncludes(editor, "distributeSelection", "Shared editor multi-select distribution");
  assertIncludes(editor, "copyBase64ToClipboard", "Shared editor base64 clipboard export");
  assertIncludes(editor, "copyPngToClipboard", "Shared editor PNG clipboard export");
  assertIncludes(editor, "replaceSelectedImageFile", "Shared editor replace-image action");
  assertIncludes(editor, "Upload image file", "Shared editor Images drawer exposes local raster upload");
  assertIncludes(editor, "PROJECT_STYLE_PRESETS", "Shared editor Vista-style project style presets");
  assertIncludes(editor, "applyProjectStyle", "Shared editor applies browser-local project styles");
  assertIncludes(editor, "shuffleProjectStyle", "Shared editor supports project style shuffle");
  assertIncludes(editor, "CraftStylesIcon", "Shared editor rail exposes Styles tab");
  assertIncludes(editor, "Download", "Shared editor top toolbar exposes primary download action");
  assertIncludes(editor, "RASTER_IMAGE_MIME_TYPES", "Shared editor raster file MIME allowlist");
  assertIncludes(editor, "RASTER_IMAGE_URL_PATTERN", "Shared editor owner image URL extension allowlist");
  assertIncludes(editor, "normalizeOwnerImageUrl", "Shared editor owner image URL guard");
  assertIncludes(editor, "Use a direct PNG, JPG, WebP, GIF, or approved Asset Library image URL.", "Shared editor rejects unsafe owner image URLs");
  assertIncludes(editor, "Use Replace image file or the Images panel to change this source safely.", "Shared editor selected image source is read-only guidance");
  assertIncludes(editor, "disabledExportFormats", "Shared editor supports product-owned export policy");
  assertIncludes(editor, "drawerCollapsed", "Shared editor drawer collapse state");
  assertIncludes(editor, "clearSelection", "Shared editor clear selection action");
  assertIncludes(editor, "floatingSelectionToolbar", "Shared editor floating selected-layer toolbar");
  assertIncludes(editor, "getBoundingRect(false, true)", "Shared editor floating toolbar uses viewport selection bounds");
  assertIncludes(editor, "selectionBottom + FLOATING_SELECTION_TOOLBAR_GAP", "Shared editor floating toolbar anchors below selected layer bottom edge");
  assertIncludes(editor, "floatingToolbarSizeRef", "Shared editor measures floating toolbar width before clamping");
  assertIncludes(editor, "data-selection-bottom", "Shared editor exposes floating toolbar placement QA data");
  assertIncludes(editor, "aria-label={`Add ${asset.label}`}", "Shared editor sticker buttons stay accessible without visible label clutter");
  assertIncludes(editor, "renderFloatingSelectionToolbar", "Shared editor renders canvas-selected quick actions");
  assertIncludes(editor, "renderContextualSelectionToolbar", "Shared editor renders top contextual property toolbar");
  assertIncludes(editor, "setRightPanelMode(\"layers\")", "Shared editor Layers button opens dedicated layer panel mode");
  assertIncludes(editor, "renderLayerPanel", "Shared editor renders dedicated active layers panel");
  assertIncludes(editor, "reorderLayerByDrop", "Shared editor active layers panel supports drag/drop layer reorder");
  assertIncludes(editor, "event.dataTransfer.setData(\"text/plain\", element.id)", "Shared editor layer rows carry drag payloads");
  assertIncludes(editor, "draggable={!activePageLocked && !element.locked}", "Shared editor prevents locked layers from being dragged");
  assertIncludes(editor, "keepLayerPanelOpen", "Shared editor preserves Active Layers drawer during reorder reload selection");
  assertIncludes(editor, "renderPriorityInspectorSection", "Shared editor renders selected-item-first inspector controls");
  assertIncludes(editor, "shouldReloadCanvasForSelectedPatch", "Shared editor distinguishes rebuild-required edits from focus-safe property edits");
  assertIncludes(editor, "applySelectedElementPatchToFabricObject", "Shared editor patches selected Fabric objects in place for right-panel edits");
  assertIncludes(editor, "reloadCanvas || !didPatchCanvas", "Shared editor avoids full canvas reloads for focus-safe selected-layer edits");
  assertIncludes(editor, "pendingFloatingToolbarRefreshRef", "Shared editor defers floating toolbar repositioning while form controls are focused");
  assertIncludes(editor, "floatingToolbarFrameRef", "Shared editor coalesces floating toolbar refreshes to animation frames");
  assertIncludes(editor, "workspaceViewportFrameRef", "Shared editor coalesces workspace viewport metric refreshes to animation frames");
  assertIncludes(editor, "isSameFloatingSelectionToolbar", "Shared editor skips unchanged floating toolbar state");
  assertIncludes(editor, "selectedElementPatchHasChanges", "Shared editor skips no-op selected-layer patches before commit/history");
  assertIncludes(editor, "setSelectedIdState((current) => current === id ? current : id)", "Shared editor avoids repeated selected-id state updates");
  assertIncludes(editor, "setRightPanelModeState((current) => current === mode ? current : mode)", "Shared editor avoids repeated right-panel mode state updates");
  assertIncludes(editor, "onBlurCapture={flushPendingFloatingToolbarRefresh}", "Shared editor flushes deferred toolbar refresh after focused controls blur");
  assertIncludes(editor, "CAMPAIGN_STARTER_ACTIONS", "Shared editor exposes browser-local campaign goal starters");
  assertIncludes(editor, "applyCampaignStarter", "Shared editor applies campaign goal starters through local document actions");
  assertIncludes(editor, "buildReadinessIssues", "Shared editor runs browser-local pre-download readiness checks");
  assertIncludes(editor, "renderReadinessPanel", "Shared editor renders the download readiness panel");
  assertIncludes(editor, "EXPORT_BUNDLE_PRESETS", "Shared editor defines common PNG bundle handoff sizes");
  assertIncludes(editor, "downloadExportBundle", "Shared editor downloads browser-local export bundles");
  assertIncludes(editor, "autosaveDraft", "Shared editor detects local autosave recovery drafts");
  assertIncludes(editor, "restoreAutosaveDraft", "Shared editor can restore local autosave drafts");
  assertIncludes(editor, "dismissAutosaveDraft", "Shared editor can dismiss local autosave drafts");
  assertIncludes(editor, "historyLabelsRef", "Shared editor keeps owner-readable history labels");
  assertIncludes(editor, "DRAWER_ITEM_LIMIT", "Shared editor caps long drawer result lists");
  assertIncludes(editor, "businessChipPanel", "Shared editor selected text exposes business text chips");
  assertIncludes(editor, "imageSmartActionGrid", "Shared editor selected images expose smart image shortcuts");
  assertIncludes(editor, "layerPanelStats", "Shared editor layer panel exposes stack stats and history context");
  assertIncludes(editor, "enterReviewMode", "Shared editor exposes owner review mode");
  assertIncludes(editor, "data-review-mode", "Shared editor marks mobile review mode layout state");
  assertIncludes(editor, "TEXT_ACTION_PATTERN", "Shared editor detects missing action cues in selected text");
  assertIncludes(editor, "getContrastRatio", "Shared editor checks selected text contrast locally");
  assertIncludes(editor, "shortenBusinessText", "Shared editor has deterministic selected text shortening");
  assertIncludes(editor, "fitTextToSafeArea", "Shared editor can fit selected text back into safe area");
  assertIncludes(editor, "openSelectionAiTools", "Shared editor selected-item inspector can open Design Cue/AI tools");
  assertIncludes(editor, "hidden={!(canEditTextElement(selectedElement)", "Shared editor hides generic color controls for unsupported selections");
  assertIncludes(editor, "hidden={selectedElement?.type !== \"image\"}", "Shared editor hides image controls for non-image selections");
  assertIncludes(editor, "hidden={!canStrokeElement(selectedElement)}", "Shared editor hides border controls for unsupported selections");
  assertIncludes(editor, "fitZoomToStage", "Shared editor fits output frame to available workspace");
  assertIncludes(editor, "stageScrollerRef", "Shared editor tracks workspace stage for old editor-style canvas fit");
  assertIncludes(editor, "getStageViewportSize", "Shared editor measures the full editor viewport for the Fabric canvas");
  assertIncludes(editor, "centerWorkspaceAtZoom", "Shared editor centers the internal workspace frame through Fabric viewport transforms");
  assertIncludes(editor, "zoomFabricViewport", "Shared editor bottom zoom controls update the Fabric viewport");
  assertIncludes(editor, "CANVAS_SIZE_PRESETS", "Shared editor exposes common SMB canvas size presets");
  assertIncludes(editor, "QR table card", "Shared editor includes QR table card canvas size preset");
  assertIncludes(editor, "qrValue", "Shared editor QR drawer exposes editable QR value");
  assertIncludes(editor, "QR color", "Shared editor QR controls expose foreground color");
  assertIncludes(editor, "showSafeArea", "Shared editor safe-area guide toggle state");
  assertIncludes(editor, "SAFE_AREA_INSET_RATIO", "Shared editor safe-area overlay is tied to workspace viewport");
  assertIncludes(editor, "withWorkspaceExportViewport", "Shared editor resets viewport before workspace-only export");
  assertIncludes(editor, "getWorkspaceExportBox", "Shared editor exports only the internal workspace frame");
  assertIncludes(editor, "canvas.setViewportTransform([1, 0, 0, 1, 0, 0])", "Shared editor export guard resets Fabric viewport to identity");
  assertIncludes(editor, "viewportSize: getStageViewportSize()", "Shared editor loads documents into a full-screen Fabric viewport");
  assertNotIncludes(editor, "fabricScaleNode", "Shared editor does not CSS-scale a frame-sized Fabric canvas");
  assertNotIncludes(editor, "handleStagePointerDown", "Shared editor does not pan through a scroll container");
  assertIncludes(editor, "showPageNavigation", "Shared editor hides page controls for single-page editing");
  assertIncludes(editor, "setInspectorOpen(Boolean(selectedObjectId", "Shared editor opens right inspector on selection");
  assertIncludes(editor, "drawerSearch", "Shared editor searchable drawer state");
  assertIncludes(editor, "recentInsertions", "Shared editor recent insertion state");
  assertIncludes(editor, "TEXT_PRESETS", "Shared editor text preset list");
  assertIncludes(editor, "TEXT_TEMPLATE_LIBRARY", "Shared editor text template library import");
  assertIncludes(editor, "addTextTemplate", "Shared editor inserts multi-layer ready-made text templates");
  assertIncludes(editor, "Ready-made text templates", "Shared editor text drawer exposes ready-made template catalog");
  assertIncludes(editor, "aria-label={`Add ${template.label} text template`}", "Shared editor text template cards keep accessible labels without visible label clutter");
  assertIncludes(editor, "title={template.label}", "Shared editor text template cards keep hover titles");
  assertNotIncludes(editor, "<small>{template.category} / {template.description}</small>", "Shared editor text template cards do not render visible category labels");
  assertIncludes(editor, "textPlaceholders", "Shared editor document placeholder quick text");
  assertIncludes(editor, "brandColorItems", "Shared editor brand color quick picks");
  assertIncludes(editor, "brandLogoAssets", "Shared editor brand logo quick picks");
  assertIncludes(editor, "switchPage", "Shared editor page switching action");
  assertIncludes(editor, "addPage", "Shared editor add page action");
  assertIncludes(editor, "duplicateActivePage", "Shared editor duplicate page action");
  assertIncludes(editor, "toggleActivePageLock", "Shared editor page lock action");
  assertIncludes(editor, "syncActivePageSnapshot", "Shared editor active page export snapshot sync");
  assertIncludes(editor, "const activeElements = documentValue.elements", "Shared editor active page sync preserves current root elements");
  assertIncludes(editor, "elements: activeElements", "Shared editor active page sync writes current elements into the page snapshot");
  assertIncludes(editor, "Save", "Shared editor save action matches legacy editor label");
  assertIncludes(editor, "KEYBOARD_SHORTCUT_GROUPS", "Shared editor defines grouped keyboard shortcut registry");
  assertIncludes(editor, "shortcutPanelOpen", "Shared editor exposes keyboard shortcuts panel state");
  assertIncludes(editor, "LuKeyboard", "Shared editor bottom controls expose keyboard shortcut icon");
  assertIncludes(editor, "spacebarModeRestoreRef", "Shared editor supports temporary Space Grab mode");
  assertIncludes(editor, "Close panel, clear selection, then hide drawer", "Shared editor documents staged Escape behavior in the shortcut panel");
  assertIncludes(editor, "setReadinessPanelOpen(false)", "Shared editor Escape closes readiness panel before selection changes");
  assertIncludes(editor, "setAiToolResult(null)", "Shared editor Escape closes AI result panels before selection changes");
  assertIncludes(editor, "setDrawerCollapsed(true)", "Shared editor Escape can collapse the left drawer for full-workspace preview");
  assertIncludes(editor, "setDrawerSearch(\"\")", "Shared editor Escape clears drawer search when collapsing the left drawer");
  assertIncludes(editor, "const active = !drawerCollapsed && activeTool === tool.id", "Shared editor rail active state clears visually when the drawer is collapsed");
  assertIncludes(editor, "Keyboard shortcuts", "Shared editor renders keyboard shortcuts panel");
  assertIncludes(editor, "Cmd/Ctrl + Shift + K", "Shared editor documents review shortcut in UI registry");
  assertIncludes(editor, "Cmd/Ctrl + Arrow", "Shared editor documents keyboard resize shortcut");
  assertIncludes(editor, "Alt + Shift + L/C/R", "Shared editor documents alignment shortcuts");
  assertIncludes(editor, "targetIsForm", "Shared editor keyboard shortcuts ignore active form controls");
  assertIncludes(editor, "activeTextChild?.isEditing", "Shared editor keyboard shortcuts ignore active Fabric text editing");
  assertNotIncludes(editor, "svgMarkup", "Shared editor has no pasted SVG runtime state");
  assertNotIncludes(editor, "Import SVG file", "Shared editor top bar has no SVG import button");
  assertNotIncludes(editor, "Add SVG code", "Shared editor drawer has no pasted SVG import action");
  assertIncludes(editor, "Pasted SVG code is not imported for safety", "Shared editor owner copy explains SVG import boundary");
  assertNotIncludes(editor, "CampaignCue", "Shared editor base UI avoids CampaignCue default text");
  assertIncludes(editor, "void import(\"fabric\")", "Shared editor loads Fabric client-side");
  assertIncludes(editor, "canvas.toDataURL", "Shared editor Fabric PNG export action");
  assertIncludes(editor, "canvas.toSVG", "Shared editor Fabric SVG export action");
  assertIncludes(editor, "AI Tools", "Shared editor rail shows AI Tools placeholder");
  assertIncludes(editor, "DesignCuePanel", "Shared editor renders neutral Design Cue panel");
  assertIncludes(editor, "commitDocument(result.document", "Shared editor applies Design Cue through document commit/history");
  assertIncludes(designCuePanel, "Ask Design Cue", "Design Cue panel supports owner comment flow");
  assertIncludes(designCuePanel, "Apply", "Design Cue panel owner approval action");
  assertIncludes(designCuePanel, "Try another", "Design Cue panel retry action");
  assertIncludes(designCuePanel, "Cancel", "Design Cue panel cancel action");
  assertNotIncludes(designCuePanel, "@type/campaigncue", "Design Cue panel stays product-neutral");
  assertIncludes(editor, "Templates", "Shared editor rail shows Templates placeholder");
  assertIncludes(editor, "Background", "Shared editor background drawer");
  assertIncludes(editor, "Illustrations", "Shared editor illustration drawer");
  assertIncludes(editor, "Layer Alignment", "Shared editor inspector layer alignment");
  assertIncludes(editor, "Alignment With Background", "Shared editor inspector canvas alignment");
  assertIncludes(editor, "Selection", "Shared editor bottom selection mode");
  assertIncludes(editor, "Grab", "Shared editor bottom grab mode");
  assertIncludes(editor, "Move Backward", "Shared editor layer move label is owner-readable");
  assertIncludes(editor, "registerAsset", "Shared editor product save action");
  assertIncludes(editorStyles, ".toolRail", "Shared editor left tool rail styles");
  assertIncludes(editorStyles, ".assetDrawer", "Shared editor asset drawer styles");
  assertIncludes(editorStyles, ".inspector", "Shared editor right inspector styles");
  assertIncludes(editorStyles, "transform: translateX(calc(100% + 18px));", "Shared editor right inspector opens as floating drawer without grid reflow");
  assertNotIncludes(editorStyles, "minmax(300px, var(--editor-inspector-width))", "Shared editor right inspector does not mount as an editor grid column");
  assertIncludes(editorStyles, "right: calc(var(--editor-inspector-width) + 18px);", "Shared editor Layers button stays reachable beside the floating inspector");
  assertIncludes(editorStyles, "left: calc(50% - (var(--editor-inspector-width) / 2));", "Shared editor bottom controls stay reachable beside the floating inspector");
  assertIncludes(editorStyles, ".layerDragHandle", "Shared editor active layers panel has drag handle styling");
  assertIncludes(editorStyles, ".layerRow[data-dragging=\"true\"]", "Shared editor active layers panel marks dragged rows");
  assertIncludes(editorStyles, ".layerPanelHeader", "Shared editor dedicated layer panel styles");
  assertIncludes(editorStyles, ".layersButton[data-active=\"true\"]", "Shared editor Layers button active-state styling");
  assertIncludes(editorStyles, "--inspector-control-height: 34px;", "Shared editor desktop inspector uses compact old-editor control density");
  assertIncludes(editorStyles, "--inspector-section-title-size: 14px;", "Shared editor desktop inspector headings stay compact");
  assertIncludes(editorStyles, ".priorityHeader h3", "Shared editor selected-item inspector header typography is explicitly scoped");
  assertIncludes(editorStyles, ".bottomControls", "Shared editor bottom canvas controls");
  assertIncludes(editorStyles, ".shortcutOverlay", "Shared editor keyboard shortcut overlay styles");
  assertIncludes(editorStyles, ".shortcutPanel", "Shared editor keyboard shortcut panel styles");
  assertIncludes(editorStyles, ".shortcutGrid", "Shared editor keyboard shortcut group grid styles");
  assertIncludes(editorStyles, ".shortcutKey", "Shared editor keyboard shortcut key badge styles");
  assertIncludes(editorStyles, ".floatingSelectionToolbar", "Shared editor floating selected-layer toolbar styles");
  assertIncludes(editorStyles, ".contextualToolbar", "Shared editor top contextual toolbar styles");
  assertIncludes(editorStyles, ".priorityInspectorSection", "Shared editor selected-item-first inspector styles");
  assertIncludes(editorStyles, ".prioritySwatchRow", "Shared editor priority color swatches");
  assertIncludes(editorStyles, ".textSmartActionGrid", "Shared editor selected text quick action styles");
  assertIncludes(editorStyles, ".textHealthList", "Shared editor selected text check styles");
  assertIncludes(editorStyles, ".inspectorSection[hidden]", "Shared editor hidden unsupported inspector sections do not consume space");
  assertIncludes(editorStyles, ".drawerSearch", "Shared editor drawer search styles");
  assertIncludes(editorStyles, ".pageStrip", "Shared editor page strip styles");
  assertIncludes(editorStyles, ".pageQuickControls", "Shared editor page quick controls styles");
  assertIncludes(editorStyles, ".textPresetList", "Shared editor text preset styles");
  assertIncludes(editorStyles, ".textTemplateGrid", "Shared editor ready-made text template grid styles");
  assertIncludes(editorStyles, ".textTemplatePreview", "Shared editor text template preview styles");
  assertNotIncludes(editorStyles, ".textTemplateGrid small", "Shared editor text template cards have no visible label text style");
  assertIncludes(editorStyles, ".brandColorGrid", "Shared editor Brand Kit quick color styles");
  assertIncludes(editorStyles, ".downloadButton", "Shared editor primary download button styles");
  assertIncludes(editorStyles, ".campaignStarterGrid", "Shared editor campaign goal starter styles");
  assertIncludes(editorStyles, ".readinessPanel", "Shared editor download readiness panel styles");
  assertIncludes(editorStyles, ".autosaveBanner", "Shared editor local autosave recovery styles");
  assertIncludes(editorStyles, ".businessChipPanel", "Shared editor business text chip styles");
  assertIncludes(editorStyles, ".imageSmartActionGrid", "Shared editor smart image shortcut styles");
  assertIncludes(editorStyles, ".layerPanelStats", "Shared editor layer panel stats styles");
  assertIncludes(editorStyles, ".editorBody[data-review-mode=\"true\"]", "Shared editor mobile review mode layout styles");
  assertIncludes(editorStyles, ".projectStyleCard", "Shared editor project style summary styles");
  assertIncludes(editorStyles, ".stylePresetGrid", "Shared editor project style preset styles");
  assertIncludes(editorStyles, ".uploadDropCard", "Shared editor My Stuff upload card styles");
  assertIncludes(editorStyles, ".fabricZoomBox", "Shared editor Fabric zoom wrapper styles");
  assertIncludes(editorStyles, "--workspace-bg", "Shared editor separates workspace background from output frame");
  assertIncludes(editorStyles, "overflow: hidden", "Shared editor full Fabric viewport does not scroll like a DOM artboard");
  assertNotIncludes(editorStyles, "--canvas-center-offset", "Shared editor does not offset output frame away from remaining workspace center");
  assertNotIncludes(editorStyles, ".fabricScaleNode", "Shared editor styles do not keep a CSS transform scale node");
  assertIncludes(editorStyles, ".designCuePanel", "Shared editor Design Cue panel styles");
  assertIncludes(editorStyles, ".designCueCommandGrid", "Shared editor Design Cue command grid styles");
  assertIncludes(editor, "{renderAiToolResult()}\n            {aiToolActions.length", "Shared editor shows AI results before remaining tool groups");
  assertIncludes(editor, "buildRulerTicks", "Shared editor canvas-bound ruler tick builder");
  assertIncludes(editorStyles, ".canvasRulerTop", "Shared editor canvas-bound ruler top gutter");
  assertIncludes(editorStyles, ".canvasRulerLeft", "Shared editor canvas-bound ruler left gutter");
  assertIncludes(editorStyles, ".sizePresetGrid", "Shared editor common size preset styles");
  assertIncludes(editorStyles, ".qrPreviewCard", "Shared editor QR drawer preview styles");
  assertIncludes(editorStyles, ".safeAreaOverlay", "Shared editor safe-area guide overlay styles");
  assertIncludes(editorStyles, "--craft-icon-active-primary", "Shared editor craft icon active path palette");
  assertIncludes(editorStyles, "[data-theme=\"light\"]", "Shared editor light theme styles");
  assertIncludes(textTemplates, "\"type\": \"composition\"", "Shared editor Canva/Vista-style text templates are data-backed");
  assertIncludes(textTemplates, "\"label\": \"Free shipping\"", "Shared editor text templates cover ecommerce offers");
  assertIncludes(textTemplates, "\"label\": \"Now open\"", "Shared editor text templates cover local business launch posts");
  assertIncludes(textTemplates, "\"label\": \"Book appointment\"", "Shared editor text templates cover service businesses");
  assertIncludes(textTemplates, "\"layers\"", "Shared editor text templates define editable text layers");
  assertIncludes(editor, "STICKER_ASSETS", "Shared editor Canva-style sticker assets");
  assertIncludes(editorStyles, ".textPrimaryAction", "Shared editor Canva-style add text action");
  assertIncludes(editorStyles, ".textTemplateGrid", "Shared editor Canva/Vista-style text template grid");
  assertIncludes(editorStyles, ".stickerGrid", "Shared editor Canva-style sticker grid");
  assertNotIncludes(editorStyles, ".stickerGrid span", "Shared editor sticker grid does not reserve broken label space");
  assertIncludes(editorStyles, ".popularChipRow", "Shared editor Canva-style element search chips");
  assertIncludes(editor, "canUngroupActiveSelection", "Shared editor hides invalid ungroup actions");
  assertIncludes(editor, "canDistributeActiveSelection", "Shared editor hides invalid distribute actions");
  assertIncludes(editor, "selectedLayerReadOnly", "Shared editor disables edits for locked layers and pages");
  assertIncludes(editorStyles, ".gradientStopRow", "Shared editor multi-stop gradient styles");
  assertIncludes(editorStyles, "[data-theme=\"dark\"]", "Shared editor dark theme styles");
  assertIncludes(exporter, "serializeCreativeDocumentToSvg", "Shared editor SVG serializer");
  assertIncludes(exporter, "QRCode.toDataURL", "Shared editor QR export support");
  assertIncludes(campaigncueProvider, "productId: \"campaigncue\"", "CampaignCue adapter sets product context");
  assertIncludes(campaigncueProvider, "buildCampaignCueOutputCreativeDocument", "CampaignCue output document builder");
  assertNotIncludes(read("src/modules/creative-editor/types.ts"), "@type/campaigncue", "Shared editor types do not import CampaignCue types");
  assertNotIncludes(read("src/modules/creative-editor/CreativeEditor.tsx"), "@type/campaigncue", "Shared editor UI does not import CampaignCue types");
  assertNotIncludes(read("src/modules/creative-editor/CreativeEditor.tsx"), "templateRegistryDal", "Shared editor UI does not import product template registry DAL");
  assertNotIncludes(read("src/modules/creative-editor/CreativeEditor.tsx"), "storeAssetTemplates", "Shared editor UI does not import MenuList store template collection");
  assertNotIncludes(read("src/modules/creative-editor/CreativeEditor.tsx"), "platformAssetTemplates", "Shared editor UI does not import platform template collection");
  assertNotIncludes(read("src/modules/creative-editor/export.ts"), "@type/campaigncue", "Shared editor export layer does not import CampaignCue types");
  assertNotIncludes(read("src/modules/creative-editor/fabricAdapter.ts"), "@type/campaigncue", "Shared editor Fabric adapter does not import CampaignCue types");
  assertNotIncludes(exporter, "campaigncue.ai", "Shared editor export layer has no CampaignCue fallback URL");
  assertNotIncludes(templates, "campaigncue.ai", "Shared editor templates have no CampaignCue fallback URL");
  assertIncludes(campaigncueProvider, "buildCampaignCueTextPlaceholders", "CampaignCue adapter supplies editor text placeholders from loaded overview");
  assertIncludes(campaigncueProvider, "fontFamily: \"Inter, Arial, sans-serif\"", "CampaignCue adapter supplies brand font metadata");
  assertIncludes(campaigncueProvider, "accentColor: \"#f6d365\"", "CampaignCue adapter supplies brand accent color metadata");
  assertIncludes(sharedReadme, "JSON/raster-image import", "Shared editor README documents safe image import boundary");
  assertIncludes(sharedReadme, "keyboard shortcuts panel", "Shared editor README documents keyboard shortcut release");
  assertIncludes(sharedReadme, "Escape preview unwind", "Shared editor README documents Escape preview unwind");
  assertIncludes(sharedSpec, "Arbitrary SVG files or pasted SVG markup are not imported", "Shared editor spec blocks arbitrary SVG import");
  assertIncludes(sharedSpec, "Keyboard shortcuts", "Shared editor spec documents keyboard shortcut behavior");
  assertIncludes(sharedSpec, "Escape unwind", "Shared editor spec documents Escape unwind order");
  assertIncludes(sharedSpec, "Product-owned export policy", "Shared editor spec documents adapter export policy");
  assertIncludes(sharedSpec, "Floating selected-layer toolbar", "Shared editor spec documents floating selected-layer toolbar");
  assertIncludes(sharedSpec, "Contextual property toolbar", "Shared editor spec documents contextual toolbar");
  assertIncludes(sharedSpec, "Drawer search filters", "Shared editor spec documents drawer search");
  assertIncludes(sharedSpec, "Page controls add, switch, duplicate, and lock artboards", "Shared editor spec documents page controls");
  assertIncludes(sharedSpec, "safe-area guides remain UI-only overlays outside export output", "Shared editor spec documents safe-area export boundary");
  assertIncludes(sharedSpec, "Right-panel editing speed", "Shared editor spec documents selected-item-first inspector goal");
  assertIncludes(sharedSpec, "Campaign goal starters compose local editable layers", "Shared editor spec documents campaign goal starters");
  assertIncludes(sharedSpec, "Download readiness checks catch empty/low-quality handoff risks", "Shared editor spec documents readiness checks");
  assertIncludes(sharedSpec, "Export bundle creates common PNG handoff sizes", "Shared editor spec documents export bundle");
  assertIncludes(sharedSpec, "Local autosave recovery can restore or dismiss", "Shared editor spec documents local autosave recovery");
  assertIncludes(sharedSpec, "Mobile review mode keeps readiness and download checks reachable", "Shared editor spec documents mobile review mode");
  assertIncludes(sharedImpl, "The schema is deliberately not Fabric JSON", "Shared editor docs reject hardcoded Fabric persistence");
  assertIncludes(sharedImpl, "Full editor shell", "Shared editor docs cover full shell implementation");
  assertIncludes(sharedImpl, "floating selected-layer toolbar", "Shared editor implementation docs cover floating selected-layer toolbar");
  assertIncludes(sharedImpl, "Contextual property toolbar", "Shared editor implementation docs cover contextual toolbar");
  assertIncludes(sharedImpl, "Optional `pages` store artboards", "Shared editor implementation docs cover page schema");
  assertIncludes(sharedImpl, "Drawer search, recents, Brand Kit, and text placeholders are browser-local", "Shared editor implementation docs cover local drawer and Brand Kit boundary");
  assertIncludes(sharedImpl, "Arbitrary owner-provided SVG files or pasted SVG markup are not imported", "Shared editor implementation docs block arbitrary SVG import");
  assertIncludes(sharedImpl, "Product adapters may disable specific browser export formats", "Shared editor implementation docs cover adapter export policy");
  assertIncludes(sharedImpl, "Campaign goal starters compose existing local actions", "Shared editor implementation docs cover campaign goal starter boundary");
  assertIncludes(sharedImpl, "pre-download readiness check is browser-local", "Shared editor implementation docs cover readiness check boundary");
  assertIncludes(sharedImpl, "Export bundle downloads are client-side PNG resizes", "Shared editor implementation docs cover export bundle boundary");
  assertIncludes(sharedImpl, "Local autosave uses browser `localStorage` only", "Shared editor implementation docs cover autosave boundary");
  assertIncludes(sharedImpl, "Review mode is a UI state", "Shared editor implementation docs cover review mode boundary");
  assertIncludes(sharedImpl, "KEYBOARD_SHORTCUT_GROUPS", "Shared editor implementation docs cover shortcut registry");
  assertIncludes(sharedImpl, "staged unwind order", "Shared editor implementation docs cover Escape unwind order");
  assertIncludes(sharedTests, "Floating toolbar appears", "Shared editor tests cover floating selected-layer toolbar");
  assertIncludes(sharedTests, "Floating toolbar bottom placement", "Shared editor tests cover bottom-anchored selected-layer toolbar");
  assertIncludes(sharedTests, "Sticker drawer thumbnail cards", "Shared editor tests cover sticker thumbnail-only cards");
  assertIncludes(sharedTests, "Sticker SVG render", "Shared editor tests cover full sticker canvas rendering");
  assertIncludes(sharedTests, "clean output frame", "Shared editor tests cover blank document without surprise demo layers");
  assertIncludes(sharedTests, "Right properties panel opens", "Shared editor tests cover old editor-style right inspector behavior");
  assertIncludes(sharedTests, "Selected-item-first inspector", "Shared editor tests cover owner-first inspector order");
  assertIncludes(sharedTests, "Right-panel focus retention", "Shared editor tests cover focus-safe selected-layer property edits");
  assertIncludes(sharedTests, "Keyboard shortcuts panel", "Shared editor tests cover keyboard shortcut panel");
  assertIncludes(sharedTests, "Shortcut typing guard", "Shared editor tests cover shortcut focus guard");
  assertIncludes(sharedTests, "Escape staged preview unwind", "Shared editor tests cover Escape staged preview cleanup");
  assertIncludes(sharedTests, "Keyboard creation shortcuts", "Shared editor tests cover shortcut-created layers");
  assertIncludes(sharedTests, "Keyboard view shortcuts", "Shared editor tests cover shortcut view controls");
  assertIncludes(sharedTests, "No-op property edit guard", "Shared editor tests cover no-op selected-layer edit guard");
  assertIncludes(sharedTests, "Floating toolbar focus retention", "Shared editor tests cover floating toolbar focus-safe edits");
  assertIncludes(sharedTests, "Floating toolbar render throttling", "Shared editor tests cover floating toolbar render throttling");
  assertIncludes(sharedTests, "Grab viewport render throttling", "Shared editor tests cover Grab-mode viewport metric throttling");
  assertIncludes(sharedTests, "Text owner actions", "Shared editor tests cover selected text owner actions");
  assertIncludes(sharedTests, "Text checks", "Shared editor tests cover selected text readiness checks");
  assertIncludes(sharedTests, "AI result placement", "Shared editor tests cover AI suggestions before remaining tool groups");
  assertIncludes(sharedTests, "Single-page documents hide page controls", "Shared editor tests cover single-page page-control hiding");
  assertIncludes(sharedTests, "Floating toolbar group actions", "Shared editor tests cover grouped selection validation");
  assertIncludes(sharedTests, "Invalid group actions", "Shared editor tests cover invalid grouped action guards");
  assertIncludes(sharedTests, "Text preset drawer", "Shared editor tests cover Canva-style text preset drawer");
  assertIncludes(sharedTests, "Graphics sticker drawer", "Shared editor tests cover Canva-style sticker drawer");
  assertIncludes(sharedTests, "Campaign goal starter", "Shared editor tests cover campaign goal starters");
  assertIncludes(sharedTests, "Download readiness check", "Shared editor tests cover pre-download readiness checks");
  assertIncludes(sharedTests, "Export bundle", "Shared editor tests cover export bundles");
  assertIncludes(sharedTests, "Local autosave restore", "Shared editor tests cover local autosave recovery");
  assertIncludes(sharedTests, "Business text chips", "Shared editor tests cover selected text business chips");
  assertIncludes(sharedTests, "Smart image quick actions", "Shared editor tests cover selected image quick shortcuts");
  assertIncludes(sharedTests, "Layer panel stats and rename", "Shared editor tests cover layer panel stats and rename");
  assertIncludes(sharedTests, "Drawer item cap", "Shared editor tests cover long drawer list caps");
  assertIncludes(sharedTests, "Owner-readable undo redo", "Shared editor tests cover owner-readable history labels");
  assertIncludes(sharedTests, "Mobile review mode", "Shared editor tests cover mobile review mode");
  assertIncludes(sharedTests, "Full-workspace canvas", "Shared editor tests cover old editor full-screen Fabric viewport flow");
  assertIncludes(sharedTests, "Workspace-only export", "Shared editor tests cover export clipping to the internal frame");
  assertIncludes(sharedTests, "Fabric-native zoom and grab", "Shared editor tests cover viewport zoom and pan");
  assertIncludes(sharedTests, "Sidebar icon active state", "Shared editor tests cover old craft-builder icon palette reuse");
  assertIncludes(sharedTests, "Contextual toolbar text controls", "Shared editor tests cover contextual toolbar");
  assertIncludes(sharedTests, "Drawer search", "Shared editor tests cover drawer search");
  assertIncludes(sharedTests, "Page controls", "Shared editor tests cover page controls");
  assertIncludes(sharedTests, "Active-page export", "Shared editor tests cover active-page export");
  assertIncludes(sharedTests, "No SVG-file import button exists", "Shared editor tests cover absent SVG file import");
  assertIncludes(sharedTests, "No pasted SVG import field exists", "Shared editor tests cover absent pasted SVG import");
  assertIncludes(sharedTests, "extensionless owner-entered URLs are rejected", "Shared editor tests cover unsafe image URL guard");
  assertIncludes(sharedTests, "Selected image source is read-only", "Shared editor tests cover selected image source guard");
  assertIncludes(sharedValidation, "canvas-bound rulers", "Shared editor validation records ruler repair");
  assertIncludes(sharedValidation, "Keyboard Shortcut Workflow", "Shared editor validation records shortcut workflow");
  assertIncludes(sharedValidation, "Escape Preview Unwind", "Shared editor validation captures Escape preview unwind pass");
  assertIncludes(sharedValidation, "Sticker Drawer and Toolbar Placement Fix", "Shared editor validation records sticker and toolbar repair");
  assertIncludes(sharedValidation, "full-screen Fabric viewport", "Shared editor validation records restored old editor viewport flow");
  assertIncludes(sharedHelpdoc, "Keyboard Shortcuts", "Shared editor helpdoc documents keyboard shortcuts");
  assertIncludes(sharedValidation, "theme-aware old craft-builder icon palettes", "Shared editor validation records theme/icon repair");
  assertIncludes(sharedValidation, "Practical toolbar validation", "Shared editor validation records invalid action gating");
  assertIncludes(sharedValidation, "Graphics drawer exposes local stickers", "Shared editor validation records sticker drawer behavior");
  assertIncludes(sharedValidation, "SMB Owner Inspector Flow", "Shared editor validation records selected-item-first inspector flow");
  assertIncludes(sharedValidation, "Editor Interaction Render Throttling", "Shared editor validation records editor-wide render throttling");
  assertIncludes(sharedValidation, "Right Panel Focus and Canvas Patch Performance", "Shared editor validation records focus-safe selected-layer edits");
  assertIncludes(sharedValidation, "Floating Toolbar Focus Retention", "Shared editor validation records deferred floating toolbar repositioning");
  assertIncludes(sharedValidation, "SMB Owner Long-Term Workflow Pass", "Shared editor validation records long-term owner workflow pass");
  assertIncludes(sharedValidation, "No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, remote stock search, remote template search, or realtime listeners are added", "Shared editor validation records zero-cost local workflow additions");
  assertIncludes(sharedHelpdoc, "Escape to step back from popups", "Shared editor helpdoc explains Escape preview cleanup");
  assertIncludes(sharedHelpdoc, "Arbitrary SVG files and pasted SVG markup are not imported", "Shared editor helpdoc blocks unsafe SVG import");
  assertIncludes(sharedHelpdoc, "Use the drawer search", "Shared editor helpdoc covers drawer search");
  assertIncludes(sharedHelpdoc, "Downloads use the active page", "Shared editor helpdoc covers active-page export");
  assertIncludes(sharedHelpdoc, "Use the campaign goal starters", "Shared editor helpdoc covers campaign goal starters");
  assertIncludes(sharedHelpdoc, "Before download, the editor can flag empty text", "Shared editor helpdoc covers readiness checks");
  assertIncludes(sharedHelpdoc, "The editor keeps a browser-local recovery draft", "Shared editor helpdoc covers local autosave recovery");
  assertIncludes(campaigncueReadme, "Shared creative editor", "CampaignCue docs link shared editor boundary");
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
  assertIncludes(firestoreRules, "match /cueLayerDesigns/{docId}", "CampaignCue CueLayers design rules");
  assertIncludes(firestoreRules, "match /cueLayerCostRecords/{docId}", "CampaignCue CueLayers cost records are admin-only");
  assertIncludes(storageRules, "match /campaigncue/cue-layers/{workspaceId}/{designId}/{allPaths=**}", "CampaignCue CueLayers storage path rule");
  assertIncludes(storageRules, "allow write, delete: if false", "CampaignCue CueLayers client Storage writes disabled");
  assertIncludes(indexes, "\"collectionGroup\": \"sourceInputs\"", "CampaignCue source inputs index");
  assertIncludes(indexes, "\"collectionGroup\": \"campaigns\"", "CampaignCue campaigns index");
  assertIncludes(indexes, "\"collectionGroup\": \"assets\"", "CampaignCue assets index");
  assertIncludes(indexes, "\"collectionGroup\": \"schedules\"", "CampaignCue schedules index");
  assertIncludes(indexes, "\"collectionGroup\": \"providerConnections\"", "CampaignCue provider connections index");
  assertIncludes(indexes, "\"collectionGroup\": \"locations\"", "CampaignCue locations index");
  assertIncludes(indexes, "\"collectionGroup\": \"events\"", "CampaignCue events index");
  assertIncludes(indexes, "\"collectionGroup\": \"cueLayerDesigns\"", "CampaignCue CueLayers design index");
  assertIncludes(indexes, "\"collectionGroup\": \"cueLayerJobs\"", "CampaignCue CueLayers job index");
  assertIncludes(indexes, "\"collectionGroup\": \"cueLayerExports\"", "CampaignCue CueLayers export index");
}

function verifyProductConstantSeparation() {
  const constantFiles = [
    "src/constants/campaigncue/index.ts",
    "src/constants/campaigncue/channels.ts",
    "src/constants/campaigncue/database.ts",
    "src/constants/campaigncue/delivery.ts",
    "src/constants/campaigncue/designCue.ts",
    "src/constants/campaigncue/domains.ts",
    "src/constants/campaigncue/dailyDesk.ts",
    "src/constants/campaigncue/errors.ts",
    "src/constants/campaigncue/firebase.ts",
    "src/constants/campaigncue/cueLayers.ts",
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
  const cueLayers = read("src/constants/campaigncue/cueLayers.ts");
  const designCue = read("src/constants/campaigncue/designCue.ts");
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
  assertIncludes(database, "CUE_LAYER_DESIGNS", "CampaignCue CueLayers design collection constant");
  assertIncludes(cueLayers, "CAMPAIGNCUE_CUE_LAYER_JOB_STATUSES", "CampaignCue CueLayers job status constants");
  assertIncludes(cueLayers, "CAMPAIGNCUE_CUE_LAYER_JOB_OUTCOMES", "CampaignCue CueLayers outcome constants");
  assertIncludes(cueLayers, "CAMPAIGNCUE_CUE_LAYER_PROCESSING_STEPS", "CampaignCue CueLayers step constants");
  assertIncludes(cueLayers, "CAMPAIGNCUE_CUE_LAYER_ALLOWED_EDITOR_ELEMENT_TYPES", "CampaignCue CueLayers renderer allowlist constants");
  assertIncludes(cueLayers, "CAMPAIGNCUE_CUE_LAYER_MODEL_CAPABILITIES", "CampaignCue CueLayers model capability constants");
  assertIncludes(designCue, "CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS", "CampaignCue Design Cue action constants");
  assertIncludes(designCue, "CAMPAIGNCUE_DESIGN_CUE_COMMANDS", "CampaignCue Design Cue command constants");
  assertIncludes(designCue, "CAMPAIGNCUE_DESIGN_CUE_ALLOWED_LAYER_PATCH_KEYS", "CampaignCue Design Cue patch allowlist constants");
  assertIncludes(delivery, "CAMPAIGNCUE_EXPORT_ACTIONS", "CampaignCue export action constants");
  assertIncludes(delivery, "CAMPAIGNCUE_DISABLED_PROVIDER_ACTIONS", "CampaignCue disabled provider action constants");
  assertIncludes(delivery, "CAMPAIGNCUE_FUTURE_PROVIDER_LAYER", "CampaignCue future provider layer constants");
    assertIncludes(domains, "isCampaignCueRuntimeRoute", "CampaignCue runtime route helper");
    assertIncludes(domains, "CAMPAIGNCUE_APP_INTERNAL_BASE_PATH", "CampaignCue app route-group base path constant");
    assertIncludes(domains, "CAMPAIGNCUE_APP_INTERNAL_WORKSPACE_PATH", "CampaignCue app workspace route-group path constant");
    assertIncludes(domains, "getCampaignCueWorkspaceRewritePath", "CampaignCue product-domain workspace rewrite helper");
    assertIncludes(domains, "startsWith(`${CAMPAIGNCUE_WORKSPACE_PATH}/`)", "CampaignCue workspace rewrite supports deep-link subpaths");
  assertIncludes(routes, "CAMPAIGNCUE_API_ROUTES", "CampaignCue API route constants");
  assertIncludes(routes, "CAMPAIGN_ACTION_TEMPLATE", "CampaignCue action route template");
  assertIncludes(routes, "CUE_LAYERS_UPLOADS", "CampaignCue CueLayers upload route constant");
  assertIncludes(routes, "DESIGN_CUE_TURNS", "CampaignCue Design Cue route constant");
  assertIncludes(routes, "getCampaignCueAssetDownloadApiPath", "CampaignCue asset download route helper");
  assertIncludes(routes, "getCampaignCueCueLayersBootApiPath", "CampaignCue CueLayers boot route helper");
  assertIncludes(firebase, "CAMPAIGNCUE_FIREBASE_ENV", "CampaignCue Firebase env constants");
  assertIncludes(navigations, "CAMPAIGNCUE_WORKSPACE_TABS", "CampaignCue workspace navigation constants");
  assertIncludes(navigations, "Daily desk", "CampaignCue workspace navigation names the owner daily desk");
  assertIncludes(workspace, "CAMPAIGNCUE_CHANNEL_STUDIO_COPY", "CampaignCue workspace copy constants");
  assertIncludes(read("src/constants/campaigncue/index.ts"), "dailyDesk", "CampaignCue barrel exports product-scoped Daily Desk constants");
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
  assertNotIncludes(read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx"), '"/api/campaigncue/cue-layers', "CampaignCue CueLayers UI avoids hardcoded API paths");
  assertNotIncludes(read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx"), '"/__campaigncue"', "CampaignCue workspace avoids hardcoded local public path");
}

function verifyRouteBoundary() {
  const middleware = read("src/middleware.ts");
  const productDomains = read("src/constants/productDomains.ts");
  const routingDoc = read("__docs__/url-routing-architecture/README.md");
  const boundaryDoc = read("__docs__/campaigncue/campaigncue-route-boundary.md");
  const nextConfig = read("next.config.js");
  const campaignCueRouteStart = middleware.indexOf("if (productConfig.id === 'campaigncue')");
  const campaignCueRouteEnd = middleware.indexOf("const campaignCueWorkspacePath", campaignCueRouteStart);
  const campaignCueRouteBlock = campaignCueRouteStart > -1 && campaignCueRouteEnd > campaignCueRouteStart
    ? middleware.slice(campaignCueRouteStart, campaignCueRouteEnd)
    : "";

  assert(exists("src/app/sites/campaigncue/page.tsx"), "CampaignCue public site page exists under sites");
  assert(exists("src/app/sites/campaigncue/layout.tsx"), "CampaignCue public site layout exists under sites");
  assert(exists("src/app/(campaigncue)/layout.tsx"), "CampaignCue owner route-group layout exists");
  assert(exists("src/app/(campaigncue)/campaigncue/page.tsx"), "CampaignCue owner route-group base page exists");
  assert(exists("src/app/(campaigncue)/campaigncue/app/page.tsx"), "CampaignCue owner workspace page exists outside sites");
  assert(!exists("src/app/sites/campaigncue/app"), "CampaignCue owner app is not under public sites folder");
  assert(!exists("src/app/sites/campaigncue/app/page.tsx"), "CampaignCue old sites app page removed");

  assertIncludes(middleware, "getCampaignCueWorkspaceRewritePath(pathname)", "CampaignCue product-domain /app rewrite");
  assertIncludes(middleware, "productConfig.id === 'campaigncue'", "CampaignCue product-domain route special case");
  assertIncludes(campaignCueRouteBlock, "shouldBypassDomainRouting(pathname)", "CampaignCue product domain preserves API/internal bypass routes");
  assertIncludes(campaignCueRouteBlock, "NextResponse.next()", "CampaignCue product domain bypass routes pass through without site rewrite");
  assertIncludes(middleware, "getCampaignCueWorkspaceRewritePath(strippedPath)", "CampaignCue local dev /__campaigncue/app rewrite");
  assertIncludes(productDomains, "Public product websites belong under src/app/sites/[productId]", "Product domain route-boundary comment");
  assertIncludes(routingDoc, "Product Site Vs Product App Routes", "Global routing doc product site/app boundary");
  assertIncludes(routingDoc, "`src/app/sites/[productId]` is public website only", "Global routing doc sites public-only rule");
  assertIncludes(boundaryDoc, "`src/app/sites/campaigncue` is public website only", "CampaignCue route-boundary public-only rule");
  assertIncludes(boundaryDoc, "`/api/*` and other internal bypass paths pass through before CampaignCue product-domain rewrites", "CampaignCue route-boundary API bypass rule");
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
  const coverageAudit = read("__docs__/campaigncue/campaigncue_chatgpt-coverage-audit.md");
  const outputPackReadme = read("__docs__/campaigncue/campaign-pack-output-system/README.md");
  const outputPackSpec = read("__docs__/campaigncue/campaign-pack-output-system/campaign-pack-output-system_spec.md");
  const outputPackImpl = read("__docs__/campaigncue/campaign-pack-output-system/campaign-pack-output-system_impl.md");
  const cueLayersReadme = read("__docs__/campaigncue/cue-layers/README.md");
  const cueLayersImpl = read("__docs__/campaigncue/cue-layers/cue-layers_impl.md");
  const cueLayersFirebase = read("__docs__/campaigncue/cue-layers/cue-layers_firebase.md");
  const cueLayersValidation = read("__docs__/campaigncue/cue-layers/cue-layers_validation.md");
  const designCueReadme = read("__docs__/campaigncue/design-cue/README.md");
  const designCueImpl = read("__docs__/campaigncue/design-cue/design-cue_impl.md");
  const designCueFirebase = read("__docs__/campaigncue/design-cue/design-cue_firebase.md");
  const designCueValidation = read("__docs__/campaigncue/design-cue/design-cue_validation.md");
  const publicSite = read("src/app/sites/campaigncue/page.tsx");
  const websiteDoc = read("__docs__/campaigncue/campaigncue-product/campaigncue-product_website.md");
  const changelog = read("__docs__/CHANGELOG.md");

  assertIncludes(publicSite, "Print and staff pack", "CampaignCue public site exposes print and staff pack output");
  assertIncludes(publicSite, "Email, SMS, and QR brief", "CampaignCue public site exposes email/SMS/QR handoff output");
  assertIncludes(publicSite, "CampaignCueCatalog", "CampaignCue public site exposes Seesaw-inspired pack index");
  assertIncludes(publicSite, "Pack index", "CampaignCue public site labels the pack index");
  assertIncludes(publicSite, "No direct post", "CampaignCue pack index preserves export-first boundary");
  assertIncludes(publicSite, "Do owners only get social posts?", "CampaignCue public FAQ rejects social-only positioning");
  assertIncludes(publicSite, "campaigncue-output-ledger", "CampaignCue public site uses output ledger instead of output cards");
  assertIncludes(publicSite, "campaigncue-real-work-ledger", "CampaignCue public site uses proof ledger instead of proof cards");
  assertIncludes(publicSite, "campaigncue-owner-path-intro", "CampaignCue public site uses connected owner path intro");
  assertIncludes(publicSite, "campaigncue-capability-ledger", "CampaignCue public site uses capability ledger");
  assertNotIncludes(publicSite, "campaigncue-card-grid", "CampaignCue public site avoids generic card grid class");
  assertNotIncludes(publicSite, "campaigncue-output-grid", "CampaignCue public site avoids old output grid class");
  assertIncludes(websiteDoc, "print/staff", "CampaignCue website doc lists print/staff output ledger item");
  assertIncludes(websiteDoc, "email/SMS/QR", "CampaignCue website doc lists email/SMS/QR output ledger item");
  assertIncludes(websiteDoc, "Pack index", "CampaignCue website doc lists pack index section");
  assertIncludes(websiteDoc, "Seesaw", "CampaignCue website doc captures Seesaw reference decision");
  assertIncludes(websiteDoc, "Blank", "CampaignCue website doc captures Blank production-polish reference");
  assertIncludes(websiteDoc, "Ploy", "CampaignCue website doc captures Ploy proof/activity reference");
  assertIncludes(websiteDoc, "Linear", "CampaignCue website doc captures Linear editorial rhythm reference");
  assertIncludes(websiteDoc, "Genie Studio", "CampaignCue website doc captures Genie creative-tool reference");
  assertIncludes(websiteDoc, "ledgers instead of repeated card grids", "CampaignCue website doc preserves anti-card-grid layout rule");
  assertIncludes(websiteDoc, "collage", "CampaignCue website doc preserves anti-collage design guardrail");
  assertIncludes(websiteDoc, "Do owners only get social posts?", "CampaignCue website doc FAQ covers full output pack");
  assertIncludes(audit, "CAMPAIGNCUE_FIREBASE_UNAVAILABLE", "CampaignCue audit setup-blocked code");
  assertIncludes(audit, "src/app/(campaigncue)/campaigncue/app", "CampaignCue audit owner route-group path");
  assertIncludes(validation, "CAMPAIGNCUE_FIREBASE_UNAVAILABLE", "CampaignCue validation setup-blocked code");
  assertIncludes(validation, "rewrites to `/campaigncue/app`", "CampaignCue validation workspace rewrite path");
  assertIncludes(apiDoc, "CAMPAIGNCUE_FIREBASE_UNAVAILABLE", "CampaignCue API doc setup-blocked code");
  assertIncludes(readme, "campaigncue-route-boundary.md", "CampaignCue README route-boundary link");
  assertIncludes(readme, "campaigncue-next-expansion-list.md", "CampaignCue README next expansion link");
  assertIncludes(readme, "campaigncue-delivery-boundary.md", "CampaignCue README delivery-boundary link");
  assertIncludes(readme, "Safe upload spine is implemented", "CampaignCue README reflects implemented CueLayers safe upload spine");
  assertIncludes(coverageAudit, "Later Product Corrections Still Aligned", "CampaignCue ChatGPT coverage audit includes later product correction alignment");
  assertIncludes(coverageAudit, "open supported assets in the shared Creative Editor", "CampaignCue ChatGPT coverage audit reflects current editor runtime");
  assertIncludes(coverageAudit, "Provider-rendered PNG/JPG banner generation", "CampaignCue ChatGPT coverage audit avoids claiming visual editor is inactive");
  assertIncludes(coverageAudit, "Local-language variants", "CampaignCue ChatGPT coverage audit covers original local-language requirement");
  assertIncludes(outputPackReadme, "language handoff note with preferred locale", "Campaign Pack docs list language handoff output");
  assertIncludes(outputPackSpec, "No automatic translation claim", "Campaign Pack spec preserves safe language boundary");
  assertIncludes(outputPackImpl, "instructions/language-handoff.txt", "Campaign Pack impl documents language handoff ZIP file");
  assertIncludes(expansionDoc, "Provider adapters behind capability checks", "CampaignCue next expansion provider gate");
  assertIncludes(deliveryDoc, "CampaignCue day-one delivery is export/download only", "CampaignCue delivery-boundary day-one rule");
  assertIncludes(deliveryDoc, "/api/campaigncue/integrations` is read-only", "CampaignCue delivery-boundary read-only integrations rule");
  assertIncludes(deliveryDoc, "Clipboard copy is not an active API action", "CampaignCue delivery-boundary clipboard-copy exclusion");
  assertNotIncludes(deliveryDoc, "copy a single output", "CampaignCue delivery-boundary excludes stale copy action");
  assertIncludes(audit, "Main Gap Fix Pass", "CampaignCue audit documents main gap pass");
  assertIncludes(audit, "Delivery Boundary Pass", "CampaignCue audit documents delivery boundary pass");
  assertIncludes(changelog, "CampaignCue Main Gap Hardening", "CampaignCue changelog main gap entry");
  assertIncludes(changelog, "CampaignCue Export Delivery Boundary", "CampaignCue changelog delivery boundary entry");
  assertIncludes(boundaryDoc, "Do not add owner dashboard pages under `src/app/sites/campaigncue`", "CampaignCue route-boundary guardrail");
  assertIncludes(changelog, "CampaignCue Route Boundary Alignment", "CampaignCue changelog route-boundary entry");
  assertIncludes(changelog, "CampaignCue setup-blocked state added", "CampaignCue changelog setup-blocked entry");
  assertIncludes(cueLayersReadme, "Safe upload spine implemented", "CueLayers README implemented status");
  assertIncludes(cueLayersReadme, "Provider-driven decomposition remains gated", "CueLayers README provider gate");
  assertIncludes(cueLayersReadme, "SVG/JSON browser exports are disabled", "CueLayers README documents browser export lock");
  assertIncludes(cueLayersImpl, "Flat-safe projection", "CueLayers implementation doc current scope");
  assertIncludes(cueLayersImpl, "Not implemented as active runtime yet", "CueLayers implementation doc gated scope");
  assertIncludes(cueLayersFirebase, "Safe upload spine implemented", "CueLayers Firebase doc implemented status");
  assertIncludes(cueLayersValidation, "Safe upload spine is implementation-ready", "CueLayers validation verdict");
  assertIncludes(cueLayersValidation, "Provider-driven editable decomposition is not active", "CueLayers validation provider boundary");
  assertIncludes(cueLayersValidation, "browser SVG/JSON exports are disabled", "CueLayers validation documents browser export lock");
  assertIncludes(changelog, "CampaignCue CueLayers Safe Upload Spine", "CampaignCue changelog CueLayers implementation entry");
  assertIncludes(designCueReadme, "The current CampaignCue editor renders Design Cue", "Design Cue README implemented status");
  assertIncludes(designCueImpl, "Implemented File Map", "Design Cue implementation file map");
  assertIncludes(designCueFirebase, "guarded route fails closed while model assist is disabled", "Design Cue Firebase fail-closed model route");
  assertIncludes(designCueValidation, "Design Cue deterministic patch flow is implementation-ready", "Design Cue validation verdict");
  assertIncludes(designCueValidation, "Provider-backed model assistance is not active", "Design Cue validation model boundary");
  assertIncludes(changelog, "CampaignCue Design Cue Deterministic Assistant", "CampaignCue changelog Design Cue entry");
}

function verifyRequiredFiles() {
  [
    "src/types/campaigncue.ts",
    "src/lib/validation/campaigncueSchemas.ts",
    "src/lib/campaigncue/apiGuards.ts",
    "src/lib/campaigncue/server.ts",
    "src/lib/campaigncue/cue-layers/server.ts",
    "src/types/campaigncueCueLayers.ts",
    "src/lib/validation/campaigncueCueLayersSchemas.ts",
    "src/app/sites/campaigncue/page.tsx",
    "src/app/(campaigncue)/campaigncue/app/page.tsx",
    "src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx",
    "__docs__/campaigncue/campaigncue-delivery-boundary.md",
    "__docs__/campaigncue/campaigncue-production-implementation-audit.md",
    "__docs__/campaigncue/cue-layers/cue-layers_validation.md",
    "__docs__/campaigncue/design-cue/design-cue_validation.md",
  ].forEach((relPath) => assert(exists(relPath), `${relPath} exists`));
}

verifyRequiredFiles();
verifyProductConstantSeparation();
verifyRouteBoundary();
verifyFeatureFlags();
verifyApiRoutes();
verifyServerRuntime();
verifyClientRuntime();
verifySharedCreativeEditor();
verifyFirebaseBoundary();
verifyDocsAlignment();

console.log(`CampaignCue runtime verification passed (${checks.length} checks).`);
