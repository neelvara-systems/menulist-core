import assert from "node:assert/strict";

process.env.GEMINI_AI_KEY = "menu-key-one";
process.env.GEMINI_AI_KEY_2 = "menu-key-two";
process.env.GEMINI_AI_KEY_4 = "menu-extraction-provider-key";
process.env.MENULIST_GEMINI_TEXT_AI_KEY = "menu-extraction-key";
process.env.ANSWERLATTICE_GEMINI_AI_KEY = "answer-key-one";
process.env.ANSWERLATTICE_GEMINI_AI_KEY_2 = "answer-key-two";

type KeyManagerConstructor = new () => {
    readonly totalKeys: number;
    getClient(): object;
    markKeyRateLimited(client: object): void;
    markKeySuccess(client: object): void;
    getStats(): {
        currentKeyIndex: number;
        keys: Array<{ totalRateLimits: number }>;
    };
};

type ConfigurableKeyManagerConstructor = new (
    candidates?: readonly (readonly string[])[],
) => InstanceType<KeyManagerConstructor>;

const { KeyManager: MenuListKeyManager } = require("../../functions/src/ai/keyManager") as {
    KeyManager: ConfigurableKeyManagerConstructor;
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

const extractionManager = new MenuListKeyManager([
    ['MENULIST_GEMINI_TEXT_AI_KEY'],
]);
assert.equal(extractionManager.totalKeys, 1, 'Menu extraction discovers only its dedicated text key');
assert.equal(
    new MenuListKeyManager().totalKeys,
    2,
    'The shared MenuList pool ignores provider slot 4 reserved for menu extraction',
);

delete process.env.MENULIST_GEMINI_TEXT_AI_KEY;
const missingExtractionManager = new MenuListKeyManager([
    ['MENULIST_GEMINI_TEXT_AI_KEY'],
]);
assert.equal(
    missingExtractionManager.totalKeys,
    0,
    'Menu extraction never falls back to the configured shared MenuList key pool',
);
assert.throws(
    () => missingExtractionManager.getClient(),
    { code: 'AI_PROVIDER_CONFIG_MISSING' },
    'Missing extraction credentials fail before a provider call',
);

console.log("Functions AI key attribution boundary passed.");
