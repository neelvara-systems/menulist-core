import assert from "node:assert/strict";

process.env.GEMINI_AI_KEY = "menu-key-one";
process.env.GEMINI_AI_KEY_2 = "menu-key-two";
process.env.ANSWERLATTICE_GEMINI_AI_KEY = "answer-key-one";
process.env.ANSWERLATTICE_GEMINI_AI_KEY_2 = "answer-key-two";

type KeyManagerConstructor = new () => {
    getClient(): object;
    markKeyRateLimited(client: object): void;
    markKeySuccess(client: object): void;
    getStats(): {
        currentKeyIndex: number;
        keys: Array<{ totalRateLimits: number }>;
    };
};

const { KeyManager: MenuListKeyManager } = require("../../functions/src/ai/keyManager") as {
    KeyManager: KeyManagerConstructor;
};
const { KeyManager: AnswerlatticeKeyManager } = require("../../functions-answerlattice/src/ai/keyManager") as {
    KeyManager: KeyManagerConstructor;
};

for (const [label, Manager] of [
    ["MenuList", MenuListKeyManager],
    ["Answerlattice", AnswerlatticeKeyManager],
] as const) {
    const manager = new Manager();
    const firstRequestClient = manager.getClient();
    const concurrentRequestClient = manager.getClient();

    manager.markKeyRateLimited(firstRequestClient);
    assert.equal(manager.getStats().currentKeyIndex, 1, `${label} rotates after the first key is limited`);

    const secondKeyClient = manager.getClient();
    assert.notEqual(secondKeyClient, firstRequestClient, `${label} selects the second key`);

    manager.markKeySuccess(concurrentRequestClient);
    manager.markKeyRateLimited(concurrentRequestClient);

    assert.deepEqual(
        manager.getStats().keys.map((key) => key.totalRateLimits),
        [2, 0],
        `${label} attributes delayed feedback to the client that served the request`,
    );
}

console.log("Functions AI key attribution boundary passed.");
