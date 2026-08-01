import {
    getBoundedCampaignStringContext,
    logCampaignFailure,
    type CampaignLogContext,
} from '@lib/campaigns/campaignDiagnostics';
import { parsePublicHttpsUrl } from '@lib/public-truth-tools/publicUrlValidation';
import type { TodayCampaignSummary } from '@type/campaigns';

export type TodayReadyActionKind = 'critical_fix' | 'growth_move' | 'trust_move';
export type TodayGrowthPackAssetId = 'whatsapp' | 'google_post' | 'instagram_caption' | 'staff_prompt';

export interface TodayReadyAction {
    id: string;
    kind: TodayReadyActionKind;
    title: string;
    description: string;
    actionLabel: string;
}

export interface TodayGrowthPackAsset {
    id: TodayGrowthPackAssetId;
    title: string;
    destination: string;
    copy: string;
}

export type TodayGrowthPackCopyFailureStage = 'empty_text' | 'document_unavailable' | 'textarea_copy';

export interface TodayGrowthPackCopyOptions {
    onFailure?: (failureStage: TodayGrowthPackCopyFailureStage, error?: unknown) => void;
}

export interface TodayWeeklyGrowthPack {
    assets: TodayGrowthPackAsset[];
    primarySubject: string;
    readyActions: TodayReadyAction[];
    summary: string;
}

export interface BuildTodayWeeklyGrowthPackInput {
    businessName?: string;
    hasActiveTempStatus?: boolean;
    inactiveItemCount?: number;
    inactiveItemNames?: string[];
    menuUrl?: string;
    operationalCampaigns?: TodayCampaignSummary[];
    primaryCampaign?: TodayCampaignSummary;
    projectName?: string;
    staffPromptText?: string;
    tempStatusMessage?: string;
    todayTimingsLabel?: string;
}

const MAX_SHORT_COPY_LENGTH = 160;
const MAX_LONG_COPY_LENGTH = 500;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    value !== null && typeof value === 'object' && !Array.isArray(value)
);

const readOwnDataField = (value: unknown, field: string): unknown => {
    if (!isRecord(value)) return undefined;
    try {
        const descriptor = Object.getOwnPropertyDescriptor(value, field);
        return descriptor && 'value' in descriptor ? descriptor.value : undefined;
    } catch (error) {
        logCampaignFailure('today_weekly_growth_pack_input_projection_failed', error, {
            ...getBoundedCampaignStringContext('field', field),
        });
        return undefined;
    }
};

const cleanText = (value: unknown, maxLength = MAX_SHORT_COPY_LENGTH): string => {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, ' ').slice(0, maxLength).trim();
};

const sentence = (value: string) => {
    const normalized = cleanText(value);
    if (!normalized) return '';
    return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
};

const getCampaignSubject = (
    primaryCampaign: unknown,
    operationalCampaigns: unknown,
) => {
    const candidates: unknown[] = [primaryCampaign];
    if (Array.isArray(operationalCampaigns)) {
        candidates.push(...operationalCampaigns.slice(0, 20));
    }

    for (const campaign of candidates) {
        const subject = readOwnDataField(campaign, 'subject');
        const itemName = cleanText(readOwnDataField(subject, 'itemName'));
        if (itemName) return itemName;
    }
    return '';
};

const normalizeMenuUrl = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    const candidate = value.trim();
    if (!candidate || candidate.length > 2048 || /\s/.test(candidate)) return '';
    return parsePublicHttpsUrl(candidate, 'today_weekly_growth_pack_menu_url')?.toString() || '';
};

const normalizeInactiveItemCount = (value: unknown): number => (
    typeof value === 'number' && Number.isFinite(value) && value > 0
        ? Math.min(100_000, Math.floor(value))
        : 0
);

const normalizeInactiveItemNames = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
        .slice(0, 3)
        .map((item) => cleanText(item))
        .filter(Boolean);
};

const appendUrl = (copy: string, menuUrl: string) => {
    const url = normalizeMenuUrl(menuUrl);
    return url ? `${copy}\n${url}` : copy;
};

export function buildTodayWeeklyGrowthPack(input: BuildTodayWeeklyGrowthPackInput): TodayWeeklyGrowthPack {
    const businessName = readOwnDataField(input, 'businessName');
    const hasActiveTempStatus = readOwnDataField(input, 'hasActiveTempStatus') === true;
    const inactiveItemCount = normalizeInactiveItemCount(readOwnDataField(input, 'inactiveItemCount'));
    const inactiveItemNames = normalizeInactiveItemNames(readOwnDataField(input, 'inactiveItemNames'));
    const menuUrl = normalizeMenuUrl(readOwnDataField(input, 'menuUrl'));
    const operationalCampaigns = readOwnDataField(input, 'operationalCampaigns');
    const primaryCampaign = readOwnDataField(input, 'primaryCampaign');
    const projectName = readOwnDataField(input, 'projectName');
    const staffPromptText = readOwnDataField(input, 'staffPromptText');
    const tempStatusMessage = readOwnDataField(input, 'tempStatusMessage');
    const todayTimingsLabel = cleanText(readOwnDataField(input, 'todayTimingsLabel'));
    const resolvedBusinessName = cleanText(businessName) || 'your business';
    const resolvedProjectName = cleanText(projectName) || 'your menu';
    const campaignSubject = getCampaignSubject(primaryCampaign, operationalCampaigns);
    const primarySubject = campaignSubject || resolvedProjectName;
    const menuLabel = resolvedProjectName.toLowerCase().includes('menu') ? resolvedProjectName : `${resolvedProjectName} menu`;

    const readyActions: TodayReadyAction[] = [];

    if (inactiveItemCount > 0) {
        const previewNames = inactiveItemNames.join(', ');
        readyActions.push({
            id: 'inactive-items',
            kind: 'critical_fix',
            title: `${inactiveItemCount} inactive ${inactiveItemCount === 1 ? 'item' : 'items'}`,
            description: previewNames
                ? `${previewNames}${inactiveItemCount > inactiveItemNames.length ? ' and more' : ''} cannot be seen by customers.`
                : 'Some items cannot be seen by customers.',
            actionLabel: 'Review items',
        });
    }

    if (hasActiveTempStatus) {
        readyActions.push({
            id: 'temporary-status',
            kind: 'trust_move',
            title: 'Temporary status is active',
            description: sentence(
                cleanText(tempStatusMessage, MAX_LONG_COPY_LENGTH)
                || 'Check that the public status is still correct for today.',
            ),
            actionLabel: 'Check status',
        });
    }

    if (todayTimingsLabel) {
        readyActions.push({
            id: 'today-hours',
            kind: 'trust_move',
            title: 'Today timings are visible',
            description: `Customers currently see: ${todayTimingsLabel}.`,
            actionLabel: 'Edit if needed',
        });
    }

    readyActions.push({
        id: 'weekly-pack',
        kind: 'growth_move',
        title: 'Weekly pack is ready',
        description: `Use ${primarySubject} in one post, one message, or one caption this week.`,
        actionLabel: 'Copy output',
    });

    if (menuUrl) {
        readyActions.push({
            id: 'public-link',
            kind: 'trust_move',
            title: 'Public link is ready',
            description: 'Use the current MenuList link when posting outside MenuList.',
            actionLabel: 'Copy link',
        });
    }

    const whatsappCopy = appendUrl(
        [
            `This week at ${resolvedBusinessName}: ${primarySubject} is ready.`,
            `Open the ${menuLabel} before you visit or order.`,
        ].join('\n'),
        menuUrl,
    );

    const googlePostCopy = appendUrl(
        [
            `${primarySubject} is ready this week at ${resolvedBusinessName}.`,
            `Check the current ${menuLabel} for availability and today's timings.`,
        ].join('\n'),
        menuUrl,
    );

    const instagramCopy = appendUrl(
        [
            `${primarySubject} this week at ${resolvedBusinessName}.`,
            `See the current ${menuLabel} before you visit.`,
        ].join('\n'),
        menuUrl,
    );

    const staffPromptCopy = cleanText(staffPromptText, MAX_LONG_COPY_LENGTH)
        || `If customers ask what to try this week, mention ${primarySubject}.`;

    return {
        assets: [
            {
                id: 'whatsapp',
                title: 'WhatsApp message',
                destination: 'Copy to WhatsApp',
                copy: whatsappCopy,
            },
            {
                id: 'google_post',
                title: 'Google post draft',
                destination: 'Copy to Google Business Profile',
                copy: googlePostCopy,
            },
            {
                id: 'instagram_caption',
                title: 'Instagram caption',
                destination: 'Copy to Instagram',
                copy: instagramCopy,
            },
            {
                id: 'staff_prompt',
                title: 'Staff line',
                destination: 'Use in-store',
                copy: staffPromptCopy,
            },
        ],
        primarySubject,
        readyActions: readyActions.slice(0, 5),
        summary: `Ready from current MenuList truth for ${resolvedBusinessName}. Review before posting.`,
    };
}

export function getTodayGrowthPackCopyLogContext(
    pack: TodayWeeklyGrowthPack,
    asset: TodayGrowthPackAsset,
    failureStage: TodayGrowthPackCopyFailureStage,
): CampaignLogContext {
    return {
        ...getBoundedCampaignStringContext('assetId', asset.id),
        ...getBoundedCampaignStringContext('assetTitle', asset.title),
        ...getBoundedCampaignStringContext('assetDestination', asset.destination),
        ...getBoundedCampaignStringContext('assetCopy', asset.copy),
        ...getBoundedCampaignStringContext('primarySubject', pack.primarySubject),
        assetCount: pack.assets.length,
        failureStage,
        hasClipboardWrite: hasTodayGrowthPackClipboardWrite(),
        hasCopyFallback: hasTodayGrowthPackCopyFallback(),
        hasSummary: Boolean(pack.summary),
        readyActionCount: pack.readyActions.length,
    };
}

export const hasTodayGrowthPackClipboardWrite = () => (
    typeof navigator !== 'undefined'
    && typeof navigator.clipboard?.writeText === 'function'
);

export const hasTodayGrowthPackCopyFallback = () => (
    typeof document !== 'undefined'
    && Boolean(document.body)
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
);

export async function copyTodayGrowthPackText(
    text: string,
    options: TodayGrowthPackCopyOptions = {},
): Promise<boolean> {
    if (typeof text !== 'string' || !text.trim()) {
        options.onFailure?.('empty_text');
        return false;
    }

    let lastCopyError: unknown;

    if (hasTodayGrowthPackClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            lastCopyError = error;
            // Fall back to textarea copy below.
        }
    }

    if (!hasTodayGrowthPackCopyFallback()) {
        options.onFailure?.('document_unavailable', lastCopyError);
        return false;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    textarea.style.position = 'fixed';
    textarea.style.top = '0';

    try {
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const copied = document.execCommand('copy');
        if (!copied) {
            options.onFailure?.(
                'textarea_copy',
                lastCopyError || new Error('today_growth_pack_textarea_copy_returned_false'),
            );
        }
        return copied;
    } catch (error) {
        options.onFailure?.('textarea_copy', error);
        return false;
    } finally {
        if (textarea.parentNode) {
            textarea.parentNode.removeChild(textarea);
        }
    }
}
