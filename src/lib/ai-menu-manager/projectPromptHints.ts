import type { Project } from '@template/main-app/projects/types';
import { FEATURE_FLAGS } from '@config/features';
import { parseSingleMenuPrice } from '@lib/pricing/formatMenuPrice';
import { hasPublicItemDisplayPrice } from '@lib/pricing/publicItemPricePresentation';
import {
    BRAND_COLOR_PRESETS,
    MENU_LAYOUTS,
    MENU_MOODS,
    MenuLayout,
    MenuMood,
} from '@template/main-app/projects/b2cView/designSystem';

type PromptItem = {
    active?: boolean;
    attributes?: Array<{ active?: boolean; price?: string }>;
    available?: boolean;
    categoryId?: string;
    hasDescription?: boolean;
    hasImage?: boolean;
    isBestSeller?: boolean;
    name: string;
    price?: string;
};

type PromptCategory = {
    active?: boolean;
    itemCount: number;
    name: string;
};

export type AiMenuManagerPromptKind =
    | 'availability'
    | 'content'
    | 'design'
    | 'external'
    | 'image'
    | 'import'
    | 'more'
    | 'note'
    | 'price'
    | 'promote'
    | 'publish'
    | 'visibility';

export type AiMenuManagerPromptSuggestion = {
    children?: AiMenuManagerPromptSuggestion[];
    helper: string;
    kind: AiMenuManagerPromptKind;
    label: string;
    prompt?: string;
};

export type AiMenuManagerPromptGroup = {
    groupId: string;
    title: string;
    suggestions: AiMenuManagerPromptSuggestion[];
};

const MAX_PROMPTS_PER_GROUP = 5;
const MENU_STYLE_PRESET_SUGGESTIONS: AiMenuManagerPromptSuggestion[] = [
    { kind: 'design', label: 'Premium & Minimal', prompt: 'Make menu premium', helper: 'Fine dining, boutique concepts' },
    { kind: 'design', label: 'Clean & Calm', prompt: 'Make menu clean and simple', helper: 'Modern cafes, premium casual dining' },
    { kind: 'design', label: 'Bold & Social', prompt: 'Make menu bold for social sharing', helper: 'Bars, burgers, nightlife' },
    { kind: 'design', label: 'Warm & Inviting', prompt: 'Make menu warm and inviting', helper: 'Family restaurants, comfort food' },
    { kind: 'design', label: 'Fast & Direct', prompt: 'Make menu fast and direct', helper: 'Counters, QSRs, high-volume menus' },
];

const DISPLAY_OPTION_SUGGESTIONS: AiMenuManagerPromptSuggestion[] = [
    { kind: 'design', label: 'Show item prices', prompt: 'Show item prices', helper: 'Customers will see prices' },
    { kind: 'design', label: 'Hide item prices', prompt: 'Hide item prices', helper: 'Customers will not see prices' },
    { kind: 'design', label: 'Show item images', prompt: 'Show item images', helper: 'Customers will see item photos' },
    { kind: 'design', label: 'Hide item images', prompt: 'Hide item images', helper: 'Customers will not see item photos' },
    { kind: 'design', label: 'Show category icons', prompt: 'Show category icons', helper: 'Customers will see category icons' },
    { kind: 'design', label: 'Hide category icons', prompt: 'Hide category icons', helper: 'Customers will not see category icons' },
    { kind: 'design', label: 'Show category tabs', prompt: 'Show category tabs', helper: 'Customers can jump between categories' },
    { kind: 'design', label: 'Hide category tabs', prompt: 'Hide category tabs', helper: 'Customers scroll the menu normally' },
];

const WORKING_HOURS_SUGGESTIONS: AiMenuManagerPromptSuggestion[] = [
    { kind: 'more', label: 'Today only', prompt: 'Change working hours for today', helper: 'One-day hours change' },
    { kind: 'more', label: 'All weekdays', prompt: 'Change working hours for all weekdays', helper: 'Monday to Friday' },
    { kind: 'more', label: 'Weekend', prompt: 'Change working hours for weekend', helper: 'Saturday and Sunday' },
    { kind: 'more', label: 'Closed today', prompt: 'Set temporary status: closed today', helper: 'Use temporary status instead' },
];

const TEMPORARY_STATUS_SUGGESTIONS: AiMenuManagerPromptSuggestion[] = [
    { kind: 'more', label: 'Closed today', prompt: 'Set temporary status: closed today', helper: 'Customers see you are closed today' },
    { kind: 'more', label: 'Holiday', prompt: 'Set temporary status: holiday', helper: 'Use existing holiday status flow' },
    { kind: 'more', label: 'Special hours', prompt: 'Set temporary status: special hours', helper: 'Choose custom hours in existing flow' },
    { kind: 'more', label: 'Back open', prompt: 'Clear temporary status', helper: 'Remove temporary public status' },
];

const TIME_SLOT_SUGGESTIONS: AiMenuManagerPromptSuggestion[] = [
    { kind: 'more', label: 'Breakfast', prompt: 'Set breakfast time slot', helper: 'Prepare breakfast slot setup' },
    { kind: 'more', label: 'Lunch', prompt: 'Set lunch time slot', helper: 'Prepare lunch slot setup' },
    { kind: 'more', label: 'Dinner', prompt: 'Set dinner time slot', helper: 'Prepare dinner slot setup' },
    { kind: 'more', label: 'Happy hour', prompt: 'Set happy hour time slot', helper: 'Prepare happy hour slot setup' },
];

const CUSTOMER_APP_SUGGESTIONS: AiMenuManagerPromptSuggestion[] = [
    { kind: 'more', label: 'Copy install link', prompt: 'Copy customer app install link', helper: 'Use existing browser-local copy/share' },
    { kind: 'more', label: 'Share app link', prompt: 'Share customer app link', helper: 'Use native share where available' },
    { kind: 'more', label: 'Open app settings', prompt: 'Open customer app settings', helper: 'Finish in existing Customer App screen' },
    { kind: 'more', label: 'Update app icon', prompt: 'Update customer app icon', helper: 'Use existing app icon flow' },
];

const DIGITAL_SCREEN_SUGGESTIONS: AiMenuManagerPromptSuggestion[] = [
    { kind: 'more', label: 'Copy screen link', prompt: 'Copy digital screen link', helper: 'Use existing browser-local copy' },
    { kind: 'more', label: 'Open screen setup', prompt: 'Open digital screens', helper: 'Finish in existing screen flow' },
    { kind: 'more', label: 'Update slides', prompt: 'Update digital screen slides', helper: 'Use existing slide review flow' },
    { kind: 'more', label: 'Pause screen', prompt: 'Pause digital screen', helper: 'Use existing screen control flow' },
];

const FEEDBACK_SUGGESTIONS: AiMenuManagerPromptSuggestion[] = [
    { kind: 'more', label: 'Copy feedback link', prompt: 'Copy feedback link', helper: 'Use existing browser-local copy' },
    { kind: 'more', label: 'Download feedback QR', prompt: 'Download feedback QR', helper: 'Use existing QR/export flow' },
    { kind: 'more', label: 'Open feedback inbox', prompt: 'Open feedback inbox', helper: 'Review recent guest feedback' },
    { kind: 'more', label: 'Prepare reply', prompt: 'Prepare feedback reply', helper: 'Review before copying' },
];

export function getAiMenuManagerPromptText(suggestion: AiMenuManagerPromptSuggestion) {
    return suggestion.prompt || suggestion.label;
}

export function getAiMenuManagerStarterSuggestions(
    groups: AiMenuManagerPromptGroup[],
): AiMenuManagerPromptSuggestion[] {
    const suggestions = groups.flatMap((group) => group.suggestions);
    const temporaryStatus = suggestions.find((suggestion) => suggestion.label === 'Set temporary status');
    const workingHours = suggestions.find((suggestion) => suggestion.label === 'Change working hours');
    const timeSlots = suggestions.find((suggestion) => suggestion.label === 'Change time slots');
    const availability = suggestions.find((suggestion) => suggestion.kind === 'availability');
    const closedToday = temporaryStatus?.children?.find((suggestion) => suggestion.label === 'Closed today');

    return [
        closedToday ? {
            ...closedToday,
            label: 'Store closed today',
            helper: 'Prepare temporary status',
        } : temporaryStatus,
        workingHours,
        availability || timeSlots,
    ].filter((suggestion): suggestion is AiMenuManagerPromptSuggestion => Boolean(suggestion)).slice(0, 3);
}

function readLocalized(value: unknown, language = 'en', fallback = '') {
    if (!value) return fallback;
    if (typeof value === 'string') return value || fallback;
    if (typeof value === 'object') {
        const map = value as Record<string, unknown>;
        const direct = map[language];
        if (typeof direct === 'string' && direct.trim()) return direct.trim();
        const en = map.en;
        if (typeof en === 'string' && en.trim()) return en.trim();
        const first = Object.values(map).find((entry) => typeof entry === 'string' && entry.trim());
        if (typeof first === 'string') return first.trim();
    }
    return fallback;
}

function getPromptItems(project?: Project | null): PromptItem[] {
    if (!project) return [];
    const language = project.defaultLanguage || project.languages?.[0] || 'en';
    return (project.files || []).flatMap((file) => (
        (file.extractedData?.data?.items || [])
            .map((item) => ({
                active: item.active !== false,
                attributes: item.attributes?.map((attribute) => ({
                    active: attribute.active !== false,
                    price: attribute.price,
                })),
                available: item.available !== false,
                categoryId: item.category,
                hasDescription: Boolean(readLocalized(item.description, language, '')),
                hasImage: Boolean(item.images?.length),
                isBestSeller: item.isBestSeller === true,
                name: readLocalized(item.name, language, 'Menu item'),
                price: item.price,
            }))
            .filter((item) => item.name && item.name !== 'Menu item')
    ));
}

function getPromptCategories(project?: Project | null): PromptCategory[] {
    if (!project) return [];
    const language = project.defaultLanguage || project.languages?.[0] || 'en';
    return (project.files || []).flatMap((file) => {
        const data = file.extractedData?.data;
        if (!data) return [];
        const activeItemCounts = new Map<string, number>();
        (data.items || []).forEach((item) => {
            if (item.active === false) return;
            activeItemCounts.set(item.category, (activeItemCounts.get(item.category) || 0) + 1);
        });
        return (data.categories || [])
            .map((category) => ({
                active: category.active !== false,
                itemCount: activeItemCounts.get(category.id) || 0,
                name: readLocalized(category.name, language, 'Menu section'),
            }))
            .filter((category) => category.name && category.name !== 'Menu section');
    });
}

function nextPriceLabel(price?: string) {
    const numeric = parseSingleMenuPrice(price);
    const nextPrice = numeric !== null && numeric > 0 ? numeric + 10 : 20;
    return Number.isInteger(nextPrice) ? String(nextPrice) : nextPrice.toFixed(2);
}

export function getAiMenuManagerProjectPromptHints(project?: Project | null) {
    const items = getPromptItems(project);
    const activeItems = items.filter((item) => item.active !== false);
    const priceItem = activeItems.find((item) => parseSingleMenuPrice(item.price) !== null) || activeItems[0];
    const availabilityItem = activeItems.find((item) => item.name !== priceItem?.name) || priceItem || activeItems[0];

    return {
        pricePrompt: priceItem ? `${priceItem.name} ${nextPriceLabel(priceItem.price)}` : undefined,
        availabilityPrompt: availabilityItem ? `${availabilityItem.name} sold out` : undefined,
    };
}

export function getAiMenuManagerAttentionSuggestions(project?: Project | null): AiMenuManagerPromptSuggestion[] {
    const items = getPromptItems(project);
    const categories = getPromptCategories(project);
    const activeItems = items.filter((item) => item.active !== false);
    const hiddenCategory = categories.find((category) => category.active === false);
    const unavailableItem = activeItems.find((item) => item.available === false);
    const hiddenItem = items.find((item) => item.active === false);
    const missingPriceItem = activeItems.find((item) => !hasPublicItemDisplayPrice(item));
    const missingImageItem = activeItems.find((item) => !item.hasImage);
    const missingDescriptionItem = activeItems.find((item) => !item.hasDescription);
    const candidates: Array<AiMenuManagerPromptSuggestion | null | undefined> = [
        hiddenCategory && {
            kind: 'visibility',
            label: `Show ${hiddenCategory.name} category`,
            helper: 'Hidden menu section',
        },
        unavailableItem && {
            kind: 'availability',
            label: `Make ${unavailableItem.name} available`,
            helper: 'Sold-out item still hidden from ordering',
        },
        hiddenItem && {
            kind: 'visibility',
            label: `Show ${hiddenItem.name}`,
            helper: 'Hidden item',
        },
        missingPriceItem && {
            kind: 'price',
            label: `${missingPriceItem.name} ${nextPriceLabel(missingPriceItem.price)}`,
            helper: 'Missing price',
        },
        FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION && missingImageItem && {
            kind: 'image',
            label: `Generate image for ${missingImageItem.name}`,
            helper: 'Missing item photo',
        },
        missingDescriptionItem && {
            kind: 'content',
            label: `Add description for ${missingDescriptionItem.name}: Freshly prepared and served hot.`,
            helper: 'Missing item description',
        },
    ];

    const seen = new Set<string>();
    return candidates
        .filter((suggestion): suggestion is AiMenuManagerPromptSuggestion => Boolean(suggestion))
        .filter((suggestion) => {
            const key = suggestion.prompt || suggestion.label;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 3);
}

function addSuggestion(
    groups: AiMenuManagerPromptGroup[],
    groupId: string,
    title: string,
    suggestion: AiMenuManagerPromptSuggestion | null | undefined,
) {
    if (!suggestion) return;
    const group = groups.find((entry) => entry.groupId === groupId);
    if (group) {
        group.suggestions.push(suggestion);
        return;
    }
    groups.push({ groupId, title, suggestions: [suggestion] });
}

export function getAiMenuManagerProjectPromptGroups(project?: Project | null): AiMenuManagerPromptGroup[] {
    const items = getPromptItems(project);
    const activeItems = items.filter((item) => item.active !== false);
    const visibleItem = activeItems[0];
    const pricedItem = activeItems.find((item) => item.price) || visibleItem;
    const unavailableItem = activeItems.find((item) => item.available === false);
    const availableItem = activeItems.find((item) => item.available !== false && item.name !== pricedItem?.name) || visibleItem;
    const missingImageItem = activeItems.find((item) => !item.hasImage) || visibleItem;
    const missingDescriptionItem = activeItems.find((item) => !item.hasDescription) || visibleItem;
    const promoteItem = activeItems.find((item) => !item.isBestSeller) || visibleItem;
    const hiddenItem = items.find((item) => item.active === false);
    const groups: AiMenuManagerPromptGroup[] = [];

    addSuggestion(groups, 'quick-fixes', 'Quick fixes', pricedItem && {
        kind: 'price',
        label: `${pricedItem.name} ${nextPriceLabel(pricedItem.price)}`,
        helper: 'Prepare a price card',
    });
    addSuggestion(groups, 'quick-fixes', 'Quick fixes', availableItem && {
        kind: 'availability',
        label: `${availableItem.name} sold out`,
        helper: 'Mark one item unavailable',
    });
    addSuggestion(groups, 'quick-fixes', 'Quick fixes', unavailableItem && {
        kind: 'availability',
        label: `${unavailableItem.name} available`,
        helper: 'Bring an item back',
    });
    addSuggestion(groups, 'quick-fixes', 'Quick fixes', visibleItem && {
        kind: 'visibility',
        label: `Hide ${visibleItem.name}`,
        helper: 'Hide one item from customers',
    });
    addSuggestion(groups, 'quick-fixes', 'Quick fixes', hiddenItem && {
        kind: 'visibility',
        label: `Show ${hiddenItem.name}`,
        helper: 'Show a hidden item again',
    });

    const promoteChildren = [
        promoteItem && {
            kind: 'promote',
            label: `Feature ${promoteItem.name}`,
            helper: 'Pin one item in Featured',
        },
        {
            kind: 'promote',
            label: 'Show Featured section',
            helper: 'Turn on Featured without choosing an item',
        },
        promoteItem && {
            kind: 'promote',
            label: `Mark ${promoteItem.name} bestseller`,
            helper: 'Show a bestseller signal',
        },
    ].filter(Boolean) as AiMenuManagerPromptSuggestion[];

    addSuggestion(groups, 'promote', 'Promote items', promoteChildren.length ? {
        kind: 'promote',
        label: 'Promote menu items',
        helper: 'Featured section and bestseller signals',
        children: promoteChildren,
    } : null);

    addSuggestion(groups, 'photos-content', 'Photos and content', FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION && missingImageItem && {
        kind: 'image',
        label: `Generate image for ${missingImageItem.name}`,
        helper: 'Prepare an image task',
    });
    addSuggestion(groups, 'photos-content', 'Photos and content', missingDescriptionItem && {
        kind: 'content',
        label: `Add description for ${missingDescriptionItem.name}: Freshly prepared and served hot.`,
        helper: 'Prepare a description update',
    });
    addSuggestion(groups, 'photos-content', 'Photos and content', {
        kind: 'note',
        label: 'Show note: Fresh menu today',
        helper: 'Prepare a menu note',
    });

    addSuggestion(groups, 'style', 'Menu style', {
        kind: 'design',
        label: 'Apply a menu style',
        helper: 'Premium, clean, bold, warm, or fast',
        children: MENU_STYLE_PRESET_SUGGESTIONS,
    });
    addSuggestion(groups, 'style', 'Menu style', {
        kind: 'design',
        label: 'Change presentation tone',
        helper: 'Choose the customer feeling',
        children: [MenuMood.CLEAN, MenuMood.WARM, MenuMood.PREMIUM, MenuMood.BOLD, MenuMood.FAST].map((mood) => ({
            kind: 'design',
            label: MENU_MOODS[mood].label,
            prompt: `Set menu tone to ${MENU_MOODS[mood].label}`,
            helper: MENU_MOODS[mood].description,
        })),
    });
    addSuggestion(groups, 'style', 'Menu style', {
        kind: 'design',
        label: 'Change item layout',
        helper: 'List, grid, or card',
        children: [MenuLayout.LIST, MenuLayout.GRID, MenuLayout.CARD].map((layout) => ({
            kind: 'design',
            label: MENU_LAYOUTS[layout].label,
            prompt: `Use ${MENU_LAYOUTS[layout].label.toLowerCase()} layout`,
            helper: MENU_LAYOUTS[layout].description,
        })),
    });
    addSuggestion(groups, 'style', 'Menu style', {
        kind: 'design',
        label: 'Change theme color',
        helper: 'Pick the highlight color',
        children: BRAND_COLOR_PRESETS.slice(0, 6).map((preset) => ({
            kind: 'design',
            label: preset.name,
            prompt: `Set theme color to ${preset.name}`,
            helper: preset.color.toUpperCase(),
        })),
    });
    addSuggestion(groups, 'style', 'Menu style', {
        kind: 'design',
        label: 'Change display options',
        helper: 'Prices, images, icons, and tabs',
        children: DISPLAY_OPTION_SUGGESTIONS,
    });

    addSuggestion(groups, 'publish-import', 'Publish and import', {
        kind: 'publish',
        label: 'Publish this menu',
        helper: 'Prepare a publish handoff',
    });
    addSuggestion(groups, 'publish-import', 'Publish and import', {
        kind: 'import',
        label: 'Import this menu PDF',
        helper: 'Use existing import review',
    });

    addSuggestion(groups, 'more-daily', 'Daily operations', {
        kind: 'more',
        label: 'Change working hours',
        helper: 'Choose today, weekdays, or weekend',
        children: WORKING_HOURS_SUGGESTIONS,
    });
    addSuggestion(groups, 'more-daily', 'Daily operations', {
        kind: 'more',
        label: 'Set temporary status',
        helper: 'Closed today, holiday, or special hours',
        children: TEMPORARY_STATUS_SUGGESTIONS,
    });
    addSuggestion(groups, 'more-daily', 'Daily operations', {
        kind: 'more',
        label: 'Change time slots',
        helper: 'Breakfast, lunch, dinner, or happy hour',
        children: TIME_SLOT_SUGGESTIONS,
    });
    addSuggestion(groups, 'more-daily', 'Daily operations', {
        kind: 'more',
        label: 'Manage feedback',
        helper: 'Feedback link, QR, inbox, or reply',
        children: FEEDBACK_SUGGESTIONS,
    });

    addSuggestion(groups, 'more-tools', 'More tools', {
        kind: 'more',
        label: 'Customer app',
        helper: 'Install link, share, settings, or icon',
        children: CUSTOMER_APP_SUGGESTIONS,
    });
    addSuggestion(groups, 'more-tools', 'More tools', {
        kind: 'more',
        label: 'Digital screens',
        helper: 'Screen link, setup, slides, or pause',
        children: DIGITAL_SCREEN_SUGGESTIONS,
    });
    addSuggestion(groups, 'more-tools', 'More tools', {
        kind: 'more',
        label: 'Print and export',
        helper: 'Use existing print menu flow',
        children: [
            { kind: 'more', label: 'Open print menu', helper: 'Preview and export the selected menu' },
            { kind: 'more', label: 'Download menu PDF', helper: 'Use existing browser-local download' },
            { kind: 'more', label: 'Open print assets', helper: 'Table, counter, and entrance assets' },
        ],
    });
    addSuggestion(groups, 'more-tools', 'More tools', {
        kind: 'more',
        label: 'Store settings',
        helper: 'Profile, official page, social links',
        children: [
            { kind: 'more', label: 'Open business profile', helper: 'Name, logo, contact, and address' },
            { kind: 'more', label: 'Open official page settings', helper: 'WhatsApp, map, order, and reservation links' },
            { kind: 'more', label: 'Open social link settings', helper: 'Social profile links only' },
            { kind: 'more', label: 'Open business attributes', helper: 'Amenities and public details' },
        ],
    });

    return groups
        .map((group) => ({
            ...group,
            suggestions: group.suggestions.slice(0, MAX_PROMPTS_PER_GROUP),
        }))
        .filter((group) => group.suggestions.length > 0);
}
