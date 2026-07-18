import assert from "node:assert/strict";

import {
    isOwnedWorkspaceTemplateStoragePath,
    removeWorkspaceTemplateFromIndex,
    upsertWorkspaceTemplateIndex,
} from "../../src/lib/campaigncue/pack-templates/workspaceTemplateIndexBoundary";
import type { CampaignCuePackTemplateSummary } from "../../src/types/campaigncuePackTemplates";

const summary = (templateId: string, payloadPath = `${templateId}/payload.json`): CampaignCuePackTemplateSummary => ({
    businessCategory: "food",
    channels: ["whatsapp"],
    createdAt: 1,
    description: `${templateId} description`,
    eventTags: [],
    optionalFactTypes: [],
    outputTypes: ["whatsapp_image"],
    ownerGoals: ["sell_product"],
    payloadPath,
    priority: 1,
    qualityTier: "workspace_saved",
    recipeIds: ["recipe"],
    requiredFactTypes: [],
    schemaVersion: 1,
    searchTokens: [templateId],
    status: "active",
    styleTags: [],
    supportedBusinessTypes: [],
    templateId,
    templateKind: "campaign_pack",
    templateType: "workspace",
    title: templateId,
    trustChecks: [],
    updatedAt: 1,
});

const originalA = summary("a", "a/old.json");
const originalB = summary("b");
const originalC = summary("c");
const nextA = summary("a", "a/new.json");

const update = upsertWorkspaceTemplateIndex({
    existingTemplates: [originalA, originalB],
    maxTemplates: 2,
    summary: nextA,
});
assert.deepEqual(update.data.map((record) => record.payloadPath), ["a/new.json", "b/payload.json"]);
assert.deepEqual(update.obsoleteRecords, [originalA], "replacement must expose the previous immutable version for cleanup");

const capped = upsertWorkspaceTemplateIndex({
    existingTemplates: [originalA, originalB, originalC],
    maxTemplates: 2,
    summary: summary("d"),
});
assert.deepEqual(capped.data.map((record) => record.templateId), ["d", "a"]);
assert.deepEqual(capped.obsoleteRecords.map((record) => record.templateId), ["b", "c"]);

assert.throws(() => upsertWorkspaceTemplateIndex({
    existingTemplates: [],
    maxTemplates: 0,
    summary: nextA,
}), /campaigncue_workspace_template_limit_invalid/);

const removed = removeWorkspaceTemplateFromIndex({ existingTemplates: [originalA, originalB], templateId: "a" });
assert.equal(removed.removed, originalA);
assert.deepEqual(removed.data, [originalB]);

const missing = removeWorkspaceTemplateFromIndex({ existingTemplates: [originalA], templateId: "missing" });
assert.equal(missing.removed, undefined);
assert.deepEqual(missing.data, [originalA]);

assert.equal(isOwnedWorkspaceTemplateStoragePath({
    path: "campaigncue/templates/workspaces/workspace-a/template-a/versions/save-1/pack-template.json",
    storageRoot: "campaigncue/templates/workspaces",
    templateId: "template-a",
    workspaceId: "workspace-a",
}), true);
assert.equal(isOwnedWorkspaceTemplateStoragePath({
    path: "campaigncue/templates/workspaces/workspace-a/template-a/pack-template.json",
    storageRoot: "campaigncue/templates/workspaces",
    templateId: "template-a",
    workspaceId: "workspace-a",
}), true, "legacy owned versions remain eligible for post-commit cleanup");
assert.equal(isOwnedWorkspaceTemplateStoragePath({
    path: "campaigncue/templates/workspaces/workspace-a/template-b/versions/save-1/pack-template.json",
    storageRoot: "campaigncue/templates/workspaces",
    templateId: "template-a",
    workspaceId: "workspace-a",
}), false, "cleanup must not delete a different template's object");
assert.equal(isOwnedWorkspaceTemplateStoragePath({
    path: "campaigncue/templates/workspaces/workspace-b/template-a/versions/save-1/pack-template.json",
    storageRoot: "campaigncue/templates/workspaces",
    templateId: "template-a",
    workspaceId: "workspace-a",
}), false, "cleanup must not cross workspace scope");
assert.equal(isOwnedWorkspaceTemplateStoragePath({
    path: "campaigncue/templates/workspaces/workspace-a/template-a/versions/save-1/arbitrary.json",
    storageRoot: "campaigncue/templates/workspaces",
    templateId: "template-a",
    workspaceId: "workspace-a",
}), false, "cleanup must only target registered template artifacts");

console.log("CampaignCue workspace template index boundary tests passed.");
