import assert from "node:assert/strict";
import {
    assertCampaignCueCueLayerImageLimits,
    readCampaignCueCueLayerImageMetadata,
} from "../../src/lib/campaigncue/cue-layers/imageMetadata";

const png = Buffer.alloc(45);
Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
png.writeUInt32BE(13, 8);
png.write("IHDR", 12, "ascii");
png.writeUInt32BE(1200, 16);
png.writeUInt32BE(800, 20);
png.writeUInt32BE(0, 33);
png.write("IEND", 37, "ascii");
assert.deepEqual(readCampaignCueCueLayerImageMetadata(png), {
    height: 800,
    mimeType: "image/png",
    width: 1200,
});

const jpeg = Buffer.from([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x07, 0x08, 0x02, 0x58, 0x03, 0x20,
    0xff, 0xd9,
]);
assert.deepEqual(readCampaignCueCueLayerImageMetadata(jpeg), {
    height: 600,
    mimeType: "image/jpeg",
    width: 800,
});

const webp = Buffer.alloc(30);
webp.write("RIFF", 0, "ascii");
webp.writeUInt32LE(22, 4);
webp.write("WEBP", 8, "ascii");
webp.write("VP8X", 12, "ascii");
webp.writeUInt32LE(10, 16);
webp.writeUIntLE(639, 24, 3);
webp.writeUIntLE(479, 27, 3);
assert.deepEqual(readCampaignCueCueLayerImageMetadata(webp), {
    height: 480,
    mimeType: "image/webp",
    width: 640,
});

const webpLossless = Buffer.alloc(26);
webpLossless.write("RIFF", 0, "ascii");
webpLossless.writeUInt32LE(18, 4);
webpLossless.write("WEBP", 8, "ascii");
webpLossless.write("VP8L", 12, "ascii");
webpLossless.writeUInt32LE(5, 16);
webpLossless[20] = 0x2f;
webpLossless.writeUInt32LE((479 << 14) | 639, 21);
assert.deepEqual(readCampaignCueCueLayerImageMetadata(webpLossless), {
    height: 480,
    mimeType: "image/webp",
    width: 640,
});

const webpLossy = Buffer.alloc(30);
webpLossy.write("RIFF", 0, "ascii");
webpLossy.writeUInt32LE(22, 4);
webpLossy.write("WEBP", 8, "ascii");
webpLossy.write("VP8 ", 12, "ascii");
webpLossy.writeUInt32LE(10, 16);
Buffer.from([0x9d, 0x01, 0x2a]).copy(webpLossy, 23);
webpLossy.writeUInt16LE(640, 26);
webpLossy.writeUInt16LE(480, 28);
assert.deepEqual(readCampaignCueCueLayerImageMetadata(webpLossy), {
    height: 480,
    mimeType: "image/webp",
    width: 640,
});

for (const malformed of [
    Buffer.alloc(0),
    Buffer.from("not-an-image"),
    png.subarray(0, 33),
    jpeg.subarray(0, 12),
    Buffer.from(webp).subarray(0, 24),
    Buffer.concat([png, Buffer.from("trailing")]),
    Buffer.concat([jpeg, Buffer.from("trailing")]),
    Buffer.concat([webp, Buffer.from("trailing")]),
]) {
    assert.throws(() => readCampaignCueCueLayerImageMetadata(malformed), /invalid or unsupported/);
}

assert.throws(
    () => assertCampaignCueCueLayerImageLimits({ height: 4096, mimeType: "image/png", width: 4096 }, { maxLongEdge: 4096, maxPixels: 8_000_000 }),
    /pixel count/,
);
assert.throws(
    () => assertCampaignCueCueLayerImageLimits({ height: 100, mimeType: "image/png", width: 4097 }, { maxLongEdge: 4096 }),
    /dimensions/,
);

console.log("CampaignCue CueLayers image metadata tests passed.");
