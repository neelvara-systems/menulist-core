import { Timestamp } from 'firebase/firestore';

import type { MasterOperationalState } from '@type/multiOutlet.types';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseMasterOperationalState(value: unknown): MasterOperationalState | null {
    if (!isRecord(value)) return null;
    const keys = Object.keys(value).sort();
    if (keys.length !== 2 || keys[0] !== 'lastUpdatedAt' || keys[1] !== 'operationalVersion') {
        return null;
    }
    if (!Number.isSafeInteger(value.operationalVersion) || Number(value.operationalVersion) <= 0) {
        return null;
    }
    if (!(value.lastUpdatedAt instanceof Timestamp)) return null;

    return {
        lastUpdatedAt: value.lastUpdatedAt,
        operationalVersion: Number(value.operationalVersion),
    };
}
