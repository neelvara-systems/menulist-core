import assert from "node:assert/strict";

import { mceValidate } from "../../src/lib/mce";
import { buildProjectAfterPartialUpdate } from "../../src/lib/menu/projectUpdateProjection";
import { sanitizeProjectPartialUpdate } from "../../src/lib/menu/projectUpdateProjection";
import type { Project } from "../../src/components/templates/main-app/projects/types";

const currentProject: Project = {
    projectId: "1-project-10",
    languages: ["en"],
    defaultLanguage: "en",
    menuSettings: { feedback: false, specialNote: { en: "Tax included" } },
    files: [{
        uid: "file-1",
        active: true,
        extractedData: {
            data: {
                categories: [{ id: "category-1", active: true, name: { en: "Main" } }],
                items: [{
                    id: "item-1",
                    active: true,
                    available: true,
                    category: "category-1",
                    name: { en: "Tea" },
                    price: "20",
                }],
                languages: [{ name: "English", code: "en", isPrimary: true }],
            },
        },
    }],
};

const currentBefore = JSON.stringify(currentProject);
const metadataPatch: Partial<Project> = {
    projectId: currentProject.projectId,
    languages: ["en"],
    defaultLanguage: "en",
    description: { en: "Updated description" },
};
const projectedMetadataSave = buildProjectAfterPartialUpdate(currentProject, metadataPatch);

assert.equal(projectedMetadataSave.files, currentProject.files, "partial save must retain current menu rows");
assert.deepEqual(projectedMetadataSave.description, { en: "Updated description" });
assert.equal(mceValidate({
    projectData: metadataPatch as Record<string, unknown>,
    isOutlet: false,
}).verified, false);
assert.equal(
    mceValidate({
        projectData: projectedMetadataSave as Record<string, unknown>,
        oldProjectData: currentProject as Record<string, unknown>,
        isOutlet: false,
    }).verified,
    true,
    "MCE must validate post-merge truth instead of a metadata-only patch",
);

const explicitReset = buildProjectAfterPartialUpdate(currentProject, {
    projectId: currentProject.projectId,
    files: [],
});
assert.deepEqual(explicitReset.files, [], "an explicit empty files array must remain a real menu reset");
assert.equal(
    mceValidate({
        projectData: explicitReset as Record<string, unknown>,
        isOutlet: false,
    }).verified,
    false,
    "MCE must continue to reject an explicit empty-menu save",
);

const undefinedPatch = buildProjectAfterPartialUpdate(currentProject, {
    projectId: currentProject.projectId,
    files: undefined,
    name: undefined,
});
assert.equal(undefinedPatch.files, currentProject.files, "undefined values must mirror Firestore omission");
const nestedPatch = sanitizeProjectPartialUpdate({
    projectId: currentProject.projectId,
    menuSettings: { feedback: true, specialNote: undefined },
});
const projectedNestedSave = buildProjectAfterPartialUpdate(currentProject, nestedPatch);
assert.deepEqual(nestedPatch.menuSettings, { feedback: true });
assert.deepEqual(projectedNestedSave.menuSettings, {
    feedback: true,
    specialNote: { en: "Tax included" },
});
assert.equal(JSON.stringify(currentProject), currentBefore, "projection must not mutate current project truth");

console.log("Project partial-update projection tests passed.");
