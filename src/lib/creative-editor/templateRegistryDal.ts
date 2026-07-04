import {
    doc,
    getDoc,
    setDoc,
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
import { requestBodyComposer } from "@lib/apiHelper";
import { firebaseClient, firebaseStorage } from "@lib/firebase/firebaseClient";
import { createRandomIdSegment } from "@lib/runtime/randomId";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import type { CreativeEditorDocument, CreativeEditorTemplateOrigin, CreativeEditorTemplateSummary } from "@/modules/creative-editor/types";
import {
    creativeEditorTemplateGetQuerySchema,
    creativeEditorTemplateListQuerySchema,
    creativeEditorTemplateSaveSchema,
    type CreativeEditorTemplateGetQuery,
    type CreativeEditorTemplateListQuery,
} from "@lib/validation/creativeEditorTemplateSchemas";

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

export type CreativeEditorTemplateScope = {
    sId: string;
    tId: string;
};

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
    sourceSurface?: string;
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
    sId?: string;
    sourceSurface: string;
    status?: "draft" | "published" | "archived";
    templateFamilyId?: string;
    templateType: CreativeEditorTemplateOrigin;
    thumbnailUrl?: string | null;
    title: string;
    tId?: string;
    modifiedBy?: string;
    modifiedOn?: unknown;
    sortIndex?: number;
    updatedAt: string;
    updatedAtMs: number;
    uId?: string;
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
    sId?: string;
    tId?: string;
    updatedAt: string;
    updatedAtMs: number;
    uId?: string;
};

type CreativeEditorPlatformCatalogRecord = {
    businessCategory: string;
    data?: CreativeEditorTemplateRecord[];
    schemaVersion: number;
    templates?: CreativeEditorTemplateRecord[];
    updatedAt?: string;
    updatedAtMs?: number;
};

type PlatformCatalogMutationSnapshot = {
    catalogKey: string;
    exists: boolean;
    records: CreativeEditorTemplateRecord[];
};

type PlatformTemplateMutationTarget = {
    catalogKeys: string[];
    sourceCatalogKey: string;
    sourceRecord: CreativeEditorTemplateRecord;
    sourceSnapshot: PlatformCatalogMutationSnapshot;
    templateBusinessCategory: string;
};

export const resolveCreativeEditorTemplateScope = (input: {
    session?: any;
    storeDetails?: any;
}): CreativeEditorTemplateScope | null => {
    const tId = input.storeDetails?.tenantId
        ?? input.storeDetails?.tId
        ?? input.session?.tId
        ?? input.session?.user?.tenantId;
    const sId = input.storeDetails?.storeId
        ?? input.storeDetails?.sId
        ?? input.session?.sId
        ?? input.session?.user?.storeId;
    if (tId == null || sId == null) return null;
    return {
        sId: String(sId),
        tId: String(tId),
    };
};

const safePathPart = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100) || "_";

const buildPlatformCategoryKey = (businessCategory?: string) => (
    safePathPart(businessCategory || PLATFORM_TEMPLATE_GENERIC_CATEGORY)
);

const getPlatformCatalogKeysForMutation = (businessCategory: string) => (
    businessCategory === PLATFORM_TEMPLATE_GENERIC_CATEGORY
        ? PLATFORM_TEMPLATE_CATALOG_KEYS
        : [businessCategory]
);

const readPlatformCatalogMutationSnapshot = async (
    catalogKey: string,
    query: { productId: string; sourceSurface: string },
): Promise<PlatformCatalogMutationSnapshot> => {
    const catalogDoc = await getDoc(getPlatformCatalogRef(catalogKey));
    return {
        catalogKey,
        exists: catalogDoc.exists(),
        records: catalogDoc.exists() ? readIndexRecords(catalogDoc.data(), query) : [],
    };
};

const findPlatformTemplateMutationTarget = async (params: {
    businessCategory: string;
    query: CreativeEditorTemplateGetQuery;
    templateId: string;
}): Promise<PlatformTemplateMutationTarget> => {
    const sourceCatalogKey = buildPlatformCategoryKey(params.businessCategory);
    const sourceSnapshot = await readPlatformCatalogMutationSnapshot(sourceCatalogKey, params.query);
    const sourceRecord = sourceSnapshot.records.find((record) => (
        record.id === params.templateId
        && recordMatchesRequest(record, params.query)
    ));
    if (!sourceRecord) throwTemplateRegistryLocalError("TEMPLATE_NOT_FOUND");

    const templateBusinessCategory = buildPlatformCategoryKey(
        sourceRecord.businessCategory || sourceCatalogKey,
    );
    return {
        catalogKeys: getPlatformCatalogKeysForMutation(templateBusinessCategory),
        sourceCatalogKey,
        sourceRecord,
        sourceSnapshot,
        templateBusinessCategory,
    };
};

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
    params: { templateId: string },
) => [
    STORAGE_ROOT,
    "user",
    safePathPart(scope.tId),
    safePathPart(scope.sId),
    safePathPart(params.templateId),
    "document.json",
].join("/");

const buildPlatformDocumentPath = (
    params: { businessCategory?: string; templateId: string },
) => [
    STORAGE_ROOT,
    "platform",
    buildPlatformCategoryKey(params.businessCategory),
    safePathPart(params.templateId),
    "document.json",
].join("/");

const buildUserPreviewPath = (
    scope: CreativeEditorTemplateScope,
    params: { templateId: string; thumbnailDataUrl?: string },
) => {
    const contentType = parseDataUrlContentType(params.thumbnailDataUrl);
    const extension = contentType === "image/webp" ? "webp" : contentType === "image/png" ? "png" : "jpg";
    return [
        STORAGE_ROOT,
        "user",
        safePathPart(scope.tId),
        safePathPart(scope.sId),
        safePathPart(params.templateId),
        `preview.${extension}`,
    ].join("/");
};

const buildPlatformPreviewPath = (
    params: { businessCategory?: string; templateId: string; thumbnailDataUrl?: string },
) => {
    const contentType = parseDataUrlContentType(params.thumbnailDataUrl);
    const extension = contentType === "image/webp" ? "webp" : contentType === "image/png" ? "png" : "jpg";
    return [
        STORAGE_ROOT,
        "platform",
        buildPlatformCategoryKey(params.businessCategory),
        safePathPart(params.templateId),
        `preview.${extension}`,
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

async function readStorageJson<T>(path: string): Promise<T> {
    const payloadBlob = await getBlob(ref(firebaseStorage, path));
    if (payloadBlob.size > MAX_DOCUMENT_BYTES) {
        throwTemplateRegistryLocalError("TEMPLATE_DOCUMENT_TOO_LARGE");
    }
    const raw = await payloadBlob.text();
    return JSON.parse(raw) as T;
}

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
    try {
        await deleteObject(ref(firebaseStorage, path));
    } catch (error) {
        if (isMissingStorageObjectError(error)) return;
        logTemplateStorageCleanupFailure(error, path, context);
    }
}

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
    if (!record || (!params.includeUnpublished && (record.status || "published") !== "published") || !record.documentPath) return null;
    const document = await readStorageJson<CreativeEditorDocument>(record.documentPath);
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
    if (!record || !record.documentPath) return null;
    const document = await readStorageJson<CreativeEditorDocument>(record.documentPath);
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

    const indexRef = getStoreTemplateIndexRef(scope);
    const indexDoc = await getDoc(indexRef);
    const existingIndex = indexDoc.exists() ? (indexDoc.data() as Partial<CreativeEditorStoreTemplateIndexRecord>) : null;
    const existingRecords = readIndexRecords(existingIndex);
    const now = new Date();
    const nowIso = now.toISOString();
    const nowMs = now.getTime();
    const documentPath = buildUserDocumentPath(scope, { templateId });
    const requestMatch = {
        assetTypeId: input.assetTypeId,
        productId: input.productId,
        sourceSurface: input.sourceSurface,
    };
    const existingRecord = existingRecords.find((record) => (
        record.id === templateId
        && recordMatchesRequest(record, requestMatch)
    ));
    await uploadString(ref(firebaseStorage, documentPath), documentJson, "raw", {
        cacheControl: "private, max-age=31536000, immutable",
        contentType: "application/json",
    });

    let previewPath = existingRecord?.previewPath || null;
    let thumbnailUrl = existingRecord?.thumbnailUrl || null;
    const previewContentType = parseDataUrlContentType(input.thumbnailDataUrl);
    if (input.thumbnailDataUrl && previewContentType) {
        previewPath = buildUserPreviewPath(scope, { templateId, thumbnailDataUrl: input.thumbnailDataUrl });
        const previewRef = ref(firebaseStorage, previewPath);
        await uploadString(previewRef, input.thumbnailDataUrl, "data_url", {
            cacheControl: "private, max-age=31536000, immutable",
            contentType: previewContentType,
        });
        thumbnailUrl = await getDownloadURL(previewRef);
    }

    const record = await requestBodyComposer({
        assetTypeId: input.assetTypeId,
        createdBy: existingRecord?.createdBy,
        createdAt: existingRecord?.createdAt || nowIso,
        createdAtMs: existingRecord?.createdAtMs || nowMs,
        createdOn: existingRecord?.createdOn,
        description: existingRecord?.description,
        documentBytes,
        documentPath,
        documentStorage: "storage",
        elementCount: documentValue.elements.length,
        height: documentValue.canvas.height,
        id: templateId,
        origin: "user",
        previewPath,
        previewStorage: previewPath ? "storage" : undefined,
        productId: input.productId,
        schemaVersion: 2,
        sId: scope.sId,
        sourceSurface: input.sourceSurface,
        status: "published",
        templateFamilyId: input.templateFamilyId,
        templateType: "user",
        thumbnailUrl,
        title: input.title,
        tId: scope.tId,
        updatedAt: nowIso,
        updatedAtMs: nowMs,
        version: (existingRecord?.version || 0) + 1,
        width: documentValue.canvas.width,
    }) as CreativeEditorTemplateRecord;
    const templates = [
        record,
        ...existingRecords.filter((item) => !(
            item.id === templateId
            && recordMatchesRequest(item, requestMatch)
        )),
    ].slice(0, MAX_INDEX_TEMPLATES);
    const indexRecord = await requestBodyComposer({
        createdBy: existingIndex?.createdBy,
        createdOn: existingIndex?.createdOn,
        data: templates,
        id: STORE_TEMPLATE_DOC_ID,
        schemaVersion: 2,
        sId: scope.sId,
        tId: scope.tId,
        updatedAt: nowIso,
        updatedAtMs: nowMs,
    }) as CreativeEditorStoreTemplateIndexRecord;
    await setDoc(indexRef, indexRecord);
    return toSummary(record);
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

    const now = new Date();
    const nowIso = now.toISOString();
    const nowMs = now.getTime();
    const requestMatch = {
        assetTypeId: input.assetTypeId,
        productId: input.productId,
        sourceSurface: input.sourceSurface,
    };
    const documentPath = buildPlatformDocumentPath({ businessCategory, templateId });

    await uploadString(ref(firebaseStorage, documentPath), documentJson, "raw", {
        cacheControl: "private, max-age=31536000, immutable",
        contentType: "application/json",
    });

    let uploadedPreviewPath: string | null = null;
    let uploadedThumbnailUrl: string | null = null;
    const previewContentType = parseDataUrlContentType(input.thumbnailDataUrl);
    if (input.thumbnailDataUrl && previewContentType) {
        uploadedPreviewPath = buildPlatformPreviewPath({ businessCategory, templateId, thumbnailDataUrl: input.thumbnailDataUrl });
        const previewRef = ref(firebaseStorage, uploadedPreviewPath);
        await uploadString(previewRef, input.thumbnailDataUrl, "data_url", {
            cacheControl: "private, max-age=31536000, immutable",
            contentType: previewContentType,
        });
        uploadedThumbnailUrl = await getDownloadURL(previewRef);
    }

    let primaryRecord: CreativeEditorTemplateRecord | null = null;
    await Promise.all(getPlatformCatalogKeysForMutation(businessCategory).map(async (catalogKey) => {
        const catalogRef = getPlatformCatalogRef(catalogKey);
        const catalogDoc = await getDoc(catalogRef);
        const existingCatalog = catalogDoc.exists() ? catalogDoc.data() as CreativeEditorPlatformCatalogRecord : null;
        const existingRecords = readIndexRecords(existingCatalog, {
            productId: input.productId,
            sourceSurface: input.sourceSurface,
        });
        const existingRecord = existingRecords.find((record) => (
            record.id === templateId
            && recordMatchesRequest(record, requestMatch)
        ));
        const previewPath = uploadedPreviewPath || existingRecord?.previewPath || null;
        const thumbnailUrl = uploadedThumbnailUrl || existingRecord?.thumbnailUrl || null;
        const sortIndex = typeof existingRecord?.sortIndex === "number"
            ? existingRecord.sortIndex
            : existingRecords.length;
        const record = await requestBodyComposer({
            assetTypeId: input.assetTypeId,
            businessCategory,
            createdBy: existingRecord?.createdBy,
            createdAt: existingRecord?.createdAt || nowIso,
            createdAtMs: existingRecord?.createdAtMs || nowMs,
            createdOn: existingRecord?.createdOn,
            description: input.description || existingRecord?.description,
            documentBytes,
            documentPath,
            documentStorage: "storage",
            elementCount: documentValue.elements.length,
            height: documentValue.canvas.height,
            id: templateId,
            origin: "platform",
            previewPath,
            previewStorage: previewPath ? "storage" : undefined,
            productId: input.productId,
            schemaVersion: 2,
            sortIndex,
            sourceSurface: input.sourceSurface,
            status: input.status || existingRecord?.status || "draft",
            templateFamilyId: input.templateFamilyId,
            templateType: "platform",
            thumbnailUrl,
            title: input.title,
            updatedAt: nowIso,
            updatedAtMs: nowMs,
            version: (existingRecord?.version || 0) + 1,
            width: documentValue.canvas.width,
        }) as CreativeEditorTemplateRecord;
        const templates = sortPlatformRecords([
            record,
            ...existingRecords.filter((item) => !(
                item.id === templateId
                && recordMatchesRequest(item, requestMatch)
            )),
        ]).slice(0, MAX_PLATFORM_INDEX_TEMPLATES);

        await setDoc(catalogRef, {
            businessCategory: catalogKey,
            data: templates,
            schemaVersion: 2,
            updatedAt: nowIso,
            updatedAtMs: nowMs,
        } satisfies CreativeEditorPlatformCatalogRecord);
        if (catalogKey === businessCategory) {
            primaryRecord = record;
        }
    }));

    if (!primaryRecord) throwTemplateRegistryLocalError("PLATFORM_TEMPLATE_SAVE_FAILED");
    return toSummary(primaryRecord);
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
    const businessCategory = buildPlatformCategoryKey(params.businessCategory);
    const now = new Date();
    const nowIso = now.toISOString();
    const nowMs = now.getTime();
    let primaryRecord: CreativeEditorTemplateRecord | null = null;
    let anyUpdated = false;
    const mutationTarget = await findPlatformTemplateMutationTarget({
        businessCategory,
        query,
        templateId: params.templateId,
    });

    await Promise.all(mutationTarget.catalogKeys.map(async (catalogKey) => {
        const catalogRef = getPlatformCatalogRef(catalogKey);
        const snapshot = catalogKey === mutationTarget.sourceCatalogKey
            ? mutationTarget.sourceSnapshot
            : await readPlatformCatalogMutationSnapshot(catalogKey, query);
        const matchingRecord = snapshot.records.find((record) => (
            record.id === params.templateId
            && recordMatchesRequest(record, query)
        ));
        const baseRecord = matchingRecord || (
            mutationTarget.templateBusinessCategory === PLATFORM_TEMPLATE_GENERIC_CATEGORY
                ? mutationTarget.sourceRecord
                : null
        );
        if (!baseRecord) return;
        const updatedRecord: CreativeEditorTemplateRecord = {
            ...baseRecord,
            description: params.description ?? baseRecord.description,
            status: params.status || baseRecord.status || "draft",
            templateFamilyId: params.templateFamilyId ?? baseRecord.templateFamilyId,
            title: params.title || baseRecord.title,
            updatedAt: nowIso,
            updatedAtMs: nowMs,
            version: (baseRecord.version || 0) + 1,
        };
        const nextRecords = [
            updatedRecord,
            ...snapshot.records.filter((record) => !(
                record.id === params.templateId
                && recordMatchesRequest(record, query)
            )),
        ];
        anyUpdated = true;
        await setDoc(catalogRef, {
            businessCategory: catalogKey,
            data: sortPlatformRecords(nextRecords).slice(0, MAX_PLATFORM_INDEX_TEMPLATES),
            schemaVersion: 2,
            updatedAt: nowIso,
            updatedAtMs: nowMs,
        } satisfies CreativeEditorPlatformCatalogRecord);
        if (catalogKey === mutationTarget.sourceCatalogKey) {
            primaryRecord = updatedRecord;
        }
    }));

    if (!anyUpdated || !primaryRecord) throwTemplateRegistryLocalError("TEMPLATE_NOT_FOUND");
    return toSummary(primaryRecord);
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
    const indexRef = getStoreTemplateIndexRef(scope);
    const indexDoc = await getDoc(indexRef);
    if (!indexDoc.exists()) throwTemplateRegistryLocalError("TEMPLATE_NOT_FOUND");
    const records = readIndexRecords(indexDoc.data());
    const record = records.find((item) => item.id === params.templateId && recordMatchesRequest(item, query));
    if (!record) throwTemplateRegistryLocalError("TEMPLATE_NOT_FOUND");

    const remainingTemplates = records.filter((item) => item !== record);
    const now = new Date();
    const currentIndex = indexDoc.data() as Partial<CreativeEditorStoreTemplateIndexRecord>;
    const nextIndexRecord = await requestBodyComposer({
        createdBy: currentIndex.createdBy,
        createdOn: currentIndex.createdOn,
        data: remainingTemplates,
        id: STORE_TEMPLATE_DOC_ID,
        schemaVersion: 2,
        sId: scope.sId,
        tId: scope.tId,
        updatedAt: now.toISOString(),
        updatedAtMs: now.getTime(),
    }) as CreativeEditorStoreTemplateIndexRecord;
    await setDoc(indexRef, nextIndexRecord);

    // Metadata removal is the owner-visible delete. Storage cleanup runs after
    // the index update so a failed write cannot leave a broken visible template.
    const cleanupContext = {
        assetTypeId: record.assetTypeId,
        businessCategory: record.businessCategory,
        productId: record.productId,
        sourceSurface: record.sourceSurface,
        templateId: record.id,
        templateOrigin: "user" as const,
    };
    await Promise.all([
        deleteStoragePath(record.documentPath, { ...cleanupContext, cleanupTarget: "document" }),
        deleteStoragePath(record.previewPath, { ...cleanupContext, cleanupTarget: "preview" }),
    ]);
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
    let primaryRecord: CreativeEditorTemplateRecord | null = null;
    let anyDeleted = false;
    const mutationTarget = await findPlatformTemplateMutationTarget({
        businessCategory,
        query,
        templateId: params.templateId,
    });

    await Promise.all(mutationTarget.catalogKeys.map(async (catalogKey) => {
        const catalogRef = getPlatformCatalogRef(catalogKey);
        const snapshot = catalogKey === mutationTarget.sourceCatalogKey
            ? mutationTarget.sourceSnapshot
            : await readPlatformCatalogMutationSnapshot(catalogKey, query);
        if (!snapshot.exists) return;
        const record = snapshot.records.find((item) => item.id === params.templateId && recordMatchesRequest(item, query));
        if (!record) return;
        anyDeleted = true;
        if (catalogKey === mutationTarget.sourceCatalogKey) {
            primaryRecord = record;
        }
        const remainingTemplates = snapshot.records.filter((item) => item !== record);
        await setDoc(catalogRef, {
            businessCategory: catalogKey,
            data: sortPlatformRecords(remainingTemplates).slice(0, MAX_PLATFORM_INDEX_TEMPLATES),
            schemaVersion: 2,
            updatedAt: now.toISOString(),
            updatedAtMs: now.getTime(),
        } satisfies CreativeEditorPlatformCatalogRecord);
    }));

    if (!anyDeleted || !primaryRecord) throwTemplateRegistryLocalError("TEMPLATE_NOT_FOUND");

    const cleanupContext = {
        assetTypeId: primaryRecord.assetTypeId,
        businessCategory: primaryRecord.businessCategory || businessCategory,
        productId: primaryRecord.productId,
        sourceSurface: primaryRecord.sourceSurface,
        templateId: primaryRecord.id,
        templateOrigin: "platform" as const,
    };
    await Promise.all([
        deleteStoragePath(primaryRecord.documentPath, { ...cleanupContext, cleanupTarget: "document" }),
        deleteStoragePath(primaryRecord.previewPath, { ...cleanupContext, cleanupTarget: "preview" }),
    ]);
}

export async function deleteCreativeEditorPlatformTemplate(params: CreativeEditorTemplateContext & { templateId: string }): Promise<void> {
    try {
        await deleteCreativeEditorPlatformTemplateRaw(params);
    } catch (error) {
        throwTemplateRegistryError(error, "Platform template could not be deleted");
    }
}
