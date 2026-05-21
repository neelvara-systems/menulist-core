import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { DB_COLLECTIONS } from "@constant/database";
import { PRODUCT_IDS } from "@constant/product";
import { ECOMSAI_PLATFORM_STORE_ID, ECOMSAI_PLATFORM_TENANT_ID, ECOMSAI_PLATFORM_USER_ID, ECOMSAI_PLATFORM_USER_NAME } from "@constant/user";
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { canonicaFirestoreAdmin } from "@lib/firebase/canonicaFirebaseAdmin";
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
    if (typeof response === "string") return response;

    const usageMetadata = getGeminiUsageMetadata(response);
    return sanitizeForFirestore({
        text: typeof response.text === "string" ? response.text.slice(0, 4000) : null,
        usageMetadata,
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

    return {
        ...input,
        action: input.action || AI_ACTIONS_TYPES.IMAGE_PROCESSING,
        billingMode: input.billingMode || (unitsConsumed > 0 ? "billable" : "free"),
        candidatesTokenCount,
        chargePerCredit,
        geminiResponse: serializeGeminiResponse(input.geminiResponse),
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
    const productId = String(input.pId || '').toUpperCase();
    const shouldWriteCanonicaOperation = productId === PRODUCT_IDS.CANONICA
        && canonicaFirestoreAdmin
        && typeof (canonicaFirestoreAdmin as any).collection === 'function';
    const data = sanitizeForFirestore({
        ...buildAiOperationLog(input),
        ...(productId ? { pId: productId } : {}),
        tId: Number.isFinite(Number(tId)) ? Number(tId) : tId,
        sId: Number.isFinite(Number(sId)) ? Number(sId) : sId,
        uId: input.uId || ECOMSAI_PLATFORM_USER_ID,
        createdBy: input.createdBy || input.modifiedBy || ECOMSAI_PLATFORM_USER_NAME,
        modifiedBy: input.modifiedBy || input.createdBy || ECOMSAI_PLATFORM_USER_NAME,
        createdOn: input.createdOn || now,
        modifiedOn: now,
    });

    const docRef = await (shouldWriteCanonicaOperation ? canonicaFirestoreAdmin : firestoreAdmin)
        .collection(shouldWriteCanonicaOperation
            ? DB_COLLECTIONS.CANONICA_AI_OPERATIONS
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
