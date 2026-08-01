export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from "@config/features";
import { resolveExactSessionStoreRole } from "@lib/auth/sessionPlatformRole";
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { admin, storageAdmin } from "@lib/firebase/firebaseAdmin";
import {
    appendImageBatchSelectionsToOutletProject,
    normalizeImageBatchProjectSelections,
} from "@lib/ai/imageBatchProjectSelection";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { buildSummaryProjectFieldPayload } from "@lib/firestore/summaryProjectsWriter";
import { sanitizeForFirestore } from "@lib/firestore/sanitizeForFirestore";
import { preserveExistingProjectVisualDefaults } from "@lib/extraction/projectVisualDefaults";
import { mergeDefinedObjectPatch } from "@lib/menu/projectUpdateProjection";
import { projectDocumentMutationVersionMillis } from "@lib/menu/projectMutationVersion";
import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import { runStorePublicTruthPostCommitEffects } from "@lib/cache/storePublicTruthPostCommit";
import { projectDocumentMatchesScope } from "@lib/menu/projectDocumentScope";
import { nextProjectLocalVersion, nextProjectMenuVersion } from "@lib/menu/projectMutationAuthority";
import { requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import {
    isStorePermissionDataInScope,
    normalizeStorePermissionScopeDocumentId,
} from "@lib/permissions/scopeDocumentId";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import { checkRateLimit } from "@lib/rateLimit";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { touchDigitalScreenContentVersionForStoreServer } from "@lib/screen/serverScreenInvalidation";
import { normalizeProjectPriceTruth } from "@lib/pricing/projectPriceTruth";
import { normalizeOptionalMenuPrice } from "@lib/validation/pricing.schema";
import {
    getBoundedMultiOutletStringContext,
    getMultiOutletProjectLogContext,
    logMultiOutletFailure,
    type MultiOutletLogContext,
} from "@lib/multiOutlet/diagnostics";
import { getOutletSessionScope } from "@lib/multiOutlet/outletSessionScope";
import {
    isMultiOutletTenantStoreListEntryInScope,
    normalizeMultiOutletNumericDocumentId,
    normalizeMultiOutletProjectId,
} from "@lib/multiOutlet/projectIdBoundary";
import { normalizePersistedOutletPolicy } from "@lib/multiOutlet/outletPolicyBoundary";
import { normalizeMenuExtractionJobId } from "@lib/menu-extraction/jobIdBoundary";
import { LOCAL_CATEGORY_PREFIX, LOCAL_ITEM_PREFIX, type OutletPolicy } from "@type/multiOutlet.types";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";

const projectIdSchema = z.string()
    .min(1)
    .max(200)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .refine(isValidFirestoreDocumentId, "Invalid project ID");
const overrideIdSchema = z.string()
    .min(1)
    .max(200)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .refine(isValidFirestoreDocumentId, "Invalid override ID");
const languageCodeSchema = z.string().min(2).max(16).regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i);
const localizedTextSchema = z
    .record(languageCodeSchema, z.string().max(5000))
    .refine((value) => Object.keys(value).length <= 25, "Too many localized values");
const priceSchema = z.union([z.string(), z.number().finite().nonnegative()])
    .transform((value) => normalizeOptionalMenuPrice(value))
    .refine((result) => result.success, "Invalid price format")
    .transform((result) => result.data || '');
const itemOverrideSchema = z.object({
    active: z.boolean().optional(),
    available: z.boolean().optional(),
    price: priceSchema.optional(),
    description: localizedTextSchema.optional(),
    images: z.array(z.any()).max(20).optional(),
    orderIndex: z.number().int().min(0).max(10000).optional(),
    isBestSeller: z.boolean().optional(),
    duration: z.number().min(0).max(1440).optional(),
    ownerBoost: z.number().min(-100).max(100).optional(),
}).strict();
const categoryOverrideSchema = z.object({
    active: z.boolean().optional(),
    orderIndex: z.number().int().min(0).max(10000).optional(),
    timeSlots: z.array(z.any()).max(64).optional(),
}).strict();
const attributeOverrideSchema = z.object({
    active: z.boolean().optional(),
    price: priceSchema.optional(),
    orderIndex: z.number().int().min(0).max(10000).optional(),
}).strict();
const overridesSchema = z.object({
    items: z.record(overrideIdSchema, itemOverrideSchema).optional(),
    categories: z.record(overrideIdSchema, categoryOverrideSchema).optional(),
    attributes: z.record(overrideIdSchema, attributeOverrideSchema).optional(),
}).strict();
const standardSaveSchema = z.object({
    operation: z.literal("save").optional(),
    publish: z.boolean().optional(),
    expectedModifiedOnMillis: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    extractionReview: z.object({
        expectedChangeCount: z.number().int().min(1).max(5_000),
        expectedLocalVersion: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
        jobId: z.string().trim().refine((value) => normalizeMenuExtractionJobId(value) === value),
    }).strict().optional(),
    extractedVisualDefaults: z.object({
        brandAccentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        imageBackgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }).strict().refine(
        (value) => Boolean(value.brandAccentColor || value.imageBackgroundColor),
        "At least one visual default is required",
    ).optional(),
    project: z.object({
        projectId: projectIdSchema,
        masterProjectId: projectIdSchema,
        active: z.boolean().optional(),
        outletStatus: z.enum(["active", "inactive"]).optional(),
        files: z.array(z.any()).max(25).optional(),
        overrides: overridesSchema.optional(),
    }).passthrough(),
});
const imageBatchSelectionSchema = z.object({
    operation: z.literal("append_image_batch_selection"),
    project: z.object({
        projectId: projectIdSchema,
        masterProjectId: projectIdSchema,
    }).strict(),
    selections: z.array(z.object({
        itemId: overrideIdSchema,
        images: z.array(z.object({
            name: z.string().min(1).max(500),
            size: z.number().int().min(1).max(15 * 1024 * 1024),
            type: z.string().min(1).max(100),
            uid: z.string().min(1).max(180),
            url: z.string().url().max(5_000),
        }).strict()).min(1).max(4),
    }).strict()).min(1).max(50),
}).strict();
const schema = z.union([imageBatchSelectionSchema, standardSaveSchema]);
const OUTLET_SAVE_MAX_BODY_BYTES = 2 * 1024 * 1024;

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const OUTLET_PROJECT_WRITE_FIELDS = [
    "files",
    "overrides",
    "active",
    "outletStatus",
    "config",
    "languages",
    "defaultLanguage",
    "menuSettings",
] as const;

const pickOutletProjectWriteFields = (project: Record<string, any>) => (
    OUTLET_PROJECT_WRITE_FIELDS.reduce<Record<string, any>>((result, field) => {
        if (Object.prototype.hasOwnProperty.call(project, field) && project[field] !== undefined) {
            result[field] = project[field];
        }
        return result;
    }, {})
);

const collectLocalIds = (files: any[] | undefined) => {
    const categoryIds = new Set<string>();
    const itemIds = new Set<string>();
    const invalidCategoryIds: string[] = [];
    const invalidItemIds: string[] = [];

    (files || []).forEach((file) => {
        const data = file?.extractedData?.data || {};

        (Array.isArray(data.categories) ? data.categories : []).forEach((category: any) => {
            const id = String(category?.id || "");
            if (!id) return;
            if (!id.startsWith(LOCAL_CATEGORY_PREFIX)) {
                invalidCategoryIds.push(id);
                return;
            }
            categoryIds.add(id);
        });

        (Array.isArray(data.items) ? data.items : []).forEach((item: any) => {
            const id = String(item?.id || "");
            if (!id) return;
            if (!id.startsWith(LOCAL_ITEM_PREFIX)) {
                invalidItemIds.push(id);
                return;
            }
            itemIds.add(id);
        });
    });

    return { categoryIds, itemIds, invalidCategoryIds, invalidItemIds };
};

const hasAddedIds = (nextIds: Set<string>, previousIds: Set<string>) => (
    Array.from(nextIds).some((id) => !previousIds.has(id))
);

const isPlainRecord = (value: unknown): value is Record<string, any> => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const asSafeRecord = (value: unknown): Record<string, any> => (
    isPlainRecord(value) ? value : {}
);

const toComparableValue = (value: any): any => {
    if (value === undefined || value === null) return null;
    if (Array.isArray(value)) return value.map(toComparableValue);
    if (!isPlainRecord(value)) return value;

    return Object.keys(value)
        .filter((key) => !DANGEROUS_KEYS.has(key))
        .sort()
        .reduce<Record<string, any>>((result, key) => {
            result[key] = toComparableValue(value[key]);
            return result;
        }, {});
};

const valuesMatch = (left: unknown, right: unknown) => (
    JSON.stringify(toComparableValue(left)) === JSON.stringify(toComparableValue(right))
);

const hasChangedDefinedField = (
    nextRecord: Record<string, any>,
    previousRecord: Record<string, any>,
    field: string,
) => {
    if (!Object.prototype.hasOwnProperty.call(nextRecord, field)) return false;
    const nextValue = nextRecord[field];
    if (nextValue === undefined || nextValue === null) return false;
    return !valuesMatch(nextValue, previousRecord[field]);
};

const getNestedValue = (record: Record<string, any>, path: string[]) => (
    path.reduce<any>((current, key) => (isPlainRecord(current) ? current[key] : undefined), record)
);

const hasOwnDefinedProjectField = (
    project: Record<string, any>,
    field: string,
) => (
    Object.prototype.hasOwnProperty.call(project, field)
    && project[field] !== undefined
);

const hasChangedNestedField = (
    nextRecord: Record<string, any>,
    previousRecord: Record<string, any>,
    path: string[],
) => {
    const nextValue = getNestedValue(nextRecord, path);
    if (nextValue === undefined || nextValue === null) return false;
    return !valuesMatch(nextValue, getNestedValue(previousRecord, path));
};

const hasChangedAnyNestedField = (
    nextRecord: Record<string, any>,
    previousRecord: Record<string, any>,
    paths: string[][],
) => paths.some((path) => hasChangedNestedField(nextRecord, previousRecord, path));

const hasChangedOverrideField = (
    nextOverrides: unknown,
    previousOverrides: unknown,
    bucket: "items" | "attributes",
    field: string,
) => {
    const nextBucket = asSafeRecord(asSafeRecord(nextOverrides)[bucket]);
    const previousBucket = asSafeRecord(asSafeRecord(previousOverrides)[bucket]);

    return Object.entries(nextBucket).some(([id, nextValue]) => {
        if (DANGEROUS_KEYS.has(id)) return false;
        const nextRecord = asSafeRecord(nextValue);
        const previousRecord = asSafeRecord(previousBucket[id]);
        return hasChangedDefinedField(nextRecord, previousRecord, field);
    });
};

const normalizeLanguageCodes = (languages: unknown): string[] => {
    if (!Array.isArray(languages)) return [];

    return Array.from(new Set(languages
        .map((language: any) => (typeof language === "string" ? language : language?.code))
        .filter((code: unknown): code is string => typeof code === "string")
        .map((code) => code.trim().toLowerCase())
        .filter(Boolean)));
};

const hasAddedProjectLanguage = (nextProject: any, previousProject: any) => {
    const nextLanguages = normalizeLanguageCodes(nextProject?.languages);
    if (!nextLanguages.length) return false;

    const previousLanguages = new Set(normalizeLanguageCodes(previousProject?.languages));
    return nextLanguages.some((code) => !previousLanguages.has(code));
};

const hasOutletLocalMutation = (nextProject: any, previousProject: any) => (
    !valuesMatch(nextProject?.files, previousProject?.files)
    || !valuesMatch(nextProject?.overrides, previousProject?.overrides)
    || hasChangedDefinedField(asSafeRecord(nextProject), asSafeRecord(previousProject), "active")
    || hasChangedDefinedField(asSafeRecord(nextProject), asSafeRecord(previousProject), "outletStatus")
);

const getOutletPolicyViolation = (
    nextProject: any,
    previousProject: any,
    outletPolicy: OutletPolicy,
): string | null => {
    const nextOverrides = nextProject?.overrides;
    const previousOverrides = previousProject?.overrides;

    if (outletPolicy.priceOverride === false) {
        if (
            hasChangedOverrideField(nextOverrides, previousOverrides, "items", "price")
            || hasChangedOverrideField(nextOverrides, previousOverrides, "attributes", "price")
        ) {
            return "Price overrides are disabled for this outlet";
        }
    }

    if (
        outletPolicy.availabilityOverride === false
        && hasChangedOverrideField(nextOverrides, previousOverrides, "items", "available")
    ) {
        return "Availability overrides are disabled for this outlet";
    }

    if (
        outletPolicy.descriptionOverride === false
        && hasChangedOverrideField(nextOverrides, previousOverrides, "items", "description")
    ) {
        return "Description overrides are disabled for this outlet";
    }

    if (
        outletPolicy.imageOverride === false
        && hasChangedOverrideField(nextOverrides, previousOverrides, "items", "images")
    ) {
        return "Image overrides are disabled for this outlet";
    }

    if (outletPolicy.canAddLanguages === false && hasAddedProjectLanguage(nextProject, previousProject)) {
        return "Language additions are disabled for this outlet";
    }

    if (
        outletPolicy.canOverrideTheme === false
        && hasChangedAnyNestedField(nextProject, previousProject, [
            ["config", "design", "menu", "mood"],
        ])
    ) {
        return "Theme changes are disabled for this outlet";
    }

    if (
        outletPolicy.canOverrideBrandIdentity === false
        && hasChangedAnyNestedField(nextProject, previousProject, [
            ["config", "design", "brand"],
            ["config", "design", "menu", "backgroundImage"],
        ])
    ) {
        return "Brand identity changes are disabled for this outlet";
    }

    if (
        outletPolicy.canOverrideLayout === false
        && hasChangedAnyNestedField(nextProject, previousProject, [
            ["config", "design", "menu", "layout"],
            ["config", "design", "menu", "showCategoryIcons"],
            ["config", "design", "menu", "showCategoryTabs"],
            ["config", "design", "menu", "showImages"],
            ["config", "design", "menu", "showItemPrices"],
        ])
    ) {
        return "Layout changes are disabled for this outlet";
    }

    return null;
};

class LinkedOutletSaveRejection extends Error {
    constructor(
        readonly status: number,
        readonly publicMessage: string,
        code: string,
    ) {
        super(code);
        this.name = "LinkedOutletSaveRejection";
    }
}

const requireCurrentLinkedProject = ({
    projectData,
    projectId,
    storeId,
    tenantId,
    missingCode,
}: {
    projectData: Record<string, any> | undefined;
    projectId: string;
    storeId: number;
    tenantId: number;
    missingCode: string;
}) => {
    if (
        !projectData
        || projectData.deleted === true
        || !projectDocumentMatchesScope(projectData, {
            projectId,
            sId: storeId,
            tId: tenantId,
        })
    ) {
        throw new LinkedOutletSaveRejection(409, "Linked outlet project state changed", missingCode);
    }
    return projectData;
};

const requireCurrentMasterProject = (params: Parameters<typeof requireCurrentLinkedProject>[0]) => {
    const projectData = requireCurrentLinkedProject(params);
    if (
        projectData.active === false
        || projectData.masterProjectId
        || projectData.projectType === "localOnly"
    ) {
        throw new LinkedOutletSaveRejection(409, "Master menu not available", params.missingCode);
    }
    return projectData;
};

const runLinkedOutletPostCommitEffects = async ({
    outletStoreId,
    projectId,
    reason,
    tenantId,
}: {
    outletStoreId: number;
    projectId: string;
    reason: string;
    tenantId: number;
}) => {
    const result = await runStorePublicTruthPostCommitEffects({
        chunkSize: 1,
        storeIds: [String(outletStoreId)],
        tenantId: String(tenantId),
        deps: {
            invalidateAssistant: (storeId, effectTenantId) => (
                invalidateOwnerBusinessAssistantPacketCache({
                    tId: effectTenantId,
                    sId: storeId,
                    projectId,
                })
            ),
            revalidate: (tag) => revalidateTag(tag, { expire: 0 }),
            touchScreen: (storeId) => touchDigitalScreenContentVersionForStoreServer(storeId, reason),
        },
    });
    if (result.effectsPending) {
        logMultiOutletFailure("linked_outlet_save_post_commit_effect_failed", result.firstError, {
            endpoint: "/api/projects/outlet-save",
            failedEffectCount: result.failedEffectCount,
            ...getBoundedMultiOutletStringContext("outletStoreId", outletStoreId),
            ...getBoundedMultiOutletStringContext("projectId", projectId),
            ...getBoundedMultiOutletStringContext("reason", reason),
            ...getBoundedMultiOutletStringContext("tenantId", tenantId),
        });
    }
    return result;
};

const requireLinkedOutletAuthority = async ({
    callerStoreSnap,
    currentStoreId,
    masterStoreId,
    masterStoreSnap,
    outletStoreId,
    outletStoreSnap,
    request,
    session,
    tenantId,
    tenantSnap,
}: {
    callerStoreSnap: FirebaseFirestore.DocumentSnapshot;
    currentStoreId: number;
    masterStoreId: number;
    masterStoreSnap: FirebaseFirestore.DocumentSnapshot;
    outletStoreId: number;
    outletStoreSnap: FirebaseFirestore.DocumentSnapshot;
    request: NextRequest;
    session: any;
    tenantId: number;
    tenantSnap: FirebaseFirestore.DocumentSnapshot;
}) => {
    const tenantScope = normalizeStorePermissionScopeDocumentId(tenantId);
    const callerStoreScope = normalizeStorePermissionScopeDocumentId(currentStoreId);
    const outletStoreScope = normalizeStorePermissionScopeDocumentId(outletStoreId);
    const masterStoreScope = normalizeStorePermissionScopeDocumentId(masterStoreId);
    const callerStore = callerStoreSnap.data();
    if (
        !callerStoreSnap.exists
        || !tenantScope
        || !callerStoreScope
        || !isStorePermissionDataInScope(callerStore, callerStoreScope, tenantScope)
        || callerStore?.active === false
        || callerStore?.deleted === true
        || isPlatformEntityBlocked(callerStore)
    ) {
        throw new LinkedOutletSaveRejection(403, "Forbidden", "linked_outlet_caller_store_invalid");
    }
    const permissionError = await requireAnyStorePermissionForStoreData(
        request,
        session,
        callerStore,
        [PERMISSIONS.MANAGE_MENU],
        "Linked outlet menu save",
        currentStoreId,
        tenantId,
    );
    if (permissionError) {
        throw new LinkedOutletSaveRejection(permissionError.status || 403, "Forbidden", "linked_outlet_permission_denied");
    }

    const outletStore = outletStoreSnap.data();
    if (
        !outletStoreSnap.exists
        || !tenantScope
        || !outletStoreScope
        || !isStorePermissionDataInScope(outletStore, outletStoreScope, tenantScope)
        || outletStore?.active === false
        || outletStore?.deleted === true
        || outletStore?.isMaster === true
        || isPlatformEntityBlocked(outletStore)
    ) {
        throw new LinkedOutletSaveRejection(409, "Outlet store not available", "linked_outlet_store_invalid");
    }

    const masterStore = masterStoreSnap.data();
    if (
        !masterStoreSnap.exists
        || !tenantScope
        || !masterStoreScope
        || !isStorePermissionDataInScope(masterStore, masterStoreScope, tenantScope)
        || masterStore?.active === false
        || masterStore?.deleted === true
        || masterStore?.isMaster !== true
        || isPlatformEntityBlocked(masterStore)
    ) {
        throw new LinkedOutletSaveRejection(409, "Master store not available", "linked_outlet_master_store_invalid");
    }

    const tenant = tenantSnap.data();
    if (
        !tenantSnap.exists
        || tenant?.active === false
        || tenant?.deleted === true
        || isPlatformEntityBlocked(tenant)
    ) {
        throw new LinkedOutletSaveRejection(409, "Tenant not available", "linked_outlet_tenant_invalid");
    }
    const tenantStores = Array.isArray(tenant?.storesList) ? tenant.storesList : [];
    const callerIsInTenant = tenantStores.some((store: unknown) => (
        isMultiOutletTenantStoreListEntryInScope(store, { storeId: currentStoreId })
    ));
    const targetIsInTenant = tenantStores.some((store: unknown) => (
        isMultiOutletTenantStoreListEntryInScope(store, {
            isMaster: false,
            storeId: outletStoreId,
        })
    ));
    const masterIsInTenant = tenantStores.some((store: unknown) => (
        isMultiOutletTenantStoreListEntryInScope(store, {
            isMaster: true,
            storeId: masterStoreId,
        })
    ));
    if (!callerIsInTenant || !targetIsInTenant || !masterIsInTenant) {
        throw new LinkedOutletSaveRejection(409, "Store membership changed", "linked_outlet_membership_invalid");
    }
    if (currentStoreId !== outletStoreId && callerStore?.isMaster !== true) {
        throw new LinkedOutletSaveRejection(
            403,
            "Only the outlet or master store can save this menu",
            "linked_outlet_caller_scope_invalid",
        );
    }

    const outletPolicy = normalizePersistedOutletPolicy(masterStore?.outletPolicy);
    if (!outletPolicy) {
        throw new LinkedOutletSaveRejection(409, "Master store not available", "linked_outlet_policy_invalid");
    }
    return outletPolicy;
};

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        return NextResponse.json({ error: "Multi-outlet disabled" }, { status: 403 });
    }

    let failureContext: MultiOutletLogContext = {
        endpoint: "/api/projects/outlet-save",
        ...getBoundedMultiOutletStringContext("sessionTenantId", session?.tId),
        ...getBoundedMultiOutletStringContext("sessionStoreId", session?.sId),
        ...getBoundedMultiOutletStringContext("sessionUserId", session?.uId || session?.user?.id),
    };

    try {
        const bodyResult = await readBoundedJsonBody(request, OUTLET_SAVE_MAX_BODY_BYTES, {
            invalidJsonMessage: "Invalid input",
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const body = bodyResult.data as any;
        failureContext = {
            ...failureContext,
            ...getMultiOutletProjectLogContext(body?.project?.projectId, body?.project?.masterProjectId),
        };
        const validation = validateAPIInput(schema, body);
        if (validation.success !== true) {
            logMultiOutletFailure("linked_outlet_save_validation_failed", undefined, failureContext);
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        const validatedData = validation.data;
        const project = validatedData.project;
        if (!project.projectId || !project.masterProjectId) {
            return NextResponse.json({ error: "Invalid project reference" }, { status: 400 });
        }
        const isImageBatchSelection = validatedData.operation === "append_image_batch_selection";
        if (!isImageBatchSelection) {
            try {
                normalizeProjectPriceTruth(project);
            } catch {
                return NextResponse.json({ error: "Invalid input" }, { status: 400 });
            }
        }
        const outletProjectRef = normalizeMultiOutletProjectId(project.projectId);
        const masterProjectRef = normalizeMultiOutletProjectId(project.masterProjectId);
        if (
            !outletProjectRef
            || !masterProjectRef
            || outletProjectRef.tId !== masterProjectRef.tId
            || outletProjectRef.sId === masterProjectRef.sId
        ) {
            return NextResponse.json({ error: "Invalid project reference" }, { status: 400 });
        }

        const tenantId = outletProjectRef.tId;
        const outletStoreId = outletProjectRef.sId;
        const masterStoreId = masterProjectRef.sId;
        const outletSessionScope = getOutletSessionScope(session);
        const sessionTenantScope = normalizeMultiOutletNumericDocumentId(outletSessionScope?.tenantDocumentId);
        const currentStoreScope = normalizeMultiOutletNumericDocumentId(outletSessionScope?.storeDocumentId);
        failureContext = {
            ...failureContext,
            ...getBoundedMultiOutletStringContext("tenantId", tenantId),
            ...getBoundedMultiOutletStringContext("outletStoreId", outletStoreId),
            ...getBoundedMultiOutletStringContext("masterStoreId", masterStoreId),
            ...getBoundedMultiOutletStringContext("currentStoreId", currentStoreScope?.documentId),
        };
        if (!sessionTenantScope || !currentStoreScope || sessionTenantScope.numericId !== tenantId) {
            logMultiOutletFailure("linked_outlet_save_invalid_session_store_scope", undefined, failureContext);
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const currentStoreId = currentStoreScope.numericId;
        if (!verifyTenantAccess(session, tenantId, currentStoreId, request)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const userRateLimitHash = hashPublicRateLimitValue(session.uId || session.user?.id || "unknown");
        const projectRateLimitHash = hashPublicRateLimitValue(project.projectId);
        const rateLimit = await checkRateLimit({
            key: `outlet-save:${userRateLimitHash}:${projectRateLimitHash}`,
            limit: 120,
            window: 60,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }

        const db = admin.firestore();
        const persistedOutletProjectRef = db.doc(
            `${DB_COLLECTIONS.PROJECTS}/${tenantId}/${outletStoreId}/${project.projectId}`,
        );
        const callerStoreDocumentRef = db.doc(`${DB_COLLECTIONS.STORES}/${currentStoreId}`);
        const outletStoreDocumentRef = db.doc(`${DB_COLLECTIONS.STORES}/${outletStoreId}`);
        const masterStoreDocumentRef = db.doc(`${DB_COLLECTIONS.STORES}/${masterStoreId}`);
        const tenantDocumentRef = db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantId}`);

        if (isImageBatchSelection) {
            const appendData = validatedData as z.infer<typeof imageBatchSelectionSchema>;
            const expectedBucket = storageAdmin.bucket().name;
            const selections = normalizeImageBatchProjectSelections(
                appendData.selections,
                project.projectId,
                expectedBucket,
            );
            if (!selections) return NextResponse.json({ error: "Invalid image selection" }, { status: 400 });
            const masterProjectDocumentRef = db.doc(
                `${DB_COLLECTIONS.PROJECTS}/${tenantId}/${masterStoreId}/${project.masterProjectId}`,
            );
            const localMutationAt = admin.firestore.Timestamp.now();
            let savedProject: Record<string, unknown>;
            try {
                savedProject = await db.runTransaction(async (transaction) => {
                    const [
                        callerStoreSnap,
                        outletStoreSnap,
                        masterStoreSnap,
                        tenantSnap,
                        latestOutletSnap,
                        latestMasterSnap,
                    ] = await Promise.all([
                        transaction.get(callerStoreDocumentRef),
                        transaction.get(outletStoreDocumentRef),
                        transaction.get(masterStoreDocumentRef),
                        transaction.get(tenantDocumentRef),
                        transaction.get(persistedOutletProjectRef),
                        transaction.get(masterProjectDocumentRef),
                    ]);
                    const outletPolicy = await requireLinkedOutletAuthority({
                        callerStoreSnap,
                        currentStoreId,
                        masterStoreId,
                        masterStoreSnap,
                        outletStoreId,
                        outletStoreSnap,
                        request,
                        session,
                        tenantId,
                        tenantSnap,
                    });
                    const latestOutlet = requireCurrentLinkedProject({
                        projectData: latestOutletSnap.exists ? latestOutletSnap.data() : undefined,
                        projectId: project.projectId,
                        storeId: outletStoreId,
                        tenantId,
                        missingCode: "linked_outlet_image_batch_project_missing",
                    });
                    const latestMaster = requireCurrentMasterProject({
                        projectData: latestMasterSnap.exists ? latestMasterSnap.data() : undefined,
                        projectId: project.masterProjectId,
                        storeId: masterStoreId,
                        tenantId,
                        missingCode: "linked_outlet_image_batch_project_missing",
                    });
                    if (latestOutlet.masterProjectId !== project.masterProjectId) {
                        throw new LinkedOutletSaveRejection(
                            409,
                            "Linked outlet project state changed",
                            "linked_outlet_image_batch_project_missing",
                        );
                    }

                    const localItemIds = collectLocalIds(latestOutlet.files).itemIds;
                    const changesInheritedImages = selections.some((selection) => !localItemIds.has(selection.itemId));
                    if (changesInheritedImages && outletPolicy.imageOverride !== true) {
                        throw new Error("linked_outlet_image_override_disabled");
                    }

                    const nextProject = appendImageBatchSelectionsToOutletProject(
                        latestOutlet as any,
                        latestMaster as any,
                        selections,
                    );
                    const previousOutletLocalState = asSafeRecord(latestOutlet.outletLocalState);
                    const safeProject = sanitizeForFirestore({
                        files: nextProject.files,
                        overrides: nextProject.overrides,
                        projectId: latestOutlet.projectId || project.projectId,
                        masterProjectId: latestOutlet.masterProjectId,
                        projectType: latestOutlet.projectType || "inherited",
                        deleted: latestOutlet.deleted === true,
                        pId: latestOutlet.pId || session.pId || session.user?.pId,
                        tId: tenantId,
                        sId: outletStoreId,
                        role: resolveExactSessionStoreRole(session) || undefined,
                        uId: session.uId || session.user?.id,
                        modifiedBy: session.user?.name || session.user?.email || "system",
                        modifiedOn: localMutationAt,
                        outletLocalState: {
                            ...previousOutletLocalState,
                            localVersion: nextProjectLocalVersion(previousOutletLocalState.localVersion),
                            lastLocalChangeAt: localMutationAt,
                            lastLocalChangeBy: session.uId || session.user?.id || "unknown",
                            lastLocalChangeReason: "outlet_save",
                        },
                    }, { unsafeObjectKey: "omit" });
                    transaction.set(persistedOutletProjectRef, safeProject, { merge: true });
                    return { ...latestOutlet, ...safeProject };
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : "";
                if (message === "linked_outlet_image_override_disabled") {
                    return NextResponse.json({ error: "Image overrides are disabled for this outlet" }, { status: 403 });
                }
                if (message === "image_batch_project_item_image_limit_exceeded") {
                    return NextResponse.json({ error: "Too many images for this item" }, { status: 409 });
                }
                if (error instanceof LinkedOutletSaveRejection) {
                    return NextResponse.json({ error: error.publicMessage }, { status: error.status });
                }
                if (message === "linked_outlet_image_batch_project_missing" || message === "image_batch_project_item_missing") {
                    return NextResponse.json({ error: "Linked outlet project item not found" }, { status: 409 });
                }
                throw error;
            }

            const postCommit = await runLinkedOutletPostCommitEffects({
                outletStoreId,
                projectId: project.projectId,
                reason: "linkedOutletImageBatchSelection",
                tenantId,
            });
            return NextResponse.json({
                effectsPending: postCommit.effectsPending,
                failedEffectCount: postCommit.failedEffectCount,
                success: true,
                project: savedProject,
            });
        }

        const standardData = validatedData as z.infer<typeof standardSaveSchema>;
        const standardProject = standardData.project;
        const extractionReview = standardData.extractionReview;
        const extractedVisualDefaults = standardData.extractedVisualDefaults;
        if (!standardProject.projectId || !standardProject.masterProjectId) {
            return NextResponse.json({ error: "Invalid project reference" }, { status: 400 });
        }
        const masterProjectDocumentRef = db.doc(
            `${DB_COLLECTIONS.PROJECTS}/${tenantId}/${masterStoreId}/${standardProject.masterProjectId}`,
        );
        const extractionReviewJobRef = extractionReview
            ? db.doc(`${DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS}/${extractionReview.jobId}`)
            : null;
        let savedProject: Record<string, unknown>;
        try {
            savedProject = await db.runTransaction(async (transaction) => {
                const [
                    callerStoreSnap,
                    outletStoreSnap,
                    masterStoreSnap,
                    tenantSnap,
                    latestOutletSnap,
                    latestMasterSnap,
                    extractionReviewJobSnap,
                ] = await Promise.all([
                    transaction.get(callerStoreDocumentRef),
                    transaction.get(outletStoreDocumentRef),
                    transaction.get(masterStoreDocumentRef),
                    transaction.get(tenantDocumentRef),
                    transaction.get(persistedOutletProjectRef),
                    transaction.get(masterProjectDocumentRef),
                    extractionReviewJobRef
                        ? transaction.get(extractionReviewJobRef)
                        : Promise.resolve(null),
                ]);
                const outletPolicy = await requireLinkedOutletAuthority({
                    callerStoreSnap,
                    currentStoreId,
                    masterStoreId,
                    masterStoreSnap,
                    outletStoreId,
                    outletStoreSnap,
                    request,
                    session,
                    tenantId,
                    tenantSnap,
                });
                const existingProject = requireCurrentLinkedProject({
                    projectData: latestOutletSnap.exists ? latestOutletSnap.data() : undefined,
                    projectId: standardProject.projectId,
                    storeId: outletStoreId,
                    tenantId,
                    missingCode: "linked_outlet_project_missing",
                });
                requireCurrentMasterProject({
                    projectData: latestMasterSnap.exists ? latestMasterSnap.data() : undefined,
                    projectId: standardProject.masterProjectId,
                    storeId: masterStoreId,
                    tenantId,
                    missingCode: "linked_outlet_master_project_missing",
                });
                if (existingProject.masterProjectId !== standardProject.masterProjectId) {
                    throw new LinkedOutletSaveRejection(
                        409,
                        "Linked outlet project state changed",
                        "linked_outlet_project_linkage_changed",
                    );
                }
                if (
                    standardData.expectedModifiedOnMillis !== undefined
                    && projectDocumentMutationVersionMillis(existingProject) !== standardData.expectedModifiedOnMillis
                ) {
                    throw new LinkedOutletSaveRejection(
                        409,
                        "Linked outlet project state changed",
                        "linked_outlet_project_version_changed",
                    );
                }

                const requestedVisualDefaultPatch = extractedVisualDefaults ? {
                    projectId: standardProject.projectId,
                    masterProjectId: standardProject.masterProjectId,
                    ...(extractedVisualDefaults.brandAccentColor ? {
                        config: { design: { brand: { accentColor: extractedVisualDefaults.brandAccentColor } } },
                    } : {}),
                    ...(extractedVisualDefaults.imageBackgroundColor ? {
                        aiPreferences: { image: { backgroundColor: extractedVisualDefaults.imageBackgroundColor } },
                    } : {}),
                } : null;
                const preservedVisualDefaultPatch = requestedVisualDefaultPatch
                    ? preserveExistingProjectVisualDefaults(requestedVisualDefaultPatch, existingProject)
                    : null;
                const effectiveStandardProject = { ...standardProject };
                if (preservedVisualDefaultPatch) {
                    if (preservedVisualDefaultPatch.config?.design?.brand?.accentColor) {
                        effectiveStandardProject.config = preservedVisualDefaultPatch.config;
                    } else {
                        delete effectiveStandardProject.config;
                    }
                    if (preservedVisualDefaultPatch.aiPreferences?.image?.backgroundColor) {
                        effectiveStandardProject.aiPreferences = preservedVisualDefaultPatch.aiPreferences;
                    } else {
                        delete effectiveStandardProject.aiPreferences;
                    }
                }

                if (extractionReview && extractionReviewJobRef) {
                    const reviewJob = extractionReviewJobSnap?.exists
                        ? extractionReviewJobSnap.data()
                        : null;
                    const sessionUserIds = [session.uId, session.user?.id]
                        .filter(Boolean)
                        .map((value) => String(value));
                    const currentLocalVersion = Number(
                        asSafeRecord(existingProject.outletLocalState).localVersion || 0,
                    );
                    if (
                        !reviewJob
                        || reviewJob.status !== "preview_ready"
                        || String(reviewJob.projectId || "") !== standardProject.projectId
                        || reviewJob.tId !== tenantId
                        || reviewJob.sId !== outletStoreId
                        || !reviewJob.uId
                        || !sessionUserIds.includes(String(reviewJob.uId))
                        || currentLocalVersion !== extractionReview.expectedLocalVersion
                    ) {
                        throw new LinkedOutletSaveRejection(
                            409,
                            "Extraction review state changed",
                            "linked_outlet_extraction_review_stale",
                        );
                    }
                }

                const nextLocalIds = collectLocalIds(effectiveStandardProject.files);
                if (nextLocalIds.invalidCategoryIds.length || nextLocalIds.invalidItemIds.length) {
                    throw new LinkedOutletSaveRejection(400, "Outlet local menu data must use local IDs", "linked_outlet_local_ids_invalid");
                }

                const previousLocalIds = collectLocalIds(existingProject.files);
                const policyViolation = getOutletPolicyViolation(effectiveStandardProject, existingProject, outletPolicy);
                if (policyViolation) {
                    throw new LinkedOutletSaveRejection(403, policyViolation, "linked_outlet_policy_violation");
                }
                if (hasAddedIds(nextLocalIds.categoryIds, previousLocalIds.categoryIds) && outletPolicy.allowLocalCategories === false) {
                    throw new LinkedOutletSaveRejection(403, "Local categories are disabled for this outlet", "linked_outlet_local_categories_disabled");
                }
                if (hasAddedIds(nextLocalIds.itemIds, previousLocalIds.itemIds) && outletPolicy.allowLocalItems === false) {
                    throw new LinkedOutletSaveRejection(403, "Local items are disabled for this outlet", "linked_outlet_local_items_disabled");
                }
                if (effectiveStandardProject.active === false && outletPolicy.allowProjectDeactivate === false) {
                    throw new LinkedOutletSaveRejection(403, "Project deactivation is disabled for this outlet", "linked_outlet_deactivation_disabled");
                }

                const localMutationAt = admin.firestore.Timestamp.now();
                const localMutationDetected = hasOutletLocalMutation(effectiveStandardProject, existingProject);
                const previousOutletLocalState = asSafeRecord(existingProject.outletLocalState);
                const shouldPublish = standardData.publish === true;
                const safeProject = sanitizeForFirestore({
                    ...pickOutletProjectWriteFields(effectiveStandardProject),
                    ...(extractedVisualDefaults && effectiveStandardProject.aiPreferences ? {
                        aiPreferences: effectiveStandardProject.aiPreferences,
                    } : {}),
                    projectId: existingProject.projectId || standardProject.projectId,
                    masterProjectId: existingProject.masterProjectId,
                    projectType: existingProject.projectType || "inherited",
                    deleted: false,
                    pId: existingProject.pId || session.pId || session.user?.pId,
                    tId: tenantId,
                    sId: outletStoreId,
                    role: resolveExactSessionStoreRole(session) || undefined,
                    uId: session.uId || session.user?.id,
                    modifiedBy: session.user?.name || session.user?.email || "system",
                    modifiedOn: localMutationAt,
                    ...(shouldPublish ? {
                        lastPublishedAt: localMutationAt,
                        menuVersion: nextProjectMenuVersion(existingProject.menuVersion),
                    } : {}),
                    ...(localMutationDetected ? {
                        outletLocalState: {
                            ...previousOutletLocalState,
                            localVersion: nextProjectLocalVersion(previousOutletLocalState.localVersion),
                            lastLocalChangeAt: localMutationAt,
                            lastLocalChangeBy: session.uId || session.user?.id || "unknown",
                            lastLocalChangeReason: "outlet_save",
                        },
                    } : {}),
                }, { unsafeObjectKey: "omit" });

                transaction.set(latestOutletSnap.ref, safeProject, { merge: true });
                const outletSummaryUpdate: Record<string, unknown> = {
                    lastUpdated: localMutationAt,
                };
                if (shouldPublish) {
                    transaction.update(outletStoreDocumentRef, {
                        lastPublishedAt: localMutationAt,
                        modifiedOn: localMutationAt,
                    });
                    Object.assign(
                        outletSummaryUpdate,
                        buildSummaryProjectFieldPayload(
                            effectiveStandardProject.projectId,
                            'lastPublishedAt',
                            localMutationAt,
                        ),
                    );
                }
                if (extractionReview && extractionReviewJobRef) {
                    transaction.update(extractionReviewJobRef, {
                        status: "completed",
                        completedAt: localMutationAt,
                        updatedAt: localMutationAt,
                        currentStep: "Changes applied",
                        appliedChangeCount: extractionReview.expectedChangeCount,
                    });
                }
                if (hasOwnDefinedProjectField(effectiveStandardProject, "active")) {
                    Object.assign(
                        outletSummaryUpdate,
                        buildSummaryProjectFieldPayload(effectiveStandardProject.projectId, "active", effectiveStandardProject.active),
                    );
                }
                if (Object.keys(outletSummaryUpdate).length > 1) {
                    transaction.set(
                        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${outletStoreId}`),
                        outletSummaryUpdate,
                        { merge: true },
                    );
                }
                return mergeDefinedObjectPatch(existingProject, safeProject);
            });
        } catch (error) {
            if (error instanceof LinkedOutletSaveRejection) {
                return NextResponse.json({ error: error.publicMessage }, { status: error.status });
            }
            throw error;
        }

        const postCommit = await runLinkedOutletPostCommitEffects({
            outletStoreId,
            projectId: standardProject.projectId,
            reason: "linkedOutletSave",
            tenantId,
        });

        return NextResponse.json({
            effectsPending: postCommit.effectsPending,
            failedEffectCount: postCommit.failedEffectCount,
            success: true,
            project: savedProject,
            ...(extractionReview ? { extractionReviewCompleted: true } : {}),
            ...(extractionReview ? { appliedChangeCount: extractionReview.expectedChangeCount } : {}),
        });
    } catch (error) {
        logMultiOutletFailure("linked_outlet_save_route_failed", error, failureContext);
        return NextResponse.json({ error: "Linked outlet save failed" }, { status: 500 });
    }
});
