import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { normalizeMultiOutletNumericDocumentId } from '@lib/multiOutlet/projectIdBoundary';

export type TodoConfigEntry = Readonly<{
    color: string;
    id: string;
    name: string;
}>;

export type TodoConfig = {
    statuses: TodoConfigEntry[];
    tags: TodoConfigEntry[];
};

const CONFIG_ENTRY_LIMIT = 100;
const CONFIG_ID_MAX_LENGTH = 120;
const CONFIG_TEXT_MAX_LENGTH = 160;

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};

const boundedText = (value: unknown, maxLength: number): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized && normalized.length <= maxLength ? normalized : null;
};

const parseConfigEntries = (value: unknown): TodoConfigEntry[] | null => {
    if (!Array.isArray(value) || value.length > CONFIG_ENTRY_LIMIT) return null;
    const entries: TodoConfigEntry[] = [];
    const ids = new Set<string>();
    for (const candidate of value) {
        if (!isPlainRecord(candidate)) return null;
        const id = boundedText(candidate.id, CONFIG_ID_MAX_LENGTH);
        const name = boundedText(candidate.name, CONFIG_TEXT_MAX_LENGTH);
        const color = boundedText(candidate.color, CONFIG_TEXT_MAX_LENGTH);
        if (!id || !name || !color || ids.has(id)) return null;
        ids.add(id);
        entries.push({ id, name, color });
    }
    return entries;
};

export const requireTodoScope = (session: unknown): Readonly<{
    sId: string;
    tId: string;
    uId: string;
}> => {
    if (!isPlainRecord(session)) throw new TypeError('todo_session_invalid');
    const tenant = normalizeMultiOutletNumericDocumentId(session.tId);
    const store = normalizeMultiOutletNumericDocumentId(session.sId);
    const uId = boundedText(session.uId, 256);
    if (!tenant || !store || !uId) throw new TypeError('todo_scope_invalid');
    return { tId: tenant.documentId, sId: store.documentId, uId };
};

export const requireTodoDocumentId = (value: unknown): string => {
    if (!isValidFirestoreDocumentId(value)) throw new TypeError('todo_document_id_invalid');
    return value.trim();
};

export const requireTodoMutation = (
    value: unknown,
    options: Readonly<{ requireId: boolean }>,
): Readonly<{ id?: string; payload: Record<string, unknown> }> => {
    if (!isPlainRecord(value)) throw new TypeError('todo_payload_invalid');
    const id = options.requireId ? requireTodoDocumentId(value.id) : undefined;
    const payload = { ...value };
    delete payload.id;
    return id ? { id, payload } : { payload };
};

export const parseTodoConfig = (value: unknown): TodoConfig | null => {
    if (!isPlainRecord(value)) return null;
    const statuses = parseConfigEntries(value.statuses);
    const tags = parseConfigEntries(value.tags);
    return statuses && tags ? { statuses, tags } : null;
};

export const requireTodoConfigPatch = (value: unknown): Partial<TodoConfig> => {
    if (!isPlainRecord(value)) throw new TypeError('todo_config_payload_invalid');
    const patch: Partial<TodoConfig> = {};
    if (Object.hasOwn(value, 'statuses')) {
        const statuses = parseConfigEntries(value.statuses);
        if (!statuses) throw new TypeError('todo_statuses_invalid');
        patch.statuses = statuses;
    }
    if (Object.hasOwn(value, 'tags')) {
        const tags = parseConfigEntries(value.tags);
        if (!tags) throw new TypeError('todo_tags_invalid');
        patch.tags = tags;
    }
    if (!patch.statuses && !patch.tags) throw new TypeError('todo_config_payload_empty');
    return patch;
};
