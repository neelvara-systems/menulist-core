import type { SourceContext } from '@type/multiProduct';

export type AnswerlatticeCustomerIdentity = {
    displayName: string;
    userId?: string | null;
    email?: string | null;
    phone?: string | null;
    origin?: string | null;
    path?: string | null;
    sessionId?: string | null;
};

export const cleanAnswerlatticeIdentityText = (value: unknown, maxLength = 160): string | null => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return null;
    return text.length > maxLength ? text.slice(0, maxLength) : text;
};

export const cleanAnswerlatticeEmail = (value: unknown): string | null => {
    const email = cleanAnswerlatticeIdentityText(value, 180)?.toLowerCase() || null;
    if (!email) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

export const buildAnswerlatticeActorSnapshot = (session: any) => {
    const user = session?.user || {};
    const userId = cleanAnswerlatticeIdentityText(session?.uId || user.id, 120);
    const name = cleanAnswerlatticeIdentityText(session?.userName || user.name, 160);
    const email = cleanAnswerlatticeEmail(session?.userEmail || session?.email || user.email);
    const phone = cleanAnswerlatticeIdentityText(session?.userPhone || session?.phone || user.phone, 80);
    const sourceContext = {
        ...((session?.sourceContext && typeof session.sourceContext === 'object') ? session.sourceContext : {}),
        ...(userId ? { uId: userId } : {}),
        name: name || email || userId || 'Unknown user',
        email: email || '',
        ...(phone ? { phone } : {}),
    };

    return {
        uId: userId || 'unknown',
        userName: name || email || userId || 'Unknown user',
        ...(email ? { userEmail: email } : {}),
        ...(phone ? { userPhone: phone } : {}),
        sourceContext,
    };
};

export const getAnswerlatticeCustomerIdentity = (record: {
    uId?: unknown;
    userName?: unknown;
    userEmail?: unknown;
    userPhone?: unknown;
    customerName?: unknown;
    customerEmail?: unknown;
    customerPhone?: unknown;
    visitorId?: unknown;
    visitorName?: unknown;
    visitorEmail?: unknown;
    sourceContext?: Partial<SourceContext> | Record<string, any> | null;
    clientDetails?: {
        storeName?: unknown;
        tenantName?: unknown;
        email?: unknown;
        phone?: unknown;
    } | null;
    requestOrigin?: unknown;
    requestPath?: unknown;
    widgetSessionId?: unknown;
}): AnswerlatticeCustomerIdentity => {
    const sourceContext = record.sourceContext && typeof record.sourceContext === 'object'
        ? record.sourceContext as Record<string, any>
        : {};
    const clientDetails = record.clientDetails && typeof record.clientDetails === 'object'
        ? record.clientDetails
        : {};
    const userId = cleanAnswerlatticeIdentityText(
        record.visitorId || record.uId || sourceContext.uId,
        120,
    );
    const name = cleanAnswerlatticeIdentityText(
        record.visitorName
        || record.customerName
        || record.userName
        || sourceContext.name
        || clientDetails.storeName
        || clientDetails.tenantName,
        160,
    );
    const email = cleanAnswerlatticeEmail(
        record.visitorEmail || record.customerEmail || record.userEmail || sourceContext.email || clientDetails.email,
    );
    const phone = cleanAnswerlatticeIdentityText(
        record.customerPhone || record.userPhone || sourceContext.phone || clientDetails.phone,
        80,
    );
    const origin = cleanAnswerlatticeIdentityText(record.requestOrigin, 180);
    const path = cleanAnswerlatticeIdentityText(record.requestPath, 180);
    const sessionId = cleanAnswerlatticeIdentityText(record.widgetSessionId, 120);

    return {
        displayName: name || email || (userId ? `User ${userId}` : 'Unknown customer'),
        userId,
        email,
        phone,
        origin,
        path,
        sessionId,
    };
};
