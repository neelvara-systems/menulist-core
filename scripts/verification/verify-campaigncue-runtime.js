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
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_AI_ASSISTANCE_PLAN: true", "CampaignCue AI assistance plan flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_AI_PROVIDER_CALLS: false", "CampaignCue AI provider-call gate");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_CAMPAIGN_INBOX: true", "CampaignCue Campaign Inbox deterministic surface flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_CAMPAIGN_INBOX_MODEL_ASSIST: false", "CampaignCue Campaign Inbox model assist gate");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_CAMPAIGN_MEMORY: true", "CampaignCue Campaign Memory deterministic summary flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_WINNING_PACK_REFRESH: true", "CampaignCue Winning Pack Refresh flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_VERTICAL_PLAYBOOKS: true", "CampaignCue Vertical Campaign Playbooks flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_HOSTED_OFFER_PAGES: true", "CampaignCue Hosted Offer Page flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_EXPERIMENT_COACH: true", "CampaignCue Experiment Coach flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_LOCAL_VISIBILITY_ACTION_CENTER: true", "CampaignCue Local Visibility Action Center flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_APPROVAL_COMMENT_INBOX: true", "CampaignCue Approval and Comment Inbox flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_MULTI_LOCATION_VARIANTS: true", "CampaignCue multi-location variants flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_READ_ONLY_RESULT_EVIDENCE: true", "CampaignCue read-only result evidence flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_CLOUD_EXPORT_ARCHIVE: true", "CampaignCue durable cloud export archive flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_PATTERN_CUE: true", "CampaignCue Pattern Cue deterministic surface flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_PATTERN_CUE_MODEL_ASSIST: false", "CampaignCue Pattern Cue model assist gate");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_VIDEO_STUDIO: true", "CampaignCue Video Reel Studio flag");
  assertIncludes(flags, "ENABLE_CAMPAIGNCUE_IN_HOUSE_VIDEO_RENDER: true", "CampaignCue in-house video compositor flag");
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
    "src/app/api/campaigncue/campaigns/variants/route.ts",
    "src/app/api/campaigncue/campaigns/[campaignId]/actions/route.ts",
    "src/app/api/campaigncue/campaigns/[campaignId]/export-archive/route.ts",
    "src/app/api/campaigncue/campaigns/[campaignId]/offer-page/route.ts",
    "src/app/api/campaigncue/assets/route.ts",
    "src/app/api/campaigncue/assets/[assetId]/preview/route.ts",
    "src/app/api/campaigncue/analytics/route.ts",
    "src/app/api/campaigncue/design-cue/turns/route.ts",
    "src/app/api/campaigncue/sources/route.ts",
    "src/app/api/campaigncue/integrations/route.ts",
    "src/app/api/campaigncue/locations/route.ts",
    "src/app/api/campaigncue/video-projects/route.ts",
    "src/app/api/campaigncue/firebase-token/route.ts",
  ];

  for (const relPath of routeFiles) {
    const content = read(relPath);
    assertIncludes(content, "withCampaignCueAuth", relPath);
    assertIncludes(content, "requireCampaignCueRuntime", relPath);
    assertIncludes(content, "requireCampaignCueSessionScope", relPath);
    assertIncludes(content, "applyCampaignCueRateLimit", relPath);
    assertIncludes(content, "buildCampaignCueApiError", relPath);
  }

  assertIncludes(read("src/app/api/campaigncue/workspace/route.ts"), "CampaignCueBusinessPatchSchema", "workspace PATCH validation");
  assertIncludes(read("src/app/api/campaigncue/campaigns/route.ts"), "CampaignCueCreateCampaignSchema", "campaign create validation");
  const campaignCueSchemas = read("src/lib/validation/campaigncueSchemas.ts");
  assertOccurrenceCount(campaignCueSchemas, "idempotencyKey: z.string().trim().regex(idPattern).min(8).max(120),", 8, "all eight CampaignCue mutation schemas require idempotency keys");
  assertNotIncludes(campaignCueSchemas, "idempotencyKey: z.string().trim().regex(idPattern).min(8).max(120).optional()", "campaign mutation idempotency cannot be omitted");
  assertNotIncludes(read("src/lib/validation/campaigncueCueLayersSchemas.ts"), "idempotencyKey: z.string().trim().regex(idPattern).min(8).max(120).optional()", "CueLayers mutation idempotency cannot be omitted");
  assertIncludes(read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx"), "mutationIdempotencyKeysRef", "CampaignCue browser retains retry identities across ambiguous responses");
  assertIncludes(read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx"), "isCampaignCueMutationOutcomeAuthoritative", "CampaignCue browser classifies authoritative mutation responses");
  assertIncludes(read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx"), "result.code !== CAMPAIGNCUE_ERROR_CODES.IDEMPOTENCY_CONFLICT", "CampaignCue browser retains active-conflict retry identities");
  assertIncludes(read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx"), "settleMutationIdempotencyKey(requestFingerprint, payload)", "CampaignCue browser retires retry identities only after classified responses");
  for (const action of ["asset_create", "business_patch", "campaign_inbox_confirm", "location_create", "location_variants", "source_input_create"]) {
    assertIncludes(
      read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx"),
      `getMutationIdempotencyKey("${action}"`,
      `CampaignCue browser retains ${action} retry identity`,
    );
  }
  assertIncludes(read("src/app/api/campaigncue/campaigns/[campaignId]/actions/route.ts"), "CampaignCueCampaignActionSchema", "campaign action validation");
  assertIncludes(read("src/app/api/campaigncue/campaigns/[campaignId]/actions/route.ts"), "CampaignCueIdSchema", "campaign id validation");
  const exportArchiveRoute = read("src/app/api/campaigncue/campaigns/[campaignId]/export-archive/route.ts");
  assertIncludes(exportArchiveRoute, "CampaignCueExportArchivePrepareSchema", "export archive prepare validation");
  assertIncludes(exportArchiveRoute, "prepareCampaignCueExportArchiveUploadServer", "export archive protected server handoff");
  assertIncludes(exportArchiveRoute, 'feature: "FILE_UPLOAD"', "export archive upload rate limit");
  assertIncludes(exportArchiveRoute, "logCampaignCueInputValidationFailure", "export archive validation uses bounded security logging");
  assertNotIncludes(exportArchiveRoute, "details }, { status: 400", "export archive validation response stays generic");
  const offerPageRoute = read("src/app/api/campaigncue/campaigns/[campaignId]/offer-page/route.ts");
  const offerPageServer = read("src/lib/campaigncue/offerPageServer.ts");
  const offerPagePublic = read("src/app/sites/campaigncue/offer/[slug]/page.tsx");
  assertIncludes(offerPageRoute, "CampaignCueOfferPageMutationSchema", "hosted offer page mutation validation");
  assertIncludes(offerPageServer, "db.runTransaction", "hosted offer page atomic publish transaction");
  assertIncludes(offerPageServer, "evaluateCampaignCuePackFreshness", "hosted offer page current-truth recheck");
  assertIncludes(offerPageServer, "unstable_cache", "hosted offer page bounded public cache");
  assertIncludes(offerPageServer, "revalidateTag", "hosted offer page mutation cache invalidation");
  assertIncludes(offerPagePublic, "index: false", "hosted offer page noindex metadata");
  assertNotIncludes(offerPagePublic, "publishedBy", "hosted offer page hides publisher identity");
  assertIncludes(read("src/app/api/campaigncue/assets/route.ts"), "CampaignCueAssetSchema", "asset validation");
  const sourcesRoute = read("src/app/api/campaigncue/sources/route.ts");
  assertIncludes(sourcesRoute, "CampaignCueSourceInputSchema", "source input validation");
  assertIncludes(sourcesRoute, "CampaignCueInboxConfirmSchema", "Campaign Inbox batch validation");
  assertIncludes(sourcesRoute, "createCampaignCueInboxSourcesServer", "Campaign Inbox uses guarded source batch persistence");
  assertIncludes(sourcesRoute, "ENABLE_CAMPAIGNCUE_SOURCE_INTEGRATIONS", "Campaign source reads and writes honor their module gate");
  assertIncludes(read("src/lib/campaigncue/server.ts"), "campaign_inbox_confirmed", "Campaign Inbox writes one aggregate audit event");
  assertIncludes(read("src/lib/campaigncue/server.ts"), ").slice(0, 120)", "Campaign Inbox source snapshot references remain bounded");
  assertIncludes(read("src/lib/campaigncue/server.ts"), "factsById.size >= 200", "Campaign Inbox source snapshot facts remain bounded");
  const campaignMemory = read("src/lib/campaigncue/campaignMemory.ts");
  const campaignCueServer = read("src/lib/campaigncue/server.ts");
  const campaignCueWorkspace = read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx");
  assertIncludes(campaignMemory, "if (!recipeId) return new Set<string>()", "Campaign Memory missing recipe fails closed");
  assertIncludes(campaignMemory, "recipe?.resultOptions || []", "Campaign Memory unknown recipe fails closed");
  assertIncludes(campaignCueServer, "isCampaignCueResultSignalAllowed", "Campaign Memory validates result options against the campaign recipe");
  assertIncludes(campaignCueServer, "transaction.get(summaryRef)", "Campaign Memory reads the summary inside the outcome transaction");
  assertIncludes(campaignCueServer, "evidenceNotePresent", "Campaign Memory event stores bounded note metadata");
  assertNotIncludes(campaignCueServer, 'note: params.input.note || "Owner reported a result."', "Campaign Memory event does not duplicate the raw owner note");
  assertIncludes(campaignCueWorkspace, "Campaign memory", "Campaign Memory owner panel is rendered");
  assertIncludes(campaignCueWorkspace, "data.campaignMemory.sourceLabel", "Campaign Memory owner UI discloses evidence source");
  const designCueRoute = read("src/app/api/campaigncue/design-cue/turns/route.ts");
  assertIncludes(designCueRoute, "CampaignCueDesignCueTurnSchema", "Design Cue model route input validation");
  assertIncludes(designCueRoute, "ENABLE_CAMPAIGNCUE_DESIGN_CUE_MODEL_ASSIST", "Design Cue model route provider gate");
  assertIncludes(designCueRoute, "feature: \"AI_OPERATION\"", "Design Cue model route AI rate limit");
  assertIncludes(designCueRoute, "programmatic_required", "Design Cue model route fails closed to deterministic path");
  assertIncludes(designCueRoute, "Invalid JSON", "Design Cue model route returns safe invalid JSON response");
  assertIncludes(designCueRoute, "getCampaignCueSecurityLogContext", "Design Cue model route uses bounded security log context");
  assertIncludes(designCueRoute, 'getBoundedSecurityStringContext("validationError", validation.error)', "Design Cue validation log bounds validation detail");
  assertNotIncludes(designCueRoute, "buildSecurityContext", "Design Cue model route must not spread raw security context");
  assertNotIncludes(designCueRoute, "error: validation.error", "Design Cue model route must not log raw validation errors");
  assertNotIncludes(read("src/app/api/campaigncue/integrations/route.ts"), "export const POST", "CampaignCue integrations route is read-only in export runtime");
  assertIncludes(read("src/app/api/campaigncue/integrations/route.ts"), "ENABLE_CAMPAIGNCUE_SOURCE_INTEGRATIONS", "Campaign source connections honor their module gate");
  assertIncludes(read("src/app/api/campaigncue/locations/route.ts"), "CampaignCueLocationSchema", "location validation");
  assertIncludes(read("src/app/api/campaigncue/campaigns/variants/route.ts"), "CampaignCueLocationVariantBatchSchema", "location variant validation");
  assertIncludes(read("src/lib/campaigncue/server.ts"), "createCampaignCueLocationVariantsServer", "location variant bounded batch persistence");
  assertIncludes(read("src/lib/campaigncue/offerPageServer.ts"), "buildCampaignCueLocationSourceHash", "location-aware hosted-page freshness");
  assertIncludes(read("src/app/api/campaigncue/campaigns/route.ts"), "listCampaignCueCampaignsServer", "campaign list direct bounded loader");
  assertIncludes(read("src/app/api/campaigncue/assets/route.ts"), "listCampaignCueAssetsServer", "asset list direct bounded loader");
  assertIncludes(read("src/app/api/campaigncue/sources/route.ts"), "listCampaignCueSourceInputsServer", "source list direct bounded loader");
  assertIncludes(read("src/app/api/campaigncue/integrations/route.ts"), "listCampaignCueProviderConnectionsServer", "integration posture direct bounded loader");
  assertIncludes(read("src/app/api/campaigncue/locations/route.ts"), "listCampaignCueLocationsServer", "location list direct bounded loader");
  assertIncludes(read("src/app/api/campaigncue/analytics/route.ts"), "readCampaignCueAnalyticsServer", "analytics summary direct loader");
  assertIncludes(read("src/app/api/campaigncue/analytics/route.ts"), "ENABLE_CAMPAIGNCUE_ANALYTICS", "Campaign result analytics honor their module gate");
  assertIncludes(read("src/app/api/campaigncue/campaigns/route.ts"), "ENABLE_CAMPAIGNCUE_GENERATION", "Campaign pack creation honors its module gate");
  assertIncludes(read("src/app/api/campaigncue/campaigns/variants/route.ts"), "ENABLE_CAMPAIGNCUE_GENERATION", "Branch pack creation honors the generation gate");
  const videoProjectsRoute = read("src/app/api/campaigncue/video-projects/route.ts");
  assertIncludes(videoProjectsRoute, "CampaignCueVideoProjectMutationSchema", "video project mutation validation");
  assertIncludes(videoProjectsRoute, "listCampaignCueVideoProjectsServer", "video project direct bounded loader");
  assertIncludes(videoProjectsRoute, "requireCampaignCueFeature", "video project API fails closed when its module is disabled");
  assertIncludes(videoProjectsRoute, "logCampaignCueInputValidationFailure", "video project validation failures use bounded security logging");
  assertNotIncludes(videoProjectsRoute, "details }, { status: 400", "video project validation response stays generic");
  const firebaseTokenRoute = read("src/app/api/campaigncue/firebase-token/route.ts");
  assertIncludes(firebaseTokenRoute, 'validation.data.purpose === "media_upload"', "private Firebase sessions choose the limiter from their validated purpose");
  assertIncludes(firebaseTokenRoute, "CampaignCueFirebaseSessionAuthorizationSchema", "private Firebase session purpose and media scope are runtime validated");
  assertIncludes(firebaseTokenRoute, "ENABLE_CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY", "template Firebase sessions fail closed with the template registry flag");
  assertIncludes(firebaseTokenRoute, "logCampaignCueInputValidationFailure", "invalid private Firebase authorization requests use bounded security logging");
  assertIncludes(firebaseTokenRoute, "createCampaignCueFirebaseTokenServer", "private Firebase tokens are minted only after session-scope admission and rate limiting");
  const firebaseTokenServer = read("src/lib/campaigncue/server.ts");
  assertIncludes(firebaseTokenServer, "firebasePurpose: authorization.purpose", "private Firebase custom claims carry only the admitted operation purpose");
  assertIncludes(firebaseTokenServer, "mediaUploadId: authorization.uploadId", "media custom claims are bound to one upload folder");
  assertIncludes(firebaseTokenServer, "mediaSourceFileName: authorization.sourceFileName", "media custom claims are bound to one source object name");
  const firebaseSessionClient = read("src/lib/campaigncue/firebaseSessionClient.ts");
  assertIncludes(firebaseSessionClient, "withCampaignCueFirebaseSession", "CampaignCue direct Firebase operations use one scoped session wrapper");
  assertIncludes(firebaseSessionClient, "inMemoryPersistence", "CampaignCue direct Firebase credentials are not persisted to browser storage");
  assertIncludes(firebaseSessionClient, "activeOperations", "concurrent CampaignCue Firebase operations cannot sign each other out");
  assertIncludes(firebaseSessionClient, "authorizationKey", "concurrent CampaignCue Firebase operations cannot share a broader-purpose credential");
  assertIncludes(firebaseSessionClient, "sourceFileName", "media sessions verify the exact admitted source filename");
  assertIncludes(firebaseSessionClient, "await releaseSession()", "CampaignCue direct Firebase sessions close after the last operation");
  const assetPreviewRoute = read("src/app/api/campaigncue/assets/[assetId]/preview/route.ts");
  assertIncludes(assetPreviewRoute, "CampaignCueIdSchema", "private media preview validates the scoped asset id");
  const assetUploadClient = read("src/lib/campaigncue/assetUploadClient.ts");
  assertIncludes(assetUploadClient, "parseCampaignCueAssetRecord", "private upload response passes through the asset DTO boundary");
  assertIncludes(assetUploadClient, "workspaceId: params.workspaceId", "private upload response is bound to the active workspace");
  assertIncludes(assetUploadClient, "withCampaignCueFirebaseSession", "private uploads share the scoped CampaignCue Firebase session boundary");
  assertNotIncludes(assetUploadClient, "signInWithCustomToken", "private uploads cannot maintain a second Firebase auth lifecycle");
  assertNotIncludes(assetUploadClient, "return asset as CampaignCueAsset", "private upload response cannot bypass runtime validation with a cast");
  assertNotIncludes(read("src/lib/firebase/campaigncueFirebaseClient.ts"), "null as unknown as", "optional CampaignCue Firebase clients retain honest nullable types");
  assertIncludes(read("src/lib/campaigncue/apiGuards.ts"), "failClosedOnProviderError: true", "CampaignCue rate limiter fails closed on provider uncertainty");
  assertIncludes(read("src/lib/campaigncue/apiGuards.ts"), 'rateLimit.reason === "provider_unavailable"', "CampaignCue limiter separates provider outage from quota exhaustion");
  assertIncludes(read("src/lib/campaigncue/apiGuards.ts"), '"Rate Limit Provider Unavailable - CampaignCue"', "CampaignCue limiter outages are not mislabeled as owner quota exhaustion");
  assertIncludes(read("src/lib/campaigncue/apiGuards.ts"), "withCampaignCuePrivateResponseHeaders", "CampaignCue protected response policy helper");
  assertIncludes(read("src/lib/campaigncue/apiGuards.ts"), '"Cache-Control": "private, no-store, max-age=0"', "CampaignCue protected responses are not storable");
  assertNotIncludes(read("src/lib/campaigncue/apiGuards.ts"), "session: any", "CampaignCue API guard session boundaries retain runtime types");
  for (const routePath of routeFiles) {
    const route = read(routePath);
    assertIncludes(route, "withCampaignCueAuth", `${routePath} uses the product-wide protected response wrapper`);
    assertNotIncludes(route, "withAuth", `${routePath} cannot bypass the CampaignCue protected response wrapper`);
  }

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
    assertIncludes(content, "withCampaignCueAuth", relPath);
    assertIncludes(content, "requireCampaignCueRuntime", relPath);
    assertIncludes(content, "requireCampaignCueFeature", `${relPath} fails closed when CueLayers is disabled`);
    assertIncludes(content, "requireCampaignCueSessionScope", relPath);
    assertIncludes(content, "applyCampaignCueRateLimit", relPath);
    assertIncludes(content, "buildCampaignCueCueLayersApiError", relPath);
  }
  assertIncludes(read("src/app/api/campaigncue/cue-layers/uploads/route.ts"), "CampaignCueCueLayerUploadSchema", "CueLayers upload schema validation");
  assertIncludes(read("src/app/api/campaigncue/cue-layers/designs/[designId]/autosave/route.ts"), "CampaignCueCueLayerAutosaveSchema", "CueLayers autosave schema validation");
  assertIncludes(read("src/app/api/campaigncue/cue-layers/designs/[designId]/repair/route.ts"), "CampaignCueCueLayerRepairSchema", "CueLayers repair schema validation");
  assertIncludes(read("src/app/api/campaigncue/cue-layers/designs/[designId]/exports/route.ts"), "CampaignCueCueLayerExportSchema", "CueLayers export schema validation");
  const assetDownloadRoute = read("src/app/api/campaigncue/assets/[assetId]/download/route.ts");
  assertIncludes(assetDownloadRoute, "withCampaignCueAuth", "CampaignCue asset download route protected auth response policy");
  assertIncludes(assetDownloadRoute, "requireCampaignCueRuntime", "CampaignCue asset download route runtime guard");
  assertIncludes(assetDownloadRoute, "requireCampaignCueSessionScope", "CampaignCue asset download route scope guard");
  assertIncludes(assetDownloadRoute, "applyCampaignCueRateLimit", "CampaignCue asset download route rate limit");
  assertIncludes(assetDownloadRoute, "createCampaignCueAssetDownloadServer", "CampaignCue asset download server handoff");
  assertIncludes(assetDownloadRoute, "logCampaignCueInputValidationFailure", "CampaignCue asset download validation uses bounded security logging");
  assertIncludes(assetDownloadRoute, "CAMPAIGNCUE_API_ROUTES.ASSET_DOWNLOAD_TEMPLATE", "CampaignCue asset download logs use the static route template");
  assertNotIncludes(assetDownloadRoute, "details }, { status: 400", "CampaignCue asset download validation response stays generic");

  const apiGuards = read("src/lib/campaigncue/apiGuards.ts");
  assertIncludes(apiGuards, "requireCampaignCueFeature", "CampaignCue routes share one fail-closed module gate helper");
  assertIncludes(apiGuards, "parseCampaignCueJsonBody", "CampaignCue shared invalid JSON parser");
  assertIncludes(apiGuards, "resolveCampaignCueSessionIdentity", "CampaignCue session guard requires exact agreeing numeric tenant/store/user aliases");
  assertIncludes(apiGuards, "readBoundedJsonBody", "CampaignCue shared parser uses bounded JSON body reader");
  assertIncludes(apiGuards, "CAMPAIGNCUE_JSON_BODY_MAX_BYTES", "CampaignCue shared parser declares a body cap");
  assertIncludes(apiGuards, "Invalid JSON - CampaignCue API", "CampaignCue invalid JSON security log");
  assertIncludes(apiGuards, 'invalidJsonMessage: "Invalid JSON"', "CampaignCue malformed JSON response stays generic");
  assertNotIncludes(apiGuards, "params.request.json()", "CampaignCue shared parser must not parse unbounded JSON");
  assertIncludes(apiGuards, "getBoundedSecurityRouteContext", "CampaignCue API guard bounded route context");
  assertIncludes(apiGuards, "getCampaignCueSecurityLogContext", "CampaignCue API guard bounded security log context");
  assertIncludes(apiGuards, 'getBoundedSecurityStringContext("endpoint", endpoint)', "CampaignCue API guard bounded endpoint metadata");
  assertIncludes(apiGuards, 'getBoundedSecurityStringContext("method", request.method)', "CampaignCue API guard bounded method metadata");
  assertNotIncludes(apiGuards, "buildSecurityContext", "CampaignCue API guard must not spread raw security context");
  assertNotIncludes(apiGuards, "endpoint: request.nextUrl.pathname", "CampaignCue API guard must not log raw route path");
  assertNotIncludes(apiGuards, "endpoint: params.request.nextUrl.pathname", "CampaignCue API guard must not log raw params route path");
  assertNotIncludes(apiGuards, "feature: params.feature", "CampaignCue API guard must not log raw rate-limit feature");
  assertIncludes(apiGuards, "hashPublicRateLimitValue", "CampaignCue API guard hashes rate-limit key segments");
  assertIncludes(apiGuards, "userRateLimitHash", "CampaignCue API guard computes hashed user segment");
  assertIncludes(apiGuards, "tenantRateLimitHash", "CampaignCue API guard computes hashed tenant segment");
  assertIncludes(apiGuards, "storeRateLimitHash", "CampaignCue API guard computes hashed store segment");
  assertIncludes(apiGuards, "key: `${CAMPAIGNCUE_RATE_LIMIT_NAMESPACE}:${params.keyPrefix}:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`", "CampaignCue API guard stores hashed rate-limit key segments");
  assertIncludes(apiGuards, "getBoundedSecurityStringContext(\"tenantId\", scope.tId)", "CampaignCue tenant violation log uses bounded tenant metadata");
  assertIncludes(apiGuards, "getBoundedSecurityStringContext(\"storeId\", scope.sId)", "CampaignCue tenant/rate-limit logs use bounded store metadata");
  assertIncludes(apiGuards, "getBoundedSecurityStringContext(\"userId\", scope.userId)", "CampaignCue rate-limit log uses bounded user metadata");
  assertNotIncludes(apiGuards, "key: `${CAMPAIGNCUE_RATE_LIMIT_NAMESPACE}:${params.keyPrefix}:${scope.userId || \"unknown\"}:${scope.tId || \"_\"}:${scope.sId || \"_\"}`", "CampaignCue API guard must not store raw rate-limit key segments");
  assertNotIncludes(apiGuards, "tenantId: scope.tId", "CampaignCue API guard must not log raw tenant scope");
  assertNotIncludes(apiGuards, "storeId: scope.sId", "CampaignCue API guard must not log raw store scope");
  assertNotIncludes(apiGuards, "userId: scope.userId", "CampaignCue API guard must not log raw user scope");
  [
    "src/app/api/campaigncue/workspace/route.ts",
    "src/app/api/campaigncue/campaigns/route.ts",
    "src/app/api/campaigncue/campaigns/variants/route.ts",
    "src/app/api/campaigncue/campaigns/[campaignId]/actions/route.ts",
    "src/app/api/campaigncue/campaigns/[campaignId]/export-archive/route.ts",
    "src/app/api/campaigncue/assets/route.ts",
    "src/app/api/campaigncue/design-cue/turns/route.ts",
    "src/app/api/campaigncue/sources/route.ts",
    "src/app/api/campaigncue/locations/route.ts",
    "src/app/api/campaigncue/video-projects/route.ts",
    "src/app/api/campaigncue/cue-layers/uploads/route.ts",
    "src/app/api/campaigncue/cue-layers/designs/[designId]/autosave/route.ts",
    "src/app/api/campaigncue/cue-layers/designs/[designId]/repair/route.ts",
    "src/app/api/campaigncue/cue-layers/designs/[designId]/exports/route.ts",
  ].forEach((relPath) => {
    const content = read(relPath);
    assertIncludes(content, "parseCampaignCueJsonBody", `${relPath} parses JSON with shared malformed-body guard`);
    assertNotIncludes(content, "await request.json()", `${relPath} avoids raw JSON parsing`);
  });
}

function verifyServerRuntime() {
  const server = read("src/lib/campaigncue/server.ts");
  const exportArchiveClient = read("src/lib/campaigncue/exportArchiveClient.ts");
  const exportArchiveConstants = read("src/constants/campaigncue/exportArchive.ts");
  const exportArchiveStorageRules = read("storage-campaigncue.rules");
  const videoReel = read("src/lib/campaigncue/videoReel.ts");
  const videoCompositor = read("src/lib/campaigncue/videoCompositor.ts");
  const cueLayersServer = read("src/lib/campaigncue/cue-layers/server.ts");
  const dailyDesk = read("src/lib/campaigncue/dailyDesk.ts");
  const operatingLoop = read("src/lib/campaigncue/operatingLoop.ts");
  const experimentCoach = read("src/lib/campaigncue/experimentCoach.ts");
  const localVisibility = read("src/lib/campaigncue/localVisibility.ts");
  const approvalInbox = read("src/lib/campaigncue/approvalInbox.ts");
  const decisionEngine = read("src/lib/campaigncue/decisionEngine.ts");
  const mediaMissions = read("src/lib/campaigncue/mediaMissions.ts");
  const mediaUploadClient = read("src/lib/campaigncue/assetUploadClient.ts");
  const mediaUploadRecovery = read("src/lib/campaigncue/assetUploadRecovery.ts");
  const campaignMemory = read("src/lib/campaigncue/campaignMemory.ts");
  const firebaseSessionClient = read("src/lib/campaigncue/firebaseSessionClient.ts");
  const workspaceApp = read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx");
  assertIncludes(workspaceApp, "currentPath.startsWith(`${CAMPAIGNCUE_LOCAL_DEV_PATH_PREFIX}/`)", "CampaignCue local public-site action works on localhost and LAN-hosted app paths");
  const dailyDeskConstants = read("src/constants/campaigncue/dailyDesk.ts");
  const campaigncueTypes = read("src/types/campaigncue.ts");
  const assetBoundary = read("src/lib/campaigncue/assetBoundary.ts");
  const recordBoundary = read("src/lib/campaigncue/recordBoundary.ts");
  const errors = read("src/constants/campaigncue/errors.ts");
  assertIncludes(exportArchiveConstants, 'retentionPolicy: "two_slot_current_per_campaign"', "export archive bounded retention contract");
  assertIncludes(exportArchiveConstants, "archive-${slot}.zip", "export archive deterministic two-slot path family");
  assertIncludes(server, "existingLease.createdBy !== params.scope.userId", "export archive active lease remains member-owned");
  assertIncludes(server, "CAMPAIGNCUE_EXPORT_ARCHIVE_ROLES.has(currentRole)", "export archive finalize rechecks the current role");
  assertIncludes(server, "filterCampaignCueAssetsForMember", "CampaignCue assets enforce local-manager visibility");
  assertIncludes(server, "locationId: current.locationId", "export archive Asset Library records retain campaign location scope");
  assertIncludes(server, '"x-goog-hash": `crc32c=${params.input.crc32c}`', "export archive signed upload requires CRC32C");
  assertIncludes(server, 'ifGenerationMatch: currentTargetGeneration || "0"', "export archive signed upload prevents lost overwrite");
  assertIncludes(server, "stored.crc32c !== archiveInput.crc32c", "export archive finalize verifies stored CRC32C");
  assertIncludes(server, "campaignCueExportArchiveAssetId", "export archive uses one deterministic Asset Library record");
  assertIncludes(server, "generation: storageGeneration", "export archive downloads are pinned to the registered object generation");
  assertIncludes(exportArchiveClient, 'credentials: "omit"', "export archive signed PUT omits application credentials");
  assertIncludes(exportArchiveClient, 'uploadUrl.protocol !== "https:"', "export archive client rejects non-HTTPS upload URLs");
  assertIncludes(exportArchiveClient, 'uploadUrl.hostname !== "storage.googleapis.com"', "export archive client restricts signed uploads to Google Storage");
  assertIncludes(exportArchiveClient, "preparation.storagePath !== expectedStoragePath", "export archive client binds instructions to active workspace and campaign");
  assertIncludes(exportArchiveClient, 'uploadHeaders["x-goog-hash"] !== `crc32c=${crc32c}`', "export archive client binds signed headers to the computed checksum");
  assertIncludes(exportArchiveClient, "SIGNED_UPLOAD_HEADER_NAMES", "export archive client allowlists signed upload headers");
  assertIncludes(workspaceApp, 'url.hostname === "storage.googleapis.com"', "CampaignCue asset downloads accept only signed Google Storage URLs");
  assertIncludes(exportArchiveStorageRules, "match /campaigncue/reports/{workspaceId}/{allPaths=**}", "export archive Storage namespace is explicitly governed");
  assertIncludes(exportArchiveStorageRules, "allow read, write, delete: if false;", "export archive rejects direct Firebase client access");
  assertIncludes(operatingLoop, "registeredRecipeIds.has(campaign.pack.recipeId)", "Winning Pack Refresh rejects retired recipes");
  assertIncludes(operatingLoop, "currentFit:", "Winning Pack Refresh exposes current recommendation fit");
  assertIncludes(operatingLoop, "seasonalContext", "Winning Pack Refresh uses bounded owner-entered seasonal context");
  assertIncludes(server, "!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_WINNING_PACK_REFRESH", "Winning Pack Refresh server feature gate");
  assertIncludes(server, "reuseCampaign.pack?.reuseRootCampaignId || reuseCampaign.id", "Winning Pack Refresh preserves bounded root provenance");
  assertIncludes(server, "reuseCampaign?.pack?.sourceTemplateId || params.input.sourceTemplateId", "Winning Pack Refresh preserves template provenance");
  assertIncludes(recordBoundary, "refreshGeneration: z.number().int().min(1).max(100).optional()", "Winning Pack Refresh persisted generation bound");
  assertIncludes(workspaceApp, "Recommended now", "Winning Pack Refresh owner current-fit copy");
  assertIncludes(workspaceApp, "Review timing", "Winning Pack Refresh owner review copy");
  const blockedActionStart = server.indexOf("if (finalActionError) {");
  const blockedActionEnd = server.indexOf("const updates = buildCampaignCueActionUpdates", blockedActionStart);
  assert(blockedActionStart > -1 && blockedActionEnd > blockedActionStart, "CampaignCue blocked action branch is discoverable");
  const blockedActionBlock = server.slice(blockedActionStart, blockedActionEnd);
  const trustGatedActionStart = server.indexOf("const CAMPAIGNCUE_TRUST_GATED_ACTION_TYPES");
  const trustGatedActionEnd = server.indexOf("const CAMPAIGNCUE_TRUST_GATED_ACTIONS", trustGatedActionStart);
  assert(trustGatedActionStart > -1 && trustGatedActionEnd > trustGatedActionStart, "CampaignCue public-use trust-gate action list is discoverable");
  const trustGatedActionBlock = server.slice(trustGatedActionStart, trustGatedActionEnd);
  const sourceInputSaveStart = server.indexOf("export async function createCampaignCueSourceInputServer");
  const sourceInputSaveEnd = server.indexOf("export async function createCampaignCueLocationServer", sourceInputSaveStart);
  assert(sourceInputSaveStart > -1 && sourceInputSaveEnd > sourceInputSaveStart, "CampaignCue source input save block is discoverable");
  const sourceInputSaveBlock = server.slice(sourceInputSaveStart, sourceInputSaveEnd);
  const businessPatchStart = server.indexOf("export async function patchCampaignCueBusinessServer");
  const businessPatchEnd = server.indexOf("export function buildCampaignCueAuthLaunchUrl", businessPatchStart);
  assert(businessPatchStart > -1 && businessPatchEnd > businessPatchStart, "CampaignCue business patch block is discoverable");
  const businessPatchBlock = server.slice(businessPatchStart, businessPatchEnd);
  const assetRegistrationStart = server.indexOf("export async function createCampaignCueAssetServer");
  const assetRegistrationEnd = server.indexOf("export async function createCampaignCueAssetDownloadServer", assetRegistrationStart);
  assert(assetRegistrationStart > -1 && assetRegistrationEnd > assetRegistrationStart, "CampaignCue asset registration block is discoverable");
  const assetRegistrationBlock = server.slice(assetRegistrationStart, assetRegistrationEnd);
  const assetDownloadStart = assetRegistrationEnd;
  const assetDownloadEnd = server.indexOf("export async function createCampaignCueSourceInputServer", assetDownloadStart);
  assert(assetDownloadStart > -1 && assetDownloadEnd > assetDownloadStart, "CampaignCue asset download block is discoverable");
  const assetDownloadBlock = server.slice(assetDownloadStart, assetDownloadEnd);

  assertIncludes(server, "campaigncueFirestoreAdmin as firestoreAdmin", "CampaignCue server dedicated Firestore Admin");
  assertIncludes(server, "firestoreAdmin as menuListFirestoreAdmin", "CampaignCue server MenuList source-read Admin");
  assertIncludes(server, "menuListFirestoreAdmin.collection(DB_COLLECTIONS.STORES)", "CampaignCue source bootstrap reads MenuList store profile");
  assertIncludes(server, "sourceInputs.flatMap((sourceInput) => sourceInputToFacts(sourceInput))", "CampaignCue source fact flattening does not pass the array index as the optional clock");
  assertNotIncludes(server, "sourceInputs.flatMap(sourceInputToFacts)", "CampaignCue source fact flattening must not bind the flatMap index to the optional Date parameter");
  assertNotIncludes(server, "Promise.all([ref.get(), readStoreData(scope)])", "CampaignCue workspace load avoids repeat MenuList source reads");
  assertIncludes(server, "const initialWorkspaceSnap = await ref.get()", "CampaignCue checks its own workspace before a bootstrap-only MenuList source read");
  assertIncludes(server, "requireCampaignCueFirestoreAdmin().collection(CAMPAIGNCUE_COLLECTIONS.WORKSPACES)", "CampaignCue workspace writes use fail-closed dedicated Admin");
  assertIncludes(server, "CAMPAIGNCUE_PAGE_SIZE", "CampaignCue server bounded list limit");
  assertIncludes(server, "CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS", "CampaignCue server idempotency collection");
  assertIncludes(server, "assertCampaignCueStoreRecordScope", "CampaignCue bootstrap verifies shared MenuList store ownership before consuming private profile data");
  assertIncludes(server, "assertCampaignCueWorkspaceRecordScope", "CampaignCue server verifies product, tenant, store and member scope on persisted workspaces");
  assertOccurrenceCount(
    server,
    "assertCurrentCampaignCueWorkspaceAccess(",
    9,
    "CampaignCue claim, archive, asset, source, inbox, location, business and video transactions recheck current workspace membership",
  );
  assertIncludes(server, "if (!snap.exists) throw new CampaignCueWorkspaceScopeError()", "CampaignCue bootstrap rejects missing or deleted store scope");
  const workspaceBootstrap = server.slice(
    server.indexOf("export async function ensureCampaignCueWorkspaceServer"),
    server.indexOf("async function ensureCampaignCueWorkspaceOnlyServer"),
  );
  assertIncludes(workspaceBootstrap, "transaction.create(ref", "CampaignCue workspace ownership is claimed create-only in a transaction");
  assertIncludes(workspaceBootstrap, "transaction.create(businessRef", "CampaignCue Business Brain initialization is create-only");
  assertIncludes(workspaceBootstrap, "transaction.create(sourceRef", "CampaignCue source snapshot initialization is create-only");
  assertIncludes(workspaceBootstrap, "transaction.create(summaryRef", "CampaignCue summary initialization cannot reset concurrent counters");
  const workspaceOnlyBlock = server.slice(
    server.indexOf("async function ensureCampaignCueWorkspaceOnlyServer"),
    server.indexOf("export function buildCampaignCueOpportunities"),
  );
  assertNotIncludes(workspaceOnlyBlock, "readStoreData(scope)", "Routine CampaignCue workspace authorization does not reread the MenuList source store");
  assertIncludes(workspaceBootstrap, "assertCampaignCueBusinessBrainRecordScope", "CampaignCue bootstrap rejects a foreign embedded Business Brain scope");
  assertIncludes(server, "CAMPAIGNCUE_IDEMPOTENCY_LEASE_MS", "CampaignCue server idempotency claim has a bounded lease");
  assertIncludes(server, "CAMPAIGNCUE_IDEMPOTENCY_RETENTION_MS", "CampaignCue server idempotency records have bounded retention");
  assertIncludes(server, "expiresAt: admin.firestore.Timestamp.fromMillis(nowMillis + CAMPAIGNCUE_IDEMPOTENCY_RETENTION_MS)", "CampaignCue primary idempotency claims set their TTL deadline");
  assertIncludes(server, "getCampaignCueIdempotencyClaimDecision", "CampaignCue server transactionally decides claim, replay, or conflict");
  assertIncludes(server, "loadCampaignCueDecisionAuthority", "CampaignCue campaign generation loads one coherent authority snapshot");
  assertIncludes(server, "currentAuthorityHash !== authorityHash", "CampaignCue campaign commit rejects concurrent decision-input changes");
  assertIncludes(server, "parseCampaignCueCampaignRecord", "CampaignCue persisted campaign reads use a runtime decoder");
  assertIncludes(server, "parseCampaignCueAnalyticsSummaryRecord", "CampaignCue persisted summary reads use a runtime decoder");
  assertIncludes(recordBoundary, "stripLegacyNullObjectFields", "CampaignCue persisted decoder normalizes legacy optional nulls");
  assertIncludes(server, 'undefinedObjectValue: "omit"', "CampaignCue Firestore writes omit optional undefined fields");
  assertIncludes(cueLayersServer, 'undefinedObjectValue: "omit"', "CueLayers Firestore writes omit optional undefined fields");
  assertNotIncludes(server, "const sanitizeForAdminFirestore = (value: any): any", "CampaignCue avoids its unsafe duplicate Firestore sanitizer");
  assertNotIncludes(cueLayersServer, "const sanitizeForAdminFirestore = (value: any): any", "CueLayers avoids its unsafe duplicate Firestore sanitizer");
  assertIncludes(server, "assertCampaignCueIdempotencyClaimOwnership", "CampaignCue server completion proves exact claim ownership");
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
  assertIncludes(server, "campaignCueDecisionQuery(workspaceId, CAMPAIGNCUE_COLLECTIONS.CAMPAIGNS)", "CampaignCue create flow reads bounded campaign memory for scoring and commit authority");
  assertIncludes(server, "decision: selectedDecision", "CampaignCue campaign pack stores selected decision object");
  assertIncludes(server, "recipeId: recipe.id", "CampaignCue campaign pack stores selected recipe id");
  assertIncludes(server, "CampaignCueDecisionGateError", "CampaignCue server blocks pack creation when missing-input gate is not ready");
  assertIncludes(errors, "CAMPAIGNCUE_DECISION_GATE", "CampaignCue decision gate has a dedicated API error code");
  assertIncludes(server, "selectedDecision.decisionStatus !== \"ready_to_prepare\"", "CampaignCue server requires ready decision before creating a pack");
  assertIncludes(server, "firstMissingInput?.ownerQuestion", "CampaignCue server returns owner-facing missing input reason");
  assertIncludes(server, "responseError: decisionGateMessage", "CampaignCue decision-gate rejection completes idempotency as replayable error");
  assertIncludes(server, "Daily Campaign Desk is computed from the same overview documents", "CampaignCue daily desk adds no overview read");
  assertIncludes(campaigncueTypes, "CampaignCueAIAssistancePlan", "CampaignCue AI assistance plan type");
  assertIncludes(dailyDesk, "buildCampaignCueAIAssistancePlan", "CampaignCue Daily Desk derives AI assistance plan");
  assertIncludes(dailyDesk, "instructions/assistant-work-plan.md", "CampaignCue output ZIP includes assistant work plan");
  assertIncludes(dailyDesk, "providerCalls: 0", "CampaignCue AI assistance plan records zero provider calls");
  assertIncludes(dailyDesk, "firestoreReads: 0", "CampaignCue AI assistance plan records zero Firestore reads");
  assertIncludes(dailyDesk, "firestoreDeletes: 0", "CampaignCue AI assistance plan records zero Firestore deletes");
  assertIncludes(server, "normalizeCampaignCueWorkspace", "CampaignCue server normalizes legacy workspace delivery settings");
  assertIncludes(server, "providerConnections: []", "CampaignCue overview avoids active provider connection reads");
  assertIncludes(server, "readsPerLoad: 8", "CampaignCue overview uses bounded CampaignCue records and excludes routine MenuList/provider reads");
  assertIncludes(server, "let readsPerLoad = 2", "CampaignCue owner analytics starts with the workspace and compact-summary cost");
  assertIncludes(server, "readsPerLoad = 1 + Math.max(1, campaigns.length)", "CampaignCue local-manager analytics reports its bounded campaign-read cost");
  assertIncludes(server, "analytics: visibleAnalytics", "CampaignCue local-manager recommendations use branch-scoped analytics");
  assertIncludes(campaignMemory, "buildCampaignCueVisibleCampaignAnalytics", "CampaignCue derives branch analytics from visible bounded campaigns");
  assertIncludes(campaignMemory, "cannot cross workspace scope", "CampaignCue branch analytics rejects cross-workspace input");
  assertIncludes(server, "listCampaignCueVideoProjectsServer", "CampaignCue server exposes a bounded Video Reel Studio list");
  assertIncludes(server, "mutateCampaignCueVideoProjectServer", "CampaignCue server exposes protected Video Reel Studio mutations");
  assertIncludes(server, "canApplyCampaignCueVideoRenderReceipt(existingReceipt, renderInput.receipt)", "CampaignCue render receipt transition admission");
  assertIncludes(videoReel, 'const renderReceiptStatusSchema = z.discriminatedUnion("status"', "CampaignCue persisted render receipt status contract");
  assertIncludes(videoReel, 'const renderReceiptVersionBindingSchema = z.discriminatedUnion("versionBinding"', "CampaignCue persisted render receipts are type-safe across exact and legacy version evidence");
  assertIncludes(videoReel, "evaluateCampaignCueVideoContentCoach", "CampaignCue exposes deterministic video content coaching");
  assertIncludes(videoReel, "buildCampaignCueVideoCaptureChecklist", "CampaignCue exposes a scene-linked phone capture checklist");
  assertIncludes(videoReel, "buildCampaignCueVideoFormatLearning", "CampaignCue derives bounded format-level result learning");
  assertIncludes(videoReel, "isCampaignCueVideoRenderEvidenceConsistent", "CampaignCue validates render duration, asset ids, and session-rights evidence against the approved project");
  assertIncludes(videoReel, 'next.versionBinding !== "exact"', "CampaignCue rejects render transitions without exact version binding");
  assertIncludes(server, "buildCampaignCueVideoFormatSnapshot", "CampaignCue result recording snapshots the exact rendered format");
  assertIncludes(server, "getCampaignCueVideoResultCounterDelta", "CampaignCue result replacement adjusts counters instead of double counting");
  assertIncludes(server, "counterDelta.newOutcomeDelta", "CampaignCue analytics only count the first video-project result receipt");
  assertIncludes(server, 'params.input.action !== "render_progress"', "CampaignCue progress checkpoints do not create audit-event writes");
  assertIncludes(videoReel, "buildCampaignCueVideoStoryboardText", "CampaignCue exposes a deterministic manual storyboard fallback");
  assertIncludes(videoCompositor, "downloadCampaignCueVideoStoryboard", "CampaignCue downloads the manual storyboard locally");
  assertIncludes(videoCompositor, "new Promise<void>((resolve, reject)", "CampaignCue render loop rejects drawing failures instead of hanging");
  assertIncludes(server, "parseCampaignCueVideoProjectRecord", "CampaignCue persisted video projects use a strict runtime decoder");
  assertIncludes(server, "evaluateCampaignCueVideoTrust", "CampaignCue video saves rerun deterministic trust checks");
  assertIncludes(server, "getCampaignCueVideoSourceTrustGate", "CampaignCue video trust keeps the stricter campaign or output gate");
  assertIncludes(server, ").length !== assets.length", "CampaignCue video saves reject assets outside the current member's branch visibility");
  assertIncludes(server, "const updated: CampaignCueCampaign", "CampaignCue action response avoids post-write campaign reread");
  assertIncludes(server, "readSourceSnapshot", "CampaignCue source snapshot summary reader exists");
  assertIncludes(server, "buildSourceSnapshotFromExistingSnapshot", "CampaignCue source input save can merge into existing snapshot");
  assertIncludes(sourceInputSaveBlock, "transaction.get(sourceSnapshotRef)", "CampaignCue source input save reads transaction-current compact source snapshot");
  assertIncludes(sourceInputSaveBlock, "parseCampaignCueSourceSnapshotRecord", "CampaignCue source input save runtime-admits transaction-current snapshot truth");
  assertIncludes(sourceInputSaveBlock, "buildSourceSnapshotFromExistingSnapshot", "CampaignCue source input save merges source facts from snapshot");
  assertNotIncludes(sourceInputSaveBlock, "listSubcollection<CampaignCueSourceInput>", "CampaignCue source input save avoids source input collection scan");
  assertIncludes(businessPatchBlock, "transaction.get(sourceSnapshotRef)", "CampaignCue business patch reads transaction-current compact source snapshot");
  assertIncludes(businessPatchBlock, "transaction.get(businessRef)", "CampaignCue business patch reads transaction-current Business Brain truth");
  assertIncludes(businessPatchBlock, "buildSourceSnapshotFromExistingSnapshot", "CampaignCue business patch rebuilds facts from snapshot");
  assertNotIncludes(businessPatchBlock, "listSubcollection<CampaignCueSourceInput>", "CampaignCue business patch avoids source input collection scan");
  assertIncludes(server, "normalizeBrandPlaybook", "CampaignCue server normalizes Brand Playbook for existing Business Brain docs");
  assertIncludes(server, "brand_playbook", "CampaignCue server emits Brand Playbook source facts");
  assertIncludes(server, "brandPlaybookSourceRefs", "CampaignCue source snapshots track Brand Playbook source refs only when present");
  assertIncludes(server, "...brandPlaybookSourceRefs(businessBrain)", "CampaignCue initial source snapshot records Brand Playbook provenance");
  assertIncludes(server, "...brandPlaybookSourceRefs(params.businessBrain)", "CampaignCue merged source snapshot records Brand Playbook provenance");
  assertIncludes(server, "isCampaignSourceInputRef", "CampaignCue has a shared campaign-source predicate");
  assertIncludes(server, "isCampaignSourceInputRef(sourceRef) && !isCampaignPatternSourceRef(sourceRef)", "CampaignCue merged source snapshot excludes Brand Playbook and inspiration refs from manual business truth");
  assertIncludes(server, "const snapshotSourceRefs = businessSourceInputs.length", "CampaignCue opportunity source refs prefer active business source inputs");
  assertIncludes(server, "sourceSnapshot.sourceRefs.filter((sourceRef) => (", "CampaignCue opportunity source refs filter compact snapshot refs");
  assertIncludes(server, "isCampaignSourceInputRef(sourceRef) && !isCampaignPatternSourceRef(sourceRef)", "CampaignCue opportunity source refs exclude Brand Playbook and pattern refs from current campaign input");
  assertIncludes(server, "brand_playbook_avoid_term", "CampaignCue trust report warns on Brand Playbook avoid-list terms");
  assertIncludes(businessPatchBlock, "mergeBrandPlaybookPatch", "CampaignCue business patch stores Brand Playbook through existing profile save");
  assertIncludes(server, "buildUgcDialogueActionBrief", "CampaignCue server builds structured UGC dialogue/action briefs");
  assertIncludes(server, "cameraPlanForChannel", "CampaignCue server builds phone-camera guidance for UGC and video briefs");
  assertIncludes(server, "productPlacementBrief", "CampaignCue server builds product-placement guidance from source facts");
  assertIncludes(server, "fake_personal_experience", "CampaignCue trust report flags unsourced first-person UGC/video claims");
  assertIncludes(server, "i absolutely love", "CampaignCue UGC trust rule catches first-person love/recommendation testimonial wording");
  assertIncludes(server, "Do not present synthetic or fictional people as real customers", "CampaignCue UGC output rejects fake customer posture");
  assertIncludes(server, "sourceSnapshot?: CampaignCueSourceSnapshot", "CampaignCue opportunity builder accepts compact source snapshot");
  assertIncludes(server, "enqueueDashboardSummaryIncrement", "CampaignCue summary increments can be batched with primary writes");
  assertIncludes(server, "const idempotencySnap = await transaction.get(idempotencyRef)", "CampaignCue primary transactions read current idempotency ownership");
  assertIncludes(blockedActionBlock, "transaction.set(eventRef", "CampaignCue blocked actions transactionally record the event");
  assertIncludes(blockedActionBlock, "transaction.set(idempotencyRef", "CampaignCue blocked actions transactionally complete idempotency");
  assertNotIncludes(server, "await Promise.all([\n        updateDashboardSummary", "CampaignCue accepted actions avoid second summary commit");
  assertIncludes(assetRegistrationBlock, "await requireCampaignCueFirestoreAdmin().runTransaction", "CampaignCue asset registration atomically binds current authority, asset, event and replay completion");
  assertIncludes(assetRegistrationBlock, "assertCurrentCampaignCueWorkspaceAccess", "CampaignCue asset registration rechecks current member authority");
  assertIncludes(assetRegistrationBlock, "assertCampaignCueAssetBinding", "CampaignCue asset registration rechecks transaction-current campaign/output/channel binding");
  assertIncludes(assetRegistrationBlock, "action: \"asset_registered\"", "CampaignCue asset registration still records audit event");
  assertNotIncludes(assetRegistrationBlock, "await writeEvent({", "CampaignCue asset registration avoids a second Firestore event commit");
  assertIncludes(server, "responseError: finalActionError", "CampaignCue blocked actions complete idempotency with replayable error");
  assertIncludes(server, "CAMPAIGNCUE_TRUST_GATED_ACTIONS", "CampaignCue trust gate is scoped to public-use actions");
  assertIncludes(server, "campaign.trustGate === \"needs_fix\"", "CampaignCue trust gate treats needs-fix packs as blocked for public use");
  assertIncludes(trustGatedActionBlock, "\"download\"", "CampaignCue trust gate blocks text downloads");
  assertIncludes(trustGatedActionBlock, "\"export\"", "CampaignCue trust gate blocks campaign pack ZIP exports");
  assertIncludes(trustGatedActionBlock, "\"archive_export\"", "CampaignCue trust gate blocks stale cloud archives");
  assertIncludes(trustGatedActionBlock, "\"mark_used\"", "CampaignCue trust gate blocks marking blocked packs as used");
  assertIncludes(trustGatedActionBlock, "\"schedule\"", "CampaignCue trust gate blocks scheduling blocked packs");
  assertNotIncludes(trustGatedActionBlock, "\"request_approval\"", "CampaignCue trust gate does not block approval requests");
  assertNotIncludes(trustGatedActionBlock, "\"record_outcome\"", "CampaignCue trust gate does not block result recording");
  assertNotIncludes(blockedActionBlock, "updateDashboardSummary", "CampaignCue blocked export actions do not increment analytics counters");
  assertIncludes(server, "CAMPAIGNCUE_COLLECTIONS.SOURCE_INPUTS", "CampaignCue server source input collection");
  assertIncludes(server, "CAMPAIGNCUE_COLLECTIONS.LOCATIONS", "CampaignCue server location collection");
  assertIncludes(server, "createCampaignCueSourceInputServer", "CampaignCue source input mutation");
  assertIncludes(server, "createCampaignCueAssetDownloadServer", "CampaignCue asset download handoff");
  assertIncludes(assetRegistrationBlock, "isCampaignCueWorkspaceStoragePath", "CampaignCue asset registration is workspace-path scoped");
  assertIncludes(server, "const storageGeneration = String(metadata.generation || \"\")", "CampaignCue asset registration captures immutable Storage generation");
  assertIncludes(server, "isCampaignCueMediaHeaderValid", "CampaignCue uploaded media verifies MIME signatures server-side");
  assertIncludes(server, "previewStorageGeneration", "CampaignCue uploaded media binds generated previews to immutable generations");
  assertIncludes(assetDownloadBlock, "parseCampaignCueAssetRecord", "CampaignCue asset download validates persisted asset records");
  assertIncludes(assetBoundary, "isCampaignCueWorkspaceStoragePath(value.file.storagePath as string, params.workspaceId)", "CampaignCue persisted asset parser enforces workspace-path ownership");
  assertIncludes(assetDownloadBlock, "getSignedUrl", "CampaignCue private Storage downloads use runtime signed URLs");
  assertIncludes(assetDownloadBlock, "generation: storageGeneration", "CampaignCue private Storage downloads bind the registered object generation");
  assertIncludes(assetDownloadBlock, "This legacy asset must be registered again before download.", "CampaignCue legacy unversioned Storage references fail closed");
  assertNotIncludes(server, "recordCampaignCueIntegrationServer", "CampaignCue server has no day-one integration mutation");
  assertIncludes(server, "createCampaignCueLocationServer", "CampaignCue location mutation");
  assertIncludes(server, "export_action_blocked", "CampaignCue trust-blocked export action event");
  assertIncludes(server, "manual_export_used", "CampaignCue manual export used event");
  assertIncludes(errors, "CAMPAIGNCUE_FIREBASE_UNAVAILABLE", "CampaignCue Firebase setup error code");
  assertIncludes(server, "status: 503", "CampaignCue Firebase setup HTTP status");
  assertIncludes(server, "collectCampaignCueFirebaseErrorIndicators", "CampaignCue Firebase setup classifier uses structured indicators");
  assertIncludes(server, "throw new CampaignCueIdempotencyConflictError(identityError.message)", "CampaignCue claim identity failures map to bounded conflict responses");
  assertIncludes(server, "clientMessage: string;", "CampaignCue local API errors expose explicit client messages");
  assertIncludes(server, "error: error.clientMessage", "CampaignCue API errors return explicit client messages");
  assertNotIncludes(server, "error: error.message", "CampaignCue API errors must not return generic Error.message values");
  assertIncludes(server, "toCampaignCueFailureCode", "CampaignCue API diagnostics derive fixed failure codes from fixed route labels");
  assertIncludes(server, "new Error(failureCode)", "CampaignCue API diagnostics capture fixed-code errors");
  assertIncludes(server, "getCampaignCueSourceErrorContext(error)", "CampaignCue API diagnostics include bounded source metadata");
  assertIncludes(server, "getCampaignCueSafeLogMetadata(metadata)", "CampaignCue API diagnostics bound route metadata");
  assertNotIncludes(server, "logger.error(message, error", "CampaignCue API diagnostics must not capture raw route exceptions");
  assertNotIncludes(server, "stringifyErrorField", "CampaignCue runtime must not classify provider/setup errors from raw stringified error text");
  assertNotIncludes(server, "message.includes(\"already exists\")", "CampaignCue idempotency conflict must not parse raw exception messages");
  assertNotIncludes(server, "permission denied on resource project campaigncue", "CampaignCue setup-blocked classifier must not rely on raw Firebase exception text");
  assertIncludes(cueLayersServer, "logCampaignCueServerError(\"CampaignCue CueLayers API error\"", "CampaignCue CueLayers API uses shared bounded diagnostics");
  assertNotIncludes(cueLayersServer, "logger.error(\"CampaignCue CueLayers API error\", error", "CampaignCue CueLayers API must not raw-log exceptions");
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
  assertIncludes(dailyDesk, "proofDeck", "CampaignCue output pack includes Campaign Proof Deck contract");
  assertIncludes(dailyDesk, "const freshness = evaluateCampaignCuePackFreshness({", "CampaignCue output pack evaluates persisted-pack freshness safely");
  assertIncludes(dailyDesk, "now: params.now,", "CampaignCue output pack uses the caller clock for deterministic freshness checks");
  assertIncludes(dailyDesk, "const packStatus = outputPackStatusFromCampaign(params.campaign, params.missingInputs, freshness.status);", "CampaignCue output pack file status uses evaluated freshness instead of only saved status");
  assertIncludes(dailyDesk, "freshness,", "CampaignCue output pack exposes evaluated freshness");
  assertIncludes(dailyDesk, "const commercialEvaluation = evaluateCampaignCueCommercialGate({", "CampaignCue output pack re-evaluates current commercial policy and source inputs");
  assertIncludes(dailyDesk, "commercialSafety,", "CampaignCue output pack exposes the persisted commercial gate shape");
  assertIncludes(dailyDesk, "language: {", "CampaignCue output pack exposes normalized language policy");
  assertIncludes(dailyDesk, "presencePassport: {", "CampaignCue output pack exposes the owner-managed presence passport");
  assertIncludes(dailyDesk, "staffExecution: {", "CampaignCue output pack exposes staff execution steps and completion prompt");
  assertIncludes(dailyDesk, "const learning = params.campaign.pack?.experiment || buildCampaignCueExperimentSuggestion({", "CampaignCue output pack preserves its experiment or derives one deterministically");
  assertIncludes(dailyDesk, "learning,", "CampaignCue output pack exposes the selected experiment");
  assertNotIncludes(dailyDesk, "outputPack as CampaignCueOutputPack", "CampaignCue pack review cannot hide output-contract drift behind a cast");
  assertIncludes(operatingLoop, "Array.from(text.matchAll(pattern))", "CampaignCue explicit-price parsing is compatible with the repository TypeScript target");
  assertIncludes(dailyDesk, "proof-deck/campaign-proof-deck.md", "CampaignCue output pack writes proof deck brief file");
  assertIncludes(dailyDesk, "This is a review brief", "CampaignCue proof deck preserves brief-only boundary");
  assertIncludes(dailyDesk, "dialogue/action beat sheet", "CampaignCue proof deck captures UGC dialogue/action reference");
  assertIncludes(dailyDesk, "B-roll references only", "CampaignCue proof deck captures video B-roll reference boundary");
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
  assertIncludes(mediaMissions, "isCampaignCueReadyVisualAsset", "CampaignCue has one durable visual-readiness predicate");
  assertIncludes(mediaMissions, "storageGeneration", "CampaignCue visual readiness requires immutable Storage generation metadata");
  assertIncludes(decisionEngine, "isCampaignCueReadyVisualAsset", "CampaignCue Decision Engine uses durable visual readiness");
  assertIncludes(dailyDesk, "isCampaignCueReadyVisualAsset", "CampaignCue Daily Desk uses durable visual readiness");
  assertIncludes(operatingLoop, "isCampaignCueReadyVisualAsset", "CampaignCue experiment coaching uses durable visual readiness");
  assertIncludes(operatingLoop, "baselineCampaignId: matching?.id", "CampaignCue experiment coaching records its latest matching baseline");
  assertIncludes(operatingLoop, 'predictionBoundary: "no_performance_prediction"', "CampaignCue experiment coaching blocks performance prediction claims");
  assertIncludes(experimentCoach, "completeCampaignCueExperimentForResult", "CampaignCue experiment completion uses one pure lifecycle boundary");
  assertIncludes(experimentCoach, 'params.experimentVariable !== experiment.variable', "CampaignCue experiment completion requires the explicitly recorded variable to match");
  assertIncludes(experimentCoach, 'params.resultSignalId === "not_used"', "CampaignCue not-used outcomes cannot complete an experiment");
  assertIncludes(localVisibility, "buildCampaignCueLocalVisibilityActions", "CampaignCue local visibility uses one deterministic action builder");
  assertIncludes(localVisibility, "evaluateCampaignCuePackFreshness", "CampaignCue local visibility checks saved pack freshness");
  assertIncludes(localVisibility, "latestGoogleCampaign.trustGate === \"clear\"", "CampaignCue local visibility requires a trust-clear Google handoff");
  assertIncludes(localVisibility, "const now = params.now || new Date()", "CampaignCue local visibility accepts a deterministic caller clock");
  assertNotIncludes(localVisibility, "Date.now()", "CampaignCue local visibility avoids an ambient clock");
  assertNotIncludes(localVisibility, "fetch(", "CampaignCue local visibility does not inspect external profiles");
  assertNotIncludes(localVisibility.toLowerCase(), "firebase", "CampaignCue local visibility adds no Firebase operation");
  assertIncludes(workspaceApp, "What needs attention", "CampaignCue local visibility exposes a prioritized owner action center");
  assertIncludes(workspaceApp, "What this unlocks", "CampaignCue local visibility explains owner value");
  assertIncludes(workspaceApp, "CampaignCue does not inspect or update external profiles.", "CampaignCue local visibility states its provider boundary");
  assertIncludes(approvalInbox, "CAMPAIGNCUE_APPROVAL_COMMENT_LIMIT = 20", "CampaignCue approval comments are bounded");
  assertIncludes(approvalInbox, "campaignCueApprovalHasOpenComments", "CampaignCue approval inbox detects open comments");
  assertIncludes(approvalInbox, "Resolve the open review comments before approving this campaign pack.", "CampaignCue approval blocks unresolved review comments");
  assertIncludes(server, "!current.outputs.some((output) => output.id === params.outputId)", "CampaignCue approval validates output ownership");
  assertIncludes(server, "params.locationId !== current.locationId", "CampaignCue approval validates location scope");
  assertIncludes(server, 'noteHash: params.action === "add_approval_comment"', "CampaignCue approval audit stores a comment digest");
  assertNotIncludes(server, "metadata: { rawComment", "CampaignCue approval events do not duplicate raw comments");
  assertIncludes(workspaceApp, "Comments stay inside this review request.", "CampaignCue approval UI explains bounded comment retention");
  assertIncludes(server, "CAMPAIGNCUE_EXPERIMENT_ACCEPTANCE_ROLES", "CampaignCue experiment acceptance has a role allowlist");
  assertIncludes(server, "acceptCampaignCueExperiment", "CampaignCue experiment acceptance updates existing campaign truth");
  assertIncludes(server, 'params.input.action !== "accept_experiment"', "CampaignCue experiment acceptance avoids an unrelated summary write");
  assertNotIncludes(server, "receipt?.experimentVariable || params.campaign.pack?.experiment?.variable", "CampaignCue result receipts never infer a tested variable from a suggestion");
  assertIncludes(mediaUploadClient, "CAMPAIGNCUE_ASSET_SIZE_LIMITS_BYTES", "CampaignCue media uploader enforces per-type client limits");
  assertIncludes(mediaUploadClient, "PREVIEW_DECODE_TIMEOUT_MS", "CampaignCue media preview decoding is bounded");
  assertIncludes(mediaUploadClient, "const registrationPayload = JSON.stringify(", "CampaignCue media registration retries reuse one stable idempotent payload");
  assertIncludes(mediaUploadClient, "registrationWasUncertain = true", "CampaignCue media registration tracks uncertain commit state before retry");
  assertIncludes(mediaUploadRecovery, "!params.registrationDispatched", "CampaignCue media upload cleans partial Storage files before registration");
  assertIncludes(mediaUploadRecovery, "!params.registrationWasUncertain", "CampaignCue media upload preserves files after an uncertain registration commit");
  assertIncludes(firebaseSessionClient, "signOut(auth)", "CampaignCue temporary direct Firebase authentication closes after the last operation");
  assertIncludes(workspaceApp, "Choose photo or clip", "CampaignCue Asset Library exposes guided private media capture");
  assertIncludes(workspaceApp, "Add a file note without upload", "CampaignCue distinguishes metadata notes from uploaded media");
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
  assertIncludes(campaigncueTypes, "CampaignCueBrandPlaybook", "CampaignCue Brand Playbook type exists");
  assertIncludes(campaigncueTypes, "CampaignCueOutputPackProofDeck", "CampaignCue Proof Deck type exists");

  const cueLayersProjection = read("src/lib/campaigncue/cue-layers/editorProjection.ts");
  const cueLayersDocumentBoundary = read("src/lib/campaigncue/cue-layers/documentBoundary.ts");
  const cueLayersIdempotency = read("src/lib/campaigncue/cue-layers/idempotency.ts");
  const cueLayersImageMetadata = read("src/lib/campaigncue/cue-layers/imageMetadata.ts");
  const cueLayersLayerIndexBoundary = read("src/lib/campaigncue/cue-layers/layerIndexBoundary.ts");
  const cueLayersRecordBoundary = read("src/lib/campaigncue/cue-layers/recordBoundary.ts");
  const cueLayersStorage = read("src/lib/campaigncue/cue-layers/storagePaths.ts");
  const cueLayersModels = read("src/lib/campaigncue/cue-layers/modelRegistry.ts");
  const cueLayersSchemas = read("src/lib/validation/campaigncueCueLayersSchemas.ts");

  assertIncludes(cueLayersServer, "ensureCampaignCueWorkspaceServer", "CueLayers server validates workspace scope");
  assertIncludes(cueLayersServer, "assertCueLayersRuntimeEnabled", "CueLayers internal entry points fail closed when the module is disabled");
  assertNotIncludes(cueLayersServer, "campaignCueCanReadCreativeWorkspace", "CueLayers source designs are not exposed to reviewer or local-manager roles without an assignment model");
  assertIncludes(cueLayersServer, "campaignCueCanManageWorkspaceContent", "CueLayers reads and writes share the content-manager role boundary");
  assertIncludes(cueLayersServer, "async function assertCurrentCueLayersWorkspaceAccess", "CueLayers has one transaction-current workspace authority guard");
  assertIncludes(cueLayersServer, "assertCampaignCueWorkspaceRecordScope(", "CueLayers transaction guard validates exact product, tenant, store and member scope");
  assertOccurrenceCount(
    cueLayersServer,
    "assertCurrentCueLayersWorkspaceAccess(transaction,",
    5,
    "CueLayers idempotency claim, upload, autosave, repair and export transactions recheck current workspace membership",
  );
  assertIncludes(cueLayersServer, "CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_DESIGNS", "CueLayers server writes design collection");
  assertIncludes(cueLayersServer, "CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS", "CueLayers server uses idempotency keys");
  assertIncludes(cueLayersServer, "CUE_LAYERS_IDEMPOTENCY_LEASE_MS", "CueLayers idempotency claims have a bounded lease");
  assertIncludes(cueLayersServer, "expiresAt: admin.firestore.Timestamp.fromMillis(nowMillis + CAMPAIGNCUE_IDEMPOTENCY_RETENTION_MS)", "CueLayers idempotency claims set their TTL deadline");
  assertIncludes(cueLayersServer, "getCampaignCueCueLayersClaimDecision", "CueLayers idempotency permits expired and legacy claim recovery");
  assertIncludes(cueLayersServer, "assertCampaignCueCueLayersClaimOwnership", "CueLayers commits prove exact claim ownership");
  assertIncludes(cueLayersServer, "completeCueLayersIdempotencyClaim", "CueLayers early completion is claim-conditional");
  assertIncludes(cueLayersIdempotency, "reason: \"legacy_or_malformed\"", "CueLayers legacy in-progress claims can recover");
  assertIncludes(cueLayersIdempotency, "record.claimId !== claimId", "CueLayers replaced workers cannot finish newer claims");
  assertIncludes(cueLayersServer, "createCampaignCueCueLayerUploadServer", "CueLayers upload server entry");
  assertIncludes(cueLayersServer, "params.input.sourceKind !== \"user_upload\"", "CueLayers upload enforces generated-source gate");
  assertIncludes(cueLayersServer, "readCampaignCueCueLayerImageMetadata(buffer)", "CueLayers validates uploaded and rendered image bytes server-side");
  assertIncludes(cueLayersServer, "const width = parsed.width", "CueLayers uses server-derived upload width");
  assertIncludes(cueLayersServer, "const height = parsed.height", "CueLayers uses server-derived upload height");
  assertIncludes(cueLayersImageMetadata, "readPngMetadata", "CueLayers image probe supports PNG headers");
  assertIncludes(cueLayersImageMetadata, "readJpegMetadata", "CueLayers image probe supports JPEG frame metadata");
  assertIncludes(cueLayersImageMetadata, "readWebpMetadata", "CueLayers image probe supports WebP container metadata");
  assertIncludes(cueLayersImageMetadata, "declaredSize !== buffer.length", "CueLayers rejects trailing bytes outside the WebP container");
  assertIncludes(cueLayersServer, "maxPixels: CAMPAIGNCUE_CUE_LAYERS.MAX_CANVAS_PIXELS", "CueLayers bounds upload and export pixel counts");
  assertIncludes(cueLayersServer, "const replayJobId = boot.design.current.jobId", "CueLayers replay reads current job pointer");
  assertIncludes(cueLayersServer, ".doc(replayJobId)", "CueLayers replay uses direct job doc read when pointer exists");
  assertIncludes(cueLayersServer, "parseCampaignCueCueLayerJobRecord(jobSnap.data(), jobSnap.id, workspaceId, replayDesignId)", "CueLayers replay validates the pointed job directly");
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
  assertIncludes(cueLayersServer, "committedDesign = await requireCampaignCueFirestoreAdmin().runTransaction", "CueLayers autosave commits revision and version metadata transactionally");
  assertIncludes(cueLayersServer, "currentDesign.current.revision !== expectedRevision", "CueLayers autosave rechecks revision in its commit transaction");
  assertOccurrenceCount(cueLayersServer, "deleteStorageObjectBestEffort(documentAsset.storagePath, \"autosave_snapshot\")", 2, "CueLayers autosave removes stale and failed-commit snapshots");
  assertIncludes(cueLayersServer, "withUncommittedStorageCleanup", "CueLayers upload tracks pre-commit Storage objects for compensation");
  assertIncludes(cueLayersServer, "recordUploadedPath(originalPath)", "CueLayers upload tracks its original image object");
  assertIncludes(cueLayersServer, "recordUploadedPath(sourcePackageAsset.storagePath)", "CueLayers upload tracks its source package object");
  assertIncludes(cueLayersServer, "recordUploadedPath(layerIndexAsset.storagePath)", "CueLayers upload tracks its layer-index object");
  assertIncludes(cueLayersServer, "recordUploadedPath(editorSnapshotAsset.storagePath)", "CueLayers upload tracks its editor snapshot object");
  assertIncludes(cueLayersServer, "markCommitted();", "CueLayers upload stops compensation after the Firestore commit");
  assertIncludes(cueLayersServer, "CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_REPAIR_REQUESTS", "CueLayers repair stores repair request metadata");
  assertIncludes(cueLayersServer, "layerIndex.entries.some((entry) => entry.layerId === params.input.layerId)", "CueLayers repair validates requested layer against the durable layer index");
  assertIncludes(cueLayersServer, "const idempotencyAction = \"cue_layers_repair\"", "CueLayers repair uses scoped idempotency");
  assertIncludes(cueLayersServer, "idempotency.replay.resultRevision !== design.current.revision", "CueLayers does not treat an old autosave replay as the current saved document");
  assertNotIncludes(cueLayersServer, "CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_CORRECTION_EVENTS", "CueLayers active v1 avoids correction-event collection writes");
  assertIncludes(cueLayersServer, "exportCampaignCueCueLayerDesignServer", "CueLayers export server entry");
  assertIncludes(cueLayersServer, "params.input.sourceRevision !== design.current.revision", "CueLayers export rejects stale revisions");
  assertIncludes(cueLayersServer, "getCampaignCueCueLayerExportBindingError", "CueLayers export is bound to the immutable saved editor snapshot and canvas dimensions");
  assertIncludes(cueLayersServer, "const committed = await requireCampaignCueFirestoreAdmin().runTransaction", "CueLayers repair uses a final commit transaction");
  assertIncludes(cueLayersServer, "committed = await requireCampaignCueFirestoreAdmin().runTransaction", "CueLayers export uses a final commit transaction");
  assertIncludes(cueLayersServer, "CAMPAIGNCUE_COLLECTIONS.ASSETS).doc(asset.id)", "CueLayers export registers its asset in the atomic commit");
  assertIncludes(cueLayersServer, "CAMPAIGNCUE_COLLECTIONS.EVENTS).doc(eventId)", "CueLayers export registers its audit event in the atomic commit");
  assertIncludes(cueLayersServer, "deleteStorageObjectBestEffort(exportOutputPath, \"stale_export_output\")", "CueLayers export removes stale uploaded output");
  assertIncludes(cueLayersServer, "deleteStorageObjectBestEffort(exportOutputPath, \"export_output\")", "CueLayers export compensates failed commit transactions");
  assertIncludes(cueLayersServer, "parseRenderedExportDataUrl", "CueLayers export validates rendered output bytes");
  assertIncludes(cueLayersServer, "path: exportOutputPath", "CueLayers export writes immutable output before asset registration");
  assertNotIncludes(cueLayersServer, "exportReportAsset", "CueLayers active v1 avoids duplicate export report artifacts");
  assertIncludes(cueLayersServer, "businessTruthSnapshot", "CueLayers snapshots business truth");
  assertIncludes(cueLayersServer, "protectedTextSnapshot", "CueLayers snapshots protected text truth");
  assertIncludes(cueLayersServer, "brandSnapshot", "CueLayers snapshots brand truth");
  assertIncludes(cueLayersServer, "brandPlaybook", "CueLayers source packages snapshot Brand Playbook truth");
  assertIncludes(cueLayersServer, "rightsSnapshot", "CueLayers snapshots rights truth");
  assertIncludes(cueLayersServer, "getSignedUrl", "CueLayers hydrates signed URLs only at boot");
  assertIncludes(cueLayersServer, "url: await signedUrlForAsset(asset)", "CueLayers signed URL is runtime hydration only");
  assertNotIncludes(cueLayersProjection, "signedUrl", "CueLayers durable projection avoids signedUrl field naming");
  assertIncludes(cueLayersServer, "dehydrateCampaignCueCueLayerDocumentAssets", "CueLayers dehydrates runtime URLs before persistence");
  assertIncludes(cueLayersServer, "collectLayerAssetIds", "CueLayers autosave validates image assets against layer index");
  assertIncludes(cueLayersDocumentBoundary, "documentValue.pages?.map", "CueLayers maps root and page elements at the persistence boundary");
  assertIncludes(cueLayersDocumentBoundary, "collectCampaignCueCueLayerDocumentAssetIds", "CueLayers identifies only document-referenced image assets for hydration");
  assertIncludes(cueLayersDocumentBoundary, "fingerprintCampaignCueCueLayerDocument", "CueLayers canonicalizes editor documents for export binding");
  assertIncludes(cueLayersServer, "Array.from(referencedAssetIds)", "CueLayers signs only image assets referenced by the editor document");
  assertIncludes(cueLayersDocumentBoundary, "CueLayers design asset is unavailable", "CueLayers boot fails closed when a referenced asset cannot be hydrated");
  assertIncludes(cueLayersDocumentBoundary, "existing design asset", "CueLayers rejects unknown cue asset references");
  assertIncludes(cueLayersServer, "readJsonArtifact(documentPath, CAMPAIGNCUE_CUE_LAYERS.MAX_EDITOR_DOCUMENT_BYTES)", "CueLayers bounds persisted editor artifact reads");
  assertIncludes(cueLayersServer, "parseCampaignCueCueLayerDesignRecord", "CueLayers validates persisted design identity");
  assertIncludes(cueLayersRecordBoundary, "expectedDesignId !== undefined && job.designId !== expectedDesignId", "CueLayers replay validates job-to-design identity without trusting the record itself");
  assertIncludes(cueLayersRecordBoundary, "CAMPAIGNCUE_CUE_LAYER_JOB_STATUSES.includes(job.status)", "CueLayers persisted job status is validated");
  assertIncludes(cueLayersServer, "parseCampaignCueCueLayerIndexArtifact", "CueLayers validates persisted layer-index identity");
  assertIncludes(cueLayersLayerIndexBoundary, "asset.assetScope?.workspaceId !== workspaceId", "CueLayers layer-index assets remain tenant scoped");
  assertIncludes(cueLayersLayerIndexBoundary, "CueLayers layer asset identity is inconsistent", "CueLayers rejects conflicting duplicate asset identities");
  assertIncludes(cueLayersLayerIndexBoundary, "CueLayers fallback asset reference is invalid", "CueLayers validates fallback asset references");
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
  assertIncludes(cueLayersModels, "readBooleanEnvironmentValue", "CueLayers model boolean gates are explicit");
  assertIncludes(cueLayersModels, "rolloutBucket < entry.rolloutPercent", "CueLayers partial rollout is enforced");
  assertNotIncludes(cueLayersModels, "Boolean(process.env.CAMPAIGNCUE_CUE_LAYERS_ENABLE_PREMIUM_MODEL)", "CueLayers premium gate avoids presence parsing");
  assertNotIncludes(cueLayersModels, "imagen", "CueLayers model registry avoids deprecated Imagen dependency");
  assertIncludes(cueLayersSchemas, "cue-asset://", "CueLayers schema accepts durable cue asset URI");
  assertIncludes(cueLayersSchemas, "/^(javascript|data):/i", "CueLayers schema blocks unsafe image URLs");
  assertIncludes(cueLayersSchemas, "MAX_FINAL_LAYERS", "CueLayers schema caps editor layer count");
  assertIncludes(cueLayersSchemas, ".strip()", "CueLayers schema strips unknown renderer properties");
  assertIncludes(cueLayersSchemas, "MAX_EDITOR_DOCUMENT_BYTES", "CueLayers schema caps editor document size");
  assertIncludes(cueLayersSchemas, "MAX_CANVAS_PIXELS", "CueLayers schema caps root and page canvas pixels");
  assertIncludes(cueLayersSchemas, "MAX_EDITOR_PAGES", "CueLayers schema caps editor page count");
  assertIncludes(cueLayersSchemas, "activePageId", "CueLayers schema preserves active page state");
  assertIncludes(cueLayersSchemas, "backgroundGradient", "CueLayers schema preserves canvas gradients");
  assertIncludes(cueLayersSchemas, "CreativeEditorMetadataSchema", "CueLayers allowlists durable shared-editor metadata");
  assertIncludes(cueLayersSchemas, "cannot persist external URLs", "CueLayers rejects external URLs in durable source metadata");
  assertIncludes(cueLayersSchemas, "printFrameLocked", "CueLayers schema preserves print-frame ownership metadata");
  assertIncludes(cueLayersSchemas, "errorCorrectionLevel", "CueLayers schema preserves QR correction settings");
  assertIncludes(cueLayersSchemas, "renderedDataUrl", "CueLayers export schema requires rendered bytes handoff");
  assertIncludes(cueLayersSchemas, "product-owned source reference", "CueLayers image schema requires product-owned asset reference");
  assertIncludes(cueLayersSchemas, '"900"', "CueLayers autosave accepts shared editor heavy font weight");
  assertIncludes(cueLayersIdempotency, "actorId !== expected.actorId", "CueLayers idempotency rejects cross-actor replay");
  assertIncludes(cueLayersIdempotency, "requestHash !== expected.requestHash", "CueLayers idempotency rejects changed-payload replay");
  assertIncludes(cueLayersServer, "transaction.get(ref),", "CueLayers idempotency reads claims transactionally");
  assertIncludes(cueLayersServer, "if (decision.kind === \"conflict\")", "CueLayers idempotency distinguishes an active duplicate claim");
  assertIncludes(cueLayersServer, "cueLayersIdempotencyCompletion", "CueLayers durable operations complete idempotency with their writes");
}

function verifyClientRuntime() {
  const app = read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx");
  const videoStudio = read("src/components/templates/campaigncue/CampaignCueVideoStudio.tsx");
  const videoCompositor = read("src/lib/campaigncue/videoCompositor.ts");
  const videoSchemas = read("src/lib/validation/campaigncueVideoSchemas.ts");
  const styles = read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.module.scss");
  const layout = read("src/app/(campaigncue)/layout.tsx");
  const enLocale = read("public/locales/menulist.ai/en-US.json");
  const hiLocale = read("public/locales/menulist.ai/hi-IN.json");
  const schemas = read("src/lib/validation/campaigncueSchemas.ts");
  const delivery = read("src/constants/campaigncue/delivery.ts");
  const campaignCueServer = read("src/lib/campaigncue/server.ts");
  const packageJson = read("package.json");
  const workspaceConstants = read("src/constants/campaigncue/workspace.ts");
  const navigationConstants = read("src/constants/campaigncue/navigations.ts");
  const appAndConstants = `${app}\n${workspaceConstants}\n${navigationConstants}`;

  assertIncludes(app, "credentials: \"include\"", "CampaignCue workspace fetch includes credentials");
  assertIncludes(app, "cache: \"no-store\"", "CampaignCue workspace fetch avoids stale auth data");
  assertIncludes(app, "updateOverview(", "CampaignCue mutation responses merge into local overview");
  assertIncludes(app, "getCampaignCueWorkspaceFailureNotice", "CampaignCue workspace fixed failure-notice helper");
  assertIncludes(app, "CAMPAIGNCUE_WORKSPACE_RESPONSE_JSON_MAX_BYTES", "CampaignCue workspace response cap");
  assertIncludes(app, "readCampaignCueWorkspaceData", "CampaignCue workspace shared response acknowledgement helper");
  assertIncludes(app, "readJsonResponseWithLimit<unknown>", "CampaignCue workspace bounded response parser");
  assertIncludes(app, "campaigncue_workspace_response_parse_failed", "CampaignCue workspace response parse diagnostic");
  assertIncludes(app, "campaigncue_workspace_response_rejected", "CampaignCue workspace response rejected diagnostic");
  assertIncludes(app, "campaigncue_workspace_response_invalid", "CampaignCue workspace response invalid diagnostic");
  assertIncludes(app, "if (payload.ok === false)", "CampaignCue workspace narrows failed acknowledgements before reading failure-only fields");
  assertIncludes(app, '"message" in payload && payload.message', "CampaignCue campaign action guards the bounded failure acknowledgement message");
  assertIncludes(app, '"Action could not be recorded."', "CampaignCue campaign action retains a fixed failure fallback");
  assertIncludes(app, "isCampaignCueOverviewData", "CampaignCue workspace overview response guard");
  assertIncludes(app, "isCueLayerBootPackageData", "CampaignCue CueLayers boot response guard");
  assertIncludes(app, "isCueLayerUploadResultData", "CampaignCue CueLayers upload response guard");
  assertIncludes(app, "isAssetDownloadData", "CampaignCue asset-download response guard");
  assertNotIncludes(app, "setNotice(error instanceof Error ? error.message", "CampaignCue workspace notices avoid raw exception messages");
  assertNotIncludes(app, "error: error instanceof Error ? error.message", "CampaignCue workspace template state avoids raw exception messages");
  assertNotIncludes(app, "payload?.error ||", "CampaignCue workspace response branches avoid raw API response text");
  assertNotIncludes(app, "res.json().catch(() => ({})", "CampaignCue workspace avoids silent direct JSON fallback");
  assertNotIncludes(app, "await res.json()", "CampaignCue workspace avoids direct response JSON parsing");
  assertNotIncludes(app, "await load();", "CampaignCue successful mutations avoid full overview reloads");
  assertIncludes(app, "state.status === 401", "CampaignCue signed-out state");
  assertIncludes(app, "CAMPAIGNCUE_ERROR_CODES.FIREBASE_UNAVAILABLE", "CampaignCue setup-blocked client mapping");
  assertIncludes(app, "business-brand-feel", "CampaignCue Business details exposes Brand Playbook feel field");
  assertIncludes(app, "business-avoid-list", "CampaignCue Business details exposes Brand Playbook avoid-list field");
  assertIncludes(app, "Campaign proof deck", "CampaignCue OutputPackSummary shows proof deck status");
  assertIncludes(app, "brand-avoid-list", "CampaignCue editor protected facts include Brand Playbook avoid list");
  assertIncludes(schemas, "optionalTextList", "CampaignCue business patch schema accepts bounded Brand Playbook lists");
  assertIncludes(schemas, "visualMotifs", "CampaignCue business patch schema validates Brand Playbook visual motifs");
  [
    "Daily campaign desk",
    "Business details",
    "Missing Input Inbox",
    "Export and download",
    "Owner settings",
    "Campaign ideas",
    "Campaign packs",
    "Creative outputs",
    "Reel projects",
    "Creator scripts",
    "WhatsApp drafts",
    "Google local drafts",
    "Ad handoffs",
    "Can this be used?",
    "Manual campaign reminders",
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
  assertIncludes(app, "recordAction(editorContext.campaign as CampaignCueCampaign, \"export\")", "CampaignCue editor ZIP uses protected export action");
  assertNotIncludes(app, "downloadCampaignPackZip", "CampaignCue editor has no pre-authorization ZIP download helper");
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
  assertIncludes(app, "AI assistance plan", "CampaignCue owner home surfaces bounded AI assistance");
  assertIncludes(app, "The model does not choose campaigns, change protected facts, or post anywhere.", "CampaignCue AI assistance copy preserves owner boundary");
  assertIncludes(app, "AIAssistancePlan", "CampaignCue owner UI renders AI assistance plan component");
  assertIncludes(app, "## AI assistance plan", "CampaignCue pack export includes AI assistance summary");
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
  assertIncludes(app, "copyCampaignCueHandoffValueToClipboard", "CampaignCue manual handoff copy acknowledgement helper");
  assertIncludes(app, "campaigncue_handoff_copy_clipboard_unavailable", "CampaignCue manual handoff unavailable clipboard failure code");
  assertIncludes(app, "campaigncue_handoff_copy_fallback_failed", "CampaignCue manual handoff fallback failure code");
  assertIncludes(app, "campaigncue_handoff_copy_failed", "CampaignCue manual handoff copy failure diagnostic");
  assertIncludes(app, "hasCampaignCueHandoffClipboardWrite", "CampaignCue manual handoff Clipboard support helper");
  assertIncludes(app, "hasCampaignCueHandoffCopyFallback", "CampaignCue manual handoff fallback support helper");
  assertIncludes(app, "const copied = document.execCommand(\"copy\");", "CampaignCue manual handoff textarea copy acknowledgement");
  assertIncludes(app, "hasClipboardWrite", "CampaignCue manual handoff clipboard support metadata");
  assertIncludes(app, "hasCopyFallback: hasCampaignCueHandoffCopyFallback()", "CampaignCue manual handoff fallback support metadata");
  assertNotIncludes(app, "void navigator.clipboard.writeText(value)\n            .then", "CampaignCue manual handoff avoids direct clipboard promise chain");
  assertNotIncludes(app, "await navigator.clipboard.writeText(value);\n};", "CampaignCue manual handoff avoids Clipboard-only acknowledgement");
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
  assertIncludes(app, "cueLayerSaveQueueRef.current.then(saveOperation, saveOperation)", "CampaignCue CueLayers serializes autosaves across slow responses");
  assertIncludes(app, "activeCueLayerRevisionRef.current = revision", "CampaignCue CueLayers advances the authoritative revision before the next queued save");
  assertIncludes(app, "cueLayerSessionRef.current !== sessionAtRequest", "CampaignCue CueLayers ignores saves from an obsolete editor session");
  assertIncludes(app, "requestId === cueLayerListRequestRef.current", "CampaignCue CueLayers ignores obsolete list responses");
  assertIncludes(app, "currentWorkspaceRole, data?.workspace.workspaceId", "CampaignCue CueLayers reloads after member identity becomes available");
  assertIncludes(app, "requestId !== packTemplateRequestRef.current", "CampaignCue templates ignore obsolete catalog and overflow responses");
  assertIncludes(app, "currentWorkspaceRole,", "CampaignCue templates reload after member identity becomes available");
  assertIncludes(app, "repairCueLayerFallback", "CampaignCue CueLayers fallback repair action");
  assertIncludes(app, "getCampaignCueCueLayersExportApiPath", "CampaignCue CueLayers export API path helper");
  assertIncludes(app, "allowRasterImports={!activeCueLayerDesign}", "CampaignCue CueLayers disables unsafe raster imports in shared editor");
  assertIncludes(app, 'disabledExportFormats={activeCueLayerDesign ? ["svg", "json"] : []}', "CampaignCue CueLayers disables unsafe browser exports in shared editor");
  assertIncludes(app, "saveCueLayerDocumentNow(result.document)", "CampaignCue CueLayers saves exact export document before export registration");
  assertIncludes(app, "sourceRevision: savedRevision ?? activeCueLayerRevision", "CampaignCue CueLayers export pins to saved revision");
  assertIncludes(app, "renderedDataUrl: result.dataUrl", "CampaignCue CueLayers sends rendered export bytes");
  assertIncludes(app, "getCampaignCueAssetDownloadApiPath", "CampaignCue Asset Library uses scoped download API");
  assertIncludes(app, "CampaignCueVideoStudio", "CampaignCue Video Reel Studio is mounted in the Video/Reel workspace");
  assertIncludes(app, "key={data.workspace.workspaceId}", "Video Reel Studio remounts at the exact workspace boundary");
  assertIncludes(videoStudio, "CAMPAIGNCUE_API_ROUTES.VIDEO_PROJECTS", "Video Reel Studio uses the product-scoped project API path");
  assertIncludes(videoStudio, "activeWorkspaceRef.current !== requestWorkspaceId", "Video Reel Studio rejects obsolete workspace responses");
  assertIncludes(videoStudio, "if (!isActiveWorkspace()) return;", "Video Reel Studio fences parent-visible and binary settlements to the active workspace");
  assertIncludes(videoStudio, "renderController.current?.abort();", "Video Reel Studio aborts local rendering on workspace unmount");
  assertIncludes(videoStudio, "tryAnotherSceneLine", "Video Reel Studio offers deterministic checked scene-line alternatives");
  assertIncludes(videoStudio, "Skip this scene", "Video Reel Studio exposes explicit scene inclusion control");
  assertIncludes(videoStudio, "Version history", "Video Reel Studio exposes bounded project history");
  assertIncludes(videoStudio, "Render attempts", "Video Reel Studio exposes bounded render history");
  assertIncludes(videoStudio, "Choose or record the narration again before rendering", "Video Reel Studio prevents silent narration loss after reload");
  assertIncludes(videoStudio, "sessionMediaRightsConfirmed", "Video Reel Studio requires a session-media rights confirmation");
  assertIncludes(videoStudio, "draft.status !== \"approved\"", "Video Reel Studio blocks render until the current version is approved");
  assertIncludes(videoStudio, "0 provider credits", "Video Reel Studio shows its zero-provider-cost boundary");
  assertIncludes(videoStudio, "downloadCampaignCueVideo", "Video Reel Studio downloads the locally rendered binary");
  assertIncludes(videoStudio, "Download storyboard", "Video Reel Studio exposes its manual storyboard fallback");
  assertIncludes(videoStudio, "clearLocalSceneImage", "Video Reel Studio clears ambiguous local image overrides");
  assertIncludes(videoStudio, "Video downloaded, but CampaignCue could not confirm its render receipt", "Video Reel Studio distinguishes download success from receipt-sync failure");
  assertIncludes(videoStudio, "Remove narration", "Video Reel Studio lets the owner remove session-only narration");
  assertIncludes(videoStudio, "Private Asset Library upload", "Video Reel Studio exposes direct private reusable media intake");
  assertIncludes(videoStudio, "Record narration", "Video Reel Studio exposes local narration recording");
  assertIncludes(videoStudio, "Lower music under narration", "Video Reel Studio exposes separate voice and music ducking");
  assertIncludes(videoStudio, "Optional human review", "Video Reel Studio exposes the optional human-review surface");
  assertIncludes(videoStudio, "Add a bounded review note", "Video Reel Studio preserves bounded review-note intake");
  assertIncludes(videoStudio, "Video content coach", "Video Reel Studio exposes deterministic owner-facing content checks");
  assertIncludes(videoStudio, "Phone shot list", "Video Reel Studio exposes a scene-linked phone capture guide");
  assertIncludes(videoStudio, "What this business learned", "Video Reel Studio explains format-level result memory without competitor surveillance");
  assertIncludes(videoStudio, "render_progress", "Video Reel Studio persists bounded render checkpoints");
  assertIncludes(videoStudio, "Cancel render", "Video Reel Studio exposes render cancellation");
  assertIncludes(videoStudio, "Reuse a proven structure", "Video Reel Studio reuses useful structure without cloning source truth");
  assertIncludes(videoCompositor, "canvas.captureStream", "CampaignCue compositor records an owned canvas stream");
  assertIncludes(videoCompositor, "MediaRecorder.isTypeSupported", "CampaignCue compositor selects only native recording formats");
  assertIncludes(videoCompositor, "CAMPAIGNCUE_VIDEO_ASPECT_PRESETS", "CampaignCue compositor uses governed aspect presets");
  assertIncludes(videoCompositor, 'params.project.status !== "approved"', "CampaignCue compositor independently enforces approved project state");
  assertIncludes(videoCompositor, "scene.enabled", "CampaignCue compositor excludes skipped scenes");
  assertIncludes(videoCompositor, "cleanupCampaignCueRenderResources", "CampaignCue compositor centralizes stream, audio, object URL, and AudioContext teardown");
  assertIncludes(videoCompositor, "await cleanupCampaignCueRenderResources({", "CampaignCue compositor cleans resources when recorder construction fails and after rendering");
  assertOccurrenceCount(videoCompositor, "await cleanupCampaignCueRenderResources({", 2, "CampaignCue compositor cleans both recorder-construction failure and terminal render paths");
  assertIncludes(videoCompositor, "blob.size > CAMPAIGNCUE_VIDEO_STUDIO.MAX_RENDER_SIZE_BYTES", "CampaignCue compositor rejects browser output that cannot fit the persisted render-receipt contract");
  assertIncludes(videoSchemas, "At least one scene must be included", "CampaignCue video validation rejects an empty included timeline");
  assertNotIncludes(videoCompositor, "fetch(", "CampaignCue compositor makes no provider or upload network call");
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
  assertIncludes(app, "tChrome(CAMPAIGNCUE_TAB_TRANSLATION_KEYS[item.key])", "CampaignCue sidebar tab labels use typed translations");
  assertIncludes(app, "tChrome(CAMPAIGNCUE_GROUP_TRANSLATION_KEYS[group])", "CampaignCue sidebar group labels use typed translations");
  assertNotIncludes(app, "session as any", "CampaignCue owner chrome consumes the declared NextAuth session contract");
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
  assertIncludes(layout, "resolveCurrentSessionUserDocumentId(session)", "CampaignCue protected layout rejects ambiguous actor aliases");
  assertNotIncludes(layout, "@providers/sessionProvider", "CampaignCue shell avoids MenuList store/subscription bootstrap reads");
  assertIncludes(styles, "@media (max-width: 640px)", "CampaignCue mobile responsive breakpoint");
  assertIncludes(schemas, "const optionalUrl", "CampaignCue optional URL fields can be blank");
  assertIncludes(schemas, "return trimmed ? trimmed : null", "CampaignCue blank URL normalization");
  assertIncludes(schemas, "CAMPAIGNCUE_EXPORT_ACTIONS", "CampaignCue schema uses delivery action constants");
  assertIncludes(delivery, "\"record_outcome\"", "CampaignCue delivery constants include outcome action");
  assertIncludes(delivery, "\"record_result_evidence\"", "CampaignCue delivery constants include copied report evidence action");
  assertNotIncludes(delivery, "\"copy\"", "CampaignCue active delivery constants exclude clipboard-copy action");
  assertIncludes(delivery, "CAMPAIGNCUE_META_ADS_MCP_POSTURE", "CampaignCue delivery constants record Meta Ads MCP posture");
  assertIncludes(delivery, 'rolloutMode: "read_first"', "CampaignCue Meta Ads MCP posture is read-first");
  assertIncludes(delivery, '"comprehensive_reporting"', "CampaignCue Meta Ads MCP posture admits reporting as a future read candidate");
  assertIncludes(delivery, '"activity_logs"', "CampaignCue Meta Ads MCP posture admits activity logs as a future read candidate");
  assertIncludes(delivery, '"signals_and_datasets"', "CampaignCue Meta Ads MCP posture admits signal health as a future read candidate");
  assertIncludes(delivery, '"help_and_troubleshooting"', "CampaignCue Meta Ads MCP posture admits troubleshooting as a future read candidate");
  assertIncludes(delivery, '"ad_budget_mutate"', "CampaignCue disabled provider actions reject ad budget mutation");
  assertIncludes(delivery, '"ad_catalog_mutate"', "CampaignCue disabled provider actions reject catalog mutation");
  assertIncludes(delivery, '"ad_experiment_mutate"', "CampaignCue disabled provider actions reject experiment mutation");
  assertNotIncludes(schemas, "\"direct_publish\"", "CampaignCue action schema rejects direct publish");
  assertNotIncludes(schemas, "\"direct_send\"", "CampaignCue action schema rejects direct send");
  assertNotIncludes(schemas, "\"provider_metrics_import\"", "CampaignCue action schema rejects provider metric import");
  assertNotIncludes(schemas, "\"ad_create\"", "CampaignCue action schema rejects ad creation");
  assertNotIncludes(packageJson, "@modelcontextprotocol/", "CampaignCue adds no MCP SDK dependency");
  assertNotIncludes(campaignCueServer, "mcp.facebook.com/ads", "CampaignCue server makes no Meta Ads MCP network call");
  assertNotIncludes(campaignCueServer, "adPerformanceSnapshots", "CampaignCue server creates no speculative ad performance collection");
  assertNotIncludes(campaignCueServer, "adPublishJobs", "CampaignCue server creates no speculative ad publish jobs");
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
  assertIncludes(designCueContext, "brandAvoidList", "Design Cue context tracks Brand Playbook avoid list");
  assertIncludes(designCueIntent, "resolveCampaignCueDesignCueFreeTextAction", "Design Cue deterministic free-text resolver");
  assert(
    designCueIntent.indexOf("whatsapp ready|ready for whatsapp|whatsapp pack")
      < designCueIntent.indexOf("whatsapp|phone|call|contact|booking"),
    "Design Cue WhatsApp-ready intent must precede generic contact intent",
  );
  assert(
    designCueIntent.indexOf("print ready|ready for print|poster ready|flyer ready")
      < designCueIntent.indexOf("poster|print|flyer"),
    "Design Cue print-ready intent must precede generic resize intent",
  );
  assertIncludes(designCueIntent, "buildCampaignCueDesignCueUnsupportedPatch", "Design Cue unknown requests fail closed");
  assertIncludes(designCuePatches, "missing-location", "Design Cue missing location creates review finding");
  assertIncludes(designCuePatches, "missing-contact", "Design Cue missing contact creates review finding");
  assertIncludes(designCuePatches, "buildCampaignCueDesignCueChannelReadyPatch", "Design Cue channel readiness checks are deterministic findings");
  assertIncludes(designCuePatches, "brand-avoid-term", "Design Cue brand check warns on Brand Playbook avoid-list wording");
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
  assertIncludes(fabricAdapter, "object.hasControls = !locked", "Shared editor loaded locked layers hide Fabric resize handles");
  assertIncludes(fabricAdapter, "hasControls: !nextLocked", "Shared editor toggled locked layers hide Fabric resize handles");
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
  assertIncludes(editor, "showCreativeEditorFailure", "Shared editor bounded failure helper");
  [
    "creative_editor_canvas_load_failed",
    "creative_editor_fabric_load_failed",
    "creative_editor_ai_suggestion_copy_failed",
    "creative_editor_ai_tool_failed",
    "creative_editor_design_cue_failed",
    "creative_editor_design_cue_apply_failed",
    "creative_editor_design_import_failed",
    "creative_editor_image_import_failed",
    "creative_editor_image_replace_failed",
    "creative_editor_png_clipboard_copy_failed",
    "creative_editor_base64_clipboard_copy_failed",
    "creative_editor_export_bundle_failed",
    "creative_editor_export_failed",
    "creative_editor_template_save_failed",
  ].forEach((failureCode) => {
    assertIncludes(editor, failureCode, `Shared editor bounded failure code ${failureCode}`);
  });
  assertNotIncludes(editor, "setNotice(error instanceof Error ? error.message", "Shared editor notices do not surface raw exception messages");
  assertNotIncludes(editor, "text: error instanceof Error ? error.message", "Shared editor AI findings do not surface raw exception messages");
  assertIncludes(editor, "finishPolygonDraft", "Shared editor interactive polygon drawing");
  assertIncludes(editor, "distributeSelection", "Shared editor multi-select distribution");
  assertIncludes(editor, "copyBase64ToClipboard", "Shared editor base64 clipboard export");
  assertIncludes(editor, "copyPngToClipboard", "Shared editor PNG clipboard export");
  assertIncludes(editor, "copyRuntimeTextToClipboard(suggestionValue.text)", "Shared editor AI suggestion copy uses acknowledged text clipboard helper");
  assertIncludes(editor, "copyRuntimeTextToClipboard(dataUrl)", "Shared editor base64 copy uses acknowledged text clipboard helper");
  assertIncludes(editor, "hasClipboardWrite: hasRuntimeClipboardWrite()", "Shared editor text-copy diagnostics include Clipboard API support");
  assertIncludes(editor, "hasCopyFallback: hasRuntimeCopyFallback()", "Shared editor text-copy diagnostics include fallback support");
  assertIncludes(editor, "suggestionTextLength: suggestionValue.text.length", "Shared editor AI suggestion copy logs bounded text length only");
  assertIncludes(editor, "base64TextLength: dataUrl.length", "Shared editor base64 copy logs bounded text length only");
  assertNotIncludes(editor, "await navigator.clipboard.writeText(suggestionValue.text)", "Shared editor AI suggestion copy must not use direct Clipboard API success");
  assertNotIncludes(editor, "await navigator.clipboard.writeText(dataUrl)", "Shared editor base64 copy must not use direct Clipboard API success");
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
  assertIncludes(editor, "getBoundingRect()", "Shared editor floating toolbar uses Fabric 7 scene-plane selection bounds");
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
  assertIncludes(editor, "draggable={!activePageLocked && !element.locked && !element.printFrameLocked}", "Shared editor prevents locked and protected layers from being dragged");
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
  assertIncludes(campaigncueProvider, "productId: CAMPAIGNCUE_PRODUCT_CODE", "CampaignCue adapter sets CC product context");
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
  assertIncludes(campaigncueProvider, "brand-visual-motifs", "CampaignCue adapter supplies Brand Playbook placeholders");
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
  const client = read("src/lib/firebase/campaigncueFirebaseClient.ts");
  const clientConfig = read("src/lib/firebase/campaigncueConfig.ts");

  assertIncludes(config, "firestore-campaigncue.rules", "CampaignCue Firebase config Firestore rules");
  assertIncludes(config, "storage-campaigncue.rules", "CampaignCue Firebase config Storage rules");
  assertIncludes(admin, "CAMPAIGNCUE_FIREBASE_APP_NAME", "CampaignCue Admin app name constant");
  assertIncludes(admin, "CAMPAIGNCUE_FIREBASE_CREDENTIAL_PREFIX", "CampaignCue Admin env prefix constant");
  assertIncludes(admin, "CAMPAIGNCUE_FIREBASE_ENV", "CampaignCue Admin env names constant");
  assertIncludes(admin, "campaigncue_admin_project_mismatch", "CampaignCue Admin rejects cross-product env credentials");
  assertIncludes(admin, "isExpectedCampaignCueProjectId(projectId, campaigncueFirebaseProjectId)", "CampaignCue Admin validates env and file credential projects");
  assertNotIncludes(admin, "null as unknown as admin.", "CampaignCue Admin unavailable services retain honest nullable types");
  assertIncludes(admin, "function requireCampaignCueAdminService<T>(service: T | null, serviceName: string): T", "CampaignCue Admin fail-closed service accessor");
  assertIncludes(admin, "CampaignCue Firebase Admin ${serviceName} is unavailable.", "CampaignCue Admin unavailable-service error boundary");
  assertIncludes(admin, "requireCampaignCueFirestoreAdmin", "CampaignCue Admin Firestore accessor export");
  assertIncludes(admin, "requireCampaignCueStorageAdmin", "CampaignCue Admin Storage accessor export");
  assertIncludes(admin, "requireCampaignCueAuthAdmin", "CampaignCue Admin Auth accessor export");
  assertIncludes(clientConfig, "CAMPAIGNCUE_FIREBASE_MODE_ALIASES", "CampaignCue Firebase mode aliases constant");
  assertIncludes(clientConfig, "if (params.nodeEnv === \"production\") return \"separate\";", "CampaignCue production Firebase mode is dedicated");
  assertIncludes(clientConfig, "isExpectedCampaignCueProjectId", "CampaignCue client config validates the governed project");
  assertIncludes(clientConfig, "const campaigncueFirebaseProjectId = expectedCampaignCueProjectId;", "CampaignCue runtime project stays stage-governed");
  assertIncludes(client, "initializeApp(campaigncueBrowserConfig, CAMPAIGNCUE_APP_NAME)", "CampaignCue browser auth uses a named app in shared and separate project modes");
  assertNotIncludes(client, "shouldUseSharedCampaignCueFirebase ? firebaseAuth", "CampaignCue purpose-scoped auth cannot reuse the primary MenuList auth instance");
  const sessionClient = read("src/lib/campaigncue/firebaseSessionClient.ts");
  assertIncludes(sessionClient, "waitForIdleSession", "CampaignCue Firebase sessions wait for an active different-purpose operation instead of failing the user action");
  assertIncludes(sessionClient, "notifyIdleSession", "CampaignCue Firebase session waiters resume after the active operation releases");
  assertIncludes(firestoreRules, "allow read, write: if false", "CampaignCue Firestore default deny");
  assertIncludes(firestoreRules, "allow write: if false", "CampaignCue Firestore server-only writes");
  assertIncludes(firestoreRules, "match /sourceInputs/{docId}", "CampaignCue source inputs rules");
  assertIncludes(firestoreRules, "Campaign records are read through bounded server APIs", "CampaignCue raw creative records stay off direct client Firestore access");
  assertIncludes(firestoreRules, "hasCampaignCueFirebasePurpose('template_read')", "CampaignCue direct template reads require a purpose-scoped token");
  assertIncludes(firestoreRules, "hasCampaignCueFirebasePurpose('workspace_template_write')", "CampaignCue direct template writes require a purpose-scoped token");
  assertNotIncludes(firestoreRules, "isCampaignCueCreativeWorkspaceMemberById", "CampaignCue rules do not grant broad direct reads to branch or review roles");
  assertIncludes(firestoreRules, "match /idempotencyKeys/{docId}", "CampaignCue idempotency keys private");
  assertIncludes(storageRules, "allow read, write: if false", "CampaignCue Storage default deny");
  assertIncludes(storageRules, "hasCampaignCueMediaUploadScope(uploadId)", "CampaignCue media writes require an exact upload-folder claim");
  assertIncludes(storageRules, "mediaSourceFileName", "CampaignCue media writes require the exact admitted source filename");
  assertIncludes(storageRules, "allow update: if false", "CampaignCue private asset objects cannot be overwritten");
  assertIncludes(storageRules, "resource == null", "CampaignCue template and media artifacts use create-only writes");
  assertIncludes(storageRules, "audio/(mpeg|mp4|wav|ogg|webm)", "CampaignCue private Storage admits bounded audio formats");
  assertIncludes(storageRules, "request.resource.size <= 250 * 1024 * 1024", "CampaignCue Storage size cap");
  assertIncludes(storageRules, "isCampaignCueWorkspaceContentManager(workspaceId)", "CampaignCue Storage upload scope retains the content-manager role gate");
  assertIncludes(storageRules, "isCurrentCampaignCueWorkspaceContentManager", "CampaignCue platform template artifacts require a workspace content manager");
  assertNotIncludes(storageRules, "isCurrentCampaignCueCreativeWorkspaceMember", "CampaignCue Storage does not expose platform artifacts to branch or review roles");
  assertIncludes(firestoreRules, "match /cueLayerDesigns/{docId}", "CampaignCue CueLayers design rules");
  assertIncludes(firestoreRules, "match /videoProjects/{docId}", "CampaignCue Video Reel Studio project rules");
  assertIncludes(firestoreRules, "match /cueLayerCostRecords/{docId}", "CampaignCue CueLayers cost records are admin-only");
  assertIncludes(storageRules, "match /campaigncue/cue-layers/{workspaceId}/{designId}/{allPaths=**}", "CampaignCue CueLayers storage path rule");
  assertIncludes(storageRules, "allow read, write, delete: if false", "CampaignCue CueLayers artifacts stay behind signed server hydration");
  const parsedIndexes = JSON.parse(indexes);
  assert(parsedIndexes.indexes?.length === 0, "CampaignCue must not retain unused composite indexes");
  assert(
    parsedIndexes.fieldOverrides?.some((entry) => (
      entry.collectionGroup === "idempotencyKeys"
      && entry.fieldPath === "expiresAt"
      && entry.ttl === true
      && Array.isArray(entry.indexes)
      && entry.indexes.length === 0
    )),
    "CampaignCue idempotency expiry has a TTL policy and no unused index",
  );
  assertNotIncludes(read("src/lib/campaigncue/server.ts"), "collectionGroup(", "CampaignCue server cross-workspace collection-group query");
  assertNotIncludes(read("src/lib/campaigncue/cue-layers/server.ts"), "collectionGroup(", "CampaignCue CueLayers cross-workspace collection-group query");
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
    "src/constants/campaigncue/videoReel.ts",
    "src/constants/campaigncue/website.ts",
    "src/constants/campaigncue/websiteFeatures.ts",
    "src/constants/campaigncue/websiteUseCases.ts",
    "src/constants/campaigncue/workspace.ts",
  ];
  constantFiles.forEach((relPath) => assert(exists(relPath), `${relPath} exists`));
  assert(!exists("src/constants/campaigncue.ts"), "CampaignCue flat constants file removed");

  const product = read("src/constants/campaigncue/product.ts");
  const productIds = read("src/constants/product.ts");
  const database = read("src/constants/campaigncue/database.ts");
  const cueLayers = read("src/constants/campaigncue/cueLayers.ts");
  const designCue = read("src/constants/campaigncue/designCue.ts");
  const delivery = read("src/constants/campaigncue/delivery.ts");
  const videoReel = read("src/constants/campaigncue/videoReel.ts");
  const domains = read("src/constants/campaigncue/domains.ts");
  const routes = read("src/constants/campaigncue/routes.ts");
  const firebase = read("src/constants/campaigncue/firebase.ts");
  const navigations = read("src/constants/campaigncue/navigations.ts");
  const workspace = read("src/constants/campaigncue/workspace.ts");
  const website = read("src/constants/campaigncue/website.ts");
  const websiteFeatures = read("src/constants/campaigncue/websiteFeatures.ts");
  const websiteUseCases = read("src/constants/campaigncue/websiteUseCases.ts");
  const loader = read("src/components/organisms/loader/index.tsx");
  const productDomains = read("src/constants/productDomains.ts");
  const domainResolver = read("src/lib/multiTenant/domainResolver.ts");
  const urls = read("src/constants/urls.ts");
  const reservedSlugs = read("src/constants/reservedSlugs.ts");
  const apiSchemas = read("src/lib/validation/apiSchemas.ts");
  const billingPlans = read("src/lib/billing/productBillingPlans.ts");
  const billingServer = read("src/lib/billing/productBillingServer.ts");
  const platformNotificationRegistry = read("src/data/shared/platformNotificationRegistry.ts");
  const functionsPlatformNotificationRegistry = read("functions/src/sharedData/platformNotificationRegistry.ts");
  const platformNotificationsRoute = read("src/app/api/ops/platform-notifications/route.ts");
  const platformNotificationMonitor = read("src/components/templates/main-app/platform/platformNotificationMonitor/index.tsx");

  assertIncludes(productIds, "CAMPAIGNCUE: 'CC'", "CampaignCue internal product code");
  assertIncludes(product, "CAMPAIGNCUE_PRODUCT_CODE", "CampaignCue product code constant");
  assertIncludes(product, "CAMPAIGNCUE_PRODUCT_SLUG", "CampaignCue product slug constant");
  assertIncludes(product, "CAMPAIGNCUE_SIGNIN_PRODUCT_PARAM = CAMPAIGNCUE_PRODUCT_SLUG", "CampaignCue signin param uses route slug");
  assertIncludes(read("src/lib/campaigncue/server.ts"), "productId: CAMPAIGNCUE_PRODUCT_CODE", "CampaignCue workspace/log metadata uses CC product code");
  assertIncludes(read("src/types/campaigncue.ts"), "productId: typeof CAMPAIGNCUE_PRODUCT_CODE", "CampaignCue workspace type uses CC product code");
  assertIncludes(apiSchemas, "['ML', 'AL', 'CC']", "Payment schema recognizes CampaignCue product code");
  assertIncludes(billingPlans, "normalized === PRODUCT_IDS.CAMPAIGNCUE", "Billing normalizer preserves CampaignCue product code");
  assertIncludes(billingPlans, "isCampaignCueBillingProduct", "Billing helper can identify disabled CampaignCue billing");
  assertIncludes(billingServer, "CampaignCue billing is not configured.", "CampaignCue billing fails closed instead of MenuList fallback");
  assertIncludes(platformNotificationRegistry, "'PLATFORM' | 'ML' | 'AL' | 'CC' | 'MC'", "Platform notification metadata accepts CampaignCue product code");
  assertIncludes(functionsPlatformNotificationRegistry, "'PLATFORM' | 'ML' | 'AL' | 'CC' | 'MC'", "Functions platform notification metadata mirrors CampaignCue product code");
  assertIncludes(platformNotificationsRoute, "['PLATFORM', 'ML', 'AL', 'CC', 'MC']", "Manual platform alert product selector accepts CampaignCue product code");
  assertIncludes(platformNotificationMonitor, "CC: 'CampaignCue'", "Platform notification monitor labels CampaignCue product code");
  assertIncludes(database, "CAMPAIGNCUE_COLLECTIONS", "CampaignCue collection constants");
  assertIncludes(database, "CAMPAIGNCUE_MAX_ASSET_SIZE_BYTES", "CampaignCue asset size constant");
  assertIncludes(database, "CUE_LAYER_DESIGNS", "CampaignCue CueLayers design collection constant");
  assertIncludes(database, "VIDEO_PROJECTS", "CampaignCue Video Reel Studio collection constant");
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
  assertIncludes(delivery, 'provider: "video_render"', "CampaignCue delivery registry identifies video rendering");
  assertIncludes(delivery, 'label: "In-house video export"', "CampaignCue delivery registry names the active owned renderer accurately");
  assertIncludes(videoReel, "CAMPAIGNCUE_VIDEO_MIME_CANDIDATES", "CampaignCue video MIME allowlist constants");
  assertIncludes(videoReel, '"9:16"', "CampaignCue video presets include portrait rendering");
    assertIncludes(domains, "isCampaignCueRuntimeRoute", "CampaignCue runtime route helper");
    assertIncludes(domains, "CAMPAIGNCUE_APP_INTERNAL_BASE_PATH", "CampaignCue app route-group base path constant");
    assertIncludes(domains, "CAMPAIGNCUE_APP_INTERNAL_WORKSPACE_PATH", "CampaignCue app workspace route-group path constant");
    assertIncludes(domains, "getCampaignCueWorkspaceRewritePath", "CampaignCue product-domain workspace rewrite helper");
    assertIncludes(domains, "startsWith(`${CAMPAIGNCUE_WORKSPACE_PATH}/`)", "CampaignCue workspace rewrite supports deep-link subpaths");
  assertIncludes(routes, "CAMPAIGNCUE_API_ROUTES", "CampaignCue API route constants");
  assertIncludes(routes, "CAMPAIGN_ACTION_TEMPLATE", "CampaignCue action route template");
  assertIncludes(routes, "CUE_LAYERS_UPLOADS", "CampaignCue CueLayers upload route constant");
  assertIncludes(routes, "DESIGN_CUE_TURNS", "CampaignCue Design Cue route constant");
  assertIncludes(routes, "VIDEO_PROJECTS", "CampaignCue Video Reel Studio route constant");
  assertIncludes(routes, "getCampaignCueAssetDownloadApiPath", "CampaignCue asset download route helper");
  assertIncludes(routes, "getCampaignCueCueLayersBootApiPath", "CampaignCue CueLayers boot route helper");
  assertIncludes(firebase, "CAMPAIGNCUE_FIREBASE_ENV", "CampaignCue Firebase env constants");
  assertIncludes(navigations, "CAMPAIGNCUE_WORKSPACE_TABS", "CampaignCue workspace navigation constants");
  assertIncludes(navigations, "Daily desk", "CampaignCue workspace navigation names the owner daily desk");
  assertIncludes(workspace, "CAMPAIGNCUE_CHANNEL_STUDIO_COPY", "CampaignCue workspace copy constants");
  assertIncludes(read("src/constants/campaigncue/index.ts"), "dailyDesk", "CampaignCue barrel exports product-scoped Daily Desk constants");
  assertIncludes(read("src/constants/campaigncue/index.ts"), "websiteFeatures", "CampaignCue barrel exports product-scoped website feature constants");
  assertIncludes(read("src/constants/campaigncue/index.ts"), "websiteUseCases", "CampaignCue barrel exports product-scoped website use-case constants");
  assertIncludes(website, "CAMPAIGNCUE_WEBSITE_FEATURES.map", "CampaignCue public sitemap pages derive from product-scoped feature catalog");
  assertIncludes(website, "CAMPAIGNCUE_WEBSITE_USE_CASES.map", "CampaignCue public sitemap pages derive from product-scoped use-case catalog");
  assertIncludes(websiteFeatures, "CAMPAIGNCUE_WEBSITE_FEATURE_PATHS", "CampaignCue website feature path constants exist");
  assertIncludes(websiteFeatures, "daily-campaign-desk", "CampaignCue website feature catalog includes Daily Campaign Desk page");
  assertIncludes(websiteFeatures, "campaign-pack-studio", "CampaignCue website feature catalog includes Campaign Pack Studio page");
  assertIncludes(websiteFeatures, "creative-studio", "CampaignCue website feature catalog includes Creative Studio page");
  assertIncludes(websiteFeatures, "cuelayers", "CampaignCue website feature catalog includes CueLayers page");
  assertIncludes(websiteFeatures, "video-reel-studio", "CampaignCue website feature catalog includes Video Reel Studio page");
  assertIncludes(websiteFeatures, "creative-trust-center", "CampaignCue website feature catalog includes Creative Trust Center page");
  assertIncludes(websiteFeatures, "brand-playbook-proof-deck", "CampaignCue website feature catalog includes Brand Playbook and Proof Deck page");
  assertIncludes(websiteFeatures, "reusable-pack-templates", "CampaignCue website feature catalog includes Reusable Pack Templates page");
  assertIncludes(websiteFeatures, "dashboardNote", "CampaignCue website feature pages document static dashboard preview boundary");
  assertIncludes(websiteFeatures, "No direct Instagram, Facebook, Google, or WhatsApp posting.", "CampaignCue feature catalog preserves no-direct-posting boundary");
  assertIncludes(websiteFeatures, "Not Canva, PSD, Figma, or SVG source recovery.", "CampaignCue feature catalog preserves CueLayers source-file boundary");
  assertIncludes(websiteFeatures, "Not legal advice.", "CampaignCue feature catalog preserves Trust Center legal boundary");
  assertIncludes(websiteFeatures, "Not a generic public template marketplace.", "CampaignCue feature catalog preserves template boundary");
  assertIncludes(websiteUseCases, "CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS", "CampaignCue website use-case path constants exist");
  assertIncludes(websiteUseCases, "/use-cases/small-business", "CampaignCue website use-case catalog includes small-business page");
  assertIncludes(websiteUseCases, "No automatic posting to Instagram, Facebook, Google, or WhatsApp in the active delivery mode.", "CampaignCue use-case catalog preserves no-direct-posting boundary");
  assertIncludes(websiteUseCases, "No promise that one campaign will guarantee sales or search position.", "CampaignCue use-case catalog rejects unsupported performance claims");
  assertIncludes(loader, "isCampaignCueRuntimeRoute", "CampaignCue loader uses product route helper");
  assertIncludes(productDomains, "CAMPAIGNCUE_SITE_INTERNAL_BASE_PATH", "Product domains use CampaignCue path constants");
  assertIncludes(productDomains, "pathname === product.devPathPrefix || pathname.startsWith(`${product.devPathPrefix}/`)", "Product dev prefixes require exact or slash-boundary match");
  assertIncludes(domainResolver, "CAMPAIGNCUE_LOCAL_DEV_PATH_PREFIX", "Domain resolver uses CampaignCue local prefix constant");
  assertIncludes(domainResolver, "campaigncue.ai", "Domain resolver comments include CampaignCue as active product domain");
  assertIncludes(urls, "Local: /__campaigncue", "URL architecture comments include CampaignCue local route");
  assertIncludes(urls, "QA: campaigncue.menulist.online", "URL architecture comments include CampaignCue preview domain");
  assertIncludes(urls, "Prod: campaigncue.ai", "URL architecture comments include CampaignCue production domain");
  assertIncludes(reservedSlugs, "CAMPAIGNCUE_PRODUCT_SLUG", "canonical reserved-slug constants reserve CampaignCue namespace");
  assertIncludes(urls, "ROUTING_RESERVED_SUBDOMAINS", "URL constants reuse the canonical reserved-subdomain registry");

  assertNotIncludes(read("src/lib/campaigncue/server.ts"), 'from "@constant/campaigncue";', "CampaignCue server avoids all-in barrel import");
  assertNotIncludes(read("src/lib/firebase/campaigncueFirebaseAdmin.ts"), 'const CAMPAIGNCUE_APP_NAME = "campaigncue-admin"', "CampaignCue Admin app name is not local literal");
  assertNotIncludes(read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx"), '"/api/campaigncue/sources"', "CampaignCue workspace avoids hardcoded source API path");
  assertNotIncludes(read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx"), '"/api/campaigncue/cue-layers', "CampaignCue CueLayers UI avoids hardcoded API paths");
  assertNotIncludes(read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx"), '"/__campaigncue"', "CampaignCue workspace avoids hardcoded local public path");
  assertNotIncludes(read("package.json"), "topview", "CampaignCue adds no Topview dependency or script");
}

function verifyRouteBoundary() {
  const middleware = read("src/proxy.ts");
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
  assert(exists("src/app/sites/campaigncue/features/[featureSlug]/page.tsx"), "CampaignCue public feature page route exists under sites");
  assert(exists("src/app/sites/campaigncue/use-cases/small-business/page.tsx"), "CampaignCue public small-business use-case route exists under sites");
  assert(exists("src/app/(campaigncue)/layout.tsx"), "CampaignCue owner route-group layout exists");
  assert(exists("src/app/(campaigncue)/campaigncue/page.tsx"), "CampaignCue owner route-group base page exists");
  assert(exists("src/app/(campaigncue)/campaigncue/app/page.tsx"), "CampaignCue owner workspace page exists outside sites");
  assert(!exists("src/app/sites/campaigncue/app"), "CampaignCue owner app is not under public sites folder");
  assert(!exists("src/app/sites/campaigncue/app/page.tsx"), "CampaignCue old sites app page removed");

  assertIncludes(middleware, "getCampaignCueWorkspaceRewritePath(pathname)", "CampaignCue product-domain /app rewrite");
  assertIncludes(middleware, "CAMPAIGNCUE_WEBSITE_FEATURE_SLUGS", "CampaignCue middleware imports public feature slug allowlist");
  assertIncludes(middleware, "isInvalidCampaignCuePublicFeaturePath", "CampaignCue middleware validates public feature paths before rewrite");
  assertIncludes(middleware, "productNotFoundResponse(productConfig)", "CampaignCue product-domain unknown feature slug returns product 404");
  assertIncludes(middleware, "productNotFoundResponse(product, product.devPathPrefix)", "CampaignCue local-dev unknown feature slug returns product 404");
  assertIncludes(middleware, "productConfig.id === 'campaigncue'", "CampaignCue product-domain route special case");
  assertIncludes(campaignCueRouteBlock, "shouldBypassDomainRouting(pathname)", "CampaignCue product domain preserves API/internal bypass routes");
  assertIncludes(campaignCueRouteBlock, "nextWithProductHeaders(request, productConfig)", "CampaignCue product domain bypass routes pass through with sanitized product headers and without site rewrite");
  assertIncludes(middleware, "getCampaignCueWorkspaceRewritePath(strippedPath)", "CampaignCue local dev /__campaigncue/app rewrite");
  assertIncludes(productDomains, "Public product websites belong under src/app/sites/[productId]", "Product domain route-boundary comment");
  assertIncludes(routingDoc, "Product Site Vs Product App Routes", "Global routing doc product site/app boundary");
  assertIncludes(routingDoc, "`src/app/sites/[productId]` is public website only", "Global routing doc sites public-only rule");
  assertIncludes(boundaryDoc, "`src/app/sites/campaigncue` is public website only", "CampaignCue route-boundary public-only rule");
  assertIncludes(boundaryDoc, "`src/app/sites/campaigncue/features/[featureSlug]/page.tsx`", "CampaignCue route-boundary documents public feature-page route");
  assertIncludes(boundaryDoc, "`src/app/sites/campaigncue/use-cases/*`", "CampaignCue route-boundary documents public use-case route folder");
  assertIncludes(boundaryDoc, "`campaigncue.ai/use-cases/small-business`", "CampaignCue route-boundary documents small-business use-case URL");
  assertIncludes(boundaryDoc, "`/api/*` and other internal bypass paths pass through before CampaignCue product-domain rewrites", "CampaignCue route-boundary API bypass rule");
  assertIncludes(boundaryDoc, "src/app/(campaigncue)/campaigncue/app/page.tsx", "CampaignCue route-boundary owner app path");
  assertNotIncludes(nextConfig, "MenuListServerChunkCompatPlugin", "retired Next 14 manifest repair");
  assertNotIncludes(nextConfig, "next/dist/", "private Next.js manifest imports");
  assertIncludes(
    read("scripts/verification/verify-next-build-compatibility.js"),
    "Next 16 build compatibility contract verified.",
    "native Next 16 build/start compatibility gate",
  );
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
  const businessBrainSpec = read("__docs__/campaigncue/business-brain/business-brain_spec.md");
  const businessBrainImpl = read("__docs__/campaigncue/business-brain/business-brain_impl.md");
  const campaignInboxReadme = read("__docs__/campaigncue/campaign-inbox/README.md");
  const campaignInboxImpl = read("__docs__/campaigncue/campaign-inbox/campaign-inbox_impl.md");
  const campaignInboxFirebase = read("__docs__/campaigncue/campaign-inbox/campaign-inbox_firebase.md");
  const campaignMemoryReadme = read("__docs__/campaigncue/campaign-memory/README.md");
  const campaignMemoryImpl = read("__docs__/campaigncue/campaign-memory/campaign-memory_impl.md");
  const campaignMemoryFirebase = read("__docs__/campaigncue/campaign-memory/campaign-memory_firebase.md");
  const winningPackRefreshReadme = read("__docs__/campaigncue/winning-pack-refresh/README.md");
  const winningPackRefreshImpl = read("__docs__/campaigncue/winning-pack-refresh/winning-pack-refresh_impl.md");
  const winningPackRefreshFirebase = read("__docs__/campaigncue/winning-pack-refresh/winning-pack-refresh_firebase.md");
  const verticalPlaybooksReadme = read("__docs__/campaigncue/vertical-campaign-playbooks/README.md");
  const verticalPlaybooksImpl = read("__docs__/campaigncue/vertical-campaign-playbooks/vertical-campaign-playbooks_impl.md");
  const verticalPlaybooksFirebase = read("__docs__/campaigncue/vertical-campaign-playbooks/vertical-campaign-playbooks_firebase.md");
  const hostedOfferReadme = read("__docs__/campaigncue/hosted-offer-page/README.md");
  const hostedOfferImpl = read("__docs__/campaigncue/hosted-offer-page/hosted-offer-page_impl.md");
  const hostedOfferFirebase = read("__docs__/campaigncue/hosted-offer-page/hosted-offer-page_firebase.md");
  const localVisibilityReadme = read("__docs__/campaigncue/local-visibility-action-center/README.md");
  const localVisibilityImpl = read("__docs__/campaigncue/local-visibility-action-center/local-visibility-action-center_impl.md");
  const localVisibilityFirebase = read("__docs__/campaigncue/local-visibility-action-center/local-visibility-action-center_firebase.md");
  const approvalInboxReadme = read("__docs__/campaigncue/approval-comment-inbox/README.md");
  const approvalInboxImpl = read("__docs__/campaigncue/approval-comment-inbox/approval-comment-inbox_impl.md");
  const approvalInboxFirebase = read("__docs__/campaigncue/approval-comment-inbox/approval-comment-inbox_firebase.md");
  const outputPackReadme = read("__docs__/campaigncue/campaign-pack-output-system/README.md");
  const outputPackSpec = read("__docs__/campaigncue/campaign-pack-output-system/campaign-pack-output-system_spec.md");
  const outputPackImpl = read("__docs__/campaigncue/campaign-pack-output-system/campaign-pack-output-system_impl.md");
  const exportArchiveReadme = read("__docs__/campaigncue/durable-cloud-export-archive/README.md");
  const exportArchiveImpl = read("__docs__/campaigncue/durable-cloud-export-archive/durable-cloud-export-archive_impl.md");
  const exportArchiveFirebase = read("__docs__/campaigncue/durable-cloud-export-archive/durable-cloud-export-archive_firebase.md");
  const exportArchiveValidation = read("__docs__/campaigncue/durable-cloud-export-archive/durable-cloud-export-archive_validation.md");
  const creativeStudioSpec = read("__docs__/campaigncue/creative-studio/creative-studio_spec.md");
  const trustCenterSpec = read("__docs__/campaigncue/creative-trust-center/creative-trust-center_spec.md");
  const ugcScriptSpec = read("__docs__/campaigncue/ugc-script-studio/ugc-script-studio_spec.md");
  const ugcScriptImpl = read("__docs__/campaigncue/ugc-script-studio/ugc-script-studio_impl.md");
  const ugcScriptFirebase = read("__docs__/campaigncue/ugc-script-studio/ugc-script-studio_firebase.md");
  const videoReelSpec = read("__docs__/campaigncue/video-reel-studio/video-reel-studio_spec.md");
  const videoReelImpl = read("__docs__/campaigncue/video-reel-studio/video-reel-studio_impl.md");
  const templateRegistrySpec = read("__docs__/campaigncue/campaign-pack-template-registry/campaign-pack-template-registry_spec.md");
  const templateRegistryImpl = read("__docs__/campaigncue/campaign-pack-template-registry/campaign-pack-template-registry_impl.md");
  const cueLayersReadme = read("__docs__/campaigncue/cue-layers/README.md");
  const cueLayersImpl = read("__docs__/campaigncue/cue-layers/cue-layers_impl.md");
  const cueLayersFirebase = read("__docs__/campaigncue/cue-layers/cue-layers_firebase.md");
  const cueLayersValidation = read("__docs__/campaigncue/cue-layers/cue-layers_validation.md");
  const designCueReadme = read("__docs__/campaigncue/design-cue/README.md");
  const designCueImpl = read("__docs__/campaigncue/design-cue/design-cue_impl.md");
  const designCueFirebase = read("__docs__/campaigncue/design-cue/design-cue_firebase.md");
  const designCueValidation = read("__docs__/campaigncue/design-cue/design-cue_validation.md");
  const adsStudioReadme = read("__docs__/campaigncue/ads-studio/README.md");
  const adsStudioSpec = read("__docs__/campaigncue/ads-studio/ads-studio_spec.md");
  const adsStudioImpl = read("__docs__/campaigncue/ads-studio/ads-studio_impl.md");
  const adsStudioFirebase = read("__docs__/campaigncue/ads-studio/ads-studio_firebase.md");
  const adsStudioHelpdoc = read("__docs__/campaigncue/ads-studio/ads-studio_helpdoc.md");
  const adsStudioWebsite = read("__docs__/campaigncue/ads-studio/ads-studio_website.md");
  const adsStudioTests = read("__docs__/campaigncue/ads-studio/ads-studio_test-cases.md");
  const adsStudioValidation = read("__docs__/campaigncue/ads-studio/ads-studio_validation.md");
  const sourceIntegrationsSpec = read("__docs__/campaigncue/source-integrations/source-integrations_spec.md");
  const sourceIntegrationsImpl = read("__docs__/campaigncue/source-integrations/source-integrations_impl.md");
  const apiFirebaseDoc = read("__docs__/campaigncue/api-boundaries/api-boundaries_firebase.md");
  const publicSite = read("src/app/sites/campaigncue/page.tsx");
  const publicFeatureRoute = read("src/app/sites/campaigncue/features/[featureSlug]/page.tsx");
  const publicSmallBusinessUseCase = read("src/app/sites/campaigncue/use-cases/small-business/page.tsx");
  const rootLayout = read("src/app/layout.tsx");
  const publicLayout = read("src/app/sites/campaigncue/layout.tsx");
  const publicStyles = read("src/app/sites/campaigncue/styles.css");
  const publicScrollReveal = read("src/app/sites/campaigncue/scroll-reveal.css");
  const publicScrollRevealComponent = read("src/app/sites/campaigncue/components/CampaignCueScrollReveal.tsx");
  const publicMobileNavigation = read("src/app/sites/campaigncue/components/CampaignCueMobileNavigation.tsx");
  const publicAiSummaryLinks = read("src/components/shared/publicAiSummaryLinks/PublicAiSummaryLinks.tsx");
  const campaignCueAiSummary = read("src/app/sites/campaigncue/components/CampaignCueAiSummary.tsx");
  const publicSitemap = read("src/app/sites/campaigncue/sitemap.xml/route.ts");
  const website = read("src/constants/campaigncue/website.ts");
  const websiteFeatures = read("src/constants/campaigncue/websiteFeatures.ts");
  const websiteUseCases = read("src/constants/campaigncue/websiteUseCases.ts");
  const productFirebaseDoc = read("__docs__/campaigncue/campaigncue-product/campaigncue-product_firebase.md");
  const websiteDoc = read("__docs__/campaigncue/campaigncue-product/campaigncue-product_website.md");
  const changelog = read("__docs__/changelog.md");

  assertIncludes(publicSite, "Print and staff pack", "CampaignCue public site exposes print and staff pack output");
  assertIncludes(publicSite, "CAMPAIGNCUE_WEBSITE_FEATURE_PATHS", "CampaignCue public homepage links capabilities to dedicated feature pages");
  assertIncludes(publicSite, "CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS", "CampaignCue public homepage links to product-scoped use-case pages");
  assertIncludes(publicSite, "CampaignCueMegaMenu", "CampaignCue public homepage exposes product/use-case mega menus");
  assertIncludes(publicSite, "CampaignCueMobileNavigation", "CampaignCue public homepage mounts the mobile drawer navigation");
  assertIncludes(publicSite, "CampaignCueAiSummary", "CampaignCue public homepage mounts the AI summary footer links");
  assertIncludes(publicFeatureRoute, "CampaignCueMobileNavigation", "CampaignCue public feature pages mount the mobile drawer navigation");
  assertIncludes(publicFeatureRoute, "CampaignCueAiSummary", "CampaignCue public feature pages mount the AI summary footer links");
  assertIncludes(publicSmallBusinessUseCase, "CampaignCueMobileNavigation", "CampaignCue small-business page mounts the mobile drawer navigation");
  assertIncludes(publicSmallBusinessUseCase, "CampaignCueAiSummary", "CampaignCue small-business page mounts the AI summary footer links");
  assertIncludes(campaignCueAiSummary, "PublicAiSummaryLinks", "CampaignCue AI summary uses the shared public summary link component");
  assertIncludes(campaignCueAiSummary, "Do not describe CampaignCue as direct account posting", "CampaignCue AI summary prompt preserves posting boundary");
  assertIncludes(publicAiSummaryLinks, "https://claude.ai/new?q=", "Shared public AI summary links include Claude");
  assertIncludes(publicAiSummaryLinks, "https://chatgpt.com/?q=", "Shared public AI summary links include ChatGPT");
  assertIncludes(publicAiSummaryLinks, "https://gemini.google.com/app?q=", "Shared public AI summary links include Gemini");
  assertIncludes(publicSite, "PRODUCT_MEGA_MENU_GROUPS", "CampaignCue public homepage keeps Product menu link groups in product page code");
  assertIncludes(publicSite, "USE_CASE_MEGA_MENU_GROUPS", "CampaignCue public homepage keeps Use cases menu link groups in product page code");
  assertIncludes(publicSite, "label=\"Product\"", "CampaignCue public homepage exposes Product mega menu label");
  assertIncludes(publicSite, "label=\"Use cases\"", "CampaignCue public homepage exposes Use cases mega menu label");
  assertIncludes(publicSite, "campaigncue-mega-menu-icon", "CampaignCue mega menu links wrap icons in polished icon tiles");
  assertIncludes(publicStyles, ".campaigncue-mega-menu-icon svg", "CampaignCue mega menu icon tile keeps SVG glyphs visually controlled");
  assertIncludes(publicSite, "Product overview", "CampaignCue Product mega menu includes overview entry");
  assertIncludes(publicSite, "Small-business journey", "CampaignCue Use cases mega menu includes owner journey entry");
  assertIncludes(publicSite, "One cue becomes a checked campaign pack.", "CampaignCue Product mega menu includes workflow preview card");
  assertIncludes(publicSite, "Pick the business type, then show the useful pack.", "CampaignCue Use cases mega menu includes workflow preview card");
  assertIncludes(publicSite, "SmallBusinessUseCaseLink", "CampaignCue public homepage exposes small-business use-case callout");
  assertIncludes(publicSite, "label: 'Small business'", "CampaignCue Use cases menu links the small-business use-case page");
  assertIncludes(publicSite, "href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.dailyCampaignDesk", "CampaignCue public homepage links Daily Campaign Desk capability page");
  assertIncludes(publicSite, "href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeStudio", "CampaignCue public homepage links Creative Studio capability page");
  assertIncludes(publicSite, "href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.cueLayers", "CampaignCue public homepage links CueLayers capability page");
  assertIncludes(publicSite, "href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.videoReelStudio", "CampaignCue public homepage links Video Reel Studio capability page");
  assertIncludes(publicSite, "href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeTrustCenter", "CampaignCue public homepage links Creative Trust Center capability page");
  assertIncludes(publicSite, "Know what is safe and useful to promote today. Get the checked pack, staff handoff, and owner-controlled files ready to use.", "CampaignCue public hero reflects the governed operating-loop promise");
  assertIncludes(publicSite, "Copy or download", "CampaignCue public proof strip keeps a simple owner action label");
  assertIncludes(publicSite, "campaigncue-pattern-proof", "CampaignCue public homepage includes the bounded source-to-pack proof flow");
  assertIncludes(publicSite, "No account spying. No copied scripts. No automatic posting.", "CampaignCue public pattern proof preserves source and delivery boundaries");
  assertNotIncludes(publicSite, "Use a proven format", "CampaignCue does not describe an unverified owner reference as proven");
  assertIncludes(publicFeatureRoute, "getCampaignCueWebsiteFeature(params.featureSlug)", "CampaignCue feature route resolves pages from product-scoped feature constants");
  assertIncludes(read("src/proxy.ts"), "isInvalidCampaignCuePublicFeaturePath", "CampaignCue proxy rejects unknown public feature slugs before rewrite");
  assertNotIncludes(publicFeatureRoute, "generateStaticParams", "CampaignCue feature route stays request-rendered for product base-path headers");
  assertNotIncludes(publicFeatureRoute, "dynamicParams = false", "CampaignCue feature route avoids brittle static-param rendering with middleware rewrites");
  assertIncludes(publicFeatureRoute, "generateMetadata", "CampaignCue feature route defines metadata from feature constants");
  assertIncludes(publicFeatureRoute, "notFound()", "CampaignCue feature route rejects unknown slugs");
  assertIncludes(publicFeatureRoute, "CampaignCueFeaturePreview", "CampaignCue feature route renders static dashboard/editor previews");
  assertIncludes(publicFeatureRoute, "DailyDeskPreview", "CampaignCue feature route previews Daily Campaign Desk");
  assertIncludes(publicFeatureRoute, "CreativeStudioPreview", "CampaignCue feature route previews Creative Studio");
  assertIncludes(publicFeatureRoute, "CueLayersPreview", "CampaignCue feature route previews CueLayers");
  assertIncludes(publicFeatureRoute, "VideoStudioPreview", "CampaignCue feature route previews Video Reel Studio");
  assertIncludes(publicFeatureRoute, "TrustCenterPreview", "CampaignCue feature route previews Creative Trust Center");
  assertIncludes(publicFeatureRoute, "ProofDeckPreview", "CampaignCue feature route previews Brand Playbook and Proof Deck");
  assertIncludes(publicFeatureRoute, "TemplatePreview", "CampaignCue feature route previews reusable pack templates");
  assertNotIncludes(publicFeatureRoute, "src/app/(campaigncue)", "CampaignCue feature route does not expose owner route-group source paths");
  assertNotIncludes(publicFeatureRoute, "@template/campaigncue", "CampaignCue feature route does not import owner workspace template");
  assertNotIncludes(publicFeatureRoute, "CampaignCueWorkspaceApp", "CampaignCue feature route does not import owner workspace app");
  assertNotIncludes(publicFeatureRoute, "fetch(", "CampaignCue feature route does not fetch owner data");
  assertIncludes(publicSmallBusinessUseCase, "CAMPAIGNCUE_SMALL_BUSINESS_USE_CASE", "CampaignCue small-business page uses product-scoped use-case data");
  assertIncludes(publicSmallBusinessUseCase, "UseCaseHeroPreview", "CampaignCue small-business page renders static product preview");
  assertIncludes(publicSmallBusinessUseCase, "SourceToPackVisual", "CampaignCue small-business page explains source-to-pack flow");
  assertIncludes(publicSmallBusinessUseCase, "ReusePreview", "CampaignCue small-business page exposes Creative Studio and CueLayers reuse");
  assertIncludes(publicSmallBusinessUseCase, "CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.videoReelStudio", "CampaignCue small-business page links the in-house Video Reel Studio");
  assertNotIncludes(publicSmallBusinessUseCase, "@template/campaigncue", "CampaignCue small-business page does not import owner workspace template");
  assertNotIncludes(publicSmallBusinessUseCase, "CampaignCueWorkspaceApp", "CampaignCue small-business page does not import owner workspace app");
  assertNotIncludes(publicSmallBusinessUseCase, "fetch(", "CampaignCue small-business page does not fetch owner data");
  assertNotIncludes(publicSmallBusinessUseCase, "ROAS", "CampaignCue small-business page avoids jargon-heavy ROAS copy");
  assertIncludes(publicSitemap, "CAMPAIGNCUE_PUBLIC_PAGES", "CampaignCue sitemap derives public pages from constants");
  assertIncludes(website, "CAMPAIGNCUE_WEBSITE_FEATURES.map", "CampaignCue public page registry includes feature pages");
  assertIncludes(website, "CAMPAIGNCUE_WEBSITE_USE_CASES.map", "CampaignCue public page registry includes use-case pages");
  assertIncludes(websiteUseCases, "Small Business Campaign Packs", "CampaignCue website use-case constants include small-business page title");
  assertIncludes(websiteUseCases, "restaurants, salons, retail shops, clinics, fitness studios, and local services", "CampaignCue website use-case constants cover SMB vertical examples");
  assertIncludes(websiteUseCases, "No social account connection, ad spend change, or hidden provider requirement.", "CampaignCue website use-case constants preserve provider boundary");
  assertIncludes(websiteFeatures, "Daily Campaign Desk", "CampaignCue website feature constants include Daily Campaign Desk");
  assertIncludes(websiteFeatures, "Campaign Pack Studio", "CampaignCue website feature constants include Campaign Pack Studio");
  assertIncludes(websiteFeatures, "Creative Studio", "CampaignCue website feature constants include Creative Studio");
  assertIncludes(websiteFeatures, "CueLayers", "CampaignCue website feature constants include CueLayers");
  assertIncludes(websiteFeatures, "Video Reel Studio", "CampaignCue website feature constants include Video Reel Studio");
  assertIncludes(websiteFeatures, "Creative Trust Center", "CampaignCue website feature constants include Creative Trust Center");
  assertIncludes(websiteFeatures, "Brand Playbook and Proof Deck", "CampaignCue website feature constants include Brand Playbook and Proof Deck");
  assertIncludes(websiteFeatures, "Reusable Pack Templates", "CampaignCue website feature constants include Reusable Pack Templates");
  assertIncludes(publicSite, "href: CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS.smallBusiness", "CampaignCue public use-case menu routes owner verticals to the SMB journey page");
  assertIncludes(publicSite, "href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.brandPlaybookProofDeck", "CampaignCue public use-case menu routes agencies to proof-deck feature depth");
  assertIncludes(publicSite, "href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.reusablePackTemplates", "CampaignCue public use-case menu routes multi-location teams to reusable-pack feature depth");
  assertNotIncludes(publicSite, "CampaignCueCatalog", "CampaignCue compressed homepage removes the separate pack index component");
  assertNotIncludes(publicSite, "OwnerDayPath", "CampaignCue compressed homepage removes the separate owner path component");
  assertNotIncludes(publicSite, "WorkflowRail", "CampaignCue compressed homepage removes the duplicate workflow rail component");
  assertIncludes(publicSite, "Do owners only get social posts?", "CampaignCue public FAQ rejects social-only positioning");
  assertIncludes(publicSite, "Do packs include a review record?", "CampaignCue public FAQ exposes proof deck review record");
  assertNotIncludes(publicSite, "CampaignCueProofSystem", "CampaignCue simplified homepage moves proof-deck depth out of the homepage source");
  assertNotIncludes(publicSite, "campaigncue-proof-deck-preview", "CampaignCue simplified homepage moves proof-deck preview to feature-page depth");
  assertNotIncludes(publicSite, "campaigncue-template-flow", "CampaignCue simplified homepage moves reusable-template loop to feature-page depth");
  assertIncludes(publicSite, "campaigncue-trust-table-heading", "CampaignCue public Trust Center has claim/source/risk/action heading");
  assertIncludes(publicSite, "Lunch combo today 12-3 PM", "CampaignCue public Trust Center shows concrete safe claim");
  assertIncludes(publicSite, "No ranking source", "CampaignCue public Trust Center shows missing-proof source state");
  assertIncludes(publicSite, "Unsupported ranking", "CampaignCue public Trust Center shows ranking risk");
  assertIncludes(publicSite, "No approved before/after proof", "CampaignCue public Trust Center shows before-after proof boundary");
  assertIncludes(publicSite, "Fake experience", "CampaignCue public Trust Center shows fake testimonial risk");
  assertIncludes(publicSite, "Spend not approved", "CampaignCue public Trust Center shows spend-gated boundary");
  assertNotIncludes(publicSite, "ROAS", "CampaignCue public site avoids unsupported ROAS claim");
  assertNotIncludes(publicSite, "creative scoring", "CampaignCue public site avoids predictive creative scoring claim");
  assertNotIncludes(publicSite, "Legal compliance", "CampaignCue public site avoids legal-compliance certification claim");
  assertNotIncludes(publicSite, "CampaignCueProblemBand", "CampaignCue simplified homepage removes the separate owner-problem band source");
  assertIncludes(publicSite, "CampaignCueFlowMap", "CampaignCue public site exposes source-to-pack workflow map");
  assertIncludes(publicSite, "CampaignPackRoom", "CampaignCue public site exposes campaign pack room");
  assertIncludes(publicSite, "HERO_FLOATING_ASSETS", "CampaignCue public site exposes floating hero campaign artifacts");
  assertIncludes(publicSite, "CreativePowerhouse", "CampaignCue public site exposes creative powerhouse section");
  assertIncludes(publicSite, "FeatureDock", "CampaignCue public site exposes compact product-surface feature dock");
  assertIncludes(publicSite, "Explore the parts behind the daily pack.", "CampaignCue feature dock explains deeper product surfaces without heavy copy");
  assertIncludes(publicSite, "Daily Desk", "CampaignCue feature dock keeps Daily Campaign Desk visible");
  assertIncludes(publicSite, "Pack Studio", "CampaignCue feature dock keeps Campaign Pack Studio visible");
  assertIncludes(publicSite, "Creative Studio", "CampaignCue feature dock keeps Creative Studio visible");
  assertIncludes(publicSite, "CueLayers", "CampaignCue feature dock keeps CueLayers visible");
  assertIncludes(publicSite, "Trust Center", "CampaignCue feature dock keeps Creative Trust Center visible");
  assertIncludes(publicSite, "Proof Deck", "CampaignCue feature dock keeps Proof Deck visible");
  assertIncludes(publicSite, "Reusable Packs", "CampaignCue feature dock keeps Reusable Pack Templates visible");
  assertNotIncludes(publicSite, "CampaignAssetWall", "CampaignCue simplified homepage removes the separate campaign artifact wall source");
  assertIncludes(publicSite, "One daily loop from fact to checked pack.", "CampaignCue workflow map explains source-to-pack loop");
  assertIncludes(publicSite, "One place for the pack, proof, and manual handoff.", "CampaignCue pack room explains proof and handoff surface");
  assertIncludes(publicSite, "Your local campaign powerhouse.", "CampaignCue public site has creative system section copy");
  assertIncludes(publicSite, "Risky work stays visible before use.", "CampaignCue simplified homepage uses plain trust section copy");
  assertIncludes(publicSite, "Start with the business type.", "CampaignCue simplified homepage routes detailed owner examples through use cases");
  assertIncludes(publicSite, "current facts in, checked campaign pack out", "CampaignCue simplified homepage keeps the use-case promise simple");
  assertNotIncludes(publicSite, "campaigncue-output-ledger", "CampaignCue simplified homepage removes the output inventory ledger");
  assertNotIncludes(publicSite, "campaigncue-real-work-ledger", "CampaignCue simplified homepage removes the standalone proof ledger");
  assertNotIncludes(publicSite, "campaigncue-problem-band-grid", "CampaignCue simplified homepage removes the owner-problem grid");
  assertIncludes(publicSite, "campaigncue-flow-map-steps", "CampaignCue public site uses workflow-map steps");
  assertIncludes(publicSite, "campaigncue-pack-room-columns", "CampaignCue public site uses pack-room columns");
  assertIncludes(publicScrollRevealComponent, ".campaigncue-flow-map-node", "CampaignCue scroll reveal targets workflow-map nodes");
  assertIncludes(publicScrollRevealComponent, ".campaigncue-pack-room-surface", "CampaignCue scroll reveal targets pack-room surface");
  assertIncludes(publicScrollRevealComponent, ".campaigncue-powerhouse-card", "CampaignCue scroll reveal targets creative powerhouse cards");
  assertIncludes(publicScrollRevealComponent, ".campaigncue-home-feature-dock-card", "CampaignCue scroll reveal targets compact feature dock cards");
  assertNotIncludes(publicScrollRevealComponent, ".campaigncue-problem-band-grid article", "CampaignCue scroll reveal no longer targets removed owner-problem cards");
  assertNotIncludes(publicScrollRevealComponent, ".campaigncue-switch-card", "CampaignCue scroll reveal no longer targets removed switch cards");
  assertNotIncludes(publicScrollRevealComponent, ".campaigncue-fit-check-row", "CampaignCue scroll reveal does not target removed fit-check rows");
  assertIncludes(publicSite, "campaigncue-floating-asset", "CampaignCue public site uses visual floating hero artifacts");
  assertIncludes(publicSite, "campaigncue-powerhouse-grid", "CampaignCue public site uses colorful creative module grid");
  assertNotIncludes(publicSite, "campaigncue-asset-wall-grid", "CampaignCue simplified homepage removes the visual asset wall");
  assertNotIncludes(publicSite, "campaigncue-switch-strip", "CampaignCue simplified homepage removes the category switch strip");
  assertNotIncludes(publicSite, "campaigncue-owner-path-intro", "CampaignCue compressed homepage removes connected owner path intro");
  assertNotIncludes(publicSite, "campaigncue-capability-ledger", "CampaignCue simplified homepage removes the capability ledger");
  assertIncludes(publicSite, "tone: 'rose'", "CampaignCue public site uses rose tone names from the current palette");
  assertNotIncludes(publicSite, "tone: 'lime'", "CampaignCue public site avoids stale lime tone names");
  assertIncludes(rootLayout, "./sites/campaigncue/styles.css", "CampaignCue public CSS is root-loaded to avoid stale nested CSS chunks");
  assertIncludes(rootLayout, "./sites/campaigncue/scroll-reveal.css", "CampaignCue scroll reveal CSS is root-loaded with the public CSS");
  assertIncludes(publicLayout, "CampaignCueScrollReveal", "CampaignCue public layout mounts scroll reveal client island");
  assertIncludes(publicLayout, "themeColor: CAMPAIGNCUE_SITE_THEME_COLOR", "CampaignCue public layout browser theme color follows canonical PWA token");
  assertNotIncludes(publicLayout, "import './styles.css';", "CampaignCue public layout avoids nested route CSS import");
  assertIncludes(publicStyles, "--cc-ink: #011b6d", "CampaignCue public site uses reference navy palette token");
  assertIncludes(publicStyles, "--cc-deep-navy: #020c4f", "CampaignCue public site uses reference deep navy palette token");
  assertIncludes(publicStyles, "--cc-pink: #d96e9b", "CampaignCue public site uses reference rose palette token");
  assertIncludes(publicStyles, "--cc-pink-soft: #f4d2e2", "CampaignCue public site uses reference soft pink palette token");
  assertIncludes(publicStyles, "--cc-bg: #fbf7fa", "CampaignCue public site uses reference pale background token");
  assertIncludes(publicStyles, "--cc-button-shadow", "CampaignCue public CSS defines rose CTA shadow token");
  assertIncludes(publicStyles, "top: 14px;", "CampaignCue public nav floats below the top edge");
  assertIncludes(publicStyles, "width: var(--cc-section);", "CampaignCue public nav uses centered section width");
  assertIncludes(publicStyles, "box-shadow: 0 18px 58px rgb(1 27 109 / 8%)", "CampaignCue public nav uses soft production shadow");
  assertIncludes(publicStyles, "color: #ffffff;\n    background: var(--cc-pink);", "CampaignCue public primary CTA uses white text on rose");
  assertIncludes(publicStyles, "background: linear-gradient(135deg, var(--cc-ink), var(--cc-deep-navy))", "CampaignCue public previews use polished navy gradients");
  assertIncludes(publicStyles, "border: 1px solid rgb(1 27 109 / 8%)", "CampaignCue public surfaces use light navy borders");
  assertIncludes(publicStyles, ".campaigncue-pack-room {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr);", "CampaignCue pack-room section keeps heading in a full-width stacked intro row");
  assertIncludes(publicStyles, ".campaigncue-home-feature-dock", "CampaignCue public CSS styles compact feature dock");
  assertIncludes(publicStyles, "grid-auto-flow: column", "CampaignCue mobile feature dock uses horizontal visual rail instead of a long stack");
  assertIncludes(publicStyles, ".campaigncue-band {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr);", "CampaignCue homepage band sections avoid narrow heading columns");
  assertIncludes(publicStyles, ".campaigncue-split {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr);", "CampaignCue homepage split sections stack intro before content");
  assertIncludes(publicStyles, ".campaigncue-band-reverse .campaigncue-band-copy {\n    order: 1;", "CampaignCue reversed bands still render copy before preview");
  assertIncludes(websiteDoc, "Homepage sections use a stacked section pattern", "CampaignCue website docs define the stacked homepage heading rule");
  assertIncludes(publicStyles, ".campaigncue-floating-asset.is-rose", "CampaignCue hero artifact tone names match the reference palette");
  assertIncludes(publicStyles, ".campaigncue-trust-table-heading", "CampaignCue public CSS styles concrete trust matrix heading");
  assertIncludes(publicStyles, ".campaigncue-mega-menu-panel", "CampaignCue public CSS styles product/use-case mega menu panel");
  assertIncludes(publicStyles, ".campaigncue-mega-menu-story", "CampaignCue public CSS styles mega menu preview card");
  assertIncludes(publicStyles, ".campaigncue-mega-menu:focus-within", "CampaignCue public CSS keeps mega menus keyboard accessible");
  assertIncludes(publicStyles, ".campaigncue-mobile-menu-drawer", "CampaignCue public CSS styles mobile drawer navigation");
  assertIncludes(publicStyles, "inset: 0 0 0 auto", "CampaignCue mobile drawer is fixed to the right edge");
  assertIncludes(publicStyles, "--cc-ink: #011b6d", "CampaignCue mobile drawer keeps palette tokens after portal rendering");
  assertIncludes(publicStyles, ".campaigncue-nav > nav,\n    .campaigncue-site .campaigncue-nav-action", "CampaignCue mobile breakpoint hides desktop nav/action");
  assertIncludes(publicStyles, ".campaigncue-mobile-menu {\n        display: inline-flex;", "CampaignCue mobile breakpoint shows hamburger menu");
  assertNotIncludes(publicStyles, "grid-column: 1 / span 2;\n        grid-row: 2;", "CampaignCue mobile nav no longer wraps desktop menu below the header");
  assertIncludes(publicMobileNavigation, "document.body.style.overflow = \"hidden\"", "CampaignCue mobile drawer locks background scroll while open");
  assertIncludes(publicMobileNavigation, "document.body.dataset.campaigncueMobileMenu = \"open\"", "CampaignCue mobile drawer marks body open state");
  assertIncludes(publicMobileNavigation, "delete document.body.dataset.campaigncueMobileMenu", "CampaignCue mobile drawer clears body open state");
  assertIncludes(publicMobileNavigation, "createPortal", "CampaignCue mobile drawer portals outside the sticky nav container");
  assertIncludes(publicMobileNavigation, "event.key === \"Escape\"", "CampaignCue mobile drawer supports Escape close");
  assertIncludes(publicMobileNavigation, "closeButtonRef.current?.focus()", "CampaignCue mobile drawer moves focus into the dialog");
  assertIncludes(publicMobileNavigation, "event.key !== \"Tab\"", "CampaignCue mobile drawer traps keyboard focus");
  assertIncludes(publicMobileNavigation, "triggerRef.current?.focus()", "CampaignCue mobile drawer restores trigger focus");
  assertIncludes(publicMobileNavigation, "onClick={openDrawer}", "CampaignCue mobile hamburger opens from click/tap activation");
  assertNotIncludes(publicMobileNavigation, "onTouchStart={openDrawer}", "CampaignCue mobile hamburger avoids touchstart/click double activation");
  assertIncludes(publicMobileNavigation, "CAMPAIGNCUE_WEBSITE_FEATURE_PATHS", "CampaignCue mobile drawer uses product feature paths");
  assertIncludes(publicMobileNavigation, "CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS", "CampaignCue mobile drawer uses product use-case paths");
  assertIncludes(publicMobileNavigation, "Open workspace", "CampaignCue mobile drawer keeps workspace CTA");
  assertIncludes(publicStyles, "width: min(340px, calc(100vw - 32px))", "CampaignCue mobile drawer uses a slimmer professional panel width");
  assertIncludes(publicStyles, "grid-template-areas:", "CampaignCue mobile drawer overview row has explicit icon/text/arrow placement");
  assertIncludes(publicStyles, "campaigncueDrawerIn", "CampaignCue mobile drawer uses a short slide-in animation");
  assertIncludes(publicStyles, "body[data-campaigncue-mobile-menu=\"open\"] [data-product=\"campaigncue\"][role=\"dialog\"]", "CampaignCue mobile drawer hides cookie panel while open");
  assertIncludes(publicStyles, ".campaigncue-feature-hero", "CampaignCue public CSS styles dedicated feature-page hero");
  assertIncludes(publicStyles, ".campaigncue-feature-hero {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr);", "CampaignCue feature-page hero uses one-column stacked layout");
  assertIncludes(publicStyles, ".campaigncue-use-case-hero {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr);", "CampaignCue use-case hero uses one-column stacked layout");
  assertIncludes(publicStyles, "font-size: clamp(3.05rem, 4.1vw, 4.75rem)", "CampaignCue subpage hero title uses restrained desktop type scale");
  assertIncludes(publicStyles, "text-wrap: balance", "CampaignCue subpage hero titles balance long headings");
  assertIncludes(publicStyles, ".campaigncue-feature-preview-window", "CampaignCue public CSS styles feature-page previews");
  assertIncludes(publicStyles, ".campaigncue-feature-proof-grid", "CampaignCue public CSS styles feature-page proof grid");
  assertIncludes(publicStyles, ".campaigncue-feature-boundary", "CampaignCue public CSS styles feature-page boundaries");
  assertIncludes(publicStyles, ".campaigncue-feature-related", "CampaignCue public CSS styles feature-page related links");
  assertIncludes(publicStyles, ".campaigncue-small-business-link", "CampaignCue public CSS styles homepage small-business use-case link");
  assertIncludes(publicStyles, ".campaigncue-use-case-hero", "CampaignCue public CSS styles small-business use-case hero");
  assertIncludes(publicStyles, ".campaigncue-use-case-floating-card", "CampaignCue public CSS styles small-business floating output assets");
  assertIncludes(publicStyles, ".campaigncue-use-case-source-pack", "CampaignCue public CSS styles small-business source-to-pack visual");
  assertIncludes(publicStyles, ".campaigncue-use-case-reuse-preview", "CampaignCue public CSS styles small-business Creative Studio/CueLayers preview");
  assertIncludes(publicStyles, "--cc-section: min(100% - 24px, 390px)", "CampaignCue phone layout uses compact centered content width");
  assertIncludes(publicStyles, "font-size: 2.5rem", "CampaignCue mobile homepage hero uses fixed readable title size");
  assertIncludes(publicStyles, "font-size: 1.92rem", "CampaignCue mobile feature/use-case hero uses fixed readable title size");
  assertIncludes(publicStyles, ".campaigncue-feature-breadcrumb,\n    .campaigncue-use-case-pills {\n        display: none;", "CampaignCue mobile subpage heroes remove nonessential desktop metadata");
  assertIncludes(publicStyles, "max-height: 264px", "CampaignCue mobile previews are height bounded");
  assertIncludes(publicStyles, ".campaigncue-feature-editor-preview aside,\n    .campaigncue-feature-editor-preview aside:last-child {\n        display: none;", "CampaignCue mobile Creative Studio preview hides cramped desktop side rails");
  assertIncludes(publicStyles, ".campaigncue-use-case-hero-checks {\n        display: none;", "CampaignCue mobile use-case preview avoids clipped proof chips");
  assertIncludes(publicStyles, "grid-template-columns: 1fr 1fr", "CampaignCue mobile proof strip uses two-column phone pills");
  assertIncludes(publicStyles, "min-height: 48px", "CampaignCue hamburger uses touch target margin");
  assertIncludes(publicStyles, "min-height: 52px", "CampaignCue mobile drawer CTA uses touch target margin");
  assertIncludes(publicStyles, "white-space: normal", "CampaignCue public mobile badges can wrap");
  assertIncludes(publicStyles, "flex-direction: column", "CampaignCue public mobile hero actions stack");
  assertIncludes(publicStyles, "max-width: 100%", "CampaignCue mobile hero title is width-bounded");
  assertIncludes(publicStyles, "@media (max-width: 380px)", "CampaignCue mobile hero has narrow-screen fallback");
  assertNotIncludes(publicStyles, "--cc-lime", "CampaignCue public CSS avoids stale lime alias");
  assertNotIncludes(publicStyles, "#cff342", "CampaignCue public CSS avoids old lime accent");
  assertNotIncludes(publicStyles, "#7dd3fc", "CampaignCue public CSS avoids old cyan asset-wall accent");
  assertNotIncludes(publicStyles, "#bbf7d0", "CampaignCue public CSS avoids old mint asset-wall accent");
  assertIncludes(publicScrollReveal, ".cc-scroll-reveal", "CampaignCue scroll reveal base class exists");
  assertIncludes(publicScrollReveal, ".cc-scroll-reveal--pending", "CampaignCue scroll reveal pending state exists");
  assertIncludes(publicScrollReveal, ".cc-scroll-reveal--visible", "CampaignCue scroll reveal visible state exists");
  assertIncludes(publicScrollReveal, "prefers-reduced-motion: reduce", "CampaignCue scroll reveal supports reduced motion");
  assertIncludes(publicScrollReveal, "transform: none", "CampaignCue scroll reveal clears transform in visible/reduced states");
  assertIncludes(publicScrollReveal, "will-change: auto", "CampaignCue scroll reveal does not keep persistent compositing layers");
  assertIncludes(publicScrollRevealComponent, "IntersectionObserver", "CampaignCue scroll reveal uses viewport observer");
  assertIncludes(publicScrollRevealComponent, "initiallyVisibleTargets", "CampaignCue scroll reveal handles first viewport targets");
  assertIncludes(publicScrollRevealComponent, "FALLBACK_VP_CHECK_DELAY_MS", "CampaignCue scroll reveal has fallback viewport check");
  assertIncludes(publicScrollRevealComponent, "prefersReducedMotion", "CampaignCue scroll reveal honors reduced-motion users");
  assertIncludes(publicScrollRevealComponent, ".campaigncue-powerhouse-card", "CampaignCue scroll reveal covers creative powerhouse cards");
  assertNotIncludes(publicScrollRevealComponent, ".campaigncue-asset-tile", "CampaignCue scroll reveal no longer targets removed asset-wall tiles");
  assertIncludes(publicScrollRevealComponent, ".campaigncue-feature-preview", "CampaignCue scroll reveal covers feature-page previews");
  assertIncludes(publicScrollRevealComponent, ".campaigncue-feature-related a", "CampaignCue scroll reveal covers feature-page related links");
  assertIncludes(publicScrollRevealComponent, ".campaigncue-use-case-preview", "CampaignCue scroll reveal covers use-case page preview");
  assertIncludes(publicScrollRevealComponent, ".campaigncue-use-case-scenarios article", "CampaignCue scroll reveal covers use-case scenario cards");
  assertNotIncludes(publicSite, "campaigncue-card-grid", "CampaignCue public site avoids generic card grid class");
  assertNotIncludes(publicSite, "campaigncue-output-grid", "CampaignCue public site avoids old output grid class");
  assertIncludes(websiteDoc, "homepage is simplified", "CampaignCue website doc records the simplified SMB-owner homepage contract");
  assertIncludes(websiteDoc, "feature pages and use-case pages", "CampaignCue website doc routes removed homepage depth to deeper pages");
  assertIncludes(websiteDoc, "compact product-surface dock", "CampaignCue website doc records the visual replacement for heavy feature depth");
  assertIncludes(websiteDoc, "business-card reference", "CampaignCue website doc records the provided palette source");
  assertIncludes(websiteDoc, "deep navy", "CampaignCue website doc records navy palette direction");
  assertIncludes(websiteDoc, "rose pink", "CampaignCue website doc records rose palette direction");
  assertIncludes(websiteDoc, "--cc-pink: #d96e9b", "CampaignCue website doc records the active rose token");
  assertIncludes(websiteDoc, "floating centered white navigation", "CampaignCue website doc records final AdCreative detail polish");
  assertIncludes(websiteDoc, "rose primary CTAs with white text", "CampaignCue website doc records polished CTA contrast");
  assertIncludes(websiteDoc, "very light navy/pink borders", "CampaignCue website doc records polished border treatment");
  assertIncludes(websiteDoc, "Scroll Motion", "CampaignCue website doc records scroll motion behavior");
  assertIncludes(websiteDoc, "content remains visible by default", "CampaignCue website doc records safe reveal fallback");
  assertIncludes(audit, "Current CampaignCue palette pass", "CampaignCue audit records the palette pass");
  assertIncludes(audit, "Current CampaignCue AdCreative detail-polish pass", "CampaignCue audit records final AdCreative detail polish");
  assertIncludes(changelog, "CampaignCue Public Website Visual Finish", "CampaignCue changelog records public website visual finish");
  assertIncludes(changelog, "CampaignCue Product And Use-Case Menus", "CampaignCue changelog records product/use-case menus");
  assertIncludes(changelog, "CampaignCue Small Business Use-Case Page", "CampaignCue changelog records small-business use-case page");
  assertIncludes(changelog, "CampaignCue Website Compression Pass", "CampaignCue changelog records website compression pass");
  assertIncludes(audit, "Current CampaignCue scroll motion pass", "CampaignCue audit records the scroll motion pass");
  assertIncludes(audit, "Current CampaignCue proof-layer website parity pass", "CampaignCue audit records the proof-layer website parity pass");
  assertIncludes(websiteDoc, "separate rendered pack index, owner path, and duplicate workflow rail are removed", "CampaignCue website doc records removed homepage sections");
  assertIncludes(websiteDoc, "owner problem band, category comparison, standalone proof ledger, brand/proof layer, Daily Desk explainer, output ledger, Creative Studio explainer, CueLayers explainer, prompt examples, asset wall, and homepage capability ledger", "CampaignCue website doc records sections removed from the homepage");
  assertIncludes(websiteDoc, "Important feature highlights are reintroduced as visual navigation assets", "CampaignCue website doc protects feature highlights after homepage simplification");
  assertIncludes(websiteDoc, "Brand Playbook guidance", "CampaignCue website doc records Brand Playbook public boundary through feature-page depth");
  assertIncludes(websiteDoc, "Campaign Proof Deck review brief", "CampaignCue website doc records proof deck public boundary");
  assertIncludes(websiteDoc, "proof deck preview", "CampaignCue website doc records proof deck preview as feature-page depth");
  assertIncludes(websiteDoc, "reusable-template loop", "CampaignCue website doc records reusable-template loop as feature-page depth");
  assertIncludes(websiteDoc, "claim/source/risk/action", "CampaignCue website doc records concrete trust matrix");
  assertIncludes(websiteDoc, "Do packs include a review record?", "CampaignCue website doc FAQ covers proof deck review record");
  assertIncludes(websiteDoc, "Seesaw", "CampaignCue website doc captures Seesaw reference decision");
  assertIncludes(websiteDoc, "Blank", "CampaignCue website doc captures Blank production-polish reference");
  assertIncludes(websiteDoc, "Ploy", "CampaignCue website doc captures Ploy proof/activity reference");
  assertIncludes(websiteDoc, "Linear", "CampaignCue website doc captures Linear editorial rhythm reference");
  assertIncludes(websiteDoc, "Genie Studio", "CampaignCue website doc captures Genie creative-tool reference");
  assertIncludes(websiteDoc, "AdCreative home", "CampaignCue website doc captures AdCreative homepage study");
  assertIncludes(websiteDoc, "AdCreative feature pages", "CampaignCue website doc captures AdCreative nested feature-page study");
  assertIncludes(websiteDoc, "AdCreative analysis/trust pages", "CampaignCue website doc captures AdCreative analysis/trust study");
  assertIncludes(websiteDoc, "AdCreative use-case/ROI pages", "CampaignCue website doc captures AdCreative use-case and ROI study");
  assertIncludes(websiteDoc, "AdCreative full-page visual system screenshot review", "CampaignCue website doc captures screenshot-based visual gap");
  assertIncludes(websiteDoc, "AdCreative Compliance Checker", "CampaignCue website doc captures compliance-surface research");
  assertIncludes(websiteDoc, "Canva Brand Kit", "CampaignCue website doc captures brand-kit research");
  assertIncludes(websiteDoc, "Planable home", "CampaignCue website doc captures approval workflow research");
  assertIncludes(websiteDoc, "Rocketium Creative Automation", "CampaignCue website doc captures template/reuse research");
  assertIncludes(websiteDoc, "quick-fit entry based on owner bottlenecks", "CampaignCue website doc adopts fit-check pattern");
  assertIncludes(websiteDoc, "floating hero artifacts", "CampaignCue website doc adopts hero artifact pattern");
  assertIncludes(websiteDoc, "asset-wall examples", "CampaignCue website doc adopts visual asset wall pattern");
  assertIncludes(websiteDoc, "Text-only ledgers", "CampaignCue website doc rejects text-only slop feel");
  assertIncludes(websiteDoc, "direct ad-account push", "CampaignCue website doc rejects direct ad-account push copying");
  assertIncludes(websiteDoc, "guaranteed conversion/ROAS claims", "CampaignCue website doc rejects unsupported performance claims");
  assertIncludes(websiteDoc, "predictive creative scoring", "CampaignCue website doc rejects unsupported creative scoring claims");
  assertIncludes(websiteDoc, "No source-file import", "CampaignCue website doc rejects source-file recovery claims");
  assertIncludes(websiteDoc, "Use ledgers only where they reduce reading effort", "CampaignCue website doc preserves the simplified anti-card-grid layout rule");
  assertIncludes(websiteDoc, "collage", "CampaignCue website doc preserves anti-collage design guardrail");
  assertIncludes(websiteDoc, "Do owners only get social posts?", "CampaignCue website doc FAQ covers full output pack");
  assertIncludes(websiteDoc, "Dedicated Feature Pages", "CampaignCue website doc documents dedicated feature pages");
  assertIncludes(websiteDoc, "Feature and use-case pages use one-column, multi-row heroes", "CampaignCue website doc records subpage hero layout rule");
  assertIncludes(websiteDoc, "Product and use-case menus", "CampaignCue website doc documents product/use-case menus");
  assertIncludes(websiteDoc, "CampaignCueMobileNavigation", "CampaignCue website doc documents mobile drawer navigation");
  assertIncludes(websiteDoc, "hides the CampaignCue cookie panel while the drawer is open", "CampaignCue website doc documents drawer cookie-panel suppression");
  assertIncludes(websiteDoc, "Dedicated Use-Case Pages", "CampaignCue website doc documents dedicated use-case pages");
  assertIncludes(websiteDoc, "/use-cases/small-business", "CampaignCue website doc documents small-business use-case route");
  assertIncludes(websiteDoc, "facts -> cue -> pack outputs -> creative reuse -> review -> manual export", "CampaignCue website doc records small-business page journey");
  assertIncludes(websiteDoc, "/features/daily-campaign-desk", "CampaignCue website doc documents Daily Campaign Desk page route");
  assertIncludes(websiteDoc, "/features/campaign-pack-studio", "CampaignCue website doc documents Campaign Pack Studio page route");
  assertIncludes(websiteDoc, "/features/creative-studio", "CampaignCue website doc documents Creative Studio page route");
  assertIncludes(websiteDoc, "/features/cuelayers", "CampaignCue website doc documents CueLayers page route");
  assertIncludes(websiteDoc, "/features/creative-trust-center", "CampaignCue website doc documents Creative Trust Center page route");
  assertIncludes(websiteDoc, "/features/brand-playbook-proof-deck", "CampaignCue website doc documents Brand Playbook and Proof Deck page route");
  assertIncludes(websiteDoc, "/features/reusable-pack-templates", "CampaignCue website doc documents Reusable Pack Templates page route");
  assertIncludes(productFirebaseDoc, "dedicated public feature pages", "CampaignCue Firebase doc records zero-cost feature pages");
  assertIncludes(productFirebaseDoc, "public use-case pages", "CampaignCue Firebase doc records zero-cost use-case pages");
  assertIncludes(audit, "Current CampaignCue small-business use-case page pass", "CampaignCue audit records small-business use-case page pass");
  assertIncludes(audit, "competitor proof-surface follow-up", "CampaignCue audit records competitor proof-surface follow-up");
  assertIncludes(audit, "Current CampaignCue feature-page website pass", "CampaignCue audit records feature-page website pass");
  assertIncludes(audit, "CAMPAIGNCUE_FIREBASE_UNAVAILABLE", "CampaignCue audit setup-blocked code");
  assertIncludes(audit, "src/app/(campaigncue)/campaigncue/app", "CampaignCue audit owner route-group path");
  assertIncludes(validation, "CAMPAIGNCUE_FIREBASE_UNAVAILABLE", "CampaignCue validation setup-blocked code");
  assertIncludes(validation, "rewrites to `/campaigncue/app`", "CampaignCue validation workspace rewrite path");
  assertIncludes(apiDoc, "CAMPAIGNCUE_FIREBASE_UNAVAILABLE", "CampaignCue API doc setup-blocked code");
  assertIncludes(readme, "campaigncue-route-boundary.md", "CampaignCue README route-boundary link");
  assertIncludes(readme, "campaigncue-next-expansion-list.md", "CampaignCue README next expansion link");
  assertIncludes(readme, "campaigncue-delivery-boundary.md", "CampaignCue README delivery-boundary link");
  assertIncludes(readme, "campaign-inbox", "CampaignCue README links the Campaign Inbox doc set");
  assertIncludes(campaignInboxReadme, "Draft text is not persisted", "Campaign Inbox docs preserve transient draft boundary");
  assertIncludes(campaignInboxImpl, "one idempotent Firestore transaction", "Campaign Inbox docs record the batched mutation contract");
  assertIncludes(campaignInboxFirebase, "adds no collection and no Storage object", "Campaign Inbox docs record the zero-new-collection contract");
  assertIncludes(readme, "campaign-memory", "CampaignCue README links the Campaign Memory doc set");
  assertIncludes(campaignMemoryReadme, "Owner-reported", "Campaign Memory docs disclose evidence source");
  assertIncludes(campaignMemoryImpl, "transaction", "Campaign Memory docs record concurrency-safe mutation behavior");
  assertIncludes(campaignMemoryFirebase, "No collection is added", "Campaign Memory docs record the zero-new-collection contract");
  assertIncludes(expansionDoc, "Campaign Memory 2.0", "CampaignCue expansion list tracks Campaign Memory 2.0");
  assertIncludes(readme, "winning-pack-refresh", "CampaignCue README links Winning Pack Refresh docs");
  assertIncludes(winningPackRefreshReadme, "current truth", "Winning Pack Refresh docs preserve current-truth rebuild");
  assertIncludes(winningPackRefreshImpl, "reuseRootCampaignId", "Winning Pack Refresh docs record bounded root provenance");
  assertIncludes(winningPackRefreshFirebase, "No new collection", "Winning Pack Refresh docs record zero-new-collection cost");
  assertIncludes(readme, "vertical-campaign-playbooks", "CampaignCue README links Vertical Campaign Playbooks docs");
  assertIncludes(verticalPlaybooksReadme, "deterministic Campaign Decision Engine", "Vertical Campaign Playbooks preserve deterministic authority");
  assertIncludes(verticalPlaybooksImpl, "verticalPlaybooks.ts", "Vertical Campaign Playbooks docs map registry source");
  assertIncludes(verticalPlaybooksFirebase, "adds no Firebase read", "Vertical Campaign Playbooks docs record zero-read cost");
  assertIncludes(readme, "hosted-offer-page", "CampaignCue README links Hosted Offer Page docs");
  assertIncludes(hostedOfferReadme, "explicit and owner-controlled", "Hosted Offer Page docs preserve explicit publishing");
  assertIncludes(hostedOfferImpl, "owner opens page or downloads QR locally", "Hosted Offer Page docs record local QR boundary");
  assertIncludes(hostedOfferFirebase, "Cached public request", "Hosted Offer Page docs record cached-read cost");
  assertIncludes(readme, "local-visibility-action-center", "CampaignCue README links Local Visibility Action Center docs");
  assertIncludes(localVisibilityReadme, "does not inspect external profiles", "Local Visibility docs preserve the external-profile boundary");
  assertIncludes(localVisibilityImpl, "buildCampaignCueLocalVisibilityActions", "Local Visibility docs map the deterministic implementation");
  assertIncludes(localVisibilityFirebase, "zero additional Firebase operations", "Local Visibility docs record the zero-operation cost");
  assertIncludes(readme, "approval-comment-inbox", "CampaignCue README links Approval and Comment Inbox docs");
  assertIncludes(approvalInboxReadme, "existing Campaign Pack", "Approval Inbox docs preserve the campaign-centered owner model");
  assertIncludes(approvalInboxImpl, "approvalInbox", "Approval Inbox docs map the compact campaign projection");
  assertIncludes(approvalInboxFirebase, "no additional overview read", "Approval Inbox docs record the read-cost boundary");
  assertIncludes(readme, "Safe upload spine is implemented", "CampaignCue README reflects implemented CueLayers safe upload spine");
  assertIncludes(coverageAudit, "Later Product Corrections Still Aligned", "CampaignCue ChatGPT coverage audit includes later product correction alignment");
  assertIncludes(coverageAudit, "open supported assets in the shared Creative Editor", "CampaignCue ChatGPT coverage audit reflects current editor runtime");
  assertIncludes(coverageAudit, "Provider-rendered PNG/JPG banner generation", "CampaignCue ChatGPT coverage audit avoids claiming visual editor is inactive");
  assertIncludes(coverageAudit, "Local-language variants", "CampaignCue ChatGPT coverage audit covers original local-language requirement");
  assertIncludes(outputPackReadme, "language handoff note with preferred locale", "Campaign Pack docs list language handoff output");
  assertIncludes(outputPackSpec, "No automatic translation claim", "Campaign Pack spec preserves safe language boundary");
  assertIncludes(outputPackImpl, "instructions/language-handoff.txt", "Campaign Pack impl documents language handoff ZIP file");
  assertIncludes(readme, "durable-cloud-export-archive", "CampaignCue README links durable cloud export archive docs");
  assertIncludes(exportArchiveReadme, "two rotating Storage object names", "export archive docs preserve bounded two-slot retention");
  assertIncludes(exportArchiveImpl, "CreativeEditorDocument", "export archive docs preserve editor product truth");
  assertIncludes(exportArchiveFirebase, "No collection is added", "export archive docs preserve no-new-collection cost boundary");
  assertIncludes(exportArchiveValidation, "not deployment-certified", "export archive docs separate source readiness from external evidence");
  assertIncludes(productFirebaseDoc, "archive-{a\\|b}.zip", "CampaignCue Firebase doc records exact archive path family");
  assertIncludes(audit, "Durable Cloud Export Archive Audit", "CampaignCue audit records durable archive review");
  assertIncludes(changelog, "CampaignCue Durable Campaign Pack Archive", "CampaignCue changelog records durable archive delivery");
  assertIncludes(businessBrainSpec, "Brand Playbook", "Business Brain spec documents Brand Playbook");
  assertIncludes(businessBrainImpl, "BrandPlaybook", "Business Brain implementation documents playbook shape");
  assertIncludes(outputPackReadme, "proof-deck/campaign-proof-deck.md", "Campaign Pack docs list proof deck ZIP file");
  assertIncludes(outputPackSpec, "Campaign Proof Deck", "Campaign Pack spec documents proof deck contract");
  assertIncludes(outputPackImpl, "CampaignCueOutputPack.proofDeck", "Campaign Pack implementation documents proof deck field");
  assertIncludes(outputPackSpec, "UGC/reel dialogue-action reference", "Campaign Pack spec documents UGC dialogue/action proof reference");
  assertIncludes(outputPackImpl, "UGC dialogue/action beats", "Campaign Pack implementation documents UGC dialogue/action proof content");
  assertIncludes(creativeStudioSpec, "Brand Playbook-aware brief", "Creative Studio spec documents playbook-aware briefs");
  assertIncludes(trustCenterSpec, "Brand Playbook check", "Creative Trust Center spec documents playbook checks");
  assertIncludes(trustCenterSpec, "UGC experience check", "Creative Trust Center spec documents first-person UGC experience checks");
  assertIncludes(ugcScriptSpec, "Dialogue/action brief", "UGC Script Studio spec documents dialogue/action brief structure");
  assertIncludes(ugcScriptSpec, "AI avatars, stock people, or fictional customers", "UGC Script Studio spec rejects fake avatar/customer posture");
  assertIncludes(ugcScriptImpl, "dialogue/action beats", "UGC Script Studio implementation documents active brief fields");
  assertIncludes(ugcScriptImpl, "First-person usage or recommendation wording", "UGC Script Studio implementation documents first-person testimonial guard");
  assertIncludes(ugcScriptFirebase, "adds no new Firestore collection", "UGC Script Studio Firebase docs preserve no-new-cost active runtime");
  assertIncludes(videoReelSpec, "Text to motion", "Video Reel Studio spec documents owned text-motion composition");
  assertIncludes(videoReelSpec, "Fake or synthetic customer testimonials", "Video Reel Studio spec rejects fake customer posture");
  assertIncludes(videoReelSpec, "Browser-selected encoding", "Video Reel Studio spec keeps MP4 and WebM labeling honest");
  assertIncludes(videoReelImpl, "Canvas, `captureStream`, MediaRecorder", "Video Reel Studio implementation documents the in-house compositor");
  assertIncludes(videoReelImpl, "No Topview SDK/API", "Video Reel Studio implementation preserves the no-provider runtime");
  assertIncludes(videoReelImpl, "The binary stays on the device", "Video Reel Studio implementation preserves the local binary boundary");
  assertIncludes(videoReelImpl, "legacy receipts cannot feed result learning", "Video Reel Studio implementation rejects unbound legacy evidence from learning");
  assertIncludes(videoReelSpec, "Legacy unbound receipts remain visible but cannot feed format learning", "Video Reel Studio spec limits learning to exact rendered evidence");
  assertIncludes(changelog, "CampaignCue In-House Video Reel Studio", "CampaignCue changelog records the owned video runtime");
  assertIncludes(changelog, "CampaignCue Video Content Coach And Format Learning", "CampaignCue changelog records deterministic coaching and exact-version learning");
  assertIncludes(templateRegistrySpec, "Campaign proof deck", "Template registry spec documents proof deck output intent");
  assertIncludes(templateRegistryImpl, "campaign_proof_deck_pdf", "Template registry implementation documents proof deck output type");
  assertIncludes(deliveryDoc, "Campaign Proof Deck brief", "Delivery boundary documents proof deck as response-derived brief");
  assertIncludes(changelog, "CampaignCue Brand Playbook And Proof Deck", "CampaignCue changelog documents Brand Playbook and Proof Deck pass");
  assertIncludes(changelog, "CampaignCue UGC Brief Guardrails", "CampaignCue changelog documents UGC brief guardrails pass");
  assertIncludes(coverageAudit, "AI UGC avatar tutorial", "CampaignCue coverage audit documents AI UGC avatar tutorial decision");
  assertIncludes(expansionDoc, "Provider adapters behind capability checks", "CampaignCue next expansion provider gate");
  assertIncludes(expansionDoc, "Meta Ads MCP is validated only as a read-first", "CampaignCue expansion list preserves Meta read-first boundary");
  assertIncludes(deliveryDoc, "CampaignCue day-one delivery is export/download only", "CampaignCue delivery-boundary day-one rule");
  assertIncludes(deliveryDoc, "Meta Ads MCP Decision", "CampaignCue delivery boundary records the Meta MCP fit decision");
  assertIncludes(deliveryDoc, "ads-mcp-server-overview", "CampaignCue delivery boundary cites Meta's official Ads MCP overview");
  assertIncludes(deliveryDoc, "/api/campaigncue/integrations` is read-only", "CampaignCue delivery-boundary read-only integrations rule");
  assertIncludes(deliveryDoc, "Clipboard copy is not an active API action", "CampaignCue delivery-boundary clipboard-copy exclusion");
  assertNotIncludes(deliveryDoc, "copy a single output", "CampaignCue delivery-boundary excludes stale copy action");
  assertIncludes(audit, "Main Gap Fix Pass", "CampaignCue audit documents main gap pass");
  assertIncludes(audit, "Delivery Boundary Pass", "CampaignCue audit documents delivery boundary pass");
  assertIncludes(changelog, "CampaignCue Main Gap Hardening", "CampaignCue changelog main gap entry");
  assertIncludes(changelog, "CampaignCue Export Delivery Boundary", "CampaignCue changelog delivery boundary entry");
  assertIncludes(changelog, "CampaignCue Meta Ads MCP Read-First Boundary", "CampaignCue changelog records Meta Ads MCP boundary pass");
  assertIncludes(adsStudioReadme, "disabled read-first provider candidate", "Ads Studio README records disabled Meta MCP posture");
  assertIncludes(adsStudioSpec, "A model may summarize validated provider evidence", "Ads Studio spec preserves deterministic model/tool boundary");
  assertIncludes(adsStudioImpl, "There is no active `adPacks`", "Ads Studio implementation rejects speculative active collections");
  assertIncludes(adsStudioImpl, "deterministic read-tool allowlist", "Ads Studio implementation requires provider tool allowlisting");
  assertIncludes(adsStudioFirebase, "adds no Firestore collection", "Ads Studio Firebase docs preserve current zero-cost runtime");
  assertIncludes(adsStudioFirebase, "providerMetricSummaries/meta_ads", "Ads Studio Firebase docs define one compact future summary path");
  assertIncludes(adsStudioHelpdoc, "does not currently connect an ad account", "Ads Studio help copy preserves manual-only owner truth");
  assertIncludes(adsStudioWebsite, "must not appear in public capability copy", "Ads Studio website docs block premature Meta claims");
  assertIncludes(adsStudioTests, "Unknown, renamed, write-capable, or mixed read/write tools fail closed", "Ads Studio tests cover MCP tool drift and write rejection");
  assertIncludes(adsStudioValidation, "No CampaignCue MCP client/import, OAuth flow, provider token, Meta network call", "Ads Studio validation records zero-call implementation truth");
  assertIncludes(sourceIntegrationsSpec, "Meta Ads MCP reporting/diagnostics is a disabled read-first candidate", "Source Integration spec records Meta read-first posture");
  assertIncludes(sourceIntegrationsImpl, "does not initialize an MCP client", "Source Integration implementation rejects dormant client initialization");
  assertIncludes(apiDoc, "no MCP client or provider call is active", "API boundary implementation preserves no-provider-call runtime");
  assertIncludes(apiFirebaseDoc, "does not read or write provider-connection", "API Firebase docs distinguish future logical objects from active collections");
  assertIncludes(boundaryDoc, "Do not add owner dashboard pages under `src/app/sites/campaigncue`", "CampaignCue route-boundary guardrail");
  assertIncludes(boundaryDoc, "Public feature pages may show static dashboard/editor previews", "CampaignCue route-boundary permits static previews only");
  assertIncludes(boundaryDoc, "Unknown CampaignCue paths under `/features/*` must return `404`", "CampaignCue route-boundary documents feature slug 404 guard");
  assertIncludes(changelog, "CampaignCue Route Boundary Alignment", "CampaignCue changelog route-boundary entry");
  assertIncludes(changelog, "CampaignCue Public Feature Pages", "CampaignCue changelog feature-page entry");
  assertIncludes(changelog, "CampaignCue setup-blocked state added", "CampaignCue changelog setup-blocked entry");
  assertIncludes(cueLayersReadme, "Safe upload spine implemented", "CueLayers README implemented status");
  assertIncludes(cueLayersReadme, "Provider-driven decomposition remains gated", "CueLayers README provider gate");
  assertIncludes(cueLayersReadme, "SVG/JSON browser exports are disabled", "CueLayers README documents browser export lock");
  assertIncludes(cueLayersImpl, "Flat-safe projection", "CueLayers implementation doc current scope");
  assertIncludes(cueLayersImpl, "Brand Playbook", "CueLayers implementation doc captures Brand Playbook snapshot context");
  assertIncludes(cueLayersImpl, "Not implemented as active runtime yet", "CueLayers implementation doc gated scope");
  assertIncludes(cueLayersFirebase, "Safe upload spine implemented", "CueLayers Firebase doc implemented status");
  assertIncludes(cueLayersValidation, "Safe upload spine is implementation-ready", "CueLayers validation verdict");
  assertIncludes(cueLayersValidation, "Provider-driven editable decomposition is not active", "CueLayers validation provider boundary");
  assertIncludes(cueLayersValidation, "browser SVG/JSON exports are disabled", "CueLayers validation documents browser export lock");
  assertIncludes(changelog, "CampaignCue CueLayers Safe Upload Spine", "CampaignCue changelog CueLayers implementation entry");
  assertIncludes(designCueReadme, "The current CampaignCue editor renders Design Cue", "Design Cue README implemented status");
  assertIncludes(designCueImpl, "Implemented File Map", "Design Cue implementation file map");
  assertIncludes(designCueImpl, "Brand Playbook-aware brand checks", "Design Cue implementation documents Brand Playbook checks");
  assertIncludes(designCueFirebase, "guarded route fails closed while model assist is disabled", "Design Cue Firebase fail-closed model route");
  assertIncludes(designCueValidation, "Design Cue deterministic patch flow is implementation-ready", "Design Cue validation verdict");
  assertIncludes(designCueValidation, "Provider-backed model assistance is not active", "Design Cue validation model boundary");
  assertIncludes(changelog, "CampaignCue Design Cue Deterministic Assistant", "CampaignCue changelog Design Cue entry");
}

function verifyRequiredFiles() {
  [
    "src/types/campaigncue.ts",
    "src/types/campaigncueVideo.ts",
    "src/lib/validation/campaigncueSchemas.ts",
    "src/lib/validation/campaigncueVideoSchemas.ts",
    "src/lib/campaigncue/apiGuards.ts",
    "src/lib/campaigncue/server.ts",
    "src/lib/campaigncue/assetVisibility.ts",
    "src/lib/campaigncue/assetUploadRecovery.ts",
    "src/constants/campaigncue/exportArchive.ts",
    "src/lib/campaigncue/exportArchiveClient.ts",
    "src/lib/campaigncue/campaignMemory.ts",
    "src/constants/campaigncue/winningPackRefresh.ts",
    "src/constants/campaigncue/verticalPlaybooks.ts",
    "src/constants/campaigncue/offerPage.ts",
    "src/lib/campaigncue/offerPage.ts",
    "src/lib/campaigncue/offerPageServer.ts",
    "src/lib/campaigncue/experimentCoach.ts",
    "src/lib/campaigncue/localVisibility.ts",
    "src/lib/campaigncue/approvalInbox.ts",
    "src/constants/campaigncue/resultEvidence.ts",
    "src/lib/campaigncue/resultEvidence.ts",
    "src/lib/validation/campaigncueOfferPageSchemas.ts",
    "src/lib/campaigncue/videoReel.ts",
    "src/lib/campaigncue/videoCompositor.ts",
    "src/lib/campaigncue/cue-layers/server.ts",
    "src/types/campaigncueCueLayers.ts",
    "src/lib/validation/campaigncueCueLayersSchemas.ts",
    "src/app/sites/campaigncue/page.tsx",
    "src/app/sites/campaigncue/features/[featureSlug]/page.tsx",
    "src/app/sites/campaigncue/offer/[slug]/page.tsx",
    "src/app/api/campaigncue/campaigns/[campaignId]/offer-page/route.ts",
    "src/app/api/campaigncue/campaigns/[campaignId]/export-archive/route.ts",
    "src/app/api/campaigncue/video-projects/route.ts",
    "src/app/(campaigncue)/campaigncue/app/page.tsx",
    "src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx",
    "src/components/templates/campaigncue/CampaignCueVideoStudio.tsx",
    "__docs__/campaigncue/campaigncue-delivery-boundary.md",
    "__docs__/campaigncue/campaigncue-production-implementation-audit.md",
    "__docs__/campaigncue/campaign-memory/campaign-memory_validation.md",
    "__docs__/campaigncue/winning-pack-refresh/winning-pack-refresh_validation.md",
    "__docs__/campaigncue/vertical-campaign-playbooks/vertical-campaign-playbooks_validation.md",
    "__docs__/campaigncue/hosted-offer-page/hosted-offer-page_validation.md",
    "__docs__/campaigncue/campaign-experiment-coach/campaign-experiment-coach_validation.md",
    "__docs__/campaigncue/local-visibility-action-center/local-visibility-action-center_validation.md",
    "__docs__/campaigncue/approval-comment-inbox/approval-comment-inbox_validation.md",
    "__docs__/campaigncue/read-only-result-evidence/read-only-result-evidence_validation.md",
    "__docs__/campaigncue/durable-cloud-export-archive/durable-cloud-export-archive_validation.md",
    "scripts/verification/test-campaigncue-export-archive.ts",
    "__docs__/campaigncue/cue-layers/cue-layers_validation.md",
    "__docs__/campaigncue/design-cue/design-cue_validation.md",
    "__docs__/campaigncue/video-reel-studio/video-reel-studio_test-cases.md",
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
