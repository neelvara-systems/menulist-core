const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function assertCheck(condition, message) {
  if (!condition) throw new Error(message);
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
const databaseConstants = read("src/constants/database.ts");
const firestoreRules = read("firestore.rules");
const firestoreIndexes = read("firestore.indexes.json");
const storageRules = read("storage.rules");
const packageJson = JSON.parse(read("package.json"));
const readme = read("__docs__/surface-os/README.md");
const firebaseDoc = read("__docs__/surface-os/surface-os_firebase.md");
const websiteDoc = read("__docs__/surface-os/surface-os_website.md");

assertCheck(productIds.includes("SURFACE_OS: 'SF'"), "SurfaceOS reserves only the SF product code");
assertCheck(
  /id: 'surfaceos',[\s\S]*?enabled: false, \/\/ placeholder — not yet built/.test(productDomains),
  "SurfaceOS product-domain placeholder stays disabled",
);
assertCheck(!deploymentTargets.includes("| 'surfaceos'"), "SurfaceOS has no active deployment target type");
assertCheck(!/^\s*surfaceos:\s*\{/m.test(deploymentTargets), "SurfaceOS has no active deployment target");
assertCheck(!featureFlags.includes("ENABLE_SURFACEOS"), "SurfaceOS has no executable feature flag");
assertCheck(!databaseConstants.includes("SURFACEOS"), "SurfaceOS has no database collection constant");
assertCheck(!firestoreRules.toLowerCase().includes("surfaceos"), "Firestore rules contain no SurfaceOS runtime namespace");
assertCheck(!firestoreIndexes.toLowerCase().includes("surfaceos"), "Firestore indexes contain no SurfaceOS runtime");
assertCheck(!storageRules.toLowerCase().includes("surfaceos"), "Storage rules contain no SurfaceOS runtime");

const forbiddenPaths = [
  "src/app/sites/surfaceos",
  "src/app/surfaceos",
  "src/app/api/surfaceos",
  "src/components/surfaceos",
  "src/constants/surfaceos",
  "src/database/surfaceos",
  "src/hooks/surfaceos",
  "src/lib/surfaceos",
  "src/lib/firebase/surfaceosConfig.ts",
  "src/lib/firebase/surfaceosFirebaseClient.ts",
  "src/lib/firebase/surfaceosFirebaseAdmin.ts",
  "src/types/surfaceos.ts",
  "firebase-surfaceos.json",
  "firestore-surfaceos.rules",
  "firestore-surfaceos.indexes.json",
  "storage-surfaceos.rules",
  "functions-surfaceos",
];
for (const relativePath of forbiddenPaths) {
  assertCheck(!fs.existsSync(path.join(ROOT, relativePath)), `Planning-only SurfaceOS path is absent: ${relativePath}`);
}

const allowedRuntimeReferences = new Set([
  "src/constants/product.ts",
  "src/constants/productDomains.ts",
  "src/constants/urls.ts",
  "src/lib/multiTenant/domainResolver.ts",
  "src/proxy.ts",
]);
const unexpectedRuntimeReferences = [
  ...listFiles("src"),
  ...listFiles("functions/src"),
  ...listFiles("functions-answerlattice/src"),
  ...listFiles("functions-signaldesk/src"),
].filter((relativePath) => {
  if (allowedRuntimeReferences.has(relativePath)) return false;
  if (!/\.(?:js|jsx|ts|tsx|json|rules)$/.test(relativePath)) return false;
  return read(relativePath).toLowerCase().includes("surfaceos");
});
assertCheck(
  unexpectedRuntimeReferences.length === 0,
  `SurfaceOS leaked into executable runtime: ${unexpectedRuntimeReferences.join(", ")}`,
);

const scripts = Object.keys(packageJson.scripts || {}).filter((name) => name.toLowerCase().includes("surfaceos"));
assertCheck(
  scripts.length === 1 && scripts[0] === "verify:surfaceos-boundary",
  "SurfaceOS exposes only its planning-boundary verifier",
);
assertCheck(
  ![read(".env.staging.example"), read(".env.production.example")]
    .some((text) => /(?:^|\n)(?:NEXT_PUBLIC_)?SURFACEOS_/m.test(text)),
  "Tracked environment templates contain no SurfaceOS runtime keys",
);
assertCheck(
  readme.includes("Stage 1 planning only. No implementation is approved or active.")
    && readme.includes("Until then, the correct runtime and Firebase cost are both zero."),
  "SurfaceOS documentation states the planning-only runtime truth",
);
assertCheck(
  firebaseDoc.includes("No SurfaceOS Firebase resources exist.")
    && firebaseDoc.includes("Current runtime cost:** Zero."),
  "SurfaceOS Firebase documentation states zero current runtime cost",
);
assertCheck(
  websiteDoc.includes("Status:** Publication blocked")
    && websiteDoc.includes("src/app/sites/surfaceos"),
  "SurfaceOS website documentation keeps publication blocked",
);
assertCheck(
  fs.existsSync(path.join(ROOT, "__docs__/surface-os/_archive/product-strategy-2026-03-06.md")),
  "Historical SurfaceOS strategy remains archived",
);

console.log(`SurfaceOS planning boundary verified (${checks.length} checks).`);
