export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { admin } from "@lib/firebase/firebaseAdmin";
import { isValidPrice } from "@lib/extraction/validation";
import { requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import { checkRateLimit } from "@lib/rateLimit";
import { validateAPIInput } from "@lib/security/inputValidation";
import { secureError } from "@lib/security/secureLogger";
import { DEFAULT_OUTLET_POLICY, LOCAL_CATEGORY_PREFIX, LOCAL_ITEM_PREFIX, type OutletPolicy } from "@type/multiOutlet.types";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const projectIdSchema = z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/);
const overrideIdSchema = z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/);
const languageCodeSchema = z.string().min(2).max(16).regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i);
const localizedTextSchema = z
    .record(languageCodeSchema, z.string().max(5000))
    .refine((value) => Object.keys(value).length <= 25, "Too many localized values");
const priceSchema = z.string().trim().refine(isValidPrice, "Invalid price format");
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
const schema = z.object({
    project: z.object({
        projectId: projectIdSchema,
        masterProjectId: projectIdSchema,
        files: z.array(z.any()).max(25).optional(),
        overrides: overridesSchema.optional(),
    }).passthrough(),
});

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const parseProjectId = (projectId: string): { tId: number; sId: number } | null => {
    const parts = projectId.split("-");
    const tId = Number(parts[0]);
    const sId = Number(parts[parts.length - 1]);

    if (!Number.isSafeInteger(tId) || tId <= 0 || !Number.isSafeInteger(sId) || sId <= 0) {
        return null;
    }

    return { tId, sId };
};

const sanitizeForFirestore = (value: any): any => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (
        typeof value === "object"
        && typeof value.toDate === "function"
        && typeof value.toMillis === "function"
    ) {
        return value;
    }
    if (Array.isArray(value)) return value.map(sanitizeForFirestore);
    if (typeof value !== "object") return value;

    const result: Record<string, any> = {};
    Object.entries(value).forEach(([key, nestedValue]) => {
        if (DANGEROUS_KEYS.has(key)) return;
        result[key] = sanitizeForFirestore(nestedValue);
    });
    return result;
};

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

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        return NextResponse.json({ error: "Multi-outlet disabled" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const validation = validateAPIInput(schema, body);
        if (validation.success !== true) {
            secureError("[Projects] Linked outlet save validation failed", new Error(validation.error), {
                tenantId: session?.tId,
                storeId: session?.sId,
            });
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        const project = validation.data.project;
        const outletProjectRef = parseProjectId(project.projectId);
        const masterProjectRef = parseProjectId(project.masterProjectId);
        if (!outletProjectRef || !masterProjectRef || outletProjectRef.tId !== masterProjectRef.tId) {
            return NextResponse.json({ error: "Invalid project reference" }, { status: 400 });
        }

        const tenantId = outletProjectRef.tId;
        const outletStoreId = outletProjectRef.sId;
        const masterStoreId = masterProjectRef.sId;
        const currentStoreId = Number(session.sId || session.user?.storeId);
        if (!verifyTenantAccess(session, tenantId, currentStoreId, request)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const rateLimit = await checkRateLimit({
            key: `outlet-save:${session.uId || session.user?.id}:${project.projectId}`,
            limit: 120,
            window: 60,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }

        const db = admin.firestore();
        const [callerStoreSnap, outletStoreSnap, masterStoreSnap, tenantSnap, existingProjectSnap] = await Promise.all([
            db.doc(`${DB_COLLECTIONS.STORES}/${currentStoreId}`).get(),
            db.doc(`${DB_COLLECTIONS.STORES}/${outletStoreId}`).get(),
            db.doc(`${DB_COLLECTIONS.STORES}/${masterStoreId}`).get(),
            db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantId}`).get(),
            db.doc(`${DB_COLLECTIONS.PROJECTS}/${tenantId}/${outletStoreId}/${project.projectId}`).get(),
        ]);

        if (!callerStoreSnap.exists || Number(callerStoreSnap.data()?.tenantId) !== tenantId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const callerStore = callerStoreSnap.data();
        const permissionError = requireAnyStorePermissionForStoreData(
            request,
            session,
            callerStore,
            [PERMISSIONS.MANAGE_MENU],
            "Linked outlet menu save",
            currentStoreId,
            tenantId,
        );
        if (permissionError) return permissionError;

        const outletStore = outletStoreSnap.data();
        if (!outletStoreSnap.exists || Number(outletStore?.tenantId) !== tenantId || outletStore?.active === false) {
            return NextResponse.json({ error: "Outlet store not available" }, { status: 404 });
        }

        const masterStore = masterStoreSnap.data();
        if (!masterStoreSnap.exists || Number(masterStore?.tenantId) !== tenantId || masterStore?.active === false) {
            return NextResponse.json({ error: "Master store not available" }, { status: 404 });
        }

        if (!tenantSnap.exists) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        const tenantStores = tenantSnap.data()?.storesList || [];
        const targetIsInTenant = tenantStores.some((store: any) => Number(store?.storeId) === outletStoreId && store?.active !== false);
        if (!targetIsInTenant) {
            return NextResponse.json({ error: "Outlet store not in tenant" }, { status: 404 });
        }

        if (currentStoreId !== outletStoreId && callerStore?.isMaster !== true) {
            return NextResponse.json({ error: "Only the outlet or master store can save this menu" }, { status: 403 });
        }

        const existingProject = existingProjectSnap.data();
        if (!existingProjectSnap.exists || existingProject?.masterProjectId !== project.masterProjectId) {
            return NextResponse.json({ error: "Linked outlet project not found" }, { status: 404 });
        }

        const nextLocalIds = collectLocalIds(project.files);
        if (nextLocalIds.invalidCategoryIds.length || nextLocalIds.invalidItemIds.length) {
            return NextResponse.json({ error: "Outlet local menu data must use local IDs" }, { status: 400 });
        }

        const previousLocalIds = collectLocalIds(existingProject.files);
        const outletPolicy = {
            ...DEFAULT_OUTLET_POLICY,
            ...(masterStore?.outletPolicy || {}),
        };
        const policyViolation = getOutletPolicyViolation(project, existingProject, outletPolicy);
        if (policyViolation) {
            return NextResponse.json({ error: policyViolation }, { status: 403 });
        }
        if (hasAddedIds(nextLocalIds.categoryIds, previousLocalIds.categoryIds) && outletPolicy.allowLocalCategories === false) {
            return NextResponse.json({ error: "Local categories are disabled for this outlet" }, { status: 403 });
        }
        if (hasAddedIds(nextLocalIds.itemIds, previousLocalIds.itemIds) && outletPolicy.allowLocalItems === false) {
            return NextResponse.json({ error: "Local items are disabled for this outlet" }, { status: 403 });
        }
        if (project.active === false && outletPolicy.allowProjectDeactivate === false) {
            return NextResponse.json({ error: "Project deactivation is disabled for this outlet" }, { status: 403 });
        }

        const localMutationAt = admin.firestore.Timestamp.now();
        const localMutationDetected = hasOutletLocalMutation(project, existingProject);
        const previousOutletLocalState = asSafeRecord(existingProject?.outletLocalState);

        const safeProject = sanitizeForFirestore({
            ...project,
            projectId: existingProject.projectId || project.projectId,
            masterProjectId: existingProject.masterProjectId,
            projectType: existingProject.projectType || project.projectType || "inherited",
            deleted: existingProject.deleted === true ? true : project.deleted === true,
            pId: project.pId || session.pId || session.user?.pId,
            tId: tenantId,
            sId: outletStoreId,
            role: session.role || session.user?.role,
            uId: session.uId || session.user?.id,
            modifiedBy: session.user?.name || session.user?.email || "system",
            modifiedOn: localMutationAt,
            ...(localMutationDetected ? {
                outletLocalState: {
                    ...previousOutletLocalState,
                    localVersion: Number(previousOutletLocalState.localVersion || 0) + 1,
                    lastLocalChangeAt: localMutationAt,
                    lastLocalChangeBy: session.uId || session.user?.id || "unknown",
                    lastLocalChangeReason: "outlet_save",
                },
            } : {}),
        });

        await existingProjectSnap.ref.set(safeProject, { merge: true });

        revalidateTag(`menu-store-${outletStoreId}`);
        revalidateTag(`store-${outletStoreId}`);
        revalidateTag("client-stores");

        return NextResponse.json({ success: true, project: safeProject });
    } catch (error) {
        secureError("[Projects] Linked outlet save failed", error as Error, {
            tenantId: session?.tId,
            storeId: session?.sId,
        });
        return NextResponse.json({ error: "Linked outlet save failed" }, { status: 500 });
    }
});
