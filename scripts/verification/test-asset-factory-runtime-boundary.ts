import assert from "node:assert/strict";
import path from "node:path";

import {
    fromRepoPath,
    getAssetBriefPath,
    REPO_ROOT,
} from "../../packages/asset-factory/scripts/lib/asset-runtime";

assert.equal(
    fromRepoPath("packages/asset-factory/manifest/assets.json"),
    path.join(REPO_ROOT, "packages/asset-factory/manifest/assets.json"),
);
assert.throws(
    () => fromRepoPath("../outside-repository.txt"),
    /must stay inside the repository/,
    "Asset Factory paths must not traverse above the repository root",
);
assert.throws(
    () => fromRepoPath(path.resolve(REPO_ROOT, "..", "outside-repository.txt")),
    /must stay inside the repository/,
    "absolute paths outside the repository must fail closed",
);

assert.equal(
    getAssetBriefPath("menulist-home-hero"),
    "packages/asset-factory/briefs/menulist-home-hero.md",
);
assert.throws(
    () => getAssetBriefPath("menulist-home-hero", "src/app/page.tsx"),
    /must match its slot ID/,
    "manifest data must not redirect brief writes into runtime source",
);
assert.throws(
    () => getAssetBriefPath("../../runtime-source"),
    /not path-safe/,
    "slot identifiers must not carry traversal syntax",
);

console.log("Asset Factory runtime boundary tests passed.");
