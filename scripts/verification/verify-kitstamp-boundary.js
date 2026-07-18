const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function assertCheck(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
  checks.push(message);
}

function listFiles(relativeRoot) {
  const absoluteRoot = path.join(ROOT, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  return fs.readdirSync(absoluteRoot, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeRoot, entry.name);
    return entry.isDirectory() ? listFiles(relativePath) : [relativePath];
  });
}

const productIds = read("src/constants/product.ts");
const productDomains = read("src/constants/productDomains.ts");
const deploymentTargets = read("src/constants/deploymentTargets.ts");
const featureFlags = read("src/config/features.ts");
const firestoreRules = read("firestore.rules");
const firestoreIndexes = read("firestore.indexes.json");
const storageRules = read("storage.rules");
const packageJson = JSON.parse(read("package.json"));
const readme = read("__docs__/kitstamp/README.md");
const firebaseDoc = read("__docs__/kitstamp/kitstamp_firebase.md");
const websiteDoc = read("__docs__/kitstamp/kitstamp_website.md");

assertCheck(productIds.includes("KITSTAMP: 'KS'"), "KitStamp reserves only the KS product code");
assertCheck(
  /id: 'kitstamp',[\s\S]*?enabled: false, \/\/ placeholder — not yet built/.test(productDomains),
  "KitStamp product-domain placeholder stays disabled",
);
assertCheck(!deploymentTargets.includes("| 'kitstamp'"), "KitStamp has no active deployment target type");
assertCheck(!/^\s*kitstamp:\s*\{/m.test(deploymentTargets), "KitStamp has no active deployment target");
assertCheck(!featureFlags.includes("ENABLE_KITSTAMP"), "KitStamp has no executable feature flag");
assertCheck(!firestoreRules.toLowerCase().includes("kitstamp"), "MenuList Firestore rules contain no KitStamp runtime");
assertCheck(!firestoreIndexes.toLowerCase().includes("kitstamp"), "MenuList Firestore indexes contain no KitStamp runtime");
assertCheck(!storageRules.toLowerCase().includes("kitstamp"), "MenuList Storage rules contain no KitStamp runtime");

const forbiddenPaths = [
  "src/app/sites/kitstamp",
  "src/app/kitstamp",
  "src/app/api/kitstamp",
  "src/components/kitstamp",
  "src/constants/kitstamp",
  "src/database/kitstamp",
  "src/hooks/kitstamp",
  "src/lib/kitstamp",
  "src/lib/firebase/kitstampConfig.ts",
  "src/lib/firebase/kitstampFirebaseClient.ts",
  "src/lib/firebase/kitstampFirebaseAdmin.ts",
  "src/types/kitstamp.ts",
  "firebase-kitstamp.json",
  "firestore-kitstamp.rules",
  "firestore-kitstamp.indexes.json",
  "storage-kitstamp.rules",
  "functions-kitstamp",
];
for (const relativePath of forbiddenPaths) {
  assertCheck(!fs.existsSync(path.join(ROOT, relativePath)), `Planning-only KitStamp path is absent: ${relativePath}`);
}

const allowedRuntimeReferences = new Set([
  "src/constants/product.ts",
  "src/constants/productDomains.ts",
  "src/constants/urls.ts",
  "src/lib/multiTenant/domainResolver.ts",
]);
const unexpectedRuntimeReferences = [
  ...listFiles("src"),
  ...listFiles("functions/src"),
  ...listFiles("functions-answerlattice/src"),
  ...listFiles("functions-signaldesk/src"),
].filter((relativePath) => {
  if (allowedRuntimeReferences.has(relativePath)) return false;
  if (!/\.(?:js|jsx|ts|tsx|json|rules)$/.test(relativePath)) return false;
  return read(relativePath).toLowerCase().includes("kitstamp");
});
assertCheck(
  unexpectedRuntimeReferences.length === 0,
  `KitStamp leaked into executable runtime: ${unexpectedRuntimeReferences.join(", ")}`,
);

const kitStampScripts = Object.keys(packageJson.scripts || {}).filter((name) => name.toLowerCase().includes("kitstamp"));
assertCheck(
  kitStampScripts.length === 1 && kitStampScripts[0] === "verify:kitstamp-boundary",
  "KitStamp exposes only its planning-boundary verifier",
);
assertCheck(
  ![read(".env.staging.example"), read(".env.production.example")]
    .some((text) => /(?:^|\n)(?:NEXT_PUBLIC_)?KITSTAMP_/m.test(text)),
  "Tracked environment templates contain no KitStamp runtime keys",
);
assertCheck(
  readme.includes("Stage 1 planning docs only. Implementation not started.")
    && readme.includes("Product routes and Firebase targets are not active."),
  "KitStamp documentation states the planning-only runtime truth",
);
assertCheck(
  firebaseDoc.includes("Runtime status:** No Firebase resources exist for KitStamp yet.")
    && firebaseDoc.includes("Current runtime cost is zero."),
  "KitStamp Firebase documentation states zero current runtime cost",
);
assertCheck(
  websiteDoc.includes("Do not publish until product routes and implementation exist."),
  "KitStamp candidate website copy remains publication-blocked",
);

console.log(`KitStamp planning boundary verified (${checks.length} checks).`);
