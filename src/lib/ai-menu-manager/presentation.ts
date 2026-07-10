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

function toDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'string') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof (value as { toDate?: unknown })?.toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    if (typeof (value as { seconds?: unknown })?.seconds === 'number') {
        return new Date((value as { seconds: number }).seconds * 1000);
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
    const status = project.deleted === true
        ? 'Deleted menu'
        : project.active === false || project.outletStatus === 'inactive'
            ? 'Hidden from customers'
            : 'Active menu';
    const projectTimestamps = project as Project & { modifiedOn?: unknown; updatedAt?: unknown };
    const updated = getUpdatedLabel(projectTimestamps.modifiedOn || projectTimestamps.updatedAt);
    return [status, updated].filter(Boolean).join(' · ');
}

export function shouldShowAiMenuManagerApprovalReason(card: AiMenuManagerCardPayload) {
    return card.kind === 'unsupported'
        || ['high_confirm', 'bulk_confirm', 'destructive_confirm', 'external_confirm']
            .includes(card.approvalPolicy.level);
}

export function buildAiMenuManagerTimeline(params: {
    compactMessages?: AiMenuManagerCompactMessage[];
    activeCards?: AiMenuManagerCardPayload[];
    receipts?: AiMenuManagerReceipt[];
}): AiMenuManagerTimelineMessage[] {
    const activeCardTitles = new Set((params.activeCards || []).map((card) => card.title.trim()));
    const activeCardMessages = new Set((params.activeCards || []).map((card) => card.message.trim()));
    const timeline = (params.compactMessages || []).reduce<AiMenuManagerTimelineMessage[]>((messages, entry) => {
        if (entry.role === 'system') return messages;

        const role = entry.role === 'owner' ? 'owner' : 'menu_manager';
        const kind = entry.kind || 'reply';
        if (
            role === 'menu_manager'
            && kind === 'reply'
            && (
                activeCardTitles.has(entry.text.trim())
                || activeCardMessages.has(entry.text.trim())
            )
        ) {
            return messages;
        }

        const previous = messages[messages.length - 1];
        if (previous?.role === role && previous.text === entry.text && previous.kind === kind) {
            return messages;
        }

        messages.push({
            id: entry.messageId,
            kind,
            role,
            text: entry.text,
        });
        return messages;
    }, []);

    const visibleMessageIds = new Set(timeline.map((entry) => entry.id));
    [...(params.receipts || [])].reverse().forEach((receipt) => {
        const messageId = `${receipt.receiptId}_manager`;
        if (visibleMessageIds.has(messageId)) return;
        timeline.push({
            id: messageId,
            kind: 'receipt',
            role: 'menu_manager',
            text: receipt.message,
        });
    });

    return timeline;
}
