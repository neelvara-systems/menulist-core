import assert from "node:assert/strict";
import {
    getAnswerlatticeKnowledgeIntakeScopeKey,
    isAnswerlatticeKnowledgeIntakeScopeCurrent,
} from "../../src/hooks/answerlattice/knowledgeIntakeScopeState";

assert.equal(getAnswerlatticeKnowledgeIntakeScopeKey(12, 34), "12:34");
for (const [tenantId, storeId] of [
    [0, 34],
    [-1, 34],
    [1.5, 34],
    [12, Number.NaN],
    [12, Number.MAX_SAFE_INTEGER + 1],
    ["12", 34],
]) {
    assert.equal(getAnswerlatticeKnowledgeIntakeScopeKey(tenantId, storeId), null);
}
assert.equal(isAnswerlatticeKnowledgeIntakeScopeCurrent("12:34", "12:34"), true);
assert.equal(isAnswerlatticeKnowledgeIntakeScopeCurrent("12:34", "12:35"), false);
assert.equal(isAnswerlatticeKnowledgeIntakeScopeCurrent(null, null), false);

console.log("Answerlattice Knowledge Intake scope-state tests passed");
