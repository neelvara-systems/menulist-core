export type CreativeEditorTemplateStorageOwnership = {
    businessCategory?: string;
    sId?: string;
    tId?: string;
    templateId: string;
    templateOrigin: "platform" | "user";
};

export type CreativeEditorTemplateStorageTarget = "document" | "preview";

const safePathPart = (value: string): string => (
    value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100) || "_"
);

const isAllowedTemplateFileName = (
    fileName: string,
    target: CreativeEditorTemplateStorageTarget,
): boolean => {
    if (target === "document") {
        return fileName === "document.json"
            || /^document-[a-zA-Z0-9_-]{8,64}\.json$/.test(fileName);
    }
    return /^preview\.(png|jpg|jpeg|webp)$/.test(fileName)
        || /^preview-[a-zA-Z0-9_-]{8,64}\.(png|jpg|jpeg|webp)$/.test(fileName);
};

export const buildCreativeEditorTemplateVersionId = (randomSegment: string): string => (
    `v${Date.now().toString(36)}_${safePathPart(randomSegment).slice(0, 32)}`
);

export const buildCreativeEditorTemplateFileName = (params: {
    extension?: "jpg" | "png" | "webp";
    target: CreativeEditorTemplateStorageTarget;
    versionId: string;
}): string => (
    params.target === "document"
        ? `document-${safePathPart(params.versionId)}.json`
        : `preview-${safePathPart(params.versionId)}.${params.extension || "jpg"}`
);

export const isOwnedCreativeEditorTemplateStoragePath = (
    path: string,
    ownership: CreativeEditorTemplateStorageOwnership,
    target: CreativeEditorTemplateStorageTarget,
): boolean => {
    const fileName = path.split("/").pop() || "";
    if (!isAllowedTemplateFileName(fileName, target)) return false;

    const prefix = ownership.templateOrigin === "platform"
        ? [
            "creative-editor/templates/platform",
            safePathPart(ownership.businessCategory || "generic"),
            safePathPart(ownership.templateId),
        ].join("/")
        : [
            "creative-editor/templates/user",
            safePathPart(ownership.tId || ""),
            safePathPart(ownership.sId || ""),
            safePathPart(ownership.templateId),
        ].join("/");

    return path === `${prefix}/${fileName}`;
};
