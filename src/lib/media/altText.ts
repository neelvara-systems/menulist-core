function resolvePlainText(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (!value || typeof value !== 'object') return '';

    const record = value as Record<string, unknown>;
    const preferred = ['en', 'default', 'name', 'title', 'label']
        .map((key) => record[key])
        .find((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);

    if (preferred) return preferred.trim();

    const first = Object.values(record).find((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
    return first?.trim() || '';
}

function joinParts(parts: string[]): string {
    return parts.map((part) => part.trim()).filter(Boolean).join(' ');
}

export function getBusinessCoverAltText(businessName: unknown): string {
    const name = resolvePlainText(businessName);
    return name ? `${name} business cover` : 'Business cover image';
}

export function getBusinessGalleryAltText(businessName: unknown, index: number): string {
    const name = resolvePlainText(businessName);
    const label = `business photo ${index}`;
    return name ? `${name} ${label}` : `Business photo ${index}`;
}

export function getProjectImageAltText(projectName: unknown, businessName?: unknown): string {
    const project = resolvePlainText(projectName);
    const business = resolvePlainText(businessName);

    if (project && business) return `${project} menu preview for ${business}`;
    if (project) return `${project} menu preview`;
    if (business) return `${business} menu preview`;
    return 'Menu preview image';
}

export function getMenuItemImageAltText(itemName: unknown, categoryName?: unknown): string {
    const item = resolvePlainText(itemName);
    const category = resolvePlainText(categoryName);

    if (!item) return 'Menu item image';
    return joinParts([item, category ? `in ${category}` : '']);
}

export function getBusinessLogoAltText(businessName: unknown): string {
    const name = resolvePlainText(businessName);
    return name ? `${name} logo` : 'Business logo';
}

export function getDecorativeImageAltText(): '' {
    return '';
}
