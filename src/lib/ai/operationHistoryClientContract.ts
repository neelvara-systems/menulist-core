import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import GlobalLanguagesList from '@data/languages';

export type AiOperationHistoryJsonValue =
    | boolean
    | null
    | number
    | string
    | AiOperationHistoryJsonValue[]
    | { [key: string]: AiOperationHistoryJsonValue };

export type AiOperationHistoryJsonObject = { [key: string]: AiOperationHistoryJsonValue };

export type AiOperationHistoryLanguage = {
    code?: string;
    name?: string;
};

export type AiOperationHistoryLanguageValue = AiOperationHistoryLanguage | string;

const AI_OPERATION_LANGUAGE_NAMES = new Map(
    GlobalLanguagesList.map((language) => [language.code, language.name]),
);

export const formatAiOperationHistoryLanguage = (
    value: AiOperationHistoryLanguageValue | undefined,
): string => {
    if (!value) return '';
    if (typeof value === 'string') {
        const name = AI_OPERATION_LANGUAGE_NAMES.get(value);
        return name ? `${name} (${value})` : value;
    }
    if (value.name && value.code) return `${value.name} (${value.code})`;
    if (value.name) return value.name;
    if (value.code) {
        const name = AI_OPERATION_LANGUAGE_NAMES.get(value.code);
        return name ? `${name} (${value.code})` : value.code;
    }
    return '';
};

export type AiOperationHistoryFile = {
    name?: string;
    type?: string;
    uid?: string;
    url?: string;
};

export type AiOperationHistoryItem = {
    description?: Record<string, string>;
    id?: string;
    name?: string;
};

export type AiOperationHistoryRow = {
    action: string;
    aiProviderOperations?: AiOperationHistoryJsonValue;
    billingMode?: string;
    byteSize?: number;
    candidatesTokenCount?: number;
    chargePerCredit?: number;
    clientResponse?: AiOperationHistoryJsonValue;
    contentLength?: 'Large' | 'Medium' | 'Small';
    createdOn: string;
    creditConsumption?: AiOperationHistoryJsonValue;
    fileId?: string;
    files?: AiOperationHistoryFile[];
    generationConfig?: AiOperationHistoryJsonValue;
    id: string;
    inputStrings?: Record<string, string>;
    itemDetails?: { name?: string };
    itemsList?: AiOperationHistoryItem[];
    languageSummary?: AiOperationHistoryJsonValue;
    marginPaise?: number;
    model?: string;
    modifiedOn?: string;
    ourChargePaise?: number;
    processingTime?: number;
    projectId?: string;
    promptTokenCount?: number;
    realCostPaise?: number;
    source?: string;
    sourceLang?: AiOperationHistoryLanguageValue;
    storeId?: string;
    targetLang?: AiOperationHistoryLanguageValue | AiOperationHistoryLanguageValue[];
    targetLanguages?: AiOperationHistoryLanguageValue[];
    tokenCountSource?: string;
    tokenPerCredit?: number;
    totalCharge?: number;
    totalCredits?: number;
    totalTokenCount?: number;
    transactionId?: string;
    unitsConsumed?: number;
};

export type AiOperationHistoryCursor = { id: string } | null;

export type AiOperationHistoryPage = {
    data: AiOperationHistoryRow[];
    hasMore: boolean;
    lastVisibleDoc: AiOperationHistoryCursor;
    requiresManualContinuation?: boolean;
};

const STRING_FIELDS = [
    'billingMode',
    'fileId',
    'model',
    'projectId',
    'source',
    'storeId',
    'tokenCountSource',
    'transactionId',
] as const;

const NUMBER_FIELDS = [
    'byteSize',
    'candidatesTokenCount',
    'chargePerCredit',
    'marginPaise',
    'ourChargePaise',
    'processingTime',
    'promptTokenCount',
    'realCostPaise',
    'tokenPerCredit',
    'totalCharge',
    'totalCredits',
    'totalTokenCount',
    'unitsConsumed',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

export const getAiOperationHistoryJsonObject = (
    value: AiOperationHistoryJsonValue | undefined,
): AiOperationHistoryJsonObject | null => (
    value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value
        : null
);

export const getAiOperationHistoryJsonObjectArray = (
    value: AiOperationHistoryJsonValue | undefined,
): AiOperationHistoryJsonObject[] => (
    Array.isArray(value)
        ? value.filter((entry): entry is AiOperationHistoryJsonObject => (
            entry !== null && typeof entry === 'object' && !Array.isArray(entry)
        ))
        : []
);

function isCanonicalIsoDate(value: unknown): value is string {
    if (typeof value !== 'string' || value.length > 32) return false;
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function isJsonValue(value: unknown, depth = 0): value is AiOperationHistoryJsonValue {
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (depth >= 12 || !value || typeof value !== 'object') return false;
    if (Array.isArray(value)) return value.every((entry) => isJsonValue(entry, depth + 1));
    return Object.values(value).every((entry) => isJsonValue(entry, depth + 1));
}

function normalizeLanguage(value: unknown): AiOperationHistoryLanguageValue | null {
    if (typeof value === 'string') return value.length <= 160 ? value : null;
    if (!isRecord(value)) return null;
    if (value.code !== undefined && typeof value.code !== 'string') return null;
    if (value.name !== undefined && typeof value.name !== 'string') return null;
    return {
        ...(typeof value.code === 'string' ? { code: value.code } : {}),
        ...(typeof value.name === 'string' ? { name: value.name } : {}),
    };
}

function normalizeLanguageList(value: unknown): AiOperationHistoryLanguageValue[] | null {
    if (!Array.isArray(value)) return null;
    const languages = value.map(normalizeLanguage);
    return languages.every((language): language is AiOperationHistoryLanguageValue => language !== null)
        ? languages
        : null;
}

function normalizeStringRecord(value: unknown): Record<string, string> | null {
    if (!isRecord(value) || Object.values(value).some((entry) => typeof entry !== 'string')) return null;
    return Object.fromEntries(Object.entries(value) as Array<[string, string]>);
}

function normalizeFiles(value: unknown): AiOperationHistoryFile[] | null {
    if (!Array.isArray(value)) return null;
    const files = value.map((entry) => {
        if (!isRecord(entry)) return null;
        for (const key of ['name', 'type', 'uid', 'url'] as const) {
            if (entry[key] !== undefined && typeof entry[key] !== 'string') return null;
        }
        return {
            ...(typeof entry.name === 'string' ? { name: entry.name } : {}),
            ...(typeof entry.type === 'string' ? { type: entry.type } : {}),
            ...(typeof entry.uid === 'string' ? { uid: entry.uid } : {}),
            ...(typeof entry.url === 'string' ? { url: entry.url } : {}),
        };
    });
    return files.every((file): file is AiOperationHistoryFile => Boolean(file)) ? files : null;
}

function normalizeItems(value: unknown): AiOperationHistoryItem[] | null {
    if (!Array.isArray(value)) return null;
    const items = value.map((entry) => {
        if (!isRecord(entry)) return null;
        if (entry.id !== undefined && typeof entry.id !== 'string') return null;
        if (entry.name !== undefined && typeof entry.name !== 'string') return null;
        const description = entry.description === undefined ? undefined : normalizeStringRecord(entry.description);
        if (entry.description !== undefined && !description) return null;
        return {
            ...(description ? { description } : {}),
            ...(typeof entry.id === 'string' ? { id: entry.id } : {}),
            ...(typeof entry.name === 'string' ? { name: entry.name } : {}),
        };
    });
    return items.every((item): item is AiOperationHistoryItem => Boolean(item)) ? items : null;
}

export function normalizeAiOperationHistoryRow(value: unknown): AiOperationHistoryRow | null {
    if (!isRecord(value)) return null;
    if (
        typeof value.id !== 'string'
        || !isValidFirestoreDocumentId(value.id)
        || typeof value.action !== 'string'
        || value.action.length === 0
        || value.action.length > 120
        || !isCanonicalIsoDate(value.createdOn)
    ) {
        return null;
    }

    const row: AiOperationHistoryRow = {
        action: value.action,
        createdOn: value.createdOn,
        id: value.id,
    };

    for (const field of STRING_FIELDS) {
        const fieldValue = value[field];
        if (fieldValue === undefined) continue;
        if (typeof fieldValue !== 'string' || fieldValue.length > 1000) return null;
        row[field] = fieldValue;
    }
    for (const field of NUMBER_FIELDS) {
        const fieldValue = value[field];
        if (fieldValue === undefined) continue;
        if (typeof fieldValue !== 'number' || !Number.isFinite(fieldValue)) return null;
        row[field] = fieldValue;
    }

    if (value.modifiedOn !== undefined) {
        if (!isCanonicalIsoDate(value.modifiedOn)) return null;
        row.modifiedOn = value.modifiedOn;
    }
    if (value.contentLength !== undefined) {
        if (value.contentLength !== 'Large' && value.contentLength !== 'Medium' && value.contentLength !== 'Small') return null;
        row.contentLength = value.contentLength;
    }

    for (const field of ['aiProviderOperations', 'clientResponse', 'creditConsumption', 'generationConfig', 'languageSummary'] as const) {
        const fieldValue = value[field];
        if (fieldValue === undefined) continue;
        if (!isJsonValue(fieldValue)) return null;
        row[field] = fieldValue;
    }

    if (value.inputStrings !== undefined) {
        const inputStrings = normalizeStringRecord(value.inputStrings);
        if (!inputStrings) return null;
        row.inputStrings = inputStrings;
    }
    if (value.itemDetails !== undefined) {
        if (!isRecord(value.itemDetails) || (value.itemDetails.name !== undefined && typeof value.itemDetails.name !== 'string')) return null;
        row.itemDetails = typeof value.itemDetails.name === 'string' ? { name: value.itemDetails.name } : {};
    }
    if (value.itemsList !== undefined) {
        const items = normalizeItems(value.itemsList);
        if (!items) return null;
        row.itemsList = items;
    }
    if (value.files !== undefined) {
        const files = normalizeFiles(value.files);
        if (!files) return null;
        row.files = files;
    }
    if (value.sourceLang !== undefined) {
        const sourceLang = normalizeLanguage(value.sourceLang);
        if (!sourceLang) return null;
        row.sourceLang = sourceLang;
    }
    if (value.targetLang !== undefined) {
        const targetLang = Array.isArray(value.targetLang)
            ? normalizeLanguageList(value.targetLang)
            : normalizeLanguage(value.targetLang);
        if (!targetLang) return null;
        row.targetLang = targetLang;
    }
    if (value.targetLanguages !== undefined) {
        const targetLanguages = normalizeLanguageList(value.targetLanguages);
        if (!targetLanguages) return null;
        row.targetLanguages = targetLanguages;
    }

    return row;
}

export function normalizeAiOperationHistoryPage(
    value: unknown,
    options: { requireManualContinuationField: boolean },
): AiOperationHistoryPage | null {
    if (!isRecord(value) || !Array.isArray(value.data) || typeof value.hasMore !== 'boolean') return null;

    const cursorValue = value.lastVisibleDoc;
    let lastVisibleDoc: AiOperationHistoryCursor = null;
    if (cursorValue !== null) {
        if (
            !isRecord(cursorValue)
            || Object.keys(cursorValue).length !== 1
            || typeof cursorValue.id !== 'string'
            || !isValidFirestoreDocumentId(cursorValue.id)
        ) {
            return null;
        }
        lastVisibleDoc = { id: cursorValue.id };
    }

    const rows = value.data.map(normalizeAiOperationHistoryRow);
    if (!rows.every((row): row is AiOperationHistoryRow => Boolean(row))) return null;
    if (value.hasMore && !lastVisibleDoc) return null;

    if (options.requireManualContinuationField) {
        if (typeof value.requiresManualContinuation !== 'boolean') return null;
        if (value.requiresManualContinuation && (!value.hasMore || !lastVisibleDoc || rows.length > 0)) return null;
        return {
            data: rows,
            hasMore: value.hasMore,
            lastVisibleDoc,
            requiresManualContinuation: value.requiresManualContinuation,
        };
    }

    return { data: rows, hasMore: value.hasMore, lastVisibleDoc };
}
