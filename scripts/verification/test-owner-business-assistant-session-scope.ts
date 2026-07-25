import assert from "node:assert/strict";

import { resolveOwnerBusinessAssistantSessionScope } from "../../src/lib/ownerBusinessAssistant/server/sessionScope";

assert.deepEqual(
    resolveOwnerBusinessAssistantSessionScope({
        sId: "202",
        tId: "101",
        uId: "owner-1",
        user: { id: "owner-1", storeId: 202, tenantId: 101 },
    }),
    { sId: 202, tId: 101, userId: "owner-1" },
);

[
    {
        sId: "202",
        tId: "101",
        uId: "owner-1",
        user: { id: "owner-2", storeId: "202", tenantId: "101" },
    },
    {
        sId: "202",
        tId: "101",
        uId: "owner-1",
        user: { id: "owner-1", storeId: "203", tenantId: "101" },
    },
    {
        sId: "202",
        tId: "101",
        uId: "owner-1",
        user: { id: "owner-1", storeId: "202", tenantId: "102" },
    },
    {
        sId: " 202",
        tId: "101",
        uId: "owner-1",
    },
    {
        sId: "202",
        tId: "101",
        uId: " owner-1",
    },
].forEach((session) => {
    assert.equal(
        resolveOwnerBusinessAssistantSessionScope(session),
        null,
        "contradictory or malformed actor/tenant/store scope must fail closed",
    );
});

console.log("Owner Business Assistant session-scope behavior verification passed");
