import assert from "node:assert/strict";
import { areEditorProjectsEquivalent } from "@lib/projects/editorProjectComparison";

function projectWithItem(item: Record<string, unknown>) {
    return {
        projectId: "project-1",
        files: [{
            uid: "file-1",
            extractedData: {
                data: {
                    categories: [{ id: "category-1" }],
                    items: [{ id: "item-1", category: "category-1", ...item }],
                },
            },
        }],
    };
}

assert.equal(
    areEditorProjectsEquivalent(
        projectWithItem({ name: "Coffee" }),
        projectWithItem({ name: "Coffee", attributes: [] }),
    ),
    true,
    "missing and empty item attributes must be the same editor truth",
);

assert.equal(
    areEditorProjectsEquivalent(
        projectWithItem({ name: "Coffee", attributes: [] }),
        projectWithItem({ name: "Coffee" }),
    ),
    true,
    "empty and missing item attributes must compare symmetrically",
);

assert.equal(
    areEditorProjectsEquivalent(
        projectWithItem({ name: "Coffee", attributes: [{ id: "size", price: "20" }] }),
        projectWithItem({ name: "Coffee" }),
    ),
    false,
    "removing a persisted attribute must remain a real editor change",
);

assert.equal(
    areEditorProjectsEquivalent(
        projectWithItem({ name: "Coffee", price: "80" }),
        projectWithItem({ name: "Coffee", price: "90" }),
    ),
    false,
    "non-attribute menu changes must remain detectable",
);

console.log("Project editor no-op comparison tests passed.");
