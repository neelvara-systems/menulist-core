#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { readSharedBusinessCategories } = require("../campaigncue/read-shared-business-categories");

const ROOT = path.resolve(__dirname, "..", "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));
const fail = (message) => {
  console.error(`CampaignCue pack template verification failed: ${message}`);
  process.exit(1);
};
const assertIncludes = (relativePath, token) => {
  const content = read(relativePath);
  if (!content.includes(token)) fail(`${relativePath} is missing ${token}`);
};

const requiredFiles = [
  "src/constants/campaigncue/packTemplates.ts",
  "src/constants/campaigncue/outputPicker.ts",
  "src/types/campaigncuePackTemplates.ts",
  "src/lib/validation/campaigncuePackTemplateSchemas.ts",
  "src/lib/campaigncue/pack-templates/category.ts",
  "src/lib/campaigncue/pack-templates/catalog.ts",
  "src/lib/campaigncue/pack-templates/editorDocumentBoundary.ts",
  "src/lib/campaigncue/pack-templates/factSlotReadiness.ts",
  "src/lib/campaigncue/pack-templates/templateScopeBoundary.ts",
  "src/lib/campaigncue/pack-templates/workspaceTemplates.ts",
  "src/lib/campaigncue/pack-templates/workspaceTemplateIndexBoundary.ts",
  "src/lib/campaigncue/pack-templates/applyTemplate.ts",
  "src/lib/campaigncue/firebaseSessionClient.ts",
  "src/components/templates/campaigncue/PackTemplatePicker.tsx",
  "scripts/campaigncue/read-shared-business-categories.js",
  "scripts/campaigncue/seed-platform-pack-templates.js",
  "scripts/campaigncue/platform-pack-template-seeds.json",
  "__docs__/campaigncue/campaign-pack-template-registry/campaign-pack-template-registry_firebase.md",
  "__docs__/campaigncue/campaign-pack-template-registry/campaign-pack-template-registry_impl.md",
  "__docs__/campaigncue/campaign-pack-template-registry/campaign-pack-template-registry_spec.md",
];

for (const file of requiredFiles) {
  if (!exists(file)) fail(`missing required file ${file}`);
}

const validCategories = readSharedBusinessCategories(ROOT);
const seeds = JSON.parse(read("scripts/campaigncue/platform-pack-template-seeds.json"));
if (!Array.isArray(seeds) || seeds.length < validCategories.length) {
  fail("seed catalog must include at least one template per shared business category");
}
const categoriesInSeeds = new Set();
for (const seed of seeds) {
  if (!validCategories.includes(seed.businessCategory)) fail(`seed uses unsupported category ${seed.businessCategory}`);
  if (!seed.templateId || !seed.outputPackShape || !seed.decisionSeed) fail(`seed ${seed.templateId || "unknown"} is incomplete`);
  const slotTypes = seed.factSlots.map((slot) => slot.type);
  if (new Set(slotTypes).size !== slotTypes.length) fail(`seed ${seed.templateId} has duplicate fact slots`);
  const requiredSlots = seed.factSlots.filter((slot) => slot.required).map((slot) => slot.type).sort();
  const optionalSlots = seed.factSlots.filter((slot) => !slot.required).map((slot) => slot.type).sort();
  if (JSON.stringify(requiredSlots) !== JSON.stringify([...new Set(seed.requiredFactTypes)].sort())
    || JSON.stringify(optionalSlots) !== JSON.stringify([...new Set(seed.optionalFactTypes)].sort())) {
    fail(`seed ${seed.templateId} fact-slot metadata does not match its payload`);
  }
  categoriesInSeeds.add(seed.businessCategory);
}
for (const category of validCategories) {
  if (!categoriesInSeeds.has(category)) fail(`seed catalog missing category ${category}`);
}

assertIncludes("src/config/features.ts", "ENABLE_CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY");
assertIncludes("src/config/features.ts", "ENABLE_CAMPAIGNCUE_OUTPUT_PICKER");
assertIncludes("src/constants/campaigncue/outputPicker.ts", "CAMPAIGNCUE_OUTPUT_PICKER_ITEMS");
assertIncludes("src/constants/campaigncue/outputPicker.ts", "CAMPAIGNCUE_OUTPUT_PICKER_GROUPS");
assertIncludes("src/constants/campaigncue/outputPicker.ts", "CAMPAIGNCUE_OUTPUT_PICKER_ITEM_IDS");
assertIncludes("src/constants/campaigncue/outputPicker.ts", "requiredFactGroups");
assertIncludes("src/constants/campaigncue/outputPicker.ts", "campaignCueOutputIntentSupportsOwnerGoal");
assertIncludes("src/constants/campaigncue/outputPicker.ts", "campaignCueOutputItemMatchesTemplate");
assertIncludes("src/constants/campaigncue/outputPicker.ts", "campaign_proof_deck");
assertIncludes("src/constants/campaigncue/outputPicker.ts", "campaign_proof_deck_pdf");
assertIncludes("src/constants/campaigncue/outputPicker.ts", "source_to_channel_pack");
assertIncludes("src/constants/campaigncue/outputPicker.ts", "Source-to-channel pack");
assertIncludes("src/constants/campaigncue/outputPicker.ts", "local_creator_test_brief");
assertIncludes("src/constants/campaigncue/outputPicker.ts", "Prepare local creator brief");
assertIncludes("src/constants/campaigncue/outputPicker.ts", "creator_script");
assertIncludes("src/constants/campaigncue/outputPicker.ts", "flat_fee");
assertIncludes("src/constants/campaigncue/outputPicker.ts", "custom_size");
assertIncludes("src/constants/campaigncue/channels.ts", "Local creator brief");
assertIncludes("src/constants/campaigncue/index.ts", "outputPicker");
assertIncludes("src/constants/campaigncue/database.ts", "PLATFORM_PACK_TEMPLATES");
assertIncludes("src/constants/campaigncue/database.ts", "PACK_TEMPLATE_INDEXES");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "PackTemplatePicker");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "listCampaignCuePackTemplates");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "loadCampaignCuePackTemplateOverflow");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "platformOverflowDocIds");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "getCampaignCuePackTemplate");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "Campaign pack created from reusable base.");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "createCampaignFromOutputIntent");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "showOutputPicker={FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_OUTPUT_PICKER}");
assertIncludes("src/components/templates/campaigncue/PackTemplatePicker.tsx", "Campaign outputs");
assertIncludes("src/components/templates/campaigncue/PackTemplatePicker.tsx", "Show more options");
assertIncludes("src/components/templates/campaigncue/PackTemplatePicker.tsx", "not a generic design-format library");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "buildPackTemplateEditorContext");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "intent?: CampaignCueOutputPickerItem");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "output-intent:");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "kind: \"pack_template\"");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "Reusable campaign pack and editor layout saved.");
assertIncludes("src/lib/campaigncue/pack-templates/applyTemplate.ts", "editorDocument: input.editorDocument");
assertIncludes("src/lib/campaigncue/pack-templates/applyTemplate.ts", "input.outputPack?.proofDeck");
assertIncludes("src/lib/campaigncue/pack-templates/applyTemplate.ts", "input.businessBrain.brandKit.playbook");
assertIncludes("src/lib/campaigncue/pack-templates/category.ts", "resolveBusinessCategory");
assertIncludes("src/lib/campaigncue/pack-templates/catalog.ts", "loadPlatformCatalog");
assertIncludes("src/lib/campaigncue/pack-templates/catalog.ts", "loadWorkspaceTemplates");
assertIncludes("src/lib/campaigncue/pack-templates/catalog.ts", "getBlob(ref(storage, path), maxBytes)");
assertIncludes("src/lib/campaigncue/pack-templates/catalog.ts", "withCampaignCueFirebaseSession");
assertIncludes("src/lib/campaigncue/pack-templates/catalog.ts", 'purpose: "template_read"');
assertIncludes("src/lib/campaigncue/pack-templates/catalog.ts", "assertCampaignCuePackTemplatePayloadIdentity");
assertIncludes("src/lib/campaigncue/pack-templates/catalog.ts", "CampaignCuePackTemplateEditorDocumentSchema.parse(value)");
assertIncludes("src/lib/campaigncue/pack-templates/editorDocumentBoundary.ts", "prepareCampaignCuePackTemplateEditorDocument");
assertIncludes("src/lib/campaigncue/pack-templates/editorDocumentBoundary.ts", "hydrateCampaignCuePackTemplateEditorDocument");
assertIncludes("src/lib/campaigncue/pack-templates/editorDocumentBoundary.ts", "if (element.type === \"image\") continue;");
assertIncludes("src/lib/campaigncue/pack-templates/factSlotReadiness.ts", "getUnresolvedCampaignCuePackTemplateFactSlots");
assertIncludes("src/lib/campaigncue/pack-templates/factSlotReadiness.ts", "getUnresolvedCampaignCueOutputIntentRequirements");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "getUnresolvedCampaignCuePackTemplateFactSlots");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "intent.id === \"reuse_old_asset\"");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "outputIntentId: templateDraft?.outputIntentId");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "sourceTemplateId: templateDraft?.sourceTemplateId");
assertIncludes("src/lib/validation/campaigncueSchemas.ts", "outputIntentId: z.enum(CAMPAIGNCUE_OUTPUT_PICKER_ITEM_IDS)");
assertIncludes("src/lib/campaigncue/server.ts", "getUnresolvedCampaignCueOutputIntentRequirements");
assertIncludes("src/lib/campaigncue/server.ts", "outputIntentDecisions");
assertIncludes("src/lib/campaigncue/server.ts", "requestedOutputTypes: outputIntent?.id");
assertIncludes("src/lib/campaigncue/dailyDesk.ts", "requestedOutputTypes: params.campaign.pack?.requestedOutputTypes");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "Requested output focus:");
assertIncludes("src/lib/campaigncue/pack-templates/templateScopeBoundary.ts", "Template fact-slot metadata does not match its payload.");
assertIncludes("src/lib/campaigncue/pack-templates/templateScopeBoundary.ts", "assertCampaignCuePlatformTemplateCatalogScope");
assertIncludes("src/lib/campaigncue/pack-templates/templateScopeBoundary.ts", "assertCampaignCueWorkspaceTemplateIndexScope");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "MAX_WORKSPACE_TEMPLATES");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "campaigncue_workspace_template_storage_cleanup_failed");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "getBoundedRuntimeStringContext(\"storagePath\", path)");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "isMissingStorageObjectError");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "path?.endsWith(\"/pack-template.json\")");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "path?.endsWith(\"/editor-document.json\")");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "const versionRoot = `${root}/versions/${safeSegment(createRuntimeId(\"save\"))}`");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "const summary = await runTransaction(firestore");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "withCampaignCueFirebaseSession");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", 'purpose: "workspace_template_write"');
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "transaction.set(indexRef, index)");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "cleanupWorkspaceTemplateSummaries(storage, obsoleteRecords");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "campaigncue_workspace_template_persistence_probe_failed");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "campaigncue_workspace_template_delete_probe_failed");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "upsertWorkspaceTemplateIndex");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "removeWorkspaceTemplateFromIndex");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "campaignCueWorkspacePackTemplateDeleteSchema.parse(input)");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "isOwnedWorkspaceTemplateStoragePath");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "prepareCampaignCuePackTemplateEditorDocument");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplateIndexBoundary.ts", "obsoleteRecords");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplateIndexBoundary.ts", "const templateRoot = `${storageRoot}/${workspaceId}/${templateId}/`");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplateIndexBoundary.ts", "pack-template\\.json|editor-document\\.json|preview");
assertIncludes("package.json", "test:campaigncue-workspace-template-index-boundary");
assertIncludes("package.json", "test:campaigncue-pack-template-boundaries");
assertIncludes("scripts/campaigncue/seed-platform-pack-templates.js", "NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_PROJECT_ID and NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_STORAGE_BUCKET are required");
assertIncludes("scripts/campaigncue/seed-platform-pack-templates.js", "pack-template-${contentHash}.json");
assertIncludes("scripts/campaigncue/seed-platform-pack-templates.js", "preconditionOpts: { ifGenerationMatch: 0 }");
assertIncludes("scripts/campaigncue/seed-platform-pack-templates.js", "const batch = db.batch()");
assertIncludes("scripts/campaigncue/seed-platform-pack-templates.js", "overflowDocIds: catalogIds.slice(1)");
assertIncludes("src/lib/campaigncue/pack-templates/catalog.ts", "loadCampaignCuePackTemplateOverflow");
assertIncludes("src/lib/campaigncue/server.ts", "Creator fit check");
assertIncludes("src/lib/campaigncue/server.ts", "baseline views, real comment quality, local audience fit");
assertIncludes("src/lib/campaigncue/server.ts", "3-test plan");
assertIncludes("src/lib/campaigncue/server.ts", "test three creators, three hooks, or three nearby audiences");
assertIncludes("src/lib/campaigncue/server.ts", "CampaignCue does not broker creator deals");
assertIncludes("src/lib/campaigncue/server.ts", "process payments");
assertIncludes("src/lib/campaigncue/server.ts", "guarantee reach or revenue");
assertIncludes("src/lib/campaigncue/server.ts", "Disclose paid, gifted, agency, employee, or incentivized participation");
assertIncludes("src/lib/campaigncue/server.ts", "Do not present synthetic or fictional people as real customers");
assertIncludes("src/app/sites/campaigncue/page.tsx", "Local creator brief");
assertIncludes("src/app/sites/campaigncue/page.tsx", "creator-fit notes");
assertIncludes("__docs__/campaigncue/campaign-pack-template-registry/campaign-pack-template-registry_impl.md", "campaigncue_workspace_template_storage_cleanup_failed");
assertIncludes("__docs__/campaigncue/campaign-pack-template-registry/campaign-pack-template-registry_impl.md", "Missing Storage objects are treated as already-cleaned state");
assertIncludes("firestore-campaigncue.rules", "campaigncuePlatformPackTemplates");
assertIncludes("firestore-campaigncue.rules", "match /packTemplateIndexes/{docId}");
assertIncludes("firestore-campaigncue.rules", "isCampaignCueWorkspaceMemberData");
assertIncludes("firestore-campaigncue.rules", "campaignCueWorkspaceMemberRole(data)");
assertIncludes("firestore-campaigncue.rules", "hasCampaignCueFirebasePurpose('template_read')");
assertIncludes("firestore-campaigncue.rules", "hasCampaignCueFirebasePurpose('workspace_template_write')");
assertIncludes("storage-campaigncue.rules", "campaigncue/templates/platform");
assertIncludes("storage-campaigncue.rules", "campaigncue/templates/workspaces");
assertIncludes("storage-campaigncue.rules", "match /campaigncue/templates/workspaces/{workspaceId}/{templateId}/versions/{versionId}/{fileName}");
assertIncludes("storage-campaigncue.rules", "firestore.get(");
assertIncludes("__docs__/campaigncue/campaign-pack-template-registry/campaign-pack-template-registry_firebase.md", "2 Firestore reads");
assertIncludes("__docs__/campaigncue/campaign-pack-template-registry/campaign-pack-template-registry_firebase.md", "Matching custom claims");
assertIncludes("__docs__/campaigncue/campaign-pack-template-registry/campaign-pack-template-registry_firebase.md", "Unexpected cleanup failures log bounded diagnostics");
assertIncludes("__docs__/audits/menulist-production-readiness-audit.md", "CampaignCue workspace template Storage cleanup diagnostics checkpoint: fixed in source.");
assertIncludes("__docs__/changelog.md", "CampaignCue Workspace Template Storage Cleanup Diagnostics");
assertIncludes("__docs__/campaigncue/ugc-script-studio/ugc-script-studio_firebase.md", "no new Firestore collection, read, write, Storage object, Cloud Function, provider call, model call, creator CRM record, contract record, or payment record");
assertIncludes("__docs__/campaigncue/campaigncue_founder-research-addendum.md", "not \"build influencer marketing software.\"");
assertIncludes("__docs__/campaigncue/campaigncue_founder-research-addendum.md", "do not broker, price-guarantee, contract, or pay creators");

const implementation = [
  read("src/lib/campaigncue/firebaseSessionClient.ts"),
  read("src/lib/campaigncue/pack-templates/catalog.ts"),
  read("src/lib/campaigncue/pack-templates/workspaceTemplates.ts"),
  read("src/components/templates/campaigncue/PackTemplatePicker.tsx"),
].join("\n");
if (read("src/lib/campaigncue/pack-templates/catalog.ts").includes("@lib/firebase/firebaseClient")
  || read("src/lib/campaigncue/pack-templates/workspaceTemplates.ts").includes("@lib/firebase/firebaseClient")) {
  fail("CampaignCue template DALs must use the dedicated CampaignCue Firebase client");
}
if (implementation.includes("storeAssetTemplates")) {
  fail("CampaignCue pack template implementation must not use MenuList storeAssetTemplates");
}
if (implementation.includes("onSnapshot(")) {
  fail("CampaignCue pack template implementation must not use realtime listeners");
}
if (implementation.includes("httpsCallable(")) {
  fail("CampaignCue pack template browsing must not call Cloud Functions");
}
if (read("src/lib/campaigncue/pack-templates/applyTemplate.ts").includes("input.campaign.brief")
  || read("src/lib/campaigncue/pack-templates/applyTemplate.ts").includes("input.businessBrain.name")) {
  fail("Workspace template metadata must not persist stale campaign copy or business identity");
}
if (implementation.includes("]).catch(() => undefined);") || implementation.includes("deleteObject(ref(storage, path)).catch(() => undefined)")) {
  fail("CampaignCue workspace template Storage cleanup failures must be logged instead of silently swallowed");
}

console.log("CampaignCue pack template registry verification passed.");
