import { normalizeProjectDocumentScope } from '@lib/menu/projectDocumentScope';

const PROJECT_PUBLICATION_EVENT = 'menulist:project-publication';
const PROJECT_PUBLICATION_STORAGE_KEY = 'menulist:project-publication:last';

export type ProjectPublicationScope = {
    tId: string | number;
    sId: string | number;
    projectId: string;
};

type ProjectPublicationEventDetail = {
    tId: string;
    sId: string;
    projectId: string;
    recordedAt: number;
};

export function normalizeProjectPublicationEventDetail(
    value: unknown,
): ProjectPublicationEventDetail | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

    try {
        const scope = normalizeProjectDocumentScope({
            tId: Reflect.get(value, 'tId'),
            sId: Reflect.get(value, 'sId'),
            projectId: Reflect.get(value, 'projectId'),
        });
        const recordedAt = Reflect.get(value, 'recordedAt');
        if (
            !scope
            || typeof recordedAt !== 'number'
            || !Number.isSafeInteger(recordedAt)
            || recordedAt <= 0
        ) return null;

        return { ...scope, recordedAt };
    } catch {
        return null;
    }
}

const eventMatchesScope = (
    detail: ProjectPublicationEventDetail,
    expected: ReturnType<typeof normalizeProjectDocumentScope>,
): boolean => Boolean(
    expected
    && detail.tId === expected.tId
    && detail.sId === expected.sId
    && detail.projectId === expected.projectId
);

/**
 * Notify same-origin owner tabs after an acknowledged project publication.
 * The payload contains only bounded tenant/store/project identifiers and a
 * timestamp; no menu, owner, customer, or credential data is persisted.
 */
export function emitProjectPublicationEvent(scope: ProjectPublicationScope): void {
    if (typeof window === 'undefined') return;
    const normalizedScope = normalizeProjectDocumentScope(scope);
    if (!normalizedScope) return;

    const detail: ProjectPublicationEventDetail = {
        ...normalizedScope,
        recordedAt: Date.now(),
    };
    window.dispatchEvent(new CustomEvent(PROJECT_PUBLICATION_EVENT, { detail }));

    try {
        window.localStorage.setItem(PROJECT_PUBLICATION_STORAGE_KEY, JSON.stringify(detail));
        window.localStorage.removeItem(PROJECT_PUBLICATION_STORAGE_KEY);
    } catch {
        // Same-tab notification already succeeded. Browsers that deny storage
        // still converge on refresh through the authoritative project read.
    }
}

export function subscribeToProjectPublication(
    scope: ProjectPublicationScope,
    onPublication: () => void,
): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const expectedScope = normalizeProjectDocumentScope(scope);
    if (!expectedScope) return () => undefined;

    const handleDetail = (value: unknown) => {
        const detail = normalizeProjectPublicationEventDetail(value);
        if (detail && eventMatchesScope(detail, expectedScope)) onPublication();
    };
    const handleCustomEvent = (event: Event) => {
        handleDetail((event as CustomEvent<unknown>).detail);
    };
    const handleStorageEvent = (event: StorageEvent) => {
        if (event.key !== PROJECT_PUBLICATION_STORAGE_KEY || !event.newValue) return;
        try {
            handleDetail(JSON.parse(event.newValue));
        } catch {
            // Ignore malformed browser-owned cache values.
        }
    };

    window.addEventListener(PROJECT_PUBLICATION_EVENT, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);
    return () => {
        window.removeEventListener(PROJECT_PUBLICATION_EVENT, handleCustomEvent);
        window.removeEventListener('storage', handleStorageEvent);
    };
}
