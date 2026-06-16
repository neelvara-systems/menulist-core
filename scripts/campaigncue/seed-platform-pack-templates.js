#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const APPLY = process.argv.includes("--apply");
const ROOT = path.resolve(__dirname, "..", "..");
const SEED_PATH = path.join(__dirname, "platform-pack-template-seeds.json");
const VALID_CATEGORIES = new Set(["service", "retail", "food", "professional", "creative", "health", "specialty"]);
const COLLECTION = "campaigncuePlatformPackTemplates";
const SCHEMA_VERSION = 1;
const MAX_DOC_BYTES = 750_000;

function payloadFor(seed) {
  return {
    decisionSeed: seed.decisionSeed,
    factSlots: seed.factSlots,
    outputPackShape: seed.outputPackShape,
    reuseRules: {
      allowCueLayersSource: true,
      allowSavedAssetSource: true,
      staleFactPolicy: "rehydrate_or_block",
    },
    schemaVersion: SCHEMA_VERSION,
    templateId: seed.templateId,
    trustChecks: seed.trustChecks,
  };
}

function summaryFor(seed, now) {
  return {
    businessCategory: seed.businessCategory,
    channels: seed.channels,
    createdAt: now,
    description: seed.description,
    eventTags: seed.eventTags,
    optionalFactTypes: seed.optionalFactTypes,
    outputTypes: seed.outputTypes,
    ownerGoals: seed.ownerGoals,
    payloadPath: `campaigncue/templates/platform/${seed.businessCategory}/${seed.templateId}/pack-template.json`,
    priority: seed.priority,
    qualityTier: "platform_curated",
    recipeIds: seed.recipeIds,
    requiredFactTypes: seed.requiredFactTypes,
    schemaVersion: SCHEMA_VERSION,
    searchTokens: Array.from(new Set([
      seed.title,
      seed.description,
      seed.businessCategory,
      ...seed.eventTags,
      ...seed.recipeIds,
      ...seed.ownerGoals,
      ...seed.channels,
      ...seed.outputTypes,
      ...seed.requiredFactTypes,
      ...seed.optionalFactTypes,
      ...seed.styleTags,
      ...seed.supportedBusinessTypes,
    ].map((value) => String(value).trim().toLowerCase()).filter(Boolean))).slice(0, 60),
    status: "active",
    styleTags: seed.styleTags,
    supportedBusinessTypes: seed.supportedBusinessTypes,
    templateId: seed.templateId,
    templateKind: "campaign_pack",
    templateType: "platform",
    title: seed.title,
    trustChecks: seed.trustChecks,
    updatedAt: now,
  };
}

function groupByCategory(seeds, now) {
  const grouped = new Map();
  for (const seed of seeds) {
    if (!VALID_CATEGORIES.has(seed.businessCategory)) {
      throw new Error(`Unsupported business category: ${seed.businessCategory}`);
    }
    if (!seed.templateId || !seed.title) {
      throw new Error(`Template seed is missing id/title in ${seed.businessCategory}`);
    }
    const list = grouped.get(seed.businessCategory) || [];
    list.push(summaryFor(seed, now));
    grouped.set(seed.businessCategory, list);
  }
  return grouped;
}

async function main() {
  const seeds = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));
  const now = Date.now();
  const grouped = groupByCategory(seeds, now);
  const updatedBy = process.env.CAMPAIGNCUE_TEMPLATE_SEED_ACTOR || "campaigncue-template-seed";

  const catalogs = Array.from(grouped.entries()).map(([businessCategory, data]) => ({
    businessCategory,
    catalogId: businessCategory,
    catalogStatus: "active",
    data: data.sort((left, right) => right.priority - left.priority),
    schemaVersion: SCHEMA_VERSION,
    updatedAt: now,
    updatedBy,
  }));

  for (const catalog of catalogs) {
    const bytes = Buffer.byteLength(JSON.stringify(catalog), "utf8");
    if (bytes > MAX_DOC_BYTES) {
      throw new Error(`${catalog.catalogId} catalog is ${bytes} bytes and exceeds ${MAX_DOC_BYTES}`);
    }
    console.log(`${APPLY ? "Apply" : "Dry-run"} ${COLLECTION}/${catalog.catalogId}: ${catalog.data.length} templates, ${bytes} bytes`);
  }

  const storageWrites = seeds.length;
  const writeSummary = APPLY
    ? `${catalogs.length} catalog doc writes and ${storageWrites} Storage payload uploads`
    : `would write ${catalogs.length} catalog docs and ${storageWrites} Storage payloads`;
  console.log(`Cost summary: ${writeSummary}.`);
  if (!APPLY) {
    console.log("No writes performed. Pass --apply after reviewing the cost summary.");
    return;
  }

  const admin = require("firebase-admin");
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: process.env.CAMPAIGNCUE_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT,
      storageBucket: process.env.CAMPAIGNCUE_FIREBASE_STORAGE_BUCKET,
    });
  }
  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  for (const seed of seeds) {
    const payloadPath = `campaigncue/templates/platform/${seed.businessCategory}/${seed.templateId}/pack-template.json`;
    await bucket.file(payloadPath).save(JSON.stringify(payloadFor(seed), null, 2), {
      contentType: "application/json",
      metadata: {
        cacheControl: "private, max-age=31536000, immutable",
      },
    });
  }

  for (const catalog of catalogs) {
    await db.collection(COLLECTION).doc(catalog.catalogId).set(catalog);
  }
  console.log("CampaignCue platform pack templates seeded.");
}

main().catch((error) => {
  console.error(error);
  console.error(`Repo root: ${ROOT}`);
  process.exit(1);
});
