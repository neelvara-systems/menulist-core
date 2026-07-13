import { timingSafeEqual } from 'crypto';
import { parseExactAnswerlatticeScope } from './scopeBoundary';

export type AnswerlatticeManualSchedulerRequest =
    | { forceAllTenants: true; scope: null }
    | { forceAllTenants: false; scope: { tId: number; sId: number } };

export function isAnswerlatticeManualSchedulerAuthorized(params: {
    authorizationHeader: unknown;
    cronSecret: unknown;
    emulator?: boolean;
}): boolean {
    if (params.emulator === true) return true;
    const secret = typeof params.cronSecret === 'string' ? params.cronSecret : '';
    const header = typeof params.authorizationHeader === 'string' ? params.authorizationHeader : '';
    if (!secret || secret.length < 24 || !header.startsWith('Bearer ')) return false;
    const supplied = header.slice('Bearer '.length);
    const expectedBuffer = Buffer.from(secret);
    const suppliedBuffer = Buffer.from(supplied);
    return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export function parseAnswerlatticeManualSchedulerRequest(body: unknown): AnswerlatticeManualSchedulerRequest {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new Error('ANSWERLATTICE_MANUAL_SCOPE_INVALID');
    }
    const input = body as Record<string, unknown>;
    const allowedKeys = new Set(['tId', 'sId', 'forceAllTenants']);
    if (Object.keys(input).some(key => !allowedKeys.has(key))) {
        throw new Error('ANSWERLATTICE_MANUAL_SCOPE_INVALID');
    }

    if (input.forceAllTenants === true) {
        if (input.tId !== undefined || input.sId !== undefined) throw new Error('ANSWERLATTICE_MANUAL_SCOPE_INVALID');
        return { forceAllTenants: true, scope: null };
    }

    const scope = parseExactAnswerlatticeScope(input.tId, input.sId);
    if (!scope || input.forceAllTenants !== undefined) throw new Error('ANSWERLATTICE_MANUAL_SCOPE_INVALID');
    return { forceAllTenants: false, scope };
}
