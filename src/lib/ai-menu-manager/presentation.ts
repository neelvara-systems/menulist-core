import type { Project } from '@template/main-app/projects/types';
import type {
    AiMenuManagerCardPayload,
    AiMenuManagerCompactMessage,
    AiMenuManagerReceipt,
} from '@type/aiMenuManager';

export type AiMenuManagerTimelineMessage = {
    id: string;
    kind: 'reply' | 'receipt' | 'status';
    role: 'owner' | 'menu_manager';
    text: string;
};

function readField(value: unknown, key: string): unknown {
    if (!value || (typeof value !== 'object' && typeof value !== 'function')) return undefined;
    try {
        return Reflect.get(value, key);
    } catch {
        return undefined;
    }
}

function snapshotArray<T>(value: T[] | undefined, maxItems: number): T[] {
    if (!Array.isArray(value)) return [];
    try {
        return Array.from(value).slice(0, maxItems);
    } catch {
        return [];
    }
}

function readBoundedText(value: unknown, maxLength: number): string {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function projectDate(value: unknown): Date | null {
    try {
        if (!(value instanceof Date)) return null;
        const millis = Date.prototype.getTime.call(value);
        return Number.isFinite(millis) ? new Date(millis) : null;
    } catch {
        return null;
    }
}

function toDate(value: unknown): Date | null {
    if (!value) return null;
    const directDate = projectDate(value);
    if (directDate) return directDate;
    if (typeof value === 'number' && Number.isFinite(value)) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'string' && value.length <= 64) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    const toDateMethod = readField(value, 'toDate');
    if (typeof toDateMethod === 'function') {
        try {
            return projectDate(Reflect.apply(toDateMethod, value, []));
        } catch {
            return null;
        }
    }
    const seconds = readField(value, 'seconds');
    if (typeof seconds === 'number' && Number.isFinite(seconds)) {
        const date = new Date(seconds * 1000);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
}

function getUpdatedLabel(value: unknown) {
    const updatedAt = toDate(value);
    if (!updatedAt) return '';

    const elapsedMs = Math.max(0, Date.now() - updatedAt.getTime());
    const elapsedMinutes = Math.floor(elapsedMs / 60_000);
    if (elapsedMinutes < 1) return 'Updated just now';
    if (elapsedMinutes < 60) return `Updated ${elapsedMinutes} min ago`;

    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) return `Updated ${elapsedHours} hr${elapsedHours === 1 ? '' : 's'} ago`;

    const elapsedDays = Math.floor(elapsedHours / 24);
    if (elapsedDays === 1) return 'Updated yesterday';
    if (elapsedDays < 7) return `Updated ${elapsedDays} days ago`;

    return `Updated ${updatedAt.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
    })}`;
}

export function getAiMenuManagerProjectStatusLine(project?: Project | null) {
    if (!project) return '';
    const status = readField(project, 'deleted') === true
        ? 'Deleted menu'
        : readField(project, 'active') === false || readField(project, 'outletStatus') === 'inactive'
            ? 'Hidden from customers'
            : 'Active menu';
    const updated = getUpdatedLabel(
        readField(project, 'modifiedOn') || readField(project, 'updatedAt'),
    );
    return [status, updated].filter(Boolean).join(' · ');
}

export function shouldShowAiMenuManagerApprovalReason(card: AiMenuManagerCardPayload) {
    const approvalPolicy = readField(card, 'approvalPolicy');
    return readField(card, 'kind') === 'unsupported'
        || ['high_confirm', 'bulk_confirm', 'destructive_confirm', 'external_confirm']
            .includes(readBoundedText(readField(approvalPolicy, 'level'), 40));
}

export function buildAiMenuManagerTimeline(params: {
    compactMessages?: AiMenuManagerCompactMessage[];
    activeCards?: AiMenuManagerCardPayload[];
    receipts?: AiMenuManagerReceipt[];
}): AiMenuManagerTimelineMessage[] {
    const activeCards = snapshotArray(params.activeCards, 20);
    const activeCardTitles = new Set(activeCards.map((card) => readBoundedText(readField(card, 'title'), 2_000)).filter(Boolean));
    const activeCardMessages = new Set(activeCards.map((card) => readBoundedText(readField(card, 'message'), 2_000)).filter(Boolean));
    const timeline = snapshotArray(params.compactMessages, 100).reduce<AiMenuManagerTimelineMessage[]>((messages, entry) => {
        const rawRole = readField(entry, 'role');
        if (rawRole === 'system') return messages;
        if (rawRole !== 'owner' && rawRole !== 'menu_manager') return messages;
        const text = readBoundedText(readField(entry, 'text'), 4_000);
        const messageId = readBoundedText(readField(entry, 'messageId'), 240);
        if (!text || !messageId) return messages;

        const role = rawRole;
        const rawKind = readField(entry, 'kind');
        const kind = rawKind === 'receipt' || rawKind === 'status' ? rawKind : 'reply';
        if (
            role === 'menu_manager'
            && kind === 'reply'
            && (
                activeCardTitles.has(text)
                || activeCardMessages.has(text)
            )
        ) {
            return messages;
        }

        const previous = messages[messages.length - 1];
        if (previous?.role === role && previous.text === text && previous.kind === kind) {
            return messages;
        }

        messages.push({
            id: messageId,
            kind,
            role,
            text,
        });
        return messages;
    }, []);

    const visibleMessageIds = new Set(timeline.map((entry) => entry.id));
    snapshotArray(params.receipts, 100).reverse().forEach((receipt) => {
        const receiptId = readBoundedText(readField(receipt, 'receiptId'), 240);
        const text = readBoundedText(readField(receipt, 'message'), 4_000);
        if (!receiptId || !text) return;
        const messageId = `${receiptId}_manager`;
        if (visibleMessageIds.has(messageId)) return;
        timeline.push({
            id: messageId,
            kind: 'receipt',
            role: 'menu_manager',
            text,
        });
    });

    return timeline;
}
