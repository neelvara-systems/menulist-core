import assert from "node:assert/strict";

import { resolveNextSpecialMenuTransitionAt } from "../../src/data/shared/specialMenuSchedule";
import {
    createSpecialMenuOverlayFiles,
    mergeSpecialMenuOverlayProjects,
} from "../../src/lib/menu/specialMenuOverlay";
import type { Project, ProjectFileType } from "../../src/components/templates/main-app/projects/types";

const fileWithRows = (
    categories: NonNullable<ProjectFileType["extractedData"]>["data"]["categories"],
    items: NonNullable<ProjectFileType["extractedData"]>["data"]["items"],
): ProjectFileType => ({
    uid: "file-1",
    name: "menu.pdf",
    extractedData: {
        data: {
            categories,
            items,
            languages: [{ name: "English", code: "en", isPrimary: true }],
        },
    },
});

const baseProject: Project = {
    projectId: "1-base-10",
    files: [fileWithRows(
        [{ id: "base-category", active: true, name: { en: "Main" } }],
        [{
            id: "base-item",
            active: true,
            category: "base-category",
            name: { en: "Base item" },
            price: "100",
            attributes: [{ id: "shared-attribute", active: true, name: { en: "Regular" }, price: "100" }],
        }],
    )],
};

const legacyOverlay: Project = {
    projectId: "1-special-10",
    files: [fileWithRows(
        [
            { id: "base-category", active: true, name: { en: "Main" } },
            { id: "festival-category", active: true, name: { en: "Festival" }, extractionIdAliases: ["old-cat"] },
            { id: "festival-category", active: true, name: { en: "Duplicate festival" } },
        ],
        [
            {
                id: "base-item",
                active: true,
                category: "base-category",
                name: { en: "Base item" },
                price: "100",
            },
            {
                id: "festival-item",
                active: true,
                category: "festival-category",
                name: { en: "Festival item" },
                extractionIdAliases: ["old-item"],
                attributes: [
                    { id: "shared-attribute", active: true, name: { en: "Small" }, price: "120" },
                    { id: "shared-attribute", active: true, name: { en: "Large" }, price: "160" },
                    { id: " ", active: true, name: { en: "Invalid" }, price: "0" },
                ],
            },
            {
                id: "orphan-item",
                active: true,
                category: "missing-category",
                name: { en: "Orphan" },
            },
            {
                id: "festival-item",
                active: true,
                category: "festival-category",
                name: { en: "Duplicate item" },
            },
        ],
    )],
};

const baseBefore = JSON.stringify(baseProject);
const specialBefore = JSON.stringify(legacyOverlay);
const merged = mergeSpecialMenuOverlayProjects(baseProject, legacyOverlay);
const replay = mergeSpecialMenuOverlayProjects(baseProject, legacyOverlay);
const rows = merged.files?.[0]?.extractedData?.data;

assert.ok(rows, "merged overlay must retain a renderable base file");
assert.equal(rows.categories.length, 2, "legacy base categories must not be duplicated");
assert.equal(rows.items.length, 2, "legacy base items, duplicates, and orphan items must be omitted");
assert.equal(rows.categories.filter((category) => category.id === "base-category").length, 1);
assert.equal(rows.items.filter((item) => item.id === "base-item").length, 1);

const overlayCategory = rows.categories.find((category) => category._isSpecialSection);
const overlayItem = rows.items.find((item) => item._isSpecialSection);
assert.ok(overlayCategory?.id.startsWith("sm_"), "overlay category must use a runtime namespace");
assert.ok(overlayItem?.id.startsWith("sm_"), "overlay item must use a runtime namespace");
assert.equal(overlayItem?.category, overlayCategory?.id, "item category reference must follow category remapping");
assert.equal(overlayCategory?.extractionIdAliases, undefined, "base identity aliases must not leak into overlay projection");
assert.equal(overlayItem?.extractionIdAliases, undefined, "base identity aliases must not leak into overlay projection");
assert.equal(overlayItem?.attributes?.length, 2, "invalid attribute identities must be omitted");
assert.notEqual(
    overlayItem?.attributes?.[0]?.id,
    overlayItem?.attributes?.[1]?.id,
    "duplicate source attribute IDs must still become unique runtime IDs",
);
assert.ok(overlayItem?.attributes?.every((attribute) => attribute.id.startsWith("sm_")));
assert.deepEqual(replay, merged, "runtime projection IDs must be deterministic for replay");
assert.equal(JSON.stringify(baseProject), baseBefore, "base project must remain immutable");
assert.equal(JSON.stringify(legacyOverlay), specialBefore, "special project must remain immutable");

const overlayFiles = createSpecialMenuOverlayFiles(baseProject.files);
assert.equal(overlayFiles[0]?.extractedData?.data.categories.length, 0);
assert.equal(overlayFiles[0]?.extractedData?.data.items.length, 0);
assert.equal(overlayFiles[0]?.extractedData?.data.languages[0]?.code, "en");
assert.equal(overlayFiles[0]?.name, "menu.pdf", "editor file context must be retained");
assert.equal(JSON.stringify(baseProject), baseBefore, "overlay initialization must not mutate the base project");

assert.equal(
    resolveNextSpecialMenuTransitionAt({
        scheduled: {
            active: true,
            isSpecialMenu: true,
            specialMenuStatus: 'scheduled',
            specialMenuStartsAt: '2026-07-20T09:00:00.000Z',
            specialMenuEndsAt: '2026-07-20T12:00:00.000Z',
        },
        active: {
            active: true,
            isSpecialMenu: true,
            specialMenuStatus: 'active',
            specialMenuStartsAt: '2026-07-19T09:00:00.000Z',
            specialMenuEndsAt: '2026-07-20T10:00:00.000Z',
        },
        cancelled: {
            active: true,
            isSpecialMenu: true,
            specialMenuStatus: 'cancelled',
            specialMenuStartsAt: '2026-07-18T09:00:00.000Z',
            specialMenuEndsAt: '2026-07-18T10:00:00.000Z',
        },
    }),
    '2026-07-20T09:00:00.000Z',
    'the due marker must select the earliest live start or end boundary',
);
assert.equal(
    resolveNextSpecialMenuTransitionAt({
        ended: {
            active: true,
            isSpecialMenu: true,
            specialMenuStatus: 'expired',
            specialMenuEndsAt: '2026-07-18T10:00:00.000Z',
        },
    }),
    null,
    'terminal special menus must not keep a due-work marker',
);

console.log("Special menu overlay projection tests passed.");
