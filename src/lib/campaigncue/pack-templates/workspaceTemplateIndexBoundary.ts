import type { CampaignCuePackTemplateSummary } from "@type/campaigncuePackTemplates";

export function isOwnedWorkspaceTemplateStoragePath({
    path,
    storageRoot,
    templateId,
    workspaceId,
}: {
    path: unknown;
    storageRoot: string;
    templateId: string;
    workspaceId: string;
}): boolean {
    if (typeof path !== "string" || path.includes("//") || path.includes("../")) return false;
    const templateRoot = `${storageRoot}/${workspaceId}/${templateId}/`;
    if (!path.startsWith(templateRoot)) return false;
    const relativePath = path.slice(templateRoot.length);
    return /^(?:versions\/[a-zA-Z0-9_-]{3,160}\/)?(?:pack-template\.json|editor-document\.json|preview\.(?:png|jpeg|webp))$/.test(relativePath);
}

export function upsertWorkspaceTemplateIndex({
    existingTemplates,
    maxTemplates,
    summary,
}: {
    existingTemplates: readonly CampaignCuePackTemplateSummary[];
    maxTemplates: number;
    summary: CampaignCuePackTemplateSummary;
}): {
    data: CampaignCuePackTemplateSummary[];
    obsoleteRecords: CampaignCuePackTemplateSummary[];
} {
    if (!Number.isSafeInteger(maxTemplates) || maxTemplates < 1) {
        throw new TypeError("campaigncue_workspace_template_limit_invalid");
    }
    const data = [
        summary,
        ...existingTemplates.filter((template) => template.templateId !== summary.templateId),
    ].slice(0, maxTemplates);
    const retainedTemplateIds = new Set(data.map((template) => template.templateId));
    return {
        data,
        obsoleteRecords: existingTemplates.filter((template) => (
            template.templateId === summary.templateId || !retainedTemplateIds.has(template.templateId)
        )),
    };
}

export function removeWorkspaceTemplateFromIndex({
    existingTemplates,
    templateId,
}: {
    existingTemplates: readonly CampaignCuePackTemplateSummary[];
    templateId: string;
}): {
    data: CampaignCuePackTemplateSummary[];
    removed?: CampaignCuePackTemplateSummary;
} {
    const removed = existingTemplates.find((template) => template.templateId === templateId);
    return {
        data: removed
            ? existingTemplates.filter((template) => template.templateId !== templateId)
            : [...existingTemplates],
        removed,
    };
}
