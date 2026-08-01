import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { PRODUCT_IDS } from "@constant/product";
import { ECOMSAI_PLATFORM_STORE_ID, ECOMSAI_PLATFORM_TENANT_ID, ECOMSAI_PLATFORM_USER_ID, ECOMSAI_PLATFORM_USER_NAME } from "@constant/user";
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { answerlatticeFirestoreAdmin } from "@lib/firebase/answerlatticeFirebaseAdmin";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { sanitizeForFirestore as sanitizeFirestoreValue } from "@lib/firestore/sanitizeForFirestore";

type JsonRecord = Record<string, unknown>;

export type AiOperationBillingMode = "billable" | "free" | "internal" | "public";

export interface AiOperationLogInput {
    action: string;
    articleId?: string;
    billingMode?: AiOperationBillingMode;
    byteSize?: number;
    candidatesTokenCount?: number;
    chargePerCredit?: number;
    clientResponse?: unknown;
    createdBy?: string;
    fileId?: string | null;
    geminiResponse?: unknown;
    marginPaise?: number;
    model?: string;
    modifiedBy?: string;
    ourChargePaise?: number;
    pId?: string | number;
    processingTime?: number;
    projectId?: string | null;
    promptTokenCount?: number;
    realCostPaise?: number;
    sId?: string | number;
    source?: string;
    tId?: string | number;
    tokenPerCredit?: number;
    tokenCountSource?: string;
    totalCharge?: number;
    totalCredits?: number;
    totalTokenCount?: number;
    uId?: string;
    unitsConsumed?: number;
}

export type AiOperationLog = AiOperationLogInput & {
    aiLogMode: 'accounting_only' | 'detailed';
};

const AI_OPERATION_DOCUMENT_ID_PATTERN = /^[A-Za-z0-9_-]{8,120}$/;

type AiOperationProductId = typeof PRODUCT_IDS.MENULIST | typeof PRODUCT_IDS.ANSWERLATTICE;

export type AiOperationWriteScope = {
    collectionName: typeof DB_COLLECTIONS.MENULIST_AI_OPERATIONS | typeof DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS;
    productId: AiOperationProductId;
    storeDocumentId: string;
    storeId: number;
    tenantDocumentId: string;
    tenantId: number;
};

function normalizeAiOperationScopeId(value: unknown): { documentId: string; numericId: number } | null {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const documentId = String(value);
    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId >= 0 && String(numericId) === documentId
        ? { documentId, numericId }
        : null;
}

function normalizeConsistentAiOperationScopeId(values: unknown[]): number | null | undefined {
    const supplied = values.filter((value) => value !== undefined && value !== null);
    if (supplied.length === 0) return undefined;
    const normalized = supplied.map(normalizeAiOperationScopeId);
    const first = normalized[0];
    return first && normalized.every((value) => value?.numericId === first.numericId)
        ? first.numericId
        : null;
}

function normalizeConsistentAiOperationProductId(values: unknown[]): AiOperationProductId | null {
    const supplied = values.filter((value) => value !== undefined && value !== null);
    if (supplied.length === 0) return PRODUCT_IDS.MENULIST;
    const first = supplied[0];
    if (first !== PRODUCT_IDS.MENULIST && first !== PRODUCT_IDS.ANSWERLATTICE) return null;
    return supplied.every((value) => value === first) ? first : null;
}

function normalizeConsistentAiOperationUserId(values: unknown[]): string | null | undefined {
    const supplied = values.filter((value) => value !== undefined && value !== null);
    if (supplied.length === 0) return undefined;
    if (supplied.some((value) => typeof value !== 'string' || !value || value.length > 256)) return null;
    const first = supplied[0] as string;
    return supplied.every((value) => value === first) ? first : null;
}

export function normalizeAiOperationWriteScope(
    input: Pick<AiOperationLogInput, 'pId' | 'sId' | 'tId'>,
): AiOperationWriteScope | null {
    const productId = input.pId === undefined
        ? PRODUCT_IDS.MENULIST
        : input.pId;
    if (productId !== PRODUCT_IDS.MENULIST && productId !== PRODUCT_IDS.ANSWERLATTICE) return null;

    const hasTenantId = input.tId !== undefined;
    const hasStoreId = input.sId !== undefined;
    if (hasTenantId !== hasStoreId) return null;

    const tenant = normalizeAiOperationScopeId(
        hasTenantId ? input.tId : ECOMSAI_PLATFORM_TENANT_ID,
    );
    const store = normalizeAiOperationScopeId(
        hasStoreId ? input.sId : ECOMSAI_PLATFORM_STORE_ID,
    );
    if (!tenant || !store) return null;

    const isPlatformScope = tenant.numericId === ECOMSAI_PLATFORM_TENANT_ID
        && store.numericId === ECOMSAI_PLATFORM_STORE_ID;
    const isTenantScope = tenant.numericId > 0 && store.numericId > 0;
    if (productId === PRODUCT_IDS.ANSWERLATTICE ? !isTenantScope : (!isPlatformScope && !isTenantScope)) {
        return null;
    }

    return {
        collectionName: productId === PRODUCT_IDS.ANSWERLATTICE
            ? DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS
            : DB_COLLECTIONS.MENULIST_AI_OPERATIONS,
        productId,
        storeDocumentId: store.documentId,
        storeId: store.numericId,
        tenantDocumentId: tenant.documentId,
        tenantId: tenant.numericId,
    };
}

function requireAiOperationWriteScope(
    input: Pick<AiOperationLogInput, 'pId' | 'sId' | 'tId'>,
): AiOperationWriteScope {
    const scope = normalizeAiOperationWriteScope(input);
    if (!scope) throw new Error('AI operation product or workspace scope is invalid.');
    return scope;
}

export function assertAiOperationStorageAvailable(
    scope: AiOperationWriteScope,
    answerlatticeStorageAvailable: boolean,
): void {
    if (scope.productId === PRODUCT_IDS.ANSWERLATTICE && !answerlatticeStorageAvailable) {
        throw new Error('Answerlattice AI operation storage is unavailable.');
    }
}

export function normalizeAiOperationForSessionInput(
    session: unknown,
    input: AiOperationLogInput,
): AiOperationLogInput | null {
    if (!isPlainRecord(session)) return null;
    const user = isPlainRecord(session.user) ? session.user : {};
    const productId = normalizeConsistentAiOperationProductId([
        input.pId,
        session.pId,
        session.productId,
        user.pId,
        user.productId,
    ]);
    const tenantId = normalizeConsistentAiOperationScopeId([
        input.tId,
        session.tId,
        session.tenantId,
        user.tId,
        user.tenantId,
    ]);
    const storeId = normalizeConsistentAiOperationScopeId([
        input.sId,
        session.sId,
        session.storeId,
        user.sId,
        user.storeId,
    ]);
    const userId = normalizeConsistentAiOperationUserId([
        input.uId,
        session.uId,
        user.id,
    ]);
    if (productId === null || tenantId === null || storeId === null || userId === null) return null;

    const scope = normalizeAiOperationWriteScope({
        pId: productId,
        ...(storeId !== undefined ? { sId: storeId } : {}),
        ...(tenantId !== undefined ? { tId: tenantId } : {}),
    });
    if (!scope) return null;

    return {
        ...input,
        pId: scope.productId,
        tId: scope.tenantId,
        sId: scope.storeId,
        ...(userId !== undefined ? { uId: userId } : {}),
        createdBy: input.createdBy ?? (typeof user.name === 'string' ? user.name : undefined),
        modifiedBy: input.modifiedBy ?? (typeof user.name === 'string' ? user.name : undefined),
    };
}

export function getGeminiUsageMetadata(response: unknown): JsonRecord {
    if (!isPlainRecord(response)) return {};
    if (isPlainRecord(response.usageMetadata)) return response.usageMetadata;
    return isPlainRecord(response.response) && isPlainRecord(response.response.usageMetadata)
        ? response.response.usageMetadata
        : {};
}

function sanitizeForFirestore(value: any): any {
    return sanitizeFirestoreValue(value, {
        dateTransform: (date) => admin.firestore.Timestamp.fromDate(date),
        undefinedObjectValue: "omit",
    });
}

function serializeGeminiResponse(response: unknown) {
    if (!response) return null;

    const usageMetadata = getGeminiUsageMetadata(response);
    let responseText: string | null = null;
    if (typeof response === "string") {
        responseText = response;
    } else if (isPlainRecord(response) && typeof response.text === "string") {
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

const AI_OPERATION_RESPONSE_SUMMARY_SCHEMAS = {
    answerlattice_answer_test: ['answerSource', 'providerOperationCount'],
    answerlattice_product_starter_pack: ['createdCount', 'sourceCount'],
    ai_menu_manager_planner: ['hasActionType', 'outcome', 'targetCount'],
    batch_image_generation: ['generatedImageCount'],
    business_copy_generation: ['descriptorLength', 'keywordCount', 'knownForLength', 'metaDescriptionLength', 'metaTitleLength', 'objectKeyCount', 'pwaShortNameLength', 'responseShape', 'specialNoteLength', 'taglineLength'],
    campaign_caption: ['callToActionLength', 'captionLength', 'hasCallToAction', 'hasCaption', 'hasShortCaption', 'hashtagCount', 'objectKeyCount', 'responseShape', 'shortCaptionLength'],
    description_generation: ['descriptionSummary', 'languageBucketCount', 'objectKeyCount', 'responseShape'],
    menu_card_design_advisor: ['density', 'includeContactBlock', 'includeDescriptions', 'includeQr', 'objectKeyCount', 'ownerNoteLength', 'preset', 'reasonLength', 'responseShape', 'styleId', 'warningCount'],
    new_item_metadata: ['attributeCount', 'descriptionLanguageCount', 'descriptionTotalLength', 'hasAttributes', 'hasDescription', 'hasName', 'nameLanguageCount', 'nameTotalLength', 'objectKeyCount', 'responseShape'],
    review_reply_suggestion: ['hasReply', 'rating', 'replyLength', 'responseShape', 'source'],
    seo_generation: ['keywordCount', 'metaDescriptionLength', 'metaTitleLength', 'objectKeyCount', 'responseShape', 'taglineLength'],
    translation_generation: ['fallbackKeyCount', 'hasPartialCoverage', 'objectKeyCount', 'responseShape', 'targetLanguageCount', 'translatedKeyCount', 'translationsCount'],
} as const;

type AiOperationResponseSummaryKind = keyof typeof AI_OPERATION_RESPONSE_SUMMARY_SCHEMAS;

const AI_OPERATION_RESPONSE_SUMMARY_BOOLEAN_FIELDS = new Set([
    'hasActionType',
    'hasAttributes',
    'hasCallToAction',
    'hasCaption',
    'hasDescription',
    'hasName',
    'hasPartialCoverage',
    'hasReply',
    'hasShortCaption',
    'includeContactBlock',
    'includeDescriptions',
    'includeQr',
]);

const AI_OPERATION_RESPONSE_SUMMARY_STRING_FIELDS = new Set([
    'answerSource',
    'density',
    'outcome',
    'preset',
    'source',
    'styleId',
]);

function projectAiOperationResponseSummaryField(field: string, value: unknown): unknown | null {
    if (AI_OPERATION_RESPONSE_SUMMARY_BOOLEAN_FIELDS.has(field)) {
        return typeof value === 'boolean' ? value : null;
    }
    if (AI_OPERATION_RESPONSE_SUMMARY_STRING_FIELDS.has(field)) {
        if (typeof value !== 'string' || value.length === 0 || value.length > 120) return null;
        if (field === 'source' && value !== 'ai' && value !== 'fallback') return null;
        return value;
    }
    if (field === 'responseShape') return value === 'object' ? value : null;
    if (field === 'rating') {
        return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= 5
            ? value
            : null;
    }
    if (field === 'descriptionSummary') {
        if (!isPlainRecord(value)) return null;
        const keys = Object.keys(value).sort();
        if (keys.length !== 2 || keys[0] !== 'descriptionCount' || keys[1] !== 'itemCount') return null;
        const descriptionCount = value.descriptionCount;
        const itemCount = value.itemCount;
        if (
            typeof descriptionCount !== 'number'
            || !Number.isSafeInteger(descriptionCount)
            || descriptionCount < 0
            || typeof itemCount !== 'number'
            || !Number.isSafeInteger(itemCount)
            || itemCount < 0
        ) {
            return null;
        }
        return { descriptionCount, itemCount };
    }
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
        ? value
        : null;
}

export function projectAiOperationClientResponseSummary(value: unknown): JsonRecord | null {
    if (!isPlainRecord(value) || typeof value.responseSummaryKind !== 'string') return null;
    const summaryKind = value.responseSummaryKind as AiOperationResponseSummaryKind;
    const fields = AI_OPERATION_RESPONSE_SUMMARY_SCHEMAS[summaryKind];
    if (!fields) return null;

    const expectedKeys = new Set<string>(['responseSummaryKind', ...fields]);
    const actualKeys = Object.keys(value);
    if (actualKeys.length !== expectedKeys.size || actualKeys.some((key) => !expectedKeys.has(key))) return null;

    const projected: JsonRecord = { responseSummaryKind: summaryKind };
    for (const field of fields) {
        const projectedValue = projectAiOperationResponseSummaryField(field, value[field]);
        if (projectedValue === null) return null;
        projected[field] = projectedValue;
    }
    return projected;
}

function countRecordKeys(value: unknown): number {
    return isPlainRecord(value) ? Object.keys(value).length : 0;
}

function toFiniteNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function requireNonNegativeSafeInteger(value: unknown, field: string): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
        throw new Error(`AI operation ${field} is invalid.`);
    }
    return value;
}

function requirePositiveSafeInteger(value: unknown, field: string): number {
    const integer = requireNonNegativeSafeInteger(value, field);
    if (integer === 0) throw new Error(`AI operation ${field} is invalid.`);
    return integer;
}

function requireNonNegativeFiniteNumber(value: unknown, field: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
        throw new Error(`AI operation ${field} is invalid.`);
    }
    return value;
}

function requireSafeInteger(value: unknown, field: string): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
        throw new Error(`AI operation ${field} is invalid.`);
    }
    return value;
}

function requireOptionalNonNegativeSafeInteger(value: unknown, field: string): number | undefined {
    return value === undefined ? undefined : requireNonNegativeSafeInteger(value, field);
}

function requireOptionalBoundedString(
    value: unknown,
    field: string,
    maximumLength: number,
    allowNull: true,
): string | null | undefined;
function requireOptionalBoundedString(
    value: unknown,
    field: string,
    maximumLength: number,
    allowNull?: false,
): string | undefined;
function requireOptionalBoundedString(
    value: unknown,
    field: string,
    maximumLength: number,
    allowNull = false,
): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null && allowNull) return null;
    if (typeof value !== 'string' || value.length === 0 || value.length > maximumLength) {
        throw new Error(`AI operation ${field} is invalid.`);
    }
    return value;
}

function requireAiOperationBillingMode(value: unknown, unitsConsumed: number): AiOperationBillingMode {
    if (value === undefined) return unitsConsumed > 0 ? 'billable' : 'free';
    if (value !== 'billable' && value !== 'free' && value !== 'internal' && value !== 'public') {
        throw new Error('AI operation billing mode is invalid.');
    }
    return value;
}

function requireAiOperationTokenCountSource(value: unknown): string | undefined {
    if (value === undefined) return undefined;
    if (value !== 'provider' && value !== 'estimated' && value !== 'mixed' && value !== 'none') {
        throw new Error('AI operation token count source is invalid.');
    }
    return value;
}

function countNestedRecordValues(value: unknown): number {
    if (!isPlainRecord(value)) return 0;

    return Object.values(value).reduce<number>((total, nestedValue) => {
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

export function summarizeClientResponseForOperation(response: unknown, action?: string): JsonRecord | null {
    if (response === undefined || response === null) return null;

    const projectedSummary = projectAiOperationClientResponseSummary(response);
    if (projectedSummary) return projectedSummary;

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

export function buildAiOperationLog(input: AiOperationLogInput): AiOperationLog {
    if (typeof input.action !== 'string' || input.action.length > 160) {
        throw new Error('AI operation action is invalid.');
    }
    const action = input.action || AI_ACTIONS_TYPES.IMAGE_PROCESSING;
    const usageMetadata = getGeminiUsageMetadata(input.geminiResponse);
    const promptTokenCount = requireNonNegativeSafeInteger(input.promptTokenCount ?? usageMetadata.promptTokenCount ?? 0, 'prompt token count');
    const candidatesTokenCount = requireNonNegativeSafeInteger(input.candidatesTokenCount ?? usageMetadata.candidatesTokenCount ?? 0, 'candidate token count');
    const totalTokenCount = requireNonNegativeSafeInteger(input.totalTokenCount ?? usageMetadata.totalTokenCount ?? 0, 'total token count');
    const tokenPerCredit = requirePositiveSafeInteger(input.tokenPerCredit ?? TOKENS_PER_CREDIT, 'tokens per credit');
    const chargePerCredit = requireNonNegativeSafeInteger(input.chargePerCredit ?? CHARGE_PER_CREDIT, 'charge per credit');
    const totalCredits = requireNonNegativeFiniteNumber(input.totalCredits ?? (totalTokenCount / tokenPerCredit), 'total credits');
    const unitsConsumed = requireNonNegativeSafeInteger(input.unitsConsumed ?? getUnitCost(input.action), 'units consumed');
    const totalCharge = requireNonNegativeFiniteNumber(input.totalCharge ?? chargePerCredit * totalCredits, 'total charge');
    const realCostPaise = requireNonNegativeSafeInteger(input.realCostPaise ?? getRealCostPaise(input.action), 'real cost');
    const ourChargePaise = requireNonNegativeSafeInteger(input.ourChargePaise ?? getOurChargePaise(input.action), 'owner charge');

    const detailed = shouldStoreDetailedAiOperation();

    return {
        action,
        aiLogMode: detailed ? "detailed" : "accounting_only",
        articleId: requireOptionalBoundedString(input.articleId, 'article ID', 256),
        billingMode: requireAiOperationBillingMode(input.billingMode, unitsConsumed),
        byteSize: requireOptionalNonNegativeSafeInteger(input.byteSize, 'byte size'),
        candidatesTokenCount,
        chargePerCredit,
        clientResponse: detailed ? input.clientResponse : summarizeClientResponseForOperation(input.clientResponse, input.action),
        createdBy: requireOptionalBoundedString(input.createdBy, 'creator', 256),
        fileId: requireOptionalBoundedString(input.fileId, 'file ID', 256, true),
        geminiResponse: detailed ? serializeGeminiResponse(input.geminiResponse) : null,
        marginPaise: requireSafeInteger(input.marginPaise ?? (ourChargePaise - realCostPaise), 'margin'),
        model: requireOptionalBoundedString(input.model, 'model', 180),
        modifiedBy: requireOptionalBoundedString(input.modifiedBy, 'modifier', 256),
        ourChargePaise,
        pId: input.pId,
        processingTime: requireOptionalNonNegativeSafeInteger(input.processingTime, 'processing time'),
        projectId: requireOptionalBoundedString(input.projectId, 'project ID', 256, true),
        promptTokenCount,
        realCostPaise,
        sId: input.sId,
        source: requireOptionalBoundedString(input.source, 'source', 180),
        tId: input.tId,
        tokenCountSource: requireAiOperationTokenCountSource(input.tokenCountSource),
        tokenPerCredit,
        totalCharge,
        totalCredits,
        totalTokenCount,
        uId: requireOptionalBoundedString(input.uId, 'user ID', 256),
        unitsConsumed,
    };
}

export function normalizeAiOperationDocumentId(value: unknown): string | null {
    return typeof value === 'string' && AI_OPERATION_DOCUMENT_ID_PATTERN.test(value) ? value : null;
}

export function buildAiOperationDocument(input: AiOperationLogInput) {
    const scope = requireAiOperationWriteScope(input);
    const now = admin.firestore.Timestamp.now();
    const detailed = shouldStoreDetailedAiOperation();
    const detailRetentionDays = requirePositiveSafeInteger(
        FEATURE_FLAGS.AI_OPERATION_DETAIL_RETENTION_DAYS,
        'detail retention days',
    );
    if (detailRetentionDays > 3650) throw new Error('AI operation detail retention days is invalid.');
    const operation = buildAiOperationLog(input);
    return sanitizeForFirestore({
        ...operation,
        pId: scope.productId,
        tId: scope.tenantId,
        sId: scope.storeId,
        uId: operation.uId || ECOMSAI_PLATFORM_USER_ID,
        createdBy: operation.createdBy || operation.modifiedBy || ECOMSAI_PLATFORM_USER_NAME,
        modifiedBy: operation.modifiedBy || operation.createdBy || ECOMSAI_PLATFORM_USER_NAME,
        createdOn: now,
        ...(detailed ? {
            detailExpiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + detailRetentionDays * 24 * 60 * 60 * 1000),
        } : {}),
        detailRetentionDays: detailed ? detailRetentionDays : 0,
        modifiedOn: now,
    });
}

export function getMenuListAiOperationRef(input: AiOperationLogInput, documentId: string) {
    const normalizedDocumentId = normalizeAiOperationDocumentId(documentId);
    if (!normalizedDocumentId) throw new Error('Invalid AI operation idempotency key.');
    const scope = requireAiOperationWriteScope(input);
    if (scope.productId !== PRODUCT_IDS.MENULIST) {
        throw new Error('MenuList AI operation scope is invalid.');
    }
    return firestoreAdmin
        .collection(scope.collectionName)
        .doc(scope.tenantDocumentId)
        .collection(scope.storeDocumentId)
        .doc(normalizedDocumentId);
}

export async function recordAiOperation(input: AiOperationLogInput): Promise<string> {
    const scope = requireAiOperationWriteScope(input);
    const shouldWriteAnswerlatticeOperation = scope.productId === PRODUCT_IDS.ANSWERLATTICE;
    assertAiOperationStorageAvailable(
        scope,
        Boolean(answerlatticeFirestoreAdmin && typeof answerlatticeFirestoreAdmin.collection === 'function'),
    );
    const data = buildAiOperationDocument(input);

    const docRef = await (shouldWriteAnswerlatticeOperation ? answerlatticeFirestoreAdmin : firestoreAdmin)
        .collection(scope.collectionName)
        .doc(scope.tenantDocumentId)
        .collection(scope.storeDocumentId)
        .add(data);

    return docRef.id;
}

export async function recordAiOperationForSession(session: unknown, input: AiOperationLogInput): Promise<string> {
    const operationInput = normalizeAiOperationForSessionInput(session, input);
    if (!operationInput) throw new Error('AI operation session scope is invalid.');
    return recordAiOperation(operationInput);
}
