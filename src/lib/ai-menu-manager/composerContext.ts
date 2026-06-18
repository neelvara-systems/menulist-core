import type { Project } from '@template/main-app/projects/types';
import {
    buildAiMenuManagerContextPacket,
    type AiMenuManagerContextCategory,
    type AiMenuManagerContextItem,
} from './contextPacket';

export type AiMenuManagerComposerTarget =
    | 'item'
    | 'category'
    | 'menu_design'
    | 'digital_menu'
    | 'official_page'
    | 'digital_screens'
    | 'feedback'
    | 'store_settings';

export type AiMenuManagerComposerEntity = {
    id: string;
    label: string;
    helper?: string;
    target: AiMenuManagerComposerTarget;
};

export type AiMenuManagerComposerTargetOption = {
    helper: string;
    label: string;
    maxSelection?: number;
    requiresEntity: boolean;
    target: AiMenuManagerComposerTarget;
};

export type AiMenuManagerComposerContext = {
    selectedEntityIds: string[];
    target: AiMenuManagerComposerTarget | null;
};

export type AiMenuManagerComposerContextData = {
    categories: AiMenuManagerContextCategory[];
    entities: AiMenuManagerComposerEntity[];
    items: AiMenuManagerContextItem[];
    targets: AiMenuManagerComposerTargetOption[];
};

export const AI_MENU_MANAGER_COMPOSER_TARGETS: AiMenuManagerComposerTargetOption[] = [
    {
        target: 'item',
        label: 'Item',
        helper: 'Pick one or more menu items',
        requiresEntity: true,
    },
    {
        target: 'category',
        label: 'Category',
        helper: 'Work on one menu section',
        requiresEntity: true,
        maxSelection: 1,
    },
    {
        target: 'menu_design',
        label: 'Menu design',
        helper: 'Tone, layout, color, display',
        requiresEntity: false,
    },
    {
        target: 'digital_menu',
        label: 'Digital menu',
        helper: 'Publish, QR, share, print',
        requiresEntity: false,
    },
    {
        target: 'official_page',
        label: 'Official page',
        helper: 'Public profile, links, photos',
        requiresEntity: false,
    },
    {
        target: 'digital_screens',
        label: 'Digital screens',
        helper: 'TV menu, slides, screen links',
        requiresEntity: false,
    },
    {
        target: 'feedback',
        label: 'Feedback',
        helper: 'QR, link, inbox, reply draft',
        requiresEntity: false,
    },
    {
        target: 'store_settings',
        label: 'Store settings',
        helper: 'Hours, status, profile, links',
        requiresEntity: false,
    },
];

function normalizeSearch(value = '') {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function getAiMenuManagerComposerContextData(params: {
    businessType?: string;
    project?: Project | null;
    storeName?: string;
}): AiMenuManagerComposerContextData {
    const targets = AI_MENU_MANAGER_COMPOSER_TARGETS;
    if (!params.project) {
        return { categories: [], entities: [], items: [], targets };
    }

    const packet = buildAiMenuManagerContextPacket({
        project: params.project,
        storeName: params.storeName || 'Selected store',
        businessType: params.businessType,
    });
    const itemEntities: AiMenuManagerComposerEntity[] = packet.items.map((item) => ({
        id: item.id,
        label: item.name,
        helper: `${item.categoryName}${item.price ? ` · ${item.price}` : ''}${item.available ? '' : ' · sold out'}`,
        target: 'item',
    }));
    const categoryEntities: AiMenuManagerComposerEntity[] = packet.categories.map((category) => ({
        id: category.id,
        label: category.name,
        helper: category.active ? 'Shown category' : 'Hidden category',
        target: 'category',
    }));

    return {
        categories: packet.categories,
        entities: [...itemEntities, ...categoryEntities],
        items: packet.items,
        targets,
    };
}

export function filterAiMenuManagerComposerEntities(
    entities: AiMenuManagerComposerEntity[],
    target: AiMenuManagerComposerTarget | null,
    search: string,
) {
    const normalizedSearch = normalizeSearch(search);
    return entities
        .filter((entity) => !target || entity.target === target)
        .filter((entity) => {
            if (!normalizedSearch) return true;
            return normalizeSearch(`${entity.label} ${entity.helper || ''}`).includes(normalizedSearch);
        });
}

function findTarget(target: AiMenuManagerComposerTarget | null) {
    return AI_MENU_MANAGER_COMPOSER_TARGETS.find((entry) => entry.target === target) || null;
}

function getSelectedEntities(
    data: AiMenuManagerComposerContextData,
    selection: AiMenuManagerComposerContext,
) {
    const selectedIds = new Set(selection.selectedEntityIds);
    return data.entities.filter((entity) => entity.target === selection.target && selectedIds.has(entity.id));
}

export function buildAiMenuManagerComposerPrompt(params: {
    data: AiMenuManagerComposerContextData;
    input: string;
    selection: AiMenuManagerComposerContext;
}) {
    const input = params.input.trim();
    const target = findTarget(params.selection.target);
    if (!input || !target) return input;

    if (target.requiresEntity) {
        const selectedEntities = getSelectedEntities(params.data, params.selection);
        if (!selectedEntities.length) return input;
        const names = selectedEntities.map((entity) => entity.label);

        if (target.target === 'category') {
            return `Selected category: ${names[0]}. ${input}`;
        }

        return `${names.length === 1 ? 'Selected item' : 'Selected items'}: ${names.join(', ')}. ${input}`;
    }

    const prefixByTarget: Record<Exclude<AiMenuManagerComposerTarget, 'item' | 'category'>, string> = {
        menu_design: 'Menu design',
        digital_menu: 'Digital menu',
        official_page: 'Official page',
        digital_screens: 'Digital screens',
        feedback: 'Feedback',
        store_settings: 'Store settings',
    };
    return `${prefixByTarget[target.target as Exclude<AiMenuManagerComposerTarget, 'item' | 'category'>]}: ${input}`;
}

export function getAiMenuManagerComposerContextLabel(params: {
    data: AiMenuManagerComposerContextData;
    selection: AiMenuManagerComposerContext;
}) {
    const target = findTarget(params.selection.target);
    if (!target) return 'Work on';
    if (!target.requiresEntity) return target.label;

    const selectedEntities = getSelectedEntities(params.data, params.selection);
    if (!selectedEntities.length) return target.label;
    if (selectedEntities.length === 1) return `${target.label}: ${selectedEntities[0].label}`;
    return `${target.label}: ${selectedEntities.length} selected`;
}

export function canUseAiMenuManagerComposerContext(params: {
    data: AiMenuManagerComposerContextData;
    selection: AiMenuManagerComposerContext;
}) {
    const target = findTarget(params.selection.target);
    if (!target) return true;
    if (!target.requiresEntity) return true;
    return getSelectedEntities(params.data, params.selection).length > 0;
}
