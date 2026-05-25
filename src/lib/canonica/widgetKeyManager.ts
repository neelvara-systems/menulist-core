import { PRODUCT_IDS } from '@constant/product';
import { CANONICA_WIDGET_SCOPES } from '@lib/canonica/widgetConfig';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'crypto';

export const CANONICA_WIDGET_KEY_SCHEMA_VERSION = 'canonica.widgetKeys.v1';
export const CANONICA_WIDGET_KEY_LIMIT = 10;

const DEFAULT_KEY_NAME = 'Widget key';
const ENCRYPTION_PREFIX = 'v1';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_SECRET_ENV = 'CANONICA_WIDGET_KEY_ENCRYPTION_SECRET';

export type CanonicaWidgetKeyStatus = 'active' | 'revoked';

export type CanonicaWidgetKeyRecord = {
    id: string;
    name: string;
    keyPrefix: string;
    keySuffix?: string | null;
    encryptedKey?: string | null;
    encryptionVersion?: string | null;
    status: CanonicaWidgetKeyStatus;
    productId: typeof PRODUCT_IDS.CANONICA;
    purpose: 'canonica_widget';
    scopes: string[];
    createdAt: string;
    updatedAt?: string | null;
    revokedAt?: string | null;
    legacy?: boolean;
};

export type CanonicaWidgetApiState = {
    schemaVersion: typeof CANONICA_WIDGET_KEY_SCHEMA_VERSION;
    activeKeyHash?: string | null;
    apiKeyHash?: string | null;
    keyPrefix?: string | null;
    keyHashes: string[];
    keysByHash: Record<string, CanonicaWidgetKeyRecord>;
    createdAt?: string | null;
    updatedAt?: string | null;
    productId: typeof PRODUCT_IDS.CANONICA;
    purpose: 'canonica_widget';
    scopes: string[];
};

export type CanonicaWidgetKeySummary = {
    id: string;
    name: string;
    keyPrefix: string;
    keySuffix?: string | null;
    displayKey: string;
    createdAt?: string | null;
    updatedAt?: string | null;
    copyable: boolean;
    legacy: boolean;
    status: CanonicaWidgetKeyStatus;
    isActive: boolean;
};

const safeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const normalizeCanonicaWidgetKeyName = (value: unknown): string => {
    const normalized = safeString(value).replace(/\s+/g, ' ').slice(0, 80);
    return normalized || DEFAULT_KEY_NAME;
};

export const getCanonicaWidgetKeyEncryptionReadiness = () => ({
    configured: Boolean(safeString(process.env[ENCRYPTION_SECRET_ENV])),
    envName: ENCRYPTION_SECRET_ENV,
});

const getEncryptionKey = (): Buffer | null => {
    const secret = safeString(process.env[ENCRYPTION_SECRET_ENV]);
    if (!secret) return null;
    return createHash('sha256').update(secret).digest();
};

export const encryptCanonicaWidgetKey = (apiKey: string): string | null => {
    const encryptionKey = getEncryptionKey();
    if (!encryptionKey) return null;

    const iv = randomBytes(12);
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [
        ENCRYPTION_PREFIX,
        iv.toString('base64url'),
        tag.toString('base64url'),
        ciphertext.toString('base64url'),
    ].join(':');
};

export const decryptCanonicaWidgetKey = (encryptedKey: unknown): string | null => {
    const encrypted = safeString(encryptedKey);
    const encryptionKey = getEncryptionKey();
    if (!encrypted || !encryptionKey) return null;

    const [version, ivPart, tagPart, ciphertextPart] = encrypted.split(':');
    if (version !== ENCRYPTION_PREFIX || !ivPart || !tagPart || !ciphertextPart) return null;

    try {
        const decipher = createDecipheriv(
            ENCRYPTION_ALGORITHM,
            encryptionKey,
            Buffer.from(ivPart, 'base64url'),
        );
        decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
        const plaintext = Buffer.concat([
            decipher.update(Buffer.from(ciphertextPart, 'base64url')),
            decipher.final(),
        ]);
        return plaintext.toString('utf8');
    } catch {
        return null;
    }
};

const normalizeRecord = (
    keyHash: string,
    rawRecord: Record<string, any>,
    fallback: Record<string, any> = {},
): CanonicaWidgetKeyRecord => {
    const keyPrefix = safeString(rawRecord.keyPrefix) || safeString(fallback.keyPrefix) || 'cn_****';
    const keySuffix = safeString(rawRecord.keySuffix) || safeString(fallback.keySuffix) || null;

    return {
        id: safeString(rawRecord.id) || `legacy_${keyHash.slice(0, 12)}`,
        name: normalizeCanonicaWidgetKeyName(rawRecord.name || fallback.name),
        keyPrefix,
        keySuffix,
        encryptedKey: safeString(rawRecord.encryptedKey) || null,
        encryptionVersion: safeString(rawRecord.encryptionVersion) || null,
        status: rawRecord.status === 'revoked' ? 'revoked' : 'active',
        productId: PRODUCT_IDS.CANONICA,
        purpose: 'canonica_widget',
        scopes: Array.isArray(rawRecord.scopes) && rawRecord.scopes.length
            ? rawRecord.scopes.filter((scope: unknown): scope is string => typeof scope === 'string')
            : [...CANONICA_WIDGET_SCOPES],
        createdAt: safeString(rawRecord.createdAt) || safeString(fallback.createdAt) || new Date().toISOString(),
        updatedAt: safeString(rawRecord.updatedAt) || null,
        revokedAt: safeString(rawRecord.revokedAt) || null,
        legacy: Boolean(rawRecord.legacy || fallback.legacy),
    };
};

export const normalizeCanonicaWidgetApiState = (rawState: unknown): CanonicaWidgetApiState => {
    const source = rawState && typeof rawState === 'object' ? rawState as Record<string, any> : {};
    const keysByHash: Record<string, CanonicaWidgetKeyRecord> = {};
    const keyHashes: string[] = [];
    const sourceKeyHashes = Array.isArray(source.keyHashes)
        ? source.keyHashes
            .map((hashValue: unknown) => safeString(hashValue))
            .filter((hash: string, index: number, list: string[]) => Boolean(hash) && list.indexOf(hash) === index)
        : [];
    const hasManagedKeyHashes = Array.isArray(source.keyHashes);

    if (source.keysByHash && typeof source.keysByHash === 'object') {
        Object.entries(source.keysByHash).forEach(([keyHash, record]) => {
            const hash = safeString(keyHash);
            if (!hash || !record || typeof record !== 'object') return;
            const normalized = normalizeRecord(hash, record as Record<string, any>, source);
            keysByHash[hash] = normalized;
            if (!hasManagedKeyHashes && normalized.status === 'active') keyHashes.push(hash);
        });
    }

    const legacyHash = safeString(source.apiKeyHash);
    if (legacyHash && !keysByHash[legacyHash]) {
        const legacyRecord = normalizeRecord(legacyHash, {
            id: safeString(source.id) || `legacy_${legacyHash.slice(0, 12)}`,
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
        .slice(0, CANONICA_WIDGET_KEY_LIMIT);
    const activeKeyHash = safeString(source.activeKeyHash) && activeHashes.includes(source.activeKeyHash)
        ? source.activeKeyHash
        : activeHashes[0] || null;
    const activeRecord = activeKeyHash ? keysByHash[activeKeyHash] : null;

    return {
        schemaVersion: CANONICA_WIDGET_KEY_SCHEMA_VERSION,
        activeKeyHash,
        apiKeyHash: activeKeyHash,
        keyPrefix: activeRecord?.keyPrefix || null,
        keyHashes: activeHashes,
        keysByHash,
        createdAt: safeString(source.createdAt) || activeRecord?.createdAt || null,
        updatedAt: safeString(source.updatedAt) || null,
        productId: PRODUCT_IDS.CANONICA,
        purpose: 'canonica_widget',
        scopes: [...CANONICA_WIDGET_SCOPES],
    };
};

export const getCanonicaWidgetKeyRecordByHash = (
    rawState: unknown,
    keyHash: string,
): CanonicaWidgetKeyRecord | null => {
    const state = normalizeCanonicaWidgetApiState(rawState);
    const record = state.keysByHash[keyHash];
    return record?.status === 'active' ? record : null;
};

export const getCanonicaWidgetKeyRecordById = (
    rawState: unknown,
    keyId: string,
): { keyHash: string; record: CanonicaWidgetKeyRecord; state: CanonicaWidgetApiState } | null => {
    const state = normalizeCanonicaWidgetApiState(rawState);
    const match = Object.entries(state.keysByHash)
        .find(([, record]) => record.status === 'active' && record.id === keyId);
    if (!match) return null;
    return { keyHash: match[0], record: match[1], state };
};

export const buildCanonicaWidgetKeySummaries = (rawState: unknown): CanonicaWidgetKeySummary[] => {
    const state = normalizeCanonicaWidgetApiState(rawState);
    const encryptionReady = getCanonicaWidgetKeyEncryptionReadiness().configured;

    return state.keyHashes
        .map((keyHash) => {
            const record = state.keysByHash[keyHash];
            if (!record || record.status !== 'active') return null;
            const suffix = record.keySuffix ? `...${record.keySuffix}` : '...';
            const summary: CanonicaWidgetKeySummary = {
                id: record.id,
                name: record.name,
                keyPrefix: record.keyPrefix,
                keySuffix: record.keySuffix || null,
                displayKey: `${record.keyPrefix}${suffix}`,
                createdAt: record.createdAt,
                updatedAt: record.updatedAt || null,
                copyable: Boolean(record.encryptedKey && encryptionReady),
                legacy: Boolean(record.legacy || !record.encryptedKey),
                status: record.status,
                isActive: state.activeKeyHash === keyHash,
            };
            return summary;
        })
        .filter((record): record is CanonicaWidgetKeySummary => Boolean(record));
};

export const buildCanonicaWidgetApiStateWithNewKey = (params: {
    currentState?: unknown;
    apiKey: string;
    keyHash: string;
    name?: string | null;
    nowIso?: string;
}): { state: CanonicaWidgetApiState; record: CanonicaWidgetKeyRecord; copyable: boolean } => {
    const nowIso = params.nowIso || new Date().toISOString();
    const currentState = normalizeCanonicaWidgetApiState(params.currentState);
    if (currentState.keyHashes.length >= CANONICA_WIDGET_KEY_LIMIT) {
        throw new Error('CANONICA_WIDGET_KEY_LIMIT_REACHED');
    }

    const encryptedKey = encryptCanonicaWidgetKey(params.apiKey);
    const record: CanonicaWidgetKeyRecord = {
        id: randomUUID(),
        name: normalizeCanonicaWidgetKeyName(params.name),
        keyPrefix: params.apiKey.slice(0, 7),
        keySuffix: params.apiKey.slice(-4),
        encryptedKey,
        encryptionVersion: encryptedKey ? `${ENCRYPTION_ALGORITHM}:${ENCRYPTION_PREFIX}` : null,
        status: 'active',
        productId: PRODUCT_IDS.CANONICA,
        purpose: 'canonica_widget',
        scopes: [...CANONICA_WIDGET_SCOPES],
        createdAt: nowIso,
        updatedAt: nowIso,
        legacy: !encryptedKey,
    };

    const keysByHash = {
        ...currentState.keysByHash,
        [params.keyHash]: record,
    };
    const keyHashes = [params.keyHash, ...currentState.keyHashes.filter((hash) => hash !== params.keyHash)]
        .slice(0, CANONICA_WIDGET_KEY_LIMIT);

    return {
        record,
        copyable: Boolean(encryptedKey),
        state: {
            ...currentState,
            activeKeyHash: params.keyHash,
            apiKeyHash: params.keyHash,
            keyPrefix: record.keyPrefix,
            keyHashes,
            keysByHash,
            createdAt: currentState.createdAt || nowIso,
            updatedAt: nowIso,
            productId: PRODUCT_IDS.CANONICA,
            purpose: 'canonica_widget',
            scopes: [...CANONICA_WIDGET_SCOPES],
        },
    };
};

export const renameCanonicaWidgetKey = (params: {
    currentState: unknown;
    keyId: string;
    name: string;
    nowIso?: string;
}): CanonicaWidgetApiState | null => {
    const match = getCanonicaWidgetKeyRecordById(params.currentState, params.keyId);
    if (!match) return null;

    const nowIso = params.nowIso || new Date().toISOString();
    const updatedRecord: CanonicaWidgetKeyRecord = {
        ...match.record,
        name: normalizeCanonicaWidgetKeyName(params.name),
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

export const deleteCanonicaWidgetKey = (params: {
    currentState: unknown;
    keyId: string;
    nowIso?: string;
}): CanonicaWidgetApiState | null => {
    const match = getCanonicaWidgetKeyRecordById(params.currentState, params.keyId);
    if (!match) return null;

    const nowIso = params.nowIso || new Date().toISOString();
    const keysByHash = { ...match.state.keysByHash };
    delete keysByHash[match.keyHash];

    const keyHashes = match.state.keyHashes.filter((hash) => hash !== match.keyHash);
    const activeKeyHash = keyHashes[0] || null;
    const activeRecord = activeKeyHash ? keysByHash[activeKeyHash] : null;

    return {
        ...match.state,
        activeKeyHash,
        apiKeyHash: activeKeyHash,
        keyPrefix: activeRecord?.keyPrefix || null,
        keyHashes,
        keysByHash,
        updatedAt: nowIso,
    };
};
