import { PRODUCT_IDS, type ProductId } from '@constant/product';
import {
    composeRequestBody,
    type RequestBodyComposerOptions,
} from '@lib/apiHelper';
import getActiveSession from '@lib/auth/getActiveSession';
import { createRuntimeId } from '@lib/runtime/randomId';
import type { SourceContext } from '@type/multiProduct';

const createTraceId = () => createRuntimeId('al');

const normalizeNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
    }
    if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : undefined;
};

const normalizeProductId = (value: unknown): ProductId | undefined => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toUpperCase();
    return Object.values(PRODUCT_IDS).includes(normalized as ProductId)
        ? normalized as ProductId
        : undefined;
};

const normalizeActorId = (value: unknown): string | number | undefined => {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value;
    return undefined;
};

const normalizeRequiredText = (value: unknown) => (
    typeof value === 'string' && value.trim() ? value.trim() : undefined
);

export const normalizeAnswerlatticeSourceContext = (sourceContext: unknown): SourceContext | undefined => {
    if (!sourceContext || typeof sourceContext !== 'object' || Array.isArray(sourceContext)) {
        return undefined;
    }

    const source = sourceContext as Record<string, unknown>;
    const uId = normalizeActorId(source.uId);
    const name = normalizeRequiredText(source.name);
    const email = normalizeRequiredText(source.email);
    if (uId === undefined || !name || !email) return undefined;

    const sourcePId = normalizeProductId(source.pId);
    const sourceTId = normalizeNumber(source.tId);
    const sourceSId = normalizeNumber(source.sId);
    const phone = normalizeRequiredText(source.phone);
    const normalized: SourceContext = {
        uId,
        name,
        email,
        ...(phone ? { phone } : {}),
    };

    if (sourcePId && sourcePId !== PRODUCT_IDS.ANSWERLATTICE) {
        normalized.pId = sourcePId;
        if (sourceTId !== undefined) {
            normalized.tId = sourceTId;
        }
        if (sourceSId !== undefined) {
            normalized.sId = sourceSId;
        }
    }

    return normalized;
};

const buildSourceContextFromSession = (
    session: Awaited<ReturnType<typeof getActiveSession>>,
): SourceContext | undefined => {
    if (!session) return undefined;

    const sessionRecord = session as unknown as Record<string, unknown>;
    const userRecord = session.user as unknown as Record<string, unknown>;
    const uId = normalizeActorId(session.uId ?? session.user?.id);
    const email = normalizeRequiredText(session.user?.email);
    const name = normalizeRequiredText(session.user?.name) || email;
    const phone = normalizeRequiredText(sessionRecord.phone)
        || normalizeRequiredText(userRecord.phone)
        || normalizeRequiredText(session.user?.phoneNumber);
    const sessionSourceContext = sessionRecord.sourceContext && typeof sessionRecord.sourceContext === 'object'
        ? sessionRecord.sourceContext as Record<string, unknown>
        : undefined;
    const sourcePId =
        normalizeProductId(sessionSourceContext?.pId)
        || normalizeProductId(sessionRecord.sourceProductId)
        || normalizeProductId(session.pId)
        || normalizeProductId(session.user.pId);
    const sourceTId =
        normalizeNumber(sessionSourceContext?.tId)
        ?? normalizeNumber(sessionRecord.sourceTenantId)
        ?? normalizeNumber(session.tId);
    const sourceSId =
        normalizeNumber(sessionSourceContext?.sId)
        ?? normalizeNumber(sessionRecord.sourceStoreId)
        ?? normalizeNumber(session.sId);

    if (uId === undefined || !email || !name) return undefined;
    const includeCrossProductScope = Boolean(sourcePId && sourcePId !== PRODUCT_IDS.ANSWERLATTICE);

    return {
        uId,
        name,
        email,
        ...(phone ? { phone } : {}),
        ...(includeCrossProductScope ? {
            pId: sourcePId,
            ...(sourceTId !== undefined ? { tId: sourceTId } : {}),
            ...(sourceSId !== undefined ? { sId: sourceSId } : {}),
        } : {}),
    };
};

/**
 * Answerlattice write composer.
 *
 * Keeps Answerlattice document ownership (`pId: 'AL'`) centralized. Source product
 * identity is accepted only when the caller/session provides it explicitly; the
 * shared composer must not assume MenuList or any other client as the default.
 */
export const answerlatticeRequestBodyComposer = async <T extends object>(
    data: T,
    options: RequestBodyComposerOptions,
) => {
    const session = await getActiveSession();
    const dataRecord = data as Record<string, unknown>;
    const sourceContext = normalizeAnswerlatticeSourceContext(dataRecord.sourceContext)
        || buildSourceContextFromSession(session);
    const traceId = typeof dataRecord.traceId === 'string' && dataRecord.traceId.trim()
        ? dataRecord.traceId.trim()
        : createTraceId();
    const requestId = typeof dataRecord.requestId === 'string' && dataRecord.requestId.trim()
        ? dataRecord.requestId.trim()
        : traceId;

    return composeRequestBody({
        ...data,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        sourceContext,
        traceId,
        requestId,
    }, session, options);
};
