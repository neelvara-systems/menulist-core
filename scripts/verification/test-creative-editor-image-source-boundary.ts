import assert from "node:assert/strict";

import {
    isCreativeEditorRasterDataUrl,
    isSafeCreativeEditorNetworkImageSource,
} from "../../src/modules/creative-editor/imageSourceBoundary";

const origin = "https://app.menulist.ai";

assert.equal(isSafeCreativeEditorNetworkImageSource("https://cdn.example.com/menu.webp", origin), true);
assert.equal(isSafeCreativeEditorNetworkImageSource("http://cdn.example.com/menu.jpg?version=2", origin), true);
assert.equal(isSafeCreativeEditorNetworkImageSource("/assets/menu.png", origin), true);
assert.equal(isSafeCreativeEditorNetworkImageSource("https://cdn.example.com/menu.svg", origin), false);
assert.equal(isSafeCreativeEditorNetworkImageSource("blob:https://app.menulist.ai/temporary", origin), false);
assert.equal(isSafeCreativeEditorNetworkImageSource("ftp://cdn.example.com/menu.png", origin), false);
assert.equal(isSafeCreativeEditorNetworkImageSource("javascript:alert(1)", origin), false);
assert.equal(isSafeCreativeEditorNetworkImageSource("data:image/png;base64,iVBORw0KGgo=", origin), false);
assert.equal(isCreativeEditorRasterDataUrl("data:image/png;base64,iVBORw0KGgo="), true);
assert.equal(isCreativeEditorRasterDataUrl("data:image/svg+xml;base64,PHN2Zz4="), false);

console.log("Creative Editor image-source boundary tests passed.");
