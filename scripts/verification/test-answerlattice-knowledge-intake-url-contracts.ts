import assert from "node:assert/strict";
import { isAnswerlatticeKnowledgeIntakeHttpUrl } from "../../src/lib/answerlattice/knowledgeIntakeUrlContracts";

assert.equal(isAnswerlatticeKnowledgeIntakeHttpUrl("https://docs.example.com/help"), true);
assert.equal(isAnswerlatticeKnowledgeIntakeHttpUrl("http://example.com"), true);
assert.equal(isAnswerlatticeKnowledgeIntakeHttpUrl("ftp://example.com/file"), false);
assert.equal(isAnswerlatticeKnowledgeIntakeHttpUrl("javascript:alert(1)"), false);
assert.equal(isAnswerlatticeKnowledgeIntakeHttpUrl("not a url"), false);
assert.equal(isAnswerlatticeKnowledgeIntakeHttpUrl(""), false);

console.log("Answerlattice Knowledge Intake URL contract tests passed");
