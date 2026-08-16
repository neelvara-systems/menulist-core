import assert from "node:assert/strict";

process.env.GEMINI_AI_KEY = "menu-key-one";
process.env.GEMINI_AI_KEY_4 = "menu-extraction-provider-key";
process.env.MENULIST_GEMINI_TEXT_AI_KEY = "menu-extraction-key";
process.env.ANSWERLATTICE_GEMINI_AI_KEY = "answer-key-one";

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
    assert.equal(manager.getStats().currentKeyIndex, 0, `${label} retains its single primary slot`);
    assert.equal(manager.getClient(), firstRequestClient, `${label} retries through the same credential after bounded backoff`);

    manager.markKeySuccess(concurrentRequestClient);
    manager.markKeyRateLimited(concurrentRequestClient);

    assert.deepEqual(
        manager.getStats().keys.map((key) => key.totalRateLimits),
        [2],
        `${label} attributes delayed feedback to the client that served the request`,
    );
}

const extractionManager = new MenuListKeyManager([
    ['MENULIST_GEMINI_TEXT_AI_KEY'],
]);
assert.equal(extractionManager.totalKeys, 1, 'Menu extraction discovers only its dedicated text key');
assert.equal(
    new MenuListKeyManager().totalKeys,
    1,
    'The shared MenuList client discovers only its primary credential',
);

process.env.TEST_GEMINI_KEY_ONE = 'test-key-one';
process.env.TEST_GEMINI_KEY_TWO = 'test-key-two';
const configurableManager = new MenuListKeyManager([
    ['TEST_GEMINI_KEY_ONE'],
    ['TEST_GEMINI_KEY_TWO'],
]);
assert.equal(configurableManager.totalKeys, 2, 'The generic manager remains configurable for separately governed products');

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
