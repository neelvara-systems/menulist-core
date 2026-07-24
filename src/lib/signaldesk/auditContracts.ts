import type { SignalDeskAuditEvent } from "@type/signaldesk";

export const SIGNALDESK_AUDIT_PAGE_SIZE = 50;

export type SignalDeskAuditCursor = {
    auditEventId: string;
    createdAt: string;
};

const isCanonicalAuditId = (value: string) => /^[A-Za-z0-9_-]{3,180}$/.test(value);

const isCanonicalIsoTimestamp = (value: string) => {
    if (value.length > 64) return false;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
};

export const parseSignalDeskAuditCursor = (
    createdAt: string | null,
    auditEventId: string | null,
): SignalDeskAuditCursor | null | undefined => {
    if (createdAt === null && auditEventId === null) return undefined;
    if (
        createdAt === null
        || auditEventId === null
        || !isCanonicalIsoTimestamp(createdAt)
        || !isCanonicalAuditId(auditEventId)
    ) return null;
    return { auditEventId, createdAt };
};

export const getSignalDeskAuditCursor = (
    event: SignalDeskAuditEvent | undefined,
): SignalDeskAuditCursor | null => {
    if (!event?.createdAt) return null;
    return parseSignalDeskAuditCursor(event.createdAt, event.auditEventId) || null;
};
