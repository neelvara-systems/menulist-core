import assert from "node:assert/strict";

import {
    isOwnerBusinessAssistantThreadOwnedByScope,
    projectOwnerBusinessAssistantMessage,
} from "../../src/lib/ownerBusinessAssistant/threadResponse";

const scope = { sId: 202, tId: 101, userId: "owner-1" };
assert.equal(
    isOwnerBusinessAssistantThreadOwnedByScope(
        { sId: "202", tId: "101", userId: "owner-1" },
        scope,
    ),
    true,
);
[
    { sId: "203", tId: "101", userId: "owner-1" },
    { sId: "202", tId: "102", userId: "owner-1" },
    { sId: "202", tId: "101", userId: "owner-2" },
    { sId: "202", tId: "101" },
].forEach((thread) => {
    assert.equal(
        isOwnerBusinessAssistantThreadOwnedByScope(thread, scope),
        false,
        "thread access must require exact tenant, store, and actor ownership",
    );
});

const projected = projectOwnerBusinessAssistantMessage({
    id: "message-1",
    role: "assistant",
    content: "Your menu state is stable.",
    answerId: "answer-1",
    sourceFactIds: ["fact-1", "fact-2"],
    suggestedQuestions: [{
        id: "question-1",
        label: "Check visibility",
        question: "Which items are hidden?",
        intent: "visibility",
        domain: "menu",
        privatePrompt: "must-not-leak",
    }],
    createdAt: { seconds: 1_700_000_000 },
    privatePrompt: "must-not-leak",
    providerTrace: { secret: "must-not-leak" },
});

assert(projected);
assert.equal(projected.content, "Your menu state is stable.");
assert.equal(Object.prototype.hasOwnProperty.call(projected, "privatePrompt"), false);
assert.equal(Object.prototype.hasOwnProperty.call(projected, "providerTrace"), false);
assert.equal(
    Object.prototype.hasOwnProperty.call(projected.suggestedQuestions[0] || {}, "privatePrompt"),
    false,
);
assert.equal(projectOwnerBusinessAssistantMessage({ role: "assistant", content: "missing id" }), null);
assert.equal(
    projectOwnerBusinessAssistantMessage({
        id: "message-2",
        role: "system",
        content: "unsupported role",
    }),
    null,
);

console.log("Owner Business Assistant thread-response projection verification passed");
