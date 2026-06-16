#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

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
  "src/types/campaigncuePackTemplates.ts",
  "src/lib/validation/campaigncuePackTemplateSchemas.ts",
  "src/lib/campaigncue/pack-templates/category.ts",
  "src/lib/campaigncue/pack-templates/catalog.ts",
  "src/lib/campaigncue/pack-templates/workspaceTemplates.ts",
  "src/lib/campaigncue/pack-templates/applyTemplate.ts",
  "src/components/templates/campaigncue/PackTemplatePicker.tsx",
  "scripts/campaigncue/seed-platform-pack-templates.js",
  "scripts/campaigncue/platform-pack-template-seeds.json",
  "__docs__/campaigncue/campaign-pack-template-registry/campaign-pack-template-registry_firebase.md",
  "__docs__/campaigncue/campaign-pack-template-registry/campaign-pack-template-registry_impl.md",
  "__docs__/campaigncue/campaign-pack-template-registry/campaign-pack-template-registry_spec.md",
];

for (const file of requiredFiles) {
  if (!exists(file)) fail(`missing required file ${file}`);
}

const validCategories = ["service", "retail", "food", "professional", "creative", "health", "specialty"];
const seeds = JSON.parse(read("scripts/campaigncue/platform-pack-template-seeds.json"));
if (!Array.isArray(seeds) || seeds.length < validCategories.length) {
  fail("seed catalog must include at least one template per shared business category");
}
const categoriesInSeeds = new Set();
for (const seed of seeds) {
  if (!validCategories.includes(seed.businessCategory)) fail(`seed uses unsupported category ${seed.businessCategory}`);
  if (!seed.templateId || !seed.outputPackShape || !seed.decisionSeed) fail(`seed ${seed.templateId || "unknown"} is incomplete`);
  categoriesInSeeds.add(seed.businessCategory);
}
for (const category of validCategories) {
  if (!categoriesInSeeds.has(category)) fail(`seed catalog missing category ${category}`);
}

assertIncludes("src/config/features.ts", "ENABLE_CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY");
assertIncludes("src/constants/campaigncue/database.ts", "PLATFORM_PACK_TEMPLATES");
assertIncludes("src/constants/campaigncue/database.ts", "PACK_TEMPLATE_INDEXES");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "PackTemplatePicker");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "listCampaignCuePackTemplates");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "getCampaignCuePackTemplate");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "Campaign pack created from reusable base.");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "buildPackTemplateEditorContext");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "kind: \"pack_template\"");
assertIncludes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "Reusable campaign pack and editor layout saved.");
assertIncludes("src/lib/campaigncue/pack-templates/applyTemplate.ts", "editorDocument: input.editorDocument");
assertIncludes("src/lib/campaigncue/pack-templates/category.ts", "resolveBusinessCategory");
assertIncludes("src/lib/campaigncue/pack-templates/catalog.ts", "loadPlatformTemplates");
assertIncludes("src/lib/campaigncue/pack-templates/catalog.ts", "loadWorkspaceTemplates");
assertIncludes("src/lib/campaigncue/pack-templates/workspaceTemplates.ts", "MAX_WORKSPACE_TEMPLATES");
assertIncludes("firestore-campaigncue.rules", "campaigncuePlatformPackTemplates");
assertIncludes("firestore-campaigncue.rules", "packTemplateIndexes");
assertIncludes("storage-campaigncue.rules", "campaigncue/templates/platform");
assertIncludes("storage-campaigncue.rules", "campaigncue/templates/workspaces");
assertIncludes("__docs__/campaigncue/campaign-pack-template-registry/campaign-pack-template-registry_firebase.md", "1 Firestore read");

const implementation = [
  read("src/lib/campaigncue/pack-templates/catalog.ts"),
  read("src/lib/campaigncue/pack-templates/workspaceTemplates.ts"),
  read("src/components/templates/campaigncue/PackTemplatePicker.tsx"),
].join("\n");
if (implementation.includes("storeAssetTemplates")) {
  fail("CampaignCue pack template implementation must not use MenuList storeAssetTemplates");
}
if (implementation.includes("onSnapshot(")) {
  fail("CampaignCue pack template implementation must not use realtime listeners");
}
if (implementation.includes("httpsCallable(")) {
  fail("CampaignCue pack template browsing must not call Cloud Functions");
}

console.log("CampaignCue pack template registry verification passed.");
