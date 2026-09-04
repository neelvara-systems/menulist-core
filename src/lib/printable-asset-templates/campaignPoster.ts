import { resolveStoreBusinessCategory } from '@data/shared/businessTypes';
import { getBlockLabels, type DecisionBlockType } from '@config/decisionBlocks';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { resolveStoreBrandColor } from '@lib/menu-kit/brandTokens';
import { generateProjectUrl } from '@lib/utils/slugify';
import type { Project } from '@template/main-app/projects/types';
import type { StoreDataType } from '@type/platform/store';
import type { Campaign, CampaignType } from '@type/campaigns';
import { appendItemQuery } from './itemProductTag';
import { resolvePrintableAssetStyle } from './stylePreferences';
import type { PrintableAssetRenderInput, PrintableCampaignContent } from './types';

const CAMPAIGN_POSTER_HEADLINES: Record<CampaignType, string> = {
    bestseller_boost: 'Featured favourite',
    festival: 'Occasion special',
    meal_push: 'Featured now',
    menu_highlight: 'Featured',
    new_item: 'New arrival',
    now_available: 'Now available',
    slow_item_rescue: 'Worth discovering',
    todays_special: "Today's special",
    weekend_pick: 'Weekend pick',
};

function normalizeHttpsDestination(value: string): string | null {
    try {
        const target = new URL(value);
        if (target.protocol !== 'https:' || target.username || target.password) return null;
        return target.toString();
    } catch {
        return null;
    }
}

function resolveCurrentCampaignItem(project: Project, itemId: string): { description?: string; id: string; name: string } | null {
    for (const file of project.files || []) {
        if (file.active === false || file.deleted === true) continue;
        const item = file.extractedData?.data?.items?.find((candidate) => (
            candidate.id === itemId || candidate.extractionIdAliases?.includes(itemId)
        ));
        if (!item) continue;
        if (item.active === false || item.available === false) return null;

        const name = getLocalizedText(
            item.name,
            project.defaultLanguage,
            getPrimaryLocalizedLanguage(item.name, project.defaultLanguage || 'en'),
            '',
        ).trim();
        if (!name) return null;
        const description = getLocalizedText(
            item.description,
            project.defaultLanguage,
            getPrimaryLocalizedLanguage(item.description, project.defaultLanguage || 'en'),
            '',
        ).trim();
        return {
            id: item.id,
            name,
            ...(description ? { description } : {}),
        };
    }
    return null;
}

function normalizePinnedItemId(value: unknown): string | null {
    if (typeof value === 'string') return value.trim() || null;
    if (Array.isArray(value)) {
        for (const entry of value) {
            const normalized = normalizePinnedItemId(entry);
            if (normalized) return normalized;
        }
        return null;
    }
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return normalizePinnedItemId(record.itemId ?? record.value ?? record.id);
    }
    return null;
}

function resolveProjectName(project: Project): string {
    return getLocalizedText(
        project.name,
        project.defaultLanguage,
        getPrimaryLocalizedLanguage(project.name, project.defaultLanguage || 'en'),
        'Menu',
    );
}

function buildCampaignPosterInput(params: {
    campaignContent: PrintableCampaignContent;
    destination: string;
    projectId: string;
    store: StoreDataType;
}): PrintableAssetRenderInput {
    const businessCategory = resolveStoreBusinessCategory(
        params.store.businessType,
        params.store.businessCategory,
    );
    const resolvedStyle = resolvePrintableAssetStyle({
        assetTypeId: 'campaign_poster',
        businessCategory,
        businessType: params.store.businessType,
        preferences: params.store.printableAssetStylePreferences,
        projectId: params.projectId,
    });
    const tagline = getLocalizedText(
        params.store.tagline,
        params.store.defaultLanguage,
        getPrimaryLocalizedLanguage(params.store.tagline, params.store.defaultLanguage || 'en'),
        '',
    );

    return {
        activePlanType: params.store.activePlanType,
        assetTypeId: 'campaign_poster',
        brandColor: resolveStoreBrandColor(params.store),
        businessCategory,
        businessType: params.store.businessType,
        campaignContent: params.campaignContent,
        logoUrl: params.store.logo || undefined,
        menuUrl: params.destination,
        outputFormat: 'png',
        projectId: params.projectId,
        shortLink: params.destination.replace(/^https?:\/\//i, ''),
        storeName: getStoreContextName(params.store, 'Business'),
        tagline: tagline || undefined,
        templateFamilyId: resolvedStyle.templateFamilyId,
    };
}

function buildCampaignContent(campaign: Campaign, project: Project): PrintableCampaignContent | null {
    const itemId = String(campaign.subject?.itemId || '').trim();
    const item = itemId ? resolveCurrentCampaignItem(project, itemId) : null;
    if (itemId && !item) return null;
    return {
        headline: CAMPAIGN_POSTER_HEADLINES[campaign.type],
        ...(item ? { offer: item.name } : {}),
        ...(item?.description ? { details: item.description } : {}),
    };
}

/**
 * Builds the printable Campaign Poster from the existing Today campaign.
 * It creates no parallel campaign record and fails closed when the campaign,
 * project, store, or public destination is incomplete.
 */
export function buildTodayCampaignPosterRenderInput(params: {
    campaign: Campaign | null | undefined;
    expectedProjectId: string | null | undefined;
    menuUrl: string | null | undefined;
    project: Project | null | undefined;
    store: StoreDataType | null | undefined;
}): PrintableAssetRenderInput | null {
    const campaign = params.campaign;
    const projectId = String(campaign?.projectId || '').trim();
    const expectedProjectId = String(params.expectedProjectId || '').trim();
    const selectedProjectId = String(params.project?.projectId || '').trim();
    const menuUrl = normalizeHttpsDestination(String(params.menuUrl || '').trim());
    if (
        !campaign
        || !params.store
        || !params.project
        || !projectId
        || !expectedProjectId
        || projectId !== expectedProjectId
        || selectedProjectId !== expectedProjectId
        || !menuUrl
    ) return null;

    const itemId = String(campaign.subject?.itemId || '').trim();
    const campaignContent = buildCampaignContent(campaign, params.project);
    if (!campaignContent) return null;
    const destination = itemId ? appendItemQuery(menuUrl, itemId) : menuUrl;
    return buildCampaignPosterInput({
        campaignContent,
        destination,
        projectId,
        store: params.store,
    });
}

const DECISION_CHOICE_SETTING_KEYS: Record<DecisionBlockType, {
    enabled: 'enablePopular' | 'enableQuickPick' | 'enableBestValue';
    pinned: 'pinnedPopular' | 'pinnedQuickPick' | 'pinnedBestValue';
}> = {
    popular: { enabled: 'enablePopular', pinned: 'pinnedPopular' },
    quickPick: { enabled: 'enableQuickPick', pinned: 'pinnedQuickPick' },
    bestValue: { enabled: 'enableBestValue', pinned: 'pinnedBestValue' },
};

/**
 * Builds a Campaign Poster for one saved, explicitly pinned Featured choice.
 * Automatic choices deliberately fail closed because their resolved item may
 * change after printing. The destination reuses the canonical exact-item URL.
 */
export function buildDecisionChoiceCampaignPosterRenderInput(params: {
    blockType: DecisionBlockType;
    project: Project | null | undefined;
    store: StoreDataType | null | undefined;
}): PrintableAssetRenderInput | null {
    if (!params.project || !params.store) return null;

    const projectId = String(params.project.projectId || '').trim();
    const subdomain = String(params.store.subdomain || '').trim();
    const customDomain = String(params.store.customDomain || '').trim();
    const keyPair = DECISION_CHOICE_SETTING_KEYS[params.blockType];
    const settings = params.project.menuSettings?.decisionBlocks;
    const pinnedItemId = normalizePinnedItemId(settings?.[keyPair.pinned]);
    if (!projectId || (!subdomain && !customDomain) || settings?.[keyPair.enabled] === false || !pinnedItemId) {
        return null;
    }

    const item = resolveCurrentCampaignItem(params.project, pinnedItemId);
    const blockLabels = getBlockLabels(
        params.blockType,
        params.store.businessType,
        params.store.businessCategory,
    );
    if (!item || !blockLabels) return null;

    const menuUrl = normalizeHttpsDestination(generateProjectUrl(
        subdomain,
        customDomain || undefined,
        resolveProjectName(params.project),
        false,
    ));
    if (!menuUrl) return null;

    return buildCampaignPosterInput({
        campaignContent: {
            headline: blockLabels.title,
            offer: item.name,
            ...(item.description ? { details: item.description } : {}),
        },
        destination: appendItemQuery(menuUrl, item.id),
        projectId,
        store: params.store,
    });
}
