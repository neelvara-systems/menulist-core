import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';

type ProjectLike = {
    files?: Array<{
        extractedData?: {
            data?: {
                items?: Array<{
                    active?: boolean;
                    id?: string;
                    name?: string | Record<string, string>;
                }>;
            };
        };
    }>;
    projectId?: string;
};

export interface InactiveItemsReminder {
    count: number;
    names: string[];
    projectId: string | null;
}

const resolveItemName = (name: string | Record<string, string> | undefined, fallback = 'Untitled item') => (
    getLocalizedText(name, undefined, getPrimaryLocalizedLanguage(name, 'en'), fallback)
);

export function getInactiveItemsReminder(project: ProjectLike | null | undefined): InactiveItemsReminder | null {
    if (!project?.files?.length) return null;

    const seenItemIds = new Set<string>();
    const names: string[] = [];
    let count = 0;

    for (const file of project.files) {
        const items = file.extractedData?.data?.items || [];
        for (const item of items) {
            if (item?.active !== false) continue;

            const dedupeKey = item.id || resolveItemName(item.name);
            if (!dedupeKey || seenItemIds.has(dedupeKey)) continue;

            seenItemIds.add(dedupeKey);
            count += 1;

            if (names.length < 3) {
                names.push(resolveItemName(item.name));
            }
        }
    }

    if (!count) return null;

    return {
        count,
        names,
        projectId: project.projectId || null,
    };
}

export function getTodayLocalDateKey(): string {
    return new Intl.DateTimeFormat('en-CA').format(new Date());
}

export function getInactiveReminderDismissKey(storeId?: string | number | null, projectId?: string | null): string | null {
    if (!storeId || !projectId) return null;
    return `today_inactive_items_dismissed_${storeId}_${projectId}_${getTodayLocalDateKey()}`;
}
