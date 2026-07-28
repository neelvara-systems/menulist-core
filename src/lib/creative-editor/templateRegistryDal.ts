import {
    doc,
    getDoc,
    runTransaction,
} from "firebase/firestore";
import {
    deleteObject,
    getBlob,
    getDownloadURL,
    ref,
    uploadString,
} from "firebase/storage";
import { DB_COLLECTIONS } from "@constant/database";
import { BUSINESS_CATEGORIES } from "@data/shared/businessTypes";
import getActiveSession from "@lib/auth/getActiveSession";
import { composeRequestBody } from "@lib/apiHelper";
import { firebaseClient, firebaseStorage } from "@lib/firebase/firebaseClient";
import { createRandomIdSegment } from "@lib/runtime/randomId";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import {
    matchesCreativeEditorTemplateRecord,
    removeCreativeEditorTemplateRecord,
    upsertCreativeEditorTemplateRecord,
} from "./templateRegistryIndexBoundary";
import {
    buildCreativeEditorTemplateFileName,
    buildCreativeEditorTemplateVersionId,
    isOwnedCreativeEditorTemplateStoragePath,
} from "./templateRegistryStorageBoundary";
import type { CreativeEditorDocument, CreativeEditorTemplateOrigin, CreativeEditorTemplateSummary } from "@/modules/creative-editor/types";
import {
    creativeEditorDocumentSchema,
    creativeEditorTemplateGetQuerySchema,
    creativeEditorTemplateListQuerySchema,
    creativeEditorTemplateSaveSchema,
    type CreativeEditorTemplateGetQuery,
    type CreativeEditorTemplateListQuery,
} from "@lib/validation/creativeEditorTemplateSchemas";
import {
    resolveCreativeEditorTemplateScopeBoundary,
    type CreativeEditorTemplateScope,
} from "./templateRegistryScopeBoundary";

const PLATFORM_CATALOG_COLLECTION = DB_COLLECTIONS.CREATIVE_EDITOR_PLATFORM_ASSET_TEMPLATES;
const STORE_ASSET_TEMPLATES_COLLECTION = DB_COLLECTIONS.STORE_ASSET_TEMPLATES;
const STORAGE_ROOT = "creative-editor/templates";
const MAX_DOCUMENT_BYTES = 750_000;
const MAX_INDEX_TEMPLATES = 100;
const MAX_PLATFORM_INDEX_TEMPLATES = 200;
const PLATFORM_TEMPLATE_GENERIC_CATEGORY = "generic";
const PLATFORM_TEMPLATE_CATALOG_KEYS = [
    PLATFORM_TEMPLATE_GENERIC_CATEGORY,
    ...BUSINESS_CATEGORIES.map((category) => category.value),
];
const STORE_TEMPLATE_DOC_ID = "default";

const TEMPLATE_REGISTRY_LOCAL_ERROR_MESSAGES = {
    TEMPLATE_ACCOUNT_REQUIRED: "Template registry requires an onboarded account",
    TEMPLATE_DOCUMENT_TOO_LARGE: "Template document is too large",
    TEMPLATE_NOT_FOUND: "Template not found",
    TEMPLATE_SAVE_FAILED: "Template could not be saved",
    PLATFORM_TEMPLATE_SAVE_FAILED: "Platform template could not be saved",
} as const;

type TemplateRegistryLocalErrorCode = keyof typeof TEMPLATE_REGISTRY_LOCAL_ERROR_MESSAGES;

class TemplateRegistryLocalError extends Error {
    readonly code: TemplateRegistryLocalErrorCode;

    constructor(code: TemplateRegistryLocalErrorCode) {
        super(TEMPLATE_REGISTRY_LOCAL_ERROR_MESSAGES[code]);
        this.name = "TemplateRegistryLocalError";
        this.code = code;
    }
}

const isTemplateRegistryLocalErrorCode = (code: unknown): code is TemplateRegistryLocalErrorCode => (
    typeof code === "string"
    && Object.prototype.hasOwnProperty.call(TEMPLATE_REGISTRY_LOCAL_ERROR_MESSAGES, code)
);

const getTemplateRegistryLocalErrorMessage = (error: unknown): string | null => {
    if (!error || typeof error !== "object") return null;
    const code = (error as { code?: unknown }).code;
    return isTemplateRegistryLocalErrorCode(code) ? TEMPLATE_REGISTRY_LOCAL_ERROR_MESSAGES[code] : null;
};

const throwTemplateRegistryLocalError = (code: TemplateRegistryLocalErrorCode): never => {
    throw new TemplateRegistryLocalError(code);
};

const isTemplateRegistryLocalError = (error: unknown, code?: TemplateRegistryLocalErrorCode): boolean => (
    error instanceof TemplateRegistryLocalError
    && (!code || error.code === code)
);

export type { CreativeEditorTemplateScope } from "./templateRegistryScopeBoundary";

export type CreativeEditorTemplateContext = {
    assetTypeId?: string;
    businessCategory?: string;
    includeUnpublished?: boolean;
    productId: string;
    scope?: CreativeEditorTemplateScope | null;
    sourceSurface: string;
    templateType?: "platform" | "user" | "all";
};

export type CreativeEditorTemplateSaveParams = CreativeEditorTemplateContext & {
    document: CreativeEditorDocument;
    templateFamilyId?: string;
    templateId?: string;
    thumbnailDataUrl?: string;
    title: string;
};

export type CreativeEditorPlatformTemplateSaveParams = Omit<CreativeEditorTemplateContext, "scope" | "templateType"> & {
    description?: string;
    document: CreativeEditorDocument;
    status?: "draft" | "published" | "archived";
    templateFamilyId?: string;
    templateId?: string;
    thumbnailDataUrl?: string;
    title: string;
};

export type CreativeEditorPlatformTemplateMetadataParams = Omit<CreativeEditorTemplateContext, "scope" | "templateType"> & {
    description?: string;
    status?: "draft" | "published" | "archived";
    templateFamilyId?: string;
    templateId: string;
    title?: string;
};

type TemplateStorageBackend = "storage";

type TemplateStorageCleanupContext = {
    assetTypeId?: string;
    businessCategory?: string;
    cleanupTarget: "document" | "preview";
    productId?: string;
    sId?: string;
    sourceSurface?: string;
    tId?: string;
    templateId?: string;
    templateOrigin: "platform" | "user";
};

type CreativeEditorTemplateRecord = {
    assetTypeId?: string;
    businessCategory?: string;
    createdBy?: string;
    createdAt: string;
    createdAtMs: number;
    createdOn?: unknown;
    description?: string;
    documentBytes?: number;
    documentPath?: string | null;
    documentStorage?: TemplateStorageBackend;
    elementCount: number;
    height: number;
    id: string;
    origin?: CreativeEditorTemplateOrigin;
    previewPath?: string | null;
    previewStorage?: "storage";
    pId?: string;
    productId: string;
    role?: string;
    schemaVersion?: number;
    sId?: string | number;
    sourceSurface: string;
    status?: "draft" | "published" | "archived";
    templateFamilyId?: string;
    templateType: CreativeEditorTemplateOrigin;
    thumbnailUrl?: string | null;
    title: string;
    tId?: string | number;
    modifiedBy?: string;
    modifiedOn?: unknown;
    sortIndex?: number;
    updatedAt: string;
    updatedAtMs: number;
    uId?: string | number;
    version?: number;
    width: number;
};

type CreativeEditorPlatformTemplateRecord = CreativeEditorTemplateRecord & {
    businessCategory: string;
    templateType: "platform";
};

type CreativeEditorStoreTemplateIndexRecord = {
    createdBy?: string;
    createdOn?: unknown;
    data: CreativeEditorTemplateRecord[];
    id: string;
    modifiedBy?: string;
    modifiedOn?: unknown;
    pId?: string;
    role?: string;
    schemaVersion: number;
    sId?: string | number;
    tId?: string | number;
    updatedAt: string;
    updatedAtMs: number;
    uId?: string | number;
};

type CreativeEditorPlatformCatalogRecord = {
    businessCategory: string;
    data?: CreativeEditorTemplateRecord[];
    schemaVersion: number;
    templates?: CreativeEditorTemplateRecord[];
    updatedAt?: string;
    updatedAtMs?: number;
};

export const resolveCreativeEditorTemplateScope = (input: {
    session?: unknown;
    storeDetails?: unknown;
}): CreativeEditorTemplateScope | null => resolveCreativeEditorTemplateScopeBoundary(input);

const safePathPart = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100) || "_";

const buildPlatformCategoryKey = (businessCategory?: string) => (
    safePathPart(businessCategory || PLATFORM_TEMPLATE_GENERIC_CATEGORY)
);

const getPlatformCatalogKeysForMutation = (businessCategory: string) => (
    businessCategory === PLATFORM_TEMPLATE_GENERIC_CATEGORY
        ? PLATFORM_TEMPLATE_CATALOG_KEYS
        : [businessCategory]
);

const buildTemplateId = () => {
    const cryptoId = createRandomIdSegment(10);
    return `tpl_${Date.now().toString(36)}_${cryptoId}`;
};

const getPlatformCatalogRef = (businessCategory?: string) => doc(
    firebaseClient,
    PLATFORM_CATALOG_COLLECTION,
    buildPlatformCategoryKey(businessCategory),
);

const getStoreTemplateIndexRef = (
    scope: CreativeEditorTemplateScope,
) => doc(
    firebaseClient,
    STORE_ASSET_TEMPLATES_COLLECTION,
    safePathPart(scope.tId),
    safePathPart(scope.sId),
    STORE_TEMPLATE_DOC_ID,
);

const buildUserDocumentPath = (
    scope: CreativeEditorTemplateScope,
    params: { templateId: string; versionId: string },
) => [
    STORAGE_ROOT,
    "user",
    safePathPart(scope.tId),
    safePathPart(scope.sId),
    safePathPart(params.templateId),
    buildCreativeEditorTemplateFileName({ target: "document", versionId: params.versionId }),
].join("/");

const buildPlatformDocumentPath = (
    params: { businessCategory?: string; templateId: string; versionId: string },
) => [
    STORAGE_ROOT,
    "platform",
    buildPlatformCategoryKey(params.businessCategory),
    safePathPart(params.templateId),
    buildCreativeEditorTemplateFileName({ target: "document", versionId: params.versionId }),
].join("/");

const buildUserPreviewPath = (
    scope: CreativeEditorTemplateScope,
    params: { templateId: string; thumbnailDataUrl?: string; versionId: string },
) => {
    const contentType = parseDataUrlContentType(params.thumbnailDataUrl);
    const extension = contentType === "image/webp" ? "webp" : contentType === "image/png" ? "png" : "jpg";
    return [
        STORAGE_ROOT,
        "user",
        safePathPart(scope.tId),
        safePathPart(scope.sId),
        safePathPart(params.templateId),
        buildCreativeEditorTemplateFileName({ extension, target: "preview", versionId: params.versionId }),
    ].join("/");
};

const buildPlatformPreviewPath = (
    params: { businessCategory?: string; templateId: string; thumbnailDataUrl?: string; versionId: string },
) => {
    const contentType = parseDataUrlContentType(params.thumbnailDataUrl);
    const extension = contentType === "image/webp" ? "webp" : contentType === "image/png" ? "png" : "jpg";
    return [
        STORAGE_ROOT,
        "platform",
        buildPlatformCategoryKey(params.businessCategory),
        safePathPart(params.templateId),
        buildCreativeEditorTemplateFileName({ extension, target: "preview", versionId: params.versionId }),
    ].join("/");
};

const getDocumentBytes = (value: string) => new TextEncoder().encode(value).length;

const parseDataUrlContentType = (value?: string) => {
    if (!value) return null;
    const match = value.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,/);
    if (!match) return null;
    return match[1] === "image/jpg" ? "image/jpeg" : match[1];
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object");

const getTemplateRegistryErrorIndicators = (error: unknown): Set<string> => {
    const indicators = new Set<string>();
    if (!isRecord(error)) return indicators;

    ["code", "name", "status", "statusCode"].forEach((key) => {
        const value = error[key];
        if (typeof value === "string" || typeof value === "number") {
            const normalized = String(value).trim().toLowerCase();
            if (normalized) indicators.add(normalized);
        }
    });

    return indicators;
};

const getTemplateRegistryErrorMessage = (error: unknown, fallback: string) => {
    const indicators = getTemplateRegistryErrorIndicators(error);
    if (
        indicators.has("storage/quota-exceeded")
        || indicators.has("quota-exceeded")
        || indicators.has("resource-exhausted")
        || indicators.has("resource_exhausted")
    ) {
        return "Template storage is full. Clear storage or upgrade Firebase Storage, then try again.";
    }
    if (
        indicators.has("storage/unauthorized")
        || indicators.has("storage/unauthenticated")
        || indicators.has("permission-denied")
        || indicators.has("permission_denied")
        || indicators.has("unauthorized")
    ) {
        return "Template storage is not available for this account.";
    }
    const localMessage = getTemplateRegistryLocalErrorMessage(error);
    if (localMessage) return localMessage;
    return fallback;
};

const throwTemplateRegistryError = (error: unknown, fallback: string): never => {
    throw new Error(getTemplateRegistryErrorMessage(error, fallback));
};

const readIndexRecords = (
    value: unknown,
    defaults?: { productId: string; sourceSurface: string },
): CreativeEditorTemplateRecord[] => {
    if (!isRecord(value)) return [];
    const items = Array.isArray(value.data)
        ? value.data
        : Array.isArray(value.templates)
            ? value.templates
            : [];
    return items.flatMap((item): CreativeEditorTemplateRecord[] => {
        if (
            !isRecord(item)
            || typeof item.id !== "string"
            || typeof item.title !== "string"
        ) {
            return [];
        }
        const productId = typeof item.productId === "string" ? item.productId : defaults?.productId;
        const sourceSurface = typeof item.sourceSurface === "string" ? item.sourceSurface : defaults?.sourceSurface;
        if (!productId || !sourceSurface) return [];
        return [{
            ...(item as CreativeEditorTemplateRecord),
            productId,
            sourceSurface,
        }];
    });
};

const sortRecords = (records: CreativeEditorTemplateRecord[]) => (
    [...records].sort((left, right) => (right.updatedAtMs || 0) - (left.updatedAtMs || 0))
);

const sortPlatformRecords = (records: CreativeEditorTemplateRecord[]) => (
    [...records].sort((left, right) => {
        const leftSort = typeof left.sortIndex === "number" ? left.sortIndex : Number.MAX_SAFE_INTEGER;
        const rightSort = typeof right.sortIndex === "number" ? right.sortIndex : Number.MAX_SAFE_INTEGER;
        if (leftSort !== rightSort) return leftSort - rightSort;
        return (right.updatedAtMs || 0) - (left.updatedAtMs || 0);
    })
);

const dedupePlatformRecords = (records: CreativeEditorTemplateRecord[]) => {
    const seen = new Set<string>();
    return records.filter((record) => {
        if (seen.has(record.id)) return false;
        seen.add(record.id);
        return true;
    });
};

const recordMatchesRequest = (
    record: CreativeEditorTemplateRecord,
    params: { assetTypeId?: string; productId: string; sourceSurface: string },
) => (
    record.productId === params.productId
    && record.sourceSurface === params.sourceSurface
    && (!params.assetTypeId || record.assetTypeId === params.assetTypeId)
);

const filterRecordsForRequest = (
    records: CreativeEditorTemplateRecord[],
    params: { assetTypeId?: string; productId: string; sourceSurface: string },
) => records.filter((record) => recordMatchesRequest(record, params));

const toPlatformRecord = (
    record: CreativeEditorTemplateRecord,
    businessCategory: string,
    params: { productId: string; sourceSurface: string },
): CreativeEditorPlatformTemplateRecord => ({
    ...record,
    businessCategory: record.businessCategory || businessCategory,
    productId: record.productId || params.productId,
    sourceSurface: record.sourceSurface || params.sourceSurface,
    templateType: "platform",
});

function toSummary(record: CreativeEditorTemplateRecord): CreativeEditorTemplateSummary {
    const templateType = record.templateType || record.origin || "user";
    return {
        assetTypeId: record.assetTypeId,
        businessCategory: record.businessCategory,
        createdAt: record.createdAt,
        description: record.description,
        documentPath: record.documentPath || null,
        height: record.height,
        id: record.id,
        origin: templateType,
        previewPath: record.previewPath || null,
        productId: record.productId,
        schemaVersion: record.schemaVersion,
        sourceSurface: record.sourceSurface,
        status: record.status,
        templateFamilyId: record.templateFamilyId,
        templateType,
        thumbnailUrl: record.thumbnailUrl || null,
        title: record.title,
        updatedAt: record.updatedAt,
        version: record.version,
        width: record.width,
    };
}

async function readStorageJson(path: string): Promise<unknown> {
    const payloadBlob = await getBlob(ref(firebaseStorage, path));
    if (payloadBlob.size > MAX_DOCUMENT_BYTES) {
        throwTemplateRegistryLocalError("TEMPLATE_DOCUMENT_TOO_LARGE");
    }
    const raw = await payloadBlob.text();
    return JSON.parse(raw) as unknown;
}

const readCreativeEditorDocument = async (path: string): Promise<CreativeEditorDocument> => (
    creativeEditorDocumentSchema.parse(await readStorageJson(path))
);

const isMissingStorageObjectError = (error: unknown): boolean => (
    Boolean(error)
    && typeof error === "object"
    && (error as { code?: unknown }).code === "storage/object-not-found"
);

const logTemplateStorageCleanupFailure = (
    error: unknown,
    path: string,
    context: TemplateStorageCleanupContext,
) => {
    logRuntimeFailure("creative_editor_template_storage_cleanup_failed", error, {
        cleanupTarget: context.cleanupTarget,
        templateOrigin: context.templateOrigin,
        ...getBoundedRuntimeStringContext("assetTypeId", context.assetTypeId),
        ...getBoundedRuntimeStringContext("businessCategory", context.businessCategory),
        ...getBoundedRuntimeStringContext("productId", context.productId),
        ...getBoundedRuntimeStringContext("sourceSurface", context.sourceSurface),
        ...getBoundedRuntimeStringContext("storagePath", path),
        ...getBoundedRuntimeStringContext("templateId", context.templateId),
    });
};

async function deleteStoragePath(path: string | null | undefined, context: TemplateStorageCleanupContext) {
    if (!path) return;
    if (
        !context.templateId
        || !isOwnedCreativeEditorTemplateStoragePath(path, {
            businessCategory: context.businessCategory,
            sId: context.sId,
            tId: context.tId,
            templateId: context.templateId,
            templateOrigin: context.templateOrigin,
        }, context.cleanupTarget)
    ) {
        logTemplateStorageCleanupFailure(
            new Error("Template Storage cleanup path ownership mismatch"),
            path,
            context,
        );
        return;
    }
    try {
        await deleteObject(ref(firebaseStorage, path));
    } catch (error) {
        if (isMissingStorageObjectError(error)) return;
        logTemplateStorageCleanupFailure(error, path, context);
    }
}

const getTemplateStoragePaths = (record: CreativeEditorTemplateRecord): string[] => (
    [record.documentPath, record.previewPath].filter((path): path is string => Boolean(path))
);

const getRetainedTemplateStoragePaths = (records: CreativeEditorTemplateRecord[]): Set<string> => (
    new Set(records.flatMap(getTemplateStoragePaths))
);

const dedupeTemplateCleanupRecords = (records: CreativeEditorTemplateRecord[]): CreativeEditorTemplateRecord[] => {
    const seen = new Set<string>();
    return records.filter((record) => {
        const key = `${record.id}:${record.documentPath || ""}:${record.previewPath || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

async function cleanupTemplateRecords(params: {
    records: CreativeEditorTemplateRecord[];
    retainedPaths?: Set<string>;
    scope?: CreativeEditorTemplateScope;
}) {
    const retainedPaths = params.retainedPaths || new Set<string>();
    await Promise.all(dedupeTemplateCleanupRecords(params.records).flatMap((record) => {
        const cleanupContext = {
            assetTypeId: record.assetTypeId,
            businessCategory: record.businessCategory,
            productId: record.productId,
            sId: params.scope?.sId,
            sourceSurface: record.sourceSurface,
            tId: params.scope?.tId,
            templateId: record.id,
            templateOrigin: (record.templateType || record.origin || "user") as "platform" | "user",
        };
        return [
            retainedPaths.has(record.documentPath || "")
                ? Promise.resolve()
                : deleteStoragePath(record.documentPath, { ...cleanupContext, cleanupTarget: "document" }),
            retainedPaths.has(record.previewPath || "")
                ? Promise.resolve()
                : deleteStoragePath(record.previewPath, { ...cleanupContext, cleanupTarget: "preview" }),
        ];
    }));
}

async function cleanupUploadedTemplateAttempt(params: {
    businessCategory?: string;
    paths: string[];
    scope?: CreativeEditorTemplateScope;
    templateId: string;
    templateOrigin: "platform" | "user";
}) {
    await Promise.all(params.paths.map((path) => deleteStoragePath(path, {
        businessCategory: params.businessCategory,
        cleanupTarget: path.split("/").pop()?.startsWith("document-") ? "document" : "preview",
        sId: params.scope?.sId,
        tId: params.scope?.tId,
        templateId: params.templateId,
        templateOrigin: params.templateOrigin,
    })));
}

const restoreCreationMetadata = <T extends {
    createdBy?: string;
    createdOn?: unknown;
}>(record: T, existing?: Partial<T> | null): T => {
    if (!existing) return record;
    return {
        ...record,
        ...(existing.createdBy !== undefined ? { createdBy: existing.createdBy } : {}),
        ...(existing.createdOn !== undefined ? { createdOn: existing.createdOn } : {}),
    };
};

function requireStoreScope(scope?: CreativeEditorTemplateScope | null): CreativeEditorTemplateScope {
    if (!scope?.tId || !scope?.sId) {
        throwTemplateRegistryLocalError("TEMPLATE_ACCOUNT_REQUIRED");
    }
    return scope;
}

async function listCreativeEditorPlatformTemplates(
    params: CreativeEditorTemplateListQuery,
): Promise<CreativeEditorTemplateSummary[]> {
    const requestedCategory = params.businessCategory || PLATFORM_TEMPLATE_GENERIC_CATEGORY;
    const catalog = await getDoc(getPlatformCatalogRef(requestedCategory));
    const catalogData = catalog.exists() ? catalog.data() as CreativeEditorPlatformCatalogRecord : null;
    const records = filterRecordsForRequest(
        readIndexRecords(catalogData, params)
            .map((record) => toPlatformRecord(record, requestedCategory, params)),
        params,
    );

    const sortedRecords = sortPlatformRecords(dedupePlatformRecords(records) as CreativeEditorPlatformTemplateRecord[])
        .filter((record) => (record.status || "published") === "published")
        .slice(0, params.limit)
        .map((record) => ({
            ...record,
            templateType: "platform" as const,
        }));
    return sortedRecords.map(toSummary);
}

async function listCreativeEditorUserTemplates(
    scope: CreativeEditorTemplateScope,
    params: CreativeEditorTemplateListQuery,
): Promise<CreativeEditorTemplateSummary[]> {
    const indexDoc = await getDoc(getStoreTemplateIndexRef(scope));
    if (!indexDoc.exists()) return [];
    const records = sortRecords(filterRecordsForRequest(readIndexRecords(indexDoc.data()), params))
        .filter((record) => (record.status || "published") !== "archived")
        .slice(0, params.limit)
        .map((record) => ({
            ...record,
            templateType: "user" as const,
        }));
    return records.map(toSummary);
}

async function listCreativeEditorTemplatesRaw(
    params: CreativeEditorTemplateContext & { limit?: number },
): Promise<CreativeEditorTemplateSummary[]> {
    const query = creativeEditorTemplateListQuerySchema.parse({
        ...params,
        limit: params.limit ?? 100,
        templateType: params.templateType ?? "user",
    }) as CreativeEditorTemplateListQuery;
    if (query.templateType === "platform") return listCreativeEditorPlatformTemplates(query);
    const scope = requireStoreScope(params.scope);
    if (query.templateType === "user") return listCreativeEditorUserTemplates(scope, query);
    const [platformTemplates, userTemplates] = await Promise.all([
        listCreativeEditorPlatformTemplates(query),
        listCreativeEditorUserTemplates(scope, query),
    ]);
    return [...platformTemplates, ...userTemplates].slice(0, query.limit);
}

export async function listCreativeEditorTemplates(
    params: CreativeEditorTemplateContext & { limit?: number },
): Promise<CreativeEditorTemplateSummary[]> {
    return listCreativeEditorTemplatesRaw(params);
}

export async function listCreativeEditorPlatformTemplateCatalog(params: {
    businessCategory?: string;
    includeArchived?: boolean;
    limit?: number;
}): Promise<CreativeEditorTemplateSummary[]> {
    try {
        const businessCategory = buildPlatformCategoryKey(params.businessCategory);
        const requestMatch = {
            productId: "menulist",
            sourceSurface: "printable-asset-templates",
        };
        const catalog = await getDoc(getPlatformCatalogRef(businessCategory));
        const catalogData = catalog.exists() ? catalog.data() as CreativeEditorPlatformCatalogRecord : null;
        const records = readIndexRecords(catalogData, {
            productId: requestMatch.productId,
            sourceSurface: requestMatch.sourceSurface,
        }).map((record) => toPlatformRecord(record, businessCategory, {
            productId: record.productId || "menulist",
            sourceSurface: record.sourceSurface || "printable-asset-templates",
        })).filter((record) => recordMatchesRequest(record, requestMatch));
        const filteredRecords = params.includeArchived
            ? records
            : records.filter((record) => (record.status || "published") !== "archived");
        return sortPlatformRecords(dedupePlatformRecords(filteredRecords))
            .slice(0, params.limit || MAX_PLATFORM_INDEX_TEMPLATES)
            .map(toSummary);
    } catch (error) {
        throwTemplateRegistryError(error, "Platform templates could not be loaded");
    }
}

async function getCreativeEditorPlatformTemplate(
    params: CreativeEditorTemplateGetQuery & { templateId: string },
): Promise<{ document: CreativeEditorDocument; template: CreativeEditorTemplateSummary } | null> {
    const requestedCategory = params.businessCategory || PLATFORM_TEMPLATE_GENERIC_CATEGORY;
    const catalog = await getDoc(getPlatformCatalogRef(requestedCategory));
    if (!catalog.exists()) return null;
    const match = readIndexRecords(catalog.data(), params)
        .find((item) => item.id === params.templateId && recordMatchesRequest(item, params));
    const record = match ? toPlatformRecord(match, requestedCategory, params) : undefined;
    if (
        !record
        || (!params.includeUnpublished && (record.status || "published") !== "published")
        || !record.documentPath
        || !isOwnedCreativeEditorTemplateStoragePath(record.documentPath, {
            businessCategory: record.businessCategory || requestedCategory,
            templateId: record.id,
            templateOrigin: "platform",
        }, "document")
    ) return null;
    const document = await readCreativeEditorDocument(record.documentPath);
    return {
        document,
        template: toSummary(record),
    };
}

async function getCreativeEditorUserTemplate(
    scope: CreativeEditorTemplateScope,
    params: CreativeEditorTemplateGetQuery & { templateId: string },
): Promise<{ document: CreativeEditorDocument; template: CreativeEditorTemplateSummary } | null> {
    const indexDoc = await getDoc(getStoreTemplateIndexRef(scope));
    if (!indexDoc.exists()) return null;
    const record = readIndexRecords(indexDoc.data())
        .find((item) => item.id === params.templateId && recordMatchesRequest(item, params));
    if (
        !record
        || !record.documentPath
        || !isOwnedCreativeEditorTemplateStoragePath(record.documentPath, {
            sId: scope.sId,
            tId: scope.tId,
            templateId: record.id,
            templateOrigin: "user",
        }, "document")
    ) return null;
    const document = await readCreativeEditorDocument(record.documentPath);
    return {
        document,
        template: toSummary({ ...record, templateType: "user" }),
    };
}

async function getCreativeEditorTemplateRaw(params: CreativeEditorTemplateContext & { templateId: string }): Promise<{
    document: CreativeEditorDocument;
    template: CreativeEditorTemplateSummary;
}> {
    const query = creativeEditorTemplateGetQuerySchema.parse({
        ...params,
        templateType: params.templateType ?? "user",
    }) as CreativeEditorTemplateGetQuery;
    const result = query.templateType === "platform"
        ? await getCreativeEditorPlatformTemplate({ ...query, templateId: params.templateId })
        : await getCreativeEditorUserTemplate(requireStoreScope(params.scope), { ...query, templateId: params.templateId });
    if (!result) throwTemplateRegistryLocalError("TEMPLATE_NOT_FOUND");
    return result;
}

export async function getCreativeEditorTemplate(params: CreativeEditorTemplateContext & { templateId: string }): Promise<{
    document: CreativeEditorDocument;
    template: CreativeEditorTemplateSummary;
}> {
    try {
        const result = await getCreativeEditorTemplateRaw(params);
        if (!isRecord(result) || !isRecord(result.document) || !isRecord(result.template)) {
            throwTemplateRegistryLocalError("TEMPLATE_NOT_FOUND");
        }
        return result as {
            document: CreativeEditorDocument;
            template: CreativeEditorTemplateSummary;
        };
    } catch (error) {
        throwTemplateRegistryError(error, "Template could not be opened");
    }
}

async function saveCreativeEditorTemplateRaw(
    params: CreativeEditorTemplateSaveParams,
): Promise<CreativeEditorTemplateSummary> {
    const input = creativeEditorTemplateSaveSchema.parse(params) as unknown as CreativeEditorTemplateSaveParams;
    const scope = requireStoreScope(params.scope);
    const templateId = input.templateId || buildTemplateId();
    const documentValue: CreativeEditorDocument = {
        ...input.document,
        metadata: {
            ...input.document.metadata,
            templateId,
            updatedAt: new Date().toISOString(),
        },
        title: input.title,
    } as CreativeEditorDocument;
    const documentJson = JSON.stringify(documentValue);
    const documentBytes = new TextEncoder().encode(documentJson).length;
    if (documentBytes > MAX_DOCUMENT_BYTES) {
        throwTemplateRegistryLocalError("TEMPLATE_DOCUMENT_TOO_LARGE");
    }

    const session = await getActiveSession();
    const indexRef = getStoreTemplateIndexRef(scope);
    const now = new Date();
    const nowIso = now.toISOString();
    const nowMs = now.getTime();
    const versionId = buildCreativeEditorTemplateVersionId(createRandomIdSegment(16));
    const documentPath = buildUserDocumentPath(scope, { templateId, versionId });
    const requestMatch = {
        assetTypeId: input.assetTypeId,
        productId: input.productId,
        sourceSurface: input.sourceSurface,
        templateId,
    };
    const uploadedPaths: string[] = [];
    let uploadedPreviewPath: string | null = null;
    let uploadedThumbnailUrl: string | null = null;
    let persistenceAttempted = false;
    const previewContentType = parseDataUrlContentType(input.thumbnailDataUrl);
    try {
        uploadedPaths.push(documentPath);
        await uploadString(ref(firebaseStorage, documentPath), documentJson, "raw", {
            cacheControl: "private, max-age=31536000, immutable",
            contentType: "application/json",
        });
        if (input.thumbnailDataUrl && previewContentType) {
            uploadedPreviewPath = buildUserPreviewPath(scope, {
                templateId,
                thumbnailDataUrl: input.thumbnailDataUrl,
                versionId,
            });
            uploadedPaths.push(uploadedPreviewPath);
            const previewRef = ref(firebaseStorage, uploadedPreviewPath);
            await uploadString(previewRef, input.thumbnailDataUrl, "data_url", {
                cacheControl: "private, max-age=31536000, immutable",
                contentType: previewContentType,
            });
            uploadedThumbnailUrl = await getDownloadURL(previewRef);
        }

        persistenceAttempted = true;
        const committed = await runTransaction(firebaseClient, async (transaction) => {
            const indexDoc = await transaction.get(indexRef);
            const existingIndex = indexDoc.exists()
                ? indexDoc.data() as Partial<CreativeEditorStoreTemplateIndexRecord>
                : null;
            const existingRecords = readIndexRecords(existingIndex);
            const existingRecord = existingRecords.find((record) => (
                matchesCreativeEditorTemplateRecord(record, requestMatch)
            ));
            const previewPath = uploadedPreviewPath || existingRecord?.previewPath || null;
            const thumbnailUrl = uploadedThumbnailUrl || existingRecord?.thumbnailUrl || null;
            const composedRecord = composeRequestBody({
                assetTypeId: input.assetTypeId,
                createdAt: existingRecord?.createdAt || nowIso,
                createdAtMs: existingRecord?.createdAtMs || nowMs,
                description: existingRecord?.description,
                documentBytes,
                documentPath,
                documentStorage: "storage" as const,
                elementCount: documentValue.elements.length,
                height: documentValue.canvas.height,
                id: templateId,
                origin: "user" as const,
                previewPath,
                previewStorage: previewPath ? "storage" as const : undefined,
                productId: input.productId,
                schemaVersion: 2,
                sId: scope.sId,
                sourceSurface: input.sourceSurface,
                status: "published" as const,
                templateFamilyId: input.templateFamilyId,
                templateType: "user" as const,
                thumbnailUrl,
                title: input.title,
                tId: scope.tId,
                updatedAt: nowIso,
                updatedAtMs: nowMs,
                version: (existingRecord?.version || 0) + 1,
                width: documentValue.canvas.width,
            }, session, { isNew: !existingRecord }) as CreativeEditorTemplateRecord;
            const record = restoreCreationMetadata(composedRecord, existingRecord);
            const mutation = upsertCreativeEditorTemplateRecord({
                limit: MAX_INDEX_TEMPLATES,
                mode: "user",
                record,
                records: existingRecords,
                scope: requestMatch,
            });
            const composedIndex = composeRequestBody({
                data: mutation.records,
                id: STORE_TEMPLATE_DOC_ID,
                schemaVersion: 2,
                sId: scope.sId,
                tId: scope.tId,
                updatedAt: nowIso,
                updatedAtMs: nowMs,
            }, session, { isNew: !existingIndex }) as CreativeEditorStoreTemplateIndexRecord;
            const indexRecord = restoreCreationMetadata(composedIndex, existingIndex);
            transaction.set(indexRef, indexRecord);
            return {
                cleanupRecords: [
                    ...(mutation.replaced ? [mutation.replaced] : []),
                    ...mutation.evicted,
                ],
                record,
                retainedRecords: mutation.records,
            };
        });

        await cleanupTemplateRecords({
            records: committed.cleanupRecords,
            retainedPaths: getRetainedTemplateStoragePaths(committed.retainedRecords),
            scope,
        });
        return toSummary(committed.record);
    } catch (error) {
        if (!persistenceAttempted) {
            await cleanupUploadedTemplateAttempt({
                paths: uploadedPaths,
                scope,
                templateId,
                templateOrigin: "user",
            });
            throw error;
        }

        try {
            const probe = await getDoc(indexRef);
            const committedRecord = probe.exists()
                ? readIndexRecords(probe.data()).find((record) => (
                    matchesCreativeEditorTemplateRecord(record, requestMatch)
                    && record.documentPath === documentPath
                ))
                : undefined;
            if (committedRecord) return toSummary(committedRecord);
            await cleanupUploadedTemplateAttempt({
                paths: uploadedPaths,
                scope,
                templateId,
                templateOrigin: "user",
            });
        } catch (probeError) {
            logRuntimeFailure("creative_editor_template_ambiguous_user_save_retained", probeError, {
                ...getBoundedRuntimeStringContext("templateId", templateId),
                ...getBoundedRuntimeStringContext("tId", scope.tId),
                ...getBoundedRuntimeStringContext("sId", scope.sId),
            });
        }
        throw error;
    }
}

export async function saveCreativeEditorTemplate(
    params: CreativeEditorTemplateSaveParams,
): Promise<CreativeEditorTemplateSummary> {
    try {
        const result = await saveCreativeEditorTemplateRaw(params);
        if (!isRecord(result) || typeof result.id !== "string") {
            throwTemplateRegistryLocalError("TEMPLATE_SAVE_FAILED");
        }
        return result as unknown as CreativeEditorTemplateSummary;
    } catch (error) {
        throwTemplateRegistryError(error, "Template could not be saved");
    }
}

async function saveCreativeEditorPlatformTemplateRaw(
    params: CreativeEditorPlatformTemplateSaveParams,
): Promise<CreativeEditorTemplateSummary> {
    const input = creativeEditorTemplateSaveSchema.parse({
        ...params,
        templateType: "platform",
    }) as unknown as CreativeEditorPlatformTemplateSaveParams;
    const businessCategory = buildPlatformCategoryKey(params.businessCategory);
    const templateId = input.templateId || buildTemplateId();
    const documentValue: CreativeEditorDocument = {
        ...input.document,
        metadata: {
            ...input.document.metadata,
            templateId,
            updatedAt: new Date().toISOString(),
        },
        productContext: {
            ...input.document.productContext,
            productId: input.productId,
            sourceSurface: input.sourceSurface,
        },
        title: input.title,
    } as CreativeEditorDocument;
    const documentJson = JSON.stringify(documentValue);
    const documentBytes = getDocumentBytes(documentJson);
    if (documentBytes > MAX_DOCUMENT_BYTES) {
        throwTemplateRegistryLocalError("TEMPLATE_DOCUMENT_TOO_LARGE");
    }

    const session = await getActiveSession();
    const now = new Date();
    const nowIso = now.toISOString();
    const nowMs = now.getTime();
    const requestMatch = {
        assetTypeId: input.assetTypeId,
        productId: input.productId,
        sourceSurface: input.sourceSurface,
        templateId,
    };
    const versionId = buildCreativeEditorTemplateVersionId(createRandomIdSegment(16));
    const documentPath = buildPlatformDocumentPath({ businessCategory, templateId, versionId });
    const uploadedPaths: string[] = [];
    let uploadedPreviewPath: string | null = null;
    let uploadedThumbnailUrl: string | null = null;
    let persistenceAttempted = false;
    const previewContentType = parseDataUrlContentType(input.thumbnailDataUrl);
    const catalogKeys = getPlatformCatalogKeysForMutation(businessCategory);
    const catalogRefs = catalogKeys.map((catalogKey) => getPlatformCatalogRef(catalogKey));
    const sourceCatalogIndex = catalogKeys.indexOf(businessCategory);

    try {
        uploadedPaths.push(documentPath);
        await uploadString(ref(firebaseStorage, documentPath), documentJson, "raw", {
            cacheControl: "private, max-age=31536000, immutable",
            contentType: "application/json",
        });
        if (input.thumbnailDataUrl && previewContentType) {
            uploadedPreviewPath = buildPlatformPreviewPath({
                businessCategory,
                templateId,
                thumbnailDataUrl: input.thumbnailDataUrl,
                versionId,
            });
            uploadedPaths.push(uploadedPreviewPath);
            const previewRef = ref(firebaseStorage, uploadedPreviewPath);
            await uploadString(previewRef, input.thumbnailDataUrl, "data_url", {
                cacheControl: "private, max-age=31536000, immutable",
                contentType: previewContentType,
            });
            uploadedThumbnailUrl = await getDownloadURL(previewRef);
        }

        persistenceAttempted = true;
        const committed = await runTransaction(firebaseClient, async (transaction) => {
            const snapshots = await Promise.all(catalogRefs.map((catalogRef) => transaction.get(catalogRef)));
            const catalogs = snapshots.map((snapshot) => (
                snapshot.exists() ? snapshot.data() as CreativeEditorPlatformCatalogRecord : null
            ));
            const recordsByCatalog = catalogs.map((catalog) => readIndexRecords(catalog, {
                productId: input.productId,
                sourceSurface: input.sourceSurface,
            }));
            const sourceRecords = recordsByCatalog[sourceCatalogIndex] || [];
            const existingRecord = sourceRecords.find((record) => (
                matchesCreativeEditorTemplateRecord(record, requestMatch)
            ));
            const previewPath = uploadedPreviewPath || existingRecord?.previewPath || null;
            const thumbnailUrl = uploadedThumbnailUrl || existingRecord?.thumbnailUrl || null;
            const sortIndex = typeof existingRecord?.sortIndex === "number"
                ? existingRecord.sortIndex
                : sourceRecords.length;
            const composedRecord = composeRequestBody({
                assetTypeId: input.assetTypeId,
                businessCategory,
                createdAt: existingRecord?.createdAt || nowIso,
                createdAtMs: existingRecord?.createdAtMs || nowMs,
                description: input.description ?? existingRecord?.description,
                documentBytes,
                documentPath,
                documentStorage: "storage" as const,
                elementCount: documentValue.elements.length,
                height: documentValue.canvas.height,
                id: templateId,
                origin: "platform" as const,
                previewPath,
                previewStorage: previewPath ? "storage" as const : undefined,
                productId: input.productId,
                schemaVersion: 2,
                sortIndex,
                sourceSurface: input.sourceSurface,
                status: input.status || existingRecord?.status || "draft",
                templateFamilyId: input.templateFamilyId,
                templateType: "platform" as const,
                thumbnailUrl,
                title: input.title,
                updatedAt: nowIso,
                updatedAtMs: nowMs,
                version: (existingRecord?.version || 0) + 1,
                width: documentValue.canvas.width,
            }, session, { isNew: !existingRecord }) as CreativeEditorTemplateRecord;
            const record = restoreCreationMetadata(composedRecord, existingRecord);
            const cleanupRecords: CreativeEditorTemplateRecord[] = [];
            const retainedRecords: CreativeEditorTemplateRecord[] = [];

            recordsByCatalog.forEach((existingRecords, index) => {
                const mutation = upsertCreativeEditorTemplateRecord({
                    limit: MAX_PLATFORM_INDEX_TEMPLATES,
                    mode: "platform",
                    record,
                    records: existingRecords,
                    scope: requestMatch,
                });
                if (mutation.replaced) cleanupRecords.push(mutation.replaced);
                cleanupRecords.push(...mutation.evicted.filter((evicted) => (
                    businessCategory === PLATFORM_TEMPLATE_GENERIC_CATEGORY
                    || buildPlatformCategoryKey(evicted.businessCategory) !== PLATFORM_TEMPLATE_GENERIC_CATEGORY
                )));
                retainedRecords.push(...mutation.records);
                transaction.set(catalogRefs[index], {
                    businessCategory: catalogKeys[index],
                    data: mutation.records,
                    schemaVersion: 2,
                    updatedAt: nowIso,
                    updatedAtMs: nowMs,
                } satisfies CreativeEditorPlatformCatalogRecord);
            });

            return { cleanupRecords, record, retainedRecords };
        });

        await cleanupTemplateRecords({
            records: committed.cleanupRecords,
            retainedPaths: getRetainedTemplateStoragePaths(committed.retainedRecords),
        });
        return toSummary(committed.record);
    } catch (error) {
        if (!persistenceAttempted) {
            await cleanupUploadedTemplateAttempt({
                businessCategory,
                paths: uploadedPaths,
                templateId,
                templateOrigin: "platform",
            });
            throw error;
        }

        try {
            const probe = await getDoc(getPlatformCatalogRef(businessCategory));
            const committedRecord = probe.exists()
                ? readIndexRecords(probe.data(), {
                    productId: input.productId,
                    sourceSurface: input.sourceSurface,
                }).find((record) => (
                    matchesCreativeEditorTemplateRecord(record, requestMatch)
                    && record.documentPath === documentPath
                ))
                : undefined;
            if (committedRecord) return toSummary(committedRecord);
            await cleanupUploadedTemplateAttempt({
                businessCategory,
                paths: uploadedPaths,
                templateId,
                templateOrigin: "platform",
            });
        } catch (probeError) {
            logRuntimeFailure("creative_editor_template_ambiguous_platform_save_retained", probeError, {
                ...getBoundedRuntimeStringContext("businessCategory", businessCategory),
                ...getBoundedRuntimeStringContext("templateId", templateId),
            });
        }
        throw error;
    }
}

export async function saveCreativeEditorPlatformTemplate(
    params: CreativeEditorPlatformTemplateSaveParams,
): Promise<CreativeEditorTemplateSummary> {
    try {
        const result = await saveCreativeEditorPlatformTemplateRaw(params);
        if (!isRecord(result) || typeof result.id !== "string") {
            throwTemplateRegistryLocalError("PLATFORM_TEMPLATE_SAVE_FAILED");
        }
        return result as CreativeEditorTemplateSummary;
    } catch (error) {
        throwTemplateRegistryError(error, "Platform template could not be saved");
    }
}

async function updateCreativeEditorPlatformTemplateMetadataRaw(
    params: CreativeEditorPlatformTemplateMetadataParams,
): Promise<CreativeEditorTemplateSummary> {
    const query = creativeEditorTemplateGetQuerySchema.parse({
        ...params,
        templateType: "platform",
    }) as CreativeEditorTemplateGetQuery;
    const session = await getActiveSession();
    const businessCategory = buildPlatformCategoryKey(params.businessCategory);
    const now = new Date();
    const nowIso = now.toISOString();
    const nowMs = now.getTime();
    const sourceCatalogRef = getPlatformCatalogRef(businessCategory);
    try {
        const committed = await runTransaction(firebaseClient, async (transaction) => {
            const sourceSnapshot = await transaction.get(sourceCatalogRef);
            const sourceRecords = sourceSnapshot.exists()
                ? readIndexRecords(sourceSnapshot.data(), query)
                : [];
            const sourceRecord = sourceRecords.find((record) => (
                record.id === params.templateId
                && recordMatchesRequest(record, query)
            ));
            if (!sourceRecord) throwTemplateRegistryLocalError("TEMPLATE_NOT_FOUND");

            const templateBusinessCategory = buildPlatformCategoryKey(
                sourceRecord.businessCategory || businessCategory,
            );
            const catalogKeys = getPlatformCatalogKeysForMutation(templateBusinessCategory);
            const additionalKeys = catalogKeys.filter((catalogKey) => catalogKey !== businessCategory);
            const additionalRefs = additionalKeys.map((catalogKey) => getPlatformCatalogRef(catalogKey));
            const additionalSnapshots = await Promise.all(
                additionalRefs.map((catalogRef) => transaction.get(catalogRef)),
            );
            const recordsByKey = new Map<string, CreativeEditorTemplateRecord[]>([[businessCategory, sourceRecords]]);
            additionalSnapshots.forEach((snapshot, index) => {
                recordsByKey.set(
                    additionalKeys[index],
                    snapshot.exists() ? readIndexRecords(snapshot.data(), query) : [],
                );
            });

            const authoritativeRecord = recordsByKey.get(templateBusinessCategory)?.find((record) => (
                record.id === params.templateId
                && recordMatchesRequest(record, query)
            )) || sourceRecord;
            const composedRecord = composeRequestBody({
                ...authoritativeRecord,
                description: params.description ?? authoritativeRecord.description,
                status: params.status || authoritativeRecord.status || "draft",
                templateFamilyId: params.templateFamilyId ?? authoritativeRecord.templateFamilyId,
                title: params.title ?? authoritativeRecord.title,
                updatedAt: nowIso,
                updatedAtMs: nowMs,
                version: (authoritativeRecord.version || 0) + 1,
            }, session, { isNew: false }) as CreativeEditorTemplateRecord;
            const record = restoreCreationMetadata(composedRecord, authoritativeRecord);
            const recordScope = {
                assetTypeId: query.assetTypeId,
                productId: query.productId,
                sourceSurface: query.sourceSurface,
                templateId: params.templateId,
            };
            const cleanupRecords: CreativeEditorTemplateRecord[] = [];
            const retainedRecords: CreativeEditorTemplateRecord[] = [];
            catalogKeys.forEach((catalogKey) => {
                const mutation = upsertCreativeEditorTemplateRecord({
                    limit: MAX_PLATFORM_INDEX_TEMPLATES,
                    mode: "platform",
                    record,
                    records: recordsByKey.get(catalogKey) || [],
                    scope: recordScope,
                });
                cleanupRecords.push(...mutation.evicted);
                retainedRecords.push(...mutation.records);
                transaction.set(getPlatformCatalogRef(catalogKey), {
                    businessCategory: catalogKey,
                    data: mutation.records,
                    schemaVersion: 2,
                    updatedAt: nowIso,
                    updatedAtMs: nowMs,
                } satisfies CreativeEditorPlatformCatalogRecord);
            });
            return { cleanupRecords, record, retainedRecords };
        });
        await cleanupTemplateRecords({
            records: committed.cleanupRecords,
            retainedPaths: getRetainedTemplateStoragePaths(committed.retainedRecords),
        });
        return toSummary(committed.record);
    } catch (error) {
        if (isTemplateRegistryLocalError(error, "TEMPLATE_NOT_FOUND")) throw error;
        try {
            const probe = await getDoc(sourceCatalogRef);
            const committedRecord = probe.exists()
                ? readIndexRecords(probe.data(), query).find((record) => (
                    record.id === params.templateId
                    && recordMatchesRequest(record, query)
                    && record.updatedAtMs === nowMs
                ))
                : undefined;
            if (committedRecord) return toSummary(committedRecord);
        } catch (probeError) {
            logRuntimeFailure("creative_editor_template_ambiguous_metadata_update", probeError, {
                ...getBoundedRuntimeStringContext("businessCategory", businessCategory),
                ...getBoundedRuntimeStringContext("templateId", params.templateId),
            });
        }
        throw error;
    }
}

export async function updateCreativeEditorPlatformTemplateMetadata(
    params: CreativeEditorPlatformTemplateMetadataParams,
): Promise<CreativeEditorTemplateSummary> {
    try {
        return await updateCreativeEditorPlatformTemplateMetadataRaw(params);
    } catch (error) {
        throwTemplateRegistryError(error, "Platform template could not be updated");
    }
}

async function deleteCreativeEditorTemplateRaw(params: CreativeEditorTemplateContext & { templateId: string }): Promise<void> {
    const query = creativeEditorTemplateGetQuerySchema.parse({
        ...params,
        templateType: "user",
    }) as CreativeEditorTemplateGetQuery;
    const scope = requireStoreScope(params.scope);
    const session = await getActiveSession();
    const indexRef = getStoreTemplateIndexRef(scope);
    const now = new Date();
    const nowIso = now.toISOString();
    const nowMs = now.getTime();
    const recordScope = {
        assetTypeId: query.assetTypeId,
        productId: query.productId,
        sourceSurface: query.sourceSurface,
        templateId: params.templateId,
    };
    let candidateRecord: CreativeEditorTemplateRecord | undefined;
    try {
        const record = await runTransaction(firebaseClient, async (transaction) => {
            const indexDoc = await transaction.get(indexRef);
            if (!indexDoc.exists()) throwTemplateRegistryLocalError("TEMPLATE_NOT_FOUND");
            const currentIndex = indexDoc.data() as Partial<CreativeEditorStoreTemplateIndexRecord>;
            const mutation = removeCreativeEditorTemplateRecord({
                records: readIndexRecords(currentIndex),
                scope: recordScope,
            });
            if (!mutation.removed) throwTemplateRegistryLocalError("TEMPLATE_NOT_FOUND");
            candidateRecord = mutation.removed;
            const composedIndex = composeRequestBody({
                data: mutation.records,
                id: STORE_TEMPLATE_DOC_ID,
                schemaVersion: 2,
                sId: scope.sId,
                tId: scope.tId,
                updatedAt: nowIso,
                updatedAtMs: nowMs,
            }, session, { isNew: false }) as CreativeEditorStoreTemplateIndexRecord;
            transaction.set(indexRef, restoreCreationMetadata(composedIndex, currentIndex));
            return mutation.removed;
        });
        await cleanupTemplateRecords({ records: [record], scope });
    } catch (error) {
        if (isTemplateRegistryLocalError(error, "TEMPLATE_NOT_FOUND")) throw error;
        try {
            const probe = await getDoc(indexRef);
            const stillPresent = probe.exists()
                && readIndexRecords(probe.data()).some((record) => (
                    matchesCreativeEditorTemplateRecord(record, recordScope)
                ));
            if (!stillPresent) {
                if (candidateRecord) await cleanupTemplateRecords({ records: [candidateRecord], scope });
                return;
            }
        } catch (probeError) {
            logRuntimeFailure("creative_editor_template_ambiguous_user_delete_retained", probeError, {
                ...getBoundedRuntimeStringContext("templateId", params.templateId),
                ...getBoundedRuntimeStringContext("tId", scope.tId),
                ...getBoundedRuntimeStringContext("sId", scope.sId),
            });
        }
        throw error;
    }
}

export async function deleteCreativeEditorTemplate(params: CreativeEditorTemplateContext & { templateId: string }): Promise<void> {
    try {
        await deleteCreativeEditorTemplateRaw(params);
    } catch (error) {
        throwTemplateRegistryError(error, "Template could not be deleted");
    }
}

async function deleteCreativeEditorPlatformTemplateRaw(params: CreativeEditorTemplateContext & { templateId: string }): Promise<void> {
    const query = creativeEditorTemplateGetQuerySchema.parse({
        ...params,
        templateType: "platform",
    }) as CreativeEditorTemplateGetQuery;
    const businessCategory = buildPlatformCategoryKey(params.businessCategory);
    const now = new Date();
    const nowIso = now.toISOString();
    const nowMs = now.getTime();
    const sourceCatalogRef = getPlatformCatalogRef(businessCategory);
    const recordScope = {
        assetTypeId: query.assetTypeId,
        productId: query.productId,
        sourceSurface: query.sourceSurface,
        templateId: params.templateId,
    };
    let candidateRecords: CreativeEditorTemplateRecord[] = [];
    try {
        const removedRecords = await runTransaction(firebaseClient, async (transaction) => {
            const sourceSnapshot = await transaction.get(sourceCatalogRef);
            const sourceRecords = sourceSnapshot.exists()
                ? readIndexRecords(sourceSnapshot.data(), query)
                : [];
            const sourceMutation = removeCreativeEditorTemplateRecord({
                records: sourceRecords,
                scope: recordScope,
            });
            if (!sourceMutation.removed) throwTemplateRegistryLocalError("TEMPLATE_NOT_FOUND");
            const templateBusinessCategory = buildPlatformCategoryKey(
                sourceMutation.removed.businessCategory || businessCategory,
            );
            const catalogKeys = getPlatformCatalogKeysForMutation(templateBusinessCategory);
            const additionalKeys = catalogKeys.filter((catalogKey) => catalogKey !== businessCategory);
            const additionalRefs = additionalKeys.map((catalogKey) => getPlatformCatalogRef(catalogKey));
            const additionalSnapshots = await Promise.all(
                additionalRefs.map((catalogRef) => transaction.get(catalogRef)),
            );
            const recordsByKey = new Map<string, CreativeEditorTemplateRecord[]>([[businessCategory, sourceRecords]]);
            additionalSnapshots.forEach((snapshot, index) => {
                recordsByKey.set(
                    additionalKeys[index],
                    snapshot.exists() ? readIndexRecords(snapshot.data(), query) : [],
                );
            });

            const removed: CreativeEditorTemplateRecord[] = [];
            catalogKeys.forEach((catalogKey) => {
                const mutation = removeCreativeEditorTemplateRecord({
                    records: recordsByKey.get(catalogKey) || [],
                    scope: recordScope,
                });
                if (!mutation.removed) return;
                removed.push(mutation.removed);
                transaction.set(getPlatformCatalogRef(catalogKey), {
                    businessCategory: catalogKey,
                    data: sortPlatformRecords(mutation.records).slice(0, MAX_PLATFORM_INDEX_TEMPLATES),
                    schemaVersion: 2,
                    updatedAt: nowIso,
                    updatedAtMs: nowMs,
                } satisfies CreativeEditorPlatformCatalogRecord);
            });
            candidateRecords = removed;
            return removed;
        });
        await cleanupTemplateRecords({ records: removedRecords });
    } catch (error) {
        if (isTemplateRegistryLocalError(error, "TEMPLATE_NOT_FOUND")) throw error;
        try {
            const probe = await getDoc(sourceCatalogRef);
            const stillPresent = probe.exists()
                && readIndexRecords(probe.data(), query).some((record) => (
                    matchesCreativeEditorTemplateRecord(record, recordScope)
            ));
            if (!stillPresent) {
                if (candidateRecords.length > 0) {
                    await cleanupTemplateRecords({ records: candidateRecords });
                }
                return;
            }
        } catch (probeError) {
            logRuntimeFailure("creative_editor_template_ambiguous_platform_delete_retained", probeError, {
                ...getBoundedRuntimeStringContext("businessCategory", businessCategory),
                ...getBoundedRuntimeStringContext("templateId", params.templateId),
            });
        }
        throw error;
    }
}

export async function deleteCreativeEditorPlatformTemplate(params: CreativeEditorTemplateContext & { templateId: string }): Promise<void> {
    try {
        await deleteCreativeEditorPlatformTemplateRaw(params);
    } catch (error) {
        throwTemplateRegistryError(error, "Platform template could not be deleted");
    }
}
