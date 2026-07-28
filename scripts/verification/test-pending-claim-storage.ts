import assert from "node:assert/strict";

import {
  PENDING_CLAIM_TOKEN_STORAGE_KEY,
  clearPendingClaimToken,
  readPendingClaimToken,
  writePendingClaimToken,
} from "../../src/lib/auth/pendingClaimStorage";

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  removeItem: (key: string) => {
    values.delete(key);
  },
  setItem: (key: string, value: string) => {
    values.set(key, value);
  },
};

const token = "abcdefghijklmnopqrstuvwxyz0123456789_-";
assert.equal(writePendingClaimToken(storage, token), true);
assert.equal(readPendingClaimToken(storage), token);

assert.equal(writePendingClaimToken(storage, "short"), false);
values.set(PENDING_CLAIM_TOKEN_STORAGE_KEY, " invalid ");
assert.equal(readPendingClaimToken(storage), null);
assert.equal(values.has(PENDING_CLAIM_TOKEN_STORAGE_KEY), false);

writePendingClaimToken(storage, token);
clearPendingClaimToken(storage);
assert.equal(readPendingClaimToken(storage), null);

console.log("pending claim storage tests passed");
