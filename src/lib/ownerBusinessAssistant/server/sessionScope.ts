import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { resolveStorePermissionSessionScope } from "@lib/permissions/scopeDocumentId";

const resolveOwnerBusinessAssistantActorId = (session: unknown): string | null => {
    if (!session || typeof session !== "object" || Array.isArray(session)) return null;
    const source = session as {
        uId?: unknown;
        user?: { id?: unknown } | null;
    };
    const supplied = [source.uId, source.user?.id]
        .filter((value) => value !== undefined && value !== null);
    if (supplied.length === 0) return null;

    const normalized = supplied.map((value) => {
        const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";
        const documentId = raw.trim();
        return documentId === raw && isValidFirestoreDocumentId(documentId)
            ? documentId
            : null;
    });
    const [first] = normalized;
    return first && normalized.every((actorId) => actorId === first) ? first : null;
};

export function resolveOwnerBusinessAssistantSessionScope(session: unknown): {
    sId: number;
    tId: number;
    userId: string;
} | null {
    const storeScope = resolveStorePermissionSessionScope(session);
    const userId = resolveOwnerBusinessAssistantActorId(session);
    return storeScope && userId
        ? {
            sId: storeScope.storeScope.numericId,
            tId: storeScope.tenantScope.numericId,
            userId,
        }
        : null;
}
