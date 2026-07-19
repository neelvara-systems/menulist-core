import { PRODUCT_IDS } from '@constant/product';
import { ANSWERLATTICE_WIDGET_SCOPES } from '@lib/answerlattice/widgetConfig';
import { randomUUID } from 'crypto';

export const ANSWERLATTICE_WIDGET_KEY_SCHEMA_VERSION = 'answerlattice.widgetKeys.v1';
export const ANSWERLATTICE_WIDGET_KEY_LIMIT = 10;
export const ANSWERLATTICE_WIDGET_KEY_RECORD_LIMIT = 30;

const DEFAULT_KEY_NAME = 'Widget key';
const KEY_HASH_PATTERN = /^[a-f0-9]{64}$/;

export type AnswerlatticeWidgetKeyStatus = 'active' | 'revoked';

export type AnswerlatticeWidgetKeyRecord = {
    id: string;
    name: string;
    keyPrefix: string;
    keySuffix?: string | null;
    encryptedKey?: string | null;
    encryptionVersion?: string | null;
    status: AnswerlatticeWidgetKeyStatus;
    productId: typeof PRODUCT_IDS.ANSWERLATTICE;
    purpose: 'answerlattice_widget';
    scopes: string[];
    createdAt: string;
    updatedAt?: string | null;
    revokedAt?: string | null;
    legacy?: boolean;
};

export type AnswerlatticeWidgetApiState = {
    schemaVersion: typeof ANSWERLATTICE_WIDGET_KEY_SCHEMA_VERSION;
    activeKeyHash?: string | null;
    apiKeyHash?: string | null;
    keyPrefix?: string | null;
    keyHashes: string[];
    keysByHash: Record<string, AnswerlatticeWidgetKeyRecord>;
    createdAt?: string | null;
    updatedAt?: string | null;
    productId: typeof PRODUCT_IDS.ANSWERLATTICE;
    purpose: 'answerlattice_widget';
    scopes: string[];
};

export type AnswerlatticeWidgetKeySummary = {
    id: string;
    name: string;
    keyPrefix: string;
    keySuffix?: string | null;
    displayKey: string;
    createdAt?: string | null;
    updatedAt?: string | null;
    copyable: boolean;
    legacy: boolean;
    status: AnswerlatticeWidgetKeyStatus;
    isActive: boolean;
};

const safeString = (value: unknown, maxLength = 500): string => (
    typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
);

const normalizeKeyHash = (value: unknown): string | null => {
    const hash = safeString(value, 64).toLowerCase();
    return KEY_HASH_PATTERN.test(hash) ? hash : null;
};

export const normalizeAnswerlatticeWidgetKeyName = (value: unknown): string => {
    const normalized = safeString(value).replace(/\s+/g, ' ').slice(0, 80);
    return normalized || DEFAULT_KEY_NAME;
};

const normalizeRecord = (
    keyHash: string,
    rawRecord: Record<string, any>,
    fallback: Record<string, any> = {},
): AnswerlatticeWidgetKeyRecord => {
    const keyPrefix = safeString(rawRecord.keyPrefix, 12) || safeString(fallback.keyPrefix, 12) || 'al_****';
    const keySuffix = safeString(rawRecord.keySuffix, 8) || safeString(fallback.keySuffix, 8) || null;

    return {
        id: safeString(rawRecord.id, 120) || `legacy_${keyHash.slice(0, 12)}`,
        name: normalizeAnswerlatticeWidgetKeyName(rawRecord.name || fallback.name),
        keyPrefix,
        keySuffix,
        encryptedKey: safeString(rawRecord.encryptedKey) || null,
        encryptionVersion: safeString(rawRecord.encryptionVersion) || null,
        status: rawRecord.status === 'revoked' ? 'revoked' : 'active',
        productId: PRODUCT_IDS.ANSWERLATTICE,
        purpose: 'answerlattice_widget',
        scopes: Array.isArray(rawRecord.scopes) && rawRecord.scopes.length
            ? Array.from(new Set(rawRecord.scopes
                .filter((scope: unknown): scope is string => typeof scope === 'string')
                .filter(scope => ANSWERLATTICE_WIDGET_SCOPES.includes(scope as any))))
            : [...ANSWERLATTICE_WIDGET_SCOPES],
        createdAt: safeString(rawRecord.createdAt, 40) || safeString(fallback.createdAt, 40) || new Date().toISOString(),
        updatedAt: safeString(rawRecord.updatedAt, 40) || null,
        revokedAt: safeString(rawRecord.revokedAt, 40) || null,
        legacy: Boolean(rawRecord.legacy || fallback.legacy),
    };
};

export const normalizeAnswerlatticeWidgetApiState = (rawState: unknown): AnswerlatticeWidgetApiState => {
    const source = rawState && typeof rawState === 'object' ? rawState as Record<string, any> : {};
    const keysByHash: Record<string, AnswerlatticeWidgetKeyRecord> = {};
    const keyHashes: string[] = [];
    const sourceKeyHashes = Array.isArray(source.keyHashes)
        ? source.keyHashes
            .map(normalizeKeyHash)
            .filter((hash): hash is string => Boolean(hash))
            .filter((hash: string, index: number, list: string[]) => list.indexOf(hash) === index)
            .slice(0, ANSWERLATTICE_WIDGET_KEY_LIMIT)
        : [];
    const hasManagedKeyHashes = Array.isArray(source.keyHashes);

    if (source.keysByHash && typeof source.keysByHash === 'object') {
        const rawEntries = Object.entries(source.keysByHash);
        const activeHashOrder = new Map(sourceKeyHashes.map((hash, index) => [hash, index]));
        rawEntries
            .sort(([leftHash], [rightHash]) => {
                const leftOrder = activeHashOrder.get(leftHash);
                const rightOrder = activeHashOrder.get(rightHash);
                if (leftOrder !== undefined || rightOrder !== undefined) {
                    return (leftOrder ?? Number.MAX_SAFE_INTEGER) - (rightOrder ?? Number.MAX_SAFE_INTEGER);
                }
                return 0;
            })
            .slice(0, ANSWERLATTICE_WIDGET_KEY_RECORD_LIMIT)
            .forEach(([keyHash, record]) => {
            const hash = normalizeKeyHash(keyHash);
            if (!hash || !record || typeof record !== 'object') return;
            const normalized = normalizeRecord(hash, record as Record<string, any>, source);
            keysByHash[hash] = normalized;
            if (!hasManagedKeyHashes && normalized.status === 'active') keyHashes.push(hash);
            });
    }

    const legacyHash = normalizeKeyHash(source.apiKeyHash);
    if (legacyHash && !keysByHash[legacyHash]) {
        const legacyRecord = normalizeRecord(legacyHash, {
            id: safeString(source.id, 120) || `legacy_${legacyHash.slice(0, 12)}`,
            name: source.name || 'Default widget key',
            keyPrefix: source.keyPrefix,
            keySuffix: source.keySuffix,
            createdAt: source.createdAt,
            productId: source.productId,
            purpose: source.purpose,
            scopes: source.scopes,
            legacy: true,
        }, source);
        keysByHash[legacyHash] = legacyRecord;
        if (!hasManagedKeyHashes || sourceKeyHashes.includes(legacyHash)) {
            keyHashes.push(legacyHash);
        }
    }

    sourceKeyHashes.forEach((hash) => {
        if (keysByHash[hash]?.status === 'active' && !keyHashes.includes(hash)) {
            keyHashes.push(hash);
        }
    });

    const activeHashes = keyHashes
        .filter((hash, index, list) => Boolean(keysByHash[hash]) && list.indexOf(hash) === index)
        .slice(0, ANSWERLATTICE_WIDGET_KEY_LIMIT);
    const normalizedActiveKeyHash = normalizeKeyHash(source.activeKeyHash);
    const activeKeyHash = normalizedActiveKeyHash && activeHashes.includes(normalizedActiveKeyHash)
        ? normalizedActiveKeyHash
        : activeHashes[0] || null;
    const activeRecord = activeKeyHash ? keysByHash[activeKeyHash] : null;

    return {
        schemaVersion: ANSWERLATTICE_WIDGET_KEY_SCHEMA_VERSION,
        activeKeyHash,
        apiKeyHash: activeKeyHash,
        keyPrefix: activeRecord?.keyPrefix || null,
        keyHashes: activeHashes,
        keysByHash,
        createdAt: safeString(source.createdAt) || activeRecord?.createdAt || null,
        updatedAt: safeString(source.updatedAt) || null,
        productId: PRODUCT_IDS.ANSWERLATTICE,
        purpose: 'answerlattice_widget',
        scopes: [...ANSWERLATTICE_WIDGET_SCOPES],
    };
};

export const getAnswerlatticeWidgetKeyRecordByHash = (
    rawState: unknown,
    keyHash: string,
): AnswerlatticeWidgetKeyRecord | null => {
    const normalizedKeyHash = normalizeKeyHash(keyHash);
    if (!normalizedKeyHash) return null;
    const state = normalizeAnswerlatticeWidgetApiState(rawState);
    const record = state.keysByHash[normalizedKeyHash];
    return record?.status === 'active' ? record : null;
};

export const getAnswerlatticeWidgetKeyRecordById = (
    rawState: unknown,
    keyId: string,
): { keyHash: string; record: AnswerlatticeWidgetKeyRecord; state: AnswerlatticeWidgetApiState } | null => {
    const state = normalizeAnswerlatticeWidgetApiState(rawState);
    const match = Object.entries(state.keysByHash)
        .find(([, record]) => record.status === 'active' && record.id === keyId);
    if (!match) return null;
    return { keyHash: match[0], record: match[1], state };
};

export const buildAnswerlatticeWidgetKeySummaries = (rawState: unknown): AnswerlatticeWidgetKeySummary[] => {
    const state = normalizeAnswerlatticeWidgetApiState(rawState);

    return state.keyHashes
        .map((keyHash) => {
            const record = state.keysByHash[keyHash];
            if (!record || record.status !== 'active') return null;
            const suffix = record.keySuffix ? `...${record.keySuffix}` : '...';
            const summary: AnswerlatticeWidgetKeySummary = {
                id: record.id,
                name: record.name,
                keyPrefix: record.keyPrefix,
                keySuffix: record.keySuffix || null,
                displayKey: `${record.keyPrefix}${suffix}`,
                createdAt: record.createdAt,
                updatedAt: record.updatedAt || null,
                copyable: false,
                legacy: Boolean(record.legacy),
                status: record.status,
                isActive: state.activeKeyHash === keyHash,
            };
            return summary;
        })
        .filter((record): record is AnswerlatticeWidgetKeySummary => Boolean(record));
};

export const buildAnswerlatticeWidgetApiStateWithNewKey = (params: {
    currentState?: unknown;
    apiKey: string;
    keyHash: string;
    name?: string | null;
    nowIso?: string;
}): { state: AnswerlatticeWidgetApiState; record: AnswerlatticeWidgetKeyRecord; copyable: boolean } => {
    const nowIso = params.nowIso || new Date().toISOString();
    const currentState = normalizeAnswerlatticeWidgetApiState(params.currentState);
    const normalizedKeyHash = normalizeKeyHash(params.keyHash);
    if (!normalizedKeyHash || !/^al_[A-Za-z0-9_-]{20,128}$/.test(params.apiKey)) {
        throw new Error('ANSWERLATTICE_WIDGET_KEY_INVALID');
    }
    if (currentState.keyHashes.length >= ANSWERLATTICE_WIDGET_KEY_LIMIT) {
        throw new Error('ANSWERLATTICE_WIDGET_KEY_LIMIT_REACHED');
    }

    const record: AnswerlatticeWidgetKeyRecord = {
        id: randomUUID(),
        name: normalizeAnswerlatticeWidgetKeyName(params.name),
        keyPrefix: params.apiKey.slice(0, 7),
        keySuffix: params.apiKey.slice(-4),
        encryptedKey: null,
        encryptionVersion: null,
        status: 'active',
        productId: PRODUCT_IDS.ANSWERLATTICE,
        purpose: 'answerlattice_widget',
        scopes: [...ANSWERLATTICE_WIDGET_SCOPES],
        createdAt: nowIso,
        updatedAt: nowIso,
        legacy: false,
    };

    const keysByHash = {
        ...currentState.keysByHash,
        [normalizedKeyHash]: record,
    };
    const keyHashes = [normalizedKeyHash, ...currentState.keyHashes.filter((hash) => hash !== normalizedKeyHash)]
        .slice(0, ANSWERLATTICE_WIDGET_KEY_LIMIT);

    return {
        record,
        copyable: false,
        state: {
            ...currentState,
            activeKeyHash: normalizedKeyHash,
            apiKeyHash: normalizedKeyHash,
            keyPrefix: record.keyPrefix,
            keyHashes,
            keysByHash,
            createdAt: currentState.createdAt || nowIso,
            updatedAt: nowIso,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            purpose: 'answerlattice_widget',
            scopes: [...ANSWERLATTICE_WIDGET_SCOPES],
        },
    };
};

export const renameAnswerlatticeWidgetKey = (params: {
    currentState: unknown;
    keyId: string;
    name: string;
    nowIso?: string;
}): AnswerlatticeWidgetApiState | null => {
    const match = getAnswerlatticeWidgetKeyRecordById(params.currentState, params.keyId);
    if (!match) return null;

    const nowIso = params.nowIso || new Date().toISOString();
    const updatedRecord: AnswerlatticeWidgetKeyRecord = {
        ...match.record,
        name: normalizeAnswerlatticeWidgetKeyName(params.name),
        updatedAt: nowIso,
    };

    return {
        ...match.state,
        keysByHash: {
            ...match.state.keysByHash,
            [match.keyHash]: updatedRecord,
        },
        updatedAt: nowIso,
    };
};

export const revokeAnswerlatticeWidgetKey = (params: {
    currentState: unknown;
    keyId: string;
    nowIso?: string;
}): AnswerlatticeWidgetApiState | null => {
    const match = getAnswerlatticeWidgetKeyRecordById(params.currentState, params.keyId);
    if (!match) return null;

    const nowIso = params.nowIso || new Date().toISOString();
    const revokedRecord: AnswerlatticeWidgetKeyRecord = {
        ...match.record,
        status: 'revoked',
        revokedAt: nowIso,
        updatedAt: nowIso,
    };
    const keyHashes = match.state.keyHashes.filter(hash => hash !== match.keyHash);
    const activeKeyHash = keyHashes[0] || null;
    const activeRecord = activeKeyHash ? match.state.keysByHash[activeKeyHash] : null;
    const keysByHash = {
        ...match.state.keysByHash,
        [match.keyHash]: revokedRecord,
    };
    const activeEntries = new Set(keyHashes);
    const retainedRevokedHashes = Object.entries(keysByHash)
        .filter(([hash, record]) => !activeEntries.has(hash) && record.status === 'revoked')
        .sort((left, right) => String(right[1].revokedAt || right[1].updatedAt || '').localeCompare(String(left[1].revokedAt || left[1].updatedAt || '')))
        .slice(0, Math.max(ANSWERLATTICE_WIDGET_KEY_RECORD_LIMIT - keyHashes.length, 0))
        .map(([hash]) => hash);
    const retainedHashes = new Set([...keyHashes, ...retainedRevokedHashes]);

    return {
        ...match.state,
        activeKeyHash,
        apiKeyHash: activeKeyHash,
        keyPrefix: activeRecord?.keyPrefix || null,
        keyHashes,
        keysByHash: Object.fromEntries(Object.entries(keysByHash).filter(([hash]) => retainedHashes.has(hash))),
        updatedAt: nowIso,
    };
};
