import assert from "node:assert/strict";

import { parseWebStorageRecord } from "../../src/utils/webstorage";

assert.deepEqual(parseWebStorageRecord(null), {});
assert.deepEqual(parseWebStorageRecord("undefined"), {});
assert.deepEqual(parseWebStorageRecord("{"), {});
assert.deepEqual(parseWebStorageRecord("null"), {});
assert.deepEqual(parseWebStorageRecord("[]"), {});
assert.deepEqual(parseWebStorageRecord('{"enabled":false,"count":0,"label":""}'), {
  enabled: false,
  count: 0,
  label: "",
});

console.log("webstorage boundary tests passed");
