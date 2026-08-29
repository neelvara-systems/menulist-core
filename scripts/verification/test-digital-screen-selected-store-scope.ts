#!/usr/bin/env ts-node

import assert = require("node:assert/strict");
import { resolveDigitalScreenSelectedStoreScope } from "@lib/screen/screenManagementAccess";

const session = {
    sId: 99611,
    tId: 99601,
    user: {
        storeId: 99611,
        storeIds: [99611, 99612],
        stores: [
            { role: "owner", storeId: 99611 },
            { role: "owner", storeId: 99612 },
        ],
        tenantId: 99601,
    },
};

assert.deepEqual(
    resolveDigitalScreenSelectedStoreScope(session, undefined),
    { ok: true, scope: { storeId: "99611", tenantId: "99601" } },
    "an omitted store keeps the login-store compatibility scope",
);
assert.deepEqual(
    resolveDigitalScreenSelectedStoreScope(session, 99612),
    { ok: true, scope: { storeId: "99612", tenantId: "99601" } },
    "a mapped active store must resolve inside the authenticated tenant",
);
assert.deepEqual(
    resolveDigitalScreenSelectedStoreScope(session, 99999),
    { ok: false, reason: "forbidden" },
    "an unmapped store must fail closed",
);
assert.deepEqual(
    resolveDigitalScreenSelectedStoreScope(session, " 99612"),
    { ok: false, reason: "invalid_request" },
    "selected-store authority must never be expanded by trimming input",
);
assert.deepEqual(
    resolveDigitalScreenSelectedStoreScope({ ...session, storeId: 99612 }, 99612),
    { ok: false, reason: "not_onboarded" },
    "conflicting session aliases must fail closed",
);

process.stdout.write("Digital Screen selected-store scope tests passed.\n");
