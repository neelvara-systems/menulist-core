import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { PRODUCT_IDS } from "@constant/product";
import { ECOMSAI_PLATFORM_STORE_ID, ECOMSAI_PLATFORM_TENANT_ID, ECOMSAI_PLATFORM_USER_ID, ECOMSAI_PLATFORM_USER_NAME } from "@constant/user";
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { answerlatticeFirestoreAdmin } from "@lib/firebase/answerlatticeFirebaseAdmin";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";

type JsonRecord = Record<string, any>;

export type AiOperationBillingMode = "billable" | "free" | "internal" | "public";

export interface AiOperationLogInput extends JsonRecord {
    action: string;
    billingMode?: AiOperationBillingMode;
    candidatesTokenCount?: number;
    chargePerCredit?: number;
    clientResponse?: any;
    createdBy?: string;
    fileId?: string | null;
    geminiResponse?: any;
    model?: string;
    modifiedBy?: string;
    pId?: string | number;
    processingTime?: number;
    projectId?: string | null;
    promptTokenCount?: number;
    sId?: string | number;
    source?: string;
    tId?: string | number;
    tokenPerCredit?: number;
    totalCharge?: number;
    totalCredits?: number;
    totalTokenCount?: number;
    uId?: string;
    unitsConsumed?: number;
}

export function getGeminiUsageMetadata(response: any) {
    return response?.usageMetadata || response?.response?.usageMetadata || {};
}

function sanitizeForFirestore(value: any): any {
    if (value === undefined) return null;
    if (value === null) return null;
    if (value instanceof Date) return admin.firestore.Timestamp.fromDate(value);
    if (value && typeof value.toDate === "function" && typeof value.seconds === "number") return value;
    if (Array.isArray(value)) return value.map((item) => sanitizeForFirestore(item));
    if (typeof value === "object") {
        const result: JsonRecord = {};
        Object.entries(value).forEach(([key, nestedValue]) => {
            if (typeof nestedValue === "function") return;
            result[key] = sanitizeForFirestore(nestedValue);
        });
        return result;
    }
    return value;
}

function serializeGeminiResponse(response: any) {
    if (!response) return null;

    const usageMetadata = getGeminiUsageMetadata(response);
    let responseText: string | null = null;
    if (typeof response === "string") {
        responseText = response;
    } else if (typeof response.text === "string") {
        responseText = response.text;
    }

    return sanitizeForFirestore({
        responseTextPresent: typeof responseText === "string" && responseText.length > 0,
        responseTextLength: typeof responseText === "string" ? responseText.length : 0,
        usageMetadata,
    });
}

function shouldStoreDetailedAiOperation(): boolean {
    return FEATURE_FLAGS.AI_OPERATION_LOG_MODE === "detailed";
}

function omitUndefined(value: JsonRecord): JsonRecord {
    return Object.fromEntries(
        Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined),
    );
}

function isPlainRecord(value: unknown): value is JsonRecord {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPreSummarizedClientResponse(value: unknown): value is JsonRecord {
    return isPlainRecord(value) && typeof value.responseSummaryKind === "string";
}

function countRecordKeys(value: unknown): number {
    return isPlainRecord(value) ? Object.keys(value).length : 0;
}

function toFiniteNumber(value: unknown): number | undefined {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
}

function countNestedRecordValues(value: unknown): number {
    if (!isPlainRecord(value)) return 0;

    return Object.values(value).reduce((total, nestedValue) => {
        if (!isPlainRecord(nestedValue)) return total;
        return total + Object.keys(nestedValue).length;
    }, 0);
}

function isDescriptionOperation(action: unknown): boolean {
    return action === AI_ACTIONS_TYPES.ADD_DESCRIPTION || action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION;
}

function isImageGenerationOperation(action: unknown): boolean {
    return action === AI_ACTIONS_TYPES.IMAGE_GENERATION || action === AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION;
}

function summarizeClientResponseForOperation(response: any, action?: string): JsonRecord | null {
    if (response === undefined || response === null) return null;

    if (isPreSummarizedClientResponse(response)) return omitUndefined(response);

    if (Array.isArray(response)) {
        return omitUndefined({
            responseShape: "array",
            arrayCount: response.length,
            generatedImageCount: isImageGenerationOperation(action) ? response.length : undefined,
        });
    }

    if (!isPlainRecord(response)) {
        return {
            responseShape: typeof response,
            scalarPresent: true,
        };
    }

    const data = isPlainRecord(response.data) ? response.data : null;
    const message = typeof response.message === "string" ? response.message : "";
    const descriptionCount = isDescriptionOperation(action) ? countNestedRecordValues(response) : undefined;
    const translationCount = countRecordKeys(response.translations);

    return omitUndefined({
        responseShape: "object",
        objectKeyCount: Object.keys(response).length,
        messagePresent: message.length > 0,
        messageLength: message.length,
        qualityScore: toFiniteNumber(response.qualityScore),
        dataSummary: data ? {
            languagesCount: Array.isArray(data.languages) ? data.languages.length : 0,
            categoriesCount: Array.isArray(data.categories) ? data.categories.length : 0,
            itemsCount: Array.isArray(data.items) ? data.items.length : 0,
        } : undefined,
        descriptionSummary: descriptionCount !== undefined ? {
            itemCount: countRecordKeys(response),
            descriptionCount,
        } : undefined,
        translationsCount: translationCount || undefined,
        referencesCount: toFiniteNumber(response.referencesCount),
        createdCount: toFiniteNumber(response.createdCount),
        matchedEntityCount: toFiniteNumber(response.matchedEntityCount),
    });
}

export function buildAiOperationLog(input: AiOperationLogInput): AiOperationLogInput {
    const usageMetadata = getGeminiUsageMetadata(input.geminiResponse);
    const promptTokenCount = Number(input.promptTokenCount ?? usageMetadata.promptTokenCount ?? 0);
    const candidatesTokenCount = Number(input.candidatesTokenCount ?? usageMetadata.candidatesTokenCount ?? 0);
    const totalTokenCount = Number(input.totalTokenCount ?? usageMetadata.totalTokenCount ?? 0);
    const tokenPerCredit = Number(input.tokenPerCredit ?? TOKENS_PER_CREDIT);
    const chargePerCredit = Number(input.chargePerCredit ?? CHARGE_PER_CREDIT);
    const totalCredits = Number(input.totalCredits ?? (tokenPerCredit > 0 ? totalTokenCount / tokenPerCredit : 0));
    const unitsConsumed = Number(input.unitsConsumed ?? getUnitCost(input.action));
    const totalCharge = Number(input.totalCharge ?? chargePerCredit * totalCredits);
    const realCostPaise = Number(input.realCostPaise ?? getRealCostPaise(input.action));
    const ourChargePaise = Number(input.ourChargePaise ?? getOurChargePaise(input.action));

    const detailed = shouldStoreDetailedAiOperation();

    return {
        ...input,
        action: input.action || AI_ACTIONS_TYPES.IMAGE_PROCESSING,
        aiLogMode: detailed ? "detailed" : "accounting_only",
        billingMode: input.billingMode || (unitsConsumed > 0 ? "billable" : "free"),
        candidatesTokenCount,
        chargePerCredit,
        clientResponse: detailed ? input.clientResponse : summarizeClientResponseForOperation(input.clientResponse, input.action),
        geminiResponse: detailed ? serializeGeminiResponse(input.geminiResponse) : null,
        marginPaise: Number(input.marginPaise ?? (ourChargePaise - realCostPaise)),
        ourChargePaise,
        promptTokenCount,
        realCostPaise,
        tokenPerCredit,
        totalCharge,
        totalCredits,
        totalTokenCount,
        unitsConsumed,
    };
}

export async function recordAiOperation(input: AiOperationLogInput): Promise<string> {
    const tId = String(input.tId ?? ECOMSAI_PLATFORM_TENANT_ID);
    const sId = String(input.sId ?? ECOMSAI_PLATFORM_STORE_ID);
    const now = admin.firestore.Timestamp.now();
    const detailed = shouldStoreDetailedAiOperation();
    const detailRetentionDays = Number(FEATURE_FLAGS.AI_OPERATION_DETAIL_RETENTION_DAYS || 14);
    const productId = String(input.pId || '').toUpperCase();
    const shouldWriteAnswerlatticeOperation = productId === PRODUCT_IDS.ANSWERLATTICE
        && answerlatticeFirestoreAdmin
        && typeof (answerlatticeFirestoreAdmin as any).collection === 'function';
    const data = sanitizeForFirestore({
        ...buildAiOperationLog(input),
        ...(productId ? { pId: productId } : {}),
        tId: Number.isFinite(Number(tId)) ? Number(tId) : tId,
        sId: Number.isFinite(Number(sId)) ? Number(sId) : sId,
        uId: input.uId || ECOMSAI_PLATFORM_USER_ID,
        createdBy: input.createdBy || input.modifiedBy || ECOMSAI_PLATFORM_USER_NAME,
        modifiedBy: input.modifiedBy || input.createdBy || ECOMSAI_PLATFORM_USER_NAME,
        createdOn: input.createdOn || now,
        ...(detailed ? {
            detailExpiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + detailRetentionDays * 24 * 60 * 60 * 1000),
        } : {}),
        detailRetentionDays: detailed ? detailRetentionDays : 0,
        modifiedOn: now,
    });

    const docRef = await (shouldWriteAnswerlatticeOperation ? answerlatticeFirestoreAdmin : firestoreAdmin)
        .collection(shouldWriteAnswerlatticeOperation
            ? DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS
            : DB_COLLECTIONS.MENULIST_AI_OPERATIONS)
        .doc(tId)
        .collection(sId)
        .add(data);

    return docRef.id;
}

export async function recordAiOperationForSession(session: any, input: AiOperationLogInput): Promise<string> {
    return recordAiOperation({
        ...input,
        pId: input.pId ?? session?.pId ?? session?.user?.pId ?? session?.user?.productId,
        tId: input.tId ?? session?.tId ?? session?.user?.tenantId,
        sId: input.sId ?? session?.sId ?? session?.user?.storeId,
        uId: input.uId ?? session?.uId ?? session?.user?.id,
        createdBy: input.createdBy ?? session?.user?.name,
        modifiedBy: input.modifiedBy ?? session?.user?.name,
    });
}
