import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildExtractionResultSummary } from "../../functions/src/utils/menuExtractionResultSummary";

assert.deepEqual(
    buildExtractionResultSummary({
        categories: [{ id: "category-1" }],
        items: [
            { dietaryTags: ["vegetarian"], attributes: [{ name: { en: "Large" } }] },
            { dietaryTags: "invalid", attributes: null },
            null,
            "legacy-invalid-item",
        ],
        languages: [{ code: "en" }],
        fileMessages: [{ code: "warning" }],
        businessAttributeSuggestions: [{ key: "delivery" }],
        extractedBusinessProfile: { name: "Example" },
    }),
    {
        categoriesCount: 1,
        itemsCount: 4,
        languagesCount: 1,
        fileMessagesCount: 1,
        businessAttributeSuggestionsCount: 1,
        dietaryTaggedItemsCount: 1,
        attributedItemsCount: 1,
        hasExtractedBusinessProfile: true,
    },
    "valid arrays are counted while malformed legacy item fields are ignored",
);

for (const malformedInput of [null, undefined, false, 0, "menu", [], { items: "invalid" }]) {
    assert.deepEqual(
        buildExtractionResultSummary(malformedInput),
        {
            categoriesCount: 0,
            itemsCount: 0,
            languagesCount: 0,
            fileMessagesCount: 0,
            businessAttributeSuggestionsCount: 0,
            dietaryTaggedItemsCount: 0,
            attributedItemsCount: 0,
            hasExtractedBusinessProfile: false,
        },
        `malformed input must project to an empty summary: ${String(malformedInput)}`,
    );
}

const menuProcessingJobTypes = fs.readFileSync(
    path.resolve(__dirname, "../../functions/src/types/menuProcessingJob.types.ts"),
    "utf8",
);
assert.ok(menuProcessingJobTypes.includes("dataPrunedAt?: Timestamp;"));
assert.ok(!menuProcessingJobTypes.includes("dataPrunedAt?: any;"));

console.log("Menu extraction result summary boundary passed.");
