#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { readSharedBusinessCategories } = require("./read-shared-business-categories");

const APPLY = process.argv.includes("--apply");
const ROOT = path.resolve(__dirname, "..", "..");
const SEED_PATH = path.join(__dirname, "platform-pack-template-seeds.json");
const VALID_CATEGORIES = new Set(readSharedBusinessCategories(ROOT));
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

function summaryFor(seed, now, payloadPath) {
  return {
    businessCategory: seed.businessCategory,
    channels: seed.channels,
    createdAt: now,
    description: seed.description,
    eventTags: seed.eventTags,
    optionalFactTypes: seed.optionalFactTypes,
    outputTypes: seed.outputTypes,
    ownerGoals: seed.ownerGoals,
    payloadPath,
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

function buildSeedArtifact(seed) {
  const payloadJson = JSON.stringify(payloadFor(seed), null, 2);
  const contentHash = crypto.createHash("sha256").update(payloadJson).digest("hex").slice(0, 24);
  return {
    payloadJson,
    payloadPath: `campaigncue/templates/platform/${seed.businessCategory}/${seed.templateId}/pack-template-${contentHash}.json`,
    seed,
  };
}

function assertSeedFactSlotContract(seed) {
  if (!Array.isArray(seed.factSlots) || !Array.isArray(seed.requiredFactTypes) || !Array.isArray(seed.optionalFactTypes)) {
    throw new Error(`Template seed ${seed.templateId || "unknown"} has an invalid fact-slot contract`);
  }
  const slotTypes = seed.factSlots.map((slot) => String(slot?.type || "").trim());
  if (slotTypes.some((type) => !/^[a-zA-Z0-9_-]{1,100}$/.test(type)) || new Set(slotTypes).size !== slotTypes.length) {
    throw new Error(`Template seed ${seed.templateId || "unknown"} has invalid or duplicate fact slots`);
  }
  const requiredSlots = seed.factSlots.filter((slot) => slot.required === true).map((slot) => slot.type).sort();
  const optionalSlots = seed.factSlots.filter((slot) => slot.required === false).map((slot) => slot.type).sort();
  const requiredTypes = [...new Set(seed.requiredFactTypes)].sort();
  const optionalTypes = [...new Set(seed.optionalFactTypes)].sort();
  if (JSON.stringify(requiredSlots) !== JSON.stringify(requiredTypes)
    || JSON.stringify(optionalSlots) !== JSON.stringify(optionalTypes)) {
    throw new Error(`Template seed ${seed.templateId || "unknown"} fact-slot metadata does not match its payload`);
  }
}

function groupByCategory(artifacts, now) {
  const grouped = new Map();
  const identities = new Set();
  for (const artifact of artifacts) {
    const { seed } = artifact;
    if (!VALID_CATEGORIES.has(seed.businessCategory)) {
      throw new Error(`Unsupported business category: ${seed.businessCategory}`);
    }
    if (!seed.templateId || !seed.title) {
      throw new Error(`Template seed is missing id/title in ${seed.businessCategory}`);
    }
    assertSeedFactSlotContract(seed);
    const identity = `${seed.businessCategory}:${seed.templateId}`;
    if (identities.has(identity)) throw new Error(`Duplicate template seed: ${identity}`);
    identities.add(identity);
    const list = grouped.get(seed.businessCategory) || [];
    list.push(summaryFor(seed, now, artifact.payloadPath));
    if (list.length > 80) throw new Error(`${seed.businessCategory} exceeds the 80-template catalog limit`);
    grouped.set(seed.businessCategory, list);
  }
  return grouped;
}

function isStoragePreconditionFailure(error) {
  return Boolean(error) && typeof error === "object" && Number(error.code) === 412;
}

async function assertExistingPayloadMatches(file, payloadJson) {
  const [metadata] = await file.getMetadata();
  const expectedSize = Buffer.byteLength(payloadJson, "utf8");
  const expectedMd5 = crypto.createHash("md5").update(payloadJson).digest("base64");
  if (
    Number(metadata.size) !== expectedSize
    || metadata.md5Hash !== expectedMd5
    || metadata.contentType !== "application/json"
    || metadata.cacheControl !== "private, max-age=31536000, immutable"
  ) {
    throw new Error(`Existing immutable payload does not match ${file.name}`);
  }
}

async function main() {
  const seeds = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));
  if (!Array.isArray(seeds)) throw new Error("Platform template seed file must contain an array");
  const artifacts = seeds.map(buildSeedArtifact);
  const now = Date.now();
  const grouped = groupByCategory(artifacts, now);
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

  const storageWrites = artifacts.length;
  const writeSummary = APPLY
    ? `${catalogs.length} catalog doc writes and ${storageWrites} Storage payload uploads`
    : `would write ${catalogs.length} catalog docs and ${storageWrites} Storage payloads`;
  console.log(`Cost summary: ${writeSummary}.`);
  if (!APPLY) {
    console.log("No writes performed. Pass --apply after reviewing the cost summary.");
    return;
  }

  const projectId = String(process.env.CAMPAIGNCUE_FIREBASE_PROJECT_ID || "").trim();
  const storageBucket = String(process.env.CAMPAIGNCUE_FIREBASE_STORAGE_BUCKET || "").trim();
  const databaseId = String(process.env.CAMPAIGNCUE_FIRESTORE_DATABASE_ID || "").trim();
  if (!projectId || !storageBucket) {
    throw new Error("CAMPAIGNCUE_FIREBASE_PROJECT_ID and CAMPAIGNCUE_FIREBASE_STORAGE_BUCKET are required for --apply");
  }

  const admin = require("firebase-admin");
  const { getFirestore } = require("firebase-admin/firestore");
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId,
      storageBucket,
    });
  }
  const app = admin.app();
  if (app.options.projectId !== projectId || app.options.storageBucket !== storageBucket) {
    throw new Error("CampaignCue Firebase Admin target does not match the explicit seed target");
  }
  const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  const bucket = admin.storage().bucket();

  for (const artifact of artifacts) {
    const file = bucket.file(artifact.payloadPath);
    try {
      await file.save(artifact.payloadJson, {
        contentType: "application/json",
        metadata: {
          cacheControl: "private, max-age=31536000, immutable",
        },
        preconditionOpts: { ifGenerationMatch: 0 },
      });
    } catch (error) {
      if (!isStoragePreconditionFailure(error)) throw error;
      await assertExistingPayloadMatches(file, artifact.payloadJson);
    }
  }

  const batch = db.batch();
  catalogs.forEach((catalog) => batch.set(db.collection(COLLECTION).doc(catalog.catalogId), catalog));
  await batch.commit();
  console.log("CampaignCue platform pack templates seeded.");
}

main().catch((error) => {
  console.error(error);
  console.error(`Repo root: ${ROOT}`);
  process.exit(1);
});
