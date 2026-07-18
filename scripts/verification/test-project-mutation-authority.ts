import assert from "node:assert/strict";
import {
    nextProjectLocalVersion,
    nextProjectMenuVersion,
    resolveStoredProjectMasterId,
} from "../../src/lib/menu/projectMutationAuthority";

const masterProjectId = "1-master-10";

assert.equal(resolveStoredProjectMasterId({}, {}), null);
assert.equal(resolveStoredProjectMasterId({ masterProjectId }, {}), masterProjectId);
assert.equal(
    resolveStoredProjectMasterId({ masterProjectId }, { masterProjectId }),
    masterProjectId,
);
assert.throws(
    () => resolveStoredProjectMasterId({ masterProjectId }, { masterProjectId: undefined }),
    /project_master_linkage_mutation_rejected/,
);
assert.throws(
    () => resolveStoredProjectMasterId({}, { masterProjectId }),
    /project_master_linkage_mutation_rejected/,
);
assert.throws(
    () => resolveStoredProjectMasterId({ masterProjectId: "bad" }, {}),
    /project_master_linkage_invalid/,
);

assert.equal(nextProjectMenuVersion(undefined), 1);
assert.equal(nextProjectMenuVersion(null), 1);
assert.equal(nextProjectMenuVersion(-1), 1);
assert.equal(nextProjectMenuVersion(0), 1);
assert.equal(nextProjectMenuVersion(41), 42);
assert.throws(
    () => nextProjectMenuVersion(Number.MAX_SAFE_INTEGER),
    /project_menu_version_exhausted/,
);
assert.equal(nextProjectMenuVersion(1.5), 1);

assert.equal(nextProjectLocalVersion(undefined), 1);
assert.equal(nextProjectLocalVersion(9), 10);
assert.throws(
    () => nextProjectLocalVersion(Number.MAX_SAFE_INTEGER),
    /project_local_version_exhausted/,
);

console.log("Project mutation authority tests passed.");
