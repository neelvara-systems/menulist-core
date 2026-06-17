import type { Project } from '@template/main-app/projects/types';

type PromptItem = {
    name: string;
    price?: string;
};

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
            .filter((item) => item.active !== false)
            .map((item) => ({
                name: readLocalized(item.name, language, 'Menu item'),
                price: item.price,
            }))
            .filter((item) => item.name && item.name !== 'Menu item')
    ));
}

function nextPriceLabel(price?: string) {
    const numeric = Number(String(price || '').replace(/[^0-9.]/g, ''));
    const nextPrice = Number.isFinite(numeric) && numeric > 0 ? numeric + 10 : 20;
    return Number.isInteger(nextPrice) ? String(nextPrice) : nextPrice.toFixed(2);
}

export function getAiMenuManagerProjectPromptHints(project?: Project | null) {
    const items = getPromptItems(project);
    const priceItem = items.find((item) => item.price) || items[0];
    const availabilityItem = items.find((item) => item.name !== priceItem?.name) || priceItem || items[0];

    return {
        pricePrompt: priceItem ? `${priceItem.name} ${nextPriceLabel(priceItem.price)}` : undefined,
        availabilityPrompt: availabilityItem ? `${availabilityItem.name} sold out` : undefined,
    };
}
