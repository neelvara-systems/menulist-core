import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createCanvas,
  Image as CanvasImage,
  Path2D as CanvasPath2D,
} from "@napi-rs/canvas";
import JSZip from "jszip";
import sharp from "sharp";

const root = process.cwd();

function LocalAssetImage(): CanvasImage {
  const image = new CanvasImage();
  return new Proxy(image, {
    set(target, property, value) {
      const nextValue =
        property === "src" &&
        typeof value === "string" &&
        value.startsWith("/images/")
          ? path.join(root, "public", value.slice(1))
          : value;
      return Reflect.set(target, property, nextValue, target);
    },
  });
}

class LocalFileReader {
  error: Error | null = null;
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;
  result: string | null = null;

  readAsDataURL(blob: Blob): void {
    void blob
      .arrayBuffer()
      .then((buffer) => {
        this.result = `data:${blob.type || "application/octet-stream"};base64,${Buffer.from(buffer).toString("base64")}`;
        this.onload?.();
      })
      .catch((error: unknown) => {
        this.error =
          error instanceof Error
            ? error
            : new Error("Failed to read fixture blob");
        this.onerror?.();
      });
  }
}

function createBrowserCanvas() {
  const canvas = createCanvas(1, 1);
  Object.assign(canvas, {
    toBlob(callback: (blob: Blob | null) => void) {
      const png = canvas.toBuffer("image/png");
      callback(new Blob([new Uint8Array(png)], { type: "image/png" }));
    },
  });
  return canvas;
}

Object.assign(globalThis, {
  document: {
    createElement(tagName: string) {
      if (tagName !== "canvas")
        throw new Error(`Unsupported fixture element: ${tagName}`);
      return createBrowserCanvas();
    },
  },
  FileReader: LocalFileReader,
  Image: LocalAssetImage,
  Path2D: CanvasPath2D,
});

const themes = ["terracotta-glow", "midnight-gold"] as const;
const expectedSuffixes = [
  "TableTent_A5_Fold.pdf",
  "CounterSticker_8x8.png",
  "EntrancePoster_A4.pdf",
  "DeliveryBag_6x6.png",
  "TakeawayCard_85x55.png",
  "InstagramStory.png",
  "WhatsAppStatus.png",
  "GoogleMaps.png",
  "PlacementGuide.png",
  "SingleTableCard_A6.pdf",
];
async function run(): Promise<void> {
  const { generateMenuKit } =
    await import("../../src/lib/menu-kit/menuKitGenerator");
  const outputDirectory = await mkdtemp(
    path.join(os.tmpdir(), "menulist-menu-kit-theme-qa."),
  );
  const hashesByTheme = new Map<string, Map<string, string>>();

  for (const templateFamilyId of themes) {
    const themeDirectory = path.join(outputDirectory, templateFamilyId);
    await mkdir(themeDirectory, { recursive: true });
    const result = await generateMenuKit({
      businessCategory: "service",
      businessType: "Salon",
      menuUrl: "https://aster-oak-studio.menulist.online/services",
      shortLink: "ignored.example/services",
      storeName: "Aster & Oak Studio",
      templateFamilyId,
    });

    assert.equal(result.assets.length, 10);
    assert.ok(result.zipFilename.endsWith(`_${templateFamilyId}.zip`));
    assert.deepEqual(
      result.assets.map(({ filename }) =>
        expectedSuffixes.find((suffix) => filename.endsWith(suffix)),
      ),
      expectedSuffixes,
    );

    const zipBytes = new Uint8Array(await result.zipBlob.arrayBuffer());
    const zip = await JSZip.loadAsync(zipBytes);
    const zipEntries = Object.keys(zip.files)
      .filter((name) => !zip.files[name].dir)
      .sort();
    assert.equal(zipEntries.length, 11);
    assert.ok(zipEntries.includes("PRINT_INSTRUCTIONS.txt"));
    for (const asset of result.assets)
      assert.ok(zipEntries.includes(asset.filename));

    const themeHashes = new Map<string, string>();
    const contactTiles: Array<{ input: Buffer; label: string }> = [];
    for (const asset of result.assets) {
      const bytes = Buffer.from(await asset.blob.arrayBuffer());
      await writeFile(path.join(themeDirectory, asset.filename), bytes);
      themeHashes.set(
        asset.label,
        createHash("sha256").update(bytes).digest("hex"),
      );
      if (asset.mimeType === "image/png") {
        const image = sharp(bytes);
        const metadata = await image.metadata();
        assert.ok((metadata.width || 0) > 0 && (metadata.height || 0) > 0);
        const tile = await image
          .resize({
            width: 360,
            height: 360,
            fit: "contain",
            background: "#dedbd4",
          })
          .png()
          .toBuffer();
        contactTiles.push({ input: tile, label: asset.label });
      }
    }
    hashesByTheme.set(templateFamilyId, themeHashes);
    await writeFile(path.join(themeDirectory, result.zipFilename), zipBytes);

    await sharp({
      create: {
        background: "#dedbd4",
        channels: 4,
        height: 720,
        width: 1080,
      },
    })
      .composite(
        contactTiles.map(({ input }, index) => ({
          input,
          left: (index % 3) * 360,
          top: Math.floor(index / 3) * 360,
        })),
      )
      .png()
      .toFile(path.join(themeDirectory, "contact-sheet.png"));
  }

  const firstHashes = hashesByTheme.get(themes[0]);
  const secondHashes = hashesByTheme.get(themes[1]);
  assert.ok(firstHashes && secondHashes);
  for (const [label, firstHash] of firstHashes) {
    assert.notEqual(
      firstHash,
      secondHashes.get(label),
      `${label} ignored its parent theme`,
    );
  }

  console.log(
    `Menu Kit parent-theme output tests passed: ${themes.length} themes x 10 assets; 11 ZIP entries each.`,
  );
  console.log(`Visual contact sheets: ${outputDirectory}`);
}

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
