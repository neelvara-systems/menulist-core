import { PRODUCT_IDS } from '@constant/product';
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

const buildSourceContextFromSession = async () => {
    const session = await getActiveSession();
    if (!session) return undefined;

    const uId = (session as any).uId || session.user?.id;
    const email = session.user?.email;
    const name = session.user?.name || email;

    if (!uId || !email || !name) return undefined;

    return {
        uId,
        name,
        email,
        phone: (session as any).phone || (session.user as any)?.phone || undefined,
        pId: (session as any).pId || PRODUCT_IDS.MENULIST,
        tId: normalizeNumber((session as any).tId),
        sId: normalizeNumber((session as any).sId),
    };
};

/**
 * Canonica write composer.
 *
 * Keeps Canonica document ownership (`pId: "CN"`) centralized while preserving
 * the existing tId/sId behavior used by current embedded MenuList screens.
 * `sourceContext`, `traceId`, and `requestId` are additive fields for the CCT
 * model and do not change current query scopes.
 */
export const canonicaRequestBodyComposer = async <T extends Record<string, any>>(data: T) => {
    const sourceContext = data.sourceContext || await buildSourceContextFromSession();
    const traceId = data.traceId || createTraceId();

    return requestBodyComposer({
        ...data,
        pId: PRODUCT_IDS.CANONICA,
        sourceContext,
        traceId,
        requestId: data.requestId || traceId,
    });
};
