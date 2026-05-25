import { PRODUCT_IDS, type ProductId } from '@constant/product';
import { requestBodyComposer } from '@lib/apiHelper';
import getActiveSession from '@lib/auth/getActiveSession';

const createTraceId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `cn_${crypto.randomUUID()}`;
    }
    return `cn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeNumber = (value: unknown): number | undefined => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeProductId = (value: unknown): ProductId | undefined => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toUpperCase();
    return Object.values(PRODUCT_IDS).includes(normalized as ProductId)
        ? normalized as ProductId
        : undefined;
};

const normalizeSourceContext = (sourceContext: unknown) => {
    if (!sourceContext || typeof sourceContext !== 'object' || Array.isArray(sourceContext)) {
        return undefined;
    }

    const normalized = { ...(sourceContext as Record<string, any>) };
    const sourcePId = normalizeProductId(normalized.pId);
    const sourceTId = normalizeNumber(normalized.tId);
    const sourceSId = normalizeNumber(normalized.sId);

    if (sourcePId && sourcePId !== PRODUCT_IDS.CANONICA) {
        normalized.pId = sourcePId;
        if (sourceTId !== undefined) {
            normalized.tId = sourceTId;
        } else {
            delete normalized.tId;
        }
        if (sourceSId !== undefined) {
            normalized.sId = sourceSId;
        } else {
            delete normalized.sId;
        }
    } else {
        delete normalized.pId;
        delete normalized.tId;
        delete normalized.sId;
    }

    return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const buildSourceContextFromSession = async () => {
    const session = await getActiveSession();
    if (!session) return undefined;

    const uId = (session as any).uId || session.user?.id;
    const email = session.user?.email;
    const name = session.user?.name || email;
    const phone = (session as any).phone || (session.user as any)?.phone;
    const sessionSourceContext = (session as any).sourceContext && typeof (session as any).sourceContext === 'object'
        ? (session as any).sourceContext
        : undefined;
    const sourcePId =
        normalizeProductId(sessionSourceContext?.pId)
        || normalizeProductId((session as any).sourceProductId)
        || normalizeProductId((session as any).pId)
        || normalizeProductId((session.user as any)?.pId);
    const sourceTId =
        normalizeNumber(sessionSourceContext?.tId)
        ?? normalizeNumber((session as any).sourceTenantId)
        ?? normalizeNumber((session as any).tId);
    const sourceSId =
        normalizeNumber(sessionSourceContext?.sId)
        ?? normalizeNumber((session as any).sourceStoreId)
        ?? normalizeNumber((session as any).sId);

    if (!uId || !email || !name) return undefined;
    const includeCrossProductScope = Boolean(sourcePId && sourcePId !== PRODUCT_IDS.CANONICA);

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
 * Canonica write composer.
 *
 * Keeps Canonica document ownership (`pId: "CN"`) centralized. Source product
 * identity is accepted only when the caller/session provides it explicitly; the
 * shared composer must not assume MenuList or any other client as the default.
 */
export const canonicaRequestBodyComposer = async <T extends Record<string, any>>(data: T) => {
    const sourceContext = normalizeSourceContext(data.sourceContext) || await buildSourceContextFromSession();
    const traceId = data.traceId || createTraceId();

    return requestBodyComposer({
        ...data,
        pId: PRODUCT_IDS.CANONICA,
        sourceContext,
        traceId,
        requestId: data.requestId || traceId,
    });
};
