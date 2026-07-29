import assert from "node:assert/strict";

import {
    normalizeProjectDocumentScope,
    projectDocumentMatchesScope,
} from "../../src/lib/menu/projectDocumentScope";

const scope = { tId: 10, sId: 20, projectId: "10-default-20" };
assert.deepEqual(normalizeProjectDocumentScope(scope), {
    tId: "10",
    sId: "20",
    projectId: "10-default-20",
});
assert.equal(projectDocumentMatchesScope({}, scope), true, "path identity supports old docs without embedded scope");
assert.equal(projectDocumentMatchesScope({ tId: 10, sId: 20, projectId: "10-default-20" }, scope), true);
assert.equal(projectDocumentMatchesScope({ tenantId: "10", storeId: "20" }, scope), true);
assert.equal(projectDocumentMatchesScope({ tId: 10, sId: 21 }, scope), false);
assert.equal(projectDocumentMatchesScope({ tId: 11, sId: 20 }, scope), false);
assert.equal(projectDocumentMatchesScope({ projectId: "10-other-20" }, scope), false);
assert.equal(projectDocumentMatchesScope({ tId: "10/other", sId: 20 }, scope), false);
assert.equal(projectDocumentMatchesScope({ tenantId: null, storeId: 20 }, scope), false);
assert.equal(projectDocumentMatchesScope({ tId: "010", sId: 20 }, scope), false);
assert.equal(projectDocumentMatchesScope(Object.assign(
    Object.create({ tId: 11 }),
    { sId: 20 },
), scope), true, "inherited identity is not persisted Firestore scope metadata");
const hostileProjectScope = { tId: 10, sId: 20 } as Record<string, unknown>;
Object.defineProperty(hostileProjectScope, "projectId", {
    enumerable: true,
    get() {
        throw new Error("embedded project identity getter must remain contained");
    },
});
assert.equal(projectDocumentMatchesScope(hostileProjectScope, scope), false);
assert.equal(projectDocumentMatchesScope([], scope), false);
assert.equal(normalizeProjectDocumentScope({ ...scope, projectId: " 10-default-20" }), null);
assert.equal(normalizeProjectDocumentScope({ ...scope, projectId: "10/default/20" }), null);
assert.equal(normalizeProjectDocumentScope({ ...scope, tId: Number.NaN }), null);
assert.equal(normalizeProjectDocumentScope({ ...scope, sId: 0 }), null);
assert.equal(normalizeProjectDocumentScope({ ...scope, tId: "0" }), null);
assert.equal(normalizeProjectDocumentScope({ ...scope, sId: "020" }), null);

console.log("Project document scope tests passed.");
