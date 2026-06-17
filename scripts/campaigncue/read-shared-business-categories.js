const fs = require("fs");
const path = require("path");

function readSharedBusinessCategories(root = path.resolve(__dirname, "..", "..")) {
  const sourcePath = path.join(root, "src/data/shared/businessTypes.ts");
  const source = fs.readFileSync(sourcePath, "utf8");
  const categoriesMatch = source.match(/export const BUSINESS_CATEGORIES[\s\S]*?=\s*\[([\s\S]*?)\];/);
  if (!categoriesMatch) {
    throw new Error(`Unable to find BUSINESS_CATEGORIES in ${sourcePath}`);
  }

  const categories = Array.from(categoriesMatch[1].matchAll(/value:\s*"([^"]+)"/g))
    .map((match) => match[1]);
  if (!categories.length) {
    throw new Error(`Unable to read business category values from ${sourcePath}`);
  }
  return categories;
}

module.exports = { readSharedBusinessCategories };
