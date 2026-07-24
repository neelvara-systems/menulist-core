import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ActiveSelection,
  Canvas,
  FabricImage,
  FabricObject,
  Group,
  Rect,
  config,
  filters,
} from "fabric/node";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const adapter = fs.readFileSync(
  path.join(ROOT, "src/modules/creative-editor/fabricAdapter.ts"),
  "utf8",
);
const editor = fs.readFileSync(
  path.join(ROOT, "src/modules/creative-editor/CreativeEditor.tsx"),
  "utf8",
);

for (const [source, token, label] of [
  [adapter, 'fabricApi.FabricObject.ownDefaults.originX = "left"', "left origin compatibility"],
  [adapter, 'fabricApi.FabricObject.ownDefaults.originY = "top"', "top origin compatibility"],
  [adapter, "fabricApi.FabricObject.customProperties = CREATIVE_EDITOR_FABRIC_ATTRIBUTES", "custom clone properties"],
  [adapter, "fabricApi.FabricImage.fromURL(src, imageOptions, options)", "Promise image loading"],
  [adapter, "fabricApi.filters", "Fabric 7 image filters"],
  [editor, "convertActiveSelectionToGroup", "Fabric 7 grouping helper"],
  [editor, "convertGroupToActiveSelection", "Fabric 7 ungrouping helper"],
  [editor, "canvas.sendObjectToBack(object)", "collection-owned stack movement"],
  [editor, "activeObject.clone(CREATIVE_EDITOR_FABRIC_ATTRIBUTES)", "Promise clone boundary"],
]) {
  assert.equal(source.includes(token), true, `Creative Editor must retain ${label}`);
}

config.NUM_FRACTION_DIGITS = 4;
FabricObject.customProperties = ["creativeEditorSrc"];
FabricObject.ownDefaults.originX = "left";
FabricObject.ownDefaults.originY = "top";

const canvas = new Canvas(undefined, {
  height: 600,
  preserveObjectStacking: true,
  renderOnAddRemove: false,
  width: 800,
});
const first = new Rect({
  fill: "#45b99f",
  height: 80,
  left: 40,
  top: 50,
  width: 100,
});
const second = new Rect({
  fill: "#4744a4",
  height: 90,
  left: 240,
  top: 180,
  width: 120,
});
first.creativeEditorSrc = "data:image/png;base64,fixture";
canvas.add(first, second);

assert.equal(first.originX, "left");
assert.equal(first.originY, "top");
assert.equal(config.NUM_FRACTION_DIGITS, 4);

const cloned = await first.clone(["creativeEditorSrc"]);
assert.equal(
  cloned.creativeEditorSrc,
  first.creativeEditorSrc,
  "Fabric 7 Promise cloning must retain Creative Editor metadata",
);

const before = [first.getBoundingRect(), second.getBoundingRect()];
const selection = new ActiveSelection([first, second], { canvas });
canvas.setActiveObject(selection);

const selectedObjects = selection.getObjects();
canvas.discardActiveObject();
canvas.remove(...selectedObjects);
const group = new Group(selectedObjects, { objectCaching: false });
canvas.add(group);
canvas.setActiveObject(group);

canvas.discardActiveObject();
const ungroupedObjects = group.removeAll();
canvas.remove(group);
canvas.add(...ungroupedObjects);
const after = [first.getBoundingRect(), second.getBoundingRect()];

assert.deepEqual(
  after,
  before,
  "Fabric 7 temporary group and ungroup operations must preserve scene coordinates",
);
assert.equal(canvas.getObjects().length, 2);

canvas.bringObjectToFront(first);
assert.equal(canvas.item(canvas.size() - 1), first);
canvas.sendObjectToBack(first);
assert.equal(canvas.item(0), first);

const filteredImage = new FabricImage(first.toCanvasElement());
filteredImage.filters = [new filters.Grayscale({ mode: "luminosity" })];
filteredImage.applyFilters();
assert.equal(filteredImage.filters.length, 1);

const dataUrl = canvas.toDataURL({
  enableRetinaScaling: false,
  format: "png",
  height: 600,
  left: 0,
  multiplier: 1,
  quality: 1,
  top: 0,
  width: 800,
});
assert.equal(dataUrl.startsWith("data:image/png;base64,"), true);

await canvas.dispose();
console.log("Creative Editor Fabric 7 boundary tests passed.");
